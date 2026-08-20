import type {
  ActivatedAbility,
  CardDefinition,
  CardInstance,
  CardType,
  GameState,
  Keyword,
  ManaColor,
  ManaCost,
  StaticBuff,
  TriggeredAbility,
} from "./types.js";
import { staticBuffsOf } from "./types.js";
import { requireDefinition, requirePlayer } from "./state.js";
/*
 * A cycle on paper: amounts.ts reads `effectivePower` from here. It is safe
 * because neither module touches the other at load time - both uses are inside
 * function bodies, so by the time either runs both are initialised. Porcelain
 * Gallery's base power is an `Amount` like any other, and counting creatures a
 * second time here rather than asking would be exactly the duplicate answer this
 * engine keeps refusing to have.
 */
import { evaluateAmount } from "./amounts.js";
import { ringTriggers } from "./ring.js";
import { meetsBoardCondition } from "./conditions.js";

/**
 * Whether a `staticBuff` printed on `source` reaches `candidate`.
 *
 * Split out from the sum below because the keyword half asks exactly the same
 * question and a second copy of these four checks would be a second place for
 * "attacking Pests you control" to quietly stop meaning attacking.
 */
function buffApplies(
  state: GameState,
  source: CardInstance,
  buff: StaticBuff,
  candidate: CardInstance,
  candidateDef: CardDefinition,
): boolean {
  /*
   * An Equipment's buff is not an anthem: "equipped creature gets +1/-1"
   * reaches exactly one permanent, the one it is attached to, and nothing at
   * all while it sits unattached. Checked first, because every other rule below
   * is about classes of creatures and none of them apply.
   */
  const sourceDef = state.cardDefinitions[source.definitionId];
  if (sourceDef?.equipCost) return source.attachedTo === candidate.instanceId;

  /*
   * "As long as you have 30 or more life, **this creature** gets +5/+5 and has
   * flying." - Serra Ascendant, whose buff reaches its own source and nothing
   * else on the board.
   *
   * The opposite end of the same axis as `includesSelf` below, which *adds* the
   * source to a group - so the two are one question and are answered together.
   * Left to the default, Serra Ascendant would be a one-mana anthem handing the
   * whole board +5/+5 and flying.
   */
  if (buff.selfOnly) {
    if (source.instanceId !== candidate.instanceId) return false;
  } else if (source.instanceId === candidate.instanceId && !buff.includesSelf) {
    // "*other* creatures you control", unless the card omits the word.
    return false;
  }
  // Every card of this shape says "creatures". Without this, Duskshell
  // Crawler's trample would land on any land carrying a counter, which is
  // invisible right up until something starts counting keywords.
  if (!candidateDef.types.includes("Creature")) return false;
  /*
   * A changeling is every creature type, so it qualifies for any lord.
   *
   * Read off the printed and granted lists directly rather than through
   * `hasCreatureType`, which asks `hasKeyword`, which recomputes the buffs
   * reaching this permanent - and lands straight back here. The cycle is real
   * and it blew the stack; the printed answer is also the correct one, because
   * nothing in the pool grants changeling by way of a static buff.
   */
  const changeling =
    (candidateDef.keywords?.includes("Changeling") ?? false) ||
    candidate.grantedKeywords.includes("Changeling");
  if (buff.subtype && !changeling && !candidateDef.subtypes?.includes(buff.subtype)) return false;
  // "Creature **tokens** you control" - Springleaf Parade.
  if (buff.tokensOnly && !(candidateDef.isToken || candidate.isTokenCopy)) return false;
  // "Attacking Pests you control" - a creature that is not in combat is not
  // one of them, so the bonus and the menace both come and go with the attack.
  if (buff.restriction === "attacking" && state.attackers[candidate.instanceId] === undefined) return false;
  // "each creature you control with a +1/+1 counter on it" - likewise reread
  // every time, so a creature that loses its last counter loses the trample.
  if (buff.restriction === "with-counter" && candidate.plusOneCounters <= 0) return false;
  /*
   * "As long as you control four or more Humans" - Greymond's second half.
   *
   * Asked of the *buff's controller*, not the candidate's: the card says "you
   * control", and in a game where a creature can change hands those are
   * different players.
   */
  if (buff.condition && !meetsBoardCondition(state, source.controllerId, buff.condition)) return false;
  return true;
}

/**
 * Every `staticBuff` currently reaching this permanent, from its controller's
 * own battlefield.
 *
 * Recomputed on every read rather than cached, which is the whole reason this
 * can stay simple: nothing has to be invalidated when a permanent enters or
 * leaves, because there is no stored value to go stale. Fine at this board
 * size; revisit if profiling ever says otherwise.
 */
function buffsReaching(state: GameState, instance: CardInstance): ReachingBuff[] {
  if (instance.zone !== "battlefield") return [];
  const controller = requirePlayer(state, instance.controllerId);
  const def = requireDefinition(state, instance.definitionId);
  const found: ReachingBuff[] = [];
  for (const other of controller.battlefield) {
    // A card may print more than one continuous effect - Greymond prints two.
    // Both of a Room's doors, when both are open - see `unlockedDefinitions`.
    for (const buff of unlockedDefinitions(state, other).flatMap((d) => staticBuffsOf(d))) {
      if (!buffApplies(state, other, buff, instance, def)) continue;
      found.push({ buff, source: other });
    }
  }
  return found;
}

/**
 * A buff and the permanent printing it.
 *
 * The source is carried because one buff cannot be read without it: Greymond
 * grants "each of the chosen abilities", and the choice lives on his own
 * `CardInstance` rather than on the card.
 */
interface ReachingBuff {
  buff: StaticBuff;
  source: CardInstance;
}

/** The total power/toughness bonus from the "anthem"/"lord" pattern. */
function staticBuffFor(state: GameState, instance: CardInstance): { power: number; toughness: number } {
  const total = { power: 0, toughness: 0 };
  for (const { buff } of buffsReaching(state, instance)) {
    total.power += buff.power;
    total.toughness += buff.toughness;
  }
  return total;
}

/**
 * Every keyword this permanent has right now - printed, granted for the turn,
 * and granted by something else on the battlefield.
 *
 * **Nothing may read `CardDefinition.keywords` directly.** That was safe only
 * while keywords were a fixed property of the card; the moment Heroic
 * Intervention can hand out indestructible and Blight Mound can hand out
 * menace, a read of the printed list is a read of a stale answer. The failure
 * is silent and one-sided - the card looks right in the panel and simply does
 * not work in combat - so the rule is the blunt one, and every site in the
 * engine, the bot and the client goes through here.
 *
 * The same shape as `effectivePower`, and for the same reason: recomputed on
 * every read, so nothing has to be invalidated.
 */
/**
 * Keywords this permanent was granted for a while, from both lists.
 *
 * Two lists, one answer. They are separate because they are *cleared* at
 * different moments - the ordinary one in the cleanup step, the other in its
 * controller's untap step - and joined here because nothing downstream cares
 * which of them a keyword came from.
 */
function grantedNow(instance: CardInstance): Keyword[] {
  /*
   * Three lists, one answer, and they are separate because they end at three
   * different moments: the cleanup step, the controller's untap step, and never
   * - a keyword counter stays for as long as the permanent does.
   */
  return [
    ...instance.grantedKeywords,
    ...instance.grantedKeywordsUntilYourNextTurn,
    ...instance.keywordCounters,
  ];
}

/**
 * "Toxic N" - printed plus granted.
 *
 * Its own function for the same reason `effectiveKeywords` is one: the moment a
 * card can hand toxic to something that never printed it, a read of the printed
 * number is a read of a stale answer.
 */
export function effectiveToxic(state: GameState, instance: CardInstance): number {
  const def = requireDefinition(state, instance.definitionId);
  return (def.toxic ?? 0) + instance.toxicThisTurn;
}

/**
 * Every definition whose abilities this permanent currently has.
 *
 * One for everything in the game except a Room, whose unlocked doors each
 * contribute their own. The front definition is the card's identity either way -
 * a Room is named, countered and recurred as its front face - so this is about
 * abilities and nothing else.
 *
 * The single place that answers it, which is what keeps `effectiveTriggers` and
 * `buffsReaching` from disagreeing about whether a door is open.
 */
export function unlockedDefinitions(state: GameState, instance: CardInstance): CardDefinition[] {
  const def = requireDefinition(state, instance.definitionId);
  if (!def.isRoom) return [def];
  const back = def.backFaceId ? state.cardDefinitions[def.backFaceId] : undefined;
  const doors: CardDefinition[] = [];
  if (instance.unlockedDoors.includes("front")) doors.push(def);
  if (instance.unlockedDoors.includes("back") && back) doors.push(back);
  return doors;
}

export function effectiveKeywords(state: GameState, instance: CardInstance): Keyword[] {
  const def = requireDefinition(state, instance.definitionId);
  // "with flying and infect" - an animated land's keywords come from the
  // animation, and a land has none of its own to print.
  const printed = [...(def.keywords ?? []), ...(instance.animation?.keywords ?? [])];
  // Off the battlefield a permanent has only what is printed on it: an
  // until-end-of-turn grant is cleared by the zone change, and an anthem
  // reaches nothing outside play.
  if (instance.zone !== "battlefield") return [...printed];

  const all = new Set<Keyword>(printed);
  for (const keyword of grantedNow(instance)) all.add(keyword);
  for (const { buff, source } of buffsReaching(state, instance)) {
    for (const keyword of buff.grants ?? []) all.add(keyword);
    /*
     * "Humans you control have each of the **chosen** abilities" - Greymond,
     * whose keywords were named as he entered.
     *
     * A Greymond who was never asked grants nothing rather than guessing, the
     * same posture Sanctum Prelate takes for a number nobody chose. It cannot
     * arise in play - the game holds on `pendingEnterChoice` until answered -
     * but a default here would be a card that silently works differently.
     */
    if (buff.grantsChosenOnEntry) {
      for (const keyword of source.chosenOnEntry?.keywords ?? []) all.add(keyword);
    }
  }
  return [...all];
}

/**
 * Whether this permanent has a creature type.
 *
 * **Nothing may compare `subtypes` directly for a creature-type question.**
 * Changeling means "every creature type", so a card that read the printed list
 * would answer no for a Shapeshifter that is, by its own rules text, whatever
 * you asked about.
 */
export function hasCreatureType(state: GameState, instance: CardInstance, subtype: string): boolean {
  if (hasKeyword(state, instance, "Changeling")) return true;
  // "a 1/1 **Blinkmoth** artifact creature" - the types an animated land gains,
  // which is what makes Blinkmoth Nexus able to pump itself.
  if (instance.animation?.subtypes.includes(subtype)) return true;
  return requireDefinition(state, instance.definitionId).subtypes?.includes(subtype) ?? false;
}

/**
 * Every activated ability this permanent has right now - printed, and granted
 * by something else on the battlefield.
 *
 * The third of these, after keywords and triggers, and for the third time the
 * rule is blunt: nothing may read `CardDefinition.activatedAbilities` directly,
 * because Springleaf Parade can hand a mana ability to a token that printed
 * none.
 */
export function effectiveActivated(state: GameState, instance: CardInstance): ActivatedAbility[] {
  const printed = requireDefinition(state, instance.definitionId).activatedAbilities ?? [];
  if (instance.zone !== "battlefield") return printed;
  const granted: ActivatedAbility[] = [];
  /*
   * "This land is the chosen type" - Multiversal Passage, whose whole output is
   * a basic land type named as it entered. A land that was never asked makes no
   * mana, which is the same posture every other unanswered choice takes.
   */
  if (requireDefinition(state, instance.definitionId).becomesChosenBasicType) {
    const color = BASIC_TYPE_MANA[instance.chosenOnEntry?.basicLandType ?? ""];
    if (color) granted.push({ cost: { tap: true }, effect: { kind: "addMana", color, amount: 1 } });
  }
  for (const { buff } of buffsReaching(state, instance)) {
    for (const ability of buff.grantsAbilities ?? []) granted.push(ability);
  }
  return granted.length > 0 ? [...printed, ...granted] : printed;
}

/**
 * The ward cost this permanent actually has - printed, or handed to it.
 *
 * "Other creatures you control have 'Ward - Pay 2 life'" (Hexing Squelcher) is
 * not a keyword grant: `grants` is a list of keywords and ward carries a cost,
 * which no keyword does. So it is its own field on the buff and read here,
 * alongside the printed one, for the same reason `effectiveKeywords` exists -
 * a check that read the card would be reading a stale answer.
 */
export function effectiveWard(
  state: GameState,
  instance: CardInstance,
): { life?: number; mana?: ManaCost } | null {
  const def = requireDefinition(state, instance.definitionId);
  if (def.keywords?.includes("Ward")) {
    return def.wardLifeCost !== undefined ? { life: def.wardLifeCost } : { mana: def.wardCost ?? { generic: 0, colors: {} } };
  }
  if (instance.zone !== "battlefield") return null;
  for (const { buff } of buffsReaching(state, instance)) {
    if (buff.grantsWardLife !== undefined) return { life: buff.grantsWardLife };
  }
  return null;
}

/**
 * The mana ability a permanent has because of a type it was told to be -
 * Multiversal Passage.
 */
const BASIC_TYPE_MANA: Record<string, ManaColor> = {
  Plains: "W",
  Island: "U",
  Swamp: "B",
  Mountain: "R",
  Forest: "G",
};

/**
 * What this card's types are *right now*.
 *
 * Two cards in the pool disagree with their own printed type line:
 *
 * - Grist is a 1/1 Insect creature in every zone except the battlefield, which
 *   is the opposite of every other characteristic-defining ability here.
 * - A bestowed creature is an Aura and not a creature for exactly as long as it
 *   stays attached.
 *
 * Nothing that asks "is this a creature" about a specific instance may read
 * `def.types` directly once either exists.
 */
export function typesOf(state: GameState, instance: CardInstance): CardType[] {
  const def = requireDefinition(state, instance.definitionId);
  if (instance.bestowed) {
    return [...def.types.filter((t) => t !== "Creature"), "Enchantment"];
  }
  /*
   * "This land becomes a 1/1 Blinkmoth **artifact creature** ... It's still a
   * land." Added to the printed types rather than replacing them, which is what
   * that last sentence means.
   */
  if (instance.animation) {
    const gained: CardType[] = ["Artifact", "Creature"].filter(
      (type): type is CardType => !def.types.includes(type as CardType),
    );
    return [...def.types, ...gained];
  }
  if (def.alsoCreatureOffBattlefield && instance.zone !== "battlefield") {
    return def.types.includes("Creature") ? [...def.types] : [...def.types, "Creature"];
  }
  return [...def.types];
}

/** Convenience for the common single-keyword question. */
export function hasKeyword(state: GameState, instance: CardInstance, keyword: Keyword): boolean {
  return effectiveKeywords(state, instance).includes(keyword);
}

/**
 * Every triggered ability this permanent has right now - printed, and handed to
 * it for the turn by something like Root Manipulation.
 *
 * **Nothing may read `CardDefinition.triggeredAbilities` directly**, for exactly
 * the reason nothing may read the printed keyword list: the moment an ability
 * can be granted, the printed list is a stale answer, and the failure is silent
 * - the card panel shows the granted ability and combat simply never fires it.
 *
 * Off the battlefield only the printed abilities apply. That is not a shortcut:
 * an until-end-of-turn grant is cleared by the zone change anyway, so this is
 * the same answer arrived at sooner, and it keeps every fire site that reads a
 * card in hand or graveyard behaving as it always did.
 */
export function effectiveTriggers(state: GameState, instance: CardInstance): TriggeredAbility[] {
  const def = requireDefinition(state, instance.definitionId);
  /*
   * A Room contributes only the doors that are open, and only while it is on the
   * battlefield - a Room in a hand or a graveyard is one card with both doors
   * shut, which is what `unlockedDoors` being empty off the battlefield means.
   *
   * Everything else in the game is its own single definition, which is what
   * `unlockedDefinitions` answers for it.
   */
  const printed =
    def.isRoom && instance.zone === "battlefield"
      ? unlockedDefinitions(state, instance).flatMap((d) => d.triggeredAbilities ?? [])
      : (def.triggeredAbilities ?? []);
  if (instance.zone !== "battlefield") return printed;
  // The Ring's abilities belong to whoever is bearing it *now*, which is why
  // they are read here rather than stamped on when the bearer is chosen.
  return [...printed, ...instance.grantedTriggers, ...ringTriggers(state, instance)];
}

/**
 * "Creatures you control have **base power and toughness each equal to** the
 * number of creatures you control." - Porcelain Gallery.
 *
 * Layer 7b: it *sets* the base figures, so it is read before counters and
 * anthems rather than added alongside them. Returns undefined when nothing on
 * the board is doing this, which is every board but one.
 *
 * The last such effect to apply wins, which is the rule for two of them at once
 * and is what iterating in board order gives.
 */
function baseStatsFor(state: GameState, instance: CardInstance): number | undefined {
  if (instance.zone !== "battlefield") return undefined;
  const controller = state.players.find((p) => p.id === instance.controllerId);
  if (!controller) return undefined;
  if (!typesOf(state, instance).includes("Creature")) return undefined;
  let base: number | undefined;
  for (const other of controller.battlefield) {
    for (const door of unlockedDefinitions(state, other)) {
      if (door.setsBasePowerToughness === undefined) continue;
      base = evaluateAmount(state, instance.controllerId, door.setsBasePowerToughness, "base power/toughness");
    }
  }
  return base;
}

/** A creature's power including +1/+1 counters, any until-end-of-turn bonus, and any anthem effects - use this instead of reading `CardDefinition.power` directly wherever combat or state-based actions care about a creature's current stats. */
export function effectivePower(state: GameState, instance: CardInstance): number {
  const def = requireDefinition(state, instance.definitionId);
  return (
    // An animated land's printed power is nothing at all; the animation is where
    // its 1/1 comes from.
    // Layer 7b before 7c and 7d: a base-setting effect replaces the printed
    // figure, and counters and anthems then apply on top of the new one.
    (baseStatsFor(state, instance) ?? instance.animation?.power ?? def.power ?? 0) +
    instance.plusOneCounters -
    instance.minusOneCounters +
    instance.temporaryPowerBonus +
    staticBuffFor(state, instance).power
  );
}

/**
 * A creature's toughness including +1/+1 counters, any until-end-of-turn
 * bonus, and any anthem effects - see effectivePower.
 *
 * The bonus is signed, so this is what makes "-N/-N" removal work: the result
 * can legitimately reach 0 or below, and the existing state-based action in
 * sba.ts kills the creature without needing a destroy effect at all.
 */
export function effectiveToughness(state: GameState, instance: CardInstance): number {
  const def = requireDefinition(state, instance.definitionId);
  return (
    (baseStatsFor(state, instance) ?? instance.animation?.toughness ?? def.toughness ?? 0) +
    instance.plusOneCounters -
    instance.minusOneCounters +
    instance.temporaryToughnessBonus +
    staticBuffFor(state, instance).toughness
  );
}
