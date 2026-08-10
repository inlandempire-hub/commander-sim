import type {
  ActivatedAbility,
  BoardCondition,
  CardDefinition,
  Color,
  Effect,
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
      return `target ${listOr(selector.cardTypes.map((t) => `${prefix}${t.toLowerCase()}`))}`;
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
    case "preventDamage":
      return `Prevent the next ${effect.amount} damage that would be dealt to ${describeTarget(
        effect.target,
      )} this turn.`;
    case "addCounter":
      return `Put ${effect.amount} +1/+1 ${plural(effect.amount, "counter")} on this creature.`;
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
      const name = token ? tokenName(token) : effect.tokenDefinitionId;
      return `Create ${effect.count} ${name} ${plural(effect.count, "token")}.`;
    }
    case "pump": {
      const who = effect.target ? describeTarget(effect.target) : "this creature";
      return sentence(
        `${who} gets ${signed(effect.power)}/${signed(effect.toughness)} until end of turn.`,
      );
    }
    case "pumpAll": {
      const who = effect.scope === "controller" ? "Creatures you control" : "All creatures";
      return `${who} get ${signed(effect.power)}/${signed(effect.toughness)} until end of turn.`;
    }
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
      const where =
        effect.destination === "hand"
          ? "into your hand"
          : `onto the battlefield${effect.tapped ? " tapped" : ""}`;
      return `Search your library for ${what}, put it ${where}, then shuffle.`;
    }
  }
}

/** "2/2 white Cat" reads better on a token than its full type line does. */
function tokenName(token: CardDefinition): string {
  const stats = token.power !== undefined ? `${token.power}/${token.toughness} ` : "";
  return `${stats}${token.name}`;
}

/** "creature", "Aura", "permanent" - what a watcher is looking out for. */
function watchedNoun(watchFor: TriggeredAbility["watchFor"]): string {
  const base = watchFor?.subtype ?? watchFor?.type?.toLowerCase() ?? "permanent";
  // "nontoken creature" is printed as one noun phrase, so it belongs here
  // rather than as a clause tacked on the end.
  return watchFor?.nontoken ? `nontoken ${base}` : base;
}

/** "a creature you control with a +1/+1 counter on it" - the whole subject. */
function watchedSubject(ability: TriggeredAbility, self: CardDefinition): string {
  const noun = watchedNoun(ability.watchFor);
  const whose = (ability.watches ?? "controller") === "any" ? noun : `${noun} you control`;
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
      return `if ${describeCondition(condition.condition).replace(/^you control /, "you control no ")}`;
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
      return `Whenever this creature attacks, ${tail}`;
    case "dies":
      return `When this creature dies, ${tail}`;
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

  if (def.staticBuff) {
    const who = def.staticBuff.subtype ? `${def.staticBuff.subtype}s` : "creatures";
    lines.push(
      `Other ${who} you control get ${signed(def.staticBuff.power)}/${signed(def.staticBuff.toughness)}.`,
    );
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

/** Converted mana cost / mana value - what the curve is bucketed by. */
export function manaValue(def: CardDefinition): number {
  if (!def.manaCost) return 0;
  return (
    def.manaCost.generic +
    Object.values(def.manaCost.colors).reduce((sum, n) => sum + (n ?? 0), 0)
  );
}
