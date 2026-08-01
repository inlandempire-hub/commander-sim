import type { CardDefinition, CardInstance, Effect, GameState, StackTarget } from "./types.js";
import {
  createCardInstance,
  drawCard,
  findInstance,
  log,
  moveCard,
  requirePlayer,
  shuffleLibrary,
} from "./state.js";
import { addMana, canPayManaCost, manaValue, payManaCost } from "./mana.js";
import { effectivePower } from "./counters.js";
import { isSpellOnStack } from "./targeting.js";
import { putOntoBattlefield } from "./permanents.js";

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
          player.life -= effect.amount;
          totalDealt += effect.amount;
        } else if (target.kind === "card") {
          const found = findInstance(state, target.instanceId);
          if (found) {
            found.instance.damageMarked += effect.amount;
            if (hasDeathtouch) found.instance.deathtouchDamage = true;
            totalDealt += effect.amount;
          }
        }
      }
      if (hasLifelink && totalDealt > 0) controller.life += totalDealt;
      return;
    }
    case "draw": {
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
          requirePlayer(state, target.playerId).life += effect.amount;
        }
      }
      if (targets.length === 0) controller.life += effect.amount;
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
      // "each other [subtype] you control" - untargeted, so it sweeps the controller's
      // battlefield rather than reading `targets`, and skips the source itself.
      for (const instance of controller.battlefield) {
        if (instance.instanceId === sourceInstanceId) continue;
        const def = state.cardDefinitions[instance.definitionId];
        if (!def?.types.includes("Creature")) continue;
        if (effect.subtype && !def.subtypes?.includes(effect.subtype)) continue;
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
        moveCard(state, target.instanceId, destination);
      }
      return;
    }
    case "createToken": {
      for (let i = 0; i < effect.count; i++) {
        const token = createCardInstance(state, effect.tokenDefinitionId, controllerId, "battlefield");
        // Tokens enter like any other creature - summoning sick unless hasted.
        const def = state.cardDefinitions[token.definitionId];
        if (def?.keywords?.includes("Haste")) token.summoningSickness = false;
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
    case "searchLibrary": {
      const found = chooseSearchResult(state, controller.library, effect);
      if (found) {
        if (effect.destination === "battlefield") {
          putOntoBattlefield(state, found.instanceId, { tapped: effect.tapped });
        } else {
          moveCard(state, found.instanceId, "hand");
        }
      }
      // Shuffle whether or not anything was found - "then shuffle" isn't
      // conditional on the search succeeding, and skipping it would leak the
      // fact that the library holds no match.
      shuffleLibrary(state, controllerId);
      return;
    }
  }
}

/**
 * Which card a library search finds.
 *
 * The real rules make this the searching player's choice and there is no
 * mid-resolution decision flow yet (the same gap Ward and "unless its
 * controller pays" work around). So the engine picks the most expensive legal
 * card, on the grounds that a tutor is nearly always cast to find the best
 * thing available, and mana value is the only proxy for "best" that doesn't
 * require understanding the card. Basic lands are interchangeable, so the ramp
 * spells - which are most of what this covers - are unaffected either way.
 */
function chooseSearchResult(
  state: GameState,
  library: CardInstance[],
  effect: Extract<Effect, { kind: "searchLibrary" }>,
): CardInstance | undefined {
  const matches = (definition: CardDefinition | undefined): definition is CardDefinition => {
    if (!definition) return false;
    if (effect.basicLandOnly && !definition.supertypes?.includes("Basic")) return false;
    if (effect.cardType && !definition.types.includes(effect.cardType)) return false;
    return true;
  };

  return [...library]
    .filter((card) => matches(state.cardDefinitions[card.definitionId]))
    .sort(
      (a, b) =>
        manaValue(state.cardDefinitions[b.definitionId]?.manaCost ?? { generic: 0, colors: {} }) -
        manaValue(state.cardDefinitions[a.definitionId]?.manaCost ?? { generic: 0, colors: {} }),
    )[0];
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
