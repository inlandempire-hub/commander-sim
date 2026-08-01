import { createContext, useContext, type ReactNode } from "react";
import type { ArtOverrides } from "./cardArt.js";

/**
 * Whose art is whose.
 *
 * Art is chosen per deck, so two players in the same game can legitimately be
 * looking at different printings of the same card - if you built your deck
 * around the original Alpha art and your opponent picked the Secret Lair one,
 * both should show as chosen. Keyed by owner, therefore, not by card.
 *
 * A context rather than props because every card on the table needs it, and
 * threading one lookup through board, zone, stack and detail-panel components
 * would add a parameter to each of them for something none of them decide.
 */
export type ArtOverridesByPlayer = Record<string, ArtOverrides>;

const ArtOverridesContext = createContext<ArtOverridesByPlayer>({});

export function ArtOverridesProvider({
  value,
  children,
}: {
  value: ArtOverridesByPlayer;
  children: ReactNode;
}) {
  return <ArtOverridesContext.Provider value={value}>{children}</ArtOverridesContext.Provider>;
}

/** Undefined means "no choices made", which falls back to the default printing. */
export function useArtOverrides(ownerId: string | undefined): ArtOverrides | undefined {
  const byPlayer = useContext(ArtOverridesContext);
  return ownerId ? byPlayer[ownerId] : undefined;
}
