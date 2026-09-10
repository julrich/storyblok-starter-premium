import { PropsWithChildren } from "react";
import "lazysizes/plugins/attrchange/ls.attrchange";
import { PageWrapper } from "../components/page-wrapper/PageWrapperComponent";
import { useTheme } from "../themes/useTheme";

export default function Frame({
  children,
  theme,
}: PropsWithChildren<{ themeName: string | null; theme: any | null }>) {
  useTheme(theme?.tokens);
  return <PageWrapper>{children}</PageWrapper>;
}
