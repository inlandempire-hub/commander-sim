import {
  canPayManaCostFromPool,
  isValidTarget,
  manaValue,
  type CardDefinition,
  type CardInstance,
  type GameState,
  type ManaCost,
  type Player,
  type StackObject,
} from "@mtg-commander-sim/engine";
import {
  combatDamage,
  creatureValue,
  definitionOf,
  fixedAmount,
  hasKeyword,
  isCreature,
  power,
  strikesEarly,
  toughness,
  printedPump,
} from "./evaluate.js";
import { castableFromHand, castOrTapToward, NO_COST, type Castable } from "./handOptions.js";
import type { BotAction } from "./types.js";

/**
 * Everything the bot does while it does NOT have a main phase: countering an
 * opponent's spell, and pumping a creature mid-combat.
 *
 * These are the first decisions the bot makes outside its own turn, which is
 * why they live apart from decide.ts - the rest of that file assumes an empty
 * stack and a main phase, and neither holds here.
 */

/** A spell this cheap isn't worth a card to stop, unless it's doing something specific to us. */
const COUNTER_THRESHOLD = 3;

function onBattlefield(state: GameState, instanceId: string): CardInstance | undefined {
  for (const player of state.players) {
    const found = player.battlefield.find((c) => c.instanceId === instanceId);
    if (found) return found;
  }
  return undefined;
}

/** The card a stack object came from, but only if it is a spell - abilities can't be countered. */
function spellCardOf(state: GameState, obj: StackObject): CardInstance | undefined {
  return state.stackCards.find((c) => c.instanceId === obj.sourceInstanceId);
}

/**
 * Whether a fight kills `victim`. Deathtouch makes any damage lethal and
 * Indestructible makes none of it lethal, so this can't just compare numbers.
 * `extraToughness` models a pump that hasn't been cast yet.
 */
function diesInFight(
  state: GameState,
  victim: CardInstance,
  aggressor: CardInstance,
  extraToughness = 0,
): boolean {
  if (hasKeyword(state, victim, "Indestructible")) return false;
  // Striking first and killing the aggressor means taking nothing back - which
  // also means a pump to survive would be wasted.
  if (
    strikesEarly(state, victim) &&
    !strikesEarly(state, aggressor) &&
    power(state, victim) >= toughness(state, aggressor)
  ) {
    return false;
  }
  const damage = combatDamage(state, aggressor);
  if (damage <= 0) return false;
  if (hasKeyword(state, aggressor, "Deathtouch")) return true;
  return damage >= toughness(state, victim) + extraToughness;
}

function counterspellsInHand(state: GameState, me: Player): Castable[] {
  // Not `nowOnly`: a reserve is mana held for a spell that cannot be cast yet,
  // which is the whole point of reserving it.
  return castableFromHand(state, me, (def) => def.castEffect?.kind === "counter", NO_COST, false).sort(
    (a, b) => manaValue(a.cost) - manaValue(b.cost),
  );
}

/**
 * Mana the bot should keep untapped on its own turn so a counterspell is
 * actually castable later. Only kicks in once there's enough land that holding
 * some back doesn't mean skipping the turn's play entirely - a bot that never
 * develops because it's protecting a Counterspell loses to anything.
 */
export function reserveForCounterspell(state: GameState, me: Player): ManaCost {
  const lands = me.battlefield.filter((c) => definitionOf(state, c)?.types.includes("Land")).length;
  if (lands < 5) return NO_COST;
  const cheapest = counterspellsInHand(state, me)[0];
  return cheapest ? cheapest.cost : NO_COST;
}

/** Would countering this spell be worth the card? */
function worthCountering(state: GameState, me: Player, obj: StackObject): boolean {
  if (obj.controllerId === me.id) return false;
  const card = spellCardOf(state, obj);
  if (!card) return false; // a triggered/activated ability - not a legal target anyway
  const def = definitionOf(state, card);
  if (!def) return false;

  // Targeting it would be legal - "can't be countered" isn't a targeting
  // restriction - so nothing stops the bot throwing a Counterspell at Terra
  // Stomper and watching it do nothing. It just shouldn't want to.
  if (def.cantBeCountered) return false;

  // A commander is always worth it: countering one adds {2} to every future cast.
  if (card.isCommander) return true;

  const effect = def.castEffect;

  // Removal pointed at our own board is worth answering at any cost.
  if (effect?.kind === "destroy" || effect?.kind === "exile" || effect?.kind === "damage") {
    const hitsUs = obj.targets.some(
      (t) => t.kind === "card" && me.battlefield.some((c) => c.instanceId === t.instanceId),
    );
    if (hitsUs) return true;
  }

  // A one-sided sweeper is the single worst thing that can resolve against a board.
  if (effect?.kind === "pumpAll") {
    // An X-valued sweeper is worth countering on sight - the bot cannot see how
    // big it is, and "would it kill my board" has no answer until it resolves.
    const shrink = fixedAmount(effect.toughness);
    if (shrink === null) return true;
    if (shrink < 0) {
      const ourCreatures = me.battlefield.filter((c) => isCreature(state, c));
      if (ourCreatures.some((c) => toughness(state, c) + shrink <= 0)) return true;
    }
  }

  return manaValue(def.manaCost ?? NO_COST) >= COUNTER_THRESHOLD;
}

/** Counter the best opponent spell currently on the stack, if we hold an answer. */
export function counterSomething(state: GameState, me: Player): BotAction | null {
  if (state.stack.length === 0) return null;

  const targets = state.stack.filter((obj) => worthCountering(state, me, obj));
  if (targets.length === 0) return null;
  // The most expensive thing we could stop is the one most worth stopping.
  targets.sort((a, b) => {
    const valueOf = (obj: StackObject): number => {
      const card = spellCardOf(state, obj);
      const def = card ? definitionOf(state, card) : undefined;
      return manaValue(def?.manaCost ?? NO_COST);
    };
    return valueOf(b) - valueOf(a);
  });

  for (const spell of counterspellsInHand(state, me)) {
    const effect = spell.definition.castEffect;
    if (effect?.kind !== "counter") continue;

    // "Counter unless its controller pays {N}" does nothing if they simply pay.
    // Their floating pool is all the engine lets them pay from (see effects.ts),
    // so this check is exact rather than a guess.
    if (effect.unlessPays) {
      const theirController = state.players.find((p) => p.id === targets[0]!.controllerId);
      if (theirController && canPayManaCostFromPool(theirController.manaPool, effect.unlessPays)) continue;
    }

    const target = { kind: "spell" as const, stackObjectId: targets[0]!.id };
    if (!isValidTarget(state, effect.target, target, me.id)) continue;
    return castOrTapToward(state, me, spell, [target]);
  }
  return null;
}

/** Our creature and the enemy creature it is fighting, for every block declared. */
function fights(state: GameState, me: Player): Array<{ mine: CardInstance; theirs: CardInstance }> {
  const out: Array<{ mine: CardInstance; theirs: CardInstance }> = [];
  for (const [blockerId, attackerId] of Object.entries(state.blockers)) {
    const blocker = onBattlefield(state, blockerId);
    const attacker = onBattlefield(state, attackerId);
    if (!blocker || !attacker) continue;
    if (blocker.controllerId === me.id) out.push({ mine: blocker, theirs: attacker });
    else if (attacker.controllerId === me.id) out.push({ mine: attacker, theirs: blocker });
  }
  return out;
}

function isInstantPump(def: CardDefinition): boolean {
  return def.types.includes("Instant") && def.castEffect?.kind === "pump" && def.castEffect.target !== undefined;
}

/**
 * Pump a creature that is already in combat, but only when it changes the
 * outcome - saving our creature, or killing theirs. A pump cast for +2/+2 on a
 * fight that was already won is a wasted card, and the bot used to have no way
 * to tell the difference because it never acted at instant speed at all.
 */
export function combatTrick(state: GameState, me: Player): BotAction | null {
  if (state.step !== "declare-blockers") return null;
  if (Object.keys(state.blockers).length === 0) return null;

  const inCombat = fights(state, me);
  if (inCombat.length === 0) return null;

  const tricks = castableFromHand(state, me, isInstantPump);

  for (const trick of tricks) {
    const effect = trick.definition.castEffect;
    if (effect?.kind !== "pump" || !effect.target) continue;
    // A pump whose size is counted at resolution cannot be weighed before it is
    // cast - see `printedPump`. Left alone rather than guessed at.
    const printed = printedPump(effect);
    if (!printed) continue;

    // A negative pump is removal: point it at the enemy creature it can kill.
    if (printed.toughness < 0) {
      const killable = inCombat
        .map((f) => f.theirs)
        .filter((c) => !hasKeyword(state, c, "Indestructible"))
        .filter((c) => toughness(state, c) + printed.toughness <= 0)
        .filter((c) => isValidTarget(state, effect.target!, { kind: "card", instanceId: c.instanceId }, me.id))
        .sort((a, b) => creatureValue(state, b) - creatureValue(state, a));
      if (killable[0]) {
        return castOrTapToward(state, me, trick, [{ kind: "card", instanceId: killable[0].instanceId }]);
      }
      continue;
    }

    for (const { mine, theirs } of inCombat) {
      if (!isValidTarget(state, effect.target, { kind: "card", instanceId: mine.instanceId }, me.id)) continue;

      const savesMine =
        diesInFight(state, mine, theirs) && !diesInFight(state, mine, theirs, printed.toughness);
      const killsTheirs =
        !diesInFight(state, theirs, mine) &&
        !hasKeyword(state, theirs, "Indestructible") &&
        power(state, mine) + printed.power >= toughness(state, theirs);

      if (savesMine || killsTheirs) {
        return castOrTapToward(state, me, trick, [{ kind: "card", instanceId: mine.instanceId }]);
      }
    }
  }

  return teamPump(state, me, inCombat);
}

/**
 * "Creatures you control get +N/+N until end of turn" - the go-wide payoff.
 * Only cast when it wins something concrete: it saves a creature that would
 * otherwise die, or it turns the unblocked attackers into a lethal swing.
 */
function teamPump(
  state: GameState,
  me: Player,
  inCombat: Array<{ mine: CardInstance; theirs: CardInstance }>,
): BotAction | null {
  const pumps = castableFromHand(
    state,
    me,
    (def) =>
      def.types.includes("Instant") &&
      def.castEffect?.kind === "pumpAll" &&
      def.castEffect.scope === "controller" &&
      (fixedAmount(def.castEffect.power) ?? 0) + (fixedAmount(def.castEffect.toughness) ?? 0) > 0,
  );
  if (pumps.length === 0) return null;

  // Attackers of ours that nobody blocked - their damage goes straight through.
  const blockedIds = new Set(Object.values(state.blockers));
  const unblocked = Object.keys(state.attackers)
    .filter((id) => !blockedIds.has(id))
    .map((id) => onBattlefield(state, id))
    .filter((c): c is CardInstance => c !== undefined && c.controllerId === me.id);

  for (const pump of pumps) {
    const effect = pump.definition.castEffect;
    if (effect?.kind !== "pumpAll") continue;
    // Same reason as the sweeper: a combat trick worth +X/+X cannot be sized
    // before it is cast, so there is nothing to compare against lethal.
    const extraPower = fixedAmount(effect.power);
    const extraToughness = fixedAmount(effect.toughness);
    if (extraPower === null || extraToughness === null) continue;

    const saves = inCombat.some(
      ({ mine, theirs }) =>
        diesInFight(state, mine, theirs) && !diesInFight(state, mine, theirs, extraToughness),
    );

    const defender = state.players.find((p) => p.id !== me.id && !p.hasLost);
    const damageThrough = unblocked.reduce((total, c) => total + power(state, c) + extraPower, 0);
    const lethal = defender !== undefined && damageThrough >= defender.life;

    if (saves || lethal) return castOrTapToward(state, me, pump);
  }
  return null;
}
