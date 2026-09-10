import { createContext, forwardRef, useContext } from "react";
import { EventAppointmentProps } from "./EventAppointmentProps";
import "./event-appointment.scss";
import { Icon } from "@kickstartds/base/lib/icon";
import { deepMergeDefaults } from "../helpers";
import defaults from "./EventAppointmentDefaults";

export type { EventAppointmentProps };

export const EventAppointmentContextDefault = forwardRef<
  HTMLAnchorElement,
  EventAppointmentProps
>(({ date, time, label, url, newTab, ariaLabel }, ref) => (
  <a
    className="dsa-event-appointment"
    target={newTab ? "_blank" : "_self"}
    aria-label={ariaLabel}
    href={url}
    ref={ref}
  >
    <span className="dsa-event-appointment__infos">
      {date && (
        <span className="dsa-event-appointment__info dsa-event-appointment__info--date">
          <Icon
            className="dsa-event-appointment__icon"
            aria-hidden
            icon={"date"}
          />
          {date}
        </span>
      )}
      {time && (
        <span className="dsa-event-appointment__info dsa-event-appointment__info--time">
          <Icon
            className="dsa-event-appointment__icon"
            aria-hidden
            icon={"time"}
          />
          {time}
        </span>
      )}
    </span>
    <span className="dsa-event-appointment__label">
      {label}
      <Icon icon={"chevron-right"} />
    </span>
  </a>
));

export const EventAppointmentContext = createContext(
  EventAppointmentContextDefault
);
export const EventAppointment = forwardRef<
  HTMLAnchorElement,
  EventAppointmentProps
>((props, ref) => {
  const Component = useContext(EventAppointmentContext);
  return <Component {...deepMergeDefaults(defaults, props)} ref={ref} />;
});
EventAppointment.displayName = "EventAppointment";
