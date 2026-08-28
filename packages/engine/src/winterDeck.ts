import type { DeckList } from "./commander.js";

/**
 * Winter, Misanthropic Guide - the Jund ({B}{R}{G}) chaos deck, the sixth
 * pre-built archetype and the second grown list-first (after Winota): every one
 * of its 100 cards was implemented because the decklist wanted it, across eleven
 * batches, rather than assembled from what the engine already had. See
 * docs/BRANCHING.md for how the work was split, and ROADMAP.md's Winter section.
 *
 * All 99 non-commander cards, transcribed from the Scryfall bulk data:
 * symmetrical draw and group effects, graveyard recursion, and a fistful of
 * cards that hand an opponent a choice and make them make it.
 */
export const WINTER_DECK: DeckList = {
  commanderId: "winter-misanthropic-guide",
  libraryIds: ["aftermath-analyst","arachnogenesis","baleful-mastery","blasphemous-act","bramble-sovereign","brasss-tunnel-grinder","canyon-slough","cavalier-of-flame","chainer-nightmare-adept","cinder-glade","command-tower","demonic-covenant","descent-into-avernus","drag-to-the-roots","dragonskull-summit","druid-of-purification","elder-gargaroth","essence-warden","eternal-witness","evolving-wilds","exotic-orchard","exsanguinate","eyeblights-ending","farseek","gala-greeters","gixian-puppeteer","grisly-salvage","haunted-ridge","haywire-mite","healing-technique","howling-mine","karplusan-forest","keen-duelist","liliana-deaths-majesty","llanowar-wastes","mire-triton","mortality-spear","noxious-gearhulk","nyx-weaver","obscuring-haze","old-rutstein","osseous-sticktwister","over-the-top","oversold-cemetery","overwhelming-remorse","pendant-of-prosperity","pile-on","pulse-of-murasa","rakdos-charm","rampant-growth","restless-cottage","restless-vents","revitalizing-repast","rites-of-flourishing","riveteers-overlook","rockfall-vale","rootbound-crag","rootweaver-druid","sakura-tribe-elder","sangromancer","savage-lands","scrawling-crawler","share-the-spoils","shigeki-jukai-visionary","six","skull-prophet","smoldering-marsh","solemn-simulacrum","spiteful-visions","starving-revenant","stormfist-crusader","strangled-cemetery","sulfurous-springs","tempt-with-discovery","terramorphic-expanse","thieves-auction","twilight-prophet","twisted-landscape","urborg-repossession","veteran-explorer","virtue-of-persistence","warp-world","wishclaw-talisman","woodland-cemetery","swamp","swamp","swamp","swamp","swamp","swamp","forest","forest","forest","forest","forest","forest","mountain","mountain","mountain"],
};
