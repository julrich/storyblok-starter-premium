import { createContext, useContext } from "react";

export interface SettingsContextValue {
  logoUrl?: string;
}

export const SettingsContext = createContext<SettingsContextValue>({});

export function useSettingsContext(): SettingsContextValue {
  return useContext(SettingsContext);
}
