import {
  forwardRef,
  createContext,
  useContext,
  HTMLAttributes,
  useMemo,
} from "react";
import classnames from "classnames";
import { useKsComponent } from "@kickstartds/core/lib/react";
import { Icon } from "@kickstartds/base/lib/icon";
import { GalleryProps } from "./GalleryProps";
import "./gallery.scss";
import { TextMedia } from "@kickstartds/base/lib/text-media";
import { deepMergeDefaults } from "../helpers";
import defaults from "./GalleryDefaults";
import { identifier } from "./Gallery.client";

export type { GalleryProps };

export const GalleryContextDefault = forwardRef<
  HTMLDivElement,
  GalleryProps & HTMLAttributes<HTMLDivElement>
>(
  (
    {
      lightbox = false,
      layout = "smallTiles",
      aspectRatio = "square",
      images = [],
      ...rest
    },
    ref,
  ) => {
    const galleryId = useMemo(() => `gallery-${Date.now()}`, []);
    const componentProps = useKsComponent(identifier, ref, [
      layout === "slider",
    ]);

    const renderImage = (
      image: { src: string; alt?: string; caption?: string },
      index: number,
    ) => (
      <TextMedia
        key={index}
        media={[
          {
            ...(lightbox && {
              lightboxImage: {
                thumb: image.src,
                image: image.src,
                alt: image.alt,
                gallery: galleryId,
              },
            }),
            ...(lightbox === false && {
              image: {
                src: image.src,
                alt: image.alt,
                gallery: galleryId,
              },
            }),
            caption: image.caption,
          },
        ]}
        text={undefined}
      />
    );

    if (layout === "slider") {
      return (
        <div {...rest} {...componentProps} className="dsa-gallery">
          <div className="dsa-gallery__slider">
            <div className="dsa-gallery__slider-track">
              {images.map((image, index) => (
                <div className="dsa-gallery__slider-item" key={index}>
                  {renderImage(image, index)}
                </div>
              ))}
            </div>
          </div>
          <div className="dsa-gallery__slider-controls">
            <div className="dsa-gallery__slider-nav">
              <button
                aria-label="Back"
                className="dsa-gallery__slider-arrow dsa-gallery__slider-arrow--back"
              >
                <Icon icon="arrow-left" />
              </button>
              <button
                aria-label="Forward"
                className="dsa-gallery__slider-arrow dsa-gallery__slider-arrow--forward"
              >
                <Icon icon="arrow-right" />
              </button>
            </div>
            <div className="dsa-gallery__slider-progress">
              <div className="dsa-gallery__slider-progress-bar" />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div {...rest} {...componentProps} className="dsa-gallery">
        <div
          className={classnames(
            `dsa-gallery__grid`,
            `dsa-gallery__grid--${
              layout === "smallTiles"
                ? "small-tiles"
                : layout === "largeTiles"
                  ? "large-tiles"
                  : layout
            }`,
          )}
        >
          {images.map((image, index) => (
            <div
              className={classnames(
                "dsa-gallery__image",
                aspectRatio !== "unset" && `dsa-gallery__image--${aspectRatio}`,
              )}
              key={index}
            >
              {renderImage(image, index)}
            </div>
          ))}
        </div>
      </div>
    );
  },
);

export const GalleryContext = createContext(GalleryContextDefault);
export const Gallery = forwardRef<
  HTMLDivElement,
  GalleryProps & HTMLAttributes<HTMLDivElement>
>((props, ref) => {
  const Component = useContext(GalleryContext);
  return <Component {...deepMergeDefaults(defaults, props)} ref={ref} />;
});
Gallery.displayName = "Gallery";
