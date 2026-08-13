import type { CardDefinition, CardInstance, Effect, GameState, StackTarget } from "./types.js";
import {
  cardName,
  createCardInstance,
  drawCard,
  findInstance,
  log,
  moveCard,
  requirePlayer,
  shuffleLibrary,
} from "./state.js";
import { addMana, canPayManaCost, manaValue, payManaCost } from "./mana.js";
import { damageCreature, damagePlayer } from "./damage.js";
import { effectivePower, hasKeyword } from "./counters.js";
import { isSpellOnStack } from "./targeting.js";
import { enteredBattlefield, putOntoBattlefield } from "./permanents.js";
import { gainLife } from "./life.js";
import { useRegenerationShield } from "./regeneration.js";
import { sacrificePermanent } from "./sba.js";
import { countersPlaced, tokensCreated } from "./replacements.js";
import { requireNumber } from "./x.js";

/**
 * Applies a resolved (non-permanent) effect: spell/ability damage, draw,
 * mana, life gain. `sourceInstanceId` identifies whatever is dealing the
 * effect, so keywords on it (Deathtouch, Lifelink) apply generically to any
 * damage effect, not just combat damage - a card just declares the
 * keyword, no per-card scripting needed.
 */
export function applyEffect(
  state: GameState,
  controllerId: string,
  sourceInstanceId: string,
  effect: Effect,
  targets: StackTarget[],
  /**
   * The rest of a `sequence` still to run, passed down so a search can hold on
   * to it. Only ever set by the `sequence` case below; every other caller
   * leaves it off and gets exactly the behaviour it always had.
   */
  pendingFollowUp?: Effect[],
): void {
  const controller = requirePlayer(state, controllerId);
  const sourceDef = state.cardDefinitions[findInstance(state, sourceInstanceId)?.instance.definitionId ?? ""];
  const sourceInstance = findInstance(state, sourceInstanceId)?.instance;
  const hasDeathtouch = sourceInstance ? hasKeyword(state, sourceInstance, "Deathtouch") : false;
  const hasLifelink = sourceInstance ? hasKeyword(state, sourceInstance, "Lifelink") : false;

  switch (effect.kind) {
    case "damage": {
      let totalDealt = 0;
      for (const target of targets) {
        if (target.kind === "player") {
          const player = requirePlayer(state, target.playerId);
          totalDealt += damagePlayer(state, player, effect.amount).dealt;
        } else if (target.kind === "card") {
          const found = findInstance(state, target.instanceId);
          if (found) {
            // Counted after prevention, so a shielded target denies lifelink
            // the life it would otherwise have gained.
            totalDealt += damageCreature(state, found.instance, effect.amount, {
              deathtouch: hasDeathtouch,
            }).dealt;
          }
        }
      }
      if (hasLifelink && totalDealt > 0) gainLife(state, controllerId, totalDealt);
      if (totalDealt > 0) {
        log(state, `${cardName(state, sourceInstanceId)} deals ${totalDealt} damage`);
        if (hasLifelink) log(state, `${controllerId} gains ${totalDealt} life (lifelink)`);
      }
      return;
    }
    case "draw": {
      // drawCard logs this itself now, so that the draw step logs too.
      drawCard(state, controllerId, effect.amount);
      return;
    }
    case "addMana": {
      addMana(controller.manaPool, effect.color, effect.amount);
      return;
    }
    case "addManaCombination": {
      // "Add {B}{G}" - one activation, two colours. Each part goes through the
      // same door a single-colour add does, so colourless still lands in the
      // generic bucket rather than needing a second rule about it here.
      for (const part of effect.mana) {
        addMana(controller.manaPool, part.color, part.amount);
      }
      return;
    }
    case "gainLife": {
      // "You gain 1 life" beside a target the rest of the card is aimed at -
      // see the note on the effect type, and Blood Artist.
      if (effect.who === "controller") {
        gainLife(state, controllerId, effect.amount);
        log(state, `${controllerId} gains ${effect.amount} life`);
        return;
      }
      for (const target of targets) {
        if (target.kind === "player") {
          gainLife(state, target.playerId, effect.amount);
        }
      }
      if (targets.length === 0) gainLife(state, controllerId, effect.amount);
      log(state, `${controllerId} gains ${effect.amount} life`);
      return;
    }
    case "preventDamage": {
      /*
       * Shields stack rather than replace: two castings of Healing Salve on
       * the same creature prevent six, not three. Nothing about "prevent the
       * next 3 damage" says the second one throws the first away.
       */
      for (const target of targets) {
        if (target.kind === "player") {
          const player = requirePlayer(state, target.playerId);
          player.damagePrevention += effect.amount;
          log(state, `the next ${effect.amount} damage to ${player.id} this turn will be prevented`);
        } else if (target.kind === "card") {
          const found = findInstance(state, target.instanceId);
          if (found) {
            found.instance.damagePrevention += effect.amount;
            log(
              state,
              `the next ${effect.amount} damage to ${cardName(state, target.instanceId)} this turn will be prevented`,
            );
          }
        }
      }
      return;
    }
    case "addCounter": {
      const cardTargets = targets.filter((t): t is Extract<StackTarget, { kind: "card" }> => t.kind === "card");
      if (cardTargets.length === 0) {
        // No explicit target (e.g. a triggered ability buffing its own source) - counters go on the source itself.
        const source = findInstance(state, sourceInstanceId);
        if (source) source.instance.plusOneCounters += countersPlaced(state, source.instance, effect.amount);
        return;
      }
      for (const target of cardTargets) {
        const found = findInstance(state, target.instanceId);
        if (found) found.instance.plusOneCounters += countersPlaced(state, found.instance, effect.amount);
      }
      return;
    }
    case "addCounterToEachOther": {
      // "each [subtype] you control" - untargeted, so it sweeps the controller's
      // battlefield rather than reading `targets`. The source is skipped unless
      // the card says otherwise: most of this family says "each *other*
      // creature", but Blech says "each Pest ... you control" and is a Pest.
      for (const instance of controller.battlefield) {
        if (instance.instanceId === sourceInstanceId && !effect.includesSelf) continue;
        const def = state.cardDefinitions[instance.definitionId];
        if (!def?.types.includes("Creature")) continue;
        // Any one of the named subtypes is enough - "each Pest, Bat, Insect,
        // Snake, and Spider you control" is five separate ways to qualify.
        if (effect.subtypes?.length && !effect.subtypes.some((s) => def.subtypes?.includes(s))) {
          continue;
        }
        instance.plusOneCounters += countersPlaced(state, instance, effect.amount);
      }
      return;
    }
    case "doublePower": {
      const source = findInstance(state, sourceInstanceId);
      if (!source) return;
      // Doubling means adding however much power it currently has, so the bonus
      // compounds correctly if this resolves more than once in a turn.
      source.instance.temporaryPowerBonus += effectivePower(state, source.instance);
      return;
    }
    case "regenerate": {
      for (const target of targets) {
        if (target.kind !== "card") continue;
        const found = findInstance(state, target.instanceId);
        if (!found || found.instance.zone !== "battlefield") continue;
        found.instance.regenerationShields += 1;
        log(state, `${cardName(state, target.instanceId)} is regenerated`);
      }
      return;
    }
    case "destroy":
    case "exile": {
      for (const target of targets) {
        if (target.kind !== "card") continue;
        const found = findInstance(state, target.instanceId);
        if (!found || found.instance.zone !== "battlefield") continue; // already gone; the spell just fizzles on it

        if (effect.kind === "destroy") {
          if (hasKeyword(state, found.instance, "Indestructible")) continue;
          // A regeneration shield is spent here rather than at the graveyard,
          // because it replaces the destruction itself: the creature never
          // dies, so nothing watching for a death sees anything happen.
          if (useRegenerationShield(state, found.instance)) continue;
        }

        // The commander replacement effect applies to both: a commander that
        // would be destroyed or exiled goes to the command zone instead.
        const destination = found.instance.isCommander ? "command" : effect.kind === "destroy" ? "graveyard" : "exile";
        log(state, `${cardName(state, target.instanceId)} is ${effect.kind === "destroy" ? "destroyed" : "exiled"}`);
        moveCard(state, target.instanceId, destination);
      }
      return;
    }
    case "createToken": {
      // Doubling Season and its family. Asked once for the whole event, not
      // per token - "would create one or more tokens" is a single event, so
      // two Doubling Seasons make four Insects rather than compounding oddly
      // inside the loop.
      const count = tokensCreated(state, controllerId, requireNumber(effect.count, "createToken count"));
      for (let i = 0; i < count; i++) {
        const token = createCardInstance(state, effect.tokenDefinitionId, controllerId, "battlefield");
        /*
         * A token enters the battlefield like anything else, so it goes
         * through the same arrival path - haste, and every trigger that cares
         * that a creature arrived. It used to only get the haste half, done
         * here by hand, which meant three Soldier tokens beside a Soul Warden
         * gained nothing.
         */
        enteredBattlefield(state, token);
      }
      return;
    }
    case "pump": {
      const cardTargets = targets.filter((t): t is Extract<StackTarget, { kind: "card" }> => t.kind === "card");
      // No explicit target means "this creature" - the activated-ability form
      // ("{G}: this creature gets +2/+2"), same convention as addCounter.
      const ids = cardTargets.length > 0 ? cardTargets.map((t) => t.instanceId) : [sourceInstanceId];
      for (const id of ids) {
        const found = findInstance(state, id);
        // A creature that has already left the battlefield just isn't there to
        // be pumped - the spell fizzles on it rather than tracking a ghost.
        if (!found || found.instance.zone !== "battlefield") continue;
        found.instance.temporaryPowerBonus += effect.power;
        found.instance.temporaryToughnessBonus += effect.toughness;
      }
      return;
    }
    case "pumpAll": {
      // Always plain numbers by now - `resolveAmounts` substituted any X when
      // the spell was cast or the trigger fired. Loud if not, because a -X/-X
      // silently reading as -0/-0 looks like a targeting bug rather than a
      // missing substitution.
      const power = requireNumber(effect.power, "pumpAll power");
      const toughness = requireNumber(effect.toughness, "pumpAll toughness");
      const affected = effect.scope === "controller" ? [controller] : state.players;
      const creaturesOnly = (effect.appliesTo ?? "creatures") === "creatures";
      for (const player of affected) {
        for (const instance of player.battlefield) {
          // Heroic Intervention says "permanents you control", so its shield
          // reaches lands and artifacts too. Everything else in this family
          // says creatures.
          if (creaturesOnly && !state.cardDefinitions[instance.definitionId]?.types.includes("Creature")) continue;
          instance.temporaryPowerBonus += power;
          instance.temporaryToughnessBonus += toughness;
          for (const keyword of effect.grants ?? []) {
            if (!instance.grantedKeywords.includes(keyword)) instance.grantedKeywords.push(keyword);
          }
        }
      }
      if (effect.grants?.length) {
        log(state, `${controllerId}'s ${creaturesOnly ? "creatures" : "permanents"} gain ${effect.grants.join(" and ").toLowerCase()} until end of turn`);
      }
      return;
    }
    case "regenerateAll": {
      // Untargeted, so no hexproof check and nothing to fizzle on - the
      // shield simply lands on everything its controller has in play.
      for (const instance of controller.battlefield) {
        if (!state.cardDefinitions[instance.definitionId]?.types.includes("Creature")) continue;
        instance.regenerationShields += 1;
      }
      log(state, `${controllerId} regenerates each creature they control`);
      return;
    }
    case "loseLife": {
      /*
       * Life loss, which is not damage. Nothing is dealt by a source, so no
       * prevention shield applies, lifelink gains nothing, and nothing watching
       * for damage fires. It goes straight to the total.
       */
      const losers =
        effect.who === "target"
          ? // "Target player loses 1 life" - which may legally be yourself, so
            // this reads the chosen target rather than assuming an opponent.
            targets
              .filter((t): t is Extract<StackTarget, { kind: "player" }> => t.kind === "player")
              .map((t) => requirePlayer(state, t.playerId))
          : state.players.filter((p) => p.id !== controllerId);
      for (const player of losers) {
        if (player.hasLost) continue;
        player.life -= effect.amount;
        log(state, `${player.id} loses ${effect.amount} life`);
      }
      return;
    }
    case "discard": {
      /*
       * Each opponent picks their own card, so this queues a question per
       * opponent rather than taking one. `resolveDiscard` finishes the job.
       *
       * A player with an empty hand is not queued at all: there is nothing to
       * choose, and asking would stop the game on a question with no answers.
       */
      for (const player of state.players) {
        if (player.id === controllerId) continue; // "each opponent"
        if (player.hasLost || player.hand.length === 0) continue;
        state.pendingDiscards.push({
          playerId: player.id,
          sourceInstanceId,
          remaining: effect.amount,
          prompt:
            effect.amount === 1
              ? `${cardName(state, sourceInstanceId)}: discard a card`
              : `${cardName(state, sourceInstanceId)}: discard ${effect.amount} cards`,
        });
      }
      return;
    }
    case "surveil": {
      /*
       * Look at the top card, then choose whether it goes to the graveyard.
       *
       * Rides on the search machinery deliberately - see `PendingSearch.noShuffle`.
       * An empty library is not an error and is not a draw: there is simply
       * nothing to look at.
       */
      const library = controller.library;
      if (library.length === 0) return;
      state.pendingSearch = {
        playerId: controllerId,
        effectControllerId: controllerId,
        sourceInstanceId,
        candidateInstanceIds: library.slice(0, effect.amount).map((card) => card.instanceId),
        destination: "graveyard",
        noShuffle: true,
        prompt: `Surveil ${effect.amount}: you may put this card into your graveyard`,
        followUp: pendingFollowUp,
      };
      return;
    }
    case "payLifeToEnterUntapped": {
      const source = findInstance(state, sourceInstanceId);
      if (!source) return;
      requirePlayer(state, source.instance.controllerId).life -= effect.life;
      source.instance.tapped = false;
      log(state, `${source.instance.controllerId} pays ${effect.life} life; ${cardName(state, sourceInstanceId)} enters untapped`);
      return;
    }
    case "counter": {
      for (const target of targets) {
        if (target.kind !== "spell") continue;
        const index = state.stack.findIndex((o) => o.id === target.stackObjectId);
        // Gone already (countered by something else, or resolved) - fizzles.
        if (index < 0) continue;
        const obj = state.stack[index]!;
        if (!isSpellOnStack(state, obj)) continue;

        // "This spell can't be countered." The counterspell was still cast, still
        // targeted this legally, and still resolves - it simply does nothing,
        // which is exactly what the real rules say. It is deliberately not a
        // targeting restriction (see CardDefinition.cantBeCountered).
        const spellCard = findInstance(state, obj.sourceInstanceId);
        const spellDef = spellCard ? state.cardDefinitions[spellCard.instance.definitionId] : undefined;
        // Read off the stack object rather than the card, because it is not
        // always a property of the card: Delighted Halfling's mana makes
        // whatever it paid for uncounterable for that casting only.
        if (obj.cantBeCountered) {
          log(state, `${spellDef?.name ?? "that spell"} can't be countered`);
          continue;
        }

        // "unless its controller pays {N}" is a choice the real rules give that
        // player. There is no mid-resolution decision flow yet, so this takes
        // the same shortcut as Ward (see ward.ts): pay automatically if the
        // floating mana pool covers it, otherwise the spell is countered. No
        // opportunity to decline, and no tapping fresh sources to find it.
        if (effect.unlessPays) {
          const spellController = requirePlayer(state, obj.controllerId);
          if (canPayManaCost(spellController, effect.unlessPays)) {
            payManaCost(spellController, effect.unlessPays);
            continue;
          }
        }

        state.stack.splice(index, 1);
        const found = findInstance(state, obj.sourceInstanceId);
        if (found?.instance.zone === "stack") {
          // A countered spell is put into its owner's graveyard - and the
          // commander replacement effect applies on the way there.
          moveCard(state, obj.sourceInstanceId, found.instance.isCommander ? "command" : "graveyard");
        }
      }
      return;
    }
    case "returnFromGraveyard": {
      for (const target of targets) {
        if (target.kind !== "card") continue;
        const found = findInstance(state, target.instanceId);
        // Someone else may have exiled it in response - the spell just fizzles on it.
        if (!found || found.instance.zone !== "graveyard") continue;

        if (effect.destination === "battlefield") {
          // Reanimation is a genuine enters-the-battlefield event, triggers and all.
          putOntoBattlefield(state, target.instanceId);
        } else {
          moveCard(state, target.instanceId, "hand");
        }
      }
      return;
    }
    case "returnFromExile": {
      for (const target of targets) {
        if (target.kind !== "card") continue;
        const found = findInstance(state, target.instanceId);
        if (!found || found.instance.zone !== "exile") continue;

        if (effect.destination === "battlefield") {
          putOntoBattlefield(state, target.instanceId);
        } else {
          moveCard(state, target.instanceId, "hand");
        }
      }
      return;
    }
    case "searchLibrary": {
      // Searching stops the game and asks: which card you take is the whole
      // point of a tutor, and the real rules make it the searching player's
      // choice. `resolveSearch` finishes the job once they've answered.
      const searcherId = searchingPlayerId(state, controllerId, effect, targets);
      // Nobody to search - Assassin's Trophy's target left the battlefield in
      // response, so the destroy fizzled and there is no "its controller".
      if (!searcherId) return;
      const searcher = requirePlayer(state, searcherId);
      state.pendingSearch = {
        playerId: searcherId,
        effectControllerId: controllerId,
        sourceInstanceId,
        candidateInstanceIds: searcher.library
          .filter((card) => matchesSearch(state, card, effect))
          .map((card) => card.instanceId),
        destination: effect.destination,
        tapped: effect.tapped,
        prompt: describeSearch(effect),
        // Carried through by `sequence` below when there is more of the card
        // left to do after the shuffle.
        followUp: pendingFollowUp,
      };
      return;
    }
    case "sacrifice": {
      const source = findInstance(state, sourceInstanceId);
      // Already gone - somebody destroyed it in response, or this is the second
      // time round a loop. Sacrificing nothing is not an error.
      if (!source || source.instance.zone !== "battlefield") return;
      sacrificePermanent(state, sourceInstanceId);
      return;
    }
    case "sequence": {
      /*
       * Each step in order, as one resolution.
       *
       * The awkward step is a library search: it does not finish, it stops and
       * asks. So the remaining steps are handed to the search to run once the
       * player has answered, and this returns rather than carrying on - which
       * is the difference between Riveteers Overlook gaining you 1 life after
       * the shuffle, as printed, and gaining it before you have even chosen a
       * land.
       */
      for (let i = 0; i < effect.effects.length; i++) {
        const step = effect.effects[i]!;
        const rest = effect.effects.slice(i + 1);
        applyEffect(state, controllerId, sourceInstanceId, step, targets, rest);
        if (state.pendingSearch) return;
      }
      return;
    }
    case "modal": {
      // castSpell unwraps the chosen mode before the spell reaches the stack,
      // so getting here means something built a modal triggered or activated
      // ability - which nothing chooses a mode for yet. Loud rather than
      // silently picking one.
      throw new Error("Modal effects are only supported on cast spells");
    }
  }
}

/**
 * Who actually searches, which is not always the player who cast the spell.
 *
 * "Its controller may search their library" (Assassin's Trophy) hands the
 * search to whoever owned the permanent that was just destroyed. That card is
 * in a graveyard by the time this runs, and control of a card outside the
 * battlefield always sits with its owner (rule 108.4), so the owner is the
 * right answer rather than a convenient one. Nothing in this engine can change
 * control of a permanent either, so the two never diverge on the battlefield.
 *
 * Returns null when there is nobody: the target was already gone, so the
 * destroy did nothing and the rider has no "its controller" to point at.
 */
function searchingPlayerId(
  state: GameState,
  controllerId: string,
  effect: Extract<Effect, { kind: "searchLibrary" }>,
  targets: StackTarget[],
): string | null {
  if ((effect.who ?? "controller") === "controller") return controllerId;
  const cardTarget = targets.find((t): t is Extract<StackTarget, { kind: "card" }> => t.kind === "card");
  if (!cardTarget) return null;
  return findInstance(state, cardTarget.instanceId)?.instance.ownerId ?? null;
}

/** "a Swamp or a Forest", "Swamp, Mountain, or Forest" - the printed list form. */
function listOr(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} or ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, or ${items[items.length - 1]}`;
}

/** What a search is looking for, in the card's own words, for the picker heading. */
function describeSearch(effect: Extract<Effect, { kind: "searchLibrary" }>): string {
  /*
   * "a basic Swamp, Mountain, or Forest card" - the two restrictions are not
   * the same and both belong in the heading.
   *
   * This read "a Swamp or Mountain or Forest card" and dropped "basic"
   * entirely, which is the difference between a fetchland (any card with the
   * type, so a dual is a legal find) and Riveteers Overlook (basics only).
   * The picker heading is the only place a player is told which they are
   * looking at.
   */
  const basic = effect.basicLandOnly ? "basic " : "";
  const what = effect.subtypes?.length
    ? `a ${basic}${listOr(effect.subtypes)} card`
    : effect.basicLandOnly
      ? "a basic land card"
      : effect.cardType
        ? `a ${effect.cardType.toLowerCase()} card`
        : "a card";
  const where =
    effect.destination === "battlefield"
      ? "onto the battlefield"
      : effect.destination === "library-top"
        ? "on top of your library"
        : "into your hand";
  return `Search your library for ${what} and put it ${where}${effect.tapped ? " tapped" : ""}`;
}

function matchesSearch(
  state: GameState,
  card: CardInstance,
  effect: Extract<Effect, { kind: "searchLibrary" }>,
): boolean {
  const definition = state.cardDefinitions[card.definitionId];
  if (!definition) return false;
  if (effect.basicLandOnly && !definition.supertypes?.includes("Basic")) return false;
  if (effect.cardType && !definition.types.includes(effect.cardType)) return false;
  // "A Swamp or Mountain card" - any one of them is enough, and a nonbasic with
  // the type counts. Bayou is a legal find for a fetchland asking for a Swamp.
  if (effect.subtypes?.length && !effect.subtypes.some((s) => definition.subtypes?.includes(s))) {
    return false;
  }
  return true;
}

/**
 * Finishes a search once its controller has named a card - or declined, which
 * is always allowed: the real rules let you search and take nothing.
 *
 * The chosen card is re-checked against the pending candidates rather than
 * trusted, so a client can't reach into the library for something the search
 * never offered.
 */
export function resolveSearch(state: GameState, playerId: string, instanceId: string | null): void {
  const pending = state.pendingSearch;
  if (!pending) throw new Error("No search is waiting to be resolved");
  if (pending.playerId !== playerId) throw new Error(`The search belongs to ${pending.playerId}`);

  if (instanceId !== null) {
    if (!pending.candidateInstanceIds.includes(instanceId)) {
      throw new Error("That card was not among the search results");
    }
    if (pending.destination === "battlefield") {
      putOntoBattlefield(state, instanceId, { tapped: pending.tapped });
    } else if (pending.destination === "hand") {
      moveCard(state, instanceId, "hand");
    } else if (pending.destination === "graveyard") {
      // Surveil's "yes". A card put into the graveyard from the library is an
      // ordinary zone change, so it goes through the same door everything
      // else does.
      moveCard(state, instanceId, "graveyard");
    }
    // "library-top" is deliberately not handled here: the card has to survive
    // the shuffle below and *then* go on top, which is the order the cards
    // print ("then shuffle and put that card on top"). See below.
  }

  // Shuffle whether or not anything was found - "then shuffle" isn't
  // conditional on the search succeeding, and skipping it would leak the
  // fact that the library holds no match.
  const followUp = pending.followUp;
  const sourceInstanceId = pending.sourceInstanceId;
  const effectControllerId = pending.effectControllerId;
  const destination = pending.destination;
  const noShuffle = pending.noShuffle;
  state.pendingSearch = null;
  // Surveil never shuffles - you looked at the top card and put it back, or
  // did not. Shuffling would throw away the information the card just bought.
  if (!noShuffle) shuffleLibrary(state, playerId);

  /*
   * Sylvan Tutor's ordering, and it is the whole card.
   *
   * "Then shuffle and put that card on top" means the shuffle happens first
   * and the card lands on top of the shuffled library - so you draw it next
   * turn, guaranteed. Doing it the other way round would put the card on top
   * and then shuffle it back into a random position, which is not a tutor at
   * all. The card never left the library, so this is a reorder rather than a
   * zone change: no zone-change triggers, no counters cleared.
   */
  if (destination === "library-top" && instanceId !== null) {
    const library = requirePlayer(state, playerId).library;
    const index = library.findIndex((card) => card.instanceId === instanceId);
    if (index >= 0) library.unshift(...library.splice(index, 1));
  }

  /*
   * The rest of whatever this search interrupted - Riveteers Overlook's "and
   * you gain 1 life", which is printed after the shuffle and now happens after
   * it.
   *
   * Cleared before running, not after: a follow-up containing a second search
   * sets `pendingSearch` again, and clearing afterwards would wipe the new one
   * out and strand the game.
   */
  if (followUp?.length) {
    // The rest of the card belongs to whoever cast it, not to whoever answered
    // the picker. The two are the same for every tutor cast as its own spell,
    // and different the moment a spell makes somebody else search.
    applyEffect(state, effectControllerId, sourceInstanceId, { kind: "sequence", effects: followUp }, []);
  }
}


/**
 * Puts one card from the discarding player's own hand into their graveyard.
 *
 * Re-checked against the pending entry rather than trusted, like every other
 * mid-resolution answer: a client cannot discard for somebody else, and cannot
 * name a card that is not in that player's hand.
 *
 * The entry stays on the queue until the player has paid it in full, so "each
 * opponent discards two cards" asks twice before moving on to the next player.
 */
export function resolveDiscard(state: GameState, playerId: string, instanceId: string): void {
  const pending = state.pendingDiscards[0];
  if (!pending) throw new Error("Nobody owes a discard");
  if (pending.playerId !== playerId) throw new Error(`The discard belongs to ${pending.playerId}`);

  const player = requirePlayer(state, playerId);
  const card = player.hand.find((c) => c.instanceId === instanceId);
  if (!card) throw new Error("That card is not in your hand");

  log(state, `${playerId} discards ${cardName(state, instanceId)}`);
  moveCard(state, instanceId, "graveyard");

  pending.remaining -= 1;
  // Out of cards counts as paid: you discard as much as you can and no more.
  if (pending.remaining <= 0 || player.hand.length === 0) state.pendingDiscards.shift();
}

/** Exported for the bot and UI: the creatures a pumpAll would actually touch. */
export function creaturesAffectedByPumpAll(
  state: GameState,
  controllerId: string,
  scope: "controller" | "all",
): CardInstance[] {
  const players = scope === "controller" ? [requirePlayer(state, controllerId)] : state.players;
  return players.flatMap((p) =>
    p.battlefield.filter((c) => state.cardDefinitions[c.definitionId]?.types.includes("Creature")),
  );
}
