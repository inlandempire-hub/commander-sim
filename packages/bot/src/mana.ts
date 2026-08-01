/**
 * The bot's mana helpers now live in the engine.
 *
 * They were written here first, because the bot was the only thing that had to
 * tap its own lands. Once the human's client gained the same "just pay for it"
 * behaviour (2026-08-01), keeping a second copy in step stopped being viable -
 * so `manaSources`, `couldAfford` and `nextSourceToTap` moved to
 * `packages/engine/src/autoTap.ts` and are re-exported here so the bot's own
 * imports keep reading naturally.
 */
export {
  couldAfford,
  manaSources,
  nextSourceToTap,
  type ManaSource,
} from "@mtg-commander-sim/engine";
