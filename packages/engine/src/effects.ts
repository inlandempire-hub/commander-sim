import type { CardDefinition, CardInstance, Effect, GameState, ManaCost, StackTarget } from "./types.js";
import { ALL_COLORS } from "./types.js";
import {
  cardName,
  createCardInstance,
  drawCard,
  findInstance,
  log,
  moveCard,
  requireDefinition,
  requirePlayer,
  shuffleLibrary,
} from "./state.js";
import { addMana, canPayManaCost, manaValue, payManaCost } from "./mana.js";
import { damageCreature, damagePlayer } from "./damage.js";
import { effectivePower, hasKeyword } from "./counters.js";
import { isSpellOnStack } from "./targeting.js";
import { enteredBattlefield, pushTrigger, putOntoBattlefield } from "./permanents.js";
import { gainLife } from "./life.js";
import { useRegenerationShield } from "./regeneration.js";
import { destroyPermanent, leaveBattlefield, sacrificePermanent } from "./sba.js";
import { countersPlaced, tokensCreated } from "./replacements.js";
import { evaluateAmount } from "./amounts.js";
import { meetsBoardCondition } from "./conditions.js";
import { hasCreatureType } from "./counters.js";
import { resolveAmounts } from "./x.js";
import { castSpell } from "./casting.js";
import { legalTargetsFor, targetSelectorOf } from "./targeting.js";

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
  const hasInfect = sourceInstance ? hasKeyword(state, sourceInstance, "Infect") : false;
  const hasLifelink = sourceInstance ? hasKeyword(state, sourceInstance, "Lifelink") : false;

  switch (effect.kind) {
    case "damage": {
      let totalDealt = 0;
      for (const target of targets) {
        if (target.kind === "player") {
          const player = requirePlayer(state, target.playerId);
          totalDealt += damagePlayer(state, player, effect.amount, { infect: hasInfect }).dealt;
        } else if (target.kind === "card") {
          const found = findInstance(state, target.instanceId);
          if (found) {
            // Counted after prevention, so a shielded target denies lifelink
            // the life it would otherwise have gained.
            totalDealt += damageCreature(state, found.instance, effect.amount, {
              deathtouch: hasDeathtouch,
              infect: hasInfect,
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
      // The amount is counted at resolution for the cards that read the board
      // - Inspiring Call draws one card fewer if you kill a creature first.
      //
      // "Target player draws" (Peer into the Abyss) reads the target, and the
      // amount is evaluated against that same player so "half their library"
      // means the drawer's library, not the caster's.
      let drawer = controllerId;
      if (effect.who === "target") {
        const tp = targets.find((t): t is Extract<StackTarget, { kind: "player" }> => t.kind === "player");
        if (tp) drawer = tp.playerId;
      }
      drawCard(state, drawer, evaluateAmount(state, drawer, effect.amount, "draw amount"));
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
      const life = evaluateAmount(state, controllerId, effect.amount, "gainLife amount");
      // Gaining 0 is not gaining life, and firing the "whenever you gain life"
      // watchers for it would be a real difference - see gainLife in life.ts.
      if (life <= 0) return;
      // "You gain 1 life" beside a target the rest of the card is aimed at -
      // see the note on the effect type, and Blood Artist.
      if (effect.who === "controller") {
        gainLife(state, controllerId, life);
        log(state, `${controllerId} gains ${life} life`);
        return;
      }
      for (const target of targets) {
        if (target.kind === "player") {
          gainLife(state, target.playerId, life);
        }
      }
      if (targets.length === 0) gainLife(state, controllerId, life);
      log(state, `${controllerId} gains ${life} life`);
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
      const amount = evaluateAmount(state, controllerId, effect.amount, "addCounter amount");
      // "Put those counters on The Ozolith" when the creature that left had
      // none is nothing happening, not an error.
      if (amount <= 0) return;
      const cardTargets = targets.filter((t): t is Extract<StackTarget, { kind: "card" }> => t.kind === "card");
      if (cardTargets.length === 0) {
        // No explicit target (e.g. a triggered ability buffing its own source) - counters go on the source itself.
        const source = findInstance(state, sourceInstanceId);
        if (source) source.instance.plusOneCounters += countersPlaced(state, source.instance, amount);
        return;
      }
      for (const target of cardTargets) {
        const found = findInstance(state, target.instanceId);
        if (found) found.instance.plusOneCounters += countersPlaced(state, found.instance, amount);
      }
      return;
    }
    case "moveAllCounters": {
      const source = findInstance(state, sourceInstanceId);
      if (!source) return;
      const moving = source.instance.plusOneCounters;
      if (moving <= 0) return;
      for (const target of targets) {
        if (target.kind !== "card") continue;
        const found = findInstance(state, target.instanceId);
        if (!found || found.instance.zone !== "battlefield") continue;
        /*
         * Emptied first, so the counters exist in exactly one place at every
         * moment. A replacement effect watching for counters being *placed*
         * still applies to the arrival - Doubling Season really does double a
         * pile moved off The Ozolith, which is the interaction the card is
         * played for.
         */
        source.instance.plusOneCounters = 0;
        found.instance.plusOneCounters += countersPlaced(state, found.instance, moving);
        log(
          state,
          `${moving} +1/+1 counter${moving === 1 ? "" : "s"} move from ${cardName(state, sourceInstanceId)} to ${cardName(state, target.instanceId)}`,
        );
      }
      return;
    }
    case "mill": {
      /*
       * The top N cards of the library into the graveyard.
       *
       * Milling out is not losing: only *drawing* from an empty library does
       * that (rule 104.3c), so this deliberately never touches
       * `attemptedDrawFromEmptyLibrary`. Taking whatever is there and stopping
       * is the whole rule for a library shorter than N.
       */
      const count = evaluateAmount(state, controllerId, effect.amount, "mill amount");
      const milled = controller.library.slice(0, count).map((card) => card.instanceId);
      for (const instanceId of milled) moveCard(state, instanceId, "graveyard");
      if (milled.length > 0) {
        log(state, `${controllerId} mills ${milled.length} card${milled.length === 1 ? "" : "s"}`);
      }
      return;
    }
    case "exileTop": {
      /*
       * The top N cards of the library into exile - mill, one zone over. Takes
       * whatever is there and stops; a library shorter than N is not a loss.
       */
      const count = evaluateAmount(state, controllerId, effect.amount, "exile amount");
      const exiled = controller.library.slice(0, count).map((card) => card.instanceId);
      for (const instanceId of exiled) moveCard(state, instanceId, "exile");
      if (exiled.length > 0) {
        log(state, `${controllerId} exiles ${exiled.length} card${exiled.length === 1 ? "" : "s"} from the top of their library`);
      }
      return;
    }
    case "extraTurn": {
      /*
       * "Target player takes N extra turns after this one." The turns are queued
       * front of the current one's successor: whoever is taking extra turns keeps
       * going before the order rotates on. See `startNextTurn`.
       */
      const targetPlayer = targets.find((t) => t.kind === "player");
      const beneficiary = targetPlayer?.kind === "player" ? targetPlayer.playerId : controllerId;
      for (let i = 0; i < effect.count; i++) state.extraTurns.push(beneficiary);
      log(state, `${beneficiary} will take ${effect.count} extra turn${effect.count === 1 ? "" : "s"}`);
      return;
    }
    case "windfall": {
      /*
       * Each player discards their hand, then everyone draws the greatest number
       * anybody discarded. The count is read before anyone discards, so a player
       * who was holding the most sets the draw for the whole table.
       */
      const greatest = Math.max(0, ...state.players.map((p) => p.hand.length));
      for (const p of state.players) {
        for (const card of [...p.hand]) moveCard(state, card.instanceId, "graveyard");
      }
      if (greatest === 0) return;
      for (const p of state.players) drawCard(state, p.id, greatest);
      return;
    }
    case "destroyAll": {
      // Snapshot first - destroying mutates the battlefields being scanned. Then
      // each victim goes through the same destroy path as single-target removal,
      // so indestructible, regeneration and dies triggers all apply.
      const victims: string[] = [];
      for (const p of state.players) {
        for (const inst of p.battlefield) {
          const def = requireDefinition(state, inst.definitionId);
          if (!effect.cardTypes.some((t) => def.types.includes(t))) continue;
          if (effect.nonland && def.types.includes("Land")) continue;
          if (
            effect.maxManaValue !== undefined &&
            manaValue(def.manaCost ?? { generic: 0, colors: {} }) > effect.maxManaValue
          ) {
            continue;
          }
          victims.push(inst.instanceId);
        }
      }
      let destroyed = 0;
      for (const id of victims) {
        const found = findInstance(state, id);
        if (!found || found.instance.zone !== "battlefield") continue;
        if (hasKeyword(state, found.instance, "Indestructible")) continue;
        if (useRegenerationShield(state, found.instance)) continue;
        log(state, `${cardName(state, id)} is destroyed`);
        destroyPermanent(state, id);
        destroyed += 1;
      }
      if (effect.thenDraw && destroyed > 0) drawCard(state, controllerId, destroyed);
      if (effect.manaPerDestroyed && effect.manaPerDestroyed.length > 0) {
        // One mana per permanent destroyed, spread round-robin across the colours.
        for (let i = 0; i < destroyed; i++) {
          addMana(controller.manaPool, effect.manaPerDestroyed[i % effect.manaPerDestroyed.length]!, 1);
        }
      }
      return;
    }
    case "atNextUpkeep": {
      // Queued for the next turn's upkeep. "each-opponent" is Arcane Denial's
      // "its controller", which in a two-player game is the one opponent.
      const recipients =
        effect.who === "each-opponent"
          ? state.players.filter((p) => p.id !== controllerId).map((p) => p.id)
          : [controllerId];
      for (const rid of recipients) {
        state.delayedUpkeepEffects.push({
          controllerId: rid,
          effect: effect.effect,
          fireAtTurn: state.turnNumber + 1,
        });
      }
      return;
    }
    case "eachSacrifices": {
      const affected =
        effect.who === "each-opponent"
          ? state.players.filter((p) => p.id !== controllerId)
          : state.players;
      const wantedTypes = effect.types ?? ["Creature"];
      for (const p of affected) {
        if (p.hasLost) continue;
        const eligible = p.battlefield.filter((c) =>
          wantedTypes.some((t) => requireDefinition(state, c.definitionId).types.includes(t)),
        );
        const mv = (c: (typeof eligible)[number]) =>
          manaValue(requireDefinition(state, c.definitionId).manaCost ?? { generic: 0, colors: {} });
        let victims: typeof eligible;
        if (effect.greatestManaValue) {
          if (eligible.length === 0) continue;
          const top = Math.max(...eligible.map(mv));
          victims = eligible.filter((c) => mv(c) === top).slice(0, 1);
        } else {
          victims = [...eligible].sort((a, b) => mv(a) - mv(b)).slice(0, effect.count ?? 1);
        }
        for (const c of victims) sacrificePermanent(state, c.instanceId);
      }
      return;
    }
    case "counterAll": {
      // Every stack object an opponent controls that can be countered is removed;
      // a countered spell's card goes to its owner's graveyard (or the command
      // zone). Abilities have no card and just cease. Count what was countered.
      let countered = 0;
      for (const obj of [...state.stack]) {
        if (obj.controllerId === controllerId || obj.cantBeCountered) continue;
        const index = state.stack.findIndex((o) => o.id === obj.id);
        if (index < 0) continue;
        state.stack.splice(index, 1);
        const found = findInstance(state, obj.sourceInstanceId);
        if (found?.instance.zone === "stack") {
          moveCard(state, obj.sourceInstanceId, found.instance.isCommander ? "command" : "graveyard");
        }
        countered += 1;
      }
      if (countered > 0) {
        log(state, `${controllerId} counters ${countered} opposing spell${countered === 1 ? "" : "s"} and abilit${countered === 1 ? "y" : "ies"}`);
      }
      if (effect.tokenPerCountered) {
        for (let i = 0; i < countered; i++) {
          const token = createCardInstance(state, effect.tokenPerCountered, controllerId, "battlefield");
          enteredBattlefield(state, token);
        }
      }
      return;
    }
    case "becomeCopy": {
      // The source permanent takes on the printed characteristics of the target
      // by adopting its definition. A copy of a card, so counters and marked
      // damage on the source are left as they are (they belong to the object).
      const t = targets.find((x): x is Extract<StackTarget, { kind: "card" }> => x.kind === "card");
      const source = findInstance(state, sourceInstanceId);
      if (!t || !source) return;
      const copyOf = findInstance(state, t.instanceId);
      if (!copyOf || copyOf.instance.zone !== "battlefield") return;
      source.instance.definitionId = copyOf.instance.definitionId;
      log(state, `${cardName(state, sourceInstanceId)} becomes a copy of ${cardName(state, t.instanceId)}`);
      return;
    }
    case "lookAtHand": {
      // Information only - the hand is revealed to the controller and nothing
      // in the game state changes. The redacted view already hides it from
      // everyone else, so there is nothing to move.
      const t = targets.find((x): x is Extract<StackTarget, { kind: "player" }> => x.kind === "player");
      if (t) log(state, `${controllerId} looks at ${t.playerId}'s hand`);
      return;
    }
    case "winGame": {
      // The controller wins, which in this engine means every other player loses.
      for (const p of state.players) {
        if (p.id === controllerId || p.hasLost) continue;
        p.hasLost = true;
        p.lossReason = `${controllerId} won the game`;
      }
      log(state, `${controllerId} wins the game`);
      return;
    }
    case "returnToHand": {
      // "Return ... to their owners' hands." moveCard sends each to its owner's
      // hand; a target already gone is simply skipped.
      for (const t of targets) {
        if (t.kind !== "card") continue;
        const found = findInstance(state, t.instanceId);
        if (found && found.instance.zone === "battlefield") {
          log(state, `${cardName(state, t.instanceId)} is returned to its owner's hand`);
          moveCard(state, t.instanceId, "hand");
        }
      }
      return;
    }
    case "untap": {
      // "Untap target Forest." Just clears the tapped flag on the chosen
      // permanent; the target legality is enforced when the ability is aimed.
      const t = targets.find((x): x is Extract<StackTarget, { kind: "card" }> => x.kind === "card");
      if (!t) return;
      const found = findInstance(state, t.instanceId);
      if (found) {
        found.instance.tapped = false;
        log(state, `${controllerId} untaps ${cardName(state, t.instanceId)}`);
      }
      return;
    }
    case "putLandFromHand": {
      // "You may put a land card from your hand onto the battlefield." Optional,
      // and not the turn's land drop - it goes straight onto the battlefield.
      const lands = controller.hand.filter((card) =>
        requireDefinition(state, card.definitionId).types.includes("Land"),
      );
      if (lands.length === 0) return;
      state.pendingCardChoices.push({
        playerId: controllerId,
        effectControllerId: controllerId,
        sourceInstanceId,
        candidateInstanceIds: lands.map((c) => c.instanceId),
        min: 0,
        max: 1,
        mode: "to-battlefield",
        prompt: `${cardName(state, sourceInstanceId)}: you may put a land from your hand onto the battlefield`,
        followUp: pendingFollowUp,
      });
      return;
    }
    case "scry": {
      /*
       * Look at the top card and choose whether it goes to the bottom.
       *
       * The same interaction as surveil down to the picker, and rides on the
       * same machinery for exactly that reason - the only difference between
       * the two keywords is where the card ends up, which is one destination
       * rather than a second mechanism. See `PendingSearch.noShuffle`.
       */
      if (controller.library.length === 0) return;
      state.pendingSearch = {
        playerId: controllerId,
        effectControllerId: controllerId,
        sourceInstanceId,
        candidateInstanceIds: controller.library.slice(0, effect.amount).map((card) => card.instanceId),
        destination: "library-bottom",
        noShuffle: true,
        prompt: `Scry ${effect.amount}: you may put this card on the bottom of your library`,
        followUp: pendingFollowUp,
      };
      return;
    }
    case "lookAndArrange": {
      /*
       * "Look at the top N cards of your library, then put them back in any
       * order" - Halimar Depths, Ponder. Unlike scry no card leaves the top, so
       * the only decision is the ordering; `resolveArrange` applies it. Stops
       * resolution and asks, holding on to anything printed after it.
       *
       * A library shorter than N is fine: show whatever is there. An empty one
       * has nothing to arrange, so the follow-up (Ponder's draw) runs straight
       * away rather than stranding on a picker with no cards.
       */
      const top = controller.library.slice(0, effect.amount).map((card) => card.instanceId);
      if (top.length === 0) {
        if (pendingFollowUp?.length) {
          for (const next of pendingFollowUp) applyEffect(state, controllerId, sourceInstanceId, next, targets);
        }
        return;
      }
      state.pendingArrange = {
        playerId: controllerId,
        sourceInstanceId,
        cardInstanceIds: top,
        mayShuffle: effect.mayShuffle ?? false,
        prompt: `Look at the top ${top.length} card${top.length === 1 ? "" : "s"} of your library, then put them back in any order`,
        followUp: pendingFollowUp,
      };
      return;
    }
    case "putFromHandOnTop": {
      /*
       * "Put N cards from your hand on top of your library in any order" -
       * Brainstorm, after its draw. The choice is which cards and in what
       * order, so it rides on `PendingCardChoice` with the `to-library-top`
       * mode; `resolveCardChoice` does the moving. An empty hand has nothing to
       * put back, so the rest of the card (there is none on Brainstorm) runs on.
       */
      const count = Math.min(effect.count, controller.hand.length);
      if (count === 0) {
        if (pendingFollowUp?.length) {
          for (const next of pendingFollowUp) applyEffect(state, controllerId, sourceInstanceId, next, targets);
        }
        return;
      }
      state.pendingCardChoices.push({
        playerId: controllerId,
        effectControllerId: controllerId,
        sourceInstanceId,
        candidateInstanceIds: controller.hand.map((card) => card.instanceId),
        min: count,
        max: count,
        mode: "to-library-top",
        prompt: `Put ${count} card${count === 1 ? "" : "s"} from your hand on top of your library`,
        followUp: pendingFollowUp,
      });
      return;
    }
    case "conditional": {
      /*
       * "If you control six or more lands, create a copy instead." One branch
       * or the other, never both - Scute Swarm makes one token per landfall,
       * and a card written as two abilities would make two.
       */
      const met = meetsBoardCondition(state, controllerId, effect.condition, sourceInstanceId);
      const branch = met ? effect.then : effect.otherwise;
      if (branch) applyEffect(state, controllerId, sourceInstanceId, branch, targets);
      return;
    }
    case "createCopyToken": {
      const source = findInstance(state, sourceInstanceId);
      if (!source) return;
      let copied = source.instance;
      if (effect.of === "attached-creature") {
        // Springheart Nantuko copies whatever it is bestowed onto, not itself.
        if (!source.instance.attachedTo) return;
        const host = findInstance(state, source.instance.attachedTo);
        if (!host || host.instance.zone !== "battlefield") return;
        copied = host.instance;
      }
      const made = tokensCreated(state, controllerId, 1);
      for (let i = 0; i < made; i++) {
        const token = createCardInstance(state, copied.definitionId, controllerId, "battlefield");
        /*
         * Flagged on the instance, never on the definition. The definition
         * being copied is a printed card, and marking *it* a token would make
         * every real copy of that card cease to exist on leaving play.
         */
        token.isTokenCopy = true;
        // "a 1/1 token copy" - Offspring stamps the copy's printed P/T over the
        // original's, everything else copied. Set before it enters so its own
        // arrival reads the right size.
        if (effect.ptOverride) {
          token.basePowerOverride = effect.ptOverride.power;
          token.baseToughnessOverride = effect.ptOverride.toughness;
        }
        enteredBattlefield(state, token);
      }
      log(state, `${controllerId} creates a token copy of ${cardName(state, copied.instanceId)}`);
      return;
    }
    case "addOtherCounter": {
      const source = findInstance(state, sourceInstanceId);
      if (source) source.instance.otherCounters += effect.amount;
      return;
    }
    case "millThenMayTake": {
      /*
       * Mill, then offer the milled cards back for a price. One effect because
       * the choice is over a set that exists only inside this resolution -
       * "a card from among those cards" cannot be named any other way.
       */
      const milled = controller.library.slice(0, effect.amount).map((card) => card.instanceId);
      for (const instanceId of milled) moveCard(state, instanceId, "graveyard");
      if (milled.length > 0) {
        log(state, `${controllerId} mills ${milled.length} card${milled.length === 1 ? "" : "s"}`);
      }
      // "a noncreature, nonland card from among them" - only milled cards of none
      // of the excluded types may be taken (Fallaji Archaeologist).
      const takeable = effect.excludeTypes
        ? milled.filter((id) => {
            const types = requireDefinition(state, findInstance(state, id)!.instance.definitionId).types;
            return !effect.excludeTypes!.some((t) => types.includes(t));
          })
        : milled;
      if (takeable.length === 0) {
        // Nothing to take - the "if you don't" half happens right away.
        if (effect.ifDeclined) applyEffect(state, controllerId, sourceInstanceId, effect.ifDeclined, []);
        return;
      }
      state.pendingCardChoices.push({
        playerId: controllerId,
        effectControllerId: controllerId,
        sourceInstanceId,
        candidateInstanceIds: takeable,
        min: 0,
        max: 1,
        mode: "to-hand",
        cost: effect.cost,
        ifDeclined: effect.ifDeclined,
        prompt: `${cardName(state, sourceInstanceId)}: you may take one of the milled cards`,
        followUp: pendingFollowUp,
      });
      return;
    }
    case "lookTopMayTake": {
      /*
       * "Look at the top four cards. You may reveal a noncreature, nonland card
       * and put it into your hand. Put the rest on the bottom." Nothing moves
       * yet - the looked-at cards stay on top until the choice resolves, which
       * is where the taken one goes to hand and the rest go to the bottom.
       */
      const looked = controller.library.slice(0, effect.amount).map((c) => c.instanceId);
      if (looked.length === 0) return;
      const takeable = effect.excludeTypes
        ? looked.filter((id) => {
            const types = requireDefinition(state, findInstance(state, id)!.instance.definitionId).types;
            return !effect.excludeTypes!.some((t) => types.includes(t));
          })
        : looked;
      state.pendingCardChoices.push({
        playerId: controllerId,
        effectControllerId: controllerId,
        sourceInstanceId,
        candidateInstanceIds: takeable,
        min: 0,
        max: 1,
        mode: "to-hand",
        restToBottom: looked,
        prompt: `${cardName(state, sourceInstanceId)}: you may reveal a noncreature, nonland card to put into your hand`,
        followUp: pendingFollowUp,
      });
      return;
    }
    case "millThenPlayLands": {
      /*
       * Mill that many, then offer the milled *lands* to put onto the
       * battlefield tapped - Rampant Frogantua. The cards are in the graveyard
       * by the time the choice is made, which is where "from among them" points.
       */
      const n = evaluateAmount(state, controllerId, effect.amount, "mill amount", sourceInstanceId);
      const milled = controller.library.slice(0, n).map((c) => c.instanceId);
      for (const id of milled) moveCard(state, id, "graveyard");
      if (milled.length > 0) {
        log(state, `${controllerId} mills ${milled.length} card${milled.length === 1 ? "" : "s"}`);
      }
      const lands = milled.filter((id) =>
        requireDefinition(state, findInstance(state, id)!.instance.definitionId).types.includes("Land"),
      );
      if (lands.length === 0) return;
      state.pendingCardChoices.push({
        playerId: controllerId,
        effectControllerId: controllerId,
        sourceInstanceId,
        candidateInstanceIds: lands,
        min: 0,
        max: lands.length,
        mode: "to-battlefield",
        toBattlefieldTapped: true,
        prompt: `${cardName(state, sourceInstanceId)}: you may put any number of the milled lands onto the battlefield tapped`,
        followUp: pendingFollowUp,
      });
      return;
    }
    case "castFreeFromHand": {
      const candidates = controller.hand.filter((card) => {
        const def = requireDefinition(state, card.definitionId);
        // A land is not a spell, and cannot be cast at all.
        if (def.types.includes("Land")) return false;
        return manaValue(def.manaCost ?? { generic: 0, colors: {} }) <= effect.maxManaValue;
      });
      if (candidates.length === 0) return;
      state.pendingCardChoices.push({
        playerId: controllerId,
        effectControllerId: controllerId,
        sourceInstanceId,
        candidateInstanceIds: candidates.map((c) => c.instanceId),
        min: 0,
        max: 1,
        mode: "cast-free",
        prompt: `${cardName(state, sourceInstanceId)}: you may cast a spell with mana value ${effect.maxManaValue} or less without paying its mana cost`,
        followUp: pendingFollowUp,
      });
      return;
    }
    case "payLifeDrawThatMany": {
      /*
       * "Pay any amount of life. Draw that many cards." The ceiling is one
       * short of the life total: paying down to exactly 0 is legal under the
       * rules, but this asks without being able to explain the consequence, so
       * it declines to offer a way to concede by accident. Same posture as the
       * shockland question.
       */
      const max = Math.max(controller.life - 1, 0);
      if (max === 0) return;
      state.pendingAmount = {
        playerId: controllerId,
        sourceInstanceId,
        prompt: `${cardName(state, sourceInstanceId)}: pay any amount of life to draw that many cards`,
        max,
        mode: "pay-life-draw",
      };
      return;
    }
    case "offerSacrificeToOpponents": {
      /*
       * Braids. The sacrifice the controller already made is the *first* card
       * target, and its types are what each opponent has to match.
       *
       * Queued per opponent, like discard, because each answers for
       * themselves - and unlike discard this one may be declined, which is the
       * whole card: the punishment is what declining costs.
       */
      const chosen = targets.find((t): t is Extract<StackTarget, { kind: "card" }> => t.kind === "card");
      const sharedTypes = chosen
        ? requireDefinition(state, findInstance(state, chosen.instanceId)!.instance.definitionId).types
        : [];
      for (const player of state.players) {
        if (player.id === controllerId || player.hasLost) continue;
        const candidates = player.battlefield.filter((card) =>
          requireDefinition(state, card.definitionId).types.some((t) => sharedTypes.includes(t)),
        );
        state.pendingCardChoices.push({
          playerId: player.id,
          effectControllerId: controllerId,
          sourceInstanceId,
          candidateInstanceIds: candidates.map((c) => c.instanceId),
          min: 0,
          max: 1,
          mode: "sacrifice",
          prompt: `${cardName(state, sourceInstanceId)}: you may sacrifice a permanent sharing a type with ${
            chosen ? cardName(state, chosen.instanceId) : "it"
          }`,
          ifDeclined: effect.ifDeclined,
        });
      }
      return;
    }
    case "repeatWhileMilledMatches": {
      /*
       * Grist's +1, the one card in the pool that loops. Capped rather than
       * trusted to terminate: a library of Insects would otherwise run until it
       * emptied, and a bug in the match test would run forever.
       */
      for (let round = 0; round < effect.max; round++) {
        const before = controller.graveyard.length;
        applyEffect(state, controllerId, sourceInstanceId, effect.body, targets);
        const milled = controller.graveyard.slice(before);
        const again = milled.some((card) => {
          const instance = controller.graveyard.find((c) => c.instanceId === card.instanceId);
          return instance ? hasCreatureType(state, instance, effect.subtype) : false;
        });
        if (!again) return;
        const source = findInstance(state, sourceInstanceId);
        if (source) source.instance.loyalty += effect.addLoyalty;
      }
      return;
    }
    case "mayPay": {
      /*
       * "You may pay {1}{G}. If you do, ... If you didn't, ..." - Springheart
       * Nantuko.
       *
       * Offered only when it can be afforded: an offer the player cannot take
       * is not a choice, and declining and being unable to pay reach the same
       * branch anyway. The question rides on `pendingConfirmation`, which now
       * carries the price and both halves.
       */
      const mana = effect.cost.mana;
      const life = effect.cost.life ?? 0;
      const affordable = (!mana || canPayManaCost(controller, mana)) && controller.life > life;
      if (!affordable) {
        if (effect.otherwise) applyEffect(state, controllerId, sourceInstanceId, effect.otherwise, targets);
        return;
      }
      state.pendingConfirmation = {
        playerId: controllerId,
        sourceInstanceId,
        prompt: `${cardName(state, sourceInstanceId)}: pay ${describePrice(effect.cost)}?`,
        cost: effect.cost,
        otherwise: effect.otherwise,
        object: {
          id: `pay-${state.nextStackObjectId++}`,
          sourceInstanceId,
          controllerId,
          effect: effect.then,
          targets,
          isPermanentSpell: false,
        },
      };
      return;
    }
    case "becomePrepared": {
      const source = findInstance(state, sourceInstanceId);
      if (!source || source.instance.zone !== "battlefield") return;
      if (source.instance.prepared) return;
      source.instance.prepared = true;
      log(state, `${cardName(state, sourceInstanceId)} becomes prepared`);
      return;
    }
    case "sacrificeChosen": {
      /*
       * Stops and asks which creature is being given up - see
       * `PendingSacrifice` for why this is not the same thing as an additional
       * cost even though both end in a sacrifice.
       *
       * With nothing to sacrifice there is nothing to ask, and the "if you do"
       * half simply does not happen: Disciple of Freyalise with an empty board
       * is a 3/3 that draws no cards.
       */
      /*
       * Creatures unless the card names other types - Braids says "an artifact,
       * creature, enchantment, land, or planeswalker", and offering only
       * creatures would make it a far narrower card than it is.
       */
      const wantedTypes = effect.types ?? ["Creature"];
      const candidates = controller.battlefield.filter((instance) => {
        if (effect.excludeSelf && instance.instanceId === sourceInstanceId) return false;
        const types = requireDefinition(state, instance.definitionId).types;
        return wantedTypes.some((wanted) => types.includes(wanted));
      });
      if (candidates.length === 0) return;
      state.pendingSacrifice = {
        playerId: controllerId,
        effectControllerId: controllerId,
        sourceInstanceId,
        candidateInstanceIds: candidates.map((instance) => instance.instanceId),
        optional: effect.optional === true,
        prompt: `${cardName(state, sourceInstanceId)}: ${effect.optional ? "you may sacrifice" : "sacrifice"} ${
          effect.excludeSelf ? "another creature" : "a creature"
        }`,
        then: effect.then,
      };
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
        /*
         * Battlefield or graveyard. Destruction only ever happens in play, but
         * exile reaches further: Feral Appetite exiles a card *from a
         * graveyard*, and this used to silently skip it - the ability paid its
         * mana, targeted legally, and did nothing at all.
         */
        const reachable =
          found &&
          (found.instance.zone === "battlefield" ||
            (effect.kind === "exile" && found.instance.zone === "graveyard"));
        if (!found || !reachable) continue; // already gone; the spell just fizzles on it

        if (effect.kind === "destroy") {
          if (hasKeyword(state, found.instance, "Indestructible")) continue;
          // A regeneration shield is spent here rather than at the graveyard,
          // because it replaces the destruction itself: the creature never
          // dies, so nothing watching for a death sees anything happen.
          if (useRegenerationShield(state, found.instance)) continue;
        }

        log(state, `${cardName(state, target.instanceId)} is ${effect.kind === "destroy" ? "destroyed" : "exiled"}`);

        if (effect.kind === "destroy") {
          /*
           * Through the death handler, not `moveCard`.
           *
           * This used to move the card by hand, which quietly skipped the dies
           * triggers, the turn's death count and the commander replacement
           * effect together: a creature killed in combat fired its ability and
           * the same creature killed by Assassin's Trophy did not.
           */
          destroyPermanent(state, target.instanceId);
          continue;
        }

        // The commander replacement effect applies to exile too: a commander
        // that would be exiled goes to the command zone instead.
        if (found.instance.isCommander) {
          moveCard(state, target.instanceId, "command");
          continue;
        }
        if (found.instance.zone === "battlefield") {
          // Leaving play, which The Ozolith watches for and a death is not the
          // only way to do.
          leaveBattlefield(state, target.instanceId, "exile");
          continue;
        }
        // A card exiled out of a graveyard never was on the battlefield, so
        // nothing is leaving it - Feral Appetite.
        moveCard(state, target.instanceId, "exile");
      }
      return;
    }
    case "createToken": {
      // Doubling Season and its family. Asked once for the whole event, not
      // per token - "would create one or more tokens" is a single event, so
      // two Doubling Seasons make four Insects rather than compounding oddly
      // inside the loop.
      // "Its controller creates two Treasure tokens" (An Offer You Can't Refuse)
      // makes them for the opponents rather than the caster - in a two-player
      // game, the one whose spell was just countered. A simplification of the
      // exact "its controller".
      const recipients =
        effect.forController === "each-opponent"
          ? state.players.filter((p) => p.id !== controllerId).map((p) => p.id)
          : [controllerId];
      for (const rid of recipients) {
        const count = tokensCreated(
          state,
          rid,
          evaluateAmount(state, rid, effect.count, "createToken count", sourceInstanceId),
        );
        for (let i = 0; i < count; i++) {
          const token = createCardInstance(state, effect.tokenDefinitionId, rid, "battlefield");
          /*
           * A token enters the battlefield like anything else, so it goes
           * through the same arrival path - haste, and every trigger that cares
           * that a creature arrived.
           */
          enteredBattlefield(state, token);
        }
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
        // "It gains indestructible until end of turn" - Revitalizing Repast.
        for (const keyword of effect.grants ?? []) {
          if (!found.instance.grantedKeywords.includes(keyword)) {
            found.instance.grantedKeywords.push(keyword);
          }
        }
      }
      return;
    }
    case "pumpAll": {
      // Always plain numbers by now - `resolveAmounts` substituted any X when
      // the spell was cast or the trigger fired. Loud if not, because a -X/-X
      // silently reading as -0/-0 looks like a targeting bug rather than a
      // missing substitution.
      const power = evaluateAmount(state, controllerId, effect.power, "pumpAll power");
      const toughness = evaluateAmount(state, controllerId, effect.toughness, "pumpAll toughness");
      const affected = effect.scope === "controller" ? [controller] : state.players;
      const creaturesOnly = (effect.appliesTo ?? "creatures") === "creatures";
      for (const player of affected) {
        for (const instance of player.battlefield) {
          // Heroic Intervention says "permanents you control", so its shield
          // reaches lands and artifacts too. Everything else in this family
          // says creatures.
          const affectedDef = state.cardDefinitions[instance.definitionId];
          if (creaturesOnly && !affectedDef?.types.includes("Creature")) continue;
          // "Those creatures" - Inspiring Call means the ones it just counted.
          if (effect.restriction === "with-counter" && instance.plusOneCounters <= 0) continue;
          // "Non-Human creatures you control" - Return of the Wildspeaker.
          if (effect.excludeSubtype && affectedDef?.subtypes?.includes(effect.excludeSubtype)) continue;
          instance.temporaryPowerBonus += power;
          instance.temporaryToughnessBonus += toughness;
          for (const keyword of effect.grants ?? []) {
            if (!instance.grantedKeywords.includes(keyword)) instance.grantedKeywords.push(keyword);
          }
          /*
           * A whole ability, handed over for the turn - Root Manipulation.
           *
           * Pushed rather than de-duplicated: casting it twice really does give
           * each creature the ability twice, and each copy triggers. That is
           * the rule, and it is the opposite of the keyword line above, where a
           * second copy of menace would mean nothing.
           */
          for (const trigger of effect.grantsTriggers ?? []) {
            instance.grantedTriggers.push(trigger);
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
          : effect.who === "self"
            ? [requirePlayer(state, controllerId)]
            : state.players.filter((p) => p.id !== controllerId);
      for (const player of losers) {
        if (player.hasLost) continue;
        // Evaluated per loser when the loser is the reference: "loses half their
        // life" (Peer into the Abyss) is read against each target, not the
        // caster. A static amount reads the same against anyone, so existing
        // cards are unaffected.
        const ref = effect.who === "target" ? player.id : controllerId;
        const lost = evaluateAmount(state, ref, effect.amount, "loseLife amount", sourceInstanceId);
        if (lost <= 0) continue;
        player.life -= lost;
        log(state, `${player.id} loses ${lost} life`);
      }
      return;
    }
    case "poison": {
      /*
       * Poison counters as an effect, not as Infect damage. Straight to the
       * counter total, which a state-based action turns into a loss at ten.
       */
      const poisoned =
        effect.who === "target"
          ? targets
              .filter((t): t is Extract<StackTarget, { kind: "player" }> => t.kind === "player")
              .map((t) => requirePlayer(state, t.playerId))
          : state.players.filter((p) => p.id !== controllerId);
      const n = evaluateAmount(state, controllerId, effect.amount, "poison amount", sourceInstanceId);
      if (n <= 0) return;
      for (const player of poisoned) {
        if (player.hasLost) continue;
        player.poisonCounters += n;
        log(state, `${player.id} gets ${n} poison counter${n === 1 ? "" : "s"}`);
      }
      return;
    }
    case "copyNextInstantOrSorcery": {
      // Arms the delayed copy; castSpell spends it on the controller's next
      // instant or sorcery. A count, so two of them copy the next two spells.
      controller.copyNextInstantOrSorcery += 1;
      log(state, `${controllerId} will copy their next instant or sorcery spell this turn`);
      return;
    }
    case "proliferate": {
      /*
       * "Give each another counter of each kind already there." Auto-taken over
       * the beneficial subset: the controller's own permanents that carry
       * +1/+1, loyalty or other counters, and poison on opponents. A -1/-1
       * counter on your own creature is never a counter you would choose to add,
       * so it is left alone; opponents' +1/+1 counters likewise.
       */
      for (const instance of controller.battlefield) {
        if (instance.plusOneCounters > 0) instance.plusOneCounters += countersPlaced(state, instance, 1);
        if (instance.loyalty > 0) instance.loyalty += 1;
        if (instance.otherCounters > 0) instance.otherCounters += 1;
      }
      for (const player of state.players) {
        if (player.id === controllerId || player.hasLost) continue;
        if (player.poisonCounters > 0) {
          player.poisonCounters += 1;
          log(state, `${player.id} gets another poison counter (proliferate)`);
        }
      }
      return;
    }
    case "infectiousBite": {
      /*
       * targets[0] is the dealer (a creature you control), targets[1] the
       * recipient (one you don't). The dealer deals damage equal to its power,
       * routed through the ordinary creature-damage door so its deathtouch, a
       * shield, and any "is dealt damage" trigger all apply exactly as they
       * would in a fight. Its power is read now, at resolution.
       */
      const dealerT = targets[0];
      const recipientT = targets[1];
      if (dealerT?.kind === "card" && recipientT?.kind === "card") {
        const dealer = findInstance(state, dealerT.instanceId);
        const recipient = findInstance(state, recipientT.instanceId);
        if (dealer && recipient && recipient.instance.zone === "battlefield") {
          const power = effectivePower(state, dealer.instance);
          const deathtouch = hasKeyword(state, dealer.instance, "Deathtouch");
          const dealt = damageCreature(state, recipient.instance, power, { deathtouch }).dealt;
          if (dealt > 0) {
            log(state, `${cardName(state, dealerT.instanceId)} deals ${dealt} damage to ${cardName(state, recipientT.instanceId)}`);
          }
        }
      }
      // "Each opponent gets a poison counter" - folded in, so the whole card is
      // one effect. Happens whether or not the fight found a legal recipient.
      for (const player of state.players) {
        if (player.id === controllerId || player.hasLost) continue;
        player.poisonCounters += effect.poisonEachOpponent;
        log(state, `${player.id} gets ${effect.poisonEachOpponent} poison counter${effect.poisonEachOpponent === 1 ? "" : "s"}`);
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
      if (effect.who === "self") {
        // "then discard a card" - the controller loots. Same picker, aimed at
        // the controller rather than the opponents.
        if (controller.hand.length === 0) return;
        state.pendingDiscards.push({
          playerId: controllerId,
          sourceInstanceId,
          remaining: effect.amount,
          prompt:
            effect.amount === 1
              ? `${cardName(state, sourceInstanceId)}: discard a card`
              : `${cardName(state, sourceInstanceId)}: discard ${effect.amount} cards`,
        });
        return;
      }
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
    case "attach": {
      const equipment = findInstance(state, sourceInstanceId);
      if (!equipment) return;
      for (const target of targets) {
        if (target.kind !== "card") continue;
        const found = findInstance(state, target.instanceId);
        if (!found || found.instance.zone !== "battlefield") continue;
        // Moving an Equipment from one creature to another is one assignment:
        // it is attached to exactly one thing at a time.
        equipment.instance.attachedTo = target.instanceId;
        log(state, `${cardName(state, sourceInstanceId)} is attached to ${cardName(state, target.instanceId)}`);
      }
      return;
    }
    case "preventCombatDamage": {
      state.combatDamagePrevention = { exceptSubtype: effect.exceptSubtype };
      log(
        state,
        effect.exceptSubtype
          ? `all combat damage from non-${effect.exceptSubtype} creatures is prevented this turn`
          : "all combat damage is prevented this turn",
      );
      return;
    }
    case "exileGraveyard": {
      for (const target of targets) {
        if (target.kind !== "player") continue;
        const victim = requirePlayer(state, target.playerId);
        const count = victim.graveyard.length;
        // Copied first: moveCard splices the array being walked.
        for (const card of [...victim.graveyard]) moveCard(state, card.instanceId, "exile");
        if (count > 0) log(state, `${victim.id}'s graveyard is exiled (${count} cards)`);
      }
      return;
    }
    case "ifTargetWas": {
      /*
       * Reads what the step before it actually hit. The card has already moved
       * by now - Feral Appetite exiles first and asks second - which is fine,
       * because exiling does not change what the card *is*.
       */
      const hit = targets.some((target) => {
        if (target.kind !== "card") return false;
        const found = findInstance(state, target.instanceId);
        if (!found) return false;
        return requireDefinition(state, found.instance.definitionId).types.includes(effect.cardType);
      });
      if (hit) applyEffect(state, controllerId, sourceInstanceId, effect.then, targets);
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
      /*
       * "Choose two target players. Each of them searches their library." -
       * Scheming Symmetry.
       *
       * Queued one at a time, because the search machinery stops the game for
       * one player at a time and the second question cannot be asked until the
       * first is answered. The follow-up carries the rest.
       */
      if (effect.who === "each-target-player") {
        const players = targets
          .filter((t): t is Extract<StackTarget, { kind: "player" }> => t.kind === "player")
          .map((t) => t.playerId);
        if (players.length === 0) return;
        const [first, ...rest] = players;
        const searcher = requirePlayer(state, first!);
        state.pendingSearch = {
          playerId: first!,
          effectControllerId: controllerId,
          sourceInstanceId,
          candidateInstanceIds: searcher.library
            .filter((card) => matchesSearch(state, card, effect))
            .map((card) => card.instanceId),
          destination: effect.destination,
          tapped: effect.tapped,
          prompt: describeSearch(effect),
          // The remaining players, asked in turn once this one has answered.
          followUp: [
            ...(rest.length > 0
              ? [{ ...effect, who: "each-target-player" as const } satisfies Effect]
              : []),
            ...(pendingFollowUp ?? []),
          ],
          followUpTargets: rest.map((playerId) => ({ kind: "player" as const, playerId })),
        };
        return;
      }
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
        // Both of the steps that stop and ask. A sacrifice choice suspends the
        // rest of the card exactly as a search does, for the same reason.
        if (state.pendingSearch) return;
        // A look-at-top (Ponder) stops the same way - it has already taken the
        // rest as its follow-up, so carrying on here would run it twice.
        if (state.pendingArrange) return;
        if (state.pendingSacrifice) {
          state.pendingSacrifice.followUp = rest;
          return;
        }
        // The same rule for the two questions added with the last sixteen
        // cards: anything printed after them waits until they are answered.
        if (state.pendingCardChoices.length > 0) {
          state.pendingCardChoices[state.pendingCardChoices.length - 1]!.followUp = rest;
          return;
        }
        if (state.pendingAmount) return;
      }
      return;
    }
    case "modal": {
      // A modal *cast spell* is unwrapped before it reaches the stack, so
      // reaching here means a modal triggered/activated ability is resolving.
      // Stop and ask which mode; `resolveModal` applies it.
      state.pendingModal = {
        playerId: controllerId,
        controllerId,
        sourceInstanceId,
        modes: effect.modes,
      };
      return;
    }
    case "removeCounter": {
      // "Remove up to N counters from target permanent." Takes +1/+1 counters
      // first, then other counters - a simplification where the player would
      // choose which kinds and how many.
      const t = targets.find((x): x is Extract<StackTarget, { kind: "card" }> => x.kind === "card");
      if (!t) return;
      const found = findInstance(state, t.instanceId);
      if (!found) return;
      let toRemove = effect.amount;
      const fromPlus = Math.min(toRemove, found.instance.plusOneCounters);
      found.instance.plusOneCounters -= fromPlus;
      toRemove -= fromPlus;
      const fromOther = Math.min(toRemove, found.instance.otherCounters);
      found.instance.otherCounters -= fromOther;
      if (fromPlus + fromOther > 0) {
        log(state, `${controllerId} removes ${fromPlus + fromOther} counter${fromPlus + fromOther === 1 ? "" : "s"} from ${cardName(state, t.instanceId)}`);
      }
      return;
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
  if (effect.cardType && !definition.types.includes(effect.cardType)) {
    // "...or a card with flash" - a fallback keyword still qualifies it.
    if (!(effect.orHasKeyword && definition.keywords?.includes(effect.orHasKeyword))) return false;
  }
  if (effect.cardTypes?.length && !effect.cardTypes.some((t) => definition.types.includes(t))) return false;
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
  const followUpTargets = pending.followUpTargets;
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
   * Scry's "yes": the card goes to the bottom.
   *
   * A reorder rather than a zone change, like `library-top` above and unlike
   * surveil's graveyard - the card never leaves the library, so nothing
   * triggers and no counters are cleared.
   */
  if (destination === "library-bottom" && instanceId !== null) {
    const library = requirePlayer(state, playerId).library;
    const index = library.findIndex((card) => card.instanceId === instanceId);
    if (index >= 0) library.push(...library.splice(index, 1));
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
    applyEffect(
      state,
      effectControllerId,
      sourceInstanceId,
      { kind: "sequence", effects: followUp },
      followUpTargets ?? [],
    );
  }
}

/**
 * Puts the looked-at cards back on top of the library in the order the player
 * named - Halimar Depths, Ponder. Ponder may instead shuffle, throwing the look
 * away.
 *
 * Re-checked against the pending entry rather than trusted, like every other
 * mid-resolution answer: the order must be exactly the cards that were shown,
 * so a client cannot smuggle in a card it was never allowed to see. The cards
 * never left the library, so this is a reorder, not a zone change - no triggers
 * fire and no counters clear. Nothing else can have happened since they were
 * shown (priority is held), so the top N slots still hold exactly those cards.
 */
export function resolveArrange(
  state: GameState,
  playerId: string,
  orderedInstanceIds: string[],
  shuffle = false,
): void {
  const pending = state.pendingArrange;
  if (!pending) throw new Error("No arrangement is waiting to be resolved");
  if (pending.playerId !== playerId) throw new Error(`The arrangement belongs to ${pending.playerId}`);

  const shown = pending.cardInstanceIds;
  const sameSet =
    orderedInstanceIds.length === shown.length &&
    shown.every((id) => orderedInstanceIds.includes(id));
  if (!sameSet) throw new Error("The order must be exactly the cards you were shown");

  const followUp = pending.followUp;
  const sourceInstanceId = pending.sourceInstanceId;
  const doShuffle = shuffle && pending.mayShuffle;
  state.pendingArrange = null;

  const library = requirePlayer(state, playerId).library;
  if (doShuffle) {
    shuffleLibrary(state, playerId);
  } else {
    const byId = new Map(library.slice(0, shown.length).map((card) => [card.instanceId, card]));
    for (let i = 0; i < orderedInstanceIds.length; i++) {
      const card = byId.get(orderedInstanceIds[i]!);
      if (card) library[i] = card;
    }
  }

  if (followUp?.length) {
    applyEffect(state, playerId, sourceInstanceId, { kind: "sequence", effects: followUp }, []);
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

/**
 * Finishes a "you may sacrifice a creature" once its controller has named one -
 * or declined, where the card allows it.
 *
 * The power is read *before* the sacrifice, which is the whole reason this is
 * one function rather than two steps a caller could get out of order: a moment
 * later the creature is in a graveyard with its counters stripped, and "X is
 * that creature's power" would be zero for every creature that was ever
 * buffed.
 *
 * Re-checked against the pending entry rather than trusted, like every other
 * mid-resolution answer: a client cannot sacrifice somebody else's creature,
 * and cannot name one the engine did not offer.
 */
export function resolveSacrificeChoice(state: GameState, playerId: string, instanceId: string | null): void {
  const pending = state.pendingSacrifice;
  if (!pending) throw new Error("No sacrifice is waiting to be resolved");
  if (pending.playerId !== playerId) throw new Error(`The choice belongs to ${pending.playerId}`);
  if (instanceId === null && !pending.optional) throw new Error("This sacrifice is not optional");
  if (instanceId !== null && !pending.candidateInstanceIds.includes(instanceId)) {
    throw new Error("That creature was not offered for sacrifice");
  }

  let sacrificedPower = 0;
  if (instanceId !== null) {
    const found = findInstance(state, instanceId);
    // Killed in response, so there is nothing to give up - the "if you do"
    // half does not happen, which is what "if you do" means.
    if (found && found.instance.zone === "battlefield") {
      sacrificedPower = effectivePower(state, found.instance);
      sacrificePermanent(state, instanceId);
    } else {
      instanceId = null;
    }
  }

  const { then, followUp, sourceInstanceId, effectControllerId } = pending;
  // Cleared before running, not after: a follow-up that asks again would
  // otherwise have its new question wiped out and strand the game.
  state.pendingSacrifice = null;

  if (instanceId !== null && then) {
    const substituted = resolveAmounts(then, { x: 0, sacrificedPower });
    /*
     * "When you do, destroy target creature or planeswalker" - Grist.
     *
     * "When you do" is a reflexive trigger, not a second half of the same
     * resolution: it goes on the stack and is pointed at something. Parked
     * through the ordinary trigger path so the player chooses, rather than
     * resolving here with no targets and silently doing nothing.
     */
    if (targetSelectorOf(substituted)) {
      pushTrigger(state, sourceInstanceId, effectControllerId, { event: "dies", effect: substituted });
      if (followUp?.length) {
        applyEffect(state, effectControllerId, sourceInstanceId, { kind: "sequence", effects: followUp }, []);
      }
      return;
    }
    applyEffect(
      state,
      effectControllerId,
      sourceInstanceId,
      // The moment `sacrificed-power` becomes a number - see the note in x.ts
      // on why this could not be substituted any earlier.
      resolveAmounts(then, { x: 0, sacrificedPower }),
      /*
       * The card that was given up, handed on as the target.
       *
       * Braids' opponents have to match *its* card types, and the permanent is
       * in a graveyard by now - which is fine, because its type line is what is
       * being read rather than its presence on the battlefield. Passing nothing
       * here left the offer with no types to match and no candidates at all,
       * so every opponent "declined" without ever being asked.
       */
      [{ kind: "card", instanceId }],
    );
  }
  if (followUp?.length) {
    applyEffect(state, effectControllerId, sourceInstanceId, { kind: "sequence", effects: followUp }, []);
  }
}


/**
 * Answers a "choose some cards" - the one question shape four of the last
 * sixteen cards share.
 *
 * Re-checked against the pending entry rather than trusted, like every other
 * mid-resolution answer: a client cannot choose for somebody else, cannot name
 * a card the engine did not offer, and cannot take more than the card allows.
 */
export function resolveCardChoice(state: GameState, playerId: string, instanceIds: string[]): void {
  const pending = state.pendingCardChoices[0];
  if (!pending) throw new Error("No card choice is waiting to be resolved");
  if (pending.playerId !== playerId) throw new Error(`The choice belongs to ${pending.playerId}`);
  if (instanceIds.length < pending.min) throw new Error(`At least ${pending.min} must be chosen`);
  if (instanceIds.length > pending.max) throw new Error(`At most ${pending.max} may be chosen`);
  for (const id of instanceIds) {
    if (!pending.candidateInstanceIds.includes(id)) throw new Error("That card was not offered");
  }

  const player = requirePlayer(state, playerId);
  let chosen = [...instanceIds];

  /*
   * The price is paid only when something is taken, and refusing it is the
   * same as declining - Ripples of Undeath asks for {1} and 3 life, and a
   * player who cannot afford it simply does not get the card.
   */
  if (chosen.length > 0 && pending.cost) {
    const mana = pending.cost.mana;
    const life = pending.cost.life ?? 0;
    const affordable = (!mana || canPayManaCost(player, mana)) && player.life > life;
    if (!affordable) {
      chosen = [];
    } else {
      if (mana) payManaCost(player, mana);
      if (life > 0) {
        player.life -= life;
        log(state, `${playerId} pays ${life} life`);
      }
    }
  }

  state.pendingCardChoices.shift();

  for (const id of chosen) {
    if (pending.mode === "sacrifice") sacrificePermanent(state, id);
    else if (pending.mode === "to-hand") {
      moveCard(state, id, "hand");
      log(state, `${playerId} takes ${cardName(state, id)}`);
    } else if (pending.mode === "to-battlefield") {
      putOntoBattlefield(state, id, { tapped: pending.toBattlefieldTapped });
      log(
        state,
        `${playerId} puts ${cardName(state, id)} onto the battlefield${pending.toBattlefieldTapped ? " tapped" : ""}`,
      );
    }
    // "cast-free" is handled below: it needs the caster, not the chooser, and
    // casting is not a zone move this function should be doing by hand.
  }

  /*
   * Brainstorm's second half. moveCard drops each card at the bottom of the
   * library, so pull them straight back to the top afterwards - in reverse of
   * the named order, so the first card named ends up on top and is drawn next.
   */
  if (pending.mode === "to-library-top" && chosen.length > 0) {
    for (const id of chosen) moveCard(state, id, "library");
    const library = player.library;
    for (let i = chosen.length - 1; i >= 0; i--) {
      const idx = library.findIndex((card) => card.instanceId === chosen[i]);
      if (idx >= 0) library.unshift(...library.splice(idx, 1));
    }
    log(state, `${playerId} puts ${chosen.length} card${chosen.length === 1 ? "" : "s"} on top of their library`);
  }

  if (pending.mode === "cast-free" && chosen.length > 0) {
    castForFree(state, playerId, chosen[0]!);
  }

  /*
   * "Put the rest on the bottom of your library" - Thundertrap Trainer. The
   * looked-at cards minus whatever was taken, moved to the bottom in library
   * order (the fresh random shuffle is the documented simplification). `moveCard`
   * to "library" drops each at the bottom, so a same-zone move re-files it there.
   */
  if (pending.restToBottom) {
    const rest = pending.restToBottom.filter((id) => !chosen.includes(id));
    for (const id of rest) moveCard(state, id, "library");
    if (rest.length > 0) {
      log(state, `${playerId} puts ${rest.length} card${rest.length === 1 ? "" : "s"} on the bottom of their library`);
    }
  }

  /*
   * Braids' punishment, which is what *declining* costs. Aimed at the player
   * who declined rather than at the caster, so it is applied with them as the
   * target rather than as the controller.
   */
  if (chosen.length === 0 && pending.ifDeclined) {
    applyEffect(state, pending.effectControllerId, pending.sourceInstanceId, pending.ifDeclined, [
      { kind: "player", playerId },
    ]);
  }

  /*
   * Devour counts what was given up. Held on the pending rather than counted
   * afterwards, because the creatures are in a graveyard by now.
   */
  if (pending.multiplier !== undefined && chosen.length > 0) {
    const source = findInstance(state, pending.sourceInstanceId);
    if (source) {
      source.instance.plusOneCounters += countersPlaced(
        state,
        source.instance,
        chosen.length * pending.multiplier,
      );
    }
  }

  if (pending.followUp?.length) {
    applyEffect(
      state,
      pending.effectControllerId,
      pending.sourceInstanceId,
      { kind: "sequence", effects: pending.followUp },
      [],
    );
  }
}

/**
 * Answers "pay any amount of life" - Necrodominance.
 *
 * The only choice in the game that is a number. Checked against the ceiling the
 * engine offered rather than against the life total now, because a player who
 * answered honestly should not be refused by something that happened in
 * between.
 */
export function resolveAmountChoice(state: GameState, playerId: string, amount: number): void {
  const pending = state.pendingAmount;
  if (!pending) throw new Error("No amount is waiting to be named");
  if (pending.playerId !== playerId) throw new Error(`The choice belongs to ${pending.playerId}`);
  if (!Number.isInteger(amount) || amount < 0) throw new Error("That is not a whole number of life");
  if (amount > pending.max) throw new Error(`At most ${pending.max} life may be paid`);

  state.pendingAmount = null;
  if (amount === 0) return;
  const player = requirePlayer(state, playerId);
  player.life -= amount;
  log(state, `${playerId} pays ${amount} life`);
  drawCard(state, playerId, amount);
}

/**
 * Casts a card from a player's hand without paying its mana cost.
 *
 * Rishkar's Expertise, and the far side of suspend. Deliberately routed through
 * `castSpell` rather than putting the card on the stack by hand, so the spell
 * is cast for every purpose that matters: cast triggers fire, ward is offered,
 * and a permanent spell resolves onto the battlefield the ordinary way.
 */
function castForFree(state: GameState, playerId: string, instanceId: string): void {
  const found = findInstance(state, instanceId);
  if (!found) return;
  const def = requireDefinition(state, found.instance.definitionId);
  /*
   * A targeted free spell needs a target, and there is nobody to ask at this
   * point in a resolution - so it takes the first legal one rather than
   * fizzling. A shortcut, and the same one `pushTrigger` takes when a trigger
   * has exactly one legal target; here it can be more than one.
   */
  const selector = targetSelectorOf(def.castEffect ?? { kind: "draw", amount: 0 });
  const targets = selector ? legalTargetsFor(state, selector, playerId).slice(0, 1) : [];
  if (selector && targets.length === 0) return;
  const priorityBefore = state.priorityPlayerIndex;
  state.priorityPlayerIndex = state.players.findIndex((p) => p.id === playerId);
  try {
    castSpell(state, playerId, instanceId, targets, { free: true });
  } finally {
    state.priorityPlayerIndex = priorityBefore;
  }
}

/** "{1}{G} and 3 life" - the price on an optional payment, for its prompt. */
function describePrice(cost: { mana?: ManaCost; life?: number }): string {
  const parts: string[] = [];
  if (cost.mana) {
    const pips = ALL_COLORS.flatMap((c) => Array((cost.mana!.colors[c] ?? 0)).fill(`{${c}}`));
    parts.push([cost.mana.generic > 0 ? `{${cost.mana.generic}}` : "", ...pips].filter(Boolean).join(""));
  }
  if (cost.life) parts.push(`${cost.life} life`);
  return parts.join(" and ");
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

/**
 * Cycling: "{cost}, Discard this card: Draw a card" - or, with `search`, a
 * typecycling that tutors the named card to hand instead of drawing. Activated
 * from the hand; the discard is part of the cost, so it happens whether or not
 * a search finds anything.
 */
export function cycleCard(state: GameState, playerId: string, instanceId: string): void {
  const player = requirePlayer(state, playerId);
  const card = player.hand.find((c) => c.instanceId === instanceId);
  if (!card) throw new Error("That card is not in hand");
  const def = requireDefinition(state, card.definitionId);
  if (!def.cycling) throw new Error(`${def.name} has no cycling ability`);
  if (!canPayManaCost(player, def.cycling.cost)) {
    throw new Error(`${playerId} cannot pay the cycling cost of ${def.name}`);
  }
  payManaCost(player, def.cycling.cost);
  moveCard(state, instanceId, "graveyard");
  log(state, `${playerId} cycles ${def.name}`);
  if (def.cycling.search) {
    applyEffect(
      state,
      playerId,
      instanceId,
      {
        kind: "searchLibrary",
        cardType: def.cycling.search.cardType,
        subtypes: def.cycling.search.subtypes,
        destination: "hand",
      },
      [],
    );
  } else {
    drawCard(state, playerId, 1);
  }
}

/**
 * Applies the mode a player chose for a modal triggered/activated ability (see
 * the `modal` effect). The chosen mode is auto-targeted - a simplification of
 * the player's target choice - which is enough for the cards that use this.
 */
export function resolveModal(state: GameState, playerId: string, modeIndex: number): void {
  const pending = state.pendingModal;
  if (!pending) throw new Error("No modal choice is waiting to be resolved");
  if (pending.playerId !== playerId) throw new Error(`The modal choice belongs to ${pending.playerId}`);
  const mode = pending.modes[modeIndex];
  if (!mode) throw new Error(`There is no mode ${modeIndex}`);
  state.pendingModal = null;
  log(state, `${playerId} chooses "${mode.label}"`);
  const selector = targetSelectorOf(mode.effect);
  let targets: StackTarget[] = [];
  if (selector) {
    const legal = legalTargetsFor(state, selector, pending.controllerId);
    if (legal.length > 0) targets = [legal[0]!];
  }
  applyEffect(state, pending.controllerId, pending.sourceInstanceId, mode.effect, targets);
}
