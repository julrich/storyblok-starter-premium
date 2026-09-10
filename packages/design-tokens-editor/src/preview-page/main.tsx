import { PageWrapper } from "@kickstartds/design-system/page-wrapper";
import Providers from "@kickstartds/design-system/providers";
import React, {
  FunctionComponent,
  lazy,
  LazyExoticComponent,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import ReactDOM from "react-dom/client";
import "@kickstartds/design-system/global.client.js";
import "@kickstartds/design-system/global.css";

const styleTag = document.createElement("style");
styleTag.setAttribute("data-tokens", "");
document.head.appendChild(styleTag);

const componentStyleTag = document.createElement("style");
componentStyleTag.setAttribute("data-component-tokens", "");
document.head.appendChild(componentStyleTag);

/**
 * Keep the component-token override style tag at the END of <head> so it
 * wins the CSS cascade over the component default token definitions that
 * Vite injects later.  Re-appending an existing element moves it.
 */
const ensureComponentStyleTagLast = () => {
  if (componentStyleTag !== document.head.lastElementChild) {
    document.head.appendChild(componentStyleTag);
  }
};
const headObserver = new MutationObserver(ensureComponentStyleTagLast);
headObserver.observe(document.head, { childList: true });

const updateLinkTag = (key: string, href: string | undefined) => {
  let linkTag = document.head.querySelector(`[data-font="${key}"]`);

  if (href) {
    if (!linkTag) {
      linkTag = document.createElement("link");
      (linkTag as HTMLLinkElement).rel = "stylesheet";
      linkTag.setAttribute("data-font", key);
      document.head.appendChild(linkTag);
    }
    (linkTag as HTMLLinkElement).href = href;
  } else if (linkTag) {
    document.head.removeChild(linkTag);
  }
};

const updateTokens = () => {
  styleTag.textContent = localStorage.getItem("css");
  componentStyleTag.textContent = localStorage.getItem("componentCss") || "";
  ensureComponentStyleTagLast();

  const rawTokens = localStorage.getItem("tokens");
  if (rawTokens) {
    try {
      const tokens = JSON.parse(rawTokens);
      const { _fontHref = {} } = tokens;
      for (const key in _fontHref) {
        updateLinkTag(key, _fontHref[key]);
      }
    } catch (e) {
      console.error(e);
      console.log("rawTokens", rawTokens);
    }
  }
};

window.addEventListener("storage", updateTokens);
updateTokens();

const ComponentPreviewPage = lazy(() => import("./ComponentPreviewPage"));

const pages: Record<string, LazyExoticComponent<FunctionComponent>> = {
  "color-demo": lazy(
    () => import("@kickstartds/design-system/playground/color-demo"),
  ),
  "font-demo": lazy(
    () => import("@kickstartds/design-system/playground/font-demo"),
  ),
  "spacing-demo": lazy(
    () => import("@kickstartds/design-system/playground/spacing-demo"),
  ),
  "border-demo": lazy(
    () => import("@kickstartds/design-system/playground/border-demo"),
  ),
  "shadow-demo": lazy(
    () => import("@kickstartds/design-system/playground/shadow-demo"),
  ),
  "transition-demo": lazy(
    () => import("@kickstartds/design-system/playground/transition-demo"),
  ),
  landingpage: lazy(
    () => import("@kickstartds/design-system/pages/landingpage"),
  ),
  about: lazy(() => import("@kickstartds/design-system/pages/about")),
  jobs: lazy(() => import("@kickstartds/design-system/pages/jobs")),
  "jobs-detail": lazy(
    () => import("@kickstartds/design-system/pages/jobs-detail"),
  ),
  overview: lazy(() => import("@kickstartds/design-system/pages/overview")),
};

const Demo = () => {
  const [category, setCategory] = useState("color-demo");
  const DemoComponent = useMemo(() => pages[category], [category]);
  const isComponentPreview = category.startsWith("component/");
  // Hash format: component/{componentId} or component/{componentId}/{storyId}
  const componentSegment = isComponentPreview
    ? category.slice("component/".length)
    : null;
  const firstSlash = componentSegment?.indexOf("/") ?? -1;
  const componentId = componentSegment
    ? firstSlash === -1
      ? componentSegment
      : componentSegment.slice(0, firstSlash)
    : null;
  const storyId =
    componentSegment && firstSlash !== -1
      ? componentSegment.slice(firstSlash + 1)
      : null;
  const hashHandler = useCallback(() => {
    const hash = location.hash.slice(2).split("?")[0];
    if (hash) setCategory(hash);
  }, []);

  useEffect(() => {
    hashHandler();
    window.addEventListener("hashchange", hashHandler);
    return () => window.removeEventListener("hashchange", hashHandler);
  }, [hashHandler]);

  const invertedHandler = useCallback(() => {
    const query = location.hash.slice(2).split("?")[1];
    const params = new URLSearchParams(query);
    const inverted = params.get("inverted");
    if (inverted === "1") {
      document.documentElement
        .querySelector("#root")
        ?.setAttribute("ks-inverted", "true");
    } else {
      document.documentElement
        .querySelector("#root")
        ?.removeAttribute("ks-inverted");
    }
  }, []);

  useEffect(() => {
    invertedHandler();
    window.addEventListener("hashchange", invertedHandler);
    return () => window.removeEventListener("hashchange", invertedHandler);
  }, [invertedHandler]);

  return (
    <Suspense>
      {isComponentPreview && componentId ? (
        <ComponentPreviewPage componentId={componentId} storyId={storyId} />
      ) : (
        DemoComponent && <DemoComponent />
      )}
    </Suspense>
  );
};

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {/* <style>{`
      head, style[data-tokens] {
        display: block;
        white-space: pre;
        font-family: var(--ks-brand-font-family-mono);
      }
    `}</style> */}
    <PageWrapper>
      <Providers>
        <Demo />
      </Providers>
    </PageWrapper>
  </React.StrictMode>,
);
