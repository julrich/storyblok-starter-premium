import { FC, PropsWithChildren, createContext, useContext } from "react";
import { DEFAULT_LANGUAGE } from "@/helpers/i18n";

// German is this site's default language, so an unwrapped component reads
// as German rather than as English.
const LanguageContext = createContext<string>(DEFAULT_LANGUAGE);
export const LanguageProvider: FC<PropsWithChildren<{ language: string }>> = (
  props,
) => {
  return (
    <LanguageContext.Provider value={props.language}>
      {props.children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  return useContext(LanguageContext);
};

type Alternate = { id?: number; full_slug?: string };

const AlternatesContext = createContext<Alternate[]>([]);
export const AlternatesProvider: FC<
  PropsWithChildren<{ alternates: Alternate[] }>
> = (props) => {
  return (
    <AlternatesContext.Provider value={props.alternates}>
      {props.children}
    </AlternatesContext.Provider>
  );
};

export const useAlternates = () => {
  return useContext(AlternatesContext);
};
