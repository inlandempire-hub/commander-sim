import type {
  ActivatedAbility,
  BoardCondition,
  CardDefinition,
  Color,
  Amount,
  Countable,
  Effect,
  ReplacementEffect,
  TargetCount,
  TargetSelector,
  TriggerCondition,
  TriggeredAbility,
} from "@mtg-commander-sim/engine";
import { matchesWatchFor } from "@mtg-commander-sim/engine";
import { formatManaCost } from "./format.js";

/**
 * Renders a card's structured data back into readable rules text.
 *
 * The engine stores what a card *does* as a small typed DSL, never as prose -
 * that's what lets it actually enforce the rules. But a deck builder has to
 * show a human what they're adding, so this is the inverse mapping: DSL in,
 * something that reads like the printed card out.
 *
 * It is deliberately not a claim to be Scryfall's oracle text. It describes
 * exactly what this engine will do, which is the more useful thing when
 * you're picking cards for a deck the engine has to run.
 */

type Definitions = Record<string, CardDefinition>;

/** "target creature", "any target", "target land" - the phrase an effect uses for what it points at. */
export function describeTarget(selector: TargetSelector): string {
  switch (selector.kind) {
    case "any-target":
      return "any target";
    case "creature":
      // "target Insect, Rat, Spider, or Squirrel" - the printed wording lists
      // the types instead of saying creature at all.
      return selector.subtypes?.length
        ? `target ${listOr(selector.subtypes)}`
        : "target creature";
    case "player":
      return `${countPrefix(selector.count)}target player${
        selector.count && selector.count.max !== "x" && selector.count.max > 1 ? "s" : ""
      }`;
    case "opponent-of-controller":
      return "target opponent";
    case "spell":
      return "target spell";
    case "permanent": {
      // "target noncreature artifact or noncreature enchantment" - the
      // qualifier goes on each noun, which is how the card prints it.
      const prefix = selector.noncreature ? "noncreature " : "";
      // No type list means "target permanent" - Assassin's Trophy, which names
      // no type because it hits every one of them.
      const noun = selector.cardTypes
        ? listOr(selector.cardTypes.map((t) => `${prefix}${t.toLowerCase()}`))
        : `${prefix}permanent`;
      const whose = selector.controlledBy === "opponent" ? " an opponent controls" : "";
      return `${countPrefix(selector.count)}target ${noun}${whose}`;
    }
    case "card-in-your-graveyard": {
      const noun = selector.cardType
        ? `${selector.cardType.toLowerCase()} card in your graveyard`
        : "card in your graveyard";
      // "with mana value X or less" - the cap is a phrase, not a number: it is
      // read when the ability goes on the stack, not when the card was written.
      const cap = selector.maxManaValue !== undefined ? " with mana value X or less" : "";
      return `${countPrefix(selector.count)}target ${noun}${cap}`;
    }
    case "card-in-your-exile":
      return selector.cardType
        ? `target ${selector.cardType.toLowerCase()} card you own in exile`
        : "target card you own in exile";
  }
}

/**
 * "up to X ", "two " - the words a card puts in front of "target".
 *
 * Empty for the ordinary single target, which is every card in the pool but
 * three, so nothing else reads any differently for this existing.
 */
function countPrefix(count: TargetCount | undefined): string {
  if (!count) return "";
  // "up to **one** target", not "up to a target". `countWord(1)` is "a", which
  // is the right article in front of a noun ("create a token") and the wrong
  // word after "up to" - the cards spell this one out.
  if (count.min === 0) {
    if (count.max === "x") return "up to X ";
    return count.max === 1 ? "up to one " : `up to ${countWord(count.max)} `;
  }
  if (count.max === "x") return "X ";
  return count.min === count.max && count.max > 1 ? `${countWord(count.max)} ` : "";
}

/** "a Swamp or a Forest", "Insect, Rat, Spider, or Squirrel" - the printed list form. */
function listOr(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} or ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, or ${items[items.length - 1]}`;
}

/** Capitalises a sentence that may start with a target phrase ("target creature gets..."). */
function sentence(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * A whole ability handed to another permanent, in quotes - and the full stop
 * goes *inside* them, which is how the cards print it and the only way the
 * sentence ends once rather than twice.
 */
function quoted(text: string): string {
  return `"${lowerFirst(finish(text))}"`;
}

/**
 * Ends a sentence, unless it already ends in one - a line finishing with a
 * quoted ability has its full stop inside the quotes and must not collect
 * another outside them.
 */
function finish(text: string): string {
  return /[.!?]"?$/.test(text) ? text : `${text}.`;
}

function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return count === 1 ? singular : pluralForm;
}

function signed(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

/**
 * A power/toughness modifier, which may still be X on a card in hand.
 *
 * The Meathook Massacre's panel has to read "-X/-X" and not a number: the panel
 * is what a player reads *before* deciding what to cast it for, so printing a
 * value there would be printing a decision they have not made.
 */
function signedAmount(amount: Amount): string {
  if (typeof amount === "number") return signed(amount);
  // `event-amount` is "that many", which no card puts in a power/toughness
  // slot - it only ever counts tokens. Rendered rather than thrown, because
  // the panel's job is to describe whatever it is handed.
  if (amount.kind === "event-amount") return "that many";
  // A counted amount never appears in a power/toughness slot on any card in the
  // pool - Return of the Wildspeaker's +3/+3 is a plain number, and the count
  // is on its other mode. Rendered rather than thrown, like the case above.
  if (amount.kind === "count") return describeCount(amount.of);
  // Likewise never in a power/toughness slot: the sacrificed creature's power
  // counts tokens on Tend the Pests and cards on Disciple of Freyalise.
  if (amount.kind === "sacrificed-power") return "that creature's power";
  return amount.negate ? "-X" : "+X";
}

/**
 * An `Amount` in a counting slot - "create **X** tokens", "mill **three**".
 *
 * Separate from `signedAmount` because these read as quantities rather than as
 * bonuses: "+X" is right on a pump and wrong in front of a noun.
 */
function countAmount(amount: Amount): string {
  if (typeof amount === "number") return countWord(amount);
  if (amount.kind === "event-amount") return "that many";
  if (amount.kind === "count") return describeCount(amount.of);
  if (amount.kind === "sacrificed-power") return "X";
  // "Create **twice X**" - Pest Infestation, whose {X}{X} cost charges X twice
  // and whose token count is doubled again on top. Printing a plain "X" here
  // halves the card in the panel you decide what to cast it for.
  if (amount.multiply === 2) return "twice X";
  if (amount.multiply !== undefined && amount.multiply !== 1) return `${amount.multiply} times X`;
  return "X";
}

/**
 * The noun after "for each" - "for each **counter on this creature**".
 *
 * A second phrasing of `describeCount` rather than a reuse of it, because the
 * two slots genuinely read differently: "draw cards equal to **the number of**
 * creature cards in your graveyard" and "for each **creature card in your
 * graveyard**" are the same count and neither sentence accepts the other's
 * wording. Returns undefined for the counts no card puts after "for each",
 * which is the caller's signal to use the "equal to" form instead.
 */
function perThing(of: Countable): string | undefined {
  switch (of.what) {
    case "creatures":
      return of.withCounter
        ? `${of.excludeSubtype ? `non-${of.excludeSubtype} ` : ""}creature you control with a +1/+1 counter on it`
        : `${of.excludeSubtype ? `non-${of.excludeSubtype} ` : ""}creature you control`;
    case "counters-placed-this-turn":
      return "+1/+1 counter you've put on creatures under your control this turn";
    case "counters-on-source":
      return "counter on this creature";
    case "creature-cards-in-your-graveyard":
      return "creature card in your graveyard";
    case "creatures-attacking-you":
      return "creature attacking you";
    case "opponents":
      return "opponent";
    case "life-gained-this-turn":
      return "life you gained this turn";
    // "The greatest power among creatures you control" is a single number, not
    // a thing there can be several of, so it never follows "for each".
    case "greatest-power":
      return undefined;
  }
}

/** Whether an `Amount` is a plain 1, for the singular/plural decisions below. */
function isOne(amount: Amount): boolean {
  return amount === 1;
}

/**
 * An `Amount` in a slot that prints a figure rather than a word - "you gain
 * **1** life", where the cards use the numeral and "you gain a life" would be
 * wrong.
 *
 * The third of these because the three slots really do read differently:
 * `signedAmount` for a bonus, `countAmount` in front of a noun ("**a** +1/+1
 * counter"), and this where the number stands alone.
 */
function plainAmount(amount: Amount): string {
  if (typeof amount === "number") return String(amount);
  if (amount.kind === "event-amount") return "that much";
  if (amount.kind === "count") return describeCount(amount.of);
  if (amount.kind === "sacrificed-power") return "X";
  return "X";
}

export function describeEffect(effect: Effect, definitions: Definitions = {}): string {
  switch (effect.kind) {
    case "damage":
      return `Deal ${effect.amount} damage to ${describeTarget(effect.target)}.`;
    case "draw": {
      // "Draw a card for each creature you control with a +1/+1 counter on it",
      // and the plain numeric printings. The dynamic form reads as a phrase
      // rather than a number, because a number is exactly what it is not.
      if (typeof effect.amount !== "number") {
        // "Draw X cards" - Disciple of Freyalise, whose X is the power of the
        // creature you gave up. "That many" would be right for an event's
        // number and is wrong here: nothing has been counted yet.
        if (effect.amount.kind === "sacrificed-power") return "Draw X cards.";
        if (effect.amount.kind !== "count") return "Draw that many cards.";
        // "Draw cards equal to the greatest power ..." reads as a quantity;
        // "draw a card for each creature ..." reads as a repetition. Different
        // sentences, and both are printed on real cards.
        return effect.amount.of.what === "greatest-power"
          ? `Draw cards equal to ${describeCount(effect.amount.of)}.`
          : `Draw a card for each ${describeCount(effect.amount.of)}.`;
      }
      // "Draw a card", not "Draw 1 card" - no printed card says the latter.
      return effect.amount === 1 ? "Draw a card." : `Draw ${effect.amount} cards.`;
    }
    case "addMana":
      return `Add ${`{${effect.color}}`.repeat(effect.amount)}.`;
    case "addManaCombination":
      return `Add ${effect.mana
        .map((part) => `{${part.color}}`.repeat(part.amount))
        .join("")}.`;
    case "gainLife":
      /*
       * Through `countAmount` rather than interpolated straight in. The amount
       * is an `Amount` now - Disciple of Freyalise gains "X life, where X is
       * that creature's power" - and a template string would happily print
       * "You gain [object Object] life", which TypeScript does not object to.
       */
      return `You gain ${plainAmount(effect.amount)} life.`;
    case "discard":
      return `Each opponent discards ${countWord(effect.amount)} ${plural(effect.amount, "card")}.`;
    case "surveil":
      return `Surveil ${effect.amount}.`;
    case "payLifeToEnterUntapped":
      // Never written on a fixture - built by the engine as the land arrives -
      // but the panel can be asked to describe anything, so it gets a sentence
      // rather than falling through to the catch-all.
      return `Pay ${effect.life} life.`;
    case "regenerateAll":
      return "Regenerate each creature you control.";
    case "attach":
      // The equip ability's own text is rendered from `equipCost` beside the
      // rest of the card; this is the effect it puts on the stack.
      return `Attach to ${describeTarget(effect.target)}.`;
    case "preventCombatDamage":
      return effect.exceptSubtype
        ? `Prevent all combat damage that would be dealt this turn by non-${effect.exceptSubtype} creatures.`
        : "Prevent all combat damage that would be dealt this turn.";
    case "exileGraveyard":
      return sentence(`Exile ${describeTarget(effect.target)}'s graveyard.`);
    case "ifTargetWas":
      // "If a creature card is exiled this way, ..." - the reflexive half, and
      // the sentence the card actually prints for it.
      return `If a ${effect.cardType.toLowerCase()} card is exiled this way, ${
        describeEffect(effect.then, definitions).charAt(0).toLowerCase()
      }${describeEffect(effect.then, definitions).slice(1)}`;
    case "preventDamage":
      return `Prevent the next ${effect.amount} damage that would be dealt to ${describeTarget(
        effect.target,
      )} this turn.`;
    case "addCounter": {
      // Same optional-target convention as `pump`: named on Duskshell Crawler,
      // unnamed on "{cost}: put a +1/+1 counter on this creature".
      const who = effect.target ? describeTarget(effect.target) : "this creature";
      // "a +1/+1 counter", not "1 +1/+1 counter" - no printed card says the latter.
      // The Ozolith's "those counters" is not a number at all, and reads as one
      // phrase rather than a quantity in front of a noun.
      if (typeof effect.amount !== "number" && effect.amount.kind === "event-amount") {
        return sentence(`Put those counters on ${who}.`);
      }
      return sentence(
        `Put ${countAmount(effect.amount)} +1/+1 ${isOne(effect.amount) ? "counter" : "counters"} on ${who}.`,
      );
    }
    case "mayPay": {
      const price = [
        effect.cost.mana ? formatManaCost(effect.cost.mana) : null,
        effect.cost.life ? `${effect.cost.life} life` : null,
      ]
        .filter(Boolean)
        .join(" and ");
      const yes = lowerFirst(describeEffect(effect.then, definitions));
      // "If you didn't ..." is half of Springheart Nantuko, so it prints.
      const no = effect.otherwise
        ? ` If you didn't, ${lowerFirst(describeEffect(effect.otherwise, definitions))}`
        : "";
      return `You may pay ${price}. If you do, ${yes}${no}`;
    }
    case "becomePrepared":
      return "This creature becomes prepared.";
    case "conditional":
      // "If you control six or more lands, ... instead." The branch reads as
      // the card prints it, with the condition first.
      return `If ${describeCondition(effect.condition)}, ${lowerFirst(
        describeEffect(effect.then, definitions),
      )}${
        effect.otherwise
          ? ` Otherwise, ${lowerFirst(describeEffect(effect.otherwise, definitions))}`
          : ""
      }`;
    case "createCopyToken":
      return effect.of === "self"
        ? "Create a token that's a copy of this creature."
        : "Create a token that's a copy of the creature this is attached to.";
    case "addOtherCounter":
      return `Put ${countWord(effect.amount)} counter${effect.amount === 1 ? "" : "s"} on this creature.`;
    case "millThenMayTake": {
      const price = [
        effect.cost.mana ? formatManaCost(effect.cost.mana) : null,
        effect.cost.life ? `${effect.cost.life} life` : null,
      ]
        .filter(Boolean)
        .join(" and ");
      return `Mill ${countWord(effect.amount)} cards. Then you may pay ${price}. If you do, put a card from among those cards into your hand.`;
    }
    case "castFreeFromHand":
      return `You may cast a spell with mana value ${effect.maxManaValue} or less from your hand without paying its mana cost.`;
    case "payLifeDrawThatMany":
      return "You may pay any amount of life. If you do, draw that many cards.";
    case "offerSacrificeToOpponents":
      return `Each opponent may sacrifice a permanent of their choice that shares a card type with it. For each opponent who doesn't, ${lowerFirst(
        describeEffect(effect.ifDeclined, definitions),
      )}`;
    case "repeatWhileMilledMatches":
      return `${describeEffect(effect.body, definitions)} If ${article(effect.subtype)} ${effect.subtype} card was milled this way, put a loyalty counter on this permanent and repeat this process.`;
    case "moveAllCounters":
      return sentence(`Move all counters from this permanent onto ${describeTarget(effect.target)}.`);
    case "mill":
      return `Mill ${countAmount(effect.amount)} ${isOne(effect.amount) ? "card" : "cards"}.`;
    case "exileTop":
      return `Exile the top ${countAmount(effect.amount)} ${isOne(effect.amount) ? "card" : "cards"} of your library.`;
    case "extraTurn":
      return `Target player takes ${effect.count === 1 ? "an extra turn" : `${effect.count} extra turns`} after this one.`;
    case "putLandFromHand":
      return "You may put a land card from your hand onto the battlefield.";
    case "windfall":
      return "Each player discards their hand, then draws cards equal to the greatest number discarded this way.";
    case "untap":
      return `Untap ${describeTarget(effect.target)}.`;
    case "winGame":
      return "You win the game.";
    case "lookAtHand":
      return `Look at ${describeTarget(effect.target)}'s hand.`;
    case "becomeCopy":
      return `This creature becomes a copy of ${describeTarget(effect.target)}.`;
    case "counterAll":
      return `Counter all spells and abilities your opponents control.${
        effect.tokenPerCountered ? " Create a 1/1 blue and black Faerie creature token with flying for each one countered this way." : ""
      }`;
    case "returnToHand":
      return `Return ${describeTarget(effect.target)} to ${
        effect.target.kind === "permanent" && effect.target.count && effect.target.count.max !== 1
          ? "their owners' hands"
          : "its owner's hand"
      }.`;
    case "destroyAll": {
      const noun = effect.cardTypes.map((t) => `${t.toLowerCase()}s`).join(" and ");
      const scope = effect.maxManaValue !== undefined ? ` with mana value ${effect.maxManaValue} or less` : "";
      const nonland = effect.nonland ? "nonland " : "";
      const draw = effect.thenDraw ? " Draw a card for each permanent destroyed this way." : "";
      const mana = effect.manaPerDestroyed
        ? ` Add ${effect.manaPerDestroyed.map((c) => `{${c}}`).join(" or ")} for each permanent destroyed this way.`
        : "";
      return `Destroy ${effect.maxManaValue !== undefined ? "each" : "all"} ${nonland}${noun}${scope}.${draw}${mana}`;
    }
    case "eachSacrifices": {
      const who = effect.who === "each-opponent" ? "Each opponent" : "Each player";
      const noun = (effect.types ?? ["Creature"]).map((t) => t.toLowerCase()).join(" or ");
      if (effect.greatestManaValue) {
        return `${who} sacrifices a ${noun} with the greatest mana value among ${noun}s they control.`;
      }
      const n = effect.count ?? 1;
      return `${who} sacrifices ${n === 1 ? `a ${noun}` : `${n} ${noun}s`}.`;
    }
    case "atNextUpkeep": {
      const who = effect.who === "each-opponent" ? "its controller" : "you";
      return `At the beginning of the next turn's upkeep, ${who} ${describeEffect(effect.effect, definitions)
        .replace(/\.$/, "")
        .replace(/^You /, "")
        .replace(/^Draw/, "draw")}.`;
    }
    case "scry":
      return `Scry ${effect.amount}.`;
    case "lookAndArrange": {
      const look = `Look at the top ${effect.amount} ${effect.amount === 1 ? "card" : "cards"} of your library, then put them back in any order.`;
      return effect.mayShuffle ? `${look} You may shuffle.` : look;
    }
    case "putFromHandOnTop":
      return `Put ${effect.count} ${effect.count === 1 ? "card" : "cards"} from your hand on top of your library in any order.`;
    case "sacrificeChosen": {
      const what = effect.excludeSelf ? "another creature" : "a creature";
      const head = effect.optional ? `You may sacrifice ${what}.` : sentence(`Sacrifice ${what}.`);
      if (!effect.then) return head;
      // "If you do, ..." - the printed wording for the half that only happens
      // when the sacrifice actually did.
      const rest = describeEffect(effect.then, definitions);
      /*
       * "...where X is that creature's power." Printed on the card and worth
       * carrying: without it the panel says X twice and never says what it is,
       * which is the one thing a player reading the card needs to know.
       */
      const definesX = JSON.stringify(effect.then).includes('"sacrificed-power"');
      const tail = definesX ? " Where X is that creature's power." : "";
      return `${head.slice(0, -1)}. If you do, ${rest.charAt(0).toLowerCase()}${rest.slice(1)}${tail}`;
    }
    case "addCounterToEachOther": {
      // "each other Hero you control" vs "each Pest, Bat, Insect, Snake, and
      // Spider you control" - the "other" is dropped when the source counts
      // itself, because that is the word the real cards use to mean it.
      const who = effect.subtypes?.length ? effect.subtypes.join(", ") : "creature";
      return `Put ${effect.amount} +1/+1 ${plural(effect.amount, "counter")} on each${
        effect.includesSelf ? "" : " other"
      } ${who} you control.`;
    }
    case "doublePower":
      return "Double this creature's power until end of turn.";
    case "destroy":
      return `Destroy ${describeTarget(effect.target)}.`;
    case "exile":
      return `Exile ${describeTarget(effect.target)}.`;
    case "regenerate":
      return `Regenerate ${describeTarget(effect.target)}.`;
    case "createToken": {
      const token = definitions[effect.tokenDefinitionId];
      if (!token) return `Create ${effect.count} ${effect.tokenDefinitionId}.`;
      const name = tokenName(token);
      const many = name.replace(" token", " tokens");
      /*
       * Three different unknown counts, and they were all printing as "that
       * many" - a phrase that only makes sense when a preceding sentence said
       * how many. On Springleaf Parade and Iridescent Hornbeetle there was no
       * preceding sentence at all, so the panel simply did not say how many
       * tokens the card made.
       */
      if (typeof effect.count !== "number") {
        // "Create **that many**" is right for exactly one shape: Hornet Nest,
        // where the sentence before it named the damage.
        if (effect.count.kind === "event-amount") return `Create that many ${many}.`;
        if (effect.count.kind === "count") {
          const per = perThing(effect.count.of);
          // "Create **a** 1/1 ... for each" - `tokenName` returns the token
          // without an article, because the numeric branch below supplies one.
          return per
            ? `Create a ${name} for each ${per}.`
            : `Create ${many} equal to ${describeCount(effect.count.of)}.`;
        }
        return `Create ${countAmount(effect.count)} ${many}.`;
      }
      // "Create a 1/1 black Snake creature token with deathtouch." / "Create
      // four 1/1 green Insect creature tokens with flying and deathtouch."
      // `countWord(1)` is "a", which is the article the cards use rather than
      // a number - "create 1 Snake token" is not a phrase any card prints.
      return effect.count === 1
        ? `Create ${countWord(1)} ${name}.`
        : `Create ${countWord(effect.count)} ${name.replace(" token", " tokens")}.`;
    }
    case "pump": {
      const who = effect.target ? describeTarget(effect.target) : "this creature";
      // Revitalizing Repast pumps nothing and grants everything, so a +0/+0
      // is dropped for the same reason `pumpAll` drops it.
      const parts: string[] = [];
      if (effect.power !== 0 || effect.toughness !== 0) {
        parts.push(`gets ${signed(effect.power)}/${signed(effect.toughness)}`);
      }
      if (effect.grants?.length) {
        parts.push(`gains ${listAnd(effect.grants.map((k) => k.toLowerCase()))}`);
      }
      return sentence(`${who} ${parts.join(" and ")} until end of turn.`);
    }
    case "pumpAll": {
      const noun = (effect.appliesTo ?? "creatures") === "permanents" ? "Permanents" : "Creatures";
      const who = effect.scope === "controller" ? `${noun} you control` : `All ${noun.toLowerCase()}`;
      /*
       * Heroic Intervention is +0/+0 and is entirely about the keywords, so
       * printing "get +0/+0 and gain hexproof" would bury the card under a
       * number that means nothing. A pump of zero is dropped from the sentence.
       */
      const pumps = effect.power !== 0 || effect.toughness !== 0;
      const parts: string[] = [];
      if (pumps) parts.push(`get ${signedAmount(effect.power)}/${signedAmount(effect.toughness)}`);
      /*
       * Keywords and whole triggered abilities are one "gain" between them, as
       * the cards write it: "gain menace and 'whenever this creature attacks,
       * you gain 1 life'", not "gain menace and gain '...'".
       *
       * The granted ability was missing entirely (see `grantsTriggers` and
       * `effectiveTriggers` - the engine has always granted it), which left
       * Root Manipulation reading as a plain pump-and-menace trick.
       */
      const gains = [
        ...(effect.grants ?? []).map((k) => k.toLowerCase()),
        ...(effect.grantsTriggers ?? []).map((t) => quoted(describeGrantedTrigger(t, definitions))),
      ];
      if (gains.length > 0) parts.push(`gain ${listAnd(gains)}`);
      // "Until end of turn, creatures you control get ..." is how Root
      // Manipulation prints it, and putting the duration first is what stops a
      // sentence that ends in a quoted ability from trailing off into
      // "...you gain 1 life." until end of turn."
      return gains.some((g) => g.startsWith('"'))
        ? finish(`Until end of turn, ${lowerFirst(who)} ${parts.join(" and ")}`)
        : `${who} ${parts.join(" and ")} until end of turn.`;
    }
    case "loseLife":
      // Loss, not damage, and the panel says so - a player who reads "deals 1
      // damage to each opponent" will expect prevention and lifelink to matter.
      return effect.who === "target" && effect.target
        ? sentence(`${describeTarget(effect.target)} loses ${effect.amount} life.`)
        : effect.who === "self"
          ? `You lose ${effect.amount} life.`
          : `Each opponent loses ${effect.amount} life.`;
    case "removeCounter":
      return `Remove up to ${effect.amount} counters from ${describeTarget(effect.target)}.`;
    case "counter": {
      const unless = effect.unlessPays
        ? ` unless its controller pays ${formatManaCost(effect.unlessPays)}`
        : "";
      return `Counter ${describeTarget(effect.target)}${unless}.`;
    }
    case "returnFromGraveyard":
    case "returnFromExile": {
      const where = effect.destination === "hand" ? "to your hand" : "to the battlefield";
      return `Return ${describeTarget(effect.target)} ${where}.`;
    }
    case "modal": {
      // The printed wording: "Choose one - A; or B."
      return `Choose one - ${effect.modes.map((mode) => mode.label).join("; or ")}.`;
    }
    case "sacrifice":
      // The noun is filled in by describeCard, which knows the card; on its own
      // this effect has no idea what type it sits on.
      return "Sacrifice it.";
    case "sequence":
      /*
       * Joined rather than bulleted, because the card prints it as prose:
       * "sacrifice it. When you do, search your library ... and you gain 1
       * life." Each step already ends in a full stop.
       */
      return effect.effects.map((step) => describeEffect(step, definitions)).join(" ");
    case "searchLibrary": {
      /**
       * "Search your library" against "its controller may search their
       * library". The second is a rider on somebody else's misfortune, and a
       * panel that printed it as "your library" would read as though
       * Assassin's Trophy ramped the caster.
       */
      const whoSearches = (e: Extract<Effect, { kind: "searchLibrary" }>): string =>
        (e.who ?? "controller") === "controller"
          ? "Search your library"
          : "Its controller may search their library";
      /*
       * The subtypes were dropped here, so every fetchland read "a land card" -
       * an unrestricted tutor rather than one that can only find two of the
       * five basic types.
       *
       * "basic" and the subtypes are not the same restriction and both are
       * printed: a fetchland asks for "a Swamp or Mountain card" and can take a
       * dual, where Riveteers Overlook asks for "a basic Swamp, Mountain, or
       * Forest card" and cannot.
       */
      const basic = effect.basicLandOnly ? "basic " : "";
      const what = effect.subtypes?.length
        ? `a ${basic}${listOr(effect.subtypes)} card`
        : effect.basicLandOnly
          ? "a basic land card"
          : effect.cardType
            ? `a ${effect.cardType.toLowerCase()} card`
            : "a card";
      /*
       * "then shuffle and put that card on top" is printed in that order for a
       * reason and reads back in that order too - the card goes on top *after*
       * the shuffle, so you are guaranteed to draw it. Writing it as "put it on
       * top, then shuffle" would describe a card that does nothing.
       */
      if (effect.destination === "library-top") {
        return `${whoSearches(effect)} for ${what}, then shuffle and put that card on top.`;
      }
      const where =
        effect.destination === "hand"
          ? "into your hand"
          : `onto the battlefield${effect.tapped ? " tapped" : ""}`;
      return `${whoSearches(effect)} for ${what}, put it ${where}, then shuffle.`;
    }
    // A best-effort renderer: any effect with no explicit clause contributes
    // nothing rather than breaking the sentence. Every effect the pool actually
    // uses is handled above (the "never renders an empty clause" test guards it).
    default:
      return "";
  }
}

/** "2/2 white Cat" reads better on a token than its full type line does. */
/**
 * "1/1 green Insect creature token with flying and deathtouch" - the whole
 * printed phrase.
 *
 * Colour and keywords are not decoration here. Two cards in the pool make a
 * 1/1 green Insect and a 1/1 green Insect with flying and deathtouch, and
 * "1/1 Insect" describes both - so the panel would show the same line for two
 * genuinely different tokens.
 */
/**
 * The whole noun phrase a card prints for a token it makes - "a 1/1 black and
 * green Pest creature token with 'When this token dies, you gain 1 life.'"
 *
 * Exported because it is the only complete description of a token there is.
 * `describeCard` renders rules text alone, which is empty for a vanilla token
 * and identical for every vanilla token - so it cannot answer "which token does
 * this card make", and that is the question the panel is asked.
 */
export function tokenName(token: CardDefinition): string {
  const stats = token.power !== undefined ? `${token.power}/${token.toughness} ` : "";
  const colors = (token.colorIdentity ?? []).map(colorWord).join(" and ");
  const body = `${stats}${colors ? `${colors} ` : ""}${token.name} creature`;
  const keywords = token.keywords ?? [];
  /*
   * A token with rules text of its own is quoted, exactly as the card prints
   * it: "a 1/1 black and green Pest creature token with 'When this token dies,
   * you gain 1 life.'"
   *
   * Not decoration. Blight Mound and Send in the Pest both make a 1/1 black and
   * green Pest, and the *only* difference between them is that quoted line -
   * one pays out when the token dies, the other when it attacks. Without this
   * the panel prints the same sentence for both cards.
   */
  const printed = (token.triggeredAbilities ?? [])
    .map((trigger) => describeTrigger(trigger, {}, token))
    .join(" ");
  const withClause = keywords.length > 0 ? ` with ${listAnd(keywords.map((k) => k.toLowerCase()))}` : "";
  if (printed) {
    const joiner = withClause ? `${withClause} and` : " with";
    return `${body} token${joiner} "${printed}"`;
  }
  return `${body} token${withClause}`;
}

/** "flying and deathtouch", "flying, deathtouch, and trample". */
function listAnd(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

/**
 * What a counted amount counts, in the card's own words.
 *
 * Each phrase is lifted from the printed card rather than generated from the
 * fields - "the greatest power among non-Human creatures you control" is not
 * something a generic renderer would ever assemble, and a panel that said
 * something close-but-not-quite would be worse than one that said nothing.
 */
function describeCount(of: Countable): string {
  switch (of.what) {
    case "creatures": {
      const noun = of.excludeSubtype ? `non-${of.excludeSubtype} creature` : "creature";
      return of.withCounter
        ? `${noun} you control with a +1/+1 counter on it`
        : `${noun} you control`;
    }
    case "greatest-power":
      return of.excludeSubtype
        ? `the greatest power among non-${of.excludeSubtype} creatures you control`
        : "the greatest power among creatures you control";
    case "counters-placed-this-turn":
      return "+1/+1 counter you've put on creatures under your control this turn";
    case "creature-cards-in-your-graveyard":
      return "the number of creature cards in your graveyard";
    case "counters-on-source":
      return "the number of counters on this creature";
    case "life-gained-this-turn":
      return "the amount of life you gained this turn";
    case "opponents":
      return "each opponent";
    case "creatures-attacking-you":
      return "creature attacking you";
    case "half-library-round-up":
      return "half the number of cards in their library, rounded up";
    case "half-life-round-up":
      return "half their life, rounded up";
  }
}

/** "a", "two", "four" - cards spell small numbers out. */
function countWord(n: number): string {
  return ["zero", "a", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"][n] ?? String(n);
}

/** "creature", "Aura", "permanent" - what a watcher is looking out for. */
function watchedNoun(watchFor: TriggeredAbility["watchFor"]): string {
  // A list of types is only ever written on a spell trigger, which uses
  // `watchedSpell` instead - but the field allows one, so this reads it rather
  // than printing "[object Object]" the day a permanent trigger names two.
  const types = watchFor?.type;
  const typeNoun = Array.isArray(types)
    ? types.map((t) => t.toLowerCase()).join(" or ")
    : types?.toLowerCase();
  // A list of subtypes is printed as the card prints it - "an Insect, Leech,
  // Slug, or Worm" - for the same reason a list of types is: anything else
  // reads as "[object Object]" or silently drops three of the four.
  const subtypes = watchFor?.subtype;
  const subtypeNoun = Array.isArray(subtypes) ? listOr(subtypes) : subtypes;
  const base = subtypeNoun ?? typeNoun ?? "permanent";
  // "nontoken creature" is printed as one noun phrase, so it belongs here
  // rather than as a clause tacked on the end.
  return watchFor?.nontoken ? `nontoken ${base}` : base;
}

/** Who is doing the casting, for a `spell-cast` trigger. */
function castSubject(ability: TriggeredAbility): string {
  return ability.watchFor?.controlledBy === "opponent" ? "an opponent" : "a player";
}

/** "an instant or sorcery spell" - the spell a `spell-cast` trigger watches for. */
function watchedSpell(watchFor: TriggeredAbility["watchFor"]): string {
  const types = watchFor?.type;
  if (!types) return "a spell";
  const list = Array.isArray(types) ? types : [types];
  return `an ${list.map((t) => t.toLowerCase()).join(" or ")} spell`;
}

/**
 * A static buff in the card's own words, keywords and restriction included.
 *
 * This used to print "Other <subtype>s you control get +N/+N" and nothing else,
 * which was true of every card in the pool until three of them started granting
 * keywords and narrowing who they reach. A panel that silently drops "and have
 * menace" is worse than one that says nothing: it reads as a complete card.
 */
function describeStaticBuff(
  buff: NonNullable<CardDefinition["staticBuff"]>,
  self: CardDefinition,
  definitions: Definitions,
): string {
  /*
   * An Equipment's and an Aura's buff reach exactly one permanent, and the
   * cards say so in their own words: "equipped creature", "enchanted creature".
   *
   * `staticBuff` is reused for both because it is the same kind of continuous
   * effect narrowed to one permanent - see `buffApplies`, which checks
   * `attachedTo` and gets this right. Only the panel had it wrong, and wrong in
   * the worst direction: Skullclamp read "other creatures you control get
   * +1/-1", which is a board wipe of your own 1-toughness creatures rather than
   * a card you would ever equip.
   */
  const attaches = self.equipCost ? "Equipped creature" : self.bestowCost ? "Enchanted creature" : undefined;
  if (attaches) {
    const parts: string[] = [];
    if (buff.power !== 0 || buff.toughness !== 0) {
      parts.push(`gets ${signed(buff.power)}/${signed(buff.toughness)}`);
    }
    const has = [
      ...(buff.grants ?? []).map((k) => k.toLowerCase()),
      ...(buff.grantsAbilities?.length ? [grantedAbilityList(buff.grantsAbilities, definitions, self)] : []),
    ];
    if (has.length > 0) parts.push(`has ${listAnd(has)}`);
    return sentence(finish(`${attaches} ${parts.join(" and ")}`));
  }

  const noun = buff.subtype ? `${buff.subtype}s` : "creatures";
  // "Attacking Pests you control", "Each creature you control with a +1/+1
  // counter on it" - the restriction is part of the subject, not a trailing
  // clause, which is how the cards print it.
  // "Each creature ..." is singular and takes "gets"/"has"; every other form
  // here is plural and takes "get"/"have". Printed as one sentence either way,
  // so the verb has to agree or the panel reads as broken English.
  const singular = buff.restriction === "with-counter";
  const subject =
    buff.restriction === "attacking"
      ? `Attacking ${noun} you control`
      : singular
        ? `Each ${buff.subtype ?? "creature"} you control with a +1/+1 counter on it`
        : // "Creature **tokens** you control" - Springleaf Parade. A card that
          // only reaches tokens says so, and "other" is not part of that
          // phrasing on any card in the pool.
          buff.tokensOnly
          ? `${buff.subtype ? `${buff.subtype} ` : "Creature "}tokens you control`
          : `${buff.includesSelf ? "" : "Other "}${noun} you control`;

  const parts: string[] = [];
  if (buff.power !== 0 || buff.toughness !== 0) {
    parts.push(`${singular ? "gets" : "get"} ${signed(buff.power)}/${signed(buff.toughness)}`);
  }
  if (buff.grants?.length) {
    parts.push(`${singular ? "has" : "have"} ${listAnd(buff.grants.map((k) => k.toLowerCase()))}`);
  }
  /*
   * A granted activated ability, printed in quotes as the cards print it.
   *
   * Without this, Springleaf Parade's whole static line rendered as "Other
   * creatures you control ." - a subject, a space and a full stop, because the
   * buff is +0/+0 and grants no keywords. An empty sentence is the one output
   * worse than no sentence: it reads as a card whose text failed to load.
   */
  if (buff.grantsAbilities?.length) {
    parts.push(`${singular ? "has" : "have"} ${grantedAbilityList(buff.grantsAbilities, definitions, self)}`);
  }
  return sentence(finish(`${subject} ${parts.join(" and ")}`));
}

/**
 * Granted activated abilities, quoted - '"{T}: Add one mana of any colour"'.
 *
 * The five halves of an "any colour" ability are held separately by the engine
 * (see `colorFrom`), so a card that hands out one prints as five. They are
 * folded back into a single quoted line here for the same reason
 * `describeActivated` says "any colour in your commander's colour identity"
 * rather than listing five: the card prints one ability and the panel is meant
 * to look like the card.
 */
function grantedAbilityList(
  abilities: NonNullable<NonNullable<CardDefinition["staticBuff"]>["grantsAbilities"]>,
  definitions: Definitions,
  self: CardDefinition,
): string {
  const rendered = foldAnyColour(abilities.map((ability) => describeActivated(ability, definitions, self)));
  return listAnd(rendered.map((line) => `"${finish(line)}"`));
}

/**
 * Folds the five halves of an "add one mana of any colour" ability back into
 * the one line the card prints.
 *
 * The engine holds that ability as five, one per colour, because each is
 * separately legal or not (see `colorFrom`). Printed as five it takes over the
 * panel: Path of Ancestry read as five near-identical lines, each repeating the
 * whole scry rider, for a card whose text is two sentences.
 *
 * Matched by rendering rather than by field, so any rider the five carry - the
 * scry, Twitching Doll's counter, the spend restriction - has to be identical
 * across all five before they are folded. Five abilities that differ in
 * anything but their colour stay five lines.
 */
function foldAnyColour(lines: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const five = lines.slice(i, i + 5);
    const shapes = new Set(five.map((line) => line.replace(/Add \{[WUBRG]\}/, "Add {}")));
    const colours = new Set(five.map((line) => /Add \{([WUBRG])\}/.exec(line)?.[1]));
    if (five.length === 5 && shapes.size === 1 && colours.size === 5 && !colours.has(undefined)) {
      /*
       * The parenthetical that narrows the five is folded into the sentence
       * rather than left trailing after it. "Add one mana of any colour. (any
       * colour in your commander's colour identity)" says the same thing twice
       * and contradicts itself doing it - the note exists to qualify a line
       * that named one colour, and once folded there is no such line.
       */
      out.push(
        five[0]!
          .replace(/Add \{[WUBRG]\}\. \(any colour ([^)]+)\)/, "Add one mana of any colour $1.")
          .replace(/Add \{[WUBRG]\}/, "Add one mana of any colour"),
      );
      i += 4;
      continue;
    }
    out.push(lines[i]!);
  }
  return out;
}

/** "a creature you control with a +1/+1 counter on it" - the whole subject. */
function watchedSubject(ability: TriggeredAbility, self: CardDefinition): string {
  const noun = watchedNoun(ability.watchFor);
  /*
   * Who has to control the thing being watched.
   *
   * `controlledBy` wins where it is set, because it is the explicit version of
   * the question `watches` answers coarsely. The Meathook Massacre is the card
   * that made this matter: both its death triggers watch every player's
   * creatures, and the only difference between them is whose creature died.
   * Without this the panel prints "Whenever a creature dies" twice, which reads
   * as a card that drains you when your own creature dies and gains you life at
   * the same time.
   */
  const whose =
    ability.watchFor?.controlledBy === "you"
      ? `${noun} you control`
      : ability.watchFor?.controlledBy === "opponent"
        ? `${noun} an opponent controls`
        : (ability.watches ?? "controller") === "any"
          ? noun
          : `${noun} you control`;
  /*
   * "another" only if this card is itself the kind of thing it watches.
   * Tanglespan Lookout is a Satyr watching Auras, so it reads "an Aura you
   * control"; Soul Warden is a creature watching creatures, so "another".
   */
  const selfQualifies = matchesWatchFor(ability.watchFor, {
    instanceId: "",
    controllerId: "",
    def: self,
    // The card is being asked about in the abstract, off the battlefield, so
    // there is no instance to have counters. A watcher narrowed to "with a
    // +1/+1 counter on it" reads "another" anyway - Meltstrider Eulogist is a
    // creature watching creatures, whatever counters happen to be about.
    hadCounters: true,
    // Likewise no instance to count them on, and no card in the pool narrows a
    // watcher by *how many* - only The Ozolith reads the number, and it reads
    // it from the event rather than filtering on it.
    counters: 1,
    isToken: self.isToken === true,
  });
  /*
   * "another" is what a card says when its own arrival or death does *not*
   * count. When it does count, the card simply says "a creature you control" -
   * both Kor Celebrant's "this creature or another creature you control" and
   * Meltstrider Eulogist's plain "a creature you control" mean exactly that,
   * and one wording covers both without claiming a distinction the DSL does
   * not carry.
   */
  const subject =
    !ability.includesSelf && selfQualifies ? `another ${whose}` : `${article(whose)} ${whose}`;
  return ability.watchFor?.withCounter ? `${subject} with a +1/+1 counter on it` : subject;
}

/** "if a creature died this turn" - rule 603.4's intervening-if, as printed. */
function describeTriggerCondition(condition: TriggerCondition): string {
  switch (condition.kind) {
    case "creature-died-this-turn":
      return "if a creature died this turn";
    case "source-has-counters":
      return "if it has counters on it";
    case "gained-life-this-turn":
      return "if you gained life this turn";
    case "not":
      return `if ${negateCondition(condition.condition)}`;
    case "board":
      return `if ${describeCondition(condition.condition)}`;
  }
}

/**
 * "you control no Snakes" - a board condition read the other way round.
 *
 * Built from the condition's own parts rather than by editing the positive
 * sentence: swapping "you control " for "you control no " turned "you control a
 * Snake" into "you control no a Snake", which is the sort of thing that reads
 * as the card being broken.
 */
function negateCondition(condition: BoardCondition): string {
  switch (condition.kind) {
    case "controls-subtype":
      return `you control no ${listOr(condition.subtypes.map((s) => `${s}s`))}`;
    case "controls-color":
      return `you control no ${colorWord(condition.color)} permanents`;
    case "controls-other-lands":
      return "you control no other lands";
    case "opponents":
      return "you have no opponents";
    case "controls-commander":
      return "you control no commander";
    case "controls-lands":
      return `you control fewer than ${condition.count} lands`;
    case "attached-to-a-creature":
      return "this permanent is not attached to a creature";
    case "creatures-on-battlefield":
      return `there are fewer than ${condition.count} creatures on the battlefield`;
    case "card-types-in-graveyard":
      return `there are fewer than ${condition.count} card types among cards in your graveyard`;
  }
}

function describeTrigger(
  ability: TriggeredAbility,
  definitions: Definitions,
  self: CardDefinition,
): string {
  const body = describeEffect(ability.effect, definitions);
  // "you may draw a card" rather than "draw a card" - the difference is the
  // whole reason the game stops and asks.
  // "you may gain 1 life", not "you may you gain 1 life": the effect text
  // already reads as a sentence about you, so its own "you" is dropped.
  const plain = lowerFirst(body);
  const effectText = ability.optional ? `you may ${plain.replace(/^you /, "")}` : plain;
  // The intervening-if sits between the trigger and the effect, exactly where
  // the card prints it: "At the beginning of each end step, if a creature died
  // this turn, you may draw a card."
  const tail = ability.onlyIf ? `${describeTriggerCondition(ability.onlyIf)}, ${effectText}` : effectText;
  // "each" when it watches every player's step, "your" when only its own.
  const whoseStep = (ability.watches ?? "controller") === "any" ? "each" : "your";

  switch (ability.event) {
    case "enters-battlefield":
      // Named after the card's own type, as the cards print it - "When this
      // land enters", not "this permanent", which no card says.
      return `When this ${selfNoun(self)} enters the battlefield, ${tail}`;
    case "attacks":
      // "this token" on a token, which is the word its creator's card prints -
      // "create a 1/1 Pest with 'Whenever this token attacks...'".
      return `Whenever this ${self.isToken ? "token" : "creature"} attacks, ${tail}`;
    case "combat-damage-to-player": {
      const subject = ability.watchFor?.attachedToThis
        ? "equipped creature"
        : ability.watches === "controller"
          ? "a creature you control"
          : "this creature";
      return `Whenever ${subject} deals combat damage to a player, ${tail}`;
    }
    case "dies":
      return `When this ${self.isToken ? "token" : "creature"} dies, ${tail}`;
    case "landfall":
      return (ability.watches ?? "controller") === "any"
        ? `Whenever a land enters the battlefield, ${tail}`
        : `Landfall - whenever a land enters the battlefield under your control, ${tail}`;
    case "gain-life":
      return `Whenever you gain life, ${tail}`;
    case "permanent-enters":
      // Worded to match the printed card, because these variants really do
      // play differently and the panel is where you find that out: what is
      // watched, whose it has to be, and whether this card counts itself.
      return `Whenever ${watchedSubject(ability, self)} enters the battlefield, ${tail}`;
    case "permanent-dies":
      return `Whenever ${watchedSubject(ability, self)} dies, ${tail}`;
    case "permanent-sacrificed":
      /*
       * "Whenever **a player** sacrifices a nontoken creature" - the subject of
       * this one is the player doing the sacrificing, not the permanent, so
       * `watchedSubject`'s "you control" vocabulary is the wrong shape and the
       * sentence is built the way Fumulus prints it.
       */
      return `Whenever ${
        (ability.watches ?? "controller") === "any" ? "a player" : "you"
      } sacrifice${(ability.watches ?? "controller") === "any" ? "s" : ""} ${
        ability.watchFor?.nontoken ? "a nontoken creature" : "a creature"
      }, ${tail}`;
    case "leaves-battlefield":
      return `Whenever ${watchedSubject(ability, self)} leaves the battlefield, ${tail}`;
    case "permanent-attacks":
      return `Whenever ${watchedSubject(ability, self)} attacks, ${tail}`;
    case "spell-cast":
      // The subject is a spell, so `watchedSubject`'s permanent vocabulary is
      // wrong here - "an instant or sorcery spell", not "an instant permanent".
      return `Whenever ${castSubject(ability)} casts ${watchedSpell(ability.watchFor)}, ${tail}`;
    case "damaged":
      return `Whenever this creature is dealt damage, ${tail}`;
    case "upkeep":
      return `At the beginning of ${whoseStep} upkeep, ${tail}`;
    case "first-main":
      return `At the beginning of ${whoseStep === "each" ? "each" : "your"} first main phase, ${tail}`;
    case "begin-combat":
      return `At the beginning of combat on ${whoseStep === "each" ? "each" : "your"} turn, ${tail}`;
    case "end-step":
      return `At the beginning of ${whoseStep} end step, ${tail}`;
  }
}

/**
 * A triggered ability being handed to somebody else, so it has no card of its
 * own to be named after.
 *
 * `describeTrigger` words its subject from the card it belongs to ("when this
 * *land* enters", "whenever this *token* attacks"), and a granted ability
 * belongs to whatever it lands on. A creature is the only thing anything in the
 * pool grants a trigger to, so that is what it is described as.
 */
const GRANTED_TO_A_CREATURE: CardDefinition = {
  id: "",
  name: "",
  types: ["Creature"],
  colorIdentity: [],
  tier: "scripted",
};

function describeGrantedTrigger(trigger: TriggeredAbility, definitions: Definitions): string {
  return describeTrigger(trigger, definitions, GRANTED_TO_A_CREATURE);
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function article(noun: string): string {
  return /^[aeiou]/i.test(noun) ? "an" : "a";
}

/**
 * "you control a Swamp or a Forest", "two or more other lands" - a board
 * condition as the cards print it.
 *
 * Shared by the tapland clause and the activation restriction because they are
 * the same condition type, and a card that read one way in one place and
 * another in the other would be its own small bug report.
 */
function describeCondition(condition: BoardCondition): string {
  switch (condition.kind) {
    case "controls-other-lands":
      return `you control ${condition.count} or more other lands`;
    case "opponents":
      return `you have ${condition.count} or more opponents`;
    case "controls-subtype": {
      const what = listOr(condition.subtypes.map((s) => `a ${s}`));
      return condition.count && condition.count > 1
        ? `you control ${condition.count} or more ${listOr(condition.subtypes)}s`
        : `you control ${what}`;
    }
    case "controls-color":
      return `you control ${condition.count} or more ${colorWord(condition.color)} permanents`;
    case "controls-commander":
      return "you control a commander";
    case "controls-lands":
      return `you control ${condition.count} or more lands`;
    case "attached-to-a-creature":
      return "this permanent is attached to a creature you control";
    case "creatures-on-battlefield":
      return `there are ${condition.count} or more creatures on the battlefield`;
    case "card-types-in-graveyard":
      return `there are ${condition.count} or more card types among cards in your graveyard`;
  }
}

/** "land", "creature", "permanent" - what a card calls itself in its own text. */
function selfNoun(def: CardDefinition): string {
  for (const type of ["Land", "Creature", "Artifact", "Enchantment"] as const) {
    if (def.types.includes(type)) return type.toLowerCase();
  }
  return "permanent";
}

function colorWord(color: Color): string {
  return { W: "white", U: "blue", B: "black", R: "red", G: "green" }[color];
}

/**
 * One activated ability's printed line. Exported because the ability picker
 * lists them, and a menu that described abilities its own way would eventually
 * disagree with the card panel about what a card does.
 */
export function describeActivated(
  ability: ActivatedAbility,
  definitions: Definitions,
  self: CardDefinition,
): string {
  /*
   * Every part of the cost, in the order the cards print it: mana, tap, life,
   * sacrifice.
   *
   * The last two were missing entirely until 2026-08-10, which was a real
   * defect rather than a cosmetic one - every fetchland's panel read
   * "{T}: Search your library for a land card, put it onto the battlefield,
   * then shuffle", i.e. a free, repeatable, untapping tutor. The card you were
   * shown was strictly better than the card you were playing.
   */
  const costs: string[] = [];
  if (ability.cost.mana) costs.push(formatManaCost(ability.cost.mana));
  if (ability.cost.tap) costs.push("{T}");
  if (ability.cost.payLife !== undefined) costs.push(`Pay ${ability.cost.payLife} life`);
  if (ability.cost.sacrificeSelf) costs.push(`Sacrifice this ${selfNoun(self)}`);
  const cost = costs.length > 0 ? costs.join(", ") : "{0}";
  // Both riders print after the effect, in the order the real cards use: what
  // the ability does, what it costs you, and last when you may use it at all.
  // The painland names its own card type - "This land deals 1 damage to you" on
  // Llanowar Wastes, "This creature" on Elves of Deep Shadow.
  const pain = ability.damageToController
    ? ` This ${selfNoun(self)} deals ${ability.damageToController} damage to you.`
    : "";
  const restriction = ability.activateOnlyIf
    ? ` Activate only if ${describeCondition(ability.activateOnlyIf)}.`
    : "";
  // "Add one mana of any color in your commander's color identity" is printed
  // as one line; the engine holds it as five. Saying which five it is drawn
  // from is what stops the panel reading as a plain "Add {W}".
  const from = ability.colorFrom
    ? ability.colorFrom === "commander-identity"
      ? " (any colour in your commander's colour identity)"
      : " (any colour a land an opponent controls could produce)"
    : "";
  const spend = ability.producesRestrictedMana
    ? ` Spend this mana only to cast a legendary spell${
        ability.producesRestrictedMana.grantsUncounterable ? ", and that spell can't be countered" : ""
      }.`
    : "";
  /*
   * "Put a nest counter on this creature" - Twitching Doll, whose second
   * ability then counts them. Without this the panel showed a mana ability that
   * did nothing else, and a sacrifice ability that made a Spider "for each
   * counter on this creature" with no counters ever visibly arriving.
   *
   * Called a counter rather than a nest counter because the engine keeps one
   * generic bucket (`otherCounters`) rather than named kinds - saying "nest"
   * would be describing a distinction it does not make.
   */
  const counter = ability.addsOtherCounterToSelf
    ? ` Put ${countWord(ability.addsOtherCounterToSelf)} counter on this ${selfNoun(self)}.`
    : "";
  // "When that mana is spent to cast a creature spell that shares a creature
  // type with your commander, scry 1" - Path of Ancestry. The rider follows the
  // mana rather than the spell, which is exactly the part a player gets wrong
  // if the panel does not mention it at all.
  const mark = ability.marksMana
    ? ` When that mana is spent to cast a creature spell that shares a creature type with your commander, scry ${ability.marksMana.amount}.`
    : "";
  // Last, as the cards print it: "Equip {1}" ends with "Equip only as a
  // sorcery", not the other way round.
  const timing = ability.sorcerySpeedOnly ? " Activate only as a sorcery." : "";
  return `${cost}: ${describeEffect(ability.effect, definitions)}${from}${pain}${counter}${spend}${mark}${restriction}${timing}`;
}

/**
 * Every line of rules text a card has, in printed order: keywords, static
 * buffs, triggers, activated abilities, and (for instants/sorceries) what the
 * spell itself does. Returns an array so the UI can decide how to lay it out.
 */
export function describeCard(def: CardDefinition, definitions: Definitions = {}): string[] {
  const lines: string[] = [];

  // Ward is the one keyword that carries a cost, so it prints with it - and
  // that cost is not always mana: Sedgemoor Witch asks for life.
  const keywords: string[] = (def.keywords ?? []).map((keyword) => {
    if (keyword !== "Ward") return keyword;
    if (def.wardLifeCost !== undefined) return `Ward-Pay ${def.wardLifeCost} life`;
    return def.wardCost ? `Ward ${formatManaCost(def.wardCost)}` : keyword;
  });
  if (keywords.length > 0) lines.push(keywords.join(", "));

  if (def.cantBeCountered) lines.push("This spell can't be countered.");

  /*
   * Both cost lines come before everything else, exactly where the card prints
   * them - and leaving either off would misdescribe the card in the direction
   * that matters. A Tend the Pests panel with no sacrifice line reads as a
   * two-mana spell that makes free tokens; a Deadly Rollick with no free line
   * reads as a four-mana removal spell nobody would play.
   */
  if (def.additionalCost?.kind === "pay-life") {
    const amount = typeof def.additionalCost.amount === "number" ? String(def.additionalCost.amount) : "X";
    lines.push(`As an additional cost to cast this spell, pay ${amount} life.`);
  }
  if (def.additionalCost?.kind === "sacrifice-creature") {
    lines.push("As an additional cost to cast this spell, sacrifice a creature.");
  }
  if (def.alternativeCost) {
    lines.push(
      sentence(`If ${describeCondition(def.alternativeCost.condition)}, you may ${def.alternativeCost.label}.`),
    );
  }

  /*
   * The three keyword abilities that are a way of playing the card rather than
   * anything it does once it is out, printed where the cards print them: at the
   * top, above the rules text.
   *
   * Suspend mattered most. Profane Tutor has no mana cost at all, so its panel
   * read as a tutor you simply could not cast - the one line explaining how the
   * card is ever played was the line that was missing.
   */
  if (def.suspend) {
    lines.push(`Suspend ${def.suspend.timeCounters}-${formatManaCost(def.suspend.cost)}`);
  }
  if (def.devour !== undefined) lines.push(`Devour ${def.devour}`);
  if (def.bestowCost) lines.push(`Bestow ${formatManaCost(def.bestowCost)}`);
  if (def.alsoCreatureOffBattlefield) {
    const also = def.alsoCreatureOffBattlefield;
    lines.push(
      `As long as this card isn't on the battlefield, it's a ${also.power}/${also.toughness} ${also.subtypes.join(
        " ",
      )} creature in addition to its other types.`,
    );
  }

  if (def.staticRules?.extraLandDrops) {
    const n = def.staticRules.extraLandDrops;
    lines.push(
      n === 1
        ? "You may play an additional land on each of your turns."
        : `You may play ${countWord(n)} additional lands on each of your turns.`,
    );
  }
  if (def.staticRules?.playLandsFromGraveyard) {
    lines.push("You may play lands from your graveyard.");
  }
  /*
   * Necrodominance's two costs, and they are the reason it is a card you can
   * lose to rather than a free draw engine. The panel printed the draw ability
   * and neither of these, which reads as strictly better than the real card -
   * the same failure the tapland line below exists to prevent.
   */
  if (def.staticRules?.skipDrawStep) lines.push("Skip your draw step.");
  if (def.staticRules?.maxHandSize !== undefined) {
    lines.push(`Your maximum hand size is ${countWord(def.staticRules.maxHandSize)}.`);
  }

  // First, and before the abilities, exactly as the card prints it. This is the
  // whole drawback of a tapland: leaving it out makes Golgari Guildgate read as
  // a strictly better card than it is, which is worse than saying nothing about
  // the card at all.
  if (def.entersTapped) {
    // The "unless" is the difference between a real dual and a strictly worse
    // one, so leaving it off understated three cards in the panel that is meant
    // to be how you decide whether to play them.
    const noun = selfNoun(def);
    const unless = def.entersTappedUnless
      ? ` unless ${describeCondition(def.entersTappedUnless)}`
      : "";
    lines.push(`This ${noun} enters tapped${unless}.`);
  }

  /*
   * The shockland's price.
   *
   * Nothing rendered this at all, so Overgrown Tomb's panel read "{T}: Add
   * {B}. {T}: Add {G}." - an unconditional untapped dual, which is a strictly
   * better card than the one being played and the exact failure the tapland
   * line above exists to prevent.
   */
  if (def.entersTappedUnlessPayLife !== undefined) {
    lines.push(
      `As this ${selfNoun(def)} enters, you may pay ${def.entersTappedUnlessPayLife} life. If you don't, it enters tapped.`,
    );
  }

  if (def.staticBuff) {
    lines.push(describeStaticBuff(def.staticBuff, def, definitions));
  }

  for (const replacement of def.replacementEffects ?? []) {
    lines.push(describeReplacement(replacement));
  }

  for (const trigger of def.triggeredAbilities ?? []) {
    lines.push(describeTrigger(trigger, definitions, def));
  }
  /*
   * Folded, so a card that prints one "add one mana of any colour" ability
   * shows one line rather than the five the engine holds it as. Command Tower,
   * Birds of Paradise, Delighted Halfling, Exotic Orchard, Twitching Doll and
   * Path of Ancestry all read as near-identical five-line walls otherwise -
   * and Path of Ancestry repeated its whole scry rider on every one of them.
   */
  for (const line of foldAnyColour(
    (def.activatedAbilities ?? []).map((ability) => describeActivated(ability, definitions, def)),
  )) {
    lines.push(line);
  }
  /*
   * A planeswalker's loyalty abilities - the entire card, in Grist's case.
   *
   * These were not walked at all, so Grist's panel was blank below the type
   * line: a card with three abilities that appeared to have no rules text
   * whatsoever. The printed `label` is preferred where a fixture carries one,
   * because these are the sentences the effect DSL expresses least well and the
   * label is the card's own wording.
   */
  for (const loyalty of def.loyaltyAbilities ?? []) {
    const cost = loyalty.cost > 0 ? `+${loyalty.cost}` : String(loyalty.cost);
    lines.push(`${cost}: ${loyalty.label ?? describeEffect(loyalty.effect, definitions)}`);
  }
  if (def.castEffect) lines.push(describeEffect(def.castEffect, definitions));

  return lines;
}

/**
 * A replacement effect in the card's own words.
 *
 * Written as the cards write it - "if an effect would ... instead" - because
 * the shape of the sentence is what tells a player it is a replacement and not
 * a trigger. "Doubles your tokens" reads like something that happens after.
 */
function describeReplacement(replacement: ReplacementEffect): string {
  if (replacement.kind === "graveyard-to-exile") {
    return "If a card or token would be put into your graveyard from anywhere, exile it instead.";
  }
  if (replacement.kind === "tokens-created") {
    return (
      "If an effect would create one or more tokens under your control, it creates " +
      `${timesWord(replacement.multiply)} that many of those tokens instead.`
    );
  }
  const what = replacement.cardTypes
    ? `an ${listOr(replacement.cardTypes.map((t) => t.toLowerCase()))} you control`
    : "a permanent you control";
  const outcome = replacement.multiply
    ? `it puts ${timesWord(replacement.multiply)} that many of those counters on that permanent instead.`
    : `that many plus ${replacement.add} of each of those kinds of counters are put on that permanent instead.`;
  return `If ${replacement.multiply ? "an effect would put" : "one or more counters would be put on"} ` +
    `${replacement.multiply ? `one or more counters on ${what}, ` : `${what}, `}${outcome}`;
}

/** "twice", "three times" - how the cards say a multiplier. */
function timesWord(multiplier: number): string {
  return multiplier === 2 ? "twice" : `${multiplier} times`;
}

/** Converted mana cost / mana value - what the curve is bucketed by. */
export function manaValue(def: CardDefinition): number {
  if (!def.manaCost) return 0;
  return (
    def.manaCost.generic +
    Object.values(def.manaCost.colors).reduce((sum, n) => sum + (n ?? 0), 0)
  );
}
