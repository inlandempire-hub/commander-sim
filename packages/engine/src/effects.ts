import type {
  CardDefinition,
  CardInstance,
  CardType,
  DelayedAction,
  Effect,
  GameState,
  Keyword,
  ManaCost,
  ProtectionQuality,
  Player,
  StackTarget,
} from "./types.js";
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
import { effectivePower, hasKeyword, typesOf } from "./counters.js";
import { isSpellOnStack } from "./targeting.js";
import {
  enteredBattlefield,
  fireLibrarySearched,
  moveControl,
  pushTrigger,
  putOntoBattlefield,
  tapPermanent,
} from "./permanents.js";
import { gainLife } from "./life.js";
import { qualityWord } from "./protection.js";
import { describeBlockRestriction } from "./blocking.js";
import { useRegenerationShield } from "./regeneration.js";
import { destroyPermanent, leaveBattlefield, sacrificePermanent } from "./sba.js";
import { countersPlaced, tokensCreated } from "./replacements.js";
import { evaluateAmount } from "./amounts.js";
import { MAX_RING_LEVEL } from "./ring.js";
import { cardColors, meetsBoardCondition } from "./conditions.js";
import { hasCreatureType } from "./counters.js";
import { resolveAmounts } from "./x.js";
import { castSpell } from "./casting.js";
import { legalTargetsFor, targetCountOf, targetSelectorOf } from "./targeting.js";

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
      /*
       * "Damage equal to its power" - Eomer. Read at resolution off the permanent
       * whose ability this is, so a pumped Eomer hits for more; every other card
       * prints a number and takes this branch not at all.
       */
      /*
       * Where the number comes from when it is not the one printed beside it -
       * Eomer's own power, or Ajani's "the number of creatures you control".
       * Read at resolution in both cases, which is the rule and is visible:
       * kill a creature in response to Ajani's 0 and the damage really is lower.
       */
      const amount =
        effect.amountFrom === "source-power"
          ? evaluateAmount(state, controllerId, { kind: "source-power" }, "damage amount", sourceInstanceId)
          : typeof effect.amountFrom === "object"
            ? evaluateAmount(state, controllerId, effect.amountFrom, "damage amount", sourceInstanceId)
            : effect.amount;
      let totalDealt = 0;
      for (const [index, target] of targets.entries()) {
        /*
         * "Divided as you choose" - each target takes the share announced for
         * it. Everything else in the pool deals its whole amount to each of its
         * targets, which is what the fallback is.
         */
        const share = effect.splitAmounts?.[index] ?? amount;
        if (target.kind === "player") {
          const player = requirePlayer(state, target.playerId);
          totalDealt += damagePlayer(state, player, share, { infect: hasInfect, sourceInstanceId }).dealt;
        } else if (target.kind === "card") {
          const found = findInstance(state, target.instanceId);
          if (found) {
            // Counted after prevention, so a shielded target denies lifelink
            // the life it would otherwise have gained.
            totalDealt += damageCreature(state, found.instance, share, {
              sourceInstanceId,
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
      /*
       * The targets are handed to the amount because Swords to Plowshares reads
       * the power of the creature it is aimed at - every other printing in the
       * pool takes a plain number and is unaffected.
       */
      const life = evaluateAmount(
        state,
        controllerId,
        effect.amount,
        "gainLife amount",
        sourceInstanceId,
        targets,
      );
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
      /*
       * "**Its controller** gains life equal to its power" - Swords to
       * Plowshares. The player who controls the creature this is pointed at,
       * which is very often not the player casting it.
       */
      if (effect.who === "target-controller") {
        const first = targets.find((t) => t.kind === "card");
        const found = first && first.kind === "card" ? findInstance(state, first.instanceId) : undefined;
        if (!found) return;
        gainLife(state, found.instance.controllerId, life);
        log(state, `${found.instance.controllerId} gains ${life} life`);
        return;
      }
      /*
       * A player target means them, and no player target means you.
       *
       * Read as *player* targets rather than as "any targets at all", which is
       * what it said until a trigger could carry a permanent along with it:
       * Charismatic Conqueror put a card target on every arrival trigger, and
       * Soul Warden - which has no `who` and means its own controller - quietly
       * stopped gaining anybody life.
       */
      const players = targets.filter((t) => t.kind === "player");
      for (const target of players) {
        if (target.kind === "player") gainLife(state, target.playerId, life);
      }
      if (players.length === 0) gainLife(state, controllerId, life);
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
      if (effect.of === "target") {
        /*
         * Kiki-Jiki and Rionya. The creature was pointed at when the ability
         * went on the stack, so a target that has since left the battlefield
         * takes the whole ability with it: no token at all, rather than a copy
         * of something that is no longer there.
         */
        const target = targets.find((t) => t.kind === "card");
        if (!target || target.kind !== "card") return;
        const found = findInstance(state, target.instanceId);
        if (!found || found.instance.zone !== "battlefield") return;
        copied = found.instance;
      }
      /*
       * "create **X** tokens that are copies" - Rionya. Counted here rather
       * than substituted earlier, so an instant cast while the trigger sits on
       * the stack really does add a copy.
       *
       * Doubling Season and its family are asked once for the whole event, not
       * per token: "would create one or more tokens" is a single event.
       */
      const wanted = evaluateAmount(
        state,
        controllerId,
        effect.count ?? 1,
        "createCopyToken count",
        sourceInstanceId,
      );
      const made = tokensCreated(state, controllerId, wanted);
      const tokens: CardInstance[] = [];
      for (let i = 0; i < made; i++) {
        tokens.push(makeCopyToken(state, controllerId, copied.definitionId, effect.grants, effect.ptOverride));
      }
      log(
        state,
        `${controllerId} creates ${made === 1 ? "a token copy" : `${made} token copies`} of ${cardName(state, copied.instanceId)}`,
      );
      /*
       * "Sacrifice it at the beginning of the next end step." Scheduled over
       * the tokens that were actually made - not over the count, and not over
       * the card that made them, which may be dead by then.
       */
      if (effect.delayedEnd && tokens.length > 0) {
        scheduleDelayedRemoval(state, controllerId, sourceInstanceId, tokens, effect.delayedEnd);
      }
      return;
    }
    case "copyTokensThatEnteredThisTurn": {
      /*
       * "For each token you control that entered this turn, create a token
       * that's a copy of it." - Ocelot Pride.
       *
       * The list is taken before any copy is made. Copying into the list being
       * walked would double every token again for each one added, which is an
       * infinite loop rather than a big turn.
       */
      const controllerTokens = requirePlayer(state, controllerId).battlefield.filter((instance) => {
        if (instance.enteredOnTurn !== state.turnNumber) return false;
        // A token is either minted from a token definition or a copy of a real
        // card flagged on the instance - see `isTokenCopy`.
        return instance.isTokenCopy || state.cardDefinitions[instance.definitionId]?.isToken === true;
      });
      if (controllerTokens.length === 0) return;
      for (const original of controllerTokens) {
        // Doubling Season applies to each of these, because each token is its
        // own "create a token" event - the card says "for each".
        const made = tokensCreated(state, controllerId, 1);
        for (let i = 0; i < made; i++) makeCopyToken(state, controllerId, original.definitionId);
      }
      log(state, `${controllerId} copies ${controllerTokens.length} token${controllerTokens.length === 1 ? "" : "s"} that entered this turn`);
      return;
    }
    case "gainControl": {
      /*
       * "Gain control of target permanent until end of turn. Untap that
       * permanent. It gains haste until end of turn." - Zealous Conscripts,
       * all three sentences over the one target.
       */
      const target = targets.find((t) => t.kind === "card");
      if (!target || target.kind !== "card") return;
      const found = findInstance(state, target.instanceId);
      if (!found || found.instance.zone !== "battlefield") return;
      const instance = found.instance;
      if (instance.controllerId !== controllerId) {
        /*
         * Only if it is not already set. Two effects stealing the same
         * permanent in one turn both end at cleanup, and it goes back to
         * whoever held it before the first of them - not to the first thief.
         */
        if (instance.controlGainedFrom === undefined) instance.controlGainedFrom = instance.controllerId;
        moveControl(state, instance, controllerId);
        log(state, `${controllerId} gains control of ${cardName(state, instance.instanceId)}`);
      }
      if (effect.untap && instance.tapped) {
        instance.tapped = false;
        log(state, `${cardName(state, instance.instanceId)} untaps`);
      }
      for (const keyword of effect.grants ?? []) {
        if (!instance.grantedKeywords.includes(keyword)) instance.grantedKeywords.push(keyword);
        // Haste on a creature that has just changed hands is the whole point of
        // the card, so the sickness `moveControl` set has to go now rather than
        // at the next untap step.
        if (keyword === "Haste") instance.summoningSickness = false;
      }
      if (effect.grants?.length) {
        log(
          state,
          `${cardName(state, instance.instanceId)} gains ${effect.grants.join(" and ").toLowerCase()} until end of turn`,
        );
      }
      return;
    }
    case "grantProtection": {
      /*
       * "Target creature you control gains protection from the color of your
       * choice until end of turn."
       *
       * The colour is named as this *resolves*, which is the whole card: Mother
       * of Runes is played by pointing at a creature early and holding the colour
       * until you see what is coming. So nothing is granted here - the question
       * is parked, and `resolveColorChoice` grants it.
       */
      const target = targets.find((t) => t.kind === "card");
      if (!target || target.kind !== "card") return;
      const found = findInstance(state, target.instanceId);
      // Gone in response, so there is nothing to protect and no colour worth
      // asking for.
      if (!found || found.instance.zone !== "battlefield") return;
      /*
       * "Gains toxic 1 and hexproof from that color" - the toxic is about no
       * colour at all, so it is granted now rather than waiting on the answer.
       * The rest is keyed to the colour and waits.
       */
      if (effect.toxic) {
        found.instance.toxicThisTurn += effect.toxic;
        log(state, `${cardName(state, target.instanceId)} gains toxic ${effect.toxic} until end of turn`);
      }
      const grants = effect.grants ?? ["protection"];
      state.pendingColorChoice = {
        playerId: controllerId,
        sourceInstanceId,
        targetInstanceId: target.instanceId,
        allowColorless: effect.orColorless === true,
        grants,
        prompt: `${cardName(state, sourceInstanceId)}: choose a colour for ${cardName(state, target.instanceId)}`,
      };
      return;
    }
    case "returnControlToOwners": {
      /*
       * "Each player gains control of all creatures they own." - Homeward Path.
       *
       * Everything, not only what this turn's effects took: the card answers a
       * board that has been stolen by anything at all. `controlGainedFrom` is
       * cleared as it goes, so the cleanup step does not later try to hand the
       * same creature somewhere else.
       */
      const displaced = state.players.flatMap((player) =>
        player.battlefield.filter(
          (instance) =>
            instance.controllerId !== instance.ownerId &&
            (state.cardDefinitions[instance.definitionId]?.types.includes("Creature") ?? false),
        ),
      );
      for (const instance of displaced) {
        delete instance.controlGainedFrom;
        moveControl(state, instance, instance.ownerId);
        log(state, `${instance.ownerId} regains control of ${cardName(state, instance.instanceId)}`);
      }
      return;
    }
    case "delayedRemoval": {
      /*
       * "...sacrifices it **at end of combat**" - The Ring's third ability,
       * which is scheduled rather than done: the blocker stays until combat is
       * over, so it blocks and deals its damage first.
       *
       * Every other user of this effect is already the *body* of a delayed
       * trigger and acts at once. This one is the trigger that sets one up,
       * which is the difference between "sacrifice it" and "sacrifice it later".
       */
      if (effect.at === "end-of-combat") {
        const victims = targets
          .filter((t): t is Extract<StackTarget, { kind: "card" }> => t.kind === "card")
          .map((t) => findInstance(state, t.instanceId)?.instance)
          .filter((c): c is CardInstance => c !== undefined && c.zone === "battlefield");
        if (victims.length > 0) {
          // Sacrificed by *that creature's controller*, which is who the delayed
          // trigger belongs to - not by the Ring-bearer's.
          scheduleDelayedRemoval(state, victims[0]!.controllerId, sourceInstanceId, victims, effect.action, "end-of-combat");
        }
        return;
      }
      /*
       * The body of a delayed trigger. Its permanents were fixed when the
       * ability that scheduled it resolved, so they arrive as targets and there
       * is nothing to choose.
       */
      for (const target of targets) {
        if (target.kind !== "card") continue;
        const found = findInstance(state, target.instanceId);
        if (!found || found.instance.zone !== "battlefield") continue;
        if (effect.action === "sacrifice") {
          // Sacrificing is a death, so anything watching for one sees it. That
          // is the whole difference from Rionya's exile.
          sacrificePermanent(state, target.instanceId);
        } else if (effect.action === "return-to-hand") {
          // Dash: the creature goes home rather than dying, which is what makes
          // it a rental rather than a sacrifice.
          log(state, `${cardName(state, target.instanceId)} returns to its owner's hand`);
          moveCard(state, target.instanceId, "hand");
        } else {
          log(state, `${cardName(state, target.instanceId)} is exiled`);
          moveCard(state, target.instanceId, "exile");
        }
      }
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
    case "transform": {
      // "you may transform Emet-Selch." Flip the source to its back face in
      // place - same instance, so counters and damage are untouched; only the
      // definition it points at changes.
      const source = findInstance(state, sourceInstanceId);
      if (!source || source.instance.zone !== "battlefield") return;
      const front = requireDefinition(state, source.instance.definitionId);
      if (!front.backFaceId) return;
      source.instance.definitionId = front.backFaceId;
      log(state, `${controllerId} transforms ${front.name} into ${requireDefinition(state, front.backFaceId).name}`);
      return;
    }
    case "emergentUltimatum": {
      /*
       * "Exile Emergent Ultimatum." Done first so the sorcery lands in exile
       * rather than the graveyard finishResolution would otherwise send it to -
       * it is off the stack either way, and this is the zone the card names.
       */
      moveCard(state, sourceInstanceId, "exile");
      // "up to three monocolored cards" - exactly one colour in the mana cost;
      // colourless and multicolour cards need not apply.
      const candidates = controller.library.filter((card) => {
        const colors = requireDefinition(state, card.definitionId).manaCost?.colors ?? {};
        return Object.values(colors).filter((n) => (n ?? 0) > 0).length === 1;
      });
      if (candidates.length === 0) return;
      state.pendingCardChoices.push({
        playerId: controllerId,
        effectControllerId: controllerId,
        sourceInstanceId,
        candidateInstanceIds: candidates.map((c) => c.instanceId),
        min: 0,
        max: 3,
        mode: "exile",
        distinctNames: true,
        emergentStep: "search",
        prompt: `${cardName(state, sourceInstanceId)}: search for up to three monocolored cards with different names and exile them`,
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
    case "restrictBlockersThisTurn": {
      /*
       * Gingerbrute. Applies to the source and nothing else, which is why it
       * reads no targets at all.
       *
       * Pushed rather than replaced: activating it twice really does leave two
       * restrictions, and a blocker has to satisfy both. That costs nothing for
       * the one card in the pool that grants it - the same restriction twice is
       * the same restriction - and it is the honest shape for the day a second
       * card grants a different one.
       */
      const source = findInstance(state, sourceInstanceId);
      if (!source || source.instance.zone !== "battlefield") return;
      source.instance.blockRestrictionsThisTurn.push(effect.restriction);
      log(
        state,
        `${cardName(state, sourceInstanceId)} can't be blocked this turn except by ${describeBlockRestriction(effect.restriction)}`,
      );
      return;
    }
    case "damageController": {
      /*
       * "It deals 1 damage to you." Through `damagePlayer` like every other point
       * of damage in the engine, so a prevention shield covers it and anything
       * watching for damage sees it.
       */
      const dealt = damagePlayer(state, controller, effect.amount, { sourceInstanceId }).dealt;
      if (dealt > 0) log(state, `${cardName(state, sourceInstanceId)} deals ${dealt} damage to ${controllerId}`);
      return;
    }
    case "animateSelf": {
      /*
       * "This land becomes a 1/1 Blinkmoth artifact creature with flying until end
       * of turn. It's still a land."
       *
       * Set rather than accumulated: activating the ability twice in a turn does
       * not make a 2/2. Both activations say "becomes a 1/1", and the second one
       * is simply the one that applies.
       */
      const source = findInstance(state, sourceInstanceId);
      if (!source || source.instance.zone !== "battlefield") return;
      source.instance.animation = {
        power: effect.power,
        toughness: effect.toughness,
        subtypes: [...effect.subtypes],
        keywords: [...effect.keywords],
      };
      log(
        state,
        `${cardName(state, sourceInstanceId)} becomes a ${effect.power}/${effect.toughness} creature until end of turn`,
      );
      return;
    }
    case "discardRandom": {
      /*
       * "Discard a card at random" - Gamble, and the randomness is the card.
       *
       * Taken from the controller's own hand, and taken *blind*: the whole
       * difference between this and the `discard` effect above is that nobody
       * chooses, which is what stops Gamble being an unconditional one-mana
       * tutor. An empty hand discards nothing rather than erroring.
       */
      for (let i = 0; i < effect.amount; i++) {
        const hand = controller.hand;
        if (hand.length === 0) return;
        const victim = hand[Math.floor(Math.random() * hand.length)]!;
        log(state, `${controllerId} discards ${cardName(state, victim.instanceId)} at random`);
        moveCard(state, victim.instanceId, "graveyard");
      }
      return;
    }
    case "addManaVariable": {
      // "Then add {R} for each card named Rite of Flame in each graveyard."
      const extra = evaluateAmount(
        state,
        controllerId,
        effect.amount,
        "addManaVariable amount",
        sourceInstanceId,
      );
      if (extra <= 0) return;
      addMana(controller.manaPool, effect.color, extra);
      log(state, `${controllerId} adds ${extra} mana`);
      return;
    }
    case "exileTopAndMayPlay": {
      /*
       * "Exile the top card of your library. You may play that card this turn."
       *
       * Whose library depends on the card: Face-Breaker takes from its own
       * controller, Ragavan from the player its damage just went to - read off
       * the player target the trigger carried in. With no such player (the
       * defender has left the game) there is nothing to exile and the ability
       * simply does nothing.
       */
      const ownerId =
        effect.from === "you"
          ? controllerId
          : targets.find((t) => t.kind === "player")?.kind === "player"
            ? (targets.find((t) => t.kind === "player") as Extract<StackTarget, { kind: "player" }>).playerId
            : undefined;
      if (!ownerId) return;
      const library = requirePlayer(state, ownerId).library;
      const top = library[0];
      if (!top) return;
      moveCard(state, top.instanceId, "exile");
      /*
       * The permission is stamped with the turn rather than cleared in cleanup,
       * so it cannot outlive its window by a step: a card exiled on turn 7 is
       * playable while `state.turnNumber` is 7 and never again.
       */
      const exiled = findInstance(state, top.instanceId);
      if (exiled) {
        exiled.instance.playableFromExile = {
          playerId: controllerId,
          untilTurn: state.turnNumber,
          lands: effect.lands,
        };
      }
      log(
        state,
        `${controllerId} exiles ${cardName(state, top.instanceId)} and may ${effect.lands ? "play" : "cast"} it this turn`,
      );
      return;
    }
    case "becomeMonarch": {
      // "Target player becomes the monarch." The crown moves rather than being
      // shared: setting it is the whole implementation.
      const target = targets.find((t) => t.kind === "player");
      if (!target || target.kind !== "player") return;
      if (state.monarchPlayerId === target.playerId) return;
      state.monarchPlayerId = target.playerId;
      log(state, `${target.playerId} becomes the monarch`);
      return;
    }
    case "drawUnlessTheyPay": {
      /*
       * "Draw a card unless that player pays {X}, where X is this creature's
       * power."
       *
       * The taxed player is the one the trigger carried in - the caster - and the
       * amount is read off the source now rather than when the trigger fired, so
       * an Esper Sentinel pumped in response really does cost more.
       */
      const taxed = targets.find((t) => t.kind === "player");
      const amount = evaluateAmount(
        state,
        controllerId,
        effect.amount,
        "drawUnlessTheyPay amount",
        sourceInstanceId,
      );
      if (taxed && taxed.kind === "player" && amount > 0) {
        const payer = requirePlayer(state, taxed.playerId);
        const tax: ManaCost = { generic: amount, colors: {} };
        if (canPayManaCost(payer, tax)) {
          payManaCost(payer, tax);
          log(state, `${payer.id} pays ${amount} rather than let ${controllerId} draw`);
          return;
        }
      }
      drawCard(state, controllerId, 1);
      return;
    }
    case "imprintFromHand": {
      /*
       * "You may exile a nonartifact, nonland card from your hand."
       *
       * `min: 0` because the "may" is real: a Chrome Mox with nothing worth
       * pitching is a Mox that taps for nothing, and the card is happy to be
       * that. Offered from the hand of the ability's controller, which for an
       * enters-the-battlefield trigger is always the player who cast it.
       */
      const player = requirePlayer(state, controllerId);
      const candidates = player.hand.filter((card) => {
        const def = state.cardDefinitions[card.definitionId];
        if (!def) return false;
        return !effect.excludeTypes.some((type) => def.types.includes(type));
      });
      if (candidates.length === 0) return;
      state.pendingCardChoices.push({
        playerId: controllerId,
        sourceInstanceId,
        prompt: `${cardName(state, sourceInstanceId)}: exile a card from your hand to imprint?`,
        candidateInstanceIds: candidates.map((c) => c.instanceId),
        min: 0,
        max: 1,
        mode: "exile-imprint",
        effectControllerId: controllerId,
      });
      return;
    }
    case "changeTargets": {
      /*
       * "You may choose new targets for target spell or ability."
       *
       * The legality of the new targets is judged for the *spell being
       * re-pointed*, not for the player doing the re-pointing: hexproof asks who
       * is casting, and that is still its own controller. What Deflecting Swat
       * changes is who does the choosing.
       */
      const onStack = targets.find((t): t is Extract<StackTarget, { kind: "spell" }> => t.kind === "spell");
      const obj = onStack ? state.stack.find((o) => o.id === onStack.stackObjectId) : undefined;
      // Countered, resolved or otherwise gone in response - there is nothing
      // left to re-point, and the Swat simply does nothing.
      if (!obj) return;
      const selector = targetSelectorOf(obj.effect);
      // A spell with no targets at all cannot have new ones chosen for it.
      if (!selector) return;
      const candidates = legalTargetsFor(state, selector, obj.controllerId, obj.sourceInstanceId);
      if (candidates.length === 0) return;
      const { min, max } = targetCountOf(selector, 0);
      state.pendingTargetChoices.push({
        playerId: controllerId,
        sourceInstanceId,
        candidates,
        prompt: `${cardName(state, sourceInstanceId)}: choose new targets for ${cardName(state, obj.sourceInstanceId)}`,
        min,
        max,
        object: obj,
        // Already on the stack: only its targets change.
        retarget: true,
      });
      return;
    }
    case "addKeywordCounter": {
      /*
       * "Put a +1/+1 counter **and a double strike counter** on Quicksilver."
       *
       * A counter, not a grant: it does not wear off in the cleanup step, which
       * is why it lives in its own list on the instance. Both counters in one
       * effect because the card puts them on together.
       */
      const found = findInstance(state, sourceInstanceId);
      if (!found || found.instance.zone !== "battlefield") return;
      if (!found.instance.keywordCounters.includes(effect.keyword)) {
        found.instance.keywordCounters.push(effect.keyword);
      }
      if (effect.alsoPlusOne) {
        // Through `countersPlaced`, like every other counter here, so a doubler
        // reaches it - the +1/+1 half of this really is an ordinary counter.
        found.instance.plusOneCounters += countersPlaced(state, found.instance, effect.alsoPlusOne);
      }
      log(
        state,
        `${cardName(state, sourceInstanceId)} gets a ${effect.keyword.toLowerCase()} counter`,
      );
      return;
    }
    case "exileAndReturnTransformed": {
      /*
       * "Exile Ajani, then return him to the battlefield transformed under his
       * owner's control."
       *
       * Two zone changes, in that order, and the face is turned over while the
       * card is away - which is what makes this simpler than an in-place
       * transform. `moveCard` turns a back face over on the way *out* of the
       * battlefield, so the id is set after the exile and before the return, and
       * the return is to the battlefield, which that rule deliberately skips.
       *
       * What comes back is a new object: summoning sick, no counters, and every
       * "when this enters" on the far side fires, because it really is entering.
       */
      const found = findInstance(state, sourceInstanceId);
      if (!found || found.instance.zone !== "battlefield") return;
      const back = requireDefinition(state, found.instance.definitionId).transformsInto;
      if (!back) return;
      const name = cardName(state, sourceInstanceId);
      moveCard(state, sourceInstanceId, "exile");
      found.instance.definitionId = back;
      // A planeswalker arrives with its printed loyalty, and `enteredBattlefield`
      // only sets it when there is none - the front face had none to leave behind.
      found.instance.loyalty = 0;
      putOntoBattlefield(state, sourceInstanceId);
      log(state, `${name} is exiled and returns transformed as ${cardName(state, sourceInstanceId)}`);
      return;
    }
    case "eachOpponentKeepsOnePerType": {
      /*
       * "Each opponent chooses an artifact, a creature, an enchantment, and a
       * planeswalker from among the nonland permanents they control, then
       * sacrifices the rest."
       *
       * One question per opponent, queued - which is what `pendingCardChoices`
       * has been since "each opponent discards a card". The chosen cards are the
       * ones **kept**, which is the inverse of every other mode here, and the
       * whole reason this needed a mode of its own rather than a count.
       *
       * A player with nothing to lose is not asked: an empty question is a form
       * to fill in rather than a decision.
       */
      for (const player of state.players) {
        if (player.id === controllerId) continue;
        const candidates = player.battlefield.filter((permanent) => {
          const def = state.cardDefinitions[permanent.definitionId];
          return def !== undefined && !def.types.includes("Land");
        });
        if (candidates.length === 0) continue;
        state.pendingCardChoices.push({
          playerId: player.id,
          sourceInstanceId,
          prompt: `${cardName(state, sourceInstanceId)}: keep one of each of ${effect.types
            .map((t) => t.toLowerCase())
            .join(", ")} - the rest are sacrificed`,
          candidateInstanceIds: candidates.map((c) => c.instanceId),
          min: 0,
          max: effect.types.length,
          mode: "keep-one-per-type",
          keepTypes: effect.types,
          effectControllerId: controllerId,
        });
      }
      return;
    }
    case "theRingTemptsYou": {
      /*
       * "The Ring tempts you." Two things, in this order: the emblem gains its
       * next ability, and then you choose a Ring-bearer.
       *
       * The level is not a choice and never stops the game. The bearer is, and
       * does - and a player with no creatures is simply not asked, which is what
       * the rules say and is why the emblem can sit at a level with nobody
       * carrying it.
       */
      const player = requirePlayer(state, controllerId);
      if (player.ringLevel < MAX_RING_LEVEL) player.ringLevel += 1;
      log(state, `The Ring tempts ${controllerId} (${player.ringLevel} of ${MAX_RING_LEVEL})`);
      const creatures = player.battlefield.filter((c) => typesOf(state, c).includes("Creature"));
      if (creatures.length === 0) return;
      state.pendingCardChoices.push({
        playerId: controllerId,
        sourceInstanceId,
        prompt: "Choose a creature to be your Ring-bearer",
        candidateInstanceIds: creatures.map((c) => c.instanceId),
        // Not optional: a player with a creature must name one, and keeping the
        // one they already have means naming it again.
        min: 1,
        max: 1,
        mode: "ring-bearer",
        effectControllerId: controllerId,
      });
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
      // See below - the grants are applied to each token as it is made.
      // Doubling Season and its family. Asked once for the whole event, not
      // per token - "would create one or more tokens" is a single event, so
      // two Doubling Seasons make four Insects rather than compounding oddly
      // inside the loop.
      // "Its controller creates two Treasure tokens" (An Offer You Can't Refuse)
      // makes them for the opponents rather than the caster - in a two-player
      // game, the one whose spell was just countered. This per-opponent path is
      // plain: none of the attacking/grant machinery below applies to it.
      if (effect.forController === "each-opponent") {
        const recipients = state.players.filter((p) => p.id !== controllerId).map((p) => p.id);
        for (const rid of recipients) {
          const perOpp = tokensCreated(
            state,
            rid,
            evaluateAmount(state, rid, effect.count, "createToken count", sourceInstanceId),
          );
          for (let i = 0; i < perOpp; i++) {
            const token = createCardInstance(state, effect.tokenDefinitionId, rid, "battlefield");
            /*
             * A token enters the battlefield like anything else, so it goes
             * through the same arrival path - haste, and every trigger that
             * cares that a creature arrived.
             */
            enteredBattlefield(state, token);
          }
        }
        return;
      }
      const count = tokensCreated(
        state,
        controllerId,
        evaluateAmount(state, controllerId, effect.count, "createToken count", sourceInstanceId),
      );
      /*
       * "For each opponent, create a ... token that's tapped and attacking that
       * player" - Ainok Strike Leader, whose count *is* the list of opponents.
       * Every other card makes `count` tokens with nobody in particular to
       * attack, and gets a list of that many nulls.
       */
      const aimedAt = attackTargets(state, controllerId, effect.attacking, count);
      const made: CardInstance[] = [];
      for (let i = 0; i < aimedAt.length; i++) {
        const token = createCardInstance(state, effect.tokenDefinitionId, controllerId, "battlefield");
        /*
         * A token enters the battlefield like anything else, so it goes
         * through the same arrival path - haste, and every trigger that cares
         * that a creature arrived. It used to only get the haste half, done
         * here by hand, which meant three Soldier tokens beside a Soul Warden
         * gained nothing.
         */
        const aim = aimedAt[i];
        enteredBattlefield(
          state,
          token,
          aim === null
            ? deployOptions(state, controllerId, effect.attacking === true)
            : { tapped: true, attackingPlayerId: aim },
        );
        made.push(token);
        /*
         * "That token ... attacks this combat if able" - Legion Warboss, whose
         * Goblin is made *before* attackers are declared and is told it must be
         * one of them. Nothing to do with the flag above, which is for tokens
         * that arrive in a combat already under way.
         */
        if (effect.mustAttack) token.mustAttackThisCombat = true;
        /*
         * "It gains lifelink and haste **until end of turn**" - Windcrag
         * Siege's Goblin. Granted to the instance rather than printed on the
         * token definition, so cleanup takes them off it: a token that kept
         * haste would be a different card every turn after the first.
         */
        for (const keyword of effect.grants ?? []) {
          if (!token.grantedKeywords.includes(keyword)) token.grantedKeywords.push(keyword);
          // Haste granted as a token is made is granted so that it can attack
          // *now*, which is also what `makeCopyToken` does with it.
          if (keyword === "Haste") token.summoningSickness = false;
        }
      }
      /*
       * "Sacrifice them at the beginning of the next end step" - mobilize.
       * Scheduled over the tokens that were actually made, not over the count
       * and not over the creature that made them, which may be dead by then.
       */
      if (effect.delayedEnd && made.length > 0) {
        scheduleDelayedRemoval(state, controllerId, sourceInstanceId, made, effect.delayedEnd);
      }
      return;
    }
    case "restrictThisTurn": {
      state.turnRestrictions.push({ restriction: effect.restriction, controllerId });
      return;
    }
    case "deployFromTop": {
      /*
       * The six cards exist only inside this resolution, so they are held on
       * the pending search rather than moved anywhere first. Nothing leaves the
       * library until somebody answers - a card looked at and put back on the
       * bottom never changed zones, which is why no zone-change trigger fires
       * for the five Winota does not take.
       */
      const player = requirePlayer(state, controllerId);
      const looked = player.library.slice(0, effect.amount);
      if (looked.length === 0) return;
      const candidates = looked.filter((card) => {
        const def = requireDefinition(state, card.definitionId);
        if (!def.types.includes(effect.cardType)) return false;
        return !effect.subtype || (def.subtypes ?? []).includes(effect.subtype);
      });
      state.pendingSearch = {
        playerId: controllerId,
        effectControllerId: controllerId,
        sourceInstanceId,
        candidateInstanceIds: candidates.map((card) => card.instanceId),
        destination: "battlefield",
        tapped: effect.tapped,
        attacking: effect.attacking,
        grants: effect.grants,
        // Every card looked at, not just the ones on offer: Winota buries the
        // five she could never have taken alongside the one she declined.
        bottomInstanceIds: looked.map((card) => card.instanceId),
        // The library is reordered, never shuffled - the whole point of looking
        // is the information, and a shuffle would throw it away.
        noShuffle: true,
        prompt: `put a ${effect.subtype ? effect.subtype + " " : ""}${effect.cardType.toLowerCase()} card onto the battlefield`,
      };
      return;
    }
    case "pump": {
      /*
       * Counted here rather than substituted earlier, because Goblin
       * Rabblemaster's "+1/+0 for each other attacking Goblin" is only knowable
       * once attackers have been declared - and stays knowable, so a Goblin
       * removed from combat in response really does take a point back off.
       * Every other card in the pool prints a literal, which evaluates to
       * itself.
       */
      const power = evaluateAmount(state, controllerId, effect.power, "pump power", sourceInstanceId);
      const toughness = evaluateAmount(
        state,
        controllerId,
        effect.toughness,
        "pump toughness",
        sourceInstanceId,
      );
      const cardTargets = targets.filter((t): t is Extract<StackTarget, { kind: "card" }> => t.kind === "card");
      // No explicit target means "this creature" - the activated-ability form
      // ("{G}: this creature gets +2/+2"), same convention as addCounter.
      const ids = cardTargets.length > 0 ? cardTargets.map((t) => t.instanceId) : [sourceInstanceId];
      for (const id of ids) {
        const found = findInstance(state, id);
        // A creature that has already left the battlefield just isn't there to
        // be pumped - the spell fizzles on it rather than tracking a ghost.
        if (!found || found.instance.zone !== "battlefield") continue;
        found.instance.temporaryPowerBonus += power;
        found.instance.temporaryToughnessBonus += toughness;
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
          /*
           * "each other **attacking** creature" - battle cry. Read off
           * `state.attackers` rather than off a flag on the creature, the same
           * way the attacking target selector does, so a creature that has left
           * combat stops counting.
           */
          if (effect.restriction === "attacking" && !(instance.instanceId in state.attackers)) continue;
          /*
           * "**Creature tokens** you control gain indestructible" - Ainok Strike
           * Leader. Both halves of what a token is, because the engine has two:
           * a token minted from a token definition, and a token that is a copy
           * of a real card, flagged on the instance.
           */
          if (effect.restriction === "token" && !(affectedDef?.isToken || instance.isTokenCopy)) continue;
          // "each **other** attacking creature" - the source is not one of them.
          if (effect.excludeSelf && instance.instanceId === sourceInstanceId) continue;
          // "Non-Human creatures you control" - Return of the Wildspeaker.
          if (effect.excludeSubtype && affectedDef?.subtypes?.includes(effect.excludeSubtype)) continue;
          instance.temporaryPowerBonus += power;
          instance.temporaryToughnessBonus += toughness;
          /*
           * "until your next turn" goes in the other list, which the untap step
           * sweeps rather than the cleanup step. Same keywords, same reader -
           * only the moment they end differs, which is the whole reason there
           * are two lists.
           */
          const into =
            effect.grantsUntil === "your-next-turn"
              ? instance.grantedKeywordsUntilYourNextTurn
              : instance.grantedKeywords;
          for (const keyword of effect.grants ?? []) {
            if (!into.includes(keyword)) into.push(keyword);
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
    case "tap": {
      /*
       * "They may tap that permanent." The only place in this engine that taps a
       * permanent as an *effect* rather than as a cost - and it goes through
       * `tapPermanent` like every other site, so an opponent's City of Brass
       * tapped this way still deals them its damage.
       */
      const cardTargets = targets.filter((t): t is Extract<StackTarget, { kind: "card" }> => t.kind === "card");
      const ids = cardTargets.length > 0 ? cardTargets.map((t) => t.instanceId) : [sourceInstanceId];
      for (const id of ids) {
        const found = findInstance(state, id);
        if (!found || found.instance.zone !== "battlefield" || found.instance.tapped) continue;
        tapPermanent(state, found.instance);
        log(state, `${cardName(state, id)} is tapped`);
      }
      return;
    }
    case "theyMay": {
      /*
       * "They may tap that permanent. If they don't, you create a ... token."
       *
       * The asked player is read off the permanent the event carried - "that
       * permanent" belongs to whoever controls it - and the two halves belong to
       * two different players: they tap their own thing, and the *controller*
       * gets the token. `pendingConfirmation` already keeps the asked player and
       * the effect's controller apart, so both halves land on the right side of
       * the table without any of it being special-cased here.
       */
      const subject = targets.find((t): t is Extract<StackTarget, { kind: "card" }> => t.kind === "card");
      const found = subject ? findInstance(state, subject.instanceId) : undefined;
      if (!found || found.instance.zone !== "battlefield") {
        // The permanent has already gone, so there is nothing to tap and nothing
        // to decline - and the "if they don't" half does not happen either: the
        // question was never asked.
        return;
      }
      state.pendingConfirmation = {
        playerId: found.instance.controllerId,
        sourceInstanceId,
        prompt: effect.prompt,
        object: {
          id: `they-${state.nextStackObjectId++}`,
          sourceInstanceId,
          controllerId,
          effect: effect.then,
          targets,
          isPermanentSpell: false,
        },
        otherwise: effect.otherwise,
      };
      return;
    }
    case "untap": {
      const cardTargets = targets.filter((t): t is Extract<StackTarget, { kind: "card" }> => t.kind === "card");
      // No target named means "this permanent", the same convention `pump` and
      // `addCounter` follow for their activated-ability forms.
      const ids = cardTargets.length > 0 ? cardTargets.map((t) => t.instanceId) : [sourceInstanceId];
      for (const id of ids) {
        const found = findInstance(state, id);
        // Gone from the battlefield is simply not there to untap - the ability
        // fizzles on it rather than following it into a graveyard.
        if (!found || found.instance.zone !== "battlefield") continue;
        if (!found.instance.tapped) continue;
        found.instance.tapped = false;
        log(state, `${cardName(state, id)} untaps`);
      }
      return;
    }
    case "untapAll": {
      /*
       * "Untap all **other** creatures you control" - Combat Celebrant, which
       * stays tapped itself because it is the one attacking.
       *
       * Untargeted, so no hexproof check and nothing to fizzle on. Attacking
       * creatures untapped here stay attacking: untapping does not remove a
       * creature from combat, which is the entire trick the card is built on.
       */
      let untapped = 0;
      for (const instance of controller.battlefield) {
        if (effect.excludeSource && instance.instanceId === sourceInstanceId) continue;
        if (!state.cardDefinitions[instance.definitionId]?.types.includes("Creature")) continue;
        if (!instance.tapped) continue;
        instance.tapped = false;
        untapped += 1;
      }
      if (untapped > 0) {
        log(state, `${controllerId} untaps ${untapped} creature${untapped === 1 ? "" : "s"}`);
      }
      return;
    }
    case "exertSelf": {
      const found = findInstance(state, sourceInstanceId);
      if (!found || found.instance.zone !== "battlefield") return;
      found.instance.exerted = true;
      log(state, `${cardName(state, sourceInstanceId)} is exerted and will not untap next turn`);
      return;
    }
    case "additionalCombatPhase": {
      state.extraCombatPhases += 1;
      log(state, `there will be an additional combat phase after this one`);
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
       * "Draw a card, then **discard a card**" - The Ring's second ability,
       * where the player discarding is the one who drew. Queued like everybody
       * else's, because which card you give up is the same real decision it is
       * for an opponent.
       */
      if (effect.who === "controller") {
        const player = requirePlayer(state, controllerId);
        if (player.hand.length === 0) return;
        state.pendingDiscards.push({
          playerId: controllerId,
          sourceInstanceId,
          remaining: effect.amount,
          prompt: `${cardName(state, sourceInstanceId)}: discard ${effect.amount === 1 ? "a card" : `${effect.amount} cards`}`,
        });
        return;
      }
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
        /*
         * "Counter target spell **if it's blue**" - Pyroblast, whose target is a
         * spell on the stack rather than a card in a zone. Both shapes read the
         * same definition in the end.
         */
        const definitionId =
          target.kind === "card"
            ? findInstance(state, target.instanceId)?.instance.definitionId
            : target.kind === "spell"
              ? state.stackCards.find(
                  (c) => c.instanceId === state.stack.find((o) => o.id === target.stackObjectId)?.sourceInstanceId,
                )?.definitionId
              : undefined;
        if (!definitionId) return false;
        const def = requireDefinition(state, definitionId);
        if (effect.cardType && !def.types.includes(effect.cardType)) return false;
        if (effect.color && !cardColors(def).includes(effect.color)) return false;
        return true;
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

        /*
         * "Spells you control can't be countered." - Hexing Squelcher.
         *
         * Asked of the board at the moment somebody tries, rather than stamped
         * onto the spell as it was cast: the Squelcher can arrive after the
         * spell is already on the stack, and it protects that spell too.
         */
        const protector = requirePlayer(state, obj.controllerId).battlefield.find(
          (permanent) => state.cardDefinitions[permanent.definitionId]?.staticRules?.yourSpellsCantBeCountered,
        );
        if (protector) {
          log(
            state,
            `${spellDef?.name ?? "that spell"} can't be countered - ${cardName(state, protector.instanceId)}`,
          );
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
          candidateInstanceIds: searchCandidates(state, searcher, effect),
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
        fireLibrarySearched(state, first!);
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
        candidateInstanceIds: searchCandidates(state, searcher, effect),
        destination: effect.destination,
        tapped: effect.tapped,
        prompt: describeSearch(effect),
        // Carried through by `sequence` below when there is more of the card
        // left to do after the shuffle.
        followUp: pendingFollowUp,
      };
      /*
       * "Whenever an opponent searches their library" - Archivist of Oghma.
       * Fired here rather than in `resolveSearch`, because searching is what
       * the player is doing now: one who finds nothing has still searched, and
       * one who never answers has still set the trigger off.
       */
      fireLibrarySearched(state, searcherId);
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

/** "power 2 or less and mana value 1 or less" - every cap a search prints. */
function listAnd(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
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
  const types = effect.cardType
    ? (Array.isArray(effect.cardType) ? effect.cardType : [effect.cardType]).map((t) => t.toLowerCase())
    : [];
  // "with power 2 or less" - the cap belongs in the picker heading, because it
  // is the difference between the tutor the card prints and a strictly better
  // one, and the heading is the only place the player is told which they have.
  const caps: string[] = [];
  if (effect.maxPower !== undefined) caps.push(`power ${effect.maxPower} or less`);
  if (effect.maxToughness !== undefined) caps.push(`toughness ${effect.maxToughness} or less`);
  if (effect.maxManaValue !== undefined) caps.push(`mana value ${effect.maxManaValue} or less`);
  const cap = caps.length > 0 ? ` with ${listAnd(caps)}` : "";
  const what = effect.subtypes?.length
    ? `a ${basic}${listOr(effect.subtypes)} card${cap}`
    : effect.basicLandOnly
      ? "a basic land card"
      : types.length > 0
        ? `a ${listOr(types)} card${cap}`
        : `a card${cap}`;
  const where =
    effect.destination === "battlefield"
      ? "onto the battlefield"
      : effect.destination === "library-top"
        ? "on top of your library"
        : "into your hand";
  return `Search your library for ${what} and put it ${where}${effect.tapped ? " tapped" : ""}`;
}

/**
 * Which of a player's library cards this search may actually take.
 *
 * "If an opponent would search a library, that player searches the **top four
 * cards** of that library instead." - Aven Mindcensor. Applied to the *library*
 * before the card filter, which is the order the card describes and the order
 * that matters: four cards are looked at, and whether any of them is a match is
 * the searcher's problem.
 *
 * Index 0 is the top of the library, which is where `drawCard` takes from.
 */
function searchCandidates(
  state: GameState,
  searcher: Player,
  effect: Extract<Effect, { kind: "searchLibrary" }>,
): string[] {
  let library = searcher.library;
  let cap: number | undefined;
  for (const player of state.players) {
    if (player.id === searcher.id) continue;
    for (const permanent of player.battlefield) {
      const limit = state.cardDefinitions[permanent.definitionId]?.staticRules?.opponentSearchesTopCards;
      // Two of them on the table means the smaller number wins - each is a
      // replacement and both apply.
      if (limit !== undefined) cap = cap === undefined ? limit : Math.min(cap, limit);
    }
  }
  if (cap !== undefined) {
    library = library.slice(0, cap);
    log(state, `${searcher.id} searches only the top ${cap} cards of their library`);
  }
  return library.filter((card) => matchesSearch(state, card, effect)).map((card) => card.instanceId);
}

function matchesSearch(
  state: GameState,
  card: CardInstance,
  effect: Extract<Effect, { kind: "searchLibrary" }>,
): boolean {
  const definition = state.cardDefinitions[card.definitionId];
  if (!definition) return false;
  if (effect.basicLandOnly && !definition.supertypes?.includes("Basic")) return false;
  // "An artifact or enchantment card" - any one of the listed types qualifies.
  // `cardType` may be one type (with an optional `orHasKeyword` fallback, e.g.
  // "an instant card or a card with flash") or a list; `cardTypes` is the
  // separate list form. Any of them can be set.
  if (effect.cardType) {
    const wanted = Array.isArray(effect.cardType) ? effect.cardType : [effect.cardType];
    if (!wanted.some((type) => definition.types.includes(type))) {
      // "...or a card with flash" - a fallback keyword still qualifies it.
      if (!(effect.orHasKeyword && definition.keywords?.includes(effect.orHasKeyword))) return false;
    }
  }
  if (effect.cardTypes?.length && !effect.cardTypes.some((t) => definition.types.includes(t))) return false;
  /*
   * The recruiters. Printed characteristics only: a card in a library is not
   * on the battlefield, so nothing is buffing it and there is nothing to read
   * but what the card says.
   *
   * A creature with no printed power - which is nothing in this pool, but the
   * field is optional - fails the test rather than passing it. "Power 2 or
   * less" is a claim about a number, and a card with no number does not make it.
   */
  if (effect.maxPower !== undefined && (definition.power ?? Infinity) > effect.maxPower) return false;
  if (effect.maxToughness !== undefined && (definition.toughness ?? Infinity) > effect.maxToughness) {
    return false;
  }
  if (effect.maxManaValue !== undefined && manaValue(definition.manaCost ?? { generic: 0, colors: {} }) > effect.maxManaValue) {
    return false;
  }
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
      const deployed = putOntoBattlefield(state, instanceId, {
        tapped: pending.tapped,
        ...deployOptions(state, playerId, pending.attacking),
      });
      for (const keyword of pending.grants ?? []) {
        if (!deployed.grantedKeywords.includes(keyword)) deployed.grantedKeywords.push(keyword);
      }
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
  const bottomInstanceIds = pending.bottomInstanceIds;
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
   * "Put the rest on the bottom of your library in a random order."
   *
   * A reorder, not a zone change - the cards never left the library, so
   * nothing triggers. Whatever was taken is filtered out first, so a card
   * cannot be both deployed and buried.
   */
  if (bottomInstanceIds?.length) {
    const library = requirePlayer(state, playerId).library;
    const buried: typeof library = [];
    for (const id of bottomInstanceIds) {
      if (id === instanceId) continue;
      const index = library.findIndex((card) => card.instanceId === id);
      if (index >= 0) buried.push(...library.splice(index, 1));
    }
    for (let i = buried.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [buried[i], buried[j]] = [buried[j]!, buried[i]!];
    }
    library.push(...buried);
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
  // "with different names" - Emergent Ultimatum's search may not take two copies.
  if (pending.distinctNames) {
    const names = instanceIds.map((id) => requireDefinition(state, findInstance(state, id)!.instance.definitionId).name);
    if (new Set(names).size !== names.length) throw new Error("The chosen cards must have different names");
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

  /*
   * Mox Diamond, whose answer decides whether the permanent that asked ever
   * arrives. Handled before the loop because the interesting half is what
   * happens when *nothing* was chosen - which is where every other mode simply
   * does nothing.
   */
  /*
   * "You may begin the game with it on the battlefield. If you do, exile a card
   * from your hand." - taken before the game starts, so nothing was cast and
   * nothing is on any stack. It still *enters the battlefield*, so everything
   * watching for an arrival sees it.
   */
  /*
   * Ajani's -4. The chosen cards are the ones kept and everything else the
   * player was offered is sacrificed - so this is settled here rather than in
   * the loop below, which is written the other way round.
   *
   * The answer is checked as well as counted: at most one of each named type,
   * because "an artifact, a creature, an enchantment, and a planeswalker" is
   * four slots and not four cards. A permanent that is two of those types at
   * once may fill either slot, which is why this walks the chosen cards and
   * tries to seat each one rather than tallying types.
   */
  if (pending.mode === "ring-bearer") {
    const bearer = chosen[0];
    if (bearer) {
      requirePlayer(state, playerId).ringBearerInstanceId = bearer;
      log(state, `${cardName(state, bearer)} becomes ${playerId}'s Ring-bearer`);
    }
    return;
  }

  if (pending.mode === "keep-one-per-type") {
    const types = pending.keepTypes ?? [];
    const filled = new Set<CardType>();
    for (const id of chosen) {
      const def = state.cardDefinitions[findInstance(state, id)?.instance.definitionId ?? ""];
      const seat = types.find((type) => def?.types.includes(type) && !filled.has(type));
      if (!seat) throw new Error("Only one permanent of each named type may be kept");
      filled.add(seat);
    }
    const kept = new Set(chosen);
    for (const id of pending.candidateInstanceIds) {
      if (kept.has(id)) continue;
      const found = findInstance(state, id);
      // Something may have left the battlefield while the question sat open.
      if (found?.instance.zone === "battlefield") sacrificePermanent(state, id);
    }
    return;
  }

  if (pending.mode === "begin-on-battlefield") {
    const taken = chosen[0];
    if (taken) {
      const rule = state.cardDefinitions[findInstance(state, taken)?.instance.definitionId ?? ""]
        ?.beginsOnBattlefield;
      const arrived = putOntoBattlefield(state, taken);
      // "...with a luck counter on it". Held as an ordinary other-counter pip,
      // which is what the mana ability below reads.
      if (rule?.withCounter) arrived.otherCounters += 1;
      log(state, `${playerId} begins the game with ${cardName(state, taken)} on the battlefield`);
      /*
       * "If you do, exile a card from your hand." Not optional and not part of
       * the offer: it is the price, and it is asked as its own question because
       * which card you give up is a real decision.
       */
      if (rule?.thenExileFromHand) {
        const hand = requirePlayer(state, playerId).hand;
        if (hand.length > 0) {
          state.pendingCardChoices.push({
            playerId,
            sourceInstanceId: taken,
            prompt: `${cardName(state, taken)}: exile a card from your hand`,
            candidateInstanceIds: hand.map((c) => c.instanceId),
            min: 1,
            max: 1,
            mode: "exile",
            effectControllerId: playerId,
          });
        }
      }
    }
    return;
  }

  if (pending.mode === "discard-to-enter") {
    const taken = chosen[0];
    if (taken) {
      log(state, `${playerId} discards ${cardName(state, taken)} for ${cardName(state, pending.sourceInstanceId)}`);
      moveCard(state, taken, "graveyard");
      putOntoBattlefield(state, pending.sourceInstanceId, { replacementSettled: true });
    } else {
      log(state, `${cardName(state, pending.sourceInstanceId)} is put into its owner's graveyard`);
      moveCard(state, pending.sourceInstanceId, "graveyard");
    }
    return;
  }

  /*
   * Emergent Ultimatum's second half: the opponent has chosen one of the exiled
   * cards. Shuffle it into the caster's library, then the caster casts the rest
   * for free. Handled here, ahead of the generic mode loop, because none of the
   * exiled cards move the way any mode would - one goes to a library, the others
   * to the stack from exile.
   */
  if (pending.emergentStep === "opponent-pick") {
    const casterId = pending.effectControllerId;
    const picked = chosen[0];
    if (picked) {
      moveCard(state, picked, "library");
      shuffleLibrary(state, casterId);
      log(state, `${playerId} shuffles ${cardName(state, picked)} into ${casterId}'s library`);
    }
    for (const id of pending.candidateInstanceIds) {
      if (id === picked) continue;
      castFromExileForFree(state, casterId, id);
    }
    return;
  }

  for (const id of chosen) {
    if (pending.mode === "sacrifice") sacrificePermanent(state, id);
    else if (pending.mode === "exile") {
      moveCard(state, id, "exile");
      log(state, `${playerId} exiles ${cardName(state, id)}`);
    }
    else if (pending.mode === "to-hand") {
      moveCard(state, id, "hand");
      log(state, `${playerId} takes ${cardName(state, id)}`);
    } else if (pending.mode === "exile-imprint") {
      /*
       * The card is exiled *and* remembered, and the second half is the whole
       * of imprint: an ordinary exile is a card that has left, and this one goes
       * on lending its colours to the permanent that exiled it.
       *
       * Written on the source rather than kept as a list of colours, so two
       * Chrome Moxen can never be confused for one another and the card in
       * exile stays the single answer to what this Mox taps for.
       */
      const name = cardName(state, id);
      moveCard(state, id, "exile");
      const source = findInstance(state, pending.sourceInstanceId);
      if (source) source.instance.imprintedInstanceId = id;
      log(state, `${playerId} imprints ${name} on ${cardName(state, pending.sourceInstanceId)}`);
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
   * Emergent Ultimatum's first half is done: the searched cards are exiled.
   * Searching shuffles the library, and then an opponent is asked to choose one
   * of the exiled cards to shuffle back. Nothing more to do if the caster took
   * nothing.
   */
  if (pending.emergentStep === "search") {
    shuffleLibrary(state, pending.effectControllerId);
    if (chosen.length > 0) {
      const opponent = state.players.find((p) => p.id !== pending.effectControllerId && !p.hasLost);
      if (opponent) {
        state.pendingCardChoices.unshift({
          playerId: opponent.id,
          effectControllerId: pending.effectControllerId,
          sourceInstanceId: pending.sourceInstanceId,
          candidateInstanceIds: chosen,
          min: 1,
          max: 1,
          mode: "exile",
          emergentStep: "opponent-pick",
          prompt: `${cardName(state, pending.sourceInstanceId)}: choose a card to shuffle into ${pending.effectControllerId}'s library`,
        });
      }
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
/**
 * Names the colour a protection ability was waiting on, and grants it.
 *
 * Re-checked against the pending entry rather than trusted, the same as every
 * other resolver here: a client cannot answer a question asked of somebody else,
 * and cannot name colourless unless the card offered it.
 */
export function resolveColorChoice(
  state: GameState,
  playerId: string,
  quality: ProtectionQuality,
): void {
  const pending = state.pendingColorChoice;
  if (!pending) throw new Error("No colour is waiting to be named");
  if (pending.playerId !== playerId) throw new Error(`The choice belongs to ${pending.playerId}`);
  if (quality === "colorless" && !pending.allowColorless) {
    throw new Error("That card does not offer protection from colorless");
  }
  state.pendingColorChoice = null;

  const found = findInstance(state, pending.targetInstanceId);
  // It may have died while the question sat there. The ability has finished
  // resolving either way.
  if (!found || found.instance.zone !== "battlefield") return;

  /*
   * Every clause keyed to the colour just named, applied together.
   *
   * Mother of Runes and Giver of Runes name one; Skrelv names three, and they
   * are three clauses of one sentence rather than three abilities - so they are
   * answered by one question and applied at one moment.
   */
  const granted = pending.grants ?? ["protection"];
  const words: string[] = [];
  if (granted.includes("protection")) {
    if (!found.instance.protectionFrom.includes(quality)) found.instance.protectionFrom.push(quality);
    words.push(`protection from ${qualityWord(quality)}`);
  }
  if (granted.includes("hexproof-from")) {
    if (!found.instance.hexproofFrom.includes(quality)) found.instance.hexproofFrom.push(quality);
    words.push(`hexproof from ${qualityWord(quality)}`);
  }
  if (granted.includes("unblockable-by") && quality !== "colorless") {
    found.instance.blockRestrictionsThisTurn.push({ kind: "not-color", color: quality });
    words.push(`unblockability by ${qualityWord(quality)} creatures`);
  }
  log(
    state,
    `${cardName(state, pending.targetInstanceId)} gains ${words.join(" and ")} until end of turn`,
  );
}

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
  const targets = selector ? legalTargetsFor(state, selector, playerId, instanceId).slice(0, 1) : [];
  if (selector && targets.length === 0) return;
  const priorityBefore = state.priorityPlayerIndex;
  state.priorityPlayerIndex = state.players.findIndex((p) => p.id === playerId);
  try {
    castSpell(state, playerId, instanceId, targets, { free: true });
  } finally {
    state.priorityPlayerIndex = priorityBefore;
  }
}

/**
 * "You may cast the other cards without paying their mana costs." - Emergent
 * Ultimatum, casting from exile. Moved to hand first (the suspend trick) because
 * `castSpell`'s free path starts there; timing is ignored, since this is part of
 * a resolution rather than a fresh priority window.
 */
function castFromExileForFree(state: GameState, playerId: string, instanceId: string): void {
  const found = findInstance(state, instanceId);
  if (!found || found.instance.zone !== "exile") return;
  const def = requireDefinition(state, found.instance.definitionId);
  const selector = targetSelectorOf(def.castEffect ?? { kind: "draw", amount: 0 });
  const targets = selector ? legalTargetsFor(state, selector, playerId).slice(0, 1) : [];
  if (selector && targets.length === 0) return;
  // A land is not cast; it is simply left in exile (the card says "cast", and a
  // land among the exiled ones has no way to be played from here).
  if (def.types.includes("Land")) return;
  moveCard(state, instanceId, "hand");
  const priorityBefore = state.priorityPlayerIndex;
  state.priorityPlayerIndex = state.players.findIndex((p) => p.id === playerId);
  try {
    castSpell(state, playerId, instanceId, targets, { free: true, ignoreTiming: true });
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
 * The arrival options for a permanent joining a combat already under way.
 *
 * Which player it attacks is read off the combat in progress rather than
 * chosen: every card that does this is an attack trigger, so there is always
 * exactly one defending player by the time it resolves. With no combat running
 * the permanent simply arrives normally - "tapped and attacking" outside combat
 * is not a thing, and quietly tapping it would be a worse answer than doing
 * nothing.
 */
function deployOptions(
  state: GameState,
  controllerId: string,
  attacking?: boolean,
): { tapped?: boolean; attackingPlayerId?: string } {
  if (!attacking) return {};
  const defenderId = Object.values(state.attackers)[0];
  if (!defenderId) return {};
  return { tapped: true, attackingPlayerId: defenderId };
}

/**
 * Who each token Ainok Strike Leader makes is attacking.
 *
 * "For each opponent, create a ... token that's tapped and attacking **that
 * player**" - one token per opponent, each aimed at its own, which is a
 * different card from one token per opponent all piling onto whoever is already
 * being attacked. In a duel the two are the same and the distinction is
 * invisible; in a pod it is the whole ability.
 *
 * Returns one entry per token to make. `null` in the list means "not attacking
 * anybody", which is what a token made outside combat is.
 */
function attackTargets(
  state: GameState,
  controllerId: string,
  attacking: boolean | "each-opponent" | undefined,
  count: number,
): Array<string | null> {
  if (attacking !== "each-opponent") return new Array<string | null>(count).fill(null);
  const opponents = state.players.filter((player) => player.id !== controllerId).map((player) => player.id);
  if (opponents.length === 0) return [];
  /*
   * Driven by the count rather than by the list, so that a Doubling Season
   * beside Ainok Strike Leader makes two tokens per opponent rather than two
   * tokens total. The card's own count is "for each opponent", so without a
   * doubler the two are the same length and each token lands on its own player.
   */
  return Array.from({ length: count }, (_, i) => opponents[i % opponents.length]!);
}

/**
 * One token that is a copy of a printed card.
 *
 * The flag goes on the *instance* and never on the definition. The definition
 * being copied is a real card, and marking it `isToken` would make every real
 * copy of that card cease to exist the moment it left the battlefield.
 */
function makeCopyToken(
  state: GameState,
  controllerId: string,
  definitionId: string,
  grants?: Keyword[],
  ptOverride?: { power: number; toughness: number },
): CardInstance {
  const token = createCardInstance(state, definitionId, controllerId, "battlefield");
  token.isTokenCopy = true;
  // "a 1/1 token copy" - Offspring stamps the copy's printed P/T over the
  // original's, everything else copied. Set before it enters so its own arrival
  // reads the right size.
  if (ptOverride) {
    token.basePowerOverride = ptOverride.power;
    token.baseToughnessOverride = ptOverride.toughness;
  }
  /*
   * A copy enters the battlefield like anything else, so it goes through the
   * same arrival path - its own enters-the-battlefield triggers included. A
   * copy of a creature with an arrival trigger really does fire it, which is
   * most of why Kiki-Jiki is a combo piece rather than a Threaten.
   */
  enteredBattlefield(state, token);
  for (const keyword of grants ?? []) {
    if (!token.grantedKeywords.includes(keyword)) token.grantedKeywords.push(keyword);
    // Haste is the point of the grant on both cards that use it: a copy made in
    // your precombat main phase is meant to attack this turn.
    if (keyword === "Haste") token.summoningSickness = false;
  }
  return token;
}

/**
 * Sets up "sacrifice it at the beginning of the next end step".
 *
 * The turn it becomes due is worked out here, once, rather than being asked
 * again at every end step: during the end step itself "the next end step" is the
 * following turn's, which is what activating Kiki-Jiki in your own end step
 * means and is otherwise very easy to get wrong by a whole turn.
 */
function scheduleDelayedRemoval(
  state: GameState,
  controllerId: string,
  sourceInstanceId: string,
  tokens: CardInstance[],
  action: DelayedAction,
  /** "at end of combat" rather than the next end step - The Ring's third ability. */
  at: "end-step" | "end-of-combat" = "end-step",
): void {
  const alreadyPastIt = at === "end-step" && state.phase === "ending";
  state.delayedTriggers.push({
    instanceIds: tokens.map((token) => token.instanceId),
    controllerId,
    sourceInstanceId,
    action,
    at,
    readyOnTurn: state.turnNumber + (alreadyPastIt ? 1 : 0),
  });
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
