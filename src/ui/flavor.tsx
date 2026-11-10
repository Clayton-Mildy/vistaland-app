import { createContext, useContext, type ReactNode } from 'react';

/** "premium" is the customer app's look; everything else (dashboard, staff app) stays "standard". */
export type Flavor = 'standard' | 'premium';

const FlavorContext = createContext<Flavor>('standard');

export function UiFlavor({ value, children }: { value: Flavor; children: ReactNode }) {
  return <FlavorContext.Provider value={value}>{children}</FlavorContext.Provider>;
}

export const useFlavor = (): Flavor => useContext(FlavorContext);
