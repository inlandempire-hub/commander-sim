import { createContext, useContext, type ReactNode } from "react";

/**
 * The cards currently mid-flight between zones.
 *
 * A card that is travelling is drawn twice: once as the copy flying across the
 * overlay, and once by whichever zone it has already arrived in as far as the
 * game state is concerned. Without this the card would appear in its
 * destination the instant it moved and then be flown to itself, which reads as
 * a duplicate rather than a movement.
 *
 * It is a context rather than a prop because the cards that need to know are
 * scattered through both player boards, the rails and the piles - threading a
 * set of ids down through every one of them would touch a dozen components
 * that have no other interest in animation.
 */

const NONE: ReadonlySet<string> = new Set();

const FlyingContext = createContext<ReadonlySet<string>>(NONE);

export function FlyingProvider({
  value,
  children,
}: {
  value: ReadonlySet<string>;
  children: ReactNode;
}) {
  return <FlyingContext.Provider value={value}>{children}</FlyingContext.Provider>;
}

/**
 * Wraps the flying copies themselves, so they don't consult the set and
 * conclude they should hide.
 */
export function NotFlyingProvider({ children }: { children: ReactNode }) {
  return <FlyingContext.Provider value={NONE}>{children}</FlyingContext.Provider>;
}

export function useIsFlying(instanceId: string): boolean {
  return useContext(FlyingContext).has(instanceId);
}
