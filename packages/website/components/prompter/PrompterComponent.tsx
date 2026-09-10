import { FC, HTMLAttributes, forwardRef, useEffect } from "react";

import { Section } from "@kickstartds/design-system/section";
import { SplitEven } from "@kickstartds/design-system/split-even";
import { SplitWeighted } from "@kickstartds/design-system/split-weighted";

import {
  BlogTeaser,
  BlogTeaserContext,
  BlogTeaserContextDefault,
} from "@kickstartds/design-system/blog-teaser";
import { BusinessCard } from "@kickstartds/design-system/business-card";
import { Contact } from "@kickstartds/design-system/contact";
import { ContentNav } from "@kickstartds/design-system/content-nav";
import {
  Cta,
  CtaContext,
  CtaContextDefault,
} from "@kickstartds/design-system/cta";
import { Divider } from "@kickstartds/design-system/divider";
import { Downloads } from "@kickstartds/design-system/downloads";
import { Faq } from "@kickstartds/design-system/faq";
import { Features } from "@kickstartds/design-system/features";
import { Gallery } from "@kickstartds/design-system/gallery";
import { Headline } from "@kickstartds/design-system/headline";
import { Hero } from "@kickstartds/design-system/hero";
import { ImageStory } from "@kickstartds/design-system/image-story";
import { ImageText } from "@kickstartds/design-system/image-text";
import { Logos } from "@kickstartds/design-system/logos";
import { Mosaic } from "@kickstartds/design-system/mosaic";
import { Slider } from "@kickstartds/design-system/slider";
import { Stats } from "@kickstartds/design-system/stats";
import { TeaserCard } from "@kickstartds/design-system/teaser-card";
import { Testimonials } from "@kickstartds/design-system/testimonials";
import { Text } from "@kickstartds/design-system/text";
import { VideoCurtain } from "@kickstartds/design-system/video-curtain";

import {
  FeatureContext,
  FeatureContextDefault,
} from "@kickstartds/design-system/feature";
import {
  StatContext,
  StatContextDefault,
} from "@kickstartds/design-system/stat";
import {
  TestimonialContext,
  TestimonialContextDefault,
} from "@kickstartds/design-system/testimonial";
import {
  BlogHeadContext,
  BlogHeadContextDefault,
} from "@kickstartds/design-system/blog-head";
import {
  BlogAsideContext,
  BlogAsideContextDefault,
} from "@kickstartds/design-system/blog-aside";
import {
  BlogAuthorContext,
  BlogAuthorContextDefault,
} from "@kickstartds/design-system/blog-author";

import { InfoTable } from "../info-table/InfoTableComponent";

import PrompterBadge from "./prompter-badge/PrompterBadge";
import PrompterButton from "./prompter-button/PrompterButton";
import PrompterSection from "./prompter-section/PrompterSection";
import PrompterSectionInput from "./prompter-section-input/PrompterSectionInput";
import PrompterSelectionDisplay from "./prompter-selection-display/PrompterSelectionDisplay";
import PrompterSubmittedText from "./prompter-submitted-text/PrompterSubmittedText";
import { PrompterSelectField } from "./prompter-select-field/PrompterSelectField";
import PrompterModeToggle from "./prompter-mode-toggle/PrompterModeToggle";
import PrompterComponentPicker from "./prompter-component-picker/PrompterComponentPicker";
import PrompterPlanReview from "./prompter-plan-review/PrompterPlanReview";
import PrompterProgress from "./prompter-progress/PrompterProgress";
import PrompterWarnings from "./prompter-warnings/PrompterWarnings";
import { usePrompter, GeneratedSection } from "./usePrompter";
import { PrompterProps } from "./PrompterProps";

// ─── Component map for preview rendering ──────────────────────────────

const componentMap = {
  "blog-teaser": BlogTeaser,
  "business-card": BusinessCard,
  contact: Contact,
  "content-nav": ContentNav,
  cta: Cta,
  divider: Divider,
  downloads: Downloads,
  faq: Faq,
  features: Features,
  gallery: Gallery,
  headline: Headline,
  hero: Hero,
  "image-story": ImageStory,
  "image-text": ImageText,
  "info-table": InfoTable,
  logos: Logos,
  mosaic: Mosaic,
  slider: Slider,
  "split-even": SplitEven,
  "split-weighted": SplitWeighted,
  stats: Stats,
  "teaser-card": TeaserCard,
  testimonials: Testimonials,
  text: Text,
  "video-curtain": VideoCurtain,
} as const;

type ComponentMapKeys = keyof typeof componentMap;

function isComponentMapKey(key: string): key is ComponentMapKeys {
  return key in componentMap;
}

// ─── Preview context providers ────────────────────────────────────────

/**
 * Resets sub-component contexts to their DS defaults for preview rendering.
 *
 * In normal Storyblok rendering, sub-component contexts (FeatureContext, etc.)
 * are set to StoryblokSubComponent which resolves via the `component` field.
 * In preview mode, generated content uses DS-format props with `type` as the
 * discriminator — StoryblokSubComponent can't resolve these and renders empty
 * divs. By providing the original DS default renderers, sub-components render
 * correctly using their native DS props.
 */
const PreviewProviders: FC<{ children: React.ReactNode }> = ({ children }) => (
  <FeatureContext.Provider value={FeatureContextDefault}>
    <StatContext.Provider value={StatContextDefault}>
      <TestimonialContext.Provider value={TestimonialContextDefault}>
        <CtaContext.Provider value={CtaContextDefault}>
          <BlogTeaserContext.Provider value={BlogTeaserContextDefault}>
            <BlogHeadContext.Provider value={BlogHeadContextDefault}>
              <BlogAsideContext.Provider value={BlogAsideContextDefault}>
                <BlogAuthorContext.Provider value={BlogAuthorContextDefault}>
                  {children}
                </BlogAuthorContext.Provider>
              </BlogAsideContext.Provider>
            </BlogHeadContext.Provider>
          </BlogTeaserContext.Provider>
        </CtaContext.Provider>
      </TestimonialContext.Provider>
    </StatContext.Provider>
  </FeatureContext.Provider>
);

// ─── Preview renderer ─────────────────────────────────────────────────

/**
 * Renders a single generated section using Design System props.
 * The designSystemProps from generateSectionContent() are in DS format,
 * wrapped in a section envelope: { section: [{ components: [...], ...sectionProps }] }
 */
const SectionPreview: FC<{
  generated: GeneratedSection;
  index: number;
  onRegenerate?: (index: number) => void;
  isRegenerating?: boolean;
}> = ({ generated, index, onRegenerate, isRegenerating }) => {
  const dsProps = generated.designSystemProps;

  // The section may be at dsProps.section[0] (page envelope) or dsProps directly
  const sectionArray = dsProps?.section || (dsProps ? [dsProps] : []);

  if (!sectionArray.length || isRegenerating) {
    return (
      <div className="prompter-section-preview prompter-section-preview--loading">
        <span
          className="prompter-dots prompter-dots--small"
          aria-label="Regenerating"
        />
      </div>
    );
  }

  return (
    <div className="prompter-section-preview">
      {onRegenerate && (
        <button
          className="prompter-section-preview__regenerate"
          onClick={() => onRegenerate(index)}
          title="Regenerate this section"
          type="button"
        >
          ↻ Regenerate
        </button>
      )}
      {sectionArray.map((section: any, sIdx: number) => {
        const { components, ...sectionProps } = section;
        return (
          <Section key={sIdx} {...sectionProps}>
            {components?.map((component: any, cIdx: number) => {
              const { type, ...componentProps } = component;
              if (!type || !isComponentMapKey(type)) {
                console.warn("Unknown component type in preview:", type);
                return null;
              }
              const Component = componentMap[type];
              return <Component key={cIdx} {...componentProps} />;
            })}
          </Section>
        );
      })}
    </div>
  );
};

/**
 * Renders all generated sections with "AI Draft" badge.
 */
const PagePreview: FC<{
  sections: GeneratedSection[];
  onRegenerate?: (index: number) => void;
}> = ({ sections, onRegenerate }) => {
  return (
    <PreviewProviders>
      {sections.map((gen, index) => (
        <SectionPreview
          key={`${gen.componentType}-${index}`}
          generated={gen}
          index={index}
          onRegenerate={onRegenerate}
          isRegenerating={Object.keys(gen.designSystemProps || {}).length === 0}
        />
      ))}
    </PreviewProviders>
  );
};

// ─── Prompt textarea ──────────────────────────────────────────────────

const PromptTextarea: FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}> = ({ value, onChange, placeholder, disabled }) => (
  <textarea
    className="prompter-prompt-textarea"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    disabled={disabled}
    rows={3}
  />
);

// ─── Main Prompter Component ──────────────────────────────────────────

export const PrompterComponent = forwardRef<
  HTMLDivElement,
  PrompterProps & HTMLAttributes<HTMLDivElement>
>(
  (
    {
      mode: defaultMode = "section",
      componentTypes: defaultComponentTypes,
      sections: _sections,
      includeStory = true,
      useIdea = true,
      relatedStories = [],
      userPrompt = "",
      systemPrompt,
      contentType: defaultContentType,
      startsWith,
      uploadAssets = true,
      ...props
    },
    ref
  ) => {
    const prompter = usePrompter({
      defaultMode,
      includeStory,
      useIdea,
      userPrompt,
      systemPrompt,
      relatedStories,
      defaultComponentTypes: defaultComponentTypes || [],
      defaultContentType,
      startsWith,
      uploadAssets,
    });

    const { detectPrompterUid } = prompter;

    // Detect the prompter UID once mounted
    useEffect(() => {
      detectPrompterUid();
    }, [detectPrompterUid]);

    const {
      mode,
      step,
      prompt,
      error,
      ideas,
      selectedIdea,
      componentTypes,
      plan,
      generatedSections,
      currentSectionIndex,
      totalSections,
      warnings,
      isInitializing,
      storyError,
      ideasError,
      canGenerate,
      canPlan,
      canStartPageGeneration,
      canImport,
      setMode,
      setPrompt,
      setSelectedIdea,
      addComponentType,
      removeComponentType,
      moveComponentType,
      planPage,
      updatePlanSection,
      removePlanSection,
      movePlanSection,
      generate,
      regenerateSection,
      importSections,
      discard,
      prompterRef,
    } = prompter;

    const isConfiguring = step === "configure";
    const isPlanning = step === "planning";
    const isPlanReview = step === "plan-review";
    const isGenerating = step === "generating";
    const isPreview = step === "preview";
    const isImporting = step === "importing";
    const isSubmitted = step === "submitted";
    const isError = step === "error";

    // ── Headlines based on step ──────────────────────────────────────
    const getHeadline = (): string => {
      if (isSubmitted) return "Your new content has been saved";
      if (isImporting) return "Saving content…";
      if (isPreview) return "Review generated content";
      if (isGenerating) return "Generating content…";
      if (isPlanReview) return "Review the planned structure";
      if (isPlanning) return "Planning your page…";
      if (isError) return "Something went wrong";
      return "Prompter — create a content draft, fast, on-brand, seamlessly integrated.";
    };

    return (
      <div className="prompter" {...props} ref={ref}>
        <div ref={prompterRef}>
          <PrompterSection headline={getHeadline()}>
            {/* ── Step 1: Configure ──────────────────────────────── */}
            {isConfiguring && (
              <>
                {/* Initialization loading indicator */}
                {isInitializing && (
                  <div className="prompter-init-loading">
                    <span
                      className="prompter-dots prompter-dots--small"
                      aria-label="Loading"
                    />
                    <span>Loading context…</span>
                  </div>
                )}

                {/* Non-blocking warnings from init */}
                {storyError && (
                  <div className="prompter-init-warning">⚠ {storyError}</div>
                )}
                {ideasError && (
                  <div className="prompter-init-warning">⚠ {ideasError}</div>
                )}

                {/* Mode toggle */}
                <PrompterModeToggle mode={mode} onModeChange={setMode} />

                {/* Idea picker (optional) */}
                {useIdea && ideas.length > 0 && (
                  <>
                    {!selectedIdea && (
                      <PrompterSelectField
                        value={selectedIdea}
                        onChange={(e: any) => setSelectedIdea(e.target.value)}
                        options={[
                          {
                            label: "Select an idea…",
                            value: "",
                            disabled: true,
                          },
                          ...ideas.map((idea) => ({
                            value: idea.id,
                            label: idea.name,
                            disabled: false,
                          })),
                        ]}
                      />
                    )}
                    {selectedIdea && (
                      <PrompterSelectionDisplay
                        idea={
                          ideas.find((i) => i.id === selectedIdea)?.name || ""
                        }
                        text=""
                      />
                    )}
                  </>
                )}

                {/* Prompt / intent textarea */}
                <PromptTextarea
                  value={prompt}
                  onChange={setPrompt}
                  placeholder={
                    mode === "section"
                      ? "Describe the content you want to generate…"
                      : "Describe the page you want to create (e.g. 'product landing page for our new API')…"
                  }
                />

                {/* Section mode: component type picker */}
                {mode === "section" && (
                  <PrompterComponentPicker
                    selectedTypes={componentTypes}
                    onAdd={addComponentType}
                    onRemove={removeComponentType}
                    onMove={moveComponentType}
                  />
                )}

                {/* Action buttons */}
                <div className="prompter-section__button-row">
                  {mode === "section" && (
                    <PrompterButton
                      label="Generate"
                      icon="wand"
                      disabled={!canGenerate}
                      onClick={generate}
                    />
                  )}
                  {mode === "page" && (
                    <PrompterButton
                      label="Plan Content"
                      icon="wand"
                      disabled={!canPlan}
                      onClick={planPage}
                    />
                  )}
                </div>
              </>
            )}

            {/* ── Planning (page mode loading) ───────────────────── */}
            {isPlanning && (
              <div className="prompter-loading-indicator">
                <span className="prompter-dots" aria-label="Planning" />
              </div>
            )}

            {/* ── Plan review (page mode) ────────────────────────── */}
            {isPlanReview && plan?.sections && (
              <>
                <PrompterPlanReview
                  sections={plan.sections}
                  reasoning={plan.reasoning}
                  onRemove={removePlanSection}
                  onMove={movePlanSection}
                  onUpdateIntent={(index, intent) =>
                    updatePlanSection(index, { intent })
                  }
                  onGenerate={generate}
                />
                <div className="prompter-section__button-row">
                  <PrompterButton
                    variant="secondary"
                    label="Back"
                    onClick={discard}
                  />
                  <PrompterButton
                    label="Generate All"
                    icon="wand"
                    disabled={!canStartPageGeneration}
                    onClick={generate}
                  />
                </div>
              </>
            )}

            {/* ── Generating (progress bar) ──────────────────────── */}
            {isGenerating && (
              <>
                <PrompterProgress
                  current={currentSectionIndex}
                  total={totalSections}
                  currentType={
                    mode === "page"
                      ? plan?.sections?.[currentSectionIndex]?.componentType
                      : componentTypes[currentSectionIndex]
                  }
                />
                <span className="prompter-dots" aria-label="Generating" />
              </>
            )}

            {/* ── Preview: save / discard controls ───────────────── */}
            {isPreview && (
              <>
                {warnings.length > 0 && (
                  <PrompterWarnings warnings={warnings} />
                )}
                <div className="prompter-section__button-row">
                  <PrompterButton
                    variant="secondary"
                    label="Discard Content"
                    onClick={discard}
                  />
                  <PrompterButton
                    label="Save Content"
                    icon="save"
                    disabled={!canImport}
                    onClick={importSections}
                  />
                </div>
              </>
            )}

            {/* ── Importing ──────────────────────────────────────── */}
            {isImporting && (
              <div className="prompter-loading-indicator">
                <span className="prompter-dots" aria-label="Importing" />
              </div>
            )}

            {/* ── Submitted ──────────────────────────────────────── */}
            {isSubmitted && (
              <>
                <PrompterSubmittedText text="To avoid overwriting your new content, please reload the page now." />
                <PrompterButton
                  icon="reload"
                  label="Reload page"
                  onClick={() => window.location.reload()}
                />
              </>
            )}

            {/* ── Error ──────────────────────────────────────────── */}
            {isError && error && (
              <>
                <div className="prompter-error">
                  <svg
                    className="prompter-error__icon"
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{error}</span>
                </div>
                <div className="prompter-section__button-row">
                  <PrompterButton
                    variant="secondary"
                    label="Start Over"
                    onClick={discard}
                  />
                </div>
              </>
            )}
          </PrompterSection>
        </div>

        {/* ── Generated content preview ────────────────────────────── */}
        {(isPreview || isGenerating) && generatedSections.length > 0 && (
          <div className="prompter__generated-content">
            <PrompterBadge label="AI Draft" state="unsaved" />
            <PagePreview
              sections={generatedSections}
              onRegenerate={isPreview ? regenerateSection : undefined}
            />
          </div>
        )}
      </div>
    );
  }
);

PrompterComponent.displayName = "Prompter Component";
