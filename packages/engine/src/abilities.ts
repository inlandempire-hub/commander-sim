import { activateRestrictionProblem } from "./restrictions.js";
import type { ActivatedAbility, CardInstance, Effect, GameState, ManaCost, StackTarget } from "./types.js";
import { findInstance, log, moveCard, requireDefinition, requirePlayer } from "./state.js";
import {
  canPayManaCost,
  canPayManaCostFromPool,
  colorAllowed,
  payManaCost,
  potentialAvailableMana,
  couldAfford,
} from "./mana.js";
import { controllerMeets } from "./conditions.js";
import { typesOf } from "./counters.js";
import { damagePlayer } from "./damage.js";
import { applyEffect } from "./effects.js";
import { pushOntoStack, tapPermanent } from "./permanents.js";
import { sacrificePermanent } from "./sba.js";
import { isValidTarget, legalTargetsFor, targetSelectorOf } from "./targeting.js";
import { canCastAtSorcerySpeed } from "./casting.js";
import { attemptWardPayments } from "./ward.js";
import { resolveAmounts } from "./x.js";

/**
 * Which of a permanent's activated abilities its controller could use right
 * now, as indices into `activatedAbilities`.
 *
 * Exists because a permanent with more than one ability has to be asked which,
 * and the interface must only ever offer the ones that would actually work -
 * a menu listing "Add {B}" on a Tainted Wood with no Swamp out is a menu that
 * lies. Sharing one answer with `activateAbility` is what keeps the offer and
 * the refusal in step.
 *
 * Mana is judged against what the player could still produce rather than what
 * is floating, because activating through the client taps lands on your behalf.
 */
/**
 * What this ability actually costs to activate right now.
 *
 * The one place that answers it, because two answers is how the offer and the
 * payment come apart: `activatableAbilities` asks whether it can be afforded and
 * `activateAbility` takes the mana, and a reduction known to one of them is a
 * Channel land the interface greys out at a price the player could pay.
 *
 * Reduces the generic part only, never below zero - "costs {1} less" leaves the
 * {W} in {2}{W} alone however many legends are on the table.
 */
export function abilityManaCost(
  state: GameState,
  playerId: string,
  ability: ActivatedAbility,
  /** The permanent whose ability it is - only Quicksilver's reduction needs it. */
  source?: CardInstance,
): ManaCost | undefined {
  const cost = ability.cost.mana;
  /*
   * "Reduce the cost by his mana cost if he entered this turn." - Quicksilver.
   *
   * Read here, with the other reduction, because this is the one place that
   * answers what an ability costs: the offer, the payment and the auto-tapper
   * all ask it, and a discount known to only two of them is an ability the
   * engine offers and then refuses.
   */
  if (cost && ability.costReducedByOwnCostWhenFresh && source) {
    const own = state.cardDefinitions[source.definitionId]?.manaCost;
    if (own && source.enteredOnTurn === state.turnNumber) {
      const reduced: ManaCost = {
        generic: Math.max(0, cost.generic - own.generic),
        colors: { ...cost.colors },
      };
      for (const color of Object.keys(own.colors) as Array<keyof typeof own.colors>) {
        const have = reduced.colors[color] ?? 0;
        reduced.colors[color] = Math.max(0, have - (own.colors[color] ?? 0));
      }
      return reduced;
    }
  }
  if (!cost || !ability.costReducedPer) return cost;
  const legends = requirePlayer(state, playerId).battlefield.filter((instance) => {
    const def = state.cardDefinitions[instance.definitionId];
    return def?.supertypes?.includes("Legendary") && typesOf(state, instance).includes("Creature");
  }).length;
  return { ...cost, generic: Math.max(0, cost.generic - legends) };
}

/**
 * Where an ability may be activated from.
 *
 * The battlefield for almost everything, and the hand for the two shapes that say
 * so in their cost - see `ActivatedAbilityCost.fromHand`.
 */
function abilityZoneAllows(ability: ActivatedAbility, zone: string): boolean {
  return ability.cost.fromHand ? zone === "hand" : zone === "battlefield";
}

/**
 * A permanent of the named subtype this player could give up - "Sacrifice a
 * Treasure".
 *
 * The first one found, because every printing of this shape names a token type
 * whose copies are identical: a chooser for "which of your three Treasures"
 * would be a question with one answer. The day a card says "sacrifice a
 * creature" this needs to become a real choice, which is what PendingSacrifice
 * already is.
 */
function sacrificeCandidate(state: GameState, playerId: string, subtype: string): string | undefined {
  const found = requirePlayer(state, playerId).battlefield.find((instance) =>
    state.cardDefinitions[instance.definitionId]?.subtypes?.includes(subtype),
  );
  return found?.instanceId;
}

export function activatableAbilities(
  state: GameState,
  playerId: string,
  instanceId: string,
): number[] {
  const found = findInstance(state, instanceId);
  if (!found) return [];
  const { instance } = found;
  // Hand or battlefield, depending on what each ability says - a card in hand
  // offers only its Channel half, and a permanent offers only the rest.
  if (instance.zone !== "battlefield" && instance.zone !== "hand") return [];
  if (instance.controllerId !== playerId) return [];
  const def = state.cardDefinitions[instance.definitionId];
  if (!def) return [];

  const player = requirePlayer(state, playerId);
  const usable: number[] = [];

  (def.activatedAbilities ?? []).forEach((ability, index) => {
    if (!abilityZoneAllows(ability, instance.zone)) return;
    if (ability.cost.tap) {
      if (instance.tapped) return;
      // Rule 302.6 follows what the permanent *is* now: a land animated the turn
      // it arrived is a summoning-sick creature, and its {T} abilities - the mana
      // one included - are switched off until its controller's next untap step.
      if (typesOf(state, instance).includes("Creature") && instance.summoningSickness) return;
    }
    // "Equip only as a sorcery." Everything else here is instant speed.
    if (ability.sorcerySpeedOnly && !canCastAtSorcerySpeed(state, playerId)) return;
    /*
     * Planned rather than summed - see `couldAfford`. A pool counts a dual land
     * twice, which lit up abilities that could not actually be paid for.
     *
     * And the permanent itself is excluded when the ability taps it: Sapseep
     * Forest's "{G}, {T}: You gain 1 life" cannot be paid by tapping the Forest
     * for the {G}, so an ability offered on that basis is one the engine refuses.
     */
    const manaCost = abilityManaCost(state, playerId, ability, instance);
    if (
      manaCost &&
      !couldAfford(state, playerId, manaCost, ability.cost.tap ? instance.instanceId : undefined)
    ) {
      return;
    }
    if (ability.cost.payLife !== undefined && player.life < ability.cost.payLife) return;
    // "Sacrifice a Treasure" - an ability with nothing to give up is not usable.
    if (ability.cost.sacrificeSubtype && !sacrificeCandidate(state, playerId, ability.cost.sacrificeSubtype)) {
      return;
    }
    if (!colorAllowed(state, playerId, ability, instance)) return;
    if (!sourceCountersAllow(ability, instance)) return;
    // "Activate each power-up ability only once." Not offered a second time.
    if (ability.onlyOncePerGame && instance.abilitiesUsedThisGame.includes(index)) return;
    if (!controllerMeets(state, playerId, ability.activateOnlyIf)) return;
    // An ability that needs a target and has none is not a usable ability - it
    // would only walk the player into a targeting prompt with nothing to click.
    /*
     * "Choose one -" makes this a question about *any* mode: Goblin Cratermaker
     * is worth offering while there is a creature to shoot even if there is no
     * colourless permanent to destroy, and refusing it because one bullet has no
     * target would hide half the card.
     */
    const anyModeHasTargets = abilityModeEffects(ability).some((modeEffect) => {
      const selector = targetSelectorOf(modeEffect);
      if (!selector) return true;
      return legalTargetsFor(state, selector, playerId, instance.instanceId).length > 0;
    });
    if (!anyModeHasTargets) return;
    usable.push(index);
  });

  return usable;
}

/**
 * Activates a permanent's activated ability by index. Mana abilities resolve
 * immediately without using the stack (per the real rules); everything else
 * is put on the stack like a spell.
 */

/**
 * Activates a planeswalker's loyalty ability.
 *
 * Its own function rather than a branch of `activateAbility`, because almost
 * nothing about it is the same: the cost is loyalty rather than mana, it is
 * sorcery-speed only, and a permanent may use exactly one a turn however many
 * it has.
 */
export function activateLoyaltyAbility(
  state: GameState,
  playerId: string,
  instanceId: string,
  abilityIndex: number,
  /**
   * What the ability points at. Empty for every loyalty ability in the pool
   * until Ajani's 0, whose damage rider names "any target".
   *
   * Checked here rather than trusted, exactly as an activated ability's targets
   * are - the pickers only ever offer what `legalTargetsFor` returns, so an
   * illegal target can only come from a client that has gone wrong.
   */
  targets: StackTarget[] = [],
): void {
  if (state.players[state.priorityPlayerIndex]?.id !== playerId) {
    throw new Error(`${playerId} does not have priority`);
  }
  const player = requirePlayer(state, playerId);
  const instance = player.battlefield.find((c) => c.instanceId === instanceId);
  if (!instance) throw new Error(`${instanceId} is not on ${playerId}'s battlefield`);
  const def = requireDefinition(state, instance.definitionId);
  const ability = def.loyaltyAbilities?.[abilityIndex];
  if (!ability) throw new Error(`${def.name} has no loyalty ability ${abilityIndex}`);

  if (!canCastAtSorcerySpeed(state, playerId)) {
    throw new Error("Loyalty abilities can only be activated at sorcery speed");
  }
  // One a turn, per permanent - not per ability. Using the +1 and the -2 in the
  // same turn is exactly what this forbids.
  if (instance.loyaltyUsedThisTurn) {
    throw new Error(`${def.name} has already used a loyalty ability this turn`);
  }
  // A minus ability cannot be activated for more loyalty than the card has.
  if (instance.loyalty + ability.cost < 0) {
    throw new Error(`${def.name} does not have ${-ability.cost} loyalty to spend`);
  }

  /*
   * The cost is paid as the ability is activated, before it goes on the stack -
   * so a walker that ultimates dies to state-based actions with its ability
   * still waiting to resolve, which is the real behaviour.
   */
  instance.loyalty += ability.cost;
  instance.loyaltyUsedThisTurn = true;
  log(
    state,
    `${playerId} activates ${def.name}'s ${ability.cost >= 0 ? "+" : ""}${ability.cost} ability`,
  );
  const selector = targetSelectorOf(ability.effect);
  if (selector) {
    for (const target of targets) {
      if (!isValidTarget(state, selector, target, playerId, instanceId)) {
        throw new Error(`That is not a legal target for ${def.name}`);
      }
    }
  }
  pushOntoStack(state, instanceId, playerId, ability.effect, targets, false);
  state.passesInSuccession = 0;
}

/**
 * The effect an activated ability actually has, once its mode is settled.
 *
 * "Choose one -" on an ability is the same question it is on a spell, asked at
 * the same moment: as the ability is activated, before targets, because the
 * legal targets depend on which half was picked. `applyEffect` still throws on
 * a `modal` it is handed, which is what keeps a mode from being forgotten
 * somewhere new - it can only ever be unwrapped here or in `castSpell`.
 */
export function abilityEffect(
  ability: ActivatedAbility,
  chosenMode?: number,
): Effect {
  if (ability.effect.kind !== "modal") return ability.effect;
  const mode = chosenMode === undefined ? undefined : ability.effect.modes[chosenMode];
  if (!mode) throw new Error("That ability needs a mode chosen");
  return mode.effect;
}

/**
 * Every effect a modal ability could have - used where the question is "is
 * there anything this could do", such as whether to offer it at all.
 */
export function abilityModeEffects(ability: ActivatedAbility): Effect[] {
  return ability.effect.kind === "modal" ? ability.effect.modes.map((m) => m.effect) : [ability.effect];
}

/**
 * "{T}: Add {C}. **If this land has a luck counter on it**, instead add one mana
 * of any color." - Gemstone Caverns.
 *
 * Both polarities, because "instead" means the colourless half stops being
 * available the moment the counter arrives. An ability usable either way would
 * let the land make two mana on one tap.
 */
function sourceCountersAllow(ability: ActivatedAbility, instance: CardInstance): boolean {
  if (ability.onlyIfSourceHasCounters === undefined) return true;
  const has = instance.plusOneCounters + instance.otherCounters > 0;
  return has === ability.onlyIfSourceHasCounters;
}

export function activateAbility(
  state: GameState,
  playerId: string,
  instanceId: string,
  abilityIndex: number,
  targets: StackTarget[] = [],
  /**
   * Which bullet was chosen, for an ability that prints more than one.
   *
   * Carried alongside the targets rather than inside them because it is settled
   * first: "choose one" comes before "choose a target", and the second question
   * has different answers depending on the first.
   */
  chosenMode?: number,
): void {
  const found = findInstance(state, instanceId);
  if (!found) throw new Error(`Unknown card instance: ${instanceId}`);
  const { instance } = found;
  const player = requirePlayer(state, playerId);
  if (instance.controllerId !== playerId) throw new Error(`${playerId} does not control ${instanceId}`);

  const def = requireDefinition(state, instance.definitionId);
  const ability = def.activatedAbilities?.[abilityIndex];
  if (!ability) throw new Error(`${def.name} has no activated ability at index ${abilityIndex}`);
  if (!abilityZoneAllows(ability, instance.zone)) {
    throw new Error(
      ability.cost.fromHand
        ? `${def.name} can only be activated from your hand`
        : `${instanceId} is not on the battlefield`,
    );
  }

  // Clarion Conqueror and Grand Abolisher. Before any cost is validated, for
  // the same reason the cast check is: the ability is never activated at all.
  const forbidden = activateRestrictionProblem(state, playerId, def);
  if (forbidden) throw new Error(forbidden);

  // Validate every part of the cost before paying any of it - costs are paid
  // simultaneously, so an ability whose mana can't be covered must not leave
  // the permanent tapped as a side effect of the attempt.
  if (ability.cost.tap) {
    if (instance.tapped) throw new Error(`${def.name} is already tapped`);
    // Summoning sickness (302.6) only restricts creatures' tap abilities - lands and
    // other permanent types can always be tapped, even the turn they entered.
    if (typesOf(state, instance).includes("Creature") && instance.summoningSickness) {
      throw new Error(`${def.name} has summoning sickness`);
    }
  }
  /*
   * "Activate each power-up ability only once." Checked before the cost,
   * because an ability that may not be activated is not one you are asked to
   * pay for - the same ordering the activation restrictions above take.
   */
  if (ability.onlyOncePerGame && instance.abilitiesUsedThisGame.includes(abilityIndex)) {
    throw new Error(`${def.name} has already used that ability`);
  }
  const manaCost = abilityManaCost(state, playerId, ability, instance);
  if (manaCost && !canPayManaCost(player, manaCost)) {
    throw new Error(`${playerId} cannot pay the activation cost of ${def.name}`);
  }
  if (!colorAllowed(state, playerId, ability, instance)) {
    throw new Error(`${def.name} cannot make that colour in this deck`);
  }
  if (!sourceCountersAllow(ability, instance)) {
    throw new Error(`${def.name} cannot use that ability right now`);
  }
  // "Activate only if you control a Swamp." Checked before anything is paid,
  // and re-checked on every activation rather than remembered - the board this
  // asks about changes constantly.
  if (!controllerMeets(state, playerId, ability.activateOnlyIf)) {
    throw new Error(`${def.name}'s ability cannot be activated right now`);
  }
  if (ability.cost.payLife !== undefined && player.life < ability.cost.payLife) {
    // You may not pay life you do not have. Paying down to exactly 0 is legal
    // and loses the game to the usual state-based action - that is the real
    // rule, and it is why this is `<` rather than `<=`.
    throw new Error(`${playerId} cannot pay ${ability.cost.payLife} life`);
  }

  // Through `tapPermanent`, so City of Brass hurts its controller for the mana.
  if (ability.cost.tap) tapPermanent(state, instance);
  if (manaCost) payManaCost(player, manaCost);
  if (ability.cost.payLife !== undefined) {
    player.life -= ability.cost.payLife;
    log(state, `${playerId} pays ${ability.cost.payLife} life`);
  }
  /*
   * The sacrifice happens here, as part of the cost, and that ordering is the
   * whole card: a fetchland is in the graveyard before its search ever
   * resolves. An ability is independent of its source once activated, so
   * losing the permanent does not stop it - which is exactly why this must not
   * be written as part of the effect.
   */
  /*
   * Counters read *before* the sacrifice, because the ability that spends them
   * is the one that counts them - Twitching Doll. A moment later the permanent
   * is in a graveyard with its counters stripped, and the board could only
   * answer zero. This is the rules' own last-known-information, substituted
   * here rather than understood downstream. See `AmountContext.sourceCounters`.
   */
  // "Only once" - recorded as the cost is paid, so an ability that fizzles for
  // want of a target has still been used. That is the rule and it is also the
  // safe direction.
  if (ability.onlyOncePerGame) instance.abilitiesUsedThisGame.push(abilityIndex);
  const sourceCounters = instance.plusOneCounters + instance.otherCounters;
  if (ability.cost.sacrificeSelf) sacrificePermanent(state, instanceId);
  /*
   * "Sacrifice a Treasure" - paid here with the rest of the cost, so the
   * Treasure is gone before the ability resolves and the mana it could have made
   * is no longer available to pay for it.
   */
  if (ability.cost.sacrificeSubtype) {
    const victim = sacrificeCandidate(state, playerId, ability.cost.sacrificeSubtype);
    if (!victim) throw new Error(`${playerId} has no ${ability.cost.sacrificeSubtype} to sacrifice`);
    sacrificePermanent(state, victim);
  }
  /*
   * "Exile this card from your hand", "Discard this card" - paid here, with the
   * sacrifice, and for the same reason: the card is gone before the ability
   * resolves, and an ability is independent of its source once activated. A
   * Channel land is in the graveyard while its damage is still on the stack.
   */
  if (ability.cost.fromHand) {
    log(state, `${playerId} ${ability.cost.fromHand === "exile" ? "exiles" : "discards"} ${def.name}`);
    moveCard(state, instanceId, ability.cost.fromHand === "exile" ? "exile" : "graveyard");
  }

  /*
   * The targets are checked against the *chosen mode's* selector, before
   * anything is paid.
   *
   * An activated ability's targets went unchecked until now, which was invisible
   * while the pickers were the only callers: they only ever offer what
   * `legalTargetsFor` returns. Goblin Cratermaker is where it stops being
   * invisible, because its two bullets point at different things - "target
   * creature" and "target colorless nonland permanent" - and the mode is chosen
   * separately from the target. Nothing else in the engine lets an illegal
   * target through, and this is the same refusal in the same shape.
   */
  // Settled before anything is paid, so an ability activated with no mode is
  // refused rather than half-paid for.
  const effect = abilityEffect(ability, chosenMode);
  const chosenSelector = targetSelectorOf(effect);
  if (chosenSelector) {
    for (const target of targets) {
      if (!isValidTarget(state, chosenSelector, target, playerId, instanceId)) {
        throw new Error(`That is not a legal target for ${def.name}`);
      }
    }
  }
  const isManaAbility = effect.kind === "addMana" || effect.kind === "addManaCombination";
  if (isManaAbility) {
    if (ability.producesRestrictedMana && ability.effect.kind === "addMana") {
      /*
       * "...of the chosen type" - Cavern of Souls. The card names no type; the
       * permanent does. Resolved here, once, so the mana sitting in the pool
       * knows what it may pay for without anything having to find the land
       * again.
       */
      const restriction =
        ability.producesRestrictedMana.kind === "creature-of-chosen-type"
          ? { ...ability.producesRestrictedMana, creatureType: instance.chosenOnEntry?.creatureType }
          : ability.producesRestrictedMana;
      // Kept out of the ordinary pool entirely - see `Player.restrictedMana`.
      // Nothing that counts a player's mana can then spend it on the wrong thing.
      player.restrictedMana.push({
        color: ability.effect.color,
        amount: ability.effect.amount,
        restriction,
      });
    } else {
      applyEffect(state, playerId, instanceId, ability.effect, targets);
      /*
       * Path of Ancestry's rider, recorded beside the mana rather than instead
       * of it: the mana is already in the ordinary pool by the line above and
       * stays fully spendable. All this adds is a note of where it came from,
       * read when it is spent. See `ManaMark`.
       */
      /*
       * "Add one mana of any color. **Put a nest counter on this creature.**"
       *
       * Applied here rather than inside the effect, exactly where the painland
       * rider is and for the same reason: it belongs to the ability, not to
       * adding mana.
       */
      if (ability.addsOtherCounterToSelf) {
        instance.otherCounters += ability.addsOtherCounterToSelf;
      }
      if (ability.marksMana && ability.effect.kind === "addMana") {
        player.manaMarks.push({
          color: ability.effect.color,
          amount: ability.effect.amount,
          sourceInstanceId: instanceId,
          rider: ability.marksMana,
        });
      }
    }
    /*
     * "Add {B}. This land deals 1 damage to you."
     *
     * Applied here rather than inside the effect because it belongs to the
     * ability, not to adding mana - the same `addMana` effect on a Forest must
     * not hurt anybody. It lands after the mana, which is the printed order,
     * and it goes through the ordinary damage path so a prevention shield
     * covers it exactly as it would cover a burn spell.
     */
    if (ability.damageToController) {
      const dealt = damagePlayer(state, player, ability.damageToController, { sourceInstanceId: instanceId }).dealt;
      if (dealt > 0) log(state, `${def.name} deals ${dealt} damage to ${playerId}`);
    }
  } else {
    if (targets.length > 0 && !attemptWardPayments(state, playerId, targets)) {
      // Ward's cost went unpaid - the ability is countered (fizzles). The tap/mana cost already
      // paid to activate it is not refunded, matching the same rule as a countered spell.
      state.passesInSuccession = 0;
      return;
    }
    pushOntoStack(state, instanceId, playerId, resolveAmounts(effect, { x: 0, sourceCounters }), targets, false);
    state.passesInSuccession = 0;
  }
}
