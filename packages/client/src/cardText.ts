import type {
  ActivatedAbility,
  BoardCondition,
  CardDefinition,
  Color,
  Effect,
  TargetSelector,
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
    case "permanent":
      return `target ${selector.cardType.toLowerCase()}`;
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
      return `Draw ${effect.amount} ${plural(effect.amount, "card")}.`;
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
    case "searchLibrary": {
      const what = effect.basicLandOnly
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
  if (!watchFor) return "permanent";
  if (watchFor.subtype) return watchFor.subtype;
  if (watchFor.type) return watchFor.type.toLowerCase();
  return "permanent";
}

function describeTrigger(
  ability: TriggeredAbility,
  definitions: Definitions,
  self: CardDefinition,
): string {
  const body = describeEffect(ability.effect, definitions);
  switch (ability.event) {
    case "enters-battlefield":
      return `When this permanent enters the battlefield, ${lowerFirst(body)}`;
    case "attacks":
      return `Whenever this creature attacks, ${lowerFirst(body)}`;
    case "dies":
      return `When this creature dies, ${lowerFirst(body)}`;
    case "landfall":
      return `Landfall - whenever a land enters the battlefield under your control, ${lowerFirst(body)}`;
    case "gain-life":
      return `Whenever you gain life, ${lowerFirst(body)}`;
    case "permanent-enters": {
      // Worded to match the printed card, because these variants really do
      // play differently and the panel is where you find that out: what is
      // watched, whose it has to be, and whether this card counts itself.
      const noun = watchedNoun(ability.watchFor);
      const whose = (ability.watches ?? "controller") === "any" ? noun : `${noun} you control`;
      // "another" only if this card is itself the kind of thing it watches.
      // Tanglespan Lookout is a Satyr watching Auras, so it reads "an Aura you
      // control"; Soul Warden is a creature watching creatures, so "another".
      const selfQualifies = matchesWatchFor(ability.watchFor, self);
      const subject = ability.includesSelf
        ? `this ${noun} or another ${whose}`
        : selfQualifies
          ? `another ${whose}`
          : `${article(whose)} ${whose}`;
      return `Whenever ${subject} enters the battlefield, ${lowerFirst(body)}`;
    }
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
  const costs: string[] = [];
  if (ability.cost.mana) costs.push(formatManaCost(ability.cost.mana));
  if (ability.cost.tap) costs.push("{T}");
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
