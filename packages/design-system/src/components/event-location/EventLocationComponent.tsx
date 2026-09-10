import classnames from "classnames";
import { createContext, forwardRef, useContext } from "react";
import { EventLocationProps } from "./EventLocationProps";
import "./event-location.scss";
import { RichText } from "@kickstartds/base/lib/rich-text";
import { Icon } from "@kickstartds/base/lib/icon";
import { EventAppointment } from "../event-appointment/EventAppointmentComponent";
import { Container } from "@kickstartds/core/lib/container";
import { deepMergeDefaults } from "../helpers";
import defaults from "./EventLocationDefaults";

export type { EventLocationProps };

export const EventLocationContextDefault = forwardRef<
  HTMLDivElement,
  EventLocationProps
>(({ locationName, address, dates, links, displayMode, ...rest }, ref) => (
  <Container name="event-location">
    <div
      className={classnames(
        "dsa-event-location",
        displayMode === "spacious" && `dsa-event-location--spacious`
      )}
      {...rest}
      ref={ref}
    >
      {address && (
        <div className="dsa-event-location__info ">
          <Icon
            className="dsa-event-location__icon"
            icon={"map-pin"}
            aria-hidden
          />
          <div className="dsa-event-location__text">
            <span className="sr-only">Address:</span>
            <address className="dsa-event-location__address">
              {locationName && (
                <span className="dsa-event-location__name">{locationName}</span>
              )}
              {address && <RichText text={address} />}
            </address>
            {links && links.length > 0 && (
              <div className="dsa-event-location__links">
                {links.map((link, index) => (
                  <a
                    href={link.url}
                    target={link.newTab ? "_blank" : "_self"}
                    className="dsa-event-location__link"
                    key={index}
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {dates && dates.length > 0 && (
        <div className="dsa-event-location__appointments">
          <span className="sr-only">Appointments:</span>
          {dates.map((item, index) => (
            <EventAppointment {...item} key={index} />
          ))}
        </div>
      )}
    </div>
  </Container>
));

export const EventLocationContext = createContext(EventLocationContextDefault);
export const EventLocation = forwardRef<HTMLDivElement, EventLocationProps>(
  (props, ref) => {
    const Component = useContext(EventLocationContext);
    return <Component {...deepMergeDefaults(defaults, props)} ref={ref} />;
  }
);
EventLocation.displayName = "EventLocation";
