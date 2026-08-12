import type {
  ActivatedAbility,
  BoardCondition,
  CardDefinition,
  Color,
  Amount,
  Effect,
  ReplacementEffect,
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
      return "target player";
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
      return `target ${noun}${whose}`;
    }
    case "card-in-your-graveyard":
      return selector.cardType
        ? `target ${selector.cardType.toLowerCase()} card in your graveyard`
        : "target card in your graveyard";
    case "card-in-your-exile":
      return selector.cardType
        ? `target ${selector.cardType.toLowerCase()} card you own in exile`
        : "target card you own in exile";
  }
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
  return amount.negate ? "-X" : "+X";
}

export function describeEffect(effect: Effect, definitions: Definitions = {}): string {
  switch (effect.kind) {
    case "damage":
      return `Deal ${effect.amount} damage to ${describeTarget(effect.target)}.`;
    case "draw":
      // "Draw a card", not "Draw 1 card" - no printed card says the latter.
      return effect.amount === 1 ? "Draw a card." : `Draw ${effect.amount} cards.`;
    case "addMana":
      return `Add ${`{${effect.color}}`.repeat(effect.amount)}.`;
    case "addManaCombination":
      return `Add ${effect.mana
        .map((part) => `{${part.color}}`.repeat(part.amount))
        .join("")}.`;
    case "gainLife":
      return `You gain ${effect.amount} life.`;
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
    case "preventDamage":
      return `Prevent the next ${effect.amount} damage that would be dealt to ${describeTarget(
        effect.target,
      )} this turn.`;
    case "addCounter": {
      // Same optional-target convention as `pump`: named on Duskshell Crawler,
      // unnamed on "{cost}: put a +1/+1 counter on this creature".
      const who = effect.target ? describeTarget(effect.target) : "this creature";
      // "a +1/+1 counter", not "1 +1/+1 counter" - no printed card says the latter.
      return sentence(
        `Put ${countWord(effect.amount)} +1/+1 ${plural(effect.amount, "counter")} on ${who}.`,
      );
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
      // "Create that many ..." - Hornet Nest, where the count is the damage
      // the event carried and is not known until it fires.
      if (typeof effect.count !== "number") {
        return `Create that many ${name.replace(" token", " tokens")}.`;
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
      return sentence(
        `${who} gets ${signed(effect.power)}/${signed(effect.toughness)} until end of turn.`,
      );
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
      if (effect.grants?.length) parts.push(`gain ${listAnd(effect.grants.map((k) => k.toLowerCase()))}`);
      return `${who} ${parts.join(" and ")} until end of turn.`;
    }
    case "loseLife":
      // Loss, not damage, and the panel says so - a player who reads "deals 1
      // damage to each opponent" will expect prevention and lifelink to matter.
      return effect.who === "target" && effect.target
        ? sentence(`${describeTarget(effect.target)} loses ${effect.amount} life.`)
        : `Each opponent loses ${effect.amount} life.`;
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
  const base = watchFor?.subtype ?? typeNoun ?? "permanent";
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
function describeStaticBuff(buff: NonNullable<CardDefinition["staticBuff"]>): string {
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
        : `${buff.includesSelf ? "" : "Other "}${noun} you control`;

  const parts: string[] = [];
  if (buff.power !== 0 || buff.toughness !== 0) {
    parts.push(`${singular ? "gets" : "get"} ${signed(buff.power)}/${signed(buff.toughness)}`);
  }
  if (buff.grants?.length) {
    parts.push(`${singular ? "has" : "have"} ${listAnd(buff.grants.map((k) => k.toLowerCase()))}`);
  }
  return sentence(`${subject} ${parts.join(" and ")}.`);
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
    case "not":
      return `if ${negateCondition(condition.condition)}`;
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
  return `${cost}: ${describeEffect(ability.effect, definitions)}${from}${pain}${spend}${restriction}`;
}

/**
 * Every line of rules text a card has, in printed order: keywords, static
 * buffs, triggers, activated abilities, and (for instants/sorceries) what the
 * spell itself does. Returns an array so the UI can decide how to lay it out.
 */
export function describeCard(def: CardDefinition, definitions: Definitions = {}): string[] {
  const lines: string[] = [];

  // Ward is the one keyword that carries a cost, so it prints with it.
  const keywords: string[] = (def.keywords ?? []).map((keyword) =>
    keyword === "Ward" && def.wardCost ? `Ward ${formatManaCost(def.wardCost)}` : keyword,
  );
  if (keywords.length > 0) lines.push(keywords.join(", "));

  if (def.cantBeCountered) lines.push("This spell can't be countered.");

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
    lines.push(describeStaticBuff(def.staticBuff));
  }

  for (const replacement of def.replacementEffects ?? []) {
    lines.push(describeReplacement(replacement));
  }

  for (const trigger of def.triggeredAbilities ?? []) {
    lines.push(describeTrigger(trigger, definitions, def));
  }
  for (const ability of def.activatedAbilities ?? []) {
    lines.push(describeActivated(ability, definitions, def));
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
