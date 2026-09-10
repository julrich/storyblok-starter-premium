import { HTMLAttributes, createContext, forwardRef, useContext } from "react";
import { RichText } from "@kickstartds/base/lib/rich-text";
import { Icon } from "@kickstartds/base/lib/icon";
import { Picture } from "@kickstartds/base/lib/picture";
import { DownloadsProps } from "./DownloadsProps";
import "./downloads.scss";
import { deepMergeDefaults } from "../helpers";
import defaults from "./DownloadsDefaults";

export type { DownloadsProps };

export const DownloadsContextDefault = forwardRef<
  HTMLDivElement,
  DownloadsProps & HTMLAttributes<HTMLDivElement>
>(({ download }, ref) => {
  return (
    <div className="dsa-downloads" ref={ref}>
      {download.map((item, index) => (
        <a
          href={item?.url}
          target="_blank"
          className="dsa-downloads-item"
          aria-label="Download file"
          key={index}
        >
          {item?.previewImage ? (
            <Picture
              aria-hidden
              className="dsa-downloads-item__image"
              src={item.previewImage}
              alt=""
            />
          ) : (
            <Icon
              aria-hidden
              className="dsa-downloads-item__placeholder-icon"
              icon="file"
            />
          )}
          <div className="dsa-downloads-item__header">
            <span className="dsa-downloads-item__name">{item.name}</span>
            {(item?.format || item?.size || item?.description) && (
              <div className="dsa-downloads-item__infos">
                {item?.format && (
                  <span className="dsa-downloads-item__info dsa-downloads-item__format">
                    {item.format}
                  </span>
                )}

                {item?.size && (
                  <span className="dsa-downloads-item__info dsa-downloads-item__size">
                    {item.size}
                  </span>
                )}

                {item?.description && (
                  <RichText
                    className="dsa-downloads-item__description"
                    text={item.description}
                  />
                )}
              </div>
            )}
          </div>

          <span aria-hidden className="dsa-downloads-item__button">
            <span>Download</span>
            <Icon aria-hidden icon="download" />
          </span>
        </a>
      ))}
    </div>
  );
});

export const DownloadsContext = createContext(DownloadsContextDefault);
export const Downloads = forwardRef<
  HTMLDivElement,
  DownloadsProps & HTMLAttributes<HTMLDivElement>
>((props, ref) => {
  const Component = useContext(DownloadsContext);
  return <Component {...deepMergeDefaults(defaults, props)} ref={ref} />;
});
Downloads.displayName = "Downloads";
