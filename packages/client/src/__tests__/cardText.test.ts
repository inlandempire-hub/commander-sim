import { describe, expect, it } from "vitest";
import { staticBuffsOf, TEST_CARD_DEFINITIONS, type CardDefinition } from "@mtg-commander-sim/engine";
import { describeActivated, describeCard, tokenName } from "../cardText.js";
import { formatManaCost } from "../format.js";
import { manaSymbols } from "../manaSymbols.js";

/**
 * The card panel is the only place a player reads what a card does - there is
 * no printed card to check against. So anything a fixture carries that the
 * renderer does not know about is a card that silently reads better, or worse,
 * than it is.
 */

/** Whether any node anywhere in a fixture satisfies this test. */
function hasNode(node: unknown, test: (n: Record<string, unknown>) => boolean): boolean {
  if (Array.isArray(node)) return node.some((child) => hasNode(child, test));
  if (node === null || typeof node !== "object") return false;
  const record = node as Record<string, unknown>;
  if (test(record)) return true;
  return Object.values(record).some((child) => hasNode(child, test));
}

/** Whether anything in this fixture points at "target attacking" something. */
function hasAttackingSelector(node: unknown): boolean {
  if (Array.isArray(node)) return node.some(hasAttackingSelector);
  if (node === null || typeof node !== "object") return false;
  const record = node as Record<string, unknown>;
  if (record.kind === "permanent" && record.attacking === true) return true;
  return Object.values(record).some(hasAttackingSelector);
}

function textOf(id: string): string {
  const def = TEST_CARD_DEFINITIONS[id];
  if (!def) throw new Error(`no fixture ${id}`);
  return describeCard(def, TEST_CARD_DEFINITIONS).join("\n");
}

describe("lands and mana rocks", () => {
  it("says a tapland enters tapped", () => {
    // Left out, Golgari Guildgate reads as a free dual land. The drawback is
    // the entire cost of the card.
    expect(textOf("golgari-guildgate")).toContain("This land enters tapped.");
  });

  it("puts the drawback before the abilities, as the card prints it", () => {
    const lines = describeCard(TEST_CARD_DEFINITIONS["golgari-guildgate"]!, TEST_CARD_DEFINITIONS);
    expect(lines[0]).toBe("This land enters tapped.");
  });

  it("says nothing of the sort about a land that does not", () => {
    expect(textOf("bayou")).not.toContain("enters tapped");
  });

  it("calls a card by its own type, as the card does", () => {
    // Scryfall prints "This artifact enters tapped." on Charcoal Diamond, not
    // "This permanent" - the renderer used to flatten every nonland to
    // "permanent", which read as a house style rather than the card.
    expect(textOf("charcoal-diamond")).toContain("This artifact enters tapped.");
    expect(textOf("golgari-guildgate")).toContain("This land enters tapped.");
  });

  it("renders colourless mana", () => {
    expect(textOf("sol-ring")).toContain("Add {C}{C}.");
  });

  it("renders a dual land as both halves", () => {
    const text = textOf("bayou");
    expect(text).toContain("Add {B}.");
    expect(text).toContain("Add {G}.");
  });

  it("renders a land's enters-the-battlefield trigger", () => {
    expect(textOf("radiant-fountain")).toContain("2 life");
  });

  it("says what a conditional tapland's condition is", () => {
    /*
     * "This land enters tapped." on its own is the wrong card. Deathcap Glade
     * is priced as a dual that comes in untapped from turn three onward, and a
     * panel that only shows the drawback understates it exactly as badly as
     * leaving the drawback off would overstate Golgari Guildgate.
     */
    expect(textOf("deathcap-glade")).toContain(
      "This land enters tapped unless you control 2 or more other lands.",
    );
    expect(textOf("woodland-cemetery")).toContain(
      "This land enters tapped unless you control a Swamp or a Forest.",
    );
    expect(textOf("undergrowth-stadium")).toContain(
      "This land enters tapped unless you have 2 or more opponents.",
    );
  });

  it("says a painland hurts, in the card's own words", () => {
    // The printed wording names the card's type: "This land deals 1 damage to
    // you" on Llanowar Wastes, "This creature" on Elves of Deep Shadow.
    expect(textOf("llanowar-wastes")).toContain("{T}: Add {B}. This land deals 1 damage to you.");
    expect(textOf("elves-of-deep-shadow")).toContain("This creature deals 1 damage to you.");
    // And says nothing of the sort about the colourless half, which is free.
    expect(textOf("llanowar-wastes")).toContain("{T}: Add {C}.");
  });

  it("says when a restricted ability may be used", () => {
    expect(textOf("tainted-wood")).toContain("Activate only if you control a Swamp.");
    expect(textOf("wastewood-verge")).toContain(
      "Activate only if you control a Swamp or a Forest.",
    );
    expect(textOf("sapseep-forest")).toContain(
      "Activate only if you control 2 or more green permanents.",
    );
  });

  it("renders a filter land's cost as one hybrid symbol", () => {
    const text = textOf("twilight-mire");
    expect(text).toContain("{B/G}, {T}: Add {B}{G}.");
    expect(text).toContain("{B/G}, {T}: Add {B}{B}.");
  });

  it("lists the types a regenerate ability may point at", () => {
    expect(textOf("swarmyard")).toContain(
      "Regenerate target Insect, Rat, Spider, or Squirrel.",
    );
  });

  it("describes every land in the pool rather than leaving one blank", () => {
    // A card whose panel is empty looks broken, and is how a fixture carrying
    // something the renderer has never heard of shows up.
    for (const def of Object.values(TEST_CARD_DEFINITIONS)) {
      if (!def.types.includes("Land")) continue;
      expect(describeCard(def, TEST_CARD_DEFINITIONS).length, def.name).toBeGreaterThan(0);
    }
  });
});

/**
 * The trigger families added on 2026-08-10. Each expectation is the printed
 * card, near enough that a reader can hold the two side by side - which is the
 * only way this renderer is ever checked for being *right* rather than merely
 * non-empty.
 */
describe("triggers that are not about entering the battlefield", () => {
  it("names whose step a turn-based trigger watches", () => {
    // "Morbid - At the beginning of each end step, if a creature died this
    // turn, you may draw a card."
    expect(textOf("deathreap-ritual")).toContain(
      "At the beginning of each end step, if a creature died this turn, you may draw a card.",
    );
  });

  it("renders a death watcher with its counter filter", () => {
    // "Whenever a creature you control with a +1/+1 counter on it dies, draw a card."
    expect(textOf("meltstrider-eulogist")).toContain(
      "Whenever a creature you control with a +1/+1 counter on it dies, draw a card.",
    );
  });

  it("says 'you may' where the card does", () => {
    // Lifegift: "Whenever a land enters, you may gain 1 life." Not "you may
    // you gain 1 life" - the effect text already speaks about you.
    expect(textOf("lifegift")).toContain("you may gain 1 life.");
    expect(textOf("lifegift")).not.toContain("you may you");
  });

  it("distinguishes a landfall that watches every player from one that does not", () => {
    // Lifegift says "a land enters"; Eumidian Terrabotanist says "a land you
    // control enters", and the difference is whether an opponent's fetchland
    // pays you.
    expect(textOf("lifegift")).toContain("Whenever a land enters the battlefield,");
    expect(textOf("eumidian-terrabotanist")).toContain("under your control");
  });

  it("renders an attacks trigger whose effect is not a counter", () => {
    expect(textOf("shopkeepers-bane")).toContain("Whenever this creature attacks, you gain 2 life.");
  });

  it("writes 'draw a card', which is what cards actually print", () => {
    expect(textOf("tanglespan-lookout")).toContain("draw a card.");
    expect(textOf("tanglespan-lookout")).not.toContain("draw 1 card");
  });
});

/**
 * Sacrifice, and a defect it uncovered.
 *
 * Every fetchland's panel used to read "{T}: Search your library for a land
 * card, put it onto the battlefield, then shuffle" - no life, no sacrifice, no
 * restriction on what it finds. That is a free repeatable unrestricted tutor,
 * which is a strictly better card than the one being played. Nobody noticed
 * because nothing asserted the cost was there.
 */
describe("costs and searches, printed in full", () => {
  it("prints a fetchland's whole cost, not just the tap", () => {
    // "{T}, Pay 1 life, Sacrifice this land: Search your library for a Swamp or
    // Mountain card, put it onto the battlefield, then shuffle."
    const text = textOf("bloodstained-mire");
    expect(text).toContain("{T}, Pay 1 life, Sacrifice this land:");
    expect(text).toContain("a Swamp or Mountain card");
  });

  it("prints every fetchland's life payment and sacrifice", () => {
    // One assertion per card is how the first one got missed. This one catches
    // any fetch added later that quietly renders as free.
    for (const def of Object.values(TEST_CARD_DEFINITIONS)) {
      for (const ability of def.activatedAbilities ?? []) {
        if (!ability.cost.sacrificeSelf) continue;
        const line = describeActivated(ability, TEST_CARD_DEFINITIONS, def);
        expect(line, def.name).toContain("Sacrifice this ");
        if (ability.cost.payLife !== undefined) {
          expect(line, def.name).toContain(`Pay ${ability.cost.payLife} life`);
        }
      }
    }
  });

  it("names both card types and the noncreature restriction", () => {
    // Haywire Mite: "{G}, Sacrifice this creature: Exile target noncreature
    // artifact or noncreature enchantment."
    expect(textOf("haywire-mite")).toContain(
      "{G}, Sacrifice this creature: Exile target noncreature artifact or noncreature enchantment.",
    );
  });

  it("reads a sequenced trigger as one line of prose", () => {
    // Riveteers Overlook, and "this land" rather than "this permanent" - which
    // is a phrase no printed card uses.
    const text = textOf("riveteers-overlook");
    expect(text).toContain("When this land enters the battlefield, sacrifice it.");
    expect(text).toContain("a basic Swamp, Mountain, or Forest card");
    expect(text).toContain("You gain 1 life.");
  });
});

/**
 * Minted tokens.
 *
 * A token's colour and keywords are its whole identity - the pool now holds a
 * 1/1 green Insect and a 1/1 green Insect with flying and deathtouch, and
 * "1/1 Insect" describes both. The panel has to tell them apart.
 */
describe("tokens, as the card prints them", () => {
  it("names the count, colour, subtype and keywords", () => {
    // "When this creature enters, create four 1/1 green Insect creature tokens
    // with flying and deathtouch."
    expect(textOf("hornet-queen")).toContain(
      "create four 1/1 green Insect creature tokens with flying and deathtouch.",
    );
  });

  it("uses the article for one, not the digit", () => {
    // "create a 1/1 black Snake creature token with deathtouch" - no card
    // prints "create 1 Snake token".
    expect(textOf("ophiomancer")).toContain("create a 1/1 black Snake creature token with deathtouch.");
  });

  it("negates a board condition in the card's own words", () => {
    // "if you control no Snakes". Built from the condition's parts - editing
    // the positive sentence produced "if you control no a Snake".
    expect(textOf("ophiomancer")).toContain("if you control no Snakes,");
    expect(textOf("ophiomancer")).not.toContain("no a ");
  });

  it("describes every token in the pool distinctly", () => {
    /*
     * Two tokens rendering identically is the failure this guards: it would
     * mean the panel cannot tell you which one a card actually makes.
     *
     * This used to build its own key out of stats, colour and keywords rather
     * than rendering anything - so despite the name it was testing the
     * fixtures, not the renderer, and it passed on a renderer that could not
     * tell two tokens apart at all. The two Pests are exactly that case: same
     * body, same colours, no keywords, and different rules text.
     *
     * `tokenName` and not `describeCard`: rules text alone is empty for a
     * vanilla token, so the Soldier and the Saproling would collide on a
     * renderer that is working perfectly.
     */
    const rendered = Object.values(TEST_CARD_DEFINITIONS)
      .filter((def) => def.isToken)
      .map((def) => tokenName(def));
    expect(new Set(rendered).size).toBe(rendered.length);
  });

  it("prints a granted keyword, which used to vanish from the panel", () => {
    // staticBuff only ever adjusted power and toughness, so a panel that
    // dropped "and have menace" read as a complete card that was simply worse.
    expect(textOf("blight-mound")).toContain("Attacking Pests you control get +1/+0 and have menace.");
    expect(textOf("duskshell-crawler")).toContain(
      "Each creature you control with a +1/+1 counter on it has trample.",
    );
  });

  it("drops a +0/+0 from a card that is entirely about its keywords", () => {
    // Heroic Intervention is +0/+0. "Permanents you control get +0/+0 and gain
    // hexproof" buries the card under a number that means nothing.
    expect(textOf("heroic-intervention")).toBe(
      "Permanents you control gain hexproof and indestructible until end of turn.",
    );
  });

  it("names the target on a trigger that chooses one", () => {
    expect(textOf("duskshell-crawler")).toContain(
      "When this creature enters the battlefield, put a +1/+1 counter on target creature.",
    );
    // Both halves of the sequence, and each aimed at the right person.
    expect(textOf("blood-artist")).toBe(
      "Whenever a creature dies, target player loses 1 life. You gain 1 life.",
    );
  });

  it("says what a shockland costs", () => {
    // This used to render as "{T}: Add {B}. {T}: Add {G}." - an unconditional
    // untapped dual, which is a better card than the one being played.
    expect(textOf("overgrown-tomb")).toContain(
      "As this land enters, you may pay 2 life. If you don't, it enters tapped.",
    );
  });

  it("renders the two new trigger events in the card's own words", () => {
    expect(textOf("arasta-of-the-endless-web")).toContain(
      "Whenever an opponent casts an instant or sorcery spell,",
    );
    expect(textOf("hornet-nest")).toContain("Whenever this creature is dealt damage, create that many");
  });

  it("renders surveil and every mode of a charm", () => {
    // Lowercased by the trigger prefix, as every effect tail is.
    expect(textOf("underground-mortuary")).toContain(
      "When this land enters the battlefield, surveil 1.",
    );
    const charm = textOf("golgari-charm");
    expect(charm).toContain("All creatures get -1/-1 until end of turn");
    expect(charm).toContain("Destroy target enchantment");
    expect(charm).toContain("Regenerate each creature you control");
  });

  it("quotes a token's own rules text, which is all that tells two Pests apart", () => {
    expect(textOf("blight-mound")).toContain(
      'Pest creature token with "When this token dies, you gain 1 life."',
    );
    expect(textOf("send-in-the-pest")).toContain(
      'Pest creature token with "Whenever this token attacks, you gain 1 life."',
    );
  });
});

/**
 * The three cards added on 2026-08-10, and the wordings that could go wrong.
 */
describe("rituals, top-of-library tutors and a rider somebody else answers", () => {
  it("prints a ritual in mana symbols, as the card does", () => {
    // "Add {B}{B}{B}." - three separate pips, not "Add 3 black mana".
    expect(textOf("dark-ritual")).toContain("Add {B}{B}{B}.");
  });

  it("keeps the shuffle before the card goes on top", () => {
    // "Search your library for a creature card, then shuffle and put that card
    // on top." Printed the other way round it would describe a card that finds
    // something and then loses it again.
    const text = textOf("sylvan-tutor");
    expect(text).toContain("then shuffle and put that card on top");
    expect(text).not.toContain("on top, then shuffle");
  });

  it("names the opponent restriction, so the card does not read as unrestricted removal", () => {
    expect(textOf("assassins-trophy")).toContain("target permanent an opponent controls");
  });

  it("says whose library the rider searches", () => {
    // "Its controller may search their library" - printed as "your library"
    // this would read as though Assassin's Trophy ramped the caster.
    const text = textOf("assassins-trophy");
    expect(text).toContain("Its controller may search their library");
    expect(text).not.toContain("Search your library for a basic land");
  });
});

/**
 * Replacement effects read as replacements, not as things that happen after.
 */
describe("replacement effects", () => {
  it("keeps the 'if an effect would ... instead' shape", () => {
    const text = textOf("doubling-season");
    expect(text).toContain("If an effect would create one or more tokens under your control");
    expect(text).toContain("twice that many");
    expect(text).toContain("instead");
  });

  it("says which permanents a narrowed one covers", () => {
    // "an artifact or creature you control" - printed as "a permanent" this
    // would read as Doubling Season with a body attached.
    expect(textOf("winding-constrictor")).toContain("artifact or creature you control");
    expect(textOf("winding-constrictor")).toContain("that many plus 1");
  });

  it("does not print a narrowing Doubling Season never had", () => {
    expect(textOf("doubling-season")).toContain("a permanent you control");
  });
});

/**
 * {X}, which the panel must show as a symbol rather than a number.
 */
describe("X in a cost", () => {
  it("prints -X/-X rather than a value", () => {
    // The panel is read *before* deciding what to cast it for, so a number
    // there would be showing a decision the player has not made yet.
    const text = textOf("the-meathook-massacre");
    expect(text).toContain("all creatures get -X/-X until end of turn.");
  });

  it("distinguishes the two death triggers by who controlled the creature", () => {
    // Printed identically these are the same ability twice, and the card reads
    // as one that drains you when your own creature dies *and* gains you life
    // for it. The renderer dropped the filter until this test was written.
    const text = textOf("the-meathook-massacre");
    expect(text).toContain("Whenever a creature you control dies, each opponent loses 1 life.");
    expect(text).toContain("Whenever a creature an opponent controls dies, you gain 1 life.");
  });

  it("shows the {X} in the printed cost", () => {
    const def = TEST_CARD_DEFINITIONS["the-meathook-massacre"]!;
    expect(def.manaCost?.x).toBe(1);
  });
});

/*
 * The nine fields the renderer used to walk straight past.
 *
 * Found by building the card lab (2026-08-14): with 93 panels stood up beside
 * the cards they describe, a dropped clause is obvious in a way it never is one
 * card at a time. Every one of these was a card that read as something other
 * than what it is - usually better, which is the direction that loses games.
 */
describe("clauses the renderer used to drop", () => {
  it("prints a planeswalker's loyalty abilities at all", () => {
    // Grist's panel was blank below the type line: three abilities, no text.
    const text = textOf("grist-the-hunger-tide");
    expect(text).toContain("+1:");
    expect(text).toContain("-2:");
    expect(text).toContain("-5:");
    expect(text).toContain("As long as this card isn't on the battlefield, it's a 1/1 Insect creature");
  });

  it("says how a suspended card is played, when it has no other way in", () => {
    // Profane Tutor has no mana cost. Without this line its panel described a
    // spell there was no legal way to cast.
    expect(textOf("profane-tutor")).toContain("Suspend 2-{1}{B}");
  });

  it("scopes an Equipment's buff to the equipped creature", () => {
    // "Other creatures you control get +1/-1" is a board wipe of your own
    // one-toughness creatures, not a card anybody would equip.
    const text = textOf("skullclamp");
    expect(text).toContain("Equipped creature gets +1/-1.");
    expect(text).not.toContain("Other creatures");
    expect(text).toContain("Activate only as a sorcery.");
  });

  it("scopes a bestowed Aura's buff, and says it can be bestowed", () => {
    const text = textOf("springheart-nantuko");
    expect(text).toContain("Bestow {1}{G}");
    expect(text).toContain("Enchanted creature gets +1/+1.");
  });

  it("does not print an empty sentence for a buff that only grants an ability", () => {
    // Springleaf Parade rendered as "Other creatures you control ." - a subject,
    // a space and a full stop, which reads as text that failed to load.
    const text = textOf("springleaf-parade");
    expect(text).not.toMatch(/ \.$/m);
    expect(text).toContain("Creature tokens you control");
    expect(text).toContain("Add one mana of any colour");
  });

  it("prints a granted triggered ability in quotes", () => {
    // Root Manipulation read as a plain pump-and-menace trick.
    const text = textOf("root-manipulation");
    expect(text).toContain("whenever this creature attacks, you gain 1 life");
    expect(text).toContain("menace");
  });

  it("prints the rider on the mana rather than only the mana", () => {
    expect(textOf("path-of-ancestry")).toContain("shares a creature type with your commander, scry 1");
    expect(textOf("twitching-doll")).toContain("Put a counter on this creature.");
  });

  it("prints both of Necrodominance's costs", () => {
    // Without them the card reads as a free draw engine rather than one you can
    // lose to.
    const text = textOf("necrodominance");
    expect(text).toContain("Skip your draw step.");
    expect(text).toContain("Your maximum hand size is five.");
  });

  it("says how many tokens a card makes when the count is not a plain number", () => {
    // "Create that many" with no preceding sentence to give "that many" a
    // meaning - so the panel simply did not say how many.
    expect(textOf("springleaf-parade")).toContain("create X 1/1");
    expect(textOf("iridescent-hornbeetle")).toContain("for each +1/+1 counter you've put on creatures");
    expect(textOf("ribtruss-roaster")).toContain("for each counter on this creature");
    expect(textOf("arachnogenesis")).toContain("for each creature attacking you");
    // Pest Infestation prints {X} twice and doubles the tokens on top, so a
    // plain "X" halves the card.
    expect(textOf("pest-infestation")).toContain("twice X");
    // Hornet Nest is the one card where "that many" is the printed wording -
    // the sentence before it named the damage.
    expect(textOf("hornet-nest")).toContain("is dealt damage, create that many");
  });

  it("says 'up to one target', not 'up to a target'", () => {
    expect(textOf("moseo-veins-new-dean")).toContain("up to one target creature card");
  });

  it("mentions devour", () => {
    expect(textOf("ribtruss-roaster")).toContain("Devour 1");
  });

  it("prints one line for the one ability the card prints, not five", () => {
    // The engine holds "add one mana of any colour" as five abilities, one per
    // colour, because each is separately legal or not. Printed as five it takes
    // over the panel - Path of Ancestry was five near-identical lines, each
    // repeating the whole scry rider, for a card whose text is two sentences.
    const path = describeCard(TEST_CARD_DEFINITIONS["path-of-ancestry"]!, TEST_CARD_DEFINITIONS);
    expect(path.filter((line) => line.includes("Add"))).toHaveLength(1);
    // And the parenthetical folds into the sentence rather than trailing after
    // it, contradicting what it just said.
    expect(path.join("\n")).toContain("Add one mana of any colour in your commander's colour identity.");
    expect(path.join("\n")).not.toContain("colour. (any colour");

    const tower = describeCard(TEST_CARD_DEFINITIONS["command-tower"]!, TEST_CARD_DEFINITIONS);
    expect(tower).toHaveLength(1);

    // Delighted Halfling's plain {C} ability is not one of the five and stays
    // on its own line.
    const halfling = describeCard(TEST_CARD_DEFINITIONS["delighted-halfling"]!, TEST_CARD_DEFINITIONS);
    expect(halfling).toHaveLength(2);
    expect(halfling[0]).toBe("{T}: Add {C}.");
  });

  it("leaves abilities that differ in more than their colour alone", () => {
    // Llanowar Wastes and Tainted Wood have two coloured halves, not five, and
    // Twilight Mire's three outputs are not one-per-colour at all. Folding any
    // of them would be inventing colours the card cannot make.
    const wastes = describeCard(TEST_CARD_DEFINITIONS["llanowar-wastes"]!, TEST_CARD_DEFINITIONS);
    expect(wastes).toHaveLength(3);
    expect(textOf("twilight-mire")).toContain("{B/G}, {T}: Add {B}{B}.");
  });
});

/*
 * A field-by-field sweep of the whole pool, which is the part that matters
 * going forward. Each entry names a fixture field and a fragment its panel must
 * therefore contain; a fixture that sets the field and produces no such
 * fragment fails.
 *
 * Cheaper than a test per card, and it covers cards nobody has written a test
 * for yet - which is the point. The renderer's failure mode is silence, and
 * silence is invisible one card at a time.
 */
describe("no fixture carries a clause the panel never mentions", () => {
  const checks: Array<{
    field: string;
    applies: (def: CardDefinition) => boolean;
    expect: RegExp;
  }> = [
    {
      field: "staticRules.opponentsNonbasicLandsEnterTapped",
      applies: (d) => d.staticRules?.opponentsNonbasicLandsEnterTapped === true,
      expect: /Nonbasic lands your opponents control enter tapped/,
    },
    {
      field: "staticRules.opponentSearchesTopCards",
      applies: (d) => d.staticRules?.opponentSearchesTopCards !== undefined,
      expect: /searches the top \w+ cards/,
    },
    {
      field: "staticRules.yourSpellsCantBeCountered",
      applies: (d) => d.staticRules?.yourSpellsCantBeCountered === true,
      expect: /Spells you control can't be countered/,
    },
    {
      field: "staticRules.doublesAttackTriggersWhenMode",
      applies: (d) => d.staticRules?.doublesAttackTriggersWhenMode !== undefined,
      expect: /triggers an additional time/,
    },
    {
      field: "becomesChosenBasicType",
      applies: (d) => d.becomesChosenBasicType === true,
      expect: /is the chosen type/,
    },
    {
      field: "staticBuff.grantsChosenOnEntry",
      applies: (d) => staticBuffsOf(d).some((b) => b.grantsChosenOnEntry === true),
      expect: /each of the chosen abilities/,
    },
    {
      field: "staticBuff.grantsWardLife",
      applies: (d) => staticBuffsOf(d).some((b) => b.grantsWardLife !== undefined),
      expect: /Ward-Pay \d+ life/,
    },
    {
      field: "staticBuff.condition",
      applies: (d) => staticBuffsOf(d).some((b) => b.condition !== undefined),
      expect: /^As long as /m,
    },
    {
      field: "createToken.grants",
      // The token's grants, not a staticBuff's - Blight Mound has both, and a
      // blunt search for the field name reported it for a clause it does print.
      applies: (d) => hasNode(d, (n) => n.kind === "createToken" && Array.isArray(n.grants)),
      expect: /gains? .* until end of turn/,
    },
    {
      field: "searchLibrary caps",
      // On the search, not on the graveyard selector - Moseo's `maxManaValue`
      // is a cap on what may be returned from a graveyard, a different clause.
      applies: (d) =>
        hasNode(
          d,
          (n) =>
            n.kind === "searchLibrary" &&
            (n.maxPower !== undefined || n.maxToughness !== undefined || n.maxManaValue !== undefined),
        ),
      expect: /with (power|toughness|mana value) \d+ or less/,
    },
    {
      field: "ascend",
      applies: (d) => d.ascend === true,
      expect: /Ascend \(If you control ten or more permanents/,
    },
    {
      field: "createCopyToken.of=target",
      applies: (d) => hasNode(d, (n) => n.kind === "createCopyToken" && n.of === "target"),
      expect: /[Cc]reate (a token that's a copy|X tokens that are copies) of/,
    },
    {
      field: "createCopyToken.delayedEnd",
      applies: (d) => hasNode(d, (n) => n.kind === "createCopyToken" && n.delayedEnd !== undefined),
      expect: /(Sacrifice|Exile) (it|them) at the beginning of the next end step/,
    },
    {
      field: "createCopyToken.grants",
      // The copy's keywords, not a token definition's or a staticBuff's.
      applies: (d) =>
        hasNode(d, (n) => n.kind === "createCopyToken" && Array.isArray(n.grants) && n.grants.length > 0),
      expect: /(except it has|They gain) \w/,
    },
    {
      field: "creature selector narrowings",
      applies: (d) =>
        hasNode(
          d,
          (n) =>
            n.kind === "creature" &&
            (n.nonlegendary === true || n.excludeSource === true || n.controlledBy !== undefined),
        ),
      expect: /target (nonlegendary )?creature (you control|an opponent controls)/,
    },
    {
      field: "effect.gainControl",
      applies: (d) => hasNode(d, (n) => n.kind === "gainControl"),
      expect: /[Gg]ain control of target .* until end of turn\./,
    },
    {
      field: "effect.returnControlToOwners",
      applies: (d) => hasNode(d, (n) => n.kind === "returnControlToOwners"),
      expect: /Each player gains control of all creatures they own\./,
    },
    {
      field: "effect.copyTokensThatEnteredThisTurn",
      applies: (d) => hasNode(d, (n) => n.kind === "copyTokensThatEnteredThisTurn"),
      expect: /for each token you control that entered this turn/,
    },
    {
      field: "count.one-plus-instants-and-sorceries",
      applies: (d) =>
        hasNode(d, (n) => n.what === "one-plus-instants-and-sorceries-cast-this-turn"),
      expect: /one plus the number of instant and sorcery spells you've cast this turn/,
    },
    {
      field: "condition.citys-blessing",
      applies: (d) => hasNode(d, (n) => n.kind === "citys-blessing"),
      expect: /you (have|don't have) the city's blessing/,
    },
    {
      field: "effect.grantProtection",
      applies: (d) => hasNode(d, (n) => n.kind === "grantProtection"),
      /*
       * The effect is "choose a colour, then grant what that colour buys", and
       * what it buys is no longer always protection: Skrelv's names hexproof
       * from it and unblockability by it instead. So the coverage check asks
       * only that the grant reaches the panel at all; which clauses each card
       * prints is asserted card by card, where the wording can be exact.
       */
      expect: /gains .* until end of turn\./,
    },
    { field: "suspend", applies: (d) => d.suspend !== undefined, expect: /Suspend \d/ },
    {
      field: "effect.exertSelf",
      applies: (d) => JSON.stringify(d).includes('"exertSelf"'),
      expect: /exert it/,
    },
    {
      field: "effect.additionalCombatPhase",
      applies: (d) => JSON.stringify(d).includes('"additionalCombatPhase"'),
      expect: /additional combat phase/,
    },
    {
      field: "effect.untapAll",
      applies: (d) => JSON.stringify(d).includes('"untapAll"'),
      expect: /[Uu]ntap all/,
    },
    {
      field: "selector.attacking",
      /*
       * The *selector* flag, not any field called `attacking`. A blunt string
       * search matched Winota's `deployFromTop.attacking` too - a different
       * field with the same name, saying the creature arrives attacking rather
       * than that it must already be. The first version of this check reported
       * her, correctly rendered, as a fault.
       */
      applies: (d) => hasAttackingSelector(d),
      expect: /target attacking/,
    },
    { field: "devour", applies: (d) => d.devour !== undefined, expect: /Devour \d/ },
    { field: "bestowCost", applies: (d) => d.bestowCost !== undefined, expect: /Bestow \{/ },
    { field: "loyaltyAbilities", applies: (d) => (d.loyaltyAbilities?.length ?? 0) > 0, expect: /^[+-]\d:/m },
    {
      field: "alsoCreatureOffBattlefield",
      applies: (d) => d.alsoCreatureOffBattlefield !== undefined,
      expect: /isn't on the battlefield/,
    },
    {
      field: "staticRules.skipDrawStep",
      applies: (d) => d.staticRules?.skipDrawStep === true,
      expect: /Skip your draw step/,
    },
    {
      field: "staticRules.maxHandSize",
      applies: (d) => d.staticRules?.maxHandSize !== undefined,
      expect: /maximum hand size/,
    },
    {
      field: "equipCost",
      applies: (d) => d.equipCost !== undefined && staticBuffsOf(d).length > 0,
      expect: /Equipped creature/,
    },
    {
      field: "staticBuff.grantsAbilities",
      applies: (d) => staticBuffsOf(d).some((b) => (b.grantsAbilities?.length ?? 0) > 0),
      expect: /"/,
    },
    {
      field: "activated.marksMana",
      applies: (d) => (d.activatedAbilities ?? []).some((a) => a.marksMana !== undefined),
      expect: /scry \d/,
    },
    {
      field: "activated.addsOtherCounterToSelf",
      applies: (d) => (d.activatedAbilities ?? []).some((a) => a.addsOtherCounterToSelf !== undefined),
      expect: /counter on this/,
    },
    {
      field: "activated.sorcerySpeedOnly",
      applies: (d) => (d.activatedAbilities ?? []).some((a) => a.sorcerySpeedOnly === true),
      expect: /only as a sorcery/,
    },
  ];

  for (const check of checks) {
    it(check.field, () => {
      const offenders = Object.values(TEST_CARD_DEFINITIONS)
        .filter(check.applies)
        .filter((def) => !check.expect.test(describeCard(def, TEST_CARD_DEFINITIONS).join("\n")))
        .map((def) => def.name);
      expect(offenders).toEqual([]);
    });
  }

  it("never renders an empty clause", () => {
    // "Other creatures you control ." and its relatives - a sentence whose only
    // content was its subject, which is exactly what a dropped field looks like.
    const offenders = Object.values(TEST_CARD_DEFINITIONS)
      .filter((def) =>
        describeCard(def, TEST_CARD_DEFINITIONS).some((line) => / \.$/.test(line) || /\s{2,}/.test(line)),
      )
      .map((def) => def.name);
    expect(offenders).toEqual([]);
  });
});

/**
 * Batch 4, and the reason this file exists: dumping the renderer's real output
 * for these three cards found four separate things wrong with it, none of which
 * any test was watching. Three of them only became reachable when the first
 * cards with a hybrid *card* cost arrived.
 */
describe("the extra-combat cards", () => {
  it("prints a hybrid cost in the order the card prints it", () => {
    // {R/W}, not {W/R}. Sorting the halves into WUBRG order produced a symbol
    // that appears on no card.
    expect(formatManaCost(TEST_CARD_DEFINITIONS["raph-and-leo-sibling-rivals"]!.manaCost)).toBe(
      "{1}{R/W}{R/W}",
    );
    expect(formatManaCost(TEST_CARD_DEFINITIONS["blade-historian"]!.manaCost)).toBe(
      "{R/W}{R/W}{R/W}{R/W}",
    );
  });

  it("does not draw an all-hybrid cost as {0}", () => {
    // Blade Historian has no generic and no plain pips, and read as free.
    const symbols = manaSymbols(TEST_CARD_DEFINITIONS["blade-historian"]!.manaCost);
    expect(symbols).toHaveLength(4);
    expect(symbols.every((s) => s.label === "R/W")).toBe(true);
    // No hybrid icon on disk, so the whole cost falls back to text - which is
    // what `src: undefined` tells ManaCostView to do.
    expect(symbols.every((s) => s.src === undefined)).toBe(true);
  });

  it("keeps the exert and what it buys in one sentence", () => {
    const text = textOf("combat-celebrant");
    expect(text).toContain(
      "you may exert it. When you do, untap all other creatures you control. " +
        "After this phase, there is an additional combat phase.",
    );
    // The reminder is the card's own, and sits at the end of the ability.
    expect(text.trim().endsWith("(An exerted creature won't untap during your next untap step.)")).toBe(true);
  });

  it("says one or two, not 'a or two'", () => {
    expect(textOf("raph-and-leo-sibling-rivals")).toContain(
      "untap one or two target attacking creatures",
    );
  });

  it("keeps the intervening-if that stops the loop", () => {
    expect(textOf("raph-and-leo-sibling-rivals")).toContain("if it's the first combat phase of the turn");
  });

  it("says an attacking-only anthem is attacking-only", () => {
    expect(textOf("blade-historian")).toContain("Attacking creatures you control have double strike.");
  });
});

/**
 * Batch 5's twelve, read back as they are printed.
 *
 * Four separate fields rendered as nothing at all on their first run - two
 * static rules, the chosen basic type and the token's granted keywords - and
 * one, Cavern of Souls, printed somebody else's card entirely because the
 * restricted-mana wording was hardcoded to Delighted Halfling's.
 */
describe("the leftovers and the free ones", () => {
  it("says which spells Cavern of Souls' mana may pay for", () => {
    expect(textOf("cavern-of-souls")).toContain(
      "Spend this mana only to cast a creature spell of the chosen type, and that spell can't be countered.",
    );
    // And not the wording it was hardcoded to.
    expect(textOf("cavern-of-souls")).not.toContain("legendary spell");
  });

  it("says what Multiversal Passage becomes", () => {
    const text = textOf("multiversal-passage");
    expect(text).toContain("As this land enters, choose a basic land type.");
    expect(text).toContain("This land is the chosen type.");
    // The order the card prints: the choice, then the price, then what it is.
    expect(text.indexOf("choose a basic land type")).toBeLessThan(text.indexOf("you may pay 2 life"));
  });

  it("prints both of Greymond's continuous effects, and the condition on one", () => {
    const text = textOf("greymond-avacyns-stalwart");
    expect(text).toContain("Humans you control have each of the chosen abilities.");
    expect(text).toContain("As long as you control four or more Humans, Humans you control get +2/+2.");
    expect(text).toContain("first strike, vigilance, and lifelink");
  });

  it("prints both halves of Windcrag Siege, not just the live one", () => {
    const text = textOf("windcrag-siege");
    expect(text).toContain("triggers an additional time");
    expect(text).toContain("It gains lifelink and haste until end of turn.");
  });

  it("prints the second line of each hate piece", () => {
    expect(textOf("archon-of-emeria")).toContain("Nonbasic lands your opponents control enter tapped.");
    expect(textOf("aven-mindcensor")).toContain("searches the top four cards of that library instead.");
    const squelcher = textOf("hexing-squelcher");
    expect(squelcher).toContain("Spells you control can't be countered.");
    expect(squelcher).toContain('Other creatures you control have "Ward-Pay 2 life."');
  });

  it("prints the cap on every recruiter", () => {
    expect(textOf("imperial-recruiter")).toContain("with power 2 or less");
    expect(textOf("recruiter-of-the-guard")).toContain("with toughness 2 or less");
    expect(textOf("ranger-captain-of-eos")).toContain("with mana value 1 or less");
    // "an artifact", not "a artifact".
    expect(textOf("enlightened-tutor")).toContain("an artifact or enchantment card");
  });
});

/**
 * Batch 5's five, read back as they are printed.
 *
 * The four copy effects are the first in the pool to point at something rather
 * than read their own source, and every clause of the printed sentence is
 * load-bearing: the modifier that makes the copy worth making, the count that
 * says how many, and the end step that takes them away.
 */
describe("copying and borrowing", () => {
  it("prints Kiki-Jiki's ability exactly as the card does", () => {
    expect(textOf("kiki-jiki-mirror-breaker")).toContain(
      "{T}: Create a token that's a copy of target nonlegendary creature you control, except it has haste. Sacrifice it at the beginning of the next end step.",
    );
  });

  it("prints Rionya's X, and explains it", () => {
    const text = textOf("rionya-fire-dancer");
    expect(text).toContain(
      "create X tokens that are copies of another target creature you control, where X is one plus the number of instant and sorcery spells you've cast this turn. They gain haste. Exile them at the beginning of the next end step.",
    );
    // "another", not "a": a Rionya that could copy itself is a different card.
    expect(text).toContain("another target creature you control");
  });

  it("prints all three of Zealous Conscripts' sentences", () => {
    const text = textOf("zealous-conscripts");
    expect(text).toContain("gain control of target permanent until end of turn.");
    expect(text).toContain("Untap that permanent.");
    expect(text).toContain("It gains haste until end of turn.");
  });

  it("prints both of Homeward Path's abilities", () => {
    const text = textOf("homeward-path");
    expect(text).toContain("{T}: Add {C}.");
    expect(text).toContain("{T}: Each player gains control of all creatures they own.");
  });

  it("prints Ocelot Pride's reminder text and the connective between its two sentences", () => {
    const text = textOf("ocelot-pride");
    expect(text).toContain(
      "Ascend (If you control ten or more permanents, you get the city's blessing for the rest of the game.)",
    );
    // "**Then** if you have the city's blessing" - without it the second
    // sentence reads as something that might have happened first, and the Cat
    // the first sentence made is one of the tokens the second one copies.
    expect(text).toContain(
      "create a 1/1 white Cat creature token. Then if you have the city's blessing, for each token you control that entered this turn, create a token that's a copy of it.",
    );
  });
});

/**
 * Protection, read back as the three cards print it.
 *
 * None of them names a colour, and the panel must not either: the choice is made
 * on resolution, so a panel that printed one would be telling the player the
 * decision had already been taken.
 */
describe("protection", () => {
  it("prints Mother of Runes without naming a colour", () => {
    const text = textOf("mother-of-runes");
    expect(text).toContain(
      "{T}: target creature you control gains protection from the color of your choice until end of turn.",
    );
    for (const colour of ["white", "blue", "black", "red", "green"]) {
      expect(text).not.toContain(colour);
    }
  });

  it("prints Giver of Runes' colourless option, and that it cannot point at itself", () => {
    const text = textOf("giver-of-runes");
    expect(text).toContain("another target creature you control");
    expect(text).toContain("gains protection from colorless or from the color of your choice until end of turn.");
  });

  it("prints Alseid's cost and its wider target", () => {
    const text = textOf("alseid-of-lifes-bounty");
    expect(text).toContain("Lifelink");
    expect(text).toContain("target creature or enchantment you control gains protection from");
  });
});

/**
 * Batch 9 - the attack step.
 *
 * Six of these ten hang on a distinction the panel is the only place to see: a
 * trigger that fires once against one that fires per creature, a token that
 * *must* attack against one that merely can, and a keyword printed on a token
 * against one granted to it for the turn.
 */
describe("batch 9", () => {
  it("says Anim Pakal fires once for the swing, not per creature", () => {
    const text = textOf("anim-pakal-thousandth-moon");
    expect(text).toContain("Whenever you attack with one or more non-Gnome creatures");
    expect(text).toContain("tapped and attacking");
  });

  it("says Ainok's trigger takes it or the commander, and aims at that player", () => {
    const text = textOf("ainok-strike-leader");
    expect(text).toContain("Whenever you attack with this creature and/or your commander");
    // "that player" is the difference between a duel and a pod.
    expect(text).toContain("tapped and attacking that player");
    expect(text).toContain("Creature tokens you control");
    expect(text).toContain("indestructible");
  });

  it("says the Warboss's token must attack, and the Rabblemaster's Goblins too", () => {
    const warboss = textOf("legion-warboss");
    expect(warboss).toContain("attacks this combat if able");
    expect(warboss).toContain("target attacking creature with lesser power");

    const rabble = textOf("goblin-rabblemaster");
    expect(rabble).toContain("Other Goblin creatures you control attack each combat if able.");
    expect(rabble).toContain("for each other attacking Goblin");
  });

  it("says mobilize's tokens do not stay", () => {
    const text = textOf("voice-of-victory");
    expect(text).toContain("tapped and attacking");
    // The clause that stops it being an anthem.
    expect(text).toContain("Sacrifice them at the beginning of the next end step.");
  });

  it("says Loyal Apprentice needs a commander", () => {
    const text = textOf("loyal-apprentice");
    expect(text).toContain("At the beginning of combat on your turn, if you control a commander");
    expect(text).toContain("gains haste until end of turn");
  });

  it("says Serra Ascendant's buff is about itself and about your life total", () => {
    const text = textOf("serra-ascendant");
    expect(text).toContain("As long as you have 30 or more life");
    // The card prints the whole thing as one sentence, so "this creature" is
    // mid-line and lower case. What matters is that it is not an anthem.
    expect(text).toContain("this creature gets +5/+5 and has flying");
    expect(text).not.toContain("creatures you control");
  });

  it("says Archivist watches an opponent's search", () => {
    expect(textOf("archivist-of-oghma")).toContain("Whenever an opponent searches their library");
  });

  it("says Mana Vault does not untap, and bills you in the draw step", () => {
    const text = textOf("mana-vault");
    expect(text).toContain("This artifact doesn't untap during your untap step.");
    expect(text).toContain("At the beginning of your draw step, if it's tapped");
  });

  it("says Myrel counts Soldiers", () => {
    expect(textOf("myrel-shield-of-argive")).toContain("Soldier");
  });
});

/**
 * Batch 10, tranche one. Two of these three are two cards in one, and the panel
 * is the only place a player finds out which half they are looking at.
 */
describe("batch 10", () => {
  it("says Emeria's Call's shield lasts longer than a turn", () => {
    const text = textOf("emerias-call");
    expect(text).toContain("Angel Warrior");
    // The one word that makes the card worth seven mana.
    expect(text).toContain("until your next turn");
    expect(text).not.toContain("until end of turn");
  });

  it("says both Pathway faces make different mana", () => {
    expect(textOf("needleverge-pathway")).toContain("Add {R}");
    expect(textOf("pillarverge-pathway")).toContain("Add {W}");
  });

  it("says Charismatic Conqueror asks them, and what happens if they refuse", () => {
    const text = textOf("charismatic-conqueror");
    expect(text).toContain("enters the battlefield untapped");
    expect(text).toContain("they may");
    // Both halves, because a panel with only the first describes a card with no
    // upside at all.
    expect(text.toLowerCase()).toContain("if they don't");
    expect(text).toContain("Vampire");
  });
});

describe("batch 10, tranche two", () => {
  it("says what Chrome Mox may imprint and what it then taps for", () => {
    const text = textOf("chrome-mox");
    expect(text).toContain("nonartifact, nonland card from your hand");
    expect(text).toContain("exiled card's colours");
  });

  it("prints both of Goblin Cratermaker's bullets", () => {
    const text = textOf("goblin-cratermaker");
    expect(text).toContain("2 damage to target creature");
    // Both conditions, because neither implies the other.
    expect(text).toContain("colorless");
    expect(text).toContain("nonland");
  });
});

describe("Skrelv in the panel", () => {
  it("prints all three of the clauses keyed to the chosen colour", () => {
    const text = textOf("skrelv-defector-mite");
    expect(text).toContain("Toxic 1");
    expect(text).toContain("can't block");
    expect(text).toContain("Choose a color");
    expect(text).toContain("toxic 1 and hexproof from that color");
    // The half that wins the game, and its own sentence on the card.
    expect(text).toContain("can't be blocked by creatures of that color this turn");
  });
});

describe("Deflecting Swat in the panel", () => {
  it("prints the free cast and what it re-points", () => {
    const text = textOf("deflecting-swat");
    expect(text).toContain("without paying its mana cost");
    // "or ability" is the half that separates it from a counterspell.
    expect(text).toContain("target spell or ability");
  });
});

describe("Mox Diamond in the panel", () => {
  it("prints both halves of the replacement", () => {
    const text = textOf("mox-diamond");
    expect(text).toContain("you may discard a land card instead");
    // The half that makes it a gamble rather than a free Mox.
    expect(text).toContain("put it into its owner's graveyard");
  });
});

describe("Shatterskull Smashing in the panel", () => {
  it("prints the division as a phrase, not as a number nobody has chosen yet", () => {
    const text = textOf("shatterskull-smashing");
    expect(text).toContain("X damage divided as you choose");
    expect(text).toContain("If X is 6 or more");
    expect(text).toContain("twice X damage");
  });
});

describe("the cards that begin the game in play", () => {
  it("says Gemstone Caverns is for the player going second, and what it costs", () => {
    const text = textOf("gemstone-caverns");
    expect(text).toContain("you're not the starting player");
    expect(text).toContain("luck counter");
    expect(text).toContain("exile a card from your hand");
    // Six abilities from one printed line, and the panel says which is which.
    expect(text).toContain("while it has no counter on it");
    expect(text).toContain("while it has a counter on it");
  });

  it("says Quicksilver may start in play, and that his power-up is once only", () => {
    const text = textOf("quicksilver-brash-blur");
    expect(text).toContain("begin the game with it on the battlefield");
    expect(text).not.toContain("starting player"); // he has no such clause
    expect(text).toContain("double strike counter");
    // The clause that stops him growing every turn.
    expect(text).toContain("Activate only once");
    expect(text).toContain("entered this turn");
  });
});

describe("Ajani in the panel", () => {
  it("says what turns him over and that it is a choice", () => {
    const text = textOf("ajani-nacatl-pariah");
    expect(text).toContain("one or more other Cats you control die");
    expect(text).toContain("transformed");
    expect(text).toContain("you may");
  });

  it("prints all three loyalty abilities, including what the -4 keeps", () => {
    const text = textOf("ajani-nacatl-avenger");
    expect(text).toContain("+1/+1 counter on each Cat");
    // The number is a phrase, not the printed floor of 0.
    expect(text).toContain("damage equal to");
    // Four slots, and the panel names which four.
    expect(text).toContain("an artifact, a creature, an enchantment, and a planeswalker");
    expect(text).toContain("sacrifices the rest");
  });
});
