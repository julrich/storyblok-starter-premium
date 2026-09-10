import initialTokens from "@kickstartds/design-system/tokens/branding-tokens.json";
import { tokensToCss } from "@kickstartds/design-system/tokens/tokensToCss.mjs";
import {
  createContext,
  Dispatch,
  FC,
  PropsWithChildren,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { usePreset } from "../presets/PresetContext";
import { useLocalStorage } from "../utils/useLocalStorage";

export interface ITokenContext {
  setTokens: Dispatch<SetStateAction<any>>;
  tokens: any;
  css: string;
  resetTokens: () => void;
  savePreset: (name?: string) => Promise<void>;
  /** Provides componentTokens to include when saving a preset. */
  setComponentTokensGetter: (getter: () => any) => void;
}

const TokenContext = createContext<ITokenContext>({
  setTokens() {},
  tokens: initialTokens,
  css: tokensToCss(initialTokens),
  resetTokens() {},
  async savePreset() {},
  setComponentTokensGetter() {},
});

export const TokenContextProvider: FC<PropsWithChildren> = ({ children }) => {
  const [tokens, setTokens] = useLocalStorage<object>("tokens", initialTokens);
  const { preset, savePreset } = usePreset();
  const css = useMemo(() => tokensToCss(tokens), [tokens]);

  // Ref for getting component tokens when saving
  const componentTokensGetterRef = useRef<(() => any) | null>(null);
  const setComponentTokensGetter = useCallback((getter: () => any) => {
    componentTokensGetterRef.current = getter;
  }, []);

  useEffect(() => {
    localStorage.setItem("css", css);
  }, [css]);

  useEffect(() => {
    if (preset) setTokens(preset);
  }, [preset]);

  return (
    <TokenContext.Provider
      value={{
        tokens,
        setTokens,
        css,
        resetTokens() {
          setTokens(preset || initialTokens);
        },
        savePreset(name) {
          const componentTokens = componentTokensGetterRef.current?.();
          const data: { tokens: any; componentTokens?: any } = { tokens };
          if (componentTokens && Object.keys(componentTokens).length > 0) {
            data.componentTokens = componentTokens;
          }
          return savePreset(data, name);
        },
        setComponentTokensGetter,
      }}
    >
      {children}
    </TokenContext.Provider>
  );
};

export const useToken = () => useContext(TokenContext);
