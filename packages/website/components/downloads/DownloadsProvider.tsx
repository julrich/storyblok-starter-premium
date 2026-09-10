import {
  FC,
  PropsWithChildren,
  forwardRef,
  HTMLAttributes,
  useContext,
} from "react";
import {
  DownloadsContext,
  DownloadsContextDefault,
  DownloadsProps,
} from "@kickstartds/design-system/downloads";

const Downloads = forwardRef<
  HTMLDivElement,
  DownloadsProps &
    HTMLAttributes<HTMLDivElement> & { sharepointFolder?: string }
>(({ sharepointFolder, ...props }, ref) => {
  return <DownloadsContextDefault {...props} ref={ref} />;
});
Downloads.displayName = "Downloads";

export const DownloadsProvider: FC<PropsWithChildren> = (props) => (
  <DownloadsContext.Provider {...props} value={Downloads} />
);
