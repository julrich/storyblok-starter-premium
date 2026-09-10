import {
  createContext,
  FC,
  PropsWithChildren,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";

export interface SearchParams extends URLSearchParams {
  set(name: string, value: string, replace?: boolean): void;
  delete(name: string, value?: string, replace?: boolean): void;
}

const SearchParamsContext = createContext<
  | {
      SearchParams: typeof URLSearchParams;
      subscribers: Set<() => void>;
      getCurrentUrl: () => URL;
    }
  | undefined
>(undefined);

export const useSearchParams = (): SearchParams => {
  const ctx = useContext(SearchParamsContext);

  if (!ctx) {
    throw "Don't call useSearchParams outside SearchParamsProvider";
  }

  const { subscribers, getCurrentUrl, SearchParams } = ctx;

  const search = useSyncExternalStore(
    (callback) => {
      subscribers.add(callback);
      return () => {
        subscribers.delete(callback);
      };
    },
    () => getCurrentUrl().search,
  );
  return useMemo(() => new SearchParams(search), [search]);
};

const getCurrentUrl = () => new URL(window.location.href);
const subscribers = new Set<() => void>();
const update = () => {
  for (const callback of subscribers) {
    callback();
  }
};
const navigate = (params: URLSearchParams, replace = false) => {
  const currentUrl = getCurrentUrl();
  const currentSearch = currentUrl.search;
  const nextSearch = params.toString();
  if (currentSearch !== nextSearch) {
    const nextUrl = new URL(currentUrl);
    nextUrl.search = nextSearch;
    if (replace) {
      history.replaceState(window.history.state, "", nextUrl);
    } else {
      history.pushState(window.history.state, "", nextUrl);
    }
    update();
  }
};
class MySearchParams extends URLSearchParams implements SearchParams {
  set(name: string, value: string, replace = false) {
    super.set(name, value);
    navigate(this, replace);
  }
  append() {
    throw "don't use append!";
  }
  delete(name: string, value?: string, replace = false) {
    super.delete(name, value);
    navigate(this, replace);
  }
}

window.addEventListener("popstate", update);

export const SearchParamsProvider: FC<PropsWithChildren> = ({ children }) => (
  <SearchParamsContext.Provider
    value={{ getCurrentUrl, SearchParams: MySearchParams, subscribers }}
  >
    {children}
  </SearchParamsContext.Provider>
);
