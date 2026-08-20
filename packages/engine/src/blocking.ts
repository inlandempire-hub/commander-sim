import type { BlockRestriction, CardInstance, Color, GameState, Keyword } from "./types.js";
import { requireDefinition } from "./state.js";
import { hasKeyword } from "./counters.js";
import { cardColors } from "./conditions.js";

/**
 * Who may block this attacker, and nothing else.
 *
 * The twin of protection.ts, and it exists for the same reason: "can't be
 * blocked except by ..." is one question, and a version of it written inline in
 * `blockProblem` is a question that gets a second copy the day a card asks it
 * differently. Flying was exactly that - a hand-written pair of ifs that only
 * ever knew about flying and reach - so it is derived here too rather than
 * checked separately.
 *
 * Three things this deliberately does not own:
 *
 * - **Menace**, which restricts how *many* creatures block rather than which,
 *   so it cannot be answered one pairing at a time. `declareBlockers` checks it
 *   across the whole declaration.
 * - **Protection**, which is a restriction by colour and belongs with the other
 *   three prohibitions protection carries. See protection.ts.
 * - **Tapped, and "is that creature even attacking"**, which are properties of
 *   the blocker and the combat rather than of the attacker's evasion.
 */

/**
 * Every "can't be blocked except by ..." this attacker currently has.
 *
 * Printed, granted for the turn, and derived from flying - in that order, though
 * the order does not matter: they accumulate, and a blocker has to satisfy all
 * of them. A flying Gingerbrute that used its ability really can only be blocked
 * by a hasty creature that also flies or reaches.
 */
export function blockRestrictionsOn(state: GameState, attacker: CardInstance): BlockRestriction[] {
  const restrictions: BlockRestriction[] = [];
  /*
   * Flying, as the reminder text writes it: "can't be blocked except by
   * creatures with flying or reach". Asked through `hasKeyword` rather than the
   * printed list, so a creature handed flying for the turn is evasive for the
   * turn.
   */
  if (hasKeyword(state, attacker, "Flying")) {
    restrictions.push({ kind: "only-with-keyword", keywords: ["Flying", "Reach"] });
  }
  const def = requireDefinition(state, attacker.definitionId);
  if (def.blockRestriction) restrictions.push(def.blockRestriction);
  restrictions.push(...attacker.blockRestrictionsThisTurn);
  return restrictions;
}

/** "creatures with flying or reach" - the printed phrase, for a message or a panel. */
export function describeBlockRestriction(restriction: BlockRestriction): string {
  if (restriction.kind === "not-color") {
    // Worded as the *exclusion* it is - "except by white creatures" would be the
    // opposite of what Skrelv says.
    return `creatures that aren't ${colorWord(restriction.color)}`;
  }
  const words = restriction.keywords.map((keyword) => keyword.toLowerCase());
  const list = words.length <= 1 ? (words[0] ?? "") : `${words.slice(0, -1).join(", ")} or ${words[words.length - 1]}`;
  return `creatures with ${list}`;
}

function colorWord(color: Color): string {
  return { W: "white", U: "blue", B: "black", R: "red", G: "green" }[color];
}

/**
 * Why this creature cannot block that attacker, or null if the evasion rules
 * allow it. The wording is the sentence the player is shown.
 */
export function blockRestrictionProblem(
  state: GameState,
  attacker: CardInstance,
  blocker: CardInstance,
): string | null {
  for (const restriction of blockRestrictionsOn(state, attacker)) {
    /*
     * Two shapes, and they are opposites: one names an ability the blocker must
     * have, the other a colour that disqualifies it. Written as one test with a
     * flag, whichever half was added second would silently invert the other.
     */
    const qualifies =
      restriction.kind === "not-color"
        ? !cardColors(requireDefinition(state, blocker.definitionId)).includes(restriction.color)
        : restriction.keywords.some((keyword: Keyword) => hasKeyword(state, blocker, keyword));
    if (!qualifies) return `it can only be blocked by ${describeBlockRestriction(restriction)}`;
  }
  return null;
}
