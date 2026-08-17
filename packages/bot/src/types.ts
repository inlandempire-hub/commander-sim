import type { ChosenOnEntry,
  ProtectionQuality,
} from "@mtg-commander-sim/engine";
import type { AttackerDeclaration, BlockerDeclaration, StackTarget } from "@mtg-commander-sim/engine";

/**
 * Exactly the set of things a human seat can do, in the same shape the
 * client's GameController takes - so a bot decision can be handed to the
 * local controller or serialized into a ClientMessage with no translation
 * layer that could drift. Per CLAUDE.md, the bot is just another client:
 * there is deliberately no engine or server code path that knows it exists.
 */
export type BotAction =
  | { kind: "playLand"; instanceId: string }
  | {
      kind: "castSpell";
      instanceId: string;
      targets: StackTarget[];
      fromCommandZone: boolean;
      /**
       * The value announced for {X}, when the card asks for one. Omitted for
       * every card that does not, and the engine refuses a card that needs one
       * without it - which is why this is decided here rather than left out.
       */
      chosenX?: number;
      /** The creature given up for "as an additional cost, sacrifice a creature". */
      sacrificeInstanceId?: string;
      /** "You may cast this spell without paying its mana cost." */
      useAlternativeCost?: boolean;
    }
  | { kind: "activateAbility"; instanceId: string; abilityIndex: number; targets: StackTarget[] }
  | { kind: "declareAttackers"; declarations: AttackerDeclaration[] }
  | { kind: "declareBlockers"; declarations: BlockerDeclaration[] }
  /** Answering a tutor that stopped mid-resolution. Null takes nothing. */
  | { kind: "resolveSearch"; instanceId: string | null }
  /**
   * Answering "as this permanent enters, choose ...".
   *
   * A game stops dead until this is answered, so the bot has to have an opinion
   * about every shape of it - a permanent nobody can answer for is a hung game,
   * not a missing feature.
   */
  | { kind: "chooseOnEntry"; answer: ChosenOnEntry }
  /** Answering a "you may" trigger that stopped mid-resolution. */
  | { kind: "resolveConfirmation"; accept: boolean }
  /** Pointing a triggered ability at one or more things before it goes on the stack. */
  | { kind: "chooseTriggerTargets"; targets: StackTarget[] }
  /** Choosing which card to pitch when an opponent's spell demands a discard. */
  | { kind: "resolveDiscard"; instanceId: string }
  | { kind: "resolveSacrificeChoice"; instanceId: string | null }
  | { kind: "resolveCardChoice"; instanceIds: string[] }
  | { kind: "resolveAmountChoice"; amount: number }
  /** Naming the colour a protection ability is waiting on - Mother of Runes. */
  | { kind: "resolveColorChoice"; quality: ProtectionQuality }
  /** Settling an opening hand, before the game has begun. */
  | { kind: "takeMulligan" }
  | { kind: "keepHand" }
  | { kind: "putOnBottom"; instanceIds: string[] }
  | { kind: "passPriority" };

export const PASS: BotAction = { kind: "passPriority" };

/**
 * Everything a `castSpell` action tells the engine about *how* the spell is
 * being cast.
 *
 * One function because there are two appliers - the client's GameController and
 * the local test harness - and they must not translate the same action
 * differently. They did: the harness passed `fromCommandZone` and nothing else,
 * so for as long as these fields have existed the bot-vs-bot test cast Deadly
 * Rollick for its printed cost rather than for free, and Tend the Pests with no
 * creature named to sacrifice. Both were refused by the engine, which in a bot
 * game is a dead game.
 *
 * Neither demo deck had a card of either shape until the Blech list went in, so
 * nothing failed and nothing was wrong-looking either. A field added below is
 * now one edit rather than two, and the one place to look.
 */
export function castOptionsFor(action: Extract<BotAction, { kind: "castSpell" }>): {
  fromCommandZone?: boolean;
  chosenX?: number;
  sacrificeInstanceId?: string;
  useAlternativeCost?: boolean;
} {
  return {
    fromCommandZone: action.fromCommandZone,
    chosenX: action.chosenX,
    sacrificeInstanceId: action.sacrificeInstanceId,
    useAlternativeCost: action.useAlternativeCost,
  };
}
