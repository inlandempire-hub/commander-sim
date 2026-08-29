import type { CardDefinition } from "../types.js";

/**
 * The Supremacy deck: Phelia, Exuberant Shepherd - mono-white flicker and
 * control, the seventh built deck. Grown list-first: every card implemented
 * because the decklist wants it (see tools/scryfall-report/decks/supremacy.txt),
 * each transcribed exactly from the Scryfall bulk data.
 *
 * Cards already in the pool from other decks (Path to Exile, Swords to
 * Plowshares, Mother of Runes, Cavern of Souls, ...) are reused, not
 * re-transcribed. Only the cards this list adds live here.
 */

// A Clue token - "{2}, Sacrifice this artifact: Draw a card." - made by
// investigate (Thraben Inspector, Novice Inspector).
export const TOKEN_CLUE: CardDefinition = {
  id: "clue-token",
  name: "Clue",
  types: ["Artifact"],
  subtypes: ["Clue"],
  colorIdentity: [],
  isToken: true,
  activatedAbilities: [
    { cost: { mana: { generic: 2, colors: {} }, sacrificeSelf: true }, effect: { kind: "draw", amount: 1 } },
  ],
  tier: "scripted",
};

// --- Commander ---------------------------------------------------------------

/**
 * "Flash. Whenever Phelia attacks, exile up to one other target nonland
 * permanent. At the beginning of the next end step, return that card to the
 * battlefield under its owner's control. If it entered under your control, put a
 * +1/+1 counter on Phelia."
 */
export const PHELIA_EXUBERANT_SHEPHERD: CardDefinition = {
  id: "phelia-exuberant-shepherd",
  name: "Phelia, Exuberant Shepherd",
  scryfallId: "55707746-da6e-46e5-a5ca-7ac843fdc38e",
  types: ["Creature"],
  subtypes: ["Dog"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 2,
  keywords: ["Flash"],
  triggeredAbilities: [
    {
      event: "attacks",
      effect: {
        kind: "flicker",
        timing: "next-end-step",
        counterSourceIfYours: true,
        target: { kind: "permanent", nonland: true, excludeSource: true, count: { min: 0, max: 1 } },
      },
    },
  ],
  tier: "weird",
};

// --- Flicker cluster ---------------------------------------------------------

/** "Exile target creature you control, then return that card to the battlefield under your control." */
export const CLOUDSHIFT: CardDefinition = {
  id: "cloudshift",
  name: "Cloudshift",
  scryfallId: "6dc0c976-26d2-40c9-a571-c370e9139d1d",
  types: ["Instant"],
  manaCost: { generic: 0, colors: { W: 1 } },
  colorIdentity: ["W"],
  castEffect: { kind: "flicker", timing: "immediate", target: { kind: "creature", controlledBy: "you" } },
  tier: "scripted",
};

/**
 * "Flying. When this creature enters, exile another target permanent. Return
 * that card to the battlefield under its owner's control at the beginning of the
 * next end step."
 */
export const FLICKERWISP: CardDefinition = {
  id: "flickerwisp",
  name: "Flickerwisp",
  scryfallId: "f6cccf30-2025-49bb-9b1e-240bbef03f27",
  types: ["Creature"],
  subtypes: ["Elemental"],
  manaCost: { generic: 1, colors: { W: 2 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 1,
  keywords: ["Flying"],
  triggeredAbilities: [
    {
      event: "enters-battlefield",
      effect: { kind: "flicker", timing: "next-end-step", target: { kind: "permanent", excludeSource: true } },
    },
  ],
  tier: "scripted",
};

/**
 * "Flash. Flying. When this creature enters, you may exile target non-Angel
 * creature you control, then return that card to the battlefield under your
 * control."
 */
export const RESTORATION_ANGEL: CardDefinition = {
  id: "restoration-angel",
  name: "Restoration Angel",
  scryfallId: "f17f85d3-58e5-4128-90c5-98b524256af8",
  types: ["Creature"],
  subtypes: ["Angel"],
  manaCost: { generic: 3, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 3,
  toughness: 4,
  keywords: ["Flash", "Flying"],
  triggeredAbilities: [
    {
      event: "enters-battlefield",
      optional: true,
      effect: {
        kind: "flicker",
        timing: "immediate",
        target: { kind: "creature", controlledBy: "you", excludeSubtypes: ["Angel"] },
      },
    },
  ],
  tier: "scripted",
};

// --- Oblivion Ring cluster ---------------------------------------------------

/** The leaves-battlefield return every O-Ring shares. */
const O_RING_RETURN = {
  event: "leaves-battlefield" as const,
  includesSelf: true,
  effect: { kind: "returnExiledByThis" as const },
};

/** "When this enchantment enters, exile target nonland permanent an opponent controls until this enchantment leaves the battlefield." */
export const BANISHING_LIGHT: CardDefinition = {
  id: "banishing-light",
  name: "Banishing Light",
  scryfallId: "d53c7e49-745d-48ba-bc50-240472a4f039",
  types: ["Enchantment"],
  manaCost: { generic: 2, colors: { W: 1 } },
  colorIdentity: ["W"],
  triggeredAbilities: [
    {
      event: "enters-battlefield",
      effect: { kind: "exileUntilLeaves", target: { kind: "permanent", nonland: true, controlledBy: "opponent" } },
    },
    O_RING_RETURN,
  ],
  tier: "weird",
};

/** "When this enchantment enters, exile target creature an opponent controls until this enchantment leaves the battlefield. You gain 2 life." */
export const MAKESHIFT_BINDING: CardDefinition = {
  id: "makeshift-binding",
  name: "Makeshift Binding",
  scryfallId: "e45d2e0c-d70d-40e5-8c3d-db6803393516",
  types: ["Enchantment"],
  manaCost: { generic: 2, colors: { W: 1 } },
  colorIdentity: ["W"],
  triggeredAbilities: [
    {
      event: "enters-battlefield",
      effect: {
        kind: "sequence",
        effects: [
          { kind: "exileUntilLeaves", target: { kind: "creature", controlledBy: "opponent" } },
          { kind: "gainLife", amount: 2 },
        ],
      },
    },
    O_RING_RETURN,
  ],
  tier: "weird",
};

/** "When this enchantment enters, exile target artifact or creature an opponent controls until this enchantment leaves the battlefield." */
export const THOPTER_ARREST: CardDefinition = {
  id: "thopter-arrest",
  name: "Thopter Arrest",
  scryfallId: "a4e738cb-e4ea-41c2-99a1-55b6167eccb0",
  types: ["Enchantment"],
  manaCost: { generic: 2, colors: { W: 1 } },
  colorIdentity: ["W"],
  triggeredAbilities: [
    {
      event: "enters-battlefield",
      effect: {
        kind: "exileUntilLeaves",
        target: { kind: "permanent", cardTypes: ["Artifact", "Creature"], controlledBy: "opponent" },
      },
    },
    O_RING_RETURN,
  ],
  tier: "weird",
};

/** "Flash. When this enchantment enters, exile up to one target nonland permanent an opponent controls until this enchantment leaves the battlefield. You gain 2 life." */
export const PRAYER_OF_BINDING: CardDefinition = {
  id: "prayer-of-binding",
  name: "Prayer of Binding",
  scryfallId: "8d05289c-d8de-4085-ac01-5dd8fd954d35",
  types: ["Enchantment"],
  manaCost: { generic: 3, colors: { W: 1 } },
  colorIdentity: ["W"],
  keywords: ["Flash"],
  triggeredAbilities: [
    {
      event: "enters-battlefield",
      effect: {
        kind: "sequence",
        effects: [
          {
            kind: "exileUntilLeaves",
            target: { kind: "permanent", nonland: true, controlledBy: "opponent", count: { min: 0, max: 1 } },
          },
          { kind: "gainLife", amount: 2 },
        ],
      },
    },
    O_RING_RETURN,
  ],
  tier: "weird",
};

// --- Aura cluster ------------------------------------------------------------

/** "Enchant creature. Enchanted creature can't attack or block." */
export const PACIFISM: CardDefinition = {
  id: "pacifism",
  name: "Pacifism",
  scryfallId: "433eed50-81af-4a59-b624-57b6f5f1bb0f",
  types: ["Enchantment"],
  subtypes: ["Aura"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  enchant: { kind: "creature" },
  auraCantAttackOrBlock: true,
  tier: "weird",
};

/** "Enchant basic land you control. When this Aura enters, exile target creature or planeswalker an opponent controls until this Aura leaves the battlefield." */
export const OSSIFICATION: CardDefinition = {
  id: "ossification",
  name: "Ossification",
  scryfallId: "0da03224-c1af-438f-96c2-b0e41e1070b7",
  types: ["Enchantment"],
  subtypes: ["Aura"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  enchant: { kind: "permanent", cardTypes: ["Land"], controlledBy: "you" },
  triggeredAbilities: [
    {
      event: "enters-battlefield",
      effect: {
        kind: "exileUntilLeaves",
        target: { kind: "permanent", cardTypes: ["Creature", "Planeswalker"], controlledBy: "opponent" },
      },
    },
    O_RING_RETURN,
  ],
  tier: "weird",
};

/** "Enchant basic land you control. When this Aura enters, exile target creature an opponent controls until this Aura leaves the battlefield." */
export const DIMENSIONAL_EXILE: CardDefinition = {
  id: "dimensional-exile",
  name: "Dimensional Exile",
  scryfallId: "be8d96fb-a1be-4fff-b844-e38d185884e1",
  types: ["Enchantment"],
  subtypes: ["Aura"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  enchant: { kind: "permanent", cardTypes: ["Land"], controlledBy: "you" },
  triggeredAbilities: [
    {
      event: "enters-battlefield",
      effect: { kind: "exileUntilLeaves", target: { kind: "creature", controlledBy: "opponent" } },
    },
    O_RING_RETURN,
  ],
  tier: "weird",
};

// --- Reuse cluster -----------------------------------------------------------

/** "Flying. When this creature enters, you gain 1 life and draw a card." */
export const INSPIRING_OVERSEER: CardDefinition = {
  id: "inspiring-overseer",
  name: "Inspiring Overseer",
  scryfallId: "79016cf3-6eea-4b21-9ff3-f187d606e19a",
  types: ["Creature"],
  subtypes: ["Angel", "Cleric"],
  manaCost: { generic: 2, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 1,
  keywords: ["Flying"],
  triggeredAbilities: [
    {
      event: "enters-battlefield",
      effect: { kind: "sequence", effects: [{ kind: "gainLife", amount: 1 }, { kind: "draw", amount: 1 }] },
    },
  ],
  tier: "scripted",
};

/** "When this creature enters, investigate." (Create a Clue token.) */
export const THRABEN_INSPECTOR: CardDefinition = {
  id: "thraben-inspector",
  name: "Thraben Inspector",
  scryfallId: "08a5007f-06a0-40fa-a252-c38baa6b5c6f",
  types: ["Creature"],
  subtypes: ["Human", "Soldier"],
  manaCost: { generic: 0, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 2,
  triggeredAbilities: [
    { event: "enters-battlefield", effect: { kind: "createToken", count: 1, tokenDefinitionId: "clue-token" } },
  ],
  tier: "scripted",
};

/** "When this creature enters, investigate." */
export const NOVICE_INSPECTOR: CardDefinition = {
  id: "novice-inspector",
  name: "Novice Inspector",
  scryfallId: "0ad38866-fc5f-4f62-89c1-afc0f50765aa",
  types: ["Creature"],
  subtypes: ["Human", "Detective"],
  manaCost: { generic: 0, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 1,
  toughness: 2,
  triggeredAbilities: [
    { event: "enters-battlefield", effect: { kind: "createToken", count: 1, tokenDefinitionId: "clue-token" } },
  ],
  tier: "scripted",
};

/** "Destroy all creatures. You gain 1 life for each creature destroyed this way." */
export const FUMIGATE: CardDefinition = {
  id: "fumigate",
  name: "Fumigate",
  scryfallId: "976f6850-e646-4b51-a103-25240658672d",
  types: ["Sorcery"],
  manaCost: { generic: 3, colors: { W: 2 } },
  colorIdentity: ["W"],
  castEffect: { kind: "destroyAll", cardTypes: ["Creature"], thenGainLife: true },
  tier: "scripted",
};

/** "When this enchantment... " no - Portable Hole is an artifact: "When this artifact enters, exile target nonland permanent an opponent controls with mana value 2 or less until this artifact leaves the battlefield." */
export const PORTABLE_HOLE: CardDefinition = {
  id: "portable-hole",
  name: "Portable Hole",
  scryfallId: "80fca8c0-ae3e-439e-b202-228b9f360e9a",
  types: ["Artifact"],
  manaCost: { generic: 0, colors: { W: 1 } },
  colorIdentity: ["W"],
  triggeredAbilities: [
    {
      event: "enters-battlefield",
      effect: {
        kind: "exileUntilLeaves",
        target: { kind: "permanent", nonland: true, controlledBy: "opponent", maxManaValue: 2 },
      },
    },
    O_RING_RETURN,
  ],
  tier: "weird",
};

/**
 * "Choose one - Creatures you control get +2/+1 until end of turn; or Destroy
 * target artifact or enchantment. You gain 2 life."
 */
export const THORINS_LAST_STAND: CardDefinition = {
  id: "thorins-last-stand",
  name: "Thorin's Last Stand",
  scryfallId: "127367b6-9cfe-4516-9bfd-5b951468a25c",
  types: ["Instant"],
  manaCost: { generic: 2, colors: { W: 2 } },
  colorIdentity: ["W"],
  castEffect: {
    kind: "modal",
    modes: [
      { label: "Creatures you control get +2/+1 until end of turn", effect: { kind: "pumpAll", power: 2, toughness: 1, scope: "controller" } },
      {
        label: "Destroy target artifact or enchantment. You gain 2 life",
        effect: {
          kind: "sequence",
          effects: [
            { kind: "destroy", target: { kind: "permanent", cardTypes: ["Artifact", "Enchantment"] } },
            { kind: "gainLife", amount: 2 },
          ],
        },
      },
    ],
  },
  tier: "scripted",
};

/** "Flash. Natural Shelter - When this creature enters, you may return another permanent you control to its owner's hand." */
export const RESCUER_CHWINGA: CardDefinition = {
  id: "rescuer-chwinga",
  name: "Rescuer Chwinga",
  scryfallId: "73b17c29-c796-460b-a0c6-7638fb80e397",
  types: ["Creature"],
  subtypes: ["Elemental", "Spirit"],
  manaCost: { generic: 1, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 2,
  keywords: ["Flash"],
  triggeredAbilities: [
    {
      event: "enters-battlefield",
      optional: true,
      effect: { kind: "returnToHand", target: { kind: "permanent", controlledBy: "you", excludeSource: true } },
    },
  ],
  tier: "scripted",
};

/** "Whenever another creature you control with power 2 or less enters, you may pay {1}. If you do, draw a card." */
export const MENTOR_OF_THE_MEEK: CardDefinition = {
  id: "mentor-of-the-meek",
  name: "Mentor of the Meek",
  scryfallId: "05b6a101-4d12-4f50-8f02-5c778e08b149",
  types: ["Creature"],
  subtypes: ["Human", "Soldier"],
  manaCost: { generic: 2, colors: { W: 1 } },
  colorIdentity: ["W"],
  power: 2,
  toughness: 2,
  triggeredAbilities: [
    {
      event: "permanent-enters",
      watchFor: { type: "Creature", maxPower: 2, controlledBy: "you" },
      effect: { kind: "mayPay", cost: { mana: { generic: 1, colors: {} } }, then: { kind: "draw", amount: 1 } },
    },
  ],
  tier: "scripted",
};

/** "Destroy all lands." */
export const ARMAGEDDON: CardDefinition = {
  id: "armageddon",
  name: "Armageddon",
  scryfallId: "77f1f6ac-983f-4f3e-8906-47f774e8367b",
  types: ["Sorcery"],
  manaCost: { generic: 3, colors: { W: 1 } },
  colorIdentity: ["W"],
  castEffect: { kind: "destroyAll", cardTypes: ["Land"] },
  tier: "scripted",
};

/** Every Supremacy card this module adds, spread into TEST_CARD_DEFINITIONS. */
export const SUPREMACY_CARD_DEFINITIONS: CardDefinition[] = [
  TOKEN_CLUE,
  PHELIA_EXUBERANT_SHEPHERD,
  CLOUDSHIFT,
  FLICKERWISP,
  RESTORATION_ANGEL,
  BANISHING_LIGHT,
  MAKESHIFT_BINDING,
  THOPTER_ARREST,
  PRAYER_OF_BINDING,
  INSPIRING_OVERSEER,
  THRABEN_INSPECTOR,
  NOVICE_INSPECTOR,
  FUMIGATE,
  ARMAGEDDON,
  PORTABLE_HOLE,
  THORINS_LAST_STAND,
  RESCUER_CHWINGA,
  MENTOR_OF_THE_MEEK,
  PACIFISM,
  OSSIFICATION,
  DIMENSIONAL_EXILE,
];
