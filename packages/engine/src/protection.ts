import type { CardDefinition, CardInstance, GameState, ProtectionQuality } from "./types.js";
import { findInstance, log, requireDefinition } from "./state.js";
import { cardColors } from "./conditions.js";

/**
 * Protection from a quality - rule 702.16.
 *
 * Four prohibitions wearing one word, and the four are why this is a system
 * rather than a keyword. A permanent with protection from a quality cannot be:
 *
 *   **D**amaged   by a source with that quality        - `protectionStopsDamage`
 *   **E**nchanted or equipped by one                   - via targeting, see below
 *   **B**locked   by a creature with that quality      - `protectionStopsBlock`
 *   **T**argeted  by a spell or ability with it        - `protectionStopsTargeting`
 *
 * Every one of those questions is asked here and nowhere else. Four checks
 * scattered across four files is the shape this would rot into: one of them
 * would be widened for a new card and the others left, and Mother of Runes would
 * quietly stop working against one kind of removal.
 *
 * **What protection does not do is most of the card.** It does not stop a board
 * wipe, an edict that makes you sacrifice, a -3/-3 that names nothing, or
 * anything else untargeted. That is why a one-mana 1/1 can hand it out every turn
 * without ending the game, and it is the first thing to check when this looks
 * like it is not working.
 *
 * The enchant/equip half needs no code of its own in this engine, and that is
 * worth being explicit about rather than leaving as a gap somebody has to
 * rediscover: both routes onto a creature here - the `attach` effect and bestow -
 * choose their host by *targeting* it, so the targeting check already refuses
 * them. A card that attached without targeting (a "return this to the
 * battlefield attached to a creature" effect) would need this file to grow a
 * fourth function, and would not be caught by any test below.
 */

/** The qualities a source *has*, which is what protection is measured against. */
export function qualitiesOf(def: CardDefinition): ProtectionQuality[] {
  const colors = cardColors(def);
  /*
   * A source with no coloured mana in its cost is colourless, and "colorless" is
   * a quality like any other - it is the whole point of Giver of Runes, which
   * answers the artifact creatures and Eldrazi that no colour choice touches.
   *
   * Read off the mana cost, like every other colour question in this engine. That
   * is a real simplification: a card's colour is set by its cost *and* by any
   * colour indicator, and a token has neither. Nothing in this pool has a colour
   * indicator, and a token's colour comes from the definition it was minted with.
   */
  return colors.length > 0 ? colors : ["colorless"];
}

/** Whether this permanent has protection from any of the qualities a source carries. */
function stoppedBy(instance: CardInstance, qualities: ProtectionQuality[]): ProtectionQuality | null {
  return instance.protectionFrom.find((quality) => qualities.includes(quality)) ?? null;
}

/**
 * The qualities of whatever is doing something, named by instance id.
 *
 * Returns an empty list for a source that cannot be found - a spell already
 * countered, a permanent that has left - which means protection stops nothing.
 * That is the right answer rather than a fallback: an effect with no source is
 * not a source with a quality.
 */
function sourceQualities(state: GameState, sourceInstanceId: string | undefined): ProtectionQuality[] {
  if (!sourceInstanceId) return [];
  const found = findInstance(state, sourceInstanceId);
  if (!found) return [];
  return qualitiesOf(requireDefinition(state, found.instance.definitionId));
}

/**
 * "...can't be the target of spells or abilities with that quality."
 *
 * Asked of the *source* of the spell or ability, not of its controller: a white
 * player casting a black removal spell is stopped by protection from black, and
 * Mother of Runes is played by naming the colour of the card on the stack rather
 * than the colour of the deck it came from.
 */
export function protectionStopsTargeting(
  state: GameState,
  targetInstanceId: string,
  sourceInstanceId: string | undefined,
): boolean {
  const found = findInstance(state, targetInstanceId);
  if (!found || found.instance.protectionFrom.length === 0) return false;
  return stoppedBy(found.instance, sourceQualities(state, sourceInstanceId)) !== null;
}

/**
 * "...can't be dealt damage by sources with that quality."
 *
 * The damage is prevented, so nothing downstream happens at all: no lifelink for
 * the attacker, no deathtouch mark, no "whenever this creature is dealt damage"
 * trigger. That is why this is asked inside `damageCreature` rather than by each
 * caller - the one door every point of damage goes through.
 */
export function protectionStopsDamage(
  state: GameState,
  target: CardInstance,
  sourceInstanceId: string | undefined,
): boolean {
  if (target.protectionFrom.length === 0) return false;
  const quality = stoppedBy(target, sourceQualities(state, sourceInstanceId));
  if (quality === null) return false;
  log(
    state,
    `${requireDefinition(state, target.definitionId).name} has protection and takes no damage`,
  );
  return true;
}

/**
 * "...can't be blocked by creatures with that quality."
 *
 * Note which way round this runs. Protection on the *attacker* stops it being
 * blocked; protection on a blocker does not stop it blocking, and a card that
 * read it the other way would be strictly better than printed. So this is asked
 * with the attacker as the protected permanent.
 */
export function protectionStopsBlock(
  state: GameState,
  attackerInstanceId: string,
  blockerInstanceId: string,
): ProtectionQuality | null {
  const attacker = findInstance(state, attackerInstanceId);
  if (!attacker || attacker.instance.protectionFrom.length === 0) return null;
  const blocker = findInstance(state, blockerInstanceId);
  if (!blocker) return null;
  return stoppedBy(
    attacker.instance,
    qualitiesOf(requireDefinition(state, blocker.instance.definitionId)),
  );
}

/** How a quality reads in a sentence - "protection from white", "protection from colorless". */
export function qualityWord(quality: ProtectionQuality): string {
  switch (quality) {
    case "W":
      return "white";
    case "U":
      return "blue";
    case "B":
      return "black";
    case "R":
      return "red";
    case "G":
      return "green";
    case "colorless":
      return "colorless";
  }
}
