import type { CardDefinition } from "../types.js";

/**
 * A hand-picked set of real, accurately-represented cards used to exercise
 * the engine (Phase 1 tests) and to give the Phase 2 hotseat client an
 * actual card pool to build decks from. This is NOT the start of the real
 * card database - that will be sourced from Scryfall per CLAUDE.md. Grown
 * gradually and deliberately kept to simple vanilla/keyword creatures and
 * damage/mana/draw/life-gain spells that fit the existing effect DSL - see
 * CLAUDE.md's vanilla/scripted/weird tiers for what "simple" means here.
 */

export const MOUNTAIN: CardDefinition = {
  id: "mountain",
  name: "Mountain",
  scryfallId: "c49d378e-9549-4320-b3c6-1aeb216d1e98",
  types: ["Land"],
  subtypes: ["Mountain"],
  supertypes: ["Basic"],
  colorIdentity: ["R"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }],
  tier: "vanilla",
};

export const FOREST: CardDefinition = {
  id: "forest",
  name: "Forest",
  scryfallId: "c3e84b42-5423-4d4d-b8fc-cfbb2c53a4ca",
  types: ["Land"],
  subtypes: ["Forest"],
  supertypes: ["Basic"],
  colorIdentity: ["G"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "vanilla",
};

export const PLAINS: CardDefinition = {
  id: "plains",
  name: "Plains",
  scryfallId: "7b7c408b-8660-4db5-9a16-5003c11b4ac1",
  types: ["Land"],
  subtypes: ["Plains"],
  supertypes: ["Basic"],
  colorIdentity: ["W"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }],
  tier: "vanilla",
};

export const GRIZZLY_BEARS: CardDefinition = {
  id: "grizzly-bears",
  name: "Grizzly Bears",
  scryfallId: "409f9b88-f03e-40b6-9883-68c14c37c0de",
  types: ["Creature"],
  subtypes: ["Bear"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 2,
  toughness: 2,
  tier: "vanilla",
};

export const LIGHTNING_BOLT: CardDefinition = {
  id: "lightning-bolt",
  name: "Lightning Bolt",
  scryfallId: "7673784e-db4b-43a1-8d55-1bb9fc1e284f",
  types: ["Instant"],
  manaCost: { generic: 0, colors: { R: 1 } },
  colorIdentity: ["R"],
  castEffect: { kind: "damage", amount: 3, target: { kind: "any-target" } },
  tier: "scripted",
};

export const LLANOWAR_ELVES: CardDefinition = {
  id: "llanowar-elves",
  name: "Llanowar Elves",
  scryfallId: "6a0b230b-d391-4998-a3f7-7b158a0ec2cd",
  types: ["Creature"],
  subtypes: ["Elf", "Druid"],
  manaCost: { generic: 0, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 1,
  toughness: 1,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "scripted",
};

export const ELVISH_VISIONARY: CardDefinition = {
  id: "elvish-visionary",
  name: "Elvish Visionary",
  scryfallId: "a2f174e6-9532-4fc3-815b-2dc3966c6523",
  types: ["Creature"],
  subtypes: ["Elf", "Shaman"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 1,
  toughness: 1,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "draw", amount: 1 } }],
  tier: "scripted",
};

export const ELVISH_MYSTIC: CardDefinition = {
  id: "elvish-mystic",
  name: "Elvish Mystic",
  scryfallId: "eb654a76-62ee-4fd8-83d4-cb912211a9a0",
  types: ["Creature"],
  subtypes: ["Elf", "Druid"],
  manaCost: { generic: 0, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 1,
  toughness: 1,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "scripted",
};

export const RUNECLAW_BEAR: CardDefinition = {
  id: "runeclaw-bear",
  name: "Runeclaw Bear",
  scryfallId: "d1995238-79cc-4381-9595-71ef11ea1e36",
  types: ["Creature"],
  subtypes: ["Bear"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 2,
  toughness: 2,
  tier: "vanilla",
};

export const ELVISH_WARRIOR: CardDefinition = {
  id: "elvish-warrior",
  name: "Elvish Warrior",
  scryfallId: "c3d0485a-209d-4040-94ab-856bdee83b81",
  types: ["Creature"],
  subtypes: ["Elf", "Warrior"],
  manaCost: { generic: 0, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 2,
  toughness: 3,
  tier: "vanilla",
};

export const GIANT_SPIDER: CardDefinition = {
  id: "giant-spider",
  name: "Giant Spider",
  scryfallId: "213c9202-b6f4-43ab-b57f-b97a1da5e263",
  types: ["Creature"],
  subtypes: ["Spider"],
  manaCost: { generic: 3, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 2,
  toughness: 4,
  keywords: ["Reach"],
  tier: "vanilla",
};

export const CRAW_WURM: CardDefinition = {
  id: "craw-wurm",
  name: "Craw Wurm",
  scryfallId: "3875f73d-6108-488b-bd34-4cf2c23ce6b3",
  types: ["Creature"],
  subtypes: ["Wurm"],
  manaCost: { generic: 4, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 6,
  toughness: 4,
  tier: "vanilla",
};

export const WALL_OF_WOOD: CardDefinition = {
  id: "wall-of-wood",
  name: "Wall of Wood",
  scryfallId: "1864e25e-f940-47e5-9439-ab721049c690",
  types: ["Creature"],
  subtypes: ["Wall"],
  manaCost: { generic: 0, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 0,
  toughness: 3,
  keywords: ["Defender"],
  tier: "vanilla",
};

export const SHOCK: CardDefinition = {
  id: "shock",
  name: "Shock",
  scryfallId: "b23900fb-efe9-43ab-9f67-4545dd01fb9c",
  types: ["Instant"],
  manaCost: { generic: 0, colors: { R: 1 } },
  colorIdentity: ["R"],
  castEffect: { kind: "damage", amount: 2, target: { kind: "any-target" } },
  tier: "scripted",
};

export const RAGING_GOBLIN: CardDefinition = {
  id: "raging-goblin",
  name: "Raging Goblin",
  scryfallId: "3480927c-10da-4817-9954-10aea2bc7100",
  types: ["Creature"],
  subtypes: ["Goblin"],
  manaCost: { generic: 0, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 1,
  toughness: 1,
  keywords: ["Haste"],
  tier: "vanilla",
};

export const HILL_GIANT: CardDefinition = {
  id: "hill-giant",
  name: "Hill Giant",
  scryfallId: "14c2be6a-9ca6-4d3a-8dd0-db4ea40799f8",
  types: ["Creature"],
  subtypes: ["Giant"],
  manaCost: { generic: 3, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 3,
  toughness: 3,
  tier: "vanilla",
};

/*
 * "Incinerate deals 3 damage to any target. A creature dealt damage this way
 * can't be regenerated this turn."
 *
 * The second sentence is NOT modelled. The engine has regeneration shields but
 * nothing that can suppress one, so a creature with a shield up survives this
 * where the printed card kills it. Not in any deck yet; the fix is a flag on
 * the instance that `useRegenerationShield` checks, cleared in cleanup.
 *
 * Written down because a silent gap on a removal spell is the kind that only
 * shows up as "why didn't that die" in the middle of a game.
 */
export const INCINERATE: CardDefinition = {
  id: "incinerate",
  name: "Incinerate",
  scryfallId: "f23dff46-e040-4cba-890a-97c2899701f2",
  types: ["Instant"],
  manaCost: { generic: 1, colors: { R: 1 } },
  colorIdentity: ["R"],
  castEffect: { kind: "damage", amount: 3, target: { kind: "any-target" } },
  tier: "scripted",
};

/**
 * Lava Axe is real and its "5 damage to target player" is accurately
 * represented (it can only target a player, unlike Lightning Bolt/Shock/
 * Incinerate which can hit any target).
 */
export const LAVA_AXE: CardDefinition = {
  id: "lava-axe",
  name: "Lava Axe",
  scryfallId: "c3dab325-8f4f-4288-9f3f-960e52b4335b",
  types: ["Sorcery"],
  manaCost: { generic: 4, colors: { R: 1 } },
  colorIdentity: ["R"],
  castEffect: { kind: "damage", amount: 5, target: { kind: "player" } },
  tier: "scripted",
};

export const WIND_DRAKE: CardDefinition = {
  id: "wind-drake",
  name: "Wind Drake",
  scryfallId: "5e227a63-abea-494e-9d66-6ff0a3da14ca",
  types: ["Creature"],
  subtypes: ["Drake"],
  manaCost: { generic: 2, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 2,
  toughness: 2,
  keywords: ["Flying"],
  tier: "vanilla",
};

export const TYPHOID_RATS: CardDefinition = {
  id: "typhoid-rats",
  name: "Typhoid Rats",
  scryfallId: "d13cb90b-50c3-46ef-83f8-812dfb7ff881",
  types: ["Creature"],
  subtypes: ["Rat"],
  manaCost: { generic: 0, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 1,
  toughness: 1,
  keywords: ["Deathtouch"],
  tier: "vanilla",
};

export const CHILD_OF_NIGHT: CardDefinition = {
  id: "child-of-night",
  name: "Child of Night",
  scryfallId: "3887af00-a87d-4396-b82b-38b88c084e8e",
  types: ["Creature"],
  subtypes: ["Vampire"],
  manaCost: { generic: 1, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 2,
  toughness: 1,
  keywords: ["Lifelink"],
  tier: "vanilla",
};

export const GLADECOVER_SCOUT: CardDefinition = {
  id: "gladecover-scout",
  name: "Gladecover Scout",
  scryfallId: "e112d77d-f019-4709-b31a-b02952df0e35",
  types: ["Creature"],
  subtypes: ["Elf", "Scout"],
  manaCost: { generic: 0, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 1,
  toughness: 1,
  keywords: ["Hexproof"],
  tier: "vanilla",
};

/**
 * "Choose one - Target player gains 3 life; or prevent the next 3 damage that
 * would be dealt to any target this turn."
 *
 * Both modes are offered. The first is exact. The second is a documented
 * approximation: this engine has no damage-prevention shield, so it is
 * represented as +3 toughness until end of turn on the chosen creature -
 * which absorbs three damage in combat the way the real mode would, but does
 * nothing against a damage spell aimed at a player, and leaves the creature
 * bigger rather than protected. Kept because the mode being *offered and
 * doing something sensible* beats a modal card with one live option; revisit
 * when a real prevention-shield effect exists.
 */
export const HEALING_SALVE: CardDefinition = {
  id: "healing-salve",
  name: "Healing Salve",
  scryfallId: "0ff82aba-9022-4eff-a6dc-67365360d646",
  types: ["Instant"],
  manaCost: { generic: 0, colors: { W: 1 } },
  colorIdentity: ["W"],
  castEffect: {
    kind: "modal",
    modes: [
      { label: "Target player gains 3 life", effect: { kind: "gainLife", amount: 3 } },
      {
        // Was +0/+3 on a creature until 2026-08-06, which was an approximation
        // in two directions at once: it could not protect a player at all, and
        // extra toughness is not prevention - it does not stop deathtouch, it
        // still feeds the attacker's lifelink, and it stacks with a -N/-N
        // instead of being irrelevant to one. The engine now has real
        // prevention, so this is the printed card.
        label: "Prevent the next 3 damage to any target this turn",
        effect: { kind: "preventDamage", amount: 3, target: { kind: "any-target" } },
      },
    ],
  },
  tier: "scripted",
};

/**
 * Mono-green and mono-white card pool added 2026-07-30 to hit the "~50 lands
 * per deck" target in ROADMAP.md (Salty Mike's deck is now mono-green,
 * Deadly Donny's is now mono-white). All sourced directly from Scryfall's
 * bulk data via tools/scryfall-report/dump_chosen.py rather than recalled
 * from memory, to guarantee every name/cost/P-T/keyword here is accurate -
 * see that script's output for the raw data these were transcribed from.
 * All vanilla or keyword-only (tier "vanilla" per CLAUDE.md), plus two
 * simple scripted spells per color using the existing effect DSL.
 */
export const WILLOW_ELF: CardDefinition = {
  id: "willow-elf",
  name: "Willow Elf",
  scryfallId: "c063a072-0cd4-45fb-ac68-96e359bf3ef5",
  types: ["Creature"],
  subtypes: ["Elf"],
  manaCost: { generic: 0, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 1,
  toughness: 1,
  tier: "vanilla",
};

export const NORWOOD_RANGER: CardDefinition = {
  id: "norwood-ranger",
  name: "Norwood Ranger",
  scryfallId: "4ebf3a7c-e065-468b-a73c-6f986cde3a3d",
  types: ["Creature"],
  subtypes: ["Elf", "Scout", "Ranger"],
  manaCost: { generic: 0, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 1,
  toughness: 2,
  tier: "vanilla",
};

export const TRAINED_JACKAL: CardDefinition = {
  id: "trained-jackal",
  name: "Trained Jackal",
  scryfallId: "01deb3cc-91e8-4ef3-964f-f36c6a21207c",
  types: ["Creature"],
  subtypes: ["Jackal"],
  manaCost: { generic: 0, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 1,
  toughness: 2,
  tier: "vanilla",
};

export const ANKLE_BITER: CardDefinition = {
  id: "ankle-biter",
  name: "Ankle Biter",
  scryfallId: "424972d6-3b2c-449b-b786-749a77020fa1",
  types: ["Creature"],
  subtypes: ["Snake"],
  manaCost: { generic: 0, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 1,
  toughness: 1,
  keywords: ["Deathtouch"],
  tier: "vanilla",
};

export const CHARGING_BADGER: CardDefinition = {
  id: "charging-badger",
  name: "Charging Badger",
  scryfallId: "5d88ad54-43fc-45e0-8e00-db6be0c021ea",
  types: ["Creature"],
  subtypes: ["Badger"],
  manaCost: { generic: 0, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 1,
  toughness: 1,
  keywords: ["Trample"],
  tier: "vanilla",
};

export const BALDUVIAN_BEARS: CardDefinition = {
  id: "balduvian-bears",
  name: "Balduvian Bears",
  scryfallId: "ef5297cb-e763-4871-9cd3-0e2dbcc52095",
  types: ["Creature"],
  subtypes: ["Bear"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 2,
  toughness: 2,
  tier: "vanilla",
};

export const BEAR_CUB: CardDefinition = {
  id: "bear-cub",
  name: "Bear Cub",
  scryfallId: "d8662ebb-068b-41d2-b504-4b5854e4d4aa",
  types: ["Creature"],
  subtypes: ["Bear"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 2,
  toughness: 2,
  tier: "vanilla",
};

export const CYLIAN_ELF: CardDefinition = {
  id: "cylian-elf",
  name: "Cylian Elf",
  scryfallId: "b3afaab6-4768-4852-a0b6-4e6a0295bde7",
  types: ["Creature"],
  subtypes: ["Elf", "Scout"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 2,
  toughness: 2,
  tier: "vanilla",
};

export const FOREST_BEAR: CardDefinition = {
  id: "forest-bear",
  name: "Forest Bear",
  scryfallId: "fae9abc7-ecd3-4042-a5b0-5f2b24491fa6",
  types: ["Creature"],
  subtypes: ["Bear"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 2,
  toughness: 2,
  tier: "vanilla",
};

export const KALONIAN_TUSKER: CardDefinition = {
  id: "kalonian-tusker",
  name: "Kalonian Tusker",
  scryfallId: "135946fc-fe67-401f-821d-d7145c63f030",
  types: ["Creature"],
  subtypes: ["Beast"],
  manaCost: { generic: 0, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 3,
  toughness: 3,
  tier: "vanilla",
};

export const SWORDWISE_CENTAUR: CardDefinition = {
  id: "swordwise-centaur",
  name: "Swordwise Centaur",
  scryfallId: "1776ebd7-91fc-49e1-a978-f2012162d1cf",
  types: ["Creature"],
  subtypes: ["Centaur", "Warrior"],
  manaCost: { generic: 0, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 3,
  toughness: 2,
  tier: "vanilla",
};

export const TERRAIN_ELEMENTAL: CardDefinition = {
  id: "terrain-elemental",
  name: "Terrain Elemental",
  scryfallId: "32b89e5c-ffb4-406f-99d1-ec2797aca061",
  types: ["Creature"],
  subtypes: ["Elemental"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 3,
  toughness: 2,
  tier: "vanilla",
};

export const JIBBIRIK_OMNIVORE: CardDefinition = {
  id: "jibbirik-omnivore",
  name: "Jibbirik Omnivore",
  scryfallId: "68a0569b-65c8-49ce-91ac-e639b8faf939",
  types: ["Creature"],
  subtypes: ["Beast"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 3,
  toughness: 2,
  tier: "vanilla",
};

export const MOON_SPRITE: CardDefinition = {
  id: "moon-sprite",
  name: "Moon Sprite",
  scryfallId: "49d0acb1-bc07-42d5-a327-1617f0ed2c60",
  types: ["Creature"],
  subtypes: ["Faerie"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 1,
  toughness: 1,
  keywords: ["Flying"],
  tier: "vanilla",
};

export const PYGMY_RAZORBACK: CardDefinition = {
  id: "pygmy-razorback",
  name: "Pygmy Razorback",
  scryfallId: "0ad9744f-797a-4dd3-8617-192773be995c",
  types: ["Creature"],
  subtypes: ["Boar"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 2,
  toughness: 1,
  keywords: ["Trample"],
  tier: "vanilla",
};

export const WILLOW_FAERIE: CardDefinition = {
  id: "willow-faerie",
  name: "Willow Faerie",
  scryfallId: "83ce80dc-86d9-4613-af98-c385ca5d1cf4",
  types: ["Creature"],
  subtypes: ["Faerie"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 1,
  toughness: 2,
  keywords: ["Flying"],
  tier: "vanilla",
};

export const UNDERDARK_BASILISK: CardDefinition = {
  id: "underdark-basilisk",
  name: "Underdark Basilisk",
  scryfallId: "ed220158-e4e3-4d46-8098-7b940a923ce9",
  types: ["Creature"],
  subtypes: ["Basilisk"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 1,
  toughness: 2,
  keywords: ["Deathtouch"],
  tier: "vanilla",
};

export const ALPINE_GRIZZLY: CardDefinition = {
  id: "alpine-grizzly",
  name: "Alpine Grizzly",
  scryfallId: "38bbf983-df71-4403-86f3-2e86aa8765b8",
  types: ["Creature"],
  subtypes: ["Bear"],
  manaCost: { generic: 2, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 4,
  toughness: 2,
  tier: "vanilla",
};

export const CENTAUR_COURSER: CardDefinition = {
  id: "centaur-courser",
  name: "Centaur Courser",
  scryfallId: "e8b67ee8-3189-4426-8b1a-b540267768fd",
  types: ["Creature"],
  subtypes: ["Centaur", "Warrior"],
  manaCost: { generic: 2, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 3,
  toughness: 3,
  tier: "vanilla",
};

export const COLOSSODON_YEARLING: CardDefinition = {
  id: "colossodon-yearling",
  name: "Colossodon Yearling",
  scryfallId: "f2c60e63-0b86-4100-a932-bb9e9b197610",
  types: ["Creature"],
  subtypes: ["Beast"],
  manaCost: { generic: 2, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 2,
  toughness: 4,
  tier: "vanilla",
};

export const GORILLA_WARRIOR: CardDefinition = {
  id: "gorilla-warrior",
  name: "Gorilla Warrior",
  scryfallId: "d6997a75-42c9-4706-ac34-69fa34011eca",
  types: ["Creature"],
  subtypes: ["Ape", "Warrior"],
  manaCost: { generic: 2, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 3,
  toughness: 2,
  tier: "vanilla",
};

export const HARRIER_NAGA: CardDefinition = {
  id: "harrier-naga",
  name: "Harrier Naga",
  scryfallId: "bcdc68c9-f5f3-4c5b-80df-85508cf15f84",
  types: ["Creature"],
  subtypes: ["Snake", "Warrior"],
  manaCost: { generic: 2, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 3,
  toughness: 3,
  tier: "vanilla",
};

export const MURASA_BRUTE: CardDefinition = {
  id: "murasa-brute",
  name: "Murasa Brute",
  scryfallId: "efe1c5b2-4356-41ae-ab7e-ad9fc835a911",
  types: ["Creature"],
  subtypes: ["Troll", "Warrior"],
  manaCost: { generic: 2, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 3,
  toughness: 3,
  tier: "vanilla",
};

export const NESSIAN_COURSER: CardDefinition = {
  id: "nessian-courser",
  name: "Nessian Courser",
  scryfallId: "4697f3aa-abde-4379-af82-f30115f59be0",
  types: ["Creature"],
  subtypes: ["Centaur", "Warrior"],
  manaCost: { generic: 2, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 3,
  toughness: 3,
  tier: "vanilla",
};

export const SPINED_KAROK: CardDefinition = {
  id: "spined-karok",
  name: "Spined Karok",
  scryfallId: "c37ae6b5-225a-410e-ab22-13e923bdfb65",
  types: ["Creature"],
  subtypes: ["Crocodile"],
  manaCost: { generic: 2, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 2,
  toughness: 4,
  tier: "vanilla",
};

export const SPORECAP_SPIDER: CardDefinition = {
  id: "sporecap-spider",
  name: "Sporecap Spider",
  scryfallId: "7bc33252-145f-45c0-bb70-23183c698f66",
  types: ["Creature"],
  subtypes: ["Spider"],
  manaCost: { generic: 2, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 1,
  toughness: 5,
  keywords: ["Reach"],
  tier: "vanilla",
};

export const HITCHCLAW_RECLUSE: CardDefinition = {
  id: "hitchclaw-recluse",
  name: "Hitchclaw Recluse",
  scryfallId: "fe349432-8726-49cf-ad07-6f8add8f78c8",
  types: ["Creature"],
  subtypes: ["Spider"],
  manaCost: { generic: 2, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 1,
  toughness: 4,
  keywords: ["Reach"],
  tier: "vanilla",
};

export const MOSSCOAT_GORIAK: CardDefinition = {
  id: "mosscoat-goriak",
  name: "Mosscoat Goriak",
  scryfallId: "c23139d4-0db5-4683-8d49-f4600fbe29e2",
  types: ["Creature"],
  subtypes: ["Beast"],
  manaCost: { generic: 2, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 2,
  toughness: 4,
  keywords: ["Vigilance"],
  tier: "vanilla",
};

export const WARY_OKAPI: CardDefinition = {
  id: "wary-okapi",
  name: "Wary Okapi",
  scryfallId: "54f26697-0d4b-4af4-a644-3d0ae13f1d2e",
  types: ["Creature"],
  subtypes: ["Antelope"],
  manaCost: { generic: 2, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 3,
  toughness: 2,
  keywords: ["Vigilance"],
  tier: "vanilla",
};

export const WOODLAND_PATROL: CardDefinition = {
  id: "woodland-patrol",
  name: "Woodland Patrol",
  scryfallId: "7a134bd1-3c5a-467e-bad1-65548b33faa5",
  types: ["Creature"],
  subtypes: ["Human", "Scout"],
  manaCost: { generic: 2, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 3,
  toughness: 2,
  keywords: ["Vigilance"],
  tier: "vanilla",
};

export const LEATHERBACK_BALOTH: CardDefinition = {
  id: "leatherback-baloth",
  name: "Leatherback Baloth",
  scryfallId: "55f97b4c-42c7-4986-a150-0b8de11f0537",
  types: ["Creature"],
  subtypes: ["Beast"],
  manaCost: { generic: 0, colors: { G: 3 } },
  colorIdentity: ["G"],
  power: 4,
  toughness: 5,
  tier: "vanilla",
};

export const AXEBANE_BEAST: CardDefinition = {
  id: "axebane-beast",
  name: "Axebane Beast",
  scryfallId: "2f420b35-1f73-41c8-a15f-1aee4af0999c",
  types: ["Creature"],
  subtypes: ["Beast"],
  manaCost: { generic: 3, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 3,
  toughness: 4,
  tier: "vanilla",
};

export const BROODHUNTER_WURM: CardDefinition = {
  id: "broodhunter-wurm",
  name: "Broodhunter Wurm",
  scryfallId: "c11c852d-9c7c-4d9b-8e79-70ea5ac865df",
  types: ["Creature"],
  subtypes: ["Wurm"],
  manaCost: { generic: 3, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 4,
  toughness: 3,
  tier: "vanilla",
};

export const GOLDEN_BEAR: CardDefinition = {
  id: "golden-bear",
  name: "Golden Bear",
  scryfallId: "d7dfc789-7ea0-4eb8-8c3b-2c50fd52cbab",
  types: ["Creature"],
  subtypes: ["Bear"],
  manaCost: { generic: 3, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 4,
  toughness: 3,
  tier: "vanilla",
};

export const NETTLE_SWINE: CardDefinition = {
  id: "nettle-swine",
  name: "Nettle Swine",
  scryfallId: "75935f0e-9086-485b-b3e6-1a958fd0f2af",
  types: ["Creature"],
  subtypes: ["Boar"],
  manaCost: { generic: 3, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 4,
  toughness: 3,
  tier: "vanilla",
};

export const WILD_ELEPHANT: CardDefinition = {
  id: "wild-elephant",
  name: "Wild Elephant",
  scryfallId: "7809131c-747c-4c33-a3ca-13e573a92b66",
  types: ["Creature"],
  subtypes: ["Elephant"],
  manaCost: { generic: 3, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 3,
  toughness: 3,
  keywords: ["Trample"],
  tier: "vanilla",
};

export const ORDER_OF_THE_SACRED_BELL: CardDefinition = {
  id: "order-of-the-sacred-bell",
  name: "Order of the Sacred Bell",
  scryfallId: "310500b2-8539-441e-af89-81ddfa8ef080",
  types: ["Creature"],
  subtypes: ["Human", "Monk"],
  manaCost: { generic: 3, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 4,
  toughness: 3,
  tier: "vanilla",
};

export const ROWAN_TREEFOLK: CardDefinition = {
  id: "rowan-treefolk",
  name: "Rowan Treefolk",
  scryfallId: "852a0956-8558-4754-ab57-6f1cc4de740e",
  types: ["Creature"],
  subtypes: ["Treefolk"],
  manaCost: { generic: 3, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 3,
  toughness: 4,
  tier: "vanilla",
};

export const RUMBLING_BALOTH: CardDefinition = {
  id: "rumbling-baloth",
  name: "Rumbling Baloth",
  scryfallId: "93a56610-482b-4ddf-88e1-e4a2edf4fa0f",
  types: ["Creature"],
  subtypes: ["Beast"],
  manaCost: { generic: 2, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 4,
  toughness: 4,
  tier: "vanilla",
};

export const WILD_CERATOK: CardDefinition = {
  id: "wild-ceratok",
  name: "Wild Ceratok",
  scryfallId: "4464e11a-c5b9-40ea-8be0-dab29d14e289",
  types: ["Creature"],
  subtypes: ["Rhino"],
  manaCost: { generic: 3, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 4,
  toughness: 3,
  tier: "vanilla",
};

export const TOMAKUL_HONOR_GUARD: CardDefinition = {
  id: "tomakul-honor-guard",
  name: "Tomakul Honor Guard",
  scryfallId: "c7745439-f40b-4647-8bff-53751d511bbd",
  types: ["Creature"],
  subtypes: ["Human", "Soldier"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 3,
  toughness: 1,
  keywords: ["Ward"],
  wardCost: { generic: 2, colors: {} },
  tier: "vanilla",
};

/**
 * A vanilla 2/3 with Menace, fully represented. It isn't green or white, so it
 * isn't in either demo deck - colour identity would make it illegal in both -
 * and it is kept purely as an engine test fixture for Menace.
 *
 * This comment used to claim only part of the card was implemented, and
 * compared it to HEALING_SALVE "only implementing one of its two modes".
 * Both halves of that were wrong: Alley Strangler's entire Oracle text is the
 * single word "Menace", and Healing Salve implements both of its modes (the
 * second approximately - see its own note). Checked against the Scryfall data
 * 2026-08-05 after the comment misled a reader into repeating it.
 */
export const ALLEY_STRANGLER: CardDefinition = {
  id: "alley-strangler",
  name: "Alley Strangler",
  scryfallId: "a131d558-5f6b-448b-a378-1882e2d02bd2",
  types: ["Creature"],
  subtypes: ["Aetherborn", "Rogue"],
  manaCost: { generic: 2, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 2,
  toughness: 3,
  keywords: ["Menace"],
  tier: "vanilla",
};

export const AMBUSH_VIPER: CardDefinition = {
  id: "ambush-viper",
  name: "Ambush Viper",
  scryfallId: "37f9be6b-ae6e-4708-9749-83bebd351102",
  types: ["Creature"],
  subtypes: ["Snake"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 2,
  toughness: 1,
  keywords: ["Flash", "Deathtouch"],
  tier: "vanilla",
};

export const HORNET_STING: CardDefinition = {
  id: "hornet-sting",
  name: "Hornet Sting",
  scryfallId: "af6b3bf7-bd09-4f0d-a670-2efc1c6d416f",
  types: ["Instant"],
  manaCost: { generic: 0, colors: { G: 1 } },
  colorIdentity: ["G"],
  castEffect: { kind: "damage", amount: 1, target: { kind: "any-target" } },
  tier: "scripted",
};

export const NOURISH: CardDefinition = {
  id: "nourish",
  name: "Nourish",
  scryfallId: "0597dd97-fe6f-4e74-88e5-35528ada0140",
  types: ["Instant"],
  manaCost: { generic: 0, colors: { G: 2 } },
  colorIdentity: ["G"],
  castEffect: { kind: "gainLife", amount: 6 },
  tier: "scripted",
};

export const DEVOTED_HERO: CardDefinition = {
  id: "devoted-hero",
  name: "Devoted Hero",
  scryfallId: "c0cdbd28-958a-4955-badd-4848eef3f0fa",
  types: ["Creature"],
  subtypes: ["Elf", "Soldier"],
  manaCost: { generic: 0, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 2,
  tier: "vanilla",
};

export const EAGER_CADET: CardDefinition = {
  id: "eager-cadet",
  name: "Eager Cadet",
  scryfallId: "0732d372-1000-435e-905b-4a6c852ba427",
  types: ["Creature"],
  subtypes: ["Human", "Soldier"],
  manaCost: { generic: 0, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 1,
  tier: "vanilla",
};

export const ELITE_VANGUARD: CardDefinition = {
  id: "elite-vanguard",
  name: "Elite Vanguard",
  scryfallId: "28a5c350-2ed1-4a25-9626-0f8da5d1aef7",
  types: ["Creature"],
  subtypes: ["Human", "Soldier"],
  manaCost: { generic: 0, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 1,
  tier: "vanilla",
};

export const EXPEDITION_ENVOY: CardDefinition = {
  id: "expedition-envoy",
  name: "Expedition Envoy",
  scryfallId: "41193ef1-1619-4448-9905-26b05079c79a",
  types: ["Creature"],
  subtypes: ["Human", "Scout", "Ally"],
  manaCost: { generic: 0, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 1,
  tier: "vanilla",
};

export const ISAMARU_HOUND_OF_KONDA: CardDefinition = {
  id: "isamaru-hound-of-konda",
  name: "Isamaru, Hound of Konda",
  scryfallId: "6afead32-3542-44c4-82d6-b6a81beb9f90",
  types: ["Creature"],
  subtypes: ["Dog"],
  supertypes: ["Legendary"],
  manaCost: { generic: 0, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 2,
  tier: "vanilla",
};

export const KITESAIL_SCOUT: CardDefinition = {
  id: "kitesail-scout",
  name: "Kitesail Scout",
  scryfallId: "68a07aad-4ed5-47ae-b04c-9b9919000f6c",
  types: ["Creature"],
  subtypes: ["Kor", "Scout"],
  manaCost: { generic: 0, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 1,
  keywords: ["Flying"],
  tier: "vanilla",
};

export const LANTERN_KAMI: CardDefinition = {
  id: "lantern-kami",
  name: "Lantern Kami",
  scryfallId: "99625787-f184-48a5-a678-e30b7024c7bb",
  types: ["Creature"],
  subtypes: ["Spirit"],
  manaCost: { generic: 0, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 1,
  keywords: ["Flying"],
  tier: "vanilla",
};

export const RUSTWING_FALCON: CardDefinition = {
  id: "rustwing-falcon",
  name: "Rustwing Falcon",
  scryfallId: "c6691e62-8887-41e8-8e74-76ee2353d45e",
  types: ["Creature"],
  subtypes: ["Bird"],
  manaCost: { generic: 0, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 2,
  keywords: ["Flying"],
  tier: "vanilla",
};

export const SAVANNAH_LIONS: CardDefinition = {
  id: "savannah-lions",
  name: "Savannah Lions",
  scryfallId: "9c9ac1bc-cdf3-4fa6-8319-a7ea164e9e47",
  types: ["Creature"],
  subtypes: ["Cat"],
  manaCost: { generic: 0, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 1,
  tier: "vanilla",
};

export const STAUNCH_SHIELDMATE: CardDefinition = {
  id: "staunch-shieldmate",
  name: "Staunch Shieldmate",
  scryfallId: "db17f25a-32d1-469b-bb5f-f1761e227990",
  types: ["Creature"],
  subtypes: ["Dwarf", "Soldier"],
  manaCost: { generic: 0, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 3,
  tier: "vanilla",
};

export const SUNTAIL_HAWK: CardDefinition = {
  id: "suntail-hawk",
  name: "Suntail Hawk",
  scryfallId: "28a1f83c-a9ef-463e-97b5-2ca3b7232f82",
  types: ["Creature"],
  subtypes: ["Bird"],
  manaCost: { generic: 0, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 1,
  keywords: ["Flying"],
  tier: "vanilla",
};

export const TASSELED_DROMEDARY: CardDefinition = {
  id: "tasseled-dromedary",
  name: "Tasseled Dromedary",
  scryfallId: "9cef3bf2-55cf-4f42-9ec0-fa921ef22311",
  types: ["Creature"],
  subtypes: ["Camel"],
  manaCost: { generic: 0, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 0,
  toughness: 4,
  tier: "vanilla",
};

export const VALIANT_GUARD: CardDefinition = {
  id: "valiant-guard",
  name: "Valiant Guard",
  scryfallId: "83ec1486-900b-4763-9b5b-390cb00aff02",
  types: ["Creature"],
  subtypes: ["Human", "Soldier"],
  manaCost: { generic: 0, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 0,
  toughness: 3,
  tier: "vanilla",
};

export const VOLUNTEER_MILITIA: CardDefinition = {
  id: "volunteer-militia",
  name: "Volunteer Militia",
  scryfallId: "0af243f6-ef28-49d1-afeb-ac03d568ed6a",
  types: ["Creature"],
  subtypes: ["Human", "Soldier"],
  manaCost: { generic: 0, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 2,
  tier: "vanilla",
};

export const YOKED_OX: CardDefinition = {
  id: "yoked-ox",
  name: "Yoked Ox",
  scryfallId: "a73f186b-c897-4a98-bc25-8e4aa348d8c9",
  types: ["Creature"],
  subtypes: ["Ox"],
  manaCost: { generic: 0, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 0,
  toughness: 4,
  tier: "vanilla",
};

export const AGELESS_GUARDIAN: CardDefinition = {
  id: "ageless-guardian",
  name: "Ageless Guardian",
  scryfallId: "4a5ff6af-402f-4bf6-a75b-dc1e0e40aff6",
  types: ["Creature"],
  subtypes: ["Spirit", "Soldier"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 4,
  tier: "vanilla",
};

export const ALABASTER_HOST_SANCTIFIER: CardDefinition = {
  id: "alabaster-host-sanctifier",
  name: "Alabaster Host Sanctifier",
  scryfallId: "efbd934a-39c4-4ce7-af2a-34ca226d7f23",
  types: ["Creature"],
  subtypes: ["Phyrexian", "Cleric"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 2,
  keywords: ["Lifelink"],
  tier: "vanilla",
};

export const ALABORN_GRENADIER: CardDefinition = {
  id: "alaborn-grenadier",
  name: "Alaborn Grenadier",
  scryfallId: "153b7197-57a7-4e38-bd4a-4550b9d22dd8",
  types: ["Creature"],
  subtypes: ["Human", "Soldier"],
  manaCost: { generic: 0, colors: { W: 2 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 2,
  keywords: ["Vigilance"],
  tier: "vanilla",
};

export const ARMORED_WARHORSE: CardDefinition = {
  id: "armored-warhorse",
  name: "Armored Warhorse",
  scryfallId: "52daf505-d436-4ea6-a157-4268af2ff7a8",
  types: ["Creature"],
  subtypes: ["Horse"],
  manaCost: { generic: 0, colors: { W: 2 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 3,
  tier: "vanilla",
};

export const BLADE_OF_THE_SIXTH_PRIDE: CardDefinition = {
  id: "blade-of-the-sixth-pride",
  name: "Blade of the Sixth Pride",
  scryfallId: "d8b1b493-2dec-4816-a427-4813a00ca3e9",
  types: ["Creature"],
  subtypes: ["Cat", "Rebel"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 1,
  tier: "vanilla",
};

export const CLIFFHAVEN_SELL_SWORD: CardDefinition = {
  id: "cliffhaven-sell-sword",
  name: "Cliffhaven Sell-Sword",
  scryfallId: "7f334767-4353-4379-a934-fa67075db439",
  types: ["Creature"],
  subtypes: ["Kor", "Warrior"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 1,
  tier: "vanilla",
};

export const CONCORDIA_PEGASUS: CardDefinition = {
  id: "concordia-pegasus",
  name: "Concordia Pegasus",
  scryfallId: "600d3517-e370-47ae-ac4f-c7ef8995a89c",
  types: ["Creature"],
  subtypes: ["Pegasus"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 3,
  keywords: ["Flying"],
  tier: "vanilla",
};

export const DROMOKA_WARRIOR: CardDefinition = {
  id: "dromoka-warrior",
  name: "Dromoka Warrior",
  scryfallId: "13ae001b-556f-4576-8cf4-0b8902997bb1",
  types: ["Creature"],
  subtypes: ["Human", "Warrior"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 1,
  tier: "vanilla",
};

export const FORTIFIED_RAMPART: CardDefinition = {
  id: "fortified-rampart",
  name: "Fortified Rampart",
  scryfallId: "5095e2ab-a7f5-45bc-8b2f-31198ea27bba",
  types: ["Creature"],
  subtypes: ["Wall"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 0,
  toughness: 6,
  keywords: ["Defender"],
  tier: "vanilla",
};

export const FRESH_VOLUNTEERS: CardDefinition = {
  id: "fresh-volunteers",
  name: "Fresh Volunteers",
  scryfallId: "e070ea4a-c417-405f-b788-78fb7ca2eaa5",
  types: ["Creature"],
  subtypes: ["Human", "Rebel"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 2,
  tier: "vanilla",
};

export const GLORY_SEEKER: CardDefinition = {
  id: "glory-seeker",
  name: "Glory Seeker",
  scryfallId: "2bd51dd3-ce49-41cf-85ef-a5a1428bc71b",
  types: ["Creature"],
  subtypes: ["Human", "Soldier"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 2,
  tier: "vanilla",
};

export const KNIGHT_ERRANT: CardDefinition = {
  id: "knight-errant",
  name: "Knight Errant",
  scryfallId: "d8d1d55b-6be0-4bb5-b452-ba4994b21774",
  types: ["Creature"],
  subtypes: ["Human", "Knight"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 2,
  tier: "vanilla",
};

export const KNIGHT_OF_NEW_BENALIA: CardDefinition = {
  id: "knight-of-new-benalia",
  name: "Knight of New Benalia",
  scryfallId: "88c50c4b-a2c8-4cdc-a171-aa3ff9ef107f",
  types: ["Creature"],
  subtypes: ["Human", "Knight"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 1,
  tier: "vanilla",
};

export const KYOSHI_WARRIOR_GUARD: CardDefinition = {
  id: "kyoshi-warrior-guard",
  name: "Kyoshi Warrior Guard",
  scryfallId: "7a2acb28-c0e2-492b-a227-ef49e905e0fb",
  types: ["Creature"],
  subtypes: ["Human", "Warrior", "Ally"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 3,
  tier: "vanilla",
};

export const LEONIN_SKYHUNTER: CardDefinition = {
  id: "leonin-skyhunter",
  name: "Leonin Skyhunter",
  scryfallId: "15d6476c-1944-48e8-9af6-6db78edd58e5",
  types: ["Creature"],
  subtypes: ["Cat", "Knight"],
  manaCost: { generic: 0, colors: { W: 2 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 2,
  keywords: ["Flying"],
  tier: "vanilla",
};

export const MAKINDI_AERONAUT: CardDefinition = {
  id: "makindi-aeronaut",
  name: "Makindi Aeronaut",
  scryfallId: "a35d3113-6cb7-4b74-94a3-8160d9ac1b89",
  types: ["Creature"],
  subtypes: ["Kor", "Scout", "Ally"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 3,
  keywords: ["Flying"],
  tier: "vanilla",
};

export const MANED_SERVAL: CardDefinition = {
  id: "maned-serval",
  name: "Maned Serval",
  scryfallId: "5ac51e35-e2c5-4457-981c-e59894584288",
  types: ["Creature"],
  subtypes: ["Cat"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 4,
  keywords: ["Vigilance"],
  tier: "vanilla",
};

export const MISTRAL_CHARGER: CardDefinition = {
  id: "mistral-charger",
  name: "Mistral Charger",
  scryfallId: "97b4c2d1-ba84-4051-a2e2-5b9710a3823e",
  types: ["Creature"],
  subtypes: ["Pegasus"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 1,
  keywords: ["Flying"],
  tier: "vanilla",
};

export const PROWLING_CARACAL: CardDefinition = {
  id: "prowling-caracal",
  name: "Prowling Caracal",
  scryfallId: "1e689e4a-fc54-46f4-b0c5-c0e65d88340e",
  types: ["Creature"],
  subtypes: ["Cat"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 1,
  tier: "vanilla",
};

export const ROYAL_FALCON: CardDefinition = {
  id: "royal-falcon",
  name: "Royal Falcon",
  scryfallId: "10dfc217-ae94-4ff0-bf30-7131f97aa3c9",
  types: ["Creature"],
  subtypes: ["Bird"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 1,
  keywords: ["Flying"],
  tier: "vanilla",
};

export const SILVERCOAT_LION: CardDefinition = {
  id: "silvercoat-lion",
  name: "Silvercoat Lion",
  scryfallId: "9d33e866-cfd8-44e6-8070-df8df1ce965d",
  types: ["Creature"],
  subtypes: ["Cat"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 2,
  tier: "vanilla",
};

export const SKYBLADE_OF_THE_LEGION: CardDefinition = {
  id: "skyblade-of-the-legion",
  name: "Skyblade of the Legion",
  scryfallId: "67e788e2-12e9-4041-8210-753aaef2576c",
  types: ["Creature"],
  subtypes: ["Vampire", "Soldier"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 3,
  keywords: ["Flying"],
  tier: "vanilla",
};

export const SQUIRE: CardDefinition = {
  id: "squire",
  name: "Squire",
  scryfallId: "96c9c4d1-dd43-4156-b25f-0e707b6c4b23",
  types: ["Creature"],
  subtypes: ["Human", "Soldier"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 2,
  tier: "vanilla",
};

export const STEADFAST_PALADIN: CardDefinition = {
  id: "steadfast-paladin",
  name: "Steadfast Paladin",
  scryfallId: "a2c06b6e-faf5-467d-bfe1-9ff00be9e2f5",
  types: ["Creature"],
  subtypes: ["Dwarf", "Knight"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 2,
  keywords: ["Lifelink"],
  tier: "vanilla",
};

export const STORMFRONT_PEGASUS: CardDefinition = {
  id: "stormfront-pegasus",
  name: "Stormfront Pegasus",
  scryfallId: "c2e03297-3124-4f83-98ef-772fa213a422",
  types: ["Creature"],
  subtypes: ["Pegasus"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 1,
  keywords: ["Flying"],
  tier: "vanilla",
};

export const STORY_SEEKER: CardDefinition = {
  id: "story-seeker",
  name: "Story Seeker",
  scryfallId: "e3dae817-3db1-4edf-86ba-c2c2b238fcf5",
  types: ["Creature"],
  subtypes: ["Dwarf", "Cleric"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 2,
  keywords: ["Lifelink"],
  tier: "vanilla",
};

export const TERRITORIAL_ROC: CardDefinition = {
  id: "territorial-roc",
  name: "Territorial Roc",
  scryfallId: "0c83aa5e-b607-4c4f-a5f6-db61c93a1152",
  types: ["Creature"],
  subtypes: ["Bird"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 3,
  keywords: ["Flying"],
  tier: "vanilla",
};

export const THRABEN_VALIANT: CardDefinition = {
  id: "thraben-valiant",
  name: "Thraben Valiant",
  scryfallId: "a8a8282b-bba6-4815-80fe-7a37a1fec3c1",
  types: ["Creature"],
  subtypes: ["Human", "Soldier"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 1,
  keywords: ["Vigilance"],
  tier: "vanilla",
};

export const TRAVELING_PHILOSOPHER: CardDefinition = {
  id: "traveling-philosopher",
  name: "Traveling Philosopher",
  scryfallId: "edad0276-45d1-45e5-a6b1-1cd2a99b4f2c",
  types: ["Creature"],
  subtypes: ["Human", "Advisor"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 2,
  tier: "vanilla",
};

export const CHAPEL_GEIST: CardDefinition = {
  id: "chapel-geist",
  name: "Chapel Geist",
  scryfallId: "36fcc018-76c2-4246-8eca-b78115d568be",
  types: ["Creature"],
  subtypes: ["Spirit"],
  manaCost: { generic: 1, colors: { W: 2 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 3,
  keywords: ["Flying"],
  tier: "vanilla",
};

export const DAWN_GRYFF: CardDefinition = {
  id: "dawn-gryff",
  name: "Dawn Gryff",
  scryfallId: "42d30894-82b9-4af8-b0bb-48a78acbc4bd",
  types: ["Creature"],
  subtypes: ["Hippogriff"],
  manaCost: { generic: 2, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 2,
  keywords: ["Flying"],
  tier: "vanilla",
};

export const STANDING_TROOPS: CardDefinition = {
  id: "standing-troops",
  name: "Standing Troops",
  scryfallId: "75091277-99fe-428b-95bd-5cba9e0146ef",
  types: ["Creature"],
  subtypes: ["Human", "Soldier"],
  manaCost: { generic: 2, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 4,
  keywords: ["Vigilance"],
  tier: "vanilla",
};

export const WILD_GRIFFIN: CardDefinition = {
  id: "wild-griffin",
  name: "Wild Griffin",
  scryfallId: "e0494fcd-ec49-43fd-b83f-60aba735bd69",
  types: ["Creature"],
  subtypes: ["Griffin"],
  manaCost: { generic: 2, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 2,
  keywords: ["Flying"],
  tier: "vanilla",
};

export const ASSAULT_GRIFFIN: CardDefinition = {
  id: "assault-griffin",
  name: "Assault Griffin",
  scryfallId: "704286a5-e3a8-4517-85e5-6447c5c2530f",
  types: ["Creature"],
  subtypes: ["Griffin"],
  manaCost: { generic: 3, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 2,
  keywords: ["Flying"],
  tier: "vanilla",
};

export const ARDENT_MILITIA: CardDefinition = {
  id: "ardent-militia",
  name: "Ardent Militia",
  scryfallId: "8c78d392-9f2f-4241-9a10-6ac9b1e86154",
  types: ["Creature"],
  subtypes: ["Human", "Soldier"],
  manaCost: { generic: 4, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 5,
  keywords: ["Vigilance"],
  tier: "vanilla",
};

export const IRON_TUSK_ELEPHANT: CardDefinition = {
  id: "iron-tusk-elephant",
  name: "Iron Tusk Elephant",
  scryfallId: "d7c8e952-f040-4e5b-88f3-f80ad4b3f2f1",
  types: ["Creature"],
  subtypes: ["Elephant"],
  manaCost: { generic: 4, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 3,
  keywords: ["Trample"],
  tier: "vanilla",
};

export const VENERABLE_LAMMASU: CardDefinition = {
  id: "venerable-lammasu",
  name: "Venerable Lammasu",
  scryfallId: "229919ef-e39f-4bdc-bcc5-46224a3eb7b4",
  types: ["Creature"],
  subtypes: ["Lammasu"],
  manaCost: { generic: 6, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 5,
  toughness: 4,
  keywords: ["Flying"],
  tier: "vanilla",
};

export const CHAPLAINS_BLESSING: CardDefinition = {
  id: "chaplains-blessing",
  name: "Chaplain's Blessing",
  scryfallId: "f70ea481-1751-4097-af41-2d13fe79e788",
  types: ["Sorcery"],
  manaCost: { generic: 0, colors: { W: 1 } },
  colorIdentity: ["W"],
  castEffect: { kind: "gainLife", amount: 5 },
  tier: "scripted",
};

export const ANGELS_MERCY: CardDefinition = {
  id: "angels-mercy",
  name: "Angel's Mercy",
  scryfallId: "43e6d650-4e96-43a3-8b94-7f044d3b2f82",
  types: ["Instant"],
  manaCost: { generic: 2, colors: { W: 2 } },
  colorIdentity: ["W"],
  castEffect: { kind: "gainLife", amount: 7 },
  tier: "scripted",
};

/**
 * {3}{R}{G}{G} 6/5, no rules text. A real vanilla Gruul legend, used by the
 * command-zone tests (casting from the command zone, commander tax, the
 * commander replacement effect on death) and by deck validation's
 * color-identity checks - its plain text keeps those tests about the zone
 * mechanics rather than about any ability.
 */
export const JERRARD_OF_THE_CLOSED_FIST: CardDefinition = {
  id: "jerrard-of-the-closed-fist",
  name: "Jerrard of the Closed Fist",
  scryfallId: "621d4d0b-bcff-4855-bbaf-7aeeabeafe99",
  types: ["Creature"],
  subtypes: ["Human", "Knight"],
  supertypes: ["Legendary"],
  manaCost: { generic: 3, colors: { R: 1, G: 2 } },
  colorIdentity: ["R", "G"],
  power: 6,
  toughness: 5,
  canBeCommander: true,
  tier: "vanilla",
};

/**
 * {3}{R}{R} 7/4, Trample and nothing else - the only Commander-legal
 * legendary creature whose entire rules text is "Trample", which is exactly
 * what the Trample combat test wants (no second ability to muddy it).
 */
export const HULK_BRUCE_BANNER: CardDefinition = {
  id: "hulk-bruce-banner",
  name: "Hulk, Bruce Banner",
  scryfallId: "54e1b2c0-76c6-42d9-9a2b-0ebb605ad1a0",
  types: ["Creature"],
  subtypes: ["Gamma", "Berserker", "Hero"],
  supertypes: ["Legendary"],
  manaCost: { generic: 3, colors: { R: 2 } },
  colorIdentity: ["R"],
  power: 7,
  toughness: 4,
  keywords: ["Trample"],
  canBeCommander: true,
  tier: "vanilla",
};

/**
 * {2}{R} 1/1. Rules text: "{T}: This creature deals 1 damage to any target."
 * The pool's only permanent with a targeted activated ability, which is what
 * the Ward test needs to prove Ward catches abilities as well as spells.
 */
export const PRODIGAL_PYROMANCER: CardDefinition = {
  id: "prodigal-pyromancer",
  name: "Prodigal Pyromancer",
  scryfallId: "cf16600a-c2a5-49e4-89e2-260cfaf58b52",
  types: ["Creature"],
  subtypes: ["Human", "Wizard"],
  manaCost: { generic: 2, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 1,
  toughness: 1,
  activatedAbilities: [
    { cost: { tap: true }, effect: { kind: "damage", amount: 1, target: { kind: "any-target" } } },
  ],
  tier: "scripted",
};

/*
 * Real mono-white Heroes for Deadly Donny's deck - Agent Phil Coulson's
 * "each other Hero you control" ability needs Heroes to actually land on.
 */

/** {3}{W} 3/5. Rules text: "Vigilance". */
export const HAWKEYE_CLINT_BARTON: CardDefinition = {
  id: "hawkeye-clint-barton",
  name: "Hawkeye, Clint Barton",
  scryfallId: "7bdf5aed-0164-4b5c-9d4f-0c424c313235",
  types: ["Creature"],
  subtypes: ["Human", "Archer", "Hero"],
  supertypes: ["Legendary"],
  manaCost: { generic: 3, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 5,
  keywords: ["Vigilance"],
  canBeCommander: true,
  tier: "vanilla",
};

/** {2}{W} 3/3. Rules text: "When this creature enters, you gain 2 life." */
export const AMATEUR_HERO: CardDefinition = {
  id: "amateur-hero",
  name: "Amateur Hero",
  scryfallId: "38d3b35d-3ae7-4f41-879f-e05146112b24",
  types: ["Creature"],
  subtypes: ["Human", "Hero"],
  manaCost: { generic: 2, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 3,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 2 } }],
  tier: "scripted",
};

/** {4}{W} 3/4. Rules text: "Flying" + "When this creature enters, you gain 4 life." */
export const VALKYRIOR_SKYRIDER: CardDefinition = {
  id: "valkyrior-skyrider",
  name: "Valkyrior Skyrider",
  scryfallId: "7b75958b-7b72-4c0f-a75e-5e62e3727a7d",
  types: ["Creature"],
  subtypes: ["God", "Warrior", "Hero"],
  manaCost: { generic: 4, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 4,
  keywords: ["Flying"],
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 4 } }],
  tier: "scripted",
};

/** {1}{W} 2/2. Rules text: "{4}: Put a +1/+1 counter on Ant-Man." */
export const ANT_MAN_SCOTT_LANG: CardDefinition = {
  id: "ant-man-scott-lang",
  name: "Ant-Man, Scott Lang",
  scryfallId: "2c468103-dc1c-4798-bd13-8661ff53f7c4",
  types: ["Creature"],
  subtypes: ["Human", "Hero"],
  supertypes: ["Legendary"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 2,
  activatedAbilities: [{ cost: { mana: { generic: 4, colors: {} } }, effect: { kind: "addCounter", amount: 1 } }],
  canBeCommander: true,
  tier: "scripted",
};

/**
 * {4}{W} 3/3. Rules text: "Flying" + "When The Falcon enters, put a +1/+1
 * counter on each other creature you control." - the unfiltered form of the
 * same mass-counter effect Agent Phil Coulson narrows to Heroes.
 */
export const THE_FALCON_SAM_WILSON: CardDefinition = {
  id: "the-falcon-sam-wilson",
  name: "The Falcon, Sam Wilson",
  scryfallId: "781828a9-dfec-4cf0-9c30-ff519af8fd59",
  types: ["Creature"],
  subtypes: ["Human", "Hero"],
  supertypes: ["Legendary"],
  manaCost: { generic: 4, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 3,
  keywords: ["Flying"],
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "addCounterToEachOther", amount: 1 } }],
  tier: "scripted",
};

/**
 * {3}{B}{B}{G} 18/6, no rules text - the biggest-power vanilla legend in the
 * pool, which is what the 21-commander-damage test needs (two connections
 * gets there while the defender's life total is still positive).
 */
export const YARGLE_AND_MULTANI: CardDefinition = {
  id: "yargle-and-multani",
  name: "Yargle and Multani",
  scryfallId: "9c15e244-14cc-46a5-abd4-66a58d1c0dd0",
  types: ["Creature"],
  subtypes: ["Frog", "Spirit", "Elemental"],
  supertypes: ["Legendary"],
  manaCost: { generic: 3, colors: { B: 2, G: 1 } },
  colorIdentity: ["B", "G"],
  power: 18,
  toughness: 6,
  canBeCommander: true,
  tier: "vanilla",
};

/**
 * Salty Mike's mono-green commander (see demoGame.ts). Scryfall oracle text:
 *
 *   Trample
 *   Landfall - Whenever a land you control enters, double Tifa Lockhart's
 *   power until end of turn.
 *
 * The landfall trigger is the `doublePower` effect, which stacks: two lands
 * in a turn take her from 1 power to 4. It wears off in the cleanup step.
 */
export const TIFA_LOCKHART: CardDefinition = {
  id: "tifa-lockhart",
  name: "Tifa Lockhart",
  scryfallId: "fb781323-2746-405d-a9b2-e778c037a6e9",
  types: ["Creature"],
  subtypes: ["Human", "Monk"],
  supertypes: ["Legendary"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 1,
  toughness: 2,
  keywords: ["Trample"],
  triggeredAbilities: [{ event: "landfall", effect: { kind: "doublePower" } }],
  canBeCommander: true,
  tier: "scripted",
};

/**
 * Deadly Donny's mono-white commander (see demoGame.ts). Scryfall oracle text:
 *
 *   Vigilance
 *   {T}: Put a +1/+1 counter on each other Hero you control.
 *
 * Note the subtype line - he is a Hero himself, and the ability skips him
 * ("each other"), so the payoff comes from the other Heroes in the deck.
 */
export const AGENT_PHIL_COULSON: CardDefinition = {
  id: "agent-phil-coulson",
  name: "Agent Phil Coulson",
  scryfallId: "1383e587-df58-4b45-9067-b9399e90b9ed",
  types: ["Creature"],
  subtypes: ["Human", "Spy", "Hero"],
  supertypes: ["Legendary"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 2,
  keywords: ["Vigilance"],
  activatedAbilities: [
    { cost: { tap: true }, effect: { kind: "addCounterToEachOther", amount: 1, subtypes: ["Hero"] } },
  ],
  canBeCommander: true,
  tier: "scripted",
};

/** {3} Artifact Creature - Myr, 0/1. Rules text: "Indestructible." The only Commander-legal creature whose entire text is that one keyword, which makes it the honest fixture for testing destroy effects. */
export const DARKSTEEL_MYR: CardDefinition = {
  id: "darksteel-myr",
  name: "Darksteel Myr",
  scryfallId: "0f5712cf-c6a9-4a2e-90db-8ca17c621724",
  types: ["Artifact", "Creature"],
  subtypes: ["Myr"],
  manaCost: { generic: 3, colors: {} },
  colorIdentity: [],
  power: 0,
  toughness: 1,
  keywords: ["Indestructible"],
  tier: "vanilla",
};

export const SWAMP: CardDefinition = {
  id: "swamp",
  name: "Swamp",
  scryfallId: "4031e5e4-e573-4130-8d20-4a606edef0a0",
  types: ["Land"],
  subtypes: ["Swamp"],
  supertypes: ["Basic"],
  colorIdentity: ["B"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }],
  tier: "vanilla",
};

export const ISLAND: CardDefinition = {
  id: "island",
  name: "Island",
  scryfallId: "c6aa89a8-3584-4906-b9a9-41ef2f021f8e",
  types: ["Land"],
  subtypes: ["Island"],
  supertypes: ["Basic"],
  colorIdentity: ["U"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }],
  tier: "vanilla",
};

/*
 * Tokens. These aren't Scryfall cards in their own right - a token's
 * characteristics come from the text of whatever makes it, so these are
 * transcribed from their creators' oracle text ("two 1/1 white Soldier
 * creature tokens") rather than looked up by name.
 */

export const SOLDIER_TOKEN: CardDefinition = {
  id: "soldier-token",
  name: "Soldier",
  types: ["Creature"],
  subtypes: ["Soldier"],
  colorIdentity: ["W"],
  power: 1,
  toughness: 1,
  isToken: true,
  tier: "vanilla",
};

export const SAPROLING_TOKEN: CardDefinition = {
  id: "saproling-token",
  name: "Saproling",
  types: ["Creature"],
  subtypes: ["Saproling"],
  colorIdentity: ["G"],
  power: 1,
  toughness: 1,
  isToken: true,
  tier: "vanilla",
};

/* Removal. Unconditional "destroy target creature" is black's slice of the
 * colour pie, which is why all four of these are black - white and red get
 * conditional or damage-based removal that the target selector can't express
 * yet (see ROADMAP.md). */

/** {1}{B} Sorcery. "Destroy target creature." */
export const FELL: CardDefinition = {
  id: "fell",
  name: "Fell",
  scryfallId: "c96ac326-de44-470b-a592-a4c2a052c091",
  types: ["Sorcery"],
  manaCost: { generic: 1, colors: { B: 1 } },
  colorIdentity: ["B"],
  castEffect: { kind: "destroy", target: { kind: "creature" } },
  tier: "scripted",
};

/** {1}{B}{B} Instant. "Destroy target creature." */
export const MURDER: CardDefinition = {
  id: "murder",
  name: "Murder",
  scryfallId: "2c249609-9cf7-46f1-b94c-9329add966bb",
  types: ["Instant"],
  manaCost: { generic: 1, colors: { B: 2 } },
  colorIdentity: ["B"],
  castEffect: { kind: "destroy", target: { kind: "creature" } },
  tier: "scripted",
};

/** {2}{B}{B} Sorcery. "Destroy target creature." */
export const IMPALE: CardDefinition = {
  id: "impale",
  name: "Impale",
  scryfallId: "dfa0c4f7-3497-467d-9453-104fb4b5a0f3",
  types: ["Sorcery"],
  manaCost: { generic: 2, colors: { B: 2 } },
  colorIdentity: ["B"],
  castEffect: { kind: "destroy", target: { kind: "creature" } },
  tier: "scripted",
};

/** {3}{B} Sorcery. "Destroy target creature." */
export const EVISCERATE: CardDefinition = {
  id: "eviscerate",
  name: "Eviscerate",
  scryfallId: "62ba90b8-3a30-4058-b8d3-72900b1f4fe0",
  types: ["Sorcery"],
  manaCost: { generic: 3, colors: { B: 1 } },
  colorIdentity: ["B"],
  castEffect: { kind: "destroy", target: { kind: "creature" } },
  tier: "scripted",
};

/** {4}{B} Instant. "Exile target creature." - gets through Indestructible, unlike the destroy spells. */
export const FINAL_REWARD: CardDefinition = {
  id: "final-reward",
  name: "Final Reward",
  scryfallId: "8f202f6b-710f-4376-a49c-e5f135b26eaf",
  types: ["Instant"],
  manaCost: { generic: 4, colors: { B: 1 } },
  colorIdentity: ["B"],
  castEffect: { kind: "exile", target: { kind: "creature" } },
  tier: "scripted",
};

/* Anthems. Both read "Creatures you control get +1/+1" - staticBuff excludes
 * its own source, which is invisible here because an enchantment isn't a
 * creature, and is what makes the same field work for creature "lords". */

/** {1}{W}{W} Enchantment. "Creatures you control get +1/+1." */
export const GLORIOUS_ANTHEM: CardDefinition = {
  id: "glorious-anthem",
  name: "Glorious Anthem",
  scryfallId: "17d154d3-7ae5-43ff-9978-d974285e2c89",
  types: ["Enchantment"],
  manaCost: { generic: 1, colors: { W: 2 } },
  colorIdentity: ["W"],
  staticBuff: { power: 1, toughness: 1 },
  tier: "scripted",
};

/** {1}{G}{G} Enchantment. "Creatures you control get +1/+1." */
export const GAEAS_ANTHEM: CardDefinition = {
  id: "gaeas-anthem",
  name: "Gaea's Anthem",
  scryfallId: "43febc63-597d-4392-b8ea-a00841148c45",
  types: ["Enchantment"],
  manaCost: { generic: 1, colors: { G: 2 } },
  colorIdentity: ["G"],
  staticBuff: { power: 1, toughness: 1 },
  tier: "scripted",
};

/* Token makers. */

/** {1}{W} Instant. "Create two 1/1 white Soldier creature tokens." */
export const RAISE_THE_ALARM: CardDefinition = {
  id: "raise-the-alarm",
  name: "Raise the Alarm",
  scryfallId: "6c7c8527-55f6-494d-b4f7-c427a5735053",
  types: ["Instant"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  castEffect: { kind: "createToken", count: 2, tokenDefinitionId: "soldier-token" },
  tier: "scripted",
};

/** {3}{W} Sorcery. "Create three 1/1 white Soldier creature tokens." */
export const CAPTAINS_CALL: CardDefinition = {
  id: "captains-call",
  name: "Captain's Call",
  scryfallId: "0c7ed7e0-0e80-44d3-a7af-b4c321239df8",
  types: ["Sorcery"],
  manaCost: { generic: 3, colors: { W: 1 } },
  colorIdentity: ["W"],
  castEffect: { kind: "createToken", count: 3, tokenDefinitionId: "soldier-token" },
  tier: "scripted",
};

/** {3}{G} Instant. "Create three 1/1 green Saproling creature tokens." */
export const SPORE_SWARM: CardDefinition = {
  id: "spore-swarm",
  name: "Spore Swarm",
  scryfallId: "b2314215-23af-4c8e-860f-b029e151af36",
  types: ["Instant"],
  manaCost: { generic: 3, colors: { G: 1 } },
  colorIdentity: ["G"],
  castEffect: { kind: "createToken", count: 3, tokenDefinitionId: "saproling-token" },
  tier: "scripted",
};


/* ---- Mono-black pool, generated from Scryfall (see tools/scryfall-report/gen_fixtures.py) ---- */

export const GRENDEL_SPAWN_OF_KNULL: CardDefinition = {
  id: "grendel-spawn-of-knull",
  name: "Grendel, Spawn of Knull",
  scryfallId: "5fa7a8dc-67b3-4f96-af6e-98bb0a052d92",
  types: ["Creature"],
  subtypes: ["Symbiote", "Dragon", "Villain"],
  supertypes: ["Legendary"],
  manaCost: { generic: 3, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 3,
  toughness: 3,
  keywords: ["Flying", "Deathtouch"],
  canBeCommander: true,
  tier: "vanilla",
};

export const BANEHOUND: CardDefinition = {
  id: "banehound",
  name: "Banehound",
  scryfallId: "b9e03567-c95a-40b8-a75a-971076093f57",
  types: ["Creature"],
  subtypes: ["Nightmare", "Dog"],
  manaCost: { generic: 0, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 1,
  toughness: 1,
  keywords: ["Lifelink", "Haste"],
  tier: "vanilla",
};

export const GILACORN: CardDefinition = {
  id: "gilacorn",
  name: "Gilacorn",
  scryfallId: "b7f90eef-2393-4e44-9895-00489d3eaa92",
  types: ["Creature"],
  subtypes: ["Lizard"],
  manaCost: { generic: 0, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 1,
  toughness: 1,
  keywords: ["Deathtouch"],
  tier: "vanilla",
};

export const HULLCARVER: CardDefinition = {
  id: "hullcarver",
  name: "Hullcarver",
  scryfallId: "817b5b18-beb5-48c8-aa45-0515ff9ca5da",
  types: ["Artifact", "Creature"],
  subtypes: ["Robot", "Assassin"],
  manaCost: { generic: 0, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 1,
  toughness: 1,
  keywords: ["Deathtouch"],
  tier: "vanilla",
};

export const MUCK_RATS: CardDefinition = {
  id: "muck-rats",
  name: "Muck Rats",
  scryfallId: "cf2018ec-94e4-4e29-8b4b-ce30fb0d4a99",
  types: ["Creature"],
  subtypes: ["Rat"],
  manaCost: { generic: 0, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 1,
  toughness: 1,
  tier: "vanilla",
};

export const SQUIRRELANOIDS: CardDefinition = {
  id: "squirrelanoids",
  name: "Squirrelanoids",
  scryfallId: "be08d2b0-375b-434f-9e6d-060809e0ed34",
  types: ["Creature"],
  subtypes: ["Squirrel", "Mutant"],
  manaCost: { generic: 0, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 1,
  toughness: 1,
  keywords: ["Deathtouch"],
  tier: "vanilla",
};

export const VAMPIRE_OF_THE_DIRE_MOON: CardDefinition = {
  id: "vampire-of-the-dire-moon",
  name: "Vampire of the Dire Moon",
  scryfallId: "b3c185b9-5d97-4a5a-af0b-8b9c44dcd235",
  types: ["Creature"],
  subtypes: ["Vampire"],
  manaCost: { generic: 0, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 1,
  toughness: 1,
  keywords: ["Deathtouch", "Lifelink"],
  tier: "vanilla",
};

export const BOG_IMP: CardDefinition = {
  id: "bog-imp",
  name: "Bog Imp",
  scryfallId: "846f5cda-3d93-4dfd-b1c3-1dff7b814d98",
  types: ["Creature"],
  subtypes: ["Imp"],
  manaCost: { generic: 1, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 1,
  toughness: 1,
  keywords: ["Flying"],
  tier: "vanilla",
};


export const DAKMOR_BAT: CardDefinition = {
  id: "dakmor-bat",
  name: "Dakmor Bat",
  scryfallId: "f45994db-776d-420e-9241-99bf3b71fa59",
  types: ["Creature"],
  subtypes: ["Bat"],
  manaCost: { generic: 1, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 1,
  toughness: 1,
  keywords: ["Flying"],
  tier: "vanilla",
};

export const DUNE_BEETLE: CardDefinition = {
  id: "dune-beetle",
  name: "Dune Beetle",
  scryfallId: "923cb904-c725-4d57-bc17-7aa87a7cd8e0",
  types: ["Creature"],
  subtypes: ["Insect"],
  manaCost: { generic: 1, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 1,
  toughness: 4,
  tier: "vanilla",
};

export const GIFTED_AETHERBORN: CardDefinition = {
  id: "gifted-aetherborn",
  name: "Gifted Aetherborn",
  scryfallId: "8644d4d1-8499-40a8-a01f-68172c82bf58",
  types: ["Creature"],
  subtypes: ["Aetherborn", "Vampire"],
  manaCost: { generic: 0, colors: { B: 2 } },
  colorIdentity: ["B"],
  power: 2,
  toughness: 3,
  keywords: ["Deathtouch", "Lifelink"],
  tier: "vanilla",
};

export const HAND_OF_SILUMGAR: CardDefinition = {
  id: "hand-of-silumgar",
  name: "Hand of Silumgar",
  scryfallId: "d3cbb127-6149-4d0b-ad98-1968f2ebe8e4",
  types: ["Creature"],
  subtypes: ["Human", "Warrior"],
  manaCost: { generic: 1, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 2,
  toughness: 1,
  keywords: ["Deathtouch"],
  tier: "vanilla",
};

export const MISSHAPEN_FIEND: CardDefinition = {
  id: "misshapen-fiend",
  name: "Misshapen Fiend",
  scryfallId: "a43cf59e-7583-4651-968a-2a7201c69b6b",
  types: ["Creature"],
  subtypes: ["Horror", "Mercenary"],
  manaCost: { generic: 1, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 1,
  toughness: 1,
  keywords: ["Flying"],
  tier: "vanilla",
};

export const SKELETAL_SNAKE: CardDefinition = {
  id: "skeletal-snake",
  name: "Skeletal Snake",
  scryfallId: "42bd4896-4191-4479-be57-070753f8725c",
  types: ["Creature"],
  subtypes: ["Snake", "Skeleton"],
  manaCost: { generic: 1, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 2,
  toughness: 1,
  tier: "vanilla",
};

export const WEI_INFANTRY: CardDefinition = {
  id: "wei-infantry",
  name: "Wei Infantry",
  scryfallId: "30a227a1-625d-443a-bc6b-d0e51ddece60",
  types: ["Creature"],
  subtypes: ["Human", "Soldier"],
  manaCost: { generic: 1, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 2,
  toughness: 1,
  tier: "vanilla",
};

export const BARONY_VAMPIRE: CardDefinition = {
  id: "barony-vampire",
  name: "Barony Vampire",
  scryfallId: "b0130d04-05f2-44f5-bd6c-8b11f798b69e",
  types: ["Creature"],
  subtypes: ["Vampire"],
  manaCost: { generic: 2, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 3,
  toughness: 2,
  tier: "vanilla",
};

export const DUSK_IMP: CardDefinition = {
  id: "dusk-imp",
  name: "Dusk Imp",
  scryfallId: "a7590768-1286-4b85-8b31-80e577e6d733",
  types: ["Creature"],
  subtypes: ["Imp"],
  manaCost: { generic: 2, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 2,
  toughness: 1,
  keywords: ["Flying"],
  tier: "vanilla",
};

export const FERAL_SHADOW: CardDefinition = {
  id: "feral-shadow",
  name: "Feral Shadow",
  scryfallId: "3fea3941-ece4-4219-8ad9-cf6a97533aeb",
  types: ["Creature"],
  subtypes: ["Nightstalker"],
  manaCost: { generic: 2, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 2,
  toughness: 1,
  keywords: ["Flying"],
  tier: "vanilla",
};

export const GLOOM_PANGOLIN: CardDefinition = {
  id: "gloom-pangolin",
  name: "Gloom Pangolin",
  scryfallId: "3f135dd7-2a4f-4c83-9a90-76bcab3cc33d",
  types: ["Creature"],
  subtypes: ["Nightmare", "Pangolin"],
  manaCost: { generic: 2, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 1,
  toughness: 5,
  tier: "vanilla",
};

export const HEADLESS_HORSEMAN: CardDefinition = {
  id: "headless-horseman",
  name: "Headless Horseman",
  scryfallId: "d1aa37c8-98fa-4984-b09b-cf65ad84e97b",
  types: ["Creature"],
  subtypes: ["Zombie", "Knight"],
  manaCost: { generic: 2, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 2,
  toughness: 2,
  tier: "vanilla",
};

export const KRAUL_RAIDER: CardDefinition = {
  id: "kraul-raider",
  name: "Kraul Raider",
  scryfallId: "133d9d56-d906-4252-9954-e34cc8564ced",
  types: ["Creature"],
  subtypes: ["Insect", "Warrior"],
  manaCost: { generic: 2, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 2,
  toughness: 3,
  keywords: ["Menace"],
  tier: "vanilla",
};

export const MIDNIGHT_ASSASSIN: CardDefinition = {
  id: "midnight-assassin",
  name: "Midnight Assassin",
  scryfallId: "02a4a5b3-0477-4709-8bce-3e01f54001b6",
  types: ["Creature"],
  subtypes: ["Vampire", "Assassin"],
  manaCost: { generic: 2, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 1,
  toughness: 2,
  keywords: ["Flying", "Deathtouch"],
  tier: "vanilla",
};

export const MORIOK_REAVER: CardDefinition = {
  id: "moriok-reaver",
  name: "Moriok Reaver",
  scryfallId: "e2a0410f-95c5-49bf-856d-dea796c96e3b",
  types: ["Creature"],
  subtypes: ["Human", "Warrior"],
  manaCost: { generic: 2, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 3,
  toughness: 2,
  tier: "vanilla",
};

export const PYTHON: CardDefinition = {
  id: "python",
  name: "Python",
  scryfallId: "84fbe194-1d9b-4d3f-b7a0-aa058945aca1",
  types: ["Creature"],
  subtypes: ["Snake"],
  manaCost: { generic: 1, colors: { B: 2 } },
  colorIdentity: ["B"],
  power: 3,
  toughness: 2,
  tier: "vanilla",
};

export const UNDEAD_MINOTAUR: CardDefinition = {
  id: "undead-minotaur",
  name: "Undead Minotaur",
  scryfallId: "5e5ae910-ee1d-4958-92d9-0b06872913c6",
  types: ["Creature"],
  subtypes: ["Zombie", "Minotaur"],
  manaCost: { generic: 2, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 2,
  toughness: 3,
  tier: "vanilla",
};

export const VAMPIRE_NOBLE: CardDefinition = {
  id: "vampire-noble",
  name: "Vampire Noble",
  scryfallId: "b2435f17-0378-4480-8d56-d256245c7ced",
  types: ["Creature"],
  subtypes: ["Vampire", "Noble"],
  manaCost: { generic: 2, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 3,
  toughness: 2,
  tier: "vanilla",
};

export const WITCH_S_FAMILIAR: CardDefinition = {
  id: "witchs-familiar",
  name: "Witch's Familiar",
  scryfallId: "8c9f3b3b-de16-4ae5-844e-1373e0f84469",
  types: ["Creature"],
  subtypes: ["Frog"],
  manaCost: { generic: 2, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 2,
  toughness: 3,
  tier: "vanilla",
};

export const CARRION_SCREECHER: CardDefinition = {
  id: "carrion-screecher",
  name: "Carrion Screecher",
  scryfallId: "45a4010d-6a27-4ab5-aff6-e658b39f44b1",
  types: ["Creature"],
  subtypes: ["Zombie", "Bird"],
  manaCost: { generic: 3, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 3,
  toughness: 1,
  keywords: ["Flying"],
  tier: "vanilla",
};

export const CRAZED_SKIRGE: CardDefinition = {
  id: "crazed-skirge",
  name: "Crazed Skirge",
  scryfallId: "816272de-f134-45fa-ac1f-70d35d30c7e1",
  types: ["Creature"],
  subtypes: ["Phyrexian", "Imp"],
  manaCost: { generic: 3, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 2,
  toughness: 2,
  keywords: ["Flying", "Haste"],
  tier: "vanilla",
};

export const DROSS_CROCODILE: CardDefinition = {
  id: "dross-crocodile",
  name: "Dross Crocodile",
  scryfallId: "efd5c07e-4ece-4c8b-93c8-6abd7dd3a39a",
  types: ["Creature"],
  subtypes: ["Zombie", "Crocodile"],
  manaCost: { generic: 3, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 5,
  toughness: 1,
  tier: "vanilla",
};

export const GLAMOROUS_GRAPPLERS: CardDefinition = {
  id: "glamorous-grapplers",
  name: "Glamorous Grapplers",
  scryfallId: "b87066d0-6206-4ea3-87dc-04e4f06d013b",
  types: ["Creature"],
  subtypes: ["Human", "Performer", "Villain"],
  manaCost: { generic: 3, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 3,
  toughness: 3,
  keywords: ["Menace"],
  tier: "vanilla",
};

export const INSATIABLE_HARPY: CardDefinition = {
  id: "insatiable-harpy",
  name: "Insatiable Harpy",
  scryfallId: "1439ed8d-ae11-4159-9420-5d98c6cc93b3",
  types: ["Creature"],
  subtypes: ["Harpy"],
  manaCost: { generic: 2, colors: { B: 2 } },
  colorIdentity: ["B"],
  power: 2,
  toughness: 2,
  keywords: ["Flying", "Lifelink"],
  tier: "vanilla",
};

export const MOONGLOVE_WINNOWER: CardDefinition = {
  id: "moonglove-winnower",
  name: "Moonglove Winnower",
  scryfallId: "effb7761-98a8-4cb8-883a-ddcb91d30c08",
  types: ["Creature"],
  subtypes: ["Elf", "Rogue"],
  manaCost: { generic: 3, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 2,
  toughness: 3,
  keywords: ["Deathtouch"],
  tier: "vanilla",
};

export const NYXBORN_MARAUDER: CardDefinition = {
  id: "nyxborn-marauder",
  name: "Nyxborn Marauder",
  scryfallId: "fd2a923a-1f9c-4a29-9c6b-344ae4d5ae8f",
  types: ["Creature", "Enchantment"],
  subtypes: ["Minotaur"],
  manaCost: { generic: 2, colors: { B: 2 } },
  colorIdentity: ["B"],
  power: 4,
  toughness: 3,
  tier: "vanilla",
};

export const ROTTED_HULK: CardDefinition = {
  id: "rotted-hulk",
  name: "Rotted Hulk",
  scryfallId: "1066644a-ac62-4809-805c-607c645613c5",
  types: ["Creature"],
  subtypes: ["Elemental"],
  manaCost: { generic: 3, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 2,
  toughness: 5,
  tier: "vanilla",
};

export const SKELETAL_CROCODILE: CardDefinition = {
  id: "skeletal-crocodile",
  name: "Skeletal Crocodile",
  scryfallId: "ebcbbd6f-2915-4b4c-85d3-1d9b55d36c11",
  types: ["Creature"],
  subtypes: ["Crocodile", "Skeleton"],
  manaCost: { generic: 3, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 5,
  toughness: 1,
  tier: "vanilla",
};

export const UKUD_COBRA: CardDefinition = {
  id: "ukud-cobra",
  name: "Ukud Cobra",
  scryfallId: "71d2f6ee-af76-48f0-898d-3a19698d2790",
  types: ["Creature"],
  subtypes: ["Snake"],
  manaCost: { generic: 3, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 2,
  toughness: 5,
  keywords: ["Deathtouch"],
  tier: "vanilla",
};

export const VAMPIRE_REVENANT: CardDefinition = {
  id: "vampire-revenant",
  name: "Vampire Revenant",
  scryfallId: "2bd3a6c6-33b8-4530-9d80-c488898afd6e",
  types: ["Creature"],
  subtypes: ["Vampire", "Spirit"],
  manaCost: { generic: 3, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 3,
  toughness: 1,
  keywords: ["Flying"],
  tier: "vanilla",
};

export const ARROGANT_VAMPIRE: CardDefinition = {
  id: "arrogant-vampire",
  name: "Arrogant Vampire",
  scryfallId: "e7342875-d49b-4fa7-a2fb-8dfc5e3d6e4f",
  types: ["Creature"],
  subtypes: ["Vampire"],
  manaCost: { generic: 3, colors: { B: 2 } },
  colorIdentity: ["B"],
  power: 4,
  toughness: 3,
  keywords: ["Flying"],
  tier: "vanilla",
};

export const CANAL_MONITOR: CardDefinition = {
  id: "canal-monitor",
  name: "Canal Monitor",
  scryfallId: "78226edc-87dd-4c38-987c-52aefe0f9531",
  types: ["Creature"],
  subtypes: ["Lizard"],
  manaCost: { generic: 4, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 5,
  toughness: 3,
  tier: "vanilla",
};

export const CATACOMB_SLUG: CardDefinition = {
  id: "catacomb-slug",
  name: "Catacomb Slug",
  scryfallId: "d30d6df7-6199-4b06-9d45-785ee1e2ed3b",
  types: ["Creature"],
  subtypes: ["Slug"],
  manaCost: { generic: 4, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 2,
  toughness: 6,
  tier: "vanilla",
};

export const DREG_REAVER: CardDefinition = {
  id: "dreg-reaver",
  name: "Dreg Reaver",
  scryfallId: "e7771eba-bc2d-40f2-bab4-5e9cc4fe8f34",
  types: ["Creature"],
  subtypes: ["Zombie", "Beast"],
  manaCost: { generic: 4, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 4,
  toughness: 3,
  tier: "vanilla",
};

export const MASS_OF_GHOULS: CardDefinition = {
  id: "mass-of-ghouls",
  name: "Mass of Ghouls",
  scryfallId: "cd816d37-7a9e-485e-9ed9-20c1c15a26dd",
  types: ["Creature"],
  subtypes: ["Zombie", "Warrior"],
  manaCost: { generic: 3, colors: { B: 2 } },
  colorIdentity: ["B"],
  power: 5,
  toughness: 3,
  tier: "vanilla",
};

export const ROTTING_MASTODON: CardDefinition = {
  id: "rotting-mastodon",
  name: "Rotting Mastodon",
  scryfallId: "1564a20a-0e57-4ced-9eda-7acff74274e7",
  types: ["Creature"],
  subtypes: ["Zombie", "Elephant"],
  manaCost: { generic: 4, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 2,
  toughness: 8,
  tier: "vanilla",
};

export const ZOMBIE_GOLIATH: CardDefinition = {
  id: "zombie-goliath",
  name: "Zombie Goliath",
  scryfallId: "a4897302-7726-4827-9fa7-66ac0c264bd4",
  types: ["Creature"],
  subtypes: ["Zombie", "Giant"],
  manaCost: { generic: 4, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 4,
  toughness: 3,
  tier: "vanilla",
};

export const FERAL_ABOMINATION: CardDefinition = {
  id: "feral-abomination",
  name: "Feral Abomination",
  scryfallId: "b2890cb5-7899-42f4-9686-a8b5ac796c23",
  types: ["Creature"],
  subtypes: ["Thrull"],
  manaCost: { generic: 5, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 5,
  toughness: 5,
  keywords: ["Deathtouch"],
  tier: "vanilla",
};

/* ---- Mono-red pool, generated from Scryfall ---- */

export const RORIX_BLADEWING: CardDefinition = {
  id: "rorix-bladewing",
  name: "Rorix Bladewing",
  scryfallId: "32668329-2f62-48ed-8da3-3cb0c3692ed9",
  types: ["Creature"],
  subtypes: ["Dragon"],
  supertypes: ["Legendary"],
  manaCost: { generic: 3, colors: { R: 3 } },
  colorIdentity: ["R"],
  power: 6,
  toughness: 5,
  keywords: ["Flying", "Haste"],
  canBeCommander: true,
  tier: "vanilla",
};

export const CRIMSON_KOBOLDS: CardDefinition = {
  id: "crimson-kobolds",
  name: "Crimson Kobolds",
  scryfallId: "889f4908-42c0-46e2-a83f-394d9fcd58ba",
  types: ["Creature"],
  subtypes: ["Kobold"],
  manaCost: { generic: 0, colors: {  } },
  colorIdentity: ["R"],
  power: 0,
  toughness: 1,
  tier: "vanilla",
};

export const KOBOLDS_OF_KHER_KEEP: CardDefinition = {
  id: "kobolds-of-kher-keep",
  name: "Kobolds of Kher Keep",
  scryfallId: "a6797542-0781-43d6-aa8e-b55e5c1e08c0",
  types: ["Creature"],
  subtypes: ["Kobold"],
  manaCost: { generic: 0, colors: {  } },
  colorIdentity: ["R"],
  power: 0,
  toughness: 1,
  tier: "vanilla",
};

export const MOUNTAIN_BANDIT: CardDefinition = {
  id: "mountain-bandit",
  name: "Mountain Bandit",
  scryfallId: "34fd541d-9956-4595-9527-a83db4c5f74f",
  types: ["Creature"],
  subtypes: ["Human", "Soldier", "Rogue"],
  manaCost: { generic: 0, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 1,
  toughness: 1,
  keywords: ["Haste"],
  tier: "vanilla",
};

export const CAPITAL_GUARD: CardDefinition = {
  id: "capital-guard",
  name: "Capital Guard",
  scryfallId: "91cbed11-3b5c-4e7a-9b13-125c1fe5f22f",
  types: ["Creature"],
  subtypes: ["Human", "Soldier"],
  manaCost: { generic: 1, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 2,
  toughness: 2,
  tier: "vanilla",
};

export const DERANGED_WHELP: CardDefinition = {
  id: "deranged-whelp",
  name: "Deranged Whelp",
  scryfallId: "fd06f9eb-112e-458b-83c8-3761df6d60ff",
  types: ["Creature"],
  subtypes: ["Wolf"],
  manaCost: { generic: 1, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 2,
  toughness: 1,
  keywords: ["Menace"],
  tier: "vanilla",
};

export const GOBLIN_ASSAILANT: CardDefinition = {
  id: "goblin-assailant",
  name: "Goblin Assailant",
  scryfallId: "8cfefb65-b6e4-44a1-baa9-d3c00ee8ba96",
  types: ["Creature"],
  subtypes: ["Goblin", "Warrior"],
  manaCost: { generic: 1, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 2,
  toughness: 2,
  tier: "vanilla",
};

export const GOBLIN_TRAILBLAZER: CardDefinition = {
  id: "goblin-trailblazer",
  name: "Goblin Trailblazer",
  scryfallId: "ca382425-2454-4300-b903-fdefd31582d3",
  types: ["Creature"],
  subtypes: ["Goblin", "Pirate"],
  manaCost: { generic: 1, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 2,
  toughness: 1,
  keywords: ["Menace"],
  tier: "vanilla",
};

export const LEOPARD_SPOTTED_JIAO: CardDefinition = {
  id: "leopard-spotted-jiao",
  name: "Leopard-Spotted Jiao",
  scryfallId: "91df110f-85d2-41cb-96b6-6c79cebfada7",
  types: ["Creature"],
  subtypes: ["Beast"],
  manaCost: { generic: 1, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 3,
  toughness: 1,
  tier: "vanilla",
};

export const ROC_HUNTER: CardDefinition = {
  id: "roc-hunter",
  name: "Roc Hunter",
  scryfallId: "5c8b2f2b-6f19-47f7-bb65-00665989bc30",
  types: ["Creature"],
  subtypes: ["Human", "Soldier"],
  manaCost: { generic: 1, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 3,
  toughness: 1,
  keywords: ["Reach"],
  tier: "vanilla",
};

export const WALL_OF_EARTH: CardDefinition = {
  id: "wall-of-earth",
  name: "Wall of Earth",
  scryfallId: "c12e97c1-ca28-432a-8140-3f08bb4485a3",
  types: ["Creature"],
  subtypes: ["Wall"],
  manaCost: { generic: 1, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 0,
  toughness: 6,
  keywords: ["Defender"],
  tier: "vanilla",
};

export const BALDUVIAN_BARBARIANS: CardDefinition = {
  id: "balduvian-barbarians",
  name: "Balduvian Barbarians",
  scryfallId: "caba00ff-df58-456e-8aeb-fc8b632018a6",
  types: ["Creature"],
  subtypes: ["Human", "Barbarian"],
  manaCost: { generic: 1, colors: { R: 2 } },
  colorIdentity: ["R"],
  power: 3,
  toughness: 2,
  tier: "vanilla",
};

export const BOGGART_BRUTE: CardDefinition = {
  id: "boggart-brute",
  name: "Boggart Brute",
  scryfallId: "3d6de3a7-30a7-49d7-8e39-494355c6edae",
  types: ["Creature"],
  subtypes: ["Goblin", "Warrior"],
  manaCost: { generic: 2, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 3,
  toughness: 2,
  keywords: ["Menace"],
  tier: "vanilla",
};

export const FEARLESS_HALBERDIER: CardDefinition = {
  id: "fearless-halberdier",
  name: "Fearless Halberdier",
  scryfallId: "89f08297-f477-4330-a99e-3f0847c31364",
  types: ["Creature"],
  subtypes: ["Human", "Warrior"],
  manaCost: { generic: 2, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 3,
  toughness: 2,
  tier: "vanilla",
};

export const FRENZIED_RAPTOR: CardDefinition = {
  id: "frenzied-raptor",
  name: "Frenzied Raptor",
  scryfallId: "5fb22ac0-3863-4165-8c93-f2ec1775474f",
  types: ["Creature"],
  subtypes: ["Dinosaur"],
  manaCost: { generic: 2, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 4,
  toughness: 2,
  tier: "vanilla",
};

export const GOBLIN_HERO: CardDefinition = {
  id: "goblin-hero",
  name: "Goblin Hero",
  scryfallId: "c3ed9cd3-5e6a-4e86-b120-ff27b744311d",
  types: ["Creature"],
  subtypes: ["Goblin"],
  manaCost: { generic: 2, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 2,
  toughness: 2,
  tier: "vanilla",
};

export const GORE_SWINE: CardDefinition = {
  id: "gore-swine",
  name: "Gore Swine",
  scryfallId: "31c36d53-1173-4a55-8fb8-63a624fde7de",
  types: ["Creature"],
  subtypes: ["Boar"],
  manaCost: { generic: 2, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 4,
  toughness: 1,
  tier: "vanilla",
};

export const HULKING_BUGBEAR: CardDefinition = {
  id: "hulking-bugbear",
  name: "Hulking Bugbear",
  scryfallId: "f55d43d4-5f63-45c3-b8f8-0aebd23750a5",
  types: ["Creature"],
  subtypes: ["Goblin"],
  manaCost: { generic: 1, colors: { R: 2 } },
  colorIdentity: ["R"],
  power: 3,
  toughness: 3,
  keywords: ["Haste"],
  tier: "vanilla",
};

export const NIMBLE_BIRDSTICKER: CardDefinition = {
  id: "nimble-birdsticker",
  name: "Nimble Birdsticker",
  scryfallId: "4ff9bcbd-48fe-4a74-aae5-a447c99aa64b",
  types: ["Creature"],
  subtypes: ["Goblin"],
  manaCost: { generic: 2, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 2,
  toughness: 3,
  keywords: ["Reach"],
  tier: "vanilla",
};

export const PYROMANTIC_PILGRIM: CardDefinition = {
  id: "pyromantic-pilgrim",
  name: "Pyromantic Pilgrim",
  scryfallId: "f670d02b-9bfc-4671-97ed-59bfbe633d82",
  types: ["Creature"],
  subtypes: ["Human", "Wizard"],
  manaCost: { generic: 2, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 3,
  toughness: 1,
  keywords: ["Haste"],
  tier: "vanilla",
};

export const RAGING_COUGAR: CardDefinition = {
  id: "raging-cougar",
  name: "Raging Cougar",
  scryfallId: "fd9d126a-9db9-4adc-9cf6-11408c63201d",
  types: ["Creature"],
  subtypes: ["Cat"],
  manaCost: { generic: 2, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 2,
  toughness: 2,
  keywords: ["Haste"],
  tier: "vanilla",
};

export const WALL_OF_GRANITE: CardDefinition = {
  id: "wall-of-granite",
  name: "Wall of Granite",
  scryfallId: "70c5ac71-bf45-4b99-8184-36ce88dd728a",
  types: ["Creature"],
  subtypes: ["Wall"],
  manaCost: { generic: 2, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 0,
  toughness: 7,
  keywords: ["Defender"],
  tier: "vanilla",
};

export const WILD_COLOS: CardDefinition = {
  id: "wild-colos",
  name: "Wild Colos",
  scryfallId: "2d39f746-7b82-476a-9774-3375debb47bd",
  types: ["Creature"],
  subtypes: ["Goat", "Beast"],
  manaCost: { generic: 2, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 2,
  toughness: 2,
  keywords: ["Haste"],
  tier: "vanilla",
};

export const BARBARIAN_HORDE: CardDefinition = {
  id: "barbarian-horde",
  name: "Barbarian Horde",
  scryfallId: "d1f930c2-e828-4566-b2df-3b054f311be5",
  types: ["Creature"],
  subtypes: ["Human", "Barbarian", "Soldier"],
  manaCost: { generic: 3, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 3,
  toughness: 3,
  tier: "vanilla",
};

export const COBBLEBRUTE: CardDefinition = {
  id: "cobblebrute",
  name: "Cobblebrute",
  scryfallId: "ffa87a70-c9fb-4ab3-ac16-367888aa775b",
  types: ["Creature"],
  subtypes: ["Elemental"],
  manaCost: { generic: 3, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 5,
  toughness: 2,
  tier: "vanilla",
};

export const DRAGON_MOOSE: CardDefinition = {
  id: "dragon-moose",
  name: "Dragon Moose",
  scryfallId: "fd61f469-5377-4bc1-a42b-dd66ca4ede1d",
  types: ["Creature"],
  subtypes: ["Dragon", "Elk"],
  manaCost: { generic: 3, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 3,
  toughness: 3,
  keywords: ["Haste"],
  tier: "vanilla",
};

export const HIGHLAND_GIANT: CardDefinition = {
  id: "highland-giant",
  name: "Highland Giant",
  scryfallId: "32f49716-1522-4f36-92c9-63ef2059c4ef",
  types: ["Creature"],
  subtypes: ["Giant"],
  manaCost: { generic: 2, colors: { R: 2 } },
  colorIdentity: ["R"],
  power: 3,
  toughness: 4,
  tier: "vanilla",
};

export const HULKING_DEVIL: CardDefinition = {
  id: "hulking-devil",
  name: "Hulking Devil",
  scryfallId: "031ecfc4-cc84-4f74-8eb1-3eaa234d8093",
  types: ["Creature"],
  subtypes: ["Devil"],
  manaCost: { generic: 3, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 5,
  toughness: 2,
  tier: "vanilla",
};

export const KOMODO_RHINO: CardDefinition = {
  id: "komodo-rhino",
  name: "Komodo Rhino",
  scryfallId: "e2b84af1-b40b-476a-87b2-ee8e3a018171",
  types: ["Creature"],
  subtypes: ["Lizard", "Rhino"],
  manaCost: { generic: 3, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 5,
  toughness: 2,
  keywords: ["Trample"],
  tier: "vanilla",
};

export const LIGHTNING_ELEMENTAL: CardDefinition = {
  id: "lightning-elemental",
  name: "Lightning Elemental",
  scryfallId: "5f2a959e-7c17-4226-afcb-bc0bb5a4492b",
  types: ["Creature"],
  subtypes: ["Elemental"],
  manaCost: { generic: 3, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 4,
  toughness: 1,
  keywords: ["Haste"],
  tier: "vanilla",
};

export const MONSTER_MASHUP: CardDefinition = {
  id: "monster-mashup",
  name: "Monster Mashup",
  scryfallId: "e27bc544-ff5f-405c-914e-b727341b776e",
  types: ["Creature"],
  subtypes: ["Werewolf", "Fish", "Zombie", "Vampire"],
  manaCost: { generic: 3, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 4,
  toughness: 3,
  keywords: ["Reach", "Menace"],
  tier: "vanilla",
};

export const OGRE_WARRIOR: CardDefinition = {
  id: "ogre-warrior",
  name: "Ogre Warrior",
  scryfallId: "c0a6848f-7cb3-4ab0-a14a-e7fb62562861",
  types: ["Creature"],
  subtypes: ["Ogre", "Warrior"],
  manaCost: { generic: 3, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 3,
  toughness: 3,
  tier: "vanilla",
};

export const RAGING_MINOTAUR: CardDefinition = {
  id: "raging-minotaur",
  name: "Raging Minotaur",
  scryfallId: "c52f5e44-4ab6-43d7-aecb-5b95f84d5475",
  types: ["Creature"],
  subtypes: ["Minotaur", "Berserker"],
  manaCost: { generic: 2, colors: { R: 2 } },
  colorIdentity: ["R"],
  power: 3,
  toughness: 3,
  keywords: ["Haste"],
  tier: "vanilla",
};

export const SHATTERSKULL_GIANT: CardDefinition = {
  id: "shatterskull-giant",
  name: "Shatterskull Giant",
  scryfallId: "9cfbb4dd-56a2-4a94-9b15-b3ef8b2f1d0b",
  types: ["Creature"],
  subtypes: ["Giant", "Warrior"],
  manaCost: { generic: 2, colors: { R: 2 } },
  colorIdentity: ["R"],
  power: 4,
  toughness: 3,
  tier: "vanilla",
};

export const TALRUUM_MINOTAUR: CardDefinition = {
  id: "talruum-minotaur",
  name: "Talruum Minotaur",
  scryfallId: "4a4f1317-5e9b-4f49-9ed8-4f97f8c4b8d0",
  types: ["Creature"],
  subtypes: ["Minotaur", "Berserker"],
  manaCost: { generic: 2, colors: { R: 2 } },
  colorIdentity: ["R"],
  power: 3,
  toughness: 3,
  keywords: ["Haste"],
  tier: "vanilla",
};

export const TOR_GIANT: CardDefinition = {
  id: "tor-giant",
  name: "Tor Giant",
  scryfallId: "7ef8f279-1a10-4685-99d6-bc971a7f922b",
  types: ["Creature"],
  subtypes: ["Giant"],
  manaCost: { generic: 3, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 3,
  toughness: 3,
  tier: "vanilla",
};

export const VULSHOK_BERSERKER: CardDefinition = {
  id: "vulshok-berserker",
  name: "Vulshok Berserker",
  scryfallId: "1dd6e25f-e58e-4ff8-83f3-b01d5f783632",
  types: ["Creature"],
  subtypes: ["Human", "Berserker"],
  manaCost: { generic: 3, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 3,
  toughness: 2,
  keywords: ["Haste"],
  tier: "vanilla",
};

export const CHARGING_MONSTROSAUR: CardDefinition = {
  id: "charging-monstrosaur",
  name: "Charging Monstrosaur",
  scryfallId: "d5222448-95d1-4b63-ab76-d5060febcf38",
  types: ["Creature"],
  subtypes: ["Dinosaur"],
  manaCost: { generic: 4, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 5,
  toughness: 5,
  keywords: ["Trample", "Haste"],
  tier: "vanilla",
};

export const FIRE_ELEMENTAL: CardDefinition = {
  id: "fire-elemental",
  name: "Fire Elemental",
  scryfallId: "dc506f58-048d-49cc-ad8c-2eb851b08bb6",
  types: ["Creature"],
  subtypes: ["Elemental"],
  manaCost: { generic: 3, colors: { R: 2 } },
  colorIdentity: ["R"],
  power: 5,
  toughness: 4,
  tier: "vanilla",
};

export const GERRARD_S_IRREGULARS: CardDefinition = {
  id: "gerrards-irregulars",
  name: "Gerrard's Irregulars",
  scryfallId: "8a88f507-3d78-4f7f-a91f-8489ad9250f2",
  types: ["Creature"],
  subtypes: ["Human", "Soldier"],
  manaCost: { generic: 4, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 4,
  toughness: 2,
  keywords: ["Trample", "Haste"],
  tier: "vanilla",
};

export const OBSIDIAN_GIANT: CardDefinition = {
  id: "obsidian-giant",
  name: "Obsidian Giant",
  scryfallId: "aad8a194-cee7-4671-8310-19357fc1a450",
  types: ["Creature"],
  subtypes: ["Giant"],
  manaCost: { generic: 4, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 4,
  toughness: 4,
  tier: "vanilla",
};

export const QUAKETUSK_BOAR: CardDefinition = {
  id: "quaketusk-boar",
  name: "Quaketusk Boar",
  scryfallId: "2f2b7fd3-a139-49ea-8a89-b64261e868ef",
  types: ["Creature"],
  subtypes: ["Elemental", "Boar"],
  manaCost: { generic: 3, colors: { R: 2 } },
  colorIdentity: ["R"],
  power: 5,
  toughness: 5,
  keywords: ["Reach", "Trample", "Haste"],
  tier: "vanilla",
};

export const RENEGADE_TROOPS: CardDefinition = {
  id: "renegade-troops",
  name: "Renegade Troops",
  scryfallId: "a75095f4-a77f-4237-ae25-2e6f2f8788c1",
  types: ["Creature"],
  subtypes: ["Human", "Soldier"],
  manaCost: { generic: 4, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 4,
  toughness: 2,
  keywords: ["Haste"],
  tier: "vanilla",
};

export const SHATTERSKULL_RECRUIT: CardDefinition = {
  id: "shatterskull-recruit",
  name: "Shatterskull Recruit",
  scryfallId: "c8add5f2-4ccf-4505-86f6-cc36aff1c3fe",
  types: ["Creature"],
  subtypes: ["Giant", "Warrior", "Ally"],
  manaCost: { generic: 3, colors: { R: 2 } },
  colorIdentity: ["R"],
  power: 4,
  toughness: 4,
  keywords: ["Menace"],
  tier: "vanilla",
};

export const WAYWARD_GIANT: CardDefinition = {
  id: "wayward-giant",
  name: "Wayward Giant",
  scryfallId: "db01e574-7a96-472c-8e5a-bbd503280c71",
  types: ["Creature"],
  subtypes: ["Giant"],
  manaCost: { generic: 4, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 4,
  toughness: 5,
  keywords: ["Menace"],
  tier: "vanilla",
};

export const FLAMEBORN_VIRON: CardDefinition = {
  id: "flameborn-viron",
  name: "Flameborn Viron",
  scryfallId: "9601ea62-a609-4bc5-a2f0-f7615b4dd5fa",
  types: ["Creature"],
  subtypes: ["Phyrexian", "Insect"],
  manaCost: { generic: 4, colors: { R: 2 } },
  colorIdentity: ["R"],
  power: 6,
  toughness: 4,
  tier: "vanilla",
};

export const VOLCANIC_DRAGON: CardDefinition = {
  id: "volcanic-dragon",
  name: "Volcanic Dragon",
  scryfallId: "46419d29-21a1-4753-a2f0-1d0d996ec54e",
  types: ["Creature"],
  subtypes: ["Dragon"],
  manaCost: { generic: 4, colors: { R: 2 } },
  colorIdentity: ["R"],
  power: 4,
  toughness: 4,
  keywords: ["Flying", "Haste"],
  tier: "vanilla",
};

export const CHARGE: CardDefinition = {
  id: "charge",
  name: "Charge",
  scryfallId: "000eded9-854c-408a-aadf-c26209e27432",
  types: ["Instant"],
  manaCost: { generic: 0, colors: { W: 1 } },
  colorIdentity: ["W"],
  castEffect: { kind: "pumpAll", power: 1, toughness: 1, scope: "controller" },
  tier: "scripted",
};
export const MANA_TITHE: CardDefinition = {
  id: "mana-tithe",
  name: "Mana Tithe",
  scryfallId: "9ae707d5-d81d-4320-b947-6016dc188898",
  types: ["Instant"],
  manaCost: { generic: 0, colors: { W: 1 } },
  colorIdentity: ["W"],
  castEffect: { kind: "counter", target: { kind: "spell" }, unlessPays: { generic: 1, colors: {} } },
  tier: "scripted",
};
export const QILIN_S_BLESSING: CardDefinition = {
  id: "qilins-blessing",
  name: "Qilin's Blessing",
  scryfallId: "028ad74f-8366-4c14-b532-63fa892f5784",
  types: ["Instant"],
  manaCost: { generic: 0, colors: { W: 1 } },
  colorIdentity: ["W"],
  castEffect: { kind: "pump", power: 2, toughness: 2, target: { kind: "creature" } },
  tier: "scripted",
};
export const AEGIS_OF_THE_HEAVENS: CardDefinition = {
  id: "aegis-of-the-heavens",
  name: "Aegis of the Heavens",
  scryfallId: "a94f356d-4714-4500-8fb0-1ac68ec5c1cf",
  types: ["Instant"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  castEffect: { kind: "pump", power: 1, toughness: 7, target: { kind: "creature" } },
  tier: "scripted",
};
export const GLORIOUS_CHARGE: CardDefinition = {
  id: "glorious-charge",
  name: "Glorious Charge",
  scryfallId: "f8672cfd-e34b-4587-9e24-015e03c7574d",
  types: ["Instant"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  castEffect: { kind: "pumpAll", power: 1, toughness: 1, scope: "controller" },
  tier: "scripted",
};
export const SACRED_NECTAR: CardDefinition = {
  id: "sacred-nectar",
  name: "Sacred Nectar",
  scryfallId: "bcdd5e1c-47db-4960-860c-2af14b734b59",
  types: ["Sorcery"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  castEffect: { kind: "gainLife", amount: 4 },
  tier: "scripted",
};
export const SHIELD_WALL: CardDefinition = {
  id: "shield-wall",
  name: "Shield Wall",
  scryfallId: "d4b70c30-dbc9-4d30-81d8-b0bde9b626df",
  types: ["Instant"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  castEffect: { kind: "pumpAll", power: 0, toughness: 2, scope: "controller" },
  tier: "scripted",
};
export const SHOW_OF_VALOR: CardDefinition = {
  id: "show-of-valor",
  name: "Show of Valor",
  scryfallId: "1ab07387-a9f2-4325-804e-6383408644fd",
  types: ["Instant"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  castEffect: { kind: "pump", power: 2, toughness: 4, target: { kind: "creature" } },
  tier: "scripted",
};
export const STEADFASTNESS: CardDefinition = {
  id: "steadfastness",
  name: "Steadfastness",
  scryfallId: "c1fafcb8-f1ee-4e76-bcfb-6aea4d49efc5",
  types: ["Sorcery"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  castEffect: { kind: "pumpAll", power: 0, toughness: 3, scope: "controller" },
  tier: "scripted",
};
export const WHITESUN_S_PASSAGE: CardDefinition = {
  id: "whitesuns-passage",
  name: "Whitesun's Passage",
  scryfallId: "a74d1bf3-4630-4be0-af5f-590789d27a0c",
  types: ["Instant"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  castEffect: { kind: "gainLife", amount: 5 },
  tier: "scripted",
};
export const BAR_THE_DOOR: CardDefinition = {
  id: "bar-the-door",
  name: "Bar the Door",
  scryfallId: "b593f544-2d82-4237-b9a9-88503b5036cc",
  types: ["Instant"],
  manaCost: { generic: 2, colors: { W: 1 } },
  colorIdentity: ["W"],
  castEffect: { kind: "pumpAll", power: 0, toughness: 4, scope: "controller" },
  tier: "scripted",
};
export const ETHEREAL_GUIDANCE: CardDefinition = {
  id: "ethereal-guidance",
  name: "Ethereal Guidance",
  scryfallId: "f47dd220-6193-4e31-a1df-591b6424ad27",
  types: ["Sorcery"],
  manaCost: { generic: 2, colors: { W: 1 } },
  colorIdentity: ["W"],
  castEffect: { kind: "pumpAll", power: 2, toughness: 1, scope: "controller" },
  tier: "scripted",
};
export const RIGHTEOUS_CHARGE: CardDefinition = {
  id: "righteous-charge",
  name: "Righteous Charge",
  scryfallId: "f52cb325-4f16-4cf3-9999-feafe0fde8c2",
  types: ["Sorcery"],
  manaCost: { generic: 1, colors: { W: 2 } },
  colorIdentity: ["W"],
  castEffect: { kind: "pumpAll", power: 2, toughness: 2, scope: "controller" },
  tier: "scripted",
};
export const VIRTUOUS_CHARGE: CardDefinition = {
  id: "virtuous-charge",
  name: "Virtuous Charge",
  scryfallId: "72ad4c79-a85d-4fc6-95ab-5a6d6d667579",
  types: ["Sorcery"],
  manaCost: { generic: 2, colors: { W: 1 } },
  colorIdentity: ["W"],
  castEffect: { kind: "pumpAll", power: 1, toughness: 1, scope: "controller" },
  tier: "scripted",
};
export const WARRIOR_S_CHARGE: CardDefinition = {
  id: "warriors-charge",
  name: "Warrior's Charge",
  scryfallId: "8668e4af-ae89-4fab-8015-8dc643c6cd36",
  types: ["Sorcery"],
  manaCost: { generic: 2, colors: { W: 1 } },
  colorIdentity: ["W"],
  castEffect: { kind: "pumpAll", power: 1, toughness: 1, scope: "controller" },
  tier: "scripted",
};
export const WARRIOR_S_HONOR: CardDefinition = {
  id: "warriors-honor",
  name: "Warrior's Honor",
  scryfallId: "09117d06-79e6-4f86-ba92-d1f8fe165147",
  types: ["Instant"],
  manaCost: { generic: 2, colors: { W: 1 } },
  colorIdentity: ["W"],
  castEffect: { kind: "pumpAll", power: 1, toughness: 1, scope: "controller" },
  tier: "scripted",
};
export const INSPIRED_CHARGE: CardDefinition = {
  id: "inspired-charge",
  name: "Inspired Charge",
  scryfallId: "9f17e624-219a-4e76-bfe0-f49c9ddd4a6d",
  types: ["Instant"],
  manaCost: { generic: 2, colors: { W: 2 } },
  colorIdentity: ["W"],
  castEffect: { kind: "pumpAll", power: 2, toughness: 1, scope: "controller" },
  tier: "scripted",
};
export const SOLIDARITY: CardDefinition = {
  id: "solidarity",
  name: "Solidarity",
  scryfallId: "7810eec1-9bb4-480f-9074-712ad9eb8fba",
  types: ["Instant"],
  manaCost: { generic: 3, colors: { W: 1 } },
  colorIdentity: ["W"],
  castEffect: { kind: "pumpAll", power: 0, toughness: 5, scope: "controller" },
  tier: "scripted",
};
export const FORCE_SPIKE: CardDefinition = {
  id: "force-spike",
  name: "Force Spike",
  scryfallId: "97a6c6c9-dd26-4ce7-850f-0b3fc49245bd",
  types: ["Instant"],
  manaCost: { generic: 0, colors: { U: 1 } },
  colorIdentity: ["U"],
  castEffect: { kind: "counter", target: { kind: "spell" }, unlessPays: { generic: 1, colors: {} } },
  tier: "scripted",
};
export const HYDROSURGE: CardDefinition = {
  id: "hydrosurge",
  name: "Hydrosurge",
  scryfallId: "1fd4dacb-912e-4e54-ab60-16a5262d0fbb",
  types: ["Instant"],
  manaCost: { generic: 0, colors: { U: 1 } },
  colorIdentity: ["U"],
  castEffect: { kind: "pump", power: -5, toughness: 0, target: { kind: "creature" } },
  tier: "scripted",
};
export const REACH_THROUGH_MISTS: CardDefinition = {
  id: "reach-through-mists",
  name: "Reach Through Mists",
  scryfallId: "0b6d5d29-4f38-4229-ac50-c4fa97fcc536",
  types: ["Instant"],
  manaCost: { generic: 0, colors: { U: 1 } },
  colorIdentity: ["U"],
  castEffect: { kind: "draw", amount: 1 },
  tier: "scripted",
};
export const COUNTERSPELL: CardDefinition = {
  id: "counterspell",
  name: "Counterspell",
  scryfallId: "4f616706-ec97-4923-bb1e-11a69fbaa1f8",
  types: ["Instant"],
  manaCost: { generic: 0, colors: { U: 2 } },
  colorIdentity: ["U"],
  castEffect: { kind: "counter", target: { kind: "spell" } },
  tier: "scripted",
};
export const IT_LL_QUENCH_YA: CardDefinition = {
  id: "itll-quench-ya",
  name: "It'll Quench Ya!",
  scryfallId: "47c25e41-f43c-4447-81b5-b9631448bd29",
  types: ["Instant"],
  manaCost: { generic: 1, colors: { U: 1 } },
  colorIdentity: ["U"],
  castEffect: { kind: "counter", target: { kind: "spell" }, unlessPays: { generic: 2, colors: {} } },
  tier: "scripted",
};
export const MANA_LEAK: CardDefinition = {
  id: "mana-leak",
  name: "Mana Leak",
  scryfallId: "179236d9-6fe2-4db6-bdfb-f851e8d531a2",
  types: ["Instant"],
  manaCost: { generic: 1, colors: { U: 1 } },
  colorIdentity: ["U"],
  castEffect: { kind: "counter", target: { kind: "spell" }, unlessPays: { generic: 3, colors: {} } },
  tier: "scripted",
};
export const QUENCH: CardDefinition = {
  id: "quench",
  name: "Quench",
  scryfallId: "1779a6c5-147d-4632-b1d9-95e89a64dc2c",
  types: ["Instant"],
  manaCost: { generic: 1, colors: { U: 1 } },
  colorIdentity: ["U"],
  castEffect: { kind: "counter", target: { kind: "spell" }, unlessPays: { generic: 2, colors: {} } },
  tier: "scripted",
};
export const CANCEL: CardDefinition = {
  id: "cancel",
  name: "Cancel",
  scryfallId: "475bff39-220a-4490-9c2e-d311e306a6db",
  types: ["Instant"],
  manaCost: { generic: 1, colors: { U: 2 } },
  colorIdentity: ["U"],
  castEffect: { kind: "counter", target: { kind: "spell" } },
  tier: "scripted",
};
export const CONVOLUTE: CardDefinition = {
  id: "convolute",
  name: "Convolute",
  scryfallId: "3fd8e607-8179-4ae8-ba7f-f5f22649dc18",
  types: ["Instant"],
  manaCost: { generic: 2, colors: { U: 1 } },
  colorIdentity: ["U"],
  castEffect: { kind: "counter", target: { kind: "spell" }, unlessPays: { generic: 4, colors: {} } },
  tier: "scripted",
};
export const COUNSEL_OF_THE_SORATAMI: CardDefinition = {
  id: "counsel-of-the-soratami",
  name: "Counsel of the Soratami",
  scryfallId: "1224718a-e1a7-473d-ac9d-497e624376cd",
  types: ["Sorcery"],
  manaCost: { generic: 2, colors: { U: 1 } },
  colorIdentity: ["U"],
  castEffect: { kind: "draw", amount: 2 },
  tier: "scripted",
};
export const DIVINATION: CardDefinition = {
  id: "divination",
  name: "Divination",
  scryfallId: "cb3b35b8-f321-46d8-a441-6b9a6efa9021",
  types: ["Sorcery"],
  manaCost: { generic: 2, colors: { U: 1 } },
  colorIdentity: ["U"],
  castEffect: { kind: "draw", amount: 2 },
  tier: "scripted",
};
export const QUICK_STUDY: CardDefinition = {
  id: "quick-study",
  name: "Quick Study",
  scryfallId: "2d4f0bc7-da7c-4749-a24c-b01f3eb5860c",
  types: ["Instant"],
  manaCost: { generic: 2, colors: { U: 1 } },
  colorIdentity: ["U"],
  castEffect: { kind: "draw", amount: 2 },
  tier: "scripted",
};
export const CONCENTRATE: CardDefinition = {
  id: "concentrate",
  name: "Concentrate",
  scryfallId: "5aca3338-30a6-4ce4-b74c-a18144b6efc9",
  types: ["Sorcery"],
  manaCost: { generic: 2, colors: { U: 2 } },
  colorIdentity: ["U"],
  castEffect: { kind: "draw", amount: 3 },
  tier: "scripted",
};
export const DISORIENT: CardDefinition = {
  id: "disorient",
  name: "Disorient",
  scryfallId: "17965a3c-92b4-4f01-b076-e40c567eed33",
  types: ["Instant"],
  manaCost: { generic: 3, colors: { U: 1 } },
  colorIdentity: ["U"],
  castEffect: { kind: "pump", power: -7, toughness: 0, target: { kind: "creature" } },
  tier: "scripted",
};
export const MINDSTATIC: CardDefinition = {
  id: "mindstatic",
  name: "Mindstatic",
  scryfallId: "55d3fad5-a12a-4b41-9c7b-c1af5e0b5ca8",
  types: ["Instant"],
  manaCost: { generic: 3, colors: { U: 1 } },
  colorIdentity: ["U"],
  castEffect: { kind: "counter", target: { kind: "spell" }, unlessPays: { generic: 6, colors: {} } },
  tier: "scripted",
};
export const TOUCH_OF_BRILLIANCE: CardDefinition = {
  id: "touch-of-brilliance",
  name: "Touch of Brilliance",
  scryfallId: "bddd159a-6a42-465c-afcc-69ad6695f35a",
  types: ["Sorcery"],
  manaCost: { generic: 3, colors: { U: 1 } },
  colorIdentity: ["U"],
  castEffect: { kind: "draw", amount: 2 },
  tier: "scripted",
};
export const WEAVE_FATE: CardDefinition = {
  id: "weave-fate",
  name: "Weave Fate",
  scryfallId: "04e57fc1-1633-447f-ae32-ad7da25a4177",
  types: ["Instant"],
  manaCost: { generic: 3, colors: { U: 1 } },
  colorIdentity: ["U"],
  castEffect: { kind: "draw", amount: 2 },
  tier: "scripted",
};
export const BRILLIANT_PLAN: CardDefinition = {
  id: "brilliant-plan",
  name: "Brilliant Plan",
  scryfallId: "115a5d53-8638-44a9-a889-f2d73a02e672",
  types: ["Sorcery"],
  manaCost: { generic: 4, colors: { U: 1 } },
  colorIdentity: ["U"],
  castEffect: { kind: "draw", amount: 3 },
  tier: "scripted",
};
export const JACE_S_INGENUITY: CardDefinition = {
  id: "jaces-ingenuity",
  name: "Jace's Ingenuity",
  scryfallId: "ad4932ba-e272-4f22-89f5-a6153ca570b5",
  types: ["Instant"],
  manaCost: { generic: 3, colors: { U: 2 } },
  colorIdentity: ["U"],
  castEffect: { kind: "draw", amount: 3 },
  tier: "scripted",
};
export const TIDINGS: CardDefinition = {
  id: "tidings",
  name: "Tidings",
  scryfallId: "6a123f44-0a72-46d0-a73d-b4ab01b6c2df",
  types: ["Sorcery"],
  manaCost: { generic: 3, colors: { U: 2 } },
  colorIdentity: ["U"],
  castEffect: { kind: "draw", amount: 4 },
  tier: "scripted",
};
export const CHORUS_OF_WOE: CardDefinition = {
  id: "chorus-of-woe",
  name: "Chorus of Woe",
  scryfallId: "ee70f692-35c4-4ea8-baad-c950725cfc30",
  types: ["Sorcery"],
  manaCost: { generic: 0, colors: { B: 1 } },
  colorIdentity: ["B"],
  castEffect: { kind: "pumpAll", power: 1, toughness: 0, scope: "controller" },
  tier: "scripted",
};
export const DISFIGURE: CardDefinition = {
  id: "disfigure",
  name: "Disfigure",
  scryfallId: "aaa9c6f1-3938-448b-bdc3-22420c5984d3",
  types: ["Instant"],
  manaCost: { generic: 0, colors: { B: 1 } },
  colorIdentity: ["B"],
  castEffect: { kind: "pump", power: -2, toughness: -2, target: { kind: "creature" } },
  tier: "scripted",
};
export const HELL_SWARM: CardDefinition = {
  id: "hell-swarm",
  name: "Hell Swarm",
  scryfallId: "64164d1b-75f4-456e-a717-90ce554dc16c",
  types: ["Instant"],
  manaCost: { generic: 0, colors: { B: 1 } },
  colorIdentity: ["B"],
  castEffect: { kind: "pumpAll", power: -1, toughness: 0, scope: "all" },
  tier: "scripted",
};
export const MARSH_GAS: CardDefinition = {
  id: "marsh-gas",
  name: "Marsh Gas",
  scryfallId: "c8c65bf9-cbab-45ee-9c6e-f8ee832dbe61",
  types: ["Instant"],
  manaCost: { generic: 0, colors: { B: 1 } },
  colorIdentity: ["B"],
  castEffect: { kind: "pumpAll", power: -2, toughness: 0, scope: "all" },
  tier: "scripted",
};
export const SCARE_TACTICS: CardDefinition = {
  id: "scare-tactics",
  name: "Scare Tactics",
  scryfallId: "6a9d4e11-ce2e-445a-9536-756a6687d6d7",
  types: ["Instant"],
  manaCost: { generic: 0, colors: { B: 1 } },
  colorIdentity: ["B"],
  castEffect: { kind: "pumpAll", power: 1, toughness: 0, scope: "controller" },
  tier: "scripted",
};
export const STAB: CardDefinition = {
  id: "stab",
  name: "Stab",
  scryfallId: "6859a5ba-1c1c-4631-bba8-f9900b827178",
  types: ["Instant"],
  manaCost: { generic: 0, colors: { B: 1 } },
  colorIdentity: ["B"],
  castEffect: { kind: "pump", power: -2, toughness: -2, target: { kind: "creature" } },
  tier: "scripted",
};
export const WRING_FLESH: CardDefinition = {
  id: "wring-flesh",
  name: "Wring Flesh",
  scryfallId: "d6b77692-08aa-40b6-b21b-c29a2dc87709",
  types: ["Instant"],
  manaCost: { generic: 0, colors: { B: 1 } },
  colorIdentity: ["B"],
  castEffect: { kind: "pump", power: -3, toughness: -1, target: { kind: "creature" } },
  tier: "scripted",
};
export const DARK_DEED: CardDefinition = {
  id: "dark-deed",
  name: "Dark Deed",
  scryfallId: "49e36cac-3999-40b3-91b3-85af4fded679",
  types: ["Instant"],
  manaCost: { generic: 1, colors: { B: 1 } },
  colorIdentity: ["B"],
  castEffect: { kind: "pump", power: -4, toughness: -4, target: { kind: "creature" } },
  tier: "scripted",
};
export const DARK_REMEDY: CardDefinition = {
  id: "dark-remedy",
  name: "Dark Remedy",
  scryfallId: "5c926d38-a741-47a9-8961-f5bcf2909939",
  types: ["Instant"],
  manaCost: { generic: 1, colors: { B: 1 } },
  colorIdentity: ["B"],
  castEffect: { kind: "pump", power: 1, toughness: 3, target: { kind: "creature" } },
  tier: "scripted",
};
export const GRASP_OF_DARKNESS: CardDefinition = {
  id: "grasp-of-darkness",
  name: "Grasp of Darkness",
  scryfallId: "7737b578-8ae3-4846-b508-93ef40f25244",
  types: ["Instant"],
  manaCost: { generic: 0, colors: { B: 2 } },
  colorIdentity: ["B"],
  castEffect: { kind: "pump", power: -4, toughness: -4, target: { kind: "creature" } },
  tier: "scripted",
};
export const LAST_GASP: CardDefinition = {
  id: "last-gasp",
  name: "Last Gasp",
  scryfallId: "da5f3729-6ec7-4482-90cb-83b973edeae4",
  types: ["Instant"],
  manaCost: { generic: 1, colors: { B: 1 } },
  colorIdentity: ["B"],
  castEffect: { kind: "pump", power: -3, toughness: -3, target: { kind: "creature" } },
  tier: "scripted",
};
export const NAUSEA: CardDefinition = {
  id: "nausea",
  name: "Nausea",
  scryfallId: "2569173f-df5e-4518-9fb3-f972210595df",
  types: ["Sorcery"],
  manaCost: { generic: 1, colors: { B: 1 } },
  colorIdentity: ["B"],
  castEffect: { kind: "pumpAll", power: -1, toughness: -1, scope: "all" },
  tier: "scripted",
};
export const SCORPION_S_STING: CardDefinition = {
  id: "scorpions-sting",
  name: "Scorpion's Sting",
  scryfallId: "0fb03437-32cf-4c97-bf91-ea8b2ad3f964",
  types: ["Instant"],
  manaCost: { generic: 1, colors: { B: 1 } },
  colorIdentity: ["B"],
  castEffect: { kind: "pump", power: -3, toughness: -3, target: { kind: "creature" } },
  tier: "scripted",
};
export const SHRIVEL: CardDefinition = {
  id: "shrivel",
  name: "Shrivel",
  scryfallId: "db5460a0-1aae-45bf-a2aa-5b95fd29d06f",
  types: ["Sorcery"],
  manaCost: { generic: 1, colors: { B: 1 } },
  colorIdentity: ["B"],
  castEffect: { kind: "pumpAll", power: -1, toughness: -1, scope: "all" },
  tier: "scripted",
};
export const DESPERATE_CHARGE: CardDefinition = {
  id: "desperate-charge",
  name: "Desperate Charge",
  scryfallId: "304cc153-36ac-4527-a6e2-91d994bcc35c",
  types: ["Sorcery"],
  manaCost: { generic: 2, colors: { B: 1 } },
  colorIdentity: ["B"],
  castEffect: { kind: "pumpAll", power: 2, toughness: 0, scope: "controller" },
  tier: "scripted",
};
export const HOWLING_FURY: CardDefinition = {
  id: "howling-fury",
  name: "Howling Fury",
  scryfallId: "b7107b11-308e-4eb1-b16f-1fe92ecfe903",
  types: ["Sorcery"],
  manaCost: { generic: 2, colors: { B: 1 } },
  colorIdentity: ["B"],
  castEffect: { kind: "pump", power: 4, toughness: 0, target: { kind: "creature" } },
  tier: "scripted",
};
export const INFEST: CardDefinition = {
  id: "infest",
  name: "Infest",
  scryfallId: "332cd61d-b9b9-4214-bb2d-3073e12911fc",
  types: ["Sorcery"],
  manaCost: { generic: 1, colors: { B: 2 } },
  colorIdentity: ["B"],
  castEffect: { kind: "pumpAll", power: -2, toughness: -2, scope: "all" },
  tier: "scripted",
};
export const OVERKILL: CardDefinition = {
  id: "overkill",
  name: "Overkill",
  scryfallId: "ae075e71-d33d-4d6c-b4a5-0b47dd6fd196",
  types: ["Instant"],
  manaCost: { generic: 2, colors: { B: 1 } },
  colorIdentity: ["B"],
  castEffect: { kind: "pump", power: 0, toughness: -9999, target: { kind: "creature" } },
  tier: "scripted",
};
export const TAR_SNARE: CardDefinition = {
  id: "tar-snare",
  name: "Tar Snare",
  scryfallId: "06ee017c-25ae-4668-8cfe-ae3b55e851aa",
  types: ["Instant"],
  manaCost: { generic: 2, colors: { B: 1 } },
  colorIdentity: ["B"],
  castEffect: { kind: "pump", power: -3, toughness: -2, target: { kind: "creature" } },
  tier: "scripted",
};
export const FATAL_FUMES: CardDefinition = {
  id: "fatal-fumes",
  name: "Fatal Fumes",
  scryfallId: "967aa636-a11d-4c5c-ba85-648734b295c2",
  types: ["Instant"],
  manaCost: { generic: 3, colors: { B: 1 } },
  colorIdentity: ["B"],
  castEffect: { kind: "pump", power: -4, toughness: -2, target: { kind: "creature" } },
  tier: "scripted",
};
export const FLATTEN: CardDefinition = {
  id: "flatten",
  name: "Flatten",
  scryfallId: "a2acae67-5238-40bb-a173-6fc858264a6c",
  types: ["Instant"],
  manaCost: { generic: 3, colors: { B: 1 } },
  colorIdentity: ["B"],
  castEffect: { kind: "pump", power: -4, toughness: -4, target: { kind: "creature" } },
  tier: "scripted",
};
export const LANGUISH: CardDefinition = {
  id: "languish",
  name: "Languish",
  scryfallId: "9b53ce1b-9353-42ad-89a0-36e907ba576a",
  types: ["Sorcery"],
  manaCost: { generic: 2, colors: { B: 2 } },
  colorIdentity: ["B"],
  castEffect: { kind: "pumpAll", power: -4, toughness: -4, scope: "all" },
  tier: "scripted",
};
export const STRANGLING_SPORES: CardDefinition = {
  id: "strangling-spores",
  name: "Strangling Spores",
  scryfallId: "300468ab-fbae-42ae-97bc-b08f795efa5c",
  types: ["Instant"],
  manaCost: { generic: 3, colors: { B: 1 } },
  colorIdentity: ["B"],
  castEffect: { kind: "pump", power: -3, toughness: -3, target: { kind: "creature" } },
  tier: "scripted",
};
export const WANDER_OFF: CardDefinition = {
  id: "wander-off",
  name: "Wander Off",
  scryfallId: "3d409512-50b9-4a38-91b0-19ba25227992",
  types: ["Instant"],
  manaCost: { generic: 3, colors: { B: 1 } },
  colorIdentity: ["B"],
  castEffect: { kind: "exile", target: { kind: "creature" } },
  tier: "scripted",
};
export const DEMON_S_GRASP: CardDefinition = {
  id: "demons-grasp",
  name: "Demon's Grasp",
  scryfallId: "8ee78a0d-8a76-4d21-b65c-03f27f1a96c5",
  types: ["Sorcery"],
  manaCost: { generic: 4, colors: { B: 1 } },
  colorIdentity: ["B"],
  castEffect: { kind: "pump", power: -5, toughness: -5, target: { kind: "creature" } },
  tier: "scripted",
};
export const FINAL_DEATH: CardDefinition = {
  id: "final-death",
  name: "Final Death",
  scryfallId: "8e5b8580-9198-4735-83c1-289400c1d814",
  types: ["Instant"],
  manaCost: { generic: 4, colors: { B: 1 } },
  colorIdentity: ["B"],
  castEffect: { kind: "exile", target: { kind: "creature" } },
  tier: "scripted",
};
export const LASH_OF_THE_WHIP: CardDefinition = {
  id: "lash-of-the-whip",
  name: "Lash of the Whip",
  scryfallId: "ba32cf1f-375c-4cc5-9963-c4f9510e3b39",
  types: ["Instant"],
  manaCost: { generic: 4, colors: { B: 1 } },
  colorIdentity: ["B"],
  castEffect: { kind: "pump", power: -4, toughness: -4, target: { kind: "creature" } },
  tier: "scripted",
};
export const THROTTLE: CardDefinition = {
  id: "throttle",
  name: "Throttle",
  scryfallId: "953f9001-17b2-4087-8d87-5dbaa6c48b16",
  types: ["Instant"],
  manaCost: { generic: 4, colors: { B: 1 } },
  colorIdentity: ["B"],
  castEffect: { kind: "pump", power: -4, toughness: -4, target: { kind: "creature" } },
  tier: "scripted",
};
export const EYES_OF_THE_BEHOLDER: CardDefinition = {
  id: "eyes-of-the-beholder",
  name: "Eyes of the Beholder",
  scryfallId: "3f9e5402-690f-497d-ada3-aa41fa900fdd",
  types: ["Instant"],
  manaCost: { generic: 4, colors: { B: 2 } },
  colorIdentity: ["B"],
  castEffect: { kind: "pump", power: -11, toughness: -11, target: { kind: "creature" } },
  tier: "scripted",
};
export const PULL_UNDER: CardDefinition = {
  id: "pull-under",
  name: "Pull Under",
  scryfallId: "016afdaa-29bf-4690-bdfe-9074087a191c",
  types: ["Instant"],
  manaCost: { generic: 5, colors: { B: 1 } },
  colorIdentity: ["B"],
  castEffect: { kind: "pump", power: -5, toughness: -5, target: { kind: "creature" } },
  tier: "scripted",
};
export const BANNERS_RAISED: CardDefinition = {
  id: "banners-raised",
  name: "Banners Raised",
  scryfallId: "a7792df3-e2ab-4e60-abee-f24b72807107",
  types: ["Instant"],
  manaCost: { generic: 0, colors: { R: 1 } },
  colorIdentity: ["R"],
  castEffect: { kind: "pumpAll", power: 1, toughness: 0, scope: "controller" },
  tier: "scripted",
};
export const BRUTE_FORCE: CardDefinition = {
  id: "brute-force",
  name: "Brute Force",
  scryfallId: "89db7256-3bd0-4c1d-9c6f-de81f7d3c1a2",
  types: ["Instant"],
  manaCost: { generic: 0, colors: { R: 1 } },
  colorIdentity: ["R"],
  castEffect: { kind: "pump", power: 3, toughness: 3, target: { kind: "creature" } },
  tier: "scripted",
};
export const BULL_RUSH: CardDefinition = {
  id: "bull-rush",
  name: "Bull Rush",
  scryfallId: "9ed55a4d-d99c-44ae-a5b9-fd9d1b8477f9",
  types: ["Instant"],
  manaCost: { generic: 0, colors: { R: 1 } },
  colorIdentity: ["R"],
  castEffect: { kind: "pump", power: 2, toughness: 0, target: { kind: "creature" } },
  tier: "scripted",
};
export const INFURIATE: CardDefinition = {
  id: "infuriate",
  name: "Infuriate",
  scryfallId: "85a74392-4056-428c-a807-b062957e838e",
  types: ["Instant"],
  manaCost: { generic: 0, colors: { R: 1 } },
  colorIdentity: ["R"],
  castEffect: { kind: "pump", power: 3, toughness: 2, target: { kind: "creature" } },
  tier: "scripted",
};
export const SCORCHING_SPEAR: CardDefinition = {
  id: "scorching-spear",
  name: "Scorching Spear",
  scryfallId: "3f8933af-afab-4c81-94a6-eee8da146231",
  types: ["Sorcery"],
  manaCost: { generic: 0, colors: { R: 1 } },
  colorIdentity: ["R"],
  castEffect: { kind: "damage", amount: 1, target: { kind: "any-target" } },
  tier: "scripted",
};
export const TARFIRE: CardDefinition = {
  id: "tarfire",
  name: "Tarfire",
  scryfallId: "5841e5dd-2a4a-42b9-a04f-d7c5c4840d74",
  types: ["Instant"],
  manaCost: { generic: 0, colors: { R: 1 } },
  colorIdentity: ["R"],
  castEffect: { kind: "damage", amount: 2, target: { kind: "any-target" } },
  tier: "scripted",
};
export const ZUKO_S_OFFENSE: CardDefinition = {
  id: "zukos-offense",
  name: "Zuko's Offense",
  scryfallId: "efc6eea1-9872-47e5-a3bc-3c8c1b9705be",
  types: ["Sorcery"],
  manaCost: { generic: 0, colors: { R: 1 } },
  colorIdentity: ["R"],
  castEffect: { kind: "damage", amount: 2, target: { kind: "any-target" } },
  tier: "scripted",
};
export const ANTAGONIZE: CardDefinition = {
  id: "antagonize",
  name: "Antagonize",
  scryfallId: "8bac1d2a-99dd-40b3-8823-ce9225efcdcf",
  types: ["Instant"],
  manaCost: { generic: 1, colors: { R: 1 } },
  colorIdentity: ["R"],
  castEffect: { kind: "pump", power: 4, toughness: 3, target: { kind: "creature" } },
  tier: "scripted",
};
export const FIRE_AMBUSH: CardDefinition = {
  id: "fire-ambush",
  name: "Fire Ambush",
  scryfallId: "e6a4a1ae-7620-4656-a2a8-5e2c16db8f85",
  types: ["Sorcery"],
  manaCost: { generic: 1, colors: { R: 1 } },
  colorIdentity: ["R"],
  castEffect: { kind: "damage", amount: 3, target: { kind: "any-target" } },
  tier: "scripted",
};
export const FISTS_OF_THE_ANVIL: CardDefinition = {
  id: "fists-of-the-anvil",
  name: "Fists of the Anvil",
  scryfallId: "5fab4a7e-ef8a-4f38-b659-5598a2ead833",
  types: ["Instant"],
  manaCost: { generic: 1, colors: { R: 1 } },
  colorIdentity: ["R"],
  castEffect: { kind: "pump", power: 4, toughness: 0, target: { kind: "creature" } },
  tier: "scripted",
};
export const LIGHTNING_STRIKE: CardDefinition = {
  id: "lightning-strike",
  name: "Lightning Strike",
  scryfallId: "88b13bc0-da54-4c3b-917c-7c8345a329f5",
  types: ["Instant"],
  manaCost: { generic: 1, colors: { R: 1 } },
  colorIdentity: ["R"],
  castEffect: { kind: "damage", amount: 3, target: { kind: "any-target" } },
  tier: "scripted",
};
export const SEARING_SPEAR: CardDefinition = {
  id: "searing-spear",
  name: "Searing Spear",
  scryfallId: "44c5f884-d071-40c2-bb2c-925dc2197ea3",
  types: ["Instant"],
  manaCost: { generic: 1, colors: { R: 1 } },
  colorIdentity: ["R"],
  castEffect: { kind: "damage", amount: 3, target: { kind: "any-target" } },
  tier: "scripted",
};
export const VOLCANIC_HAMMER: CardDefinition = {
  id: "volcanic-hammer",
  name: "Volcanic Hammer",
  scryfallId: "9db3f454-4aeb-4e48-b961-bea760ea8ddf",
  types: ["Sorcery"],
  manaCost: { generic: 1, colors: { R: 1 } },
  colorIdentity: ["R"],
  castEffect: { kind: "damage", amount: 3, target: { kind: "any-target" } },
  tier: "scripted",
};
export const BURN_BRIGHT: CardDefinition = {
  id: "burn-bright",
  name: "Burn Bright",
  scryfallId: "d10a0f92-c42d-4257-8f64-89fe26687fba",
  types: ["Instant"],
  manaCost: { generic: 2, colors: { R: 1 } },
  colorIdentity: ["R"],
  castEffect: { kind: "pumpAll", power: 2, toughness: 0, scope: "controller" },
  tier: "scripted",
};
export const OPEN_FIRE: CardDefinition = {
  id: "open-fire",
  name: "Open Fire",
  scryfallId: "448f9fb5-ffb5-4325-9f81-ce8782e5f9e9",
  types: ["Instant"],
  manaCost: { generic: 2, colors: { R: 1 } },
  colorIdentity: ["R"],
  castEffect: { kind: "damage", amount: 3, target: { kind: "any-target" } },
  tier: "scripted",
};
export const PATH_OF_ANGER_S_FLAME: CardDefinition = {
  id: "path-of-angers-flame",
  name: "Path of Anger's Flame",
  scryfallId: "046fd4b1-d3a4-4859-a0d4-0e8341e6c6c7",
  types: ["Instant"],
  manaCost: { generic: 2, colors: { R: 1 } },
  colorIdentity: ["R"],
  castEffect: { kind: "pumpAll", power: 2, toughness: 0, scope: "controller" },
  tier: "scripted",
};
export const PRECISION_BOLT: CardDefinition = {
  id: "precision-bolt",
  name: "Precision Bolt",
  scryfallId: "a59b4e5b-e9e0-4507-b9e7-8fba7e3a54f9",
  types: ["Sorcery"],
  manaCost: { generic: 2, colors: { R: 1 } },
  colorIdentity: ["R"],
  castEffect: { kind: "damage", amount: 3, target: { kind: "any-target" } },
  tier: "scripted",
};
export const FLAME_LASH: CardDefinition = {
  id: "flame-lash",
  name: "Flame Lash",
  scryfallId: "c6440439-7178-4a97-9e18-7fdef4b02678",
  types: ["Instant"],
  manaCost: { generic: 3, colors: { R: 1 } },
  colorIdentity: ["R"],
  castEffect: { kind: "damage", amount: 4, target: { kind: "any-target" } },
  tier: "scripted",
};
export const LIGHTNING_BLAST: CardDefinition = {
  id: "lightning-blast",
  name: "Lightning Blast",
  scryfallId: "2ca1ead8-44d8-406f-af36-276f41a47904",
  types: ["Instant"],
  manaCost: { generic: 3, colors: { R: 1 } },
  colorIdentity: ["R"],
  castEffect: { kind: "damage", amount: 4, target: { kind: "any-target" } },
  tier: "scripted",
};
export const CLEANSING_SCREECH: CardDefinition = {
  id: "cleansing-screech",
  name: "Cleansing Screech",
  scryfallId: "79928b26-fcac-4c3f-9edd-292769c2e56e",
  types: ["Sorcery"],
  manaCost: { generic: 4, colors: { R: 1 } },
  colorIdentity: ["R"],
  castEffect: { kind: "damage", amount: 4, target: { kind: "any-target" } },
  tier: "scripted",
};
export const UNFRIENDLY_FIRE: CardDefinition = {
  id: "unfriendly-fire",
  name: "Unfriendly Fire",
  scryfallId: "7a61b274-0499-4cb6-a2e4-f5e18ad7fd2d",
  types: ["Instant"],
  manaCost: { generic: 4, colors: { R: 1 } },
  colorIdentity: ["R"],
  castEffect: { kind: "damage", amount: 4, target: { kind: "any-target" } },
  tier: "scripted",
};
export const EXPLOSIVE_IMPACT: CardDefinition = {
  id: "explosive-impact",
  name: "Explosive Impact",
  scryfallId: "3a3e2b45-b086-4ffd-aa1a-1d03046e0d61",
  types: ["Instant"],
  manaCost: { generic: 5, colors: { R: 1 } },
  colorIdentity: ["R"],
  castEffect: { kind: "damage", amount: 5, target: { kind: "any-target" } },
  tier: "scripted",
};
export const CINDER_STORM: CardDefinition = {
  id: "cinder-storm",
  name: "Cinder Storm",
  scryfallId: "650a5856-b8a4-445a-93d2-f3869a03031f",
  types: ["Sorcery"],
  manaCost: { generic: 6, colors: { R: 1 } },
  colorIdentity: ["R"],
  castEffect: { kind: "damage", amount: 7, target: { kind: "any-target" } },
  tier: "scripted",
};
export const SEARING_WIND: CardDefinition = {
  id: "searing-wind",
  name: "Searing Wind",
  scryfallId: "61afd3c5-7103-4247-8bb9-747532ae4265",
  types: ["Instant"],
  manaCost: { generic: 8, colors: { R: 1 } },
  colorIdentity: ["R"],
  castEffect: { kind: "damage", amount: 10, target: { kind: "any-target" } },
  tier: "scripted",
};
export const GIANT_GROWTH: CardDefinition = {
  id: "giant-growth",
  name: "Giant Growth",
  scryfallId: "fd1f95bf-48ea-455a-8a6c-0249b11c8900",
  types: ["Instant"],
  manaCost: { generic: 0, colors: { G: 1 } },
  colorIdentity: ["G"],
  castEffect: { kind: "pump", power: 3, toughness: 3, target: { kind: "creature" } },
  tier: "scripted",
};
export const SHRINK: CardDefinition = {
  id: "shrink",
  name: "Shrink",
  scryfallId: "c4e319d7-53f3-40e8-9a75-fe1fd8716733",
  types: ["Instant"],
  manaCost: { generic: 0, colors: { G: 1 } },
  colorIdentity: ["G"],
  castEffect: { kind: "pump", power: -5, toughness: 0, target: { kind: "creature" } },
  tier: "scripted",
};
export const FERAL_FEROCITY: CardDefinition = {
  id: "feral-ferocity",
  name: "Feral Ferocity",
  scryfallId: "c957bbb7-0322-46d1-89e1-1a59515b3b1b",
  types: ["Instant"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  castEffect: { kind: "pump", power: 4, toughness: 4, target: { kind: "creature" } },
  tier: "scripted",
};
export const MONSTROUS_GROWTH: CardDefinition = {
  id: "monstrous-growth",
  name: "Monstrous Growth",
  scryfallId: "7e5a2687-af7a-42ad-8938-f3534c7da222",
  types: ["Sorcery"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  castEffect: { kind: "pump", power: 4, toughness: 4, target: { kind: "creature" } },
  tier: "scripted",
};
export const PHYTOBURST: CardDefinition = {
  id: "phytoburst",
  name: "Phytoburst",
  scryfallId: "7507afc4-f504-4eb2-a86d-f99bc2860838",
  types: ["Sorcery"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  castEffect: { kind: "pump", power: 5, toughness: 5, target: { kind: "creature" } },
  tier: "scripted",
};
export const TITANIC_GROWTH: CardDefinition = {
  id: "titanic-growth",
  name: "Titanic Growth",
  scryfallId: "46917de3-5e98-4dd6-8950-fc10338515df",
  types: ["Instant"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  castEffect: { kind: "pump", power: 4, toughness: 4, target: { kind: "creature" } },
  tier: "scripted",
};
export const WIELDING_THE_GREEN_DRAGON: CardDefinition = {
  id: "wielding-the-green-dragon",
  name: "Wielding the Green Dragon",
  scryfallId: "2b138167-8129-4109-a58b-af26c95577e4",
  types: ["Sorcery"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  castEffect: { kind: "pump", power: 4, toughness: 4, target: { kind: "creature" } },
  tier: "scripted",
};
export const BEE_STING: CardDefinition = {
  id: "bee-sting",
  name: "Bee Sting",
  scryfallId: "ee668507-a903-47ed-834f-fe6247db0542",
  types: ["Sorcery"],
  manaCost: { generic: 3, colors: { G: 1 } },
  colorIdentity: ["G"],
  castEffect: { kind: "damage", amount: 2, target: { kind: "any-target" } },
  tier: "scripted",
};
export const HARMONIZE: CardDefinition = {
  id: "harmonize",
  name: "Harmonize",
  scryfallId: "bd7138fb-6aa7-455e-b1f7-ca08d747277d",
  types: ["Sorcery"],
  manaCost: { generic: 2, colors: { G: 2 } },
  colorIdentity: ["G"],
  castEffect: { kind: "draw", amount: 3 },
  tier: "scripted",
};
export const MIGHT_OF_OAKS: CardDefinition = {
  id: "might-of-oaks",
  name: "Might of Oaks",
  scryfallId: "438a324b-cf3e-4a0f-95c4-cd548586f7e5",
  types: ["Instant"],
  manaCost: { generic: 3, colors: { G: 1 } },
  colorIdentity: ["G"],
  castEffect: { kind: "pump", power: 7, toughness: 7, target: { kind: "creature" } },
  tier: "scripted",
};
export const UNYARO_BEE_STING: CardDefinition = {
  id: "unyaro-bee-sting",
  name: "Unyaro Bee Sting",
  scryfallId: "71bdd944-e86c-4e5e-b75c-9bbf4fb27ccd",
  types: ["Sorcery"],
  manaCost: { generic: 3, colors: { G: 1 } },
  colorIdentity: ["G"],
  castEffect: { kind: "damage", amount: 2, target: { kind: "any-target" } },
  tier: "scripted",
};
export const SPRING_OF_ETERNAL_PEACE: CardDefinition = {
  id: "spring-of-eternal-peace",
  name: "Spring of Eternal Peace",
  scryfallId: "f6862d7a-04ee-48ac-a5b3-46a4e8694d5b",
  types: ["Sorcery"],
  manaCost: { generic: 3, colors: { G: 2 } },
  colorIdentity: ["G"],
  castEffect: { kind: "gainLife", amount: 8 },
  tier: "scripted",
};
export const VITALIZING_WIND: CardDefinition = {
  id: "vitalizing-wind",
  name: "Vitalizing Wind",
  scryfallId: "0fbd7c20-d527-4d97-9630-896d5e7bf1de",
  types: ["Instant"],
  manaCost: { generic: 8, colors: { G: 1 } },
  colorIdentity: ["G"],
  castEffect: { kind: "pumpAll", power: 7, toughness: 7, scope: "controller" },
  tier: "scripted",
};
export const AEGIS_TURTLE: CardDefinition = {
  id: "aegis-turtle",
  name: "Aegis Turtle",
  scryfallId: "c7f2014a-fbc9-447c-a440-e06d01066bb9",
  types: ["Creature"],
  subtypes: ["Turtle"],
  manaCost: { generic: 0, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 0,
  toughness: 5,
  tier: "vanilla",
};
export const FLYING_MEN: CardDefinition = {
  id: "flying-men",
  name: "Flying Men",
  scryfallId: "0656ed76-4c8e-4094-8edd-9b49780cadf7",
  types: ["Creature"],
  subtypes: ["Human"],
  manaCost: { generic: 0, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 1,
  toughness: 1,
  keywords: ["Flying"],
  tier: "vanilla",
};
export const KRAKEN_HATCHLING: CardDefinition = {
  id: "kraken-hatchling",
  name: "Kraken Hatchling",
  scryfallId: "cc1f65c8-4941-41ac-9340-f741725ec71c",
  types: ["Creature"],
  subtypes: ["Kraken"],
  manaCost: { generic: 0, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 0,
  toughness: 4,
  tier: "vanilla",
};
export const SHORECOMBER_CRAB: CardDefinition = {
  id: "shorecomber-crab",
  name: "Shorecomber Crab",
  scryfallId: "fad0fd59-6511-4508-89fd-4287f59db1a2",
  types: ["Creature"],
  subtypes: ["Crab"],
  manaCost: { generic: 0, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 0,
  toughness: 4,
  tier: "vanilla",
};
export const WANDERING_ONES: CardDefinition = {
  id: "wandering-ones",
  name: "Wandering Ones",
  scryfallId: "8f973d6b-4a34-4b0e-b092-ead05bf2e535",
  types: ["Creature"],
  subtypes: ["Spirit"],
  manaCost: { generic: 0, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 1,
  toughness: 1,
  tier: "vanilla",
};
export const BAY_FALCON: CardDefinition = {
  id: "bay-falcon",
  name: "Bay Falcon",
  scryfallId: "df45268a-b757-4ad2-bab0-869058ee9186",
  types: ["Creature"],
  subtypes: ["Bird"],
  manaCost: { generic: 1, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 1,
  toughness: 1,
  keywords: ["Flying", "Vigilance"],
  tier: "vanilla",
};
export const CORAL_MERFOLK: CardDefinition = {
  id: "coral-merfolk",
  name: "Coral Merfolk",
  scryfallId: "97a74ccf-8165-4db1-a87c-52c2d8ea0058",
  types: ["Creature"],
  subtypes: ["Merfolk"],
  manaCost: { generic: 1, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 2,
  toughness: 1,
  tier: "vanilla",
};
export const FLYING_DOLPHIN_FISH: CardDefinition = {
  id: "flying-dolphin-fish",
  name: "Flying Dolphin-Fish",
  scryfallId: "ccb61a51-cff6-4f88-ac17-f10852a27d06",
  types: ["Creature"],
  subtypes: ["Whale", "Fish"],
  manaCost: { generic: 1, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 1,
  toughness: 3,
  keywords: ["Flying"],
  tier: "vanilla",
};
export const LUMENGRID_WARDEN: CardDefinition = {
  id: "lumengrid-warden",
  name: "Lumengrid Warden",
  scryfallId: "0a03ba5a-ac27-4fce-9eaf-b029ab26f9e1",
  types: ["Creature"],
  subtypes: ["Human", "Wizard"],
  manaCost: { generic: 1, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 1,
  toughness: 3,
  tier: "vanilla",
};
export const MOAT_PIRANHAS: CardDefinition = {
  id: "moat-piranhas",
  name: "Moat Piranhas",
  scryfallId: "543b3f69-19be-494b-928f-e16b92560e35",
  types: ["Creature"],
  subtypes: ["Fish"],
  manaCost: { generic: 1, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 3,
  toughness: 3,
  keywords: ["Defender"],
  tier: "vanilla",
};
export const PLATED_SEASTRIDER: CardDefinition = {
  id: "plated-seastrider",
  name: "Plated Seastrider",
  scryfallId: "e83a74c4-026e-4419-9dde-3b044ef507a0",
  types: ["Creature"],
  subtypes: ["Beast"],
  manaCost: { generic: 0, colors: { U: 2 } },
  colorIdentity: ["U"],
  power: 1,
  toughness: 4,
  tier: "vanilla",
};
export const SEACOAST_DRAKE: CardDefinition = {
  id: "seacoast-drake",
  name: "Seacoast Drake",
  scryfallId: "5333de10-a6d4-47ff-ab57-4edb49535739",
  types: ["Creature"],
  subtypes: ["Drake"],
  manaCost: { generic: 1, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 1,
  toughness: 3,
  keywords: ["Flying"],
  tier: "vanilla",
};
export const STORM_CROW: CardDefinition = {
  id: "storm-crow",
  name: "Storm Crow",
  scryfallId: "036ef8c9-72ac-46ce-af07-83b79d736538",
  types: ["Creature"],
  subtypes: ["Bird"],
  manaCost: { generic: 1, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 1,
  toughness: 2,
  keywords: ["Flying"],
  tier: "vanilla",
};
export const SWORN_GUARDIAN: CardDefinition = {
  id: "sworn-guardian",
  name: "Sworn Guardian",
  scryfallId: "6452ba94-6bb0-409c-99f7-71e6457c3f2a",
  types: ["Creature"],
  subtypes: ["Merfolk", "Warrior"],
  manaCost: { generic: 1, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 1,
  toughness: 3,
  tier: "vanilla",
};
export const TALAS_SCOUT: CardDefinition = {
  id: "talas-scout",
  name: "Talas Scout",
  scryfallId: "48e12f17-855e-47e0-b7e3-df5c388b01bb",
  types: ["Creature"],
  subtypes: ["Human", "Pirate", "Scout"],
  manaCost: { generic: 1, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 1,
  toughness: 2,
  keywords: ["Flying"],
  tier: "vanilla",
};
export const WALL_OF_MIST: CardDefinition = {
  id: "wall-of-mist",
  name: "Wall of Mist",
  scryfallId: "62a37646-8f7c-40fc-851d-e3fdd205b012",
  types: ["Creature"],
  subtypes: ["Wall"],
  manaCost: { generic: 1, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 0,
  toughness: 5,
  keywords: ["Defender"],
  tier: "vanilla",
};
export const ZEPHYR_FALCON: CardDefinition = {
  id: "zephyr-falcon",
  name: "Zephyr Falcon",
  scryfallId: "6d11923e-98c6-4041-b115-f4847fb71149",
  types: ["Creature"],
  subtypes: ["Bird"],
  manaCost: { generic: 1, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 1,
  toughness: 1,
  keywords: ["Flying", "Vigilance"],
  tier: "vanilla",
};
export const ANCIENT_CRAB: CardDefinition = {
  id: "ancient-crab",
  name: "Ancient Crab",
  scryfallId: "7c2ca68b-15fb-4691-b549-268df92ca413",
  types: ["Creature"],
  subtypes: ["Crab"],
  manaCost: { generic: 1, colors: { U: 2 } },
  colorIdentity: ["U"],
  power: 1,
  toughness: 5,
  tier: "vanilla",
};
export const BLIND_PHANTASM: CardDefinition = {
  id: "blind-phantasm",
  name: "Blind Phantasm",
  scryfallId: "6b26ee7b-de1a-4a39-9580-89941c3d0f21",
  types: ["Creature"],
  subtypes: ["Illusion"],
  manaCost: { generic: 2, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 2,
  toughness: 3,
  tier: "vanilla",
};
export const CORAL_COMMANDO: CardDefinition = {
  id: "coral-commando",
  name: "Coral Commando",
  scryfallId: "889cc2a0-d9a6-4368-92e0-055a7d7bf9d1",
  types: ["Creature"],
  subtypes: ["Merfolk", "Warrior"],
  manaCost: { generic: 2, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 3,
  toughness: 2,
  tier: "vanilla",
};
export const GLACIAL_WALL: CardDefinition = {
  id: "glacial-wall",
  name: "Glacial Wall",
  scryfallId: "c059330e-1aef-4d22-b3c2-cd84cab5fe38",
  types: ["Creature"],
  subtypes: ["Wall"],
  manaCost: { generic: 2, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 0,
  toughness: 7,
  keywords: ["Defender"],
  tier: "vanilla",
};
export const HOVER_BARRIER: CardDefinition = {
  id: "hover-barrier",
  name: "Hover Barrier",
  scryfallId: "884afdb3-0d5f-45a1-b57e-6c3760aa0031",
  types: ["Creature"],
  subtypes: ["Illusion", "Wall"],
  manaCost: { generic: 2, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 0,
  toughness: 6,
  keywords: ["Defender", "Flying"],
  tier: "vanilla",
};
export const MERCHANT_OF_SECRETS: CardDefinition = {
  id: "merchant-of-secrets",
  name: "Merchant of Secrets",
  scryfallId: "10227a24-d4f7-4dfa-a54d-eaf183fd7e79",
  types: ["Creature"],
  subtypes: ["Human", "Wizard"],
  manaCost: { generic: 2, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 1,
  toughness: 1,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "draw", amount: 1 } }],
  tier: "scripted",
};
export const OKO_S_ACCOMPLICES: CardDefinition = {
  id: "okos-accomplices",
  name: "Oko's Accomplices",
  scryfallId: "71c52b50-35aa-4858-8c8e-c81dcb29a7fc",
  types: ["Creature"],
  subtypes: ["Faerie"],
  manaCost: { generic: 2, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 2,
  toughness: 3,
  keywords: ["Flying"],
  tier: "vanilla",
};
export const SOARING_DRAKE: CardDefinition = {
  id: "soaring-drake",
  name: "Soaring Drake",
  scryfallId: "0b0979f9-aae3-4fc7-beae-c8c6637ae596",
  types: ["Creature"],
  subtypes: ["Drake"],
  manaCost: { generic: 2, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 2,
  toughness: 3,
  keywords: ["Flying"],
  tier: "vanilla",
};
export const TOLARIAN_SCHOLAR: CardDefinition = {
  id: "tolarian-scholar",
  name: "Tolarian Scholar",
  scryfallId: "2eda67da-02b5-4ecb-9038-10e026d454ec",
  types: ["Creature"],
  subtypes: ["Human", "Wizard"],
  manaCost: { generic: 2, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 2,
  toughness: 3,
  tier: "vanilla",
};
export const UPDRAFT_ELEMENTAL: CardDefinition = {
  id: "updraft-elemental",
  name: "Updraft Elemental",
  scryfallId: "9621c700-569d-4d07-847e-68b97113415f",
  types: ["Creature"],
  subtypes: ["Elemental"],
  manaCost: { generic: 2, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 1,
  toughness: 4,
  keywords: ["Flying"],
  tier: "vanilla",
};
export const WALL_OF_WATER: CardDefinition = {
  id: "wall-of-water",
  name: "Wall of Water",
  scryfallId: "78028eda-61b0-408c-b3fc-adc968d39b47",
  types: ["Creature"],
  subtypes: ["Wall"],
  manaCost: { generic: 1, colors: { U: 2 } },
  colorIdentity: ["U"],
  power: 0,
  toughness: 5,
  keywords: ["Defender"],
  activatedAbilities: [{ cost: { mana: { generic: 0, colors: { U: 1 } } }, effect: { kind: "pump", power: 1, toughness: 0 } }],
  tier: "scripted",
};
export const AMPHIN_CUTTHROAT: CardDefinition = {
  id: "amphin-cutthroat",
  name: "Amphin Cutthroat",
  scryfallId: "fd169064-9c7b-40bd-8be0-a89fcb28ae2f",
  types: ["Creature"],
  subtypes: ["Salamander", "Rogue"],
  manaCost: { generic: 3, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 2,
  toughness: 4,
  tier: "vanilla",
};
export const AZURE_DRAKE: CardDefinition = {
  id: "azure-drake",
  name: "Azure Drake",
  scryfallId: "6653bce7-b0fc-49e3-8f45-f0bfcade8870",
  types: ["Creature"],
  subtypes: ["Drake"],
  manaCost: { generic: 3, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 2,
  toughness: 4,
  keywords: ["Flying"],
  tier: "vanilla",
};
export const FIGHTING_DRAKE: CardDefinition = {
  id: "fighting-drake",
  name: "Fighting Drake",
  scryfallId: "c8545377-421b-4d28-b2cc-ca18a170fee0",
  types: ["Creature"],
  subtypes: ["Drake"],
  manaCost: { generic: 2, colors: { U: 2 } },
  colorIdentity: ["U"],
  power: 2,
  toughness: 4,
  keywords: ["Flying"],
  tier: "vanilla",
};
export const HEADWATER_SENTRIES: CardDefinition = {
  id: "headwater-sentries",
  name: "Headwater Sentries",
  scryfallId: "2af2c338-f5e9-4596-9435-c6aa965ae541",
  types: ["Creature"],
  subtypes: ["Merfolk", "Warrior"],
  manaCost: { generic: 3, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 2,
  toughness: 5,
  tier: "vanilla",
};
export const MUSE_DRAKE: CardDefinition = {
  id: "muse-drake",
  name: "Muse Drake",
  scryfallId: "c5df7a96-6548-41c0-85a6-e0c4566e0fe6",
  types: ["Creature"],
  subtypes: ["Drake"],
  manaCost: { generic: 3, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 1,
  toughness: 3,
  keywords: ["Flying"],
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "draw", amount: 1 } }],
  tier: "scripted",
};
export const NYXBORN_SEAGUARD: CardDefinition = {
  id: "nyxborn-seaguard",
  name: "Nyxborn Seaguard",
  scryfallId: "9ad0c7d7-0e44-496f-a2fc-fafc604cb1f1",
  types: ["Creature", "Enchantment"],
  subtypes: ["Merfolk", "Soldier"],
  manaCost: { generic: 2, colors: { U: 2 } },
  colorIdentity: ["U"],
  power: 2,
  toughness: 5,
  tier: "vanilla",
};
export const SILENT_OBSERVER: CardDefinition = {
  id: "silent-observer",
  name: "Silent Observer",
  scryfallId: "535e3d1b-b71b-406a-bec6-73b2cb45f6c8",
  types: ["Creature"],
  subtypes: ["Spirit"],
  manaCost: { generic: 3, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 1,
  toughness: 5,
  keywords: ["Flying"],
  tier: "vanilla",
};
export const SNAPPING_DRAKE: CardDefinition = {
  id: "snapping-drake",
  name: "Snapping Drake",
  scryfallId: "ef46580c-a204-4b0b-8526-2310b1ca32b4",
  types: ["Creature"],
  subtypes: ["Drake"],
  manaCost: { generic: 3, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 3,
  toughness: 2,
  keywords: ["Flying"],
  tier: "vanilla",
};
export const TURTLE_SEALS: CardDefinition = {
  id: "turtle-seals",
  name: "Turtle-Seals",
  scryfallId: "3a144e7f-e0f7-4346-a4e8-f4a358c3b4a9",
  types: ["Creature"],
  subtypes: ["Turtle", "Seal"],
  manaCost: { generic: 3, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 2,
  toughness: 4,
  keywords: ["Vigilance"],
  tier: "vanilla",
};
export const AIR_ELEMENTAL: CardDefinition = {
  id: "air-elemental",
  name: "Air Elemental",
  scryfallId: "a27efec0-40c4-48bc-a21a-3af28a6529b5",
  types: ["Creature"],
  subtypes: ["Elemental"],
  manaCost: { generic: 3, colors: { U: 2 } },
  colorIdentity: ["U"],
  power: 4,
  toughness: 4,
  keywords: ["Flying"],
  tier: "vanilla",
};
export const ARMORED_CANCRIX: CardDefinition = {
  id: "armored-cancrix",
  name: "Armored Cancrix",
  scryfallId: "3b455b0f-a69c-43b4-bbf5-605ed41f10e0",
  types: ["Creature"],
  subtypes: ["Crab"],
  manaCost: { generic: 4, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 2,
  toughness: 5,
  tier: "vanilla",
};
export const HUMONGULUS: CardDefinition = {
  id: "humongulus",
  name: "Humongulus",
  scryfallId: "21982dc7-4f79-4251-8382-95cd1f627e0f",
  types: ["Creature"],
  subtypes: ["Homunculus"],
  manaCost: { generic: 4, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 2,
  toughness: 5,
  keywords: ["Hexproof"],
  tier: "vanilla",
};
export const SEA_SPIRIT: CardDefinition = {
  id: "sea-spirit",
  name: "Sea Spirit",
  scryfallId: "6f0a26cf-03d5-4d4c-83c2-a4544639def4",
  types: ["Creature"],
  subtypes: ["Elemental", "Spirit"],
  manaCost: { generic: 4, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 2,
  toughness: 3,
  activatedAbilities: [{ cost: { mana: { generic: 0, colors: { U: 1 } } }, effect: { kind: "pump", power: 1, toughness: 0 } }],
  tier: "scripted",
};
export const SKY_RUIN_DRAKE: CardDefinition = {
  id: "sky-ruin-drake",
  name: "Sky Ruin Drake",
  scryfallId: "2bdb5850-df1e-4d8a-af7a-15cab080fb8f",
  types: ["Creature"],
  subtypes: ["Drake"],
  manaCost: { generic: 4, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 2,
  toughness: 5,
  keywords: ["Flying"],
  tier: "vanilla",
};
export const STORMCLOUD_SPIRIT: CardDefinition = {
  id: "stormcloud-spirit",
  name: "Stormcloud Spirit",
  scryfallId: "b371bba8-08b1-468b-924b-c1f3d64bb096",
  types: ["Creature"],
  subtypes: ["Spirit"],
  manaCost: { generic: 3, colors: { U: 2 } },
  colorIdentity: ["U"],
  power: 4,
  toughness: 4,
  keywords: ["Flying"],
  tier: "vanilla",
};
export const WIND_SPIRIT: CardDefinition = {
  id: "wind-spirit",
  name: "Wind Spirit",
  scryfallId: "da614b44-a70a-454b-954b-a420e7f3d62f",
  types: ["Creature"],
  subtypes: ["Elemental", "Spirit"],
  manaCost: { generic: 4, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 3,
  toughness: 2,
  keywords: ["Flying", "Menace"],
  tier: "vanilla",
};
export const COLD_WATER_SNAPPER: CardDefinition = {
  id: "cold-water-snapper",
  name: "Cold-Water Snapper",
  scryfallId: "cf339549-4325-40c6-adde-0cd31bb738e0",
  types: ["Creature"],
  subtypes: ["Turtle"],
  manaCost: { generic: 5, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 4,
  toughness: 5,
  keywords: ["Hexproof"],
  tier: "vanilla",
};
export const DJINN_OF_THE_LAMP: CardDefinition = {
  id: "djinn-of-the-lamp",
  name: "Djinn of the Lamp",
  scryfallId: "3a5e7b52-2663-4140-9758-f24b8b947876",
  types: ["Creature"],
  subtypes: ["Djinn"],
  manaCost: { generic: 5, colors: { U: 2 } },
  colorIdentity: ["U"],
  power: 5,
  toughness: 6,
  keywords: ["Flying"],
  tier: "vanilla",
};
export const CAELORNA_CORAL_TYRANT: CardDefinition = {
  id: "caelorna-coral-tyrant",
  name: "Caelorna, Coral Tyrant",
  scryfallId: "e8654e38-4230-4094-b815-778bfb5d06f2",
  types: ["Creature"],
  subtypes: ["Octopus"],
  supertypes: ["Legendary"],
  manaCost: { generic: 1, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 0,
  toughness: 8,
  canBeCommander: true,
  tier: "vanilla",
};
export const THE_TERROR_OF_SERPENT_S_PASS: CardDefinition = {
  id: "the-terror-of-serpents-pass",
  name: "The Terror of Serpent's Pass",
  scryfallId: "f7569861-5b68-4265-bb45-3d54992bfe66",
  types: ["Creature"],
  subtypes: ["Serpent"],
  supertypes: ["Legendary"],
  manaCost: { generic: 5, colors: { U: 2 } },
  colorIdentity: ["U"],
  power: 8,
  toughness: 8,
  keywords: ["Hexproof"],
  canBeCommander: true,
  tier: "vanilla",
};

export const AVEN_ENVOY: CardDefinition = {
  id: "aven-envoy",
  name: "Aven Envoy",
  scryfallId: "40ead30e-9f96-4fca-b619-fdc8d1b5e2e0",
  types: ["Creature"],
  subtypes: ["Bird", "Soldier"],
  manaCost: { generic: 0, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 0,
  toughness: 2,
  keywords: ["Flying"],
  tier: "vanilla",
};
export const FUGITIVE_WIZARD: CardDefinition = {
  id: "fugitive-wizard",
  name: "Fugitive Wizard",
  scryfallId: "520ad9d0-5f41-4183-a04e-58a61ad7202b",
  types: ["Creature"],
  subtypes: ["Human", "Wizard"],
  manaCost: { generic: 0, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 1,
  toughness: 1,
  tier: "vanilla",
};
export const MERFOLK_OF_THE_PEARL_TRIDENT: CardDefinition = {
  id: "merfolk-of-the-pearl-trident",
  name: "Merfolk of the Pearl Trident",
  scryfallId: "a360fe4e-c9a6-42fa-a97a-8b5a0c19ef93",
  types: ["Creature"],
  subtypes: ["Merfolk"],
  manaCost: { generic: 0, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 1,
  toughness: 1,
  tier: "vanilla",
};
export const TRITON_SHORETHIEF: CardDefinition = {
  id: "triton-shorethief",
  name: "Triton Shorethief",
  scryfallId: "d8f0fe22-dc89-4ad8-b5f6-6d91b61f1385",
  types: ["Creature"],
  subtypes: ["Merfolk", "Rogue"],
  manaCost: { generic: 0, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 1,
  toughness: 2,
  tier: "vanilla",
};
export const ZEPHYR_SPRITE: CardDefinition = {
  id: "zephyr-sprite",
  name: "Zephyr Sprite",
  scryfallId: "b256f91a-e797-41d7-82a6-3dcd691bbeed",
  types: ["Creature"],
  subtypes: ["Faerie"],
  manaCost: { generic: 0, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 1,
  toughness: 1,
  keywords: ["Flying"],
  tier: "vanilla",
};
export const CORAL_EEL: CardDefinition = {
  id: "coral-eel",
  name: "Coral Eel",
  scryfallId: "00223901-d462-41b0-9749-b093058f682f",
  types: ["Creature"],
  subtypes: ["Fish"],
  manaCost: { generic: 1, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 2,
  toughness: 1,
  tier: "vanilla",
};
export const CURIO_VENDOR: CardDefinition = {
  id: "curio-vendor",
  name: "Curio Vendor",
  scryfallId: "c598054a-26fa-40e7-8497-3da8eaf12aac",
  types: ["Creature"],
  subtypes: ["Vedalken"],
  manaCost: { generic: 1, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 2,
  toughness: 1,
  tier: "vanilla",
};
export const JHESSIAN_LOOKOUT: CardDefinition = {
  id: "jhessian-lookout",
  name: "Jhessian Lookout",
  scryfallId: "f55b1b92-575e-4b6f-9179-21d0bc1acd11",
  types: ["Creature"],
  subtypes: ["Human", "Scout"],
  manaCost: { generic: 1, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 2,
  toughness: 1,
  tier: "vanilla",
};
export const MARITIME_GUARD: CardDefinition = {
  id: "maritime-guard",
  name: "Maritime Guard",
  scryfallId: "1008ff1b-7fb0-4570-b23e-9fda14b97640",
  types: ["Creature"],
  subtypes: ["Merfolk", "Soldier"],
  manaCost: { generic: 1, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 1,
  toughness: 3,
  tier: "vanilla",
};
export const MURMURING_PHANTASM: CardDefinition = {
  id: "murmuring-phantasm",
  name: "Murmuring Phantasm",
  scryfallId: "87c1aaff-ab26-437e-a88a-494683aec831",
  types: ["Creature"],
  subtypes: ["Spirit"],
  manaCost: { generic: 1, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 0,
  toughness: 5,
  keywords: ["Defender"],
  tier: "vanilla",
};
export const SEA_EAGLE: CardDefinition = {
  id: "sea-eagle",
  name: "Sea Eagle",
  scryfallId: "7e8cacd1-51e7-48af-a7ae-48832dc34a92",
  types: ["Creature"],
  subtypes: ["Bird"],
  manaCost: { generic: 1, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 1,
  toughness: 1,
  keywords: ["Flying"],
  tier: "vanilla",
};
export const SEAGRAF_SKAAB: CardDefinition = {
  id: "seagraf-skaab",
  name: "Seagraf Skaab",
  scryfallId: "065d497d-5cfd-43c9-8c86-9a1da3d7e17e",
  types: ["Creature"],
  subtypes: ["Zombie"],
  manaCost: { generic: 1, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 1,
  toughness: 3,
  tier: "vanilla",
};
export const STRAW_SOLDIERS: CardDefinition = {
  id: "straw-soldiers",
  name: "Straw Soldiers",
  scryfallId: "8ae5ba21-eb8e-4663-bfd8-3e19a0c10774",
  types: ["Creature"],
  subtypes: ["Scarecrow", "Soldier"],
  manaCost: { generic: 1, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 1,
  toughness: 3,
  tier: "vanilla",
};
export const TALAS_MERCHANT: CardDefinition = {
  id: "talas-merchant",
  name: "Talas Merchant",
  scryfallId: "2f779d7e-6e37-49bc-b76d-3bb490ff142b",
  types: ["Creature"],
  subtypes: ["Human", "Pirate"],
  manaCost: { generic: 1, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 1,
  toughness: 3,
  tier: "vanilla",
};
export const VODALIAN_SOLDIERS: CardDefinition = {
  id: "vodalian-soldiers",
  name: "Vodalian Soldiers",
  scryfallId: "f8fae146-a0dd-4622-ab11-f00b372f8221",
  types: ["Creature"],
  subtypes: ["Merfolk", "Soldier"],
  manaCost: { generic: 1, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 1,
  toughness: 2,
  tier: "vanilla",
};
export const WETLAND_SAMBAR: CardDefinition = {
  id: "wetland-sambar",
  name: "Wetland Sambar",
  scryfallId: "f71a86e0-d15a-4fba-94f6-bfbaade8d837",
  types: ["Creature"],
  subtypes: ["Elk"],
  manaCost: { generic: 1, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 2,
  toughness: 1,
  tier: "vanilla",
};
export const WU_INFANTRY: CardDefinition = {
  id: "wu-infantry",
  name: "Wu Infantry",
  scryfallId: "ebe4115e-7ca3-4996-a390-133c2e6d09b7",
  types: ["Creature"],
  subtypes: ["Human", "Soldier"],
  manaCost: { generic: 1, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 2,
  toughness: 1,
  tier: "vanilla",
};
export const A_I_M_BOT: CardDefinition = {
  id: "a-i-m-bot",
  name: "A.I.M. Bot",
  scryfallId: "52b09b2a-8876-4b7d-97bd-2f46fd96849a",
  types: ["Artifact", "Creature"],
  subtypes: ["Robot", "Villain"],
  manaCost: { generic: 2, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 2,
  toughness: 3,
  keywords: ["Flying"],
  tier: "vanilla",
};
export const ARMORED_WHIRL_TURTLE: CardDefinition = {
  id: "armored-whirl-turtle",
  name: "Armored Whirl Turtle",
  scryfallId: "fcc87fdf-6473-4b91-a8b9-2986e57dc071",
  types: ["Creature"],
  subtypes: ["Turtle"],
  manaCost: { generic: 2, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 0,
  toughness: 5,
  tier: "vanilla",
};
export const CLOUDKIN_SEER: CardDefinition = {
  id: "cloudkin-seer",
  name: "Cloudkin Seer",
  scryfallId: "25e97ad6-8b49-4fb6-9c07-e8d91bbaed5a",
  types: ["Creature"],
  subtypes: ["Elemental", "Wizard"],
  manaCost: { generic: 2, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 2,
  toughness: 1,
  keywords: ["Flying"],
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "draw", amount: 1 } }],
  tier: "scripted",
};
export const COUNCIL_OF_ADVISORS: CardDefinition = {
  id: "council-of-advisors",
  name: "Council of Advisors",
  scryfallId: "0c59f45b-46fa-4494-9b25-cf9d3e462539",
  types: ["Creature"],
  subtypes: ["Human", "Advisor"],
  manaCost: { generic: 2, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 1,
  toughness: 1,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "draw", amount: 1 } }],
  tier: "scripted",
};
export const HORNED_TURTLE: CardDefinition = {
  id: "horned-turtle",
  name: "Horned Turtle",
  scryfallId: "f8f2b7c1-9f2a-481d-94ee-04728828f7df",
  types: ["Creature"],
  subtypes: ["Turtle"],
  manaCost: { generic: 2, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 1,
  toughness: 4,
  tier: "vanilla",
};
export const JWARI_SCUTTLER: CardDefinition = {
  id: "jwari-scuttler",
  name: "Jwari Scuttler",
  scryfallId: "04129038-3b02-418a-862a-229e9dde339b",
  types: ["Creature"],
  subtypes: ["Crab"],
  manaCost: { generic: 2, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 2,
  toughness: 3,
  tier: "vanilla",
};
export const NAGA_ETERNAL: CardDefinition = {
  id: "naga-eternal",
  name: "Naga Eternal",
  scryfallId: "0f244233-f2e8-48f8-9106-e7cd186efd51",
  types: ["Creature"],
  subtypes: ["Zombie", "Snake"],
  manaCost: { generic: 2, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 3,
  toughness: 2,
  tier: "vanilla",
};
export const RIVER_KAIJIN: CardDefinition = {
  id: "river-kaijin",
  name: "River Kaijin",
  scryfallId: "e403cad6-84b0-4a6b-a2d8-cb572ec09932",
  types: ["Creature"],
  subtypes: ["Spirit"],
  manaCost: { generic: 2, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 1,
  toughness: 4,
  tier: "vanilla",
};
export const THUNDER_WALL: CardDefinition = {
  id: "thunder-wall",
  name: "Thunder Wall",
  scryfallId: "cfabe410-ff54-48ba-8d1a-b7248976e967",
  types: ["Creature"],
  subtypes: ["Wall"],
  manaCost: { generic: 1, colors: { U: 2 } },
  colorIdentity: ["U"],
  power: 0,
  toughness: 2,
  keywords: ["Defender", "Flying"],
  activatedAbilities: [{ cost: { mana: { generic: 0, colors: { U: 1 } } }, effect: { kind: "pump", power: 1, toughness: 1 } }],
  tier: "scripted",
};
export const TOME_RAIDER: CardDefinition = {
  id: "tome-raider",
  name: "Tome Raider",
  scryfallId: "e04ad850-5801-4654-a388-f86be20a43bf",
  types: ["Creature"],
  subtypes: ["Faerie"],
  manaCost: { generic: 2, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 1,
  toughness: 1,
  keywords: ["Flying"],
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "draw", amount: 1 } }],
  tier: "scripted",
};
export const WALL_OF_AIR: CardDefinition = {
  id: "wall-of-air",
  name: "Wall of Air",
  scryfallId: "40595366-8601-40e0-a070-fc218723270d",
  types: ["Creature"],
  subtypes: ["Wall"],
  manaCost: { generic: 1, colors: { U: 2 } },
  colorIdentity: ["U"],
  power: 1,
  toughness: 5,
  keywords: ["Defender", "Flying"],
  tier: "vanilla",
};
export const AVEN_FLEETWING: CardDefinition = {
  id: "aven-fleetwing",
  name: "Aven Fleetwing",
  scryfallId: "57626fd2-d101-4e23-946f-8309c9676fe5",
  types: ["Creature"],
  subtypes: ["Bird", "Soldier"],
  manaCost: { generic: 3, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 2,
  toughness: 2,
  keywords: ["Flying", "Hexproof"],
  tier: "vanilla",
};
export const CLOUD_MANTA: CardDefinition = {
  id: "cloud-manta",
  name: "Cloud Manta",
  scryfallId: "1854f819-d08e-4a23-bedb-4618b79623e9",
  types: ["Creature"],
  subtypes: ["Fish"],
  manaCost: { generic: 3, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 3,
  toughness: 2,
  keywords: ["Flying"],
  tier: "vanilla",
};
export const FORTRESS_CRAB: CardDefinition = {
  id: "fortress-crab",
  name: "Fortress Crab",
  scryfallId: "324681da-a28e-47ec-9810-5678de53e494",
  types: ["Creature"],
  subtypes: ["Crab"],
  manaCost: { generic: 3, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 1,
  toughness: 6,
  tier: "vanilla",
};
export const GIANT_OCTOPUS: CardDefinition = {
  id: "giant-octopus",
  name: "Giant Octopus",
  scryfallId: "a391d681-3530-4f6a-b421-12025e7c3b89",
  types: ["Creature"],
  subtypes: ["Octopus"],
  manaCost: { generic: 3, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 3,
  toughness: 3,
  tier: "vanilla",
};
export const MOON_HERON: CardDefinition = {
  id: "moon-heron",
  name: "Moon Heron",
  scryfallId: "a24de601-1d7b-41c4-aba1-fdb6fd8d5251",
  types: ["Creature"],
  subtypes: ["Spirit", "Bird"],
  manaCost: { generic: 3, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 3,
  toughness: 2,
  keywords: ["Flying"],
  tier: "vanilla",
};
export const NIMBLE_INNOVATOR: CardDefinition = {
  id: "nimble-innovator",
  name: "Nimble Innovator",
  scryfallId: "f6dbf333-23b5-47d9-9e55-1e8fbd5a72cb",
  types: ["Creature"],
  subtypes: ["Vedalken", "Artificer"],
  manaCost: { generic: 3, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 2,
  toughness: 2,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "draw", amount: 1 } }],
  tier: "scripted",
};
export const PHANTOM_MONSTER: CardDefinition = {
  id: "phantom-monster",
  name: "Phantom Monster",
  scryfallId: "b5cddd47-8c2b-47de-bf82-e810d4cf4df4",
  types: ["Creature"],
  subtypes: ["Illusion"],
  manaCost: { generic: 3, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 3,
  toughness: 3,
  keywords: ["Flying"],
  tier: "vanilla",
};
export const SILVER_ERNE: CardDefinition = {
  id: "silver-erne",
  name: "Silver Erne",
  scryfallId: "685076cc-098c-4f98-918c-0ad825eda10f",
  types: ["Creature"],
  subtypes: ["Bird"],
  manaCost: { generic: 3, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 2,
  toughness: 2,
  keywords: ["Flying", "Trample"],
  tier: "vanilla",
};
export const TALAS_AIR_SHIP: CardDefinition = {
  id: "talas-air-ship",
  name: "Talas Air Ship",
  scryfallId: "80bc3159-f585-45cd-8578-f3bf2fa9b2d1",
  types: ["Creature"],
  subtypes: ["Human", "Pirate"],
  manaCost: { generic: 3, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 3,
  toughness: 2,
  keywords: ["Flying"],
  tier: "vanilla",
};
export const WISHCOIN_CRAB: CardDefinition = {
  id: "wishcoin-crab",
  name: "Wishcoin Crab",
  scryfallId: "348955a0-e988-48d7-a6a0-a8045fcffd25",
  types: ["Creature"],
  subtypes: ["Crab"],
  manaCost: { generic: 3, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 2,
  toughness: 5,
  tier: "vanilla",
};
export const ANCIENT_CARP: CardDefinition = {
  id: "ancient-carp",
  name: "Ancient Carp",
  scryfallId: "1fef6e95-e7f1-4646-be5e-130c8b5a3ca6",
  types: ["Creature"],
  subtypes: ["Fish"],
  manaCost: { generic: 4, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 2,
  toughness: 5,
  tier: "vanilla",
};
export const GRYFF_VANGUARD: CardDefinition = {
  id: "gryff-vanguard",
  name: "Gryff Vanguard",
  scryfallId: "53a14ab8-62f4-4873-b4ef-650f0aded095",
  types: ["Creature"],
  subtypes: ["Human", "Knight"],
  manaCost: { generic: 4, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 3,
  toughness: 2,
  keywords: ["Flying"],
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "draw", amount: 1 } }],
  tier: "scripted",
};
export const NIMBUS_OF_THE_ISLES: CardDefinition = {
  id: "nimbus-of-the-isles",
  name: "Nimbus of the Isles",
  scryfallId: "fbb41d25-b65b-4570-8523-ffb11779708f",
  types: ["Creature"],
  subtypes: ["Elemental"],
  manaCost: { generic: 4, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 3,
  toughness: 3,
  keywords: ["Flying"],
  tier: "vanilla",
};
export const SERRA_SPHINX: CardDefinition = {
  id: "serra-sphinx",
  name: "Serra Sphinx",
  scryfallId: "4fb01cf8-9bca-4446-9e56-62777c6dfbe8",
  types: ["Creature"],
  subtypes: ["Sphinx"],
  manaCost: { generic: 3, colors: { U: 2 } },
  colorIdentity: ["U"],
  power: 4,
  toughness: 4,
  keywords: ["Flying", "Vigilance"],
  tier: "vanilla",
};
export const SOUL_OF_THE_RAPIDS: CardDefinition = {
  id: "soul-of-the-rapids",
  name: "Soul of the Rapids",
  scryfallId: "2a1aed7d-4236-4d44-9366-ee03e15469bc",
  types: ["Creature"],
  subtypes: ["Elemental"],
  manaCost: { generic: 3, colors: { U: 2 } },
  colorIdentity: ["U"],
  power: 3,
  toughness: 2,
  keywords: ["Flying", "Hexproof"],
  tier: "vanilla",
};
export const WATER_ELEMENTAL: CardDefinition = {
  id: "water-elemental",
  name: "Water Elemental",
  scryfallId: "9d574bf9-f3e6-4b8e-a3bc-22706c3bb3ec",
  types: ["Creature"],
  subtypes: ["Elemental"],
  manaCost: { generic: 3, colors: { U: 2 } },
  colorIdentity: ["U"],
  power: 5,
  toughness: 4,
  tier: "vanilla",
};
export const BENTHIC_GIANT: CardDefinition = {
  id: "benthic-giant",
  name: "Benthic Giant",
  scryfallId: "1ff8671d-4da4-4dc2-a8c4-d695ff1aca0f",
  types: ["Creature"],
  subtypes: ["Giant"],
  manaCost: { generic: 5, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 4,
  toughness: 5,
  keywords: ["Hexproof"],
  tier: "vanilla",
};
export const MAHAMOTI_DJINN: CardDefinition = {
  id: "mahamoti-djinn",
  name: "Mahamoti Djinn",
  scryfallId: "855de173-6bec-457b-828e-28678b7d396e",
  types: ["Creature"],
  subtypes: ["Djinn"],
  manaCost: { generic: 4, colors: { U: 2 } },
  colorIdentity: ["U"],
  power: 5,
  toughness: 6,
  keywords: ["Flying"],
  tier: "vanilla",
};
export const GOLIATH_SPHINX: CardDefinition = {
  id: "goliath-sphinx",
  name: "Goliath Sphinx",
  scryfallId: "374cddb8-b360-4c7b-8911-a6a1b401ffdd",
  types: ["Creature"],
  subtypes: ["Sphinx"],
  manaCost: { generic: 5, colors: { U: 2 } },
  colorIdentity: ["U"],
  power: 8,
  toughness: 7,
  keywords: ["Flying"],
  tier: "vanilla",
};

export const RITUAL_OF_RESTORATION: CardDefinition = {
  id: "ritual-of-restoration",
  name: "Ritual of Restoration",
  scryfallId: "73142844-de7c-4427-8183-c2281bde6449",
  types: ["Sorcery"],
  manaCost: { generic: 0, colors: { W: 1 } },
  colorIdentity: ["W"],
  castEffect: { kind: "returnFromGraveyard", destination: "hand", target: { kind: "card-in-your-graveyard", cardType: "Artifact" } },
  tier: "scripted",
};
export const BREATH_OF_LIFE: CardDefinition = {
  id: "breath-of-life",
  name: "Breath of Life",
  scryfallId: "d6828916-c19e-4857-a6ba-047b81314d1f",
  types: ["Sorcery"],
  manaCost: { generic: 3, colors: { W: 1 } },
  colorIdentity: ["W"],
  castEffect: { kind: "returnFromGraveyard", destination: "battlefield", target: { kind: "card-in-your-graveyard", cardType: "Creature" } },
  tier: "scripted",
};
export const FALSE_DEFEAT: CardDefinition = {
  id: "false-defeat",
  name: "False Defeat",
  scryfallId: "e95d2fb2-66ca-4954-b9c5-074ae813e9ed",
  types: ["Sorcery"],
  manaCost: { generic: 3, colors: { W: 1 } },
  colorIdentity: ["W"],
  castEffect: { kind: "returnFromGraveyard", destination: "battlefield", target: { kind: "card-in-your-graveyard", cardType: "Creature" } },
  tier: "scripted",
};
export const REFURBISH: CardDefinition = {
  id: "refurbish",
  name: "Refurbish",
  scryfallId: "f60e2ac4-f21f-4232-abc8-db078472408b",
  types: ["Sorcery"],
  manaCost: { generic: 3, colors: { W: 1 } },
  colorIdentity: ["W"],
  castEffect: { kind: "returnFromGraveyard", destination: "battlefield", target: { kind: "card-in-your-graveyard", cardType: "Artifact" } },
  tier: "scripted",
};
export const RESURRECTION: CardDefinition = {
  id: "resurrection",
  name: "Resurrection",
  scryfallId: "a176b295-9406-4d6b-b15c-e81a72e66874",
  types: ["Sorcery"],
  manaCost: { generic: 2, colors: { W: 2 } },
  colorIdentity: ["W"],
  castEffect: { kind: "returnFromGraveyard", destination: "battlefield", target: { kind: "card-in-your-graveyard", cardType: "Creature" } },
  tier: "scripted",
};
export const ANOINTED_CHORISTER: CardDefinition = {
  id: "anointed-chorister",
  name: "Anointed Chorister",
  scryfallId: "9c977c67-b0c0-40b0-b129-28de094aaf40",
  types: ["Creature"],
  subtypes: ["Human", "Cleric"],
  manaCost: { generic: 0, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 1,
  keywords: ["Lifelink"],
  activatedAbilities: [{ cost: { mana: { generic: 4, colors: { W: 1 } } }, effect: { kind: "pump", power: 3, toughness: 3 } }],
  tier: "scripted",
};
export const AVEN_SKIRMISHER: CardDefinition = {
  id: "aven-skirmisher",
  name: "Aven Skirmisher",
  scryfallId: "05f7a3b1-4d92-4d32-a823-2e774c6e7e73",
  types: ["Creature"],
  subtypes: ["Bird", "Warrior"],
  manaCost: { generic: 0, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 1,
  keywords: ["Flying"],
  tier: "vanilla",
};
export const CATHEDRAL_SANCTIFIER: CardDefinition = {
  id: "cathedral-sanctifier",
  name: "Cathedral Sanctifier",
  scryfallId: "de3d0a45-3b3a-4718-9cb8-ff0c2464d634",
  types: ["Creature"],
  subtypes: ["Human", "Cleric"],
  manaCost: { generic: 0, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 1,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 3 } }],
  tier: "scripted",
};
export const DEVOUT_MONK: CardDefinition = {
  id: "devout-monk",
  name: "Devout Monk",
  scryfallId: "cd1101f5-0bc1-47fa-891b-206b9c1c7f79",
  types: ["Creature"],
  subtypes: ["Human", "Monk", "Cleric"],
  manaCost: { generic: 0, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 1,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 1 } }],
  tier: "scripted",
};
export const HINTERLAND_SANCTIFIER: CardDefinition = {
  id: "hinterland-sanctifier",
  name: "Hinterland Sanctifier",
  scryfallId: "632df69e-6377-43d0-bba5-65518a320aa5",
  types: ["Creature"],
  subtypes: ["Rabbit", "Cleric"],
  manaCost: { generic: 0, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 2,
  // "Whenever another creature you control enters, you gain 1 life."
  triggeredAbilities: [{ event: "permanent-enters", watchFor: { type: "Creature" }, effect: { kind: "gainLife", amount: 1 } }],
  tier: "scripted",
};
export const LIONHEART_MAVERICK: CardDefinition = {
  id: "lionheart-maverick",
  name: "Lionheart Maverick",
  scryfallId: "0a818fdf-2cbc-451a-9893-36da510d63e4",
  types: ["Creature"],
  subtypes: ["Human", "Knight"],
  manaCost: { generic: 0, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 1,
  keywords: ["Vigilance"],
  activatedAbilities: [{ cost: { mana: { generic: 4, colors: { W: 1 } } }, effect: { kind: "pump", power: 1, toughness: 2 } }],
  tier: "scripted",
};
export const SANCTUARY_CAT: CardDefinition = {
  id: "sanctuary-cat",
  name: "Sanctuary Cat",
  scryfallId: "af79c8fb-9189-48c2-a7b8-a1097dbaf138",
  types: ["Creature"],
  subtypes: ["Cat"],
  manaCost: { generic: 0, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 2,
  tier: "vanilla",
};
export const SEGOVIAN_ANGEL: CardDefinition = {
  id: "segovian-angel",
  name: "Segovian Angel",
  scryfallId: "b5dbaec5-502d-48c2-9e71-c12cd0bccc6a",
  types: ["Creature"],
  subtypes: ["Angel"],
  manaCost: { generic: 0, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 1,
  keywords: ["Flying", "Vigilance"],
  tier: "vanilla",
};
export const SOUL_WARDEN: CardDefinition = {
  id: "soul-warden",
  name: "Soul Warden",
  scryfallId: "d96266b3-a7cb-40ce-a328-ac13719fe5f0",
  types: ["Creature"],
  subtypes: ["Human", "Cleric"],
  manaCost: { generic: 0, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 1,
  // "Whenever another creature enters, you gain 1 life." No "you control", so
  // it watches every player's creatures - an opponent's creature entering
  // gains *you* the life.
  triggeredAbilities: [
    { event: "permanent-enters", watchFor: { type: "Creature" }, watches: "any", effect: { kind: "gainLife", amount: 1 } },
  ],
  tier: "scripted",
};
export const TUNDRA_WOLVES: CardDefinition = {
  id: "tundra-wolves",
  name: "Tundra Wolves",
  scryfallId: "15f573db-f4f8-4311-ba47-234e5171da3d",
  types: ["Creature"],
  subtypes: ["Wolf"],
  manaCost: { generic: 0, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 1,
  keywords: ["First Strike"],
  tier: "vanilla",
};
export const AJANI_S_SUNSTRIKER: CardDefinition = {
  id: "ajanis-sunstriker",
  name: "Ajani's Sunstriker",
  scryfallId: "373d6799-e031-4043-8437-ed4880be0de9",
  types: ["Creature"],
  subtypes: ["Cat", "Cleric"],
  manaCost: { generic: 0, colors: { W: 2 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 2,
  keywords: ["Lifelink"],
  tier: "vanilla",
};
export const ALPINE_WATCHDOG: CardDefinition = {
  id: "alpine-watchdog",
  name: "Alpine Watchdog",
  scryfallId: "c392a7e5-6ff5-4c2f-9590-f8811a724f44",
  types: ["Creature"],
  subtypes: ["Dog"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 2,
  keywords: ["Vigilance"],
  tier: "vanilla",
};
export const ARASHIN_CLERIC: CardDefinition = {
  id: "arashin-cleric",
  name: "Arashin Cleric",
  scryfallId: "10aeac19-6892-448e-9e5f-302051a089fc",
  types: ["Creature"],
  subtypes: ["Human", "Cleric"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 3,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 3 } }],
  tier: "scripted",
};
export const CAPASHEN_KNIGHT: CardDefinition = {
  id: "capashen-knight",
  name: "Capashen Knight",
  scryfallId: "78802af4-46b5-4bac-8cdf-5b77d0b19895",
  types: ["Creature"],
  subtypes: ["Human", "Knight"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 1,
  keywords: ["First Strike"],
  activatedAbilities: [{ cost: { mana: { generic: 1, colors: { W: 1 } } }, effect: { kind: "pump", power: 1, toughness: 0 } }],
  tier: "scripted",
};
export const COLORFUL_FEIYI_SPARROW: CardDefinition = {
  id: "colorful-feiyi-sparrow",
  name: "Colorful Feiyi Sparrow",
  scryfallId: "846169fb-8f63-4a0f-af94-e08af8927144",
  types: ["Creature"],
  subtypes: ["Bird"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 3,
  keywords: ["Flying"],
  tier: "vanilla",
};
export const COURIER_HAWK: CardDefinition = {
  id: "courier-hawk",
  name: "Courier Hawk",
  scryfallId: "9395663f-c7af-4d51-ba2a-3b76db8c25ec",
  types: ["Creature"],
  subtypes: ["Bird"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 2,
  keywords: ["Flying", "Vigilance"],
  tier: "vanilla",
};
export const DEVILTHORN_FOX: CardDefinition = {
  id: "devilthorn-fox",
  name: "Devilthorn Fox",
  scryfallId: "57bea4c2-7a15-4f31-938d-c4c906e4ebe7",
  types: ["Creature"],
  subtypes: ["Fox"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 1,
  tier: "vanilla",
};
export const FENCING_ACE: CardDefinition = {
  id: "fencing-ace",
  name: "Fencing Ace",
  scryfallId: "994094f8-e175-4e2e-aa39-c096f0ed9e6a",
  types: ["Creature"],
  subtypes: ["Human", "Soldier"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 1,
  keywords: ["Double Strike"],
  tier: "vanilla",
};
export const HELPFUL_HUNTER: CardDefinition = {
  id: "helpful-hunter",
  name: "Helpful Hunter",
  scryfallId: "1b9a0e91-80b5-428f-8f08-931d0631be14",
  types: ["Creature"],
  subtypes: ["Cat"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 1,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "draw", amount: 1 } }],
  tier: "scripted",
};
export const IMPASSIONED_ORATOR: CardDefinition = {
  id: "impassioned-orator",
  name: "Impassioned Orator",
  scryfallId: "696d6c4b-69d7-498b-87d4-0a03b16cc971",
  types: ["Creature"],
  subtypes: ["Human", "Cleric"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 2,
  // "Whenever another creature you control enters, you gain 1 life."
  triggeredAbilities: [{ event: "permanent-enters", watchFor: { type: "Creature" }, effect: { kind: "gainLife", amount: 1 } }],
  tier: "scripted",
};
export const KJELDORAN_OUTRIDER: CardDefinition = {
  id: "kjeldoran-outrider",
  name: "Kjeldoran Outrider",
  scryfallId: "bd641b1d-dab8-415b-9655-09e033df761d",
  types: ["Creature"],
  subtypes: ["Human", "Soldier"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 2,
  activatedAbilities: [{ cost: { mana: { generic: 0, colors: { W: 1 } } }, effect: { kind: "pump", power: 0, toughness: 1 } }],
  tier: "scripted",
};
export const KNIGHT_OF_MEADOWGRAIN: CardDefinition = {
  id: "knight-of-meadowgrain",
  name: "Knight of Meadowgrain",
  scryfallId: "6156d61c-640e-4e8c-bd2f-838dfef0c885",
  types: ["Creature"],
  subtypes: ["Kithkin", "Knight"],
  manaCost: { generic: 0, colors: { W: 2 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 2,
  keywords: ["First Strike", "Lifelink"],
  tier: "vanilla",
};
export const LIFECREED_DUO: CardDefinition = {
  id: "lifecreed-duo",
  name: "Lifecreed Duo",
  scryfallId: "ca543405-5e12-48a0-9a77-082ac9bcb2f2",
  types: ["Creature"],
  subtypes: ["Bat", "Bird"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 2,
  keywords: ["Flying"],
  // "Flying / Whenever another creature you control enters, you gain 1 life."
  triggeredAbilities: [{ event: "permanent-enters", watchFor: { type: "Creature" }, effect: { kind: "gainLife", amount: 1 } }],
  tier: "scripted",
};
export const MESA_UNICORN: CardDefinition = {
  id: "mesa-unicorn",
  name: "Mesa Unicorn",
  scryfallId: "e321bbb0-1660-4452-a9b7-d41674f7f743",
  types: ["Creature"],
  subtypes: ["Unicorn"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 2,
  keywords: ["Lifelink"],
  tier: "vanilla",
};
export const ORESKOS_SWIFTCLAW: CardDefinition = {
  id: "oreskos-swiftclaw",
  name: "Oreskos Swiftclaw",
  scryfallId: "0ea1dfb4-1983-41f7-956c-f2a1d1489b54",
  types: ["Creature"],
  subtypes: ["Cat", "Warrior"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 1,
  tier: "vanilla",
};
export const RAPTOR_COMPANION: CardDefinition = {
  id: "raptor-companion",
  name: "Raptor Companion",
  scryfallId: "45385c8e-fff9-46e7-97e8-f946306b5147",
  types: ["Creature"],
  subtypes: ["Dinosaur"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 1,
  tier: "vanilla",
};
export const SAVAI_SABERTOOTH: CardDefinition = {
  id: "savai-sabertooth",
  name: "Savai Sabertooth",
  scryfallId: "d46702b0-7e10-462a-9aac-7564efe91804",
  types: ["Creature"],
  subtypes: ["Cat"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 1,
  tier: "vanilla",
};
export const SAVANNAH_SAGE: CardDefinition = {
  id: "savannah-sage",
  name: "Savannah Sage",
  scryfallId: "5b5fa4bb-e061-456f-808e-8d98b2c8abf5",
  types: ["Creature"],
  subtypes: ["Cat", "Cleric"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 2,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 2 } }],
  tier: "scripted",
};
export const SKYSHROUD_FALCON: CardDefinition = {
  id: "skyshroud-falcon",
  name: "Skyshroud Falcon",
  scryfallId: "a41aec1d-d86f-4a52-a446-5cef71d1ebd4",
  types: ["Creature"],
  subtypes: ["Bird"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 1,
  keywords: ["Flying", "Vigilance"],
  tier: "vanilla",
};
export const SUNGRACE_PEGASUS: CardDefinition = {
  id: "sungrace-pegasus",
  name: "Sungrace Pegasus",
  scryfallId: "52d851b9-c290-4fcc-860d-a3250923b850",
  types: ["Creature"],
  subtypes: ["Pegasus"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 2,
  keywords: ["Flying", "Lifelink"],
  tier: "vanilla",
};
export const VETERAN_CAVALIER: CardDefinition = {
  id: "veteran-cavalier",
  name: "Veteran Cavalier",
  scryfallId: "31072355-0b20-4830-9d46-ca71783af84b",
  types: ["Creature"],
  subtypes: ["Human", "Knight"],
  manaCost: { generic: 0, colors: { W: 2 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 2,
  keywords: ["Vigilance"],
  tier: "vanilla",
};
export const YOUTHFUL_KNIGHT: CardDefinition = {
  id: "youthful-knight",
  name: "Youthful Knight",
  scryfallId: "3d1a3fec-39de-4223-9da2-22749a58cd62",
  types: ["Creature"],
  subtypes: ["Human", "Knight"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 1,
  keywords: ["First Strike"],
  tier: "vanilla",
};
export const AFFA_PROTECTOR: CardDefinition = {
  id: "affa-protector",
  name: "Affa Protector",
  scryfallId: "0e54ac79-fbaa-4385-869b-aaf31e33a11f",
  types: ["Creature"],
  subtypes: ["Human", "Soldier", "Ally"],
  manaCost: { generic: 2, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 4,
  keywords: ["Vigilance"],
  tier: "vanilla",
};
export const ALERT_SHU_INFANTRY: CardDefinition = {
  id: "alert-shu-infantry",
  name: "Alert Shu Infantry",
  scryfallId: "c94a92a9-060e-42d3-a8d1-49425defc08a",
  types: ["Creature"],
  subtypes: ["Human", "Soldier"],
  manaCost: { generic: 2, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 2,
  keywords: ["Vigilance"],
  tier: "vanilla",
};
export const BASTION_ENFORCER: CardDefinition = {
  id: "bastion-enforcer",
  name: "Bastion Enforcer",
  scryfallId: "7cbf17a0-2dbc-4e79-9cfa-ea49b1605105",
  types: ["Creature"],
  subtypes: ["Dwarf", "Soldier"],
  manaCost: { generic: 2, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 2,
  tier: "vanilla",
};
export const CAPASHEN_TEMPLAR: CardDefinition = {
  id: "capashen-templar",
  name: "Capashen Templar",
  scryfallId: "0976a193-463a-4bcb-a951-ca73347a5572",
  types: ["Creature"],
  subtypes: ["Human", "Knight"],
  manaCost: { generic: 2, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 2,
  activatedAbilities: [{ cost: { mana: { generic: 0, colors: { W: 1 } } }, effect: { kind: "pump", power: 0, toughness: 1 } }],
  tier: "scripted",
};
export const DIVING_GRIFFIN: CardDefinition = {
  id: "diving-griffin",
  name: "Diving Griffin",
  scryfallId: "bfeb0854-87e7-4236-9791-8fe601704200",
  types: ["Creature"],
  subtypes: ["Griffin"],
  manaCost: { generic: 1, colors: { W: 2 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 2,
  keywords: ["Flying", "Vigilance"],
  tier: "vanilla",
};
export const EXULTANT_SKYMARCHER: CardDefinition = {
  id: "exultant-skymarcher",
  name: "Exultant Skymarcher",
  scryfallId: "fffe7b2b-22c3-4e6a-9b1b-c6d7b29b9f86",
  types: ["Creature"],
  subtypes: ["Vampire", "Soldier"],
  manaCost: { generic: 1, colors: { W: 2 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 3,
  keywords: ["Flying"],
  tier: "vanilla",
};
export const GEIST_OF_THE_MOORS: CardDefinition = {
  id: "geist-of-the-moors",
  name: "Geist of the Moors",
  scryfallId: "6fd246d1-a7cb-45a0-b735-53509ba2d5ca",
  types: ["Creature"],
  subtypes: ["Spirit"],
  manaCost: { generic: 1, colors: { W: 2 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 1,
  keywords: ["Flying"],
  tier: "vanilla",
};
export const GOLDEN_TAIL_DISCIPLE: CardDefinition = {
  id: "golden-tail-disciple",
  name: "Golden-Tail Disciple",
  scryfallId: "d631e7da-bd71-424a-a349-9bce0fd16b1f",
  types: ["Creature", "Enchantment"],
  subtypes: ["Fox", "Monk"],
  manaCost: { generic: 2, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 3,
  keywords: ["Lifelink"],
  tier: "vanilla",
};
export const HEALER_S_FLOCK: CardDefinition = {
  id: "healers-flock",
  name: "Healer's Flock",
  scryfallId: "b93b5429-8512-4ab6-9ecd-fa270e0144f3",
  types: ["Creature"],
  subtypes: ["Bird"],
  manaCost: { generic: 0, colors: { W: 3 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 3,
  keywords: ["Flying", "Lifelink"],
  tier: "vanilla",
};
export const KEEN_EYED_ARCHERS: CardDefinition = {
  id: "keen-eyed-archers",
  name: "Keen-Eyed Archers",
  scryfallId: "594de429-58ed-4a0c-9631-464cde7a48c3",
  types: ["Creature"],
  subtypes: ["Elf", "Archer"],
  manaCost: { generic: 2, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 2,
  keywords: ["Reach"],
  tier: "vanilla",
};
export const KEMBA_S_SKYGUARD: CardDefinition = {
  id: "kembas-skyguard",
  name: "Kemba's Skyguard",
  scryfallId: "b9f20a74-7614-4bd9-ac08-0e098f98df0c",
  types: ["Creature"],
  subtypes: ["Cat", "Knight"],
  manaCost: { generic: 1, colors: { W: 2 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 2,
  keywords: ["Flying"],
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 2 } }],
  tier: "scripted",
};
export const KNIGHT_OF_THE_KEEP: CardDefinition = {
  id: "knight-of-the-keep",
  name: "Knight of the Keep",
  scryfallId: "0d49653d-cd4e-40a7-99de-fc531b5d8594",
  types: ["Creature"],
  subtypes: ["Human", "Knight"],
  manaCost: { generic: 2, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 2,
  tier: "vanilla",
};
export const KOR_CELEBRANT: CardDefinition = {
  id: "kor-celebrant",
  name: "Kor Celebrant",
  scryfallId: "87c37e46-a961-4739-8893-f783013e2be6",
  types: ["Creature"],
  subtypes: ["Kor", "Cleric"],
  manaCost: { generic: 2, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 4,
  // "Whenever this creature OR another creature you control enters, you gain
  // 1 life." The only card of this shape in the pool that counts itself, which
  // is what includesSelf is for.
  triggeredAbilities: [
    { event: "permanent-enters", watchFor: { type: "Creature" }, includesSelf: true, effect: { kind: "gainLife", amount: 1 } },
  ],
  tier: "scripted",
};
export const LOXODON_WAYFARER: CardDefinition = {
  id: "loxodon-wayfarer",
  name: "Loxodon Wayfarer",
  scryfallId: "356c5e6a-c0bd-43f7-bc84-a6ae8718a7a2",
  types: ["Creature"],
  subtypes: ["Elephant", "Monk"],
  manaCost: { generic: 2, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 5,
  tier: "vanilla",
};
export const MESA_CAVALIER: CardDefinition = {
  id: "mesa-cavalier",
  name: "Mesa Cavalier",
  scryfallId: "feeec740-7ffc-4f57-b52c-92209da91d69",
  types: ["Creature"],
  subtypes: ["Human", "Knight"],
  manaCost: { generic: 2, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 1,
  keywords: ["Flying"],
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 2 } }],
  tier: "scripted",
};
export const NIGHTGUARD_PATROL: CardDefinition = {
  id: "nightguard-patrol",
  name: "Nightguard Patrol",
  scryfallId: "20377fbf-70c0-441b-b2e3-62ed26aaab4a",
  types: ["Creature"],
  subtypes: ["Human", "Soldier"],
  manaCost: { generic: 2, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 1,
  keywords: ["First Strike", "Vigilance"],
  tier: "vanilla",
};
export const PEARLED_UNICORN: CardDefinition = {
  id: "pearled-unicorn",
  name: "Pearled Unicorn",
  scryfallId: "ce33ef5b-a0ff-459c-a9d4-a0a00ac66b31",
  types: ["Creature"],
  subtypes: ["Unicorn"],
  manaCost: { generic: 2, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 2,
  tier: "vanilla",
};
export const REGAL_UNICORN: CardDefinition = {
  id: "regal-unicorn",
  name: "Regal Unicorn",
  scryfallId: "54ca9b1c-fead-4bb6-800f-8b762a82fda7",
  types: ["Creature"],
  subtypes: ["Unicorn"],
  manaCost: { generic: 2, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 3,
  tier: "vanilla",
};
export const SHADOW_GLIDER: CardDefinition = {
  id: "shadow-glider",
  name: "Shadow Glider",
  scryfallId: "b4ffaf62-2e12-4b1d-a590-f63aacb4a30b",
  types: ["Creature"],
  subtypes: ["Kor", "Soldier"],
  manaCost: { generic: 2, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 2,
  keywords: ["Flying"],
  tier: "vanilla",
};
export const SHU_FOOT_SOLDIERS: CardDefinition = {
  id: "shu-foot-soldiers",
  name: "Shu Foot Soldiers",
  scryfallId: "cd4268d5-f27b-44a5-91f6-6c90521825fd",
  types: ["Creature"],
  subtypes: ["Human", "Soldier"],
  manaCost: { generic: 2, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 3,
  tier: "vanilla",
};
export const SKYHUNTER_PROWLER: CardDefinition = {
  id: "skyhunter-prowler",
  name: "Skyhunter Prowler",
  scryfallId: "52aa4af5-f0cb-4512-bef5-2e46a43aa27b",
  types: ["Creature"],
  subtypes: ["Cat", "Knight"],
  manaCost: { generic: 2, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 3,
  keywords: ["Flying", "Vigilance"],
  tier: "vanilla",
};
export const THOSE_WHO_SERVE: CardDefinition = {
  id: "those-who-serve",
  name: "Those Who Serve",
  scryfallId: "b4f27dd9-7ee4-4cdc-8f65-a4349b6aa47f",
  types: ["Creature"],
  subtypes: ["Zombie"],
  manaCost: { generic: 2, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 4,
  tier: "vanilla",
};
export const VENERABLE_MONK: CardDefinition = {
  id: "venerable-monk",
  name: "Venerable Monk",
  scryfallId: "8002ca7f-a889-4145-8f1b-5e8417f7c0bf",
  types: ["Creature"],
  subtypes: ["Human", "Monk", "Cleric"],
  manaCost: { generic: 2, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 2,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 2 } }],
  tier: "scripted",
};
export const AARDVARK_SLOTH: CardDefinition = {
  id: "aardvark-sloth",
  name: "Aardvark Sloth",
  scryfallId: "e16365a2-4969-4ad5-af95-9dd2d0499f06",
  types: ["Creature"],
  subtypes: ["Sloth", "Beast"],
  manaCost: { generic: 3, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 3,
  keywords: ["Lifelink"],
  tier: "vanilla",
};
export const ALABASTER_KIRIN: CardDefinition = {
  id: "alabaster-kirin",
  name: "Alabaster Kirin",
  scryfallId: "ad1ce529-06ed-4e85-9988-8c8b58401ed5",
  types: ["Creature"],
  subtypes: ["Kirin"],
  manaCost: { generic: 3, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 3,
  keywords: ["Flying", "Vigilance"],
  tier: "vanilla",
};
export const AVEN_SENTRY: CardDefinition = {
  id: "aven-sentry",
  name: "Aven Sentry",
  scryfallId: "bf49e5bf-07fb-44b0-8e74-092088d9019f",
  types: ["Creature"],
  subtypes: ["Bird", "Soldier"],
  manaCost: { generic: 3, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 2,
  keywords: ["Flying"],
  tier: "vanilla",
};
export const CLOUD_CRUSADER: CardDefinition = {
  id: "cloud-crusader",
  name: "Cloud Crusader",
  scryfallId: "83ce09da-6c1d-46ac-870e-ff58ceaba116",
  types: ["Creature"],
  subtypes: ["Human", "Knight"],
  manaCost: { generic: 2, colors: { W: 2 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 3,
  keywords: ["Flying", "First Strike"],
  tier: "vanilla",
};
export const DUTIFUL_SERVANTS: CardDefinition = {
  id: "dutiful-servants",
  name: "Dutiful Servants",
  scryfallId: "7684db4c-6eff-4da1-a410-48d707fb5bf1",
  types: ["Creature"],
  subtypes: ["Zombie"],
  manaCost: { generic: 3, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 5,
  tier: "vanilla",
};
export const FOOT_SOLDIERS: CardDefinition = {
  id: "foot-soldiers",
  name: "Foot Soldiers",
  scryfallId: "baff03f3-a8ca-4c35-ae71-43b5d237b519",
  types: ["Creature"],
  subtypes: ["Human", "Soldier"],
  manaCost: { generic: 3, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 4,
  tier: "vanilla",
};
export const HEALER_OF_THE_PRIDE: CardDefinition = {
  id: "healer-of-the-pride",
  name: "Healer of the Pride",
  scryfallId: "35716e37-1bb2-41e2-bb55-e65126b01ce3",
  types: ["Creature"],
  subtypes: ["Cat", "Cleric"],
  manaCost: { generic: 3, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 3,
  // "Whenever another creature you control enters, you gain 2 life."
  triggeredAbilities: [{ event: "permanent-enters", watchFor: { type: "Creature" }, effect: { kind: "gainLife", amount: 2 } }],
  tier: "scripted",
};
export const INDOMITABLE_ANCIENTS: CardDefinition = {
  id: "indomitable-ancients",
  name: "Indomitable Ancients",
  scryfallId: "a4e20d78-8c01-40ed-bc69-89d4d5028552",
  types: ["Creature"],
  subtypes: ["Treefolk", "Warrior"],
  manaCost: { generic: 2, colors: { W: 2 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 10,
  tier: "vanilla",
};
export const KAMI_OF_OLD_STONE: CardDefinition = {
  id: "kami-of-old-stone",
  name: "Kami of Old Stone",
  scryfallId: "422fe3bd-d92e-4c91-8c30-3b5aec00201a",
  types: ["Creature"],
  subtypes: ["Spirit"],
  manaCost: { generic: 3, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 7,
  tier: "vanilla",
};
export const LOXODON_CONVERT: CardDefinition = {
  id: "loxodon-convert",
  name: "Loxodon Convert",
  scryfallId: "00c050c3-4f50-4bb6-8477-6737887ca10d",
  types: ["Creature"],
  subtypes: ["Phyrexian", "Elephant", "Soldier"],
  manaCost: { generic: 3, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 4,
  toughness: 2,
  tier: "vanilla",
};
export const MOORISH_CAVALRY: CardDefinition = {
  id: "moorish-cavalry",
  name: "Moorish Cavalry",
  scryfallId: "c6ae847c-9b88-4e34-930f-2f4fd28423f7",
  types: ["Creature"],
  subtypes: ["Human", "Knight"],
  manaCost: { generic: 2, colors: { W: 2 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 3,
  keywords: ["Trample"],
  tier: "vanilla",
};
export const RAZORFOOT_GRIFFIN: CardDefinition = {
  id: "razorfoot-griffin",
  name: "Razorfoot Griffin",
  scryfallId: "662d812f-4936-48e4-acbe-abccf9ab21c7",
  types: ["Creature"],
  subtypes: ["Griffin"],
  manaCost: { generic: 3, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 2,
  keywords: ["Flying", "First Strike"],
  tier: "vanilla",
};
export const SHU_ELITE_INFANTRY: CardDefinition = {
  id: "shu-elite-infantry",
  name: "Shu Elite Infantry",
  scryfallId: "36bcd751-1142-4e72-9d87-7a25c74c038b",
  types: ["Creature"],
  subtypes: ["Human", "Soldier"],
  manaCost: { generic: 3, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 3,
  tier: "vanilla",
};
export const SPOTTED_GRIFFIN: CardDefinition = {
  id: "spotted-griffin",
  name: "Spotted Griffin",
  scryfallId: "5fbba1f3-53c6-4c74-850b-dde17bde0021",
  types: ["Creature"],
  subtypes: ["Griffin"],
  manaCost: { generic: 3, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 3,
  keywords: ["Flying"],
  tier: "vanilla",
};
export const TORMENTED_ANGEL: CardDefinition = {
  id: "tormented-angel",
  name: "Tormented Angel",
  scryfallId: "00d4d751-50df-4d8f-a6d9-4e76797c429a",
  types: ["Creature"],
  subtypes: ["Angel"],
  manaCost: { generic: 3, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 5,
  keywords: ["Flying"],
  tier: "vanilla",
};
export const WALL_OF_FAITH: CardDefinition = {
  id: "wall-of-faith",
  name: "Wall of Faith",
  scryfallId: "05f30f77-75ea-4145-a4a1-106cc547f482",
  types: ["Creature"],
  subtypes: ["Wall"],
  manaCost: { generic: 3, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 0,
  toughness: 5,
  keywords: ["Defender"],
  activatedAbilities: [{ cost: { mana: { generic: 0, colors: { W: 1 } } }, effect: { kind: "pump", power: 0, toughness: 1 } }],
  tier: "scripted",
};
export const ANGEL_OF_LIGHT: CardDefinition = {
  id: "angel-of-light",
  name: "Angel of Light",
  scryfallId: "9d8a0375-2b73-4514-9b82-9803eeae69c9",
  types: ["Creature"],
  subtypes: ["Angel"],
  manaCost: { generic: 4, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 3,
  keywords: ["Flying", "Vigilance"],
  tier: "vanilla",
};
export const AVEN_OF_ENDURING_HOPE: CardDefinition = {
  id: "aven-of-enduring-hope",
  name: "Aven of Enduring Hope",
  scryfallId: "02c1310c-1b54-42dd-bf24-889770fa2ded",
  types: ["Creature"],
  subtypes: ["Bird", "Cleric"],
  manaCost: { generic: 4, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 3,
  keywords: ["Flying"],
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 3 } }],
  tier: "scripted",
};
export const BORDER_PATROL: CardDefinition = {
  id: "border-patrol",
  name: "Border Patrol",
  scryfallId: "a49a85c8-3516-4dda-b16b-bf1bf890becb",
  types: ["Creature"],
  subtypes: ["Human", "Nomad"],
  manaCost: { generic: 4, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 6,
  keywords: ["Vigilance"],
  tier: "vanilla",
};
export const DAWNING_ANGEL: CardDefinition = {
  id: "dawning-angel",
  name: "Dawning Angel",
  scryfallId: "4f3d90ef-6f70-4897-85c1-4e1beeb33363",
  types: ["Creature"],
  subtypes: ["Angel"],
  manaCost: { generic: 4, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 2,
  keywords: ["Flying"],
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 4 } }],
  tier: "scripted",
};
export const ENFORCER_GRIFFIN: CardDefinition = {
  id: "enforcer-griffin",
  name: "Enforcer Griffin",
  scryfallId: "2cfce961-be01-42d6-b309-15ca17225be6",
  types: ["Creature"],
  subtypes: ["Griffin"],
  manaCost: { generic: 4, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 4,
  keywords: ["Flying"],
  tier: "vanilla",
};
export const GHOSTLY_SENTINEL: CardDefinition = {
  id: "ghostly-sentinel",
  name: "Ghostly Sentinel",
  scryfallId: "de867066-df5c-4412-9d51-56626b6d0220",
  types: ["Creature"],
  subtypes: ["Kor", "Spirit"],
  manaCost: { generic: 4, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 3,
  keywords: ["Flying", "Vigilance"],
  tier: "vanilla",
};
export const GUARDIAN_LIONS: CardDefinition = {
  id: "guardian-lions",
  name: "Guardian Lions",
  scryfallId: "3defc506-537e-4659-815d-5dab15fbf199",
  types: ["Creature"],
  subtypes: ["Cat"],
  manaCost: { generic: 4, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 6,
  keywords: ["Vigilance"],
  tier: "vanilla",
};
export const JHOVALL_RIDER: CardDefinition = {
  id: "jhovall-rider",
  name: "Jhovall Rider",
  scryfallId: "7e1f7c51-0011-4ea5-b123-3c26293f5dab",
  types: ["Creature"],
  subtypes: ["Human", "Rebel"],
  manaCost: { generic: 4, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 3,
  keywords: ["Trample"],
  tier: "vanilla",
};
export const LUCENT_LIMINID: CardDefinition = {
  id: "lucent-liminid",
  name: "Lucent Liminid",
  scryfallId: "cd700719-2f65-4fd5-b3aa-3e9402560c79",
  types: ["Creature", "Enchantment"],
  subtypes: ["Elemental"],
  manaCost: { generic: 3, colors: { W: 2 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 3,
  keywords: ["Flying"],
  tier: "vanilla",
};
export const PLOVER_KNIGHTS: CardDefinition = {
  id: "plover-knights",
  name: "Plover Knights",
  scryfallId: "d84fdc31-43f8-4cb9-b9a8-4ad3d1e90edb",
  types: ["Creature"],
  subtypes: ["Kithkin", "Knight"],
  manaCost: { generic: 3, colors: { W: 2 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 3,
  keywords: ["Flying", "First Strike"],
  tier: "vanilla",
};
export const SERRA_ANGEL: CardDefinition = {
  id: "serra-angel",
  name: "Serra Angel",
  scryfallId: "b8c5e74c-96e7-4a1f-93b7-14d776fe4b2d",
  types: ["Creature"],
  subtypes: ["Angel"],
  manaCost: { generic: 3, colors: { W: 2 } },
  colorIdentity: ["W"],
  power: 4,
  toughness: 4,
  keywords: ["Flying", "Vigilance"],
  tier: "vanilla",
};
export const SHINING_AEROSAUR: CardDefinition = {
  id: "shining-aerosaur",
  name: "Shining Aerosaur",
  scryfallId: "8e900d0d-6f35-4e5d-9365-6ade227d218d",
  types: ["Creature"],
  subtypes: ["Dinosaur"],
  manaCost: { generic: 4, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 4,
  keywords: ["Flying"],
  tier: "vanilla",
};
export const SIEGE_MASTODON: CardDefinition = {
  id: "siege-mastodon",
  name: "Siege Mastodon",
  scryfallId: "71fd27a8-2de6-454f-8174-a60918bfe60e",
  types: ["Creature"],
  subtypes: ["Elephant"],
  manaCost: { generic: 4, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 5,
  tier: "vanilla",
};
export const SILVERCLAW_GRIFFIN: CardDefinition = {
  id: "silverclaw-griffin",
  name: "Silverclaw Griffin",
  scryfallId: "54528722-a6aa-4567-9cd1-e4a97adec7d0",
  types: ["Creature"],
  subtypes: ["Griffin"],
  manaCost: { generic: 3, colors: { W: 2 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 2,
  keywords: ["Flying", "First Strike"],
  tier: "vanilla",
};
export const SKYSWIRL_HARRIER: CardDefinition = {
  id: "skyswirl-harrier",
  name: "Skyswirl Harrier",
  scryfallId: "b951bc89-be0b-4330-8a13-e196e084d53c",
  types: ["Creature"],
  subtypes: ["Bird"],
  manaCost: { generic: 4, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 4,
  keywords: ["Flying"],
  tier: "vanilla",
};
export const SPIRITUAL_GUARDIAN: CardDefinition = {
  id: "spiritual-guardian",
  name: "Spiritual Guardian",
  scryfallId: "70cf515c-c4c8-4e20-b990-2d4ec9345177",
  types: ["Creature"],
  subtypes: ["Spirit"],
  manaCost: { generic: 3, colors: { W: 2 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 4,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 4 } }],
  tier: "scripted",
};
export const STAUNCH_DEFENDERS: CardDefinition = {
  id: "staunch-defenders",
  name: "Staunch Defenders",
  scryfallId: "ba41211a-30b0-4064-a197-5d17472b278f",
  types: ["Creature"],
  subtypes: ["Human", "Soldier"],
  manaCost: { generic: 3, colors: { W: 2 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 4,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 4 } }],
  tier: "scripted",
};
export const THRABEN_PUREBLOODS: CardDefinition = {
  id: "thraben-purebloods",
  name: "Thraben Purebloods",
  scryfallId: "16db28f4-3d96-42f5-a264-592fdc2d4196",
  types: ["Creature"],
  subtypes: ["Dog"],
  manaCost: { generic: 4, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 5,
  tier: "vanilla",
};
export const BULWARK_GIANT: CardDefinition = {
  id: "bulwark-giant",
  name: "Bulwark Giant",
  scryfallId: "ebf3a622-6aad-4d74-8098-ffbf21555956",
  types: ["Creature"],
  subtypes: ["Giant", "Soldier"],
  manaCost: { generic: 5, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 6,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 5 } }],
  tier: "scripted",
};
export const JHOVALL_QUEEN: CardDefinition = {
  id: "jhovall-queen",
  name: "Jhovall Queen",
  scryfallId: "b8eb55cc-ddde-4f15-9262-b9aee28059d3",
  types: ["Creature"],
  subtypes: ["Cat", "Rebel"],
  manaCost: { generic: 4, colors: { W: 2 } },
  colorIdentity: ["W"],
  power: 4,
  toughness: 7,
  keywords: ["Vigilance"],
  tier: "vanilla",
};
export const PEARL_DRAGON: CardDefinition = {
  id: "pearl-dragon",
  name: "Pearl Dragon",
  scryfallId: "3efee309-2eba-4702-9361-0f75043922bb",
  types: ["Creature"],
  subtypes: ["Dragon"],
  manaCost: { generic: 4, colors: { W: 2 } },
  colorIdentity: ["W"],
  power: 4,
  toughness: 4,
  keywords: ["Flying"],
  activatedAbilities: [{ cost: { mana: { generic: 1, colors: { W: 1 } } }, effect: { kind: "pump", power: 0, toughness: 1 } }],
  tier: "scripted",
};
export const ANGEL_OF_RETRIBUTION: CardDefinition = {
  id: "angel-of-retribution",
  name: "Angel of Retribution",
  scryfallId: "807f4edf-a961-4f52-a44e-abde0fd35722",
  types: ["Creature"],
  subtypes: ["Angel"],
  manaCost: { generic: 6, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 5,
  toughness: 5,
  keywords: ["Flying", "First Strike"],
  tier: "vanilla",
};
export const SERAPH_OF_THE_SUNS: CardDefinition = {
  id: "seraph-of-the-suns",
  name: "Seraph of the Suns",
  scryfallId: "85dc4ed8-4674-44a1-8a06-ecce72c85e60",
  types: ["Creature"],
  subtypes: ["Angel"],
  manaCost: { generic: 5, colors: { W: 2 } },
  colorIdentity: ["W"],
  power: 4,
  toughness: 4,
  keywords: ["Flying", "Indestructible"],
  tier: "vanilla",
};
export const RECONSTRUCTION: CardDefinition = {
  id: "reconstruction",
  name: "Reconstruction",
  scryfallId: "052a63b3-4225-448f-817c-62cffca534e2",
  types: ["Sorcery"],
  manaCost: { generic: 0, colors: { U: 1 } },
  colorIdentity: ["U"],
  castEffect: { kind: "returnFromGraveyard", destination: "hand", target: { kind: "card-in-your-graveyard", cardType: "Artifact" } },
  tier: "scripted",
};
export const D_J_VU: CardDefinition = {
  id: "d-j-vu",
  name: "Déjà Vu",
  scryfallId: "ade6a71a-e8ec-4d41-8a39-3eacf0097c8b",
  types: ["Sorcery"],
  manaCost: { generic: 2, colors: { U: 1 } },
  colorIdentity: ["U"],
  castEffect: { kind: "returnFromGraveyard", destination: "hand", target: { kind: "card-in-your-graveyard", cardType: "Sorcery" } },
  tier: "scripted",
};
export const SAGE_S_KNOWLEDGE: CardDefinition = {
  id: "sages-knowledge",
  name: "Sage's Knowledge",
  scryfallId: "156d7c70-6c6d-4052-9d44-029ba1bb66e4",
  types: ["Sorcery"],
  manaCost: { generic: 2, colors: { U: 1 } },
  colorIdentity: ["U"],
  castEffect: { kind: "returnFromGraveyard", destination: "hand", target: { kind: "card-in-your-graveyard", cardType: "Sorcery" } },
  tier: "scripted",
};
export const ARGIVIAN_RESTORATION: CardDefinition = {
  id: "argivian-restoration",
  name: "Argivian Restoration",
  scryfallId: "3f14b3a6-5490-4a50-9449-542e23f1d6b1",
  types: ["Sorcery"],
  manaCost: { generic: 2, colors: { U: 2 } },
  colorIdentity: ["U"],
  castEffect: { kind: "returnFromGraveyard", destination: "battlefield", target: { kind: "card-in-your-graveyard", cardType: "Artifact" } },
  tier: "scripted",
};
export const VIZZERDRIX: CardDefinition = {
  id: "vizzerdrix",
  name: "Vizzerdrix",
  scryfallId: "9a82ffff-e02a-4ecb-a92d-8ed571beac46",
  types: ["Creature"],
  subtypes: ["Rabbit", "Beast"],
  manaCost: { generic: 6, colors: { U: 1 } },
  colorIdentity: ["U"],
  power: 6,
  toughness: 6,
  tier: "vanilla",
};
export const DISENTOMB: CardDefinition = {
  id: "disentomb",
  name: "Disentomb",
  scryfallId: "7debd8f7-2f34-4fdd-8eb6-fa8f9d2a60e8",
  types: ["Sorcery"],
  manaCost: { generic: 0, colors: { B: 1 } },
  colorIdentity: ["B"],
  castEffect: { kind: "returnFromGraveyard", destination: "hand", target: { kind: "card-in-your-graveyard", cardType: "Creature" } },
  tier: "scripted",
};
export const RAISE_DEAD: CardDefinition = {
  id: "raise-dead",
  name: "Raise Dead",
  scryfallId: "4950c3c2-80c1-4447-ac38-cf40f76b9545",
  types: ["Sorcery"],
  manaCost: { generic: 0, colors: { B: 1 } },
  colorIdentity: ["B"],
  castEffect: { kind: "returnFromGraveyard", destination: "hand", target: { kind: "card-in-your-graveyard", cardType: "Creature" } },
  tier: "scripted",
};
export const RETURN_TO_BATTLE: CardDefinition = {
  id: "return-to-battle",
  name: "Return to Battle",
  scryfallId: "1841e615-fdcd-4187-bd69-d07abde0e1ae",
  types: ["Sorcery"],
  manaCost: { generic: 0, colors: { B: 1 } },
  colorIdentity: ["B"],
  castEffect: { kind: "returnFromGraveyard", destination: "hand", target: { kind: "card-in-your-graveyard", cardType: "Creature" } },
  tier: "scripted",
};
export const DEMONIC_TUTOR: CardDefinition = {
  id: "demonic-tutor",
  name: "Demonic Tutor",
  scryfallId: "a24b4cb6-cebb-428b-8654-74347a6a8d63",
  types: ["Sorcery"],
  manaCost: { generic: 1, colors: { B: 1 } },
  colorIdentity: ["B"],
  castEffect: { kind: "searchLibrary", destination: "hand" },
  tier: "scripted",
};
export const DIABOLIC_TUTOR: CardDefinition = {
  id: "diabolic-tutor",
  name: "Diabolic Tutor",
  scryfallId: "d650dd8c-edd8-44e4-ae95-aaaf84557a72",
  types: ["Sorcery"],
  manaCost: { generic: 2, colors: { B: 2 } },
  colorIdentity: ["B"],
  castEffect: { kind: "searchLibrary", destination: "hand" },
  tier: "scripted",
};
export const ZOMBIFY: CardDefinition = {
  id: "zombify",
  name: "Zombify",
  scryfallId: "dc798e6f-13c4-457c-b052-b7b65bc83cfe",
  types: ["Sorcery"],
  manaCost: { generic: 3, colors: { B: 1 } },
  colorIdentity: ["B"],
  castEffect: { kind: "returnFromGraveyard", destination: "battlefield", target: { kind: "card-in-your-graveyard", cardType: "Creature" } },
  tier: "scripted",
};
export const RISE_AGAIN: CardDefinition = {
  id: "rise-again",
  name: "Rise Again",
  scryfallId: "660ec88f-2063-404a-853e-c985e21d17b0",
  types: ["Sorcery"],
  manaCost: { generic: 4, colors: { B: 1 } },
  colorIdentity: ["B"],
  castEffect: { kind: "returnFromGraveyard", destination: "battlefield", target: { kind: "card-in-your-graveyard", cardType: "Creature" } },
  tier: "scripted",
};
export const AUGMENTING_AUTOMATON: CardDefinition = {
  id: "augmenting-automaton",
  name: "Augmenting Automaton",
  scryfallId: "7d017798-8278-4f9c-a691-912935c10c20",
  types: ["Artifact", "Creature"],
  subtypes: ["Construct"],
  manaCost: { generic: 1, colors: {  } },
  colorIdentity: ["B"],
  power: 1,
  toughness: 1,
  activatedAbilities: [{ cost: { mana: { generic: 1, colors: { B: 1 } } }, effect: { kind: "pump", power: 1, toughness: 1 } }],
  tier: "scripted",
};
export const BURROG_BANEMAKER: CardDefinition = {
  id: "burrog-banemaker",
  name: "Burrog Banemaker",
  scryfallId: "3e4f9d23-1a17-4188-ac91-f8ddea46a1c4",
  types: ["Creature"],
  subtypes: ["Frog", "Warlock"],
  manaCost: { generic: 0, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 1,
  toughness: 1,
  keywords: ["Deathtouch"],
  activatedAbilities: [{ cost: { mana: { generic: 1, colors: { B: 1 } } }, effect: { kind: "pump", power: 1, toughness: 1 } }],
  tier: "scripted",
};
export const HIRED_POISONER: CardDefinition = {
  id: "hired-poisoner",
  name: "Hired Poisoner",
  scryfallId: "bf97e572-90d6-46fc-81c3-956a7ef88983",
  types: ["Creature"],
  subtypes: ["Human", "Assassin"],
  manaCost: { generic: 0, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 1,
  toughness: 1,
  keywords: ["Deathtouch"],
  tier: "vanilla",
};
export const MONOIST_SENTRY: CardDefinition = {
  id: "monoist-sentry",
  name: "Monoist Sentry",
  scryfallId: "acc503e2-5c3a-4200-beb0-7d193d6c869e",
  types: ["Artifact", "Creature"],
  subtypes: ["Robot"],
  manaCost: { generic: 0, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 4,
  toughness: 1,
  keywords: ["Defender"],
  tier: "vanilla",
};
export const PHARIKA_S_CHOSEN: CardDefinition = {
  id: "pharikas-chosen",
  name: "Pharika's Chosen",
  scryfallId: "8119ce0c-d709-463c-9abc-f7025673ea72",
  types: ["Creature"],
  subtypes: ["Snake"],
  manaCost: { generic: 0, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 1,
  toughness: 1,
  keywords: ["Deathtouch"],
  tier: "vanilla",
};
export const RAVINE_RAIDER: CardDefinition = {
  id: "ravine-raider",
  name: "Ravine Raider",
  scryfallId: "874510be-7ecd-4eff-abad-b9594eb4821a",
  types: ["Creature"],
  subtypes: ["Lizard", "Rogue"],
  manaCost: { generic: 0, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 1,
  toughness: 1,
  keywords: ["Menace"],
  activatedAbilities: [{ cost: { mana: { generic: 1, colors: { B: 1 } } }, effect: { kind: "pump", power: 1, toughness: 1 } }],
  tier: "scripted",
};
export const THIRSTING_SHADE: CardDefinition = {
  id: "thirsting-shade",
  name: "Thirsting Shade",
  scryfallId: "a920c2e6-4a1f-487c-ad3f-b772443f0633",
  types: ["Creature"],
  subtypes: ["Shade"],
  manaCost: { generic: 0, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 1,
  toughness: 1,
  keywords: ["Lifelink"],
  activatedAbilities: [{ cost: { mana: { generic: 2, colors: { B: 1 } } }, effect: { kind: "pump", power: 1, toughness: 1 } }],
  tier: "scripted",
};
export const BANE_ALLEY_BLACKGUARD: CardDefinition = {
  id: "bane-alley-blackguard",
  name: "Bane Alley Blackguard",
  scryfallId: "15fcad03-4567-4f96-976e-01a07d8ab050",
  types: ["Creature"],
  subtypes: ["Human", "Rogue"],
  manaCost: { generic: 1, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 1,
  toughness: 3,
  tier: "vanilla",
};
export const CABAL_EVANGEL: CardDefinition = {
  id: "cabal-evangel",
  name: "Cabal Evangel",
  scryfallId: "d218d2a2-bb5d-4ea8-a131-341c574410b2",
  types: ["Creature"],
  subtypes: ["Human", "Cleric"],
  manaCost: { generic: 1, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 2,
  toughness: 2,
  tier: "vanilla",
};
export const DAGGERDROME_IMP: CardDefinition = {
  id: "daggerdrome-imp",
  name: "Daggerdrome Imp",
  scryfallId: "6d9417ab-e2af-436b-9677-6e0120770d80",
  types: ["Creature"],
  subtypes: ["Imp"],
  manaCost: { generic: 1, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 1,
  toughness: 1,
  keywords: ["Flying", "Lifelink"],
  tier: "vanilla",
};
export const DAKMOR_SCORPION: CardDefinition = {
  id: "dakmor-scorpion",
  name: "Dakmor Scorpion",
  scryfallId: "6ed84268-92f7-4790-99b2-f2982b6e0893",
  types: ["Creature"],
  subtypes: ["Scorpion"],
  manaCost: { generic: 1, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 2,
  toughness: 1,
  tier: "vanilla",
};
export const ELEPHANT_RAT: CardDefinition = {
  id: "elephant-rat",
  name: "Elephant-Rat",
  scryfallId: "0568f28f-e830-4a7a-91d3-43e78bb86c8f",
  types: ["Creature"],
  subtypes: ["Elephant", "Rat"],
  manaCost: { generic: 1, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 1,
  toughness: 3,
  keywords: ["Menace"],
  tier: "vanilla",
};
export const GURMAG_SWIFTWING: CardDefinition = {
  id: "gurmag-swiftwing",
  name: "Gurmag Swiftwing",
  scryfallId: "6e068e80-ab5d-41b8-add9-bd49905e4992",
  types: ["Creature"],
  subtypes: ["Bat"],
  manaCost: { generic: 1, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 1,
  toughness: 2,
  keywords: ["Flying", "First Strike", "Haste"],
  tier: "vanilla",
};
export const GUTTER_SKULK: CardDefinition = {
  id: "gutter-skulk",
  name: "Gutter Skulk",
  scryfallId: "830c7c77-20c4-429f-88c7-b85ab7a0e38b",
  types: ["Creature"],
  subtypes: ["Zombie", "Rat"],
  manaCost: { generic: 1, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 2,
  toughness: 2,
  tier: "vanilla",
};
export const INKRISE_INFILTRATOR: CardDefinition = {
  id: "inkrise-infiltrator",
  name: "Inkrise Infiltrator",
  scryfallId: "cbb6e447-5f40-4039-8a17-257b4a55382c",
  types: ["Creature"],
  subtypes: ["Human", "Ninja"],
  manaCost: { generic: 1, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 1,
  toughness: 2,
  keywords: ["Flying"],
  activatedAbilities: [{ cost: { mana: { generic: 3, colors: { B: 1 } } }, effect: { kind: "pump", power: 2, toughness: 2 } }],
  tier: "scripted",
};
export const KROVIKAN_SCOUNDREL: CardDefinition = {
  id: "krovikan-scoundrel",
  name: "Krovikan Scoundrel",
  scryfallId: "bd9f046c-b416-4d80-8998-047b98361352",
  types: ["Creature"],
  subtypes: ["Human", "Rogue"],
  manaCost: { generic: 1, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 2,
  toughness: 1,
  tier: "vanilla",
};
export const NANTUKO_SHADE: CardDefinition = {
  id: "nantuko-shade",
  name: "Nantuko Shade",
  scryfallId: "fb4c5dd4-79dc-4bd2-8c18-897924a4a959",
  types: ["Creature"],
  subtypes: ["Insect", "Shade"],
  manaCost: { generic: 0, colors: { B: 2 } },
  colorIdentity: ["B"],
  power: 2,
  toughness: 1,
  activatedAbilities: [{ cost: { mana: { generic: 0, colors: { B: 1 } } }, effect: { kind: "pump", power: 1, toughness: 1 } }],
  tier: "scripted",
};
export const QUEEN_S_BAY_SOLDIER: CardDefinition = {
  id: "queens-bay-soldier",
  name: "Queen's Bay Soldier",
  scryfallId: "ce2ca2e6-f920-4529-88d2-d984bdb7490a",
  types: ["Creature"],
  subtypes: ["Vampire", "Soldier"],
  manaCost: { generic: 1, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 2,
  toughness: 2,
  tier: "vanilla",
};
export const WALKING_CORPSE: CardDefinition = {
  id: "walking-corpse",
  name: "Walking Corpse",
  scryfallId: "053b59b4-a22c-4228-aadc-ae9da6bb465e",
  types: ["Creature"],
  subtypes: ["Zombie"],
  manaCost: { generic: 1, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 2,
  toughness: 2,
  tier: "vanilla",
};
export const CURSED_MINOTAUR: CardDefinition = {
  id: "cursed-minotaur",
  name: "Cursed Minotaur",
  scryfallId: "a3990d2f-39d9-49f9-936f-1d40adcf295c",
  types: ["Creature"],
  subtypes: ["Zombie", "Minotaur"],
  manaCost: { generic: 2, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 3,
  toughness: 2,
  keywords: ["Menace"],
  tier: "vanilla",
};
export const DREAD_SHADE: CardDefinition = {
  id: "dread-shade",
  name: "Dread Shade",
  scryfallId: "46b8b1d7-9d2b-4943-bb3b-238a6333ce93",
  types: ["Creature"],
  subtypes: ["Shade"],
  manaCost: { generic: 0, colors: { B: 3 } },
  colorIdentity: ["B"],
  power: 3,
  toughness: 3,
  activatedAbilities: [{ cost: { mana: { generic: 0, colors: { B: 1 } } }, effect: { kind: "pump", power: 1, toughness: 1 } }],
  tier: "scripted",
};
export const FELHIDE_MINOTAUR: CardDefinition = {
  id: "felhide-minotaur",
  name: "Felhide Minotaur",
  scryfallId: "b4e424de-81be-4f90-a7a2-4102c8ba8989",
  types: ["Creature"],
  subtypes: ["Minotaur"],
  manaCost: { generic: 2, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 2,
  toughness: 3,
  tier: "vanilla",
};
export const FROZEN_SHADE: CardDefinition = {
  id: "frozen-shade",
  name: "Frozen Shade",
  scryfallId: "cbd0b4ff-f49f-4079-991a-f66d1220235d",
  types: ["Creature"],
  subtypes: ["Shade"],
  manaCost: { generic: 2, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 0,
  toughness: 1,
  activatedAbilities: [{ cost: { mana: { generic: 0, colors: { B: 1 } } }, effect: { kind: "pump", power: 1, toughness: 1 } }],
  tier: "scripted",
};
export const GIANT_SCORPION: CardDefinition = {
  id: "giant-scorpion",
  name: "Giant Scorpion",
  scryfallId: "047bb416-1fe7-4965-907f-8e2a5fb4a925",
  types: ["Creature"],
  subtypes: ["Scorpion"],
  manaCost: { generic: 2, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 1,
  toughness: 3,
  keywords: ["Deathtouch"],
  tier: "vanilla",
};
export const GLOOMHUNTER: CardDefinition = {
  id: "gloomhunter",
  name: "Gloomhunter",
  scryfallId: "98db4317-9850-44c1-884b-d8d3abe1afeb",
  types: ["Creature"],
  subtypes: ["Bat"],
  manaCost: { generic: 2, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 2,
  toughness: 1,
  keywords: ["Flying"],
  tier: "vanilla",
};
export const KELINORE_BAT: CardDefinition = {
  id: "kelinore-bat",
  name: "Kelinore Bat",
  scryfallId: "542b3ec9-7800-4dea-bf39-b51a11b58339",
  types: ["Creature"],
  subtypes: ["Bat"],
  manaCost: { generic: 2, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 2,
  toughness: 1,
  keywords: ["Flying"],
  tier: "vanilla",
};
export const LOOMING_SHADE: CardDefinition = {
  id: "looming-shade",
  name: "Looming Shade",
  scryfallId: "84a6703c-38d4-4c86-b5b0-ebfde81bb1bf",
  types: ["Creature"],
  subtypes: ["Shade"],
  manaCost: { generic: 2, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 1,
  toughness: 1,
  activatedAbilities: [{ cost: { mana: { generic: 0, colors: { B: 1 } } }, effect: { kind: "pump", power: 1, toughness: 1 } }],
  tier: "scripted",
};
export const MARKOV_PATRICIAN: CardDefinition = {
  id: "markov-patrician",
  name: "Markov Patrician",
  scryfallId: "29c3d3f7-5e28-4fec-8422-87856fcd1e8e",
  types: ["Creature"],
  subtypes: ["Vampire"],
  manaCost: { generic: 2, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 3,
  toughness: 1,
  keywords: ["Lifelink"],
  tier: "vanilla",
};
export const MOANING_SPIRIT: CardDefinition = {
  id: "moaning-spirit",
  name: "Moaning Spirit",
  scryfallId: "cdd99210-5201-4ecc-b86a-aee9dafe2657",
  types: ["Creature"],
  subtypes: ["Spirit"],
  manaCost: { generic: 2, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 2,
  toughness: 1,
  keywords: ["Flying"],
  tier: "vanilla",
};
export const NOXIOUS_GROODION: CardDefinition = {
  id: "noxious-groodion",
  name: "Noxious Groodion",
  scryfallId: "b6cb3d78-1a60-4e9b-b387-afeb58677536",
  types: ["Creature"],
  subtypes: ["Beast"],
  manaCost: { generic: 2, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 2,
  toughness: 2,
  keywords: ["Deathtouch"],
  tier: "vanilla",
};
export const SCATHE_ZOMBIES: CardDefinition = {
  id: "scathe-zombies",
  name: "Scathe Zombies",
  scryfallId: "037cbf71-1199-4457-9b09-f66e7cb294d5",
  types: ["Creature"],
  subtypes: ["Zombie"],
  manaCost: { generic: 2, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 2,
  toughness: 2,
  tier: "vanilla",
};
export const VAMPIRE_NIGHTHAWK: CardDefinition = {
  id: "vampire-nighthawk",
  name: "Vampire Nighthawk",
  scryfallId: "7aff07f9-9528-4149-9af0-f4e3c66c9dc5",
  types: ["Creature"],
  subtypes: ["Vampire", "Shaman"],
  manaCost: { generic: 1, colors: { B: 2 } },
  colorIdentity: ["B"],
  power: 2,
  toughness: 3,
  keywords: ["Flying", "Deathtouch", "Lifelink"],
  tier: "vanilla",
};
export const VEILED_SHADE: CardDefinition = {
  id: "veiled-shade",
  name: "Veiled Shade",
  scryfallId: "35cb18ae-0229-40a1-8838-ffb678ab2ed9",
  types: ["Creature"],
  subtypes: ["Shade"],
  manaCost: { generic: 2, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 2,
  toughness: 2,
  activatedAbilities: [{ cost: { mana: { generic: 1, colors: { B: 1 } } }, effect: { kind: "pump", power: 1, toughness: 1 } }],
  tier: "scripted",
};
export const WARPATH_GHOUL: CardDefinition = {
  id: "warpath-ghoul",
  name: "Warpath Ghoul",
  scryfallId: "94785274-fa79-47cc-9896-0f5f695abb21",
  types: ["Creature"],
  subtypes: ["Zombie"],
  manaCost: { generic: 2, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 3,
  toughness: 2,
  tier: "vanilla",
};
export const BARTIZAN_BATS: CardDefinition = {
  id: "bartizan-bats",
  name: "Bartizan Bats",
  scryfallId: "445e41d8-317d-46ce-b858-54df716e0214",
  types: ["Creature"],
  subtypes: ["Bat"],
  manaCost: { generic: 3, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 3,
  toughness: 1,
  keywords: ["Flying"],
  tier: "vanilla",
};
export const CARRION_ANTS: CardDefinition = {
  id: "carrion-ants",
  name: "Carrion Ants",
  scryfallId: "6d1b1f70-2f64-4ced-a183-53c6b564b193",
  types: ["Creature"],
  subtypes: ["Insect"],
  manaCost: { generic: 2, colors: { B: 2 } },
  colorIdentity: ["B"],
  power: 0,
  toughness: 1,
  activatedAbilities: [{ cost: { mana: { generic: 1, colors: {} } }, effect: { kind: "pump", power: 1, toughness: 1 } }],
  tier: "scripted",
};
export const CHARITY_EXTRACTOR: CardDefinition = {
  id: "charity-extractor",
  name: "Charity Extractor",
  scryfallId: "3594f726-cdbb-4b7d-bcfe-17d5f8cd5228",
  types: ["Creature"],
  subtypes: ["Human", "Knight"],
  manaCost: { generic: 3, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 1,
  toughness: 5,
  keywords: ["Lifelink"],
  tier: "vanilla",
};
export const CRYPT_RIPPER: CardDefinition = {
  id: "crypt-ripper",
  name: "Crypt Ripper",
  scryfallId: "9920e91d-58c1-4c1a-a177-43423db96842",
  types: ["Creature"],
  subtypes: ["Shade"],
  manaCost: { generic: 2, colors: { B: 2 } },
  colorIdentity: ["B"],
  power: 2,
  toughness: 2,
  keywords: ["Haste"],
  activatedAbilities: [{ cost: { mana: { generic: 0, colors: { B: 1 } } }, effect: { kind: "pump", power: 1, toughness: 1 } }],
  tier: "scripted",
};
export const DEATHGAZE_COCKATRICE: CardDefinition = {
  id: "deathgaze-cockatrice",
  name: "Deathgaze Cockatrice",
  scryfallId: "9f17b58c-9738-4cdb-a408-e1595c384b92",
  types: ["Creature"],
  subtypes: ["Cockatrice"],
  manaCost: { generic: 2, colors: { B: 2 } },
  colorIdentity: ["B"],
  power: 2,
  toughness: 2,
  keywords: ["Flying", "Deathtouch"],
  tier: "vanilla",
};
export const DRIFTING_SHADE: CardDefinition = {
  id: "drifting-shade",
  name: "Drifting Shade",
  scryfallId: "00dcb25e-764b-47d6-bec4-225aaace77b0",
  types: ["Creature"],
  subtypes: ["Shade"],
  manaCost: { generic: 3, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 1,
  toughness: 1,
  keywords: ["Flying"],
  activatedAbilities: [{ cost: { mana: { generic: 0, colors: { B: 1 } } }, effect: { kind: "pump", power: 1, toughness: 1 } }],
  tier: "scripted",
};
export const DROSS_RIPPER: CardDefinition = {
  id: "dross-ripper",
  name: "Dross Ripper",
  scryfallId: "55d54f08-53f0-41b2-8b86-8244515224eb",
  types: ["Artifact", "Creature"],
  subtypes: ["Phyrexian", "Dog"],
  manaCost: { generic: 4, colors: {  } },
  colorIdentity: ["B"],
  power: 3,
  toughness: 3,
  activatedAbilities: [{ cost: { mana: { generic: 2, colors: { B: 1 } } }, effect: { kind: "pump", power: 1, toughness: 1 } }],
  tier: "scripted",
};
export const DUNGEON_SHADE: CardDefinition = {
  id: "dungeon-shade",
  name: "Dungeon Shade",
  scryfallId: "3e2f317a-578c-4f7d-a185-b22bf7c32624",
  types: ["Creature"],
  subtypes: ["Shade", "Spirit"],
  manaCost: { generic: 3, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 1,
  toughness: 1,
  keywords: ["Flying"],
  activatedAbilities: [{ cost: { mana: { generic: 0, colors: { B: 1 } } }, effect: { kind: "pump", power: 1, toughness: 1 } }],
  tier: "scripted",
};
export const FETID_HORROR: CardDefinition = {
  id: "fetid-horror",
  name: "Fetid Horror",
  scryfallId: "4be39d50-1e36-4dac-a923-81fc9f229b8d",
  types: ["Creature"],
  subtypes: ["Shade", "Horror"],
  manaCost: { generic: 3, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 1,
  toughness: 2,
  activatedAbilities: [{ cost: { mana: { generic: 0, colors: { B: 1 } } }, effect: { kind: "pump", power: 1, toughness: 1 } }],
  tier: "scripted",
};
export const GIANT_COCKROACH: CardDefinition = {
  id: "giant-cockroach",
  name: "Giant Cockroach",
  scryfallId: "25ca0c01-2e9f-4f1c-9078-f7a68559296d",
  types: ["Creature"],
  subtypes: ["Insect"],
  manaCost: { generic: 3, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 4,
  toughness: 2,
  tier: "vanilla",
};
export const HIGHBORN_VAMPIRE: CardDefinition = {
  id: "highborn-vampire",
  name: "Highborn Vampire",
  scryfallId: "24c40082-516e-4381-a4cc-e61c5a9a6cac",
  types: ["Creature"],
  subtypes: ["Vampire", "Warrior"],
  manaCost: { generic: 3, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 4,
  toughness: 3,
  tier: "vanilla",
};
export const HOAR_SHADE: CardDefinition = {
  id: "hoar-shade",
  name: "Hoar Shade",
  scryfallId: "72242dff-15ca-4da0-b3ae-9984d037b31f",
  types: ["Creature"],
  subtypes: ["Shade"],
  manaCost: { generic: 3, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 1,
  toughness: 2,
  activatedAbilities: [{ cost: { mana: { generic: 0, colors: { B: 1 } } }, effect: { kind: "pump", power: 1, toughness: 1 } }],
  tier: "scripted",
};
export const JAGWASP_SWARM: CardDefinition = {
  id: "jagwasp-swarm",
  name: "Jagwasp Swarm",
  scryfallId: "bd4e933b-de65-4089-877f-c598004b8e7e",
  types: ["Creature"],
  subtypes: ["Insect"],
  manaCost: { generic: 3, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 3,
  toughness: 2,
  keywords: ["Flying"],
  tier: "vanilla",
};
export const NETHER_HORROR: CardDefinition = {
  id: "nether-horror",
  name: "Nether Horror",
  scryfallId: "c217b672-c724-4fc2-936c-b3f0feaf6ea0",
  types: ["Creature"],
  subtypes: ["Horror"],
  manaCost: { generic: 3, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 4,
  toughness: 2,
  tier: "vanilla",
};
export const PERILOUS_SHADOW: CardDefinition = {
  id: "perilous-shadow",
  name: "Perilous Shadow",
  scryfallId: "2c101171-a988-4c1d-9954-634e2f1c6f01",
  types: ["Creature"],
  subtypes: ["Insect", "Shade"],
  manaCost: { generic: 2, colors: { B: 2 } },
  colorIdentity: ["B"],
  power: 0,
  toughness: 4,
  activatedAbilities: [{ cost: { mana: { generic: 1, colors: { B: 1 } } }, effect: { kind: "pump", power: 2, toughness: 2 } }],
  tier: "scripted",
};
export const PRAKHATA_CLUB_SECURITY: CardDefinition = {
  id: "prakhata-club-security",
  name: "Prakhata Club Security",
  scryfallId: "c46da57d-bcb9-4303-aa1c-72d08bb2b5a8",
  types: ["Creature"],
  subtypes: ["Aetherborn", "Warrior"],
  manaCost: { generic: 3, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 3,
  toughness: 4,
  tier: "vanilla",
};
export const ROTTING_FENSNAKE: CardDefinition = {
  id: "rotting-fensnake",
  name: "Rotting Fensnake",
  scryfallId: "c21cbb10-9157-4887-a752-29b9e94fc77a",
  types: ["Creature"],
  subtypes: ["Zombie", "Snake"],
  manaCost: { generic: 3, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 5,
  toughness: 1,
  tier: "vanilla",
};
export const TATTERED_APPARITION: CardDefinition = {
  id: "tattered-apparition",
  name: "Tattered Apparition",
  scryfallId: "0368e91c-31ee-4b81-a361-30a4555b1a42",
  types: ["Creature"],
  subtypes: ["Shade"],
  manaCost: { generic: 3, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 2,
  toughness: 2,
  keywords: ["Flying"],
  activatedAbilities: [{ cost: { mana: { generic: 1, colors: { B: 1 } } }, effect: { kind: "pump", power: 1, toughness: 1 } }],
  tier: "scripted",
};
export const TWO_HEADED_ZOMBIE: CardDefinition = {
  id: "two-headed-zombie",
  name: "Two-Headed Zombie",
  scryfallId: "2cc5760e-8b27-4d37-9772-c9eda90b1d95",
  types: ["Creature"],
  subtypes: ["Zombie"],
  manaCost: { generic: 3, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 4,
  toughness: 2,
  keywords: ["Menace"],
  tier: "vanilla",
};
export const VAMPIRE_CHAMPION: CardDefinition = {
  id: "vampire-champion",
  name: "Vampire Champion",
  scryfallId: "d47f91ff-c916-4938-8e01-2c684004dd9a",
  types: ["Creature"],
  subtypes: ["Vampire", "Soldier"],
  manaCost: { generic: 3, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 3,
  toughness: 3,
  keywords: ["Deathtouch"],
  tier: "vanilla",
};
export const WANDERING_TOMBSHELL: CardDefinition = {
  id: "wandering-tombshell",
  name: "Wandering Tombshell",
  scryfallId: "e66e1d97-d676-471a-a140-deb39600a7a9",
  types: ["Creature"],
  subtypes: ["Zombie", "Turtle"],
  manaCost: { generic: 3, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 1,
  toughness: 6,
  tier: "vanilla",
};
export const ZOF_SHADE: CardDefinition = {
  id: "zof-shade",
  name: "Zof Shade",
  scryfallId: "98b39bdf-445c-40a8-8999-1e8fbbda4ae9",
  types: ["Creature"],
  subtypes: ["Shade"],
  manaCost: { generic: 3, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 2,
  toughness: 2,
  activatedAbilities: [{ cost: { mana: { generic: 2, colors: { B: 1 } } }, effect: { kind: "pump", power: 2, toughness: 2 } }],
  tier: "scripted",
};
export const BLOOD_GLUTTON: CardDefinition = {
  id: "blood-glutton",
  name: "Blood Glutton",
  scryfallId: "28ff52a2-4223-4551-b388-b4dd21cc1437",
  types: ["Creature"],
  subtypes: ["Vampire"],
  manaCost: { generic: 4, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 4,
  toughness: 3,
  keywords: ["Lifelink"],
  tier: "vanilla",
};
export const CATACOMB_CROCODILE: CardDefinition = {
  id: "catacomb-crocodile",
  name: "Catacomb Crocodile",
  scryfallId: "440c53f0-7922-4e14-802d-d7a22f8fed85",
  types: ["Creature"],
  subtypes: ["Crocodile"],
  manaCost: { generic: 4, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 3,
  toughness: 7,
  tier: "vanilla",
};
export const DOUSER_OF_LIGHTS: CardDefinition = {
  id: "douser-of-lights",
  name: "Douser of Lights",
  scryfallId: "7c554be7-6fd4-4642-aaa0-2781d9c388e4",
  types: ["Creature"],
  subtypes: ["Horror"],
  manaCost: { generic: 4, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 4,
  toughness: 5,
  tier: "vanilla",
};
export const LAZOTEP_BEHEMOTH: CardDefinition = {
  id: "lazotep-behemoth",
  name: "Lazotep Behemoth",
  scryfallId: "b4be6f22-e9e8-462a-956b-e1c78bbadacc",
  types: ["Creature"],
  subtypes: ["Zombie", "Hippo"],
  manaCost: { generic: 4, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 5,
  toughness: 4,
  tier: "vanilla",
};
export const NIGHTWING_SHADE: CardDefinition = {
  id: "nightwing-shade",
  name: "Nightwing Shade",
  scryfallId: "a3112a8a-dc80-4099-966c-8fa1807a189b",
  types: ["Creature"],
  subtypes: ["Shade"],
  manaCost: { generic: 4, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 2,
  toughness: 2,
  keywords: ["Flying"],
  activatedAbilities: [{ cost: { mana: { generic: 1, colors: { B: 1 } } }, effect: { kind: "pump", power: 1, toughness: 1 } }],
  tier: "scripted",
};
export const PRIMEVAL_SHAMBLER: CardDefinition = {
  id: "primeval-shambler",
  name: "Primeval Shambler",
  scryfallId: "e45931d2-3fbf-4509-aa41-13d7839578df",
  types: ["Creature"],
  subtypes: ["Horror", "Mercenary"],
  manaCost: { generic: 4, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 3,
  toughness: 3,
  activatedAbilities: [{ cost: { mana: { generic: 0, colors: { B: 1 } } }, effect: { kind: "pump", power: 1, toughness: 1 } }],
  tier: "scripted",
};
export const RENEGADE_DEMON: CardDefinition = {
  id: "renegade-demon",
  name: "Renegade Demon",
  scryfallId: "bbd61cbe-92b8-4141-b11c-04046e35578a",
  types: ["Creature"],
  subtypes: ["Demon"],
  manaCost: { generic: 3, colors: { B: 2 } },
  colorIdentity: ["B"],
  power: 5,
  toughness: 3,
  tier: "vanilla",
};
export const SCROUNGER_OF_SOULS: CardDefinition = {
  id: "scrounger-of-souls",
  name: "Scrounger of Souls",
  scryfallId: "3d66f3c4-5a11-4e28-a4ae-673b3b36d3ec",
  types: ["Creature"],
  subtypes: ["Horror"],
  manaCost: { generic: 4, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 3,
  toughness: 4,
  keywords: ["Lifelink"],
  tier: "vanilla",
};
export const BOGSTOMPER: CardDefinition = {
  id: "bogstomper",
  name: "Bogstomper",
  scryfallId: "ad005eef-d4e4-4f46-81a5-9bbce87014ce",
  types: ["Creature"],
  subtypes: ["Beast"],
  manaCost: { generic: 4, colors: { B: 2 } },
  colorIdentity: ["B"],
  power: 6,
  toughness: 5,
  tier: "vanilla",
};
export const MINOTAUR_ABOMINATION: CardDefinition = {
  id: "minotaur-abomination",
  name: "Minotaur Abomination",
  scryfallId: "9dca75a1-443d-4f8e-b12b-2aada3a8e3e4",
  types: ["Creature"],
  subtypes: ["Zombie", "Minotaur"],
  manaCost: { generic: 4, colors: { B: 2 } },
  colorIdentity: ["B"],
  power: 4,
  toughness: 6,
  tier: "vanilla",
};
export const CROOKSHANK_KOBOLDS: CardDefinition = {
  id: "crookshank-kobolds",
  name: "Crookshank Kobolds",
  scryfallId: "f51d9dde-536b-4314-8de1-2c05a9bf3dbc",
  types: ["Creature"],
  subtypes: ["Kobold"],
  manaCost: { generic: 0, colors: {  } },
  colorIdentity: ["R"],
  power: 0,
  toughness: 1,
  tier: "vanilla",
};
export const BOLD_IMPALER: CardDefinition = {
  id: "bold-impaler",
  name: "Bold Impaler",
  scryfallId: "45bb2e6d-2ead-4ce3-8e5e-fc6900435583",
  types: ["Creature"],
  subtypes: ["Vampire", "Knight"],
  manaCost: { generic: 0, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 1,
  toughness: 2,
  activatedAbilities: [{ cost: { mana: { generic: 2, colors: { R: 1 } } }, effect: { kind: "pump", power: 2, toughness: 0 } }],
  tier: "scripted",
};
export const DWARVEN_TRADER: CardDefinition = {
  id: "dwarven-trader",
  name: "Dwarven Trader",
  scryfallId: "4db9aa47-f42b-41e9-948c-8b012c3809fb",
  types: ["Creature"],
  subtypes: ["Dwarf"],
  manaCost: { generic: 0, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 1,
  toughness: 1,
  tier: "vanilla",
};
export const LAVASTEP_RAIDER: CardDefinition = {
  id: "lavastep-raider",
  name: "Lavastep Raider",
  scryfallId: "2428f13f-c445-4eb4-bab1-309f27cab208",
  types: ["Creature"],
  subtypes: ["Goblin", "Warrior"],
  manaCost: { generic: 0, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 1,
  toughness: 2,
  activatedAbilities: [{ cost: { mana: { generic: 2, colors: { R: 1 } } }, effect: { kind: "pump", power: 2, toughness: 0 } }],
  tier: "scripted",
};
export const MONS_S_GOBLIN_RAIDERS: CardDefinition = {
  id: "monss-goblin-raiders",
  name: "Mons's Goblin Raiders",
  scryfallId: "58b7a22b-f354-4f42-9354-d149bb9b3645",
  types: ["Creature"],
  subtypes: ["Goblin"],
  manaCost: { generic: 0, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 1,
  toughness: 1,
  tier: "vanilla",
};
export const WARSHIP_SCOUT: CardDefinition = {
  id: "warship-scout",
  name: "Warship Scout",
  scryfallId: "b1a95982-be16-465a-9c1b-1f4d875c0c40",
  types: ["Creature"],
  subtypes: ["Human", "Scout"],
  manaCost: { generic: 0, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 2,
  toughness: 1,
  tier: "vanilla",
};
export const WEASELBACK_REDCAP: CardDefinition = {
  id: "weaselback-redcap",
  name: "Weaselback Redcap",
  scryfallId: "33a78207-fd76-4112-a257-54a25da6f818",
  types: ["Creature"],
  subtypes: ["Goblin", "Knight"],
  manaCost: { generic: 0, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 1,
  toughness: 1,
  activatedAbilities: [{ cost: { mana: { generic: 1, colors: { R: 1 } } }, effect: { kind: "pump", power: 2, toughness: 0 } }],
  tier: "scripted",
};
export const DEER_DOG: CardDefinition = {
  id: "deer-dog",
  name: "Deer-Dog",
  scryfallId: "54ec5233-6b27-4655-b68c-4c1aaf64d89b",
  types: ["Creature"],
  subtypes: ["Elk", "Dog"],
  manaCost: { generic: 1, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 1,
  toughness: 3,
  keywords: ["First Strike"],
  tier: "vanilla",
};
export const DEFIANT_KHENRA: CardDefinition = {
  id: "defiant-khenra",
  name: "Defiant Khenra",
  scryfallId: "67e3983d-b1ed-46a9-9ab0-96c4d0d77050",
  types: ["Creature"],
  subtypes: ["Jackal", "Warrior"],
  manaCost: { generic: 1, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 2,
  toughness: 2,
  tier: "vanilla",
};
export const EMBER_EYE_WOLF: CardDefinition = {
  id: "ember-eye-wolf",
  name: "Ember-Eye Wolf",
  scryfallId: "98fe1e1e-b14a-4efe-894b-b9da635f007f",
  types: ["Creature"],
  subtypes: ["Wolf"],
  manaCost: { generic: 1, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 1,
  toughness: 2,
  keywords: ["Haste"],
  activatedAbilities: [{ cost: { mana: { generic: 1, colors: { R: 1 } } }, effect: { kind: "pump", power: 2, toughness: 0 } }],
  tier: "scripted",
};
export const FALKENRATH_REAVER: CardDefinition = {
  id: "falkenrath-reaver",
  name: "Falkenrath Reaver",
  scryfallId: "d7b5913e-a103-4e4a-9281-8b88c1fb746e",
  types: ["Creature"],
  subtypes: ["Vampire"],
  manaCost: { generic: 1, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 2,
  toughness: 2,
  tier: "vanilla",
};
export const FERAL_MAAKA: CardDefinition = {
  id: "feral-maaka",
  name: "Feral Maaka",
  scryfallId: "3c969aa0-b0e5-42cd-abba-0a3c7266142c",
  types: ["Creature"],
  subtypes: ["Cat"],
  manaCost: { generic: 1, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 2,
  toughness: 2,
  tier: "vanilla",
};
export const GOBLIN_BULLY: CardDefinition = {
  id: "goblin-bully",
  name: "Goblin Bully",
  scryfallId: "6f22a45e-7352-4f5b-b298-eca4375ea28c",
  types: ["Creature"],
  subtypes: ["Goblin"],
  manaCost: { generic: 1, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 2,
  toughness: 1,
  tier: "vanilla",
};
export const GOBLIN_STRIKER: CardDefinition = {
  id: "goblin-striker",
  name: "Goblin Striker",
  scryfallId: "f7654d8a-7013-4311-b29e-b55aaa1bf502",
  types: ["Creature"],
  subtypes: ["Goblin", "Berserker"],
  manaCost: { generic: 1, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 1,
  toughness: 1,
  keywords: ["First Strike", "Haste"],
  tier: "vanilla",
};
export const INDEPENDENT_TROOPS: CardDefinition = {
  id: "independent-troops",
  name: "Independent Troops",
  scryfallId: "ff7a4769-7a64-4016-8db0-b56c6b98aff3",
  types: ["Creature"],
  subtypes: ["Human", "Soldier"],
  manaCost: { generic: 1, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 2,
  toughness: 1,
  tier: "vanilla",
};
export const NEST_ROBBER: CardDefinition = {
  id: "nest-robber",
  name: "Nest Robber",
  scryfallId: "576d3845-f45a-4db0-9f7c-845cedb64c49",
  types: ["Creature"],
  subtypes: ["Dinosaur"],
  manaCost: { generic: 1, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 2,
  toughness: 1,
  keywords: ["Haste"],
  tier: "vanilla",
};
export const PYRE_CHARGER: CardDefinition = {
  id: "pyre-charger",
  name: "Pyre Charger",
  scryfallId: "4998ac4f-b461-4ab8-9680-81c396df371a",
  types: ["Creature"],
  subtypes: ["Elemental", "Warrior"],
  manaCost: { generic: 0, colors: { R: 2 } },
  colorIdentity: ["R"],
  power: 1,
  toughness: 1,
  keywords: ["Haste"],
  activatedAbilities: [{ cost: { mana: { generic: 0, colors: { R: 1 } } }, effect: { kind: "pump", power: 1, toughness: 0 } }],
  tier: "scripted",
};
export const SUN_COLLARED_RAPTOR: CardDefinition = {
  id: "sun-collared-raptor",
  name: "Sun-Collared Raptor",
  scryfallId: "62fbd1bc-3e57-43d5-ad54-443ca740fcc4",
  types: ["Creature"],
  subtypes: ["Dinosaur"],
  manaCost: { generic: 1, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 1,
  toughness: 2,
  keywords: ["Trample"],
  activatedAbilities: [{ cost: { mana: { generic: 2, colors: { R: 1 } } }, effect: { kind: "pump", power: 3, toughness: 0 } }],
  tier: "scripted",
};
export const SWAB_GOBLIN: CardDefinition = {
  id: "swab-goblin",
  name: "Swab Goblin",
  scryfallId: "8db11970-74c2-463d-88bb-9f88aa079eaa",
  types: ["Creature"],
  subtypes: ["Goblin", "Pirate"],
  manaCost: { generic: 1, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 2,
  toughness: 2,
  tier: "vanilla",
};
export const WALL_OF_RAZORS: CardDefinition = {
  id: "wall-of-razors",
  name: "Wall of Razors",
  scryfallId: "0bb37bcd-0bbd-4f3f-9623-803885750344",
  types: ["Creature"],
  subtypes: ["Wall"],
  manaCost: { generic: 1, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 4,
  toughness: 1,
  keywords: ["Defender", "First Strike"],
  tier: "vanilla",
};
export const WALL_OF_TORCHES: CardDefinition = {
  id: "wall-of-torches",
  name: "Wall of Torches",
  scryfallId: "76f69b92-7435-4aa8-9d90-89ea078befb1",
  types: ["Creature"],
  subtypes: ["Wall"],
  manaCost: { generic: 1, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 4,
  toughness: 1,
  keywords: ["Defender"],
  tier: "vanilla",
};
export const BIRD_MAIDEN: CardDefinition = {
  id: "bird-maiden",
  name: "Bird Maiden",
  scryfallId: "182c1345-a184-4e01-915e-841821007897",
  types: ["Creature"],
  subtypes: ["Human", "Bird"],
  manaCost: { generic: 2, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 1,
  toughness: 2,
  keywords: ["Flying"],
  tier: "vanilla",
};
export const BLISTERING_BARRIER: CardDefinition = {
  id: "blistering-barrier",
  name: "Blistering Barrier",
  scryfallId: "56d000d8-24e1-4cf3-bed9-e68a89c8f569",
  types: ["Creature"],
  subtypes: ["Wall"],
  manaCost: { generic: 2, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 5,
  toughness: 2,
  keywords: ["Defender"],
  tier: "vanilla",
};
export const BRAZEN_SCOURGE: CardDefinition = {
  id: "brazen-scourge",
  name: "Brazen Scourge",
  scryfallId: "eb84b86c-3276-4fc1-a09d-47de388cb729",
  types: ["Creature"],
  subtypes: ["Gremlin"],
  manaCost: { generic: 1, colors: { R: 2 } },
  colorIdentity: ["R"],
  power: 3,
  toughness: 3,
  keywords: ["Haste"],
  tier: "vanilla",
};
export const BREAKNECK_BERSERKER: CardDefinition = {
  id: "breakneck-berserker",
  name: "Breakneck Berserker",
  scryfallId: "d6eb23c9-6061-4ad1-a8f3-2c791c49f352",
  types: ["Creature"],
  subtypes: ["Dwarf", "Berserker"],
  manaCost: { generic: 2, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 3,
  toughness: 2,
  keywords: ["Haste"],
  tier: "vanilla",
};
export const FIERY_HELLHOUND: CardDefinition = {
  id: "fiery-hellhound",
  name: "Fiery Hellhound",
  scryfallId: "8980efa5-bd21-4980-91a7-5e66528b1011",
  types: ["Creature"],
  subtypes: ["Elemental", "Dog"],
  manaCost: { generic: 1, colors: { R: 2 } },
  colorIdentity: ["R"],
  power: 2,
  toughness: 2,
  activatedAbilities: [{ cost: { mana: { generic: 0, colors: { R: 1 } } }, effect: { kind: "pump", power: 1, toughness: 0 } }],
  tier: "scripted",
};
export const FIRE_NATION_SOLDIER: CardDefinition = {
  id: "fire-nation-soldier",
  name: "Fire Nation Soldier",
  scryfallId: "58e59eba-3cf5-4ebe-8bc1-28568921650b",
  types: ["Creature"],
  subtypes: ["Human", "Soldier"],
  manaCost: { generic: 2, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 3,
  toughness: 2,
  keywords: ["Haste"],
  tier: "vanilla",
};
export const FURNACE_SPIRIT: CardDefinition = {
  id: "furnace-spirit",
  name: "Furnace Spirit",
  scryfallId: "b6a79dc7-ce46-41f7-9375-8d12afe6355a",
  types: ["Creature"],
  subtypes: ["Spirit"],
  manaCost: { generic: 2, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 1,
  toughness: 1,
  keywords: ["Haste"],
  activatedAbilities: [{ cost: { mana: { generic: 0, colors: { R: 1 } } }, effect: { kind: "pump", power: 1, toughness: 0 } }],
  tier: "scripted",
};
export const GOBLIN_CAVALIERS: CardDefinition = {
  id: "goblin-cavaliers",
  name: "Goblin Cavaliers",
  scryfallId: "ca126c9e-1372-486f-afd0-4fd9da56e593",
  types: ["Creature"],
  subtypes: ["Goblin"],
  manaCost: { generic: 2, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 3,
  toughness: 2,
  tier: "vanilla",
};
export const GOBLIN_CHARIOT: CardDefinition = {
  id: "goblin-chariot",
  name: "Goblin Chariot",
  scryfallId: "136a15cb-9591-4521-a142-af766dd7eeef",
  types: ["Creature"],
  subtypes: ["Goblin", "Warrior"],
  manaCost: { generic: 2, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 2,
  toughness: 2,
  keywords: ["Haste"],
  tier: "vanilla",
};
export const GOBLIN_ROUGHRIDER: CardDefinition = {
  id: "goblin-roughrider",
  name: "Goblin Roughrider",
  scryfallId: "9097ec4a-6c0e-4c27-8910-29ac47612031",
  types: ["Creature"],
  subtypes: ["Goblin", "Knight"],
  manaCost: { generic: 2, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 3,
  toughness: 2,
  tier: "vanilla",
};
export const GOBLIN_SKY_RAIDER: CardDefinition = {
  id: "goblin-sky-raider",
  name: "Goblin Sky Raider",
  scryfallId: "ebbd596b-56c2-475c-93e4-c72f9f29281b",
  types: ["Creature"],
  subtypes: ["Goblin", "Warrior"],
  manaCost: { generic: 2, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 1,
  toughness: 2,
  keywords: ["Flying"],
  tier: "vanilla",
};
export const GRANITE_GARGOYLE: CardDefinition = {
  id: "granite-gargoyle",
  name: "Granite Gargoyle",
  scryfallId: "1fa2963d-010f-491c-8ccc-3b4d4bc88398",
  types: ["Creature"],
  subtypes: ["Gargoyle"],
  manaCost: { generic: 2, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 2,
  toughness: 2,
  keywords: ["Flying"],
  activatedAbilities: [{ cost: { mana: { generic: 0, colors: { R: 1 } } }, effect: { kind: "pump", power: 0, toughness: 1 } }],
  tier: "scripted",
};
export const GRAY_OGRE: CardDefinition = {
  id: "gray-ogre",
  name: "Gray Ogre",
  scryfallId: "11bf2cc0-799f-4eb8-b338-ed7543f469e7",
  types: ["Creature"],
  subtypes: ["Ogre"],
  manaCost: { generic: 2, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 2,
  toughness: 2,
  tier: "vanilla",
};
export const MINOTAUR_SURESHOT: CardDefinition = {
  id: "minotaur-sureshot",
  name: "Minotaur Sureshot",
  scryfallId: "cbd65150-a698-4f23-836c-5cd0fb153eb3",
  types: ["Creature"],
  subtypes: ["Minotaur", "Archer"],
  manaCost: { generic: 2, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 2,
  toughness: 3,
  keywords: ["Reach"],
  activatedAbilities: [{ cost: { mana: { generic: 1, colors: { R: 1 } } }, effect: { kind: "pump", power: 1, toughness: 0 } }],
  tier: "scripted",
};
export const MINOTAUR_WARRIOR: CardDefinition = {
  id: "minotaur-warrior",
  name: "Minotaur Warrior",
  scryfallId: "c694f5db-a4ad-4abd-acff-d6b340d2387c",
  types: ["Creature"],
  subtypes: ["Minotaur", "Warrior"],
  manaCost: { generic: 2, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 2,
  toughness: 3,
  tier: "vanilla",
};
export const ONAKKE_OGRE: CardDefinition = {
  id: "onakke-ogre",
  name: "Onakke Ogre",
  scryfallId: "76e42d07-57d9-4de4-8d41-eb42dd1573ed",
  types: ["Creature"],
  subtypes: ["Ogre", "Warrior"],
  manaCost: { generic: 2, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 4,
  toughness: 2,
  tier: "vanilla",
};
export const RAGING_BULL: CardDefinition = {
  id: "raging-bull",
  name: "Raging Bull",
  scryfallId: "ec10a51c-d2c3-4d14-9a71-9e59155bf980",
  types: ["Creature"],
  subtypes: ["Ox"],
  manaCost: { generic: 2, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 2,
  toughness: 2,
  tier: "vanilla",
};
export const REGATHAN_FIRECAT: CardDefinition = {
  id: "regathan-firecat",
  name: "Regathan Firecat",
  scryfallId: "4b4df1dd-886d-4fe7-b3f7-2dca044de41c",
  types: ["Creature"],
  subtypes: ["Elemental", "Cat"],
  manaCost: { generic: 2, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 4,
  toughness: 1,
  tier: "vanilla",
};
export const RIDGELINE_RAGER: CardDefinition = {
  id: "ridgeline-rager",
  name: "Ridgeline Rager",
  scryfallId: "43d9c248-2360-4fdc-9a0f-49d350c11e95",
  types: ["Creature"],
  subtypes: ["Beast"],
  manaCost: { generic: 2, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 1,
  toughness: 2,
  activatedAbilities: [{ cost: { mana: { generic: 0, colors: { R: 1 } } }, effect: { kind: "pump", power: 1, toughness: 0 } }],
  tier: "scripted",
};
export const SABRETOOTH_TIGER: CardDefinition = {
  id: "sabretooth-tiger",
  name: "Sabretooth Tiger",
  scryfallId: "c85964eb-c586-4e62-9a19-6a665e6ad98d",
  types: ["Creature"],
  subtypes: ["Cat"],
  manaCost: { generic: 2, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 2,
  toughness: 1,
  keywords: ["First Strike"],
  tier: "vanilla",
};
export const STORM_SHAMAN: CardDefinition = {
  id: "storm-shaman",
  name: "Storm Shaman",
  scryfallId: "ae941462-9086-47e5-8c04-01e53195584f",
  types: ["Creature"],
  subtypes: ["Human", "Cleric", "Shaman"],
  manaCost: { generic: 2, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 0,
  toughness: 4,
  activatedAbilities: [{ cost: { mana: { generic: 0, colors: { R: 1 } } }, effect: { kind: "pump", power: 1, toughness: 0 } }],
  tier: "scripted",
};
export const TWINSCROLL_SHAMAN: CardDefinition = {
  id: "twinscroll-shaman",
  name: "Twinscroll Shaman",
  scryfallId: "87193af5-4b6b-48d0-9b75-8171bb1d6e53",
  types: ["Creature"],
  subtypes: ["Dwarf", "Shaman"],
  manaCost: { generic: 2, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 1,
  toughness: 2,
  keywords: ["Double Strike"],
  tier: "vanilla",
};
export const VIASHINO_SPEARHUNTER: CardDefinition = {
  id: "viashino-spearhunter",
  name: "Viashino Spearhunter",
  scryfallId: "232226ab-918c-49b6-9f5b-fa0e0a1ba1d3",
  types: ["Creature"],
  subtypes: ["Lizard", "Warrior"],
  manaCost: { generic: 2, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 2,
  toughness: 1,
  keywords: ["First Strike"],
  tier: "vanilla",
};
export const WALL_OF_FIRE: CardDefinition = {
  id: "wall-of-fire",
  name: "Wall of Fire",
  scryfallId: "6f8ac968-3d00-40d8-80b5-e6fe08025de2",
  types: ["Creature"],
  subtypes: ["Wall"],
  manaCost: { generic: 1, colors: { R: 2 } },
  colorIdentity: ["R"],
  power: 0,
  toughness: 5,
  keywords: ["Defender"],
  activatedAbilities: [{ cost: { mana: { generic: 0, colors: { R: 1 } } }, effect: { kind: "pump", power: 1, toughness: 0 } }],
  tier: "scripted",
};
export const WALL_OF_HEAT: CardDefinition = {
  id: "wall-of-heat",
  name: "Wall of Heat",
  scryfallId: "ff6b2307-2c56-4f63-900e-88a3ac6f0b32",
  types: ["Creature"],
  subtypes: ["Wall"],
  manaCost: { generic: 2, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 2,
  toughness: 6,
  keywords: ["Defender"],
  tier: "vanilla",
};
export const WALL_OF_LAVA: CardDefinition = {
  id: "wall-of-lava",
  name: "Wall of Lava",
  scryfallId: "b99d6d11-b3f7-4d73-967c-3049af82a9d8",
  types: ["Creature"],
  subtypes: ["Wall"],
  manaCost: { generic: 1, colors: { R: 2 } },
  colorIdentity: ["R"],
  power: 1,
  toughness: 3,
  keywords: ["Defender"],
  activatedAbilities: [{ cost: { mana: { generic: 0, colors: { R: 1 } } }, effect: { kind: "pump", power: 1, toughness: 1 } }],
  tier: "scripted",
};
export const WALL_OF_STONE: CardDefinition = {
  id: "wall-of-stone",
  name: "Wall of Stone",
  scryfallId: "718da336-ad97-41a6-86bd-4f124e2cc716",
  types: ["Creature"],
  subtypes: ["Wall"],
  manaCost: { generic: 1, colors: { R: 2 } },
  colorIdentity: ["R"],
  power: 0,
  toughness: 8,
  keywords: ["Defender"],
  tier: "vanilla",
};
export const WINDSEEKER_CENTAUR: CardDefinition = {
  id: "windseeker-centaur",
  name: "Windseeker Centaur",
  scryfallId: "1fb92365-1ee7-4240-a20e-8011a8e52846",
  types: ["Creature"],
  subtypes: ["Centaur"],
  manaCost: { generic: 1, colors: { R: 2 } },
  colorIdentity: ["R"],
  power: 2,
  toughness: 2,
  keywords: ["Vigilance"],
  tier: "vanilla",
};
export const ANABA_BODYGUARD: CardDefinition = {
  id: "anaba-bodyguard",
  name: "Anaba Bodyguard",
  scryfallId: "6fdd01bd-ab41-4005-8807-46db0cfc4da4",
  types: ["Creature"],
  subtypes: ["Minotaur"],
  manaCost: { generic: 3, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 2,
  toughness: 3,
  keywords: ["First Strike"],
  tier: "vanilla",
};
export const BORDERLAND_MINOTAUR: CardDefinition = {
  id: "borderland-minotaur",
  name: "Borderland Minotaur",
  scryfallId: "8b8c80ea-7b29-4335-ba7b-3e51a5a104a9",
  types: ["Creature"],
  subtypes: ["Minotaur", "Warrior"],
  manaCost: { generic: 2, colors: { R: 2 } },
  colorIdentity: ["R"],
  power: 4,
  toughness: 3,
  tier: "vanilla",
};
export const CANYON_MINOTAUR: CardDefinition = {
  id: "canyon-minotaur",
  name: "Canyon Minotaur",
  scryfallId: "3469d73e-6de1-4b91-83e3-b1714ac29268",
  types: ["Creature"],
  subtypes: ["Minotaur", "Warrior"],
  manaCost: { generic: 3, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 3,
  toughness: 3,
  tier: "vanilla",
};
export const DESERT_DRAKE: CardDefinition = {
  id: "desert-drake",
  name: "Desert Drake",
  scryfallId: "24673b35-aed2-40c0-a4ae-93bc4d392562",
  types: ["Creature"],
  subtypes: ["Drake"],
  manaCost: { generic: 3, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 2,
  toughness: 2,
  keywords: ["Flying"],
  tier: "vanilla",
};
export const FURNACE_WHELP: CardDefinition = {
  id: "furnace-whelp",
  name: "Furnace Whelp",
  scryfallId: "2ce76e86-39f3-4ebf-b550-88ea7f23a91f",
  types: ["Creature"],
  subtypes: ["Dragon"],
  manaCost: { generic: 2, colors: { R: 2 } },
  colorIdentity: ["R"],
  power: 2,
  toughness: 2,
  keywords: ["Flying"],
  activatedAbilities: [{ cost: { mana: { generic: 0, colors: { R: 1 } } }, effect: { kind: "pump", power: 1, toughness: 0 } }],
  tier: "scripted",
};
export const GOBLIN_BERSERKER: CardDefinition = {
  id: "goblin-berserker",
  name: "Goblin Berserker",
  scryfallId: "a3c7635d-98b2-4505-9153-d7e9e53ea16d",
  types: ["Creature"],
  subtypes: ["Goblin", "Berserker"],
  manaCost: { generic: 3, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 2,
  toughness: 2,
  keywords: ["First Strike", "Haste"],
  tier: "vanilla",
};
export const HALBERDIER: CardDefinition = {
  id: "halberdier",
  name: "Halberdier",
  scryfallId: "b69dfc05-51ba-4798-ac00-1e9b8bbbf280",
  types: ["Creature"],
  subtypes: ["Human", "Barbarian"],
  manaCost: { generic: 3, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 3,
  toughness: 1,
  keywords: ["First Strike"],
  tier: "vanilla",
};
export const HEMATITE_GOLEM: CardDefinition = {
  id: "hematite-golem",
  name: "Hematite Golem",
  scryfallId: "3cf8d47d-6ecb-424a-a908-a6501f308c8e",
  types: ["Artifact", "Creature"],
  subtypes: ["Golem"],
  manaCost: { generic: 4, colors: {  } },
  colorIdentity: ["R"],
  power: 1,
  toughness: 4,
  activatedAbilities: [{ cost: { mana: { generic: 1, colors: { R: 1 } } }, effect: { kind: "pump", power: 2, toughness: 0 } }],
  tier: "scripted",
};
export const HOSTILE_MINOTAUR: CardDefinition = {
  id: "hostile-minotaur",
  name: "Hostile Minotaur",
  scryfallId: "0e1263ea-adc9-442b-b13e-9afb69596372",
  types: ["Creature"],
  subtypes: ["Minotaur"],
  manaCost: { generic: 3, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 3,
  toughness: 3,
  keywords: ["Haste"],
  tier: "vanilla",
};
export const INCURABLE_OGRE: CardDefinition = {
  id: "incurable-ogre",
  name: "Incurable Ogre",
  scryfallId: "5ad3381e-ae2f-40cf-8a7b-62375e9f453e",
  types: ["Creature"],
  subtypes: ["Ogre", "Mutant"],
  manaCost: { generic: 3, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 5,
  toughness: 1,
  tier: "vanilla",
};
export const LAGAC_LIZARD: CardDefinition = {
  id: "lagac-lizard",
  name: "Lagac Lizard",
  scryfallId: "b47e9cfa-5547-4ef3-9e36-8d0f36dfa59a",
  types: ["Creature"],
  subtypes: ["Lizard"],
  manaCost: { generic: 3, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 3,
  toughness: 3,
  tier: "vanilla",
};
export const LIGHTNING_HOUNDS: CardDefinition = {
  id: "lightning-hounds",
  name: "Lightning Hounds",
  scryfallId: "38c82a1d-5db1-4090-b446-cc5bc6dc811d",
  types: ["Creature"],
  subtypes: ["Dog"],
  manaCost: { generic: 2, colors: { R: 2 } },
  colorIdentity: ["R"],
  power: 3,
  toughness: 2,
  keywords: ["First Strike"],
  tier: "vanilla",
};
export const LIZARD_WARRIOR: CardDefinition = {
  id: "lizard-warrior",
  name: "Lizard Warrior",
  scryfallId: "6da5a962-e00c-452f-b9ad-4cf6615c9dcd",
  types: ["Creature"],
  subtypes: ["Lizard", "Warrior"],
  manaCost: { generic: 3, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 4,
  toughness: 2,
  tier: "vanilla",
};
export const NEEDLEPEAK_SPIDER: CardDefinition = {
  id: "needlepeak-spider",
  name: "Needlepeak Spider",
  scryfallId: "00c7d94f-3760-4c97-b0bf-c895f4132c7f",
  types: ["Creature"],
  subtypes: ["Spider"],
  manaCost: { generic: 3, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 4,
  toughness: 2,
  keywords: ["Reach"],
  tier: "vanilla",
};
export const OGRE_RESISTER: CardDefinition = {
  id: "ogre-resister",
  name: "Ogre Resister",
  scryfallId: "60b7407d-f677-403b-893c-361df456009a",
  types: ["Creature"],
  subtypes: ["Ogre"],
  manaCost: { generic: 2, colors: { R: 2 } },
  colorIdentity: ["R"],
  power: 4,
  toughness: 3,
  tier: "vanilla",
};
export const ORAZCA_RAPTOR: CardDefinition = {
  id: "orazca-raptor",
  name: "Orazca Raptor",
  scryfallId: "b7080f86-0a9f-4471-a52b-0d44d19e6e59",
  types: ["Creature"],
  subtypes: ["Dinosaur"],
  manaCost: { generic: 2, colors: { R: 2 } },
  colorIdentity: ["R"],
  power: 3,
  toughness: 4,
  tier: "vanilla",
};
export const ROC_OF_KHER_RIDGES: CardDefinition = {
  id: "roc-of-kher-ridges",
  name: "Roc of Kher Ridges",
  scryfallId: "8cd6f13b-e074-4d3d-a8b0-bd6b1bd72895",
  types: ["Creature"],
  subtypes: ["Bird"],
  manaCost: { generic: 3, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 3,
  toughness: 3,
  keywords: ["Flying"],
  tier: "vanilla",
};
export const RUSSET_WOLVES: CardDefinition = {
  id: "russet-wolves",
  name: "Russet Wolves",
  scryfallId: "b3c7c972-5a11-4709-b3ef-e2acb3b51dd9",
  types: ["Creature"],
  subtypes: ["Wolf"],
  manaCost: { generic: 3, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 3,
  toughness: 3,
  tier: "vanilla",
};
export const SANDSTONE_WARRIOR: CardDefinition = {
  id: "sandstone-warrior",
  name: "Sandstone Warrior",
  scryfallId: "0c8a607b-b79a-4dc5-bbf5-f6de556f1c7d",
  types: ["Creature"],
  subtypes: ["Human", "Soldier", "Warrior"],
  manaCost: { generic: 2, colors: { R: 2 } },
  colorIdentity: ["R"],
  power: 1,
  toughness: 3,
  keywords: ["First Strike"],
  activatedAbilities: [{ cost: { mana: { generic: 0, colors: { R: 1 } } }, effect: { kind: "pump", power: 1, toughness: 0 } }],
  tier: "scripted",
};
export const SKYRAKER_GIANT: CardDefinition = {
  id: "skyraker-giant",
  name: "Skyraker Giant",
  scryfallId: "5e3fbafb-e915-43eb-8a68-245840ba73ff",
  types: ["Creature"],
  subtypes: ["Giant"],
  manaCost: { generic: 2, colors: { R: 2 } },
  colorIdentity: ["R"],
  power: 4,
  toughness: 3,
  keywords: ["Reach"],
  tier: "vanilla",
};
export const SUMMIT_PROWLER: CardDefinition = {
  id: "summit-prowler",
  name: "Summit Prowler",
  scryfallId: "eec9005d-eca8-45a6-b221-9d5a2cfb1e91",
  types: ["Creature"],
  subtypes: ["Yeti"],
  manaCost: { generic: 2, colors: { R: 2 } },
  colorIdentity: ["R"],
  power: 4,
  toughness: 3,
  tier: "vanilla",
};
export const TERROR_OF_THE_FAIRGROUNDS: CardDefinition = {
  id: "terror-of-the-fairgrounds",
  name: "Terror of the Fairgrounds",
  scryfallId: "04623df9-8fa9-44cc-b528-c2c484626d1f",
  types: ["Creature"],
  subtypes: ["Gremlin"],
  manaCost: { generic: 3, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 5,
  toughness: 2,
  tier: "vanilla",
};
export const VIASHINO_RUNNER: CardDefinition = {
  id: "viashino-runner",
  name: "Viashino Runner",
  scryfallId: "8aa862a0-388d-43b8-973f-3a00ebf53952",
  types: ["Creature"],
  subtypes: ["Lizard"],
  manaCost: { generic: 3, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 3,
  toughness: 2,
  keywords: ["Menace"],
  tier: "vanilla",
};
export const WILD_JHOVALL: CardDefinition = {
  id: "wild-jhovall",
  name: "Wild Jhovall",
  scryfallId: "64bcc06a-de86-4387-882d-ead33e9c9e01",
  types: ["Creature"],
  subtypes: ["Cat"],
  manaCost: { generic: 3, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 3,
  toughness: 3,
  tier: "vanilla",
};
export const BONEBREAKER_GIANT: CardDefinition = {
  id: "bonebreaker-giant",
  name: "Bonebreaker Giant",
  scryfallId: "cc17e5c1-a6b4-401b-95eb-1c01cd1da570",
  types: ["Creature"],
  subtypes: ["Giant"],
  manaCost: { generic: 4, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 4,
  toughness: 4,
  tier: "vanilla",
};
export const FLAME_SPIRIT: CardDefinition = {
  id: "flame-spirit",
  name: "Flame Spirit",
  scryfallId: "b9c5ff40-c9ce-44cf-b4e5-a51afe3c5ce6",
  types: ["Creature"],
  subtypes: ["Elemental", "Spirit"],
  manaCost: { generic: 4, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 2,
  toughness: 3,
  activatedAbilities: [{ cost: { mana: { generic: 0, colors: { R: 1 } } }, effect: { kind: "pump", power: 1, toughness: 0 } }],
  tier: "scripted",
};
export const FOMORI_NOMAD: CardDefinition = {
  id: "fomori-nomad",
  name: "Fomori Nomad",
  scryfallId: "cfd3eadb-74bb-423b-923f-a6fc2259e0d7",
  types: ["Creature"],
  subtypes: ["Nomad", "Giant"],
  manaCost: { generic: 4, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 4,
  toughness: 4,
  tier: "vanilla",
};
export const LATHNU_SAILBACK: CardDefinition = {
  id: "lathnu-sailback",
  name: "Lathnu Sailback",
  scryfallId: "33998799-f31b-4522-93b2-0c34c570ebf7",
  types: ["Creature"],
  subtypes: ["Lizard"],
  manaCost: { generic: 4, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 5,
  toughness: 4,
  tier: "vanilla",
};
export const OGRE_BERSERKER: CardDefinition = {
  id: "ogre-berserker",
  name: "Ogre Berserker",
  scryfallId: "b6969d4d-c311-4663-bcd6-77a4d6458335",
  types: ["Creature"],
  subtypes: ["Ogre", "Berserker"],
  manaCost: { generic: 4, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 4,
  toughness: 2,
  keywords: ["Haste"],
  tier: "vanilla",
};
export const REARING_EMBERMARE: CardDefinition = {
  id: "rearing-embermare",
  name: "Rearing Embermare",
  scryfallId: "06dd56bd-de92-4202-af31-7e881c34d799",
  types: ["Creature"],
  subtypes: ["Horse", "Beast"],
  manaCost: { generic: 4, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 4,
  toughness: 5,
  keywords: ["Reach", "Haste"],
  tier: "vanilla",
};
export const SABERTOOTH_WYVERN: CardDefinition = {
  id: "sabertooth-wyvern",
  name: "Sabertooth Wyvern",
  scryfallId: "a196fc8f-e17f-41bb-90df-d74b9c3f59c4",
  types: ["Creature"],
  subtypes: ["Drake"],
  manaCost: { generic: 4, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 3,
  toughness: 2,
  keywords: ["Flying", "First Strike"],
  tier: "vanilla",
};
export const SCORIA_ELEMENTAL: CardDefinition = {
  id: "scoria-elemental",
  name: "Scoria Elemental",
  scryfallId: "ca4d9198-52a7-4dfe-8f7f-4fa6e19a2479",
  types: ["Creature"],
  subtypes: ["Elemental"],
  manaCost: { generic: 4, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 6,
  toughness: 1,
  tier: "vanilla",
};
export const WALL_OF_OPPOSITION: CardDefinition = {
  id: "wall-of-opposition",
  name: "Wall of Opposition",
  scryfallId: "23243752-25c5-407e-9ce4-4bc1f02d01c1",
  types: ["Creature"],
  subtypes: ["Wall"],
  manaCost: { generic: 3, colors: { R: 2 } },
  colorIdentity: ["R"],
  power: 0,
  toughness: 6,
  keywords: ["Defender"],
  activatedAbilities: [{ cost: { mana: { generic: 1, colors: {} } }, effect: { kind: "pump", power: 1, toughness: 0 } }],
  tier: "scripted",
};
export const AXEGRINDER_GIANT: CardDefinition = {
  id: "axegrinder-giant",
  name: "Axegrinder Giant",
  scryfallId: "8595e9a1-010e-48a7-91e4-3d2722c8dbc0",
  types: ["Creature"],
  subtypes: ["Giant", "Warrior"],
  manaCost: { generic: 4, colors: { R: 2 } },
  colorIdentity: ["R"],
  power: 6,
  toughness: 4,
  tier: "vanilla",
};
export const RIPSCALE_PREDATOR: CardDefinition = {
  id: "ripscale-predator",
  name: "Ripscale Predator",
  scryfallId: "41578103-04a3-40eb-80b5-cdb5f2ecc297",
  types: ["Creature"],
  subtypes: ["Dinosaur"],
  manaCost: { generic: 4, colors: { R: 2 } },
  colorIdentity: ["R"],
  power: 6,
  toughness: 5,
  keywords: ["Menace"],
  tier: "vanilla",
};
export const TENEMENT_CRASHER: CardDefinition = {
  id: "tenement-crasher",
  name: "Tenement Crasher",
  scryfallId: "44af9170-bd99-4fde-b673-62d988312b2d",
  types: ["Creature"],
  subtypes: ["Beast"],
  manaCost: { generic: 5, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 5,
  toughness: 4,
  keywords: ["Haste"],
  tier: "vanilla",
};
export const MINOTAUR_AGGRESSOR: CardDefinition = {
  id: "minotaur-aggressor",
  name: "Minotaur Aggressor",
  scryfallId: "e22959dc-8759-454e-80b9-623a799af354",
  types: ["Creature"],
  subtypes: ["Minotaur", "Berserker"],
  manaCost: { generic: 6, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 6,
  toughness: 2,
  keywords: ["First Strike", "Haste"],
  tier: "vanilla",
};
export const TRAINED_ORGG: CardDefinition = {
  id: "trained-orgg",
  name: "Trained Orgg",
  scryfallId: "14a83031-8b57-41d2-b586-bb4dcf16136a",
  types: ["Creature"],
  subtypes: ["Orgg"],
  manaCost: { generic: 6, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 6,
  toughness: 6,
  tier: "vanilla",
};
export const LAY_OF_THE_LAND: CardDefinition = {
  id: "lay-of-the-land",
  name: "Lay of the Land",
  scryfallId: "42018b2d-b8db-4d37-b42f-15ee0d1a22ee",
  types: ["Sorcery"],
  manaCost: { generic: 0, colors: { G: 1 } },
  colorIdentity: ["G"],
  castEffect: { kind: "searchLibrary", cardType: "Land", basicLandOnly: true, destination: "hand" },
  tier: "scripted",
};
export const REGROWTH: CardDefinition = {
  id: "regrowth",
  name: "Regrowth",
  scryfallId: "d771fc5d-b9a1-4637-8241-3f54616b64af",
  types: ["Sorcery"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  castEffect: { kind: "returnFromGraveyard", destination: "hand", target: { kind: "card-in-your-graveyard" } },
  tier: "scripted",
};
export const SHARED_ROOTS: CardDefinition = {
  id: "shared-roots",
  name: "Shared Roots",
  scryfallId: "e7847ba5-e85e-417f-96c0-aef2e6f83994",
  types: ["Sorcery"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  castEffect: { kind: "searchLibrary", cardType: "Land", basicLandOnly: true, destination: "battlefield", tapped: true },
  tier: "scripted",
};
export const SYLVAN_SCRYING: CardDefinition = {
  id: "sylvan-scrying",
  name: "Sylvan Scrying",
  scryfallId: "d1b93087-e6a0-4ba9-83ba-a0ed2e396dc7",
  types: ["Sorcery"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  castEffect: { kind: "searchLibrary", cardType: "Land", destination: "hand" },
  tier: "scripted",
};
export const WILDWOOD_REBIRTH: CardDefinition = {
  id: "wildwood-rebirth",
  name: "Wildwood Rebirth",
  scryfallId: "713a93a1-4442-4d5b-ad7a-136b87b5f7ab",
  types: ["Instant"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  castEffect: { kind: "returnFromGraveyard", destination: "hand", target: { kind: "card-in-your-graveyard", cardType: "Creature" } },
  tier: "scripted",
};
export const NATURAL_CONNECTION: CardDefinition = {
  id: "natural-connection",
  name: "Natural Connection",
  scryfallId: "b8614b00-bf12-464e-8d13-61310e265ccb",
  types: ["Instant"],
  manaCost: { generic: 2, colors: { G: 1 } },
  colorIdentity: ["G"],
  castEffect: { kind: "searchLibrary", cardType: "Land", basicLandOnly: true, destination: "battlefield", tapped: true },
  tier: "scripted",
};
export const RECOLLECT: CardDefinition = {
  id: "recollect",
  name: "Recollect",
  scryfallId: "f127214f-3e91-4988-b593-1568d0ae1718",
  types: ["Sorcery"],
  manaCost: { generic: 2, colors: { G: 1 } },
  colorIdentity: ["G"],
  castEffect: { kind: "returnFromGraveyard", destination: "hand", target: { kind: "card-in-your-graveyard" } },
  tier: "scripted",
};
export const ELVEN_CACHE: CardDefinition = {
  id: "elven-cache",
  name: "Elven Cache",
  scryfallId: "10d3d239-1e16-4a23-9098-ee67d32e0208",
  types: ["Sorcery"],
  manaCost: { generic: 2, colors: { G: 2 } },
  colorIdentity: ["G"],
  castEffect: { kind: "returnFromGraveyard", destination: "hand", target: { kind: "card-in-your-graveyard" } },
  tier: "scripted",
};
export const ALMIGHTY_BRUSHWAGG: CardDefinition = {
  id: "almighty-brushwagg",
  name: "Almighty Brushwagg",
  scryfallId: "71f2b7ac-8742-468d-b6a3-87881cb522ff",
  types: ["Creature"],
  subtypes: ["Brushwagg"],
  manaCost: { generic: 0, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 1,
  toughness: 1,
  keywords: ["Trample"],
  activatedAbilities: [{ cost: { mana: { generic: 3, colors: { G: 1 } } }, effect: { kind: "pump", power: 3, toughness: 3 } }],
  tier: "scripted",
};
export const DRAGON_SNIPER: CardDefinition = {
  id: "dragon-sniper",
  name: "Dragon Sniper",
  scryfallId: "074b1e00-45bb-4436-8f5e-058512b2d08a",
  types: ["Creature"],
  subtypes: ["Human", "Archer"],
  manaCost: { generic: 0, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 1,
  toughness: 1,
  keywords: ["Vigilance", "Reach", "Deathtouch"],
  tier: "vanilla",
};
export const ESSENCE_WARDEN: CardDefinition = {
  id: "essence-warden",
  name: "Essence Warden",
  scryfallId: "31ca84d1-30a6-432b-966c-089fb6652a89",
  types: ["Creature"],
  subtypes: ["Elf", "Shaman"],
  manaCost: { generic: 0, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 1,
  toughness: 1,
  // "Whenever another creature enters, you gain 1 life." The green Soul Warden,
  // word for word, and watches both sides of the table the same way.
  triggeredAbilities: [
    { event: "permanent-enters", watchFor: { type: "Creature" }, watches: "any", effect: { kind: "gainLife", amount: 1 } },
  ],
  tier: "scripted",
};
export const MOSS_VIPER: CardDefinition = {
  id: "moss-viper",
  name: "Moss Viper",
  scryfallId: "a4d35ec4-0e0d-4611-8ad9-39d2c8a2ad6e",
  types: ["Creature"],
  subtypes: ["Snake"],
  manaCost: { generic: 0, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 1,
  toughness: 1,
  keywords: ["Deathtouch"],
  tier: "vanilla",
};
export const SCRYB_SPRITES: CardDefinition = {
  id: "scryb-sprites",
  name: "Scryb Sprites",
  scryfallId: "26f191de-8c59-458c-a1ab-80e2bccdb974",
  types: ["Creature"],
  subtypes: ["Faerie"],
  manaCost: { generic: 0, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 1,
  toughness: 1,
  keywords: ["Flying"],
  tier: "vanilla",
};
export const SEDGE_SCORPION: CardDefinition = {
  id: "sedge-scorpion",
  name: "Sedge Scorpion",
  scryfallId: "9864f811-db2e-4d6d-ad59-a491a790bdd4",
  types: ["Creature"],
  subtypes: ["Scorpion"],
  manaCost: { generic: 0, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 1,
  toughness: 1,
  keywords: ["Deathtouch"],
  tier: "vanilla",
};
export const VIRULENT_EMISSARY: CardDefinition = {
  id: "virulent-emissary",
  name: "Virulent Emissary",
  scryfallId: "0702efed-915e-466a-96bb-ac09af06b21e",
  types: ["Creature"],
  subtypes: ["Elf", "Assassin"],
  manaCost: { generic: 0, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 1,
  toughness: 1,
  keywords: ["Deathtouch"],
  // "Deathtouch / Whenever another creature you control enters, you gain 1 life."
  triggeredAbilities: [{ event: "permanent-enters", watchFor: { type: "Creature" }, effect: { kind: "gainLife", amount: 1 } }],
  tier: "scripted",
};
export const WALL_OF_VINES: CardDefinition = {
  id: "wall-of-vines",
  name: "Wall of Vines",
  scryfallId: "9f7b7563-752b-4391-95d1-f5e3960d35c1",
  types: ["Creature"],
  subtypes: ["Plant", "Wall"],
  manaCost: { generic: 0, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 0,
  toughness: 3,
  keywords: ["Defender", "Reach"],
  tier: "vanilla",
};
export const BASSARA_TOWER_ARCHER: CardDefinition = {
  id: "bassara-tower-archer",
  name: "Bassara Tower Archer",
  scryfallId: "95a1e5c2-7f5b-4ae4-83d9-06e334ba57ea",
  types: ["Creature"],
  subtypes: ["Human", "Archer"],
  manaCost: { generic: 0, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 2,
  toughness: 1,
  keywords: ["Hexproof", "Reach"],
  tier: "vanilla",
};
export const CANOPY_SPIDER: CardDefinition = {
  id: "canopy-spider",
  name: "Canopy Spider",
  scryfallId: "0ae7fabb-dcb6-4c21-87ee-2893b63814be",
  types: ["Creature"],
  subtypes: ["Spider"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 1,
  toughness: 3,
  keywords: ["Reach"],
  tier: "vanilla",
};
export const DEADLY_RECLUSE: CardDefinition = {
  id: "deadly-recluse",
  name: "Deadly Recluse",
  scryfallId: "d432d17e-052b-4a81-bad8-14babf6e593f",
  types: ["Creature"],
  subtypes: ["Spider"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 1,
  toughness: 2,
  keywords: ["Reach", "Deathtouch"],
  tier: "vanilla",
};
export const ELVISH_ARCHERS: CardDefinition = {
  id: "elvish-archers",
  name: "Elvish Archers",
  scryfallId: "0e8411c9-4f6f-4301-ac36-386016a32852",
  types: ["Creature"],
  subtypes: ["Elf", "Archer"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 2,
  toughness: 1,
  keywords: ["First Strike"],
  tier: "vanilla",
};
export const FEIYI_SNAKE: CardDefinition = {
  id: "feiyi-snake",
  name: "Feiyi Snake",
  scryfallId: "0410420a-c093-4540-8867-28d0f2d86b56",
  types: ["Creature"],
  subtypes: ["Snake"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 2,
  toughness: 1,
  keywords: ["Reach"],
  tier: "vanilla",
};
export const FROG_SQUIRRELS: CardDefinition = {
  id: "frog-squirrels",
  name: "Frog-Squirrels",
  scryfallId: "73f4c4b7-5c05-48a5-adb2-ca850df8cd03",
  types: ["Creature"],
  subtypes: ["Frog", "Squirrel"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 2,
  toughness: 2,
  keywords: ["Reach"],
  tier: "vanilla",
};
export const GARRUK_S_COMPANION: CardDefinition = {
  id: "garruks-companion",
  name: "Garruk's Companion",
  scryfallId: "b8d8806c-43c5-4c6c-9420-6210a17ec2b0",
  types: ["Creature"],
  subtypes: ["Beast"],
  manaCost: { generic: 0, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 3,
  toughness: 2,
  keywords: ["Trample"],
  tier: "vanilla",
};
export const GREENWOOD_SENTINEL: CardDefinition = {
  id: "greenwood-sentinel",
  name: "Greenwood Sentinel",
  scryfallId: "e9a1a70d-c146-453e-84c4-71cae4e0afaa",
  types: ["Creature"],
  subtypes: ["Elf", "Scout"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 2,
  toughness: 2,
  keywords: ["Vigilance"],
  tier: "vanilla",
};
export const IRIDESCENT_BLADEMASTER: CardDefinition = {
  id: "iridescent-blademaster",
  name: "Iridescent Blademaster",
  scryfallId: "3fee189f-539f-48fa-b217-4b2599375364",
  types: ["Creature"],
  subtypes: ["Elf", "Warrior"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 2,
  toughness: 2,
  activatedAbilities: [{ cost: { mana: { generic: 3, colors: { G: 1 } } }, effect: { kind: "pump", power: 2, toughness: 2 } }],
  tier: "scripted",
};
export const KRAUL_WARRIOR: CardDefinition = {
  id: "kraul-warrior",
  name: "Kraul Warrior",
  scryfallId: "c6f8e16a-3e90-4be2-bf1a-989c86552251",
  types: ["Creature"],
  subtypes: ["Insect", "Warrior"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 2,
  toughness: 2,
  activatedAbilities: [{ cost: { mana: { generic: 5, colors: { G: 1 } } }, effect: { kind: "pump", power: 3, toughness: 3 } }],
  tier: "scripted",
};
export const DAGGERBACK_BASILISK: CardDefinition = {
  id: "daggerback-basilisk",
  name: "Daggerback Basilisk",
  scryfallId: "7bc8325b-c7a8-49a5-8a54-a419800ffb93",
  types: ["Creature"],
  subtypes: ["Basilisk"],
  manaCost: { generic: 2, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 2,
  toughness: 2,
  keywords: ["Deathtouch"],
  tier: "vanilla",
};
export const FORCE_OF_SAVAGERY: CardDefinition = {
  id: "force-of-savagery",
  name: "Force of Savagery",
  scryfallId: "b344511d-631e-4f1d-9d7d-d7c89a473d1b",
  types: ["Creature"],
  subtypes: ["Elemental"],
  manaCost: { generic: 2, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 8,
  toughness: 0,
  keywords: ["Trample"],
  tier: "vanilla",
};
export const GENEROUS_STRAY: CardDefinition = {
  id: "generous-stray",
  name: "Generous Stray",
  scryfallId: "3289db66-231f-4370-aca6-644d75bee293",
  types: ["Creature"],
  subtypes: ["Cat"],
  manaCost: { generic: 2, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 1,
  toughness: 2,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "draw", amount: 1 } }],
  tier: "scripted",
};
export const GNOTTVOLD_RECLUSE: CardDefinition = {
  id: "gnottvold-recluse",
  name: "Gnottvold Recluse",
  scryfallId: "af46c8c8-5dfa-4ebb-b0b9-cd25d01dd432",
  types: ["Creature"],
  subtypes: ["Spider"],
  manaCost: { generic: 2, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 4,
  toughness: 2,
  keywords: ["Reach"],
  tier: "vanilla",
};
export const HORNET_COBRA: CardDefinition = {
  id: "hornet-cobra",
  name: "Hornet Cobra",
  scryfallId: "27180bad-9bbc-462b-8832-626dc403a3fd",
  types: ["Creature"],
  subtypes: ["Snake"],
  manaCost: { generic: 1, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 2,
  toughness: 1,
  keywords: ["First Strike"],
  tier: "vanilla",
};
export const KRAUL_STINGER: CardDefinition = {
  id: "kraul-stinger",
  name: "Kraul Stinger",
  scryfallId: "46b88fe9-2450-47ee-ac1e-bbbccbf5684f",
  types: ["Creature"],
  subtypes: ["Insect", "Assassin"],
  manaCost: { generic: 2, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 2,
  toughness: 2,
  keywords: ["Deathtouch"],
  tier: "vanilla",
};
export const RIB_CAGE_SPIDER: CardDefinition = {
  id: "rib-cage-spider",
  name: "Rib Cage Spider",
  scryfallId: "d71bebea-1634-4d9a-b3ad-2e01ecacad7e",
  types: ["Creature"],
  subtypes: ["Spider"],
  manaCost: { generic: 2, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 1,
  toughness: 4,
  keywords: ["Reach"],
  tier: "vanilla",
};
export const SYLVAN_BRUSHSTRIDER: CardDefinition = {
  id: "sylvan-brushstrider",
  name: "Sylvan Brushstrider",
  scryfallId: "16482e12-7a8d-4999-8438-da227e6d1305",
  types: ["Creature"],
  subtypes: ["Beast"],
  manaCost: { generic: 2, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 3,
  toughness: 2,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 2 } }],
  tier: "scripted",
};
export const TANGLESPAN_LOOKOUT: CardDefinition = {
  id: "tanglespan-lookout",
  name: "Tanglespan Lookout",
  scryfallId: "3bc5c32d-be0a-4a5f-a8c7-9767a895bc76",
  types: ["Creature"],
  subtypes: ["Satyr"],
  manaCost: { generic: 2, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 2,
  toughness: 3,
  // "Whenever an Aura you control enters, draw a card." It draws nothing on
  // its own arrival, which is what this fixture used to do. There are no Auras
  // in the pool yet, so today it is a plain 2/3 - exactly what the real card is
  // in a deck with no Auras, and it starts working the day one is added.
  triggeredAbilities: [
    {
      event: "permanent-enters",
      watchFor: { subtype: "Aura" },
      effect: { kind: "draw", amount: 1 },
    },
  ],
  tier: "scripted",
};
export const TAOIST_HERMIT: CardDefinition = {
  id: "taoist-hermit",
  name: "Taoist Hermit",
  scryfallId: "d818c231-8d66-4024-91de-fe29f8622902",
  types: ["Creature"],
  subtypes: ["Human", "Mystic"],
  manaCost: { generic: 2, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 2,
  toughness: 2,
  keywords: ["Hexproof"],
  tier: "vanilla",
};
export const WALL_OF_ICE: CardDefinition = {
  id: "wall-of-ice",
  name: "Wall of Ice",
  scryfallId: "d702bd22-6079-4f4c-9540-42cf2a29f4a3",
  types: ["Creature"],
  subtypes: ["Wall"],
  manaCost: { generic: 2, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 0,
  toughness: 7,
  keywords: ["Defender"],
  tier: "vanilla",
};
export const WILDWOOD_PATROL: CardDefinition = {
  id: "wildwood-patrol",
  name: "Wildwood Patrol",
  scryfallId: "0c56ed5b-9a3b-4d2d-a598-7534231143fa",
  types: ["Creature"],
  subtypes: ["Centaur", "Scout"],
  manaCost: { generic: 2, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 4,
  toughness: 2,
  keywords: ["Trample"],
  tier: "vanilla",
};
export const ARCHERS_OF_QARSI: CardDefinition = {
  id: "archers-of-qarsi",
  name: "Archers of Qarsi",
  scryfallId: "0fcf0074-162a-4cc0-9726-8672a0261307",
  types: ["Creature"],
  subtypes: ["Snake", "Archer"],
  manaCost: { generic: 3, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 5,
  toughness: 2,
  keywords: ["Defender", "Reach"],
  tier: "vanilla",
};
export const CARNIVOROUS_PLANT: CardDefinition = {
  id: "carnivorous-plant",
  name: "Carnivorous Plant",
  scryfallId: "afa8023b-1afc-4c05-864e-96f65b0aa140",
  types: ["Creature"],
  subtypes: ["Plant", "Wall"],
  manaCost: { generic: 3, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 4,
  toughness: 5,
  keywords: ["Defender"],
  tier: "vanilla",
};
export const COLOSSADACTYL: CardDefinition = {
  id: "colossadactyl",
  name: "Colossadactyl",
  scryfallId: "8702e776-be2c-48a9-9bc5-bb8ea514333b",
  types: ["Creature"],
  subtypes: ["Dinosaur"],
  manaCost: { generic: 2, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 4,
  toughness: 5,
  keywords: ["Reach", "Trample"],
  tier: "vanilla",
};
export const CONIFER_STRIDER: CardDefinition = {
  id: "conifer-strider",
  name: "Conifer Strider",
  scryfallId: "72f07879-7893-46d9-9239-8d2625355881",
  types: ["Creature"],
  subtypes: ["Elemental"],
  manaCost: { generic: 3, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 5,
  toughness: 1,
  keywords: ["Hexproof"],
  tier: "vanilla",
};
export const GIANT_MANTIS: CardDefinition = {
  id: "giant-mantis",
  name: "Giant Mantis",
  scryfallId: "98518e4a-d1d0-4e41-bae7-242c779f06a1",
  types: ["Creature"],
  subtypes: ["Insect"],
  manaCost: { generic: 3, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 2,
  toughness: 4,
  keywords: ["Reach"],
  tier: "vanilla",
};
export const GRAZING_WHIPTAIL: CardDefinition = {
  id: "grazing-whiptail",
  name: "Grazing Whiptail",
  scryfallId: "b7e16e48-25f0-4099-9892-09586561ebc3",
  types: ["Creature"],
  subtypes: ["Dinosaur"],
  manaCost: { generic: 2, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 3,
  toughness: 4,
  keywords: ["Reach"],
  tier: "vanilla",
};
export const KESSIG_RECLUSE: CardDefinition = {
  id: "kessig-recluse",
  name: "Kessig Recluse",
  scryfallId: "695b8abe-796e-4d9b-aad3-4e03e925d2a7",
  types: ["Creature"],
  subtypes: ["Spider"],
  manaCost: { generic: 2, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 2,
  toughness: 3,
  keywords: ["Reach", "Deathtouch"],
  tier: "vanilla",
};
export const PRIMAL_HUNTBEAST: CardDefinition = {
  id: "primal-huntbeast",
  name: "Primal Huntbeast",
  scryfallId: "56e027ec-430f-4c7d-9794-a431efa3693f",
  types: ["Creature"],
  subtypes: ["Beast"],
  manaCost: { generic: 3, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 3,
  toughness: 3,
  keywords: ["Hexproof"],
  tier: "vanilla",
};
export const SHAMAN_OF_SPRING: CardDefinition = {
  id: "shaman-of-spring",
  name: "Shaman of Spring",
  scryfallId: "8e974df6-d78a-43ea-ada5-17c53fcca97b",
  types: ["Creature"],
  subtypes: ["Elf", "Shaman"],
  manaCost: { generic: 3, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 2,
  toughness: 2,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "draw", amount: 1 } }],
  tier: "scripted",
};
export const SPIKED_BALOTH: CardDefinition = {
  id: "spiked-baloth",
  name: "Spiked Baloth",
  scryfallId: "522777b1-a89f-4969-a962-0137018ec86c",
  types: ["Creature"],
  subtypes: ["Beast"],
  manaCost: { generic: 3, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 4,
  toughness: 2,
  keywords: ["Trample"],
  tier: "vanilla",
};
export const STRIPED_BEARS: CardDefinition = {
  id: "striped-bears",
  name: "Striped Bears",
  scryfallId: "0bf54365-56ae-485d-b931-784a4cf9d8f2",
  types: ["Creature"],
  subtypes: ["Bear"],
  manaCost: { generic: 3, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 2,
  toughness: 2,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "draw", amount: 1 } }],
  tier: "scripted",
};
export const TOWERING_INDRIK: CardDefinition = {
  id: "towering-indrik",
  name: "Towering Indrik",
  scryfallId: "c6049e92-6c52-44be-a3c7-aa8e8bf9c10a",
  types: ["Creature"],
  subtypes: ["Beast"],
  manaCost: { generic: 3, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 2,
  toughness: 4,
  keywords: ["Reach"],
  tier: "vanilla",
};
export const WARRIORS_OF_WAKANDA: CardDefinition = {
  id: "warriors-of-wakanda",
  name: "Warriors of Wakanda",
  scryfallId: "c8a5b28b-ff0d-4680-81cd-0d61e0e55e8e",
  types: ["Creature"],
  subtypes: ["Human", "Warrior"],
  manaCost: { generic: 3, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 4,
  toughness: 4,
  keywords: ["Trample"],
  tier: "vanilla",
};
export const ARBORBACK_STOMPER: CardDefinition = {
  id: "arborback-stomper",
  name: "Arborback Stomper",
  scryfallId: "788b9d55-6679-4fcc-a3af-11d31e477421",
  types: ["Creature"],
  subtypes: ["Beast"],
  manaCost: { generic: 3, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 5,
  toughness: 4,
  keywords: ["Trample"],
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 5 } }],
  tier: "scripted",
};
export const BLANCHWOOD_TREEFOLK: CardDefinition = {
  id: "blanchwood-treefolk",
  name: "Blanchwood Treefolk",
  scryfallId: "f824502c-d712-41af-ba44-33e8294c3735",
  types: ["Creature"],
  subtypes: ["Treefolk"],
  manaCost: { generic: 4, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 4,
  toughness: 5,
  tier: "vanilla",
};
export const DURKWOOD_BOARS: CardDefinition = {
  id: "durkwood-boars",
  name: "Durkwood Boars",
  scryfallId: "3741510d-a210-432c-a95b-a147689df995",
  types: ["Creature"],
  subtypes: ["Boar"],
  manaCost: { generic: 4, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 4,
  toughness: 4,
  tier: "vanilla",
};
export const ELFHAME_WURM: CardDefinition = {
  id: "elfhame-wurm",
  name: "Elfhame Wurm",
  scryfallId: "ef2dc99b-083d-473e-b352-e8264353e85b",
  types: ["Creature"],
  subtypes: ["Wurm"],
  manaCost: { generic: 4, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 5,
  toughness: 4,
  keywords: ["Vigilance", "Trample"],
  tier: "vanilla",
};
export const FERAL_KRUSHOK: CardDefinition = {
  id: "feral-krushok",
  name: "Feral Krushok",
  scryfallId: "5041996b-c265-4c4f-a52c-dfe29b2e282d",
  types: ["Creature"],
  subtypes: ["Beast"],
  manaCost: { generic: 4, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 5,
  toughness: 4,
  tier: "vanilla",
};
export const GARRUK_S_GOREHORN: CardDefinition = {
  id: "garruks-gorehorn",
  name: "Garruk's Gorehorn",
  scryfallId: "3928bbce-87b7-4b28-9af4-20362935c909",
  types: ["Creature"],
  subtypes: ["Beast"],
  manaCost: { generic: 4, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 7,
  toughness: 3,
  tier: "vanilla",
};
export const GREATER_BASILISK: CardDefinition = {
  id: "greater-basilisk",
  name: "Greater Basilisk",
  scryfallId: "886e40d7-5677-493d-9ea4-205f50d2aefe",
  types: ["Creature"],
  subtypes: ["Basilisk"],
  manaCost: { generic: 3, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 3,
  toughness: 5,
  keywords: ["Deathtouch"],
  tier: "vanilla",
};
export const GRIZZLED_OUTRIDER: CardDefinition = {
  id: "grizzled-outrider",
  name: "Grizzled Outrider",
  scryfallId: "4a1d4473-5317-4bdd-9cb9-93670acf52e9",
  types: ["Creature"],
  subtypes: ["Elf", "Warrior"],
  manaCost: { generic: 4, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 5,
  toughness: 5,
  tier: "vanilla",
};
export const HOLLOWHENGE_BEAST: CardDefinition = {
  id: "hollowhenge-beast",
  name: "Hollowhenge Beast",
  scryfallId: "052ab91f-ac01-43f4-9276-9af35dbfbf71",
  types: ["Creature"],
  subtypes: ["Beast"],
  manaCost: { generic: 3, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 5,
  toughness: 5,
  tier: "vanilla",
};
export const KAVU_CLIMBER: CardDefinition = {
  id: "kavu-climber",
  name: "Kavu Climber",
  scryfallId: "da95f41d-ad5a-4861-94e2-a564dbf4f3c9",
  types: ["Creature"],
  subtypes: ["Kavu"],
  manaCost: { generic: 3, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 3,
  toughness: 3,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "draw", amount: 1 } }],
  tier: "scripted",
};
export const MAMMOTH_SPIDER: CardDefinition = {
  id: "mammoth-spider",
  name: "Mammoth Spider",
  scryfallId: "1ee9bca2-1195-4bd0-aa5c-16b3726a8ff2",
  types: ["Creature"],
  subtypes: ["Spider"],
  manaCost: { generic: 4, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 3,
  toughness: 5,
  keywords: ["Reach"],
  tier: "vanilla",
};
export const MOSS_MONSTER: CardDefinition = {
  id: "moss-monster",
  name: "Moss Monster",
  scryfallId: "15511fda-92ae-4d27-8a83-37e821ec3adf",
  types: ["Creature"],
  subtypes: ["Elemental"],
  manaCost: { generic: 3, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 3,
  toughness: 6,
  tier: "vanilla",
};
export const PANTHER_WARRIORS: CardDefinition = {
  id: "panther-warriors",
  name: "Panther Warriors",
  scryfallId: "ba165e25-5328-40f4-b87c-9d02590f9d38",
  types: ["Creature"],
  subtypes: ["Cat", "Warrior"],
  manaCost: { generic: 4, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 6,
  toughness: 3,
  tier: "vanilla",
};
export const PLATED_SPIDER: CardDefinition = {
  id: "plated-spider",
  name: "Plated Spider",
  scryfallId: "3529f49b-7e5e-4fa8-a03d-a94877761525",
  types: ["Creature"],
  subtypes: ["Spider"],
  manaCost: { generic: 4, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 4,
  toughness: 4,
  keywords: ["Reach"],
  tier: "vanilla",
};
export const PLATED_WURM: CardDefinition = {
  id: "plated-wurm",
  name: "Plated Wurm",
  scryfallId: "b51f8724-8f26-4a9d-b586-4223354ae7fc",
  types: ["Creature"],
  subtypes: ["Wurm"],
  manaCost: { generic: 4, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 4,
  toughness: 5,
  tier: "vanilla",
};
export const RHOX_ORACLE: CardDefinition = {
  id: "rhox-oracle",
  name: "Rhox Oracle",
  scryfallId: "281f04d5-af45-4494-ac11-a605d3a06643",
  types: ["Creature"],
  subtypes: ["Rhino", "Monk"],
  manaCost: { generic: 4, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 4,
  toughness: 2,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "draw", amount: 1 } }],
  tier: "scripted",
};
export const RUBBLEBACK_RHINO: CardDefinition = {
  id: "rubbleback-rhino",
  name: "Rubbleback Rhino",
  scryfallId: "51daaf9b-d8a8-49a6-94e1-0c8be2c6188b",
  types: ["Creature"],
  subtypes: ["Rhino"],
  manaCost: { generic: 4, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 3,
  toughness: 4,
  keywords: ["Hexproof"],
  tier: "vanilla",
};
export const SENTINEL_SPIDER: CardDefinition = {
  id: "sentinel-spider",
  name: "Sentinel Spider",
  scryfallId: "01e7af76-e505-49ca-a91e-8167027560ff",
  types: ["Creature"],
  subtypes: ["Spider"],
  manaCost: { generic: 3, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 4,
  toughness: 4,
  keywords: ["Vigilance", "Reach"],
  tier: "vanilla",
};
export const SPINED_WURM: CardDefinition = {
  id: "spined-wurm",
  name: "Spined Wurm",
  scryfallId: "0de97b4e-42c7-47e5-a523-a47eadd068f7",
  types: ["Creature"],
  subtypes: ["Wurm"],
  manaCost: { generic: 4, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 5,
  toughness: 4,
  tier: "vanilla",
};
export const STOMPER_CUB: CardDefinition = {
  id: "stomper-cub",
  name: "Stomper Cub",
  scryfallId: "89be64a8-dd78-48c3-bb47-4f2a5ad9ec10",
  types: ["Creature"],
  subtypes: ["Beast"],
  manaCost: { generic: 3, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 5,
  toughness: 3,
  keywords: ["Trample"],
  tier: "vanilla",
};
export const THORNHIDE_WOLVES: CardDefinition = {
  id: "thornhide-wolves",
  name: "Thornhide Wolves",
  scryfallId: "fc0f3812-bb6c-4d99-b505-9dfd84e3fd95",
  types: ["Creature"],
  subtypes: ["Wolf"],
  manaCost: { generic: 4, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 4,
  toughness: 5,
  tier: "vanilla",
};
export const TURNTIMBER_ASCETIC: CardDefinition = {
  id: "turntimber-ascetic",
  name: "Turntimber Ascetic",
  scryfallId: "b33b6922-2584-43e1-98d4-e722e7c9393c",
  types: ["Creature"],
  subtypes: ["Giant", "Cleric"],
  manaCost: { generic: 4, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 5,
  toughness: 4,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 3 } }],
  tier: "scripted",
};
export const WARDSCALE_CROCODILE: CardDefinition = {
  id: "wardscale-crocodile",
  name: "Wardscale Crocodile",
  scryfallId: "aa5341b9-06e4-4360-a75d-f405d468276e",
  types: ["Creature"],
  subtypes: ["Crocodile"],
  manaCost: { generic: 4, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 5,
  toughness: 3,
  keywords: ["Hexproof"],
  tier: "vanilla",
};
export const BARBTOOTH_WURM: CardDefinition = {
  id: "barbtooth-wurm",
  name: "Barbtooth Wurm",
  scryfallId: "e85fbc25-412a-4367-8209-258ff638dcc6",
  types: ["Creature"],
  subtypes: ["Wurm"],
  manaCost: { generic: 5, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 6,
  toughness: 4,
  tier: "vanilla",
};
export const CANOPY_GORGER: CardDefinition = {
  id: "canopy-gorger",
  name: "Canopy Gorger",
  scryfallId: "cbc8957d-769c-4630-9544-56cea8c847c2",
  types: ["Creature"],
  subtypes: ["Wurm"],
  manaCost: { generic: 4, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 6,
  toughness: 5,
  tier: "vanilla",
};
export const COLOSSAL_DREADMAW: CardDefinition = {
  id: "colossal-dreadmaw",
  name: "Colossal Dreadmaw",
  scryfallId: "8059c52b-5d25-4052-b48a-e9e219a7a546",
  types: ["Creature"],
  subtypes: ["Dinosaur"],
  manaCost: { generic: 4, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 6,
  toughness: 6,
  keywords: ["Trample"],
  tier: "vanilla",
};
export const GIANT_WARTHOG: CardDefinition = {
  id: "giant-warthog",
  name: "Giant Warthog",
  scryfallId: "c402ef0e-51e7-4da6-a434-b99c5d435698",
  types: ["Creature"],
  subtypes: ["Boar", "Beast"],
  manaCost: { generic: 5, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 5,
  toughness: 5,
  keywords: ["Trample"],
  tier: "vanilla",
};
export const HILL_GIANT_HERDGORGER: CardDefinition = {
  id: "hill-giant-herdgorger",
  name: "Hill Giant Herdgorger",
  scryfallId: "b69315cc-c230-4704-9d66-411f624f3e49",
  types: ["Creature"],
  subtypes: ["Giant"],
  manaCost: { generic: 4, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 7,
  toughness: 6,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 3 } }],
  tier: "scripted",
};
export const KINDERCATCH: CardDefinition = {
  id: "kindercatch",
  name: "Kindercatch",
  scryfallId: "4954e8a3-e72b-4f28-8762-2b1c658c31b6",
  types: ["Creature"],
  subtypes: ["Spirit"],
  manaCost: { generic: 3, colors: { G: 3 } },
  colorIdentity: ["G"],
  power: 6,
  toughness: 6,
  tier: "vanilla",
};
export const NEEDLESHOT_GOURNA: CardDefinition = {
  id: "needleshot-gourna",
  name: "Needleshot Gourna",
  scryfallId: "f9b1628d-aacd-4e19-9ebb-bcd9b2842c91",
  types: ["Creature"],
  subtypes: ["Beast"],
  manaCost: { generic: 4, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 3,
  toughness: 6,
  keywords: ["Reach"],
  tier: "vanilla",
};
export const PRIMORDIAL_WURM: CardDefinition = {
  id: "primordial-wurm",
  name: "Primordial Wurm",
  scryfallId: "fc0e8298-adac-4922-8824-a1fafa089f72",
  types: ["Creature"],
  subtypes: ["Wurm"],
  manaCost: { generic: 4, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 7,
  toughness: 6,
  tier: "vanilla",
};
export const QUAKESTRIDER_CERATOPS: CardDefinition = {
  id: "quakestrider-ceratops",
  name: "Quakestrider Ceratops",
  scryfallId: "067f72c2-ead6-4879-bc9d-696c9f87c0b2",
  types: ["Creature"],
  subtypes: ["Dinosaur"],
  manaCost: { generic: 3, colors: { G: 3 } },
  colorIdentity: ["G"],
  power: 12,
  toughness: 8,
  tier: "vanilla",
};
export const SCALED_BEHEMOTH: CardDefinition = {
  id: "scaled-behemoth",
  name: "Scaled Behemoth",
  scryfallId: "017ef6eb-7a2b-4730-bf21-a2289d4c07ad",
  types: ["Creature"],
  subtypes: ["Crocodile"],
  manaCost: { generic: 4, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 6,
  toughness: 7,
  keywords: ["Hexproof"],
  tier: "vanilla",
};
export const TUSKED_COLOSSODON: CardDefinition = {
  id: "tusked-colossodon",
  name: "Tusked Colossodon",
  scryfallId: "2d511407-0c1e-4342-a578-ca557c6886fd",
  types: ["Creature"],
  subtypes: ["Beast"],
  manaCost: { generic: 4, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 6,
  toughness: 5,
  tier: "vanilla",
};
export const VORSTCLAW: CardDefinition = {
  id: "vorstclaw",
  name: "Vorstclaw",
  scryfallId: "79719ed0-468d-4946-8dfc-fb7e2b2e305e",
  types: ["Creature"],
  subtypes: ["Elemental", "Horror"],
  manaCost: { generic: 4, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 7,
  toughness: 7,
  tier: "vanilla",
};
export const VULPINE_GOLIATH: CardDefinition = {
  id: "vulpine-goliath",
  name: "Vulpine Goliath",
  scryfallId: "cdacb147-35ce-4751-961e-576b5f958048",
  types: ["Creature"],
  subtypes: ["Fox"],
  manaCost: { generic: 4, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 6,
  toughness: 5,
  keywords: ["Trample"],
  tier: "vanilla",
};
export const ARCHWEAVER: CardDefinition = {
  id: "archweaver",
  name: "Archweaver",
  scryfallId: "f99dc8ff-932c-4d56-9253-99ce9e145306",
  types: ["Creature"],
  subtypes: ["Spider"],
  manaCost: { generic: 5, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 5,
  toughness: 5,
  keywords: ["Reach", "Trample"],
  tier: "vanilla",
};
export const DUSKDALE_WURM: CardDefinition = {
  id: "duskdale-wurm",
  name: "Duskdale Wurm",
  scryfallId: "f6879321-9a61-4c4f-9513-81ad5684c99e",
  types: ["Creature"],
  subtypes: ["Wurm"],
  manaCost: { generic: 5, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 7,
  toughness: 7,
  keywords: ["Trample"],
  tier: "vanilla",
};
export const ENORMOUS_BALOTH: CardDefinition = {
  id: "enormous-baloth",
  name: "Enormous Baloth",
  scryfallId: "54069e65-eef4-4fb8-bb0d-932a4c9889b3",
  types: ["Creature"],
  subtypes: ["Beast"],
  manaCost: { generic: 6, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 7,
  toughness: 7,
  tier: "vanilla",
};
export const OAKGNARL_WARRIOR: CardDefinition = {
  id: "oakgnarl-warrior",
  name: "Oakgnarl Warrior",
  scryfallId: "7ee2eb87-d70e-49d7-b429-5df70a71c143",
  types: ["Creature"],
  subtypes: ["Treefolk", "Warrior"],
  manaCost: { generic: 5, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 5,
  toughness: 7,
  keywords: ["Vigilance", "Trample"],
  tier: "vanilla",
};
export const PLATED_SLAGWURM: CardDefinition = {
  id: "plated-slagwurm",
  name: "Plated Slagwurm",
  scryfallId: "941fa83a-cb61-47b1-83a7-7ce7e894c338",
  types: ["Creature"],
  subtypes: ["Wurm"],
  manaCost: { generic: 4, colors: { G: 3 } },
  colorIdentity: ["G"],
  power: 8,
  toughness: 8,
  keywords: ["Hexproof"],
  tier: "vanilla",
};
export const ROOTBREAKER_WURM: CardDefinition = {
  id: "rootbreaker-wurm",
  name: "Rootbreaker Wurm",
  scryfallId: "a6ef7a7b-7d6d-4ee2-a961-482c66276f09",
  types: ["Creature"],
  subtypes: ["Wurm"],
  manaCost: { generic: 5, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 6,
  toughness: 6,
  keywords: ["Trample"],
  tier: "vanilla",
};
export const WHIPTAIL_WURM: CardDefinition = {
  id: "whiptail-wurm",
  name: "Whiptail Wurm",
  scryfallId: "34a420d8-7e03-40a3-8132-10a566e12eb0",
  types: ["Creature"],
  subtypes: ["Wurm"],
  manaCost: { generic: 6, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 8,
  toughness: 5,
  tier: "vanilla",
};
export const COPPER_HOST_CRUSHER: CardDefinition = {
  id: "copper-host-crusher",
  name: "Copper Host Crusher",
  scryfallId: "af527344-9d88-4641-8f6d-0263a6797df3",
  types: ["Creature"],
  subtypes: ["Phyrexian", "Bear", "Rhino"],
  manaCost: { generic: 6, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 8,
  toughness: 8,
  keywords: ["Trample", "Hexproof"],
  tier: "vanilla",
};
export const GOLIATH_SPIDER: CardDefinition = {
  id: "goliath-spider",
  name: "Goliath Spider",
  scryfallId: "cecc53b1-942e-4b44-bf93-dd2d8cc92d6d",
  types: ["Creature"],
  subtypes: ["Spider"],
  manaCost: { generic: 6, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 7,
  toughness: 6,
  keywords: ["Reach"],
  tier: "vanilla",
};

/* ---- Permanent destruction and "can't be countered", generated from Scryfall ---- */

export const DEMYSTIFY: CardDefinition = {
  id: "demystify",
  name: "Demystify",
  scryfallId: "e3979b88-ac58-420a-8c03-37ea5d93d0f1",
  types: ["Instant"],
  manaCost: { generic: 0, colors: { W: 1 } },
  colorIdentity: ["W"],
  castEffect: { kind: "destroy", target: { kind: "permanent", cardTypes: ["Enchantment"] } },
  tier: "scripted",
};

export const QUIET_PURITY: CardDefinition = {
  id: "quiet-purity",
  name: "Quiet Purity",
  scryfallId: "ecd4d7cd-12a9-49f2-912d-2a6024112d13",
  types: ["Instant"],
  manaCost: { generic: 0, colors: { W: 1 } },
  colorIdentity: ["W"],
  castEffect: { kind: "destroy", target: { kind: "permanent", cardTypes: ["Enchantment"] } },
  tier: "scripted",
};

export const LAST_WORD: CardDefinition = {
  id: "last-word",
  name: "Last Word",
  scryfallId: "139d2ece-f656-4cac-8d77-b0f083f76c70",
  types: ["Instant"],
  manaCost: { generic: 2, colors: { U: 2 } },
  colorIdentity: ["U"],
  castEffect: { kind: "counter", target: { kind: "spell" } },
  cantBeCountered: true,
  tier: "scripted",
};

export const SINKHOLE: CardDefinition = {
  id: "sinkhole",
  name: "Sinkhole",
  scryfallId: "a084d0fb-8db2-4873-a2f9-e6e5fecdd38c",
  types: ["Sorcery"],
  manaCost: { generic: 0, colors: { B: 2 } },
  colorIdentity: ["B"],
  castEffect: { kind: "destroy", target: { kind: "permanent", cardTypes: ["Land"] } },
  tier: "scripted",
};

export const RAIN_OF_TEARS: CardDefinition = {
  id: "rain-of-tears",
  name: "Rain of Tears",
  scryfallId: "5811f4ee-f352-4b41-8f56-da0cb7f3f11b",
  types: ["Sorcery"],
  manaCost: { generic: 1, colors: { B: 2 } },
  colorIdentity: ["B"],
  castEffect: { kind: "destroy", target: { kind: "permanent", cardTypes: ["Land"] } },
  tier: "scripted",
};

export const SMELT: CardDefinition = {
  id: "smelt",
  name: "Smelt",
  scryfallId: "9a13293d-89a7-400c-8309-9f62eeb4769c",
  types: ["Instant"],
  manaCost: { generic: 0, colors: { R: 1 } },
  colorIdentity: ["R"],
  castEffect: { kind: "destroy", target: { kind: "permanent", cardTypes: ["Artifact"] } },
  tier: "scripted",
};

export const SHATTER: CardDefinition = {
  id: "shatter",
  name: "Shatter",
  scryfallId: "929a41f7-f52d-4190-a80c-5ceb3e368a31",
  types: ["Instant"],
  manaCost: { generic: 1, colors: { R: 1 } },
  colorIdentity: ["R"],
  castEffect: { kind: "destroy", target: { kind: "permanent", cardTypes: ["Artifact"] } },
  tier: "scripted",
};

export const STONE_RAIN: CardDefinition = {
  id: "stone-rain",
  name: "Stone Rain",
  scryfallId: "d2334c10-fa96-4f8e-8187-c7ecc00cbac8",
  types: ["Sorcery"],
  manaCost: { generic: 2, colors: { R: 1 } },
  colorIdentity: ["R"],
  castEffect: { kind: "destroy", target: { kind: "permanent", cardTypes: ["Land"] } },
  tier: "scripted",
};

export const CRATERIZE: CardDefinition = {
  id: "craterize",
  name: "Craterize",
  scryfallId: "e5459409-5103-4a97-a6fb-3e3ab896eb66",
  types: ["Sorcery"],
  manaCost: { generic: 3, colors: { R: 1 } },
  colorIdentity: ["R"],
  castEffect: { kind: "destroy", target: { kind: "permanent", cardTypes: ["Land"] } },
  tier: "scripted",
};

export const VOLCANIC_UPHEAVAL: CardDefinition = {
  id: "volcanic-upheaval",
  name: "Volcanic Upheaval",
  scryfallId: "8d90bd68-0521-4db3-b590-a4e007da9f2e",
  types: ["Instant"],
  manaCost: { generic: 3, colors: { R: 1 } },
  colorIdentity: ["R"],
  castEffect: { kind: "destroy", target: { kind: "permanent", cardTypes: ["Land"] } },
  tier: "scripted",
};

export const INESCAPABLE_BLAZE: CardDefinition = {
  id: "inescapable-blaze",
  name: "Inescapable Blaze",
  scryfallId: "46651efd-0906-4350-a1b8-52e3f8aff45d",
  types: ["Instant"],
  manaCost: { generic: 4, colors: { R: 2 } },
  colorIdentity: ["R"],
  castEffect: { kind: "damage", amount: 6, target: { kind: "any-target" } },
  cantBeCountered: true,
  tier: "scripted",
};

export const ICE_STORM: CardDefinition = {
  id: "ice-storm",
  name: "Ice Storm",
  scryfallId: "68cc9670-6faf-41c3-b111-358c46d8812d",
  types: ["Sorcery"],
  manaCost: { generic: 2, colors: { G: 1 } },
  colorIdentity: ["G"],
  castEffect: { kind: "destroy", target: { kind: "permanent", cardTypes: ["Land"] } },
  tier: "scripted",
};

export const VERDIGRIS: CardDefinition = {
  id: "verdigris",
  name: "Verdigris",
  scryfallId: "683c74be-ba8a-4c6b-b637-ce22f98a7cda",
  types: ["Instant"],
  manaCost: { generic: 2, colors: { G: 1 } },
  colorIdentity: ["G"],
  castEffect: { kind: "destroy", target: { kind: "permanent", cardTypes: ["Artifact"] } },
  tier: "scripted",
};

export const WINTER_S_GRASP: CardDefinition = {
  id: "winters-grasp",
  name: "Winter's Grasp",
  scryfallId: "7af28a5d-45dc-4e31-9009-5c0bd25a9032",
  types: ["Sorcery"],
  manaCost: { generic: 1, colors: { G: 2 } },
  colorIdentity: ["G"],
  castEffect: { kind: "destroy", target: { kind: "permanent", cardTypes: ["Land"] } },
  tier: "scripted",
};

export const CARNAGE_TYRANT: CardDefinition = {
  id: "carnage-tyrant",
  name: "Carnage Tyrant",
  scryfallId: "3bd78731-949c-464a-826a-92f86d784911",
  types: ["Creature"],
  subtypes: ["Dinosaur"],
  manaCost: { generic: 4, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 7,
  toughness: 6,
  keywords: ["Trample", "Hexproof"],
  cantBeCountered: true,
  tier: "scripted",
};

export const TERRA_STOMPER: CardDefinition = {
  id: "terra-stomper",
  name: "Terra Stomper",
  scryfallId: "652db782-cf79-4626-9eb2-ad214cb39c86",
  types: ["Creature"],
  subtypes: ["Beast"],
  manaCost: { generic: 3, colors: { G: 3 } },
  colorIdentity: ["G"],
  power: 8,
  toughness: 8,
  keywords: ["Trample"],
  cantBeCountered: true,
  tier: "scripted",
};


/* ---------------------------------------------------------------------------
 * Lands and mana rocks (2026-08-07)
 *
 * The first cards of either type in the pool beyond the five basics. Generated
 * by `gen_fixtures.py --lands BG` and `--artifacts BG`, which learned to emit
 * noncreature permanents on the same day; every one of these is a card the
 * effect DSL holds exactly, tapped-ness and all.
 *
 * Duals here come in two shapes and both are honest. Bayou and Woodland Chasm
 * carry basic land types and get their mana from those - their printed text is
 * nothing but reminder text in brackets. Golgari Guildgate and the rest say
 * "{T}: Add {B} or {G}" out loud, which is written as two separate abilities,
 * because that is what the engine's activatedAbilities array already is.
 *
 * The conditional taplands of the format - Woodland Cemetery, Deathcap Glade,
 * Overgrown Tomb - are deliberately absent. "Enters tapped unless you control
 * two or more other lands" written as flatly tapped is a worse card than the
 * one printed, and this pool does not carry cards that are quietly wrong.
 * ------------------------------------------------------------------------- */

export const ADVENTURER_S_INN: CardDefinition = {
  id: "adventurers-inn",
  name: "Adventurer's Inn",
  scryfallId: "f0da2ee1-986e-4cbf-92eb-d96fdb572ca5",
  types: ["Land"],
  subtypes: ["Town"],
  colorIdentity: [],
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 2 } }],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 1 } }],
  tier: "scripted",
};

export const BAYOU: CardDefinition = {
  id: "bayou",
  name: "Bayou",
  scryfallId: "bd7567df-b4d8-41a8-8eac-c05afa784bfe",
  types: ["Land"],
  subtypes: ["Swamp", "Forest"],
  colorIdentity: ["B", "G"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "vanilla",
};

export const FOUL_ORCHARD: CardDefinition = {
  id: "foul-orchard",
  name: "Foul Orchard",
  scryfallId: "1e1bad7b-e102-4dff-b79a-fd755c2b6d49",
  types: ["Land"],
  colorIdentity: ["B", "G"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "vanilla",
};

export const GOHN_TOWN_OF_RUIN: CardDefinition = {
  id: "gohn-town-of-ruin",
  name: "Gohn, Town of Ruin",
  scryfallId: "99582781-613e-4a33-aec7-7569b4a961aa",
  types: ["Land"],
  subtypes: ["Town"],
  colorIdentity: ["B", "G"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "vanilla",
};

export const GOLGARI_GUILDGATE: CardDefinition = {
  id: "golgari-guildgate",
  name: "Golgari Guildgate",
  scryfallId: "92d4646c-a375-4835-aa58-8bb77d1a5abf",
  types: ["Land"],
  subtypes: ["Gate"],
  colorIdentity: ["B", "G"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "vanilla",
};

export const HAUNTED_MIRE: CardDefinition = {
  id: "haunted-mire",
  name: "Haunted Mire",
  scryfallId: "3e041aef-5771-4a3f-af07-e85a66c48979",
  types: ["Land"],
  subtypes: ["Swamp", "Forest"],
  colorIdentity: ["B", "G"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "vanilla",
};

export const ILLEGITIMATE_BUSINESS: CardDefinition = {
  id: "illegitimate-business",
  name: "Illegitimate Business",
  scryfallId: "71597acf-1ce6-46a8-b6c0-88755c8a377c",
  types: ["Land"],
  colorIdentity: ["B", "G"],
  entersTapped: true,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 1 } }],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "scripted",
};

export const JUNGLE_HOLLOW: CardDefinition = {
  id: "jungle-hollow",
  name: "Jungle Hollow",
  scryfallId: "ea13440b-3f7b-4182-9541-27c1fa3121e5",
  types: ["Land"],
  colorIdentity: ["B", "G"],
  entersTapped: true,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 1 } }],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "scripted",
};

export const RADIANT_FOUNTAIN: CardDefinition = {
  id: "radiant-fountain",
  name: "Radiant Fountain",
  scryfallId: "7ee5e77f-ca43-480d-ac37-48336d3bf044",
  types: ["Land"],
  colorIdentity: [],
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 2 } }],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 1 } }],
  tier: "scripted",
};

export const SNOW_COVERED_FOREST: CardDefinition = {
  id: "snow-covered-forest",
  name: "Snow-Covered Forest",
  scryfallId: "ca17acea-f079-4e53-8176-a2f5c5c408a1",
  types: ["Land"],
  subtypes: ["Forest"],
  supertypes: ["Basic", "Snow"],
  colorIdentity: ["G"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "vanilla",
};

export const SNOW_COVERED_SWAMP: CardDefinition = {
  id: "snow-covered-swamp",
  name: "Snow-Covered Swamp",
  scryfallId: "6aa85af8-15f5-4620-8aea-0b45c28372ed",
  types: ["Land"],
  subtypes: ["Swamp"],
  supertypes: ["Basic", "Snow"],
  colorIdentity: ["B"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }],
  tier: "vanilla",
};

export const SNOW_COVERED_WASTES: CardDefinition = {
  id: "snow-covered-wastes",
  name: "Snow-Covered Wastes",
  scryfallId: "87870792-e429-4eba-8193-cdce5c7b6c55",
  types: ["Land"],
  supertypes: ["Basic", "Snow"],
  colorIdentity: [],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 1 } }],
  tier: "vanilla",
};

export const SUBTERRANEAN_CAVERN: CardDefinition = {
  id: "subterranean-cavern",
  name: "Subterranean Cavern",
  scryfallId: "038bf500-e23a-4d38-9312-db1909e20353",
  types: ["Land"],
  colorIdentity: ["B", "G"],
  entersTapped: true,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "gainLife", amount: 1 } }],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "scripted",
};

export const TREE_OF_TALES: CardDefinition = {
  id: "tree-of-tales",
  name: "Tree of Tales",
  scryfallId: "3b3134b3-1bad-4b41-9e56-700125ff31fa",
  types: ["Land", "Artifact"],
  colorIdentity: ["G"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "vanilla",
};

export const VAULT_OF_WHISPERS: CardDefinition = {
  id: "vault-of-whispers",
  name: "Vault of Whispers",
  scryfallId: "e85e4098-f872-4aa4-a71a-208b6090be28",
  types: ["Land", "Artifact"],
  colorIdentity: ["B"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }],
  tier: "vanilla",
};

export const WASTES: CardDefinition = {
  id: "wastes",
  name: "Wastes",
  scryfallId: "baf8f4f2-9f25-4cd2-8d78-1041e134aeac",
  types: ["Land"],
  supertypes: ["Basic"],
  colorIdentity: [],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 1 } }],
  tier: "vanilla",
};

export const WOODLAND_CHASM: CardDefinition = {
  id: "woodland-chasm",
  name: "Woodland Chasm",
  scryfallId: "b2dd0b71-5a60-418c-82fc-f13d1b5075d0",
  types: ["Land"],
  subtypes: ["Swamp", "Forest"],
  supertypes: ["Snow"],
  colorIdentity: ["B", "G"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "vanilla",
};

export const SOL_RING: CardDefinition = {
  id: "sol-ring",
  name: "Sol Ring",
  scryfallId: "91fdb56b-54d5-4272-8319-505ff987fe9b",
  types: ["Artifact"],
  manaCost: { generic: 1, colors: {} },
  colorIdentity: [],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 2 } }],
  tier: "vanilla",
};

export const CHARCOAL_DIAMOND: CardDefinition = {
  id: "charcoal-diamond",
  name: "Charcoal Diamond",
  scryfallId: "f0475c79-bc7f-4de8-a020-226bc658d303",
  types: ["Artifact"],
  manaCost: { generic: 2, colors: {} },
  colorIdentity: ["B"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }],
  tier: "vanilla",
};

export const MOSS_DIAMOND: CardDefinition = {
  id: "moss-diamond",
  name: "Moss Diamond",
  scryfallId: "96fcae3a-d58c-4832-8280-3f65b5dfd853",
  types: ["Artifact"],
  manaCost: { generic: 2, colors: {} },
  colorIdentity: ["G"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "vanilla",
};

export const WORN_POWERSTONE: CardDefinition = {
  id: "worn-powerstone",
  name: "Worn Powerstone",
  scryfallId: "ace686ad-9e3f-41b3-b8eb-d1b6d45eb4e1",
  types: ["Artifact"],
  manaCost: { generic: 3, colors: {} },
  colorIdentity: [],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 2 } }],
  tier: "vanilla",
};

export const SISAY_S_RING: CardDefinition = {
  id: "sisays-ring",
  name: "Sisay's Ring",
  scryfallId: "20c0e608-0208-408a-b473-1e54caa96cea",
  types: ["Artifact"],
  manaCost: { generic: 4, colors: {} },
  colorIdentity: [],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 2 } }],
  tier: "vanilla",
};

export const THRAN_DYNAMO: CardDefinition = {
  id: "thran-dynamo",
  name: "Thran Dynamo",
  scryfallId: "7ce5f12e-fc02-42f8-a5ca-b523050d4650",
  types: ["Artifact"],
  manaCost: { generic: 4, colors: {} },
  colorIdentity: [],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 3 } }],
  tier: "vanilla",
};

export const UR_GOLEM_S_EYE: CardDefinition = {
  id: "ur-golems-eye",
  name: "Ur-Golem's Eye",
  scryfallId: "7a2ea921-8ef9-4a31-b484-73375e828d34",
  types: ["Artifact"],
  manaCost: { generic: 4, colors: {} },
  colorIdentity: [],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 2 } }],
  tier: "vanilla",
};


/* ---------------------------------------------------------------------------
 * Fetchlands, and sacrificing for value (2026-08-07)
 *
 * Step 2 of the Blech list. Two new activated-ability costs carry all of it:
 * `payLife` and `sacrificeSelf`, both paid on activation rather than on
 * resolution - which is the whole trick of a fetchland. It is in the graveyard
 * before its search ever resolves, and the ability still finds the land,
 * because an ability is independent of its source once it is on the stack.
 *
 * The find is by land *type*, not by "basic land": a fetch can take Bayou, and
 * writing it as basics-only would be a materially weaker card than the one
 * printed.
 * ------------------------------------------------------------------------- */

export const BLOODSTAINED_MIRE: CardDefinition = {
  id: "bloodstained-mire",
  name: "Bloodstained Mire",
  scryfallId: "579743fe-f71e-4cb2-8629-d6b02ed1591d",
  types: ["Land"],
  colorIdentity: [],
  activatedAbilities: [{ cost: { tap: true, payLife: 1, sacrificeSelf: true }, effect: { kind: "searchLibrary", cardType: "Land", subtypes: ["Swamp", "Mountain"], destination: "battlefield" } }],
  tier: "vanilla",
};

export const MARSH_FLATS: CardDefinition = {
  id: "marsh-flats",
  name: "Marsh Flats",
  scryfallId: "9db3ba6d-eb7f-4f5b-9a3b-c6239c3baa42",
  types: ["Land"],
  colorIdentity: [],
  activatedAbilities: [{ cost: { tap: true, payLife: 1, sacrificeSelf: true }, effect: { kind: "searchLibrary", cardType: "Land", subtypes: ["Plains", "Swamp"], destination: "battlefield" } }],
  tier: "vanilla",
};

export const POLLUTED_DELTA: CardDefinition = {
  id: "polluted-delta",
  name: "Polluted Delta",
  scryfallId: "6e288374-2b71-4ace-b1d2-a19fee6cb4af",
  types: ["Land"],
  colorIdentity: [],
  activatedAbilities: [{ cost: { tap: true, payLife: 1, sacrificeSelf: true }, effect: { kind: "searchLibrary", cardType: "Land", subtypes: ["Island", "Swamp"], destination: "battlefield" } }],
  tier: "vanilla",
};

export const VERDANT_CATACOMBS: CardDefinition = {
  id: "verdant-catacombs",
  name: "Verdant Catacombs",
  scryfallId: "94c229ea-90da-4aa0-bfda-b162fb3b5b8b",
  types: ["Land"],
  colorIdentity: [],
  activatedAbilities: [{ cost: { tap: true, payLife: 1, sacrificeSelf: true }, effect: { kind: "searchLibrary", cardType: "Land", subtypes: ["Swamp", "Forest"], destination: "battlefield" } }],
  tier: "vanilla",
};

export const WINDSWEPT_HEATH: CardDefinition = {
  id: "windswept-heath",
  name: "Windswept Heath",
  scryfallId: "bd1d13f7-fd38-4f0b-a8e0-1eac78668117",
  types: ["Land"],
  colorIdentity: [],
  activatedAbilities: [{ cost: { tap: true, payLife: 1, sacrificeSelf: true }, effect: { kind: "searchLibrary", cardType: "Land", subtypes: ["Forest", "Plains"], destination: "battlefield" } }],
  tier: "vanilla",
};

export const WOODED_FOOTHILLS: CardDefinition = {
  id: "wooded-foothills",
  name: "Wooded Foothills",
  scryfallId: "4e11ea8a-f895-438d-a3b7-f070238e4161",
  types: ["Land"],
  colorIdentity: [],
  activatedAbilities: [{ cost: { tap: true, payLife: 1, sacrificeSelf: true }, effect: { kind: "searchLibrary", cardType: "Land", subtypes: ["Mountain", "Forest"], destination: "battlefield" } }],
  tier: "vanilla",
};

export const SAKURA_TRIBE_ELDER: CardDefinition = {
  id: "sakura-tribe-elder",
  name: "Sakura-Tribe Elder",
  scryfallId: "7a8b1c49-8594-426d-b585-41140235bb0e",
  types: ["Creature"],
  subtypes: ["Snake", "Shaman"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 1,
  toughness: 1,
  activatedAbilities: [{ cost: { sacrificeSelf: true }, effect: { kind: "searchLibrary", cardType: "Land", basicLandOnly: true, destination: "battlefield", tapped: true } }],
  tier: "scripted",
};

export const BOGWATER_LUMARET: CardDefinition = {
  id: "bogwater-lumaret",
  name: "Bogwater Lumaret",
  scryfallId: "7a42f51a-3377-47bb-b6fb-c0515bf1dcfb",
  types: ["Creature"],
  subtypes: ["Spirit", "Frog"],
  manaCost: { generic: 0, colors: { B: 1, G: 1 } },
  colorIdentity: ["B", "G"],
  power: 2,
  toughness: 2,
  triggeredAbilities: [{ event: "permanent-enters", watches: "controller", includesSelf: true, watchFor: { type: "Creature" }, effect: { kind: "gainLife", amount: 1 } }],
  tier: "scripted",
};


/* ---------------------------------------------------------------------------
 * Mana of any colour (2026-08-07)
 *
 * A choice of five colours, written as five abilities - which is what
 * `activatedAbilities` already is, so no new engine concept was needed. Command
 * Tower is the same shape with `requiresCommanderIdentity` on each half, and
 * the engine refuses the ones the commander's colours do not allow. Without
 * that a Command Tower in a Golgari deck taps for white, which is not the card.
 * ------------------------------------------------------------------------- */

export const BIRDS_OF_PARADISE: CardDefinition = {
  id: "birds-of-paradise",
  name: "Birds of Paradise",
  scryfallId: "492c2f9a-51e7-4e0f-9899-23bf43ea988b",
  types: ["Creature"],
  subtypes: ["Bird"],
  manaCost: { generic: 0, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 0,
  toughness: 1,
  keywords: ["Flying"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "scripted",
};

export const COMMAND_TOWER: CardDefinition = {
  id: "command-tower",
  name: "Command Tower",
  scryfallId: "0548fb60-c843-4f8f-a029-6f10efc63a41",
  types: ["Land"],
  colorIdentity: [],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 }, colorFrom: "commander-identity" }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 }, colorFrom: "commander-identity" }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 }, colorFrom: "commander-identity" }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 }, colorFrom: "commander-identity" }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 }, colorFrom: "commander-identity" }],
  tier: "vanilla",
};


/* ---------------------------------------------------------------------------
 * Conditional taplands, and "whenever you gain life" (2026-08-07)
 *
 * The taplands enter tapped *unless* something is true, which is the whole
 * drawback the card is priced around - writing one as flatly tapped makes it
 * strictly worse than the printed card, which is why these three were refused
 * until the condition existed.
 *
 * Blech and Pest Mascot are the deck's engine. Note Blech says "each Pest, Bat,
 * Insect, Snake, and Spider you control" with no "other", and Blech is a Pest,
 * so it counts itself - hence `includesSelf`.
 * ------------------------------------------------------------------------- */

export const DEATHCAP_GLADE: CardDefinition = {
  id: "deathcap-glade",
  name: "Deathcap Glade",
  scryfallId: "78897104-80e1-4d8a-9958-145b40f679e8",
  types: ["Land"],
  colorIdentity: ["B", "G"],
  entersTapped: true,
  entersTappedUnless: { kind: "controls-other-lands", count: 2 },
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "vanilla",
};

export const UNDERGROWTH_STADIUM: CardDefinition = {
  id: "undergrowth-stadium",
  name: "Undergrowth Stadium",
  scryfallId: "f25aa8aa-e2f7-4634-8a96-2082e76c6503",
  types: ["Land"],
  colorIdentity: ["B", "G"],
  entersTapped: true,
  entersTappedUnless: { kind: "opponents", count: 2 },
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "vanilla",
};

export const WOODLAND_CEMETERY: CardDefinition = {
  id: "woodland-cemetery",
  name: "Woodland Cemetery",
  scryfallId: "4d6f6c96-f813-4864-b4e1-b2a0aa8be1e8",
  types: ["Land"],
  colorIdentity: ["B", "G"],
  entersTapped: true,
  entersTappedUnless: { kind: "controls-subtype", subtypes: ["Swamp", "Forest"] },
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "vanilla",
};

export const PEST_MASCOT: CardDefinition = {
  id: "pest-mascot",
  name: "Pest Mascot",
  scryfallId: "d882beb9-6766-4818-afbb-f6fd7a2d5b70",
  types: ["Creature"],
  subtypes: ["Pest", "Ape"],
  manaCost: { generic: 1, colors: { B: 1, G: 1 } },
  colorIdentity: ["B", "G"],
  power: 2,
  toughness: 3,
  keywords: ["Trample"],
  triggeredAbilities: [{ event: "gain-life", effect: { kind: "addCounter", amount: 1 } }],
  tier: "scripted",
};

export const BLECH_LOAFING_PEST: CardDefinition = {
  id: "blech-loafing-pest",
  name: "Blech, Loafing Pest",
  scryfallId: "f588fa50-7cc5-41ba-90df-2d252eb5c785",
  types: ["Creature"],
  subtypes: ["Pest"],
  supertypes: ["Legendary"],
  manaCost: { generic: 1, colors: { B: 1, G: 1 } },
  colorIdentity: ["B", "G"],
  power: 3,
  toughness: 4,
  triggeredAbilities: [{ event: "gain-life", effect: { kind: "addCounterToEachOther", amount: 1, subtypes: ["Pest", "Bat", "Insect", "Snake", "Spider"], includesSelf: true } }],
  canBeCommander: true,
  tier: "scripted",
};

export const ELVES_OF_DEEP_SHADOW: CardDefinition = {
  id: "elves-of-deep-shadow",
  name: "Elves of Deep Shadow",
  scryfallId: "6040ba5e-7042-4095-9000-89bcb8ce1ea6",
  types: ["Creature"],
  subtypes: ["Elf", "Druid"],
  manaCost: { generic: 0, colors: { G: 1 } },
  colorIdentity: ["B", "G"],
  power: 1,
  toughness: 1,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 }, damageToController: 1 }],
  tier: "scripted",
};

export const LLANOWAR_WASTES: CardDefinition = {
  id: "llanowar-wastes",
  name: "Llanowar Wastes",
  scryfallId: "266316d3-3bbc-4283-aab8-69629855909f",
  types: ["Land"],
  colorIdentity: ["B", "G"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 }, damageToController: 1 }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 }, damageToController: 1 }],
  tier: "vanilla",
};

export const TAINTED_WOOD: CardDefinition = {
  id: "tainted-wood",
  name: "Tainted Wood",
  scryfallId: "3da7ab6b-b10a-4786-b1eb-92de7e66690e",
  types: ["Land"],
  colorIdentity: ["B", "G"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 }, activateOnlyIf: { kind: "controls-subtype", subtypes: ["Swamp"] } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 }, activateOnlyIf: { kind: "controls-subtype", subtypes: ["Swamp"] } }],
  tier: "vanilla",
};

export const WASTEWOOD_VERGE: CardDefinition = {
  id: "wastewood-verge",
  name: "Wastewood Verge",
  scryfallId: "5ceacc7d-d407-4f82-af58-9bdf8426924e",
  types: ["Land"],
  colorIdentity: ["B", "G"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 }, activateOnlyIf: { kind: "controls-subtype", subtypes: ["Swamp", "Forest"] } }],
  tier: "vanilla",
};

export const TWILIGHT_MIRE: CardDefinition = {
  id: "twilight-mire",
  name: "Twilight Mire",
  scryfallId: "3cc8186b-b46f-46c0-8dfb-9e423e430048",
  types: ["Land"],
  colorIdentity: ["B", "G"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 1 } }, { cost: { tap: true, mana: { generic: 0, colors: {}, hybrid: [["B", "G"]] } }, effect: { kind: "addManaCombination", mana: [{ color: "B", amount: 2 }] } }, { cost: { tap: true, mana: { generic: 0, colors: {}, hybrid: [["B", "G"]] } }, effect: { kind: "addManaCombination", mana: [{ color: "B", amount: 1 }, { color: "G", amount: 1 }] } }, { cost: { tap: true, mana: { generic: 0, colors: {}, hybrid: [["B", "G"]] } }, effect: { kind: "addManaCombination", mana: [{ color: "G", amount: 2 }] } }],
  tier: "vanilla",
};

export const SWARMYARD: CardDefinition = {
  id: "swarmyard",
  name: "Swarmyard",
  scryfallId: "b89329f2-d386-40a7-9098-6d80beeb8843",
  types: ["Land"],
  colorIdentity: [],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 1 } }, { cost: { tap: true }, effect: { kind: "regenerate", target: { kind: "creature", subtypes: ["Insect", "Rat", "Spider", "Squirrel"] } } }],
  tier: "vanilla",
};

export const SAPSEEP_FOREST: CardDefinition = {
  id: "sapseep-forest",
  name: "Sapseep Forest",
  scryfallId: "81d3099d-4f22-425c-8955-903b6cfb88d3",
  types: ["Land"],
  subtypes: ["Forest"],
  colorIdentity: ["G"],
  entersTapped: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }, { cost: { tap: true, mana: { generic: 0, colors: { G: 1 } } }, effect: { kind: "gainLife", amount: 1 }, activateOnlyIf: { kind: "controls-color", color: "G", count: 2 } }],
  tier: "vanilla",
};

export const EXOTIC_ORCHARD: CardDefinition = {
  id: "exotic-orchard",
  name: "Exotic Orchard",
  scryfallId: "8853ff94-bf44-4cfd-9d3a-0743c361fb0d",
  types: ["Land"],
  colorIdentity: [],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 }, colorFrom: "opponent-lands" }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 }, colorFrom: "opponent-lands" }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 }, colorFrom: "opponent-lands" }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 }, colorFrom: "opponent-lands" }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 }, colorFrom: "opponent-lands" }],
  tier: "vanilla",
};

export const DELIGHTED_HALFLING: CardDefinition = {
  id: "delighted-halfling",
  name: "Delighted Halfling",
  scryfallId: "9158f904-bf34-4cc0-9a6c-34893da29f22",
  types: ["Creature"],
  subtypes: ["Halfling", "Citizen"],
  manaCost: { generic: 0, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 1,
  toughness: 2,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 }, producesRestrictedMana: { kind: "legendary-spell", grantsUncounterable: true } }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 }, producesRestrictedMana: { kind: "legendary-spell", grantsUncounterable: true } }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 }, producesRestrictedMana: { kind: "legendary-spell", grantsUncounterable: true } }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 }, producesRestrictedMana: { kind: "legendary-spell", grantsUncounterable: true } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 }, producesRestrictedMana: { kind: "legendary-spell", grantsUncounterable: true } }],
  tier: "scripted",
};


/*
 * Triggers that are not about something entering the battlefield.
 *
 * Every one of these was blocked by the generator, not by the engine: attacks
 * triggers, landfall, life gain and card draw had all worked for weeks, and
 * gen_fixtures.py simply had no pattern pairing them up. Shopkeeper's Bane is
 * the clearest case - "whenever this creature attacks, you gain 2 life" needed
 * nothing built at all.
 *
 * The genuinely new shapes are the death watcher (Meltstrider Eulogist), the
 * turn-based trigger with an intervening-if (Deathreap Ritual), and "you may"
 * (Lifegift, Deathreap Ritual), which stops the game and asks rather than
 * taking the upside on your behalf.
 */

export const DEATHREAP_RITUAL: CardDefinition = {
  id: "deathreap-ritual",
  name: "Deathreap Ritual",
  scryfallId: "4980879b-87a4-4e5a-9f29-9136f022d849",
  types: ["Enchantment"],
  manaCost: { generic: 2, colors: { B: 1, G: 1 } },
  colorIdentity: ["B", "G"],
  triggeredAbilities: [{ event: "end-step", watches: "any", onlyIf: { kind: "creature-died-this-turn" }, optional: true, effect: { kind: "draw", amount: 1 } }],
  tier: "scripted",
};

export const EUMIDIAN_TERRABOTANIST: CardDefinition = {
  id: "eumidian-terrabotanist",
  name: "Eumidian Terrabotanist",
  scryfallId: "64fb2981-86ed-478a-89cd-c6bb078a5bc7",
  types: ["Creature"],
  subtypes: ["Insect", "Druid"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 2,
  toughness: 3,
  triggeredAbilities: [{ event: "landfall", watches: "controller", effect: { kind: "gainLife", amount: 1 } }],
  tier: "scripted",
};

export const LIFEGIFT: CardDefinition = {
  id: "lifegift",
  name: "Lifegift",
  scryfallId: "27eaba1c-3137-4419-bf90-eb287a7c736e",
  types: ["Enchantment"],
  manaCost: { generic: 2, colors: { G: 1 } },
  colorIdentity: ["G"],
  triggeredAbilities: [{ event: "landfall", watches: "any", optional: true, effect: { kind: "gainLife", amount: 1 } }],
  tier: "scripted",
};

export const MELTSTRIDER_EULOGIST: CardDefinition = {
  id: "meltstrider-eulogist",
  name: "Meltstrider Eulogist",
  scryfallId: "df61aa0c-effc-4d57-be19-876a82c41d33",
  types: ["Creature"],
  subtypes: ["Insect", "Soldier"],
  manaCost: { generic: 2, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 3,
  toughness: 3,
  triggeredAbilities: [{ event: "permanent-dies", watches: "controller", includesSelf: true, watchFor: { type: "Creature", withCounter: true }, effect: { kind: "draw", amount: 1 } }],
  tier: "scripted",
};

export const SHOPKEEPERS_BANE: CardDefinition = {
  id: "shopkeepers-bane",
  name: "Shopkeeper's Bane",
  scryfallId: "97f7fbb9-228c-4a74-975b-38d3b6cecb32",
  types: ["Creature"],
  subtypes: ["Badger", "Pest"],
  manaCost: { generic: 2, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 4,
  toughness: 2,
  keywords: ["Trample"],
  triggeredAbilities: [{ event: "attacks", effect: { kind: "gainLife", amount: 2 } }],
  tier: "scripted",
};


/*
 * Sacrifice, which turned out to be half-built already.
 *
 * Paying a sacrifice as an activation cost has worked since the fetchlands
 * (`sacrificeSelf`), so Haywire Mite was never blocked by sacrifice at all - it
 * was blocked by a target selector that could only name one card type and could
 * not exclude creatures. Haywire Mite is itself an Artifact Creature, and
 * "noncreature artifact" is what stops it exiling itself.
 *
 * Riveteers Overlook is the other half: sacrifice as an *effect*, with nothing
 * paid for it, and three things happening in one resolution across a library
 * search that stops the game to ask.
 */

export const HAYWIRE_MITE: CardDefinition = {
  id: "haywire-mite",
  name: "Haywire Mite",
  scryfallId: "6f813bc3-6d81-4555-8e4b-6ecd9a6757b7",
  types: ["Artifact", "Creature"],
  subtypes: ["Insect"],
  manaCost: { generic: 1, colors: {  } },
  colorIdentity: ["G"],
  power: 1,
  toughness: 1,
  triggeredAbilities: [{ event: "dies", effect: { kind: "gainLife", amount: 2 } }],
  activatedAbilities: [{ cost: { mana: { generic: 0, colors: { G: 1 } }, sacrificeSelf: true }, effect: { kind: "exile", target: { kind: "permanent", cardTypes: ["Artifact", "Enchantment"], noncreature: true } } }],
  tier: "scripted",
};

export const RIVETEERS_OVERLOOK: CardDefinition = {
  id: "riveteers-overlook",
  name: "Riveteers Overlook",
  scryfallId: "65ce9590-87c0-4057-bddb-fadc0de552f6",
  types: ["Land"],
  colorIdentity: [],
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "sequence", effects: [{ kind: "sacrifice", what: "self" }, { kind: "searchLibrary", cardType: "Land", basicLandOnly: true, subtypes: ["Swamp", "Mountain", "Forest"], destination: "battlefield", tapped: true }, { kind: "gainLife", amount: 1 }] } }],
  tier: "scripted",
};


/*
 * Tokens, and the two cards that needed one minted.
 *
 * `createToken` has worked since the Saproling and Soldier were hand-written
 * months ago. What was missing was never the effect - it was a *definition* to
 * point it at, because every token in existence had been typed out by hand. The
 * generator now reads the noun phrase a card prints ("four 1/1 green Insect
 * creature tokens with flying and deathtouch") and writes the definition down.
 *
 * A token id spells out everything about it - colour, stats, subtype, keywords -
 * so two cards making "a 1/1 green Insect" and "a 1/1 green Insect with flying"
 * can never collapse into one definition.
 */

export const TOKEN_G_11_INSECT_FLYING_DEATHTOUCH: CardDefinition = {
  id: "token-g-11-insect-flying-deathtouch",
  name: "Insect",
  types: ["Creature"],
  subtypes: ["Insect"],
  colorIdentity: ["G"],
  power: 1,
  toughness: 1,
  keywords: ["Flying", "Deathtouch"],
  isToken: true,
  tier: "vanilla",
};

export const TOKEN_B_11_SNAKE_DEATHTOUCH: CardDefinition = {
  id: "token-b-11-snake-deathtouch",
  name: "Snake",
  types: ["Creature"],
  subtypes: ["Snake"],
  colorIdentity: ["B"],
  power: 1,
  toughness: 1,
  keywords: ["Deathtouch"],
  isToken: true,
  tier: "vanilla",
};

export const HORNET_QUEEN: CardDefinition = {
  id: "hornet-queen",
  name: "Hornet Queen",
  scryfallId: "b2af9184-df81-413b-abcf-331c4471e6d4",
  types: ["Creature"],
  subtypes: ["Insect"],
  manaCost: { generic: 4, colors: { G: 3 } },
  colorIdentity: ["G"],
  power: 2,
  toughness: 2,
  keywords: ["Flying", "Deathtouch"],
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "createToken", count: 4, tokenDefinitionId: "token-g-11-insect-flying-deathtouch" } }],
  tier: "scripted",
};

export const OPHIOMANCER: CardDefinition = {
  id: "ophiomancer",
  name: "Ophiomancer",
  scryfallId: "baf793b6-9612-43f3-9f1b-2e53e81cb89f",
  types: ["Creature"],
  subtypes: ["Human", "Shaman"],
  manaCost: { generic: 2, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 2,
  toughness: 2,
  triggeredAbilities: [{ event: "upkeep", watches: "any", onlyIf: { kind: "not", condition: { kind: "controls-subtype", subtypes: ["Snake"] } }, effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-b-11-snake-deathtouch" } }],
  tier: "scripted",
};

export const DARK_RITUAL: CardDefinition = {
  id: "dark-ritual",
  name: "Dark Ritual",
  scryfallId: "11e12a84-e7be-4afc-a230-c2e644743fa8",
  types: ["Instant"],
  manaCost: { generic: 0, colors: { B: 1 } },
  colorIdentity: ["B"],
  castEffect: { kind: "addMana", color: "B", amount: 3 },
  tier: "scripted",
};

export const SYLVAN_TUTOR: CardDefinition = {
  id: "sylvan-tutor",
  name: "Sylvan Tutor",
  scryfallId: "9dcad208-cbea-458f-af8d-6f5e9ec32df7",
  types: ["Sorcery"],
  manaCost: { generic: 0, colors: { G: 1 } },
  colorIdentity: ["G"],
  castEffect: { kind: "searchLibrary", cardType: "Creature", destination: "library-top" },
  tier: "scripted",
};

export const ASSASSINS_TROPHY: CardDefinition = {
  id: "assassins-trophy",
  name: "Assassin's Trophy",
  scryfallId: "aaf258fc-3ba4-4b83-bdbf-10a07e0b6c03",
  types: ["Instant"],
  manaCost: { generic: 0, colors: { B: 1, G: 1 } },
  colorIdentity: ["B", "G"],
  castEffect: {
    kind: "sequence",
    effects: [
      { kind: "destroy", target: { kind: "permanent", controlledBy: "opponent" } },
      {
        kind: "searchLibrary",
        cardType: "Land",
        basicLandOnly: true,
        destination: "battlefield",
        who: "target-controller",
      },
    ],
  },
  tier: "scripted",
};

/**
 * "If an effect would create one or more tokens under your control, it creates
 * twice that many of those tokens instead.
 *  If an effect would put one or more counters on a permanent you control, it
 * puts twice that many of those counters on that permanent instead."
 *
 * Both lines, both replacements. No `cardTypes` on the counter half because
 * the card says "a permanent you control" and means it.
 */
export const DOUBLING_SEASON: CardDefinition = {
  id: "doubling-season",
  name: "Doubling Season",
  scryfallId: "f2c4f80e-84a0-463b-82c3-5c6503809351",
  types: ["Enchantment"],
  manaCost: { generic: 4, colors: { G: 1 } },
  colorIdentity: ["G"],
  replacementEffects: [
    { kind: "tokens-created", multiply: 2 },
    { kind: "counters-placed", multiply: 2 },
  ],
  tier: "weird",
};

/**
 * "If one or more counters would be put on an artifact or creature you
 * control, that many plus one of each of those kinds of counters are put on
 * that permanent instead.
 *  If you would get one or more counters, you get that many plus one of each
 * of those kinds of counters instead."
 *
 * The first line is here. The second concerns counters put on a *player* -
 * poison, energy, experience - and this engine has no such thing: there is no
 * counter of any kind that can go on a player, so no game state it can reach
 * makes that line do anything. It is left unmodelled deliberately rather than
 * approximated onto something else, and this note is the record of that.
 *
 * The type list is load-bearing. Without it the Snake would also pump an
 * enchantment, which is Doubling Season's job and not this card's.
 */
export const WINDING_CONSTRICTOR: CardDefinition = {
  id: "winding-constrictor",
  name: "Winding Constrictor",
  scryfallId: "107c8aa8-c8f8-4cbf-821b-bd2cb33354f0",
  types: ["Creature"],
  subtypes: ["Snake"],
  manaCost: { generic: 0, colors: { B: 1, G: 1 } },
  colorIdentity: ["B", "G"],
  power: 2,
  toughness: 3,
  replacementEffects: [{ kind: "counters-placed", add: 1, cardTypes: ["Artifact", "Creature"] }],
  tier: "weird",
};

/**
 * "{X}{B}{B} Legendary Enchantment
 *
 *  When The Meathook Massacre enters, each creature gets -X/-X until end of turn.
 *  Whenever a creature you control dies, each opponent loses 1 life.
 *  Whenever a creature an opponent controls dies, you gain 1 life."
 *
 * Three abilities and three separate pieces of engine. The -X/-X needs X to
 * survive from the cast into an enters-the-battlefield trigger that fires after
 * the spell has left the stack; the other two are the same event pointed in
 * opposite directions, which is the whole reason `watchFor.controlledBy`
 * exists. Written without it, the card drains you every time your own creature
 * dies - the exact opposite of what it says.
 */
export const THE_MEATHOOK_MASSACRE: CardDefinition = {
  id: "the-meathook-massacre",
  name: "The Meathook Massacre",
  scryfallId: "70d0540f-93c6-4af5-ab2d-65e6c03001c7",
  types: ["Enchantment"],
  supertypes: ["Legendary"],
  manaCost: { generic: 0, colors: { B: 2 }, x: 1 },
  colorIdentity: ["B"],
  triggeredAbilities: [
    {
      event: "enters-battlefield",
      effect: {
        kind: "pumpAll",
        power: { kind: "x", negate: true },
        toughness: { kind: "x", negate: true },
        scope: "all",
      },
    },
    {
      event: "permanent-dies",
      watches: "any",
      watchFor: { type: "Creature", controlledBy: "you" },
      effect: { kind: "loseLife", amount: 1, who: "each-opponent" },
    },
    {
      event: "permanent-dies",
      watches: "any",
      watchFor: { type: "Creature", controlledBy: "opponent" },
      effect: { kind: "gainLife", amount: 1 },
    },
  ],
  tier: "weird",
};


/*
 * Ten cards that needed the keyword layer, targeted triggers, surveil, and two
 * new trigger events. See ROADMAP.md.
 *
 * The two Pest tokens below are the first tokens in the pool with rules text of
 * their own, and they are why "tokens that carry their own rules text" turned
 * out not to be an engine gap at all: a token definition is an ordinary
 * CardDefinition, and `triggeredAbilities` on one has always worked. Only the
 * generator refused them.
 *
 * They are deliberately two definitions and not one. Blight Mound's Pest gains
 * you life when it *dies*; Send in the Pest's gains you life when it *attacks*.
 * Same body, same colours, different card - and a shared definition would have
 * given one of them the wrong ability.
 */

export const TOKEN_BG_11_PEST_DIES_GAIN_LIFE: CardDefinition = {
  id: "token-bg-11-pest-dies-gain-life",
  name: "Pest",
  types: ["Creature"],
  subtypes: ["Pest"],
  colorIdentity: ["B", "G"],
  power: 1,
  toughness: 1,
  triggeredAbilities: [{ event: "dies", effect: { kind: "gainLife", amount: 1, who: "controller" } }],
  isToken: true,
  tier: "scripted",
};

export const TOKEN_BG_11_PEST_ATTACKS_GAIN_LIFE: CardDefinition = {
  id: "token-bg-11-pest-attacks-gain-life",
  name: "Pest",
  types: ["Creature"],
  subtypes: ["Pest"],
  colorIdentity: ["B", "G"],
  power: 1,
  toughness: 1,
  triggeredAbilities: [{ event: "attacks", effect: { kind: "gainLife", amount: 1, who: "controller" } }],
  isToken: true,
  tier: "scripted",
};

export const TOKEN_G_12_SPIDER_REACH: CardDefinition = {
  id: "token-g-12-spider-reach",
  name: "Spider",
  types: ["Creature"],
  subtypes: ["Spider"],
  colorIdentity: ["G"],
  power: 1,
  toughness: 2,
  keywords: ["Reach"],
  isToken: true,
  tier: "vanilla",
};

/*
 * "Permanents you control gain hexproof and indestructible until end of turn."
 *
 * Permanents, not creatures - the shield covers your lands and enchantments
 * too, which is most of the reason the card is played. Zero power and toughness
 * because the pump is not the point; `pumpAll` is simply where an
 * until-end-of-turn grant lives, so it wears off in the same cleanup step.
 */
export const HEROIC_INTERVENTION: CardDefinition = {
  id: "heroic-intervention",
  name: "Heroic Intervention",
  scryfallId: "e32c67d1-187f-40df-b3b3-6036f5c92834",
  types: ["Instant"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  castEffect: { kind: "pumpAll", power: 0, toughness: 0, scope: "controller", appliesTo: "permanents", grants: ["Hexproof", "Indestructible"] },
  tier: "scripted",
};

/*
 * "When this creature enters, put a +1/+1 counter on target creature. Each
 * creature you control with a +1/+1 counter on it has trample."
 *
 * `includesSelf` is on because the second line says "each creature you
 * control", not "each *other*" - and the first line can legally put the counter
 * on the Crawler itself, at which point it had better have trample too.
 */
export const DUSKSHELL_CRAWLER: CardDefinition = {
  id: "duskshell-crawler",
  name: "Duskshell Crawler",
  scryfallId: "eb39a0c0-668f-4881-957a-3d09c50beaf4",
  types: ["Creature"],
  subtypes: ["Insect"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 0,
  toughness: 3,
  staticBuff: { power: 0, toughness: 0, grants: ["Trample"], restriction: "with-counter", includesSelf: true },
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "addCounter", amount: 1, target: { kind: "creature" } } }],
  tier: "scripted",
};

/*
 * "Attacking Pests you control get +1/+0 and have menace. Whenever a nontoken
 * creature you control dies, create a 1/1 black and green Pest creature token
 * with 'When this token dies, you gain 1 life.'"
 *
 * Mono-black despite minting a black *and green* token: a token's colours are
 * not mana symbols, so they add nothing to colour identity. Worth stating,
 * because it is the opposite of what the card's text looks like.
 */
export const BLIGHT_MOUND: CardDefinition = {
  id: "blight-mound",
  name: "Blight Mound",
  scryfallId: "dc060028-e01c-4bc7-8b52-7d0e2a350061",
  types: ["Enchantment"],
  manaCost: { generic: 2, colors: { B: 1 } },
  colorIdentity: ["B"],
  staticBuff: { power: 1, toughness: 0, subtype: "Pest", grants: ["Menace"], restriction: "attacking" },
  triggeredAbilities: [
    {
      event: "permanent-dies",
      watches: "controller",
      watchFor: { type: "Creature", nontoken: true },
      effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-bg-11-pest-dies-gain-life" },
    },
  ],
  tier: "scripted",
};

/*
 * "Each opponent discards a card. You create a 1/1 black and green Pest
 * creature token with 'Whenever this token attacks, you gain 1 life.'"
 *
 * The discard is the *opponent's* choice, which is what keeps this a two-mana
 * sorcery rather than a much better card. It used to be taken at random, and
 * random discard does not read hands: it takes the answer as readily as the
 * spare land, so a player never gets to make the decision the card is really
 * asking for.
 */
export const SEND_IN_THE_PEST: CardDefinition = {
  id: "send-in-the-pest",
  name: "Send in the Pest",
  scryfallId: "283b508b-89f0-4c23-9686-b049e402b73c",
  types: ["Sorcery"],
  manaCost: { generic: 1, colors: { B: 1 } },
  colorIdentity: ["B"],
  castEffect: {
    kind: "sequence",
    effects: [
      { kind: "discard", amount: 1, who: "each-opponent" },
      { kind: "createToken", count: 1, tokenDefinitionId: "token-bg-11-pest-attacks-gain-life" },
    ],
  },
  tier: "scripted",
};

/*
 * "Whenever this creature or another creature dies, target player loses 1 life
 * and you gain 1 life."
 *
 * `includesSelf` for "this creature or another", and `watches: "any"` because
 * it says nothing about who controlled the creature - an opponent's dying
 * blocker drains them just the same.
 *
 * The `who` on each half is the whole card: the *target* loses, and the
 * *controller* gains. One sequence, one target, two different people.
 */
export const BLOOD_ARTIST: CardDefinition = {
  id: "blood-artist",
  name: "Blood Artist",
  scryfallId: "b5275d76-2947-4219-be21-614c7421614a",
  types: ["Creature"],
  subtypes: ["Vampire"],
  manaCost: { generic: 1, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 0,
  toughness: 1,
  triggeredAbilities: [
    {
      event: "permanent-dies",
      watches: "any",
      includesSelf: true,
      watchFor: { type: "Creature" },
      effect: {
        kind: "sequence",
        effects: [
          { kind: "loseLife", amount: 1, who: "target", target: { kind: "player" } },
          { kind: "gainLife", amount: 1, who: "controller" },
        ],
      },
    },
  ],
  tier: "scripted",
};

/** "As this land enters, you may pay 2 life. If you don't, it enters tapped." */
export const OVERGROWN_TOMB: CardDefinition = {
  id: "overgrown-tomb",
  name: "Overgrown Tomb",
  scryfallId: "ad7e18e2-c033-4b6c-86e8-d0e5cc824cfd",
  types: ["Land"],
  subtypes: ["Swamp", "Forest"],
  colorIdentity: ["B", "G"],
  entersTappedUnlessPayLife: 2,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "scripted",
};

/** "This land enters tapped. When this land enters, surveil 1." */
export const UNDERGROUND_MORTUARY: CardDefinition = {
  id: "underground-mortuary",
  name: "Underground Mortuary",
  scryfallId: "f6ca59cd-8779-4a84-a54b-e863b79c61f0",
  types: ["Land"],
  subtypes: ["Swamp", "Forest"],
  colorIdentity: ["B", "G"],
  entersTapped: true,
  triggeredAbilities: [{ event: "enters-battlefield", effect: { kind: "surveil", amount: 1 } }],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "scripted",
};

/*
 * "Whenever an opponent casts an instant or sorcery spell, create a 1/2 green
 * Spider creature token with reach."
 *
 * `watches: "any"` and `controlledBy: "opponent"` do different jobs and both
 * are needed: the first stops the watcher/subject controller match throwing the
 * event away before it is looked at, the second is the card's real restriction.
 */
export const ARASTA_OF_THE_ENDLESS_WEB: CardDefinition = {
  id: "arasta-of-the-endless-web",
  name: "Arasta of the Endless Web",
  scryfallId: "95a87b4e-f0ea-457c-9517-4acf313c4ca6",
  types: ["Enchantment", "Creature"],
  subtypes: ["Spider"],
  supertypes: ["Legendary"],
  manaCost: { generic: 2, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 3,
  toughness: 5,
  keywords: ["Reach"],
  canBeCommander: true,
  triggeredAbilities: [
    {
      event: "spell-cast",
      watches: "any",
      watchFor: { type: ["Instant", "Sorcery"], controlledBy: "opponent" },
      effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-g-12-spider-reach" },
    },
  ],
  tier: "scripted",
};

/*
 * "Whenever this creature is dealt damage, create that many 1/1 green Insect
 * creature tokens with flying and deathtouch."
 *
 * "That many" is the damage that actually landed, substituted into the count as
 * the trigger fires - so a Hornet Nest behind a prevention shield makes nothing
 * at all.
 */
export const HORNET_NEST: CardDefinition = {
  id: "hornet-nest",
  name: "Hornet Nest",
  scryfallId: "cc4693c6-f532-4726-b51a-21b04f820448",
  types: ["Creature"],
  subtypes: ["Insect"],
  manaCost: { generic: 2, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 0,
  toughness: 2,
  keywords: ["Defender"],
  triggeredAbilities: [
    {
      event: "damaged",
      effect: { kind: "createToken", count: { kind: "event-amount" }, tokenDefinitionId: "token-g-11-insect-flying-deathtouch" },
    },
  ],
  tier: "scripted",
};

/*
 * "Choose one - all creatures get -1/-1 until end of turn; destroy target
 * enchantment; regenerate each creature you control."
 *
 * Every mode was already expressible except the third, which needed an
 * untargeted mass regenerate. The bullet-list wording is a generator gap, not
 * an engine one - `modal` has worked since the Charm's cousins arrived.
 */
export const GOLGARI_CHARM: CardDefinition = {
  id: "golgari-charm",
  name: "Golgari Charm",
  scryfallId: "9d467e61-bbec-4cea-bd5d-f10555910c9d",
  types: ["Instant"],
  manaCost: { generic: 0, colors: { B: 1, G: 1 } },
  colorIdentity: ["B", "G"],
  castEffect: {
    kind: "modal",
    modes: [
      { label: "All creatures get -1/-1 until end of turn", effect: { kind: "pumpAll", power: -1, toughness: -1, scope: "all" } },
      { label: "Destroy target enchantment", effect: { kind: "destroy", target: { kind: "permanent", cardTypes: ["Enchantment"] } } },
      { label: "Regenerate each creature you control", effect: { kind: "regenerateAll" } },
    ],
  },
  tier: "scripted",
};


/*
 * The 2026-08-13 batch: four modal double-faced cards, three that read a number
 * off the board, and three that each needed one new thing.
 *
 * Every MDFC below is two definitions. The back is flagged `isBackFace` so the
 * deck builder never offers it on its own - you put the front in a deck and
 * choose a face when you play it.
 */

export const BALA_GED_SANCTUARY: CardDefinition = {
  id: "bala-ged-sanctuary",
  name: "Bala Ged Sanctuary",
  scryfallId: "c5cb3052-358d-44a7-8cfd-cd31b236494a",
  types: ["Land"],
  colorIdentity: ["G"],
  entersTapped: true,
  isBackFace: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "vanilla",
};

/** "Return target card from your graveyard to your hand." // a tapped Forest. */
export const BALA_GED_RECOVERY: CardDefinition = {
  id: "bala-ged-recovery",
  name: "Bala Ged Recovery",
  scryfallId: "c5cb3052-358d-44a7-8cfd-cd31b236494a",
  types: ["Sorcery"],
  manaCost: { generic: 2, colors: { G: 1 } },
  colorIdentity: ["G"],
  backFaceId: "bala-ged-sanctuary",
  castEffect: { kind: "returnFromGraveyard", destination: "hand", target: { kind: "card-in-your-graveyard" } },
  tier: "scripted",
};

export const FELL_MIRE: CardDefinition = {
  id: "fell-mire",
  name: "Fell Mire",
  scryfallId: "a3cb782d-c459-468d-9779-9b5669abc337",
  types: ["Land"],
  colorIdentity: ["B"],
  entersTappedUnlessPayLife: 3,
  isBackFace: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }],
  tier: "scripted",
};

/*
 * "Destroy target creature or planeswalker." // a shockland that costs 3.
 *
 * The planeswalker half of the selector is unreachable today - the engine has
 * no planeswalkers - but it is written down because it is what the card says,
 * and the day Grist arrives this spell already answers it.
 */
export const FELL_THE_PROFANE: CardDefinition = {
  id: "fell-the-profane",
  name: "Fell the Profane",
  scryfallId: "a3cb782d-c459-468d-9779-9b5669abc337",
  types: ["Instant"],
  manaCost: { generic: 2, colors: { B: 2 } },
  colorIdentity: ["B"],
  backFaceId: "fell-mire",
  castEffect: { kind: "destroy", target: { kind: "permanent", cardTypes: ["Creature", "Planeswalker"] } },
  tier: "scripted",
};

export const OLD_GROWTH_GROVE: CardDefinition = {
  id: "old-growth-grove",
  name: "Old-Growth Grove",
  scryfallId: "03522b6b-31ec-4126-8885-5dbb2248688b",
  types: ["Land"],
  colorIdentity: ["B", "G"],
  entersTapped: true,
  isBackFace: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "vanilla",
};

/** "Put a +1/+1 counter on target creature. It gains indestructible until end of turn." */
export const REVITALIZING_REPAST: CardDefinition = {
  id: "revitalizing-repast",
  name: "Revitalizing Repast",
  scryfallId: "03522b6b-31ec-4126-8885-5dbb2248688b",
  types: ["Instant"],
  manaCost: { generic: 0, colors: {}, hybrid: [["B", "G"]] },
  colorIdentity: ["B", "G"],
  backFaceId: "old-growth-grove",
  castEffect: {
    kind: "sequence",
    effects: [
      { kind: "addCounter", amount: 1, target: { kind: "creature" } },
      { kind: "pump", power: 0, toughness: 0, grants: ["Indestructible"] },
    ],
  },
  tier: "scripted",
};

export const BOGGART_BOG: CardDefinition = {
  id: "boggart-bog",
  name: "Boggart Bog",
  scryfallId: "d0d484a6-5610-4f1d-95ec-eda273c255e4",
  types: ["Land"],
  colorIdentity: ["B"],
  entersTappedUnlessPayLife: 3,
  isBackFace: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }],
  tier: "scripted",
};

/** "When this creature enters, exile target player's graveyard." // a shockland. */
export const BOGGART_TRAWLER: CardDefinition = {
  id: "boggart-trawler",
  name: "Boggart Trawler",
  scryfallId: "d0d484a6-5610-4f1d-95ec-eda273c255e4",
  types: ["Creature"],
  subtypes: ["Goblin"],
  manaCost: { generic: 2, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 3,
  toughness: 1,
  backFaceId: "boggart-bog",
  triggeredAbilities: [
    { event: "enters-battlefield", effect: { kind: "exileGraveyard", target: { kind: "player" } } },
  ],
  tier: "scripted",
};

/*
 * "Draw a card for each creature you control with a +1/+1 counter on it. Those
 * creatures gain indestructible until end of turn."
 *
 * The count and the shield read the same board, and the `with-counter`
 * restriction on the pump is what makes "those creatures" mean the ones it just
 * counted rather than everything you control.
 */
export const INSPIRING_CALL: CardDefinition = {
  id: "inspiring-call",
  name: "Inspiring Call",
  scryfallId: "2555ec7b-5cc2-4ffd-9344-6368019feff9",
  types: ["Instant"],
  manaCost: { generic: 2, colors: { G: 1 } },
  colorIdentity: ["G"],
  castEffect: {
    kind: "sequence",
    effects: [
      { kind: "draw", amount: { kind: "count", of: { what: "creatures", withCounter: true } } },
      {
        kind: "pumpAll",
        power: 0,
        toughness: 0,
        scope: "controller",
        restriction: "with-counter",
        grants: ["Indestructible"],
      },
    ],
  },
  tier: "scripted",
};

/*
 * "Choose one - draw cards equal to the greatest power among non-Human
 * creatures you control; or non-Human creatures you control get +3/+3 until end
 * of turn."
 *
 * Both modes exclude Humans, and both read the board when they resolve.
 */
export const RETURN_OF_THE_WILDSPEAKER: CardDefinition = {
  id: "return-of-the-wildspeaker",
  name: "Return of the Wildspeaker",
  scryfallId: "2fa1dac5-51ba-403e-b48b-d2c0d23a8146",
  types: ["Instant"],
  manaCost: { generic: 4, colors: { G: 1 } },
  colorIdentity: ["G"],
  castEffect: {
    kind: "modal",
    modes: [
      {
        label: "Draw cards equal to the greatest power among non-Human creatures you control",
        effect: { kind: "draw", amount: { kind: "count", of: { what: "greatest-power", excludeSubtype: "Human" } } },
      },
      {
        label: "Non-Human creatures you control get +3/+3 until end of turn",
        effect: { kind: "pumpAll", power: 3, toughness: 3, scope: "controller", excludeSubtype: "Human" },
      },
    ],
  },
  tier: "scripted",
};

/*
 * "At the beginning of your end step, create a 1/1 green Insect creature token
 * for each +1/+1 counter you've put on creatures under your control this turn."
 *
 * A tally, not a board reading: the creatures that carried those counters may
 * be dead by the end step and the Hornbeetle still pays for them.
 */
export const IRIDESCENT_HORNBEETLE: CardDefinition = {
  id: "iridescent-hornbeetle",
  name: "Iridescent Hornbeetle",
  scryfallId: "214ef641-b08c-42d0-94a5-3054fa7fcebc",
  types: ["Creature"],
  subtypes: ["Insect"],
  manaCost: { generic: 4, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 3,
  toughness: 4,
  triggeredAbilities: [
    {
      event: "end-step",
      watches: "controller",
      effect: {
        kind: "createToken",
        count: { kind: "count", of: { what: "counters-placed-this-turn" } },
        tokenDefinitionId: "token-g-11-insect",
      },
    },
  ],
  tier: "scripted",
};

export const TOKEN_G_11_INSECT: CardDefinition = {
  id: "token-g-11-insect",
  name: "Insect",
  types: ["Creature"],
  subtypes: ["Insect"],
  colorIdentity: ["G"],
  power: 1,
  toughness: 1,
  isToken: true,
  tier: "vanilla",
};

/*
 * "Attacking Pests you control get +1/+0 and have deathtouch.
 *  {1}{G}: Exile target card from a graveyard. If a creature card is exiled
 *  this way, create a 1/1 black and green Pest creature token with 'When this
 *  token dies, you gain 1 life.'"
 *
 * "A graveyard" is anybody's, which is why the selector says so explicitly -
 * every other card in the pool that reaches into a graveyard says "your".
 */
export const FERAL_APPETITE: CardDefinition = {
  id: "feral-appetite",
  name: "Feral Appetite",
  scryfallId: "69dda877-c176-456c-8cd8-5a1ea288e4c9",
  types: ["Enchantment"],
  manaCost: { generic: 2, colors: { G: 1 } },
  colorIdentity: ["G"],
  staticBuff: { power: 1, toughness: 0, subtype: "Pest", grants: ["Deathtouch"], restriction: "attacking" },
  activatedAbilities: [
    {
      cost: { mana: { generic: 1, colors: { G: 1 } } },
      effect: {
        kind: "sequence",
        effects: [
          { kind: "exile", target: { kind: "card-in-your-graveyard", anyGraveyard: true } },
          {
            kind: "ifTargetWas",
            cardType: "Creature",
            then: { kind: "createToken", count: 1, tokenDefinitionId: "token-bg-11-pest-dies-gain-life" },
          },
        ],
      },
    },
  ],
  tier: "scripted",
};

/*
 * "Equipped creature gets +1/-1. Whenever equipped creature dies, draw two
 * cards. Equip {1}"
 *
 * The first Equipment in the pool. Its `staticBuff` reaches exactly the
 * creature it is attached to - see `buffApplies` - and the dies trigger watches
 * that one creature rather than a class of them.
 */
export const SKULLCLAMP: CardDefinition = {
  id: "skullclamp",
  name: "Skullclamp",
  scryfallId: "1d8b007b-3169-4ee3-80c7-781fc096fc7a",
  types: ["Artifact"],
  subtypes: ["Equipment"],
  manaCost: { generic: 1, colors: {} },
  colorIdentity: [],
  equipCost: { generic: 1, colors: {} },
  staticBuff: { power: 1, toughness: -1 },
  activatedAbilities: [
    {
      sorcerySpeedOnly: true,
      cost: { mana: { generic: 1, colors: {} } },
      effect: { kind: "attach", target: { kind: "creature" } },
    },
  ],
  triggeredAbilities: [
    {
      event: "permanent-dies",
      watches: "any",
      watchFor: { type: "Creature", attachedToThis: true },
      effect: { kind: "draw", amount: 2 },
    },
  ],
  tier: "scripted",
};

/*
 * "Create X 1/2 green Spider creature tokens with reach, where X is the number
 * of creatures attacking you. Prevent all combat damage that would be dealt
 * this turn by non-Spider creatures."
 *
 * A fog that leaves a board behind. Both halves read the same combat: the count
 * is the attackers pointed at you, and the prevention spares the Spiders it
 * just made.
 */
export const ARACHNOGENESIS: CardDefinition = {
  id: "arachnogenesis",
  name: "Arachnogenesis",
  scryfallId: "f5f18431-64c0-4ae5-bdc1-1e953313f086",
  types: ["Instant"],
  manaCost: { generic: 2, colors: { G: 1 } },
  colorIdentity: ["G"],
  castEffect: {
    kind: "sequence",
    effects: [
      {
        kind: "createToken",
        count: { kind: "count", of: { what: "creatures-attacking-you" } },
        tokenDefinitionId: "token-g-12-spider-reach",
      },
      { kind: "preventCombatDamage", exceptSubtype: "Spider" },
    ],
  },
  tier: "scripted",
};



export const TOKEN_B_11_INSECT_FLYING: CardDefinition = {
  id: "token-b-11-insect-flying",
  name: "Insect",
  types: ["Creature"],
  subtypes: ["Insect"],
  colorIdentity: ["B"],
  power: 1,
  toughness: 1,
  keywords: ["Flying"],
  isToken: true,
  tier: "vanilla",
};

/*
 * "As an additional cost to cast this spell, pay X life. All creatures get
 * -X/-X until end of turn."
 *
 * The {X} is in the *additional* cost, not the mana cost - the card really does
 * cost {2}{B} - which is why `additionalCostNeedsX` exists in casting.ts. Read
 * the mana cost alone and every Toxic Deluge would be cast for X = 0 and wipe
 * nothing at all.
 */
export const TOXIC_DELUGE: CardDefinition = {
  id: "toxic-deluge",
  name: "Toxic Deluge",
  scryfallId: "de5afccc-8d42-4bd6-b068-b9ea2361655e",
  types: ["Sorcery"],
  manaCost: { generic: 2, colors: { B: 1 } },
  colorIdentity: ["B"],
  additionalCost: { kind: "pay-life", amount: { kind: "x" } },
  castEffect: {
    kind: "pumpAll",
    power: { kind: "x", negate: true },
    toughness: { kind: "x", negate: true },
    scope: "all",
  },
  tier: "scripted",
};

/*
 * "As an additional cost to cast this spell, sacrifice a creature. Create X 1/1
 * black and green Pest creature tokens with 'When this token dies, you gain 1
 * life,' where X is the sacrificed creature's power."
 *
 * The sacrifice is a cost, so it is announced with the spell and cannot be
 * responded to - and it is what makes X knowable, because the power is read
 * while the creature is still on the battlefield. See `sacrificed-power`.
 */
export const TEND_THE_PESTS: CardDefinition = {
  id: "tend-the-pests",
  name: "Tend the Pests",
  scryfallId: "8f43ed93-008d-44db-8204-ef2cc3b7cf8a",
  types: ["Instant"],
  manaCost: { generic: 0, colors: { B: 1, G: 1 } },
  colorIdentity: ["B", "G"],
  additionalCost: { kind: "sacrifice-creature" },
  castEffect: {
    kind: "createToken",
    count: { kind: "sacrificed-power" },
    tokenDefinitionId: "token-bg-11-pest-dies-gain-life",
  },
  tier: "scripted",
};

/*
 * "If you control a commander, you may cast this spell without paying its mana
 * cost. Exile target creature."
 *
 * The condition reads the battlefield and not the command zone - see
 * `controls-commander`. A commander waiting to be cast is not one you control,
 * and the whole cost of this card is having to get yours down first.
 */
export const DEADLY_ROLLICK: CardDefinition = {
  id: "deadly-rollick",
  name: "Deadly Rollick",
  scryfallId: "0e13f735-54fa-42b6-aea4-ced33811d7d4",
  types: ["Instant"],
  manaCost: { generic: 3, colors: { B: 1 } },
  colorIdentity: ["B"],
  alternativeCost: {
    condition: { kind: "controls-commander" },
    label: "cast without paying its mana cost",
  },
  castEffect: { kind: "exile", target: { kind: "creature" } },
  tier: "scripted",
};

/*
 * "As this land enters, you may pay 3 life. If you don't, it enters tapped.
 * {T}: Add {G}." - the back face of Disciple of Freyalise.
 */
export const GARDEN_OF_FREYALISE: CardDefinition = {
  id: "garden-of-freyalise",
  name: "Garden of Freyalise",
  scryfallId: "a8e9ea5a-5e10-4b77-baef-0352ff035483",
  types: ["Land"],
  colorIdentity: ["G"],
  entersTappedUnlessPayLife: 3,
  isBackFace: true,
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "scripted",
};

/*
 * "When this creature enters, you may sacrifice another creature. If you do,
 * you gain X life and draw X cards, where X is that creature's power."
 *
 * The sacrifice here is an *effect*, not a cost, and the difference is the
 * card: it can be declined, and Disciple of Freyalise is a perfectly good 3/3
 * on an empty board. Tend the Pests above cannot be cast at all in that spot.
 */
export const DISCIPLE_OF_FREYALISE: CardDefinition = {
  id: "disciple-of-freyalise",
  name: "Disciple of Freyalise",
  scryfallId: "a8e9ea5a-5e10-4b77-baef-0352ff035483",
  types: ["Creature"],
  subtypes: ["Elf", "Druid"],
  manaCost: { generic: 3, colors: { G: 3 } },
  colorIdentity: ["G"],
  power: 3,
  toughness: 3,
  backFaceId: "garden-of-freyalise",
  triggeredAbilities: [
    {
      event: "enters-battlefield",
      effect: {
        kind: "sacrificeChosen",
        optional: true,
        excludeSelf: true,
        then: {
          kind: "sequence",
          effects: [
            { kind: "gainLife", amount: { kind: "sacrificed-power" }, who: "controller" },
            { kind: "draw", amount: { kind: "sacrificed-power" } },
          ],
        },
      },
    },
  ],
  tier: "scripted",
};

/*
 * "You may play an additional land on each of your turns. You may play lands
 * from your graveyard. Landfall - Whenever a land you control enters, mill a
 * card."
 *
 * All three lines matter together: the mill fills the graveyard the second line
 * plays out of, and the first line is what lets you use both in one turn.
 */
export const ICETILL_EXPLORER: CardDefinition = {
  id: "icetill-explorer",
  name: "Icetill Explorer",
  scryfallId: "d9482aab-6ddf-48e1-84fa-b13d5ff81e69",
  types: ["Creature"],
  subtypes: ["Insect", "Scout"],
  manaCost: { generic: 2, colors: { G: 2 } },
  colorIdentity: ["G"],
  power: 2,
  toughness: 4,
  staticRules: { extraLandDrops: 1, playLandsFromGraveyard: true },
  triggeredAbilities: [{ event: "landfall", watches: "controller", effect: { kind: "mill", amount: 1 } }],
  tier: "scripted",
};

/*
 * "This land enters tapped. {T}: Add one mana of any color in your commander's
 * color identity. When that mana is spent to cast a creature spell that shares
 * a creature type with your commander, scry 1."
 *
 * Five abilities for the five colours, exactly as Command Tower is written, and
 * `colorFrom` refuses whichever are not in this deck's identity. `marksMana` is
 * the rider: it restricts nothing - the mana pays for anything - and only
 * decides whether the scry fires. See `ManaMark`.
 */
export const PATH_OF_ANCESTRY: CardDefinition = {
  id: "path-of-ancestry",
  name: "Path of Ancestry",
  scryfallId: "836b8f52-10d2-4716-9f7b-38fb23bc68de",
  types: ["Land"],
  colorIdentity: [],
  entersTapped: true,
  activatedAbilities: [
    {
      cost: { tap: true },
      effect: { kind: "addMana", color: "W", amount: 1 },
      colorFrom: "commander-identity",
      marksMana: { kind: "scry-on-creature-sharing-commander-type", amount: 1 },
    },
    {
      cost: { tap: true },
      effect: { kind: "addMana", color: "U", amount: 1 },
      colorFrom: "commander-identity",
      marksMana: { kind: "scry-on-creature-sharing-commander-type", amount: 1 },
    },
    {
      cost: { tap: true },
      effect: { kind: "addMana", color: "B", amount: 1 },
      colorFrom: "commander-identity",
      marksMana: { kind: "scry-on-creature-sharing-commander-type", amount: 1 },
    },
    {
      cost: { tap: true },
      effect: { kind: "addMana", color: "R", amount: 1 },
      colorFrom: "commander-identity",
      marksMana: { kind: "scry-on-creature-sharing-commander-type", amount: 1 },
    },
    {
      cost: { tap: true },
      effect: { kind: "addMana", color: "G", amount: 1 },
      colorFrom: "commander-identity",
      marksMana: { kind: "scry-on-creature-sharing-commander-type", amount: 1 },
    },
  ],
  tier: "scripted",
};

/*
 * "Flying, deathtouch. Whenever a player sacrifices a nontoken creature, create
 * a 1/1 black Insect creature token with flying. Whenever an Insect, Leech,
 * Slug, or Worm you control attacks, defending player loses 1 life and you gain
 * 1 life."
 *
 * The first trigger says "a player", so it watches everybody's sacrifices - not
 * only its controller's, which is the reading that would halve the card.
 *
 * "Defending player" is written here as `opponent-of-controller`, which is
 * exact in a two-player game - the only kind this engine plays - and would need
 * the attacked player carried through the trigger in a pod. See CLAUDE.md on
 * the two-player scope.
 */
export const FUMULUS_THE_INFESTATION: CardDefinition = {
  id: "fumulus-the-infestation",
  name: "Fumulus, the Infestation",
  scryfallId: "ee5e47c2-7648-4218-b42c-ed9650e12914",
  types: ["Creature"],
  subtypes: ["Vampire", "Insect"],
  supertypes: ["Legendary"],
  manaCost: { generic: 3, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 2,
  toughness: 2,
  keywords: ["Flying", "Deathtouch"],
  canBeCommander: true,
  triggeredAbilities: [
    {
      event: "permanent-sacrificed",
      watches: "any",
      includesSelf: true,
      watchFor: { type: "Creature", nontoken: true },
      effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-b-11-insect-flying" },
    },
    {
      event: "permanent-attacks",
      watches: "controller",
      includesSelf: true,
      watchFor: { subtype: ["Insect", "Leech", "Slug", "Worm"] },
      effect: {
        kind: "sequence",
        effects: [
          { kind: "loseLife", amount: 1, who: "target", target: { kind: "opponent-of-controller" } },
          { kind: "gainLife", amount: 1, who: "controller" },
        ],
      },
    },
  ],
  tier: "scripted",
};

/*
 * "Whenever a creature you control leaves the battlefield, if it had counters
 * on it, put those counters on The Ozolith. At the beginning of combat on your
 * turn, if The Ozolith has counters on it, you may move all counters from The
 * Ozolith onto target creature."
 *
 * "Leaves the battlefield" rather than "dies" is the whole card: a creature
 * exiled or bounced still hands its counters over. The number rides on the
 * event, captured before `moveCard` strips them.
 */
export const THE_OZOLITH: CardDefinition = {
  id: "the-ozolith",
  name: "The Ozolith",
  scryfallId: "9341ed06-53db-4604-b60a-3ea9129afbc2",
  types: ["Artifact"],
  supertypes: ["Legendary"],
  manaCost: { generic: 1, colors: {} },
  colorIdentity: [],
  triggeredAbilities: [
    {
      event: "leaves-battlefield",
      watches: "controller",
      watchFor: { type: "Creature", withCounter: true },
      effect: { kind: "addCounter", amount: { kind: "event-amount" } },
    },
    {
      event: "begin-combat",
      watches: "controller",
      optional: true,
      onlyIf: { kind: "source-has-counters" },
      effect: { kind: "moveAllCounters", target: { kind: "creature" } },
    },
  ],
  tier: "scripted",
};

/*
 * "Until end of turn, creatures you control get +2/+2 and gain menace and
 * 'Whenever this creature attacks, you gain 1 life.'"
 *
 * The third clause is a whole triggered ability handed out for the turn, which
 * is why `effectiveTriggers` exists: a creature can now have an ability its
 * printed card does not list, and no fire site may read the printed list.
 */
export const ROOT_MANIPULATION: CardDefinition = {
  id: "root-manipulation",
  name: "Root Manipulation",
  scryfallId: "5390a79c-bc4b-4edb-a845-0d3514986401",
  types: ["Sorcery"],
  manaCost: { generic: 3, colors: { B: 1, G: 1 } },
  colorIdentity: ["B", "G"],
  castEffect: {
    kind: "pumpAll",
    power: 2,
    toughness: 2,
    scope: "controller",
    grants: ["Menace"],
    grantsTriggers: [{ event: "attacks", effect: { kind: "gainLife", amount: 1, who: "controller" } }],
  },
  tier: "scripted",
};

/*
 * "Menace. Ward-Pay 3 life. Magecraft - Whenever you cast or copy an instant or
 * sorcery spell, create a 1/1 black and green Pest creature token with 'When
 * this token dies, you gain 1 life.'"
 *
 * The "or copy" half is not modelled: nothing in this engine copies a spell, so
 * there is no event to watch. Every other way this card makes a Pest works, and
 * the day copying exists this trigger is already watching the right thing.
 */
export const SEDGEMOOR_WITCH: CardDefinition = {
  id: "sedgemoor-witch",
  name: "Sedgemoor Witch",
  scryfallId: "e900c1eb-968b-4046-b824-c167a7a5b682",
  types: ["Creature"],
  subtypes: ["Human", "Warlock"],
  manaCost: { generic: 2, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 3,
  toughness: 2,
  keywords: ["Menace", "Ward"],
  wardLifeCost: 3,
  triggeredAbilities: [
    {
      event: "spell-cast",
      watches: "any",
      watchFor: { type: ["Instant", "Sorcery"], controlledBy: "you" },
      effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-bg-11-pest-dies-gain-life" },
    },
  ],
  tier: "scripted",
};


export const TOKEN_BG_11_INSECT: CardDefinition = {
  id: "token-bg-11-insect",
  name: "Insect",
  types: ["Creature"],
  subtypes: ["Insect"],
  colorIdentity: ["B", "G"],
  power: 1,
  toughness: 1,
  isToken: true,
  tier: "vanilla",
};

export const TOKEN_C_11_SHAPESHIFTER_CHANGELING: CardDefinition = {
  id: "token-c-11-shapeshifter-changeling",
  name: "Shapeshifter",
  scryfallId: "f15f2638-3895-459a-84af-fb91de06c395",
  types: ["Creature"],
  subtypes: ["Shapeshifter"],
  colorIdentity: [],
  power: 1,
  toughness: 1,
  keywords: ["Changeling"],
  isToken: true,
  tier: "scripted",
};

/*
 * "Target creature gets +1/+0 and gains infect until end of turn."
 *
 * Infect is granted for the turn like any other keyword, and everything that
 * follows from it - poison to a player, -1/-1 counters to a creature - falls
 * out of `damageCreature` and `damagePlayer` rather than out of this card.
 */
export const TAINTED_STRIKE: CardDefinition = {
  id: "tainted-strike",
  name: "Tainted Strike",
  scryfallId: "d0f82007-99f6-4c6c-8182-ee631c33531f",
  types: ["Instant"],
  manaCost: { generic: 0, colors: { B: 1 } },
  colorIdentity: ["B"],
  castEffect: { kind: "pump", power: 1, toughness: 0, target: { kind: "creature" }, grants: ["Infect"] },
  tier: "scripted",
};

/*
 * "{T}: Add one mana of any color. Put a nest counter on this creature."
 * "{T}, Sacrifice this creature: Create a 2/2 green Spider creature token with
 * reach for each counter on this creature. Activate only as a sorcery."
 *
 * Nest counters are not +1/+1 counters - they change no stats and exist only to
 * be counted - so they live in `otherCounters`, and the second ability counts
 * both piles because "each counter on this creature" means all of them.
 */
export const TWITCHING_DOLL: CardDefinition = {
  id: "twitching-doll",
  name: "Twitching Doll",
  scryfallId: "416c025b-e40e-4d95-a774-ba3961f43808",
  types: ["Artifact", "Creature"],
  subtypes: ["Spider", "Toy"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 2,
  toughness: 2,
  activatedAbilities: [
    ...(["W", "U", "B", "R", "G"] as const).map((color) => ({
      cost: { tap: true },
      effect: { kind: "addMana" as const, color, amount: 1 },
      addsOtherCounterToSelf: 1,
    })),
    {
      cost: { tap: true, sacrificeSelf: true },
      sorcerySpeedOnly: true,
      effect: {
        kind: "createToken",
        count: { kind: "count", of: { what: "counters-on-source" } },
        tokenDefinitionId: "token-g-12-spider-reach",
      },
    },
  ],
  tier: "scripted",
};

/*
 * "At the beginning of your first main phase, mill three cards. Then you may
 * pay {1} and 3 life. If you do, put a card from among those cards into your
 * hand."
 *
 * One effect rather than a mill beside a choice, because the choice is over the
 * cards *this* mill produced - a set that exists only inside this resolution.
 */
export const RIPPLES_OF_UNDEATH: CardDefinition = {
  id: "ripples-of-undeath",
  name: "Ripples of Undeath",
  scryfallId: "a201d1bc-e3fe-4f59-bd48-3683996ac308",
  types: ["Enchantment"],
  manaCost: { generic: 1, colors: { B: 1 } },
  colorIdentity: ["B"],
  triggeredAbilities: [
    {
      event: "first-main",
      watches: "controller",
      effect: {
        kind: "millThenMayTake",
        amount: 3,
        cost: { mana: { generic: 1, colors: {} }, life: 3 },
      },
    },
  ],
  tier: "scripted",
};

/*
 * "Draw cards equal to the greatest power among creatures you control. You may
 * cast a spell with mana value 5 or less from your hand without paying its mana
 * cost."
 */
export const RISHKARS_EXPERTISE: CardDefinition = {
  id: "rishkars-expertise",
  name: "Rishkar's Expertise",
  scryfallId: "efa9d2dc-b3b8-4475-bbfc-2db457ee4ffd",
  types: ["Sorcery"],
  manaCost: { generic: 4, colors: { G: 2 } },
  colorIdentity: ["G"],
  castEffect: {
    kind: "sequence",
    effects: [
      { kind: "draw", amount: { kind: "count", of: { what: "greatest-power" } } },
      { kind: "castFreeFromHand", maxManaValue: 5 },
    ],
  },
  tier: "scripted",
};

/*
 * "Devour 1. At the beginning of your end step, create a number of 1/1 black
 * and green Pest creature tokens equal to the number of +1/+1 counters on this
 * creature. They have 'When this token dies, you gain 1 life.'"
 *
 * Devour is asked as it arrives rather than as a trigger, because the counters
 * have to be on it before anything else reads the board.
 */
export const RIBTRUSS_ROASTER: CardDefinition = {
  id: "ribtruss-roaster",
  name: "Ribtruss Roaster",
  scryfallId: "8217100d-8244-4565-97bd-6c0f38c3e2f0",
  types: ["Creature"],
  subtypes: ["Troll", "Druid"],
  manaCost: { generic: 4, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 3,
  toughness: 3,
  devour: 1,
  triggeredAbilities: [
    {
      event: "end-step",
      watches: "controller",
      effect: {
        kind: "createToken",
        count: { kind: "count", of: { what: "counters-on-source" } },
        tokenDefinitionId: "token-bg-11-pest-dies-gain-life",
      },
    },
  ],
  tier: "scripted",
};

/*
 * "Skip your draw step. At the beginning of your end step, you may pay any
 * amount of life. If you do, draw that many cards. Your maximum hand size is
 * five. If a card or token would be put into your graveyard from anywhere,
 * exile it instead."
 *
 * Four lines and every one of them matters together: the replacement is what
 * stops the drawn cards ever coming back, and the hand size is what makes the
 * draw a real cost rather than free storage.
 */
export const NECRODOMINANCE: CardDefinition = {
  id: "necrodominance",
  name: "Necrodominance",
  scryfallId: "ffc0109c-f939-4424-820e-d6e60cacd794",
  types: ["Enchantment"],
  supertypes: ["Legendary"],
  manaCost: { generic: 0, colors: { B: 3 } },
  colorIdentity: ["B"],
  staticRules: { skipDrawStep: true, maxHandSize: 5 },
  replacementEffects: [{ kind: "graveyard-to-exile" }],
  triggeredAbilities: [
    { event: "end-step", watches: "controller", effect: { kind: "payLifeDrawThatMany" } },
  ],
  tier: "weird",
};

/*
 * "Landfall - Whenever a land you control enters, create a 1/1 green Insect
 * creature token. If you control six or more lands, create a token that's a
 * copy of this creature instead."
 *
 * "Instead" is one branch, not two abilities - a card written as two would make
 * two tokens per land once the sixth was down.
 */
export const SCUTE_SWARM: CardDefinition = {
  id: "scute-swarm",
  name: "Scute Swarm",
  scryfallId: "ea630ba1-22f9-4a10-bdc6-0d03128214f4",
  types: ["Creature"],
  subtypes: ["Insect"],
  manaCost: { generic: 2, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 1,
  toughness: 1,
  triggeredAbilities: [
    {
      event: "landfall",
      watches: "controller",
      effect: {
        kind: "conditional",
        condition: { kind: "controls-lands", count: 6 },
        then: { kind: "createCopyToken", of: "self" },
        otherwise: { kind: "createToken", count: 1, tokenDefinitionId: "token-g-11-insect" },
      },
    },
  ],
  tier: "scripted",
};

/*
 * "When this enchantment enters, create X 1/1 colorless Shapeshifter creature
 * tokens with changeling. Creature tokens you control have '{T}: Add one mana
 * of any color.'"
 *
 * The second line grants a whole activated ability, which is why nothing may
 * read `CardDefinition.activatedAbilities` directly any more - see
 * `effectiveActivated`.
 */
export const SPRINGLEAF_PARADE: CardDefinition = {
  id: "springleaf-parade",
  name: "Springleaf Parade",
  scryfallId: "44265489-645a-43b0-bc1f-726905b06876",
  types: ["Enchantment"],
  manaCost: { generic: 0, colors: { G: 2 }, x: 1 },
  colorIdentity: ["G"],
  staticBuff: {
    power: 0,
    toughness: 0,
    includesSelf: false,
    tokensOnly: true,
    grantsAbilities: (["W", "U", "B", "R", "G"] as const).map((color) => ({
      cost: { tap: true },
      effect: { kind: "addMana" as const, color, amount: 1 },
    })),
  },
  triggeredAbilities: [
    {
      event: "enters-battlefield",
      effect: {
        kind: "createToken",
        count: { kind: "x" },
        tokenDefinitionId: "token-c-11-shapeshifter-changeling",
      },
    },
  ],
  tier: "scripted",
};

/*
 * Grist, the Hunger Tide - the first planeswalker.
 *
 * "As long as Grist isn't on the battlefield, it's a 1/1 Insect creature in
 * addition to its other types" is the opposite of every other
 * characteristic-defining ability here: it applies everywhere *except* play,
 * which is why `typesOf` reads it rather than anything that looks at permanents.
 *
 * The +1 is the one looping ability in the pool, and it is capped: a library
 * full of Insects would otherwise run until it emptied.
 */
export const GRIST_THE_HUNGER_TIDE: CardDefinition = {
  id: "grist-the-hunger-tide",
  name: "Grist, the Hunger Tide",
  scryfallId: "1925dc45-4dee-4772-aa16-3b4ca54be6c7",
  types: ["Planeswalker"],
  subtypes: ["Grist"],
  supertypes: ["Legendary"],
  manaCost: { generic: 1, colors: { B: 1, G: 1 } },
  colorIdentity: ["B", "G"],
  loyalty: 3,
  alsoCreatureOffBattlefield: { power: 1, toughness: 1, subtypes: ["Insect"] },
  canBeCommander: true,
  loyaltyAbilities: [
    {
      cost: 1,
      label: "Create a 1/1 black and green Insect creature token, then mill a card. If an Insect card was milled this way, put a loyalty counter on Grist and repeat this process.",
      effect: {
        kind: "repeatWhileMilledMatches",
        subtype: "Insect",
        addLoyalty: 1,
        max: 20,
        body: {
          kind: "sequence",
          effects: [
            { kind: "createToken", count: 1, tokenDefinitionId: "token-bg-11-insect" },
            { kind: "mill", amount: 1 },
          ],
        },
      },
    },
    {
      cost: -2,
      label: "You may sacrifice a creature. When you do, destroy target creature or planeswalker.",
      effect: {
        kind: "sacrificeChosen",
        optional: true,
        then: { kind: "destroy", target: { kind: "permanent", cardTypes: ["Creature", "Planeswalker"] } },
      },
    },
    {
      cost: -5,
      label: "Each opponent loses life equal to the number of creature cards in your graveyard.",
      effect: {
        kind: "loseLife",
        who: "each-opponent",
        amount: { kind: "count", of: { what: "creature-cards-in-your-graveyard" } },
      },
    },
  ],
  tier: "weird",
};


/*
 * "{X}{X}{G} - Destroy up to X target artifacts and/or enchantments. Create
 * twice X 1/1 black and green Pest creature tokens with 'When this token dies,
 * you gain 1 life.'"
 *
 * Three different numbers on one card: the {X}{X} charges X twice, "up to X"
 * is a target count, and "twice X" doubles the tokens. They are three separate
 * readings of the same announced value, which is why `x` is a count on the
 * cost, a `TargetCount` on the selector, and a multiplier on the Amount.
 */
export const PEST_INFESTATION: CardDefinition = {
  id: "pest-infestation",
  name: "Pest Infestation",
  scryfallId: "c9b8626d-d3d8-4460-9adf-112f48f173f6",
  types: ["Sorcery"],
  manaCost: { generic: 0, colors: { G: 1 }, x: 2 },
  colorIdentity: ["G"],
  castEffect: {
    kind: "sequence",
    effects: [
      {
        kind: "destroy",
        target: {
          kind: "permanent",
          cardTypes: ["Artifact", "Enchantment"],
          count: { min: 0, max: "x" },
        },
      },
      {
        kind: "createToken",
        count: { kind: "x", multiply: 2 },
        tokenDefinitionId: "token-bg-11-pest-dies-gain-life",
      },
    ],
  },
  tier: "scripted",
};

/*
 * "Choose two target players. Each of them searches their library for a card,
 * then shuffles and puts that card on top."
 *
 * Two targets is the whole card - it is symmetrical on purpose, and a version
 * that only tutored for you would be a one-mana Vampiric Tutor.
 */
export const SCHEMING_SYMMETRY: CardDefinition = {
  id: "scheming-symmetry",
  name: "Scheming Symmetry",
  scryfallId: "01acc50b-856d-442d-9880-1a892b40643b",
  types: ["Sorcery"],
  manaCost: { generic: 0, colors: { B: 1 } },
  colorIdentity: ["B"],
  castEffect: {
    kind: "searchLibrary",
    destination: "library-top",
    who: "each-target-player",
    target: { kind: "player", count: { min: 2, max: 2 } },
  },
  tier: "scripted",
};

/*
 * "At the beginning of your end step, you may sacrifice an artifact, creature,
 * enchantment, land, or planeswalker. If you do, each opponent may sacrifice a
 * permanent of their choice that shares a card type with it. For each opponent
 * who doesn't, that player loses 2 life and you draw a card."
 *
 * The punishment is what declining costs, which is why the offer to the
 * opponents is optional and the "if they don't" half lives on the choice.
 */
export const BRAIDS_ARISEN_NIGHTMARE: CardDefinition = {
  id: "braids-arisen-nightmare",
  name: "Braids, Arisen Nightmare",
  scryfallId: "f96223d0-04c4-40c2-87a9-0c6bc74adddb",
  types: ["Creature"],
  subtypes: ["Nightmare"],
  supertypes: ["Legendary"],
  manaCost: { generic: 1, colors: { B: 2 } },
  colorIdentity: ["B"],
  power: 3,
  toughness: 3,
  canBeCommander: true,
  triggeredAbilities: [
    {
      event: "end-step",
      watches: "controller",
      effect: {
        kind: "sacrificeChosen",
        optional: true,
        types: ["Artifact", "Creature", "Enchantment", "Land", "Planeswalker"],
        then: {
          kind: "offerSacrificeToOpponents",
          sharesTypeWith: "the-sacrificed-permanent",
          ifDeclined: {
            kind: "sequence",
            effects: [
              { kind: "loseLife", amount: 2, who: "target", target: { kind: "player" } },
              { kind: "draw", amount: 1 },
            ],
          },
        },
      },
    },
  ],
  tier: "weird",
};

/*
 * "Flying. When Moseo enters, create a 1/1 black and green Pest creature token
 * with 'Whenever this token attacks, you gain 1 life.' Infusion - At the
 * beginning of your end step, if you gained life this turn, return up to one
 * target creature card with mana value X or less from your graveyard to the
 * battlefield, where X is the amount of life you gained this turn."
 *
 * The cap moves during the turn, so the legal targets move with it - which is
 * why `maxManaValue` is an `Amount` read when the trigger is put on the stack
 * rather than a number baked into the card.
 */
export const MOSEO_VEINS_NEW_DEAN: CardDefinition = {
  id: "moseo-veins-new-dean",
  name: "Moseo, Vein's New Dean",
  scryfallId: "6877180c-22a1-4c4d-9178-316f4c34661b",
  types: ["Creature"],
  subtypes: ["Bird", "Skeleton", "Warlock"],
  supertypes: ["Legendary"],
  manaCost: { generic: 2, colors: { B: 1 } },
  colorIdentity: ["B"],
  power: 2,
  toughness: 1,
  keywords: ["Flying"],
  canBeCommander: true,
  triggeredAbilities: [
    {
      event: "enters-battlefield",
      effect: {
        kind: "createToken",
        count: 1,
        tokenDefinitionId: "token-bg-11-pest-attacks-gain-life",
      },
    },
    {
      event: "end-step",
      watches: "controller",
      onlyIf: { kind: "gained-life-this-turn" },
      effect: {
        kind: "returnFromGraveyard",
        destination: "battlefield",
        target: {
          kind: "card-in-your-graveyard",
          cardType: "Creature",
          maxManaValue: { kind: "count", of: { what: "life-gained-this-turn" } },
          count: { min: 0, max: 1 },
        },
      },
    },
  ],
  tier: "weird",
};

/*
 * "Suspend 2-{1}{B}. Search your library for a card, put that card into your
 * hand, then shuffle."
 *
 * The card has no mana cost at all: suspending it is the only way to play it,
 * which is what makes a two-mana unconditional tutor fair.
 */
export const PROFANE_TUTOR: CardDefinition = {
  id: "profane-tutor",
  name: "Profane Tutor",
  scryfallId: "2afc6f7d-ab59-4d64-bd11-6bd0fd4bfcd2",
  types: ["Sorcery"],
  colorIdentity: ["B"],
  suspend: { timeCounters: 2, cost: { generic: 1, colors: { B: 1 } } },
  castEffect: { kind: "searchLibrary", destination: "hand" },
  tier: "scripted",
};

/*
 * "Bestow {1}{G}. Enchanted creature gets +1/+1. Landfall - Whenever a land you
 * control enters, you may pay {1}{G} if this permanent is attached to a
 * creature you control. If you do, create a token that's a copy of that
 * creature. If you didn't create a token this way, create a 1/1 green Insect
 * creature token."
 *
 * Three shapes at once: an alternative cost that changes what the card *is*, a
 * static buff that reaches exactly one permanent, and an optional payment whose
 * "if you didn't" branch is half the card.
 */
export const SPRINGHEART_NANTUKO: CardDefinition = {
  id: "springheart-nantuko",
  name: "Springheart Nantuko",
  scryfallId: "54a3ea87-005e-4985-b2a5-21711d0b71c0",
  types: ["Enchantment", "Creature"],
  subtypes: ["Insect", "Monk"],
  manaCost: { generic: 1, colors: { G: 1 } },
  colorIdentity: ["G"],
  power: 1,
  toughness: 1,
  bestowCost: { generic: 1, colors: { G: 1 } },
  staticBuff: { power: 1, toughness: 1 },
  triggeredAbilities: [
    {
      event: "landfall",
      watches: "controller",
      effect: {
        kind: "conditional",
        condition: { kind: "attached-to-a-creature" },
        then: {
          kind: "mayPay",
          cost: { mana: { generic: 1, colors: { G: 1 } } },
          then: { kind: "createCopyToken", of: "attached-creature" },
          otherwise: { kind: "createToken", count: 1, tokenDefinitionId: "token-g-11-insect" },
        },
        otherwise: { kind: "createToken", count: 1, tokenDefinitionId: "token-g-11-insect" },
      },
    },
  ],
  tier: "weird",
};

/*
 * "For each opponent, you create a 1/1 black and green Pest creature token with
 * 'When this token dies, you gain 1 life.'" - the spell half of Eccentric
 * Pestfinder, castable only as a copy while the creature is prepared.
 */
export const TURN_STONES: CardDefinition = {
  id: "turn-stones",
  name: "Turn Stones",
  scryfallId: "508e1dd7-edbd-4b76-90bc-ff58c55b58a3",
  types: ["Sorcery"],
  manaCost: { generic: 0, colors: { B: 1, G: 1 } },
  colorIdentity: ["B", "G"],
  isBackFace: true,
  castEffect: {
    kind: "createToken",
    count: { kind: "count", of: { what: "opponents" } },
    tokenDefinitionId: "token-bg-11-pest-dies-gain-life",
  },
  tier: "scripted",
};

/*
 * "Trample. At the beginning of each end step, if you gained life this turn,
 * this creature becomes prepared. (While it's prepared, you may cast a copy of
 * its spell. Doing so unprepares it.)"
 *
 * A copy of a spell is not a card, so casting it moves nothing: the back face's
 * effect goes on the stack by itself and the creature stays where it is with
 * its flag cleared. See `castPreparedSpell`.
 */
export const ECCENTRIC_PESTFINDER: CardDefinition = {
  id: "eccentric-pestfinder",
  name: "Eccentric Pestfinder",
  scryfallId: "508e1dd7-edbd-4b76-90bc-ff58c55b58a3",
  types: ["Creature"],
  subtypes: ["Troll", "Druid"],
  manaCost: { generic: 2, colors: { B: 1, G: 1 } },
  colorIdentity: ["B", "G"],
  power: 5,
  toughness: 5,
  keywords: ["Trample"],
  backFaceId: "turn-stones",
  triggeredAbilities: [
    {
      event: "end-step",
      watches: "any",
      onlyIf: { kind: "gained-life-this-turn" },
      effect: { kind: "becomePrepared" },
    },
  ],
  tier: "weird",
};


// --- Winota list, step 1: the mana base ---
export const ANCIENT_TOMB: CardDefinition = {
  id: "ancient-tomb",
  name: "Ancient Tomb",
  scryfallId: "bd3d4b4b-cf31-4f89-8140-9650edb03c7b",
  types: ["Land"],
  colorIdentity: [],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 2 }, damageToController: 2 }],
  tier: "vanilla",
};

export const ARID_MESA: CardDefinition = {
  id: "arid-mesa",
  name: "Arid Mesa",
  scryfallId: "25ac5405-df7b-4097-914a-022cb18e20d4",
  types: ["Land"],
  colorIdentity: [],
  activatedAbilities: [{ cost: { tap: true, payLife: 1, sacrificeSelf: true }, effect: { kind: "searchLibrary", cardType: "Land", subtypes: ["Mountain", "Plains"], destination: "battlefield" } }],
  tier: "vanilla",
};

export const BATTLEFIELD_FORGE: CardDefinition = {
  id: "battlefield-forge",
  name: "Battlefield Forge",
  scryfallId: "c47c1bf5-f11e-4f86-b20b-5d899a11dc56",
  types: ["Land"],
  colorIdentity: ["R", "W"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 }, damageToController: 1 }, { cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 }, damageToController: 1 }],
  tier: "vanilla",
};

export const CLIFFTOP_RETREAT: CardDefinition = {
  id: "clifftop-retreat",
  name: "Clifftop Retreat",
  scryfallId: "4a7f7767-1959-4812-8654-0a22634096b1",
  types: ["Land"],
  colorIdentity: ["R", "W"],
  entersTapped: true,
  entersTappedUnless: { kind: "controls-subtype", subtypes: ["Mountain", "Plains"] },
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }],
  tier: "vanilla",
};

export const PLATEAU: CardDefinition = {
  id: "plateau",
  name: "Plateau",
  scryfallId: "bb979a96-a57d-4fb5-8ebe-0bd398272abe",
  types: ["Land"],
  subtypes: ["Mountain", "Plains"],
  colorIdentity: ["R", "W"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }],
  tier: "vanilla",
};

export const SCALDING_TARN: CardDefinition = {
  id: "scalding-tarn",
  name: "Scalding Tarn",
  scryfallId: "71e491c5-8c07-449b-b2f1-ffa052e6d311",
  types: ["Land"],
  colorIdentity: [],
  activatedAbilities: [{ cost: { tap: true, payLife: 1, sacrificeSelf: true }, effect: { kind: "searchLibrary", cardType: "Land", subtypes: ["Island", "Mountain"], destination: "battlefield" } }],
  tier: "vanilla",
};

export const SUNBILLOW_VERGE: CardDefinition = {
  id: "sunbillow-verge",
  name: "Sunbillow Verge",
  scryfallId: "94ed132f-b818-4dbf-9b4a-e5acb067e0a4",
  types: ["Land"],
  colorIdentity: ["R", "W"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 }, activateOnlyIf: { kind: "controls-subtype", subtypes: ["Mountain", "Plains"] } }],
  tier: "vanilla",
};

export const ARCANE_SIGNET: CardDefinition = {
  id: "arcane-signet",
  name: "Arcane Signet",
  scryfallId: "1cad1bd2-7c56-4ce0-99a6-b2a49c1288dd",
  types: ["Artifact"],
  manaCost: { generic: 2, colors: {} },
  colorIdentity: [],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 }, colorFrom: "commander-identity" }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 }, colorFrom: "commander-identity" }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 }, colorFrom: "commander-identity" }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 }, colorFrom: "commander-identity" }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 }, colorFrom: "commander-identity" }],
  tier: "vanilla",
};

export const ORNITHOPTER_OF_PARADISE: CardDefinition = {
  id: "ornithopter-of-paradise",
  name: "Ornithopter of Paradise",
  scryfallId: "18bbdc6c-b6c9-4f89-8f0a-6266e53c1fb9",
  types: ["Artifact", "Creature"],
  subtypes: ["Thopter"],
  manaCost: { generic: 2, colors: {} },
  colorIdentity: [],
  power: 0,
  toughness: 2,
  keywords: ["Flying"],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } }, { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } }],
  tier: "scripted",
};

export const ORNITHOPTER: CardDefinition = {
  id: "ornithopter",
  name: "Ornithopter",
  scryfallId: "305078a5-ac18-4721-bba2-3434eba5b1cf",
  types: ["Artifact", "Creature"],
  subtypes: ["Thopter"],
  manaCost: { generic: 0, colors: {} },
  colorIdentity: [],
  power: 0,
  toughness: 2,
  keywords: ["Flying"],
  tier: "vanilla",
};

export const PHYREXIAN_WALKER: CardDefinition = {
  id: "phyrexian-walker",
  name: "Phyrexian Walker",
  scryfallId: "9f8a3979-2947-4692-8b2f-d4c07c534777",
  types: ["Artifact", "Creature"],
  subtypes: ["Phyrexian", "Construct"],
  manaCost: { generic: 0, colors: {} },
  colorIdentity: [],
  power: 0,
  toughness: 3,
  tier: "vanilla",
};

/**
 * "{T}, Sacrifice this artifact: Add one mana of any color."
 *
 * Five abilities, one per colour - the shape Birds of Paradise established, and
 * the one `activatedAbilities` already is. The generator refuses this card for
 * want of a pattern, not for want of an engine feature: tap, sacrificeSelf and
 * addMana all exist.
 */
export const LOTUS_PETAL: CardDefinition = {
  id: "lotus-petal",
  name: "Lotus Petal",
  scryfallId: "f85ab5f9-508e-45de-8fa1-ce1f16552ffc",
  types: ["Artifact"],
  manaCost: { generic: 0, colors: {} },
  colorIdentity: [],
  activatedAbilities: [
    { cost: { tap: true, sacrificeSelf: true }, effect: { kind: "addMana", color: "W", amount: 1 } },
    { cost: { tap: true, sacrificeSelf: true }, effect: { kind: "addMana", color: "U", amount: 1 } },
    { cost: { tap: true, sacrificeSelf: true }, effect: { kind: "addMana", color: "B", amount: 1 } },
    { cost: { tap: true, sacrificeSelf: true }, effect: { kind: "addMana", color: "R", amount: 1 } },
    { cost: { tap: true, sacrificeSelf: true }, effect: { kind: "addMana", color: "G", amount: 1 } },
  ],
  tier: "scripted",
};

/** "{T}, Pay 1 life: Add one mana of any color." */
export const MANA_CONFLUENCE: CardDefinition = {
  id: "mana-confluence",
  name: "Mana Confluence",
  scryfallId: "504a69eb-3c2d-4bb1-b117-252b15acf0c2",
  types: ["Land"],
  colorIdentity: [],
  activatedAbilities: [
    { cost: { tap: true, payLife: 1 }, effect: { kind: "addMana", color: "W", amount: 1 } },
    { cost: { tap: true, payLife: 1 }, effect: { kind: "addMana", color: "U", amount: 1 } },
    { cost: { tap: true, payLife: 1 }, effect: { kind: "addMana", color: "B", amount: 1 } },
    { cost: { tap: true, payLife: 1 }, effect: { kind: "addMana", color: "R", amount: 1 } },
    { cost: { tap: true, payLife: 1 }, effect: { kind: "addMana", color: "G", amount: 1 } },
  ],
  tier: "scripted",
};

/**
 * "As this land enters, you may pay 2 life. If you don't, it enters tapped."
 *
 * Overgrown Tomb's cycle, in Boros. Its mana comes from its printed basic land
 * types, which is why the ability list is two entries and not a reading of
 * rules text - the card's text is nothing but the shock clause.
 */
export const SACRED_FOUNDRY: CardDefinition = {
  id: "sacred-foundry",
  name: "Sacred Foundry",
  scryfallId: "a7758cc6-4e18-48a5-8720-5f42b5cd9d31",
  types: ["Land"],
  subtypes: ["Mountain", "Plains"],
  colorIdentity: ["R", "W"],
  entersTappedUnlessPayLife: 2,
  activatedAbilities: [
    { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } },
    { cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } },
  ],
  tier: "scripted",
};


/**
 * "{T}, Pay 1 life: Add {R} or {W}." and "{1}, {T}, Sacrifice this land: Draw
 * a card."
 *
 * A horizon land: the mana costs life, and the land cashes itself in for a card
 * once it has done its job. Both halves are ordinary `ActivatedAbilityCost`
 * fields - payLife on the two mana abilities, mana plus tap plus sacrificeSelf
 * on the draw - which is why this is a fixture rather than engine work.
 */
export const SUNBAKED_CANYON: CardDefinition = {
  id: "sunbaked-canyon",
  name: "Sunbaked Canyon",
  scryfallId: "c36820fa-ee86-4206-9a0d-737a67cf5208",
  types: ["Land"],
  colorIdentity: ["R", "W"],
  activatedAbilities: [
    { cost: { tap: true, payLife: 1 }, effect: { kind: "addMana", color: "R", amount: 1 } },
    { cost: { tap: true, payLife: 1 }, effect: { kind: "addMana", color: "W", amount: 1 } },
    { cost: { mana: { generic: 1, colors: {} }, tap: true, sacrificeSelf: true }, effect: { kind: "draw", amount: 1 } },
  ],
  tier: "scripted",
};


/**
 * "Whenever a non-Human creature you control attacks, look at the top six cards
 * of your library. You may put a Human creature card from among them onto the
 * battlefield tapped and attacking. It gains indestructible until end of turn.
 * Put the rest of the cards on the bottom of your library in a random order."
 *
 * The deployed Human was never *declared* as an attacker, so it sets nothing
 * off - not another Winota trigger, and not its own attack trigger. That is
 * rule 508.3b and it is what stops a Human that happens to be non-Human-
 * adjacent from looping.
 */
export const WINOTA_JOINER_OF_FORCES: CardDefinition = {
  id: "winota-joiner-of-forces",
  name: "Winota, Joiner of Forces",
  scryfallId: "5dd13a6c-23d3-44ce-a628-cb1c19d777c4",
  types: ["Creature"],
  supertypes: ["Legendary"],
  subtypes: ["Human", "Warrior"],
  manaCost: { generic: 2, colors: { R: 1, W: 1 } },
  colorIdentity: ["R", "W"],
  power: 4,
  toughness: 4,
  canBeCommander: true,
  triggeredAbilities: [
    {
      event: "permanent-attacks",
      watches: "controller",
      watchFor: { type: "Creature", excludeSubtype: "Human", controlledBy: "you" },
      effect: {
        kind: "deployFromTop",
        amount: 6,
        cardType: "Creature",
        subtype: "Human",
        tapped: true,
        attacking: true,
        grants: ["Indestructible"],
      },
    },
  ],
  tier: "weird",
};


// --- Winota list, batch 2: the hate pieces ---
/** Each player can't cast more than one noncreature spell each turn. */
export const DEAFENING_SILENCE: CardDefinition = {
  id: "deafening-silence",
  name: "Deafening Silence",
  scryfallId: "6072d9b0-d3c7-46f4-bd24-095bb13c4dea",
  types: ["Enchantment"],
  manaCost: { generic: 0, colors: { W: 1 } },
  colorIdentity: ["W"],
  staticRestrictions: [{ kind: "cast-limit", perTurn: 1, only: "noncreature" }],
  tier: "scripted",
};

/** Each player who has cast a nonartifact spell this turn can't cast additional nonartifact spells. */
export const ETHERSWORN_CANONIST: CardDefinition = {
  id: "ethersworn-canonist",
  name: "Ethersworn Canonist",
  scryfallId: "abc8e0f8-fdb9-4f24-a3e3-439f6cc3ebdc",
  types: ["Artifact", "Creature"],
  subtypes: ["Human", "Cleric"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 2,
  staticRestrictions: [{ kind: "cast-limit", perTurn: 1, only: "nonartifact" }],
  tier: "scripted",
};

/** During your turn, your opponents can't cast spells or activate abilities of artifacts, creatures, or enchantments. */
export const GRAND_ABOLISHER: CardDefinition = {
  id: "grand-abolisher",
  name: "Grand Abolisher",
  scryfallId: "ee793ed2-7d59-4640-8868-ad486600df2c",
  types: ["Creature"],
  subtypes: ["Human", "Cleric"],
  manaCost: { generic: 0, colors: { W: 2 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 2,
  staticRestrictions: [
    { kind: "opponents-cannot-cast", duringYourTurnOnly: true },
    {
      kind: "cannot-activate",
      types: ["Artifact", "Creature", "Enchantment"],
      who: "opponents",
      duringYourTurnOnly: true,
    },
  ],
  tier: "scripted",
};

/** Your opponents can't cast spells from anywhere other than their hands. */
export const DRANNITH_MAGISTRATE: CardDefinition = {
  id: "drannith-magistrate",
  name: "Drannith Magistrate",
  scryfallId: "98b0a4a8-9319-451b-9b79-b0bca7a41e91",
  types: ["Creature"],
  subtypes: ["Human", "Wizard"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 3,
  staticRestrictions: [{ kind: "opponents-cast-from-hand-only" }],
  tier: "scripted",
};

/** Each player can't draw more than one card each turn. */
export const SPIRIT_OF_THE_LABYRINTH: CardDefinition = {
  id: "spirit-of-the-labyrinth",
  name: "Spirit of the Labyrinth",
  scryfallId: "f44e5128-e146-4e46-b313-a40d82719d1d",
  types: ["Creature", "Enchantment"],
  subtypes: ["Spirit"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 1,
  staticRestrictions: [{ kind: "draw-limit", perTurn: 1 }],
  tier: "scripted",
};

/** Flying // Activated abilities of artifacts, creatures, and planeswalkers can't be activated. */
export const CLARION_CONQUEROR: CardDefinition = {
  id: "clarion-conqueror",
  name: "Clarion Conqueror",
  scryfallId: "f892d156-371c-4391-8ae6-25513c5032b0",
  types: ["Creature"],
  subtypes: ["Dragon"],
  manaCost: { generic: 2, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 3,
  keywords: ["Flying"],
  staticRestrictions: [
    { kind: "cannot-activate", types: ["Artifact", "Creature", "Planeswalker"], who: "each-player" },
  ],
  tier: "scripted",
};

/** Each player can't cast more than one spell each turn. // {4}{R}, Sacrifice this enchantment: It deals 5 damage to any target. */
export const HIGH_NOON: CardDefinition = {
  id: "high-noon",
  name: "High Noon",
  scryfallId: "9995e0e6-7c9c-4fef-8fd2-8fb1622e6ec8",
  types: ["Enchantment"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["R", "W"],
  staticRestrictions: [{ kind: "cast-limit", perTurn: 1 }],
  activatedAbilities: [
    {
      cost: { mana: { generic: 4, colors: { R: 1 } }, sacrificeSelf: true },
      effect: { kind: "damage", amount: 5, target: { kind: "any-target" } },
    },
  ],
  tier: "scripted",
};

/** Your opponents can't cast spells this turn. */
export const SILENCE: CardDefinition = {
  id: "silence",
  name: "Silence",
  scryfallId: "1c2b13b1-31f0-4676-88a7-53f3a190e9a2",
  types: ["Instant"],
  manaCost: { generic: 0, colors: { W: 1 } },
  colorIdentity: ["W"],
  castEffect: { kind: "restrictThisTurn", restriction: { kind: "opponents-cannot-cast" } },
  tier: "scripted",
};


/**
 * "As this creature enters, choose a number. Noncreature spells with mana value
 * equal to the chosen number can't be cast."
 *
 * The first card whose restriction reads something off its own permanent rather
 * than off the card, and the reason `activeRestrictions` carries the instance's
 * `chosenOnEntry`.
 */
export const SANCTUM_PRELATE: CardDefinition = {
  id: "sanctum-prelate",
  name: "Sanctum Prelate",
  scryfallId: "1d95a7dd-2803-4164-8979-d7e8e8085ca2",
  types: ["Creature"],
  subtypes: ["Human", "Cleric"],
  manaCost: { generic: 1, colors: { W: 2 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 2,
  enterChoice: { kind: "number", max: 16 },
  staticRestrictions: [{ kind: "cannot-cast-chosen-mana-value", only: "noncreature" }],
  tier: "weird",
};


/**
 * "If this creature hasn't been exerted this turn, you may exert it as it
 * attacks. When you do, untap all other creatures you control and after this
 * phase, there is an additional combat phase."
 *
 * Exert is modelled as an optional attack trigger whose first step is the
 * exert itself, rather than as a choice made during the declaration. The
 * difference is invisible in play: an attack trigger goes on the stack in the
 * declare-attackers step and resolves before blockers are declared, which is
 * exactly when the real choice is made and seen.
 */
export const COMBAT_CELEBRANT: CardDefinition = {
  id: "combat-celebrant",
  name: "Combat Celebrant",
  scryfallId: "28b63c3d-2e55-4343-b49a-11fa602ec473",
  types: ["Creature"],
  subtypes: ["Human", "Warrior"],
  manaCost: { generic: 2, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 4,
  toughness: 1,
  triggeredAbilities: [
    {
      event: "attacks",
      // "you **may** exert it", and "**if** this creature hasn't been exerted
      // this turn" - the second is what stops a Celebrant untapped by another
      // one exerting twice in a turn.
      optional: true,
      onlyIf: { kind: "source-not-exerted" },
      effect: {
        kind: "sequence",
        effects: [
          { kind: "exertSelf" },
          // "all **other** creatures you control" - the Celebrant is the one
          // attacking, and stays tapped.
          { kind: "untapAll", excludeSource: true },
          { kind: "additionalCombatPhase" },
        ],
      },
    },
  ],
  tier: "weird",
};

/**
 * "Whenever Raph & Leo attack, if it's the first combat phase of the turn,
 * untap one or two target attacking creatures. After this phase, there is an
 * additional combat phase."
 *
 * The intervening-if is the card's own brake: without it the second combat
 * phase would trigger a third, and so on for as long as the game lasted.
 */
export const RAPH_AND_LEO_SIBLING_RIVALS: CardDefinition = {
  id: "raph-and-leo-sibling-rivals",
  name: "Raph & Leo, Sibling Rivals",
  scryfallId: "49293f77-5d7b-4106-b485-db6ce0ed37e6",
  types: ["Creature"],
  supertypes: ["Legendary"],
  subtypes: ["Mutant", "Ninja", "Turtle"],
  // The first hybrid cost in the pool: {1}{R/W}{R/W}, three mana, either half
  // of each symbol paid with red or white.
  manaCost: { generic: 1, colors: {}, hybrid: [["R", "W"], ["R", "W"]] },
  colorIdentity: ["R", "W"],
  power: 2,
  toughness: 4,
  canBeCommander: true,
  triggeredAbilities: [
    {
      event: "attacks",
      onlyIf: { kind: "first-combat-phase" },
      effect: {
        kind: "sequence",
        effects: [
          {
            kind: "untap",
            target: {
              kind: "permanent",
              cardTypes: ["Creature"],
              attacking: true,
              count: { min: 1, max: 2 },
            },
          },
          { kind: "additionalCombatPhase" },
        ],
      },
    },
  ],
  tier: "weird",
};

/**
 * "Attacking creatures you control have double strike."
 *
 * No "other", so it gives itself double strike when it attacks - which is why
 * `includesSelf` is on. Needed no new engine work at all: the conditional
 * keyword-granting static has existed since the anthem layer learned
 * `restriction: "attacking"` for Blight Mound. Its only blocker was the
 * generator refusing hybrid costs.
 */
export const BLADE_HISTORIAN: CardDefinition = {
  id: "blade-historian",
  name: "Blade Historian",
  scryfallId: "a46d64ec-aca4-428e-bce6-66cd755c8cc3",
  types: ["Creature"],
  subtypes: ["Human", "Cleric"],
  manaCost: { generic: 0, colors: {}, hybrid: [["R", "W"], ["R", "W"], ["R", "W"], ["R", "W"]] },
  colorIdentity: ["R", "W"],
  power: 2,
  toughness: 3,
  staticBuff: {
    power: 0,
    toughness: 0,
    grants: ["Double Strike"],
    restriction: "attacking",
    includesSelf: true,
  },
  tier: "scripted",
};


/** Flash // {1}, Sacrifice this creature: Destroy target artifact or enchantment. */
export const CATHAR_COMMANDO: CardDefinition = {
  id: "cathar-commando",
  name: "Cathar Commando",
  scryfallId: "7cd21530-ca72-4986-a0f2-142b9f23c413",
  types: ["Creature"],
  subtypes: ["Human", "Soldier"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 1,
  keywords: ["Flash"],
  activatedAbilities: [
    {
      cost: { mana: { generic: 1, colors: {} }, sacrificeSelf: true },
      effect: {
        kind: "destroy",
        target: { kind: "permanent", cardTypes: ["Artifact", "Enchantment"] },
      },
    },
  ],
  tier: "scripted",
};

/**
 * "Search your library for an artifact or enchantment card, reveal it, then
 * shuffle and put that card on top."
 *
 * The first search in the pool that names two card types. Note the printed
 * order of the last clause - the shuffle happens first, which `resolveSearch`
 * has handled since Sylvan Tutor.
 */
export const ENLIGHTENED_TUTOR: CardDefinition = {
  id: "enlightened-tutor",
  name: "Enlightened Tutor",
  scryfallId: "1c9675fb-1a89-420f-aea8-50e0642f549c",
  types: ["Instant"],
  manaCost: { generic: 0, colors: { W: 1 } },
  colorIdentity: ["W"],
  castEffect: {
    kind: "searchLibrary",
    cardType: ["Artifact", "Enchantment"],
    destination: "library-top",
  },
  tier: "scripted",
};

/** When this creature enters, search your library for a creature card with power 2 or less. */
export const IMPERIAL_RECRUITER: CardDefinition = {
  id: "imperial-recruiter",
  name: "Imperial Recruiter",
  scryfallId: "05bd329b-5707-42fc-af1c-084cc604e805",
  types: ["Creature"],
  subtypes: ["Human", "Advisor"],
  manaCost: { generic: 2, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 1,
  toughness: 1,
  triggeredAbilities: [
    {
      event: "enters-battlefield",
      effect: { kind: "searchLibrary", cardType: "Creature", maxPower: 2, destination: "hand" },
    },
  ],
  tier: "scripted",
};

/**
 * The toughness half of the same pair.
 *
 * "You **may** search" needs no flag: declining a search is always legal - you
 * search, take nothing, and shuffle - so the optional wording and the
 * compulsory one land in the same place. Imperial Recruiter above prints no
 * "may" and behaves identically, which is the real rule rather than a shortcut.
 */
export const RECRUITER_OF_THE_GUARD: CardDefinition = {
  id: "recruiter-of-the-guard",
  name: "Recruiter of the Guard",
  scryfallId: "8e4c6ba1-1abc-478f-9b7c-97e9e3c92fb0",
  types: ["Creature"],
  subtypes: ["Human", "Soldier"],
  manaCost: { generic: 2, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 1,
  triggeredAbilities: [
    {
      event: "enters-battlefield",
      effect: { kind: "searchLibrary", cardType: "Creature", maxToughness: 2, destination: "hand" },
    },
  ],
  tier: "scripted",
};

/**
 * A tutor and a Silence stapled to a 3/3.
 *
 * The second ability is the same shape Silence takes - a turn-long restriction
 * rather than anything on a permanent - which is why it survives the creature
 * being sacrificed to pay for it.
 */
export const RANGER_CAPTAIN_OF_EOS: CardDefinition = {
  id: "ranger-captain-of-eos",
  name: "Ranger-Captain of Eos",
  scryfallId: "af3928b4-813a-4120-8799-de34235d60ac",
  types: ["Creature"],
  subtypes: ["Human", "Soldier", "Ranger"],
  manaCost: { generic: 1, colors: { W: 2 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 3,
  triggeredAbilities: [
    {
      event: "enters-battlefield",
      effect: { kind: "searchLibrary", cardType: "Creature", maxManaValue: 1, destination: "hand" },
    },
  ],
  activatedAbilities: [
    {
      cost: { sacrificeSelf: true },
      effect: {
        kind: "restrictThisTurn",
        restriction: { kind: "opponents-cannot-cast", only: "noncreature" },
      },
    },
  ],
  tier: "scripted",
};

/**
 * "Exile target creature. Its controller may search their library for a basic
 * land card, put that card onto the battlefield tapped, then shuffle."
 *
 * The search is somebody else's - `who: "target-controller"` reads the player
 * off the spell's own target, the same way Assassin's Trophy hands its victim a
 * basic. Their "may" is the ordinary right to search and take nothing, which is
 * how a player declines the land.
 */
export const PATH_TO_EXILE: CardDefinition = {
  id: "path-to-exile",
  name: "Path to Exile",
  scryfallId: "95ca89ea-1200-4bb4-ae4b-af35d3ccd35b",
  types: ["Instant"],
  manaCost: { generic: 0, colors: { W: 1 } },
  colorIdentity: ["W"],
  castEffect: {
    kind: "sequence",
    effects: [
      { kind: "exile", target: { kind: "creature" } },
      {
        kind: "searchLibrary",
        basicLandOnly: true,
        destination: "battlefield",
        tapped: true,
        who: "target-controller",
      },
    ],
  },
  tier: "scripted",
};


/**
 * "As this land enters, choose a creature type. {T}: Add {C}. {T}: Add one mana
 * of any color. Spend this mana only to cast a creature spell of the chosen
 * type, and that spell can't be countered."
 *
 * The colourless half is unrestricted and the coloured half is not, which is
 * why they are separate abilities rather than one with a rider - a Cavern tapped
 * for {C} pays for anything.
 *
 * "Any color" is written out as five abilities, the same way Command Tower is:
 * one ability per colour is what `activatedAbilities` already is, and it needs
 * no new concept.
 */
export const CAVERN_OF_SOULS: CardDefinition = {
  id: "cavern-of-souls",
  name: "Cavern of Souls",
  scryfallId: "3aad15a2-8a1b-4460-9b06-e85863081878",
  types: ["Land"],
  colorIdentity: [],
  enterChoice: { kind: "creature-type" },
  activatedAbilities: [
    { cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 1 } },
    {
      cost: { tap: true },
      effect: { kind: "addMana", color: "W", amount: 1 },
      producesRestrictedMana: { kind: "creature-of-chosen-type", grantsUncounterable: true },
    },
    {
      cost: { tap: true },
      effect: { kind: "addMana", color: "U", amount: 1 },
      producesRestrictedMana: { kind: "creature-of-chosen-type", grantsUncounterable: true },
    },
    {
      cost: { tap: true },
      effect: { kind: "addMana", color: "B", amount: 1 },
      producesRestrictedMana: { kind: "creature-of-chosen-type", grantsUncounterable: true },
    },
    {
      cost: { tap: true },
      effect: { kind: "addMana", color: "R", amount: 1 },
      producesRestrictedMana: { kind: "creature-of-chosen-type", grantsUncounterable: true },
    },
    {
      cost: { tap: true },
      effect: { kind: "addMana", color: "G", amount: 1 },
      producesRestrictedMana: { kind: "creature-of-chosen-type", grantsUncounterable: true },
    },
  ],
  tier: "weird",
};

/**
 * "As this land enters, choose a basic land type. Then you may pay 2 life. If
 * you don't, it enters tapped. This land is the chosen type."
 *
 * The two questions are asked in the opposite order to the printed one: the
 * life is offered as the land arrives and the type is chosen immediately after,
 * because `enterChoice` resolves once the permanent is on the battlefield. Both
 * are the same player's and neither answer depends on the other, so the only
 * difference is which prompt appears first.
 */
export const MULTIVERSAL_PASSAGE: CardDefinition = {
  id: "multiversal-passage",
  name: "Multiversal Passage",
  scryfallId: "f5fb426a-5618-4dd4-9c51-0cc847be8c1d",
  types: ["Land"],
  colorIdentity: [],
  enterChoice: { kind: "basic-land-type" },
  entersTappedUnlessPayLife: 2,
  becomesChosenBasicType: true,
  tier: "weird",
};

/**
 * Two continuous effects with different lifetimes, which is why `staticBuff`
 * takes a list: the granted abilities are unconditional and the +2/+2 comes and
 * goes with the fourth Human.
 *
 * Neither says "other", so both reach Greymond himself - he is a Human Soldier.
 */
export const GREYMOND_AVACYNS_STALWART: CardDefinition = {
  id: "greymond-avacyns-stalwart",
  name: "Greymond, Avacyn's Stalwart",
  scryfallId: "b7848325-c46e-4e63-90d0-c9524380eb63",
  types: ["Creature"],
  supertypes: ["Legendary"],
  subtypes: ["Human", "Soldier"],
  manaCost: { generic: 2, colors: { W: 2 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 4,
  canBeCommander: true,
  enterChoice: { kind: "keywords", from: ["First Strike", "Vigilance", "Lifelink"], count: 2 },
  staticBuff: [
    { power: 0, toughness: 0, subtype: "Human", includesSelf: true, grantsChosenOnEntry: true },
    {
      power: 2,
      toughness: 2,
      subtype: "Human",
      includesSelf: true,
      condition: { kind: "controls-subtype", subtypes: ["Human"], count: 4 },
    },
  ],
  tier: "weird",
};

/**
 * The hate piece batch 2 could not finish. Its first line is the same
 * `cast-limit` High Noon prints; the second is the first rule in the pool that
 * changes how somebody else's permanents arrive.
 */
export const ARCHON_OF_EMERIA: CardDefinition = {
  id: "archon-of-emeria",
  name: "Archon of Emeria",
  scryfallId: "228c1650-da3c-4099-91b6-18e3873c9cdb",
  types: ["Creature"],
  subtypes: ["Archon"],
  manaCost: { generic: 2, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 3,
  keywords: ["Flying"],
  staticRestrictions: [{ kind: "cast-limit", perTurn: 1 }],
  staticRules: { opponentsNonbasicLandsEnterTapped: true },
  tier: "scripted",
};

/** If an opponent would search a library, they see the top four cards and no more. */
export const AVEN_MINDCENSOR: CardDefinition = {
  id: "aven-mindcensor",
  name: "Aven Mindcensor",
  scryfallId: "d4cf468f-4e9d-4551-a0ed-10bd6a2316ad",
  types: ["Creature"],
  subtypes: ["Bird", "Wizard"],
  manaCost: { generic: 2, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 1,
  keywords: ["Flash", "Flying"],
  staticRules: { opponentSearchesTopCards: 4 },
  tier: "scripted",
};

/**
 * Four lines, and the two that look alike are not:
 *
 * - "This spell can't be countered" protects the Squelcher itself while it is
 *   on the stack, where none of its own statics apply yet.
 * - "Spells you control can't be countered" protects everything else, from the
 *   battlefield, for as long as it is there.
 *
 * The ward it hands out is not a keyword grant. Ward carries a cost and
 * `grants` is a list of keywords with none, so it has a field of its own.
 */
export const HEXING_SQUELCHER: CardDefinition = {
  id: "hexing-squelcher",
  name: "Hexing Squelcher",
  scryfallId: "674960ce-ff33-4d5e-a24a-a4582b2e9809",
  types: ["Creature"],
  subtypes: ["Goblin", "Sorcerer"],
  manaCost: { generic: 1, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 2,
  toughness: 2,
  keywords: ["Ward"],
  wardLifeCost: 2,
  cantBeCountered: true,
  staticRules: { yourSpellsCantBeCountered: true },
  staticBuff: { power: 0, toughness: 0, grantsWardLife: 2 },
  tier: "weird",
};


/** The Goblin the Jeskai half makes. Lifelink and haste are granted for the turn, not printed. */
export const TOKEN_R_11_GOBLIN: CardDefinition = {
  id: "token-r-11-goblin",
  name: "Goblin",
  types: ["Creature"],
  subtypes: ["Goblin"],
  colorIdentity: ["R"],
  power: 1,
  toughness: 1,
  isToken: true,
  tier: "vanilla",
};

/**
 * Two halves that share nothing but the choice made as it entered.
 *
 * The Mardu half is a `staticRules` entry keyed to its own mode rather than a
 * flag, because both halves are printed on the card and only one is live - a
 * plain boolean would make a Jeskai Siege double triggers as well. The Jeskai
 * half is an ordinary upkeep trigger with an intervening-if on the same choice.
 */
export const WINDCRAG_SIEGE: CardDefinition = {
  id: "windcrag-siege",
  name: "Windcrag Siege",
  scryfallId: "31a8329b-23a1-4c49-a579-a5da8d01435a",
  types: ["Enchantment"],
  manaCost: { generic: 1, colors: { R: 1, W: 1 } },
  colorIdentity: ["R", "W"],
  enterChoice: { kind: "mode", options: ["Mardu", "Jeskai"] },
  staticRules: { doublesAttackTriggersWhenMode: "Mardu" },
  triggeredAbilities: [
    {
      event: "upkeep",
      watches: "controller",
      onlyIf: { kind: "chosen-mode", mode: "Jeskai" },
      effect: {
        kind: "createToken",
        count: 1,
        tokenDefinitionId: "token-r-11-goblin",
        grants: ["Lifelink", "Haste"],
      },
    },
  ],
  tier: "weird",
};

/*
 * Batch 5: copying and borrowing.
 *
 * The four cards here that make token copies are the first in the pool to copy
 * something they *point at* rather than their own source, and the first to hand
 * the copy a scheduled ending - "sacrifice it at the beginning of the next end
 * step" is an ability that exists once, belongs to no permanent, and fires
 * later. Zealous Conscripts and Homeward Path are the pair that pull control and
 * ownership apart.
 */

export const TOKEN_W_11_CAT: CardDefinition = {
  id: "token-w-11-cat",
  name: "Cat",
  types: ["Creature"],
  subtypes: ["Cat"],
  colorIdentity: ["W"],
  power: 1,
  toughness: 1,
  isToken: true,
  tier: "vanilla",
};

export const KIKI_JIKI_MIRROR_BREAKER: CardDefinition = {
  id: "kiki-jiki-mirror-breaker",
  name: "Kiki-Jiki, Mirror Breaker",
  scryfallId: "a2ff0ee3-9600-4c7d-acec-6ec90595384e",
  types: ["Creature"],
  supertypes: ["Legendary"],
  subtypes: ["Goblin", "Shaman"],
  manaCost: { generic: 2, colors: { R: 3 } },
  colorIdentity: ["R"],
  power: 2,
  toughness: 2,
  keywords: ["Haste"],
  activatedAbilities: [
    {
      cost: { tap: true },
      effect: {
        kind: "createCopyToken",
        of: "target",
        // "nonlegendary" is the whole reason this is not a two-card combo with
        // any legend on the board: a copy of one dies to the legend rule at once.
        target: { kind: "creature", controlledBy: "you", nonlegendary: true },
        grants: ["Haste"],
        delayedEnd: "sacrifice",
      },
    },
  ],
  tier: "weird",
};

export const RIONYA_FIRE_DANCER: CardDefinition = {
  id: "rionya-fire-dancer",
  name: "Rionya, Fire Dancer",
  scryfallId: "086e68b5-0f89-46d0-9a04-7f8658a9ab53",
  types: ["Creature"],
  supertypes: ["Legendary"],
  subtypes: ["Human", "Wizard"],
  manaCost: { generic: 3, colors: { R: 2 } },
  colorIdentity: ["R"],
  power: 3,
  toughness: 4,
  triggeredAbilities: [
    {
      event: "begin-combat",
      watches: "controller",
      effect: {
        kind: "createCopyToken",
        of: "target",
        // "**another** target creature you control" - never itself, which is
        // what `excludeSource` is for and why it refuses to be asked without one.
        target: { kind: "creature", controlledBy: "you", excludeSource: true },
        count: { kind: "count", of: { what: "one-plus-instants-and-sorceries-cast-this-turn" } },
        grants: ["Haste"],
        delayedEnd: "exile",
      },
    },
  ],
  tier: "weird",
};

export const OCELOT_PRIDE: CardDefinition = {
  id: "ocelot-pride",
  name: "Ocelot Pride",
  scryfallId: "89cf6f57-230f-497e-a14e-ad1e8737fd42",
  types: ["Creature"],
  subtypes: ["Cat"],
  manaCost: { generic: 0, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 1,
  keywords: ["First Strike", "Lifelink"],
  ascend: true,
  triggeredAbilities: [
    {
      event: "end-step",
      watches: "controller",
      // The intervening-if gates the whole ability, both sentences of it: no
      // life gained means no Cat and no copies.
      onlyIf: { kind: "gained-life-this-turn" },
      effect: {
        kind: "sequence",
        effects: [
          { kind: "createToken", count: 1, tokenDefinitionId: "token-w-11-cat" },
          {
            /*
             * "**Then** if you have the city's blessing..." - a second sentence
             * inside the same resolution, which is why it is a sequence rather
             * than a second ability. The Cat the first step just made is one of
             * the tokens this copies, and that is the card rather than a
             * coincidence.
             */
            kind: "conditional",
            condition: { kind: "citys-blessing" },
            then: { kind: "copyTokensThatEnteredThisTurn" },
          },
        ],
      },
    },
  ],
  tier: "weird",
};

export const ZEALOUS_CONSCRIPTS: CardDefinition = {
  id: "zealous-conscripts",
  name: "Zealous Conscripts",
  scryfallId: "b5ca6c08-bfe0-4021-b6ad-e235c8905661",
  types: ["Creature"],
  subtypes: ["Human", "Warrior"],
  manaCost: { generic: 4, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 3,
  toughness: 3,
  keywords: ["Haste"],
  triggeredAbilities: [
    {
      event: "enters-battlefield",
      effect: {
        kind: "gainControl",
        // "target **permanent**" - any type at all, which is what makes this an
        // untapper for a Kiki-Jiki as readily as a Threaten for a creature.
        target: { kind: "permanent" },
        untap: true,
        grants: ["Haste"],
      },
    },
  ],
  tier: "weird",
};

export const HOMEWARD_PATH: CardDefinition = {
  id: "homeward-path",
  name: "Homeward Path",
  scryfallId: "54734347-eee7-4c52-b514-7342afeccabd",
  types: ["Land"],
  colorIdentity: [],
  activatedAbilities: [
    { cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 1 } },
    { cost: { tap: true }, effect: { kind: "returnControlToOwners" } },
  ],
  tier: "scripted",
};

/*
 * Protection, the plan's batch 6.
 *
 * All three grant it the same way and none of them carries a colour: "the color
 * of your choice" is named as the ability *resolves*, which is what makes Mother
 * of Runes a card you hold up rather than a card you cast. See
 * `grantProtection` and `PendingColorChoice`.
 */

export const MOTHER_OF_RUNES: CardDefinition = {
  id: "mother-of-runes",
  name: "Mother of Runes",
  scryfallId: "a5e19147-e459-43a6-8ef0-e37968a462e3",
  types: ["Creature"],
  subtypes: ["Human", "Cleric"],
  manaCost: { generic: 0, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 1,
  activatedAbilities: [
    {
      cost: { tap: true },
      effect: {
        kind: "grantProtection",
        // "Target creature **you control**" - and unlike Giver of Runes below, it
        // may point at itself.
        target: { kind: "creature", controlledBy: "you" },
      },
    },
  ],
  tier: "weird",
};

export const GIVER_OF_RUNES: CardDefinition = {
  id: "giver-of-runes",
  name: "Giver of Runes",
  scryfallId: "4e117771-5a8b-4812-b487-32ba34b7f724",
  types: ["Creature"],
  subtypes: ["Kor", "Cleric"],
  manaCost: { generic: 0, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 2,
  activatedAbilities: [
    {
      cost: { tap: true },
      effect: {
        kind: "grantProtection",
        // "**Another** target creature you control" - never itself, which is the
        // real cost of the extra toughness and the colourless option.
        target: { kind: "creature", controlledBy: "you", excludeSource: true },
        orColorless: true,
      },
    },
  ],
  tier: "weird",
};

export const ALSEID_OF_LIFES_BOUNTY: CardDefinition = {
  id: "alseid-of-lifes-bounty",
  name: "Alseid of Life's Bounty",
  scryfallId: "36c8c075-9597-412e-9fc4-9d73b4405d12",
  // An Enchantment Creature: both types, in the order the card prints them.
  types: ["Enchantment", "Creature"],
  subtypes: ["Nymph"],
  manaCost: { generic: 0, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 1,
  keywords: ["Lifelink"],
  activatedAbilities: [
    {
      cost: { mana: { generic: 1, colors: {} }, sacrificeSelf: true },
      effect: {
        kind: "grantProtection",
        // "Target creature **or enchantment** you control" - the wider selector,
        // because this one can also save an Aura.
        target: { kind: "permanent", cardTypes: ["Creature", "Enchantment"], controlledBy: "you" },
      },
    },
  ],
  tier: "weird",
};

/**
 * Signal Pest - {1} 0/1 Artifact Creature, Pest.
 *
 * "Battle cry (Whenever this creature attacks, each other attacking creature
 * gets +1/+0 until end of turn.)"
 * "This creature can't be blocked except by creatures with flying or reach."
 *
 * A 0/1 that never wants to be blocked and never deals the damage itself: it
 * attacks to make the rest of the team bigger, which is why the printed power is
 * 0 and why `excludeSelf` on the pump is the whole ability rather than a detail.
 *
 * Battle cry is written out as the trigger its reminder text describes rather
 * than added to `Keyword`. A keyword would have to be understood by
 * `declareAttackers`; this is exactly an attacks trigger, and the pool already
 * has several.
 */
export const SIGNAL_PEST: CardDefinition = {
  id: "signal-pest",
  name: "Signal Pest",
  scryfallId: "be065962-f2ed-4ab9-be6b-bfc66d63ff4e",
  types: ["Artifact", "Creature"],
  subtypes: ["Pest"],
  manaCost: { generic: 1, colors: {} },
  colorIdentity: [],
  power: 0,
  toughness: 1,
  triggeredAbilities: [
    {
      event: "attacks",
      effect: {
        kind: "pumpAll",
        power: 1,
        toughness: 0,
        /*
         * The card says "each other attacking creature", which in a two-player
         * game is every other attacker there can be: only the active player
         * declares attackers, so "creatures you control" and "creatures" name
         * the same set here. Written as the controller's for that reason, and it
         * would need widening the day the engine has a card that attacks on
         * somebody else's turn.
         */
        scope: "controller",
        restriction: "attacking",
        excludeSelf: true,
      },
    },
  ],
  blockRestriction: { kind: "only-with-keyword", keywords: ["Flying", "Reach"] },
  tier: "scripted",
};

/**
 * Gingerbrute - {1} 1/1 Artifact Creature, Food Golem.
 *
 * "Haste"
 * "{1}: This creature can't be blocked this turn except by creatures with haste."
 * "{2}, {T}, Sacrifice this creature: You gain 3 life."
 *
 * The evasion is the card: one mana makes a 1/1 unblockable against almost every
 * board, because a creature with haste on defence is rare. The gain-3-life
 * ability is the Food half, written with `sacrificeSelf` on the cost so it
 * resolves from the graveyard the way a fetchland does.
 */
export const GINGERBRUTE: CardDefinition = {
  id: "gingerbrute",
  name: "Gingerbrute",
  scryfallId: "09a4578a-7dc6-4da3-93ee-913b10be5740",
  types: ["Artifact", "Creature"],
  subtypes: ["Food", "Golem"],
  manaCost: { generic: 1, colors: {} },
  colorIdentity: [],
  power: 1,
  toughness: 1,
  keywords: ["Haste"],
  activatedAbilities: [
    {
      cost: { mana: { generic: 1, colors: {} } },
      effect: {
        kind: "restrictBlockersThisTurn",
        restriction: { kind: "only-with-keyword", keywords: ["Haste"] },
      },
    },
    {
      cost: { mana: { generic: 2, colors: {} }, tap: true, sacrificeSelf: true },
      effect: { kind: "gainLife", amount: 3, who: "controller" },
    },
  ],
  tier: "scripted",
};

/**
 * Starting Town - a Land, subtype Town.
 *
 * "This land enters tapped unless it's your first, second, or third turn of the game."
 * "{T}: Add {C}."
 * "{T}, Pay 1 life: Add one mana of any color."
 *
 * A land that is a dual on turn one and a Wastes on turn six, which is the whole
 * design: it is played early or not at all. `entersTappedUnless` carries the
 * condition rather than the card being written as flatly tapped, for the same
 * reason every other tapland here does - a flat `entersTapped` would be strictly
 * worse than the printed card on exactly the turns it is meant for.
 *
 * The any-colour half is five abilities, one per colour, which is how this engine
 * holds a free choice of colour: the renderer folds them back into one line.
 */
export const STARTING_TOWN: CardDefinition = {
  id: "starting-town",
  name: "Starting Town",
  scryfallId: "fc7d1912-7e27-49ef-bd98-375d975a42b0",
  types: ["Land"],
  subtypes: ["Town"],
  // No coloured pip anywhere on the card: "one mana of any color" is not a
  // colour indicator, so this is a colourless-identity land and legal in any
  // deck. Scryfall agrees.
  colorIdentity: [],
  entersTapped: true,
  entersTappedUnless: { kind: "within-your-first-turns", turns: 3 },
  activatedAbilities: [
    { cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 1 } },
    { cost: { tap: true, payLife: 1 }, effect: { kind: "addMana", color: "W", amount: 1 } },
    { cost: { tap: true, payLife: 1 }, effect: { kind: "addMana", color: "U", amount: 1 } },
    { cost: { tap: true, payLife: 1 }, effect: { kind: "addMana", color: "B", amount: 1 } },
    { cost: { tap: true, payLife: 1 }, effect: { kind: "addMana", color: "R", amount: 1 } },
    { cost: { tap: true, payLife: 1 }, effect: { kind: "addMana", color: "G", amount: 1 } },
  ],
  tier: "scripted",
};

/**
 * Mox Amber - {0} Legendary Artifact.
 *
 * "{T}: Add one mana of any color among legendary creatures and planeswalkers you control."
 *
 * A free rock that makes nothing at all on an empty board, and the engine has to
 * enforce exactly that: `colorFrom` narrows which of the five halves are legal,
 * so a Mox Amber with no legend out is offered no colour and taps for nothing.
 * Written as five abilities for the same reason Starting Town is.
 *
 * There is no colourless half. The card only makes coloured mana, which is why
 * it is a blank rather than a Sol Ring in the wrong deck.
 */
export const MOX_AMBER: CardDefinition = {
  id: "mox-amber",
  name: "Mox Amber",
  scryfallId: "66024e69-ad60-4c9a-a0ca-da138d33ad80",
  types: ["Artifact"],
  supertypes: ["Legendary"],
  manaCost: { generic: 0, colors: {} },
  colorIdentity: [],
  activatedAbilities: [
    { cost: { tap: true }, colorFrom: "your-legendary-permanents", effect: { kind: "addMana", color: "W", amount: 1 } },
    { cost: { tap: true }, colorFrom: "your-legendary-permanents", effect: { kind: "addMana", color: "U", amount: 1 } },
    { cost: { tap: true }, colorFrom: "your-legendary-permanents", effect: { kind: "addMana", color: "B", amount: 1 } },
    { cost: { tap: true }, colorFrom: "your-legendary-permanents", effect: { kind: "addMana", color: "R", amount: 1 } },
    { cost: { tap: true }, colorFrom: "your-legendary-permanents", effect: { kind: "addMana", color: "G", amount: 1 } },
  ],
  tier: "scripted",
};

/**
 * City of Brass - a Land.
 *
 * "Whenever this land becomes tapped, it deals 1 damage to you."
 * "{T}: Add one mana of any color."
 *
 * Perfect fixing that bleeds you for every point of it, and the trigger is the
 * whole card: written without it this is a strictly better Command Tower.
 *
 * "Becomes tapped" is not "when you tap it for mana" - it fires however the land
 * becomes tapped, which is why the engine has one door for tapping rather than a
 * check inside the mana ability. The damage goes on the stack as a triggered
 * ability, so it lands after the mana is already in the pool.
 */
export const CITY_OF_BRASS: CardDefinition = {
  id: "city-of-brass",
  name: "City of Brass",
  scryfallId: "c21565d0-fc40-4d89-9b27-87c03385e0af",
  types: ["Land"],
  colorIdentity: [],
  triggeredAbilities: [
    {
      event: "becomes-tapped",
      effect: { kind: "damageController", amount: 1 },
    },
  ],
  activatedAbilities: [
    { cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } },
    { cost: { tap: true }, effect: { kind: "addMana", color: "U", amount: 1 } },
    { cost: { tap: true }, effect: { kind: "addMana", color: "B", amount: 1 } },
    { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } },
    { cost: { tap: true }, effect: { kind: "addMana", color: "G", amount: 1 } },
  ],
  tier: "scripted",
};

/**
 * City of Traitors - a Land.
 *
 * "When you play another land, sacrifice this land."
 * "{T}: Add {C}{C}."
 *
 * Two colourless mana on turn one, at the price of your next land drop killing
 * it. The trigger is `land-played` rather than `landfall`, and the distinction is
 * the card: a land put onto the battlefield by a fetchland or a ramp spell was
 * never *played*, and a City of Traitors written as landfall would sacrifice
 * itself to its own controller's Arid Mesa.
 *
 * "Another" is the watcher default, so playing the City itself does not set it
 * off - see `fireWatchers`.
 */
export const CITY_OF_TRAITORS: CardDefinition = {
  id: "city-of-traitors",
  name: "City of Traitors",
  scryfallId: "71624139-a255-48be-93ca-594a4beba487",
  types: ["Land"],
  colorIdentity: [],
  triggeredAbilities: [
    {
      event: "land-played",
      watches: "controller",
      effect: { kind: "sacrifice", what: "self" },
    },
  ],
  activatedAbilities: [{ cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 2 } }],
  tier: "scripted",
};

/**
 * Blinkmoth Nexus - a Land.
 *
 * "{T}: Add {C}."
 * "{1}: This land becomes a 1/1 Blinkmoth artifact creature with flying until end of turn. It's still a land."
 * "{1}, {T}: Target Blinkmoth creature gets +1/+1 until end of turn."
 *
 * A land that dodges sorcery-speed removal by not being a creature until it needs
 * to be. The third ability targets "Blinkmoth creature", which includes the
 * animated land itself - so the two abilities together are a 2/2 flier for three
 * mana, and `hasCreatureType` has to see the subtype the animation granted for
 * that to work at all.
 *
 * Note the {T} on the third ability: a Nexus that pumped itself did not tap for
 * mana this turn, and one that attacked cannot pump at all.
 */
export const BLINKMOTH_NEXUS: CardDefinition = {
  id: "blinkmoth-nexus",
  name: "Blinkmoth Nexus",
  scryfallId: "3ac535c1-9ef3-45b5-8959-7e79589d47ad",
  types: ["Land"],
  colorIdentity: [],
  activatedAbilities: [
    { cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 1 } },
    {
      cost: { mana: { generic: 1, colors: {} } },
      effect: {
        kind: "animateSelf",
        power: 1,
        toughness: 1,
        subtypes: ["Blinkmoth"],
        keywords: ["Flying"],
      },
    },
    {
      cost: { mana: { generic: 1, colors: {} }, tap: true },
      effect: {
        kind: "pump",
        power: 1,
        toughness: 1,
        target: { kind: "creature", subtypes: ["Blinkmoth"] },
      },
    },
  ],
  tier: "scripted",
};

/**
 * Inkmoth Nexus - a Land.
 *
 * "{T}: Add {C}."
 * "{1}: This land becomes a 1/1 Phyrexian Blinkmoth artifact creature with flying and infect until end of turn. It's still a land."
 *
 * The same land with a much worse clock attached: infect means its damage arrives
 * as poison counters, and ten of those end a game whatever the life total says.
 * Infect is already a keyword the engine knows - `damageCreature` and
 * `damagePlayer` both read it - so the animation simply hands it over.
 */
export const INKMOTH_NEXUS: CardDefinition = {
  id: "inkmoth-nexus",
  name: "Inkmoth Nexus",
  scryfallId: "ec50c1c3-885e-47d3-ada7-cc0edbf09df1",
  types: ["Land"],
  colorIdentity: [],
  activatedAbilities: [
    { cost: { tap: true }, effect: { kind: "addMana", color: "C", amount: 1 } },
    {
      cost: { mana: { generic: 1, colors: {} } },
      effect: {
        kind: "animateSelf",
        power: 1,
        toughness: 1,
        // "a 1/1 **Phyrexian Blinkmoth** artifact creature" - two creature types.
        subtypes: ["Phyrexian", "Blinkmoth"],
        keywords: ["Flying", "Infect"],
      },
    },
  ],
  tier: "scripted",
};

/**
 * The 1/1 colourless Spirit two Sokenzan channels into being.
 *
 * Colourless rather than red: the land is red, the tokens are not, and a token
 * definition with a colour identity would quietly fail a deck's colour check the
 * day something counts them.
 */
export const TOKEN_C_11_SPIRIT: CardDefinition = {
  id: "token-c-11-spirit",
  name: "Spirit",
  types: ["Creature"],
  subtypes: ["Spirit"],
  colorIdentity: [],
  power: 1,
  toughness: 1,
  isToken: true,
  tier: "vanilla",
};

/**
 * Simian Spirit Guide - {2}{R} 2/2 Creature, Ape Spirit.
 *
 * "Exile this card from your hand: Add {R}."
 *
 * Nobody casts this card. It is a red mana that costs a card, and it is here for
 * the turn-one play the deck is built around - which is why the ability had to be
 * activatable from hand at all.
 *
 * The exile is a *cost*, so it happens on activation whether or not anything else
 * does, and the mana ability resolves immediately without using the stack.
 */
export const SIMIAN_SPIRIT_GUIDE: CardDefinition = {
  id: "simian-spirit-guide",
  name: "Simian Spirit Guide",
  scryfallId: "0e57335d-4066-4d73-83cd-67a215e01a4e",
  types: ["Creature"],
  subtypes: ["Ape", "Spirit"],
  manaCost: { generic: 2, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 2,
  toughness: 2,
  activatedAbilities: [
    {
      cost: { fromHand: "exile" },
      effect: { kind: "addMana", color: "R", amount: 1 },
    },
  ],
  tier: "scripted",
};

/**
 * Eiganjo, Seat of the Empire - a Legendary Land.
 *
 * "{T}: Add {W}."
 * "Channel - {2}{W}, Discard this card: It deals 4 damage to target attacking or
 * blocking creature. This ability costs {1} less to activate for each legendary
 * creature you control."
 *
 * A land that is never a dead draw: it is a Plains when you need land and a
 * removal spell when you do not. In a deck of legends the channel cost falls
 * towards {W}, which is why the reduction is on the card at all.
 *
 * "Attacking or blocking" is the whole flexibility - it answers the creature that
 * blocked yours as readily as the one attacking you.
 */
export const EIGANJO_SEAT_OF_THE_EMPIRE: CardDefinition = {
  id: "eiganjo-seat-of-the-empire",
  name: "Eiganjo, Seat of the Empire",
  scryfallId: "c375a022-5b57-496d-a802-e4ea8376e9e4",
  types: ["Land"],
  supertypes: ["Legendary"],
  // The {W} in the channel cost is a white mana symbol in the rules text, so the
  // card's identity is white even though the land itself is colourless.
  colorIdentity: ["W"],
  activatedAbilities: [
    { cost: { tap: true }, effect: { kind: "addMana", color: "W", amount: 1 } },
    {
      cost: { mana: { generic: 2, colors: { W: 1 } }, fromHand: "discard" },
      costReducedPer: "legendary-creature-you-control",
      effect: {
        kind: "damage",
        amount: 4,
        target: { kind: "permanent", cardTypes: ["Creature"], attackingOrBlocking: true },
      },
    },
  ],
  tier: "scripted",
};

/**
 * Sokenzan, Crucible of Defiance - a Legendary Land.
 *
 * "{T}: Add {R}."
 * "Channel - {3}{R}, Discard this card: Create two 1/1 colorless Spirit creature
 * tokens. They gain haste until end of turn. This ability costs {1} less to
 * activate for each legendary creature you control."
 *
 * Eiganjo's twin, and the same reasoning: a land that turns into two hasty
 * attackers on the turn the game is decided.
 *
 * The haste is granted rather than printed on the token, which matters - a token
 * definition carrying haste would still have it next turn.
 */
export const SOKENZAN_CRUCIBLE_OF_DEFIANCE: CardDefinition = {
  id: "sokenzan-crucible-of-defiance",
  name: "Sokenzan, Crucible of Defiance",
  scryfallId: "aa548dcd-c1dd-492d-a69f-c65dfeef0633",
  types: ["Land"],
  supertypes: ["Legendary"],
  colorIdentity: ["R"],
  activatedAbilities: [
    { cost: { tap: true }, effect: { kind: "addMana", color: "R", amount: 1 } },
    {
      cost: { mana: { generic: 3, colors: { R: 1 } }, fromHand: "discard" },
      costReducedPer: "legendary-creature-you-control",
      effect: {
        kind: "createToken",
        count: 2,
        tokenDefinitionId: "token-c-11-spirit",
        grants: ["Haste"],
      },
    },
  ],
  tier: "scripted",
};

/**
 * Swords to Plowshares - {W} Instant.
 *
 * "Exile target creature. Its controller gains life equal to its power."
 *
 * The best removal spell ever printed, and the life is the whole reason it is
 * fair: one mana exiles anything, and hands the life straight back to the player
 * who lost the creature.
 *
 * **The order is reversed on purpose.** The card exiles first and then gains
 * life "equal to its power", which the rules read off last-known information -
 * the creature is already gone. Reading the power *before* the exile gives the
 * identical number from a creature that is still on the battlefield, counters
 * and anthems included, and needs no last-known-information machinery for the
 * single card in the pool that wants it. Nothing can respond between the two
 * halves of a resolution, so the swap is invisible in play.
 */
export const SWORDS_TO_PLOWSHARES: CardDefinition = {
  id: "swords-to-plowshares",
  name: "Swords to Plowshares",
  scryfallId: "b4e9c870-23c0-413a-ae39-265f09da16d1",
  types: ["Instant"],
  manaCost: { generic: 0, colors: { W: 1 } },
  colorIdentity: ["W"],
  castEffect: {
    kind: "sequence",
    effects: [
      {
        kind: "gainLife",
        amount: { kind: "target-power" },
        who: "target-controller",
      },
      { kind: "exile", target: { kind: "creature" } },
    ],
  },
  tier: "scripted",
};

/**
 * Gamble - {R} Sorcery.
 *
 * "Search your library for a card, put that card into your hand, discard a card
 * at random, then shuffle."
 *
 * A tutor for anything at all, at the price in the name: the card you just found
 * is in a hand the discard picks from blind. With one card in hand it is a
 * coin flip on your own tutor.
 *
 * The random discard is a separate effect from the pool's ordinary `discard`,
 * and the difference is the whole card - a Gamble whose discard you chose would
 * be an unconditional one-mana tutor.
 */
export const GAMBLE: CardDefinition = {
  id: "gamble",
  name: "Gamble",
  scryfallId: "8e37fae5-ddd0-4e16-8581-71579f89d9c5",
  types: ["Sorcery"],
  manaCost: { generic: 0, colors: { R: 1 } },
  colorIdentity: ["R"],
  castEffect: {
    kind: "sequence",
    effects: [
      // No card type at all: "search your library for a card" really does mean
      // any of them, which is why the card is worth its drawback.
      { kind: "searchLibrary", destination: "hand" },
      { kind: "discardRandom", amount: 1 },
    ],
  },
  tier: "scripted",
};

/**
 * Rite of Flame - {R} Sorcery.
 *
 * "Add {R}{R}, then add {R} for each card named Rite of Flame in each graveyard."
 *
 * A ritual that pays for itself and then some, once one is already in a
 * graveyard - which is why it counts *each* graveyard rather than yours, and by
 * name rather than by owner.
 *
 * The variable half is its own effect rather than an `addMana` with an amount:
 * the mana-source scanners read `addMana` to plan a payment, and an ability whose
 * output nobody can predict would break the auto-tapper. A spell nothing plans
 * around can be as variable as it likes.
 */
export const RITE_OF_FLAME: CardDefinition = {
  id: "rite-of-flame",
  name: "Rite of Flame",
  scryfallId: "c062caf7-f0eb-44db-9f74-e6711a13fada",
  types: ["Sorcery"],
  manaCost: { generic: 0, colors: { R: 1 } },
  colorIdentity: ["R"],
  castEffect: {
    kind: "sequence",
    effects: [
      { kind: "addMana", color: "R", amount: 2 },
      {
        kind: "addManaVariable",
        color: "R",
        amount: { kind: "count", of: { what: "cards-named-this-in-all-graveyards" } },
      },
    ],
  },
  tier: "scripted",
};

/**
 * Pyroblast - {R} Instant.
 *
 * "Choose one -"
 * "- Counter target spell if it's blue."
 * "- Destroy target permanent if it's blue."
 *
 * **Not the same card as Red Elemental Blast**, and the difference is the whole
 * reason both are in the deck. Pyroblast may be pointed at *anything* - so it can
 * be cast at an empty blue board to trigger something, or aimed at a spell that
 * turns out not to be blue - and simply does nothing when the target is not blue.
 * Written with a colour filter on the selector it would be uncastable in exactly
 * the spots where the real card is a bluff.
 */
export const PYROBLAST: CardDefinition = {
  id: "pyroblast",
  name: "Pyroblast",
  scryfallId: "b029eb9a-dd7a-40c2-96c4-0063d9cc002c",
  types: ["Instant"],
  manaCost: { generic: 0, colors: { R: 1 } },
  colorIdentity: ["R"],
  castEffect: {
    kind: "modal",
    modes: [
      {
        label: "Counter target spell if it's blue",
        effect: {
          kind: "ifTargetWas",
          color: "U",
          then: { kind: "counter", target: { kind: "spell" } },
        },
      },
      {
        label: "Destroy target permanent if it's blue",
        effect: {
          kind: "ifTargetWas",
          color: "U",
          then: { kind: "destroy", target: { kind: "permanent" } },
        },
      },
    ],
  },
  tier: "scripted",
};

/**
 * Red Elemental Blast - {R} Instant.
 *
 * "Choose one -"
 * "- Counter target blue spell."
 * "- Destroy target blue permanent."
 *
 * Pyroblast's twin, with the restriction in the *targeting* rather than in the
 * effect: this one cannot be cast at all without something blue to point at.
 */
export const RED_ELEMENTAL_BLAST: CardDefinition = {
  id: "red-elemental-blast",
  name: "Red Elemental Blast",
  scryfallId: "70a45e9b-699e-425a-9f3d-267274830d3e",
  types: ["Instant"],
  manaCost: { generic: 0, colors: { R: 1 } },
  colorIdentity: ["R"],
  castEffect: {
    kind: "modal",
    modes: [
      {
        label: "Counter target blue spell",
        effect: { kind: "counter", target: { kind: "spell", color: "U" } },
      },
      {
        label: "Destroy target blue permanent",
        effect: { kind: "destroy", target: { kind: "permanent", color: "U" } },
      },
    ],
  },
  tier: "scripted",
};

/**
 * Angrath's Marauders - {5}{R}{R} 4/4 Creature, Human Pirate.
 *
 * "If a source you control would deal damage to a permanent or player, it deals
 * double that damage to that permanent or player instead."
 *
 * A replacement effect on damage itself, which is why it reaches everything at
 * once: combat, burn, a painland's own rider. "A source **you control**" is the
 * half that needs the source to be named at every damage site - an opponent's
 * Marauders must not double the burn spell you point at them.
 */
export const ANGRATHS_MARAUDERS: CardDefinition = {
  id: "angraths-marauders",
  name: "Angrath's Marauders",
  scryfallId: "cf0a0bef-ed72-4fdf-9799-6f6430c8a8a7",
  types: ["Creature"],
  subtypes: ["Human", "Pirate"],
  manaCost: { generic: 5, colors: { R: 2 } },
  colorIdentity: ["R"],
  power: 4,
  toughness: 4,
  replacementEffects: [{ kind: "double-damage-you-deal" }],
  tier: "scripted",
};

/**
 * The Treasure token both of batch 8's Pirates make.
 *
 * "{T}, Sacrifice this artifact: Add one mana of any color."
 *
 * Five abilities, one per colour, which is how a free choice of colour is held
 * here - and each of them taps *and* sacrifices, which is what makes a Treasure
 * one mana rather than a Sol Ring.
 */
export const TOKEN_TREASURE: CardDefinition = {
  id: "token-treasure",
  name: "Treasure",
  types: ["Artifact"],
  subtypes: ["Treasure"],
  colorIdentity: [],
  isToken: true,
  activatedAbilities: [
    { cost: { tap: true, sacrificeSelf: true }, effect: { kind: "addMana", color: "W", amount: 1 } },
    { cost: { tap: true, sacrificeSelf: true }, effect: { kind: "addMana", color: "U", amount: 1 } },
    { cost: { tap: true, sacrificeSelf: true }, effect: { kind: "addMana", color: "B", amount: 1 } },
    { cost: { tap: true, sacrificeSelf: true }, effect: { kind: "addMana", color: "R", amount: 1 } },
    { cost: { tap: true, sacrificeSelf: true }, effect: { kind: "addMana", color: "G", amount: 1 } },
  ],
  tier: "scripted",
};

/**
 * Professional Face-Breaker - {2}{R} 2/3 Creature, Human Warrior.
 *
 * "Menace"
 * "Whenever one or more creatures you control deal combat damage to a player, create a Treasure token."
 * "Sacrifice a Treasure: Exile the top card of your library. You may play that card this turn."
 *
 * "One or more" is the whole trigger: it pays out once per combat however many
 * creatures got through, and a version that counted creatures would make three
 * Treasures off a three-creature attack.
 *
 * The second ability is the payoff and the reason the first one matters - the
 * Treasures are card advantage rather than mana, and "play" rather than "cast"
 * means a land off the top is a land drop.
 */
export const PROFESSIONAL_FACE_BREAKER: CardDefinition = {
  id: "professional-face-breaker",
  name: "Professional Face-Breaker",
  scryfallId: "42acbf52-b137-44f0-a815-2817fe8d2da2",
  types: ["Creature"],
  subtypes: ["Human", "Warrior"],
  manaCost: { generic: 2, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 2,
  toughness: 3,
  keywords: ["Menace"],
  triggeredAbilities: [
    {
      event: "creatures-dealt-combat-damage",
      effect: { kind: "createToken", count: 1, tokenDefinitionId: "token-treasure" },
    },
  ],
  activatedAbilities: [
    {
      cost: { sacrificeSubtype: "Treasure" },
      effect: { kind: "exileTopAndMayPlay", from: "you", lands: true },
    },
  ],
  tier: "scripted",
};

/**
 * Ragavan, Nimble Pilferer - {R} 2/1 Legendary Creature, Monkey Pirate.
 *
 * "Whenever Ragavan deals combat damage to a player, create a Treasure token and
 * exile the top card of that player's library. Until end of turn, you may cast
 * that card."
 * "Dash {1}{R}"
 *
 * A one-mana 2/1 that steals a card and a mana every time it connects. "That
 * player's library" is why the trigger carries the player it happened to: the
 * card is exiled from the *defender's* deck and cast by Ragavan's controller,
 * which is the only place in the engine where those two come apart.
 *
 * "Cast", not "play" - a land off the top of their library is not a land drop
 * for you.
 */
export const RAGAVAN_NIMBLE_PILFERER: CardDefinition = {
  id: "ragavan-nimble-pilferer",
  name: "Ragavan, Nimble Pilferer",
  scryfallId: "a9738cda-adb1-47fb-9f4c-ecd930228c4d",
  types: ["Creature"],
  subtypes: ["Monkey", "Pirate"],
  supertypes: ["Legendary"],
  manaCost: { generic: 0, colors: { R: 1 } },
  colorIdentity: ["R"],
  power: 2,
  toughness: 1,
  // "Dash {1}{R}" - a price with two riders, not a discount: haste now, and back
  // to the hand at the beginning of the next end step.
  dashCost: { generic: 1, colors: { R: 1 } },
  triggeredAbilities: [
    {
      event: "combat-damage-to-player",
      effect: {
        kind: "sequence",
        effects: [
          { kind: "createToken", count: 1, tokenDefinitionId: "token-treasure" },
          { kind: "exileTopAndMayPlay", from: "damaged-player", lands: false },
        ],
      },
    },
  ],
  tier: "scripted",
};

/**
 * Eomer, King of Rohan - {3}{R}{W} 2/2 Legendary Creature, Human Noble.
 *
 * "Double strike"
 * "Eomer enters with a +1/+1 counter on it for each other Human you control."
 * "When Eomer enters, target player becomes the monarch. Eomer deals damage
 * equal to its power to any target."
 *
 * Three things at once, and the order matters: the counters are a replacement on
 * the way in, so the damage the trigger deals is read off the *big* Eomer. In a
 * deck of Humans he arrives as a 5/5 double striker who shoots something for five
 * and hands somebody the crown.
 *
 * The monarch is a rule of the game rather than an ability of this card - see
 * `becomeMonarch` - which is why the crown outlives Eomer dying.
 */
export const EOMER_KING_OF_ROHAN: CardDefinition = {
  id: "eomer-king-of-rohan",
  // The accent is part of the printed name, and audit_fixtures is what caught
  // it: written without it, the card is not a real card as far as Scryfall is
  // concerned.
  name: "Éomer, King of Rohan",
  scryfallId: "5f48930a-d7bd-410b-995a-4e2837aabb25",
  types: ["Creature"],
  subtypes: ["Human", "Noble"],
  supertypes: ["Legendary"],
  manaCost: { generic: 3, colors: { R: 1, W: 1 } },
  colorIdentity: ["R", "W"],
  power: 2,
  toughness: 2,
  keywords: ["Double Strike"],
  entersWithCounters: {
    kind: "count",
    // "each **other** Human you control" - the count excludes Eomer himself,
    // which is what `creatures` with a subtype already means here.
    of: { what: "creatures", subtype: "Human", excludeSource: true },
  },
  triggeredAbilities: [
    {
      event: "enters-battlefield",
      effect: {
        kind: "sequence",
        effects: [
          { kind: "becomeMonarch", who: "target" },
          { kind: "damage", amount: 0, amountFrom: "source-power", target: { kind: "any-target" } },
        ],
      },
    },
  ],
  tier: "weird",
};

/**
 * Esper Sentinel - {W} 1/1 Artifact Creature, Human Soldier.
 *
 * "Whenever an opponent casts their first noncreature spell each turn, draw a
 * card unless that player pays {X}, where X is this creature's power."
 *
 * A one-mana tax that reads its own power, so it gets worse to ignore as the
 * board grows - and "first each turn" is what stops it being a hard lock: the
 * second spell each turn is free.
 *
 * The engine pays the tax for the opponent whenever they can afford it, which is
 * the same shortcut the counterspell family's "unless its controller pays" takes.
 * It is a real simplification - a player who would rather let the card through
 * and keep the mana has no way to say so - and the note on `drawUnlessTheyPay`
 * says what it would take to ask properly.
 */
export const ESPER_SENTINEL: CardDefinition = {
  id: "esper-sentinel",
  name: "Esper Sentinel",
  scryfallId: "f3537373-ef54-4578-9d05-6216420ee349",
  types: ["Artifact", "Creature"],
  subtypes: ["Human", "Soldier"],
  manaCost: { generic: 0, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 1,
  triggeredAbilities: [
    {
      event: "spell-cast",
      watches: "any",
      onlyFirstNoncreatureEachTurn: true,
      watchFor: { controlledBy: "opponent" },
      effect: { kind: "drawUnlessTheyPay", amount: { kind: "source-power" } },
    },
  ],
  tier: "weird",
};

export const TEST_CARD_DEFINITIONS: Record<string, CardDefinition> = Object.fromEntries(
  [
    SANCTUM_PRELATE,
    DEAFENING_SILENCE,
    ETHERSWORN_CANONIST,
    GRAND_ABOLISHER,
    DRANNITH_MAGISTRATE,
    SPIRIT_OF_THE_LABYRINTH,
    CLARION_CONQUEROR,
    HIGH_NOON,
    SILENCE,
    WINOTA_JOINER_OF_FORCES,
    SUNBAKED_CANYON,
    ANCIENT_TOMB,
    ARID_MESA,
    BATTLEFIELD_FORGE,
    CLIFFTOP_RETREAT,
    PLATEAU,
    SCALDING_TARN,
    SUNBILLOW_VERGE,
    ARCANE_SIGNET,
    ORNITHOPTER_OF_PARADISE,
    ORNITHOPTER,
    PHYREXIAN_WALKER,
    LOTUS_PETAL,
    MANA_CONFLUENCE,
    SACRED_FOUNDRY,
    MOUNTAIN,
    FOREST,
    PLAINS,
    SWAMP,
    ISLAND,
    DARKSTEEL_MYR,
    SOLDIER_TOKEN,
    SAPROLING_TOKEN,
    FELL,
    MURDER,
    IMPALE,
    EVISCERATE,
    FINAL_REWARD,
    GLORIOUS_ANTHEM,
    GAEAS_ANTHEM,
    RAISE_THE_ALARM,
    CAPTAINS_CALL,
    SPORE_SWARM,
    GRENDEL_SPAWN_OF_KNULL,
    BANEHOUND,
    GILACORN,
    HULLCARVER,
    MUCK_RATS,
    SQUIRRELANOIDS,
    VAMPIRE_OF_THE_DIRE_MOON,
    BOG_IMP,
    CHILD_OF_NIGHT,
    DAKMOR_BAT,
    DUNE_BEETLE,
    GIFTED_AETHERBORN,
    HAND_OF_SILUMGAR,
    MISSHAPEN_FIEND,
    SKELETAL_SNAKE,
    WEI_INFANTRY,
    BARONY_VAMPIRE,
    DUSK_IMP,
    FERAL_SHADOW,
    GLOOM_PANGOLIN,
    HEADLESS_HORSEMAN,
    KRAUL_RAIDER,
    MIDNIGHT_ASSASSIN,
    MORIOK_REAVER,
    PYTHON,
    UNDEAD_MINOTAUR,
    VAMPIRE_NOBLE,
    WITCH_S_FAMILIAR,
    CARRION_SCREECHER,
    CRAZED_SKIRGE,
    DROSS_CROCODILE,
    GLAMOROUS_GRAPPLERS,
    INSATIABLE_HARPY,
    MOONGLOVE_WINNOWER,
    NYXBORN_MARAUDER,
    ROTTED_HULK,
    SKELETAL_CROCODILE,
    UKUD_COBRA,
    VAMPIRE_REVENANT,
    ARROGANT_VAMPIRE,
    CANAL_MONITOR,
    CATACOMB_SLUG,
    DREG_REAVER,
    MASS_OF_GHOULS,
    ROTTING_MASTODON,
    ZOMBIE_GOLIATH,
    FERAL_ABOMINATION,
    RORIX_BLADEWING,
    CRIMSON_KOBOLDS,
    KOBOLDS_OF_KHER_KEEP,
    MOUNTAIN_BANDIT,
    CAPITAL_GUARD,
    DERANGED_WHELP,
    GOBLIN_ASSAILANT,
    GOBLIN_TRAILBLAZER,
    LEOPARD_SPOTTED_JIAO,
    ROC_HUNTER,
    WALL_OF_EARTH,
    BALDUVIAN_BARBARIANS,
    BOGGART_BRUTE,
    FEARLESS_HALBERDIER,
    FRENZIED_RAPTOR,
    GOBLIN_HERO,
    GORE_SWINE,
    HULKING_BUGBEAR,
    NIMBLE_BIRDSTICKER,
    PYROMANTIC_PILGRIM,
    RAGING_COUGAR,
    WALL_OF_GRANITE,
    WILD_COLOS,
    BARBARIAN_HORDE,
    COBBLEBRUTE,
    DRAGON_MOOSE,
    HIGHLAND_GIANT,
    HULKING_DEVIL,
    KOMODO_RHINO,
    LIGHTNING_ELEMENTAL,
    MONSTER_MASHUP,
    OGRE_WARRIOR,
    RAGING_MINOTAUR,
    SHATTERSKULL_GIANT,
    TALRUUM_MINOTAUR,
    TOR_GIANT,
    VULSHOK_BERSERKER,
    CHARGING_MONSTROSAUR,
    FIRE_ELEMENTAL,
    GERRARD_S_IRREGULARS,
    OBSIDIAN_GIANT,
    QUAKETUSK_BOAR,
    RENEGADE_TROOPS,
    SHATTERSKULL_RECRUIT,
    WAYWARD_GIANT,
    FLAMEBORN_VIRON,
    VOLCANIC_DRAGON,
    GRIZZLY_BEARS,
    LIGHTNING_BOLT,
    LLANOWAR_ELVES,
    ELVISH_VISIONARY,
    ELVISH_MYSTIC,
    RUNECLAW_BEAR,
    ELVISH_WARRIOR,
    GIANT_SPIDER,
    CRAW_WURM,
    WALL_OF_WOOD,
    SHOCK,
    RAGING_GOBLIN,
    HILL_GIANT,
    INCINERATE,
    LAVA_AXE,
    WIND_DRAKE,
    TYPHOID_RATS,
    GLADECOVER_SCOUT,
    HEALING_SALVE,
    WILLOW_ELF,
    NORWOOD_RANGER,
    TRAINED_JACKAL,
    ANKLE_BITER,
    CHARGING_BADGER,
    BALDUVIAN_BEARS,
    BEAR_CUB,
    CYLIAN_ELF,
    FOREST_BEAR,
    KALONIAN_TUSKER,
    SWORDWISE_CENTAUR,
    TERRAIN_ELEMENTAL,
    JIBBIRIK_OMNIVORE,
    MOON_SPRITE,
    PYGMY_RAZORBACK,
    WILLOW_FAERIE,
    UNDERDARK_BASILISK,
    ALPINE_GRIZZLY,
    CENTAUR_COURSER,
    COLOSSODON_YEARLING,
    GORILLA_WARRIOR,
    HARRIER_NAGA,
    MURASA_BRUTE,
    NESSIAN_COURSER,
    SPINED_KAROK,
    SPORECAP_SPIDER,
    HITCHCLAW_RECLUSE,
    MOSSCOAT_GORIAK,
    WARY_OKAPI,
    WOODLAND_PATROL,
    LEATHERBACK_BALOTH,
    AXEBANE_BEAST,
    BROODHUNTER_WURM,
    GOLDEN_BEAR,
    NETTLE_SWINE,
    WILD_ELEPHANT,
    ORDER_OF_THE_SACRED_BELL,
    ROWAN_TREEFOLK,
    RUMBLING_BALOTH,
    WILD_CERATOK,
    TOMAKUL_HONOR_GUARD,
    ALLEY_STRANGLER,
    AMBUSH_VIPER,
    HORNET_STING,
    NOURISH,
    DEVOTED_HERO,
    EAGER_CADET,
    ELITE_VANGUARD,
    EXPEDITION_ENVOY,
    ISAMARU_HOUND_OF_KONDA,
    KITESAIL_SCOUT,
    LANTERN_KAMI,
    RUSTWING_FALCON,
    SAVANNAH_LIONS,
    STAUNCH_SHIELDMATE,
    SUNTAIL_HAWK,
    TASSELED_DROMEDARY,
    VALIANT_GUARD,
    VOLUNTEER_MILITIA,
    YOKED_OX,
    AGELESS_GUARDIAN,
    ALABASTER_HOST_SANCTIFIER,
    ALABORN_GRENADIER,
    ARMORED_WARHORSE,
    BLADE_OF_THE_SIXTH_PRIDE,
    CLIFFHAVEN_SELL_SWORD,
    CONCORDIA_PEGASUS,
    DROMOKA_WARRIOR,
    FORTIFIED_RAMPART,
    FRESH_VOLUNTEERS,
    GLORY_SEEKER,
    KNIGHT_ERRANT,
    KNIGHT_OF_NEW_BENALIA,
    KYOSHI_WARRIOR_GUARD,
    LEONIN_SKYHUNTER,
    MAKINDI_AERONAUT,
    MANED_SERVAL,
    MISTRAL_CHARGER,
    PROWLING_CARACAL,
    ROYAL_FALCON,
    SILVERCOAT_LION,
    SKYBLADE_OF_THE_LEGION,
    SQUIRE,
    STEADFAST_PALADIN,
    STORMFRONT_PEGASUS,
    STORY_SEEKER,
    TERRITORIAL_ROC,
    THRABEN_VALIANT,
    TRAVELING_PHILOSOPHER,
    CHAPEL_GEIST,
    DAWN_GRYFF,
    STANDING_TROOPS,
    WILD_GRIFFIN,
    ASSAULT_GRIFFIN,
    ARDENT_MILITIA,
    IRON_TUSK_ELEPHANT,
    VENERABLE_LAMMASU,
    CHAPLAINS_BLESSING,
    ANGELS_MERCY,
    JERRARD_OF_THE_CLOSED_FIST,
    HULK_BRUCE_BANNER,
    PRODIGAL_PYROMANCER,
    YARGLE_AND_MULTANI,
    HAWKEYE_CLINT_BARTON,
    AMATEUR_HERO,
    VALKYRIOR_SKYRIDER,
    ANT_MAN_SCOTT_LANG,
    THE_FALCON_SAM_WILSON,
    TIFA_LOCKHART,
    AGENT_PHIL_COULSON,
    CHARGE,
    MANA_TITHE,
    QILIN_S_BLESSING,
    AEGIS_OF_THE_HEAVENS,
    GLORIOUS_CHARGE,
    SACRED_NECTAR,
    SHIELD_WALL,
    SHOW_OF_VALOR,
    STEADFASTNESS,
    WHITESUN_S_PASSAGE,
    BAR_THE_DOOR,
    ETHEREAL_GUIDANCE,
    RIGHTEOUS_CHARGE,
    VIRTUOUS_CHARGE,
    WARRIOR_S_CHARGE,
    WARRIOR_S_HONOR,
    INSPIRED_CHARGE,
    SOLIDARITY,
    FORCE_SPIKE,
    HYDROSURGE,
    REACH_THROUGH_MISTS,
    COUNTERSPELL,
    IT_LL_QUENCH_YA,
    MANA_LEAK,
    QUENCH,
    CANCEL,
    CONVOLUTE,
    COUNSEL_OF_THE_SORATAMI,
    DIVINATION,
    QUICK_STUDY,
    CONCENTRATE,
    DISORIENT,
    MINDSTATIC,
    TOUCH_OF_BRILLIANCE,
    WEAVE_FATE,
    BRILLIANT_PLAN,
    JACE_S_INGENUITY,
    TIDINGS,
    CHORUS_OF_WOE,
    DISFIGURE,
    HELL_SWARM,
    MARSH_GAS,
    SCARE_TACTICS,
    STAB,
    WRING_FLESH,
    DARK_DEED,
    DARK_REMEDY,
    GRASP_OF_DARKNESS,
    LAST_GASP,
    NAUSEA,
    SCORPION_S_STING,
    SHRIVEL,
    DESPERATE_CHARGE,
    HOWLING_FURY,
    INFEST,
    OVERKILL,
    TAR_SNARE,
    FATAL_FUMES,
    FLATTEN,
    LANGUISH,
    STRANGLING_SPORES,
    WANDER_OFF,
    DEMON_S_GRASP,
    FINAL_DEATH,
    LASH_OF_THE_WHIP,
    THROTTLE,
    EYES_OF_THE_BEHOLDER,
    PULL_UNDER,
    BANNERS_RAISED,
    BRUTE_FORCE,
    BULL_RUSH,
    INFURIATE,
    SCORCHING_SPEAR,
    TARFIRE,
    ZUKO_S_OFFENSE,
    ANTAGONIZE,
    FIRE_AMBUSH,
    FISTS_OF_THE_ANVIL,
    LIGHTNING_STRIKE,
    SEARING_SPEAR,
    VOLCANIC_HAMMER,
    BURN_BRIGHT,
    OPEN_FIRE,
    PATH_OF_ANGER_S_FLAME,
    PRECISION_BOLT,
    FLAME_LASH,
    LIGHTNING_BLAST,
    CLEANSING_SCREECH,
    UNFRIENDLY_FIRE,
    EXPLOSIVE_IMPACT,
    CINDER_STORM,
    SEARING_WIND,
    GIANT_GROWTH,
    SHRINK,
    FERAL_FEROCITY,
    MONSTROUS_GROWTH,
    PHYTOBURST,
    TITANIC_GROWTH,
    WIELDING_THE_GREEN_DRAGON,
    BEE_STING,
    HARMONIZE,
    MIGHT_OF_OAKS,
    UNYARO_BEE_STING,
    SPRING_OF_ETERNAL_PEACE,
    VITALIZING_WIND,
    AEGIS_TURTLE,
    FLYING_MEN,
    KRAKEN_HATCHLING,
    SHORECOMBER_CRAB,
    WANDERING_ONES,
    BAY_FALCON,
    CORAL_MERFOLK,
    FLYING_DOLPHIN_FISH,
    LUMENGRID_WARDEN,
    MOAT_PIRANHAS,
    PLATED_SEASTRIDER,
    SEACOAST_DRAKE,
    STORM_CROW,
    SWORN_GUARDIAN,
    TALAS_SCOUT,
    WALL_OF_MIST,
    ZEPHYR_FALCON,
    ANCIENT_CRAB,
    BLIND_PHANTASM,
    CORAL_COMMANDO,
    GLACIAL_WALL,
    HOVER_BARRIER,
    MERCHANT_OF_SECRETS,
    OKO_S_ACCOMPLICES,
    SOARING_DRAKE,
    TOLARIAN_SCHOLAR,
    UPDRAFT_ELEMENTAL,
    WALL_OF_WATER,
    AMPHIN_CUTTHROAT,
    AZURE_DRAKE,
    FIGHTING_DRAKE,
    HEADWATER_SENTRIES,
    MUSE_DRAKE,
    NYXBORN_SEAGUARD,
    SILENT_OBSERVER,
    SNAPPING_DRAKE,
    TURTLE_SEALS,
    AIR_ELEMENTAL,
    ARMORED_CANCRIX,
    HUMONGULUS,
    SEA_SPIRIT,
    SKY_RUIN_DRAKE,
    STORMCLOUD_SPIRIT,
    WIND_SPIRIT,
    COLD_WATER_SNAPPER,
    DJINN_OF_THE_LAMP,
    CAELORNA_CORAL_TYRANT,
    THE_TERROR_OF_SERPENT_S_PASS,
    AVEN_ENVOY,
    FUGITIVE_WIZARD,
    MERFOLK_OF_THE_PEARL_TRIDENT,
    TRITON_SHORETHIEF,
    ZEPHYR_SPRITE,
    CORAL_EEL,
    CURIO_VENDOR,
    JHESSIAN_LOOKOUT,
    MARITIME_GUARD,
    MURMURING_PHANTASM,
    SEA_EAGLE,
    SEAGRAF_SKAAB,
    STRAW_SOLDIERS,
    TALAS_MERCHANT,
    VODALIAN_SOLDIERS,
    WETLAND_SAMBAR,
    WU_INFANTRY,
    A_I_M_BOT,
    ARMORED_WHIRL_TURTLE,
    CLOUDKIN_SEER,
    COUNCIL_OF_ADVISORS,
    HORNED_TURTLE,
    JWARI_SCUTTLER,
    NAGA_ETERNAL,
    RIVER_KAIJIN,
    THUNDER_WALL,
    TOME_RAIDER,
    WALL_OF_AIR,
    AVEN_FLEETWING,
    CLOUD_MANTA,
    FORTRESS_CRAB,
    GIANT_OCTOPUS,
    MOON_HERON,
    NIMBLE_INNOVATOR,
    PHANTOM_MONSTER,
    SILVER_ERNE,
    TALAS_AIR_SHIP,
    WISHCOIN_CRAB,
    ANCIENT_CARP,
    GRYFF_VANGUARD,
    NIMBUS_OF_THE_ISLES,
    SERRA_SPHINX,
    SOUL_OF_THE_RAPIDS,
    WATER_ELEMENTAL,
    BENTHIC_GIANT,
    MAHAMOTI_DJINN,
    GOLIATH_SPHINX,
    RITUAL_OF_RESTORATION,
    BREATH_OF_LIFE,
    FALSE_DEFEAT,
    REFURBISH,
    RESURRECTION,
    ANOINTED_CHORISTER,
    AVEN_SKIRMISHER,
    CATHEDRAL_SANCTIFIER,
    DEVOUT_MONK,
    HINTERLAND_SANCTIFIER,
    LIONHEART_MAVERICK,
    SANCTUARY_CAT,
    SEGOVIAN_ANGEL,
    SOUL_WARDEN,
    TUNDRA_WOLVES,
    AJANI_S_SUNSTRIKER,
    ALPINE_WATCHDOG,
    ARASHIN_CLERIC,
    CAPASHEN_KNIGHT,
    COLORFUL_FEIYI_SPARROW,
    COURIER_HAWK,
    DEVILTHORN_FOX,
    FENCING_ACE,
    HELPFUL_HUNTER,
    IMPASSIONED_ORATOR,
    KJELDORAN_OUTRIDER,
    KNIGHT_OF_MEADOWGRAIN,
    LIFECREED_DUO,
    MESA_UNICORN,
    ORESKOS_SWIFTCLAW,
    RAPTOR_COMPANION,
    SAVAI_SABERTOOTH,
    SAVANNAH_SAGE,
    SKYSHROUD_FALCON,
    SUNGRACE_PEGASUS,
    VETERAN_CAVALIER,
    YOUTHFUL_KNIGHT,
    AFFA_PROTECTOR,
    ALERT_SHU_INFANTRY,
    BASTION_ENFORCER,
    CAPASHEN_TEMPLAR,
    DIVING_GRIFFIN,
    EXULTANT_SKYMARCHER,
    GEIST_OF_THE_MOORS,
    GOLDEN_TAIL_DISCIPLE,
    HEALER_S_FLOCK,
    KEEN_EYED_ARCHERS,
    KEMBA_S_SKYGUARD,
    KNIGHT_OF_THE_KEEP,
    KOR_CELEBRANT,
    LOXODON_WAYFARER,
    MESA_CAVALIER,
    NIGHTGUARD_PATROL,
    PEARLED_UNICORN,
    REGAL_UNICORN,
    SHADOW_GLIDER,
    SHU_FOOT_SOLDIERS,
    SKYHUNTER_PROWLER,
    THOSE_WHO_SERVE,
    VENERABLE_MONK,
    AARDVARK_SLOTH,
    ALABASTER_KIRIN,
    AVEN_SENTRY,
    CLOUD_CRUSADER,
    DUTIFUL_SERVANTS,
    FOOT_SOLDIERS,
    HEALER_OF_THE_PRIDE,
    INDOMITABLE_ANCIENTS,
    KAMI_OF_OLD_STONE,
    LOXODON_CONVERT,
    MOORISH_CAVALRY,
    RAZORFOOT_GRIFFIN,
    SHU_ELITE_INFANTRY,
    SPOTTED_GRIFFIN,
    TORMENTED_ANGEL,
    WALL_OF_FAITH,
    ANGEL_OF_LIGHT,
    AVEN_OF_ENDURING_HOPE,
    BORDER_PATROL,
    DAWNING_ANGEL,
    ENFORCER_GRIFFIN,
    GHOSTLY_SENTINEL,
    GUARDIAN_LIONS,
    JHOVALL_RIDER,
    LUCENT_LIMINID,
    PLOVER_KNIGHTS,
    SERRA_ANGEL,
    SHINING_AEROSAUR,
    SIEGE_MASTODON,
    SILVERCLAW_GRIFFIN,
    SKYSWIRL_HARRIER,
    SPIRITUAL_GUARDIAN,
    STAUNCH_DEFENDERS,
    THRABEN_PUREBLOODS,
    BULWARK_GIANT,
    JHOVALL_QUEEN,
    PEARL_DRAGON,
    ANGEL_OF_RETRIBUTION,
    SERAPH_OF_THE_SUNS,
    RECONSTRUCTION,
    D_J_VU,
    SAGE_S_KNOWLEDGE,
    ARGIVIAN_RESTORATION,
    VIZZERDRIX,
    DISENTOMB,
    RAISE_DEAD,
    RETURN_TO_BATTLE,
    DEMONIC_TUTOR,
    DIABOLIC_TUTOR,
    ZOMBIFY,
    RISE_AGAIN,
    AUGMENTING_AUTOMATON,
    BURROG_BANEMAKER,
    HIRED_POISONER,
    MONOIST_SENTRY,
    PHARIKA_S_CHOSEN,
    RAVINE_RAIDER,
    THIRSTING_SHADE,
    BANE_ALLEY_BLACKGUARD,
    CABAL_EVANGEL,
    DAGGERDROME_IMP,
    DAKMOR_SCORPION,
    ELEPHANT_RAT,
    GURMAG_SWIFTWING,
    GUTTER_SKULK,
    INKRISE_INFILTRATOR,
    KROVIKAN_SCOUNDREL,
    NANTUKO_SHADE,
    QUEEN_S_BAY_SOLDIER,
    WALKING_CORPSE,
    CURSED_MINOTAUR,
    DREAD_SHADE,
    FELHIDE_MINOTAUR,
    FROZEN_SHADE,
    GIANT_SCORPION,
    GLOOMHUNTER,
    KELINORE_BAT,
    LOOMING_SHADE,
    MARKOV_PATRICIAN,
    MOANING_SPIRIT,
    NOXIOUS_GROODION,
    SCATHE_ZOMBIES,
    VAMPIRE_NIGHTHAWK,
    VEILED_SHADE,
    WARPATH_GHOUL,
    BARTIZAN_BATS,
    CARRION_ANTS,
    CHARITY_EXTRACTOR,
    CRYPT_RIPPER,
    DEATHGAZE_COCKATRICE,
    DRIFTING_SHADE,
    DROSS_RIPPER,
    DUNGEON_SHADE,
    FETID_HORROR,
    GIANT_COCKROACH,
    HIGHBORN_VAMPIRE,
    HOAR_SHADE,
    JAGWASP_SWARM,
    NETHER_HORROR,
    PERILOUS_SHADOW,
    PRAKHATA_CLUB_SECURITY,
    ROTTING_FENSNAKE,
    TATTERED_APPARITION,
    TWO_HEADED_ZOMBIE,
    VAMPIRE_CHAMPION,
    WANDERING_TOMBSHELL,
    ZOF_SHADE,
    BLOOD_GLUTTON,
    CATACOMB_CROCODILE,
    DOUSER_OF_LIGHTS,
    LAZOTEP_BEHEMOTH,
    NIGHTWING_SHADE,
    PRIMEVAL_SHAMBLER,
    RENEGADE_DEMON,
    SCROUNGER_OF_SOULS,
    BOGSTOMPER,
    MINOTAUR_ABOMINATION,
    CROOKSHANK_KOBOLDS,
    BOLD_IMPALER,
    DWARVEN_TRADER,
    LAVASTEP_RAIDER,
    MONS_S_GOBLIN_RAIDERS,
    WARSHIP_SCOUT,
    WEASELBACK_REDCAP,
    DEER_DOG,
    DEFIANT_KHENRA,
    EMBER_EYE_WOLF,
    FALKENRATH_REAVER,
    FERAL_MAAKA,
    GOBLIN_BULLY,
    GOBLIN_STRIKER,
    INDEPENDENT_TROOPS,
    NEST_ROBBER,
    PYRE_CHARGER,
    SUN_COLLARED_RAPTOR,
    SWAB_GOBLIN,
    WALL_OF_RAZORS,
    WALL_OF_TORCHES,
    BIRD_MAIDEN,
    BLISTERING_BARRIER,
    BRAZEN_SCOURGE,
    BREAKNECK_BERSERKER,
    FIERY_HELLHOUND,
    FIRE_NATION_SOLDIER,
    FURNACE_SPIRIT,
    GOBLIN_CAVALIERS,
    GOBLIN_CHARIOT,
    GOBLIN_ROUGHRIDER,
    GOBLIN_SKY_RAIDER,
    GRANITE_GARGOYLE,
    GRAY_OGRE,
    MINOTAUR_SURESHOT,
    MINOTAUR_WARRIOR,
    ONAKKE_OGRE,
    RAGING_BULL,
    REGATHAN_FIRECAT,
    RIDGELINE_RAGER,
    SABRETOOTH_TIGER,
    STORM_SHAMAN,
    TWINSCROLL_SHAMAN,
    VIASHINO_SPEARHUNTER,
    WALL_OF_FIRE,
    WALL_OF_HEAT,
    WALL_OF_LAVA,
    WALL_OF_STONE,
    WINDSEEKER_CENTAUR,
    ANABA_BODYGUARD,
    BORDERLAND_MINOTAUR,
    CANYON_MINOTAUR,
    DESERT_DRAKE,
    FURNACE_WHELP,
    GOBLIN_BERSERKER,
    HALBERDIER,
    HEMATITE_GOLEM,
    HOSTILE_MINOTAUR,
    INCURABLE_OGRE,
    LAGAC_LIZARD,
    LIGHTNING_HOUNDS,
    LIZARD_WARRIOR,
    NEEDLEPEAK_SPIDER,
    OGRE_RESISTER,
    ORAZCA_RAPTOR,
    ROC_OF_KHER_RIDGES,
    RUSSET_WOLVES,
    SANDSTONE_WARRIOR,
    SKYRAKER_GIANT,
    SUMMIT_PROWLER,
    TERROR_OF_THE_FAIRGROUNDS,
    VIASHINO_RUNNER,
    WILD_JHOVALL,
    BONEBREAKER_GIANT,
    FLAME_SPIRIT,
    FOMORI_NOMAD,
    LATHNU_SAILBACK,
    OGRE_BERSERKER,
    REARING_EMBERMARE,
    SABERTOOTH_WYVERN,
    SCORIA_ELEMENTAL,
    WALL_OF_OPPOSITION,
    AXEGRINDER_GIANT,
    RIPSCALE_PREDATOR,
    TENEMENT_CRASHER,
    MINOTAUR_AGGRESSOR,
    TRAINED_ORGG,
    LAY_OF_THE_LAND,
    REGROWTH,
    SHARED_ROOTS,
    SYLVAN_SCRYING,
    WILDWOOD_REBIRTH,
    NATURAL_CONNECTION,
    RECOLLECT,
    ELVEN_CACHE,
    ALMIGHTY_BRUSHWAGG,
    DRAGON_SNIPER,
    ESSENCE_WARDEN,
    MOSS_VIPER,
    SCRYB_SPRITES,
    SEDGE_SCORPION,
    VIRULENT_EMISSARY,
    WALL_OF_VINES,
    BASSARA_TOWER_ARCHER,
    CANOPY_SPIDER,
    DEADLY_RECLUSE,
    ELVISH_ARCHERS,
    FEIYI_SNAKE,
    FROG_SQUIRRELS,
    GARRUK_S_COMPANION,
    GREENWOOD_SENTINEL,
    IRIDESCENT_BLADEMASTER,
    KRAUL_WARRIOR,
    DAGGERBACK_BASILISK,
    FORCE_OF_SAVAGERY,
    GENEROUS_STRAY,
    GNOTTVOLD_RECLUSE,
    HORNET_COBRA,
    KRAUL_STINGER,
    RIB_CAGE_SPIDER,
    SYLVAN_BRUSHSTRIDER,
    TANGLESPAN_LOOKOUT,
    TAOIST_HERMIT,
    WALL_OF_ICE,
    WILDWOOD_PATROL,
    ARCHERS_OF_QARSI,
    CARNIVOROUS_PLANT,
    COLOSSADACTYL,
    CONIFER_STRIDER,
    GIANT_MANTIS,
    GRAZING_WHIPTAIL,
    KESSIG_RECLUSE,
    PRIMAL_HUNTBEAST,
    SHAMAN_OF_SPRING,
    SPIKED_BALOTH,
    STRIPED_BEARS,
    TOWERING_INDRIK,
    WARRIORS_OF_WAKANDA,
    ARBORBACK_STOMPER,
    BLANCHWOOD_TREEFOLK,
    DURKWOOD_BOARS,
    ELFHAME_WURM,
    FERAL_KRUSHOK,
    GARRUK_S_GOREHORN,
    GREATER_BASILISK,
    GRIZZLED_OUTRIDER,
    HOLLOWHENGE_BEAST,
    KAVU_CLIMBER,
    MAMMOTH_SPIDER,
    MOSS_MONSTER,
    PANTHER_WARRIORS,
    PLATED_SPIDER,
    PLATED_WURM,
    RHOX_ORACLE,
    RUBBLEBACK_RHINO,
    SENTINEL_SPIDER,
    SPINED_WURM,
    STOMPER_CUB,
    THORNHIDE_WOLVES,
    TURNTIMBER_ASCETIC,
    WARDSCALE_CROCODILE,
    BARBTOOTH_WURM,
    CANOPY_GORGER,
    COLOSSAL_DREADMAW,
    GIANT_WARTHOG,
    HILL_GIANT_HERDGORGER,
    KINDERCATCH,
    NEEDLESHOT_GOURNA,
    PRIMORDIAL_WURM,
    QUAKESTRIDER_CERATOPS,
    SCALED_BEHEMOTH,
    TUSKED_COLOSSODON,
    VORSTCLAW,
    VULPINE_GOLIATH,
    ARCHWEAVER,
    DUSKDALE_WURM,
    ENORMOUS_BALOTH,
    OAKGNARL_WARRIOR,
    PLATED_SLAGWURM,
    ROOTBREAKER_WURM,
    WHIPTAIL_WURM,
    COPPER_HOST_CRUSHER,
    GOLIATH_SPIDER,
    DEMYSTIFY,
    QUIET_PURITY,
    LAST_WORD,
    SINKHOLE,
    RAIN_OF_TEARS,
    SMELT,
    SHATTER,
    STONE_RAIN,
    CRATERIZE,
    VOLCANIC_UPHEAVAL,
    INESCAPABLE_BLAZE,
    ICE_STORM,
    VERDIGRIS,
    WINTER_S_GRASP,
    CARNAGE_TYRANT,
    TERRA_STOMPER,
    ADVENTURER_S_INN,
    BAYOU,
    FOUL_ORCHARD,
    GOHN_TOWN_OF_RUIN,
    GOLGARI_GUILDGATE,
    HAUNTED_MIRE,
    ILLEGITIMATE_BUSINESS,
    JUNGLE_HOLLOW,
    RADIANT_FOUNTAIN,
    SNOW_COVERED_FOREST,
    SNOW_COVERED_SWAMP,
    SNOW_COVERED_WASTES,
    SUBTERRANEAN_CAVERN,
    TREE_OF_TALES,
    VAULT_OF_WHISPERS,
    WASTES,
    WOODLAND_CHASM,
    SOL_RING,
    CHARCOAL_DIAMOND,
    MOSS_DIAMOND,
    WORN_POWERSTONE,
    SISAY_S_RING,
    THRAN_DYNAMO,
    UR_GOLEM_S_EYE,
    BLOODSTAINED_MIRE,
    MARSH_FLATS,
    POLLUTED_DELTA,
    VERDANT_CATACOMBS,
    WINDSWEPT_HEATH,
    WOODED_FOOTHILLS,
    SAKURA_TRIBE_ELDER,
    BOGWATER_LUMARET,
    BIRDS_OF_PARADISE,
    COMMAND_TOWER,
    DEATHCAP_GLADE,
    UNDERGROWTH_STADIUM,
    WOODLAND_CEMETERY,
    PEST_MASCOT,
    BLECH_LOAFING_PEST,
    ELVES_OF_DEEP_SHADOW,
    LLANOWAR_WASTES,
    TAINTED_WOOD,
    WASTEWOOD_VERGE,
    TWILIGHT_MIRE,
    SWARMYARD,
    SAPSEEP_FOREST,
    EXOTIC_ORCHARD,
    DELIGHTED_HALFLING,
    EUMIDIAN_TERRABOTANIST,
    SHOPKEEPERS_BANE,
    MELTSTRIDER_EULOGIST,
    LIFEGIFT,
    DEATHREAP_RITUAL,
    HAYWIRE_MITE,
    RIVETEERS_OVERLOOK,
    TOKEN_G_11_INSECT_FLYING_DEATHTOUCH,
    TOKEN_B_11_SNAKE_DEATHTOUCH,
    HORNET_QUEEN,
    OPHIOMANCER,
    DARK_RITUAL,
    SYLVAN_TUTOR,
    ASSASSINS_TROPHY,
    DOUBLING_SEASON,
    WINDING_CONSTRICTOR,
    THE_MEATHOOK_MASSACRE,
    TOKEN_BG_11_PEST_DIES_GAIN_LIFE,
    TOKEN_BG_11_PEST_ATTACKS_GAIN_LIFE,
    TOKEN_G_12_SPIDER_REACH,
    HEROIC_INTERVENTION,
    DUSKSHELL_CRAWLER,
    BLIGHT_MOUND,
    SEND_IN_THE_PEST,
    BLOOD_ARTIST,
    OVERGROWN_TOMB,
    UNDERGROUND_MORTUARY,
    ARASTA_OF_THE_ENDLESS_WEB,
    HORNET_NEST,
    GOLGARI_CHARM,
    BALA_GED_SANCTUARY,
    BALA_GED_RECOVERY,
    FELL_MIRE,
    FELL_THE_PROFANE,
    OLD_GROWTH_GROVE,
    REVITALIZING_REPAST,
    BOGGART_BOG,
    BOGGART_TRAWLER,
    INSPIRING_CALL,
    RETURN_OF_THE_WILDSPEAKER,
    IRIDESCENT_HORNBEETLE,
    TOKEN_G_11_INSECT,
    FERAL_APPETITE,
    SKULLCLAMP,
    ARACHNOGENESIS,
    TOKEN_B_11_INSECT_FLYING,
    TOXIC_DELUGE,
    TEND_THE_PESTS,
    DEADLY_ROLLICK,
    GARDEN_OF_FREYALISE,
    DISCIPLE_OF_FREYALISE,
    ICETILL_EXPLORER,
    PATH_OF_ANCESTRY,
    FUMULUS_THE_INFESTATION,
    THE_OZOLITH,
    ROOT_MANIPULATION,
    SEDGEMOOR_WITCH,
    TOKEN_BG_11_INSECT,
    TOKEN_C_11_SHAPESHIFTER_CHANGELING,
    TAINTED_STRIKE,
    TWITCHING_DOLL,
    RIPPLES_OF_UNDEATH,
    RISHKARS_EXPERTISE,
    RIBTRUSS_ROASTER,
    NECRODOMINANCE,
    SCUTE_SWARM,
    SPRINGLEAF_PARADE,
    GRIST_THE_HUNGER_TIDE,
    PEST_INFESTATION,
    SCHEMING_SYMMETRY,
    BRAIDS_ARISEN_NIGHTMARE,
    MOSEO_VEINS_NEW_DEAN,
    PROFANE_TUTOR,
    SPRINGHEART_NANTUKO,
    TURN_STONES,
    ECCENTRIC_PESTFINDER,
    COMBAT_CELEBRANT,
    RAPH_AND_LEO_SIBLING_RIVALS,
    BLADE_HISTORIAN,
    CATHAR_COMMANDO,
    ENLIGHTENED_TUTOR,
    IMPERIAL_RECRUITER,
    RECRUITER_OF_THE_GUARD,
    RANGER_CAPTAIN_OF_EOS,
    PATH_TO_EXILE,
    CAVERN_OF_SOULS,
    MULTIVERSAL_PASSAGE,
    GREYMOND_AVACYNS_STALWART,
    ARCHON_OF_EMERIA,
    AVEN_MINDCENSOR,
    HEXING_SQUELCHER,
    TOKEN_R_11_GOBLIN,
    WINDCRAG_SIEGE,
    TOKEN_W_11_CAT,
    KIKI_JIKI_MIRROR_BREAKER,
    RIONYA_FIRE_DANCER,
    OCELOT_PRIDE,
    ZEALOUS_CONSCRIPTS,
    HOMEWARD_PATH,
    MOTHER_OF_RUNES,
    GIVER_OF_RUNES,
    ALSEID_OF_LIFES_BOUNTY,
    SIGNAL_PEST,
    GINGERBRUTE,
    STARTING_TOWN,
    MOX_AMBER,
    CITY_OF_BRASS,
    CITY_OF_TRAITORS,
    BLINKMOTH_NEXUS,
    INKMOTH_NEXUS,
    TOKEN_C_11_SPIRIT,
    SIMIAN_SPIRIT_GUIDE,
    SWORDS_TO_PLOWSHARES,
    GAMBLE,
    RITE_OF_FLAME,
    PYROBLAST,
    RED_ELEMENTAL_BLAST,
    TOKEN_TREASURE,
    PROFESSIONAL_FACE_BREAKER,
    RAGAVAN_NIMBLE_PILFERER,
    EOMER_KING_OF_ROHAN,
    ESPER_SENTINEL,
    ANGRATHS_MARAUDERS,
    EIGANJO_SEAT_OF_THE_EMPIRE,
    SOKENZAN_CRUCIBLE_OF_DEFIANCE,
  ].map((def) => [def.id, def]),
);
