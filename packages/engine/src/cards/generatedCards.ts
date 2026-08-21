import type { CardDefinition } from "../types.js";

/**
 * The bulk-generated half of the card pool.
 *
 * Every definition below was written by `tools/scryfall-report/gen_fixtures.py`
 * straight from Scryfall's bulk data, not by hand. The generator's whole
 * posture is the rule in docs/ADDING-CARDS.md enforced mechanically: it refuses
 * any card carrying text the effect DSL cannot express *exactly*, rather than
 * approximating it. A card is here because the machine could transcribe it
 * without a judgement call, and for no other reason.
 *
 * **Separate from testCards.ts on purpose.** That file is the hand-written
 * pool: cards someone read, decided about, and commented - the whole Blech and
 * Winota lists among them, several with paragraphs explaining why a clause is
 * modelled the way it is. This file has no such reasoning in it and should not
 * grow any. If a card here needs a decision made about it, move it there.
 *
 * Regenerating: the input is a list of names, one per line, on stdin.
 *
 *     py -X utf8 tools/scryfall-report/gen_fixtures.py --named < names.txt
 *
 * The audits in tools/scryfall-report check this file exactly as they check the
 * hand-written one - it is dumped through the same `TEST_CARD_DEFINITIONS`.
 *
 * Two tokens were removed by hand after generation, because the pool already
 * mints them under a different id: the generator's `token-w-11-soldier` and
 * `token-g-11-saproling` are byte-identical to `soldier-token` and
 * `saproling-token`, which testCards.ts has had for far longer. Every reference
 * here points at the older ids instead.
 *
 * That is worth knowing before regenerating: **de-duplicating tokens by id is
 * not enough**, because two definitions of the same token can differ in nothing
 * but their id, and nothing complains until the client renders two identical
 * entries. `cardText.test.ts` is what caught it - it asserts every token in the
 * pool describes itself distinctly.
 *
 * One card was removed by hand after generation: **Dryad Arbor**, which has no
 * mana cost at all - it is a land that is also a creature - and which the
 * generator transcribed as a cost of {0}. `audit_fixtures.py` caught the
 * difference. {0} and "no cost" are not the same thing (one can be cast, the
 * other can only be played as a land), so it is a card that needs a decision
 * rather than a transcription. Re-add it by hand in testCards.ts if it is ever
 * wanted, and it will have to be dropped from a regeneration again.
 */

export const TOKEN_B_21_VILLAIN_MENACE: CardDefinition = {
  id: "token-b-21-villain-menace",
  name: "Villain",
  types: ["Creature"],
  subtypes: ["Villain"],
  colorIdentity: ["B"],
  power: 2,
  toughness: 1,
  keywords: ["Menace"],
  isToken: true,
  tier: "vanilla",
};

export const TOKEN_G_11_ELF_WARRIOR: CardDefinition = {
  id: "token-g-11-elf-warrior",
  name: "Elf Warrior",
  types: ["Creature"],
  subtypes: ["Elf", "Warrior"],
  colorIdentity: ["G"],
  power: 1,
  toughness: 1,
  isToken: true,
  tier: "vanilla",
};

export const TOKEN_G_55_WURM_TRAMPLE: CardDefinition = {
  id: "token-g-55-wurm-trample",
  name: "Wurm",
  types: ["Creature"],
  subtypes: ["Wurm"],
  colorIdentity: ["G"],
  power: 5,
  toughness: 5,
  keywords: ["Trample"],
  isToken: true,
  tier: "vanilla",
};

export const TOKEN_G_44_BEAR: CardDefinition = {
  id: "token-g-44-bear",
  name: "Bear",
  types: ["Creature"],
  subtypes: ["Bear"],
  colorIdentity: ["G"],
  power: 4,
  toughness: 4,
  isToken: true,
  tier: "vanilla",
};

export const TOKEN_W_11_HUMAN_WARRIOR: CardDefinition = {
  id: "token-w-11-human-warrior",
  name: "Human Warrior",
  types: ["Creature"],
  subtypes: ["Human", "Warrior"],
  colorIdentity: ["W"],
  power: 1,
  toughness: 1,
  isToken: true,
  tier: "vanilla",
};

export const TOKEN_G_33_BOAR: CardDefinition = {
  id: "token-g-33-boar",
  name: "Boar",
  types: ["Creature"],
  subtypes: ["Boar"],
  colorIdentity: ["G"],
  power: 3,
  toughness: 3,
  isToken: true,
  tier: "vanilla",
};

export const TOKEN_R_44_DRAGON_FLYING: CardDefinition = {
  id: "token-r-44-dragon-flying",
  name: "Dragon",
  types: ["Creature"],
  subtypes: ["Dragon"],
  colorIdentity: ["R"],
  power: 4,
  toughness: 4,
  keywords: ["Flying"],
  isToken: true,
  tier: "vanilla",
};

export const TOKEN_R_11_PHYREXIAN_GOBLIN: CardDefinition = {
  id: "token-r-11-phyrexian-goblin",
  name: "Phyrexian Goblin",
  types: ["Creature"],
  subtypes: ["Phyrexian", "Goblin"],
  colorIdentity: ["R"],
  power: 1,
  toughness: 1,
  isToken: true,
  tier: "vanilla",
};

export const TOKEN_W_11_HUMAN: CardDefinition = {
  id: "token-w-11-human",
  name: "Human",
  types: ["Creature"],
  subtypes: ["Human"],
  colorIdentity: ["W"],
  power: 1,
  toughness: 1,
  isToken: true,
  tier: "vanilla",
};

export const TOKEN_GW_22_ELF_KNIGHT_VIGILANCE: CardDefinition = {
  id: "token-gw-22-elf-knight-vigilance",
  name: "Elf Knight",
  types: ["Creature"],
  subtypes: ["Elf", "Knight"],
  colorIdentity: ["G", "W"],
  power: 2,
  toughness: 2,
  keywords: ["Vigilance"],
  isToken: true,
  tier: "vanilla",
};

export const TOKEN_G_33_DINOSAUR_TRAMPLE: CardDefinition = {
  id: "token-g-33-dinosaur-trample",
  name: "Dinosaur",
  types: ["Creature"],
  subtypes: ["Dinosaur"],
  colorIdentity: ["G"],
  power: 3,
  toughness: 3,
  keywords: ["Trample"],
  isToken: true,
  tier: "vanilla",
};

export const TOKEN_W_11_HUMAN_SOLDIER: CardDefinition = {
  id: "token-w-11-human-soldier",
  name: "Human Soldier",
  types: ["Creature"],
  subtypes: ["Human", "Soldier"],
  colorIdentity: ["W"],
  power: 1,
  toughness: 1,
  isToken: true,
  tier: "vanilla",
};

export const TOKEN_W_01_GOAT: CardDefinition = {
  id: "token-w-01-goat",
  name: "Goat",
  types: ["Creature"],
  subtypes: ["Goat"],
  colorIdentity: ["W"],
  power: 0,
  toughness: 1,
  isToken: true,
  tier: "vanilla",
};

export const TOKEN_B_22_ZOMBIE: CardDefinition = {
  id: "token-b-22-zombie",
  name: "Zombie",
  types: ["Creature"],
  subtypes: ["Zombie"],
  colorIdentity: ["B"],
  power: 2,
  toughness: 2,
  isToken: true,
  tier: "vanilla",
};

export const TOKEN_W_11_SPIRIT_FLYING: CardDefinition = {
  id: "token-w-11-spirit-flying",
  name: "Spirit",
  scryfallId: "395e0d40-19f5-4355-9e6c-88265fdef197",
  types: ["Creature"],
  subtypes: ["Spirit"],
  colorIdentity: ["W"],
  power: 1,
  toughness: 1,
  keywords: ["Flying"],
  isToken: true,
  tier: "vanilla",
};

export const TOKEN_WB_11_INKLING_FLYING: CardDefinition = {
  id: "token-wb-11-inkling-flying",
  name: "Inkling",
  types: ["Creature"],
  subtypes: ["Inkling"],
  colorIdentity: ["W", "B"],
  power: 1,
  toughness: 1,
  keywords: ["Flying"],
  isToken: true,
  tier: "vanilla",
};

export const TOKEN_BR_11_GOBLIN: CardDefinition = {
  id: "token-br-11-goblin",
  name: "Goblin",
  types: ["Creature"],
  subtypes: ["Goblin"],
  colorIdentity: ["B", "R"],
  power: 1,
  toughness: 1,
  isToken: true,
  tier: "vanilla",
};

export const TOKEN_G_22_WOLF: CardDefinition = {
  id: "token-g-22-wolf",
  name: "Wolf",
  types: ["Creature"],
  subtypes: ["Wolf"],
  colorIdentity: ["G"],
  power: 2,
  toughness: 2,
  isToken: true,
  tier: "vanilla",
};

export const TOKEN_W_11_BIRD_FLYING: CardDefinition = {
  id: "token-w-11-bird-flying",
  name: "Bird",
  types: ["Creature"],
  subtypes: ["Bird"],
  colorIdentity: ["W"],
  power: 1,
  toughness: 1,
  keywords: ["Flying"],
  isToken: true,
  tier: "vanilla",
};

export const TOKEN_W_22_KNIGHT_VIGILANCE: CardDefinition = {
  id: "token-w-22-knight-vigilance",
  name: "Knight",
  types: ["Creature"],
  subtypes: ["Knight"],
  colorIdentity: ["W"],
  power: 2,
  toughness: 2,
  keywords: ["Vigilance"],
  isToken: true,
  tier: "vanilla",
};

export const TOKEN_W_33_KNIGHT: CardDefinition = {
  id: "token-w-33-knight",
  name: "Knight",
  types: ["Creature"],
  subtypes: ["Knight"],
  colorIdentity: ["W"],
  power: 3,
  toughness: 3,
  isToken: true,
  tier: "vanilla",
};

export const TOKEN_W_11_RABBIT: CardDefinition = {
  id: "token-w-11-rabbit",
  name: "Rabbit",
  types: ["Creature"],
  subtypes: ["Rabbit"],
  colorIdentity: ["W"],
  power: 1,
  toughness: 1,
  isToken: true,
  tier: "vanilla",
};

export const TOKEN_W_11_SOLDIER_LIFELINK: CardDefinition = {
  id: "token-w-11-soldier-lifelink",
  name: "Soldier",
  types: ["Creature"],
  subtypes: ["Soldier"],
  colorIdentity: ["W"],
  power: 1,
  toughness: 1,
  keywords: ["Lifelink"],
  isToken: true,
  tier: "vanilla",
};

export const TOKEN_BG_11_INSECT_FLYING: CardDefinition = {
  id: "token-bg-11-insect-flying",
  name: "Insect",
  types: ["Creature"],
  subtypes: ["Insect"],
  colorIdentity: ["B", "G"],
  power: 1,
  toughness: 1,
  keywords: ["Flying"],
  isToken: true,
  tier: "vanilla",
};

export const TOKEN_U_11_MERFOLK_HEXPROOF: CardDefinition = {
  id: "token-u-11-merfolk-hexproof",
  name: "Merfolk",
  scryfallId: "d44274b6-b8d0-421c-96ff-ae3b03204bce",
  types: ["Creature"],
  subtypes: ["Merfolk"],
  colorIdentity: ["U"],
  power: 1,
  toughness: 1,
  keywords: ["Hexproof"],
  isToken: true,
  tier: "vanilla",
};

export const TOKEN_G_01_PLANT: CardDefinition = {
  id: "token-g-01-plant",
  name: "Plant",
  types: ["Creature"],
  subtypes: ["Plant"],
  colorIdentity: ["G"],
  power: 0,
  toughness: 1,
  isToken: true,
  tier: "vanilla",
};

export const TOKEN_WU_22_KNIGHT_VIGILANCE: CardDefinition = {
  id: "token-wu-22-knight-vigilance",
  name: "Knight",
  types: ["Creature"],
  subtypes: ["Knight"],
  colorIdentity: ["W", "U"],
  power: 2,
  toughness: 2,
  keywords: ["Vigilance"],
  isToken: true,
  tier: "vanilla",
};

export const TOKEN_W_11_ALLY: CardDefinition = {
  id: "token-w-11-ally",
  name: "Ally",
  types: ["Creature"],
  subtypes: ["Ally"],
  colorIdentity: ["W"],
  power: 1,
  toughness: 1,
  isToken: true,
  tier: "vanilla",
};

export const TOKEN_GW_11_HUMAN_CITIZEN: CardDefinition = {
  id: "token-gw-11-human-citizen",
  name: "Human Citizen",
  types: ["Creature"],
  subtypes: ["Human", "Citizen"],
  colorIdentity: ["G", "W"],
  power: 1,
  toughness: 1,
  isToken: true,
  tier: "vanilla",
};

export const TOKEN_B_21_CAT: CardDefinition = {
  id: "token-b-21-cat",
  name: "Cat",
  types: ["Creature"],
  subtypes: ["Cat"],
  colorIdentity: ["B"],
  power: 2,
  toughness: 1,
  isToken: true,
  tier: "vanilla",
};

export const TOKEN_B_33_KAVU: CardDefinition = {
  id: "token-b-33-kavu",
  name: "Kavu",
  types: ["Creature"],
  subtypes: ["Kavu"],
  colorIdentity: ["B"],
  power: 3,
  toughness: 3,
  isToken: true,
  tier: "vanilla",
};

export const TOKEN_B_24_SPIDER_REACH: CardDefinition = {
  id: "token-b-24-spider-reach",
  name: "Spider",
  types: ["Creature"],
  subtypes: ["Spider"],
  colorIdentity: ["B"],
  power: 2,
  toughness: 4,
  keywords: ["Reach"],
  isToken: true,
  tier: "vanilla",
};

export const TOKEN_B_66_WURM_TRAMPLE: CardDefinition = {
  id: "token-b-66-wurm-trample",
  name: "Wurm",
  types: ["Creature"],
  subtypes: ["Wurm"],
  colorIdentity: ["B"],
  power: 6,
  toughness: 6,
  keywords: ["Trample"],
  isToken: true,
  tier: "vanilla",
};

export const TOKEN_UR_11_ELEMENTAL: CardDefinition = {
  id: "token-ur-11-elemental",
  name: "Elemental",
  types: ["Creature"],
  subtypes: ["Elemental"],
  colorIdentity: ["U", "R"],
  power: 1,
  toughness: 1,
  isToken: true,
  tier: "vanilla",
};

export const TOKEN_G_44_BEAST: CardDefinition = {
  id: "token-g-44-beast",
  name: "Beast",
  types: ["Creature"],
  subtypes: ["Beast"],
  colorIdentity: ["G"],
  power: 4,
  toughness: 4,
  isToken: true,
  tier: "vanilla",
};

export const TOKEN_W_33_BIRD_FLYING: CardDefinition = {
  id: "token-w-33-bird-flying",
  name: "Bird",
  types: ["Creature"],
  subtypes: ["Bird"],
  colorIdentity: ["W"],
  power: 3,
  toughness: 3,
  keywords: ["Flying"],
  isToken: true,
  tier: "vanilla",
};

export const TOKEN_W_44_ANGEL_FLYING: CardDefinition = {
  id: "token-w-44-angel-flying",
  name: "Angel",
  types: ["Creature"],
  subtypes: ["Angel"],
  colorIdentity: ["W"],
  power: 4,
  toughness: 4,
  keywords: ["Flying"],
  isToken: true,
  tier: "vanilla",
};

export const TOKEN_BG_11_WORM: CardDefinition = {
  id: "token-bg-11-worm",
  name: "Worm",
  types: ["Creature"],
  subtypes: ["Worm"],
  colorIdentity: ["B", "G"],
  power: 1,
  toughness: 1,
  isToken: true,
  tier: "vanilla",
};

export const TOKEN_G_22_ELEMENTAL: CardDefinition = {
  id: "token-g-22-elemental",
  name: "Elemental",
  types: ["Creature"],
  subtypes: ["Elemental"],
  colorIdentity: ["G"],
  power: 2,
  toughness: 2,
  isToken: true,
  tier: "vanilla",
};

export const A_I_M_LABS: CardDefinition = {
  id: "a-i-m-labs",
  name: "A.I.M. Labs",
  scryfallId: "ca24cd9f-fd9f-4ea0-8b9c-ecf98db219a6",
  types: ["Land"],
  colorIdentity: ["B", "U"],
  entersTapped: true,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 1 } }],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }],
  tier: "scripted",
};

export const ABBEY_GRIFFIN: CardDefinition = {
  id: "abbey-griffin",
  name: "Abbey Griffin",
  scryfallId: "bf87803b-e7c6-4122-add4-72e596167b7e",
  types: ["Creature"],
  subtypes: ["Griffin"],
  manaCost: { generic: 3, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 2,
  keywords: ["Flying", "Vigilance"],
  tier: "vanilla",
};

export const ADARKAR_SENTINEL: CardDefinition = {
  id: "adarkar-sentinel",
  name: "Adarkar Sentinel",
  scryfallId: "3802c412-6c85-46aa-b21e-52edc0536f6c",
  types: ["Artifact", "Creature"],
  subtypes: ["Soldier"],
  manaCost: { generic: 5, colors: {} },
  colorIdentity: [],
  power: 3,
  toughness: 3,
  activatedAbilities: [{ cost: { mana: { generic: 1, colors: {} } }, effect: { kind: "pump", power: 0, toughness: 1 } }],
  tier: "scripted",
};

export const ADARKAR_WASTES: CardDefinition = {
  id: "adarkar-wastes",
  name: "Adarkar Wastes",
  scryfallId: "42e0aa15-639a-4e88-9bd8-ce5e7c7d7649",
  types: ["Land"],
  colorIdentity: ["U", "W"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 }, damageToController: 1 }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 }, damageToController: 1 }],
  tier: "vanilla",
};

export const ADULT_GOLD_DRAGON: CardDefinition = {
  id: "adult-gold-dragon",
  name: "Adult Gold Dragon",
  scryfallId: "67a76010-d932-4727-8b5e-b8e2d14e1362",
  types: ["Creature"],
  subtypes: ["Dragon"],
  manaCost: { generic: 3, colors: { R: 1, W: 1 } },
  colorIdentity: ["R", "W"],
  power: 4,
  toughness: 3,
  keywords: ["Flying", "Lifelink", "Haste"],
  tier: "vanilla",
};

export const AERIAL_RESPONDER: CardDefinition = {
  id: "aerial-responder",
  name: "Aerial Responder",
  scryfallId: "8833065e-5022-4f48-b2fd-6fe5647c0a07",
  types: ["Creature"],
  subtypes: ["Dwarf", "Soldier"],
  manaCost: { generic: 1, colors: { W: 2 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 3,
  keywords: ["Flying", "Vigilance", "Lifelink"],
  tier: "vanilla",
};

export const AGENTS_OF_HYDRA: CardDefinition = {
  id: "agents-of-hydra",
  name: "Agents of HYDRA",
  scryfallId: "857fef2e-df1f-4ec6-a262-f6fa52389cf9",
  types: ["Creature"],
  subtypes: ["Human", "Spy", "Villain"],
  manaCost: { generic: 1, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 1,
  toughness: 1,
  triggeredAbilities: [{ event: "dies", effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-b-21-villain-menace" } }],
  tier: "scripted",
};

export const AJANI_S_MANTRA: CardDefinition = {
  id: "ajanis-mantra",
  name: "Ajani's Mantra",
  scryfallId: "de4da30d-5c72-4323-b305-7277038b4a05",
  types: ["Enchantment"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  triggeredAbilities: [{ event: "upkeep", watches: "controller", optional: true, effect: { kind: "gainLife", amount: 1 } }],
  tier: "scripted",
};

export const AJANI_S_PRIDEMATE: CardDefinition = {
  id: "ajanis-pridemate",
  name: "Ajani's Pridemate",
  scryfallId: "222c1a68-e34c-4103-b1be-17d4ceaef6ce",
  types: ["Creature"],
  subtypes: ["Cat", "Soldier"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 2,
  triggeredAbilities: [{ event: "gain-life", effect: { kind: "addCounter", amount: 1 } }],
  tier: "scripted",
};

export const AKOUM_REFUGE: CardDefinition = {
  id: "akoum-refuge",
  name: "Akoum Refuge",
  scryfallId: "51aecc57-f0cc-4e35-af38-ead25cf8a1b8",
  types: ["Land"],
  colorIdentity: ["B", "R"],
  entersTapped: true,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 1 } }],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }],
  tier: "scripted",
};

export const ALABORN_MUSKETEER: CardDefinition = {
  id: "alaborn-musketeer",
  name: "Alaborn Musketeer",
  scryfallId: "1a40c1ed-acdf-464a-8625-5cd35e7533d5",
  types: ["Creature"],
  subtypes: ["Human", "Soldier"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 1,
  keywords: ["Reach"],
  tier: "vanilla",
};

export const ALABORN_TROOPER: CardDefinition = {
  id: "alaborn-trooper",
  name: "Alaborn Trooper",
  scryfallId: "a3bc4e43-1935-402b-a309-c575c83e849f",
  types: ["Creature"],
  subtypes: ["Human", "Soldier"],
  manaCost: { generic: 2, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 3,
  tier: "vanilla",
};

export const ALLOY_MYR: CardDefinition = {
  id: "alloy-myr",
  name: "Alloy Myr",
  scryfallId: "e8d2180b-f54c-47a9-9458-28e7a19e35ee",
  types: ["Artifact", "Creature"],
  subtypes: ["Myr"],
  manaCost: { generic: 3, colors: {} },
  colorIdentity: [],
  power: 2,
  toughness: 2,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "scripted",
};

export const ALPHA_MYR: CardDefinition = {
  id: "alpha-myr",
  name: "Alpha Myr",
  scryfallId: "f3f792d7-75be-429e-8f62-0b563b103642",
  types: ["Artifact", "Creature"],
  subtypes: ["Myr"],
  manaCost: { generic: 2, colors: {} },
  colorIdentity: [],
  power: 2,
  toughness: 1,
  tier: "vanilla",
};

export const ALPHA_TYRRANAX: CardDefinition = {
  id: "alpha-tyrranax",
  name: "Alpha Tyrranax",
  scryfallId: "4a2e5279-f28c-4a78-9f8a-16c9f72f8d38",
  types: ["Creature"],
  subtypes: ["Dinosaur", "Beast"],
  manaCost: { generic: 4, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 6,
  toughness: 5,
  tier: "vanilla",
};

export const ALPINE_MEADOW: CardDefinition = {
  id: "alpine-meadow",
  name: "Alpine Meadow",
  scryfallId: "8702d6b9-bb01-4841-a76d-4a576066c772",
  types: ["Land"],
  subtypes: ["Mountain", "Plains"],
  supertypes: ["Snow"],
  colorIdentity: ["R", "W"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }],
  tier: "vanilla",
};

export const AMBASSADOR_OAK: CardDefinition = {
  id: "ambassador-oak",
  name: "Ambassador Oak",
  scryfallId: "b8664d29-dacc-49cb-949f-e00ceeb75ff6",
  types: ["Creature"],
  subtypes: ["Treefolk", "Warrior"],
  manaCost: { generic: 3, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 3,
  toughness: 3,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-g-11-elf-warrior" } }],
  tier: "scripted",
};

export const AMBUSH_PARTY: CardDefinition = {
  id: "ambush-party",
  name: "Ambush Party",
  scryfallId: "92a1bb12-636f-426a-af13-f3be532c7845",
  types: ["Creature"],
  subtypes: ["Human", "Rogue"],
  manaCost: { generic: 4, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 3,
  toughness: 1,
  keywords: ["First Strike", "Haste"],
  tier: "vanilla",
};

export const ANCIENT_BRONTODON: CardDefinition = {
  id: "ancient-brontodon",
  name: "Ancient Brontodon",
  scryfallId: "39421ce8-86d5-4739-b6fd-78d63c0bb258",
  types: ["Creature"],
  subtypes: ["Dinosaur"],
  manaCost: { generic: 6, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 9,
  toughness: 9,
  tier: "vanilla",
};

export const ANCIENT_DEN: CardDefinition = {
  id: "ancient-den",
  name: "Ancient Den",
  scryfallId: "d9a7b0f6-97f9-4937-865c-e25c142c3ed7",
  types: ["Land", "Artifact"],
  colorIdentity: ["W"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }],
  tier: "vanilla",
};

export const ANCIENT_SPIDER: CardDefinition = {
  id: "ancient-spider",
  name: "Ancient Spider",
  scryfallId: "75ca99de-57e7-47c4-b40a-6e41e3b18069",
  types: ["Creature"],
  subtypes: ["Spider"],
  manaCost: { generic: 2, colors: { G: 1, W: 1 } },
  colorIdentity: ["G", "W"],
  power: 2,
  toughness: 5,
  keywords: ["Reach", "First Strike"],
  tier: "vanilla",
};

export const ANGEL_OF_MERCY: CardDefinition = {
  id: "angel-of-mercy",
  name: "Angel of Mercy",
  scryfallId: "2d22fdde-5590-4a4c-af2e-09711f4b5ffd",
  types: ["Creature"],
  subtypes: ["Angel"],
  manaCost: { generic: 4, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 3,
  keywords: ["Flying"],
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 3 } }],
  tier: "scripted",
};

export const ANGELFIRE_CRUSADER: CardDefinition = {
  id: "angelfire-crusader",
  name: "Angelfire Crusader",
  scryfallId: "a7af8350-9a51-437c-a55e-19f3e07acfa9",
  types: ["Creature"],
  subtypes: ["Human", "Soldier", "Knight"],
  manaCost: { generic: 3, colors: { W: 1 } },
  colorIdentity: ["R", "W"],
  power: 2,
  toughness: 3,
  activatedAbilities: [{ cost: { mana: { generic: 0, colors: { R: 1 } } }, effect: { kind: "pump", power: 1, toughness: 0 } }],
  tier: "scripted",
};

export const ANGELIC_WALL: CardDefinition = {
  id: "angelic-wall",
  name: "Angelic Wall",
  scryfallId: "7fe8f88e-8a51-494b-a008-fbfe624f97f7",
  types: ["Creature"],
  subtypes: ["Wall"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 0,
  toughness: 4,
  keywords: ["Defender", "Flying"],
  tier: "vanilla",
};

export const ANODET_LURKER: CardDefinition = {
  id: "anodet-lurker",
  name: "Anodet Lurker",
  scryfallId: "c97773f5-548a-4107-b29c-56b5428d5ddb",
  types: ["Artifact", "Creature"],
  subtypes: ["Construct"],
  manaCost: { generic: 5, colors: {} },
  colorIdentity: [],
  power: 3,
  toughness: 3,
  triggeredAbilities: [{ event: "dies", effect: { kind: "gainLife", amount: 3 } }],
  tier: "scripted",
};

export const ANVILWROUGHT_RAPTOR: CardDefinition = {
  id: "anvilwrought-raptor",
  name: "Anvilwrought Raptor",
  scryfallId: "aa6d7bbe-0418-4a58-a97b-13b50eb0b642",
  types: ["Artifact", "Creature"],
  subtypes: ["Bird"],
  manaCost: { generic: 4, colors: {} },
  colorIdentity: [],
  power: 2,
  toughness: 1,
  keywords: ["Flying", "First Strike"],
  tier: "vanilla",
};

export const ARACHNOID: CardDefinition = {
  id: "arachnoid",
  name: "Arachnoid",
  scryfallId: "836d5ce6-d5c9-4fb5-8302-53d25b5531b5",
  types: ["Artifact", "Creature"],
  subtypes: ["Spider"],
  manaCost: { generic: 6, colors: {} },
  colorIdentity: [],
  power: 2,
  toughness: 6,
  keywords: ["Reach"],
  tier: "vanilla",
};

export const ARCANE_SANCTUM: CardDefinition = {
  id: "arcane-sanctum",
  name: "Arcane Sanctum",
  scryfallId: "c75eeb97-3249-4762-84b0-387f27fb255f",
  types: ["Land"],
  colorIdentity: ["B", "U", "W"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }],
  tier: "vanilla",
};

export const ARCHANGEL: CardDefinition = {
  id: "archangel",
  name: "Archangel",
  scryfallId: "85160859-9a2d-470b-a924-4b1b4caba860",
  types: ["Creature"],
  subtypes: ["Angel"],
  manaCost: { generic: 5, colors: { W: 2 } },
  colorIdentity: ["W"],
  power: 5,
  toughness: 5,
  keywords: ["Flying", "Vigilance"],
  tier: "vanilla",
};

export const ARCHANGEL_OF_THUNE: CardDefinition = {
  id: "archangel-of-thune",
  name: "Archangel of Thune",
  scryfallId: "15c34447-b0f4-4fcc-b557-23c92850b31b",
  types: ["Creature"],
  subtypes: ["Angel"],
  manaCost: { generic: 3, colors: { W: 2 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 4,
  keywords: ["Flying", "Lifelink"],
  triggeredAbilities: [{ event: "gain-life", effect: { kind: "addCounterToEachOther", amount: 1, subtypes: ["creature"], includesSelf: true } }],
  tier: "scripted",
};

export const ARCTIC_FLATS: CardDefinition = {
  id: "arctic-flats",
  name: "Arctic Flats",
  scryfallId: "609b15f6-e65b-46d6-95e8-dc39f25d7efa",
  types: ["Land"],
  supertypes: ["Snow"],
  colorIdentity: ["G", "W"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }],
  tier: "vanilla",
};

export const ARCTIC_TREELINE: CardDefinition = {
  id: "arctic-treeline",
  name: "Arctic Treeline",
  scryfallId: "b20e3117-f1e4-4449-ae9d-0b66abfc717d",
  types: ["Land"],
  subtypes: ["Forest", "Plains"],
  supertypes: ["Snow"],
  colorIdentity: ["G", "W"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }],
  tier: "vanilla",
};

export const ARGOTHIAN_SWINE: CardDefinition = {
  id: "argothian-swine",
  name: "Argothian Swine",
  scryfallId: "afe5e4ec-9c0e-4b1a-b3c6-e9631cf214eb",
  types: ["Creature"],
  subtypes: ["Boar"],
  manaCost: { generic: 3, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 3,
  toughness: 3,
  keywords: ["Trample"],
  tier: "vanilla",
};

export const ARMADA_WURM: CardDefinition = {
  id: "armada-wurm",
  name: "Armada Wurm",
  scryfallId: "50cb4bf3-70d1-4acc-a1fb-49f4ea74ca16",
  types: ["Creature"],
  subtypes: ["Wurm"],
  manaCost: { generic: 2, colors: { G: 2, W: 2 } },
  colorIdentity: ["G", "W"],
  power: 5,
  toughness: 5,
  keywords: ["Trample"],
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-g-55-wurm-trample" } }],
  tier: "scripted",
};

export const ARMORED_GRIFFIN: CardDefinition = {
  id: "armored-griffin",
  name: "Armored Griffin",
  scryfallId: "1af85ada-7d0c-4b0c-bbff-d294318d3d9f",
  types: ["Creature"],
  subtypes: ["Griffin"],
  manaCost: { generic: 3, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 3,
  keywords: ["Flying", "Vigilance"],
  tier: "vanilla",
};

export const ARMORED_PEGASUS: CardDefinition = {
  id: "armored-pegasus",
  name: "Armored Pegasus",
  scryfallId: "44bafa45-f26e-4c1a-be23-e0469bfa3bb5",
  types: ["Creature"],
  subtypes: ["Pegasus"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 2,
  keywords: ["Flying"],
  tier: "vanilla",
};

export const ARMORED_WOLF_RIDER: CardDefinition = {
  id: "armored-wolf-rider",
  name: "Armored Wolf-Rider",
  scryfallId: "e43d959f-6055-4578-a69a-0ec93e993e21",
  types: ["Creature"],
  subtypes: ["Elf", "Knight"],
  manaCost: { generic: 3, colors: { G: 1, W: 1 } },
  colorIdentity: ["G", "W"],
  power: 4,
  toughness: 6,
  tier: "vanilla",
};

export const ASCENDED_LAWMAGE: CardDefinition = {
  id: "ascended-lawmage",
  name: "Ascended Lawmage",
  scryfallId: "e90d9cc4-9444-4610-ace5-c2981809b331",
  types: ["Creature"],
  subtypes: ["Vedalken", "Wizard"],
  manaCost: { generic: 2, colors: { U: 1, W: 1 } },
  colorIdentity: ["U", "W"],
  power: 3,
  toughness: 2,
  keywords: ["Flying", "Hexproof"],
  tier: "vanilla",
};

export const ASGARDIAN_CITADEL: CardDefinition = {
  id: "asgardian-citadel",
  name: "Asgardian Citadel",
  scryfallId: "d5f88c3d-b17b-46aa-a573-449350f95d46",
  types: ["Land"],
  colorIdentity: ["R", "W"],
  entersTapped: true,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 1 } }],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }],
  tier: "scripted",
};

export const ASSAULT_ZEPPELID: CardDefinition = {
  id: "assault-zeppelid",
  name: "Assault Zeppelid",
  scryfallId: "12bf6443-c941-418a-a766-05bba088a117",
  types: ["Creature"],
  subtypes: ["Beast"],
  manaCost: { generic: 2, colors: { G: 1, U: 1 } },
  colorIdentity: ["G", "U"],
  power: 3,
  toughness: 3,
  keywords: ["Flying", "Trample"],
  tier: "vanilla",
};

export const ATTENDED_KNIGHT: CardDefinition = {
  id: "attended-knight",
  name: "Attended Knight",
  scryfallId: "eac22a3b-4536-4372-a854-bc7f0919830b",
  types: ["Creature"],
  subtypes: ["Human", "Knight"],
  manaCost: { generic: 2, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 2,
  keywords: ["First Strike"],
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "createToken", count: 1, tokenDefinitionId: "soldier-token" } }],
  tier: "scripted",
};

export const AURORAL_PROCESSION: CardDefinition = {
  id: "auroral-procession",
  name: "Auroral Procession",
  scryfallId: "672f94ad-65d6-4c7d-925d-165ef264626f",
  types: ["Instant"],
  manaCost: { generic: 0, colors: { G: 1, U: 1 } },
  colorIdentity: ["G", "U"],
  castEffect: { kind: "returnFromGraveyard", destination: "hand", target: { kind: "card-in-your-graveyard" } },
  tier: "scripted",
};

export const AVACYN_S_PILGRIM: CardDefinition = {
  id: "avacyns-pilgrim",
  name: "Avacyn's Pilgrim",
  scryfallId: "a390a7df-b8da-41aa-93e5-2c0db938a27e",
  types: ["Creature"],
  subtypes: ["Human", "Monk"],
  manaCost: { generic: 0, colors: { G: 1 } },
  colorIdentity: ["G", "W"],
  power: 1,
  toughness: 1,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }],
  tier: "scripted",
};

export const AVEN_BATTLE_PRIEST: CardDefinition = {
  id: "aven-battle-priest",
  name: "Aven Battle Priest",
  scryfallId: "b0060e75-a5a4-4d9a-894c-45bb7e2feffc",
  types: ["Creature"],
  subtypes: ["Bird", "Cleric"],
  manaCost: { generic: 5, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 3,
  keywords: ["Flying"],
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 3 } }],
  tier: "scripted",
};

export const AVEN_FISHER: CardDefinition = {
  id: "aven-fisher",
  name: "Aven Fisher",
  scryfallId: "92b8cd57-df68-4f6d-9612-21e66b9f0190",
  types: ["Creature"],
  subtypes: ["Bird", "Soldier"],
  manaCost: { generic: 3, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 2,
  toughness: 2,
  keywords: ["Flying"],
  triggeredAbilities: [{ event: "dies", optional: true, effect: { kind: "draw", amount: 1 } }],
  tier: "scripted",
};

export const AVEN_FLOCK: CardDefinition = {
  id: "aven-flock",
  name: "Aven Flock",
  scryfallId: "43c97d63-d0f9-402d-948a-b73f73bed919",
  types: ["Creature"],
  subtypes: ["Bird", "Soldier"],
  manaCost: { generic: 4, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 3,
  keywords: ["Flying"],
  activatedAbilities: [{ cost: { mana: { generic: 0, colors: { W: 1 } } }, effect: { kind: "pump", power: 0, toughness: 1 } }],
  tier: "scripted",
};

export const AVENGERS_HANGAR: CardDefinition = {
  id: "avengers-hangar",
  name: "Avengers Hangar",
  scryfallId: "c5d03ebb-1ce9-4a6b-b13e-a72f0b075ae8",
  types: ["Land"],
  colorIdentity: ["U", "W"],
  entersTapped: true,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 1 } }],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }],
  tier: "scripted",
};

export const AXEBANE_STAG: CardDefinition = {
  id: "axebane-stag",
  name: "Axebane Stag",
  scryfallId: "bfce7c02-ccc3-44cd-8087-627eaa6a072e",
  types: ["Creature"],
  subtypes: ["Elk"],
  manaCost: { generic: 6, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 6,
  toughness: 7,
  tier: "vanilla",
};

export const AZORIUS_GUILDGATE: CardDefinition = {
  id: "azorius-guildgate",
  name: "Azorius Guildgate",
  scryfallId: "f98a7264-0a83-42c8-a94d-05ad4c234242",
  types: ["Land"],
  subtypes: ["Gate"],
  colorIdentity: ["U", "W"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }],
  tier: "vanilla",
};

export const BADLANDS: CardDefinition = {
  id: "badlands",
  name: "Badlands",
  scryfallId: "73403d04-fe97-4830-8b80-16dd1a1a6cc1",
  types: ["Land"],
  subtypes: ["Swamp", "Mountain"],
  colorIdentity: ["B", "R"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }],
  tier: "vanilla",
};

export const BALEFUL_STRIX: CardDefinition = {
  id: "baleful-strix",
  name: "Baleful Strix",
  scryfallId: "be8439e6-f779-49f0-806a-b04995697a6a",
  types: ["Artifact", "Creature"],
  subtypes: ["Bird"],
  manaCost: { generic: 0, colors: { B: 1, U: 1 } },
  colorIdentity: ["B", "U"],
  power: 1,
  toughness: 1,
  keywords: ["Flying", "Deathtouch"],
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "draw", amount: 1 } }],
  tier: "scripted",
};

export const BALSHAN_COLLABORATOR: CardDefinition = {
  id: "balshan-collaborator",
  name: "Balshan Collaborator",
  scryfallId: "e23ebd3b-59bf-4f3d-b320-9283871c4540",
  types: ["Creature"],
  subtypes: ["Bird", "Soldier"],
  manaCost: { generic: 3, colors: { U: 1 } },
  colorIdentity: ["B", "U"],
  power: 2,
  toughness: 2,
  keywords: ["Flying"],
  activatedAbilities: [{ cost: { mana: { generic: 0, colors: { B: 1 } } }, effect: { kind: "pump", power: 1, toughness: 1 } }],
  tier: "scripted",
};

export const BARBARY_APES: CardDefinition = {
  id: "barbary-apes",
  name: "Barbary Apes",
  scryfallId: "df25ffdd-995d-46ae-856b-f6368f9438ed",
  types: ["Creature"],
  subtypes: ["Ape"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 2,
  toughness: 2,
  tier: "vanilla",
};

export const BARKTOOTH_WARBEARD: CardDefinition = {
  id: "barktooth-warbeard",
  name: "Barktooth Warbeard",
  scryfallId: "bffbda3c-61c0-421d-a724-6bb9a7005c0f",
  types: ["Creature"],
  subtypes: ["Human", "Warrior"],
  supertypes: ["Legendary"],
  manaCost: { generic: 4, colors: { B: 1, R: 2 } },
  colorIdentity: ["B", "R"],
  power: 6,
  toughness: 5,
  canBeCommander: true,
  tier: "vanilla",
};

export const BARON_AIRSHIP_KINGDOM: CardDefinition = {
  id: "baron-airship-kingdom",
  name: "Baron, Airship Kingdom",
  scryfallId: "6e4bf840-802d-47d5-bffd-8ba495e19cf6",
  types: ["Land"],
  subtypes: ["Town"],
  colorIdentity: ["R", "U"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }],
  tier: "vanilla",
};

export const BATTLE_HURDA: CardDefinition = {
  id: "battle-hurda",
  name: "Battle Hurda",
  scryfallId: "2f540b83-67fd-4630-a461-69bc84b88ed3",
  types: ["Creature"],
  subtypes: ["Giant"],
  manaCost: { generic: 4, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 3,
  keywords: ["First Strike"],
  tier: "vanilla",
};

export const BATTLEFIELD_RAPTOR: CardDefinition = {
  id: "battlefield-raptor",
  name: "Battlefield Raptor",
  scryfallId: "389f0045-218d-41cd-bdca-8a9a0ab1b31b",
  types: ["Creature"],
  subtypes: ["Bird"],
  manaCost: { generic: 0, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 2,
  keywords: ["Flying", "First Strike"],
  tier: "vanilla",
};

export const BEAR_S_COMPANION: CardDefinition = {
  id: "bears-companion",
  name: "Bear's Companion",
  scryfallId: "28194ca7-3b2a-49b8-8f03-56a2c97859d9",
  types: ["Creature"],
  subtypes: ["Human", "Warrior"],
  manaCost: { generic: 2, colors: { G: 1, R: 1, U: 1 } },
  colorIdentity: ["G", "R", "U"],
  power: 2,
  toughness: 2,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-g-44-bear" } }],
  tier: "scripted",
};

export const BEETLEBACK_CHIEF: CardDefinition = {
  id: "beetleback-chief",
  name: "Beetleback Chief",
  scryfallId: "2d19a474-b008-4088-8a31-333c0b2d9d65",
  types: ["Creature"],
  subtypes: ["Goblin", "Warrior"],
  manaCost: { generic: 2, colors: { R: 2 } },
  colorIdentity: ["R"],
  power: 2,
  toughness: 2,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "createToken", count: 2, tokenDefinitionId: "token-r-11-goblin" } }],
  tier: "scripted",
};

export const BELLOWS_LIZARD: CardDefinition = {
  id: "bellows-lizard",
  name: "Bellows Lizard",
  scryfallId: "285d2e99-13f1-4ce8-9a54-139de193c1b3",
  types: ["Creature"],
  subtypes: ["Lizard"],
  manaCost: { generic: 0, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 1,
  toughness: 1,
  activatedAbilities: [{ cost: { mana: { generic: 1, colors: { R: 1 } } }, effect: { kind: "pump", power: 1, toughness: 0 } }],
  tier: "scripted",
};

export const BESKIR_SHIELDMATE: CardDefinition = {
  id: "beskir-shieldmate",
  name: "Beskir Shieldmate",
  scryfallId: "dfc1df84-9c47-444b-9d58-d9c7bed51c66",
  types: ["Creature"],
  subtypes: ["Human", "Warrior"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 1,
  triggeredAbilities: [{ event: "dies", effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-w-11-human-warrior" } }],
  tier: "scripted",
};

export const BILBO_S_DEADLY_SLICE: CardDefinition = {
  id: "bilbos-deadly-slice",
  name: "Bilbo's Deadly Slice",
  scryfallId: "17892c93-b9b2-4720-933b-998ed0200492",
  types: ["Instant"],
  manaCost: { generic: 1, colors: { B: 2 } },
  colorIdentity: ["B"],
  castEffect: { kind: "destroy", target: { kind: "creature" } },
  tier: "scripted",
};

export const BIRNIN_ZANA_PLAZA: CardDefinition = {
  id: "birnin-zana-plaza",
  name: "Birnin Zana Plaza",
  scryfallId: "41463827-46de-40c4-ac2b-1fdf6aa36f65",
  types: ["Land"],
  colorIdentity: ["G", "W"],
  entersTapped: true,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 1 } }],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }],
  tier: "scripted",
};

export const BISHOP_S_SOLDIER: CardDefinition = {
  id: "bishops-soldier",
  name: "Bishop's Soldier",
  scryfallId: "16dfd7b3-6d01-4e98-aec3-b27e8e2444e8",
  types: ["Creature"],
  subtypes: ["Vampire", "Soldier"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 2,
  keywords: ["Lifelink"],
  tier: "vanilla",
};

export const BITTERBOW_SHARPSHOOTERS: CardDefinition = {
  id: "bitterbow-sharpshooters",
  name: "Bitterbow Sharpshooters",
  scryfallId: "8ecfcf99-be2b-4e5f-adef-1977ee5c6a0f",
  types: ["Creature"],
  subtypes: ["Jackal", "Archer"],
  manaCost: { generic: 4, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 4,
  toughness: 4,
  keywords: ["Reach", "Vigilance"],
  tier: "vanilla",
};

export const BLACK_WIDOW_NATASHA_ROMANOFF: CardDefinition = {
  id: "black-widow-natasha-romanoff",
  name: "Black Widow, Natasha Romanoff",
  scryfallId: "2f3e2f33-9c31-4107-b9b4-a7e1d2d43bab",
  types: ["Creature"],
  subtypes: ["Human", "Assassin", "Hero"],
  supertypes: ["Legendary"],
  manaCost: { generic: 1, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 2,
  toughness: 2,
  canBeCommander: true,
  tier: "vanilla",
};

export const BLAZEMIRE_VERGE: CardDefinition = {
  id: "blazemire-verge",
  name: "Blazemire Verge",
  scryfallId: "d151c8e2-d715-470d-868a-f45191db9fa0",
  types: ["Land"],
  colorIdentity: ["B", "R"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 }, activateOnlyIf: { kind: "controls-subtype", subtypes: ["Swamp", "Mountain"] } }],
  tier: "vanilla",
};

export const BLEACHBONE_VERGE: CardDefinition = {
  id: "bleachbone-verge",
  name: "Bleachbone Verge",
  scryfallId: "52dcdabd-a186-45fe-9fee-6c0f1afeaf16",
  types: ["Land"],
  colorIdentity: ["B", "W"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 }, activateOnlyIf: { kind: "controls-subtype", subtypes: ["Plains", "Swamp"] } }],
  tier: "vanilla",
};

export const BLISTERING_DIEFLYN: CardDefinition = {
  id: "blistering-dieflyn",
  name: "Blistering Dieflyn",
  scryfallId: "5720a5b2-60ca-49f9-83e8-b801471c92ea",
  types: ["Creature"],
  subtypes: ["Imp"],
  manaCost: { generic: 3, colors: { R: 1 } },
  colorIdentity: ["B", "R"],
  power: 0,
  toughness: 1,
  keywords: ["Flying"],
  activatedAbilities: [{ cost: { mana: { generic: 0, colors: {}, hybrid: [["B", "R"]] } }, effect: { kind: "pump", power: 1, toughness: 0 } }],
  tier: "scripted",
};

export const BLOOD_RESEARCHER: CardDefinition = {
  id: "blood-researcher",
  name: "Blood Researcher",
  scryfallId: "3e35e9ba-a10e-4926-a7a6-3a65efc2a730",
  types: ["Creature"],
  subtypes: ["Vampire", "Druid"],
  manaCost: { generic: 1, colors: { B: 1, G: 1 } },
  colorIdentity: ["B", "G"],
  power: 2,
  toughness: 2,
  keywords: ["Menace"],
  triggeredAbilities: [{ event: "gain-life", effect: { kind: "addCounter", amount: 1 } }],
  tier: "scripted",
};

export const BLOODBOND_VAMPIRE: CardDefinition = {
  id: "bloodbond-vampire",
  name: "Bloodbond Vampire",
  scryfallId: "b1c6df1d-7709-41e4-a79f-0dc722600191",
  types: ["Creature"],
  subtypes: ["Vampire", "Shaman", "Ally"],
  manaCost: { generic: 2, colors: { B: 2 } },
  colorIdentity: ["B"],
  power: 3,
  toughness: 3,
  triggeredAbilities: [{ event: "gain-life", effect: { kind: "addCounter", amount: 1 } }],
  tier: "scripted",
};

export const BLOODFELL_CAVES: CardDefinition = {
  id: "bloodfell-caves",
  name: "Bloodfell Caves",
  scryfallId: "1dde3c68-6f29-4c00-b668-c25ac9e3e13b",
  types: ["Land"],
  colorIdentity: ["B", "R"],
  entersTapped: true,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 1 } }],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }],
  tier: "scripted",
};

export const BLOODSTONE_CAMEO: CardDefinition = {
  id: "bloodstone-cameo",
  name: "Bloodstone Cameo",
  scryfallId: "f9db32fa-64b2-4ef6-88f2-28e758d420bb",
  types: ["Artifact"],
  manaCost: { generic: 3, colors: {} },
  colorIdentity: ["B", "R"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }],
  tier: "vanilla",
};

export const BLOODTHIRSTY_AERIALIST: CardDefinition = {
  id: "bloodthirsty-aerialist",
  name: "Bloodthirsty Aerialist",
  scryfallId: "378b2e55-e383-408e-af57-072e47cea779",
  types: ["Creature"],
  subtypes: ["Vampire", "Rogue"],
  manaCost: { generic: 1, colors: { B: 2 } },
  colorIdentity: ["B"],
  power: 2,
  toughness: 3,
  keywords: ["Flying"],
  triggeredAbilities: [{ event: "gain-life", effect: { kind: "addCounter", amount: 1 } }],
  tier: "scripted",
};

export const BLOSSOMING_SANDS: CardDefinition = {
  id: "blossoming-sands",
  name: "Blossoming Sands",
  scryfallId: "0a9df994-e0f4-4919-af99-4f643eb9199c",
  types: ["Land"],
  colorIdentity: ["G", "W"],
  entersTapped: true,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 1 } }],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }],
  tier: "scripted",
};

export const BORDER_GUARD: CardDefinition = {
  id: "border-guard",
  name: "Border Guard",
  scryfallId: "43cc74c6-f0e5-443d-a2b3-4dcbf5858034",
  types: ["Creature"],
  subtypes: ["Human", "Soldier"],
  manaCost: { generic: 2, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 4,
  tier: "vanilla",
};

export const BOREAL_DRUID: CardDefinition = {
  id: "boreal-druid",
  name: "Boreal Druid",
  scryfallId: "473d3633-6dc7-4026-a50e-3ea76b9e8c20",
  types: ["Creature"],
  subtypes: ["Elf", "Druid"],
  manaCost: { generic: 0, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 1,
  toughness: 1,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 1 } }],
  tier: "scripted",
};

export const BOREAL_SHELF: CardDefinition = {
  id: "boreal-shelf",
  name: "Boreal Shelf",
  scryfallId: "3f2f8396-72ab-4387-9276-987836427107",
  types: ["Land"],
  supertypes: ["Snow"],
  colorIdentity: ["U", "W"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }],
  tier: "vanilla",
};

export const BOROS_GUILDGATE: CardDefinition = {
  id: "boros-guildgate",
  name: "Boros Guildgate",
  scryfallId: "3e3c74ea-40e9-4ad9-a491-c208403b68ad",
  types: ["Land"],
  subtypes: ["Gate"],
  colorIdentity: ["R", "W"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }],
  tier: "vanilla",
};

export const BOROS_RECRUIT: CardDefinition = {
  id: "boros-recruit",
  name: "Boros Recruit",
  scryfallId: "5af01330-05c2-4c5b-9830-2886711b2b5d",
  types: ["Creature"],
  subtypes: ["Goblin", "Soldier"],
  manaCost: { generic: 0, colors: {}, hybrid: [["R", "W"]] },
  colorIdentity: ["R", "W"],
  power: 1,
  toughness: 1,
  keywords: ["First Strike"],
  tier: "vanilla",
};

export const BOROS_SWIFTBLADE: CardDefinition = {
  id: "boros-swiftblade",
  name: "Boros Swiftblade",
  scryfallId: "6135a9f2-e86d-4a34-857e-adea3c722fea",
  types: ["Creature"],
  subtypes: ["Human", "Soldier"],
  manaCost: { generic: 0, colors: { R: 1, W: 1 } },
  colorIdentity: ["R", "W"],
  power: 1,
  toughness: 2,
  keywords: ["Double Strike"],
  tier: "vanilla",
};

export const BOUNTIFUL_PROMENADE: CardDefinition = {
  id: "bountiful-promenade",
  name: "Bountiful Promenade",
  scryfallId: "f0b11ba3-68ba-4067-af40-2a55e31b395e",
  types: ["Land"],
  colorIdentity: ["G", "W"],
  entersTapped: true,
  entersTappedUnless: { kind: "opponents", count: 2 },
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }],
  tier: "vanilla",
};

export const BRAMBLEWEFT_BEHEMOTH: CardDefinition = {
  id: "brambleweft-behemoth",
  name: "Brambleweft Behemoth",
  scryfallId: "1c759e94-e437-4dda-af0f-6578c0a50619",
  types: ["Creature"],
  subtypes: ["Elemental"],
  manaCost: { generic: 4, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 6,
  toughness: 6,
  keywords: ["Trample"],
  tier: "vanilla",
};

export const BRIGHTBLADE_STOAT: CardDefinition = {
  id: "brightblade-stoat",
  name: "Brightblade Stoat",
  scryfallId: "df7fea2e-7414-4bc8-adb0-9342e174c009",
  types: ["Creature"],
  subtypes: ["Weasel", "Soldier"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 2,
  keywords: ["First Strike", "Lifelink"],
  tier: "vanilla",
};

export const BRIMSTONE_DRAGON: CardDefinition = {
  id: "brimstone-dragon",
  name: "Brimstone Dragon",
  scryfallId: "37463644-b657-42d8-82fd-d2d9727abbf0",
  types: ["Creature"],
  subtypes: ["Dragon"],
  manaCost: { generic: 6, colors: { R: 2 } },
  colorIdentity: ["R"],
  power: 6,
  toughness: 6,
  keywords: ["Flying", "Haste"],
  tier: "vanilla",
};

export const BRINDLE_SHOAT: CardDefinition = {
  id: "brindle-shoat",
  name: "Brindle Shoat",
  scryfallId: "0a005933-e206-4b14-9a0f-755fae6c5a2a",
  types: ["Creature"],
  subtypes: ["Boar"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 1,
  toughness: 1,
  triggeredAbilities: [{ event: "dies", effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-g-33-boar" } }],
  tier: "scripted",
};

export const BROKERS_HIDEOUT: CardDefinition = {
  id: "brokers-hideout",
  name: "Brokers Hideout",
  scryfallId: "989b299b-daa9-4bda-94e2-9a2f0e8f2bce",
  types: ["Land"],
  colorIdentity: [],
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "sequence", effects: [{ kind: "sacrifice", what: "self" }, { kind: "searchLibrary", cardType: "Land", basicLandOnly: true, subtypes: ["Forest", "Plains", "Island"], destination: "battlefield", tapped: true }, { kind: "gainLife", amount: 1 }] } }],
  tier: "scripted",
};

export const BRONZE_SABLE: CardDefinition = {
  id: "bronze-sable",
  name: "Bronze Sable",
  scryfallId: "a95f8df0-3490-47ad-b452-76fe60179242",
  types: ["Artifact", "Creature"],
  subtypes: ["Sable"],
  manaCost: { generic: 2, colors: {} },
  colorIdentity: [],
  power: 2,
  toughness: 1,
  tier: "vanilla",
};

export const BROOD_WEAVER: CardDefinition = {
  id: "brood-weaver",
  name: "Brood Weaver",
  scryfallId: "e24e2f49-70f9-445f-af03-2ef43798004a",
  types: ["Creature"],
  subtypes: ["Spider"],
  manaCost: { generic: 3, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 2,
  toughness: 4,
  keywords: ["Reach"],
  triggeredAbilities: [{ event: "dies", effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-g-12-spider-reach" } }],
  tier: "scripted",
};

export const BROODMATE_DRAGON: CardDefinition = {
  id: "broodmate-dragon",
  name: "Broodmate Dragon",
  scryfallId: "ea62ec34-be95-4682-a3fd-9a92a89103b5",
  types: ["Creature"],
  subtypes: ["Dragon"],
  manaCost: { generic: 3, colors: { B: 1, G: 1, R: 1 } },
  colorIdentity: ["B", "G", "R"],
  power: 4,
  toughness: 4,
  keywords: ["Flying"],
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-r-44-dragon-flying" } }],
  tier: "scripted",
};

export const BRUSHLAND: CardDefinition = {
  id: "brushland",
  name: "Brushland",
  scryfallId: "18d236ce-3b78-403a-b5f9-4fb44123d85b",
  types: ["Land"],
  colorIdentity: ["G", "W"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 }, damageToController: 1 }, { cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 }, damageToController: 1 }],
  tier: "vanilla",
};

export const BRUSHSTRIDER: CardDefinition = {
  id: "brushstrider",
  name: "Brushstrider",
  scryfallId: "6649d5e9-22fb-4134-a4d9-ee05e6668f94",
  types: ["Creature"],
  subtypes: ["Beast"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 3,
  toughness: 1,
  keywords: ["Vigilance"],
  tier: "vanilla",
};

export const BULETTE: CardDefinition = {
  id: "bulette",
  name: "Bulette",
  scryfallId: "206a9e7b-45c1-4213-8fc4-27d90e2ab0e9",
  types: ["Creature"],
  subtypes: ["Beast"],
  manaCost: { generic: 3, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 3,
  toughness: 3,
  triggeredAbilities: [{ event: "end-step", watches: "controller", onlyIf: { kind: "creature-died-this-turn" }, effect: { kind: "addCounter", amount: 1 } }],
  tier: "scripted",
};

export const BULL_CERODON: CardDefinition = {
  id: "bull-cerodon",
  name: "Bull Cerodon",
  scryfallId: "1d375f2c-8d43-4e25-a0fb-9e936a03d5f7",
  types: ["Creature"],
  subtypes: ["Beast"],
  manaCost: { generic: 4, colors: { R: 1, W: 1 } },
  colorIdentity: ["R", "W"],
  power: 5,
  toughness: 5,
  keywords: ["Vigilance", "Haste"],
  tier: "vanilla",
};

export const BUZZ_BOTS: CardDefinition = {
  id: "buzz-bots",
  name: "Buzz Bots",
  scryfallId: "7c375190-f81b-4ab1-a1b6-fe432796821f",
  types: ["Artifact", "Creature"],
  subtypes: ["Robot", "Insect"],
  manaCost: { generic: 1, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 1,
  toughness: 1,
  keywords: ["Flying", "Vigilance"],
  triggeredAbilities: [{ event: "dies", effect: { kind: "draw", amount: 1 } }],
  tier: "scripted",
};

export const CABARETTI_COURTYARD: CardDefinition = {
  id: "cabaretti-courtyard",
  name: "Cabaretti Courtyard",
  scryfallId: "c54ddd4e-f668-4ec8-b123-59afa977eba4",
  types: ["Land"],
  colorIdentity: [],
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "sequence", effects: [{ kind: "sacrifice", what: "self" }, { kind: "searchLibrary", cardType: "Land", basicLandOnly: true, subtypes: ["Mountain", "Forest", "Plains"], destination: "battlefield", tapped: true }, { kind: "gainLife", amount: 1 }] } }],
  tier: "scripted",
};

export const CALDERA_LAKE: CardDefinition = {
  id: "caldera-lake",
  name: "Caldera Lake",
  scryfallId: "f79313f8-0b79-4fe3-8eb1-db523587b714",
  types: ["Land"],
  colorIdentity: ["R", "U"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 }, damageToController: 1 }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 }, damageToController: 1 }],
  tier: "vanilla",
};

export const CARAVAN_HURDA: CardDefinition = {
  id: "caravan-hurda",
  name: "Caravan Hurda",
  scryfallId: "ffdf3a3d-292d-40b9-b28c-34ad33a76bb4",
  types: ["Creature"],
  subtypes: ["Giant"],
  manaCost: { generic: 4, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 5,
  keywords: ["Lifelink"],
  tier: "vanilla",
};

export const CARVEN_CARYATID: CardDefinition = {
  id: "carven-caryatid",
  name: "Carven Caryatid",
  scryfallId: "f65260d1-9802-4e46-95d3-9d6c2e211338",
  types: ["Creature"],
  subtypes: ["Spirit"],
  manaCost: { generic: 1, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 2,
  toughness: 5,
  keywords: ["Defender"],
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "draw", amount: 1 } }],
  tier: "scripted",
};

export const CASCADE_BLUFFS: CardDefinition = {
  id: "cascade-bluffs",
  name: "Cascade Bluffs",
  scryfallId: "22acccd2-4e9d-46de-a060-863b08152e50",
  types: ["Land"],
  colorIdentity: ["R", "U"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 1 } }, { cost: { tap: true, mana: { generic: 0, colors: {}, hybrid: [["U", "R"]] } }, effect: { kind: "addManaCombination", mana: [{ color: "U", amount: 2 }] } }, { cost: { tap: true, mana: { generic: 0, colors: {}, hybrid: [["U", "R"]] } }, effect: { kind: "addManaCombination", mana: [{ color: "U", amount: 1 }, { color: "R", amount: 1 }] } }, { cost: { tap: true, mana: { generic: 0, colors: {}, hybrid: [["U", "R"]] } }, effect: { kind: "addManaCombination", mana: [{ color: "R", amount: 2 }] } }],
  tier: "vanilla",
};

export const CAVERN_THOCTAR: CardDefinition = {
  id: "cavern-thoctar",
  name: "Cavern Thoctar",
  scryfallId: "34748acb-7045-42b6-a93f-a3f11a1bc839",
  types: ["Creature"],
  subtypes: ["Beast"],
  manaCost: { generic: 5, colors: { G: 1 } },
  colorIdentity: ["G", "R"],
  power: 5,
  toughness: 5,
  activatedAbilities: [{ cost: { mana: { generic: 1, colors: { R: 1 } } }, effect: { kind: "pump", power: 1, toughness: 0 } }],
  tier: "scripted",
};

export const CAVES_OF_KOILOS: CardDefinition = {
  id: "caves-of-koilos",
  name: "Caves of Koilos",
  scryfallId: "a8a57915-5226-4d3c-ae8e-a55c50f3c131",
  types: ["Land"],
  colorIdentity: ["B", "W"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 }, damageToController: 1 }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 }, damageToController: 1 }],
  tier: "vanilla",
};

export const CELEBRITY_FENCER: CardDefinition = {
  id: "celebrity-fencer",
  name: "Celebrity Fencer",
  scryfallId: "5afb5c5c-06e0-4b11-ad07-aef7be6e2cd4",
  types: ["Creature"],
  subtypes: ["Elf", "Druid"],
  manaCost: { generic: 3, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 2,
  triggeredAbilities: [{ event: "permanent-enters", watches: "controller", watchFor: { type: "Creature" }, effect: { kind: "addCounter", amount: 1 } }],
  tier: "scripted",
};

export const CELESTIAL_FORCE: CardDefinition = {
  id: "celestial-force",
  name: "Celestial Force",
  scryfallId: "0d51a3f0-2546-43c1-9a92-625997a24e9b",
  types: ["Creature"],
  subtypes: ["Elemental"],
  manaCost: { generic: 5, colors: { W: 3 } },
  colorIdentity: ["W"],
  power: 7,
  toughness: 7,
  triggeredAbilities: [{ event: "upkeep", watches: "any", effect: { kind: "gainLife", amount: 3 } }],
  tier: "scripted",
};

export const CELESTIAL_UNICORN: CardDefinition = {
  id: "celestial-unicorn",
  name: "Celestial Unicorn",
  scryfallId: "f2d68812-8862-4e34-a992-7d6bbadaf316",
  types: ["Creature"],
  subtypes: ["Unicorn"],
  manaCost: { generic: 2, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 2,
  triggeredAbilities: [{ event: "gain-life", effect: { kind: "addCounter", amount: 1 } }],
  tier: "scripted",
};

export const CENTAUR_HEALER: CardDefinition = {
  id: "centaur-healer",
  name: "Centaur Healer",
  scryfallId: "e92b32f0-01bd-4501-b0ad-90d2c296077a",
  types: ["Creature"],
  subtypes: ["Centaur", "Cleric"],
  manaCost: { generic: 1, colors: { G: 1, W: 1 } },
  colorIdentity: ["G", "W"],
  power: 3,
  toughness: 3,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 3 } }],
  tier: "scripted",
};

export const CENTAUR_NURTURER: CardDefinition = {
  id: "centaur-nurturer",
  name: "Centaur Nurturer",
  scryfallId: "bf020acb-e0c6-43b4-8324-0f2ec68b73d6",
  types: ["Creature"],
  subtypes: ["Centaur", "Druid"],
  manaCost: { generic: 3, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 2,
  toughness: 4,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 3 } }],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "scripted",
};

export const CENTAUR_SAFEGUARD: CardDefinition = {
  id: "centaur-safeguard",
  name: "Centaur Safeguard",
  scryfallId: "647d3e06-93e6-4948-a3ec-6a00bdfc0f99",
  types: ["Creature"],
  subtypes: ["Centaur", "Warrior"],
  manaCost: { generic: 2, colors: {}, hybrid: [["G", "W"]] },
  colorIdentity: ["G", "W"],
  power: 3,
  toughness: 1,
  triggeredAbilities: [{ event: "dies", optional: true, effect: { kind: "gainLife", amount: 3 } }],
  tier: "scripted",
};

export const CERODON_YEARLING: CardDefinition = {
  id: "cerodon-yearling",
  name: "Cerodon Yearling",
  scryfallId: "116abc15-d79b-4dfe-8f9f-f38bcf429da8",
  types: ["Creature"],
  subtypes: ["Beast"],
  manaCost: { generic: 0, colors: { R: 1, W: 1 } },
  colorIdentity: ["R", "W"],
  power: 2,
  toughness: 2,
  keywords: ["Vigilance", "Haste"],
  tier: "vanilla",
};

export const CHAMPION_OF_ARASHIN: CardDefinition = {
  id: "champion-of-arashin",
  name: "Champion of Arashin",
  scryfallId: "2f7e5122-89ff-4a25-96a5-fee5f96da7f2",
  types: ["Creature"],
  subtypes: ["Dog", "Warrior"],
  manaCost: { generic: 3, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 2,
  keywords: ["Lifelink"],
  tier: "vanilla",
};

export const CHANNEL_THE_SUNS: CardDefinition = {
  id: "channel-the-suns",
  name: "Channel the Suns",
  scryfallId: "7bf574c8-a7e0-482e-bb41-680454988097",
  types: ["Sorcery"],
  manaCost: { generic: 3, colors: { G: 1 } },
  colorIdentity: ["B", "G", "R", "U", "W"],
  castEffect: { kind: "addManaCombination", mana: [{ color: "B", amount: 1 }, { color: "G", amount: 1 }, { color: "R", amount: 1 }, { color: "U", amount: 1 }, { color: "W", amount: 1 }] },
  tier: "scripted",
};

export const CHAR_RUMBLER: CardDefinition = {
  id: "char-rumbler",
  name: "Char-Rumbler",
  scryfallId: "13f696f9-afa2-40c4-950a-e1e01c452017",
  types: ["Creature"],
  subtypes: ["Elemental"],
  manaCost: { generic: 2, colors: { R: 2 } },
  colorIdentity: ["R"],
  power: -1,
  toughness: 3,
  keywords: ["Double Strike"],
  activatedAbilities: [{ cost: { mana: { generic: 0, colors: { R: 1 } } }, effect: { kind: "pump", power: 1, toughness: 0 } }],
  tier: "scripted",
};

export const CHARDALYN_DRAGON: CardDefinition = {
  id: "chardalyn-dragon",
  name: "Chardalyn Dragon",
  scryfallId: "a950d8be-dcf7-4253-a3cc-c040ba632355",
  types: ["Artifact", "Creature"],
  subtypes: ["Dragon"],
  manaCost: { generic: 6, colors: {} },
  colorIdentity: [],
  power: 4,
  toughness: 4,
  keywords: ["Flying"],
  tier: "vanilla",
};

export const CHIMNEY_RABBLE: CardDefinition = {
  id: "chimney-rabble",
  name: "Chimney Rabble",
  scryfallId: "5668699d-8df8-426b-a04a-99cfe55e570b",
  types: ["Creature"],
  subtypes: ["Phyrexian", "Goblin", "Warrior"],
  manaCost: { generic: 3, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 3,
  toughness: 3,
  keywords: ["Haste"],
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-r-11-phyrexian-goblin" } }],
  tier: "scripted",
};

export const CINDER_BARRENS: CardDefinition = {
  id: "cinder-barrens",
  name: "Cinder Barrens",
  scryfallId: "08136a39-bf9f-493c-92d6-178567647fb2",
  types: ["Land"],
  colorIdentity: ["B", "R"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }],
  tier: "vanilla",
};

export const CITIZEN_V_HELMUT_ZEMO: CardDefinition = {
  id: "citizen-v-helmut-zemo",
  name: "Citizen V, Helmut Zemo",
  scryfallId: "4c2bdc18-9648-44a2-97dd-b0e03789d186",
  types: ["Creature"],
  subtypes: ["Human", "Noble", "Villain"],
  supertypes: ["Legendary"],
  manaCost: { generic: 2, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 2,
  toughness: 2,
  keywords: ["Lifelink"],
  triggeredAbilities: [{ event: "gain-life", effect: { kind: "addCounterToEachOther", amount: 1, subtypes: ["Villain"], includesSelf: true } }],
  canBeCommander: true,
  tier: "scripted",
};

export const CLARION_CATHARS: CardDefinition = {
  id: "clarion-cathars",
  name: "Clarion Cathars",
  scryfallId: "89f8ea28-7de1-4908-8e2d-b1aeff651015",
  types: ["Creature"],
  subtypes: ["Human", "Knight"],
  manaCost: { generic: 3, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 3,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-w-11-human" } }],
  tier: "scripted",
};

export const CLASH_OF_WILLS: CardDefinition = {
  id: "clash-of-wills",
  name: "Clash of Wills",
  scryfallId: "665ee42f-8d76-4f8b-9dd3-7455a90f0da7",
  types: ["Instant"],
  manaCost: { generic: 0, colors: { U: 1 }, x: 1 },
  colorIdentity: ["U"],
  castEffect: { kind: "counter", target: { kind: "spell" }, unlessPays: { generic: 0, colors: {}, x: 1 } },
  tier: "scripted",
};

export const CLOUDCROWN_OAK: CardDefinition = {
  id: "cloudcrown-oak",
  name: "Cloudcrown Oak",
  scryfallId: "833211c0-3bec-4548-97a0-c9381660cd88",
  types: ["Creature"],
  subtypes: ["Treefolk", "Warrior"],
  manaCost: { generic: 2, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 3,
  toughness: 4,
  keywords: ["Reach"],
  tier: "vanilla",
};

export const COASTAL_TOWER: CardDefinition = {
  id: "coastal-tower",
  name: "Coastal Tower",
  scryfallId: "4febfcf0-6537-4e30-a963-9859314d0657",
  types: ["Land"],
  colorIdentity: ["U", "W"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }],
  tier: "vanilla",
};

export const COILED_TINVIPER: CardDefinition = {
  id: "coiled-tinviper",
  name: "Coiled Tinviper",
  scryfallId: "c62c2f66-6419-49ca-82d7-a5e8789a665f",
  types: ["Artifact", "Creature"],
  subtypes: ["Snake"],
  manaCost: { generic: 3, colors: {} },
  colorIdentity: [],
  power: 2,
  toughness: 1,
  keywords: ["First Strike"],
  tier: "vanilla",
};

export const COLOSSAPEDE: CardDefinition = {
  id: "colossapede",
  name: "Colossapede",
  scryfallId: "7642bfc5-ace8-419e-b57b-2b881bfe023e",
  types: ["Creature"],
  subtypes: ["Insect"],
  manaCost: { generic: 4, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 5,
  toughness: 5,
  tier: "vanilla",
};

export const CONCLAVE_CAVALIER: CardDefinition = {
  id: "conclave-cavalier",
  name: "Conclave Cavalier",
  scryfallId: "084d80d4-c675-4f2a-97ce-ec0b401ecadf",
  types: ["Creature"],
  subtypes: ["Centaur", "Knight"],
  manaCost: { generic: 0, colors: { G: 2, W: 2 } },
  colorIdentity: ["G", "W"],
  power: 4,
  toughness: 4,
  keywords: ["Vigilance"],
  triggeredAbilities: [{ event: "dies", effect: { kind: "createToken", count: 2, tokenDefinitionId: "token-gw-22-elf-knight-vigilance" } }],
  tier: "scripted",
};

export const CONSULATE_SKYGATE: CardDefinition = {
  id: "consulate-skygate",
  name: "Consulate Skygate",
  scryfallId: "6d808a30-f1b5-484e-a90e-0a9f751ef597",
  types: ["Artifact", "Creature"],
  subtypes: ["Wall"],
  manaCost: { generic: 2, colors: {} },
  colorIdentity: [],
  power: 0,
  toughness: 4,
  keywords: ["Defender", "Reach"],
  tier: "vanilla",
};

export const CONTAMINATED_AQUIFER: CardDefinition = {
  id: "contaminated-aquifer",
  name: "Contaminated Aquifer",
  scryfallId: "9fad6994-1280-4a8e-a2f5-34b4ed6ef6f5",
  types: ["Land"],
  subtypes: ["Island", "Swamp"],
  colorIdentity: ["B", "U"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }],
  tier: "vanilla",
};

export const COPPER_MYR: CardDefinition = {
  id: "copper-myr",
  name: "Copper Myr",
  scryfallId: "323efe27-da58-4207-9c0c-dba5031bfa04",
  types: ["Artifact", "Creature"],
  subtypes: ["Myr"],
  manaCost: { generic: 2, colors: {} },
  colorIdentity: ["G"],
  power: 1,
  toughness: 1,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "scripted",
};

export const COURIER_GRIFFIN: CardDefinition = {
  id: "courier-griffin",
  name: "Courier Griffin",
  scryfallId: "4d3afc71-f5db-45c3-96b2-8454b7f33542",
  types: ["Creature"],
  subtypes: ["Griffin"],
  manaCost: { generic: 3, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 3,
  keywords: ["Flying"],
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 2 } }],
  tier: "scripted",
};

export const COWL_PROWLER: CardDefinition = {
  id: "cowl-prowler",
  name: "Cowl Prowler",
  scryfallId: "f372f545-b70c-470b-9aab-4a2ea900f777",
  types: ["Creature"],
  subtypes: ["Wurm"],
  manaCost: { generic: 4, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 6,
  toughness: 6,
  tier: "vanilla",
};

export const CRASH_OF_RHINOS: CardDefinition = {
  id: "crash-of-rhinos",
  name: "Crash of Rhinos",
  scryfallId: "d74e0337-d9ac-4bf2-b2b5-aadc97433030",
  types: ["Creature"],
  subtypes: ["Rhino"],
  manaCost: { generic: 6, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 8,
  toughness: 4,
  keywords: ["Trample"],
  tier: "vanilla",
};

export const CRESTED_HERDCALLER: CardDefinition = {
  id: "crested-herdcaller",
  name: "Crested Herdcaller",
  scryfallId: "44c7792e-39e4-486e-827b-b0d01cd15bc3",
  types: ["Creature"],
  subtypes: ["Dinosaur"],
  manaCost: { generic: 3, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 3,
  toughness: 3,
  keywords: ["Trample"],
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-g-33-dinosaur-trample" } }],
  tier: "scripted",
};

export const CRUMBLING_NECROPOLIS: CardDefinition = {
  id: "crumbling-necropolis",
  name: "Crumbling Necropolis",
  scryfallId: "d28542af-936f-44e5-a4e3-119f23c9f0d6",
  types: ["Land"],
  colorIdentity: ["B", "R", "U"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }],
  tier: "vanilla",
};

export const CYCLOPS_OF_ONE_EYED_PASS: CardDefinition = {
  id: "cyclops-of-one-eyed-pass",
  name: "Cyclops of One-Eyed Pass",
  scryfallId: "71a25c69-8e57-4a44-955a-da1541bbe0fe",
  types: ["Creature"],
  subtypes: ["Cyclops"],
  manaCost: { generic: 2, colors: { R: 2 } },
  colorIdentity: ["R"],
  power: 5,
  toughness: 2,
  tier: "vanilla",
};

export const DANCING_SCIMITAR: CardDefinition = {
  id: "dancing-scimitar",
  name: "Dancing Scimitar",
  scryfallId: "ede26e9e-95b6-4dbc-9263-59f370c4f6a3",
  types: ["Artifact", "Creature"],
  subtypes: ["Spirit"],
  manaCost: { generic: 4, colors: {} },
  colorIdentity: [],
  power: 1,
  toughness: 5,
  keywords: ["Flying"],
  tier: "vanilla",
};

export const DARKSLICK_DRAKE: CardDefinition = {
  id: "darkslick-drake",
  name: "Darkslick Drake",
  scryfallId: "234f4131-1e7f-4220-b46c-bb4a6713876e",
  types: ["Creature"],
  subtypes: ["Phyrexian", "Drake"],
  manaCost: { generic: 2, colors: { U: 2 } },
  colorIdentity: ["U"],
  power: 2,
  toughness: 4,
  keywords: ["Flying"],
  triggeredAbilities: [{ event: "dies", effect: { kind: "draw", amount: 1 } }],
  tier: "scripted",
};

export const DARKSTEEL_GARGOYLE: CardDefinition = {
  id: "darksteel-gargoyle",
  name: "Darksteel Gargoyle",
  scryfallId: "cc3218ae-376e-4f46-ad3b-b71bce0b73b1",
  types: ["Artifact", "Creature"],
  subtypes: ["Gargoyle"],
  manaCost: { generic: 7, colors: {} },
  colorIdentity: [],
  power: 3,
  toughness: 3,
  keywords: ["Flying", "Indestructible"],
  tier: "vanilla",
};

export const DAWNHART_REJUVENATOR: CardDefinition = {
  id: "dawnhart-rejuvenator",
  name: "Dawnhart Rejuvenator",
  scryfallId: "cf4b5ad9-3de6-4d53-93a0-3b8d2e484687",
  types: ["Creature"],
  subtypes: ["Human", "Warlock"],
  manaCost: { generic: 3, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 2,
  toughness: 4,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 3 } }],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "scripted",
};

export const DAWNSTRIKE_PALADIN: CardDefinition = {
  id: "dawnstrike-paladin",
  name: "Dawnstrike Paladin",
  scryfallId: "549ca818-f7bf-47a8-9005-18ddabd3c360",
  types: ["Creature"],
  subtypes: ["Human", "Knight"],
  manaCost: { generic: 3, colors: { W: 2 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 4,
  keywords: ["Vigilance", "Lifelink"],
  tier: "vanilla",
};

export const DAYBREAK_CHAPLAIN: CardDefinition = {
  id: "daybreak-chaplain",
  name: "Daybreak Chaplain",
  scryfallId: "0ce89a0b-d0e4-4c71-b131-0d3b0b76bc3b",
  types: ["Creature"],
  subtypes: ["Human", "Cleric"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 3,
  keywords: ["Lifelink"],
  tier: "vanilla",
};

export const DAYSQUAD_MARSHAL: CardDefinition = {
  id: "daysquad-marshal",
  name: "Daysquad Marshal",
  scryfallId: "17d566bd-f272-49d1-bffb-588f2a42046a",
  types: ["Creature"],
  subtypes: ["Human", "Soldier"],
  manaCost: { generic: 3, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 3,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-w-11-human-soldier" } }],
  tier: "scripted",
};

export const DAZZLING_ANGEL: CardDefinition = {
  id: "dazzling-angel",
  name: "Dazzling Angel",
  scryfallId: "a0bdf4d1-576f-41b6-a077-8725be608331",
  types: ["Creature"],
  subtypes: ["Angel"],
  manaCost: { generic: 2, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 3,
  keywords: ["Flying"],
  triggeredAbilities: [{ event: "permanent-enters", watches: "controller", watchFor: { type: "Creature" }, effect: { kind: "gainLife", amount: 1 } }],
  tier: "scripted",
};

export const DEATHBLOOM_GARDENER: CardDefinition = {
  id: "deathbloom-gardener",
  name: "Deathbloom Gardener",
  scryfallId: "88dee3d1-0496-40ea-b208-7362a932f531",
  types: ["Creature"],
  subtypes: ["Elf", "Druid"],
  manaCost: { generic: 2, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 1,
  toughness: 1,
  keywords: ["Deathtouch"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "scripted",
};

export const DEATHBLOOM_THALLID: CardDefinition = {
  id: "deathbloom-thallid",
  name: "Deathbloom Thallid",
  scryfallId: "dc4513e1-9978-44ce-b7a5-4e2b5b63ad9e",
  types: ["Creature"],
  subtypes: ["Fungus"],
  manaCost: { generic: 2, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 3,
  toughness: 2,
  triggeredAbilities: [{ event: "dies", effect: { kind: "createToken", count: 1, tokenDefinitionId: "saproling-token" } }],
  tier: "scripted",
};

export const DEFIANT_ELF: CardDefinition = {
  id: "defiant-elf",
  name: "Defiant Elf",
  scryfallId: "3b7a0b8f-6942-40b0-8efc-234ae77855b4",
  types: ["Creature"],
  subtypes: ["Elf"],
  manaCost: { generic: 0, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 1,
  toughness: 1,
  keywords: ["Trample"],
  tier: "vanilla",
};

export const DESERTED_BEACH: CardDefinition = {
  id: "deserted-beach",
  name: "Deserted Beach",
  scryfallId: "c819de09-dac2-407a-98c8-775865e9bdf8",
  types: ["Land"],
  colorIdentity: ["U", "W"],
  entersTapped: true,
  entersTappedUnless: { kind: "controls-other-lands", count: 2 },
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }],
  tier: "vanilla",
};

export const DEVKARIN_DISSIDENT: CardDefinition = {
  id: "devkarin-dissident",
  name: "Devkarin Dissident",
  scryfallId: "490cd287-5f09-442f-9150-4a6ac2cf3e2e",
  types: ["Creature"],
  subtypes: ["Elf", "Warrior"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 2,
  toughness: 2,
  activatedAbilities: [{ cost: { mana: { generic: 4, colors: { G: 1 } } }, effect: { kind: "pump", power: 2, toughness: 2 } }],
  tier: "scripted",
};

export const DIMENSION_X: CardDefinition = {
  id: "dimension-x",
  name: "Dimension X",
  scryfallId: "1c244fc2-70f0-4149-b0d2-d49fc6bac2b0",
  types: ["Land"],
  colorIdentity: ["R", "W"],
  entersTapped: true,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 1 } }],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }],
  tier: "scripted",
};

export const DIMIR_GUILDGATE: CardDefinition = {
  id: "dimir-guildgate",
  name: "Dimir Guildgate",
  scryfallId: "f9b8a159-5e58-4432-8ecd-62f39afa96da",
  types: ["Land"],
  subtypes: ["Gate"],
  colorIdentity: ["B", "U"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }],
  tier: "vanilla",
};

export const DISCORDANT_PIPER: CardDefinition = {
  id: "discordant-piper",
  name: "Discordant Piper",
  scryfallId: "a8cce294-f6ee-4b18-8b65-7d01d0317b00",
  types: ["Creature"],
  subtypes: ["Zombie", "Satyr"],
  manaCost: { generic: 1, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 2,
  toughness: 1,
  triggeredAbilities: [{ event: "dies", effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-w-01-goat" } }],
  tier: "scripted",
};

export const DISMAL_BACKWATER: CardDefinition = {
  id: "dismal-backwater",
  name: "Dismal Backwater",
  scryfallId: "082b52c9-c46e-44d3-b723-546ba528e07b",
  types: ["Land"],
  colorIdentity: ["B", "U"],
  entersTapped: true,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 1 } }],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }],
  tier: "scripted",
};

export const DOOMED_DISSENTER: CardDefinition = {
  id: "doomed-dissenter",
  name: "Doomed Dissenter",
  scryfallId: "f7c0cf16-81ea-45e3-99cc-4424d59bb44b",
  types: ["Creature"],
  subtypes: ["Human"],
  manaCost: { generic: 1, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 1,
  toughness: 1,
  triggeredAbilities: [{ event: "dies", effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-b-22-zombie" } }],
  tier: "scripted",
};

export const DOOMED_TRAVELER: CardDefinition = {
  id: "doomed-traveler",
  name: "Doomed Traveler",
  scryfallId: "8a03d414-bff9-4aba-8b0a-0ed57982251e",
  types: ["Creature"],
  subtypes: ["Human", "Soldier"],
  manaCost: { generic: 0, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 1,
  triggeredAbilities: [{ event: "dies", effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-w-11-spirit-flying" } }],
  tier: "scripted",
};

export const DRAGON_ENGINE: CardDefinition = {
  id: "dragon-engine",
  name: "Dragon Engine",
  scryfallId: "045f373e-510f-4552-9859-884f6ce4cc59",
  types: ["Artifact", "Creature"],
  subtypes: ["Construct"],
  manaCost: { generic: 3, colors: {} },
  colorIdentity: [],
  power: 1,
  toughness: 3,
  activatedAbilities: [{ cost: { mana: { generic: 2, colors: {} } }, effect: { kind: "pump", power: 1, toughness: 0 } }],
  tier: "scripted",
};

export const DRAGON_HATCHLING: CardDefinition = {
  id: "dragon-hatchling",
  name: "Dragon Hatchling",
  scryfallId: "c5d3a18c-d030-494d-b7b1-4d1d1e27fbbf",
  types: ["Creature"],
  subtypes: ["Dragon"],
  manaCost: { generic: 1, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 0,
  toughness: 1,
  keywords: ["Flying"],
  activatedAbilities: [{ cost: { mana: { generic: 0, colors: { R: 1 } } }, effect: { kind: "pump", power: 1, toughness: 0 } }],
  tier: "scripted",
};

export const DRAGON_TRAINER: CardDefinition = {
  id: "dragon-trainer",
  name: "Dragon Trainer",
  scryfallId: "91bd75a1-cb54-4e38-9ce1-e8f32a73c6eb",
  types: ["Creature"],
  subtypes: ["Human"],
  manaCost: { generic: 3, colors: { R: 2 } },
  colorIdentity: ["R"],
  power: 1,
  toughness: 1,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-r-44-dragon-flying" } }],
  tier: "scripted",
};

export const DRAGON_S_EYE_SENTRY: CardDefinition = {
  id: "dragons-eye-sentry",
  name: "Dragon's Eye Sentry",
  scryfallId: "750880cd-59bf-4b67-a2d5-9b66e4d05665",
  types: ["Creature"],
  subtypes: ["Human", "Monk"],
  manaCost: { generic: 0, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 3,
  keywords: ["Defender", "First Strike"],
  tier: "vanilla",
};

export const DRAGONSKULL_SUMMIT: CardDefinition = {
  id: "dragonskull-summit",
  name: "Dragonskull Summit",
  scryfallId: "d20e433a-eb62-4301-bc20-bfe27468b033",
  types: ["Land"],
  colorIdentity: ["B", "R"],
  entersTapped: true,
  entersTappedUnless: { kind: "controls-subtype", subtypes: ["Swamp", "Mountain"] },
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }],
  tier: "vanilla",
};

export const DRAKE_SKULL_CAMEO: CardDefinition = {
  id: "drake-skull-cameo",
  name: "Drake-Skull Cameo",
  scryfallId: "4a3ce135-9c2f-45bd-b2db-c0e00c50c964",
  types: ["Artifact"],
  manaCost: { generic: 3, colors: {} },
  colorIdentity: ["B", "U"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }],
  tier: "vanilla",
};

export const DRAKEWING_KRASIS: CardDefinition = {
  id: "drakewing-krasis",
  name: "Drakewing Krasis",
  scryfallId: "016d1d17-ba5c-4168-9a3d-232bdcc98c80",
  types: ["Creature"],
  subtypes: ["Lizard", "Drake"],
  manaCost: { generic: 1, colors: { G: 1, U: 1 } },
  colorIdentity: ["G", "U"],
  power: 3,
  toughness: 1,
  keywords: ["Flying", "Trample"],
  tier: "vanilla",
};

export const DREAMROOT_CASCADE: CardDefinition = {
  id: "dreamroot-cascade",
  name: "Dreamroot Cascade",
  scryfallId: "ef662b92-5a7f-48c9-bcc1-14b55e091aef",
  types: ["Land"],
  colorIdentity: ["G", "U"],
  entersTapped: true,
  entersTappedUnless: { kind: "controls-other-lands", count: 2 },
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }],
  tier: "vanilla",
};

export const DROWNED_CATACOMB: CardDefinition = {
  id: "drowned-catacomb",
  name: "Drowned Catacomb",
  scryfallId: "ebea49ab-e5cf-46d9-ae35-226a7321ede0",
  types: ["Land"],
  colorIdentity: ["B", "U"],
  entersTapped: true,
  entersTappedUnless: { kind: "controls-subtype", subtypes: ["Island", "Swamp"] },
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }],
  tier: "vanilla",
};

export const DRUID_OF_THE_ANIMA: CardDefinition = {
  id: "druid-of-the-anima",
  name: "Druid of the Anima",
  scryfallId: "de32bf78-73c2-4cd4-b3b3-ef8be53e1e5e",
  types: ["Creature"],
  subtypes: ["Elf", "Druid"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G", "R", "W"],
  power: 1,
  toughness: 1,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }],
  tier: "scripted",
};

export const DRUID_OF_THE_COWL: CardDefinition = {
  id: "druid-of-the-cowl",
  name: "Druid of the Cowl",
  scryfallId: "db2d0ee9-865c-4fc9-8cb6-540c597e1bf4",
  types: ["Creature"],
  subtypes: ["Elf", "Druid"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 1,
  toughness: 3,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "scripted",
};

export const EPF_POINT_SQUAD: CardDefinition = {
  id: "epf-point-squad",
  name: "EPF Point Squad",
  scryfallId: "faab52c0-ce79-40af-a156-b193a62d439e",
  types: ["Creature"],
  subtypes: ["Human", "Soldier"],
  manaCost: { generic: 1, colors: {}, hybrid: [["R", "W"], ["R", "W"]] },
  colorIdentity: ["R", "W"],
  power: 2,
  toughness: 1,
  triggeredAbilities: [{ event: "permanent-enters", watches: "controller", watchFor: { type: "Creature" }, effect: { kind: "addCounter", amount: 1 } }],
  tier: "scripted",
};

export const EAGER_GLYPHMAGE: CardDefinition = {
  id: "eager-glyphmage",
  name: "Eager Glyphmage",
  scryfallId: "bf736de9-9bc4-49df-ae60-672ed4f83f32",
  types: ["Creature"],
  subtypes: ["Cat", "Cleric"],
  manaCost: { generic: 3, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 3,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-wb-11-inkling-flying" } }],
  tier: "scripted",
};

export const EAGLE_OF_THE_WATCH: CardDefinition = {
  id: "eagle-of-the-watch",
  name: "Eagle of the Watch",
  scryfallId: "8af7956d-f811-49d3-bef7-07f294dcea3c",
  types: ["Creature"],
  subtypes: ["Bird"],
  manaCost: { generic: 2, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 1,
  keywords: ["Flying", "Vigilance"],
  tier: "vanilla",
};

export const EARTH_ELEMENTAL: CardDefinition = {
  id: "earth-elemental",
  name: "Earth Elemental",
  scryfallId: "659eeb25-b79b-4229-9d84-e28f6a636958",
  types: ["Creature"],
  subtypes: ["Elemental"],
  manaCost: { generic: 3, colors: { R: 2 } },
  colorIdentity: ["R"],
  power: 4,
  toughness: 5,
  tier: "vanilla",
};

export const EARTHSHAKING_SI: CardDefinition = {
  id: "earthshaking-si",
  name: "Earthshaking Si",
  scryfallId: "418df457-4aab-486c-b691-41f03ec8a6df",
  types: ["Creature"],
  subtypes: ["Beast"],
  manaCost: { generic: 5, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 5,
  toughness: 5,
  keywords: ["Trample"],
  tier: "vanilla",
};

export const EBONY_RHINO: CardDefinition = {
  id: "ebony-rhino",
  name: "Ebony Rhino",
  scryfallId: "0cc3d3c7-f76c-4d54-83b8-ccc04c8f2241",
  types: ["Artifact", "Creature"],
  subtypes: ["Rhino"],
  manaCost: { generic: 7, colors: {} },
  colorIdentity: [],
  power: 4,
  toughness: 5,
  keywords: ["Trample"],
  tier: "vanilla",
};

export const EBONY_TREEFOLK: CardDefinition = {
  id: "ebony-treefolk",
  name: "Ebony Treefolk",
  scryfallId: "2b85dadb-351f-4975-a2c3-febf5e80bc85",
  types: ["Creature"],
  subtypes: ["Treefolk"],
  manaCost: { generic: 1, colors: { B: 1, G: 1 } },
  colorIdentity: ["B", "G"],
  power: 3,
  toughness: 3,
  activatedAbilities: [{ cost: { mana: { generic: 0, colors: { B: 1, G: 1 } } }, effect: { kind: "pump", power: 1, toughness: 1 } }],
  tier: "scripted",
};

export const EKUNDU_GRIFFIN: CardDefinition = {
  id: "ekundu-griffin",
  name: "Ekundu Griffin",
  scryfallId: "a1eec4ac-7d28-4f76-a1d5-a0a19c142514",
  types: ["Creature"],
  subtypes: ["Griffin"],
  manaCost: { generic: 3, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 2,
  keywords: ["Flying", "First Strike"],
  tier: "vanilla",
};

export const ELDER_AUNTIE: CardDefinition = {
  id: "elder-auntie",
  name: "Elder Auntie",
  scryfallId: "84678e98-2258-4ea1-aaf0-8ac4cc2ecf8d",
  types: ["Creature"],
  subtypes: ["Goblin", "Warlock"],
  manaCost: { generic: 2, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 2,
  toughness: 2,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-br-11-goblin" } }],
  tier: "scripted",
};

export const ELDERLEAF_MENTOR: CardDefinition = {
  id: "elderleaf-mentor",
  name: "Elderleaf Mentor",
  scryfallId: "5e8bded3-46c3-474f-9d09-978df8705ad1",
  types: ["Creature"],
  subtypes: ["Elf", "Warrior"],
  manaCost: { generic: 3, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 3,
  toughness: 2,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-g-11-elf-warrior" } }],
  tier: "scripted",
};

export const ELDRAZI_DEVASTATOR: CardDefinition = {
  id: "eldrazi-devastator",
  name: "Eldrazi Devastator",
  scryfallId: "04b13e32-01b9-4a86-a3df-ca8b784c6a6c",
  types: ["Creature"],
  subtypes: ["Eldrazi"],
  manaCost: { generic: 8, colors: {} },
  colorIdentity: [],
  power: 8,
  toughness: 9,
  keywords: ["Trample"],
  tier: "vanilla",
};

export const ELEPHANT_GRAVEYARD: CardDefinition = {
  id: "elephant-graveyard",
  name: "Elephant Graveyard",
  scryfallId: "88e7d9d5-3bca-4791-b850-5ae104706042",
  types: ["Land"],
  colorIdentity: [],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 1 } }, { cost: { tap: true }, effect: { kind: "regenerate", target: { kind: "creature", subtypes: ["Elephant"] } } }],
  tier: "vanilla",
};

export const ELFHAME_PALACE: CardDefinition = {
  id: "elfhame-palace",
  name: "Elfhame Palace",
  scryfallId: "1ddd0084-349d-4d5f-86af-a3a65dcce73a",
  types: ["Land"],
  colorIdentity: ["G", "W"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }],
  tier: "vanilla",
};

export const ELFSWORN_GIANT: CardDefinition = {
  id: "elfsworn-giant",
  name: "Elfsworn Giant",
  scryfallId: "5128a5be-ffa6-4998-8488-872d80b24cb2",
  types: ["Creature"],
  subtypes: ["Giant"],
  manaCost: { generic: 3, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 5,
  toughness: 3,
  keywords: ["Reach"],
  triggeredAbilities: [{ event: "landfall", watches: "controller", effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-g-11-elf-warrior" } }],
  tier: "scripted",
};

export const ELGAUD_INQUISITOR: CardDefinition = {
  id: "elgaud-inquisitor",
  name: "Elgaud Inquisitor",
  scryfallId: "c342e1da-7ab9-4e29-96e6-77d820a45ede",
  types: ["Creature"],
  subtypes: ["Human", "Cleric"],
  manaCost: { generic: 3, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 2,
  keywords: ["Lifelink"],
  triggeredAbilities: [{ event: "dies", effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-w-11-spirit-flying" } }],
  tier: "scripted",
};

export const ELTURGARD_RANGER: CardDefinition = {
  id: "elturgard-ranger",
  name: "Elturgard Ranger",
  scryfallId: "f6898737-957f-44a6-bef7-fb196658176f",
  types: ["Creature"],
  subtypes: ["Human", "Elf", "Ranger"],
  manaCost: { generic: 4, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 4,
  toughness: 1,
  keywords: ["Reach"],
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-g-22-wolf" } }],
  tier: "scripted",
};

export const ELVISH_RANGER: CardDefinition = {
  id: "elvish-ranger",
  name: "Elvish Ranger",
  scryfallId: "5eac1616-d764-4e62-9fc6-939c28b75f52",
  types: ["Creature"],
  subtypes: ["Elf", "Ranger"],
  manaCost: { generic: 2, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 4,
  toughness: 1,
  tier: "vanilla",
};

export const EMERIA_ANGEL: CardDefinition = {
  id: "emeria-angel",
  name: "Emeria Angel",
  scryfallId: "2406ab7c-c6be-421a-a92c-048441a01acd",
  types: ["Creature"],
  subtypes: ["Angel"],
  manaCost: { generic: 2, colors: { W: 2 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 3,
  keywords: ["Flying"],
  triggeredAbilities: [{ event: "landfall", watches: "controller", optional: true, effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-w-11-bird-flying" } }],
  tier: "scripted",
};

export const EMISSARY_OF_THE_SLEEPLESS: CardDefinition = {
  id: "emissary-of-the-sleepless",
  name: "Emissary of the Sleepless",
  scryfallId: "cc5fa496-a830-4031-a19a-d6467d074ad1",
  types: ["Creature"],
  subtypes: ["Spirit"],
  manaCost: { generic: 4, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 4,
  keywords: ["Flying"],
  triggeredAbilities: [{ event: "enters-battlefield", onlyIf: { kind: "creature-died-this-turn" }, effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-w-11-spirit-flying" } }],
  tier: "scripted",
};

export const ENATU_GOLEM: CardDefinition = {
  id: "enatu-golem",
  name: "Enatu Golem",
  scryfallId: "74b2e63d-61c6-46e4-9a6f-56653c49b2ea",
  types: ["Artifact", "Creature"],
  subtypes: ["Golem"],
  manaCost: { generic: 6, colors: {} },
  colorIdentity: [],
  power: 3,
  toughness: 5,
  triggeredAbilities: [{ event: "dies", effect: { kind: "gainLife", amount: 4 } }],
  tier: "scripted",
};

export const ESPER_CORMORANTS: CardDefinition = {
  id: "esper-cormorants",
  name: "Esper Cormorants",
  scryfallId: "2c5068ed-8477-4d8d-9e37-c72474208e2d",
  types: ["Artifact", "Creature"],
  subtypes: ["Bird"],
  manaCost: { generic: 2, colors: { U: 1, W: 1 } },
  colorIdentity: ["U", "W"],
  power: 3,
  toughness: 3,
  keywords: ["Flying"],
  tier: "vanilla",
};

export const EXULTANT_CULTIST: CardDefinition = {
  id: "exultant-cultist",
  name: "Exultant Cultist",
  scryfallId: "b2c22e0a-81c5-485f-81f0-3e85397108e0",
  types: ["Creature"],
  subtypes: ["Human", "Wizard"],
  manaCost: { generic: 2, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 2,
  toughness: 2,
  triggeredAbilities: [{ event: "dies", effect: { kind: "draw", amount: 1 } }],
  tier: "scripted",
};

export const FAITHBEARER_PALADIN: CardDefinition = {
  id: "faithbearer-paladin",
  name: "Faithbearer Paladin",
  scryfallId: "af15a774-b97f-4bc0-913d-4d2a047fed8a",
  types: ["Creature"],
  subtypes: ["Human", "Knight"],
  manaCost: { generic: 4, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 4,
  keywords: ["Lifelink"],
  tier: "vanilla",
};

export const FANG_OF_SHIGEKI: CardDefinition = {
  id: "fang-of-shigeki",
  name: "Fang of Shigeki",
  scryfallId: "2dd0fef1-209f-4de5-a736-8f9bca2faa0a",
  types: ["Creature", "Enchantment"],
  subtypes: ["Snake", "Ninja"],
  manaCost: { generic: 0, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 1,
  toughness: 1,
  keywords: ["Deathtouch"],
  tier: "vanilla",
};

export const FANGREN_HUNTER: CardDefinition = {
  id: "fangren-hunter",
  name: "Fangren Hunter",
  scryfallId: "2dbc8eef-f032-490a-b487-da1af71b7ff2",
  types: ["Creature"],
  subtypes: ["Beast"],
  manaCost: { generic: 3, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 4,
  toughness: 4,
  keywords: ["Trample"],
  tier: "vanilla",
};

export const FATHOM_FLEET_FIREBRAND: CardDefinition = {
  id: "fathom-fleet-firebrand",
  name: "Fathom Fleet Firebrand",
  scryfallId: "52280963-ba5b-4735-b5cb-67866f8624c9",
  types: ["Creature"],
  subtypes: ["Human", "Pirate"],
  manaCost: { generic: 1, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 2,
  toughness: 2,
  activatedAbilities: [{ cost: { mana: { generic: 1, colors: { R: 1 } } }, effect: { kind: "pump", power: 1, toughness: 0 } }],
  tier: "scripted",
};

export const FELLWAR_STONE: CardDefinition = {
  id: "fellwar-stone",
  name: "Fellwar Stone",
  scryfallId: "3ef87948-0ad9-4757-a692-2262c8e24367",
  types: ["Artifact"],
  manaCost: { generic: 2, colors: {} },
  colorIdentity: [],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 }, colorFrom: "opponent-lands" }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 }, colorFrom: "opponent-lands" }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 }, colorFrom: "opponent-lands" }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 }, colorFrom: "opponent-lands" }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 }, colorFrom: "opponent-lands" }],
  tier: "vanilla",
};

export const FEMEREF_SCOUTS: CardDefinition = {
  id: "femeref-scouts",
  name: "Femeref Scouts",
  scryfallId: "60192ded-689b-4cc5-9293-bff52924089b",
  types: ["Creature"],
  subtypes: ["Human", "Scout"],
  manaCost: { generic: 2, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 4,
  tier: "vanilla",
};

export const FERAL_PROWLER: CardDefinition = {
  id: "feral-prowler",
  name: "Feral Prowler",
  scryfallId: "a59d92b0-5ad1-42a7-9c06-1cb31a63bd64",
  types: ["Creature"],
  subtypes: ["Cat"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 1,
  toughness: 3,
  triggeredAbilities: [{ event: "dies", effect: { kind: "draw", amount: 1 } }],
  tier: "scripted",
};

export const FERAL_RIDGEWOLF: CardDefinition = {
  id: "feral-ridgewolf",
  name: "Feral Ridgewolf",
  scryfallId: "78c66cc0-cb0f-4daf-8141-0923ad46a834",
  types: ["Creature"],
  subtypes: ["Wolf"],
  manaCost: { generic: 2, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 1,
  toughness: 2,
  keywords: ["Trample"],
  activatedAbilities: [{ cost: { mana: { generic: 1, colors: { R: 1 } } }, effect: { kind: "pump", power: 2, toughness: 0 } }],
  tier: "scripted",
};

export const FEROCIOUS_PUP: CardDefinition = {
  id: "ferocious-pup",
  name: "Ferocious Pup",
  scryfallId: "2354cb24-5c70-4aaa-8636-46866f0950c1",
  types: ["Creature"],
  subtypes: ["Wolf"],
  manaCost: { generic: 2, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 0,
  toughness: 1,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-g-22-wolf" } }],
  tier: "scripted",
};

export const FEROCIOUS_ZHENG: CardDefinition = {
  id: "ferocious-zheng",
  name: "Ferocious Zheng",
  scryfallId: "7a6d1184-15e0-4b41-ba2d-4f68e91c61d4",
  types: ["Creature"],
  subtypes: ["Cat", "Beast"],
  manaCost: { generic: 2, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 4,
  toughness: 4,
  tier: "vanilla",
};

export const FETID_HEATH: CardDefinition = {
  id: "fetid-heath",
  name: "Fetid Heath",
  scryfallId: "f465ded8-0d38-42ac-bafc-a12185013c5d",
  types: ["Land"],
  colorIdentity: ["B", "W"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 1 } }, { cost: { tap: true, mana: { generic: 0, colors: {}, hybrid: [["W", "B"]] } }, effect: { kind: "addManaCombination", mana: [{ color: "W", amount: 2 }] } }, { cost: { tap: true, mana: { generic: 0, colors: {}, hybrid: [["W", "B"]] } }, effect: { kind: "addManaCombination", mana: [{ color: "W", amount: 1 }, { color: "B", amount: 1 }] } }, { cost: { tap: true, mana: { generic: 0, colors: {}, hybrid: [["W", "B"]] } }, effect: { kind: "addManaCombination", mana: [{ color: "B", amount: 2 }] } }],
  tier: "vanilla",
};

export const FIELD_CREEPER: CardDefinition = {
  id: "field-creeper",
  name: "Field Creeper",
  scryfallId: "e148c1bf-84a2-48cd-882e-ad0fd74b8f0f",
  types: ["Artifact", "Creature"],
  subtypes: ["Scarecrow"],
  manaCost: { generic: 2, colors: {} },
  colorIdentity: [],
  power: 2,
  toughness: 1,
  tier: "vanilla",
};

export const FILIGREE_FAMILIAR: CardDefinition = {
  id: "filigree-familiar",
  name: "Filigree Familiar",
  scryfallId: "875df3ef-fab4-455f-bfdb-8f6361b27bf6",
  types: ["Artifact", "Creature"],
  subtypes: ["Fox"],
  manaCost: { generic: 3, colors: {} },
  colorIdentity: [],
  power: 2,
  toughness: 2,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 2 } }, { event: "dies", effect: { kind: "draw", amount: 1 } }],
  tier: "scripted",
};

export const FIRE_DIAMOND: CardDefinition = {
  id: "fire-diamond",
  name: "Fire Diamond",
  scryfallId: "5a561484-438b-4ce9-911e-97078ac5b0fa",
  types: ["Artifact"],
  manaCost: { generic: 2, colors: {} },
  colorIdentity: ["R"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }],
  tier: "vanilla",
};

export const FIRE_LIT_THICKET: CardDefinition = {
  id: "fire-lit-thicket",
  name: "Fire-Lit Thicket",
  scryfallId: "1927d645-ca43-4b8e-9932-7e70acca7aa6",
  types: ["Land"],
  colorIdentity: ["G", "R"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 1 } }, { cost: { tap: true, mana: { generic: 0, colors: {}, hybrid: [["R", "G"]] } }, effect: { kind: "addManaCombination", mana: [{ color: "R", amount: 2 }] } }, { cost: { tap: true, mana: { generic: 0, colors: {}, hybrid: [["R", "G"]] } }, effect: { kind: "addManaCombination", mana: [{ color: "R", amount: 1 }, { color: "G", amount: 1 }] } }, { cost: { tap: true, mana: { generic: 0, colors: {}, hybrid: [["R", "G"]] } }, effect: { kind: "addManaCombination", mana: [{ color: "G", amount: 2 }] } }],
  tier: "vanilla",
};

export const FIREBORN_KNIGHT: CardDefinition = {
  id: "fireborn-knight",
  name: "Fireborn Knight",
  scryfallId: "6716f46c-806d-4b3e-8a1c-fd6dcedacf8e",
  types: ["Creature"],
  subtypes: ["Human", "Knight"],
  manaCost: { generic: 0, colors: {}, hybrid: [["R", "W"], ["R", "W"], ["R", "W"], ["R", "W"]] },
  colorIdentity: ["R", "W"],
  power: 2,
  toughness: 3,
  keywords: ["Double Strike"],
  activatedAbilities: [{ cost: { mana: { generic: 0, colors: {}, hybrid: [["R", "W"], ["R", "W"], ["R", "W"], ["R", "W"]] } }, effect: { kind: "pump", power: 1, toughness: 1 } }],
  tier: "scripted",
};

export const FIREFLY: CardDefinition = {
  id: "firefly",
  name: "Firefly",
  scryfallId: "a312f0cf-225a-4f3d-b9a7-c47dd03b25c3",
  types: ["Creature"],
  subtypes: ["Insect"],
  manaCost: { generic: 3, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 1,
  toughness: 1,
  keywords: ["Flying"],
  activatedAbilities: [{ cost: { mana: { generic: 0, colors: { R: 1 } } }, effect: { kind: "pump", power: 1, toughness: 0 } }],
  tier: "scripted",
};

export const FIRESCREAMER: CardDefinition = {
  id: "firescreamer",
  name: "Firescreamer",
  scryfallId: "155a2213-bf6e-4a54-924b-e450b7d06f26",
  types: ["Creature"],
  subtypes: ["Kavu"],
  manaCost: { generic: 3, colors: { B: 1 } },
  colorIdentity: ["B", "R"],
  power: 2,
  toughness: 2,
  activatedAbilities: [{ cost: { mana: { generic: 0, colors: { R: 1 } } }, effect: { kind: "pump", power: 1, toughness: 0 } }],
  tier: "scripted",
};

export const FISK_TOWER: CardDefinition = {
  id: "fisk-tower",
  name: "Fisk Tower",
  scryfallId: "7690e624-93c1-46f4-8f33-e28d881787d3",
  types: ["Land"],
  colorIdentity: ["B", "W"],
  entersTapped: true,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 1 } }],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }],
  tier: "scripted",
};

export const FLAMEKIN_BRAWLER: CardDefinition = {
  id: "flamekin-brawler",
  name: "Flamekin Brawler",
  scryfallId: "42da4ec7-9d30-4c4e-9220-db0f4172bf9c",
  types: ["Creature"],
  subtypes: ["Elemental", "Warrior"],
  manaCost: { generic: 0, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 0,
  toughness: 2,
  activatedAbilities: [{ cost: { mana: { generic: 0, colors: { R: 1 } } }, effect: { kind: "pump", power: 1, toughness: 0 } }],
  tier: "scripted",
};

export const FLEETFOOT_DANCER: CardDefinition = {
  id: "fleetfoot-dancer",
  name: "Fleetfoot Dancer",
  scryfallId: "2473d738-fe15-402a-ad24-0d6e5c4dfda3",
  types: ["Creature"],
  subtypes: ["Elf", "Druid"],
  manaCost: { generic: 1, colors: { G: 1, R: 1, W: 1 } },
  colorIdentity: ["G", "R", "W"],
  power: 4,
  toughness: 4,
  keywords: ["Trample", "Lifelink", "Haste"],
  tier: "vanilla",
};

export const FLOODED_GROVE: CardDefinition = {
  id: "flooded-grove",
  name: "Flooded Grove",
  scryfallId: "df797e0d-8ae2-4fdb-a33d-4ba7852b0172",
  types: ["Land"],
  colorIdentity: ["G", "U"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 1 } }, { cost: { tap: true, mana: { generic: 0, colors: {}, hybrid: [["G", "U"]] } }, effect: { kind: "addManaCombination", mana: [{ color: "G", amount: 2 }] } }, { cost: { tap: true, mana: { generic: 0, colors: {}, hybrid: [["G", "U"]] } }, effect: { kind: "addManaCombination", mana: [{ color: "G", amount: 1 }, { color: "U", amount: 1 }] } }, { cost: { tap: true, mana: { generic: 0, colors: {}, hybrid: [["G", "U"]] } }, effect: { kind: "addManaCombination", mana: [{ color: "U", amount: 2 }] } }],
  tier: "vanilla",
};

export const FLOODED_STRAND: CardDefinition = {
  id: "flooded-strand",
  name: "Flooded Strand",
  scryfallId: "8f85e12c-196b-4459-b81f-0c9c854e9f57",
  types: ["Land"],
  colorIdentity: [],
  activatedAbilities: [{ cost: { tap: true, payLife: 1, sacrificeSelf: true }, effect: { kind: "searchLibrary", cardType: "Land", subtypes: ["Plains", "Island"], destination: "battlefield" } }],
  tier: "vanilla",
};

export const FLOODFARM_VERGE: CardDefinition = {
  id: "floodfarm-verge",
  name: "Floodfarm Verge",
  scryfallId: "d53ed0db-1199-44b3-8eda-8189dfcf53d1",
  types: ["Land"],
  colorIdentity: ["U", "W"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 }, activateOnlyIf: { kind: "controls-subtype", subtypes: ["Plains", "Island"] } }],
  tier: "vanilla",
};

export const FOLK_OF_THE_PINES: CardDefinition = {
  id: "folk-of-the-pines",
  name: "Folk of the Pines",
  scryfallId: "ee55f1d0-5bb7-4c11-8534-76b3efd12169",
  types: ["Creature"],
  subtypes: ["Dryad"],
  manaCost: { generic: 4, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 2,
  toughness: 5,
  activatedAbilities: [{ cost: { mana: { generic: 1, colors: { G: 1 } } }, effect: { kind: "pump", power: 1, toughness: 0 } }],
  tier: "scripted",
};

export const FOOT_HEADQUARTERS: CardDefinition = {
  id: "foot-headquarters",
  name: "Foot Headquarters",
  scryfallId: "45e68113-3f05-4547-947d-4cb9ebfa73c7",
  types: ["Land"],
  colorIdentity: ["B", "W"],
  entersTapped: true,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 1 } }],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }],
  tier: "scripted",
};

export const FORSAKEN_SANCTUARY: CardDefinition = {
  id: "forsaken-sanctuary",
  name: "Forsaken Sanctuary",
  scryfallId: "f3e0b983-62e7-43fb-b5d5-402ea60a64d7",
  types: ["Land"],
  colorIdentity: ["B", "W"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }],
  tier: "vanilla",
};

export const FOUNTAIN_OF_YOUTH: CardDefinition = {
  id: "fountain-of-youth",
  name: "Fountain of Youth",
  scryfallId: "8515a993-0f9d-4ac8-8452-889f23d9d9a9",
  types: ["Artifact"],
  manaCost: { generic: 0, colors: {} },
  colorIdentity: [],
  activatedAbilities: [{ cost: { tap: true, mana: { generic: 2, colors: {} } }, effect: { kind: "gainLife", amount: 1 } }],
  tier: "vanilla",
};

export const FOXFIRE_OAK: CardDefinition = {
  id: "foxfire-oak",
  name: "Foxfire Oak",
  scryfallId: "46e23eae-7630-40db-b265-2fa00715878e",
  types: ["Creature"],
  subtypes: ["Treefolk", "Shaman"],
  manaCost: { generic: 5, colors: { G: 1 } },
  colorIdentity: ["G", "R"],
  power: 3,
  toughness: 6,
  activatedAbilities: [{ cost: { mana: { generic: 0, colors: {}, hybrid: [["R", "G"], ["R", "G"], ["R", "G"]] } }, effect: { kind: "pump", power: 3, toughness: 0 } }],
  tier: "scripted",
};

export const FRONTIER_BIVOUAC: CardDefinition = {
  id: "frontier-bivouac",
  name: "Frontier Bivouac",
  scryfallId: "48810b27-0646-4ff9-9d4d-c6d09b2e0267",
  types: ["Land"],
  colorIdentity: ["G", "R", "U"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }],
  tier: "vanilla",
};

export const FROST_MARSH: CardDefinition = {
  id: "frost-marsh",
  name: "Frost Marsh",
  scryfallId: "e9320033-d8d7-4a01-80db-60de222040e6",
  types: ["Land"],
  supertypes: ["Snow"],
  colorIdentity: ["B", "U"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }],
  tier: "vanilla",
};

export const FROST_OGRE: CardDefinition = {
  id: "frost-ogre",
  name: "Frost Ogre",
  scryfallId: "1a91e5f1-9179-4763-b7c9-b7ad5451f6d0",
  types: ["Creature"],
  subtypes: ["Ogre", "Warrior"],
  manaCost: { generic: 3, colors: { R: 2 } },
  colorIdentity: ["R"],
  power: 5,
  toughness: 3,
  tier: "vanilla",
};

export const FUSION_ELEMENTAL: CardDefinition = {
  id: "fusion-elemental",
  name: "Fusion Elemental",
  scryfallId: "c8ab1550-0cd3-4dc9-82c2-121615f2ceee",
  types: ["Creature"],
  subtypes: ["Elemental"],
  manaCost: { generic: 0, colors: { B: 1, G: 1, R: 1, U: 1, W: 1 } },
  colorIdentity: ["B", "G", "R", "U", "W"],
  power: 8,
  toughness: 8,
  tier: "vanilla",
};

export const FYNDHORN_ELDER: CardDefinition = {
  id: "fyndhorn-elder",
  name: "Fyndhorn Elder",
  scryfallId: "81c125cd-ea49-4511-a78c-42c1f7ce802d",
  types: ["Creature"],
  subtypes: ["Elf", "Druid"],
  manaCost: { generic: 2, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 1,
  toughness: 1,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 2 } }],
  tier: "scripted",
};

export const FYNDHORN_ELVES: CardDefinition = {
  id: "fyndhorn-elves",
  name: "Fyndhorn Elves",
  scryfallId: "450744cf-7eba-491b-97b0-ca80c6368bbb",
  types: ["Creature"],
  subtypes: ["Elf", "Druid"],
  manaCost: { generic: 0, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 1,
  toughness: 1,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "scripted",
};

export const GAEA_S_SKYFOLK: CardDefinition = {
  id: "gaeas-skyfolk",
  name: "Gaea's Skyfolk",
  scryfallId: "8a564432-c2b3-4cf6-b4bc-2e2600b92911",
  types: ["Creature"],
  subtypes: ["Elf", "Merfolk"],
  manaCost: { generic: 0, colors: { G: 1, U: 1 } },
  colorIdentity: ["G", "U"],
  power: 2,
  toughness: 2,
  keywords: ["Flying"],
  tier: "vanilla",
};

export const GALLANT_CAVALRY: CardDefinition = {
  id: "gallant-cavalry",
  name: "Gallant Cavalry",
  scryfallId: "e388c433-3a37-45f6-825a-d13d2223b6f7",
  types: ["Creature"],
  subtypes: ["Human", "Knight"],
  manaCost: { generic: 3, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 2,
  keywords: ["Vigilance"],
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-w-22-knight-vigilance" } }],
  tier: "scripted",
};

export const GALLANT_CITIZEN: CardDefinition = {
  id: "gallant-citizen",
  name: "Gallant Citizen",
  scryfallId: "ec64e524-531c-4e6d-a10f-23bb49ce88c0",
  types: ["Creature"],
  subtypes: ["Human", "Citizen"],
  manaCost: { generic: 0, colors: {}, hybrid: [["G", "W"], ["G", "W"]] },
  colorIdentity: ["G", "W"],
  power: 1,
  toughness: 1,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "draw", amount: 1 } }],
  tier: "scripted",
};

export const GARRISON_CAT: CardDefinition = {
  id: "garrison-cat",
  name: "Garrison Cat",
  scryfallId: "e7ff8345-227c-43b4-bed5-af3a34c0a990",
  types: ["Creature"],
  subtypes: ["Cat"],
  manaCost: { generic: 0, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 1,
  triggeredAbilities: [{ event: "dies", effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-w-11-human-soldier" } }],
  tier: "scripted",
};

export const GEOTHERMAL_BOG: CardDefinition = {
  id: "geothermal-bog",
  name: "Geothermal Bog",
  scryfallId: "6da04570-5d3c-4e9f-a9c1-20589a4bcc24",
  types: ["Land"],
  subtypes: ["Swamp", "Mountain"],
  colorIdentity: ["B", "R"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }],
  tier: "vanilla",
};

export const GHIRAPUR_OSPREY: CardDefinition = {
  id: "ghirapur-osprey",
  name: "Ghirapur Osprey",
  scryfallId: "2186f382-2d68-4191-b490-a072f49eaabf",
  types: ["Creature"],
  subtypes: ["Bird"],
  manaCost: { generic: 2, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 2,
  keywords: ["Flying"],
  tier: "vanilla",
};

export const GIGANTIC_BIG_BEAR: CardDefinition = {
  id: "gigantic-big-bear",
  name: "Gigantic Big Bear",
  scryfallId: "7d6ece3d-8e7a-41ad-974f-3c9748de4825",
  types: ["Creature"],
  subtypes: ["Bear"],
  manaCost: { generic: 5, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 10,
  toughness: 7,
  keywords: ["Hexproof", "Haste"],
  cantBeCountered: true,
  tier: "scripted",
};

export const GIGANTOSAURUS: CardDefinition = {
  id: "gigantosaurus",
  name: "Gigantosaurus",
  scryfallId: "c1db84d8-d426-4c0d-b44e-5be7b0f5f5bf",
  types: ["Creature"],
  subtypes: ["Dinosaur"],
  manaCost: { generic: 0, colors: { G: 5 } },
  colorIdentity: ["G"],
  power: 10,
  toughness: 10,
  tier: "vanilla",
};

export const GILDED_SENTINEL: CardDefinition = {
  id: "gilded-sentinel",
  name: "Gilded Sentinel",
  scryfallId: "01cc1a59-76bf-4721-b4a7-ef746f3d3990",
  types: ["Artifact", "Creature"],
  subtypes: ["Golem"],
  manaCost: { generic: 4, colors: {} },
  colorIdentity: [],
  power: 3,
  toughness: 3,
  tier: "vanilla",
};

export const GLACIAL_FLOODPLAIN: CardDefinition = {
  id: "glacial-floodplain",
  name: "Glacial Floodplain",
  scryfallId: "9de5fadd-4559-479f-b45d-abe792f0f6e5",
  types: ["Land"],
  subtypes: ["Plains", "Island"],
  supertypes: ["Snow"],
  colorIdentity: ["U", "W"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }],
  tier: "vanilla",
};

export const GLACIAL_FORTRESS: CardDefinition = {
  id: "glacial-fortress",
  name: "Glacial Fortress",
  scryfallId: "d673a2d5-0c61-48dc-8c8d-06f0c7b6b8bf",
  types: ["Land"],
  colorIdentity: ["U", "W"],
  entersTapped: true,
  entersTappedUnless: { kind: "controls-subtype", subtypes: ["Plains", "Island"] },
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }],
  tier: "vanilla",
};

export const GLASS_GOLEM: CardDefinition = {
  id: "glass-golem",
  name: "Glass Golem",
  scryfallId: "1b87dc27-3cea-4101-aec5-ca0b96978476",
  types: ["Artifact", "Creature"],
  subtypes: ["Golem"],
  manaCost: { generic: 5, colors: {} },
  colorIdentity: [],
  power: 6,
  toughness: 2,
  tier: "vanilla",
};

export const GLOOMLAKE_VERGE: CardDefinition = {
  id: "gloomlake-verge",
  name: "Gloomlake Verge",
  scryfallId: "83f510b7-4cbd-4883-9c26-c8824bc668ac",
  types: ["Land"],
  colorIdentity: ["B", "U"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 }, activateOnlyIf: { kind: "controls-subtype", subtypes: ["Island", "Swamp"] } }],
  tier: "vanilla",
};

export const GNARLED_MASS: CardDefinition = {
  id: "gnarled-mass",
  name: "Gnarled Mass",
  scryfallId: "5c28728d-4839-4cdf-91d4-b9fb4b5d0449",
  types: ["Creature"],
  subtypes: ["Spirit"],
  manaCost: { generic: 1, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 3,
  toughness: 3,
  tier: "vanilla",
};

export const GOBLIN_DEATHRAIDERS: CardDefinition = {
  id: "goblin-deathraiders",
  name: "Goblin Deathraiders",
  scryfallId: "0c0b85d3-ce46-4f12-8315-4cbf338eb8f0",
  types: ["Creature"],
  subtypes: ["Goblin", "Warrior"],
  manaCost: { generic: 0, colors: { B: 1, R: 1 } },
  colorIdentity: ["B", "R"],
  power: 3,
  toughness: 1,
  keywords: ["Trample"],
  tier: "vanilla",
};

export const GOBLIN_GANG_LEADER: CardDefinition = {
  id: "goblin-gang-leader",
  name: "Goblin Gang Leader",
  scryfallId: "98be3783-23e8-4143-8685-6d887f164294",
  types: ["Creature"],
  subtypes: ["Goblin", "Warrior"],
  manaCost: { generic: 2, colors: { R: 2 } },
  colorIdentity: ["R"],
  power: 2,
  toughness: 2,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "createToken", count: 2, tokenDefinitionId: "token-r-11-goblin" } }],
  tier: "scripted",
};

export const GOBLIN_INSTIGATOR: CardDefinition = {
  id: "goblin-instigator",
  name: "Goblin Instigator",
  scryfallId: "b36a1bc7-a080-4fb6-b975-c59bb33a090a",
  types: ["Creature"],
  subtypes: ["Goblin", "Rogue"],
  manaCost: { generic: 1, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 1,
  toughness: 1,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-r-11-goblin" } }],
  tier: "scripted",
};

export const GOBLIN_PIKER: CardDefinition = {
  id: "goblin-piker",
  name: "Goblin Piker",
  scryfallId: "083ec3e7-950c-4e9d-aba5-02ed13d723f0",
  types: ["Creature"],
  subtypes: ["Goblin", "Warrior"],
  manaCost: { generic: 1, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 2,
  toughness: 1,
  tier: "vanilla",
};

export const GOLD_MYR: CardDefinition = {
  id: "gold-myr",
  name: "Gold Myr",
  scryfallId: "12331b1d-a561-4a8c-8e85-ed3a607ce508",
  types: ["Artifact", "Creature"],
  subtypes: ["Myr"],
  manaCost: { generic: 2, colors: {} },
  colorIdentity: ["W"],
  power: 1,
  toughness: 1,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }],
  tier: "scripted",
};

export const GOLD_FORGED_SENTINEL: CardDefinition = {
  id: "gold-forged-sentinel",
  name: "Gold-Forged Sentinel",
  scryfallId: "ca1bcaee-52bf-4000-8ffa-ee5e04703de6",
  types: ["Artifact", "Creature"],
  subtypes: ["Chimera"],
  manaCost: { generic: 6, colors: {} },
  colorIdentity: [],
  power: 4,
  toughness: 4,
  keywords: ["Flying"],
  tier: "vanilla",
};

export const GOLDEN_HIND: CardDefinition = {
  id: "golden-hind",
  name: "Golden Hind",
  scryfallId: "1ae883ea-191e-4571-be3d-1e3149e6965e",
  types: ["Creature"],
  subtypes: ["Elk"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 2,
  toughness: 1,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "scripted",
};

export const GOLGARI_GERMINATION: CardDefinition = {
  id: "golgari-germination",
  name: "Golgari Germination",
  scryfallId: "8d03f6eb-a146-45e8-a8e0-a46ec0c20c1d",
  types: ["Enchantment"],
  manaCost: { generic: 1, colors: { B: 1, G: 1 } },
  colorIdentity: ["B", "G"],
  triggeredAbilities: [{ event: "permanent-dies", watches: "controller", includesSelf: true, watchFor: { type: "Creature", nontoken: true }, effect: { kind: "createToken", count: 1, tokenDefinitionId: "saproling-token" } }],
  tier: "scripted",
};

export const GOLGARI_LONGLEGS: CardDefinition = {
  id: "golgari-longlegs",
  name: "Golgari Longlegs",
  scryfallId: "d44058ba-3419-4777-8d59-05dea5e864e1",
  types: ["Creature"],
  subtypes: ["Insect"],
  manaCost: { generic: 3, colors: {}, hybrid: [["B", "G"], ["B", "G"]] },
  colorIdentity: ["B", "G"],
  power: 5,
  toughness: 4,
  tier: "vanilla",
};

export const GOLIATH_BEETLE: CardDefinition = {
  id: "goliath-beetle",
  name: "Goliath Beetle",
  scryfallId: "f83d8765-f654-4837-9b06-739610188415",
  types: ["Creature"],
  subtypes: ["Insect"],
  manaCost: { generic: 2, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 3,
  toughness: 1,
  keywords: ["Trample"],
  tier: "vanilla",
};

export const GONGAGA_REACTOR_TOWN: CardDefinition = {
  id: "gongaga-reactor-town",
  name: "Gongaga, Reactor Town",
  scryfallId: "7beccfa6-3e4b-4460-954e-870cb39e462d",
  types: ["Land"],
  subtypes: ["Town"],
  colorIdentity: ["G", "R"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "vanilla",
};

export const GOOBBUE_GARDENER: CardDefinition = {
  id: "goobbue-gardener",
  name: "Goobbue Gardener",
  scryfallId: "b7c3544a-5dd5-423e-8a40-ac4803db8adc",
  types: ["Creature"],
  subtypes: ["Plant", "Beast"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 1,
  toughness: 3,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "scripted",
};

export const GRAND_COLISEUM: CardDefinition = {
  id: "grand-coliseum",
  name: "Grand Coliseum",
  scryfallId: "b07eb189-559a-4cd5-95ac-f6612fd11cf1",
  types: ["Land"],
  colorIdentity: [],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 }, damageToController: 1 }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 }, damageToController: 1 }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 }, damageToController: 1 }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 }, damageToController: 1 }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 }, damageToController: 1 }],
  tier: "vanilla",
};

export const GRAPPLER_SPIDER: CardDefinition = {
  id: "grappler-spider",
  name: "Grappler Spider",
  scryfallId: "e2324d0b-ac63-45e5-ba27-a643c61538c7",
  types: ["Creature"],
  subtypes: ["Spider"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 2,
  toughness: 1,
  keywords: ["Reach"],
  tier: "vanilla",
};

export const GRASPING_LONGNECK: CardDefinition = {
  id: "grasping-longneck",
  name: "Grasping Longneck",
  scryfallId: "7fddcd48-3efe-4b56-9d69-9659b3dc6021",
  types: ["Creature", "Enchantment"],
  subtypes: ["Horror"],
  manaCost: { generic: 2, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 4,
  toughness: 2,
  keywords: ["Reach"],
  triggeredAbilities: [{ event: "dies", effect: { kind: "gainLife", amount: 2 } }],
  tier: "scripted",
};

export const GRAVEL_HIDE_GOBLIN: CardDefinition = {
  id: "gravel-hide-goblin",
  name: "Gravel-Hide Goblin",
  scryfallId: "ed8d49e1-4079-4411-930b-36dbac5c2113",
  types: ["Creature"],
  subtypes: ["Goblin", "Shaman"],
  manaCost: { generic: 1, colors: { R: 1 } },
  colorIdentity: ["G", "R"],
  power: 2,
  toughness: 1,
  activatedAbilities: [{ cost: { mana: { generic: 3, colors: { G: 1 } } }, effect: { kind: "pump", power: 2, toughness: 2 } }],
  tier: "scripted",
};

export const GRAVEN_CAIRNS: CardDefinition = {
  id: "graven-cairns",
  name: "Graven Cairns",
  scryfallId: "74a13fea-4f48-428b-b42b-4ba63d4752ed",
  types: ["Land"],
  colorIdentity: ["B", "R"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 1 } }, { cost: { tap: true, mana: { generic: 0, colors: {}, hybrid: [["B", "R"]] } }, effect: { kind: "addManaCombination", mana: [{ color: "B", amount: 2 }] } }, { cost: { tap: true, mana: { generic: 0, colors: {}, hybrid: [["B", "R"]] } }, effect: { kind: "addManaCombination", mana: [{ color: "B", amount: 1 }, { color: "R", amount: 1 }] } }, { cost: { tap: true, mana: { generic: 0, colors: {}, hybrid: [["B", "R"]] } }, effect: { kind: "addManaCombination", mana: [{ color: "R", amount: 2 }] } }],
  tier: "vanilla",
};

export const GRAYPELT_REFUGE: CardDefinition = {
  id: "graypelt-refuge",
  name: "Graypelt Refuge",
  scryfallId: "0849b6dd-0330-4b7e-b7da-98e767adb4a0",
  types: ["Land"],
  colorIdentity: ["G", "W"],
  entersTapped: true,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 1 } }],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }],
  tier: "scripted",
};

export const GRAZING_GLADEHART: CardDefinition = {
  id: "grazing-gladehart",
  name: "Grazing Gladehart",
  scryfallId: "06dda49d-25a2-4fa3-80f2-0d784e1ad30f",
  types: ["Creature"],
  subtypes: ["Antelope"],
  manaCost: { generic: 2, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 2,
  toughness: 2,
  triggeredAbilities: [{ event: "landfall", watches: "controller", optional: true, effect: { kind: "gainLife", amount: 2 } }],
  tier: "scripted",
};

export const GREAT_FOREST_DRUID: CardDefinition = {
  id: "great-forest-druid",
  name: "Great Forest Druid",
  scryfallId: "8793a19e-6743-4031-86d9-2ff55f384549",
  types: ["Creature"],
  subtypes: ["Treefolk", "Druid"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 0,
  toughness: 4,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "scripted",
};

export const GREAT_FURNACE: CardDefinition = {
  id: "great-furnace",
  name: "Great Furnace",
  scryfallId: "74c5bb44-d72c-4c1a-a38f-86b4a8f49ae1",
  types: ["Land", "Artifact"],
  colorIdentity: ["R"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }],
  tier: "vanilla",
};

export const GREAT_HART: CardDefinition = {
  id: "great-hart",
  name: "Great Hart",
  scryfallId: "70cd7d2b-e9c4-4900-89a0-f6eb0c6cb22b",
  types: ["Creature"],
  subtypes: ["Elk"],
  manaCost: { generic: 3, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 4,
  tier: "vanilla",
};

export const GREAT_HORN_KRUSHOK: CardDefinition = {
  id: "great-horn-krushok",
  name: "Great-Horn Krushok",
  scryfallId: "122e08cb-407b-4b3d-8af0-077ff96bf160",
  types: ["Creature"],
  subtypes: ["Beast"],
  manaCost: { generic: 4, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 5,
  tier: "vanilla",
};

export const GREENWEAVER_DRUID: CardDefinition = {
  id: "greenweaver-druid",
  name: "Greenweaver Druid",
  scryfallId: "747099f7-ce5b-4366-a8a4-f3d80100f66e",
  types: ["Creature"],
  subtypes: ["Elf", "Druid"],
  manaCost: { generic: 2, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 1,
  toughness: 1,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 2 } }],
  tier: "scripted",
};

export const GRIFFIN_SENTINEL: CardDefinition = {
  id: "griffin-sentinel",
  name: "Griffin Sentinel",
  scryfallId: "cb13aaa4-d40a-4fb2-9fd6-62bf76db6a13",
  types: ["Creature"],
  subtypes: ["Griffin"],
  manaCost: { generic: 2, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 3,
  keywords: ["Flying", "Vigilance"],
  tier: "vanilla",
};

export const GRIZZLED_LEOTAU: CardDefinition = {
  id: "grizzled-leotau",
  name: "Grizzled Leotau",
  scryfallId: "2b388381-9e13-4ce7-b5b3-56a74cc23d93",
  types: ["Creature"],
  subtypes: ["Cat"],
  manaCost: { generic: 0, colors: { G: 1, W: 1 } },
  colorIdentity: ["G", "W"],
  power: 1,
  toughness: 5,
  tier: "vanilla",
};

export const GRUUL_GUILDGATE: CardDefinition = {
  id: "gruul-guildgate",
  name: "Gruul Guildgate",
  scryfallId: "3ab6c240-c97d-4a5c-bc39-860c2d9901c2",
  types: ["Land"],
  subtypes: ["Gate"],
  colorIdentity: ["G", "R"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "vanilla",
};

export const GUADOSALAM_FARPLANE_GATEWAY: CardDefinition = {
  id: "guadosalam-farplane-gateway",
  name: "Guadosalam, Farplane Gateway",
  scryfallId: "dfcbc131-fd50-4908-b539-c8e52bb70c58",
  types: ["Land"],
  subtypes: ["Town"],
  colorIdentity: ["G", "U"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }],
  tier: "vanilla",
};

export const GUARDED_HEIR: CardDefinition = {
  id: "guarded-heir",
  name: "Guarded Heir",
  scryfallId: "525ba5c7-3ce5-4e52-b8b5-96c9040a6738",
  types: ["Creature"],
  subtypes: ["Human", "Noble"],
  manaCost: { generic: 5, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 1,
  keywords: ["Lifelink"],
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "createToken", count: 2, tokenDefinitionId: "token-w-33-knight" } }],
  tier: "scripted",
};

export const GUARDIAN_AUTOMATON: CardDefinition = {
  id: "guardian-automaton",
  name: "Guardian Automaton",
  scryfallId: "7e8916b7-f5e4-4fae-8db8-9859d69212ec",
  types: ["Artifact", "Creature"],
  subtypes: ["Construct"],
  manaCost: { generic: 4, colors: {} },
  colorIdentity: [],
  power: 3,
  toughness: 3,
  triggeredAbilities: [{ event: "dies", effect: { kind: "gainLife", amount: 3 } }],
  tier: "scripted",
};

export const GUARDIANS_OF_MELETIS: CardDefinition = {
  id: "guardians-of-meletis",
  name: "Guardians of Meletis",
  scryfallId: "2ff39de2-d071-4568-baac-25b505a2da56",
  types: ["Artifact", "Creature"],
  subtypes: ["Golem"],
  manaCost: { generic: 3, colors: {} },
  colorIdentity: [],
  power: 0,
  toughness: 6,
  keywords: ["Defender"],
  tier: "vanilla",
};

export const HAPPY_HOGAN_DAUNTLESS_DRIVER: CardDefinition = {
  id: "happy-hogan-dauntless-driver",
  name: "Happy Hogan, Dauntless Driver",
  scryfallId: "4174e5fa-8e28-41c5-ba5c-4ec27b7cd4a3",
  types: ["Creature"],
  subtypes: ["Human", "Pilot"],
  supertypes: ["Legendary"],
  manaCost: { generic: 0, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 2,
  toughness: 1,
  canBeCommander: true,
  tier: "vanilla",
};

export const HAUNTED_GUARDIAN: CardDefinition = {
  id: "haunted-guardian",
  name: "Haunted Guardian",
  scryfallId: "7d97f8b8-bdb0-4d4b-b077-9affe2f9cd91",
  types: ["Artifact", "Creature"],
  subtypes: ["Construct"],
  manaCost: { generic: 2, colors: {} },
  colorIdentity: [],
  power: 2,
  toughness: 1,
  keywords: ["Defender", "First Strike"],
  tier: "vanilla",
};

export const HAUNTED_RIDGE: CardDefinition = {
  id: "haunted-ridge",
  name: "Haunted Ridge",
  scryfallId: "32f1e668-89b8-4f82-afc1-6c3efb1fef3b",
  types: ["Land"],
  colorIdentity: ["B", "R"],
  entersTapped: true,
  entersTappedUnless: { kind: "controls-other-lands", count: 2 },
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }],
  tier: "vanilla",
};

export const HAVOC_DEVILS: CardDefinition = {
  id: "havoc-devils",
  name: "Havoc Devils",
  scryfallId: "2f003678-0f17-4f1d-87d5-83613a82044b",
  types: ["Creature"],
  subtypes: ["Devil"],
  manaCost: { generic: 2, colors: { R: 2 } },
  colorIdentity: ["R"],
  power: 4,
  toughness: 3,
  keywords: ["Trample"],
  tier: "vanilla",
};

export const HEAD_OF_THE_HOMESTEAD: CardDefinition = {
  id: "head-of-the-homestead",
  name: "Head of the Homestead",
  scryfallId: "2fc20157-edd3-484d-8864-925c071c0551",
  types: ["Creature"],
  subtypes: ["Rabbit", "Citizen"],
  manaCost: { generic: 3, colors: {}, hybrid: [["G", "W"], ["G", "W"]] },
  colorIdentity: ["G", "W"],
  power: 3,
  toughness: 2,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "createToken", count: 2, tokenDefinitionId: "token-w-11-rabbit" } }],
  tier: "scripted",
};

export const HEALER_OF_THE_GLADE: CardDefinition = {
  id: "healer-of-the-glade",
  name: "Healer of the Glade",
  scryfallId: "cbe262f2-e35b-4c85-938d-3e9e9c764c1b",
  types: ["Creature"],
  subtypes: ["Elemental"],
  manaCost: { generic: 0, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 1,
  toughness: 2,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 3 } }],
  tier: "scripted",
};

export const HEALER_S_HAWK: CardDefinition = {
  id: "healers-hawk",
  name: "Healer's Hawk",
  scryfallId: "069cfaa5-bba4-4503-b54e-b98fa9f0a0fc",
  types: ["Creature"],
  subtypes: ["Bird"],
  manaCost: { generic: 0, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 1,
  keywords: ["Flying", "Lifelink"],
  tier: "vanilla",
};

export const HEARTHFIRE_HOBGOBLIN: CardDefinition = {
  id: "hearthfire-hobgoblin",
  name: "Hearthfire Hobgoblin",
  scryfallId: "06ee5eda-41a9-4cae-bb2a-b63fd450d02d",
  types: ["Creature"],
  subtypes: ["Goblin", "Soldier"],
  manaCost: { generic: 0, colors: {}, hybrid: [["R", "W"], ["R", "W"], ["R", "W"]] },
  colorIdentity: ["R", "W"],
  power: 2,
  toughness: 2,
  keywords: ["Double Strike"],
  tier: "vanilla",
};

export const HEDRON_CRAWLER: CardDefinition = {
  id: "hedron-crawler",
  name: "Hedron Crawler",
  scryfallId: "9f827f92-1df6-4fd0-aa61-ec2e53476f9c",
  types: ["Artifact", "Creature"],
  subtypes: ["Construct"],
  manaCost: { generic: 2, colors: {} },
  colorIdentity: [],
  power: 0,
  toughness: 1,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 1 } }],
  tier: "scripted",
};

export const HELL_S_KITCHEN: CardDefinition = {
  id: "hells-kitchen",
  name: "Hell's Kitchen",
  scryfallId: "6137c34e-cc4c-4342-a8e4-cfa9c767c67b",
  types: ["Land"],
  colorIdentity: ["B", "R"],
  entersTapped: true,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 1 } }],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }],
  tier: "scripted",
};

export const HELLKITE_PUNISHER: CardDefinition = {
  id: "hellkite-punisher",
  name: "Hellkite Punisher",
  scryfallId: "7bf663d3-850b-4a24-8e4b-08311adf4ed0",
  types: ["Creature"],
  subtypes: ["Dragon"],
  manaCost: { generic: 5, colors: { R: 2 } },
  colorIdentity: ["R"],
  power: 6,
  toughness: 6,
  keywords: ["Flying"],
  activatedAbilities: [{ cost: { mana: { generic: 0, colors: { R: 1 } } }, effect: { kind: "pump", power: 1, toughness: 0 } }],
  tier: "scripted",
};

export const HERALD_OF_FAITH: CardDefinition = {
  id: "herald-of-faith",
  name: "Herald of Faith",
  scryfallId: "2e1705da-dc35-4bcb-82d4-b77712e79af3",
  types: ["Creature"],
  subtypes: ["Angel"],
  manaCost: { generic: 3, colors: { W: 2 } },
  colorIdentity: ["W"],
  power: 4,
  toughness: 3,
  keywords: ["Flying"],
  triggeredAbilities: [{ event: "attacks", effect: { kind: "gainLife", amount: 2 } }],
  tier: "scripted",
};

export const HEXPLATE_GOLEM: CardDefinition = {
  id: "hexplate-golem",
  name: "Hexplate Golem",
  scryfallId: "98534255-d8cd-4f42-8b90-f5672fb879a2",
  types: ["Artifact", "Creature"],
  subtypes: ["Golem"],
  manaCost: { generic: 7, colors: {} },
  colorIdentity: [],
  power: 5,
  toughness: 7,
  tier: "vanilla",
};

export const HIGHLAND_FOREST: CardDefinition = {
  id: "highland-forest",
  name: "Highland Forest",
  scryfallId: "59f64a32-c364-4750-94ed-d4d71c1a3511",
  types: ["Land"],
  subtypes: ["Mountain", "Forest"],
  supertypes: ["Snow"],
  colorIdentity: ["G", "R"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "vanilla",
};

export const HIGHLAND_GAME: CardDefinition = {
  id: "highland-game",
  name: "Highland Game",
  scryfallId: "4ec59964-42c1-4c29-8c60-37b7f376c347",
  types: ["Creature"],
  subtypes: ["Elk"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 2,
  toughness: 1,
  triggeredAbilities: [{ event: "dies", effect: { kind: "gainLife", amount: 2 } }],
  tier: "scripted",
};

export const HIGHLAND_LAKE: CardDefinition = {
  id: "highland-lake",
  name: "Highland Lake",
  scryfallId: "46bb20af-a326-4a42-94d3-cb1990300e0f",
  types: ["Land"],
  colorIdentity: ["R", "U"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }],
  tier: "vanilla",
};

export const HIGHLAND_WEALD: CardDefinition = {
  id: "highland-weald",
  name: "Highland Weald",
  scryfallId: "38bcd111-0830-4fc0-a113-37eb306fb1a0",
  types: ["Land"],
  supertypes: ["Snow"],
  colorIdentity: ["G", "R"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "vanilla",
};

export const HIGHSPIRE_MANTIS: CardDefinition = {
  id: "highspire-mantis",
  name: "Highspire Mantis",
  scryfallId: "60d3708b-dd40-4515-bf8f-36cbc5de6b67",
  types: ["Creature"],
  subtypes: ["Insect"],
  manaCost: { generic: 2, colors: { R: 1, W: 1 } },
  colorIdentity: ["R", "W"],
  power: 3,
  toughness: 3,
  keywords: ["Flying", "Trample"],
  tier: "vanilla",
};

export const HINTERLAND_HARBOR: CardDefinition = {
  id: "hinterland-harbor",
  name: "Hinterland Harbor",
  scryfallId: "892451a1-5527-4857-84f8-62028d147489",
  types: ["Land"],
  colorIdentity: ["G", "U"],
  entersTapped: true,
  entersTappedUnless: { kind: "controls-subtype", subtypes: ["Forest", "Island"] },
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }],
  tier: "vanilla",
};

export const HIPPO_COWS: CardDefinition = {
  id: "hippo-cows",
  name: "Hippo-Cows",
  scryfallId: "24ca6ca8-e239-4fe5-8711-24098b74e2fe",
  types: ["Creature"],
  subtypes: ["Hippo", "Ox"],
  manaCost: { generic: 4, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 5,
  toughness: 4,
  keywords: ["Trample"],
  tier: "vanilla",
};

export const HIT_MONKEY: CardDefinition = {
  id: "hit-monkey",
  name: "Hit-Monkey",
  scryfallId: "7a253dc9-1593-4914-90ca-309aa3aed53d",
  types: ["Creature"],
  subtypes: ["Monkey", "Assassin"],
  supertypes: ["Legendary"],
  manaCost: { generic: 3, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 3,
  toughness: 3,
  keywords: ["Reach", "Vigilance", "Deathtouch", "Hexproof", "Haste"],
  cantBeCountered: true,
  canBeCommander: true,
  tier: "scripted",
};

export const HOBGOBLIN_DRAGOON: CardDefinition = {
  id: "hobgoblin-dragoon",
  name: "Hobgoblin Dragoon",
  scryfallId: "090223a1-2644-4b81-a9f5-d15ca6df5229",
  types: ["Creature"],
  subtypes: ["Goblin", "Knight"],
  manaCost: { generic: 2, colors: {}, hybrid: [["R", "W"]] },
  colorIdentity: ["R", "W"],
  power: 1,
  toughness: 2,
  keywords: ["Flying", "First Strike"],
  tier: "vanilla",
};

export const HOLLOWHENGE_SCAVENGER: CardDefinition = {
  id: "hollowhenge-scavenger",
  name: "Hollowhenge Scavenger",
  scryfallId: "6c9ff632-0e27-4521-9e9d-5725e618f5dd",
  types: ["Creature"],
  subtypes: ["Elemental"],
  manaCost: { generic: 3, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 4,
  toughness: 5,
  triggeredAbilities: [{ event: "enters-battlefield", onlyIf: { kind: "creature-died-this-turn" }, effect: { kind: "gainLife", amount: 5 } }],
  tier: "scripted",
};

export const HONEY_MAMMOTH: CardDefinition = {
  id: "honey-mammoth",
  name: "Honey Mammoth",
  scryfallId: "84b9bee2-b973-4de7-b72d-7f36f8e8153c",
  types: ["Creature"],
  subtypes: ["Elephant"],
  manaCost: { generic: 4, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 6,
  toughness: 6,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 4 } }],
  tier: "scripted",
};

export const HONOR_GUARD: CardDefinition = {
  id: "honor-guard",
  name: "Honor Guard",
  scryfallId: "9c8a5add-87af-447d-9fd7-c4aeec3685fb",
  types: ["Creature"],
  subtypes: ["Human", "Soldier"],
  manaCost: { generic: 0, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 1,
  activatedAbilities: [{ cost: { mana: { generic: 0, colors: { W: 1 } } }, effect: { kind: "pump", power: 0, toughness: 1 } }],
  tier: "scripted",
};

export const HOVERMYR: CardDefinition = {
  id: "hovermyr",
  name: "Hovermyr",
  scryfallId: "95e4e445-8333-4cb4-b4fb-80957fae0b97",
  types: ["Artifact", "Creature"],
  subtypes: ["Myr"],
  manaCost: { generic: 2, colors: {} },
  colorIdentity: [],
  power: 1,
  toughness: 2,
  keywords: ["Flying", "Vigilance"],
  tier: "vanilla",
};

export const HOWLING_GIANT: CardDefinition = {
  id: "howling-giant",
  name: "Howling Giant",
  scryfallId: "eb8434fd-5ee5-4be9-a28d-9e04b1b94327",
  types: ["Creature"],
  subtypes: ["Giant", "Druid"],
  manaCost: { generic: 5, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 5,
  toughness: 5,
  keywords: ["Reach"],
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "createToken", count: 2, tokenDefinitionId: "token-g-22-wolf" } }],
  tier: "scripted",
};

export const HUATLI_S_SNUBHORN: CardDefinition = {
  id: "huatlis-snubhorn",
  name: "Huatli's Snubhorn",
  scryfallId: "e2d88e6c-4aa8-4175-9f5d-a4c0182cdf74",
  types: ["Creature"],
  subtypes: ["Dinosaur"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 2,
  keywords: ["Vigilance"],
  tier: "vanilla",
};

export const HUNTED_WITNESS: CardDefinition = {
  id: "hunted-witness",
  name: "Hunted Witness",
  scryfallId: "8c31b8e5-2349-4119-9dc2-3e41c5364a78",
  types: ["Creature"],
  subtypes: ["Human"],
  manaCost: { generic: 0, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 1,
  triggeredAbilities: [{ event: "dies", effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-w-11-soldier-lifelink" } }],
  tier: "scripted",
};

export const HURLOON_MINOTAUR: CardDefinition = {
  id: "hurloon-minotaur",
  name: "Hurloon Minotaur",
  scryfallId: "eb72cfc8-6235-4951-b1ba-6d9531f5eabf",
  types: ["Creature"],
  subtypes: ["Minotaur"],
  manaCost: { generic: 1, colors: { R: 2 } },
  colorIdentity: ["R"],
  power: 2,
  toughness: 3,
  tier: "vanilla",
};

export const HUSHWOOD_VERGE: CardDefinition = {
  id: "hushwood-verge",
  name: "Hushwood Verge",
  scryfallId: "ec288d76-c1f5-471b-8a53-504f88469c1b",
  types: ["Land"],
  colorIdentity: ["G", "W"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 }, activateOnlyIf: { kind: "controls-subtype", subtypes: ["Forest", "Plains"] } }],
  tier: "vanilla",
};

export const HYENA_PACK: CardDefinition = {
  id: "hyena-pack",
  name: "Hyena Pack",
  scryfallId: "f9fa8351-567e-4ef4-8346-c58e50c778a6",
  types: ["Creature"],
  subtypes: ["Hyena"],
  manaCost: { generic: 2, colors: { R: 2 } },
  colorIdentity: ["R"],
  power: 3,
  toughness: 4,
  tier: "vanilla",
};

export const ICE_TUNNEL: CardDefinition = {
  id: "ice-tunnel",
  name: "Ice Tunnel",
  scryfallId: "8cff3ef0-4dfb-472e-aa1e-77613dd0f6d8",
  types: ["Land"],
  subtypes: ["Island", "Swamp"],
  supertypes: ["Snow"],
  colorIdentity: ["B", "U"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }],
  tier: "vanilla",
};

export const IDYLLIC_BEACHFRONT: CardDefinition = {
  id: "idyllic-beachfront",
  name: "Idyllic Beachfront",
  scryfallId: "c50ec22c-decb-419f-ae52-78ea1706eb11",
  types: ["Land"],
  subtypes: ["Plains", "Island"],
  colorIdentity: ["U", "W"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }],
  tier: "vanilla",
};

export const IGNEOUS_CUR: CardDefinition = {
  id: "igneous-cur",
  name: "Igneous Cur",
  scryfallId: "d2bfec5d-3182-415a-afe8-0b5511cfd656",
  types: ["Creature"],
  subtypes: ["Elemental", "Dog"],
  manaCost: { generic: 1, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 1,
  toughness: 2,
  activatedAbilities: [{ cost: { mana: { generic: 1, colors: { R: 1 } } }, effect: { kind: "pump", power: 2, toughness: 0 } }],
  tier: "scripted",
};

export const IMPERIAL_OUTRIDER: CardDefinition = {
  id: "imperial-outrider",
  name: "Imperial Outrider",
  scryfallId: "0dd3aca5-516f-4500-9d7f-95630401d3ae",
  types: ["Creature"],
  subtypes: ["Human", "Knight"],
  manaCost: { generic: 3, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 5,
  tier: "vanilla",
};

export const INFESTATION_SAGE: CardDefinition = {
  id: "infestation-sage",
  name: "Infestation Sage",
  scryfallId: "d40c73de-7a5f-46f2-a70b-449bc8ecfe24",
  types: ["Creature"],
  subtypes: ["Elf", "Warlock"],
  manaCost: { generic: 0, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 1,
  toughness: 1,
  triggeredAbilities: [{ event: "dies", effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-bg-11-insect-flying" } }],
  tier: "scripted",
};

export const INSOMNIA_CROWN_CITY: CardDefinition = {
  id: "insomnia-crown-city",
  name: "Insomnia, Crown City",
  scryfallId: "07fca511-a65c-4779-82c0-9215b0dcd068",
  types: ["Land"],
  subtypes: ["Town"],
  colorIdentity: ["B", "W"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }],
  tier: "vanilla",
};

export const INSPIRING_CLERIC: CardDefinition = {
  id: "inspiring-cleric",
  name: "Inspiring Cleric",
  scryfallId: "31b8f1da-c8ea-41d5-b1ad-b714c22d3683",
  types: ["Creature"],
  subtypes: ["Vampire", "Cleric"],
  manaCost: { generic: 2, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 2,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 4 } }],
  tier: "scripted",
};

export const IROAS_S_CHAMPION: CardDefinition = {
  id: "iroass-champion",
  name: "Iroas's Champion",
  scryfallId: "c0441583-c9d5-47a1-8754-c9162cec64bc",
  types: ["Creature"],
  subtypes: ["Human", "Soldier"],
  manaCost: { generic: 1, colors: { R: 1, W: 1 } },
  colorIdentity: ["R", "W"],
  power: 2,
  toughness: 2,
  keywords: ["Double Strike"],
  tier: "vanilla",
};

export const IRON_GIANT: CardDefinition = {
  id: "iron-giant",
  name: "Iron Giant",
  scryfallId: "e48cf6d5-4d32-4b66-80be-3495ecd3e906",
  types: ["Artifact", "Creature"],
  subtypes: ["Demon"],
  manaCost: { generic: 7, colors: {} },
  colorIdentity: [],
  power: 6,
  toughness: 6,
  keywords: ["Reach", "Vigilance", "Trample"],
  tier: "vanilla",
};

export const IRON_MYR: CardDefinition = {
  id: "iron-myr",
  name: "Iron Myr",
  scryfallId: "5bd0a588-b695-4060-b5d5-c6a74710ff0f",
  types: ["Artifact", "Creature"],
  subtypes: ["Myr"],
  manaCost: { generic: 2, colors: {} },
  colorIdentity: ["R"],
  power: 1,
  toughness: 1,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }],
  tier: "scripted",
};

export const IRONCLAD_KROVOD: CardDefinition = {
  id: "ironclad-krovod",
  name: "Ironclad Krovod",
  scryfallId: "e5d57e98-e05a-4a89-900e-20fe675a62ef",
  types: ["Creature"],
  subtypes: ["Beast"],
  manaCost: { generic: 3, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 5,
  tier: "vanilla",
};

export const IRONROOT_TREEFOLK: CardDefinition = {
  id: "ironroot-treefolk",
  name: "Ironroot Treefolk",
  scryfallId: "6bdbba38-b4c9-4c14-b869-669b39390e4e",
  types: ["Creature"],
  subtypes: ["Treefolk"],
  manaCost: { generic: 4, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 3,
  toughness: 5,
  tier: "vanilla",
};

export const ISOLATED_CHAPEL: CardDefinition = {
  id: "isolated-chapel",
  name: "Isolated Chapel",
  scryfallId: "78814c92-b52c-462a-866f-3e7da9db9f70",
  types: ["Land"],
  colorIdentity: ["B", "W"],
  entersTapped: true,
  entersTappedUnless: { kind: "controls-subtype", subtypes: ["Plains", "Swamp"] },
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }],
  tier: "vanilla",
};

export const ITHILIEN_KINGFISHER: CardDefinition = {
  id: "ithilien-kingfisher",
  name: "Ithilien Kingfisher",
  scryfallId: "8526b72e-936e-4592-9538-37acca0a6fc5",
  types: ["Creature"],
  subtypes: ["Bird"],
  manaCost: { generic: 2, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 2,
  toughness: 1,
  keywords: ["Flying"],
  triggeredAbilities: [{ event: "dies", effect: { kind: "draw", amount: 1 } }],
  tier: "scripted",
};

export const IZZET_GUILDGATE: CardDefinition = {
  id: "izzet-guildgate",
  name: "Izzet Guildgate",
  scryfallId: "db9e6fc9-813d-4a71-8a68-8e0f83fa945d",
  types: ["Land"],
  subtypes: ["Gate"],
  colorIdentity: ["R", "U"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }],
  tier: "vanilla",
};

export const JADDI_OFFSHOOT: CardDefinition = {
  id: "jaddi-offshoot",
  name: "Jaddi Offshoot",
  scryfallId: "3ed79f15-beeb-4157-a567-eac0772f950a",
  types: ["Creature"],
  subtypes: ["Plant"],
  manaCost: { generic: 0, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 0,
  toughness: 3,
  keywords: ["Defender"],
  triggeredAbilities: [{ event: "landfall", watches: "controller", effect: { kind: "gainLife", amount: 1 } }],
  tier: "scripted",
};

export const JASMINE_BOREAL: CardDefinition = {
  id: "jasmine-boreal",
  name: "Jasmine Boreal",
  scryfallId: "004af467-815a-47c0-a974-1ae49ca3a1a8",
  types: ["Creature"],
  subtypes: ["Human"],
  supertypes: ["Legendary"],
  manaCost: { generic: 3, colors: { G: 1, W: 1 } },
  colorIdentity: ["G", "W"],
  power: 4,
  toughness: 5,
  canBeCommander: true,
  tier: "vanilla",
};

export const JEDIT_OJANEN: CardDefinition = {
  id: "jedit-ojanen",
  name: "Jedit Ojanen",
  scryfallId: "701d1f89-1a4b-41a8-bdb0-972af01f78d4",
  types: ["Creature"],
  subtypes: ["Cat", "Warrior"],
  supertypes: ["Legendary"],
  manaCost: { generic: 4, colors: { U: 1, W: 2 } },
  colorIdentity: ["U", "W"],
  power: 5,
  toughness: 5,
  canBeCommander: true,
  tier: "vanilla",
};

export const JEDIT_S_DRAGOONS: CardDefinition = {
  id: "jedits-dragoons",
  name: "Jedit's Dragoons",
  scryfallId: "3f190c65-f939-4453-95d7-9acb36cf97c2",
  types: ["Creature"],
  subtypes: ["Cat", "Soldier"],
  manaCost: { generic: 5, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 5,
  keywords: ["Vigilance"],
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 4 } }],
  tier: "scripted",
};

export const JORAGA_VISIONARY: CardDefinition = {
  id: "joraga-visionary",
  name: "Joraga Visionary",
  scryfallId: "a1ea2c17-382a-45e4-ac34-88bf8ba47169",
  types: ["Creature"],
  subtypes: ["Elf", "Wizard"],
  manaCost: { generic: 3, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 3,
  toughness: 2,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "draw", amount: 1 } }],
  tier: "scripted",
};

export const JOUSTING_DUMMY: CardDefinition = {
  id: "jousting-dummy",
  name: "Jousting Dummy",
  scryfallId: "3d0c95b0-7b63-40e8-92ad-5ae5ffd3c4c1",
  types: ["Artifact", "Creature"],
  subtypes: ["Scarecrow", "Knight"],
  manaCost: { generic: 2, colors: {} },
  colorIdentity: [],
  power: 2,
  toughness: 1,
  activatedAbilities: [{ cost: { mana: { generic: 3, colors: {} } }, effect: { kind: "pump", power: 1, toughness: 0 } }],
  tier: "scripted",
};

export const JUNGLE_BARRIER: CardDefinition = {
  id: "jungle-barrier",
  name: "Jungle Barrier",
  scryfallId: "a8097e6e-c04e-4266-a8f4-07e5fb0638d4",
  types: ["Creature"],
  subtypes: ["Plant", "Wall"],
  manaCost: { generic: 2, colors: { G: 1, U: 1 } },
  colorIdentity: ["G", "U"],
  power: 2,
  toughness: 6,
  keywords: ["Defender"],
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "draw", amount: 1 } }],
  tier: "scripted",
};

export const JUNGLE_SHRINE: CardDefinition = {
  id: "jungle-shrine",
  name: "Jungle Shrine",
  scryfallId: "0b1a84b6-4202-4413-80ed-4142c51e619a",
  types: ["Land"],
  colorIdentity: ["G", "R", "W"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }],
  tier: "vanilla",
};

export const JUNGLEBORN_PIONEER: CardDefinition = {
  id: "jungleborn-pioneer",
  name: "Jungleborn Pioneer",
  scryfallId: "9f01ae0d-db1e-4912-b8ad-3069f6938e04",
  types: ["Creature"],
  subtypes: ["Merfolk", "Scout"],
  manaCost: { generic: 2, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 2,
  toughness: 2,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-u-11-merfolk-hexproof" } }],
  tier: "scripted",
};

export const JWAR_ISLE_REFUGE: CardDefinition = {
  id: "jwar-isle-refuge",
  name: "Jwar Isle Refuge",
  scryfallId: "6d103181-25a1-4928-ac37-adf11038d5b5",
  types: ["Land"],
  colorIdentity: ["B", "U"],
  entersTapped: true,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 1 } }],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }],
  tier: "scripted",
};

export const KABIRA_CROSSROADS: CardDefinition = {
  id: "kabira-crossroads",
  name: "Kabira Crossroads",
  scryfallId: "7f6a18b8-d490-490d-83a5-227a416ccf92",
  types: ["Land"],
  colorIdentity: ["W"],
  entersTapped: true,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 2 } }],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }],
  tier: "scripted",
};

export const KALAKSCION_HUNGER_TYRANT: CardDefinition = {
  id: "kalakscion-hunger-tyrant",
  name: "Kalakscion, Hunger Tyrant",
  scryfallId: "1214fc6d-ae47-418d-88cc-58633ec2ac7a",
  types: ["Creature"],
  subtypes: ["Crocodile"],
  supertypes: ["Legendary"],
  manaCost: { generic: 1, colors: { B: 2 } },
  colorIdentity: ["B"],
  power: 7,
  toughness: 2,
  canBeCommander: true,
  tier: "vanilla",
};

export const KARPLUSAN_FOREST: CardDefinition = {
  id: "karplusan-forest",
  name: "Karplusan Forest",
  scryfallId: "67198b97-bac2-480f-aea8-12841e8884de",
  types: ["Land"],
  colorIdentity: ["G", "R"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 }, damageToController: 1 }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 }, damageToController: 1 }],
  tier: "vanilla",
};

export const KASIMIR_THE_LONE_WOLF: CardDefinition = {
  id: "kasimir-the-lone-wolf",
  name: "Kasimir the Lone Wolf",
  scryfallId: "45b1e60d-54dd-41cd-b9a2-00890725a3df",
  types: ["Creature"],
  subtypes: ["Human", "Warrior"],
  supertypes: ["Legendary"],
  manaCost: { generic: 4, colors: { U: 1, W: 1 } },
  colorIdentity: ["U", "W"],
  power: 5,
  toughness: 3,
  canBeCommander: true,
  tier: "vanilla",
};

export const KAZANDU_NECTARPOT: CardDefinition = {
  id: "kazandu-nectarpot",
  name: "Kazandu Nectarpot",
  scryfallId: "7c9d3f4a-ef83-454e-b8a1-1fc5d5f44be8",
  types: ["Creature"],
  subtypes: ["Insect"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 1,
  toughness: 3,
  triggeredAbilities: [{ event: "landfall", watches: "controller", effect: { kind: "gainLife", amount: 1 } }],
  tier: "scripted",
};

export const KAZANDU_REFUGE: CardDefinition = {
  id: "kazandu-refuge",
  name: "Kazandu Refuge",
  scryfallId: "6ca097f1-eef0-4e18-ab5d-49bb4aeb74e2",
  types: ["Land"],
  colorIdentity: ["G", "R"],
  entersTapped: true,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 1 } }],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "scripted",
};

export const KEDEREKT_CREEPER: CardDefinition = {
  id: "kederekt-creeper",
  name: "Kederekt Creeper",
  scryfallId: "701498e5-1d4d-42f4-9dd0-5d4cf78f0e68",
  types: ["Creature"],
  subtypes: ["Horror"],
  manaCost: { generic: 0, colors: { B: 1, R: 1, U: 1 } },
  colorIdentity: ["B", "R", "U"],
  power: 2,
  toughness: 3,
  keywords: ["Menace", "Deathtouch"],
  tier: "vanilla",
};

export const KEEPERS_OF_THE_FAITH: CardDefinition = {
  id: "keepers-of-the-faith",
  name: "Keepers of the Faith",
  scryfallId: "a3d1ad50-c60c-46a9-b2dc-5cd2680d7263",
  types: ["Creature"],
  subtypes: ["Human", "Cleric"],
  manaCost: { generic: 1, colors: { W: 2 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 3,
  tier: "vanilla",
};

export const KHALNI_GARDEN: CardDefinition = {
  id: "khalni-garden",
  name: "Khalni Garden",
  scryfallId: "3e0f6ae6-b303-405a-8efa-91de9692768e",
  types: ["Land"],
  colorIdentity: ["G"],
  entersTapped: true,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-g-01-plant" } }],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "scripted",
};

export const KILLER_BEES: CardDefinition = {
  id: "killer-bees",
  name: "Killer Bees",
  scryfallId: "096c7da0-a341-4044-9033-95e7bf2d605a",
  types: ["Creature"],
  subtypes: ["Insect"],
  manaCost: { generic: 1, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 0,
  toughness: 1,
  keywords: ["Flying"],
  activatedAbilities: [{ cost: { mana: { generic: 0, colors: { G: 1 } } }, effect: { kind: "pump", power: 1, toughness: 1 } }],
  tier: "scripted",
};

export const KINDLY_CUSTOMER: CardDefinition = {
  id: "kindly-customer",
  name: "Kindly Customer",
  scryfallId: "84332812-367a-4ac4-9be5-2adc57562c9d",
  types: ["Creature"],
  subtypes: ["Human", "Citizen"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 1,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "draw", amount: 1 } }],
  tier: "scripted",
};

export const KINGFISHER: CardDefinition = {
  id: "kingfisher",
  name: "Kingfisher",
  scryfallId: "442bc3ba-00b3-4616-a5b2-55524ff8a736",
  types: ["Creature"],
  subtypes: ["Bird"],
  manaCost: { generic: 3, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 2,
  toughness: 2,
  keywords: ["Flying"],
  triggeredAbilities: [{ event: "dies", effect: { kind: "draw", amount: 1 } }],
  tier: "scripted",
};

export const KITHKIN_BILLYRIDER: CardDefinition = {
  id: "kithkin-billyrider",
  name: "Kithkin Billyrider",
  scryfallId: "0535b69f-247d-49c9-97e1-d988700578ab",
  types: ["Creature"],
  subtypes: ["Kithkin", "Knight"],
  manaCost: { generic: 2, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 3,
  keywords: ["Double Strike"],
  tier: "vanilla",
};

export const KNIGHT_OF_THE_NEW_COALITION: CardDefinition = {
  id: "knight-of-the-new-coalition",
  name: "Knight of the New Coalition",
  scryfallId: "56a3108b-c33d-47c5-984b-01fa257fbd79",
  types: ["Creature"],
  subtypes: ["Human", "Knight"],
  manaCost: { generic: 3, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 2,
  keywords: ["Vigilance"],
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-wu-22-knight-vigilance" } }],
  tier: "scripted",
};

export const KNIGHT_OF_THE_TUSK: CardDefinition = {
  id: "knight-of-the-tusk",
  name: "Knight of the Tusk",
  scryfallId: "2f81d2a0-5301-4cae-ac83-ad51647146e3",
  types: ["Creature"],
  subtypes: ["Human", "Knight"],
  manaCost: { generic: 4, colors: { W: 2 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 7,
  keywords: ["Vigilance"],
  tier: "vanilla",
};

export const KOALA_SHEEP: CardDefinition = {
  id: "koala-sheep",
  name: "Koala-Sheep",
  scryfallId: "7785ddfe-f8ae-473a-8064-549884c5aabc",
  types: ["Creature"],
  subtypes: ["Bear", "Sheep"],
  manaCost: { generic: 2, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 2,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 3 } }],
  tier: "scripted",
};

export const KOZILEK_S_CHANNELER: CardDefinition = {
  id: "kozileks-channeler",
  name: "Kozilek's Channeler",
  scryfallId: "c550d179-32ec-4ad8-91c2-d79320a21cba",
  types: ["Creature"],
  subtypes: ["Eldrazi"],
  manaCost: { generic: 5, colors: {} },
  colorIdentity: [],
  power: 4,
  toughness: 4,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 2 } }],
  tier: "scripted",
};

export const KRANIOCEROS: CardDefinition = {
  id: "kranioceros",
  name: "Kranioceros",
  scryfallId: "52aece74-cc1f-4f32-ad1f-00733eb79007",
  types: ["Creature"],
  subtypes: ["Beast"],
  manaCost: { generic: 4, colors: { R: 1 } },
  colorIdentity: ["R", "W"],
  power: 5,
  toughness: 2,
  activatedAbilities: [{ cost: { mana: { generic: 1, colors: { W: 1 } } }, effect: { kind: "pump", power: 0, toughness: 3 } }],
  tier: "scripted",
};

export const KYOSHI_WARRIORS: CardDefinition = {
  id: "kyoshi-warriors",
  name: "Kyoshi Warriors",
  scryfallId: "211045e1-85c7-4088-b830-a2afa0fe520b",
  types: ["Creature"],
  subtypes: ["Human", "Warrior", "Ally"],
  manaCost: { generic: 3, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 3,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-w-11-ally" } }],
  tier: "scripted",
};

export const LADY_ORCA: CardDefinition = {
  id: "lady-orca",
  name: "Lady Orca",
  scryfallId: "db766e38-5407-431c-bcf4-f33791a7e5f9",
  types: ["Creature"],
  subtypes: ["Demon"],
  supertypes: ["Legendary"],
  manaCost: { generic: 5, colors: { B: 1, R: 1 } },
  colorIdentity: ["B", "R"],
  power: 7,
  toughness: 4,
  canBeCommander: true,
  tier: "vanilla",
};

export const LAND_LEECHES: CardDefinition = {
  id: "land-leeches",
  name: "Land Leeches",
  scryfallId: "71f1d97c-5bfa-4791-9004-5f2464908c30",
  types: ["Creature"],
  subtypes: ["Leech"],
  manaCost: { generic: 1, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 2,
  toughness: 2,
  keywords: ["First Strike"],
  tier: "vanilla",
};

export const LARGE_BEAR: CardDefinition = {
  id: "large-bear",
  name: "Large Bear",
  scryfallId: "50202288-f433-4b56-8f60-349bda7b4f6b",
  types: ["Creature"],
  subtypes: ["Bear"],
  manaCost: { generic: 3, colors: {}, hybrid: [["B", "G"], ["B", "G"]] },
  colorIdentity: ["B", "G"],
  power: 5,
  toughness: 5,
  keywords: ["Reach", "Trample", "Haste"],
  tier: "vanilla",
};

export const LEADEN_MYR: CardDefinition = {
  id: "leaden-myr",
  name: "Leaden Myr",
  scryfallId: "3a709559-fec3-44f4-a2bf-3396989b9189",
  types: ["Artifact", "Creature"],
  subtypes: ["Myr"],
  manaCost: { generic: 2, colors: {} },
  colorIdentity: ["B"],
  power: 1,
  toughness: 1,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }],
  tier: "scripted",
};

export const LEAF_GILDER: CardDefinition = {
  id: "leaf-gilder",
  name: "Leaf Gilder",
  scryfallId: "58b3bd44-3b01-4507-b9be-ab94601ea736",
  types: ["Creature"],
  subtypes: ["Elf", "Druid"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 2,
  toughness: 1,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "scripted",
};

export const LEYLINE_PROWLER: CardDefinition = {
  id: "leyline-prowler",
  name: "Leyline Prowler",
  scryfallId: "c5d9286d-449b-4959-98ae-bd6a35be221d",
  types: ["Creature"],
  subtypes: ["Nightmare", "Beast"],
  manaCost: { generic: 1, colors: { B: 1, G: 1 } },
  colorIdentity: ["B", "G"],
  power: 2,
  toughness: 3,
  keywords: ["Deathtouch", "Lifelink"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "scripted",
};

export const LIBRARY_LARCENIST: CardDefinition = {
  id: "library-larcenist",
  name: "Library Larcenist",
  scryfallId: "cb33529b-80bd-4f52-94cc-d8371c53ad75",
  types: ["Creature"],
  subtypes: ["Merfolk", "Rogue"],
  manaCost: { generic: 2, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 1,
  toughness: 2,
  triggeredAbilities: [{ event: "attacks", effect: { kind: "draw", amount: 1 } }],
  tier: "scripted",
};

export const LIFESPRING_DRUID: CardDefinition = {
  id: "lifespring-druid",
  name: "Lifespring Druid",
  scryfallId: "a3657719-7d4d-46db-a5f4-699ee2032ebe",
  types: ["Creature"],
  subtypes: ["Elf", "Druid"],
  manaCost: { generic: 2, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 2,
  toughness: 1,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "scripted",
};

export const LIGHTNING_ANGEL: CardDefinition = {
  id: "lightning-angel",
  name: "Lightning Angel",
  scryfallId: "384cf91c-6cea-4279-b66d-d81b5791d411",
  types: ["Creature"],
  subtypes: ["Angel"],
  manaCost: { generic: 1, colors: { R: 1, U: 1, W: 1 } },
  colorIdentity: ["R", "U", "W"],
  power: 3,
  toughness: 4,
  keywords: ["Flying", "Vigilance", "Haste"],
  tier: "vanilla",
};

export const LIGHTNING_STORMKIN: CardDefinition = {
  id: "lightning-stormkin",
  name: "Lightning Stormkin",
  scryfallId: "43c6db4e-cc37-4473-b0f5-48d8a0b82f33",
  types: ["Creature"],
  subtypes: ["Elemental", "Wizard"],
  manaCost: { generic: 0, colors: { R: 1, U: 1 } },
  colorIdentity: ["R", "U"],
  power: 2,
  toughness: 2,
  keywords: ["Flying", "Haste"],
  tier: "vanilla",
};

export const LLANOWAR_DEAD: CardDefinition = {
  id: "llanowar-dead",
  name: "Llanowar Dead",
  scryfallId: "f271969e-1529-42d1-878b-011f80ab0f05",
  types: ["Creature"],
  subtypes: ["Zombie", "Elf"],
  manaCost: { generic: 0, colors: { B: 1, G: 1 } },
  colorIdentity: ["B", "G"],
  power: 2,
  toughness: 2,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }],
  tier: "scripted",
};

export const LLANOWAR_TRIBE: CardDefinition = {
  id: "llanowar-tribe",
  name: "Llanowar Tribe",
  scryfallId: "407c1b95-dc0c-4154-a441-fe25537df45c",
  types: ["Creature"],
  subtypes: ["Elf", "Druid"],
  manaCost: { generic: 0, colors: { G: 3 } },
  colorIdentity: ["G"],
  power: 3,
  toughness: 3,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 3 } }],
  tier: "scripted",
};

export const LLANOWAR_VISIONARY: CardDefinition = {
  id: "llanowar-visionary",
  name: "Llanowar Visionary",
  scryfallId: "d6e23afa-7e08-4049-baf0-d4d0134ba2c8",
  types: ["Creature"],
  subtypes: ["Elf", "Druid"],
  manaCost: { generic: 2, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 2,
  toughness: 2,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "draw", amount: 1 } }],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "scripted",
};

export const LOAMDRAGGER_GIANT: CardDefinition = {
  id: "loamdragger-giant",
  name: "Loamdragger Giant",
  scryfallId: "0a27bbe4-5341-4b2b-9ae8-eb56585a9c3a",
  types: ["Creature"],
  subtypes: ["Giant", "Warrior"],
  manaCost: { generic: 4, colors: {}, hybrid: [["R", "G"], ["R", "G"], ["R", "G"]] },
  colorIdentity: ["G", "R"],
  power: 7,
  toughness: 6,
  tier: "vanilla",
};

export const LOCH_KORRIGAN: CardDefinition = {
  id: "loch-korrigan",
  name: "Loch Korrigan",
  scryfallId: "2964b501-5b7f-4225-9dd3-e7519bf34048",
  types: ["Creature"],
  subtypes: ["Spirit"],
  manaCost: { generic: 3, colors: { B: 1 } },
  colorIdentity: ["B", "U"],
  power: 1,
  toughness: 1,
  activatedAbilities: [{ cost: { mana: { generic: 0, colors: {}, hybrid: [["U", "B"]] } }, effect: { kind: "pump", power: 1, toughness: 1 } }],
  tier: "scripted",
};

export const LONE_MISSIONARY: CardDefinition = {
  id: "lone-missionary",
  name: "Lone Missionary",
  scryfallId: "6d31d5b6-0973-43d2-aae0-a3f3e7a61800",
  types: ["Creature"],
  subtypes: ["Kor", "Monk"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 1,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 4 } }],
  tier: "scripted",
};

export const LONGBOW_ARCHER: CardDefinition = {
  id: "longbow-archer",
  name: "Longbow Archer",
  scryfallId: "8ac3672e-ebab-4bb1-bf4d-5020047296d8",
  types: ["Creature"],
  subtypes: ["Human", "Soldier", "Archer"],
  manaCost: { generic: 0, colors: { W: 2 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 2,
  keywords: ["Reach", "First Strike"],
  tier: "vanilla",
};

export const LOOMING_ALTISAUR: CardDefinition = {
  id: "looming-altisaur",
  name: "Looming Altisaur",
  scryfallId: "cfcff1c6-0db6-4ff6-b4af-d7048b426368",
  types: ["Creature"],
  subtypes: ["Dinosaur"],
  manaCost: { generic: 3, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 7,
  tier: "vanilla",
};

export const LOS_DIABLOS_MISSILE_BASE: CardDefinition = {
  id: "los-diablos-missile-base",
  name: "Los Diablos Missile Base",
  scryfallId: "2123fcb5-8181-47ab-9a2d-7ede5b5118e8",
  types: ["Land"],
  colorIdentity: ["G", "R"],
  entersTapped: true,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 1 } }],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "scripted",
};

export const LOTUS_GUARDIAN: CardDefinition = {
  id: "lotus-guardian",
  name: "Lotus Guardian",
  scryfallId: "ddfc6396-5377-4ab3-9c10-8abcdeae2aa1",
  types: ["Artifact", "Creature"],
  subtypes: ["Dragon"],
  manaCost: { generic: 7, colors: {} },
  colorIdentity: [],
  power: 4,
  toughness: 4,
  keywords: ["Flying"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "scripted",
};

export const LOWLAND_GIANT: CardDefinition = {
  id: "lowland-giant",
  name: "Lowland Giant",
  scryfallId: "6d8ce76f-8ced-4ee9-a450-1bcc27d36e7d",
  types: ["Creature"],
  subtypes: ["Giant"],
  manaCost: { generic: 2, colors: { R: 2 } },
  colorIdentity: ["R"],
  power: 4,
  toughness: 3,
  tier: "vanilla",
};

export const LOXODON_LINE_BREAKER: CardDefinition = {
  id: "loxodon-line-breaker",
  name: "Loxodon Line Breaker",
  scryfallId: "928d4250-c379-4134-a263-7811c80a8760",
  types: ["Creature"],
  subtypes: ["Elephant", "Soldier"],
  manaCost: { generic: 2, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 2,
  tier: "vanilla",
};

export const LOXODON_STALWART: CardDefinition = {
  id: "loxodon-stalwart",
  name: "Loxodon Stalwart",
  scryfallId: "0e58f4fb-5b4e-45bc-99b3-d09cd79132df",
  types: ["Creature"],
  subtypes: ["Elephant", "Soldier"],
  manaCost: { generic: 3, colors: { W: 2 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 3,
  keywords: ["Vigilance"],
  activatedAbilities: [{ cost: { mana: { generic: 0, colors: { W: 1 } } }, effect: { kind: "pump", power: 0, toughness: 1 } }],
  tier: "scripted",
};

export const LUMENGRID_GARGOYLE: CardDefinition = {
  id: "lumengrid-gargoyle",
  name: "Lumengrid Gargoyle",
  scryfallId: "c200239c-d28e-4c55-a7bc-64a1d138cc2f",
  types: ["Artifact", "Creature"],
  subtypes: ["Gargoyle"],
  manaCost: { generic: 6, colors: {} },
  colorIdentity: [],
  power: 4,
  toughness: 4,
  keywords: ["Flying"],
  tier: "vanilla",
};

export const LUMINOUS_ANGEL: CardDefinition = {
  id: "luminous-angel",
  name: "Luminous Angel",
  scryfallId: "c3ac419f-7630-48c7-9039-88ce28898b6d",
  types: ["Creature"],
  subtypes: ["Angel"],
  manaCost: { generic: 4, colors: { W: 3 } },
  colorIdentity: ["W"],
  power: 4,
  toughness: 4,
  keywords: ["Flying"],
  triggeredAbilities: [{ event: "upkeep", watches: "controller", optional: true, effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-w-11-spirit-flying" } }],
  tier: "scripted",
};

export const LUXURY_SUITE: CardDefinition = {
  id: "luxury-suite",
  name: "Luxury Suite",
  scryfallId: "3c409d1e-f634-44a2-8fcf-dcdcb0babc3f",
  types: ["Land"],
  colorIdentity: ["B", "R"],
  entersTapped: true,
  entersTappedUnless: { kind: "opponents", count: 2 },
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }],
  tier: "vanilla",
};

export const MAALFELD_TWINS: CardDefinition = {
  id: "maalfeld-twins",
  name: "Maalfeld Twins",
  scryfallId: "c166df8f-9508-427a-8ec7-bc8541b6ed88",
  types: ["Creature"],
  subtypes: ["Zombie"],
  manaCost: { generic: 5, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 4,
  toughness: 4,
  triggeredAbilities: [{ event: "dies", effect: { kind: "createToken", count: 2, tokenDefinitionId: "token-b-22-zombie" } }],
  tier: "scripted",
};

export const MAESTROS_THEATER: CardDefinition = {
  id: "maestros-theater",
  name: "Maestros Theater",
  scryfallId: "d4087ba6-8227-4ec3-a989-0833ad6c8788",
  types: ["Land"],
  colorIdentity: [],
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "sequence", effects: [{ kind: "sacrifice", what: "self" }, { kind: "searchLibrary", cardType: "Land", basicLandOnly: true, subtypes: ["Island", "Swamp", "Mountain"], destination: "battlefield", tapped: true }, { kind: "gainLife", amount: 1 }] } }],
  tier: "scripted",
};

export const MAGNIGOTH_SENTRY: CardDefinition = {
  id: "magnigoth-sentry",
  name: "Magnigoth Sentry",
  scryfallId: "5624e610-c4c0-4103-a32b-0f1264030a7a",
  types: ["Creature"],
  subtypes: ["Treefolk"],
  manaCost: { generic: 3, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 4,
  toughness: 4,
  keywords: ["Reach"],
  tier: "vanilla",
};

export const MAKINDI_GRIFFIN: CardDefinition = {
  id: "makindi-griffin",
  name: "Makindi Griffin",
  scryfallId: "05c4a9c4-20d5-457d-9127-c27b8768255a",
  types: ["Creature"],
  subtypes: ["Griffin"],
  manaCost: { generic: 3, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 4,
  keywords: ["Flying"],
  tier: "vanilla",
};

export const MALCATOR_S_WATCHER: CardDefinition = {
  id: "malcators-watcher",
  name: "Malcator's Watcher",
  scryfallId: "95a7e5ff-ba81-4b45-933e-0ac747525ab8",
  types: ["Artifact", "Creature"],
  subtypes: ["Phyrexian", "Drone"],
  manaCost: { generic: 1, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 1,
  toughness: 1,
  keywords: ["Flying", "Vigilance"],
  triggeredAbilities: [{ event: "dies", effect: { kind: "draw", amount: 1 } }],
  tier: "scripted",
};

export const MANAKIN: CardDefinition = {
  id: "manakin",
  name: "Manakin",
  scryfallId: "9f91e78e-9297-4ae3-b55f-d73e79d0d21a",
  types: ["Artifact", "Creature"],
  subtypes: ["Construct"],
  manaCost: { generic: 2, colors: {} },
  colorIdentity: [],
  power: 1,
  toughness: 1,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 1 } }],
  tier: "scripted",
};

export const MANALITH: CardDefinition = {
  id: "manalith",
  name: "Manalith",
  scryfallId: "f0d7d904-f29b-4524-9223-27910d748bdb",
  types: ["Artifact"],
  manaCost: { generic: 3, colors: {} },
  colorIdentity: [],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "vanilla",
};

export const MANDROID_SQUADRON: CardDefinition = {
  id: "mandroid-squadron",
  name: "Mandroid Squadron",
  scryfallId: "e8f79cb4-81f1-465a-a71b-d69a0185a304",
  types: ["Artifact", "Creature"],
  subtypes: ["Human", "Soldier"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 0,
  toughness: 4,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 2 } }],
  tier: "scripted",
};

export const MANTIS_RIDER: CardDefinition = {
  id: "mantis-rider",
  name: "Mantis Rider",
  scryfallId: "82d5ce46-7118-4ede-ba1d-c387e7ce16e7",
  types: ["Creature"],
  subtypes: ["Human", "Monk"],
  manaCost: { generic: 0, colors: { R: 1, U: 1, W: 1 } },
  colorIdentity: ["R", "U", "W"],
  power: 3,
  toughness: 3,
  keywords: ["Flying", "Vigilance", "Haste"],
  tier: "vanilla",
};

export const MARALEAF_PIXIE: CardDefinition = {
  id: "maraleaf-pixie",
  name: "Maraleaf Pixie",
  scryfallId: "e6d7f9c9-dd83-4684-a949-1c22f316138a",
  types: ["Creature"],
  subtypes: ["Faerie"],
  manaCost: { generic: 0, colors: { G: 1, U: 1 } },
  colorIdentity: ["G", "U"],
  power: 2,
  toughness: 2,
  keywords: ["Flying"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }],
  tier: "scripted",
};

export const MARBLE_DIAMOND: CardDefinition = {
  id: "marble-diamond",
  name: "Marble Diamond",
  scryfallId: "0930f71c-c3c8-4bdd-8468-6a61349cc8ca",
  types: ["Artifact"],
  manaCost: { generic: 2, colors: {} },
  colorIdentity: ["W"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }],
  tier: "vanilla",
};

export const MARBLE_GARGOYLE: CardDefinition = {
  id: "marble-gargoyle",
  name: "Marble Gargoyle",
  scryfallId: "0c62efb9-11f2-4f82-af08-4587d58d6e3d",
  types: ["Artifact", "Creature"],
  subtypes: ["Gargoyle"],
  manaCost: { generic: 2, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 2,
  keywords: ["Flying"],
  activatedAbilities: [{ cost: { mana: { generic: 0, colors: { W: 1 } } }, effect: { kind: "pump", power: 0, toughness: 1 } }],
  tier: "scripted",
};

export const MARISI_S_TWINCLAWS: CardDefinition = {
  id: "marisis-twinclaws",
  name: "Marisi's Twinclaws",
  scryfallId: "d406058e-4d51-42bd-b7c0-664216745ff8",
  types: ["Creature"],
  subtypes: ["Cat", "Warrior"],
  manaCost: { generic: 2, colors: { G: 1 }, hybrid: [["R", "W"]] },
  colorIdentity: ["G", "R", "W"],
  power: 2,
  toughness: 4,
  keywords: ["Double Strike"],
  tier: "vanilla",
};

export const MARTYR_OF_DUSK: CardDefinition = {
  id: "martyr-of-dusk",
  name: "Martyr of Dusk",
  scryfallId: "d32e68b4-2584-4b1c-9268-642e3678bae7",
  types: ["Creature"],
  subtypes: ["Vampire", "Soldier"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 1,
  triggeredAbilities: [{ event: "dies", effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-w-11-vampire-lifelink" } }],
  tier: "scripted",
};

export const MAUSOLEUM_GUARD: CardDefinition = {
  id: "mausoleum-guard",
  name: "Mausoleum Guard",
  scryfallId: "849bea7e-74e5-4310-be5a-d517d7b19be6",
  types: ["Creature"],
  subtypes: ["Human", "Scout"],
  manaCost: { generic: 3, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 2,
  triggeredAbilities: [{ event: "dies", effect: { kind: "createToken", count: 2, tokenDefinitionId: "token-w-11-spirit-flying" } }],
  tier: "scripted",
};

export const MEANDERING_RIVER: CardDefinition = {
  id: "meandering-river",
  name: "Meandering River",
  scryfallId: "e283db9e-6a51-4b28-9f6c-0c040a9d6d8c",
  types: ["Land"],
  colorIdentity: ["U", "W"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }],
  tier: "vanilla",
};

export const MEMNITE: CardDefinition = {
  id: "memnite",
  name: "Memnite",
  scryfallId: "975459ba-e1c2-4800-a3fa-5c0cf8ce728f",
  types: ["Artifact", "Creature"],
  subtypes: ["Construct"],
  manaCost: { generic: 0, colors: {} },
  colorIdentity: [],
  power: 1,
  toughness: 1,
  tier: "vanilla",
};

export const MENG_HUO_S_HORDE: CardDefinition = {
  id: "meng-huos-horde",
  name: "Meng Huo's Horde",
  scryfallId: "9a9b3f7a-1ae9-443b-8433-ac96cdaeaed8",
  types: ["Creature"],
  subtypes: ["Human", "Soldier"],
  manaCost: { generic: 4, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 4,
  toughness: 5,
  tier: "vanilla",
};

export const MESA_FALCON: CardDefinition = {
  id: "mesa-falcon",
  name: "Mesa Falcon",
  scryfallId: "a7ce1b8e-13ba-4eed-a445-435300f3101e",
  types: ["Creature"],
  subtypes: ["Bird"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 1,
  keywords: ["Flying"],
  activatedAbilities: [{ cost: { mana: { generic: 1, colors: { W: 1 } } }, effect: { kind: "pump", power: 0, toughness: 1 } }],
  tier: "scripted",
};

export const MESSENGER_DRAKE: CardDefinition = {
  id: "messenger-drake",
  name: "Messenger Drake",
  scryfallId: "13dd3172-0b45-4dc8-adc6-9e0ba112e664",
  types: ["Creature"],
  subtypes: ["Drake"],
  manaCost: { generic: 3, colors: { U: 2 } },
  colorIdentity: ["U"],
  power: 3,
  toughness: 3,
  keywords: ["Flying"],
  triggeredAbilities: [{ event: "dies", effect: { kind: "draw", amount: 1 } }],
  tier: "scripted",
};

export const MESSENGER_FALCONS: CardDefinition = {
  id: "messenger-falcons",
  name: "Messenger Falcons",
  scryfallId: "f088f625-9c72-4949-8e53-c2313397a197",
  types: ["Creature"],
  subtypes: ["Bird"],
  manaCost: { generic: 2, colors: { W: 1 }, hybrid: [["G", "U"]] },
  colorIdentity: ["G", "U", "W"],
  power: 2,
  toughness: 2,
  keywords: ["Flying"],
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "draw", amount: 1 } }],
  tier: "scripted",
};

export const METALLIC_SLIVER: CardDefinition = {
  id: "metallic-sliver",
  name: "Metallic Sliver",
  scryfallId: "0f302984-9bf6-4583-865a-5545711e7a27",
  types: ["Artifact", "Creature"],
  subtypes: ["Sliver"],
  manaCost: { generic: 1, colors: {} },
  colorIdentity: [],
  power: 1,
  toughness: 1,
  tier: "vanilla",
};

export const MILLENNIAL_GARGOYLE: CardDefinition = {
  id: "millennial-gargoyle",
  name: "Millennial Gargoyle",
  scryfallId: "068e7803-7c9f-43d7-b6dc-8e1390d902d0",
  types: ["Artifact", "Creature"],
  subtypes: ["Gargoyle"],
  manaCost: { generic: 4, colors: {} },
  colorIdentity: [],
  power: 2,
  toughness: 2,
  keywords: ["Flying"],
  tier: "vanilla",
};

export const MINWU_WHITE_MAGE: CardDefinition = {
  id: "minwu-white-mage",
  name: "Minwu, White Mage",
  scryfallId: "6822144f-f0eb-4e10-a217-52cad36d2973",
  types: ["Creature"],
  subtypes: ["Human", "Cleric"],
  supertypes: ["Legendary"],
  manaCost: { generic: 3, colors: { W: 2 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 3,
  keywords: ["Vigilance", "Lifelink"],
  triggeredAbilities: [{ event: "gain-life", effect: { kind: "addCounterToEachOther", amount: 1, subtypes: ["Cleric"], includesSelf: true } }],
  canBeCommander: true,
  tier: "scripted",
};

export const MISTY_RAINFOREST: CardDefinition = {
  id: "misty-rainforest",
  name: "Misty Rainforest",
  scryfallId: "88231c0d-0cc8-44ec-bf95-81d1710ac141",
  types: ["Land"],
  colorIdentity: [],
  activatedAbilities: [{ cost: { tap: true, payLife: 1, sacrificeSelf: true }, effect: { kind: "searchLibrary", cardType: "Land", subtypes: ["Forest", "Island"], destination: "battlefield" } }],
  tier: "vanilla",
};

export const MOLDERING_KAROK: CardDefinition = {
  id: "moldering-karok",
  name: "Moldering Karok",
  scryfallId: "70c2ef30-0db5-4ef5-999c-7ffa48769421",
  types: ["Creature"],
  subtypes: ["Zombie", "Crocodile"],
  manaCost: { generic: 2, colors: { B: 1, G: 1 } },
  colorIdentity: ["B", "G"],
  power: 3,
  toughness: 3,
  keywords: ["Trample", "Lifelink"],
  tier: "vanilla",
};

export const MOLTEN_RAVAGER: CardDefinition = {
  id: "molten-ravager",
  name: "Molten Ravager",
  scryfallId: "a5664b7d-b553-4e0a-93ec-3d70e8e4f63b",
  types: ["Creature"],
  subtypes: ["Elemental"],
  manaCost: { generic: 2, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 0,
  toughness: 4,
  activatedAbilities: [{ cost: { mana: { generic: 0, colors: { R: 1 } } }, effect: { kind: "pump", power: 1, toughness: 0 } }],
  tier: "scripted",
};

export const MOLTEN_TRIBUTARY: CardDefinition = {
  id: "molten-tributary",
  name: "Molten Tributary",
  scryfallId: "9c6d0f64-b8e1-41bc-ab86-bd6783daf72a",
  types: ["Land"],
  subtypes: ["Island", "Mountain"],
  colorIdentity: ["R", "U"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }],
  tier: "vanilla",
};

export const MOONRISE_CLERIC: CardDefinition = {
  id: "moonrise-cleric",
  name: "Moonrise Cleric",
  scryfallId: "35f2a71f-31e8-4b51-9dd4-51a5336b3b86",
  types: ["Creature"],
  subtypes: ["Bat", "Cleric"],
  manaCost: { generic: 1, colors: {}, hybrid: [["W", "B"], ["W", "B"]] },
  colorIdentity: ["B", "W"],
  power: 2,
  toughness: 3,
  keywords: ["Flying"],
  triggeredAbilities: [{ event: "attacks", effect: { kind: "gainLife", amount: 1 } }],
  tier: "scripted",
};

export const MOONWING_MOTH: CardDefinition = {
  id: "moonwing-moth",
  name: "Moonwing Moth",
  scryfallId: "f646ed53-c323-4f84-b8c9-39e31da1aca8",
  types: ["Creature"],
  subtypes: ["Insect"],
  manaCost: { generic: 1, colors: { W: 2 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 1,
  keywords: ["Flying"],
  activatedAbilities: [{ cost: { mana: { generic: 0, colors: { W: 1 } } }, effect: { kind: "pump", power: 0, toughness: 1 } }],
  tier: "scripted",
};

export const MORPHIC_POOL: CardDefinition = {
  id: "morphic-pool",
  name: "Morphic Pool",
  scryfallId: "48e40927-dd87-42ed-b805-0ae8ba81f5fb",
  types: ["Land"],
  colorIdentity: ["B", "U"],
  entersTapped: true,
  entersTappedUnless: { kind: "opponents", count: 2 },
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }],
  tier: "vanilla",
};

export const MOSS_KAMI: CardDefinition = {
  id: "moss-kami",
  name: "Moss Kami",
  scryfallId: "a437cde4-c40b-40a3-bc19-e461c98186dc",
  types: ["Creature"],
  subtypes: ["Spirit"],
  manaCost: { generic: 5, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 5,
  toughness: 5,
  keywords: ["Trample"],
  tier: "vanilla",
};

export const MOSSBEARD_ANCIENT: CardDefinition = {
  id: "mossbeard-ancient",
  name: "Mossbeard Ancient",
  scryfallId: "7e528d36-cea6-4013-83d5-ba837d570713",
  types: ["Creature"],
  subtypes: ["Treefolk"],
  manaCost: { generic: 5, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 7,
  toughness: 7,
  keywords: ["Trample"],
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 5 } }],
  tier: "scripted",
};

export const MOX_JASPER: CardDefinition = {
  id: "mox-jasper",
  name: "Mox Jasper",
  scryfallId: "a851d2d3-7e93-4887-bee5-4d6c9aaf9419",
  types: ["Artifact"],
  supertypes: ["Legendary"],
  manaCost: { generic: 0, colors: {} },
  colorIdentity: [],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 }, activateOnlyIf: { kind: "controls-subtype", subtypes: ["Dragon"] } }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 }, activateOnlyIf: { kind: "controls-subtype", subtypes: ["Dragon"] } }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 }, activateOnlyIf: { kind: "controls-subtype", subtypes: ["Dragon"] } }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 }, activateOnlyIf: { kind: "controls-subtype", subtypes: ["Dragon"] } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 }, activateOnlyIf: { kind: "controls-subtype", subtypes: ["Dragon"] } }],
  tier: "vanilla",
};

export const MUTANT_TOWN: CardDefinition = {
  id: "mutant-town",
  name: "Mutant Town",
  scryfallId: "c6eac43d-08b6-45a4-803b-10a321a241d7",
  types: ["Land"],
  colorIdentity: ["G", "U"],
  entersTapped: true,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 1 } }],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }],
  tier: "scripted",
};

export const MYSTIC_GATE: CardDefinition = {
  id: "mystic-gate",
  name: "Mystic Gate",
  scryfallId: "6f99714f-43bc-4048-b650-97dfef4c10fe",
  types: ["Land"],
  colorIdentity: ["U", "W"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 1 } }, { cost: { tap: true, mana: { generic: 0, colors: {}, hybrid: [["W", "U"]] } }, effect: { kind: "addManaCombination", mana: [{ color: "W", amount: 2 }] } }, { cost: { tap: true, mana: { generic: 0, colors: {}, hybrid: [["W", "U"]] } }, effect: { kind: "addManaCombination", mana: [{ color: "W", amount: 1 }, { color: "U", amount: 1 }] } }, { cost: { tap: true, mana: { generic: 0, colors: {}, hybrid: [["W", "U"]] } }, effect: { kind: "addManaCombination", mana: [{ color: "U", amount: 2 }] } }],
  tier: "vanilla",
};

export const MYSTIC_MONASTERY: CardDefinition = {
  id: "mystic-monastery",
  name: "Mystic Monastery",
  scryfallId: "bc23343a-3a01-4975-8430-17bf15fa639d",
  types: ["Land"],
  colorIdentity: ["R", "U", "W"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }],
  tier: "vanilla",
};

export const NARSTAD_SCRAPPER: CardDefinition = {
  id: "narstad-scrapper",
  name: "Narstad Scrapper",
  scryfallId: "f808ed9b-95ac-4069-bdca-b100bc816b5b",
  types: ["Artifact", "Creature"],
  subtypes: ["Construct"],
  manaCost: { generic: 5, colors: {} },
  colorIdentity: [],
  power: 3,
  toughness: 3,
  activatedAbilities: [{ cost: { mana: { generic: 2, colors: {} } }, effect: { kind: "pump", power: 1, toughness: 0 } }],
  tier: "scripted",
};

export const NEEDLETHORN_DRAKE: CardDefinition = {
  id: "needlethorn-drake",
  name: "Needlethorn Drake",
  scryfallId: "9c0cf2c4-723e-46c4-b2aa-4c957177209a",
  types: ["Creature"],
  subtypes: ["Drake"],
  manaCost: { generic: 0, colors: { G: 1, U: 1 } },
  colorIdentity: ["G", "U"],
  power: 1,
  toughness: 1,
  keywords: ["Flying", "Deathtouch"],
  tier: "vanilla",
};

export const NEMA_SILTLURKER: CardDefinition = {
  id: "nema-siltlurker",
  name: "Nema Siltlurker",
  scryfallId: "a477e081-949f-4cf0-b0d2-b9bdff6c760d",
  types: ["Creature"],
  subtypes: ["Lizard"],
  manaCost: { generic: 4, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 3,
  toughness: 5,
  tier: "vanilla",
};

export const NEWS_HELICOPTER: CardDefinition = {
  id: "news-helicopter",
  name: "News Helicopter",
  scryfallId: "15717af0-30cd-4417-947a-c27cca06d93a",
  types: ["Artifact", "Creature"],
  subtypes: ["Construct"],
  manaCost: { generic: 3, colors: {} },
  colorIdentity: [],
  power: 1,
  toughness: 1,
  keywords: ["Flying"],
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-gw-11-human-citizen" } }],
  tier: "scripted",
};

export const NIGHTSHADE_DRYAD: CardDefinition = {
  id: "nightshade-dryad",
  name: "Nightshade Dryad",
  scryfallId: "71f9252d-241f-45ea-9d80-663150963b59",
  types: ["Creature"],
  subtypes: ["Dryad"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 1,
  toughness: 2,
  keywords: ["Deathtouch"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "scripted",
};

export const NIGHTVEIL_PREDATOR: CardDefinition = {
  id: "nightveil-predator",
  name: "Nightveil Predator",
  scryfallId: "72efc1ee-3583-4814-beaa-bbee709275e6",
  types: ["Creature"],
  subtypes: ["Vampire"],
  manaCost: { generic: 0, colors: { B: 2, U: 2 } },
  colorIdentity: ["B", "U"],
  power: 3,
  toughness: 3,
  keywords: ["Flying", "Deathtouch", "Hexproof"],
  tier: "vanilla",
};

export const NIMBUS_MAZE: CardDefinition = {
  id: "nimbus-maze",
  name: "Nimbus Maze",
  scryfallId: "711dbdb1-7ec3-4fb4-8364-d34f5e143fd1",
  types: ["Land"],
  colorIdentity: ["U", "W"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 }, activateOnlyIf: { kind: "controls-subtype", subtypes: ["Island"] } }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 }, activateOnlyIf: { kind: "controls-subtype", subtypes: ["Plains"] } }],
  tier: "vanilla",
};

export const NIP_GWYLLION: CardDefinition = {
  id: "nip-gwyllion",
  name: "Nip Gwyllion",
  scryfallId: "019ad92d-8803-4569-98c8-4a7416799cfc",
  types: ["Creature"],
  subtypes: ["Hag"],
  manaCost: { generic: 0, colors: {}, hybrid: [["W", "B"]] },
  colorIdentity: ["B", "W"],
  power: 1,
  toughness: 1,
  keywords: ["Lifelink"],
  tier: "vanilla",
};

export const NOMAD_OUTPOST: CardDefinition = {
  id: "nomad-outpost",
  name: "Nomad Outpost",
  scryfallId: "a68fbeaa-941f-4d53-becd-f93ed22b9a54",
  types: ["Land"],
  colorIdentity: ["B", "R", "W"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }],
  tier: "vanilla",
};

export const NORWOOD_ARCHERS: CardDefinition = {
  id: "norwood-archers",
  name: "Norwood Archers",
  scryfallId: "4f5ed974-396a-4b93-8e15-90e180efd17e",
  types: ["Creature"],
  subtypes: ["Elf", "Archer"],
  manaCost: { generic: 3, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 3,
  toughness: 3,
  keywords: ["Reach"],
  tier: "vanilla",
};

export const NOXIOUS_NEWT: CardDefinition = {
  id: "noxious-newt",
  name: "Noxious Newt",
  scryfallId: "3a028306-c5d7-4f8f-b6f4-0d103fd47000",
  types: ["Creature"],
  subtypes: ["Salamander"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 1,
  toughness: 2,
  keywords: ["Deathtouch"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "scripted",
};

export const NYX_FLEECE_RAM: CardDefinition = {
  id: "nyx-fleece-ram",
  name: "Nyx-Fleece Ram",
  scryfallId: "771fcea9-1007-4ff6-8000-99017978ac1c",
  types: ["Creature", "Enchantment"],
  subtypes: ["Sheep"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 0,
  toughness: 5,
  triggeredAbilities: [{ event: "upkeep", watches: "controller", effect: { kind: "gainLife", amount: 1 } }],
  tier: "scripted",
};

export const NYXBORN_BRUTE: CardDefinition = {
  id: "nyxborn-brute",
  name: "Nyxborn Brute",
  scryfallId: "05bc4236-566f-401b-b9d7-f58126fa228b",
  types: ["Creature", "Enchantment"],
  subtypes: ["Cyclops"],
  manaCost: { generic: 3, colors: { R: 2 } },
  colorIdentity: ["R"],
  power: 7,
  toughness: 3,
  tier: "vanilla",
};

export const NYXBORN_COLOSSUS: CardDefinition = {
  id: "nyxborn-colossus",
  name: "Nyxborn Colossus",
  scryfallId: "8b4f003c-1e99-4e53-ad6d-81ff3c592b2c",
  types: ["Creature", "Enchantment"],
  subtypes: ["Giant"],
  manaCost: { generic: 3, colors: { G: 3 } },
  colorIdentity: ["G"],
  power: 6,
  toughness: 7,
  tier: "vanilla",
};

export const NYXBORN_COURSER: CardDefinition = {
  id: "nyxborn-courser",
  name: "Nyxborn Courser",
  scryfallId: "0fd32240-c003-4e18-adf1-e2e992c702b1",
  types: ["Creature", "Enchantment"],
  subtypes: ["Centaur", "Scout"],
  manaCost: { generic: 1, colors: { W: 2 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 4,
  tier: "vanilla",
};

export const OASIS_GARDENER: CardDefinition = {
  id: "oasis-gardener",
  name: "Oasis Gardener",
  scryfallId: "ee0dc663-4bfb-46d4-af79-d0143c799487",
  types: ["Artifact", "Creature"],
  subtypes: ["Scarecrow"],
  manaCost: { generic: 3, colors: {} },
  colorIdentity: [],
  power: 2,
  toughness: 2,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 2 } }],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "scripted",
};

export const OBELISK_OF_BANT: CardDefinition = {
  id: "obelisk-of-bant",
  name: "Obelisk of Bant",
  scryfallId: "0cefe6ab-c018-4b87-8948-295a28f63cb1",
  types: ["Artifact"],
  manaCost: { generic: 3, colors: {} },
  colorIdentity: ["G", "U", "W"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }],
  tier: "vanilla",
};

export const OBELISK_OF_ESPER: CardDefinition = {
  id: "obelisk-of-esper",
  name: "Obelisk of Esper",
  scryfallId: "70b347b1-9277-4ad0-88c8-faacace08827",
  types: ["Artifact"],
  manaCost: { generic: 3, colors: {} },
  colorIdentity: ["B", "U", "W"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }],
  tier: "vanilla",
};

export const OBELISK_OF_GRIXIS: CardDefinition = {
  id: "obelisk-of-grixis",
  name: "Obelisk of Grixis",
  scryfallId: "1bf29333-2fe4-4bd3-855b-8eef8d14c5d6",
  types: ["Artifact"],
  manaCost: { generic: 3, colors: {} },
  colorIdentity: ["B", "R", "U"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }],
  tier: "vanilla",
};

export const OBELISK_OF_JUND: CardDefinition = {
  id: "obelisk-of-jund",
  name: "Obelisk of Jund",
  scryfallId: "1fe43306-f48f-4812-8d40-1903cc6f19d2",
  types: ["Artifact"],
  manaCost: { generic: 3, colors: {} },
  colorIdentity: ["B", "G", "R"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "vanilla",
};

export const OBELISK_OF_NAYA: CardDefinition = {
  id: "obelisk-of-naya",
  name: "Obelisk of Naya",
  scryfallId: "df6317b0-15fd-4924-9302-41bed2354546",
  types: ["Artifact"],
  manaCost: { generic: 3, colors: {} },
  colorIdentity: ["G", "R", "W"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }],
  tier: "vanilla",
};

export const OBSCURA_STOREFRONT: CardDefinition = {
  id: "obscura-storefront",
  name: "Obscura Storefront",
  scryfallId: "d8eaf8d2-8029-49d9-a94b-a72dc31fc81f",
  types: ["Land"],
  colorIdentity: [],
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "sequence", effects: [{ kind: "sacrifice", what: "self" }, { kind: "searchLibrary", cardType: "Land", basicLandOnly: true, subtypes: ["Plains", "Island", "Swamp"], destination: "battlefield", tapped: true }, { kind: "gainLife", amount: 1 }] } }],
  tier: "scripted",
};

export const OBSIANUS_GOLEM: CardDefinition = {
  id: "obsianus-golem",
  name: "Obsianus Golem",
  scryfallId: "ff1b095e-49e2-412b-9ee0-6f0bbcc76a24",
  types: ["Artifact", "Creature"],
  subtypes: ["Golem"],
  manaCost: { generic: 6, colors: {} },
  colorIdentity: [],
  power: 4,
  toughness: 6,
  tier: "vanilla",
};

export const OCULUS: CardDefinition = {
  id: "oculus",
  name: "Oculus",
  scryfallId: "673bebb4-9c82-40ca-8552-b9030e961005",
  types: ["Creature"],
  subtypes: ["Phyrexian", "Homunculus"],
  manaCost: { generic: 1, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 1,
  toughness: 1,
  triggeredAbilities: [{ event: "dies", optional: true, effect: { kind: "draw", amount: 1 } }],
  tier: "scripted",
};

export const OGRE_SENTRY: CardDefinition = {
  id: "ogre-sentry",
  name: "Ogre Sentry",
  scryfallId: "bb6e7b24-9430-4ac9-bd62-1770b8749090",
  types: ["Creature"],
  subtypes: ["Ogre", "Warrior"],
  manaCost: { generic: 1, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 3,
  toughness: 3,
  keywords: ["Defender"],
  tier: "vanilla",
};

export const OLD_GHASTBARK: CardDefinition = {
  id: "old-ghastbark",
  name: "Old Ghastbark",
  scryfallId: "5b5ab941-89cc-4fdd-a916-3a54651f6478",
  types: ["Creature"],
  subtypes: ["Treefolk", "Warrior"],
  manaCost: { generic: 3, colors: {}, hybrid: [["G", "W"], ["G", "W"]] },
  colorIdentity: ["G", "W"],
  power: 3,
  toughness: 6,
  tier: "vanilla",
};

export const OMEGA_MYR: CardDefinition = {
  id: "omega-myr",
  name: "Omega Myr",
  scryfallId: "ddaa5c60-054f-4397-a110-21df58264caf",
  types: ["Artifact", "Creature"],
  subtypes: ["Myr"],
  manaCost: { generic: 2, colors: {} },
  colorIdentity: [],
  power: 1,
  toughness: 2,
  tier: "vanilla",
};

export const ONULET: CardDefinition = {
  id: "onulet",
  name: "Onulet",
  scryfallId: "5e6e91cb-1104-4feb-885b-0a49c0b4e60d",
  types: ["Artifact", "Creature"],
  subtypes: ["Construct"],
  manaCost: { generic: 3, colors: {} },
  colorIdentity: [],
  power: 2,
  toughness: 2,
  triggeredAbilities: [{ event: "dies", effect: { kind: "gainLife", amount: 2 } }],
  tier: "scripted",
};

export const OPALINE_UNICORN: CardDefinition = {
  id: "opaline-unicorn",
  name: "Opaline Unicorn",
  scryfallId: "160d39b0-76c5-4218-97e5-5903f781dafc",
  types: ["Artifact", "Creature"],
  subtypes: ["Unicorn"],
  manaCost: { generic: 3, colors: {} },
  colorIdentity: [],
  power: 1,
  toughness: 2,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "scripted",
};

export const OPEN_THE_GRAVES: CardDefinition = {
  id: "open-the-graves",
  name: "Open the Graves",
  scryfallId: "130978d1-0b20-4dfa-85f5-3ff2bc2cfda3",
  types: ["Enchantment"],
  manaCost: { generic: 3, colors: { B: 2 } },
  colorIdentity: ["B"],
  triggeredAbilities: [{ event: "permanent-dies", watches: "controller", includesSelf: true, watchFor: { type: "Creature", nontoken: true }, effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-b-22-zombie" } }],
  tier: "scripted",
};

export const OPULENT_PALACE: CardDefinition = {
  id: "opulent-palace",
  name: "Opulent Palace",
  scryfallId: "f0001153-dbcb-44e5-99be-2c186c9b10b0",
  types: ["Land"],
  colorIdentity: ["B", "G", "U"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }],
  tier: "vanilla",
};

export const ORAZCA_FRILLBACK: CardDefinition = {
  id: "orazca-frillback",
  name: "Orazca Frillback",
  scryfallId: "20471a3b-90f9-4463-9b43-fc7b9b28f5d1",
  types: ["Creature"],
  subtypes: ["Dinosaur"],
  manaCost: { generic: 2, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 4,
  toughness: 2,
  tier: "vanilla",
};

export const ORDINARY_BEAR: CardDefinition = {
  id: "ordinary-bear",
  name: "Ordinary Bear",
  scryfallId: "0feb9817-56e1-465a-851c-b2fe202aa8ae",
  types: ["Creature"],
  subtypes: ["Bear"],
  manaCost: { generic: 3, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 4,
  toughness: 5,
  tier: "vanilla",
};

export const OROCHI_SUSTAINER: CardDefinition = {
  id: "orochi-sustainer",
  name: "Orochi Sustainer",
  scryfallId: "5fb40d7a-f2d3-4c9a-a1ab-6b08bd143fe5",
  types: ["Creature"],
  subtypes: ["Snake", "Shaman"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 1,
  toughness: 2,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "scripted",
};

export const ORZHOV_GUILDGATE: CardDefinition = {
  id: "orzhov-guildgate",
  name: "Orzhov Guildgate",
  scryfallId: "a917be03-0c17-4454-b044-c4375e5c8085",
  types: ["Land"],
  subtypes: ["Gate"],
  colorIdentity: ["B", "W"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }],
  tier: "vanilla",
};

export const OUTLAW_MEDIC: CardDefinition = {
  id: "outlaw-medic",
  name: "Outlaw Medic",
  scryfallId: "2feaa51e-47fb-4849-b420-ee7278f3489a",
  types: ["Creature"],
  subtypes: ["Human", "Rogue"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 3,
  keywords: ["Lifelink"],
  triggeredAbilities: [{ event: "dies", effect: { kind: "draw", amount: 1 } }],
  tier: "scripted",
};

export const OVERGROWN_FARMLAND: CardDefinition = {
  id: "overgrown-farmland",
  name: "Overgrown Farmland",
  scryfallId: "644fb0ed-f434-4cc4-b7e9-a60db5ece2b7",
  types: ["Land"],
  colorIdentity: ["G", "W"],
  entersTapped: true,
  entersTappedUnless: { kind: "controls-other-lands", count: 2 },
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }],
  tier: "vanilla",
};

export const PALACE_FAMILIAR: CardDefinition = {
  id: "palace-familiar",
  name: "Palace Familiar",
  scryfallId: "fc0c17c9-54af-4dd4-8d4a-fd5a7b8c3c77",
  types: ["Creature"],
  subtypes: ["Bird"],
  manaCost: { generic: 1, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 1,
  toughness: 1,
  keywords: ["Flying"],
  triggeredAbilities: [{ event: "dies", effect: { kind: "draw", amount: 1 } }],
  tier: "scripted",
};

export const PALADIN_OF_THE_BLOODSTAINED: CardDefinition = {
  id: "paladin-of-the-bloodstained",
  name: "Paladin of the Bloodstained",
  scryfallId: "5a0385d5-d0f4-40b8-af28-6557ffdfb625",
  types: ["Creature"],
  subtypes: ["Vampire", "Knight"],
  manaCost: { generic: 3, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 2,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-w-11-vampire-lifelink" } }],
  tier: "scripted",
};

export const PALLADIUM_MYR: CardDefinition = {
  id: "palladium-myr",
  name: "Palladium Myr",
  scryfallId: "f7c6aba3-38c3-45d1-83e1-40829eb07862",
  types: ["Artifact", "Creature"],
  subtypes: ["Myr"],
  manaCost: { generic: 3, colors: {} },
  colorIdentity: [],
  power: 2,
  toughness: 2,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 2 } }],
  tier: "scripted",
};

export const PARAPET_WATCHERS: CardDefinition = {
  id: "parapet-watchers",
  name: "Parapet Watchers",
  scryfallId: "499f9987-87d8-4cd3-98c4-b6976c70739e",
  types: ["Creature"],
  subtypes: ["Kithkin", "Soldier"],
  manaCost: { generic: 2, colors: { U: 1 } },
  colorIdentity: ["U", "W"],
  power: 2,
  toughness: 2,
  activatedAbilities: [{ cost: { mana: { generic: 0, colors: {}, hybrid: [["W", "U"]] } }, effect: { kind: "pump", power: 0, toughness: 1 } }],
  tier: "scripted",
};

export const PARDIC_COLLABORATOR: CardDefinition = {
  id: "pardic-collaborator",
  name: "Pardic Collaborator",
  scryfallId: "a9a60f33-1d1a-4c7c-9eb2-d9fc0d56b127",
  types: ["Creature"],
  subtypes: ["Human", "Barbarian"],
  manaCost: { generic: 3, colors: { R: 1 } },
  colorIdentity: ["B", "R"],
  power: 2,
  toughness: 2,
  keywords: ["First Strike"],
  activatedAbilities: [{ cost: { mana: { generic: 0, colors: { B: 1 } } }, effect: { kind: "pump", power: 1, toughness: 1 } }],
  tier: "scripted",
};

export const PARDIC_WANDERER: CardDefinition = {
  id: "pardic-wanderer",
  name: "Pardic Wanderer",
  scryfallId: "2fffe967-3a99-4f00-af46-f4e5567598df",
  types: ["Artifact", "Creature"],
  subtypes: ["Golem"],
  manaCost: { generic: 6, colors: {} },
  colorIdentity: [],
  power: 5,
  toughness: 5,
  keywords: ["Trample"],
  tier: "vanilla",
};

export const PEACE_STRIDER: CardDefinition = {
  id: "peace-strider",
  name: "Peace Strider",
  scryfallId: "4bc9bd97-f256-4dcd-b2a7-3239d443a0af",
  types: ["Artifact", "Creature"],
  subtypes: ["Construct"],
  manaCost: { generic: 4, colors: {} },
  colorIdentity: [],
  power: 3,
  toughness: 3,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 3 } }],
  tier: "scripted",
};

export const PEGASUS_CHARGER: CardDefinition = {
  id: "pegasus-charger",
  name: "Pegasus Charger",
  scryfallId: "0d0dee73-4df3-4b2f-9420-b23e6ced65c0",
  types: ["Creature"],
  subtypes: ["Pegasus"],
  manaCost: { generic: 2, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 1,
  keywords: ["Flying", "First Strike"],
  tier: "vanilla",
};

export const PELAKKA_WURM: CardDefinition = {
  id: "pelakka-wurm",
  name: "Pelakka Wurm",
  scryfallId: "304c635c-de4d-46ee-8ab0-e5c4d55b61b3",
  types: ["Creature"],
  subtypes: ["Wurm"],
  manaCost: { generic: 4, colors: { G: 3 } },
  colorIdentity: ["G"],
  power: 7,
  toughness: 7,
  keywords: ["Trample"],
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 7 } }, { event: "dies", effect: { kind: "draw", amount: 1 } }],
  tier: "scripted",
};

export const PENSIVE_MINOTAUR: CardDefinition = {
  id: "pensive-minotaur",
  name: "Pensive Minotaur",
  scryfallId: "902b462a-a552-42d4-91f0-bd33cd9cb719",
  types: ["Creature"],
  subtypes: ["Minotaur", "Warrior"],
  manaCost: { generic: 2, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 2,
  toughness: 3,
  tier: "vanilla",
};

export const PENUMBRA_BOBCAT: CardDefinition = {
  id: "penumbra-bobcat",
  name: "Penumbra Bobcat",
  scryfallId: "359fbd40-0f61-4ec7-872c-228a476c7ad5",
  types: ["Creature"],
  subtypes: ["Cat"],
  manaCost: { generic: 2, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 2,
  toughness: 1,
  triggeredAbilities: [{ event: "dies", effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-b-21-cat" } }],
  tier: "scripted",
};

export const PENUMBRA_KAVU: CardDefinition = {
  id: "penumbra-kavu",
  name: "Penumbra Kavu",
  scryfallId: "ee334211-4109-46ff-8676-856048221a1c",
  types: ["Creature"],
  subtypes: ["Kavu"],
  manaCost: { generic: 4, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 3,
  toughness: 3,
  triggeredAbilities: [{ event: "dies", effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-b-33-kavu" } }],
  tier: "scripted",
};

export const PENUMBRA_SPIDER: CardDefinition = {
  id: "penumbra-spider",
  name: "Penumbra Spider",
  scryfallId: "c862a2f7-673e-44bd-b8ee-e4295da1e0d5",
  types: ["Creature"],
  subtypes: ["Spider"],
  manaCost: { generic: 2, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 2,
  toughness: 4,
  keywords: ["Reach"],
  triggeredAbilities: [{ event: "dies", effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-b-24-spider-reach" } }],
  tier: "scripted",
};

export const PENUMBRA_WURM: CardDefinition = {
  id: "penumbra-wurm",
  name: "Penumbra Wurm",
  scryfallId: "de4ce98d-0a19-42c5-9ef9-32408da1d2a1",
  types: ["Creature"],
  subtypes: ["Wurm"],
  manaCost: { generic: 5, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 6,
  toughness: 6,
  keywords: ["Trample"],
  triggeredAbilities: [{ event: "dies", effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-b-66-wurm-trample" } }],
  tier: "scripted",
};

export const PEREGRINE_GRIFFIN: CardDefinition = {
  id: "peregrine-griffin",
  name: "Peregrine Griffin",
  scryfallId: "0296eaa6-f9fe-4fb8-af9c-04928d99e2e2",
  types: ["Creature"],
  subtypes: ["Griffin"],
  manaCost: { generic: 4, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 4,
  keywords: ["Flying", "First Strike"],
  tier: "vanilla",
};

export const PERSONAL_TUTOR: CardDefinition = {
  id: "personal-tutor",
  name: "Personal Tutor",
  scryfallId: "2887fc25-22cd-48c9-ad2b-6539c8139e27",
  types: ["Sorcery"],
  manaCost: { generic: 0, colors: { U: 1 } },
  colorIdentity: ["U"],
  castEffect: { kind: "searchLibrary", cardType: "Sorcery", destination: "library-top" },
  tier: "scripted",
};

export const PHERES_BAND_CENTAURS: CardDefinition = {
  id: "pheres-band-centaurs",
  name: "Pheres-Band Centaurs",
  scryfallId: "2168fcf4-cf87-4ab8-9710-6ec672750a9a",
  types: ["Creature"],
  subtypes: ["Centaur", "Warrior"],
  manaCost: { generic: 4, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 3,
  toughness: 7,
  tier: "vanilla",
};

export const PHYREXIAN_HULK: CardDefinition = {
  id: "phyrexian-hulk",
  name: "Phyrexian Hulk",
  scryfallId: "304bc0a2-0cf4-4609-a0fc-de933402c64a",
  types: ["Artifact", "Creature"],
  subtypes: ["Phyrexian", "Golem"],
  manaCost: { generic: 6, colors: {} },
  colorIdentity: [],
  power: 5,
  toughness: 4,
  tier: "vanilla",
};

export const PILGRIM_OF_THE_FIRES: CardDefinition = {
  id: "pilgrim-of-the-fires",
  name: "Pilgrim of the Fires",
  scryfallId: "45a60623-d523-4b43-89b0-8e89568546c7",
  types: ["Artifact", "Creature"],
  subtypes: ["Golem"],
  manaCost: { generic: 7, colors: {} },
  colorIdentity: [],
  power: 6,
  toughness: 4,
  keywords: ["First Strike", "Trample"],
  tier: "vanilla",
};

export const PILLARFIELD_OX: CardDefinition = {
  id: "pillarfield-ox",
  name: "Pillarfield Ox",
  scryfallId: "53a5c7bd-7d08-421d-ad43-70bc0c2db4d4",
  types: ["Creature"],
  subtypes: ["Ox"],
  manaCost: { generic: 3, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 4,
  tier: "vanilla",
};

export const PINE_BARRENS: CardDefinition = {
  id: "pine-barrens",
  name: "Pine Barrens",
  scryfallId: "b0f794f0-3588-4fe2-8792-64a58482ff8b",
  types: ["Land"],
  colorIdentity: ["B", "G"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 }, damageToController: 1 }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 }, damageToController: 1 }],
  tier: "vanilla",
};

export const PITILESS_GORGON: CardDefinition = {
  id: "pitiless-gorgon",
  name: "Pitiless Gorgon",
  scryfallId: "e77e14e1-326a-45a2-9522-96c61ddb970b",
  types: ["Creature"],
  subtypes: ["Gorgon"],
  manaCost: { generic: 1, colors: {}, hybrid: [["B", "G"], ["B", "G"]] },
  colorIdentity: ["B", "G"],
  power: 2,
  toughness: 2,
  keywords: ["Deathtouch"],
  tier: "vanilla",
};

export const PLATED_CRUSHER: CardDefinition = {
  id: "plated-crusher",
  name: "Plated Crusher",
  scryfallId: "a5f38436-9edf-42a1-83ba-0f5210b2cb86",
  types: ["Creature"],
  subtypes: ["Beast"],
  manaCost: { generic: 4, colors: { G: 3 } },
  colorIdentity: ["G"],
  power: 7,
  toughness: 6,
  keywords: ["Trample", "Hexproof"],
  tier: "vanilla",
};

export const POND_PROPHET: CardDefinition = {
  id: "pond-prophet",
  name: "Pond Prophet",
  scryfallId: "fb959e74-61ea-453d-bb9f-ad0183c0e1b1",
  types: ["Creature"],
  subtypes: ["Frog", "Advisor"],
  manaCost: { generic: 0, colors: {}, hybrid: [["G", "U"], ["G", "U"]] },
  colorIdentity: ["G", "U"],
  power: 1,
  toughness: 1,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "draw", amount: 1 } }],
  tier: "scripted",
};

export const PREENING_CHAMPION: CardDefinition = {
  id: "preening-champion",
  name: "Preening Champion",
  scryfallId: "44178ece-af31-4a94-88bc-c9ce43bb4573",
  types: ["Creature"],
  subtypes: ["Bird", "Knight"],
  manaCost: { generic: 2, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 2,
  toughness: 2,
  keywords: ["Flying"],
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-ur-11-elemental" } }],
  tier: "scripted",
};

export const PRETENDING_POXBEARERS: CardDefinition = {
  id: "pretending-poxbearers",
  name: "Pretending Poxbearers",
  scryfallId: "d1af91a5-8681-4a05-910d-96f7a819bfaa",
  types: ["Creature"],
  subtypes: ["Human", "Citizen", "Ally"],
  manaCost: { generic: 1, colors: {}, hybrid: [["W", "B"]] },
  colorIdentity: ["B", "W"],
  power: 2,
  toughness: 1,
  triggeredAbilities: [{ event: "dies", effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-w-11-ally" } }],
  tier: "scripted",
};

export const PRIDEFUL_PARENT: CardDefinition = {
  id: "prideful-parent",
  name: "Prideful Parent",
  scryfallId: "b742117a-8a72-43b9-b05d-274829d138a2",
  types: ["Creature"],
  subtypes: ["Cat"],
  manaCost: { generic: 2, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 2,
  keywords: ["Vigilance"],
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-w-11-cat" } }],
  tier: "scripted",
};

export const PRIMORDIAL_PACHYDERM: CardDefinition = {
  id: "primordial-pachyderm",
  name: "Primordial Pachyderm",
  scryfallId: "e1a866e6-4108-4290-9680-8f1652fbcf77",
  types: ["Creature"],
  subtypes: ["Elephant", "Avatar"],
  manaCost: { generic: 3, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 4,
  toughness: 4,
  keywords: ["Reach", "Trample"],
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 2 } }],
  tier: "scripted",
};

export const PRINCESS_LUCREZIA: CardDefinition = {
  id: "princess-lucrezia",
  name: "Princess Lucrezia",
  scryfallId: "be8f707d-58a6-4e18-a45a-fcfdd1336a64",
  types: ["Creature"],
  subtypes: ["Human", "Wizard"],
  supertypes: ["Legendary"],
  manaCost: { generic: 3, colors: { B: 1, U: 2 } },
  colorIdentity: ["B", "U"],
  power: 5,
  toughness: 4,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }],
  canBeCommander: true,
  tier: "scripted",
};

export const PRIZED_GRIFFIN: CardDefinition = {
  id: "prized-griffin",
  name: "Prized Griffin",
  scryfallId: "877bd423-83ff-4a28-b0d2-447a7821bb8c",
  types: ["Creature"],
  subtypes: ["Griffin"],
  manaCost: { generic: 4, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 4,
  keywords: ["Flying"],
  tier: "vanilla",
};

export const PRIZEFIGHTER_CONSTRUCT: CardDefinition = {
  id: "prizefighter-construct",
  name: "Prizefighter Construct",
  scryfallId: "8e389c92-b54b-46b3-a7ab-b8a5a2a7d380",
  types: ["Artifact", "Creature"],
  subtypes: ["Construct"],
  manaCost: { generic: 5, colors: {} },
  colorIdentity: [],
  power: 6,
  toughness: 2,
  tier: "vanilla",
};

export const PROTECTOR_OF_GONDOR: CardDefinition = {
  id: "protector-of-gondor",
  name: "Protector of Gondor",
  scryfallId: "85708748-40ca-4066-a287-7a6a189ff3df",
  types: ["Creature"],
  subtypes: ["Human", "Soldier"],
  manaCost: { generic: 3, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 3,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-w-11-human-soldier" } }],
  tier: "scripted",
};

export const PROWLING_FELIDAR: CardDefinition = {
  id: "prowling-felidar",
  name: "Prowling Felidar",
  scryfallId: "b9d1c11a-a32c-449c-95c6-450dce6c26d2",
  types: ["Creature"],
  subtypes: ["Cat", "Beast"],
  manaCost: { generic: 3, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 3,
  keywords: ["Vigilance"],
  triggeredAbilities: [{ event: "landfall", watches: "controller", effect: { kind: "addCounter", amount: 1 } }],
  tier: "scripted",
};

export const PURPLE_CRYSTAL_CRAB: CardDefinition = {
  id: "purple-crystal-crab",
  name: "Purple-Crystal Crab",
  scryfallId: "e26c576d-94c8-4f63-9f54-732fb1eade12",
  types: ["Creature"],
  subtypes: ["Crab"],
  manaCost: { generic: 1, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 1,
  toughness: 1,
  triggeredAbilities: [{ event: "dies", effect: { kind: "draw", amount: 1 } }],
  tier: "scripted",
};

export const PYM_TECHNOLOGIES: CardDefinition = {
  id: "pym-technologies",
  name: "Pym Technologies",
  scryfallId: "1de583ce-e805-45f1-907f-198bc82fd3b5",
  types: ["Land"],
  colorIdentity: ["G", "U"],
  entersTapped: true,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 1 } }],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }],
  tier: "scripted",
};

export const PYRETIC_RITUAL: CardDefinition = {
  id: "pyretic-ritual",
  name: "Pyretic Ritual",
  scryfallId: "1e577638-a7ed-4bcc-90fb-0cffe87d5a28",
  types: ["Instant"],
  manaCost: { generic: 1, colors: { R: 1 } },
  colorIdentity: ["R"],
  castEffect: { kind: "addMana", color: "R", amount: 3 },
  tier: "scripted",
};

export const QUICKSILVER_PIETRO_MAXIMOFF: CardDefinition = {
  id: "quicksilver-pietro-maximoff",
  name: "Quicksilver, Pietro Maximoff",
  scryfallId: "95ced506-c1a4-4742-9f13-3a261f5a08da",
  types: ["Creature"],
  subtypes: ["Mutant", "Hero"],
  supertypes: ["Legendary"],
  manaCost: { generic: 2, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 3,
  toughness: 2,
  keywords: ["Haste"],
  canBeCommander: true,
  tier: "vanilla",
};

export const QUILLED_SLAGWURM: CardDefinition = {
  id: "quilled-slagwurm",
  name: "Quilled Slagwurm",
  scryfallId: "12c597b9-5024-42bd-b500-5ef6a3accda6",
  types: ["Creature"],
  subtypes: ["Phyrexian", "Wurm"],
  manaCost: { generic: 4, colors: { G: 3 } },
  colorIdentity: ["G"],
  power: 8,
  toughness: 8,
  tier: "vanilla",
};

export const QUILLED_WOLF: CardDefinition = {
  id: "quilled-wolf",
  name: "Quilled Wolf",
  scryfallId: "fa1569b5-94ef-4ba5-98c6-f1bd4f73c7d5",
  types: ["Creature"],
  subtypes: ["Wolf"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 2,
  toughness: 2,
  activatedAbilities: [{ cost: { mana: { generic: 5, colors: { G: 1 } } }, effect: { kind: "pump", power: 4, toughness: 4 } }],
  tier: "scripted",
};

export const QUIRION_EXPLORER: CardDefinition = {
  id: "quirion-explorer",
  name: "Quirion Explorer",
  scryfallId: "d56bae65-1811-4428-93f4-60c36ceee715",
  types: ["Creature"],
  subtypes: ["Elf", "Druid", "Scout"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 1,
  toughness: 1,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 }, colorFrom: "opponent-lands" }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 }, colorFrom: "opponent-lands" }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 }, colorFrom: "opponent-lands" }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 }, colorFrom: "opponent-lands" }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 }, colorFrom: "opponent-lands" }],
  tier: "scripted",
};

export const RABANASTRE_ROYAL_CITY: CardDefinition = {
  id: "rabanastre-royal-city",
  name: "Rabanastre, Royal City",
  scryfallId: "c44c9bbe-f4c6-41cf-b3c3-b943f4011bc1",
  types: ["Land"],
  subtypes: ["Town"],
  colorIdentity: ["R", "W"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }],
  tier: "vanilla",
};

export const RADIANT_GROVE: CardDefinition = {
  id: "radiant-grove",
  name: "Radiant Grove",
  scryfallId: "466fd4e6-f1dd-40c9-92df-1da48ab729d6",
  types: ["Land"],
  subtypes: ["Forest", "Plains"],
  colorIdentity: ["G", "W"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }],
  tier: "vanilla",
};

export const RAGING_POLTERGEIST: CardDefinition = {
  id: "raging-poltergeist",
  name: "Raging Poltergeist",
  scryfallId: "78833788-ffb2-43fc-9345-975f1cd46f38",
  types: ["Creature"],
  subtypes: ["Spirit"],
  manaCost: { generic: 4, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 6,
  toughness: 1,
  tier: "vanilla",
};

export const RAGING_REDCAP: CardDefinition = {
  id: "raging-redcap",
  name: "Raging Redcap",
  scryfallId: "9627b0a7-bda9-44df-81c9-aa70cc976331",
  types: ["Creature"],
  subtypes: ["Goblin", "Knight"],
  manaCost: { generic: 2, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 1,
  toughness: 2,
  keywords: ["Double Strike"],
  tier: "vanilla",
};

export const RAKDOS_GUILDGATE: CardDefinition = {
  id: "rakdos-guildgate",
  name: "Rakdos Guildgate",
  scryfallId: "e1f01964-c610-4d0f-a2b4-f52e46dc50d2",
  types: ["Land"],
  subtypes: ["Gate"],
  colorIdentity: ["B", "R"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }],
  tier: "vanilla",
};

export const RAKDOS_RAGEMUTT: CardDefinition = {
  id: "rakdos-ragemutt",
  name: "Rakdos Ragemutt",
  scryfallId: "bb36840a-3f85-4fca-87ab-379dfce8e542",
  types: ["Creature"],
  subtypes: ["Elemental", "Dog"],
  manaCost: { generic: 3, colors: { B: 1, R: 1 } },
  colorIdentity: ["B", "R"],
  power: 3,
  toughness: 3,
  keywords: ["Lifelink", "Haste"],
  tier: "vanilla",
};

export const RAKDOS_SHRED_FREAK: CardDefinition = {
  id: "rakdos-shred-freak",
  name: "Rakdos Shred-Freak",
  scryfallId: "a620ff81-61e8-4d76-a26f-d6271f8aac7d",
  types: ["Creature"],
  subtypes: ["Human", "Berserker"],
  manaCost: { generic: 0, colors: {}, hybrid: [["B", "R"], ["B", "R"]] },
  colorIdentity: ["B", "R"],
  power: 2,
  toughness: 1,
  keywords: ["Haste"],
  tier: "vanilla",
};

export const RAKDOS_TRUMPETER: CardDefinition = {
  id: "rakdos-trumpeter",
  name: "Rakdos Trumpeter",
  scryfallId: "a4ee43e8-06ab-45da-8e56-2ed88c0141fa",
  types: ["Creature"],
  subtypes: ["Human", "Shaman"],
  manaCost: { generic: 1, colors: { B: 1 } },
  colorIdentity: ["B", "R"],
  power: 1,
  toughness: 3,
  keywords: ["Menace"],
  activatedAbilities: [{ cost: { mana: { generic: 3, colors: { R: 1 } } }, effect: { kind: "pump", power: 2, toughness: 0 } }],
  tier: "scripted",
};

export const RAMIREZ_DEPIETRO: CardDefinition = {
  id: "ramirez-depietro",
  name: "Ramirez DePietro",
  scryfallId: "c9890742-f1cb-41fd-bf14-297b3ca88b93",
  types: ["Creature"],
  subtypes: ["Human", "Pirate"],
  supertypes: ["Legendary"],
  manaCost: { generic: 3, colors: { B: 2, U: 1 } },
  colorIdentity: ["B", "U"],
  power: 4,
  toughness: 3,
  keywords: ["First Strike"],
  canBeCommander: true,
  tier: "vanilla",
};

export const RAMPAGING_BALOTHS: CardDefinition = {
  id: "rampaging-baloths",
  name: "Rampaging Baloths",
  scryfallId: "84aa18de-6acc-46cc-8e28-3046790a6751",
  types: ["Creature"],
  subtypes: ["Beast"],
  manaCost: { generic: 4, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 6,
  toughness: 6,
  keywords: ["Trample"],
  triggeredAbilities: [{ event: "landfall", watches: "controller", effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-g-44-beast" } }],
  tier: "scripted",
};

export const RAVENOUS_LINDWURM: CardDefinition = {
  id: "ravenous-lindwurm",
  name: "Ravenous Lindwurm",
  scryfallId: "9961e3fc-167e-4043-8510-cc5cf08d473e",
  types: ["Creature"],
  subtypes: ["Wurm"],
  manaCost: { generic: 4, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 6,
  toughness: 6,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 4 } }],
  tier: "scripted",
};

export const RAZORFIELD_THRESHER: CardDefinition = {
  id: "razorfield-thresher",
  name: "Razorfield Thresher",
  scryfallId: "b0a74203-d342-489d-a584-bca78ef3331d",
  types: ["Artifact", "Creature"],
  subtypes: ["Construct"],
  manaCost: { generic: 7, colors: {} },
  colorIdentity: [],
  power: 6,
  toughness: 4,
  tier: "vanilla",
};

export const REDWOOD_TREEFOLK: CardDefinition = {
  id: "redwood-treefolk",
  name: "Redwood Treefolk",
  scryfallId: "9cc6d29d-2915-418d-856f-13b05430dfda",
  types: ["Creature"],
  subtypes: ["Treefolk"],
  manaCost: { generic: 4, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 3,
  toughness: 6,
  tier: "vanilla",
};

export const REJUVENATING_SPRINGS: CardDefinition = {
  id: "rejuvenating-springs",
  name: "Rejuvenating Springs",
  scryfallId: "c4565a7b-a0ed-4a7f-ad48-7745c56d141b",
  types: ["Land"],
  colorIdentity: ["G", "U"],
  entersTapped: true,
  entersTappedUnless: { kind: "opponents", count: 2 },
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }],
  tier: "vanilla",
};

export const RELIC_SLOTH: CardDefinition = {
  id: "relic-sloth",
  name: "Relic Sloth",
  scryfallId: "c1cb483f-c567-4cfd-9fe8-1503e7b40542",
  types: ["Creature"],
  subtypes: ["Sloth", "Beast"],
  manaCost: { generic: 3, colors: { R: 1, W: 1 } },
  colorIdentity: ["R", "W"],
  power: 4,
  toughness: 4,
  keywords: ["Vigilance", "Menace"],
  tier: "vanilla",
};

export const RESISTANCE_SKYWARDEN: CardDefinition = {
  id: "resistance-skywarden",
  name: "Resistance Skywarden",
  scryfallId: "6249aabe-8f21-4257-9e04-ceffd44d42a5",
  types: ["Creature"],
  subtypes: ["Ogre", "Rebel"],
  manaCost: { generic: 3, colors: { R: 2 } },
  colorIdentity: ["R"],
  power: 5,
  toughness: 5,
  keywords: ["Reach", "Menace"],
  tier: "vanilla",
};

export const RHOX_BRUTE: CardDefinition = {
  id: "rhox-brute",
  name: "Rhox Brute",
  scryfallId: "382fba19-78d3-4aa3-9508-c7c1f13e0b33",
  types: ["Creature"],
  subtypes: ["Rhino", "Warrior"],
  manaCost: { generic: 2, colors: { G: 1, R: 1 } },
  colorIdentity: ["G", "R"],
  power: 4,
  toughness: 4,
  tier: "vanilla",
};

export const RHOX_WAR_MONK: CardDefinition = {
  id: "rhox-war-monk",
  name: "Rhox War Monk",
  scryfallId: "bd24e81d-d3a8-4550-bad9-b818f48cc700",
  types: ["Creature"],
  subtypes: ["Rhino", "Monk"],
  manaCost: { generic: 0, colors: { G: 1, U: 1, W: 1 } },
  colorIdentity: ["G", "U", "W"],
  power: 3,
  toughness: 4,
  keywords: ["Lifelink"],
  tier: "vanilla",
};

export const RIDGETOP_RAPTOR: CardDefinition = {
  id: "ridgetop-raptor",
  name: "Ridgetop Raptor",
  scryfallId: "720a0e44-0675-488e-bfa5-ae557337e9c4",
  types: ["Creature"],
  subtypes: ["Dinosaur", "Beast"],
  manaCost: { generic: 3, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 2,
  toughness: 1,
  keywords: ["Double Strike"],
  tier: "vanilla",
};

export const RIMEWOOD_FALLS: CardDefinition = {
  id: "rimewood-falls",
  name: "Rimewood Falls",
  scryfallId: "da1db084-f235-4e26-8867-5f0835a0d283",
  types: ["Land"],
  subtypes: ["Forest", "Island"],
  supertypes: ["Snow"],
  colorIdentity: ["G", "U"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }],
  tier: "vanilla",
};

export const RIOT_DEVILS: CardDefinition = {
  id: "riot-devils",
  name: "Riot Devils",
  scryfallId: "cd35107b-6aaf-4fd8-bf1c-12b724d1482e",
  types: ["Creature"],
  subtypes: ["Devil"],
  manaCost: { generic: 2, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 2,
  toughness: 3,
  tier: "vanilla",
};

export const RIP_CLAN_CRASHER: CardDefinition = {
  id: "rip-clan-crasher",
  name: "Rip-Clan Crasher",
  scryfallId: "8d61c4a0-054b-479e-82d9-dc60c5c708e2",
  types: ["Creature"],
  subtypes: ["Human", "Warrior"],
  manaCost: { generic: 0, colors: { G: 1, R: 1 } },
  colorIdentity: ["G", "R"],
  power: 2,
  toughness: 2,
  keywords: ["Haste"],
  tier: "vanilla",
};

export const RIPTIDE_CRAB: CardDefinition = {
  id: "riptide-crab",
  name: "Riptide Crab",
  scryfallId: "cdf9f3fb-40f5-4833-8638-5ddc2ba591f3",
  types: ["Creature"],
  subtypes: ["Crab"],
  manaCost: { generic: 1, colors: { U: 1, W: 1 } },
  colorIdentity: ["U", "W"],
  power: 1,
  toughness: 3,
  keywords: ["Vigilance"],
  triggeredAbilities: [{ event: "dies", effect: { kind: "draw", amount: 1 } }],
  tier: "scripted",
};

export const RISEN_SANCTUARY: CardDefinition = {
  id: "risen-sanctuary",
  name: "Risen Sanctuary",
  scryfallId: "a0b6c136-2bbe-48c1-ac53-2a8221b96936",
  types: ["Creature"],
  subtypes: ["Elemental"],
  manaCost: { generic: 5, colors: { G: 1, W: 1 } },
  colorIdentity: ["G", "W"],
  power: 8,
  toughness: 8,
  keywords: ["Vigilance"],
  tier: "vanilla",
};

export const RIVEN_TURNBULL: CardDefinition = {
  id: "riven-turnbull",
  name: "Riven Turnbull",
  scryfallId: "ed665227-02ba-4977-a8e7-ea4e46a626e6",
  types: ["Creature"],
  subtypes: ["Human", "Advisor"],
  supertypes: ["Legendary"],
  manaCost: { generic: 5, colors: { B: 1, U: 1 } },
  colorIdentity: ["B", "U"],
  power: 5,
  toughness: 7,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }],
  canBeCommander: true,
  tier: "scripted",
};

export const RIVERPYRE_VERGE: CardDefinition = {
  id: "riverpyre-verge",
  name: "Riverpyre Verge",
  scryfallId: "57a93a71-d77c-417f-85d0-cd420f573331",
  types: ["Land"],
  colorIdentity: ["R", "U"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 }, activateOnlyIf: { kind: "controls-subtype", subtypes: ["Island", "Mountain"] } }],
  tier: "vanilla",
};

export const ROC_EGG: CardDefinition = {
  id: "roc-egg",
  name: "Roc Egg",
  scryfallId: "a84a12d7-ffb3-4c05-973f-e00fbc2ab6c4",
  types: ["Creature"],
  subtypes: ["Bird", "Egg"],
  manaCost: { generic: 2, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 0,
  toughness: 3,
  keywords: ["Defender"],
  triggeredAbilities: [{ event: "dies", effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-w-33-bird-flying" } }],
  tier: "scripted",
};

export const ROCKFALL_VALE: CardDefinition = {
  id: "rockfall-vale",
  name: "Rockfall Vale",
  scryfallId: "dcdea659-ecaf-4abe-be0f-64e105abb104",
  types: ["Land"],
  colorIdentity: ["G", "R"],
  entersTapped: true,
  entersTappedUnless: { kind: "controls-other-lands", count: 2 },
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "vanilla",
};

export const ROOTBOUND_CRAG: CardDefinition = {
  id: "rootbound-crag",
  name: "Rootbound Crag",
  scryfallId: "42d174e5-b8c2-45eb-8e08-1b94fc27cbee",
  types: ["Land"],
  colorIdentity: ["G", "R"],
  entersTapped: true,
  entersTappedUnless: { kind: "controls-subtype", subtypes: ["Mountain", "Forest"] },
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "vanilla",
};

export const ROTTED_HYSTRIX: CardDefinition = {
  id: "rotted-hystrix",
  name: "Rotted Hystrix",
  scryfallId: "7bcae97d-468a-4e16-bfed-d2946f64784c",
  types: ["Creature"],
  subtypes: ["Phyrexian", "Beast"],
  manaCost: { generic: 4, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 3,
  toughness: 6,
  tier: "vanilla",
};

export const ROVING_HARPER: CardDefinition = {
  id: "roving-harper",
  name: "Roving Harper",
  scryfallId: "c6b0ed9c-9a99-4a50-80a9-396420a8dcf9",
  types: ["Creature"],
  subtypes: ["Elf", "Scout"],
  manaCost: { generic: 2, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 2,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "draw", amount: 1 } }],
  tier: "scripted",
};

export const RUBBLE_SLINGER: CardDefinition = {
  id: "rubble-slinger",
  name: "Rubble Slinger",
  scryfallId: "f006255f-b18d-4d52-b97a-17909b67decc",
  types: ["Creature"],
  subtypes: ["Human", "Warrior"],
  manaCost: { generic: 2, colors: {}, hybrid: [["R", "G"]] },
  colorIdentity: ["G", "R"],
  power: 2,
  toughness: 3,
  keywords: ["Reach"],
  tier: "vanilla",
};

export const RUGGED_HIGHLANDS: CardDefinition = {
  id: "rugged-highlands",
  name: "Rugged Highlands",
  scryfallId: "31261eca-28ad-407c-84ef-0c124d0d7451",
  types: ["Land"],
  colorIdentity: ["G", "R"],
  entersTapped: true,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 1 } }],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "scripted",
};

export const RUGGED_PRAIRIE: CardDefinition = {
  id: "rugged-prairie",
  name: "Rugged Prairie",
  scryfallId: "6bd21c9e-de16-4ee9-ae16-6e82b490109d",
  types: ["Land"],
  colorIdentity: ["R", "W"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 1 } }, { cost: { tap: true, mana: { generic: 0, colors: {}, hybrid: [["R", "W"]] } }, effect: { kind: "addManaCombination", mana: [{ color: "R", amount: 2 }] } }, { cost: { tap: true, mana: { generic: 0, colors: {}, hybrid: [["R", "W"]] } }, effect: { kind: "addManaCombination", mana: [{ color: "R", amount: 1 }, { color: "W", amount: 1 }] } }, { cost: { tap: true, mana: { generic: 0, colors: {}, hybrid: [["R", "W"]] } }, effect: { kind: "addManaCombination", mana: [{ color: "W", amount: 2 }] } }],
  tier: "vanilla",
};

export const RUINATION_WURM: CardDefinition = {
  id: "ruination-wurm",
  name: "Ruination Wurm",
  scryfallId: "ce04d1ee-2605-472d-b3ee-24800342e9af",
  types: ["Creature"],
  subtypes: ["Wurm"],
  manaCost: { generic: 4, colors: { G: 1, R: 1 } },
  colorIdentity: ["G", "R"],
  power: 7,
  toughness: 6,
  tier: "vanilla",
};

export const RUNE_CERVIN_RIDER: CardDefinition = {
  id: "rune-cervin-rider",
  name: "Rune-Cervin Rider",
  scryfallId: "9d9574f6-40b3-4fe2-950c-234bc358ecf6",
  types: ["Creature"],
  subtypes: ["Elf", "Knight"],
  manaCost: { generic: 3, colors: { W: 1 } },
  colorIdentity: ["G", "W"],
  power: 2,
  toughness: 2,
  keywords: ["Flying"],
  activatedAbilities: [{ cost: { mana: { generic: 0, colors: {}, hybrid: [["G", "W"], ["G", "W"]] } }, effect: { kind: "pump", power: 1, toughness: 1 } }],
  tier: "scripted",
};

export const RUNEWING: CardDefinition = {
  id: "runewing",
  name: "Runewing",
  scryfallId: "749961e6-b135-4629-ae9d-124de0d70db9",
  types: ["Creature"],
  subtypes: ["Bird"],
  manaCost: { generic: 3, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 2,
  toughness: 2,
  keywords: ["Flying"],
  triggeredAbilities: [{ event: "dies", effect: { kind: "draw", amount: 1 } }],
  tier: "scripted",
};

export const RUSHWOOD_ELEMENTAL: CardDefinition = {
  id: "rushwood-elemental",
  name: "Rushwood Elemental",
  scryfallId: "52128694-d9f5-4acb-b684-bb02a4e766b8",
  types: ["Creature"],
  subtypes: ["Elemental"],
  manaCost: { generic: 0, colors: { G: 5 } },
  colorIdentity: ["G"],
  power: 4,
  toughness: 4,
  keywords: ["Trample"],
  triggeredAbilities: [{ event: "upkeep", watches: "controller", optional: true, effect: { kind: "addCounter", amount: 1 } }],
  tier: "scripted",
};

export const S_H_I_E_L_D_DEPLOYMENT_DRONE: CardDefinition = {
  id: "s-h-i-e-l-d-deployment-drone",
  name: "S.H.I.E.L.D. Deployment Drone",
  scryfallId: "c3d0f02f-dfaf-47b6-8053-514417f4dfe2",
  types: ["Artifact", "Creature"],
  subtypes: ["Robot"],
  manaCost: { generic: 2, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 2,
  toughness: 2,
  keywords: ["Flying"],
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "createToken", count: 1, tokenDefinitionId: "soldier-token" } }],
  tier: "scripted",
};

export const SACRED_PEAKS: CardDefinition = {
  id: "sacred-peaks",
  name: "Sacred Peaks",
  scryfallId: "ee2d6798-b19d-4628-bb57-05663ab4af68",
  types: ["Land"],
  subtypes: ["Mountain", "Plains"],
  colorIdentity: ["R", "W"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }],
  tier: "vanilla",
};

export const SACRED_WOLF: CardDefinition = {
  id: "sacred-wolf",
  name: "Sacred Wolf",
  scryfallId: "ff4661dd-2075-48c3-b19b-fc7f8aaba1b8",
  types: ["Creature"],
  subtypes: ["Wolf"],
  manaCost: { generic: 2, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 3,
  toughness: 1,
  keywords: ["Hexproof"],
  tier: "vanilla",
};

export const SALT_FLATS: CardDefinition = {
  id: "salt-flats",
  name: "Salt Flats",
  scryfallId: "93e98e1f-5a51-41b4-b636-86a58e712849",
  types: ["Land"],
  colorIdentity: ["B", "W"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 }, damageToController: 1 }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 }, damageToController: 1 }],
  tier: "vanilla",
};

export const SALT_MARSH: CardDefinition = {
  id: "salt-marsh",
  name: "Salt Marsh",
  scryfallId: "3ac23896-d4c9-4543-9edc-1d1bb5c74611",
  types: ["Land"],
  colorIdentity: ["B", "U"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }],
  tier: "vanilla",
};

export const SANDSTEPPE_CITADEL: CardDefinition = {
  id: "sandsteppe-citadel",
  name: "Sandsteppe Citadel",
  scryfallId: "e7482def-e87e-4a7f-9c18-7859483b2a66",
  types: ["Land"],
  colorIdentity: ["B", "G", "W"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "vanilla",
};

export const SATYR_RAMBLER: CardDefinition = {
  id: "satyr-rambler",
  name: "Satyr Rambler",
  scryfallId: "fabccddd-c0ea-45a5-bebc-d8f858242a2a",
  types: ["Creature"],
  subtypes: ["Satyr"],
  manaCost: { generic: 1, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 2,
  toughness: 1,
  keywords: ["Trample"],
  tier: "vanilla",
};

export const SAVANNAH: CardDefinition = {
  id: "savannah",
  name: "Savannah",
  scryfallId: "b0d161fc-4a2a-4f1d-82b4-a746552552df",
  types: ["Land"],
  subtypes: ["Forest", "Plains"],
  colorIdentity: ["G", "W"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }],
  tier: "vanilla",
};

export const SAZH_S_CHOCOBO: CardDefinition = {
  id: "sazhs-chocobo",
  name: "Sazh's Chocobo",
  scryfallId: "dda6b4d0-1b60-46b0-b321-b9ffe15afff4",
  types: ["Creature"],
  subtypes: ["Bird"],
  manaCost: { generic: 0, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 0,
  toughness: 1,
  triggeredAbilities: [{ event: "landfall", watches: "controller", effect: { kind: "addCounter", amount: 1 } }],
  tier: "scripted",
};

export const SCABLAND: CardDefinition = {
  id: "scabland",
  name: "Scabland",
  scryfallId: "40642193-712a-495e-9349-6fc8e54a66f4",
  types: ["Land"],
  colorIdentity: ["R", "W"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 }, damageToController: 1 }, { cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 }, damageToController: 1 }],
  tier: "vanilla",
};

export const SCALED_WURM: CardDefinition = {
  id: "scaled-wurm",
  name: "Scaled Wurm",
  scryfallId: "bd17b2c1-c3dd-4f6f-a44c-dc81c6bc1c94",
  types: ["Creature"],
  subtypes: ["Wurm"],
  manaCost: { generic: 7, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 7,
  toughness: 6,
  tier: "vanilla",
};

export const SCARLET_WITCH_WANDA_MAXIMOFF: CardDefinition = {
  id: "scarlet-witch-wanda-maximoff",
  name: "Scarlet Witch, Wanda Maximoff",
  scryfallId: "0ff25079-f930-47cd-a77a-bd1c32024559",
  types: ["Creature"],
  subtypes: ["Mutant", "Warlock", "Hero"],
  supertypes: ["Legendary"],
  manaCost: { generic: 2, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 2,
  toughness: 3,
  keywords: ["Menace"],
  canBeCommander: true,
  tier: "vanilla",
};

export const SCARWOOD_GOBLINS: CardDefinition = {
  id: "scarwood-goblins",
  name: "Scarwood Goblins",
  scryfallId: "5542d236-af43-43b8-b30f-8980d74bbdd0",
  types: ["Creature"],
  subtypes: ["Goblin"],
  manaCost: { generic: 0, colors: { G: 1, R: 1 } },
  colorIdentity: ["G", "R"],
  power: 2,
  toughness: 2,
  tier: "vanilla",
};

export const SCION_OF_UGIN: CardDefinition = {
  id: "scion-of-ugin",
  name: "Scion of Ugin",
  scryfallId: "2904aaaa-cd25-4c05-9d57-4c5a951ac6d9",
  types: ["Creature"],
  subtypes: ["Dragon", "Spirit"],
  manaCost: { generic: 6, colors: {} },
  colorIdentity: [],
  power: 4,
  toughness: 4,
  keywords: ["Flying"],
  tier: "vanilla",
};

export const SCION_OF_THE_SWARM: CardDefinition = {
  id: "scion-of-the-swarm",
  name: "Scion of the Swarm",
  scryfallId: "043926fe-d25f-40b4-b556-181503434e68",
  types: ["Creature"],
  subtypes: ["Vampire", "Cleric"],
  manaCost: { generic: 3, colors: { B: 2 } },
  colorIdentity: ["B"],
  power: 3,
  toughness: 3,
  keywords: ["Flying"],
  triggeredAbilities: [{ event: "gain-life", effect: { kind: "addCounter", amount: 1 } }],
  tier: "scripted",
};

export const SCOURED_BARRENS: CardDefinition = {
  id: "scoured-barrens",
  name: "Scoured Barrens",
  scryfallId: "b4b47b80-69ed-44b0-afa0-ca90206dc16d",
  types: ["Land"],
  colorIdentity: ["B", "W"],
  entersTapped: true,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 1 } }],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }],
  tier: "scripted",
};

export const SCRUBLAND: CardDefinition = {
  id: "scrubland",
  name: "Scrubland",
  scryfallId: "9d471e36-a3ab-4a96-ba4b-8eca921ea37a",
  types: ["Land"],
  subtypes: ["Plains", "Swamp"],
  colorIdentity: ["B", "W"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }],
  tier: "vanilla",
};

export const SEA_OF_CLOUDS: CardDefinition = {
  id: "sea-of-clouds",
  name: "Sea of Clouds",
  scryfallId: "d4fb722f-40af-4bd1-b660-e8186b98f233",
  types: ["Land"],
  colorIdentity: ["U", "W"],
  entersTapped: true,
  entersTappedUnless: { kind: "opponents", count: 2 },
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }],
  tier: "vanilla",
};

export const SEASHELL_CAMEO: CardDefinition = {
  id: "seashell-cameo",
  name: "Seashell Cameo",
  scryfallId: "9efdbcad-e2e4-4f54-ade5-920b1853109e",
  types: ["Artifact"],
  manaCost: { generic: 3, colors: {} },
  colorIdentity: ["U", "W"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }],
  tier: "vanilla",
};

export const SEASIDE_CITADEL: CardDefinition = {
  id: "seaside-citadel",
  name: "Seaside Citadel",
  scryfallId: "b681599f-aa7a-4b3a-a36a-dc6d70fd6a11",
  types: ["Land"],
  colorIdentity: ["G", "U", "W"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }],
  tier: "vanilla",
};

export const SEAT_OF_THE_SYNOD: CardDefinition = {
  id: "seat-of-the-synod",
  name: "Seat of the Synod",
  scryfallId: "57a194b3-2899-4dee-977a-c77df0b94dfe",
  types: ["Land", "Artifact"],
  colorIdentity: ["U"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }],
  tier: "vanilla",
};

export const SEETHING_SONG: CardDefinition = {
  id: "seething-song",
  name: "Seething Song",
  scryfallId: "f493ce26-005c-4ddc-80f0-47bea4fd013a",
  types: ["Instant"],
  manaCost: { generic: 2, colors: { R: 1 } },
  colorIdentity: ["R"],
  castEffect: { kind: "addMana", color: "R", amount: 5 },
  tier: "scripted",
};

export const SEJIRI_REFUGE: CardDefinition = {
  id: "sejiri-refuge",
  name: "Sejiri Refuge",
  scryfallId: "b474bfdd-e0b2-4b96-b8eb-84ced9ac5a06",
  types: ["Land"],
  colorIdentity: ["U", "W"],
  entersTapped: true,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 1 } }],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }],
  tier: "scripted",
};

export const SELESNYA_GUILDGATE: CardDefinition = {
  id: "selesnya-guildgate",
  name: "Selesnya Guildgate",
  scryfallId: "6718d4e7-768e-473f-8064-a68422e977f6",
  types: ["Land"],
  subtypes: ["Gate"],
  colorIdentity: ["G", "W"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }],
  tier: "vanilla",
};

export const SELLER_OF_SONGBIRDS: CardDefinition = {
  id: "seller-of-songbirds",
  name: "Seller of Songbirds",
  scryfallId: "df84d9ce-9ff0-438a-96e1-2aadd60dcaba",
  types: ["Creature"],
  subtypes: ["Human"],
  manaCost: { generic: 2, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 2,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-w-11-bird-flying" } }],
  tier: "scripted",
};

export const SERAPH_OF_DAWN: CardDefinition = {
  id: "seraph-of-dawn",
  name: "Seraph of Dawn",
  scryfallId: "64bf33ea-2d2d-476d-ab1d-fba204fd034b",
  types: ["Creature"],
  subtypes: ["Angel"],
  manaCost: { generic: 2, colors: { W: 2 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 4,
  keywords: ["Flying", "Lifelink"],
  tier: "vanilla",
};

export const SERRA_ZEALOT: CardDefinition = {
  id: "serra-zealot",
  name: "Serra Zealot",
  scryfallId: "0b311542-599f-4d2f-a871-18d5b0b7bbe5",
  types: ["Creature"],
  subtypes: ["Human", "Soldier"],
  manaCost: { generic: 0, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 1,
  keywords: ["First Strike"],
  tier: "vanilla",
};

export const SEWN_EYE_DRAKE: CardDefinition = {
  id: "sewn-eye-drake",
  name: "Sewn-Eye Drake",
  scryfallId: "dbf97c08-e074-4353-b9fa-c79793622585",
  types: ["Creature"],
  subtypes: ["Zombie", "Drake"],
  manaCost: { generic: 2, colors: { B: 1 }, hybrid: [["U", "R"]] },
  colorIdentity: ["B", "R", "U"],
  power: 3,
  toughness: 1,
  keywords: ["Flying", "Haste"],
  tier: "vanilla",
};

export const SHARLAYAN_NATION_OF_SCHOLARS: CardDefinition = {
  id: "sharlayan-nation-of-scholars",
  name: "Sharlayan, Nation of Scholars",
  scryfallId: "7a745b5e-cdb8-4d05-ac5c-87be69536da6",
  types: ["Land"],
  subtypes: ["Town"],
  colorIdentity: ["U", "W"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }],
  tier: "vanilla",
};

export const SHATTERED_SANCTUM: CardDefinition = {
  id: "shattered-sanctum",
  name: "Shattered Sanctum",
  scryfallId: "5aa0c810-3b7d-4661-979e-e84fb327742d",
  types: ["Land"],
  colorIdentity: ["B", "W"],
  entersTapped: true,
  entersTappedUnless: { kind: "controls-other-lands", count: 2 },
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }],
  tier: "vanilla",
};

export const SHEPHERD_OF_THE_LOST: CardDefinition = {
  id: "shepherd-of-the-lost",
  name: "Shepherd of the Lost",
  scryfallId: "ff23b1c2-7b99-4504-8944-ada264725524",
  types: ["Creature"],
  subtypes: ["Angel"],
  manaCost: { generic: 4, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 3,
  keywords: ["Flying", "First Strike", "Vigilance"],
  tier: "vanilla",
};

export const SHIPWRECK_MARSH: CardDefinition = {
  id: "shipwreck-marsh",
  name: "Shipwreck Marsh",
  scryfallId: "156df6eb-1ac9-4954-bf93-b1668096b8bd",
  types: ["Land"],
  colorIdentity: ["B", "U"],
  entersTapped: true,
  entersTappedUnless: { kind: "controls-other-lands", count: 2 },
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }],
  tier: "vanilla",
};

export const SHIVAN_DRAGON: CardDefinition = {
  id: "shivan-dragon",
  name: "Shivan Dragon",
  scryfallId: "702c4781-670b-49ae-b511-90ed119841b0",
  types: ["Creature"],
  subtypes: ["Dragon"],
  manaCost: { generic: 4, colors: { R: 2 } },
  colorIdentity: ["R"],
  power: 5,
  toughness: 5,
  keywords: ["Flying"],
  activatedAbilities: [{ cost: { mana: { generic: 0, colors: { R: 1 } } }, effect: { kind: "pump", power: 1, toughness: 0 } }],
  tier: "scripted",
};

export const SHIVAN_OASIS: CardDefinition = {
  id: "shivan-oasis",
  name: "Shivan Oasis",
  scryfallId: "6d11de19-fb40-4dc6-ad61-3b7e95163c0b",
  types: ["Land"],
  colorIdentity: ["G", "R"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "vanilla",
};

export const SHIVAN_REEF: CardDefinition = {
  id: "shivan-reef",
  name: "Shivan Reef",
  scryfallId: "e13d0982-2542-4770-8e93-637478a0f84a",
  types: ["Land"],
  colorIdentity: ["R", "U"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 }, damageToController: 1 }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 }, damageToController: 1 }],
  tier: "vanilla",
};

export const SHRIKE_FORCE: CardDefinition = {
  id: "shrike-force",
  name: "Shrike Force",
  scryfallId: "306fec2c-d8b7-4f4b-8f58-10e3b9f3158f",
  types: ["Creature"],
  subtypes: ["Bird", "Knight"],
  manaCost: { generic: 2, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 3,
  keywords: ["Flying", "Double Strike", "Vigilance"],
  tier: "vanilla",
};

export const SHU_GRAIN_CARAVAN: CardDefinition = {
  id: "shu-grain-caravan",
  name: "Shu Grain Caravan",
  scryfallId: "7bf26eb7-8a31-4022-87bb-67394653f06a",
  types: ["Creature"],
  subtypes: ["Human", "Soldier"],
  manaCost: { generic: 2, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 2,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 2 } }],
  tier: "scripted",
};

export const SHU_SOLDIER_FARMERS: CardDefinition = {
  id: "shu-soldier-farmers",
  name: "Shu Soldier-Farmers",
  scryfallId: "53100324-b42f-4cd1-a5db-8a3b292d2da7",
  types: ["Creature"],
  subtypes: ["Human", "Soldier"],
  manaCost: { generic: 4, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 4,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 4 } }],
  tier: "scripted",
};

export const SILENT_ARTISAN: CardDefinition = {
  id: "silent-artisan",
  name: "Silent Artisan",
  scryfallId: "dce5647d-1546-4eff-a2a2-9e9ef26db533",
  types: ["Creature"],
  subtypes: ["Giant"],
  manaCost: { generic: 3, colors: { W: 2 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 5,
  tier: "vanilla",
};

export const SILVER_MYR: CardDefinition = {
  id: "silver-myr",
  name: "Silver Myr",
  scryfallId: "3ebcc053-21c6-4708-b9fc-532e3749962f",
  types: ["Artifact", "Creature"],
  subtypes: ["Myr"],
  manaCost: { generic: 2, colors: {} },
  colorIdentity: ["U"],
  power: 1,
  toughness: 1,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }],
  tier: "scripted",
};

export const SILVERBACK_APE: CardDefinition = {
  id: "silverback-ape",
  name: "Silverback Ape",
  scryfallId: "025b3156-975d-4f64-b19c-172cb21266c5",
  types: ["Creature"],
  subtypes: ["Ape"],
  manaCost: { generic: 3, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 5,
  toughness: 5,
  tier: "vanilla",
};

export const SILVERBACK_SHAMAN: CardDefinition = {
  id: "silverback-shaman",
  name: "Silverback Shaman",
  scryfallId: "8048bab7-8fd1-446c-80e9-cc2ffb154295",
  types: ["Creature"],
  subtypes: ["Ape", "Shaman"],
  manaCost: { generic: 3, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 5,
  toughness: 4,
  keywords: ["Trample"],
  triggeredAbilities: [{ event: "dies", effect: { kind: "draw", amount: 1 } }],
  tier: "scripted",
};

export const SILVERBEAK_GRIFFIN: CardDefinition = {
  id: "silverbeak-griffin",
  name: "Silverbeak Griffin",
  scryfallId: "36b4c374-42a4-4912-8a74-a11c3fa0e065",
  types: ["Creature"],
  subtypes: ["Griffin"],
  manaCost: { generic: 0, colors: { W: 2 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 2,
  keywords: ["Flying"],
  tier: "vanilla",
};

export const SIMIC_GUILDGATE: CardDefinition = {
  id: "simic-guildgate",
  name: "Simic Guildgate",
  scryfallId: "96590855-1ee5-4d69-9070-776e23f71976",
  types: ["Land"],
  subtypes: ["Gate"],
  colorIdentity: ["G", "U"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }],
  tier: "vanilla",
};

export const SIR_SHANDLAR_OF_EBERYN: CardDefinition = {
  id: "sir-shandlar-of-eberyn",
  name: "Sir Shandlar of Eberyn",
  scryfallId: "2a92c419-8f1e-4604-824d-28b086b54216",
  types: ["Creature"],
  subtypes: ["Human", "Knight"],
  supertypes: ["Legendary"],
  manaCost: { generic: 4, colors: { G: 1, W: 1 } },
  colorIdentity: ["G", "W"],
  power: 4,
  toughness: 7,
  canBeCommander: true,
  tier: "vanilla",
};

export const SISTERS_OF_THE_FLAME: CardDefinition = {
  id: "sisters-of-the-flame",
  name: "Sisters of the Flame",
  scryfallId: "a39ab53c-133a-4211-8499-aea00ed3ee1d",
  types: ["Creature"],
  subtypes: ["Human", "Shaman"],
  manaCost: { generic: 1, colors: { R: 2 } },
  colorIdentity: ["R"],
  power: 2,
  toughness: 2,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }],
  tier: "scripted",
};

export const SIVITRI_SCARZAM: CardDefinition = {
  id: "sivitri-scarzam",
  name: "Sivitri Scarzam",
  scryfallId: "1575410c-a525-4326-9209-917d2d712559",
  types: ["Creature"],
  subtypes: ["Human"],
  supertypes: ["Legendary"],
  manaCost: { generic: 5, colors: { B: 1, U: 1 } },
  colorIdentity: ["B", "U"],
  power: 6,
  toughness: 4,
  canBeCommander: true,
  tier: "vanilla",
};

export const SKY_DIAMOND: CardDefinition = {
  id: "sky-diamond",
  name: "Sky Diamond",
  scryfallId: "d47abfb2-9bcf-485c-9bd4-2c09b714eb32",
  types: ["Artifact"],
  manaCost: { generic: 2, colors: {} },
  colorIdentity: ["U"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }],
  tier: "vanilla",
};

export const SKY_SPIRIT: CardDefinition = {
  id: "sky-spirit",
  name: "Sky Spirit",
  scryfallId: "62eea10f-eddf-43a1-96fe-5f6f37c42415",
  types: ["Creature"],
  subtypes: ["Spirit"],
  manaCost: { generic: 1, colors: { U: 1, W: 1 } },
  colorIdentity: ["U", "W"],
  power: 2,
  toughness: 2,
  keywords: ["Flying", "First Strike"],
  tier: "vanilla",
};

export const SKY_TERROR: CardDefinition = {
  id: "sky-terror",
  name: "Sky Terror",
  scryfallId: "167ed739-2953-47af-841f-bc1a092b3aa6",
  types: ["Creature"],
  subtypes: ["Dinosaur"],
  manaCost: { generic: 0, colors: { R: 1, W: 1 } },
  colorIdentity: ["R", "W"],
  power: 2,
  toughness: 2,
  keywords: ["Flying", "Menace"],
  tier: "vanilla",
};

export const SKYHUNTER_PATROL: CardDefinition = {
  id: "skyhunter-patrol",
  name: "Skyhunter Patrol",
  scryfallId: "675bfd45-4b73-451c-b1d9-2fe46b5dd5aa",
  types: ["Creature"],
  subtypes: ["Cat", "Knight"],
  manaCost: { generic: 2, colors: { W: 2 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 3,
  keywords: ["Flying", "First Strike"],
  tier: "vanilla",
};

export const SKYHUNTER_SKIRMISHER: CardDefinition = {
  id: "skyhunter-skirmisher",
  name: "Skyhunter Skirmisher",
  scryfallId: "adbf772f-ebdf-4c04-996f-0dbf1826049b",
  types: ["Creature"],
  subtypes: ["Cat", "Knight"],
  manaCost: { generic: 1, colors: { W: 2 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 1,
  keywords: ["Flying", "Double Strike"],
  tier: "vanilla",
};

export const SKYKNIGHT_LEGIONNAIRE: CardDefinition = {
  id: "skyknight-legionnaire",
  name: "Skyknight Legionnaire",
  scryfallId: "e22b3239-0f4f-4628-b8fb-0bdeb9b744b1",
  types: ["Creature"],
  subtypes: ["Human", "Knight"],
  manaCost: { generic: 1, colors: { R: 1, W: 1 } },
  colorIdentity: ["R", "W"],
  power: 2,
  toughness: 2,
  keywords: ["Flying", "Haste"],
  tier: "vanilla",
};

export const SKYSCANNER: CardDefinition = {
  id: "skyscanner",
  name: "Skyscanner",
  scryfallId: "cab69fbd-0179-4b02-adba-71d2a0eeea5c",
  types: ["Artifact", "Creature"],
  subtypes: ["Thopter"],
  manaCost: { generic: 3, colors: {} },
  colorIdentity: [],
  power: 1,
  toughness: 1,
  keywords: ["Flying"],
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "draw", amount: 1 } }],
  tier: "scripted",
};

export const SKYSHROUD_FOREST: CardDefinition = {
  id: "skyshroud-forest",
  name: "Skyshroud Forest",
  scryfallId: "ba561609-406d-47c8-9d5b-1fb20ecac916",
  types: ["Land"],
  colorIdentity: ["G", "U"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 }, damageToController: 1 }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 }, damageToController: 1 }],
  tier: "vanilla",
};

export const SKYSHROUD_TROOPERS: CardDefinition = {
  id: "skyshroud-troopers",
  name: "Skyshroud Troopers",
  scryfallId: "d5197937-023c-412c-bf2c-b8e811ca04e1",
  types: ["Creature"],
  subtypes: ["Elf", "Druid", "Warrior"],
  manaCost: { generic: 3, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 3,
  toughness: 3,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "scripted",
};

export const SKYSNARE_SPIDER: CardDefinition = {
  id: "skysnare-spider",
  name: "Skysnare Spider",
  scryfallId: "ff737c53-9489-4a8c-8fa1-5d108222ae3f",
  types: ["Creature"],
  subtypes: ["Spider"],
  manaCost: { generic: 4, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 6,
  toughness: 6,
  keywords: ["Vigilance", "Reach"],
  tier: "vanilla",
};

export const SKYSPEAR_CAVALRY: CardDefinition = {
  id: "skyspear-cavalry",
  name: "Skyspear Cavalry",
  scryfallId: "c41a35c6-14d9-4b8f-88f1-f1442e4ef222",
  types: ["Creature"],
  subtypes: ["Human", "Soldier"],
  manaCost: { generic: 3, colors: { W: 2 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 2,
  keywords: ["Flying", "Double Strike"],
  tier: "vanilla",
};

export const SLIPPERY_BOGLE: CardDefinition = {
  id: "slippery-bogle",
  name: "Slippery Bogle",
  scryfallId: "c4e4bbea-7e3f-4de0-bb01-dfd67f21c254",
  types: ["Creature"],
  subtypes: ["Beast"],
  manaCost: { generic: 0, colors: {}, hybrid: [["G", "U"]] },
  colorIdentity: ["G", "U"],
  power: 1,
  toughness: 1,
  keywords: ["Hexproof"],
  tier: "vanilla",
};

export const SLIVER_CONSTRUCT: CardDefinition = {
  id: "sliver-construct",
  name: "Sliver Construct",
  scryfallId: "3129645a-221c-4eb5-88fd-12cc742a1dfe",
  types: ["Artifact", "Creature"],
  subtypes: ["Sliver", "Construct"],
  manaCost: { generic: 3, colors: {} },
  colorIdentity: [],
  power: 2,
  toughness: 2,
  tier: "vanilla",
};

export const SNARE_THOPTER: CardDefinition = {
  id: "snare-thopter",
  name: "Snare Thopter",
  scryfallId: "52b0ba0d-078e-4f54-81da-88f86227df4f",
  types: ["Artifact", "Creature"],
  subtypes: ["Thopter"],
  manaCost: { generic: 4, colors: {} },
  colorIdentity: [],
  power: 3,
  toughness: 2,
  keywords: ["Flying", "Haste"],
  tier: "vanilla",
};

export const SNOW_COVERED_ISLAND: CardDefinition = {
  id: "snow-covered-island",
  name: "Snow-Covered Island",
  scryfallId: "3bfa5ebc-5623-4eec-89ea-dc187489ee4a",
  types: ["Land"],
  subtypes: ["Island"],
  supertypes: ["Basic", "Snow"],
  colorIdentity: ["U"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }],
  tier: "vanilla",
};

export const SNOW_COVERED_MOUNTAIN: CardDefinition = {
  id: "snow-covered-mountain",
  name: "Snow-Covered Mountain",
  scryfallId: "5474e67c-628f-41b0-aa31-3d85a267265a",
  types: ["Land"],
  subtypes: ["Mountain"],
  supertypes: ["Basic", "Snow"],
  colorIdentity: ["R"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }],
  tier: "vanilla",
};

export const SNOW_COVERED_PLAINS: CardDefinition = {
  id: "snow-covered-plains",
  name: "Snow-Covered Plains",
  scryfallId: "afd2730f-878e-47ee-ad2a-73f8fa4e0794",
  types: ["Land"],
  subtypes: ["Plains"],
  supertypes: ["Basic", "Snow"],
  colorIdentity: ["W"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }],
  tier: "vanilla",
};

export const SNOWFIELD_SINKHOLE: CardDefinition = {
  id: "snowfield-sinkhole",
  name: "Snowfield Sinkhole",
  scryfallId: "3c6e17f2-b1e4-4189-a02f-92fa4b13a1ed",
  types: ["Land"],
  subtypes: ["Plains", "Swamp"],
  supertypes: ["Snow"],
  colorIdentity: ["B", "W"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }],
  tier: "vanilla",
};

export const SOCIAL_CLIMBER: CardDefinition = {
  id: "social-climber",
  name: "Social Climber",
  scryfallId: "a9fb74fd-767f-4dd4-822a-828d59f633ad",
  types: ["Creature"],
  subtypes: ["Human", "Druid"],
  manaCost: { generic: 2, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 3,
  toughness: 2,
  triggeredAbilities: [{ event: "permanent-enters", watches: "controller", watchFor: { type: "Creature" }, effect: { kind: "gainLife", amount: 1 } }],
  tier: "scripted",
};

export const SOKKA_WOLF_COVE_S_PROTECTOR: CardDefinition = {
  id: "sokka-wolf-coves-protector",
  name: "Sokka, Wolf Cove's Protector",
  scryfallId: "039cb105-f8f7-4d04-a137-34b13491ee9a",
  types: ["Creature"],
  subtypes: ["Human", "Warrior", "Ally"],
  supertypes: ["Legendary"],
  manaCost: { generic: 2, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 3,
  keywords: ["Vigilance"],
  canBeCommander: true,
  tier: "vanilla",
};

export const SOUL_S_ATTENDANT: CardDefinition = {
  id: "souls-attendant",
  name: "Soul's Attendant",
  scryfallId: "3223c0ac-cc22-4886-8919-11273b477cc7",
  types: ["Creature"],
  subtypes: ["Human", "Cleric"],
  manaCost: { generic: 0, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 1,
  triggeredAbilities: [{ event: "permanent-enters", watches: "any", watchFor: { type: "Creature" }, optional: true, effect: { kind: "gainLife", amount: 1 } }],
  tier: "scripted",
};

export const SOULBOUND_GUARDIANS: CardDefinition = {
  id: "soulbound-guardians",
  name: "Soulbound Guardians",
  scryfallId: "62e8128f-9858-4c48-ab43-1beca3db70e5",
  types: ["Creature"],
  subtypes: ["Kor", "Spirit"],
  manaCost: { generic: 4, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 4,
  toughness: 5,
  keywords: ["Defender", "Flying"],
  tier: "vanilla",
};

export const SOUTHERN_ELEPHANT: CardDefinition = {
  id: "southern-elephant",
  name: "Southern Elephant",
  scryfallId: "4554e25f-12e7-4b06-bd17-29fb340f2bb3",
  types: ["Creature"],
  subtypes: ["Elephant"],
  manaCost: { generic: 3, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 3,
  toughness: 4,
  tier: "vanilla",
};

export const SPECTATOR_SEATING: CardDefinition = {
  id: "spectator-seating",
  name: "Spectator Seating",
  scryfallId: "4c62dcfc-4bc8-4551-b3c7-9eec26be3362",
  types: ["Land"],
  colorIdentity: ["R", "W"],
  entersTapped: true,
  entersTappedUnless: { kind: "opponents", count: 2 },
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }],
  tier: "vanilla",
};

export const SPIKE_JESTER: CardDefinition = {
  id: "spike-jester",
  name: "Spike Jester",
  scryfallId: "7f82ff29-2b2c-4e4f-a6ac-e307e2921da0",
  types: ["Creature"],
  subtypes: ["Goblin", "Warrior"],
  manaCost: { generic: 0, colors: { B: 1, R: 1 } },
  colorIdentity: ["B", "R"],
  power: 3,
  toughness: 1,
  keywords: ["Haste"],
  tier: "vanilla",
};

export const SPIRE_GARDEN: CardDefinition = {
  id: "spire-garden",
  name: "Spire Garden",
  scryfallId: "48444c3e-2068-4961-a9cd-9398052e5bd6",
  types: ["Land"],
  colorIdentity: ["G", "R"],
  entersTapped: true,
  entersTappedUnless: { kind: "opponents", count: 2 },
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "vanilla",
};

export const SPIRITED_COMPANION: CardDefinition = {
  id: "spirited-companion",
  name: "Spirited Companion",
  scryfallId: "7e038684-c476-41db-a1b1-57c46e5b4c9a",
  types: ["Creature", "Enchantment"],
  subtypes: ["Dog"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 1,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "draw", amount: 1 } }],
  tier: "scripted",
};

export const SPORE_CRAWLER: CardDefinition = {
  id: "spore-crawler",
  name: "Spore Crawler",
  scryfallId: "a2a37c40-6d33-4e32-ab7b-4a7c2d10b757",
  types: ["Creature"],
  subtypes: ["Fungus"],
  manaCost: { generic: 2, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 3,
  toughness: 2,
  triggeredAbilities: [{ event: "dies", effect: { kind: "draw", amount: 1 } }],
  tier: "scripted",
};

export const SPOREMOUND: CardDefinition = {
  id: "sporemound",
  name: "Sporemound",
  scryfallId: "092bfc5f-8002-43da-8e70-c19fccfe54ac",
  types: ["Creature"],
  subtypes: ["Fungus"],
  manaCost: { generic: 3, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 3,
  toughness: 3,
  triggeredAbilities: [{ event: "landfall", watches: "controller", effect: { kind: "createToken", count: 1, tokenDefinitionId: "saproling-token" } }],
  tier: "scripted",
};

export const SPRINGMANE_CERVIN: CardDefinition = {
  id: "springmane-cervin",
  name: "Springmane Cervin",
  scryfallId: "f5b0eac4-0262-4eed-97d4-0f2e6f06c8e1",
  types: ["Creature"],
  subtypes: ["Elk"],
  manaCost: { generic: 2, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 3,
  toughness: 2,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 2 } }],
  tier: "scripted",
};

export const SPROUTING_THRINAX: CardDefinition = {
  id: "sprouting-thrinax",
  name: "Sprouting Thrinax",
  scryfallId: "41b05cf1-1bc2-43e1-b383-9cbb69517389",
  types: ["Creature"],
  subtypes: ["Lizard"],
  manaCost: { generic: 0, colors: { B: 1, G: 1, R: 1 } },
  colorIdentity: ["B", "G", "R"],
  power: 3,
  toughness: 3,
  triggeredAbilities: [{ event: "dies", effect: { kind: "createToken", count: 3, tokenDefinitionId: "saproling-token" } }],
  tier: "scripted",
};

export const STAMPEDING_RHINO: CardDefinition = {
  id: "stampeding-rhino",
  name: "Stampeding Rhino",
  scryfallId: "cd02ae80-4af6-4da1-ba3b-b56068c49785",
  types: ["Creature"],
  subtypes: ["Rhino"],
  manaCost: { generic: 4, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 4,
  toughness: 4,
  keywords: ["Trample"],
  tier: "vanilla",
};

export const STARK_INDUSTRIES: CardDefinition = {
  id: "stark-industries",
  name: "Stark Industries",
  scryfallId: "fe3609d8-71a2-49d9-a3fa-25e0906a1a0e",
  types: ["Land"],
  colorIdentity: ["R", "U"],
  entersTapped: true,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 1 } }],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }],
  tier: "scripted",
};

export const STARLIT_ANGEL: CardDefinition = {
  id: "starlit-angel",
  name: "Starlit Angel",
  scryfallId: "36691cd0-c709-4452-a61a-d6e2049fdfcf",
  types: ["Creature"],
  subtypes: ["Angel"],
  manaCost: { generic: 3, colors: { W: 2 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 4,
  keywords: ["Flying"],
  tier: "vanilla",
};

export const STEADFAST_GUARD: CardDefinition = {
  id: "steadfast-guard",
  name: "Steadfast Guard",
  scryfallId: "42a5c12b-c947-4a71-b54f-e310150858a3",
  types: ["Creature"],
  subtypes: ["Human", "Rebel"],
  manaCost: { generic: 0, colors: { W: 2 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 2,
  keywords: ["Vigilance"],
  tier: "vanilla",
};

export const STEAM_SPITTER: CardDefinition = {
  id: "steam-spitter",
  name: "Steam Spitter",
  scryfallId: "8aa585b7-cf7e-4f04-9490-1e6c53631647",
  types: ["Creature"],
  subtypes: ["Spider"],
  manaCost: { generic: 4, colors: { G: 1 } },
  colorIdentity: ["G", "R"],
  power: 1,
  toughness: 5,
  keywords: ["Reach"],
  activatedAbilities: [{ cost: { mana: { generic: 0, colors: { R: 1 } } }, effect: { kind: "pump", power: 1, toughness: 0 } }],
  tier: "scripted",
};

export const STEEL_WALL: CardDefinition = {
  id: "steel-wall",
  name: "Steel Wall",
  scryfallId: "43dc4ff6-c26c-4dba-ac7f-6dee7c9e5345",
  types: ["Artifact", "Creature"],
  subtypes: ["Wall"],
  manaCost: { generic: 1, colors: {} },
  colorIdentity: [],
  power: 0,
  toughness: 4,
  keywords: ["Defender"],
  tier: "vanilla",
};

export const STEEPLE_ROC: CardDefinition = {
  id: "steeple-roc",
  name: "Steeple Roc",
  scryfallId: "5fecafab-97f4-40ed-bc43-d186eb2f3af6",
  types: ["Creature"],
  subtypes: ["Bird"],
  manaCost: { generic: 4, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 1,
  keywords: ["Flying", "First Strike"],
  tier: "vanilla",
};

export const STEWARD_OF_VALERON: CardDefinition = {
  id: "steward-of-valeron",
  name: "Steward of Valeron",
  scryfallId: "237c62b7-7c0e-44bb-b420-d41aad2792a0",
  types: ["Creature"],
  subtypes: ["Human", "Druid", "Knight"],
  manaCost: { generic: 0, colors: { G: 1, W: 1 } },
  colorIdentity: ["G", "W"],
  power: 2,
  toughness: 2,
  keywords: ["Vigilance"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "scripted",
};

export const STONE_GOLEM: CardDefinition = {
  id: "stone-golem",
  name: "Stone Golem",
  scryfallId: "1b4de70a-729b-4566-b6f3-c76f551405a5",
  types: ["Artifact", "Creature"],
  subtypes: ["Golem"],
  manaCost: { generic: 5, colors: {} },
  colorIdentity: [],
  power: 4,
  toughness: 4,
  tier: "vanilla",
};

export const STONE_HAVEN_MEDIC: CardDefinition = {
  id: "stone-haven-medic",
  name: "Stone Haven Medic",
  scryfallId: "3956563b-bde3-4aec-93fe-e03bade49458",
  types: ["Creature"],
  subtypes: ["Kor", "Cleric"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 3,
  activatedAbilities: [{ cost: { tap: true, mana: { generic: 0, colors: { W: 1 } } }, effect: { kind: "gainLife", amount: 1 } }],
  tier: "scripted",
};

export const STONE_KAVU: CardDefinition = {
  id: "stone-kavu",
  name: "Stone Kavu",
  scryfallId: "36a1cdca-d48c-4936-ad6a-4610aeb991ce",
  types: ["Creature"],
  subtypes: ["Kavu"],
  manaCost: { generic: 4, colors: { G: 1 } },
  colorIdentity: ["G", "R", "W"],
  power: 3,
  toughness: 3,
  activatedAbilities: [{ cost: { mana: { generic: 0, colors: { R: 1 } } }, effect: { kind: "pump", power: 1, toughness: 0 } }, { cost: { mana: { generic: 0, colors: { W: 1 } } }, effect: { kind: "pump", power: 0, toughness: 1 } }],
  tier: "scripted",
};

export const STONE_QUARRY: CardDefinition = {
  id: "stone-quarry",
  name: "Stone Quarry",
  scryfallId: "aa3575e1-7d2c-4777-b469-16f7483bb8e7",
  types: ["Land"],
  colorIdentity: ["R", "W"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }],
  tier: "vanilla",
};

export const STONEWOOD_INVOKER: CardDefinition = {
  id: "stonewood-invoker",
  name: "Stonewood Invoker",
  scryfallId: "e4ea6aac-d42b-4522-b7a9-4c99ed9c14bd",
  types: ["Creature"],
  subtypes: ["Elf", "Mutant"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 2,
  toughness: 2,
  activatedAbilities: [{ cost: { mana: { generic: 7, colors: { G: 1 } } }, effect: { kind: "pump", power: 5, toughness: 5 } }],
  tier: "scripted",
};

export const STONEWORK_PUMA: CardDefinition = {
  id: "stonework-puma",
  name: "Stonework Puma",
  scryfallId: "35155ed9-35f4-4b20-8885-c72b8372fa1d",
  types: ["Artifact", "Creature"],
  subtypes: ["Cat", "Ally"],
  manaCost: { generic: 3, colors: {} },
  colorIdentity: [],
  power: 2,
  toughness: 2,
  tier: "vanilla",
};

export const STORMCARVED_COAST: CardDefinition = {
  id: "stormcarved-coast",
  name: "Stormcarved Coast",
  scryfallId: "bd3ae4fa-4c97-410a-8c0a-bd203342595d",
  types: ["Land"],
  colorIdentity: ["R", "U"],
  entersTapped: true,
  entersTappedUnless: { kind: "controls-other-lands", count: 2 },
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }],
  tier: "vanilla",
};

export const STREETBREAKER_WURM: CardDefinition = {
  id: "streetbreaker-wurm",
  name: "Streetbreaker Wurm",
  scryfallId: "d5313054-91a5-401c-84d1-03a2cd265060",
  types: ["Creature"],
  subtypes: ["Wurm"],
  manaCost: { generic: 3, colors: { G: 1, R: 1 } },
  colorIdentity: ["G", "R"],
  power: 6,
  toughness: 4,
  tier: "vanilla",
};

export const SUBMERGED_BONEYARD: CardDefinition = {
  id: "submerged-boneyard",
  name: "Submerged Boneyard",
  scryfallId: "8b949b06-210d-4658-97a6-43f54eb18b87",
  types: ["Land"],
  colorIdentity: ["B", "U"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }],
  tier: "vanilla",
};

export const SULFUR_FALLS: CardDefinition = {
  id: "sulfur-falls",
  name: "Sulfur Falls",
  scryfallId: "c762f475-7e58-4477-839b-b3c55434b88f",
  types: ["Land"],
  colorIdentity: ["R", "U"],
  entersTapped: true,
  entersTappedUnless: { kind: "controls-subtype", subtypes: ["Island", "Mountain"] },
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }],
  tier: "vanilla",
};

export const SULFUROUS_MIRE: CardDefinition = {
  id: "sulfurous-mire",
  name: "Sulfurous Mire",
  scryfallId: "35ebe245-ebb5-493c-b9c1-56fbfda9bd66",
  types: ["Land"],
  subtypes: ["Swamp", "Mountain"],
  supertypes: ["Snow"],
  colorIdentity: ["B", "R"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }],
  tier: "vanilla",
};

export const SULFUROUS_SPRINGS: CardDefinition = {
  id: "sulfurous-springs",
  name: "Sulfurous Springs",
  scryfallId: "eedb9df2-20d3-4cfd-8aed-336edc37d5a9",
  types: ["Land"],
  colorIdentity: ["B", "R"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 }, damageToController: 1 }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 }, damageToController: 1 }],
  tier: "vanilla",
};

export const SUMMIT_SENTINEL: CardDefinition = {
  id: "summit-sentinel",
  name: "Summit Sentinel",
  scryfallId: "81251057-f270-4f05-9dc5-205c70e1f295",
  types: ["Creature"],
  subtypes: ["Elemental", "Soldier"],
  manaCost: { generic: 1, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 1,
  toughness: 3,
  triggeredAbilities: [{ event: "dies", effect: { kind: "draw", amount: 1 } }],
  tier: "scripted",
};

export const SUN_SENTINEL: CardDefinition = {
  id: "sun-sentinel",
  name: "Sun Sentinel",
  scryfallId: "5cd0b4d6-9753-46a3-924c-2adf3dad2819",
  types: ["Creature"],
  subtypes: ["Human", "Soldier"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 2,
  keywords: ["Vigilance"],
  tier: "vanilla",
};

export const SUNASTIAN_FALCONER: CardDefinition = {
  id: "sunastian-falconer",
  name: "Sunastian Falconer",
  scryfallId: "bd0eb8b1-e48d-4e83-86df-d6aa86f95ffd",
  types: ["Creature"],
  subtypes: ["Human", "Shaman"],
  supertypes: ["Legendary"],
  manaCost: { generic: 3, colors: { G: 1, R: 1 } },
  colorIdentity: ["G", "R"],
  power: 4,
  toughness: 4,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 2 } }],
  canBeCommander: true,
  tier: "scripted",
};

export const SUNBLADE_ANGEL: CardDefinition = {
  id: "sunblade-angel",
  name: "Sunblade Angel",
  scryfallId: "407041c4-0154-42ee-a736-7815024d1719",
  types: ["Creature"],
  subtypes: ["Angel"],
  manaCost: { generic: 5, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 3,
  keywords: ["Flying", "First Strike", "Vigilance", "Lifelink"],
  tier: "vanilla",
};

export const SUNDIAL_DAWN_TYRANT: CardDefinition = {
  id: "sundial-dawn-tyrant",
  name: "Sundial, Dawn Tyrant",
  scryfallId: "b2e5435c-52f3-42d7-bcee-5aa13afd6626",
  types: ["Artifact", "Creature"],
  subtypes: ["Construct"],
  supertypes: ["Legendary"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 3,
  canBeCommander: true,
  tier: "vanilla",
};

export const SUNDOWN_PASS: CardDefinition = {
  id: "sundown-pass",
  name: "Sundown Pass",
  scryfallId: "b34000e9-ff20-4fb4-9d0b-03a172a92457",
  types: ["Land"],
  colorIdentity: ["R", "W"],
  entersTapped: true,
  entersTappedUnless: { kind: "controls-other-lands", count: 2 },
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }],
  tier: "vanilla",
};

export const SUNKEN_RUINS: CardDefinition = {
  id: "sunken-ruins",
  name: "Sunken Ruins",
  scryfallId: "9181d30d-4f8e-421f-89b8-149ed8000fb2",
  types: ["Land"],
  colorIdentity: ["B", "U"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 1 } }, { cost: { tap: true, mana: { generic: 0, colors: {}, hybrid: [["U", "B"]] } }, effect: { kind: "addManaCombination", mana: [{ color: "U", amount: 2 }] } }, { cost: { tap: true, mana: { generic: 0, colors: {}, hybrid: [["U", "B"]] } }, effect: { kind: "addManaCombination", mana: [{ color: "U", amount: 1 }, { color: "B", amount: 1 }] } }, { cost: { tap: true, mana: { generic: 0, colors: {}, hybrid: [["U", "B"]] } }, effect: { kind: "addManaCombination", mana: [{ color: "B", amount: 2 }] } }],
  tier: "vanilla",
};

export const SUNLIT_MARSH: CardDefinition = {
  id: "sunlit-marsh",
  name: "Sunlit Marsh",
  scryfallId: "fa447616-db24-4729-bf66-7f72aba0272d",
  types: ["Land"],
  subtypes: ["Plains", "Swamp"],
  colorIdentity: ["B", "W"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }],
  tier: "vanilla",
};

export const SUNPETAL_GROVE: CardDefinition = {
  id: "sunpetal-grove",
  name: "Sunpetal Grove",
  scryfallId: "e83092ee-4a90-4eac-915f-3fd01b7d9bd0",
  types: ["Land"],
  colorIdentity: ["G", "W"],
  entersTapped: true,
  entersTappedUnless: { kind: "controls-subtype", subtypes: ["Forest", "Plains"] },
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }],
  tier: "vanilla",
};

export const SUNSPIRE_GRIFFIN: CardDefinition = {
  id: "sunspire-griffin",
  name: "Sunspire Griffin",
  scryfallId: "1388ce6e-8199-46c1-8ee3-71266b0929bf",
  types: ["Creature"],
  subtypes: ["Griffin"],
  manaCost: { generic: 1, colors: { W: 2 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 3,
  keywords: ["Flying"],
  tier: "vanilla",
};

export const SURVEILLING_SPRITE: CardDefinition = {
  id: "surveilling-sprite",
  name: "Surveilling Sprite",
  scryfallId: "97265692-3b45-47f4-9e9f-e78751240007",
  types: ["Creature"],
  subtypes: ["Faerie", "Rogue"],
  manaCost: { generic: 1, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 1,
  toughness: 1,
  keywords: ["Flying"],
  triggeredAbilities: [{ event: "dies", optional: true, effect: { kind: "draw", amount: 1 } }],
  tier: "scripted",
};

export const SWIFTBLADE_VINDICATOR: CardDefinition = {
  id: "swiftblade-vindicator",
  name: "Swiftblade Vindicator",
  scryfallId: "f94618ec-000c-4371-b925-05ff82bfe221",
  types: ["Creature"],
  subtypes: ["Human", "Soldier"],
  manaCost: { generic: 0, colors: { R: 1, W: 1 } },
  colorIdentity: ["R", "W"],
  power: 1,
  toughness: 1,
  keywords: ["Double Strike", "Vigilance", "Trample"],
  tier: "vanilla",
};

export const SWIFTWATER_CLIFFS: CardDefinition = {
  id: "swiftwater-cliffs",
  name: "Swiftwater Cliffs",
  scryfallId: "ca53fb19-b8ca-485b-af1a-5117ae54bfe3",
  types: ["Land"],
  colorIdentity: ["R", "U"],
  entersTapped: true,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 1 } }],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }],
  tier: "scripted",
};

export const SWOOPING_LOOKOUT: CardDefinition = {
  id: "swooping-lookout",
  name: "Swooping Lookout",
  scryfallId: "b62c740d-260d-4dfa-b6b3-9a1527538f89",
  types: ["Artifact", "Creature"],
  subtypes: ["Phyrexian", "Construct"],
  manaCost: { generic: 0, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 2,
  keywords: ["Flying", "Vigilance"],
  tier: "vanilla",
};

export const SYLVAN_CARYATID: CardDefinition = {
  id: "sylvan-caryatid",
  name: "Sylvan Caryatid",
  scryfallId: "2662837c-3837-4da9-80b4-79edb0b6c289",
  types: ["Creature"],
  subtypes: ["Plant"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 0,
  toughness: 3,
  keywords: ["Defender", "Hexproof"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "scripted",
};

export const SYLVOK_EXPLORER: CardDefinition = {
  id: "sylvok-explorer",
  name: "Sylvok Explorer",
  scryfallId: "3881e40f-5d10-4461-aa88-11ba33e5d510",
  types: ["Creature"],
  subtypes: ["Human", "Druid"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 1,
  toughness: 1,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 }, colorFrom: "opponent-lands" }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 }, colorFrom: "opponent-lands" }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 }, colorFrom: "opponent-lands" }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 }, colorFrom: "opponent-lands" }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 }, colorFrom: "opponent-lands" }],
  tier: "scripted",
};

export const SYMBIOTIC_BEAST: CardDefinition = {
  id: "symbiotic-beast",
  name: "Symbiotic Beast",
  scryfallId: "cf013aa4-76d6-4378-8916-d10f591f225a",
  types: ["Creature"],
  subtypes: ["Insect", "Beast"],
  manaCost: { generic: 4, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 4,
  toughness: 4,
  triggeredAbilities: [{ event: "dies", effect: { kind: "createToken", count: 4, tokenDefinitionId: "token-g-11-insect" } }],
  tier: "scripted",
};

export const SYMBIOTIC_ELF: CardDefinition = {
  id: "symbiotic-elf",
  name: "Symbiotic Elf",
  scryfallId: "8e552d26-d203-4040-ba11-d01d65f038a4",
  types: ["Creature"],
  subtypes: ["Elf"],
  manaCost: { generic: 3, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 2,
  toughness: 2,
  triggeredAbilities: [{ event: "dies", effect: { kind: "createToken", count: 2, tokenDefinitionId: "token-g-11-insect" } }],
  tier: "scripted",
};

export const SYMBIOTIC_WURM: CardDefinition = {
  id: "symbiotic-wurm",
  name: "Symbiotic Wurm",
  scryfallId: "e0671bd0-5d81-4c15-869c-1c61d66fa767",
  types: ["Creature"],
  subtypes: ["Wurm"],
  manaCost: { generic: 5, colors: { G: 3 } },
  colorIdentity: ["G"],
  power: 7,
  toughness: 7,
  triggeredAbilities: [{ event: "dies", effect: { kind: "createToken", count: 7, tokenDefinitionId: "token-g-11-insect" } }],
  tier: "scripted",
};

export const TCRI_BUILDING: CardDefinition = {
  id: "tcri-building",
  name: "TCRI Building",
  scryfallId: "8817a1d6-ef39-4e7c-8277-74aea012803b",
  types: ["Land"],
  colorIdentity: ["R", "U"],
  entersTapped: true,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 1 } }],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }],
  tier: "scripted",
};

export const TAIGA: CardDefinition = {
  id: "taiga",
  name: "Taiga",
  scryfallId: "0c2c39fc-b564-4ab5-833c-ff029760b7a7",
  types: ["Land"],
  subtypes: ["Mountain", "Forest"],
  colorIdentity: ["G", "R"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "vanilla",
};

export const TAINTED_FIELD: CardDefinition = {
  id: "tainted-field",
  name: "Tainted Field",
  scryfallId: "c6eeab6f-a738-4005-91c2-a5f81df5c569",
  types: ["Land"],
  colorIdentity: ["B", "W"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 }, activateOnlyIf: { kind: "controls-subtype", subtypes: ["Swamp"] } }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 }, activateOnlyIf: { kind: "controls-subtype", subtypes: ["Swamp"] } }],
  tier: "vanilla",
};

export const TAINTED_ISLE: CardDefinition = {
  id: "tainted-isle",
  name: "Tainted Isle",
  scryfallId: "70e8e7e2-e9ea-4358-805e-c5110c8d8443",
  types: ["Land"],
  colorIdentity: ["B", "U"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 }, activateOnlyIf: { kind: "controls-subtype", subtypes: ["Swamp"] } }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 }, activateOnlyIf: { kind: "controls-subtype", subtypes: ["Swamp"] } }],
  tier: "vanilla",
};

export const TAINTED_PEAK: CardDefinition = {
  id: "tainted-peak",
  name: "Tainted Peak",
  scryfallId: "7e6f1a55-0fec-4b94-9640-9110ca8d0212",
  types: ["Land"],
  colorIdentity: ["B", "R"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 }, activateOnlyIf: { kind: "controls-subtype", subtypes: ["Swamp"] } }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 }, activateOnlyIf: { kind: "controls-subtype", subtypes: ["Swamp"] } }],
  tier: "vanilla",
};

export const TAJURU_BLIGHTBLADE: CardDefinition = {
  id: "tajuru-blightblade",
  name: "Tajuru Blightblade",
  scryfallId: "7f3d6020-6767-406c-bf28-6b3e9ae72f50",
  types: ["Creature"],
  subtypes: ["Elf", "Rogue"],
  manaCost: { generic: 0, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 1,
  toughness: 1,
  keywords: ["Deathtouch"],
  tier: "vanilla",
};

export const TAJURU_PATHWARDEN: CardDefinition = {
  id: "tajuru-pathwarden",
  name: "Tajuru Pathwarden",
  scryfallId: "da20a0d3-2022-4dea-84c8-85adc5a974f8",
  types: ["Creature"],
  subtypes: ["Elf", "Warrior", "Ally"],
  manaCost: { generic: 4, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 5,
  toughness: 4,
  keywords: ["Vigilance", "Trample"],
  tier: "vanilla",
};

export const TAJURU_SNARECASTER: CardDefinition = {
  id: "tajuru-snarecaster",
  name: "Tajuru Snarecaster",
  scryfallId: "e1894cf9-7d53-4b7e-aaae-8db42bdd8e49",
  types: ["Creature"],
  subtypes: ["Elf", "Rogue"],
  manaCost: { generic: 2, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 1,
  toughness: 4,
  keywords: ["Reach"],
  tier: "vanilla",
};

export const TALISMAN_OF_CONVICTION: CardDefinition = {
  id: "talisman-of-conviction",
  name: "Talisman of Conviction",
  scryfallId: "a365885c-f7d9-4ea1-9125-5265055e5570",
  types: ["Artifact"],
  manaCost: { generic: 2, colors: {} },
  colorIdentity: ["R", "W"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 }, damageToController: 1 }, { cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 }, damageToController: 1 }],
  tier: "vanilla",
};

export const TALISMAN_OF_CREATIVITY: CardDefinition = {
  id: "talisman-of-creativity",
  name: "Talisman of Creativity",
  scryfallId: "3ed13229-bbbb-41a7-933e-8975a6b64226",
  types: ["Artifact"],
  manaCost: { generic: 2, colors: {} },
  colorIdentity: ["R", "U"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 }, damageToController: 1 }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 }, damageToController: 1 }],
  tier: "vanilla",
};

export const TALISMAN_OF_CURIOSITY: CardDefinition = {
  id: "talisman-of-curiosity",
  name: "Talisman of Curiosity",
  scryfallId: "8388c4e8-bda1-47e5-8df2-ddec5babcaf9",
  types: ["Artifact"],
  manaCost: { generic: 2, colors: {} },
  colorIdentity: ["G", "U"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 }, damageToController: 1 }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 }, damageToController: 1 }],
  tier: "vanilla",
};

export const TALISMAN_OF_DOMINANCE: CardDefinition = {
  id: "talisman-of-dominance",
  name: "Talisman of Dominance",
  scryfallId: "00d4a1d4-b86a-4c05-9ecc-130e011e0486",
  types: ["Artifact"],
  manaCost: { generic: 2, colors: {} },
  colorIdentity: ["B", "U"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 }, damageToController: 1 }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 }, damageToController: 1 }],
  tier: "vanilla",
};

export const TALISMAN_OF_HIERARCHY: CardDefinition = {
  id: "talisman-of-hierarchy",
  name: "Talisman of Hierarchy",
  scryfallId: "0c959368-2f58-48de-b7a5-2bab408652b5",
  types: ["Artifact"],
  manaCost: { generic: 2, colors: {} },
  colorIdentity: ["B", "W"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 }, damageToController: 1 }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 }, damageToController: 1 }],
  tier: "vanilla",
};

export const TALISMAN_OF_IMPULSE: CardDefinition = {
  id: "talisman-of-impulse",
  name: "Talisman of Impulse",
  scryfallId: "5135919f-7b10-4a2e-a98a-83ed1347ad36",
  types: ["Artifact"],
  manaCost: { generic: 2, colors: {} },
  colorIdentity: ["G", "R"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 }, damageToController: 1 }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 }, damageToController: 1 }],
  tier: "vanilla",
};

export const TALISMAN_OF_INDULGENCE: CardDefinition = {
  id: "talisman-of-indulgence",
  name: "Talisman of Indulgence",
  scryfallId: "ccacf88d-407d-465d-958a-1389b7d700e6",
  types: ["Artifact"],
  manaCost: { generic: 2, colors: {} },
  colorIdentity: ["B", "R"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 }, damageToController: 1 }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 }, damageToController: 1 }],
  tier: "vanilla",
};

export const TALISMAN_OF_PROGRESS: CardDefinition = {
  id: "talisman-of-progress",
  name: "Talisman of Progress",
  scryfallId: "b356ee36-1c62-4097-87d7-fef6a6dad067",
  types: ["Artifact"],
  manaCost: { generic: 2, colors: {} },
  colorIdentity: ["U", "W"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 }, damageToController: 1 }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 }, damageToController: 1 }],
  tier: "vanilla",
};

export const TALISMAN_OF_RESILIENCE: CardDefinition = {
  id: "talisman-of-resilience",
  name: "Talisman of Resilience",
  scryfallId: "eff598b0-0b32-41d0-b980-584576e58626",
  types: ["Artifact"],
  manaCost: { generic: 2, colors: {} },
  colorIdentity: ["B", "G"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 }, damageToController: 1 }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 }, damageToController: 1 }],
  tier: "vanilla",
};

export const TALISMAN_OF_UNITY: CardDefinition = {
  id: "talisman-of-unity",
  name: "Talisman of Unity",
  scryfallId: "89e8443d-daf4-4cef-9080-d7568b5c540e",
  types: ["Artifact"],
  manaCost: { generic: 2, colors: {} },
  colorIdentity: ["G", "W"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 }, damageToController: 1 }, { cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 }, damageToController: 1 }],
  tier: "vanilla",
};

export const TALON_TROOPER: CardDefinition = {
  id: "talon-trooper",
  name: "Talon Trooper",
  scryfallId: "0ec07bce-abf0-4387-bb9f-a9ba5492c754",
  types: ["Creature"],
  subtypes: ["Bird", "Scout"],
  manaCost: { generic: 1, colors: { U: 1, W: 1 } },
  colorIdentity: ["U", "W"],
  power: 2,
  toughness: 3,
  keywords: ["Flying"],
  tier: "vanilla",
};

export const TANGLE_MANTIS: CardDefinition = {
  id: "tangle-mantis",
  name: "Tangle Mantis",
  scryfallId: "c0e4d333-78f7-4710-9b26-36e285c0d9f8",
  types: ["Creature"],
  subtypes: ["Insect"],
  manaCost: { generic: 2, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 3,
  toughness: 4,
  keywords: ["Trample"],
  tier: "vanilla",
};

export const TANGLEBLOOM: CardDefinition = {
  id: "tanglebloom",
  name: "Tanglebloom",
  scryfallId: "eb8ff237-dac6-4c79-9d8c-b047d60083e8",
  types: ["Artifact"],
  manaCost: { generic: 1, colors: {} },
  colorIdentity: [],
  activatedAbilities: [{ cost: { tap: true, mana: { generic: 1, colors: {} } }, effect: { kind: "gainLife", amount: 1 } }],
  tier: "vanilla",
};

export const TANGLED_ISLET: CardDefinition = {
  id: "tangled-islet",
  name: "Tangled Islet",
  scryfallId: "bb1920f1-aab3-4066-8be9-029102886d03",
  types: ["Land"],
  subtypes: ["Forest", "Island"],
  colorIdentity: ["G", "U"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }],
  tier: "vanilla",
};

export const TARNISHED_CITADEL: CardDefinition = {
  id: "tarnished-citadel",
  name: "Tarnished Citadel",
  scryfallId: "30375d24-ccfe-47a2-babd-1bda0a6298fe",
  types: ["Land"],
  colorIdentity: [],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 }, damageToController: 3 }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 }, damageToController: 3 }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 }, damageToController: 3 }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 }, damageToController: 3 }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 }, damageToController: 3 }],
  tier: "vanilla",
};

export const TARPAN: CardDefinition = {
  id: "tarpan",
  name: "Tarpan",
  scryfallId: "d2160d57-9ebf-43fb-811f-0c014e417ea0",
  types: ["Creature"],
  subtypes: ["Horse"],
  manaCost: { generic: 0, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 1,
  toughness: 1,
  triggeredAbilities: [{ event: "dies", effect: { kind: "gainLife", amount: 1 } }],
  tier: "scripted",
};

export const TEETERPEAK_AMBUSHER: CardDefinition = {
  id: "teeterpeak-ambusher",
  name: "Teeterpeak Ambusher",
  scryfallId: "ad57c2f3-d9cb-4165-bb39-897b5b12689e",
  types: ["Creature"],
  subtypes: ["Goblin", "Warrior"],
  manaCost: { generic: 1, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 1,
  toughness: 3,
  activatedAbilities: [{ cost: { mana: { generic: 2, colors: { R: 1 } } }, effect: { kind: "pump", power: 2, toughness: 0 } }],
  tier: "scripted",
};

export const TEMPEST_DRAKE: CardDefinition = {
  id: "tempest-drake",
  name: "Tempest Drake",
  scryfallId: "54aa5262-d0d9-4b4a-8027-00393568b3df",
  types: ["Creature"],
  subtypes: ["Drake"],
  manaCost: { generic: 1, colors: { U: 1, W: 1 } },
  colorIdentity: ["U", "W"],
  power: 2,
  toughness: 2,
  keywords: ["Flying", "Vigilance"],
  tier: "vanilla",
};

export const TEMPLE_ACOLYTE: CardDefinition = {
  id: "temple-acolyte",
  name: "Temple Acolyte",
  scryfallId: "e73c5d46-128d-4ab6-901a-6102686a1b22",
  types: ["Creature"],
  subtypes: ["Human", "Cleric"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 3,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 3 } }],
  tier: "scripted",
};

export const TEROH_S_FAITHFUL: CardDefinition = {
  id: "terohs-faithful",
  name: "Teroh's Faithful",
  scryfallId: "ce1de3e4-d6b5-4c91-858c-94d62e69d1c7",
  types: ["Creature"],
  subtypes: ["Human", "Cleric"],
  manaCost: { generic: 3, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 4,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 4 } }],
  tier: "scripted",
};

export const TERRIAN_WORLD_TYRANT: CardDefinition = {
  id: "terrian-world-tyrant",
  name: "Terrian, World Tyrant",
  scryfallId: "b44255cf-5264-4ead-9de0-20cc0f7cac6f",
  types: ["Creature"],
  subtypes: ["Dinosaur", "Ooze"],
  supertypes: ["Legendary"],
  manaCost: { generic: 2, colors: { G: 3 } },
  colorIdentity: ["G"],
  power: 9,
  toughness: 7,
  canBeCommander: true,
  tier: "vanilla",
};

export const TERRITORIAL_SCYTHECAT: CardDefinition = {
  id: "territorial-scythecat",
  name: "Territorial Scythecat",
  scryfallId: "5e0f725c-8d1f-47ff-ad81-a5007199a5e2",
  types: ["Creature"],
  subtypes: ["Cat"],
  manaCost: { generic: 2, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 2,
  toughness: 1,
  keywords: ["Trample"],
  triggeredAbilities: [{ event: "landfall", watches: "controller", effect: { kind: "addCounter", amount: 1 } }],
  tier: "scripted",
};

export const THE_FABULOUS_FROG_MAN: CardDefinition = {
  id: "the-fabulous-frog-man",
  name: "The Fabulous Frog-Man",
  scryfallId: "9307100e-2d7e-42a9-9951-24af01ab9ded",
  types: ["Creature"],
  subtypes: ["Human", "Hero"],
  supertypes: ["Legendary"],
  manaCost: { generic: 2, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 3,
  toughness: 3,
  keywords: ["Reach"],
  canBeCommander: true,
  tier: "vanilla",
};

export const THE_LADY_OF_THE_MOUNTAIN: CardDefinition = {
  id: "the-lady-of-the-mountain",
  name: "The Lady of the Mountain",
  scryfallId: "70802e74-c292-446f-aa9a-dd32454a4b3d",
  types: ["Creature"],
  subtypes: ["Giant"],
  supertypes: ["Legendary"],
  manaCost: { generic: 4, colors: { G: 1, R: 1 } },
  colorIdentity: ["G", "R"],
  power: 5,
  toughness: 5,
  canBeCommander: true,
  tier: "vanilla",
};

export const THE_WHIZZER_CLASSIC_SPEEDSTER: CardDefinition = {
  id: "the-whizzer-classic-speedster",
  name: "The Whizzer, Classic Speedster",
  scryfallId: "77134e93-4c03-476b-ab60-d8fb48f7a74f",
  types: ["Creature"],
  subtypes: ["Human", "Hero"],
  supertypes: ["Legendary"],
  manaCost: { generic: 3, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 3,
  toughness: 3,
  keywords: ["First Strike", "Haste"],
  canBeCommander: true,
  tier: "vanilla",
};

export const THORNSPIRE_VERGE: CardDefinition = {
  id: "thornspire-verge",
  name: "Thornspire Verge",
  scryfallId: "7e1cdc03-6faa-4138-9a52-caafbe34fb59",
  types: ["Land"],
  colorIdentity: ["G", "R"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 }, activateOnlyIf: { kind: "controls-subtype", subtypes: ["Mountain", "Forest"] } }],
  tier: "vanilla",
};

export const THORNWEALD_ARCHER: CardDefinition = {
  id: "thornweald-archer",
  name: "Thornweald Archer",
  scryfallId: "189f6199-f2fe-49a5-89ca-3c4cb39fbf2b",
  types: ["Creature"],
  subtypes: ["Elf", "Archer"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 2,
  toughness: 1,
  keywords: ["Reach", "Deathtouch"],
  tier: "vanilla",
};

export const THORNWOOD_FALLS: CardDefinition = {
  id: "thornwood-falls",
  name: "Thornwood Falls",
  scryfallId: "ebb502c2-5fd0-46a9-b77d-010f4a942056",
  types: ["Land"],
  colorIdentity: ["G", "U"],
  entersTapped: true,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 1 } }],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }],
  tier: "scripted",
};

export const THREE_TREE_ROOTWEAVER: CardDefinition = {
  id: "three-tree-rootweaver",
  name: "Three Tree Rootweaver",
  scryfallId: "d1ab6e14-26e0-4174-b5c6-bc0f5c26b177",
  types: ["Creature"],
  subtypes: ["Mole", "Druid"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 1,
  toughness: 3,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "scripted",
};

export const THUNDER_SPIRIT: CardDefinition = {
  id: "thunder-spirit",
  name: "Thunder Spirit",
  scryfallId: "f8508542-53ea-4c1b-ae6f-b446c42149ca",
  types: ["Creature"],
  subtypes: ["Elemental", "Spirit"],
  manaCost: { generic: 1, colors: { W: 2 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 2,
  keywords: ["Flying", "First Strike"],
  tier: "vanilla",
};

export const THUNDERING_GIANT: CardDefinition = {
  id: "thundering-giant",
  name: "Thundering Giant",
  scryfallId: "ddbcc6e9-b5f4-4f20-9c15-b690b4f64304",
  types: ["Creature"],
  subtypes: ["Giant"],
  manaCost: { generic: 3, colors: { R: 2 } },
  colorIdentity: ["R"],
  power: 4,
  toughness: 3,
  keywords: ["Haste"],
  tier: "vanilla",
};

export const TIDEHOLLOW_STRIX: CardDefinition = {
  id: "tidehollow-strix",
  name: "Tidehollow Strix",
  scryfallId: "17be4a4e-5f11-4c3e-b447-9feb5ccbc448",
  types: ["Artifact", "Creature"],
  subtypes: ["Bird"],
  manaCost: { generic: 0, colors: { B: 1, U: 1 } },
  colorIdentity: ["B", "U"],
  power: 2,
  toughness: 1,
  keywords: ["Flying", "Deathtouch"],
  tier: "vanilla",
};

export const TIGEREYE_CAMEO: CardDefinition = {
  id: "tigereye-cameo",
  name: "Tigereye Cameo",
  scryfallId: "25976da8-338d-4f46-b8ea-78a0aa3daa35",
  types: ["Artifact"],
  manaCost: { generic: 3, colors: {} },
  colorIdentity: ["G", "W"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }],
  tier: "vanilla",
};

export const TIMBER_GORGE: CardDefinition = {
  id: "timber-gorge",
  name: "Timber Gorge",
  scryfallId: "07076412-18fe-4e15-bdb5-17111b4a66db",
  types: ["Land"],
  colorIdentity: ["G", "R"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "vanilla",
};

export const TIRELESS_MISSIONARIES: CardDefinition = {
  id: "tireless-missionaries",
  name: "Tireless Missionaries",
  scryfallId: "c47b7386-168f-4b8e-9a26-9da6d697a501",
  types: ["Creature"],
  subtypes: ["Human", "Cleric"],
  manaCost: { generic: 4, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 3,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 3 } }],
  tier: "scripted",
};

export const TOBIAS_ANDRION: CardDefinition = {
  id: "tobias-andrion",
  name: "Tobias Andrion",
  scryfallId: "9469a9b3-430c-43b1-bede-80e6949fd895",
  types: ["Creature"],
  subtypes: ["Human", "Advisor"],
  supertypes: ["Legendary"],
  manaCost: { generic: 3, colors: { U: 1, W: 1 } },
  colorIdentity: ["U", "W"],
  power: 4,
  toughness: 4,
  canBeCommander: true,
  tier: "vanilla",
};

export const TORCH_DRAKE: CardDefinition = {
  id: "torch-drake",
  name: "Torch Drake",
  scryfallId: "0beff896-df7a-42b3-aaca-0b9ca1b8cf0c",
  types: ["Creature"],
  subtypes: ["Drake"],
  manaCost: { generic: 3, colors: { U: 1 } },
  colorIdentity: ["R", "U"],
  power: 2,
  toughness: 2,
  keywords: ["Flying"],
  activatedAbilities: [{ cost: { mana: { generic: 1, colors: { R: 1 } } }, effect: { kind: "pump", power: 1, toughness: 0 } }],
  tier: "scripted",
};

export const TORSTEN_VON_URSUS: CardDefinition = {
  id: "torsten-von-ursus",
  name: "Torsten Von Ursus",
  scryfallId: "e6687f36-dccf-499b-938d-0da3f442f635",
  types: ["Creature"],
  subtypes: ["Human", "Soldier"],
  supertypes: ["Legendary"],
  manaCost: { generic: 3, colors: { G: 2, W: 1 } },
  colorIdentity: ["G", "W"],
  power: 5,
  toughness: 5,
  canBeCommander: true,
  tier: "vanilla",
};

export const TOWER_DRAKE: CardDefinition = {
  id: "tower-drake",
  name: "Tower Drake",
  scryfallId: "5d759d6f-daf0-47f4-8a35-81c9d6437495",
  types: ["Creature"],
  subtypes: ["Drake"],
  manaCost: { generic: 2, colors: { U: 1 } },
  colorIdentity: ["U", "W"],
  power: 2,
  toughness: 1,
  keywords: ["Flying"],
  activatedAbilities: [{ cost: { mana: { generic: 0, colors: { W: 1 } } }, effect: { kind: "pump", power: 0, toughness: 1 } }],
  tier: "scripted",
};

export const TOWER_GARGOYLE: CardDefinition = {
  id: "tower-gargoyle",
  name: "Tower Gargoyle",
  scryfallId: "55aef108-6aaf-465d-b3f6-5ac1499f44a3",
  types: ["Artifact", "Creature"],
  subtypes: ["Gargoyle"],
  manaCost: { generic: 1, colors: { B: 1, U: 1, W: 1 } },
  colorIdentity: ["B", "U", "W"],
  power: 4,
  toughness: 4,
  keywords: ["Flying"],
  tier: "vanilla",
};

export const TOWER_OF_EONS: CardDefinition = {
  id: "tower-of-eons",
  name: "Tower of Eons",
  scryfallId: "0eb67150-53e4-4164-bea5-dd3659469b8e",
  types: ["Artifact"],
  manaCost: { generic: 4, colors: {} },
  colorIdentity: [],
  activatedAbilities: [{ cost: { tap: true, mana: { generic: 8, colors: {} } }, effect: { kind: "gainLife", amount: 10 } }],
  tier: "vanilla",
};

export const TRAINED_ARMODON: CardDefinition = {
  id: "trained-armodon",
  name: "Trained Armodon",
  scryfallId: "b55e0487-3abb-4f2b-b34c-d6ad49164e73",
  types: ["Creature"],
  subtypes: ["Elephant"],
  manaCost: { generic: 1, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 3,
  toughness: 3,
  tier: "vanilla",
};

export const TRAINED_CARACAL: CardDefinition = {
  id: "trained-caracal",
  name: "Trained Caracal",
  scryfallId: "797e45d1-d17d-40c0-bfdf-ec533784e676",
  types: ["Creature"],
  subtypes: ["Cat"],
  manaCost: { generic: 0, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 1,
  keywords: ["Lifelink"],
  tier: "vanilla",
};

export const TRAINING_CENTER: CardDefinition = {
  id: "training-center",
  name: "Training Center",
  scryfallId: "78a39d22-5e3b-4ba0-b728-dbf16b61fc8f",
  types: ["Land"],
  colorIdentity: ["R", "U"],
  entersTapped: true,
  entersTappedUnless: { kind: "opponents", count: 2 },
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }],
  tier: "vanilla",
};

export const TRANQUIL_COVE: CardDefinition = {
  id: "tranquil-cove",
  name: "Tranquil Cove",
  scryfallId: "1c4efa6c-4f29-41cd-a728-bf0e479ace05",
  types: ["Land"],
  colorIdentity: ["U", "W"],
  entersTapped: true,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 1 } }],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }],
  tier: "scripted",
};

export const TRANQUIL_EXPANSE: CardDefinition = {
  id: "tranquil-expanse",
  name: "Tranquil Expanse",
  scryfallId: "123cd67f-7226-4e69-8637-382380fb213e",
  types: ["Land"],
  colorIdentity: ["G", "W"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }],
  tier: "vanilla",
};

export const TREE_MONKEY: CardDefinition = {
  id: "tree-monkey",
  name: "Tree Monkey",
  scryfallId: "4724d00a-b93b-43fd-9c86-56f127db450b",
  types: ["Creature"],
  subtypes: ["Monkey"],
  manaCost: { generic: 0, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 1,
  toughness: 1,
  keywords: ["Reach"],
  tier: "vanilla",
};

export const TREETOP_FREEDOM_FIGHTERS: CardDefinition = {
  id: "treetop-freedom-fighters",
  name: "Treetop Freedom Fighters",
  scryfallId: "a9394200-7ffc-440f-8b5f-c08b7930133c",
  types: ["Creature"],
  subtypes: ["Human", "Rebel", "Ally"],
  manaCost: { generic: 2, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 2,
  toughness: 1,
  keywords: ["Haste"],
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-w-11-ally" } }],
  tier: "scripted",
};

export const TRENO_DARK_CITY: CardDefinition = {
  id: "treno-dark-city",
  name: "Treno, Dark City",
  scryfallId: "f6285535-bc44-4274-a886-b14d7c7aaba8",
  types: ["Land"],
  subtypes: ["Town"],
  colorIdentity: ["B", "U"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }],
  tier: "vanilla",
};

export const TRESSERHORN_SINKS: CardDefinition = {
  id: "tresserhorn-sinks",
  name: "Tresserhorn Sinks",
  scryfallId: "4bd8fe2c-2297-4e19-8a87-01eb99b8c6dc",
  types: ["Land"],
  supertypes: ["Snow"],
  colorIdentity: ["B", "R"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }],
  tier: "vanilla",
};

export const TROKIN_HIGH_GUARD: CardDefinition = {
  id: "trokin-high-guard",
  name: "Trokin High Guard",
  scryfallId: "9c2b9302-fca6-43ca-a01c-03aec51acd0d",
  types: ["Creature"],
  subtypes: ["Human", "Knight"],
  manaCost: { generic: 3, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 3,
  tier: "vanilla",
};

export const TROLL_HORN_CAMEO: CardDefinition = {
  id: "troll-horn-cameo",
  name: "Troll-Horn Cameo",
  scryfallId: "42b1ca6c-6ca0-4b02-885a-58cee3fa2aa8",
  types: ["Artifact"],
  manaCost: { generic: 3, colors: {} },
  colorIdentity: ["G", "R"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "vanilla",
};

export const TROPICAL_ISLAND: CardDefinition = {
  id: "tropical-island",
  name: "Tropical Island",
  scryfallId: "47033ba4-8f26-4a6b-97bd-5b366327325e",
  types: ["Land"],
  subtypes: ["Forest", "Island"],
  colorIdentity: ["G", "U"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }],
  tier: "vanilla",
};

export const TUKATONGUE_THALLID: CardDefinition = {
  id: "tukatongue-thallid",
  name: "Tukatongue Thallid",
  scryfallId: "e870e12e-feed-46e1-ac3c-3b6687780825",
  types: ["Creature"],
  subtypes: ["Fungus"],
  manaCost: { generic: 0, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 1,
  toughness: 1,
  triggeredAbilities: [{ event: "dies", effect: { kind: "createToken", count: 1, tokenDefinitionId: "saproling-token" } }],
  tier: "scripted",
};

export const TUNDRA: CardDefinition = {
  id: "tundra",
  name: "Tundra",
  scryfallId: "efd35cb4-862d-4699-a197-b744989b3ceb",
  types: ["Land"],
  subtypes: ["Plains", "Island"],
  colorIdentity: ["U", "W"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }],
  tier: "vanilla",
};

export const TUNDRA_WALL: CardDefinition = {
  id: "tundra-wall",
  name: "Tundra Wall",
  scryfallId: "49ae7f36-4b37-415e-ab39-5fa1e3f2e3e9",
  types: ["Creature"],
  subtypes: ["Wall"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 0,
  toughness: 4,
  keywords: ["Defender"],
  tier: "vanilla",
};

export const TWIN_SILK_SPIDER: CardDefinition = {
  id: "twin-silk-spider",
  name: "Twin-Silk Spider",
  scryfallId: "7cf3188c-879b-4b18-88b4-6237d7162271",
  types: ["Creature"],
  subtypes: ["Spider"],
  manaCost: { generic: 2, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 1,
  toughness: 2,
  keywords: ["Reach"],
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-g-12-spider-reach" } }],
  tier: "scripted",
};

export const TWINBLADE_ASSASSINS: CardDefinition = {
  id: "twinblade-assassins",
  name: "Twinblade Assassins",
  scryfallId: "f353281a-0e56-448f-b41a-beb3949c5f11",
  types: ["Creature"],
  subtypes: ["Elf", "Assassin"],
  manaCost: { generic: 3, colors: { B: 1, G: 1 } },
  colorIdentity: ["B", "G"],
  power: 5,
  toughness: 4,
  triggeredAbilities: [{ event: "end-step", watches: "controller", onlyIf: { kind: "creature-died-this-turn" }, effect: { kind: "draw", amount: 1 } }],
  tier: "scripted",
};

export const TWO_HEADED_CERBERUS: CardDefinition = {
  id: "two-headed-cerberus",
  name: "Two-Headed Cerberus",
  scryfallId: "f8d2f75c-ef2a-4d30-86d1-c47307fc47ac",
  types: ["Creature"],
  subtypes: ["Dog"],
  manaCost: { generic: 1, colors: { R: 2 } },
  colorIdentity: ["R"],
  power: 1,
  toughness: 2,
  keywords: ["Double Strike"],
  tier: "vanilla",
};

export const TWO_HEADED_HELLKITE: CardDefinition = {
  id: "two-headed-hellkite",
  name: "Two-Headed Hellkite",
  scryfallId: "8d5cf3a1-2228-4143-b07d-de082380b5e7",
  types: ["Creature"],
  subtypes: ["Dragon"],
  manaCost: { generic: 1, colors: { B: 1, G: 1, R: 1, U: 1, W: 1 } },
  colorIdentity: ["B", "G", "R", "U", "W"],
  power: 5,
  toughness: 5,
  keywords: ["Flying", "Menace", "Haste"],
  triggeredAbilities: [{ event: "attacks", effect: { kind: "draw", amount: 2 } }],
  tier: "scripted",
};

export const TYROX_SAURID_TYRANT: CardDefinition = {
  id: "tyrox-saurid-tyrant",
  name: "Tyrox, Saurid Tyrant",
  scryfallId: "159dc5a8-5cba-4c20-8c07-28a3d86c8411",
  types: ["Creature"],
  subtypes: ["Dinosaur", "Warrior"],
  supertypes: ["Legendary"],
  manaCost: { generic: 1, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 4,
  toughness: 1,
  canBeCommander: true,
  tier: "vanilla",
};

export const UNDERGROUND_RIVER: CardDefinition = {
  id: "underground-river",
  name: "Underground River",
  scryfallId: "5e50c8d5-6b22-4fc6-87ea-3d7d77ced17f",
  types: ["Land"],
  colorIdentity: ["B", "U"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 }, damageToController: 1 }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 }, damageToController: 1 }],
  tier: "vanilla",
};

export const UNDERGROUND_SEA: CardDefinition = {
  id: "underground-sea",
  name: "Underground Sea",
  scryfallId: "26cee543-6eab-494e-a803-33a5d48d7d74",
  types: ["Land"],
  subtypes: ["Island", "Swamp"],
  colorIdentity: ["B", "U"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }],
  tier: "vanilla",
};

export const UNMAKE: CardDefinition = {
  id: "unmake",
  name: "Unmake",
  scryfallId: "6d0dea1b-43dc-4e76-aabd-f12e121a78af",
  types: ["Instant"],
  manaCost: { generic: 0, colors: {}, hybrid: [["W", "B"], ["W", "B"], ["W", "B"]] },
  colorIdentity: ["B", "W"],
  castEffect: { kind: "exile", target: { kind: "creature" } },
  tier: "scripted",
};

export const URBIS_PROTECTOR: CardDefinition = {
  id: "urbis-protector",
  name: "Urbis Protector",
  scryfallId: "8771abc9-e1f2-4d4f-8492-3209866cdc05",
  types: ["Creature"],
  subtypes: ["Human", "Cleric"],
  manaCost: { generic: 4, colors: { W: 2 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 1,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-w-44-angel-flying" } }],
  tier: "scripted",
};

export const URBORG_ELF: CardDefinition = {
  id: "urborg-elf",
  name: "Urborg Elf",
  scryfallId: "1d8521bf-d026-4d26-831e-a2f253307c93",
  types: ["Creature"],
  subtypes: ["Elf", "Druid"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["B", "G", "U"],
  power: 1,
  toughness: 1,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }],
  tier: "scripted",
};

export const URBORG_VOLCANO: CardDefinition = {
  id: "urborg-volcano",
  name: "Urborg Volcano",
  scryfallId: "c69f6612-c974-4723-925e-afd4211c76db",
  types: ["Land"],
  colorIdentity: ["B", "R"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }],
  tier: "vanilla",
};

export const UTOPIA_TREE: CardDefinition = {
  id: "utopia-tree",
  name: "Utopia Tree",
  scryfallId: "49bed540-da8d-4148-8794-8e8d01ed5387",
  types: ["Creature"],
  subtypes: ["Plant"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 0,
  toughness: 2,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "scripted",
};

export const VALOROUS_STEED: CardDefinition = {
  id: "valorous-steed",
  name: "Valorous Steed",
  scryfallId: "aa01cb8c-f080-456b-a91a-f1d7943a70b2",
  types: ["Creature"],
  subtypes: ["Unicorn"],
  manaCost: { generic: 4, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 3,
  keywords: ["Vigilance"],
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-w-22-knight-vigilance" } }],
  tier: "scripted",
};

export const VASSAL_SOUL: CardDefinition = {
  id: "vassal-soul",
  name: "Vassal Soul",
  scryfallId: "dfc61748-029f-4bae-a7ec-e08b7059226d",
  types: ["Creature"],
  subtypes: ["Spirit"],
  manaCost: { generic: 1, colors: {}, hybrid: [["W", "U"], ["W", "U"]] },
  colorIdentity: ["U", "W"],
  power: 2,
  toughness: 2,
  keywords: ["Flying"],
  tier: "vanilla",
};

export const VASTWOOD_GORGER: CardDefinition = {
  id: "vastwood-gorger",
  name: "Vastwood Gorger",
  scryfallId: "72f53dc9-5397-49e1-97d4-3b0b6858f2b2",
  types: ["Creature"],
  subtypes: ["Wurm"],
  manaCost: { generic: 5, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 5,
  toughness: 6,
  tier: "vanilla",
};

export const VAULT_OF_CHAMPIONS: CardDefinition = {
  id: "vault-of-champions",
  name: "Vault of Champions",
  scryfallId: "cafd7db6-b04e-4fa2-bccd-981211132a93",
  types: ["Land"],
  colorIdentity: ["B", "W"],
  entersTapped: true,
  entersTappedUnless: { kind: "opponents", count: 2 },
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }],
  tier: "vanilla",
};

export const VECTOR_IMPERIAL_CAPITAL: CardDefinition = {
  id: "vector-imperial-capital",
  name: "Vector, Imperial Capital",
  scryfallId: "10e5648e-4884-41e3-95f8-c76f6bca01e2",
  types: ["Land"],
  subtypes: ["Town"],
  colorIdentity: ["B", "R"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }],
  tier: "vanilla",
};

export const VENOMTHROPE: CardDefinition = {
  id: "venomthrope",
  name: "Venomthrope",
  scryfallId: "e2284a8a-caf3-4eef-8cd2-6b2f507e7154",
  types: ["Creature"],
  subtypes: ["Tyranid"],
  manaCost: { generic: 1, colors: { G: 1, U: 1 } },
  colorIdentity: ["G", "U"],
  power: 2,
  toughness: 2,
  keywords: ["Flying", "Deathtouch", "Hexproof"],
  tier: "vanilla",
};

export const VENSER_S_SLIVER: CardDefinition = {
  id: "vensers-sliver",
  name: "Venser's Sliver",
  scryfallId: "1e3c5a64-453b-4477-853a-9514ba326f16",
  types: ["Artifact", "Creature"],
  subtypes: ["Sliver"],
  manaCost: { generic: 5, colors: {} },
  colorIdentity: [],
  power: 3,
  toughness: 3,
  tier: "vanilla",
};

export const VERDANT_FORCE: CardDefinition = {
  id: "verdant-force",
  name: "Verdant Force",
  scryfallId: "1d972f97-1945-440b-8bd3-63038db22257",
  types: ["Creature"],
  subtypes: ["Elemental"],
  manaCost: { generic: 5, colors: { G: 3 } },
  colorIdentity: ["G"],
  power: 7,
  toughness: 7,
  triggeredAbilities: [{ event: "upkeep", watches: "any", effect: { kind: "createToken", count: 1, tokenDefinitionId: "saproling-token" } }],
  tier: "scripted",
};

export const VERNADI_SHIELDMATE: CardDefinition = {
  id: "vernadi-shieldmate",
  name: "Vernadi Shieldmate",
  scryfallId: "9c6742b5-f951-47c2-b836-360626b80ab0",
  types: ["Creature"],
  subtypes: ["Human", "Soldier"],
  manaCost: { generic: 1, colors: {}, hybrid: [["G", "W"]] },
  colorIdentity: ["G", "W"],
  power: 2,
  toughness: 2,
  keywords: ["Vigilance"],
  tier: "vanilla",
};

export const VIASHINO_WARRIOR: CardDefinition = {
  id: "viashino-warrior",
  name: "Viashino Warrior",
  scryfallId: "bb467271-898f-4bcd-8533-e8165b318b43",
  types: ["Creature"],
  subtypes: ["Lizard", "Warrior"],
  manaCost: { generic: 3, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 4,
  toughness: 2,
  tier: "vanilla",
};

export const VIASHIVAN_DRAGON: CardDefinition = {
  id: "viashivan-dragon",
  name: "Viashivan Dragon",
  scryfallId: "7172ef0b-ca9e-47cf-8ec6-2d8cb18f2283",
  types: ["Creature"],
  subtypes: ["Dragon"],
  manaCost: { generic: 2, colors: { G: 2, R: 2 } },
  colorIdentity: ["G", "R"],
  power: 4,
  toughness: 4,
  keywords: ["Flying"],
  activatedAbilities: [{ cost: { mana: { generic: 0, colors: { R: 1 } } }, effect: { kind: "pump", power: 1, toughness: 0 } }, { cost: { mana: { generic: 0, colors: { G: 1 } } }, effect: { kind: "pump", power: 0, toughness: 1 } }],
  tier: "scripted",
};

export const VIGILANT_BALOTH: CardDefinition = {
  id: "vigilant-baloth",
  name: "Vigilant Baloth",
  scryfallId: "34ad8e5d-0c26-4588-8161-b22197715d63",
  types: ["Creature"],
  subtypes: ["Beast"],
  manaCost: { generic: 3, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 5,
  toughness: 5,
  keywords: ["Vigilance"],
  tier: "vanilla",
};

export const VINE_TRELLIS: CardDefinition = {
  id: "vine-trellis",
  name: "Vine Trellis",
  scryfallId: "4683fa31-da33-4313-82b5-0ed91f33e8d3",
  types: ["Creature"],
  subtypes: ["Plant", "Wall"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 0,
  toughness: 4,
  keywords: ["Defender"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "scripted",
};

export const VINELASHER_KUDZU: CardDefinition = {
  id: "vinelasher-kudzu",
  name: "Vinelasher Kudzu",
  scryfallId: "bcae0517-f7d1-4b67-9ca3-608f2d8a70f9",
  types: ["Creature"],
  subtypes: ["Plant"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 1,
  toughness: 1,
  triggeredAbilities: [{ event: "landfall", watches: "controller", effect: { kind: "addCounter", amount: 1 } }],
  tier: "scripted",
};

export const VIZKOPA_VAMPIRE: CardDefinition = {
  id: "vizkopa-vampire",
  name: "Vizkopa Vampire",
  scryfallId: "3b4404a1-b1ab-4a11-98b0-fe3b6723fcb8",
  types: ["Creature"],
  subtypes: ["Vampire"],
  manaCost: { generic: 2, colors: {}, hybrid: [["W", "B"]] },
  colorIdentity: ["B", "W"],
  power: 3,
  toughness: 1,
  keywords: ["Lifelink"],
  tier: "vanilla",
};

export const VOICE_OF_THE_PROVINCES: CardDefinition = {
  id: "voice-of-the-provinces",
  name: "Voice of the Provinces",
  scryfallId: "30a78066-c52e-48fd-bcf9-d0b60f00fddc",
  types: ["Creature"],
  subtypes: ["Angel"],
  manaCost: { generic: 4, colors: { W: 2 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 3,
  keywords: ["Flying"],
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-w-11-human" } }],
  tier: "scripted",
};

export const VOICELESS_SPIRIT: CardDefinition = {
  id: "voiceless-spirit",
  name: "Voiceless Spirit",
  scryfallId: "d24d9bd7-5721-4436-a86f-35e376727f46",
  types: ["Creature"],
  subtypes: ["Spirit"],
  manaCost: { generic: 2, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 1,
  keywords: ["Flying", "First Strike"],
  tier: "vanilla",
};

export const VOLATILE_FJORD: CardDefinition = {
  id: "volatile-fjord",
  name: "Volatile Fjord",
  scryfallId: "f2392fbb-d9c4-4688-b99c-4e7614c60c12",
  types: ["Land"],
  subtypes: ["Island", "Mountain"],
  supertypes: ["Snow"],
  colorIdentity: ["R", "U"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }],
  tier: "vanilla",
};

export const VOLCANIC_ISLAND: CardDefinition = {
  id: "volcanic-island",
  name: "Volcanic Island",
  scryfallId: "2f607e7e-30c0-45e9-8f61-bf6e9fe63f2b",
  types: ["Land"],
  subtypes: ["Island", "Mountain"],
  colorIdentity: ["R", "U"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }],
  tier: "vanilla",
};

export const WAKANDAN_SHIELD_GUARD: CardDefinition = {
  id: "wakandan-shield-guard",
  name: "Wakandan Shield Guard",
  scryfallId: "47eba4f9-8276-4367-8ff5-53a066e8c729",
  types: ["Creature"],
  subtypes: ["Human", "Soldier"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 1,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "createToken", count: 1, tokenDefinitionId: "soldier-token" } }],
  tier: "scripted",
};

export const WAKEDANCER: CardDefinition = {
  id: "wakedancer",
  name: "Wakedancer",
  scryfallId: "e85a5833-042b-4b13-8151-f9e4bcf8e810",
  types: ["Creature"],
  subtypes: ["Human", "Shaman"],
  manaCost: { generic: 2, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 2,
  toughness: 2,
  triggeredAbilities: [{ event: "enters-battlefield", onlyIf: { kind: "creature-died-this-turn" }, effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-b-22-zombie" } }],
  tier: "scripted",
};

export const WALL_OF_BLOSSOMS: CardDefinition = {
  id: "wall-of-blossoms",
  name: "Wall of Blossoms",
  scryfallId: "df901113-e273-4fe0-a264-8e9e26e70905",
  types: ["Creature"],
  subtypes: ["Plant", "Wall"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 0,
  toughness: 4,
  keywords: ["Defender"],
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "draw", amount: 1 } }],
  tier: "scripted",
};

export const WALL_OF_OMENS: CardDefinition = {
  id: "wall-of-omens",
  name: "Wall of Omens",
  scryfallId: "3d134bb2-17ec-4e65-976e-f06fa983f3fb",
  types: ["Creature"],
  subtypes: ["Wall"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 0,
  toughness: 4,
  keywords: ["Defender"],
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "draw", amount: 1 } }],
  tier: "scripted",
};

export const WALL_OF_SPEARS: CardDefinition = {
  id: "wall-of-spears",
  name: "Wall of Spears",
  scryfallId: "b4f34f06-7f89-4f2b-8979-8219ac1c4560",
  types: ["Artifact", "Creature"],
  subtypes: ["Wall"],
  manaCost: { generic: 3, colors: {} },
  colorIdentity: [],
  power: 2,
  toughness: 3,
  keywords: ["Defender", "First Strike"],
  tier: "vanilla",
};

export const WALL_OF_SWORDS: CardDefinition = {
  id: "wall-of-swords",
  name: "Wall of Swords",
  scryfallId: "7c733fef-8372-4a40-b340-7aa32922799e",
  types: ["Creature"],
  subtypes: ["Wall"],
  manaCost: { generic: 3, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 5,
  keywords: ["Defender", "Flying"],
  tier: "vanilla",
};

export const WAR_MAMMOTH: CardDefinition = {
  id: "war-mammoth",
  name: "War Mammoth",
  scryfallId: "7e892859-81cc-461a-a79f-39af43dbfb4f",
  types: ["Creature"],
  subtypes: ["Elephant"],
  manaCost: { generic: 3, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 3,
  toughness: 3,
  keywords: ["Trample"],
  tier: "vanilla",
};

export const WARCLAMP_MASTIFF: CardDefinition = {
  id: "warclamp-mastiff",
  name: "Warclamp Mastiff",
  scryfallId: "102e48e0-8a5f-499d-ac62-005d3c075ef3",
  types: ["Creature"],
  subtypes: ["Dog"],
  manaCost: { generic: 0, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 1,
  keywords: ["First Strike"],
  tier: "vanilla",
};

export const WARDEN_OF_GEOMETRIES: CardDefinition = {
  id: "warden-of-geometries",
  name: "Warden of Geometries",
  scryfallId: "c7f517b9-ac10-4710-8ef1-ced1253d5ecf",
  types: ["Creature"],
  subtypes: ["Eldrazi", "Drone"],
  manaCost: { generic: 4, colors: {} },
  colorIdentity: [],
  power: 2,
  toughness: 3,
  keywords: ["Vigilance"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 1 } }],
  tier: "scripted",
};

export const WASP_LANCER: CardDefinition = {
  id: "wasp-lancer",
  name: "Wasp Lancer",
  scryfallId: "ac48a4ff-433b-4fd0-b0d1-43b188ee81b6",
  types: ["Creature"],
  subtypes: ["Faerie", "Soldier"],
  manaCost: { generic: 0, colors: {}, hybrid: [["U", "B"], ["U", "B"], ["U", "B"]] },
  colorIdentity: ["B", "U"],
  power: 3,
  toughness: 2,
  keywords: ["Flying"],
  tier: "vanilla",
};

export const WATCHFUL_GIANT: CardDefinition = {
  id: "watchful-giant",
  name: "Watchful Giant",
  scryfallId: "61a38f24-1eb3-4914-be1f-0b5f6d4b09d5",
  types: ["Creature"],
  subtypes: ["Giant", "Soldier"],
  manaCost: { generic: 5, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 6,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-w-11-human" } }],
  tier: "scripted",
};

export const WATCHWOLF: CardDefinition = {
  id: "watchwolf",
  name: "Watchwolf",
  scryfallId: "682af5e9-26b5-4f88-99e1-ab2aa34fba86",
  types: ["Creature"],
  subtypes: ["Wolf"],
  manaCost: { generic: 0, colors: { G: 1, W: 1 } },
  colorIdentity: ["G", "W"],
  power: 3,
  toughness: 3,
  tier: "vanilla",
};

export const WEAVER_OF_CURRENTS: CardDefinition = {
  id: "weaver-of-currents",
  name: "Weaver of Currents",
  scryfallId: "dac35181-baae-4c50-b397-a10b234833e5",
  types: ["Creature"],
  subtypes: ["Snake", "Druid"],
  manaCost: { generic: 1, colors: { G: 1, U: 1 } },
  colorIdentity: ["G", "U"],
  power: 2,
  toughness: 2,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 2 } }],
  tier: "scripted",
};

export const WICKER_WITCH: CardDefinition = {
  id: "wicker-witch",
  name: "Wicker Witch",
  scryfallId: "ae115587-012d-40ff-a20d-270fabf2f8c6",
  types: ["Artifact", "Creature"],
  subtypes: ["Scarecrow"],
  manaCost: { generic: 3, colors: {} },
  colorIdentity: [],
  power: 3,
  toughness: 1,
  tier: "vanilla",
};

export const WILLOWRUSH_VERGE: CardDefinition = {
  id: "willowrush-verge",
  name: "Willowrush Verge",
  scryfallId: "758d93d5-3f66-4395-a928-000485396c87",
  types: ["Land"],
  colorIdentity: ["G", "U"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 }, activateOnlyIf: { kind: "controls-subtype", subtypes: ["Forest", "Island"] } }],
  tier: "vanilla",
};

export const WILT_LEAF_CAVALIERS: CardDefinition = {
  id: "wilt-leaf-cavaliers",
  name: "Wilt-Leaf Cavaliers",
  scryfallId: "c161772e-d8b1-4ca6-8971-dd46c96fb0f7",
  types: ["Creature"],
  subtypes: ["Elf", "Knight"],
  manaCost: { generic: 0, colors: {}, hybrid: [["G", "W"], ["G", "W"], ["G", "W"]] },
  colorIdentity: ["G", "W"],
  power: 3,
  toughness: 4,
  keywords: ["Vigilance"],
  tier: "vanilla",
};

export const WIND_SCARRED_CRAG: CardDefinition = {
  id: "wind-scarred-crag",
  name: "Wind-Scarred Crag",
  scryfallId: "4912e4d0-b16a-4aa6-a583-3430d26bd591",
  types: ["Land"],
  colorIdentity: ["R", "W"],
  entersTapped: true,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 1 } }],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }],
  tier: "scripted",
};

export const WINDURST_FEDERATION_CENTER: CardDefinition = {
  id: "windurst-federation-center",
  name: "Windurst, Federation Center",
  scryfallId: "c74024bd-b383-468d-9cf5-d112a29f6457",
  types: ["Land"],
  subtypes: ["Town"],
  colorIdentity: ["G", "W"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }],
  tier: "vanilla",
};

export const WIREWOOD_ELF: CardDefinition = {
  id: "wirewood-elf",
  name: "Wirewood Elf",
  scryfallId: "10a34e31-97f1-40e8-9d91-a8139af7f096",
  types: ["Creature"],
  subtypes: ["Elf", "Druid"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 1,
  toughness: 2,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "scripted",
};

export const WISTFUL_SELKIE: CardDefinition = {
  id: "wistful-selkie",
  name: "Wistful Selkie",
  scryfallId: "fb74a444-0f77-4369-95db-666be769bfc9",
  types: ["Creature"],
  subtypes: ["Merfolk", "Wizard"],
  manaCost: { generic: 0, colors: {}, hybrid: [["G", "U"], ["G", "U"], ["G", "U"]] },
  colorIdentity: ["G", "U"],
  power: 2,
  toughness: 2,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "draw", amount: 1 } }],
  tier: "scripted",
};

export const WOODED_BASTION: CardDefinition = {
  id: "wooded-bastion",
  name: "Wooded Bastion",
  scryfallId: "36b591ec-0231-4b91-a132-eb3aedfdf8fa",
  types: ["Land"],
  colorIdentity: ["G", "W"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 1 } }, { cost: { tap: true, mana: { generic: 0, colors: {}, hybrid: [["G", "W"]] } }, effect: { kind: "addManaCombination", mana: [{ color: "G", amount: 2 }] } }, { cost: { tap: true, mana: { generic: 0, colors: {}, hybrid: [["G", "W"]] } }, effect: { kind: "addManaCombination", mana: [{ color: "G", amount: 1 }, { color: "W", amount: 1 }] } }, { cost: { tap: true, mana: { generic: 0, colors: {}, hybrid: [["G", "W"]] } }, effect: { kind: "addManaCombination", mana: [{ color: "W", amount: 2 }] } }],
  tier: "vanilla",
};

export const WOODED_RIDGELINE: CardDefinition = {
  id: "wooded-ridgeline",
  name: "Wooded Ridgeline",
  scryfallId: "e8e31184-dca4-48b1-be9d-581247c41d99",
  types: ["Land"],
  subtypes: ["Mountain", "Forest"],
  colorIdentity: ["G", "R"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "vanilla",
};

export const WOODLAND_DRUID: CardDefinition = {
  id: "woodland-druid",
  name: "Woodland Druid",
  scryfallId: "34e501e6-38da-44ad-abe2-53ea7f0eb4ae",
  types: ["Creature"],
  subtypes: ["Human", "Druid"],
  manaCost: { generic: 0, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 1,
  toughness: 2,
  tier: "vanilla",
};

export const WOODLAND_MYSTIC: CardDefinition = {
  id: "woodland-mystic",
  name: "Woodland Mystic",
  scryfallId: "2d6117cf-5cb3-41f3-8756-c01b5e9c760e",
  types: ["Creature"],
  subtypes: ["Elf", "Druid"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 1,
  toughness: 1,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "scripted",
};

export const WOODLAND_STREAM: CardDefinition = {
  id: "woodland-stream",
  name: "Woodland Stream",
  scryfallId: "77619840-963f-4ff7-9a42-b36e3d53646d",
  types: ["Land"],
  colorIdentity: ["G", "U"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }],
  tier: "vanilla",
};

export const WOOLLY_THOCTAR: CardDefinition = {
  id: "woolly-thoctar",
  name: "Woolly Thoctar",
  scryfallId: "cf7188d8-d37f-49ec-ab52-8ea080725ca7",
  types: ["Creature"],
  subtypes: ["Beast"],
  manaCost: { generic: 0, colors: { G: 1, R: 1, W: 1 } },
  colorIdentity: ["G", "R", "W"],
  power: 5,
  toughness: 4,
  tier: "vanilla",
};

export const WRECKING_CREW: CardDefinition = {
  id: "wrecking-crew",
  name: "Wrecking Crew",
  scryfallId: "92691507-b1ce-40d0-87e7-b79e81370511",
  types: ["Creature"],
  subtypes: ["Human", "Warrior"],
  manaCost: { generic: 4, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 4,
  toughness: 5,
  keywords: ["Reach", "Trample"],
  tier: "vanilla",
};

export const WRIGGLING_GRUB: CardDefinition = {
  id: "wriggling-grub",
  name: "Wriggling Grub",
  scryfallId: "e02aa086-13b2-42cf-acf4-086ba406e886",
  types: ["Creature"],
  subtypes: ["Worm"],
  manaCost: { generic: 1, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 1,
  toughness: 1,
  triggeredAbilities: [{ event: "dies", effect: { kind: "createToken", count: 2, tokenDefinitionId: "token-bg-11-worm" } }],
  tier: "scripted",
};

export const YARGLE_GLUTTON_OF_URBORG: CardDefinition = {
  id: "yargle-glutton-of-urborg",
  name: "Yargle, Glutton of Urborg",
  scryfallId: "8febc0fe-c52d-4b6a-9d18-e1e4a43b6dc3",
  types: ["Creature"],
  subtypes: ["Frog", "Spirit"],
  supertypes: ["Legendary"],
  manaCost: { generic: 4, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 9,
  toughness: 3,
  canBeCommander: true,
  tier: "vanilla",
};

export const YAVIMAYA_COAST: CardDefinition = {
  id: "yavimaya-coast",
  name: "Yavimaya Coast",
  scryfallId: "f4c1500b-1f4c-4d33-810c-25e3bb0a4666",
  types: ["Land"],
  colorIdentity: ["G", "U"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 }, damageToController: 1 }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 }, damageToController: 1 }],
  tier: "vanilla",
};

export const YAVIMAYA_SAPHERD: CardDefinition = {
  id: "yavimaya-sapherd",
  name: "Yavimaya Sapherd",
  scryfallId: "5ef6b657-7273-4abe-92f4-e1e4cda78f96",
  types: ["Creature"],
  subtypes: ["Fungus"],
  manaCost: { generic: 2, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 2,
  toughness: 2,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "createToken", count: 1, tokenDefinitionId: "saproling-token" } }],
  tier: "scripted",
};

export const YAVIMAYA_WURM: CardDefinition = {
  id: "yavimaya-wurm",
  name: "Yavimaya Wurm",
  scryfallId: "4516b135-3691-4be5-ab73-91fbdc6b24b6",
  types: ["Creature"],
  subtypes: ["Wurm"],
  manaCost: { generic: 4, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 6,
  toughness: 4,
  keywords: ["Trample"],
  tier: "vanilla",
};

export const YOTIAN_MEDIC: CardDefinition = {
  id: "yotian-medic",
  name: "Yotian Medic",
  scryfallId: "f21b9c48-6eca-4677-961b-614f5ec594ce",
  types: ["Creature"],
  subtypes: ["Human", "Cleric", "Soldier"],
  manaCost: { generic: 2, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 4,
  keywords: ["Lifelink"],
  tier: "vanilla",
};

export const YOTIAN_SOLDIER: CardDefinition = {
  id: "yotian-soldier",
  name: "Yotian Soldier",
  scryfallId: "9e71190b-c96c-4aea-9696-780c69eff395",
  types: ["Artifact", "Creature"],
  subtypes: ["Soldier"],
  manaCost: { generic: 3, colors: {} },
  colorIdentity: [],
  power: 1,
  toughness: 4,
  keywords: ["Vigilance"],
  tier: "vanilla",
};

export const YOUTHFUL_SCHOLAR: CardDefinition = {
  id: "youthful-scholar",
  name: "Youthful Scholar",
  scryfallId: "43ae8147-bf25-44f9-b75f-837b81ebe0de",
  types: ["Creature"],
  subtypes: ["Human", "Wizard"],
  manaCost: { generic: 3, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 2,
  toughness: 2,
  triggeredAbilities: [{ event: "dies", effect: { kind: "draw", amount: 2 } }],
  tier: "scripted",
};

export const ZARICHI_TIGER: CardDefinition = {
  id: "zarichi-tiger",
  name: "Zarichi Tiger",
  scryfallId: "7bf5efe4-d9a0-4704-b5ba-3213c946df37",
  types: ["Creature"],
  subtypes: ["Cat"],
  manaCost: { generic: 3, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 3,
  activatedAbilities: [{ cost: { tap: true, mana: { generic: 1, colors: { W: 1 } } }, effect: { kind: "gainLife", amount: 2 } }],
  tier: "scripted",
};

export const ZENDIKAR_S_ROIL: CardDefinition = {
  id: "zendikars-roil",
  name: "Zendikar's Roil",
  scryfallId: "60297593-2438-48d7-9414-48af114a93d2",
  types: ["Enchantment"],
  manaCost: { generic: 3, colors: { G: 2 } },
  colorIdentity: ["G"],
  triggeredAbilities: [{ event: "landfall", watches: "controller", effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-g-22-elemental" } }],
  tier: "scripted",
};

export const ZETALPA_PRIMAL_DAWN: CardDefinition = {
  id: "zetalpa-primal-dawn",
  name: "Zetalpa, Primal Dawn",
  scryfallId: "78c71a23-8e73-406e-bbd0-4474c17c1d04",
  types: ["Creature"],
  subtypes: ["Elder", "Dinosaur"],
  supertypes: ["Legendary"],
  manaCost: { generic: 6, colors: { W: 2 } },
  colorIdentity: ["W"],
  power: 4,
  toughness: 8,
  keywords: ["Flying", "Double Strike", "Vigilance", "Trample", "Indestructible"],
  canBeCommander: true,
  tier: "vanilla",
};

export const ZHAO_THE_SEETHING_FLAME: CardDefinition = {
  id: "zhao-the-seething-flame",
  name: "Zhao, the Seething Flame",
  scryfallId: "f3fa493e-b58a-4b77-88e8-b8890eefb2b7",
  types: ["Creature"],
  subtypes: ["Human", "Soldier"],
  supertypes: ["Legendary"],
  manaCost: { generic: 4, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 5,
  toughness: 5,
  keywords: ["Menace"],
  canBeCommander: true,
  tier: "vanilla",
};

export const SAVAGE_LANDS: CardDefinition = {
  id: "savage-lands",
  name: "Savage Lands",
  scryfallId: "428df1ff-e13e-48a3-bcc9-301bdc9470fb",
  types: ["Land"],
  colorIdentity: ["B", "G", "R"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "vanilla",
};

/** Everything above, for the registry in testCards.ts. */
export const GENERATED_CARD_DEFINITIONS: CardDefinition[] = [
  SAVAGE_LANDS,
  TOKEN_B_21_VILLAIN_MENACE,
  TOKEN_G_11_ELF_WARRIOR,
  TOKEN_G_55_WURM_TRAMPLE,
  TOKEN_G_44_BEAR,
  TOKEN_W_11_HUMAN_WARRIOR,
  TOKEN_G_33_BOAR,
  TOKEN_R_44_DRAGON_FLYING,
  TOKEN_R_11_PHYREXIAN_GOBLIN,
  TOKEN_W_11_HUMAN,
  TOKEN_GW_22_ELF_KNIGHT_VIGILANCE,
  TOKEN_G_33_DINOSAUR_TRAMPLE,
  TOKEN_W_11_HUMAN_SOLDIER,
  TOKEN_W_01_GOAT,
  TOKEN_B_22_ZOMBIE,
  TOKEN_W_11_SPIRIT_FLYING,
  TOKEN_WB_11_INKLING_FLYING,
  TOKEN_BR_11_GOBLIN,
  TOKEN_G_22_WOLF,
  TOKEN_W_11_BIRD_FLYING,
  TOKEN_W_22_KNIGHT_VIGILANCE,
  TOKEN_W_33_KNIGHT,
  TOKEN_W_11_RABBIT,
  TOKEN_W_11_SOLDIER_LIFELINK,
  TOKEN_BG_11_INSECT_FLYING,
  TOKEN_U_11_MERFOLK_HEXPROOF,
  TOKEN_G_01_PLANT,
  TOKEN_WU_22_KNIGHT_VIGILANCE,
  TOKEN_W_11_ALLY,
  TOKEN_GW_11_HUMAN_CITIZEN,
  TOKEN_B_21_CAT,
  TOKEN_B_33_KAVU,
  TOKEN_B_24_SPIDER_REACH,
  TOKEN_B_66_WURM_TRAMPLE,
  TOKEN_UR_11_ELEMENTAL,
  TOKEN_G_44_BEAST,
  TOKEN_W_33_BIRD_FLYING,
  TOKEN_W_44_ANGEL_FLYING,
  TOKEN_BG_11_WORM,
  TOKEN_G_22_ELEMENTAL,
  A_I_M_LABS,
  ABBEY_GRIFFIN,
  ADARKAR_SENTINEL,
  ADARKAR_WASTES,
  ADULT_GOLD_DRAGON,
  AERIAL_RESPONDER,
  AGENTS_OF_HYDRA,
  AJANI_S_MANTRA,
  AJANI_S_PRIDEMATE,
  AKOUM_REFUGE,
  ALABORN_MUSKETEER,
  ALABORN_TROOPER,
  ALLOY_MYR,
  ALPHA_MYR,
  ALPHA_TYRRANAX,
  ALPINE_MEADOW,
  AMBASSADOR_OAK,
  AMBUSH_PARTY,
  ANCIENT_BRONTODON,
  ANCIENT_DEN,
  ANCIENT_SPIDER,
  ANGEL_OF_MERCY,
  ANGELFIRE_CRUSADER,
  ANGELIC_WALL,
  ANODET_LURKER,
  ANVILWROUGHT_RAPTOR,
  ARACHNOID,
  ARCANE_SANCTUM,
  ARCHANGEL,
  ARCHANGEL_OF_THUNE,
  ARCTIC_FLATS,
  ARCTIC_TREELINE,
  ARGOTHIAN_SWINE,
  ARMADA_WURM,
  ARMORED_GRIFFIN,
  ARMORED_PEGASUS,
  ARMORED_WOLF_RIDER,
  ASCENDED_LAWMAGE,
  ASGARDIAN_CITADEL,
  ASSAULT_ZEPPELID,
  ATTENDED_KNIGHT,
  AURORAL_PROCESSION,
  AVACYN_S_PILGRIM,
  AVEN_BATTLE_PRIEST,
  AVEN_FISHER,
  AVEN_FLOCK,
  AVENGERS_HANGAR,
  AXEBANE_STAG,
  AZORIUS_GUILDGATE,
  BADLANDS,
  BALEFUL_STRIX,
  BALSHAN_COLLABORATOR,
  BARBARY_APES,
  BARKTOOTH_WARBEARD,
  BARON_AIRSHIP_KINGDOM,
  BATTLE_HURDA,
  BATTLEFIELD_RAPTOR,
  BEAR_S_COMPANION,
  BEETLEBACK_CHIEF,
  BELLOWS_LIZARD,
  BESKIR_SHIELDMATE,
  BILBO_S_DEADLY_SLICE,
  BIRNIN_ZANA_PLAZA,
  BISHOP_S_SOLDIER,
  BITTERBOW_SHARPSHOOTERS,
  BLACK_WIDOW_NATASHA_ROMANOFF,
  BLAZEMIRE_VERGE,
  BLEACHBONE_VERGE,
  BLISTERING_DIEFLYN,
  BLOOD_RESEARCHER,
  BLOODBOND_VAMPIRE,
  BLOODFELL_CAVES,
  BLOODSTONE_CAMEO,
  BLOODTHIRSTY_AERIALIST,
  BLOSSOMING_SANDS,
  BORDER_GUARD,
  BOREAL_DRUID,
  BOREAL_SHELF,
  BOROS_GUILDGATE,
  BOROS_RECRUIT,
  BOROS_SWIFTBLADE,
  BOUNTIFUL_PROMENADE,
  BRAMBLEWEFT_BEHEMOTH,
  BRIGHTBLADE_STOAT,
  BRIMSTONE_DRAGON,
  BRINDLE_SHOAT,
  BROKERS_HIDEOUT,
  BRONZE_SABLE,
  BROOD_WEAVER,
  BROODMATE_DRAGON,
  BRUSHLAND,
  BRUSHSTRIDER,
  BULETTE,
  BULL_CERODON,
  BUZZ_BOTS,
  CABARETTI_COURTYARD,
  CALDERA_LAKE,
  CARAVAN_HURDA,
  CARVEN_CARYATID,
  CASCADE_BLUFFS,
  CAVERN_THOCTAR,
  CAVES_OF_KOILOS,
  CELEBRITY_FENCER,
  CELESTIAL_FORCE,
  CELESTIAL_UNICORN,
  CENTAUR_HEALER,
  CENTAUR_NURTURER,
  CENTAUR_SAFEGUARD,
  CERODON_YEARLING,
  CHAMPION_OF_ARASHIN,
  CHANNEL_THE_SUNS,
  CHAR_RUMBLER,
  CHARDALYN_DRAGON,
  CHIMNEY_RABBLE,
  CINDER_BARRENS,
  CITIZEN_V_HELMUT_ZEMO,
  CLARION_CATHARS,
  CLASH_OF_WILLS,
  CLOUDCROWN_OAK,
  COASTAL_TOWER,
  COILED_TINVIPER,
  COLOSSAPEDE,
  CONCLAVE_CAVALIER,
  CONSULATE_SKYGATE,
  CONTAMINATED_AQUIFER,
  COPPER_MYR,
  COURIER_GRIFFIN,
  COWL_PROWLER,
  CRASH_OF_RHINOS,
  CRESTED_HERDCALLER,
  CRUMBLING_NECROPOLIS,
  CYCLOPS_OF_ONE_EYED_PASS,
  DANCING_SCIMITAR,
  DARKSLICK_DRAKE,
  DARKSTEEL_GARGOYLE,
  DAWNHART_REJUVENATOR,
  DAWNSTRIKE_PALADIN,
  DAYBREAK_CHAPLAIN,
  DAYSQUAD_MARSHAL,
  DAZZLING_ANGEL,
  DEATHBLOOM_GARDENER,
  DEATHBLOOM_THALLID,
  DEFIANT_ELF,
  DESERTED_BEACH,
  DEVKARIN_DISSIDENT,
  DIMENSION_X,
  DIMIR_GUILDGATE,
  DISCORDANT_PIPER,
  DISMAL_BACKWATER,
  DOOMED_DISSENTER,
  DOOMED_TRAVELER,
  DRAGON_ENGINE,
  DRAGON_HATCHLING,
  DRAGON_TRAINER,
  DRAGON_S_EYE_SENTRY,
  DRAGONSKULL_SUMMIT,
  DRAKE_SKULL_CAMEO,
  DRAKEWING_KRASIS,
  DREAMROOT_CASCADE,
  DROWNED_CATACOMB,
  DRUID_OF_THE_ANIMA,
  DRUID_OF_THE_COWL,
  EPF_POINT_SQUAD,
  EAGER_GLYPHMAGE,
  EAGLE_OF_THE_WATCH,
  EARTH_ELEMENTAL,
  EARTHSHAKING_SI,
  EBONY_RHINO,
  EBONY_TREEFOLK,
  EKUNDU_GRIFFIN,
  ELDER_AUNTIE,
  ELDERLEAF_MENTOR,
  ELDRAZI_DEVASTATOR,
  ELEPHANT_GRAVEYARD,
  ELFHAME_PALACE,
  ELFSWORN_GIANT,
  ELGAUD_INQUISITOR,
  ELTURGARD_RANGER,
  ELVISH_RANGER,
  EMERIA_ANGEL,
  EMISSARY_OF_THE_SLEEPLESS,
  ENATU_GOLEM,
  ESPER_CORMORANTS,
  EXULTANT_CULTIST,
  FAITHBEARER_PALADIN,
  FANG_OF_SHIGEKI,
  FANGREN_HUNTER,
  FATHOM_FLEET_FIREBRAND,
  FELLWAR_STONE,
  FEMEREF_SCOUTS,
  FERAL_PROWLER,
  FERAL_RIDGEWOLF,
  FEROCIOUS_PUP,
  FEROCIOUS_ZHENG,
  FETID_HEATH,
  FIELD_CREEPER,
  FILIGREE_FAMILIAR,
  FIRE_DIAMOND,
  FIRE_LIT_THICKET,
  FIREBORN_KNIGHT,
  FIREFLY,
  FIRESCREAMER,
  FISK_TOWER,
  FLAMEKIN_BRAWLER,
  FLEETFOOT_DANCER,
  FLOODED_GROVE,
  FLOODED_STRAND,
  FLOODFARM_VERGE,
  FOLK_OF_THE_PINES,
  FOOT_HEADQUARTERS,
  FORSAKEN_SANCTUARY,
  FOUNTAIN_OF_YOUTH,
  FOXFIRE_OAK,
  FRONTIER_BIVOUAC,
  FROST_MARSH,
  FROST_OGRE,
  FUSION_ELEMENTAL,
  FYNDHORN_ELDER,
  FYNDHORN_ELVES,
  GAEA_S_SKYFOLK,
  GALLANT_CAVALRY,
  GALLANT_CITIZEN,
  GARRISON_CAT,
  GEOTHERMAL_BOG,
  GHIRAPUR_OSPREY,
  GIGANTIC_BIG_BEAR,
  GIGANTOSAURUS,
  GILDED_SENTINEL,
  GLACIAL_FLOODPLAIN,
  GLACIAL_FORTRESS,
  GLASS_GOLEM,
  GLOOMLAKE_VERGE,
  GNARLED_MASS,
  GOBLIN_DEATHRAIDERS,
  GOBLIN_GANG_LEADER,
  GOBLIN_INSTIGATOR,
  GOBLIN_PIKER,
  GOLD_MYR,
  GOLD_FORGED_SENTINEL,
  GOLDEN_HIND,
  GOLGARI_GERMINATION,
  GOLGARI_LONGLEGS,
  GOLIATH_BEETLE,
  GONGAGA_REACTOR_TOWN,
  GOOBBUE_GARDENER,
  GRAND_COLISEUM,
  GRAPPLER_SPIDER,
  GRASPING_LONGNECK,
  GRAVEL_HIDE_GOBLIN,
  GRAVEN_CAIRNS,
  GRAYPELT_REFUGE,
  GRAZING_GLADEHART,
  GREAT_FOREST_DRUID,
  GREAT_FURNACE,
  GREAT_HART,
  GREAT_HORN_KRUSHOK,
  GREENWEAVER_DRUID,
  GRIFFIN_SENTINEL,
  GRIZZLED_LEOTAU,
  GRUUL_GUILDGATE,
  GUADOSALAM_FARPLANE_GATEWAY,
  GUARDED_HEIR,
  GUARDIAN_AUTOMATON,
  GUARDIANS_OF_MELETIS,
  HAPPY_HOGAN_DAUNTLESS_DRIVER,
  HAUNTED_GUARDIAN,
  HAUNTED_RIDGE,
  HAVOC_DEVILS,
  HEAD_OF_THE_HOMESTEAD,
  HEALER_OF_THE_GLADE,
  HEALER_S_HAWK,
  HEARTHFIRE_HOBGOBLIN,
  HEDRON_CRAWLER,
  HELL_S_KITCHEN,
  HELLKITE_PUNISHER,
  HERALD_OF_FAITH,
  HEXPLATE_GOLEM,
  HIGHLAND_FOREST,
  HIGHLAND_GAME,
  HIGHLAND_LAKE,
  HIGHLAND_WEALD,
  HIGHSPIRE_MANTIS,
  HINTERLAND_HARBOR,
  HIPPO_COWS,
  HIT_MONKEY,
  HOBGOBLIN_DRAGOON,
  HOLLOWHENGE_SCAVENGER,
  HONEY_MAMMOTH,
  HONOR_GUARD,
  HOVERMYR,
  HOWLING_GIANT,
  HUATLI_S_SNUBHORN,
  HUNTED_WITNESS,
  HURLOON_MINOTAUR,
  HUSHWOOD_VERGE,
  HYENA_PACK,
  ICE_TUNNEL,
  IDYLLIC_BEACHFRONT,
  IGNEOUS_CUR,
  IMPERIAL_OUTRIDER,
  INFESTATION_SAGE,
  INSOMNIA_CROWN_CITY,
  INSPIRING_CLERIC,
  IROAS_S_CHAMPION,
  IRON_GIANT,
  IRON_MYR,
  IRONCLAD_KROVOD,
  IRONROOT_TREEFOLK,
  ISOLATED_CHAPEL,
  ITHILIEN_KINGFISHER,
  IZZET_GUILDGATE,
  JADDI_OFFSHOOT,
  JASMINE_BOREAL,
  JEDIT_OJANEN,
  JEDIT_S_DRAGOONS,
  JORAGA_VISIONARY,
  JOUSTING_DUMMY,
  JUNGLE_BARRIER,
  JUNGLE_SHRINE,
  JUNGLEBORN_PIONEER,
  JWAR_ISLE_REFUGE,
  KABIRA_CROSSROADS,
  KALAKSCION_HUNGER_TYRANT,
  KARPLUSAN_FOREST,
  KASIMIR_THE_LONE_WOLF,
  KAZANDU_NECTARPOT,
  KAZANDU_REFUGE,
  KEDEREKT_CREEPER,
  KEEPERS_OF_THE_FAITH,
  KHALNI_GARDEN,
  KILLER_BEES,
  KINDLY_CUSTOMER,
  KINGFISHER,
  KITHKIN_BILLYRIDER,
  KNIGHT_OF_THE_NEW_COALITION,
  KNIGHT_OF_THE_TUSK,
  KOALA_SHEEP,
  KOZILEK_S_CHANNELER,
  KRANIOCEROS,
  KYOSHI_WARRIORS,
  LADY_ORCA,
  LAND_LEECHES,
  LARGE_BEAR,
  LEADEN_MYR,
  LEAF_GILDER,
  LEYLINE_PROWLER,
  LIBRARY_LARCENIST,
  LIFESPRING_DRUID,
  LIGHTNING_ANGEL,
  LIGHTNING_STORMKIN,
  LLANOWAR_DEAD,
  LLANOWAR_TRIBE,
  LLANOWAR_VISIONARY,
  LOAMDRAGGER_GIANT,
  LOCH_KORRIGAN,
  LONE_MISSIONARY,
  LONGBOW_ARCHER,
  LOOMING_ALTISAUR,
  LOS_DIABLOS_MISSILE_BASE,
  LOTUS_GUARDIAN,
  LOWLAND_GIANT,
  LOXODON_LINE_BREAKER,
  LOXODON_STALWART,
  LUMENGRID_GARGOYLE,
  LUMINOUS_ANGEL,
  LUXURY_SUITE,
  MAALFELD_TWINS,
  MAESTROS_THEATER,
  MAGNIGOTH_SENTRY,
  MAKINDI_GRIFFIN,
  MALCATOR_S_WATCHER,
  MANAKIN,
  MANALITH,
  MANDROID_SQUADRON,
  MANTIS_RIDER,
  MARALEAF_PIXIE,
  MARBLE_DIAMOND,
  MARBLE_GARGOYLE,
  MARISI_S_TWINCLAWS,
  MARTYR_OF_DUSK,
  MAUSOLEUM_GUARD,
  MEANDERING_RIVER,
  MEMNITE,
  MENG_HUO_S_HORDE,
  MESA_FALCON,
  MESSENGER_DRAKE,
  MESSENGER_FALCONS,
  METALLIC_SLIVER,
  MILLENNIAL_GARGOYLE,
  MINWU_WHITE_MAGE,
  MISTY_RAINFOREST,
  MOLDERING_KAROK,
  MOLTEN_RAVAGER,
  MOLTEN_TRIBUTARY,
  MOONRISE_CLERIC,
  MOONWING_MOTH,
  MORPHIC_POOL,
  MOSS_KAMI,
  MOSSBEARD_ANCIENT,
  MOX_JASPER,
  MUTANT_TOWN,
  MYSTIC_GATE,
  MYSTIC_MONASTERY,
  NARSTAD_SCRAPPER,
  NEEDLETHORN_DRAKE,
  NEMA_SILTLURKER,
  NEWS_HELICOPTER,
  NIGHTSHADE_DRYAD,
  NIGHTVEIL_PREDATOR,
  NIMBUS_MAZE,
  NIP_GWYLLION,
  NOMAD_OUTPOST,
  NORWOOD_ARCHERS,
  NOXIOUS_NEWT,
  NYX_FLEECE_RAM,
  NYXBORN_BRUTE,
  NYXBORN_COLOSSUS,
  NYXBORN_COURSER,
  OASIS_GARDENER,
  OBELISK_OF_BANT,
  OBELISK_OF_ESPER,
  OBELISK_OF_GRIXIS,
  OBELISK_OF_JUND,
  OBELISK_OF_NAYA,
  OBSCURA_STOREFRONT,
  OBSIANUS_GOLEM,
  OCULUS,
  OGRE_SENTRY,
  OLD_GHASTBARK,
  OMEGA_MYR,
  ONULET,
  OPALINE_UNICORN,
  OPEN_THE_GRAVES,
  OPULENT_PALACE,
  ORAZCA_FRILLBACK,
  ORDINARY_BEAR,
  OROCHI_SUSTAINER,
  ORZHOV_GUILDGATE,
  OUTLAW_MEDIC,
  OVERGROWN_FARMLAND,
  PALACE_FAMILIAR,
  PALADIN_OF_THE_BLOODSTAINED,
  PALLADIUM_MYR,
  PARAPET_WATCHERS,
  PARDIC_COLLABORATOR,
  PARDIC_WANDERER,
  PEACE_STRIDER,
  PEGASUS_CHARGER,
  PELAKKA_WURM,
  PENSIVE_MINOTAUR,
  PENUMBRA_BOBCAT,
  PENUMBRA_KAVU,
  PENUMBRA_SPIDER,
  PENUMBRA_WURM,
  PEREGRINE_GRIFFIN,
  PERSONAL_TUTOR,
  PHERES_BAND_CENTAURS,
  PHYREXIAN_HULK,
  PILGRIM_OF_THE_FIRES,
  PILLARFIELD_OX,
  PINE_BARRENS,
  PITILESS_GORGON,
  PLATED_CRUSHER,
  POND_PROPHET,
  PREENING_CHAMPION,
  PRETENDING_POXBEARERS,
  PRIDEFUL_PARENT,
  PRIMORDIAL_PACHYDERM,
  PRINCESS_LUCREZIA,
  PRIZED_GRIFFIN,
  PRIZEFIGHTER_CONSTRUCT,
  PROTECTOR_OF_GONDOR,
  PROWLING_FELIDAR,
  PURPLE_CRYSTAL_CRAB,
  PYM_TECHNOLOGIES,
  PYRETIC_RITUAL,
  QUICKSILVER_PIETRO_MAXIMOFF,
  QUILLED_SLAGWURM,
  QUILLED_WOLF,
  QUIRION_EXPLORER,
  RABANASTRE_ROYAL_CITY,
  RADIANT_GROVE,
  RAGING_POLTERGEIST,
  RAGING_REDCAP,
  RAKDOS_GUILDGATE,
  RAKDOS_RAGEMUTT,
  RAKDOS_SHRED_FREAK,
  RAKDOS_TRUMPETER,
  RAMIREZ_DEPIETRO,
  RAMPAGING_BALOTHS,
  RAVENOUS_LINDWURM,
  RAZORFIELD_THRESHER,
  REDWOOD_TREEFOLK,
  REJUVENATING_SPRINGS,
  RELIC_SLOTH,
  RESISTANCE_SKYWARDEN,
  RHOX_BRUTE,
  RHOX_WAR_MONK,
  RIDGETOP_RAPTOR,
  RIMEWOOD_FALLS,
  RIOT_DEVILS,
  RIP_CLAN_CRASHER,
  RIPTIDE_CRAB,
  RISEN_SANCTUARY,
  RIVEN_TURNBULL,
  RIVERPYRE_VERGE,
  ROC_EGG,
  ROCKFALL_VALE,
  ROOTBOUND_CRAG,
  ROTTED_HYSTRIX,
  ROVING_HARPER,
  RUBBLE_SLINGER,
  RUGGED_HIGHLANDS,
  RUGGED_PRAIRIE,
  RUINATION_WURM,
  RUNE_CERVIN_RIDER,
  RUNEWING,
  RUSHWOOD_ELEMENTAL,
  S_H_I_E_L_D_DEPLOYMENT_DRONE,
  SACRED_PEAKS,
  SACRED_WOLF,
  SALT_FLATS,
  SALT_MARSH,
  SANDSTEPPE_CITADEL,
  SATYR_RAMBLER,
  SAVANNAH,
  SAZH_S_CHOCOBO,
  SCABLAND,
  SCALED_WURM,
  SCARLET_WITCH_WANDA_MAXIMOFF,
  SCARWOOD_GOBLINS,
  SCION_OF_UGIN,
  SCION_OF_THE_SWARM,
  SCOURED_BARRENS,
  SCRUBLAND,
  SEA_OF_CLOUDS,
  SEASHELL_CAMEO,
  SEASIDE_CITADEL,
  SEAT_OF_THE_SYNOD,
  SEETHING_SONG,
  SEJIRI_REFUGE,
  SELESNYA_GUILDGATE,
  SELLER_OF_SONGBIRDS,
  SERAPH_OF_DAWN,
  SERRA_ZEALOT,
  SEWN_EYE_DRAKE,
  SHARLAYAN_NATION_OF_SCHOLARS,
  SHATTERED_SANCTUM,
  SHEPHERD_OF_THE_LOST,
  SHIPWRECK_MARSH,
  SHIVAN_DRAGON,
  SHIVAN_OASIS,
  SHIVAN_REEF,
  SHRIKE_FORCE,
  SHU_GRAIN_CARAVAN,
  SHU_SOLDIER_FARMERS,
  SILENT_ARTISAN,
  SILVER_MYR,
  SILVERBACK_APE,
  SILVERBACK_SHAMAN,
  SILVERBEAK_GRIFFIN,
  SIMIC_GUILDGATE,
  SIR_SHANDLAR_OF_EBERYN,
  SISTERS_OF_THE_FLAME,
  SIVITRI_SCARZAM,
  SKY_DIAMOND,
  SKY_SPIRIT,
  SKY_TERROR,
  SKYHUNTER_PATROL,
  SKYHUNTER_SKIRMISHER,
  SKYKNIGHT_LEGIONNAIRE,
  SKYSCANNER,
  SKYSHROUD_FOREST,
  SKYSHROUD_TROOPERS,
  SKYSNARE_SPIDER,
  SKYSPEAR_CAVALRY,
  SLIPPERY_BOGLE,
  SLIVER_CONSTRUCT,
  SNARE_THOPTER,
  SNOW_COVERED_ISLAND,
  SNOW_COVERED_MOUNTAIN,
  SNOW_COVERED_PLAINS,
  SNOWFIELD_SINKHOLE,
  SOCIAL_CLIMBER,
  SOKKA_WOLF_COVE_S_PROTECTOR,
  SOUL_S_ATTENDANT,
  SOULBOUND_GUARDIANS,
  SOUTHERN_ELEPHANT,
  SPECTATOR_SEATING,
  SPIKE_JESTER,
  SPIRE_GARDEN,
  SPIRITED_COMPANION,
  SPORE_CRAWLER,
  SPOREMOUND,
  SPRINGMANE_CERVIN,
  SPROUTING_THRINAX,
  STAMPEDING_RHINO,
  STARK_INDUSTRIES,
  STARLIT_ANGEL,
  STEADFAST_GUARD,
  STEAM_SPITTER,
  STEEL_WALL,
  STEEPLE_ROC,
  STEWARD_OF_VALERON,
  STONE_GOLEM,
  STONE_HAVEN_MEDIC,
  STONE_KAVU,
  STONE_QUARRY,
  STONEWOOD_INVOKER,
  STONEWORK_PUMA,
  STORMCARVED_COAST,
  STREETBREAKER_WURM,
  SUBMERGED_BONEYARD,
  SULFUR_FALLS,
  SULFUROUS_MIRE,
  SULFUROUS_SPRINGS,
  SUMMIT_SENTINEL,
  SUN_SENTINEL,
  SUNASTIAN_FALCONER,
  SUNBLADE_ANGEL,
  SUNDIAL_DAWN_TYRANT,
  SUNDOWN_PASS,
  SUNKEN_RUINS,
  SUNLIT_MARSH,
  SUNPETAL_GROVE,
  SUNSPIRE_GRIFFIN,
  SURVEILLING_SPRITE,
  SWIFTBLADE_VINDICATOR,
  SWIFTWATER_CLIFFS,
  SWOOPING_LOOKOUT,
  SYLVAN_CARYATID,
  SYLVOK_EXPLORER,
  SYMBIOTIC_BEAST,
  SYMBIOTIC_ELF,
  SYMBIOTIC_WURM,
  TCRI_BUILDING,
  TAIGA,
  TAINTED_FIELD,
  TAINTED_ISLE,
  TAINTED_PEAK,
  TAJURU_BLIGHTBLADE,
  TAJURU_PATHWARDEN,
  TAJURU_SNARECASTER,
  TALISMAN_OF_CONVICTION,
  TALISMAN_OF_CREATIVITY,
  TALISMAN_OF_CURIOSITY,
  TALISMAN_OF_DOMINANCE,
  TALISMAN_OF_HIERARCHY,
  TALISMAN_OF_IMPULSE,
  TALISMAN_OF_INDULGENCE,
  TALISMAN_OF_PROGRESS,
  TALISMAN_OF_RESILIENCE,
  TALISMAN_OF_UNITY,
  TALON_TROOPER,
  TANGLE_MANTIS,
  TANGLEBLOOM,
  TANGLED_ISLET,
  TARNISHED_CITADEL,
  TARPAN,
  TEETERPEAK_AMBUSHER,
  TEMPEST_DRAKE,
  TEMPLE_ACOLYTE,
  TEROH_S_FAITHFUL,
  TERRIAN_WORLD_TYRANT,
  TERRITORIAL_SCYTHECAT,
  THE_FABULOUS_FROG_MAN,
  THE_LADY_OF_THE_MOUNTAIN,
  THE_WHIZZER_CLASSIC_SPEEDSTER,
  THORNSPIRE_VERGE,
  THORNWEALD_ARCHER,
  THORNWOOD_FALLS,
  THREE_TREE_ROOTWEAVER,
  THUNDER_SPIRIT,
  THUNDERING_GIANT,
  TIDEHOLLOW_STRIX,
  TIGEREYE_CAMEO,
  TIMBER_GORGE,
  TIRELESS_MISSIONARIES,
  TOBIAS_ANDRION,
  TORCH_DRAKE,
  TORSTEN_VON_URSUS,
  TOWER_DRAKE,
  TOWER_GARGOYLE,
  TOWER_OF_EONS,
  TRAINED_ARMODON,
  TRAINED_CARACAL,
  TRAINING_CENTER,
  TRANQUIL_COVE,
  TRANQUIL_EXPANSE,
  TREE_MONKEY,
  TREETOP_FREEDOM_FIGHTERS,
  TRENO_DARK_CITY,
  TRESSERHORN_SINKS,
  TROKIN_HIGH_GUARD,
  TROLL_HORN_CAMEO,
  TROPICAL_ISLAND,
  TUKATONGUE_THALLID,
  TUNDRA,
  TUNDRA_WALL,
  TWIN_SILK_SPIDER,
  TWINBLADE_ASSASSINS,
  TWO_HEADED_CERBERUS,
  TWO_HEADED_HELLKITE,
  TYROX_SAURID_TYRANT,
  UNDERGROUND_RIVER,
  UNDERGROUND_SEA,
  UNMAKE,
  URBIS_PROTECTOR,
  URBORG_ELF,
  URBORG_VOLCANO,
  UTOPIA_TREE,
  VALOROUS_STEED,
  VASSAL_SOUL,
  VASTWOOD_GORGER,
  VAULT_OF_CHAMPIONS,
  VECTOR_IMPERIAL_CAPITAL,
  VENOMTHROPE,
  VENSER_S_SLIVER,
  VERDANT_FORCE,
  VERNADI_SHIELDMATE,
  VIASHINO_WARRIOR,
  VIASHIVAN_DRAGON,
  VIGILANT_BALOTH,
  VINE_TRELLIS,
  VINELASHER_KUDZU,
  VIZKOPA_VAMPIRE,
  VOICE_OF_THE_PROVINCES,
  VOICELESS_SPIRIT,
  VOLATILE_FJORD,
  VOLCANIC_ISLAND,
  WAKANDAN_SHIELD_GUARD,
  WAKEDANCER,
  WALL_OF_BLOSSOMS,
  WALL_OF_OMENS,
  WALL_OF_SPEARS,
  WALL_OF_SWORDS,
  WAR_MAMMOTH,
  WARCLAMP_MASTIFF,
  WARDEN_OF_GEOMETRIES,
  WASP_LANCER,
  WATCHFUL_GIANT,
  WATCHWOLF,
  WEAVER_OF_CURRENTS,
  WICKER_WITCH,
  WILLOWRUSH_VERGE,
  WILT_LEAF_CAVALIERS,
  WIND_SCARRED_CRAG,
  WINDURST_FEDERATION_CENTER,
  WIREWOOD_ELF,
  WISTFUL_SELKIE,
  WOODED_BASTION,
  WOODED_RIDGELINE,
  WOODLAND_DRUID,
  WOODLAND_MYSTIC,
  WOODLAND_STREAM,
  WOOLLY_THOCTAR,
  WRECKING_CREW,
  WRIGGLING_GRUB,
  YARGLE_GLUTTON_OF_URBORG,
  YAVIMAYA_COAST,
  YAVIMAYA_SAPHERD,
  YAVIMAYA_WURM,
  YOTIAN_MEDIC,
  YOTIAN_SOLDIER,
  YOUTHFUL_SCHOLAR,
  ZARICHI_TIGER,
  ZENDIKAR_S_ROIL,
  ZETALPA_PRIMAL_DAWN,
  ZHAO_THE_SEETHING_FLAME,
];
