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
import { effectivePower } from "./counters.js";
import { isSpellOnStack } from "./targeting.js";
import { enteredBattlefield, putOntoBattlefield } from "./permanents.js";
import { gainLife } from "./life.js";

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
): void {
  const controller = requirePlayer(state, controllerId);
  const sourceDef = state.cardDefinitions[findInstance(state, sourceInstanceId)?.instance.definitionId ?? ""];
  const hasDeathtouch = sourceDef?.keywords?.includes("Deathtouch") ?? false;
  const hasLifelink = sourceDef?.keywords?.includes("Lifelink") ?? false;

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
    case "gainLife": {
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
        if (source) source.instance.plusOneCounters += effect.amount;
        return;
      }
      for (const target of cardTargets) {
        const found = findInstance(state, target.instanceId);
        if (found) found.instance.plusOneCounters += effect.amount;
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
        instance.plusOneCounters += effect.amount;
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
    case "destroy":
    case "exile": {
      for (const target of targets) {
        if (target.kind !== "card") continue;
        const found = findInstance(state, target.instanceId);
        if (!found || found.instance.zone !== "battlefield") continue; // already gone; the spell just fizzles on it

        if (effect.kind === "destroy") {
          const def = state.cardDefinitions[found.instance.definitionId];
          if (def?.keywords?.includes("Indestructible")) continue;
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
      for (let i = 0; i < effect.count; i++) {
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
      const affected = effect.scope === "controller" ? [controller] : state.players;
      for (const player of affected) {
        for (const instance of player.battlefield) {
          if (!state.cardDefinitions[instance.definitionId]?.types.includes("Creature")) continue;
          instance.temporaryPowerBonus += effect.power;
          instance.temporaryToughnessBonus += effect.toughness;
        }
      }
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
        if (spellDef?.cantBeCountered) {
          log(state, `${spellDef.name} can't be countered`);
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
      state.pendingSearch = {
        playerId: controllerId,
        candidateInstanceIds: controller.library
          .filter((card) => matchesSearch(state, card, effect))
          .map((card) => card.instanceId),
        destination: effect.destination,
        tapped: effect.tapped,
        prompt: describeSearch(effect),
      };
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

/** What a search is looking for, in the card's own words, for the picker heading. */
function describeSearch(effect: Extract<Effect, { kind: "searchLibrary" }>): string {
  const what = effect.subtypes?.length
    ? `a ${effect.subtypes.join(" or ")} card`
    : effect.basicLandOnly
      ? "a basic land card"
      : effect.cardType
        ? `a ${effect.cardType.toLowerCase()} card`
        : "a card";
  const where = effect.destination === "battlefield" ? "onto the battlefield" : "into your hand";
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
    } else {
      moveCard(state, instanceId, "hand");
    }
  }

  // Shuffle whether or not anything was found - "then shuffle" isn't
  // conditional on the search succeeding, and skipping it would leak the
  // fact that the library holds no match.
  state.pendingSearch = null;
  shuffleLibrary(state, playerId);
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
