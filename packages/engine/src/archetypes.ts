import type { DeckList } from "./commander.js";
import { BLECH_DECK } from "./cardLab.js";
import { WINOTA_DECK } from "./winotaDeck.js";
import { WINTER_DECK } from "./winterDeck.js";
import { SUPREMACY_DECK } from "./supremacyDeck.js";
import { FELIX_DECK } from "./demoGame.js";

/**
 * Pre-built archetype decks for the bot to pilot and for humans to play
 * against (see ROADMAP.md Phase 4).
 *
 * Every one of these is somebody's actual list, transcribed card for card from
 * Scryfall and grown list-first - each card implemented *because the list
 * wanted it*, never approximated. The three generated mono-colour "colour pile"
 * decks that used to sit alongside them (Radiant Ranks, Gravebound, Tidewall)
 * were retired on 2026-08-31 once there were five real decks to fill the roster;
 * their commanders and cards are all still in the pool and buildable in the
 * deck builder, they are just no longer pre-built archetypes.
 */

export interface Archetype {
  name: string;
  /** One line on how it wants to win, for deck-select UI and for the game log. */
  plan: string;
  deck: DeckList;
}

export const ARCHETYPES: Archetype[] = [
  {
    /*
     * Built the list-first way: every card in it was implemented *because the
     * list wanted it*, over eleven batches, rather than the list being assembled
     * from what the engine already had. See ROADMAP.md's "The Winota list".
     *
     * It replaced Warband (mono-red) on 2026-08-20, the same trade Blech made
     * for mono-green three days earlier: a real list in place of a colour pile.
     */
    name: "Winota, Joiner of Forces (Boros hatebears)",
    plan: "Tax and deny with cheap hate pieces, then attack with non-Humans so Winota drags free Humans off the top of the library.",
    deck: WINOTA_DECK,
  },
  {
    /*
     * Somebody's actual list, transcribed card for card, and it lives in
     * cardLab.ts because the lab has walked it since it was built. Named after
     * its commander because that is what people call it.
     *
     * It replaced Overgrowth (mono-green) on 2026-08-17.
     */
    name: "Blech, Loafing Pest",
    plan: "Trade small creatures for cards and life: Pest tokens, sacrifice payoffs, and unconditional removal for anything that gets past them.",
    deck: BLECH_DECK,
  },
  {
    // The hand-built Sultai deck - every non-basic card the engine represents
    // exactly. Selectable in the client with ?deck=felix.
    name: "Felix Five-Boots (Sultai)",
    plan: "Grind card advantage behind counters and removal, then close with Felix's doubled combat triggers or a Twenty-Toed Toad / Laboratory Maniac win.",
    deck: FELIX_DECK,
  },
  {
    // The Jund chaos deck, grown list-first over eleven batches - every one of
    // its 100 cards implemented because the list wanted it. Selectable with
    // ?deck=winter.
    name: "Winter, Misanthropic Guide (Jund chaos)",
    plan: "Flood everyone with cards and symmetrical value, punish the draws with Winter's delirium hand-size squeeze and the draw-matters pieces, then reset the board with a group wipe or Warp World.",
    deck: WINTER_DECK,
  },
  {
    // The Phelia, Exuberant Shepherd mono-white flicker/control deck, grown
    // list-first over 26 batches - every one of its cards implemented because
    // the list wanted it. The paper list was 103; three cards (Jeong Jeong's
    // Deserters, Null Elemental Blast, Appa) were cut to reach 100, and remain
    // in the pool as buildable fixtures. Selectable with ?deck=supremacy.
    name: "Supremacy (Phelia, mono-white flicker)",
    plan: "Answer threats with exile removal, blink your own creatures for repeated enter-the-battlefield value, tax and deny with cheap white hate, and grind ahead on card advantage behind Phelia's flicker engine.",
    deck: SUPREMACY_DECK,
  },
];

export function archetypeByName(name: string): Archetype | undefined {
  return ARCHETYPES.find((a) => a.name === name);
}

/** Picks an archetype at random - what the bot uses when no deck is specified. */
export function randomArchetype(): Archetype {
  return ARCHETYPES[Math.floor(Math.random() * ARCHETYPES.length)]!;
}
