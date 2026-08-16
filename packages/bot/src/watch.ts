import {
  ARCHETYPES,
  createGameFromDecks,
  DEADLY_DONNY,
  SALTY_MIKE,
  effectivePower,
  effectiveToughness,
  type GameState,
  type StackTarget,
} from "@mtg-commander-sim/engine";
import { applyBotAction } from "./localHarness.js";
import { botShouldAct, nextAction } from "./play.js";
import type { BotAction } from "./types.js";

/**
 * Plays one bot-vs-bot game and narrates it in plain English.
 *
 * Purely a human-facing debugging aid - the automated proof that the bot plays
 * legally lives in __tests__/fullGame.test.ts. This exists because that test
 * only prints "passed", which tells you nothing about whether the bot is
 * playing *well*.
 *
 *   npm run watch -w @mtg-commander-sim/bot
 *   npm run watch -w @mtg-commander-sim/bot -- --quiet
 *   npm run watch -w @mtg-commander-sim/bot -- --deck=black --vs=red
 */

const args = process.argv.slice(2);
const QUIET = args.includes("--quiet");
const MAX_ACTIONS = 40000;

/** --deck=green picks that archetype; otherwise one is chosen at random. */
function pickArchetype(flag: string) {
  const wanted = args.find((a) => a.startsWith(`--${flag}=`))?.split("=")[1]?.toLowerCase();
  if (wanted) {
    const match = ARCHETYPES.find((a) => a.name.toLowerCase().includes(wanted));
    if (match) return match;
    console.error(`Unknown deck "${wanted}". Options: ${ARCHETYPES.map((a) => a.name).join(", ")}`);
    process.exit(1);
  }
  return ARCHETYPES[Math.floor(Math.random() * ARCHETYPES.length)]!;
}

function nameOf(state: GameState, instanceId: string): string {
  // stackCards first: a spell being countered is the one case where the card is
  // in no player zone at all, and it's exactly the one worth naming.
  const onStack = state.stackCards.find((c) => c.instanceId === instanceId);
  if (onStack) return state.cardDefinitions[onStack.definitionId]?.name ?? "a card";

  for (const player of state.players) {
    for (const zone of [player.battlefield, player.hand, player.graveyard, player.command, player.library]) {
      const found = zone.find((c) => c.instanceId === instanceId);
      if (found) return state.cardDefinitions[found.definitionId]?.name ?? "a card";
    }
  }
  for (const obj of state.stack) {
    if (obj.sourceInstanceId === instanceId) return "an ability on the stack";
  }
  return "a card";
}

function describeTarget(state: GameState, target: StackTarget): string {
  if (target.kind === "player") return target.playerId;
  if (target.kind === "card") return nameOf(state, target.instanceId);
  // A spell on the stack - name the card it came from, which is what a human
  // watching would call it ("counters Craw Wurm", not "counters s12").
  const obj = state.stack.find((o) => o.id === target.stackObjectId);
  return obj ? nameOf(state, obj.sourceInstanceId) : "a spell";
}

/** Turns one action into a line of English, or null for the noise we don't want narrated. */
function describe(state: GameState, seat: string, action: BotAction): string | null {
  switch (action.kind) {
    case "playLand":
      return `${seat} plays ${nameOf(state, action.instanceId)}.`;
    case "chooseOnEntry": {
      const { answer } = action;
      const chosen =
        answer.creatureType ??
        answer.basicLandType ??
        (answer.number !== undefined ? String(answer.number) : undefined) ??
        answer.keywords?.join(" and ").toLowerCase() ??
        answer.mode;
      return `${seat} chooses ${chosen ?? "nothing"}.`;
    }
    case "castSpell": {
      const name = nameOf(state, action.instanceId);
      const from = action.fromCommandZone ? " from the command zone" : "";
      const target =
        action.targets.length > 0
          ? ` targeting ${action.targets.map((t) => describeTarget(state, t)).join(", ")}`
          : "";
      return `${seat} casts ${name}${from}${target}.`;
    }
    case "activateAbility": {
      const name = nameOf(state, action.instanceId);
      // Tapping lands for mana is most of the action count and none of the interest.
      const def = state.players
        .flatMap((p) => p.battlefield)
        .find((c) => c.instanceId === action.instanceId);
      const isLand = def && state.cardDefinitions[def.definitionId]?.types.includes("Land");
      if (isLand) return null;
      return `${seat} activates ${name}'s ability.`;
    }
    case "declareAttackers":
      return `${seat} ATTACKS with ${action.declarations
        .map((d) => nameOf(state, d.attackerInstanceId))
        .join(", ")}.`;
    case "declareBlockers":
      return `${seat} blocks: ${action.declarations
        .map((d) => `${nameOf(state, d.blockerInstanceId)} stops ${nameOf(state, d.attackerInstanceId)}`)
        .join("; ")}.`;
    case "resolveSearch":
      return action.instanceId
        ? `${seat} searches and takes ${nameOf(state, action.instanceId)}.`
        : `${seat} searches and takes nothing.`;
    case "resolveConfirmation":
      return action.accept ? `${seat} takes the optional trigger.` : `${seat} declines the optional trigger.`;
    case "chooseTriggerTarget":
      return `${seat} aims a trigger at ${describeTarget(state, action.target)}.`;
    case "resolveDiscard":
      return `${seat} discards ${nameOf(state, action.instanceId)}.`;
    case "resolveCardChoice":
      return action.instanceIds.length === 0
        ? `${seat} declines a choice.`
        : `${seat} chooses ${action.instanceIds.length} card(s).`;
    case "resolveAmountChoice":
      return `${seat} pays ${action.amount} life.`;
    case "resolveSacrificeChoice":
      return action.instanceId
        ? `${seat} sacrifices ${nameOf(state, action.instanceId)}.`
        : `${seat} declines to sacrifice.`;
    case "takeMulligan":
      return `${seat} mulligans.`;
    case "keepHand":
      return `${seat} keeps.`;
    case "putOnBottom":
      return `${seat} puts ${action.instanceIds.length} card(s) on the bottom.`;
    case "passPriority":
      return null;
  }
}

function boardSummary(state: GameState): string {
  return state.players
    .map((p) => {
      const creatures = p.battlefield.filter((c) => state.cardDefinitions[c.definitionId]?.types.includes("Creature"));
      const lands = p.battlefield.length - creatures.length;
      const bodies = creatures
        .map((c) => `${state.cardDefinitions[c.definitionId]?.name} ${effectivePower(state, c)}/${effectiveToughness(state, c)}`)
        .join(", ");
      return `    ${p.id}: ${p.life} life, ${lands} lands, ${creatures.length} creatures${bodies ? ` - ${bodies}` : ""}`;
    })
    .join("\n");
}

function main(): void {
  const first = pickArchetype("deck");
  const second = pickArchetype("vs");
  const state = createGameFromDecks([
    { id: DEADLY_DONNY, deck: first.deck },
    { id: SALTY_MIKE, deck: second.deck },
  ]);
  let actions = 0;
  let turn = 0;

  console.log(
    [
      "Bot vs bot",
      `  ${DEADLY_DONNY}: ${first.name}`,
      `    ${first.plan}`,
      `  ${SALTY_MIKE}: ${second.name}`,
      `    ${second.plan}`,
      "",
    ].join("\n"),
  );

  while (actions < MAX_ACTIONS && !state.players.some((p) => p.hasLost)) {
    if (state.turnNumber !== turn) {
      turn = state.turnNumber;
      const active = state.players[state.activePlayerIndex]?.id ?? "?";
      console.log(`\n=== Turn ${turn} - ${active} ===`);
      console.log(boardSummary(state));
    }

    let acted = false;
    for (const seat of [DEADLY_DONNY, SALTY_MIKE]) {
      if (!botShouldAct(state, seat)) continue;
      const action = nextAction(state, seat);
      if (!action) continue;

      const lifeBefore = state.players.map((p) => p.life);
      const line = describe(state, seat, action);

      try {
        applyBotAction(state, seat, action);
      } catch (error) {
        console.error(`\n!! ${seat} tried an illegal ${action.kind}: ${(error as Error).message}`);
        return;
      }

      if (line && !QUIET) console.log(`  ${line}`);

      state.players.forEach((p, i) => {
        const delta = p.life - (lifeBefore[i] ?? p.life);
        if (delta !== 0) console.log(`  >> ${p.id} ${delta < 0 ? "loses" : "gains"} ${Math.abs(delta)} life (now ${p.life})`);
      });

      acted = true;
      break;
    }
    if (!acted) break;
    actions += 1;
  }

  const loser = state.players.find((p) => p.hasLost);
  const winner = state.players.find((p) => !p.hasLost);
  console.log("\n=== Game over ===");
  console.log(boardSummary(state));
  if (loser && winner) {
    console.log(`\n${winner.id} WINS on turn ${state.turnNumber}.`);
    console.log(`${loser.id} lost: ${loser.lossReason}.`);
  } else {
    console.log(`\nNo winner after ${actions} actions - something stalled.`);
  }
  console.log(`(${actions} total actions)`);
}

main();
