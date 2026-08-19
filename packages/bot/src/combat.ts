import type { AttackerDeclaration, BlockerDeclaration, CardInstance, GameState, Player } from "@mtg-commander-sim/engine";
import { compelledAttackers } from "@mtg-commander-sim/engine";
import {
  canBlock,
  creatureValue,
  creaturesOf,
  definitionOf,
  eligibleAttackers,
  hasKeyword,
  killsInFight,
  opponentsOf,
  power,
  toughness,
  untappedCreatures,
  wouldDie,
} from "./evaluate.js";

/**
 * How much damage it actually takes to kill this player. In Commander that
 * isn't just their life total: 21 combat damage from a single commander wins
 * on its own, so a commander that has already connected a few times is far
 * closer to lethal than the life total suggests.
 */
export function effectiveLethalThreshold(player: Player, attacker: CardInstance): number {
  if (!attacker.isCommander) return player.life;
  const dealt = player.commanderDamageTaken[attacker.instanceId] ?? 0;
  return Math.min(player.life, 21 - dealt);
}

/**
 * The minimum number of creatures we must keep home to survive the opponent's
 * next attack.
 *
 * Assumes each blocker we keep stops one attacker - their biggest first, since
 * that's the one we'd most want to stop - so the damage that actually lands is
 * everything below that. The smallest number of blockers that keeps the total
 * under our life total is what we need; the rest of the board is free to swing.
 *
 * This replaced an all-or-nothing rule ("if their board power exceeds our life,
 * nobody attacks"), which made both bots freeze permanently once boards grew:
 * games ran 180+ turns and ended by decking rather than damage.
 */
function blockersNeededToSurvive(state: GameState, me: Player, defender: Player): number {
  const threats = creaturesOf(state, defender)
    .map((c) => power(state, c))
    .filter((p) => p > 0)
    .sort((a, b) => b - a);

  for (let keep = 0; keep <= threats.length; keep++) {
    const damageThatLands = threats.slice(keep).reduce((sum, p) => sum + p, 0);
    if (damageThatLands < me.life) return keep;
  }
  return threats.length;
}

/**
 * A creature with no power gains nothing by attacking: it deals zero damage and
 * taps, so it stops being a blocker for free.
 *
 * This needs saying explicitly because the "is this attack favourable?" test
 * below answers *yes* for a 0/8 - nothing can kill it, so it survives every
 * block. Both true and useless. The control deck was sending its 0/8 commander
 * in every single turn and then dying to the swing back.
 *
 * The exception is a creature with an attacks-trigger, where attacking is the
 * point regardless of how much damage it deals.
 */
function worthAttackingWith(state: GameState, creature: CardInstance): boolean {
  if (power(state, creature) > 0) return true;
  return definitionOf(state, creature)?.triggeredAbilities?.some((t) => t.event === "attacks") ?? false;
}

/**
 * Does `blocker` kill `attacker`, and vice versa? Both go through killsInFight,
 * which accounts for First Strike - a creature that dies in the first damage
 * sub-step never swings back, so these two are not symmetrical.
 */
function blockerKillsAttacker(state: GameState, blocker: CardInstance, attacker: CardInstance): boolean {
  return killsInFight(state, blocker, attacker);
}

function attackerKillsBlocker(state: GameState, attacker: CardInstance, blocker: CardInstance): boolean {
  return killsInFight(state, attacker, blocker);
}

/**
 * "Attack when favourable."
 *
 * Three ways an attack earns its place, checked in order:
 *  1. It is lethal. If the damage that gets through after the defender's best
 *     blocks still kills them, swing with everything - nothing else matters.
 *  2. It is unblockable. Evasion the defender can't answer is free damage.
 *  3. The combat is good for us. The attacker survives every block the
 *     defender could make, or it trades into something worth at least as much.
 *
 * Plus one restraint: if the opponent's board could kill us on the swing back,
 * creatures stay home to block unless they have Vigilance (which costs
 * nothing) or the attack is lethal anyway.
 */
export function chooseAttackers(state: GameState, botPlayerId: string): AttackerDeclaration[] {
  const me = state.players.find((p) => p.id === botPlayerId);
  const defender = opponentsOf(state, botPlayerId)[0];
  if (!me || !defender) return [];

  /*
   * "attack each combat if able" - Goblin Rabblemaster's other Goblins, and
   * Legion Warboss's token. Not a preference, so it is settled before any of the
   * weighing below and folded into whatever that comes up with.
   *
   * Asked of the engine rather than re-derived here. `declareAttackers` throws
   * on a declaration that leaves one of these out, and a bot with its own idea
   * of the rule would eventually disagree with it and hang the game on its own
   * turn.
   */
  const compelled = compelledAttackers(state, botPlayerId).map((c) => ({
    attackerInstanceId: c.instanceId,
    defendingPlayerId: defender.id,
  }));
  const withCompelled = (chosen: AttackerDeclaration[]): AttackerDeclaration[] => {
    const seen = new Set(chosen.map((d) => d.attackerInstanceId));
    return [...chosen, ...compelled.filter((d) => !seen.has(d.attackerInstanceId))];
  };

  const attackers = eligibleAttackers(state, me).filter((c) => worthAttackingWith(state, c));
  if (attackers.length === 0) return withCompelled([]);
  const blockers = untappedCreatures(state, defender);

  // 1. Lethal check. Assume the defender blocks our biggest threats first, so
  // the damage that actually lands is everything below their blocker count.
  const byPowerDesc = [...attackers].sort((a, b) => power(state, b) - power(state, a));
  const unblocked = byPowerDesc.slice(blockers.length);
  const guaranteedDamage = unblocked.reduce((sum, c) => sum + power(state, c), 0);
  const lowestThreshold = Math.min(...attackers.map((a) => effectiveLethalThreshold(defender, a)), defender.life);
  if (guaranteedDamage >= lowestThreshold) {
    return withCompelled(
      attackers.map((a) => ({ attackerInstanceId: a.instanceId, defendingPlayerId: defender.id })),
    );
  }

  // Restraint, sized to the actual threat. A creature that attacks can't block,
  // so work out how many blockers we need at home to survive their swing back,
  // keep exactly that many, and send everything else.
  const blockersNeeded = blockersNeededToSurvive(state, me, defender);

  // Some of that requirement is already covered for free: creatures that weren't
  // going to attack anyway (summoning sick, Defender) still block, and so do
  // Vigilance attackers, which don't tap.
  const eligibleIds = new Set(attackers.map((a) => a.instanceId));
  const freeBlockers = untappedCreatures(state, me).filter(
    (c) => !eligibleIds.has(c.instanceId) || hasKeyword(state, c, "Vigilance"),
  ).length;

  // Which creatures stay home matters as much as how many. Keep the ones that
  // are good at blocking and bad at attacking - a tough wall is worth far more
  // at home than a flier the defender has no answer to, which should always be
  // swinging for guaranteed damage.
  const homeValue = (c: CardInstance): number => {
    const blockable = blockers.some((b) => canBlock(state, b, c));
    return toughness(state, c) * 2 - power(state, c) + (blockable ? 0 : -8);
  };

  const mustHoldBack = Math.max(0, blockersNeeded - freeBlockers);
  const heldBack = new Set(
    [...attackers]
      .filter((a) => !hasKeyword(state, a, "Vigilance"))
      .sort((a, b) => homeValue(b) - homeValue(a) || creatureValue(state, b) - creatureValue(state, a))
      .slice(0, mustHoldBack)
      .map((a) => a.instanceId),
  );

  const declarations: AttackerDeclaration[] = [];
  for (const attacker of attackers) {
    if (heldBack.has(attacker.instanceId)) continue;

    const legalBlockers = blockers.filter((b) => canBlock(state, b, attacker));

    // Menace attackers need two blockers, so a lone potential blocker can't stop them.
    const menaceProtected = hasKeyword(state, attacker, "Menace") && legalBlockers.length < 2;

    if (legalBlockers.length === 0 || menaceProtected) {
      declarations.push({ attackerInstanceId: attacker.instanceId, defendingPlayerId: defender.id });
      continue;
    }

    const survivesEverything = legalBlockers.every((b) => !blockerKillsAttacker(state, b, attacker));
    if (survivesEverything) {
      declarations.push({ attackerInstanceId: attacker.instanceId, defendingPlayerId: defender.id });
      continue;
    }

    // It can die. Only worth it if every block that kills it also loses them
    // something at least as valuable.
    const myValue = creatureValue(state, attacker);
    const tradesWell = legalBlockers.every((b) => {
      if (!blockerKillsAttacker(state, b, attacker)) return true;
      return attackerKillsBlocker(state, attacker, b) && creatureValue(state, b) >= myValue;
    });
    if (tradesWell) {
      declarations.push({ attackerInstanceId: attacker.instanceId, defendingPlayerId: defender.id });
    }
  }

  // The last of the three ways out of this function, and the one that had it
  // wrong first time: a Goblin held back by the restraint logic above is still
  // compelled, and a declaration without it is one the engine refuses.
  return withCompelled(declarations);
}

/**
 * "Block to survive."
 *
 * Survival first: if the incoming damage kills us (or gets a commander to 21),
 * throw creatures in front of the biggest attackers until it doesn't, however
 * bad the trades are. A chump block that costs a 6-drop still beats losing.
 *
 * Otherwise block only where the exchange is good: the blocker kills the
 * attacker and lives, or it kills the attacker and the attacker was worth
 * more, or it survives and soaks damage for free.
 */
export function chooseBlockers(state: GameState, botPlayerId: string): BlockerDeclaration[] {
  const me = state.players.find((p) => p.id === botPlayerId);
  if (!me) return [];

  const attackingAtMe = Object.entries(state.attackers)
    .filter(([, defendingPlayerId]) => defendingPlayerId === botPlayerId)
    .map(([attackerInstanceId]) => attackerInstanceId)
    .map((id) => findOnAnyBattlefield(state, id))
    .filter((c): c is CardInstance => c !== undefined);
  if (attackingAtMe.length === 0) return [];

  const available = untappedCreatures(state, me);
  if (available.length === 0) return [];

  const incoming = attackingAtMe.reduce((sum, a) => sum + power(state, a), 0);
  const facingLethal =
    incoming >= me.life || attackingAtMe.some((a) => power(state, a) >= effectiveLethalThreshold(me, a));

  const declarations: BlockerDeclaration[] = [];
  const used = new Set<string>();
  const free = () => available.filter((c) => !used.has(c.instanceId));

  // Deal with the scariest attackers first either way.
  const threats = [...attackingAtMe].sort((a, b) => power(state, b) - power(state, a));

  let unblockedDamage = incoming;

  for (const attacker of threats) {
    const candidates = free().filter((b) => canBlock(state, b, attacker));
    if (candidates.length === 0) continue;

    const needed = hasKeyword(state, attacker, "Menace") ? 2 : 1;
    if (candidates.length < needed) continue;

    const stillDying = facingLethal && unblockedDamage >= me.life;

    if (stillDying) {
      // Cheapest bodies that get the job done - keep the good creatures alive if we survive.
      const chumps = [...candidates].sort((a, b) => creatureValue(state, a) - creatureValue(state, b)).slice(0, needed);
      for (const chump of chumps) {
        declarations.push({ blockerInstanceId: chump.instanceId, attackerInstanceId: attacker.instanceId });
        used.add(chump.instanceId);
      }
      unblockedDamage -= power(state, attacker);
      continue;
    }

    if (needed > 1) {
      // Double-blocking a Menace creature when we aren't forced to is only worth
      // it if the pair actually kills it and we don't lose more than we gain.
      const pair = [...candidates].sort((a, b) => creatureValue(state, a) - creatureValue(state, b)).slice(0, 2);
      const combinedPower = pair.reduce((sum, b) => sum + power(state, b), 0);
      const killsIt = wouldDie(state, attacker, combinedPower, pair.some((b) => hasKeyword(state, b, "Deathtouch")));
      const losses = pair
        .filter((b) => attackerKillsBlocker(state, attacker, b))
        .reduce((sum, b) => sum + creatureValue(state, b), 0);
      if (killsIt && creatureValue(state, attacker) >= losses) {
        for (const blocker of pair) {
          declarations.push({ blockerInstanceId: blocker.instanceId, attackerInstanceId: attacker.instanceId });
          used.add(blocker.instanceId);
        }
        unblockedDamage -= power(state, attacker);
      }
      continue;
    }

    const scored = candidates
      .map((blocker) => ({ blocker, score: blockScore(state, blocker, attacker) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score);

    const best = scored[0];
    if (!best) continue;
    declarations.push({ blockerInstanceId: best.blocker.instanceId, attackerInstanceId: attacker.instanceId });
    used.add(best.blocker.instanceId);
    unblockedDamage -= power(state, attacker);
  }

  return declarations;
}

/** How good a single block is. Zero or less means "don't bother". */
function blockScore(state: GameState, blocker: CardInstance, attacker: CardInstance): number {
  const kills = blockerKillsAttacker(state, blocker, attacker);
  const dies = attackerKillsBlocker(state, attacker, blocker);
  const attackerWorth = creatureValue(state, attacker);
  const blockerWorth = creatureValue(state, blocker);

  if (kills && !dies) return 100 + attackerWorth; // pure profit
  if (kills && dies) return attackerWorth - blockerWorth; // a trade, good only if they lose more
  if (!kills && !dies) return power(state, attacker); // free damage prevention
  return -1; // we die and they don't
}

function findOnAnyBattlefield(state: GameState, instanceId: string): CardInstance | undefined {
  for (const player of state.players) {
    const found = player.battlefield.find((c) => c.instanceId === instanceId);
    if (found) return found;
  }
  return undefined;
}

/** Re-exported so tests can assert on the toughness helper through the same path the bot uses. */
export { toughness };
