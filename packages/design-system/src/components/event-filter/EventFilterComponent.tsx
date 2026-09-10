import { createContext, forwardRef, useContext } from "react";
import { EventFilterProps } from "./EventFilterProps";
import "./event-filter.scss";
import { TextField } from "@kickstartds/form/lib/text-field";
import { Checkbox } from "@kickstartds/form/lib/checkbox";
import { Button } from "../button/ButtonComponent";
import { deepMergeDefaults } from "../helpers";
import defaults from "./EventFilterDefaults";

export type { EventFilterProps };

export const EventFilterContextDefault = forwardRef<
  HTMLDivElement,
  EventFilterProps
>(
  (
    {
      categories = {
        title: "Categories",
        toggle: true,
      },
      datePicker = {
        title: "Find Appointment",
        toggle: true,
      },
      applyButton = {
        label: "Filter Appointments",
      },
      resetButton = {
        label: "Reset Filters",
      },
    },
    ref
  ) => (
    <div className="dsa-event-filter" ref={ref}>
      {datePicker?.toggle && (
        <>
          <span className="dsa-event-filter__topic">
            {datePicker.title || "Find Appointment"}
          </span>
          <div className="dsa-event-filter__item">
            <div className="dsa-event-filter__date-picker">
              <TextField
                type="date"
                label={datePicker.dateFromInput.label || "From"}
                placeholder={
                  datePicker.dateFromInput.placeholder || "Select a date"
                }
              />
              <TextField
                type="date"
                label={datePicker.dateToInput.label || "To"}
                placeholder={
                  datePicker.dateToInput.placeholder || "Select a date"
                }
              />
            </div>
          </div>
        </>
      )}
      {categories && categories?.toggle && (
        <>
          <span className="dsa-event-filter__topic">
            {categories?.title || "Categories"}
          </span>
          <div className="dsa-event-filter__item">
            <div className="dsa-event-filter__categories">
              {categories &&
                categories.categoryCheckboxes.length > 0 &&
                categories.categoryCheckboxes.map((category, index) => (
                  <Checkbox key={index} label={category} />
                ))}
            </div>
          </div>
        </>
      )}

      <div className="dsa-event-filter__buttons">
        <Button
          size="small"
          label={applyButton?.label || "Filter Appointments"}
          variant="primary"
          onClick={() => {
            // Handle button click
          }}
        />

        <Button
          size="small"
          label={resetButton?.label || "Reset Filters"}
          onClick={() => {
            // Handle button click
          }}
        />
      </div>
    </div>
  )
);

export const EventFilterContext = createContext(EventFilterContextDefault);
export const EventFilter = forwardRef<HTMLDivElement, EventFilterProps>(
  (props, ref) => {
    const Component = useContext(EventFilterContext);
    return <Component {...deepMergeDefaults(defaults, props)} ref={ref} />;
  }
);
EventFilter.displayName = "EventFilter";
