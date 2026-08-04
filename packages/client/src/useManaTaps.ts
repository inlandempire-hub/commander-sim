import { useLayoutEffect, useRef, useState } from "react";
import type { GameState } from "@mtg-commander-sim/engine";
import { TAP_SETTLE_MS, diffTapped, tapDelayMs } from "./tapOrder.js";
import { emitParticles } from "./particleBus.js";
import { manaColor } from "./particles.js";

/**
 * Making a payment visible.
 *
 * The engine taps every land for a spell inside one call, so React sees the
 * whole board change at once: four lands go from upright to turned in a single
 * frame, and what actually happened - "that spell cost you these four" - is
 * gone before you could read it.
 *
 * Two presentational things fix that, both driven off the same comparison:
 *
 *  - the lands turn one after another rather than together, via a transition
 *    delay written onto each card;
 *  - a pip of mana leaves each land for its owner's mana readout, so the
 *    payment has a direction and a destination rather than just being a state
 *    the board arrives in.
 *
 * The pip also throws a small puff of particles as it leaves the land and a
 * larger one, in the colour of the mana actually produced, as it arrives at the
 * pool. Those are timed off the same delays rather than off the animation
 * finishing, for the reason below: an animation that never runs never reports
 * itself finished, and a callback that never fires would leave a burst that
 * never happens rather than one that happens instantly.
 *
 * Neither touches the game. If nothing here ran at all the board would still
 * be correct, just abrupt - which is the standard everything visual in this
 * client is held to, because a tab that isn't compositing runs no animations.
 */

/** How long a pip spends in the air. Must match --pip-ms in styles.css. */
export const PIP_MS = 520;

export interface ManaPip {
  key: string;
  color: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  delay: number;
}

/** Every tapped permanent, in a stable order: player order, then battlefield order. */
function tappedInPlayOrder(state: GameState): string[] {
  const ids: string[] = [];
  for (const player of state.players) {
    for (const instance of player.battlefield) {
      if (instance.tapped) ids.push(instance.instanceId);
    }
  }
  return ids;
}

function ownerOf(state: GameState, instanceId: string): string | undefined {
  for (const player of state.players) {
    if (player.battlefield.some((c) => c.instanceId === instanceId)) return player.id;
  }
  return undefined;
}

/**
 * Which colour a permanent's first mana ability makes, for the pip. Undefined
 * for a permanent that was tapped for something other than mana - attacking,
 * an ability with a cost - which correctly gets no pip at all.
 */
function manaColorOf(state: GameState, instanceId: string): string | undefined {
  for (const player of state.players) {
    const instance = player.battlefield.find((c) => c.instanceId === instanceId);
    if (!instance) continue;
    const def = state.cardDefinitions[instance.definitionId];
    for (const ability of def?.activatedAbilities ?? []) {
      if (ability.cost.tap && !ability.cost.mana && ability.effect.kind === "addMana") {
        return ability.effect.color;
      }
    }
    return undefined;
  }
  return undefined;
}

function centreOf(element: Element): { x: number; y: number } {
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

export function useManaTaps(state: GameState | null): ManaPip[] {
  const previous = useRef<Set<string>>(new Set());
  const [pips, setPips] = useState<ManaPip[]>([]);
  const cleared = useRef<number | undefined>(undefined);
  const batch = useRef(0);
  /**
   * Timers for the bursts that go off when a pip lands. Held so they can all be
   * cancelled on unmount - a burst fired into a torn-down page is harmless but
   * a timer holding a closure over a dead component is not something to leave
   * lying around, and conceding mid-payment is a real way to get here.
   */
  const bursts = useRef<number[]>([]);

  useLayoutEffect(() => {
    if (!state) return;
    const { order, tappedNow } = diffTapped(previous.current, tappedInPlayOrder(state));
    previous.current = tappedNow;
    if (order.size === 0) return;

    const batchId = ++batch.current;
    const born: ManaPip[] = [];

    for (const [instanceId, position] of order) {
      const delay = tapDelayMs(position);

      /*
       * The delay goes straight onto the element rather than through React.
       * Nothing in the component tree owns this property - CardView sets no
       * inline styles at all - so writing it here cannot be clobbered by a
       * re-render, and it saves threading a per-card number through four
       * levels of board components for something purely decorative. Same
       * approach as CardRow's --overlap.
       */
      const card = document.querySelector<HTMLElement>(`[data-card-instance="${instanceId}"]`);
      if (card) card.style.setProperty("--tap-delay", `${delay}ms`);

      const owner = ownerOf(state, instanceId);
      const color = manaColorOf(state, instanceId);
      const anchor = owner
        ? document.querySelector<HTMLElement>(`[data-mana-anchor="${owner}"]`)
        : null;
      // A permanent tapped for something other than mana gets no pip, and a
      // card that isn't on screen has nowhere to fly from.
      if (!card || !anchor || !color) continue;

      const from = centreOf(card);
      const to = centreOf(anchor);
      born.push({
        key: `${batchId}:${instanceId}`,
        color,
        fromX: from.x,
        fromY: from.y,
        toX: to.x,
        toY: to.y,
        delay,
      });

      /*
       * Both ends of the journey, in the colour of the mana this land actually
       * makes. The puff at the land is deliberately much smaller than the
       * burst at the pool: a land giving something up should read as quieter
       * than the pool receiving it.
       *
       * The arrival is measured now rather than when it fires. The pool sits in
       * a rail that does not move during a payment, and a burst that has to
       * re-find its own destination on a timer is a burst that lands in the
       * wrong place the one time the layout shifts underneath it.
       */
      const tint = manaColor(color);
      const burstAfter = (ms: number, spec: Parameters<typeof emitParticles>[0]) => {
        const timer = window.setTimeout(() => {
          // Forgets itself as it fires, so the list only ever holds bursts that
          // have not gone off yet rather than growing for the whole game.
          bursts.current = bursts.current.filter((id) => id !== timer);
          emitParticles(spec);
        }, ms);
        bursts.current.push(timer);
      };

      burstAfter(delay, { kind: "mana-spark", x: from.x, y: from.y, color: tint });
      burstAfter(delay + PIP_MS, { kind: "mana-absorb", x: to.x, y: to.y, color: tint });
    }

    if (born.length > 0) setPips(born);

    /*
     * Cleared on a timer, never on the animation finishing.
     *
     * A tab that is not compositing never fires an animation event, and this
     * teardown also strips the transition delays - so hanging it off the
     * animation would leave every land permanently waiting before it drew.
     * The timer runs either way.
     */
    window.clearTimeout(cleared.current);
    const longest = Math.max(...[...order.values()].map(tapDelayMs), 0);
    cleared.current = window.setTimeout(
      () => {
        setPips((current) => (current.some((p) => p.key.startsWith(`${batchId}:`)) ? [] : current));
        for (const instanceId of order.keys()) {
          document
            .querySelector<HTMLElement>(`[data-card-instance="${instanceId}"]`)
            ?.style.removeProperty("--tap-delay");
        }
      },
      Math.max(TAP_SETTLE_MS, longest + PIP_MS),
    );
  });

  useLayoutEffect(
    () => () => {
      window.clearTimeout(cleared.current);
      for (const timer of bursts.current) window.clearTimeout(timer);
      bursts.current = [];
    },
    [],
  );

  return pips;
}
