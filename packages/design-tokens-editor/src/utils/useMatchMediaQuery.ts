import { useState, useEffect } from "react";

export const useMatchMediaQuery = (mediaQuery: string) => {
  const [matchMediaQuery, setMatchMediaQuery] = useState(false);
  useEffect(() => {
    const breakpoint = window.matchMedia(mediaQuery);
    const updateMatch = ({ matches }: MediaQueryListEvent | MediaQueryList) =>
      setMatchMediaQuery(matches);

    updateMatch(breakpoint);
    breakpoint.addEventListener("change", updateMatch);

    return () => {
      breakpoint.removeEventListener("change", updateMatch);
    };
  }, []);

  return matchMediaQuery;
};
