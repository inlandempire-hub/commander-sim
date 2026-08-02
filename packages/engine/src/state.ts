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
    commanderCastCount: {},
    hasLost: false,
    attemptedDrawFromEmptyLibrary: false,
    landsPlayedThisTurn: 0,
  };
}

export function createGameState(playerIds: string[], cardDefinitions: Record<string, CardDefinition>): GameState {
  return {
    players: playerIds.map(createPlayer),
    activePlayerIndex: 0,
    priorityPlayerIndex: 0,
    turnNumber: 1,
    phase: "beginning",
    step: "untap",
    stack: [],
    stackCards: [],
    passesInSuccession: 0,
    attackers: {},
    blockers: {},
    blockersDeclared: false,
    pendingSearch: null,
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
    temporaryPowerBonus: 0,
    temporaryToughnessBonus: 0,
    isCommander: options.isCommander ?? false,
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
  if (definition?.isToken && instance.zone === "battlefield" && destination !== "battlefield") {
    instance.zone = destination;
    return instance;
  }

  instance.zone = destination;
  instance.tapped = false;
  instance.damageMarked = 0;
  instance.deathtouchDamage = false;
  instance.plusOneCounters = 0; // a zone change makes a new object, per the real rules - counters don't carry over
  instance.temporaryPowerBonus = 0; // likewise, until-end-of-turn pumps don't follow a card between zones
  instance.temporaryToughnessBonus = 0;
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

export function drawCard(state: GameState, playerId: string, amount = 1): void {
  const player = requirePlayer(state, playerId);
  for (let i = 0; i < amount; i++) {
    const top = player.library.shift();
    if (!top) {
      player.attemptedDrawFromEmptyLibrary = true;
      state.log.push(`${playerId} attempted to draw from an empty library`);
      continue;
    }
    top.zone = "hand";
    player.hand.push(top);
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
  state.log.push(message);
  if (state.log.length > LOG_LIMIT) state.log.splice(0, state.log.length - LOG_LIMIT);
}

/** The name of whatever card an instance id refers to, for log lines. */
export function cardName(state: GameState, instanceId: string): string {
  const found = findInstance(state, instanceId);
  if (!found) return "a card";
  return state.cardDefinitions[found.instance.definitionId]?.name ?? "a card";
}
