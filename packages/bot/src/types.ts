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
  /** Answering a "you may" trigger that stopped mid-resolution. */
  | { kind: "resolveConfirmation"; accept: boolean }
  /** Pointing a triggered ability at something before it goes on the stack. */
  | { kind: "chooseTriggerTarget"; target: StackTarget }
  /** Choosing which card to pitch when an opponent's spell demands a discard. */
  | { kind: "resolveDiscard"; instanceId: string }
  | { kind: "resolveSacrificeChoice"; instanceId: string | null }
  /** Settling an opening hand, before the game has begun. */
  | { kind: "takeMulligan" }
  | { kind: "keepHand" }
  | { kind: "putOnBottom"; instanceIds: string[] }
  | { kind: "passPriority" };

export const PASS: BotAction = { kind: "passPriority" };
