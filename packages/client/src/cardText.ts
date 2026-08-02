import type {
  ActivatedAbility,
  CardDefinition,
  Effect,
  TargetSelector,
  TriggeredAbility,
} from "@mtg-commander-sim/engine";
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
      return "target creature";
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
    case "gainLife":
      return `You gain ${effect.amount} life.`;
    case "addCounter":
      return `Put ${effect.amount} +1/+1 ${plural(effect.amount, "counter")} on this creature.`;
    case "addCounterToEachOther":
      return `Put ${effect.amount} +1/+1 ${plural(effect.amount, "counter")} on each other ${
        effect.subtype ?? "creature"
      } you control.`;
    case "doublePower":
      return "Double this creature's power until end of turn.";
    case "destroy":
      return `Destroy ${describeTarget(effect.target)}.`;
    case "exile":
      return `Exile ${describeTarget(effect.target)}.`;
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

function describeTrigger(ability: TriggeredAbility, definitions: Definitions): string {
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
  }
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function describeActivated(ability: ActivatedAbility, definitions: Definitions): string {
  const costs: string[] = [];
  if (ability.cost.mana) costs.push(formatManaCost(ability.cost.mana));
  if (ability.cost.tap) costs.push("{T}");
  const cost = costs.length > 0 ? costs.join(", ") : "{0}";
  return `${cost}: ${describeEffect(ability.effect, definitions)}`;
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

  if (def.staticBuff) {
    const who = def.staticBuff.subtype ? `${def.staticBuff.subtype}s` : "creatures";
    lines.push(
      `Other ${who} you control get ${signed(def.staticBuff.power)}/${signed(def.staticBuff.toughness)}.`,
    );
  }

  for (const trigger of def.triggeredAbilities ?? []) {
    lines.push(describeTrigger(trigger, definitions));
  }
  for (const ability of def.activatedAbilities ?? []) {
    lines.push(describeActivated(ability, definitions));
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
