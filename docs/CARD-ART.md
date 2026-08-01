# Card art

Where the pictures come from, what we store, and how a deck picks its own.

## We never download or ship the images

CLAUDE.md forbids bundling or redistributing Wizards of the Coast artwork. So
the repo contains **no images and no image URLs**. What each card carries is a
single Scryfall id:

```ts
export const LIGHTNING_BOLT: CardDefinition = {
  id: "lightning-bolt",
  name: "Lightning Bolt",
  scryfallId: "7673784e-db4b-43a1-8d55-1bb9fc1e284f",
  ...
};
```

That id is a database key, not artwork. Every Scryfall image URL is derivable
from it:

```
https://cards.scryfall.io/<size>/front/<id[0]>/<id[1]>/<id>.jpg
```

`packages/client/src/cardArt.ts` builds that string; the browser fetches the
image from Scryfall's CDN and caches it exactly as it would any other image on
any other website. Scryfall explicitly permits this for personal,
non-commercial use.

## How much data is that

The commonly-quoted "30,000 Magic cards" number does not apply, because the
engine implements **815** of them, and a game only ever displays the ~100 in
each deck.

| Size | Per card | All 815 | One 100-card deck |
| --- | --- | --- | --- |
| `art_crop` (illustration only) | ~60 KB | ~49 MB | ~6 MB |
| `normal` (whole card) | ~130 KB | ~106 MB | ~13 MB |
| `large` | ~210 KB | ~171 MB | ~21 MB |

Nothing like that is ever fetched at once. The board shows `art_crop` because
we draw our own frame - it has to show live power/toughness, counters, damage
and combat state, none of which a printed card image knows about - and only the
detail panel fetches the whole card at `normal`.

Offline play would need a service worker caching the images you have already
seen. That is a few MB per deck you actually play, and is not built yet.

## Which printing you get by default

Nearly every card has been printed many times, with different art each time.

The ids in `testCards.ts` come from Scryfall's `oracle_cards` bulk file, which
holds **one row per unique card** - Scryfall's own choice of representative
printing. It is a reasonable default and an arbitrary one: Lightning Bolt has
63 printings, and the representative row is currently a recent set, not the
1993 Christopher Rush art most people picture.

They are stamped in bulk by:

```bash
py -X utf8 tools/scryfall-report/fetch_bulk_data.py    # if data/ is stale
py -X utf8 tools/scryfall-report/add_scryfall_ids.py --write
```

The script matches on card name, so it re-runs safely and reports anything it
could not match. Tokens are the expected misses - they are created by the game
rather than printed, so they have no card row and no art, and their cards
render as the plain text box.

## Choosing your own, per deck

The deck builder has an **Art** button on every card in the decklist and on the
commander. It asks Scryfall for every printing of that card
(`?unique=prints` - the flag that turns "one row per card" into "one row per
printing") and shows the illustrations to pick from.

The choice is stored on the **deck**, not on the card:

```ts
interface SavedDeck {
  ...
  artOverrides?: Record<string, string>;   // our card id -> chosen Scryfall id
}
```

Consequences worth knowing:

- Two decks can show the same card differently, including the two decks in one
  game. The board honours each seat's own choices.
- Choosing the card's default printing **clears** the override rather than
  storing it, and the field disappears entirely once the last choice is
  cleared - so a deck that never opened the picker is unchanged.
- It is purely cosmetic. `setCardArt` never touches `libraryIds` or
  `commanderId`, the engine never sees a Scryfall id, and deck legality is
  unaffected.

## When there is no image

The card renders as the name-and-type text box it was before art existed. That
happens for tokens, when you are offline, and if a URL ever stops resolving -
`CardView` tracks the `onError` and falls back permanently for that card. The
text card is the one that has to work; art is decoration on top of it.
