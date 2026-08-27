import { mayDraw } from "./restrictions.js";
import { fireCardDrawn } from "./permanents.js";
import type {
  CardDefinition,
  CardInstance,
  GameState,
  Player,
  PublicZoneId,
  ZoneId,
} from "./types.js";

export function createPlayer(id: string): Player {
  return {
    id,
    life: 40, // Commander starting life total
    commanderDamageTaken: {},
    library: [],
    hand: [],
    battlefield: [],
    graveyard: [],
    exile: [],
    command: [],
    manaPool: {},
    restrictedMana: [],
    manaMarks: [],
    commanderCastCount: {},
    hasLost: false,
    damagePrevention: 0,
    attemptedDrawFromEmptyLibrary: false,
    landsPlayedThisTurn: 0,
    /*
     * Set to 1 for whoever begins the game, below - a player whose first turn is
     * in progress has taken one turn, and Starting Town is a land you very much
     * want on that turn.
     */
    turnsTaken: 0,
    spellTypesCastThisTurn: [],
    cardsDrawnThisTurn: 0,
    poisonCounters: 0,
    lifeGainedThisTurn: 0,
    plusOneCountersPlacedThisTurn: 0,
    // Ascend grants it; nothing ever takes it away.
    hasCitysBlessing: false,
    // The Ring is an emblem: nobody has it until something tempts them.
    ringLevel: 0,
    ringBearerInstanceId: null,
    copyNextInstantOrSorcery: 0,
  };
}

export function createGameState(playerIds: string[], cardDefinitions: Record<string, CardDefinition>): GameState {
  const players = playerIds.map(createPlayer);
  /*
   * Whoever begins the game is already on their first turn: `startNextTurn`
   * counts every turn after this one, and a player who has not been counted
   * would read as never having had a turn at all - which is a Starting Town
   * entering tapped on the exact turn the card exists to be untapped on.
   */
  if (players[0]) players[0].turnsTaken = 1;
  return {
    players,
    activePlayerIndex: 0,
    priorityPlayerIndex: 0,
    turnNumber: 1,
    phase: "beginning",
    step: "untap",
    stack: [],
    stackCards: [],
    turnRestrictions: [],
    pendingEnterChoice: null,
    passesInSuccession: 0,
    extraCombatPhases: 0,
    combatPhasesThisTurn: 0,
    attackers: {},
    blockers: {},
    blockersDeclared: false,
    pendingSearch: null,
    pendingModal: null,
    extraTurns: [],
    delayedUpkeepEffects: [],
    pendingArrange: null,
    pendingConfirmation: null,
    pendingTargetChoices: [],
    pendingDiscards: [],
    pendingSacrifice: null,
    pendingCardChoices: [],
    pendingAmount: null,
    creatureDeathsThisTurn: 0,
    spellsCastThisTurn: 0,
    combatDamagePrevention: null,
    mulligan: null,
    pendingColorChoice: null,
    delayedTriggers: [],
    monarchPlayerId: null,
    cardDefinitions,
    nextInstanceId: 1,
    nextStackObjectId: 1,
    log: [],
  };
}

export function requirePlayer(state: GameState, playerId: string): Player {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) throw new Error(`Unknown player: ${playerId}`);
  return player;
}

export function requireDefinition(state: GameState, definitionId: string): CardDefinition {
  const def = state.cardDefinitions[definitionId];
  if (!def) throw new Error(`Unknown card definition: ${definitionId}`);
  return def;
}

function zoneArray(player: Player, zone: PublicZoneId): CardInstance[] {
  return player[zone];
}

/** Creates a new physical card instance, owned/controlled by `ownerId`, sitting in `zone`. */
export function createCardInstance(
  state: GameState,
  definitionId: string,
  ownerId: string,
  zone: PublicZoneId,
  options: { isCommander?: boolean } = {},
): CardInstance {
  const instance: CardInstance = {
    instanceId: `c${state.nextInstanceId++}`,
    definitionId,
    ownerId,
    controllerId: ownerId,
    zone,
    tapped: false,
    damageMarked: 0,
    deathtouchDamage: false,
    plusOneCounters: 0,
    // "attacks this combat if able" belongs to one combat, so a fresh card is
    // never under it - see turn.ts's cleanup, which takes it back off.
    mustAttackThisCombat: false,
    // Emeria's Call's indestructible, which outlives the turn but not the card.
    grantedKeywordsUntilYourNextTurn: [],
    // A counter is not a grant: it stays for as long as the permanent does.
    keywordCounters: [],
    // A Room's doors. Empty on everything else, and on a Room until it arrives.
    unlockedDoors: [],
    abilitiesUsedThisGame: [],
    // Skrelv's two grants, both until end of turn.
    toxicThisTurn: 0,
    hexproofFrom: [],
    grantedKeywords: [],
    grantedTriggers: [],
    minusOneCounters: 0,
    otherCounters: 0,
    loyalty: 0,
    loyaltyUsedThisTurn: false,
    modesChosenThisTurn: [],
    timeCounters: 0,
    prepared: false,
    isTokenCopy: false,
    bestowed: false,
    chosenX: 0,
    temporaryPowerBonus: 0,
    temporaryToughnessBonus: 0,
    damagePrevention: 0,
    regenerationShields: 0,
    removedFromCombat: false,
    exerted: false,
    isCommander: options.isCommander ?? false,
    protectionFrom: [],
    blockRestrictionsThisTurn: [],
    // Never been to the battlefield. `enteredBattlefield` stamps the real turn.
    enteredOnTurn: -1,
    summoningSickness: true,
  };
  const player = requirePlayer(state, ownerId);
  zoneArray(player, zone).push(instance);
  return instance;
}

/** Finds a card instance and the player who owns it, searching every player zone plus the stack. */
export function findInstance(state: GameState, instanceId: string): { instance: CardInstance; player: Player } | undefined {
  for (const player of state.players) {
    const zones: PublicZoneId[] = ["library", "hand", "battlefield", "graveyard", "exile", "command"];
    for (const zone of zones) {
      const instance = zoneArray(player, zone).find((c) => c.instanceId === instanceId);
      if (instance) return { instance, player };
    }
  }
  const onStack = state.stackCards.find((c) => c.instanceId === instanceId);
  if (onStack) return { instance: onStack, player: requirePlayer(state, onStack.ownerId) };
  return undefined;
}

/**
 * Moves a card instance from its current zone to a new zone on its owner's side
 * (the stack is the one exception - it's a single shared list, not per-player).
 * Resets transient state (tap, damage, summoning sickness) as appropriate for the destination.
 */
export function moveCard(state: GameState, instanceId: string, destination: ZoneId): CardInstance {
  // Reassigned by the graveyard replacement below, so it is a `let`.
  // eslint-disable-next-line prefer-const
  const found = findInstance(state, instanceId);
  if (!found) throw new Error(`Cannot move unknown instance: ${instanceId}`);
  const { instance } = found;
  const owner = requirePlayer(state, instance.ownerId);

  if (instance.zone === "stack") {
    const idx = state.stackCards.indexOf(instance);
    if (idx >= 0) state.stackCards.splice(idx, 1);
  } else {
    const fromArray = zoneArray(owner, instance.zone);
    const idx = fromArray.indexOf(instance);
    if (idx >= 0) fromArray.splice(idx, 1);
  }

  // A token that leaves the battlefield ceases to exist rather than moving to
  // the new zone (real rule 111.7). It's already been spliced out above, so
  // simply not re-inserting it is the whole implementation.
  const definition = state.cardDefinitions[instance.definitionId];
  if ((definition?.isToken || instance.isTokenCopy) && instance.zone === "battlefield" && destination !== "battlefield") {
    instance.zone = destination;
    return instance;
  }

  /*
   * A modal double-faced card turns back over as it leaves the battlefield.
   *
   * Bala Ged Sanctuary in a graveyard is Bala Ged Recovery: the back face only
   * exists while the card is in play, and a card in any other zone has its
   * front face's characteristics. Without this, killing the land half would put
   * a card called "Bala Ged Sanctuary" in the graveyard that nothing could
   * recognise, recur, or count towards a deck's singleton rule.
   */
  const backFace = state.cardDefinitions[instance.definitionId];
  if (backFace?.isBackFace && destination !== "battlefield") {
    const front = Object.values(state.cardDefinitions).find((d) => d.backFaceId === instance.definitionId);
    if (front) instance.definitionId = front.id;
  }

  /*
   * "If a card or token would be put into your graveyard from anywhere, exile
   * it instead." - Necrodominance.
   *
   * The first replacement effect on a zone change, and it lives here because
   * this is the one door every zone change goes through - the whole reason
   * that was worth keeping as a single function. Read off the board directly
   * rather than through replacements.ts, which only knows about counters and
   * tokens and would have to import half the engine to reach this.
   */
  if (destination === "graveyard") {
    const redirects = owner.battlefield.some((c) =>
      state.cardDefinitions[c.definitionId]?.replacementEffects?.some(
        (r) => r.kind === "graveyard-to-exile",
      ),
    );
    if (redirects) destination = "exile";
  }

  instance.zone = destination;
  instance.tapped = false;
  instance.damageMarked = 0;
  instance.deathtouchDamage = false;
  instance.plusOneCounters = 0; // a zone change makes a new object, per the real rules - counters don't carry over
  // `chosenX` is deliberately *not* in this list. For a permanent spell the
  // announced X stays defined for the permanent's own abilities (rule 608.2g),
  // and The Meathook Massacre's -X/-X is an enters-the-battlefield trigger -
  // it fires after this has run, so resetting here would wipe the board for 0.
  instance.grantedKeywords = []; // an until-end-of-turn grant belongs to the object it was given to, not to the card
  instance.grantedTriggers = []; // likewise for a granted ability - Root Manipulation's does not follow the card out
  instance.grantedSubtypes = undefined; // Liliana's reanimation grant belongs to that object, not the card
  instance.grantedColors = undefined;
  instance.minusOneCounters = 0; // a zone change makes a new object, counters and all
  instance.otherCounters = 0;
  instance.loyaltyUsedThisTurn = false;
  instance.bestowed = false; // an Aura that leaves play is a creature card again
  instance.prepared = false; // and a prepared creature that leaves is a new object
  instance.temporaryPowerBonus = 0; // likewise, until-end-of-turn pumps don't follow a card between zones
  instance.temporaryToughnessBonus = 0;
  instance.damagePrevention = 0; // a shield protects the object it was cast on, not the new one this became
  instance.regenerationShields = 0; // likewise - a regenerated creature that later leaves keeps nothing
  instance.removedFromCombat = false;
  instance.exerted = false; // a new object has not been exerted, whatever the old one did
  instance.protectionFrom = []; // and protection was granted to the object that left, not to this one
  instance.blockRestrictionsThisTurn = []; // likewise: Gingerbrute's evasion belonged to the object that left
  instance.mustAttackThisCombat = false; // and Legion Warboss's token is not compelled anywhere but the battlefield
  instance.grantedKeywordsUntilYourNextTurn = []; // a shield belongs to the object that had it, not to the card
  instance.keywordCounters = []; // counters fall off a card that changes zones, like every other counter
  instance.unlockedDoors = []; // and a Room that leaves play is a card again, with both doors shut
  instance.abilitiesUsedThisGame = []; // and a new object has used nothing
  instance.toxicThisTurn = 0; // likewise Skrelv's grants, which belonged to the creature that left
  instance.hexproofFrom = [];
  /*
   * Cleared only on the way *out*. The move that puts a dashed creature onto the
   * battlefield is the move that makes it a permanent, and `enteredBattlefield`
   * reads this immediately afterwards. The stack is spared for the same reason
   * one step earlier: the flag is set as the spell is cast and the card moves to
   * the stack in the same breath, so clearing it there wiped it before the
   * permanent existed at all. A dashed spell that gets countered moves on to a
   * graveyard, where it is cleared like anything else.
   */
  if (destination !== "battlefield" && destination !== "stack") instance.dashed = false;
  instance.animation = undefined; // an animated land that leaves play is a land card again
  instance.attachedTo = undefined; // an Equipment that changes zones falls off
  instance.controllerId = owner.id; // zone changes return control to the owner
  instance.summoningSickness = destination === "battlefield";

  if (destination === "stack") {
    state.stackCards.push(instance);
  } else {
    zoneArray(owner, destination).push(instance);
  }
  return instance;
}

/**
 * Shuffles a player's library in place. Required after any effect that searches
 * it - without this, a tutor would leave the rest of the library in a known
 * order, which is a real (if subtle) advantage.
 */
export function shuffleLibrary(state: GameState, playerId: string): void {
  const library = requirePlayer(state, playerId).library;
  for (let i = library.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [library[i], library[j]] = [library[j]!, library[i]!];
  }
}

/**
 * Draws cards, and says so.
 *
 * The log line lives here rather than at each call site because the client
 * drives its sound cues off the log, and the draw step - by far the most
 * common draw in a game - was the one call site that logged nothing. The cue
 * existed, the code to play it existed, and it never once fired for a normal
 * turn's draw. Anything that draws now gets both the line and the sound
 * without having to remember to ask.
 *
 * `silent` is for the draws that are setup rather than events: the opening
 * hand and a mulligan's redraw, which would otherwise open every game with
 * "Deadly Donny draws 7 cards" before the log has anything to say.
 */
export function drawCard(
  state: GameState,
  playerId: string,
  amount = 1,
  options: { silent?: boolean } = {},
): void {
  const player = requirePlayer(state, playerId);
  let drawn = 0;
  for (let i = 0; i < amount; i++) {
    /*
     * "Each player can't draw more than one card each turn" - Spirit of the
     * Labyrinth. A forbidden draw simply does not happen, and crucially is not
     * a draw from an empty library: treating it as one would lose the game to a
     * card that only says you cannot draw.
     */
    if (!mayDraw(state, playerId)) break;
    const top = player.library.shift();
    if (!top) {
      player.attemptedDrawFromEmptyLibrary = true;
      log(state, `${playerId} attempted to draw from an empty library`);
      continue;
    }
    top.zone = "hand";
    player.hand.push(top);
    player.cardsDrawnThisTurn += 1;
    drawn += 1;
    /*
     * "Whenever a player draws a card" - fired here, per card, because this is
     * the one door every draw goes through. Imported lazily to keep the
     * state<->permanents cycle to a function body (see fireCardDrawn); nothing
     * at either module's top level runs the other, so the binding is live by
     * the time a draw ever happens.
     */
    fireCardDrawn(state, playerId);
  }
  if (drawn > 0 && !options.silent) {
    log(state, `${playerId} draws ${drawn} card${drawn === 1 ? "" : "s"}`);
  }
}

/**
 * Records something that happened, for the game log.
 *
 * Kept to plain sentences a player would say out loud - "Deadly Donny casts
 * Lightning Bolt", not "STACK_PUSH lightning-bolt-3". The log is the only
 * place the game explains itself: without it a spell resolves, a life total
 * quietly moves, and you are left guessing whether the card worked.
 *
 * Capped, because a long game otherwise grows this without limit and nothing
 * reads more than the last screenful.
 */
const LOG_LIMIT = 400;

export function log(state: GameState, message: string): void {
  state.log.push({ turn: state.turnNumber, text: message });
  if (state.log.length > LOG_LIMIT) state.log.splice(0, state.log.length - LOG_LIMIT);
}

/** The name of whatever card an instance id refers to, for log lines. */
export function cardName(state: GameState, instanceId: string): string {
  const found = findInstance(state, instanceId);
  if (!found) return "a card";
  return state.cardDefinitions[found.instance.definitionId]?.name ?? "a card";
}
