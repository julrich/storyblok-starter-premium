/**
 * usePrompter – state machine hook for the Prompter component.
 *
 * Manages the full lifecycle: mode selection → component picking (section mode)
 * or page planning (page mode) → section-by-section generation → preview →
 * import → submission.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { ISbStoryData } from "@storyblok/react";
import { traverse as objectTraverse } from "object-traversal";
import { unflatten } from "@/helpers/unflatten";

// ─── Types ────────────────────────────────────────────────────────────

export type PrompterMode = "section" | "page";

export type PrompterStep =
  | "configure" // Step 1: choose mode, prompt, component types, etc.
  | "planning" // Page mode: calling /api/prompter/plan
  | "plan-review" // Page mode: reviewing AI-proposed plan
  | "generating" // Both modes: sequential generate-section calls
  | "preview" // Both modes: all sections generated, ready to review
  | "importing" // Saving to Storyblok
  | "submitted" // Done — saved successfully
  | "error"; // Something went wrong

export interface Idea {
  id: string;
  name: string;
}

export interface PlannedSection {
  componentType: string;
  intent: string;
}

export interface PagePlan {
  sections?: PlannedSection[];
  rootFields?: Array<{ fieldName: string; intent: string }>;
  fields?: Array<{ fieldName: string; intent: string }>;
  reasoning: string;
}

export interface GeneratedSection {
  /** Storyblok-ready section object (for import). */
  section: Record<string, any>;
  /** Design System props (for preview rendering). */
  designSystemProps: Record<string, any>;
  /** The component type of this section. */
  componentType: string;
}

export interface UsePrompterOptions {
  /** Default mode from CMS props. */
  defaultMode?: PrompterMode;
  /** Whether to include the current story as context. */
  includeStory?: boolean;
  /** Whether to show the Idea picker. */
  useIdea?: boolean;
  /** Pre-configured user prompt from CMS. */
  userPrompt?: string;
  /** Pre-configured system prompt from CMS. */
  systemPrompt?: string;
  /** Related story slugs (from CMS). */
  relatedStories?: string[];
  /** Pre-selected component types from CMS (section mode). */
  defaultComponentTypes?: string[];
  /** Override content type detection. */
  defaultContentType?: string;
  /** Slug prefix filter for pattern analysis. */
  startsWith?: string;
  /** Upload generated image URLs to Storyblok CDN on save. */
  uploadAssets?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────

const BASE_URL =
  typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_SITE_URL || "";

/** Error with optional code from API responses. */
class PrompterApiError extends Error {
  public readonly code?: string;
  public readonly status: number;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "PrompterApiError";
    this.status = status;
    this.code = code;
  }
}

async function fetchJson<T = any>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new PrompterApiError(
      body.error || `Request failed: ${res.status}`,
      res.status,
      body.code
    );
  }
  return res.json();
}

/** User-friendly error message based on API error codes. */
function friendlyErrorMessage(err: unknown, context: string): string {
  if (err instanceof PrompterApiError) {
    if (err.code === "ENV_MISSING") return err.message;
    if (err.code === "RATE_LIMITED")
      return "Rate limit exceeded — please wait a moment and try again.";
    if (err.code === "AUTH_ERROR")
      return "AI service authentication failed. Please check the API key configuration.";
    if (err.status === 400) return `Invalid request: ${err.message}`;
    return err.message;
  }
  if (err instanceof Error) {
    if (err.name === "AbortError") return "";
    return err.message || `${context} failed`;
  }
  return `${context} failed`;
}

const storyblokKeys = ["_uid", "_editable", "component"];

/**
 * Process a Storyblok story: unflatten props, rename `type` fields,
 * and strip Storyblok internal keys.
 */
function processStory(story: ISbStoryData): Record<string, any> {
  const page = structuredClone(story);

  objectTraverse(
    page,
    ({ value, parent, key }) => {
      if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
      ) {
        if (parent && key !== undefined && key !== null) {
          parent[key] = unflatten(value);
        }
      } else if (Array.isArray(value)) {
        value.forEach((item, index) => {
          if (
            typeof item === "object" &&
            item !== null &&
            !Array.isArray(item)
          ) {
            value[index] = unflatten(item);
          }
        });
      }
    },
    { traversalType: "depth-first" }
  );

  objectTraverse(
    page,
    ({ key, value, parent }) => {
      if (key === "type" && parent && typeof value === "string") {
        parent[`type__${value}`] = value;
        delete parent[key];
      }
    },
    { traversalType: "depth-first" }
  );

  objectTraverse(page, ({ key, parent }) => {
    if (key && storyblokKeys.includes(key) && parent) {
      delete parent[key];
    }
  });

  return page;
}

/**
 * Detect the content type from a story's root component field.
 * Defaults to "page" if unrecognized.
 */
function detectContentType(story: Record<string, any>): string {
  const component = story?.content?.component || story?.component;
  const supported = [
    "page",
    "blog-post",
    "blog-overview",
    "event-detail",
    "event-list",
  ];
  return supported.includes(component) ? component : "page";
}

/**
 * Derive the component types of the sections surrounding the Prompter
 * in the current story. Used for transition context in section mode.
 */
function getSurroundingContext(
  story: Record<string, any> | null,
  prompterUid: string | undefined
): { previousSection?: string; nextSection?: string } {
  if (!story || !prompterUid) return {};

  // Get the section array from the story
  const sections: any[] =
    story?.content?.section || story?.content?.sections || story?.section || [];
  if (!Array.isArray(sections) || sections.length === 0) return {};

  const prompterIndex = sections.findIndex(
    (s: any) => s._uid === prompterUid || s.component === "prompter"
  );
  if (prompterIndex === -1) return {};

  // Find the component type of the sections before and after
  const prev = sections[prompterIndex - 1];
  const next = sections[prompterIndex + 1];

  const getFirstComponentType = (section: any): string | undefined => {
    const components = section?.components || section?.component_list || [];
    if (Array.isArray(components) && components.length > 0) {
      return components[0].component || components[0].type;
    }
    return undefined;
  };

  return {
    previousSection: prev ? getFirstComponentType(prev) : undefined,
    nextSection: next ? getFirstComponentType(next) : undefined,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────

export function usePrompter(options: UsePrompterOptions = {}) {
  const {
    defaultMode = "section",
    includeStory = true,
    useIdea = true,
    userPrompt: initialPrompt = "",
    systemPrompt,
    relatedStories = [],
    defaultComponentTypes = [],
    defaultContentType,
    startsWith,
    uploadAssets = true,
  } = options;

  // ── Core state ────────────────────────────────────────────────────
  const [mode, setMode] = useState<PrompterMode>(defaultMode);
  const [step, setStep] = useState<PrompterStep>("configure");
  const [prompt, setPrompt] = useState(initialPrompt);
  const [contentType, setContentType] = useState(defaultContentType || "page");
  const [error, setError] = useState<string | null>(null);

  // ── Initialization tracking ───────────────────────────────────────
  const [isStoryLoading, setIsStoryLoading] = useState(includeStory);
  const [isIdeasLoading, setIsIdeasLoading] = useState(useIdea);
  const [storyError, setStoryError] = useState<string | null>(null);
  const [ideasError, setIdeasError] = useState<string | null>(null);

  // ── Ideas ─────────────────────────────────────────────────────────
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [selectedIdea, setSelectedIdea] = useState("");

  // ── Section mode: selected component types ────────────────────────
  const [componentTypes, setComponentTypes] = useState<string[]>(
    defaultComponentTypes
  );

  // ── Page mode: plan ───────────────────────────────────────────────
  const [plan, setPlan] = useState<PagePlan | null>(null);

  // ── Generation ────────────────────────────────────────────────────
  const [generatedSections, setGeneratedSections] = useState<
    GeneratedSection[]
  >([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [totalSections, setTotalSections] = useState(0);

  // ── Import / warnings ─────────────────────────────────────────────
  const [warnings, setWarnings] = useState<string[]>([]);

  // ── Story context ─────────────────────────────────────────────────
  const [storyUid, setStoryUid] = useState<string | undefined>();
  const [prompterUid, setPrompterUid] = useState<string | undefined>();
  const [story, setStory] = useState<Record<string, any> | null>(null);
  const [rawStory, setRawStory] = useState<ISbStoryData | null>(null);

  // ── Cancellation ──────────────────────────────────────────────────
  const abortRef = useRef<AbortController | null>(null);

  // ── Initialization: detect story UID from DOM ─────────────────────
  useEffect(() => {
    const blok = document.querySelector("[data-blok-c]");
    const blokMetaString = blok?.getAttribute("data-blok-c");
    if (!blokMetaString) {
      console.warn("Could not find blok meta for prompter");
      return;
    }
    const meta = JSON.parse(blokMetaString);
    setStoryUid(meta.id);
  }, []);

  // ── Detect prompter UID from its own blok data ────────────────────
  const prompterRef = useRef<HTMLDivElement>(null);
  const detectPrompterUid = useCallback(() => {
    const el = prompterRef.current?.closest("[data-blok-c]");
    const metaString = el?.getAttribute("data-blok-c");
    if (metaString) {
      const { uid } = JSON.parse(metaString);
      setPrompterUid(uid);
    }
  }, []);

  // ── Fetch current story ───────────────────────────────────────────
  useEffect(() => {
    if (!storyUid || !includeStory) {
      setIsStoryLoading(false);
      return;
    }

    fetchJson(
      `${BASE_URL}/api/prompter/story?uid=${encodeURIComponent(storyUid)}`
    )
      .then((json) => {
        const raw = json.story as ISbStoryData;
        setRawStory(raw);
        const processed = processStory(raw);
        setStory(processed);
        // Only auto-detect content type if not explicitly set via CMS prop
        if (!defaultContentType) {
          setContentType(detectContentType(raw));
        }
        setStoryError(null);
      })
      .catch((err) => {
        console.error("Failed to fetch story:", err);
        setStoryError(
          "Failed to load story context. Generation will proceed without it."
        );
      })
      .finally(() => setIsStoryLoading(false));
  }, [storyUid, includeStory, defaultContentType]);

  // ── Fetch ideas ───────────────────────────────────────────────────
  useEffect(() => {
    if (!useIdea) {
      setIsIdeasLoading(false);
      return;
    }
    fetchJson(`${BASE_URL}/api/prompter/ideas`)
      .then((json) => {
        setIdeas(json.response?.data?.ideas || json.ideas || []);
        setIdeasError(null);
      })
      .catch((err) => {
        console.error("Failed to fetch ideas:", err);
        setIdeasError("Ideas could not be loaded.");
      })
      .finally(() => setIsIdeasLoading(false));
  }, [useIdea]);

  // ── Build prompt with idea and story context ──────────────────────
  const buildPrompt = useCallback((): string => {
    let fullPrompt = prompt;

    if (useIdea && selectedIdea) {
      const ideaContent: string[] = [];
      const idea = ideas.find((i) => i.id === selectedIdea);
      if (idea) {
        objectTraverse(idea, ({ value }) => {
          if (value && value.type === "text" && value.text)
            ideaContent.push(value.text);
        });
      }
      fullPrompt += `\n\n((Idea)):\n${ideaContent.join(" ")}`;
    }

    if (includeStory && rawStory) {
      fullPrompt += `\n\n((Story)):\n${JSON.stringify(rawStory.content)}`;
    }

    if (relatedStories.length > 0) {
      relatedStories.forEach((rs) => {
        fullPrompt += `\n\n((Related Story)):\n${rs}`;
      });
    }

    return fullPrompt;
  }, [
    prompt,
    useIdea,
    selectedIdea,
    ideas,
    includeStory,
    rawStory,
    relatedStories,
  ]);

  // ── Section mode: manage component type list ──────────────────────
  const addComponentType = useCallback((type: string) => {
    setComponentTypes((prev) => [...prev, type]);
  }, []);

  const removeComponentType = useCallback((index: number) => {
    setComponentTypes((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const moveComponentType = useCallback(
    (fromIndex: number, toIndex: number) => {
      setComponentTypes((prev) => {
        const next = [...prev];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        return next;
      });
    },
    []
  );

  // ── Page mode: plan the page ──────────────────────────────────────
  const planPage = useCallback(async () => {
    setStep("planning");
    setError(null);

    try {
      const result = await fetchJson(`${BASE_URL}/api/prompter/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: buildPrompt(),
          contentType,
        }),
      });

      setPlan(result.plan);
      setStep("plan-review");
    } catch (err: any) {
      setError(friendlyErrorMessage(err, "Page planning"));
      setStep("error");
    }
  }, [buildPrompt, contentType]);

  // ── Plan editing ──────────────────────────────────────────────────
  const updatePlanSection = useCallback(
    (index: number, updates: Partial<PlannedSection>) => {
      setPlan((prev) => {
        if (!prev?.sections) return prev;
        const sections = [...prev.sections];
        sections[index] = { ...sections[index], ...updates };
        return { ...prev, sections };
      });
    },
    []
  );

  const removePlanSection = useCallback((index: number) => {
    setPlan((prev) => {
      if (!prev?.sections) return prev;
      return { ...prev, sections: prev.sections.filter((_, i) => i !== index) };
    });
  }, []);

  const addPlanSection = useCallback(
    (componentType: string, afterIndex: number) => {
      setPlan((prev) => {
        if (!prev) return prev;
        const sections = [...(prev.sections || [])];
        sections.splice(afterIndex + 1, 0, {
          componentType,
          intent: prompt,
        });
        return { ...prev, sections };
      });
    },
    [prompt]
  );

  const movePlanSection = useCallback((fromIndex: number, toIndex: number) => {
    setPlan((prev) => {
      if (!prev?.sections) return prev;
      const sections = [...prev.sections];
      const [moved] = sections.splice(fromIndex, 1);
      sections.splice(toIndex, 0, moved);
      return { ...prev, sections };
    });
  }, []);

  // ── Generate sections ─────────────────────────────────────────────
  const generate = useCallback(async () => {
    setStep("generating");
    setError(null);
    setGeneratedSections([]);
    setWarnings([]);

    // Determine the list of sections to generate
    let sectionList: Array<{ componentType: string; prompt: string }>;

    if (mode === "page" && plan?.sections) {
      sectionList = plan.sections.map((s) => ({
        componentType: s.componentType,
        prompt: s.intent || prompt,
      }));
    } else {
      // Section mode: one generate call per selected component type
      sectionList = componentTypes.map((ct) => ({
        componentType: ct,
        prompt: buildPrompt(),
      }));
    }

    if (sectionList.length === 0) {
      setError("No sections to generate");
      setStep("error");
      return;
    }

    setTotalSections(sectionList.length);

    // Get surrounding context from the story (for transition awareness)
    const storyContext = getSurroundingContext(rawStory, prompterUid);

    const abort = new AbortController();
    abortRef.current = abort;

    const generated: GeneratedSection[] = [];

    for (let i = 0; i < sectionList.length; i++) {
      if (abort.signal.aborted) break;
      setCurrentSectionIndex(i);

      const { componentType: ct, prompt: sectionPrompt } = sectionList[i];

      // Derive transition context
      let previousSection: string | undefined;
      let nextSection: string | undefined;

      if (sectionList.length === 1) {
        // Single section: use story context
        previousSection = storyContext.previousSection;
        nextSection = storyContext.nextSection;
      } else {
        // Multiple sections: edge sections use story, inner use list
        if (i === 0) {
          previousSection = storyContext.previousSection;
          nextSection = sectionList[i + 1]?.componentType;
        } else if (i === sectionList.length - 1) {
          previousSection = generated[i - 1]?.componentType;
          nextSection = storyContext.nextSection;
        } else {
          previousSection = generated[i - 1]?.componentType;
          nextSection = sectionList[i + 1]?.componentType;
        }
      }

      try {
        const result = await fetchJson<GeneratedSection>(
          `${BASE_URL}/api/prompter/generate-section`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              componentType: ct,
              prompt: sectionPrompt,
              contentType,
              system: systemPrompt,
              previousSection: previousSection || undefined,
              nextSection: nextSection || undefined,
            }),
            signal: abort.signal,
          }
        );

        generated.push(result);
        setGeneratedSections([...generated]);
      } catch (err: any) {
        if (err.name === "AbortError") break;
        setError(friendlyErrorMessage(err, `Generating ${ct} section`));
        setStep("error");
        return;
      }
    }

    if (!abort.signal.aborted) {
      setStep("preview");
    }
  }, [
    mode,
    plan,
    componentTypes,
    buildPrompt,
    prompt,
    contentType,
    systemPrompt,
    rawStory,
    prompterUid,
  ]);

  // ── Regenerate a single section ───────────────────────────────────
  const regenerateSection = useCallback(
    async (index: number) => {
      const sections =
        mode === "page" && plan?.sections
          ? plan.sections.map((s) => ({
              componentType: s.componentType,
              prompt: s.intent || prompt,
            }))
          : componentTypes.map((ct) => ({
              componentType: ct,
              prompt: buildPrompt(),
            }));

      const { componentType: ct, prompt: sectionPrompt } = sections[index];
      const storyContext = getSurroundingContext(rawStory, prompterUid);

      let previousSection: string | undefined;
      let nextSection: string | undefined;

      if (sections.length === 1) {
        previousSection = storyContext.previousSection;
        nextSection = storyContext.nextSection;
      } else {
        previousSection =
          index > 0
            ? generatedSections[index - 1]?.componentType
            : storyContext.previousSection;
        nextSection =
          index < sections.length - 1
            ? sections[index + 1]?.componentType
            : storyContext.nextSection;
      }

      // Mark as regenerating (keep in preview step but show loading on that section)
      const prevSections = [...generatedSections];
      prevSections[index] = {
        ...prevSections[index],
        section: {},
        designSystemProps: {},
        componentType: ct,
      };
      setGeneratedSections(prevSections);

      try {
        const result = await fetchJson<GeneratedSection>(
          `${BASE_URL}/api/prompter/generate-section`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              componentType: ct,
              prompt: sectionPrompt,
              contentType,
              system: systemPrompt,
              previousSection: previousSection || undefined,
              nextSection: nextSection || undefined,
            }),
          }
        );

        setGeneratedSections((prev) => {
          const next = [...prev];
          next[index] = result;
          return next;
        });
      } catch (err: any) {
        // Restore previous section on failure
        setGeneratedSections(prevSections);
        setError(friendlyErrorMessage(err, "Regenerating section"));
      }
    },
    [
      mode,
      plan,
      componentTypes,
      buildPrompt,
      prompt,
      contentType,
      systemPrompt,
      rawStory,
      prompterUid,
      generatedSections,
    ]
  );

  // ── Import (save to Storyblok) ────────────────────────────────────
  const importSections = useCallback(async () => {
    if (!storyUid || !prompterUid) {
      setError("Missing story or prompter UID");
      return;
    }

    setStep("importing");
    setError(null);

    try {
      const sections = generatedSections.map((gs) => gs.section);

      const result = await fetchJson(`${BASE_URL}/api/prompter/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyUid,
          prompterUid,
          sections,
          contentType,
          publish: true,
          uploadAssets,
        }),
      });

      if (result.warnings) {
        setWarnings(result.warnings);
      }

      setStep("submitted");
    } catch (err: any) {
      setError(friendlyErrorMessage(err, "Saving content"));
      setStep("error");
    }
  }, [storyUid, prompterUid, generatedSections, contentType, uploadAssets]);

  // ── Discard & reset ───────────────────────────────────────────────
  const discard = useCallback(() => {
    abortRef.current?.abort();
    setStep("configure");
    setGeneratedSections([]);
    setPlan(null);
    setWarnings([]);
    setError(null);
    setCurrentSectionIndex(0);
    setTotalSections(0);
  }, []);

  // ── Can-proceed guards ────────────────────────────────────────────
  const isInitializing = isStoryLoading || isIdeasLoading;

  const canGenerate =
    mode === "section"
      ? componentTypes.length > 0 && prompt.trim().length > 0 && !isInitializing
      : false;

  const canPlan =
    mode === "page" && prompt.trim().length > 0 && !isInitializing;

  const canStartPageGeneration =
    mode === "page" && plan !== null && (plan.sections?.length || 0) > 0;

  const canImport = step === "preview" && generatedSections.length > 0;

  // ── Return ────────────────────────────────────────────────────────
  return {
    // State
    mode,
    step,
    prompt,
    contentType,
    error,
    ideas,
    selectedIdea,
    componentTypes,
    plan,
    generatedSections,
    currentSectionIndex,
    totalSections,
    warnings,
    story,
    storyUid,
    prompterUid,

    // Loading / init states
    isInitializing,
    isStoryLoading,
    isIdeasLoading,
    storyError,
    ideasError,

    // Guards
    canGenerate,
    canPlan,
    canStartPageGeneration,
    canImport,

    // Actions
    setMode,
    setPrompt,
    setSelectedIdea,
    setContentType,
    addComponentType,
    removeComponentType,
    moveComponentType,
    planPage,
    updatePlanSection,
    removePlanSection,
    addPlanSection,
    movePlanSection,
    generate,
    regenerateSection,
    importSections,
    discard,
    detectPrompterUid,

    // Refs
    prompterRef,
  };
}
