import { createContext, useContext } from "react";

export interface HeaderButtonConfig {
  enabled?: boolean;
  label?: string;
  url?: string;
}

const HeaderButtonContext = createContext<HeaderButtonConfig>({});

export const useHeaderButton = () => useContext(HeaderButtonContext);

export default HeaderButtonContext;
