import { createContext, useContext, type ReactNode } from "react";
import type { CardDefinition } from "@mtg-commander-sim/engine";

/**
 * "Show me that card properly."
 *
 * The sidebar panel reads out whatever is under the cursor, which covers the
 * common case, but it is card-sized and it changes the moment you move the
 * mouse - so it cannot be used to compare two cards, to read something while
 * you think, or to look at a card at all on a small window.
 *
 * A context rather than a prop because every card on the table can be
 * inspected, and cards are rendered from six different components at four
 * levels of nesting. Threading an `onInspect` through all of them would add a
 * parameter to each for something none of them decide - the same argument that
 * made card art a context.
 */
export type InspectRequest = (definition: CardDefinition, ownerId?: string) => void;

const InspectContext = createContext<InspectRequest>(() => {});

export function InspectProvider({
  onInspect,
  children,
}: {
  onInspect: InspectRequest;
  children: ReactNode;
}) {
  return <InspectContext.Provider value={onInspect}>{children}</InspectContext.Provider>;
}

export function useInspect(): InspectRequest {
  return useContext(InspectContext);
}
