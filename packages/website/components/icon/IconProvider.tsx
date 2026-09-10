import { FC, PropsWithChildren } from "react";
import { IconContext } from "@kickstartds/base/lib/icon";
import { InlineIcon } from "@/token/InlineIcon";

export const IconProvider: FC<PropsWithChildren> = (props) => (
  // @ts-expect-error InlineIcon is not refable, but i thing that's ok
  <IconContext.Provider {...props} value={InlineIcon} />
);
