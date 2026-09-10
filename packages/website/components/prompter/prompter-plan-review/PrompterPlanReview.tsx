import React from "react";

interface PlannedSection {
  componentType: string;
  intent: string;
}

interface PrompterPlanReviewProps {
  sections: PlannedSection[];
  reasoning?: string;
  onRemove: (index: number) => void;
  onMove: (fromIndex: number, toIndex: number) => void;
  onUpdateIntent: (index: number, intent: string) => void;
  onGenerate: () => void;
  disabled?: boolean;
}

const labelMap: Record<string, string> = {
  hero: "Hero",
  cta: "Call to Action",
  faq: "FAQ",
  features: "Features",
  testimonials: "Testimonials",
  text: "Text",
  "image-text": "Image & Text",
  "image-story": "Image Story",
  stats: "Stats",
  logos: "Logos",
  gallery: "Gallery",
  "blog-teaser": "Blog Teaser",
  contact: "Contact",
  mosaic: "Mosaic",
  "video-curtain": "Video Curtain",
  slider: "Slider",
  downloads: "Downloads",
  "business-card": "Business Card",
  "content-nav": "Content Nav",
  divider: "Divider",
};

function getLabel(type: string): string {
  return labelMap[type] || type;
}

const PrompterPlanReview: React.FC<PrompterPlanReviewProps> = ({
  sections,
  reasoning,
  onRemove,
  onMove,
  onUpdateIntent,
  onGenerate,
  disabled = false,
}) => {
  return (
    <div className="prompter-plan-review">
      {reasoning && (
        <div className="prompter-plan-review__reasoning">
          <strong>AI reasoning:</strong> {reasoning}
        </div>
      )}

      <div className="prompter-plan-review__list">
        {sections.map((section, index) => (
          <div
            key={`${section.componentType}-${index}`}
            className="prompter-plan-review__item"
          >
            <div className="prompter-plan-review__header">
              <span className="prompter-plan-review__index">{index + 1}</span>
              <span className="prompter-plan-review__type">
                {getLabel(section.componentType)}
              </span>
              <div className="prompter-plan-review__actions">
                {index > 0 && (
                  <button
                    className="prompter-plan-review__move-btn"
                    onClick={() => onMove(index, index - 1)}
                    title="Move up"
                    type="button"
                    disabled={disabled}
                  >
                    ↑
                  </button>
                )}
                {index < sections.length - 1 && (
                  <button
                    className="prompter-plan-review__move-btn"
                    onClick={() => onMove(index, index + 1)}
                    title="Move down"
                    type="button"
                    disabled={disabled}
                  >
                    ↓
                  </button>
                )}
                <button
                  className="prompter-plan-review__remove-btn"
                  onClick={() => onRemove(index)}
                  title="Remove section"
                  type="button"
                  disabled={disabled}
                >
                  ×
                </button>
              </div>
            </div>
            <input
              className="prompter-plan-review__intent"
              value={section.intent}
              onChange={(e) => onUpdateIntent(index, e.target.value)}
              placeholder="Section intent…"
              disabled={disabled}
            />
          </div>
        ))}
      </div>

      {sections.length === 0 && (
        <div className="prompter-plan-review__empty">
          All sections removed. Go back to reconfigure.
        </div>
      )}
    </div>
  );
};

export default PrompterPlanReview;
