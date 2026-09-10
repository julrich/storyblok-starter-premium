import {
  createContext,
  FC,
  PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from "react";
import { useSearchParams } from "../utils/router";
import { useGet, usePut } from "../utils/useFetch";

export interface PresetListEntry {
  name: string;
  displayName: string;
  system: boolean;
  tokens?: string;
}

export interface IPresetContext {
  presetName: string | undefined;
  /** Branding tokens from the loaded preset. */
  preset: any | undefined;
  /** Component token overrides from the loaded preset. */
  componentTokenPreset: any | undefined;
  presetNames: PresetListEntry[] | null | undefined;
  isSystemPreset: boolean;
  getPresetList: (
    url?: string,
    options?: RequestInit,
  ) => Promise<PresetListEntry[] | null>;
  selectPreset: (name: string) => void;
  savePreset: (
    data: { tokens: any; componentTokens?: any },
    name?: string | null,
  ) => Promise<void>;
}

const PresetContext = createContext<IPresetContext>({
  presetName: undefined,
  preset: undefined,
  componentTokenPreset: undefined,
  presetNames: undefined,
  isSystemPreset: false,
  async getPresetList() {
    return null;
  },
  selectPreset() {},
  async savePreset() {},
});

export const PresetContextProvider: FC<PropsWithChildren> = ({ children }) => {
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get("t");

  const [presetName, setPresetName] = useState<string>();

  const { execute: getPreset, data: rawPreset } = useGet();

  // The GET response is { tokens: {...}, componentTokens?: {...} }
  // Extract branding tokens and component tokens separately
  const preset = rawPreset?.tokens ?? rawPreset;
  const componentTokenPreset = rawPreset?.componentTokens;
  const { execute: putPreset } = usePut();
  const { execute: getPresetList, data: presetNames } =
    useGet<PresetListEntry[]>("/api/tokens/");

  const isSystemPreset = Boolean(
    presetName && presetNames?.find((p) => p.name === presetName)?.system,
  );

  useEffect(() => {
    if (tokenParam !== presetName) {
      setPresetName(tokenParam || undefined);
    }
  }, [tokenParam]);

  useEffect(() => {
    if (presetName) {
      getPreset(`/api/tokens/${presetName}`).catch(() =>
        searchParams.delete("t", undefined, true),
      );
    }
  }, [presetName]);

  return (
    <PresetContext.Provider
      value={{
        presetName,
        preset,
        componentTokenPreset,
        getPresetList,
        presetNames,
        isSystemPreset,
        selectPreset(name) {
          if (name !== tokenParam) searchParams.set("t", name);
        },
        async savePreset(
          data: { tokens: any; componentTokens?: any },
          name = tokenParam,
        ) {
          if (data?.tokens && name)
            return putPreset(`/api/tokens/${name}`, {
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(data),
            });
        },
      }}
    >
      {children}
    </PresetContext.Provider>
  );
};

export const usePreset = () => useContext(PresetContext);
