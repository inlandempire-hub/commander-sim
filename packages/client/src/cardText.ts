import type {
  ActionRestriction,
  ActivatedAbility,
  BoardCondition,
  CardDefinition,
  Color,
  Amount,
  Countable,
  ManaColorSource,
  Effect,
  ReplacementEffect,
  StaticBuff,
  TargetCount,
  TargetSelector,
  TriggerCondition,
  TriggeredAbility,
} from "@mtg-commander-sim/engine";
import { describeBlockRestriction, staticBuffsOf } from "@mtg-commander-sim/engine";
import { describeEnterChoice, matchesWatchFor } from "@mtg-commander-sim/engine";
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
    case "creature": {
      // "target Insect, Rat, Spider, or Squirrel" - the printed wording lists
      // the types instead of saying creature at all.
      if (selector.subtypes?.length) return `target ${listOr(selector.subtypes)}`;
      // "**another** target creature you control" - the word goes before
      // "target", which is where Rionya prints it.
      const another = selector.excludeSource ? "another " : "";
      // "target **nonlegendary** creature you control" - Kiki-Jiki.
      const legend = selector.nonlegendary ? "nonlegendary " : "";
      // "target **non-Elf** creature" - Eyeblight's Ending.
      const except = selector.excludeSubtypes?.length
        ? selector.excludeSubtypes.map((s) => `non-${s} `).join("")
        : "";
      const whose =
        selector.controlledBy === "you"
          ? " you control"
          : selector.controlledBy === "opponent"
            ? " an opponent controls"
            : "";
      return `${another}target ${legend}${except}creature${whose}`;
    }
    case "player":
      return `${countPrefix(selector.count)}target player${
        selector.count && selector.count.max !== "x" && selector.count.max > 1 ? "s" : ""
      }`;
    case "opponent-of-controller":
      return "target opponent";
    case "spell":
      // "target spell **or ability**" - Deflecting Swat, the only card in the
      // pool that may point at a trigger sitting on the stack.
      return selector.includeAbilities ? "target spell or ability" : "target spell";
    case "permanent": {
      // "target noncreature artifact or noncreature enchantment" - the
      // qualifier goes on each noun, which is how the card prints it.
      const prefix = selector.noncreature ? "noncreature " : "";
      // No type list means "target permanent" - Assassin's Trophy, which names
      // no type because it hits every one of them.
      const noun = selector.cardTypes
        ? listOr(selector.cardTypes.map((t) => `${prefix}${t.toLowerCase()}`))
        : `${prefix}permanent`;
      const whose =
        selector.controlledBy === "you"
          ? " you control"
          : selector.controlledBy === "opponent"
            ? " an opponent controls"
            : "";
      // "one or two target attacking **creatures**" - a count above one takes a
      // plural noun, the same way the player selector already does.
      const many = selector.count && selector.count.max !== "x" && selector.count.max > 1 ? "s" : "";
      // "target **attacking** creature" - the adjective sits in front of the
      // noun, which is where the card prints it.
      const attacking = selector.attacking
        ? "attacking "
        : selector.attackingOrBlocking
          ? "attacking or blocking "
          : "";
      // "target attacking creature **with lesser power**" - mentor. A trailing
      // clause, which is where the card prints it.
      const lesser = selector.lesserPowerThanSource ? " with lesser power" : "";
      return `${countPrefix(selector.count)}target ${attacking}${noun}${many}${whose}${lesser}`;
    }
    case "card-in-your-graveyard": {
      const where = selector.anyGraveyard ? "a graveyard" : "your graveyard";
      const typeWord = selector.cardTypes?.length
        ? `${listOr(selector.cardTypes.map((t) => t.toLowerCase()))} card`
        : selector.cardType
          ? `${selector.cardType.toLowerCase()} card`
          : "card";
      const noun = `${typeWord} in ${where}`;
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
  /*
   * "**one or two** target attacking creatures" - Raph & Leo. A range with a
   * floor, which is neither "up to N" nor a fixed count.
   *
   * Written only for a range of exactly two values, because that is the only
   * shape any card prints this way. A wider range would need the card to say
   * something this sentence does not, so it falls through to the fixed form
   * rather than inventing "one or four".
   */
  // `countWord(1)` is "a", which is the right article in front of a noun and
  // the wrong word here - the card says "**one** or two target attacking
  // creatures". Same trap the "up to one" branch above already spells out.
  if (count.max === count.min + 1) {
    return `${count.min === 1 ? "one" : countWord(count.min)} or ${countWord(count.max)} `;
  }
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
  if (amount.kind === "target-power") return "its power";
  if (amount.kind === "target-toughness") return "its toughness";
  if (amount.kind === "source-power") return "its power";
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
  // "life equal to **its power**" - Swords to Plowshares.
  if (amount.kind === "target-power") return "its power";
  // "life equal to **its toughness**" - Noxious Gearhulk.
  if (amount.kind === "target-toughness") return "its toughness";
  // "damage equal to **its power**" - Eomer, reading its own.
  if (amount.kind === "source-power") return "its power";
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
    case "land-cards-in-your-graveyard":
      return "land card in your graveyard";
    case "creatures-attacking-you":
      return "creature attacking you";
    case "attacking-creatures":
      // "for each **other** attacking Goblin" - the word is the card's, and it
      // is the difference between +1/+0 and +2/+0 on a board of one Goblin.
      return `${of.excludeSource ? "other " : ""}attacking ${of.subtype ?? "creature"}`;
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
  if (amount.kind === "target-power") return "its power";
  if (amount.kind === "target-toughness") return "its toughness";
  return "X";
}

/** Exert's reminder text, kept in one place so it can be moved to the end of a sequence. */
const EXERT_REMINDER = " (An exerted creature won't untap during your next untap step.)";

export function describeEffect(effect: Effect, definitions: Definitions = {}): string {
  switch (effect.kind) {
    case "damage": {
      /*
       * "X damage **divided as you choose** among up to two targets" -
       * Shatterskull Smashing, whose amount is X and whose kicker doubles it.
       *
       * Printed as the phrase rather than as a number, for the same reason the
       * Meathook Massacre's -X/-X is: the panel is read *before* X is announced,
       * so a figure there would be a decision the player has not made.
       */
      if (effect.dividedAmongTargets) {
        const kicker =
          effect.doubleWhenAmountAtLeast !== undefined
            ? ` If X is ${effect.doubleWhenAmountAtLeast} or more, it deals twice X damage divided as you choose among them instead.`
            : "";
        return `Deal X damage divided as you choose among ${describeTarget(effect.target)}.${kicker}`;
      }
      /*
       * "Damage equal to the number of creatures you control" - a phrase rather
       * than the printed floor of 0, which is what `amountFrom` means and what
       * a panel showing "Deal 0 damage" would get wrong.
       */
      if (typeof effect.amountFrom === "object") {
        return `Deal damage equal to ${describeCount(effect.amountFrom.of)} to ${describeTarget(effect.target)}.`;
      }
      // "deals 1 damage to that player" - Spiteful Visions, aimed at the drawer.
      if (effect.toEventPlayer) return `Deal ${effect.amount} damage to that player.`;
      if (effect.amountFrom === "source-power") {
        return `Deal damage equal to its power to ${describeTarget(effect.target)}.`;
      }
      return `Deal ${effect.amount} damage to ${describeTarget(effect.target)}.`;
    }
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
      // "Each player draws two cards" - Winter's symmetric draw.
      if (effect.who === "each-player") {
        return effect.amount === 1 ? "Each player draws a card." : `Each player draws ${effect.amount} cards.`;
      }
      // "That player draws an additional card" - Howling Mine, Spiteful Visions,
      // on each player's draw step.
      if (effect.who === "active-player") {
        return effect.amount === 1
          ? "That player draws an additional card."
          : `That player draws ${effect.amount} additional cards.`;
      }
      // "an opponent draws a card" - Baleful Mastery's rider.
      if (effect.who === "an-opponent") {
        return effect.amount === 1 ? "An opponent draws a card." : `An opponent draws ${effect.amount} cards.`;
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
    case "tap":
      return sentence(
        `tap ${effect.target ? describeTarget(effect.target) : "this permanent"}.`,
      );
    case "theyMay":
      /*
       * "They may tap that permanent. If they don't, you create a ... token."
       *
       * Both halves printed, because the card is only comprehensible as a pair -
       * a panel that said only "they may tap that permanent" would describe a
       * card with no upside at all.
       */
      return sentence(
        `they may ${lowerFirst(describeEffect(effect.then, definitions)).replace(/\.$/, "")}. ` +
          `If they don't, ${lowerFirst(describeEffect(effect.otherwise, definitions))}`,
      );
    case "untap":
      // No target named is the "untap this permanent" form, which is what the
      // card says when it is talking about itself.
      return effect.target ? sentence(`Untap ${describeTarget(effect.target)}.`) : "Untap it.";
    case "untapAll":
      return effect.excludeSource
        ? "Untap all other creatures you control."
        : "Untap all creatures you control.";
    case "exertSelf":
      // The reminder text is the card's, and it is the only place the rule is
      // written down for a player who has never met the word.
      return `Exert it.${EXERT_REMINDER}`;
    case "additionalCombatPhase":
      return "After this phase, there is an additional combat phase.";
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
    case "ifTargetWas": {
      const inner = describeEffect(effect.then, definitions);
      const lowered = `${inner.charAt(0).toLowerCase()}${inner.slice(1)}`;
      /*
       * Two cards, two sentences. Feral Appetite asks about a card type and reads
       * as a reflexive rider; Pyroblast asks about a colour and reads as a
       * condition on the whole effect, which is how the card prints it - "counter
       * target spell if it's blue".
       */
      if (effect.color) return `${inner.replace(/\.$/, "")} if it's ${colorWord(effect.color)}.`;
      return `If a ${(effect.cardType ?? "card").toLowerCase()} card is exiled this way, ${lowered}`;
    }
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
    case "imprintFromHand":
      /*
       * The exclusions are the whole restriction on what may go under the Mox,
       * so they are spelled out. "Imprint -" itself is an ability word and pure
       * flavour, and a trigger sentence has nowhere to put one - the same
       * posture Loyal Apprentice's "Lieutenant" already takes.
       */
      return sentence(
        `you may exile a ${effect.excludeTypes
          .map((t) => `non${t.toLowerCase()}`)
          .join(", ")} card from your hand.`,
      );
    case "changeTargets":
      return sentence(`you may choose new targets for ${describeTarget(effect.target)}.`);
    case "addKeywordCounter": {
      // Both counters, and the keyword one named as a counter rather than as a
      // grant - which is the difference between a Quicksilver that keeps double
      // strike and one that has it until end of turn.
      const plus = effect.alsoPlusOne ? `a +1/+1 counter and ` : "";
      return sentence(
        `put ${plus}a ${effect.keyword.toLowerCase()} counter on this creature.`,
      );
    }
    case "exileAndReturnTransformed":
      // The card's own words. "Transformed" is the whole of it - what he becomes
      // is on the other face, which the panel shows separately.
      return sentence("you may exile it, then return it to the battlefield transformed under its owner's control.");
    case "eachOpponentKeepsOnePerType": {
      // Four slots, not four cards, and the sentence has to say which four -
      // "keeps four permanents" would describe a materially different card.
      const list = effect.types.map((t) => article(t.toLowerCase())).join(", ");
      return `Each opponent chooses ${list} from among the nonland permanents they control, then sacrifices the rest.`;
    }
    case "theRingTemptsYou":
      /*
       * The printed phrase, with the reminder text - The Ring is unlike anything
       * else in this pool, and the panel is where a player finds out that it is
       * four cumulative abilities and a creature that carries them.
       */
      return (
        "The Ring tempts you. (Choose a creature you control as your Ring-bearer. " +
        "The Ring gains its next ability: 1 - your Ring-bearer is legendary and can't be blocked by creatures " +
        "with greater power; 2 - whenever it attacks, draw a card, then discard a card; " +
        "3 - whenever it becomes blocked by a creature, that creature's controller sacrifices it at end of combat; " +
        "4 - whenever it deals combat damage to a player, each opponent loses 3 life.)"
      );
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
    case "createCopyToken": {
      if (effect.of === "self") return "Create a token that's a copy of this creature.";
      if (effect.of === "attached-creature") {
        return "Create a token that's a copy of the creature this is attached to.";
      }
      /*
       * Kiki-Jiki and Rionya. Every clause here used to be missing: the "except
       * it has haste" that makes the copy worth making, and the end step that
       * takes it away again.
       */
      const what = effect.target ? describeTarget(effect.target) : "target creature";
      const count = effect.count;
      /*
       * "create **X** tokens that are copies of ..., where X is one plus the
       * number of instant and sorcery spells you've cast this turn" - Rionya
       * prints the letter and then explains it, which is what a counted amount
       * is: a phrase and not a number.
       */
      const dynamic = typeof count === "object" && count.kind === "count";
      const many = dynamic || (typeof count === "number" && count > 1);
      const howMany = dynamic ? "X" : typeof count === "number" ? countWord(count) : "a";
      const head = many
        ? `Create ${howMany} tokens that are copies of ${what}`
        : `Create a token that's a copy of ${what}`;
      /*
       * "except it has haste" is a copy modification; "They gain haste" is a
       * separate continuous effect. The two cards genuinely read differently and
       * the count is what separates them - one token is modified as it is
       * copied, several are granted the keyword afterwards.
       */
      const gained = listAnd((effect.grants ?? []).map((k) => k.toLowerCase()));
      const modifier = effect.grants?.length && !many ? `, except it has ${gained}` : "";
      const explainX = dynamic ? `, where X is ${describeCount(count.of)}` : "";
      const grantSentence = effect.grants?.length && many ? ` They gain ${gained}.` : "";
      const it = many ? "them" : "it";
      const ending = effect.delayedEnd
        ? ` ${effect.delayedEnd === "sacrifice" ? "Sacrifice" : "Exile"} ${it} at the beginning of the next end step.`
        : "";
      return `${head}${modifier}${explainX}.${grantSentence}${ending}`;
    }
    case "copyTokensThatEnteredThisTurn":
      return "For each token you control that entered this turn, create a token that's a copy of it.";
    case "gainControl": {
      /*
       * Zealous Conscripts' three sentences, printed as three sentences. They
       * are one effect because they act on one permanent, which is a fact about
       * the engine and not something a player should have to read.
       */
      const parts = [`Gain control of ${describeTarget(effect.target)} until end of turn.`];
      if (effect.untap) parts.push("Untap that permanent.");
      if (effect.grants?.length) {
        parts.push(`It gains ${listAnd(effect.grants.map((k) => k.toLowerCase()))} until end of turn.`);
      }
      return parts.join(" ");
    }
    case "returnControlToOwners":
      return "Each player gains control of all creatures they own.";
    case "grantProtection": {
      /*
       * The colour is not in the effect, because it is not chosen until the
       * ability resolves - so the panel prints the card's own wording, "the color
       * of your choice", rather than a colour it cannot know.
       *
       * Every clause keyed to that colour, in the card's own order: Mother of
       * Runes names one, Skrelv names three, and a panel that printed only the
       * first would describe a materially weaker card.
       */
      const granted = effect.grants ?? ["protection"];
      const colourWords = [
        ...(effect.toxic ? [`toxic ${effect.toxic}`] : []),
        ...(granted.includes("protection")
          ? [`protection from ${effect.orColorless ? "colorless or from " : ""}the color of your choice`]
          : []),
        ...(granted.includes("hexproof-from") ? ["hexproof from that color"] : []),
      ];
      // "It can't be blocked by creatures of that color this turn" is its own
      // sentence on the card, and it is the half that actually wins the game.
      const unblockable = granted.includes("unblockable-by")
        ? " It can't be blocked by creatures of that color this turn."
        : "";
      /*
       * "Choose a color." is its own sentence in front, so what follows it
       * starts a new one and is capitalised - without this the panel read
       * "Choose a color. another target creature ...".
       */
      const chooses = effect.grants ? "Choose a color. " : "";
      const body = `${describeTarget(effect.target)} gains ${listAnd(colourWords)} until end of turn.`;
      return `${chooses}${chooses ? sentence(body) : body}${unblockable}`;
    }
    case "delayedRemoval":
      /*
       * Never reached from a card's own text - a delayed trigger is scheduled by
       * `createCopyToken`, which prints the sentence itself. It is here because
       * the effect does appear on the stack, and the stack panel renders
       * whatever is on it.
       */
      return effect.action === "sacrifice"
        ? "Sacrifice it at the beginning of the next end step."
        : "Exile it at the beginning of the next end step.";
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
      const except = effect.excludeSubtype ? `non-${effect.excludeSubtype} ` : "";
      const draw = effect.thenDraw ? " Draw a card for each permanent destroyed this way." : "";
      const mana = effect.manaPerDestroyed
        ? ` Add ${effect.manaPerDestroyed.map((c) => `{${c}}`).join(" or ")} for each permanent destroyed this way.`
        : "";
      return `Destroy ${effect.maxManaValue !== undefined ? "each" : "all"} ${nonland}${except}${noun}${scope}.${draw}${mana}`;
    }
    case "damageAll":
      return `Deal ${effect.amount} damage to each creature.`;
    case "eachCreatureDamagesController":
      return `Each creature deals ${effect.amount} damage to its controller.`;
    case "discardAnyNumberDrawThatMany":
      return `Discard any number of cards, then draw that many cards${effect.plusOne ? " plus one" : ""}.`;
    case "revealTopDrainByManaValue":
      return "Reveal the top card of your library and put it into your hand. Each opponent loses X life and you gain X life, where X is that card's mana value.";
    case "revealToHandRestToGraveyard":
      return `Reveal the top ${effect.amount} cards of your library. You may put a ${listOr(effect.cardTypes.map((t) => t.toLowerCase()))} card from among them into your hand. Put the rest into your graveyard.`;
    case "millAndBranchToken":
      return "Mill a card. Create a Treasure token if it's a land, a 1/1 green Insect if it's a creature, or a Blood token otherwise.";
    case "eachPlayerFetchBasics":
      return `Each player may search their library for up to ${effect.count} basic land cards, put them onto the battlefield${effect.tapped ? " tapped" : ""}, then shuffle.`;
    case "damageEachOpponentAndPlaneswalkers":
      return `Deal ${plainAmount(effect.amount)} damage to each opponent and each planeswalker they control.`;
    case "eachOpponentSacOrDiscardElseDamage":
      return `Each opponent may sacrifice a nonland permanent of their choice or discard a card. Then this creature deals damage equal to its power to each opponent who didn't.`;
    case "keenDuel":
      return "You and target opponent each reveal the top card of your library. You each lose life equal to the mana value of the card revealed by the other player. You each put the card you revealed into your hand.";
    case "destroyChosenNotYours":
      return `Starting with you, each player may choose ${listOr(effect.cardTypes.map((t) => `an ${t.toLowerCase()}`))} you don't control. Destroy each permanent chosen this way.`;
    case "eachOpponentFetchBasicsSplit":
      return `Each opponent may search their library for up to ${effect.count} basic land cards, put one onto the battlefield tapped under your control and the rest tapped under their own, then shuffle.`;
    case "temptWithDiscovery":
      return "Search your library for a land card and put it onto the battlefield. Each opponent may search their library for a land card and put it onto the battlefield. For each opponent who does, search your library for a land card and put it onto the battlefield. Then shuffle.";
    case "demonicCovenantEndStep":
      return `Create a 5/5 black Demon creature token with flying, then mill ${effect.millAmount} cards. If two cards that share all their card types were milled this way, sacrifice this enchantment.`;
    case "descentAvernus":
      return `Put ${effect.countersPerUpkeep} descent counters on this enchantment. Then each player creates X Treasure tokens and this enchantment deals X damage to each player, where X is the number of descent counters on this enchantment.`;
    case "warpWorld":
      return "Each player shuffles all permanents they own into their library, then reveals that many cards from the top of their library and puts all permanent cards revealed this way onto the battlefield.";
    case "surveilThenDrawLose":
      return `Surveil ${effect.surveil}. Then for each card you put on top of your library, you draw a card and you lose ${effect.lifePerCard} life.`;
    case "surveilN":
      return `Surveil ${effect.amount}.`;
    case "returnFromGraveyardAuto": {
      const noun = listOr(effect.cardTypes.map((t) => t.toLowerCase()));
      const where = effect.destination === "hand" ? "your hand" : "the battlefield";
      return `Return another target ${noun} card from your graveyard to ${where}.`;
    }
    case "loot":
      return effect.amount === 1 ? "You may discard a card. If you do, draw a card." : `You may discard up to ${effect.amount} cards. If you do, draw that many cards.`;
    case "exileGraveyardCard":
      return `Exile up to one ${describeTarget(effect.target)}.`;
    case "preventDamageFromOpponentCreatures":
      return "Prevent all damage that would be dealt this turn by creatures your opponents control.";
    case "revealTopPermanentsToBattlefield":
      return "Each player reveals a number of cards from the top of their library equal to the number of nonland permanents they control, puts all permanent cards revealed this way onto the battlefield, and puts the rest into their graveyard.";
    case "drain":
      return `Each opponent loses ${plainAmount(effect.amount)} life. You gain life equal to the life lost this way.`;
    case "returnAllFromGraveyard": {
      const dest = effect.destination === "battlefield" ? `the battlefield${effect.tapped ? " tapped" : ""}` : "your hand";
      return `Return all ${effect.cardType.toLowerCase()} cards from your graveyard to ${dest}.`;
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
      const base = describeCreateToken(effect, definitions);
      // "...that's tapped and attacking" - appended rather than woven through
      // the five returns above, which each phrase the count differently and
      // would each need the clause spelling out again.
      const one = effect.count === 1;
      /*
       * "It gains lifelink and haste until end of turn" - Windcrag Siege's
       * Goblin. A separate sentence, as the card prints it, because the
       * keywords are granted to the token and not printed on it.
       */
      const gains = effect.grants?.length
        ? ` ${one ? "It gains" : "They gain"} ${listAnd(effect.grants.map((k) => k.toLowerCase()))} until end of turn.`
        : "";
      /*
       * "That token ... **attacks this combat if able**" - Legion Warboss.
       * Its own sentence, following the grant, because the card prints the two
       * together: "It gains haste until end of turn and attacks this combat if
       * able."
       */
      const compelled = effect.mustAttack
        ? ` ${one ? "It attacks" : "They attack"} this combat if able.`
        : "";
      /*
       * "**Sacrifice them at the beginning of the next end step.**" - mobilize.
       * The clause that makes the tokens a rental rather than a board, so it is
       * never dropped.
       */
      const ends = effect.delayedEnd
        ? ` ${effect.delayedEnd === "sacrifice" ? "Sacrifice" : effect.delayedEnd === "exile" ? "Exile" : "Return"} ${
            one ? "it" : "them"
          }${effect.delayedEnd === "return-to-hand" ? " to your hand" : ""} at the beginning of the next end step.`
        : "";
      const tail = `${gains}${compelled}${ends}`;
      if (!effect.attacking) return `${base}${tail}`;
      /*
       * "for each opponent, create a ... token that's tapped and attacking
       * **that player**" - Ainok Strike Leader, whose tokens are each aimed at
       * their own opponent rather than all at whoever is already being attacked.
       */
      const whom = effect.attacking === "each-opponent" ? " that player" : "";
      return `${base.slice(0, -1)} ${one ? "that's" : "that are"} tapped and attacking${whom}.${tail}`;
    }
    case "restrictThisTurn":
      // Silence. Phrased for the turn rather than as a permanent's static,
      // which is the only difference between the two on the card face.
      return `${describeRestriction(effect.restriction)} this turn.`;
    case "deployFromTop": {
      const what = `${effect.subtype ? effect.subtype + " " : ""}${effect.cardType.toLowerCase()} card`;
      const arrives = effect.attacking
        ? " onto the battlefield tapped and attacking"
        : effect.tapped
          ? " onto the battlefield tapped"
          : " onto the battlefield";
      const gains = effect.grants?.length
        ? ` It gains ${effect.grants.join(" and ").toLowerCase()} until end of turn.`
        : "";
      return (
        `Look at the top ${effect.amount} cards of your library. You may put a ${what}` +
        ` from among them${arrives}.${gains}` +
        " Put the rest on the bottom of your library in a random order."
      );
    }
    case "damageController":
      // "It deals 1 damage to you" - the permanent is the source, so the sentence
      // is written from the card's point of view rather than the player's.
      return sentence(`it deals ${effect.amount} damage to you.`);
    case "animateSelf": {
      const withWhat = effect.keywords.length
        ? ` with ${listAnd(effect.keywords.map((k) => k.toLowerCase()))}`
        : "";
      const types = [...effect.subtypes, "artifact creature"].join(" ");
      // "It's still a land" is printed on both cards and is not decoration - a
      // player reading this needs to know the land keeps making mana.
      return sentence(
        `this land becomes a ${effect.power}/${effect.toughness} ${types}${withWhat} until end of turn. It's still a land.`,
      );
    }
    case "discardRandom":
      return sentence(
        `discard ${effect.amount === 1 ? "a card" : `${countWord(effect.amount)} cards`} at random.`,
      );
    case "addManaVariable": {
      const per =
        typeof effect.amount !== "number" && effect.amount.kind === "count"
          ? describeCount(effect.amount.of)
          : countAmount(effect.amount);
      return sentence(`add {${effect.color}} for each ${per}.`);
    }
    case "exileTopAndMayPlay":
      return sentence(
        `exile the top card of ${effect.from === "you" ? "your" : "that player's"} library. ` +
          `${effect.lands ? "You may play that card this turn." : "Until end of turn, you may cast that card."}`,
      );
    case "drawUnlessTheyPay":
      return sentence(
        `draw a card unless that player pays {${
          typeof effect.amount === "number" ? effect.amount : "X"
        }}${typeof effect.amount !== "number" ? ", where X is this creature's power" : ""}.`,
      );
    case "becomeMonarch":
      return sentence("target player becomes the monarch.");
    case "restrictBlockersThisTurn":
      return sentence(
        `This creature can't be blocked this turn except by ${describeBlockRestriction(effect.restriction)}.`,
      );
    case "pump": {
      const who = effect.target ? describeTarget(effect.target) : "this creature";
      /*
       * "+1/+0 until end of turn **for each other attacking Goblin**" - Goblin
       * Rabblemaster.
       *
       * A counted modifier is one per thing counted, so the number the card
       * prints is +1 and the count is a trailing clause. Printed the other way
       * round - "gets +other attacking Goblin/+0" - is not English, and it was
       * the first thing the panel test caught.
       */
      const counted = (amount: Amount): Countable | undefined =>
        typeof amount === "object" && amount.kind === "count" ? amount.of : undefined;
      const perEach = counted(effect.power) ?? counted(effect.toughness);
      const unit = (amount: Amount): Amount => (counted(amount) ? 1 : amount);
      // Revitalizing Repast pumps nothing and grants everything, so a +0/+0
      // is dropped for the same reason `pumpAll` drops it.
      const parts: string[] = [];
      if (effect.power !== 0 || effect.toughness !== 0) {
        parts.push(`gets ${signedAmount(unit(effect.power))}/${signedAmount(unit(effect.toughness))}`);
      }
      if (effect.grants?.length) {
        parts.push(`gains ${listAnd(effect.grants.map((k) => k.toLowerCase()))}`);
      }
      const forEach = perEach ? ` for each ${perThing(perEach) ?? describeCount(perEach)}` : "";
      return sentence(`${who} ${parts.join(" and ")} until end of turn${forEach}.`);
    }
    case "pumpAll": {
      const noun = (effect.appliesTo ?? "creatures") === "permanents" ? "Permanents" : "Creatures";
      // "**Creature tokens** you control gain indestructible" - Ainok Strike
      // Leader's sacrifice half, which protects the Goblins and nothing else.
      const who =
        effect.restriction === "token"
          ? `${noun === "Permanents" ? "Permanent" : "Creature"} tokens you control`
          : effect.scope === "controller"
            ? `${noun} you control`
            : `All ${noun.toLowerCase()}`;
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
      // "until **your next turn**" - Emeria's Call, the one printing in the
      // pool whose shield has to survive the opponent's turn.
      const until = effect.grantsUntil === "your-next-turn" ? "until your next turn" : "until end of turn";
      return gains.some((g) => g.startsWith('"'))
        ? finish(`${until.charAt(0).toUpperCase()}${until.slice(1)}, ${lowerFirst(who)} ${parts.join(" and ")}`)
        : `${who} ${parts.join(" and ")} ${until}.`;
    }
    case "loseLife":
      // Loss, not damage, and the panel says so - a player who reads "deals 1
      // damage to each opponent" will expect prevention and lifelink to matter.
      return effect.who === "target" && effect.target
        ? sentence(`${describeTarget(effect.target)} loses ${effect.amount} life.`)
        : effect.who === "self"
          ? `You lose ${effect.amount} life.`
          : effect.who === "each-player"
            ? `Each player loses ${plainAmount(effect.amount)} life.`
            : `Each opponent loses ${plainAmount(effect.amount)} life.`;
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
      const also =
        effect.kind === "returnFromGraveyard" && effect.alsoType
          ? ` That permanent is ${effect.alsoType.colors.map((c) => colorWord(c)).join(" and ")} ${effect.alsoType.subtypes.join(" ")} in addition to its other colors and types.`
          : "";
      return `Return ${describeTarget(effect.target)} ${where}.${also}`;
    }
    case "modal": {
      // The printed wording: "Choose one - A; or B."
      return `Choose one - ${effect.modes.map((mode) => mode.label).join("; or ")}.`;
    }
    case "sacrifice":
      // The noun is filled in by describeCard, which knows the card; on its own
      // this effect has no idea what type it sits on.
      return "Sacrifice it.";
    case "sequence": {
      /*
       * Joined rather than bulleted, because the card prints it as prose:
       * "sacrifice it. When you do, search your library ... and you gain 1
       * life." Each step already ends in a full stop.
       */
      const steps = effect.effects.map((step) => describeEffect(step, definitions));
      /*
       * "You may exert it as it attacks. **When you do,** untap all other
       * creatures you control ..." - Combat Celebrant.
       *
       * Without the reflexive phrase the untap reads as something that happens
       * regardless, which is a materially better card than the one printed.
       */
      if (effect.effects[0]?.kind === "exertSelf" && steps.length > 1) {
        // Only the sentence directly after "When you do," is folded into it.
        // Lowercasing all of them turned the sentence after that into "after
        // this phase, there is an additional combat phase", mid-paragraph.
        const [next, ...later] = steps.slice(1);
        const clause = `${next!.charAt(0).toLowerCase()}${next!.slice(1)}`;
        // The reminder belongs at the end of the whole ability, where the card
        // prints it, rather than in the middle of its first sentence.
        const exert = steps[0]!.replace(EXERT_REMINDER, "");
        return [`${exert} When you do, ${clause}`, ...later].join(" ") + EXERT_REMINDER;
      }
      /*
       * "...create a 1/1 white Cat creature token. **Then** if you have the
       * city's blessing, ..." - Ocelot Pride.
       *
       * A conditional that follows another step is printed with the connective,
       * on this card and on every card that prints the shape. Without it the
       * second sentence reads as a separate ability that might have happened
       * first, which matters here: the Cat the first step made is one of the
       * tokens the second one copies.
       */
      return steps
        .map((step, index) =>
          index > 0 && effect.effects[index]?.kind === "conditional"
            ? `Then ${step.charAt(0).toLowerCase()}${step.slice(1)}`
            : step,
        )
        .join(" ");
    }
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
      const searchTypes = effect.cardType
        ? (Array.isArray(effect.cardType) ? effect.cardType : [effect.cardType]).map((t) => t.toLowerCase())
        : [];
      /*
       * "with power 2 or less" - the recruiters' caps, which are the entire
       * difference between the card and a strictly better one. Left out, three
       * tutors read as unrestricted.
       */
      const searchCaps: string[] = [];
      if (effect.maxPower !== undefined) searchCaps.push(`power ${effect.maxPower} or less`);
      if (effect.maxToughness !== undefined) searchCaps.push(`toughness ${effect.maxToughness} or less`);
      if (effect.maxManaValue !== undefined) searchCaps.push(`mana value ${effect.maxManaValue} or less`);
      const searchCap = searchCaps.length > 0 ? ` with ${listAnd(searchCaps)}` : "";
      const what = effect.subtypes?.length
        ? `a ${basic}${listOr(effect.subtypes)} card${searchCap}`
        : effect.basicLandOnly
          ? "a basic land card"
          : searchTypes.length > 0
            ? `${article(listOr(searchTypes))} ${listOr(searchTypes)} card${searchCap}`
            : `a card${searchCap}`;
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
    case "proliferate":
      return "Proliferate.";
    case "lookTopMayTake":
      return `Look at the top ${effect.amount} cards of your library. You may reveal a noncreature, nonland card from among them and put it into your hand. Put the rest on the bottom of your library in a random order.`;
    case "millThenPlayLands":
      return "You may mill that many cards. Put any number of land cards from among them onto the battlefield tapped.";
    case "emergentUltimatum":
      return "Search your library for up to three monocolored cards with different names and exile them. An opponent chooses one of those cards. Shuffle that card into your library. You may cast the other cards without paying their mana costs. Exile this spell.";
    case "transform":
      return "Transform this creature.";
    case "copyNextInstantOrSorcery":
      return "When you next cast an instant or sorcery spell this turn, copy that spell.";
    case "infectiousBite": {
      const poison =
        effect.poisonEachOpponent === 1
          ? "Each opponent gets a poison counter."
          : `Each opponent gets ${effect.poisonEachOpponent} poison counters.`;
      return `Target creature you control deals damage equal to its power to target creature an opponent controls. ${poison}`;
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
    case "cards-named-this-in-all-graveyards":
      // Rite of Flame names itself, so the panel does too - "for each card named
      // this in each graveyard" would be a sentence no printed card contains.
      return "card with this name in each graveyard";
    case "one-plus-instants-and-sorceries-cast-this-turn":
      // The "one plus" is part of the printed phrase, so it is part of the
      // sentence too - see the Countable entry.
      return "one plus the number of instant and sorcery spells you've cast this turn";
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
    case "land-cards-in-your-graveyard":
      return "the number of land cards in your graveyard";
    case "counters-on-source":
      return "the number of counters on this creature";
    case "life-gained-this-turn":
      return "the amount of life you gained this turn";
    case "opponents":
      return "each opponent";
    case "players-who-have-lost":
      return "player who has lost the game";
    case "creatures-attacking-you":
      return "creature attacking you";
    case "attacking-creatures":
      return `${of.excludeSource ? "other " : ""}attacking ${of.subtype ?? "creature"}`;
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
/**
 * "...enters **untapped**" - Charismatic Conqueror. A trailing word rather than
 * part of the noun, because that is where the card prints it, and it is the
 * whole drawback of the card: against a deck of taplands it does nothing.
 */
function arrivalQualifier(watchFor: TriggeredAbility["watchFor"]): string {
  return watchFor?.untapped ? " untapped" : "";
}

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
  let base = subtypeNoun ?? typeNoun ?? "permanent";
  // "a **non-Human** creature you control attacks" - Winota. Left out, the
  // panel described a materially different card: "whenever a creature you
  // control attacks" is every attacker rather than half of them, and the
  // difference is the entire deck the card is built for.
  const barred = watchFor?.excludeSubtype;
  if (barred) {
    const list = Array.isArray(barred) ? barred : [barred];
    base = `${list.map((s) => `non-${s}`).join(" ")} ${base}`;
  }
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
  buff: StaticBuff,
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

  // A creature type is a proper noun on a card - "Humans you control", not
  // "humans" - and the subject of this sentence is often mid-line.
  const noun = buff.subtype ? `${buff.subtype}s` : "creatures";
  // "Attacking Pests you control", "Each creature you control with a +1/+1
  // counter on it" - the restriction is part of the subject, not a trailing
  // clause, which is how the cards print it.
  // "Each creature ..." is singular and takes "gets"/"has"; every other form
  // here is plural and takes "get"/"have". Printed as one sentence either way,
  // so the verb has to agree or the panel reads as broken English.
  // "As long as you have 30 or more life, **this creature** gets +5/+5 and has
  // flying." - Serra Ascendant, whose buff is about itself and takes a singular
  // verb like the counter form below.
  const singular = buff.restriction === "with-counter" || buff.selfOnly === true;
  const subject = buff.selfOnly
    ? "This creature"
    : buff.restriction === "attacking"
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
  /*
   * "Humans you control have **each of the chosen abilities**" - Greymond. The
   * keywords are not on the card, so the panel says what the card says rather
   * than naming the two that happen to have been picked in this game: the panel
   * describes the card, and the card is the same card whatever was chosen.
   */
  if (buff.grantsChosenOnEntry) {
    parts.push(`${singular ? "has" : "have"} each of the chosen abilities`);
  }
  /*
   * "Other creatures you control have **'Ward - Pay 2 life.'**" - Hexing
   * Squelcher, printed in quotes as the card prints it.
   */
  if (buff.grantsWardLife !== undefined) {
    parts.push(`${singular ? "has" : "have"} "Ward-Pay ${buff.grantsWardLife} life."`);
  }
  /*
   * "**As long as you control four or more Humans**, Humans you control get
   * +2/+2" - the condition opens the sentence, which is where Greymond prints
   * it, and it is the whole difference between a conditional anthem and a
   * permanent one.
   */
  const when = buff.condition ? `As long as ${describeCondition(buff.condition)}, ` : "";
  const line = sentence(finish(`${subject} ${parts.join(" and ")}`));
  /*
   * The subject keeps its capital when the condition goes in front of it,
   * because it is a creature type and not an ordinary noun: "As long as you
   * control four or more Humans, **Humans** you control get +2/+2".
   */
  return when ? `${when}${buff.subtype ? line : `${line.charAt(0).toLowerCase()}${line.slice(1)}`}` : line;
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
  abilities: NonNullable<StaticBuff["grantsAbilities"]>,
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
    // Nor is there an arrival to have been tapped or untapped. Charismatic
    // Conqueror's "enters untapped" narrows *how* a permanent arrived, and a
    // card asked about in the abstract has not arrived at all - so it is
    // offered as untapped, which is what "would this trigger see that card"
    // means here.
    tapped: false,
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
    case "source-not-exerted":
      return "if it hasn't been exerted this turn";
    case "first-combat-phase":
      return "if it's the first combat phase of the turn";
    case "chosen-mode":
      // Windcrag Siege prints both halves and a bullet each; the panel says
      // which half this line belongs to rather than pretending it is the only
      // one, because the card the player is looking at has both on it.
      return `if ${condition.mode} was chosen`;
    case "not":
      return `if ${negateCondition(condition.condition)}`;
    case "board":
      return `if ${describeCondition(condition.condition)}`;
    case "source-is-tapped":
      return "if it's tapped";
    case "source-untapped":
      return "if it's untapped";
    case "counters-or-hand-at-least":
      return `if there are ${condition.count} or more counters on it or you have ${condition.count} or more cards in hand`;
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
    case "citys-blessing":
      return "you don't have the city's blessing";
    case "within-your-first-turns":
      // Starting Town prints the negative form, so this is the one the panel
      // actually shows: "unless it's your first, second, or third turn".
      return `it's not one of your first ${condition.turns} turns of the game`;
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
    case "life-at-least":
      return `you have fewer than ${condition.life} life`;
    case "creatures-on-battlefield":
      return `there are fewer than ${condition.count} creatures on the battlefield`;
    case "card-types-in-graveyard":
      return `there are fewer than ${condition.count} card types among cards in your graveyard`;
    case "cards-in-graveyard":
      return `there are fewer than ${condition.count} cards in your graveyard`;
    case "permanent-cards-in-graveyard":
      return `there are fewer than ${condition.count} permanent cards in your graveyard`;
    case "any-player-life-at-most":
      return `no player has ${condition.life} or less life`;
    case "creature-cards-in-graveyard":
      return `you have fewer than ${condition.count} creature cards in your graveyard`;
    case "gained-life-this-turn":
      return "you didn't gain life this turn";
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
    case "attacks-or-blocks":
      return `Whenever this creature attacks or blocks, ${tail}`;
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
      return `Whenever ${watchedSubject(ability, self)} enters the battlefield${arrivalQualifier(
        ability.watchFor,
      )}, ${tail}`;
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
      if (ability.onlyFirstNoncreatureEachTurn) {
        return `Whenever ${castSubject(ability)} casts their first noncreature spell each turn, ${tail}`;
      }
      // "if no mana was spent to cast it" - printed as the card prints it, in
      // front of the effect, because it is the whole of what Boromir answers.
      return ability.watchFor?.freeSpell
        ? `Whenever ${castSubject(ability)} casts ${watchedSpell(ability.watchFor)}, if no mana was spent to cast it, ${tail}`
        : `Whenever ${castSubject(ability)} casts ${watchedSpell(ability.watchFor)}, ${tail}`;
    case "damaged":
      return `Whenever this creature is dealt damage, ${tail}`;
    case "creatures-dealt-combat-damage":
      // "One or more" is the printed phrase and the rule at once: it fires once
      // however many creatures connected.
      return `Whenever one or more creatures you control deal combat damage to a player, ${tail}`;
    case "land-played":
      // "When you play **another** land" - the word is the default, so it is
      // printed unless the card says otherwise.
      return `When ${(ability.watches ?? "controller") === "any" ? "a player plays" : "you play"} ${
        ability.includesSelf ? "a land" : "another land"
      }, ${tail}`;
    case "becomes-tapped":
      return `Whenever this ${selfNoun(self)} becomes tapped, ${tail}`;
    case "combat-damage-dealt":
      return `Whenever ${
        ability.watches === "controller" ? "a creature you control" : "this creature"
      } deals combat damage during your turn, ${tail}`;
    case "attack-with-two-or-more":
      return `Whenever you attack with two or more creatures, ${tail}`;
    case "upkeep":
      return `At the beginning of ${whoseStep} upkeep, ${tail}`;
    case "first-main":
      return `At the beginning of ${whoseStep === "each" ? "each" : "your"} first main phase, ${tail}`;
    case "begin-combat":
      return `At the beginning of combat on ${whoseStep === "each" ? "each" : "your"} turn, ${tail}`;
    case "end-step":
      return `At the beginning of ${whoseStep} end step, ${tail}`;
    case "draw-step":
      return `At the beginning of ${whoseStep} draw step, ${tail}`;
    case "creatures-attack":
      /*
       * "one or more" is the printed phrase and the rule at once - it fires
       * once however many were declared - which is why this reads differently
       * from `permanent-attacks` above despite watching the same moment.
       */
      return ability.attackersIncludeSelfOrCommander
        ? `Whenever you attack with this creature and/or your commander, ${tail}`
        : `Whenever you attack with one or more ${
            ability.watchFor?.excludeSubtype
              ? `non-${
                  Array.isArray(ability.watchFor.excludeSubtype)
                    ? listOr(ability.watchFor.excludeSubtype)
                    : ability.watchFor.excludeSubtype
                } creatures`
              : "creatures"
          }, ${tail}`;
    case "creatures-die":
      /*
       * "One or more" is the printed phrase and the rule at once - it fires once
       * however many died - which is why it reads differently from
       * `permanent-dies` above despite watching the same moment.
       */
      return `Whenever one or more ${ability.includesSelf ? "" : "other "}${
        ability.watchFor?.subtype ?? "creature"
      }s you control die, ${tail}`;
    case "becomes-blocked":
      // "By a creature" - once per blocker, which is what the phrase says and
      // what the panel has to convey for a card that sacrifices each of them.
      return `Whenever this creature becomes blocked by a creature, ${tail}`;
    case "library-searched": {
      // Whose search it has to be, read off the same field `spell-cast` uses
      // for whose spell it has to be. Omitted means anybody's, which is what
      // `controlledBy` means everywhere else.
      const who = ability.watchFor?.controlledBy;
      const [subject, verb] =
        who === "opponent" ? ["an opponent", "searches"] : who === "you" ? ["you", "search"] : ["a player", "searches"];
      return `Whenever ${subject} ${verb} their library, ${tail}`;
    }
    case "card-drawn": {
      // "Whenever an opponent draws a card" (Scrawling Crawler) / "a player
      // draws a card" (Spiteful Visions). Whose draw counts is read the same
      // way the search watcher reads it.
      const who = ability.watchFor?.controlledBy;
      const [subject, verb] =
        who === "opponent" ? ["an opponent", "draws"] : who === "you" ? ["you", "draw"] : ["a player", "draws"];
      // "Whenever you draw your second card each turn" - Gixian Puppeteer.
      if (ability.nthDrawThisTurn !== undefined) {
        const ord = ability.nthDrawThisTurn === 2 ? "second" : ability.nthDrawThisTurn === 3 ? "third" : `${ability.nthDrawThisTurn}th`;
        return `Whenever ${subject} ${verb} your ${ord} card each turn, ${tail}`;
      }
      return `Whenever ${subject} ${verb} a card, ${tail}`;
    }
    case "card-discarded": {
      const who = ability.watchFor?.controlledBy;
      const [subject, verb] =
        who === "opponent" ? ["an opponent", "discards"] : who === "you" ? ["you", "discard"] : ["a player", "discards"];
      return `Whenever ${subject} ${verb} a card, ${tail}`;
    }
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
    case "citys-blessing":
      return "you have the city's blessing";
    case "within-your-first-turns":
      return `it's one of your first ${condition.turns} turns of the game`;
    case "controls-other-lands":
      return `you control ${condition.count} or more other lands`;
    case "opponents":
      return `you have ${condition.count} or more opponents`;
    case "controls-subtype": {
      const what = listOr(condition.subtypes.map((s) => `a ${s}`));
      // Spelled out, as the cards print it: "as long as you control **four** or
      // more Humans", never "4 or more".
      return condition.count && condition.count > 1
        ? `you control ${countWord(condition.count)} or more ${listOr(condition.subtypes)}s`
        : `you control ${what}`;
    }
    case "controls-color":
      return `you control ${condition.count} or more ${colorWord(condition.color)} permanents`;
    case "controls-commander":
      return "you control a commander";
    case "controls-lands":
      return `you control ${condition.count} or more ${condition.basic ? "basic " : ""}lands`;
    case "any-player-life-at-most":
      return `a player has ${condition.life} or less life`;
    case "creature-cards-in-graveyard":
      return `you have ${condition.count} or more creature cards in your graveyard`;
    case "gained-life-this-turn":
      return "you gained life this turn";
    case "attached-to-a-creature":
      return "this permanent is attached to a creature you control";
    case "life-at-least":
      return `you have ${condition.life} or more life`;
    case "creatures-on-battlefield":
      return `there are ${condition.count} or more creatures on the battlefield`;
    case "card-types-in-graveyard":
      return `there are ${condition.count} or more card types among cards in your graveyard`;
    case "cards-in-graveyard":
      return `there are ${condition.count} or more cards in your graveyard`;
    case "permanent-cards-in-graveyard":
      return `there are ${condition.count} or more permanent cards in your graveyard`;
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
  // "Sacrifice a Treasure" - a cost that gives up something other than the
  // source, which nothing printed before Professional Face-Breaker.
  if (ability.cost.sacrificeSubtype) costs.push(`Sacrifice a ${ability.cost.sacrificeSubtype}`);
  /*
   * "Discard this card", "Exile this card from your hand" - the cost that also
   * says where the ability is activated from. Left out, a Channel land reads as a
   * free removal spell you may use from your hand every turn.
   */
  if (ability.cost.fromHand === "discard") costs.push("Discard this card");
  if (ability.cost.fromHand === "exile") costs.push("Exile this card from your hand");
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
  /*
   * "If this land has a luck counter on it, instead ..." - Gemstone Caverns,
   * whose one printed line is six abilities here. Saying which of them is which
   * is the only thing that stops the panel showing a land that taps for six.
   */
  /*
   * "Activate each power-up ability only once", and "reduce the cost by his mana
   * cost if he entered this turn" - both printed in Quicksilver's reminder text
   * and both real rules, so both are said.
   */
  const oncePerGame = ability.onlyOncePerGame ? " Activate only once." : "";
  const fresher = ability.costReducedByOwnCostWhenFresh
    ? " This ability costs its own mana cost less to activate if this creature entered this turn."
    : "";
  const counterGate =
    ability.onlyIfSourceHasCounters === undefined
      ? ""
      : ability.onlyIfSourceHasCounters
        ? " (while it has a counter on it)"
        : " (while it has no counter on it)";
  /*
   * "This ability costs {1} less to activate for each legendary creature you
   * control" - the Channel lands.
   *
   * Printed rather than folded into the cost above, because the cost above is
   * what the card says and this is a discount that changes with the board: a
   * panel showing {W} on a table with two legends would be right for that moment
   * and wrong the moment one dies.
   */
  const discount = ability.costReducedPer
    ? " This ability costs {1} less to activate for each legendary creature you control."
    : "";
  /*
   * "Add one mana of any color in your commander's color identity" is printed as
   * one line; the engine holds it as five. Saying which five it is drawn from is
   * what stops the panel reading as a plain "Add {W}".
   *
   * A keyed record rather than a chain of ternaries, which is how this went wrong
   * once already: with two sources and one `else`, adding Mox Amber's third made
   * it print Exotic Orchard's sentence. The compiler now refuses a source with no
   * wording of its own.
   */
  const COLOR_SOURCE_WORDING: Record<ManaColorSource, string> = {
    "commander-identity": " (any colour in your commander's colour identity)",
    "opponent-lands": " (any colour a land an opponent controls could produce)",
    "your-legendary-permanents": " (any colour among legendary creatures and planeswalkers you control)",
    // Chrome Mox: the colours of whatever it exiled as it entered.
    "imprinted-card": " (any of the exiled card's colours)",
  };
  const from = ability.colorFrom ? COLOR_SOURCE_WORDING[ability.colorFrom] : "";
  /*
   * Which spells this mana may pay for, in the card's own words.
   *
   * This was hardcoded to "a legendary spell" - Delighted Halfling's wording -
   * so Cavern of Souls read as a completely different card the moment it
   * arrived. A restriction is a closed list, and every member of it needs its
   * own sentence here.
   */
  const spendWhat =
    ability.producesRestrictedMana?.kind === "creature-of-chosen-type"
      ? "a creature spell of the chosen type"
      : "a legendary spell";
  const spend = ability.producesRestrictedMana
    ? ` Spend this mana only to cast ${spendWhat}${
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
  return `${cost}: ${describeEffect(ability.effect, definitions)}${from}${pain}${counter}${spend}${mark}${discount}${restriction}${counterGate}${oncePerGame}${fresher}${timing}`;
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
  /*
   * Dash, with its reminder text, because the keyword alone hides both riders -
   * a player reading "Dash {1}{R}" has no way to know the creature is hasty and
   * leaves at end of turn, and those are the two things that decide whether to
   * use it.
   */
  if (def.dashCost) {
    lines.push(
      `Dash ${formatManaCost(def.dashCost)} (You may cast this spell for its dash cost. If you do, it gains ` +
        "haste, and it's returned from the battlefield to its owner's hand at the beginning of the next end step.)",
    );
  }
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
  /*
   * Three rules added with the batch 2 and 3 leftovers, and every one of them
   * was the whole reason to play the card. Left off, Aven Mindcensor read as a
   * 2/1 flier with flash and nothing else at all.
   */
  if (def.staticRules?.opponentsNonbasicLandsEnterTapped) {
    lines.push("Nonbasic lands your opponents control enter tapped.");
  }
  if (def.staticRules?.opponentSearchesTopCards !== undefined) {
    lines.push(
      `If an opponent would search a library, that player searches the top ${countWord(
        def.staticRules.opponentSearchesTopCards,
      )} cards of that library instead.`,
    );
  }
  if (def.staticRules?.yourSpellsCantBeCountered) {
    lines.push("Spells you control can't be countered.");
  }
  /*
   * Windcrag Siege's Mardu half, which rendered as nothing at all - the panel
   * showed a card with one mode and a blank where the other should be.
   */
  if (def.staticRules?.doublesAttackTriggersWhenMode) {
    lines.push(
      `If ${def.staticRules.doublesAttackTriggersWhenMode} was chosen, if a creature attacking causes ` +
        "a triggered ability of a permanent you control to trigger, that ability triggers an additional time.",
    );
  }
  if (def.staticRules?.othersOfSubtypeMustAttack) {
    // "Other Goblin creatures you control attack each combat if able." The word
    // "other" is the card's and is load-bearing: the Rabblemaster itself is free
    // to stay home.
    lines.push(
      `Other ${def.staticRules.othersOfSubtypeMustAttack} creatures you control attack each combat if able.`,
    );
  }
  if (def.toxic) {
    // "Toxic 1 (Players dealt combat damage by this creature also get a poison
    // counter.)" The reminder text matters here - poison is rare enough in this
    // pool that the number alone would mean nothing.
    lines.push(
      `Toxic ${def.toxic} (Players dealt combat damage by this creature also get ${
        def.toxic === 1 ? "a poison counter" : `${def.toxic} poison counters`
      }.)`,
    );
  }
  if (def.cantBlock) lines.push(`This ${selfNoun(def)} can't block.`);
  if (def.setsBasePowerToughness !== undefined) {
    // A setting, not a bonus - the panel has to say "base", or it reads as an
    // anthem that stacks with counters rather than one that replaces them.
    lines.push(
      `Creatures you control have base power and toughness each equal to ${describeCount(
        typeof def.setsBasePowerToughness === "object" && def.setsBasePowerToughness.kind === "count"
          ? def.setsBasePowerToughness.of
          : { what: "creatures" },
      )}.`,
    );
  }
  if (def.isRoom) {
    // The reminder text, because a Room is unlike anything else here and the
    // panel is where a player finds out that the other half is still buyable.
    lines.push(
      "(You may cast either half. That door unlocks on the battlefield. As a sorcery, you may pay the mana cost of a locked door to unlock it.)",
    );
  }
  if (def.beginsOnBattlefield) {
    // Both clauses, because the second is what the offer costs - and the
    // "not the starting player" half is the whole reason Gemstone Caverns is a
    // catch-up card rather than a free land.
    const who = def.beginsOnBattlefield.notStartingPlayerOnly
      ? " and you're not the starting player"
      : "";
    const counter = def.beginsOnBattlefield.withCounter ? " with a luck counter on it" : "";
    const price = def.beginsOnBattlefield.thenExileFromHand
      ? " If you do, exile a card from your hand."
      : "";
    lines.push(
      `If this card is in your opening hand${who}, you may begin the game with it on the battlefield${counter}.${price}`,
    );
  }
  if (def.entersOnlyIfYouDiscard) {
    // Both halves, because the second is the card: a Mox Diamond cast off a
    // landless hand goes straight to the graveyard.
    const what = def.entersOnlyIfYouDiscard.cardType.toLowerCase();
    lines.push(
      `If this ${selfNoun(def)} would enter, you may discard a ${what} card instead. ` +
        `If you do, put it onto the battlefield. If you don't, put it into its owner's graveyard.`,
    );
  }
  if (def.doesNotUntap) {
    lines.push(`This ${selfNoun(def)} doesn't untap during your untap step.`);
  }
  if (def.staticRules?.skipDrawStep) lines.push("Skip your draw step.");
  if (def.staticRules?.maxHandSize !== undefined) {
    lines.push(`Your maximum hand size is ${countWord(def.staticRules.maxHandSize)}.`);
  }

  /*
   * "As this creature enters, choose a number." Without this the panel showed
   * Sanctum Prelate's restriction with no hint of where the number comes from,
   * which reads as a card that stops a mana value nobody picked.
   */
  if (def.enterChoice) {
    const what = describeEnterChoice(def.enterChoice);
    // The cards name their own type here - "As this **creature** enters" on
    // Sanctum Prelate, "As this **land** enters" on Multiversal Passage - so
    // the noun comes off the type line rather than being a flat "permanent".
    const noun =
      (["Creature", "Land", "Artifact", "Enchantment"] as const).find((t) => def.types.includes(t))?.toLowerCase() ??
      "permanent";
    lines.push(`As this ${noun} enters, ${what}.`);
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

  /*
   * "Can't be blocked except by creatures with flying or reach" - Signal Pest.
   *
   * The evasion *is* the card, so a panel without this line describes a 0/1 that
   * makes other attackers bigger and forgets to say why it survives to do it.
   */
  if (def.blockRestriction) {
    lines.push(
      `This ${selfNoun(def)} can't be blocked except by ${describeBlockRestriction(def.blockRestriction)}.`,
    );
  }

  /*
   * "Eomer enters with a +1/+1 counter on it for each other Human you control."
   *
   * A replacement on the way in rather than a trigger, and the panel says so -
   * without this line the card reads as a plain 2/2 for five.
   */
  if (def.entersWithCounters !== undefined) {
    lines.push(
      `This ${selfNoun(def)} enters with a +1/+1 counter on it for each ${
        typeof def.entersWithCounters !== "number" && def.entersWithCounters.kind === "count"
          ? describeCount(def.entersWithCounters.of)
          : countAmount(def.entersWithCounters)
      }.`,
    );
  }

  // "This land is the chosen type." Without it Multiversal Passage read as a
  // land that asks you to name a basic type and then does nothing with it.
  if (def.becomesChosenBasicType) lines.push(`This ${selfNoun(def)} is the chosen type.`);

  /*
   * Ascend, with its reminder text, because the keyword alone says nothing: a
   * player reading "Ascend" on Ocelot Pride has no way to connect it to the
   * "city's blessing" its own next line asks about.
   */
  if (def.ascend) {
    lines.push(
      "Ascend (If you control ten or more permanents, you get the city's blessing for the rest of the game.)",
    );
  }

  for (const buff of staticBuffsOf(def)) {
    lines.push(describeStaticBuff(buff, def, definitions));
  }

  /*
   * The hate pieces. Left off, the panel described Grand Abolisher as a vanilla
   * 2/2 for {W}{W} and Deafening Silence as an enchantment that does nothing at
   * all - which is the renderer's usual failure mode, and the reason the
   * whole-pool sweep in the tests exists.
   */

  for (const restriction of def.staticRestrictions ?? []) {
    lines.push(`${describeRestriction(restriction)}.`);
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
  if (replacement.kind === "double-damage-you-deal") {
    return (
      "If a source you control would deal damage to a permanent or player, " +
      "it deals double that damage to that permanent or player instead."
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

/**
 * The five ways a token count can be phrased, kept in one place so the
 * "tapped and attacking" rider has a single sentence to attach itself to.
 */
function describeCreateToken(
  effect: Extract<Effect, { kind: "createToken" }>,
  definitions: Definitions,
): string {
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

/**
 * The hate pieces, in the words the cards use.
 *
 * Shared by a permanent's `staticRestrictions` and by Silence's spell effect,
 * because the sentence is the same and only the duration differs.
 */
/**
 * "more than **one** spell", not "more than a spell".
 *
 * `countWord(1)` is deliberately the article "a", which is right in front of a
 * token's name ("create a 1/1 Soldier") and wrong after "more than", where the
 * cards print the numeral.
 */
function limitWord(n: number): string {
  return n === 1 ? "one" : countWord(n);
}

export function describeRestriction(restriction: ActionRestriction): string {
  switch (restriction.kind) {
    case "cast-limit": {
      const what =
        restriction.only === "noncreature"
          ? "noncreature spell"
          : restriction.only === "nonartifact"
            ? "nonartifact spell"
            : "spell";
      const plural = restriction.perTurn === 1 ? "" : "s";
      return `Each player can't cast more than ${limitWord(restriction.perTurn)} ${what}${plural} each turn`;
    }
    case "opponents-cannot-cast": {
      const what = restriction.only === "noncreature" ? "noncreature spells" : "spells";
      return restriction.duringYourTurnOnly
        ? `During your turn, your opponents can't cast ${what}`
        : `Your opponents can't cast ${what}`;
    }
    case "opponents-cast-from-hand-only":
      return "Your opponents can't cast spells from anywhere other than their hands";
    case "cannot-activate": {
      const types = listAnd(restriction.types.map((t) => `${t.toLowerCase()}s`));
      const who = restriction.who === "opponents" ? "your opponents" : "players";
      const when = restriction.duringYourTurnOnly ? "During your turn, " : "";
      return restriction.who === "opponents"
        ? `${when}${who} can't activate abilities of ${types}`
        : `Activated abilities of ${types} can't be activated`;
    }
    case "cannot-cast-chosen-mana-value":
      return `${restriction.only === "noncreature" ? "Noncreature spells" : "Spells"} with mana value equal to the chosen number can't be cast`;
    case "draw-limit":
      return `Each player can't draw more than ${limitWord(restriction.perTurn)} card${
        restriction.perTurn === 1 ? "" : "s"
      } each turn`;
  }
}
