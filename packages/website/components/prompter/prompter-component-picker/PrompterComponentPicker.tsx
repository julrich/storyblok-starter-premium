import { Icon } from "@kickstartds/base/lib/icon";
import React, { useState } from "react";

/** Available component types with display labels. */
export const SECTION_COMPONENT_TYPES: Array<{
  value: string;
  label: string;
}> = [
  { value: "hero", label: "Hero" },
  { value: "cta", label: "Call to Action" },
  { value: "faq", label: "FAQ" },
  { value: "features", label: "Features" },
  { value: "testimonials", label: "Testimonials" },
  { value: "text", label: "Text" },
  { value: "image-text", label: "Image & Text" },
  { value: "image-story", label: "Image Story" },
  { value: "stats", label: "Stats" },
  { value: "logos", label: "Logos" },
  { value: "gallery", label: "Gallery" },
  { value: "blog-teaser", label: "Blog Teaser" },
  { value: "contact", label: "Contact" },
  { value: "mosaic", label: "Mosaic" },
  { value: "video-curtain", label: "Video Curtain" },
  { value: "slider", label: "Slider" },
  { value: "downloads", label: "Downloads" },
  { value: "business-card", label: "Business Card" },
  { value: "content-nav", label: "Content Nav" },
  { value: "divider", label: "Divider" },
];

interface PrompterComponentPickerProps {
  selectedTypes: string[];
  onAdd: (type: string) => void;
  onRemove: (index: number) => void;
  onMove: (fromIndex: number, toIndex: number) => void;
}

const PrompterComponentPicker: React.FC<PrompterComponentPickerProps> = ({
  selectedTypes,
  onAdd,
  onRemove,
  onMove,
}) => {
  const [pickerValue, setPickerValue] = useState("");

  const handleAdd = () => {
    if (pickerValue) {
      onAdd(pickerValue);
      setPickerValue("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  const getLabel = (type: string): string => {
    return SECTION_COMPONENT_TYPES.find((t) => t.value === type)?.label || type;
  };

  return (
    <div className="prompter-component-picker">
      {selectedTypes.length > 0 && (
        <div className="prompter-component-picker__list">
          {selectedTypes.map((type, index) => (
            <div
              key={`${type}-${index}`}
              className="prompter-component-picker__item"
            >
              <span className="prompter-component-picker__index">
                {index + 1}
              </span>
              <span className="prompter-component-picker__type-label">
                {getLabel(type)}
              </span>
              <div className="prompter-component-picker__actions">
                {index > 0 && (
                  <button
                    className="prompter-component-picker__move-btn"
                    onClick={() => onMove(index, index - 1)}
                    title="Move up"
                    type="button"
                  >
                    ↑
                  </button>
                )}
                {index < selectedTypes.length - 1 && (
                  <button
                    className="prompter-component-picker__move-btn"
                    onClick={() => onMove(index, index + 1)}
                    title="Move down"
                    type="button"
                  >
                    ↓
                  </button>
                )}
                <button
                  className="prompter-component-picker__remove-btn"
                  onClick={() => onRemove(index)}
                  title="Remove"
                  type="button"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="prompter-component-picker__add-row">
        <div className="prompter-component-picker__select-wrapper">
          <select
            className="prompter-component-picker__select"
            value={pickerValue}
            onChange={(e) => setPickerValue(e.target.value)}
            onKeyDown={handleKeyDown}
          >
            <option value="" disabled>
              Choose a component type…
            </option>
            {SECTION_COMPONENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <Icon
            icon="chevron-down"
            className="prompter-component-picker__select-icon"
          />
        </div>
        <button
          className="prompter-component-picker__add-btn"
          onClick={handleAdd}
          disabled={!pickerValue}
          type="button"
        >
          Add
          <div className="prompter-component-picker__add-btn-icon" />
        </button>
      </div>
    </div>
  );
};

export default PrompterComponentPicker;
