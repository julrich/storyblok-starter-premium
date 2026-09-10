/**
 * Tests for MCP prompt definitions and message generation.
 *
 * Verifies prompt listing, argument validation, and message generation
 * for all 6 workflow prompts.
 *
 * @see src/prompts.ts
 */

import {
  PROMPT_DEFINITIONS,
  getPromptMessages,
  type PromptDefinition,
  type PromptMessage,
} from "../src/prompts.js";

// ── Prompt definitions ─────────────────────────────────────────────

describe("PROMPT_DEFINITIONS", () => {
  it("exports exactly 6 prompts", () => {
    expect(PROMPT_DEFINITIONS).toHaveLength(6);
  });

  it("contains all expected prompt names", () => {
    const names = PROMPT_DEFINITIONS.map((p) => p.name);
    expect(names).toContain("create-page");
    expect(names).toContain("migrate-from-url");
    expect(names).toContain("create-blog-post");
    expect(names).toContain("content-audit");
    expect(names).toContain("extend-page");
    expect(names).toContain("translate-page");
  });

  it("every prompt has a non-empty name and description", () => {
    PROMPT_DEFINITIONS.forEach((p) => {
      expect(typeof p.name).toBe("string");
      expect(p.name.length).toBeGreaterThan(0);
      expect(typeof p.description).toBe("string");
      expect(p.description.length).toBeGreaterThan(10);
    });
  });

  it("every prompt has an arguments array", () => {
    PROMPT_DEFINITIONS.forEach((p) => {
      expect(Array.isArray(p.arguments)).toBe(true);
    });
  });

  it("every argument has name, description, and required fields", () => {
    PROMPT_DEFINITIONS.forEach((p) => {
      p.arguments.forEach((arg) => {
        expect(typeof arg.name).toBe("string");
        expect(arg.name.length).toBeGreaterThan(0);
        expect(typeof arg.description).toBe("string");
        expect(arg.description.length).toBeGreaterThan(0);
        expect(typeof arg.required).toBe("boolean");
      });
    });
  });

  it("every prompt has at least one required argument", () => {
    // content-audit has no required args — verify that's the only exception
    const promptsWithNoRequired = PROMPT_DEFINITIONS.filter(
      (p) => !p.arguments.some((a) => a.required)
    );
    expect(promptsWithNoRequired.map((p) => p.name)).toEqual(["content-audit"]);
  });
});

// ── Individual prompt definitions ──────────────────────────────────

describe("create-page prompt", () => {
  const prompt = PROMPT_DEFINITIONS.find((p) => p.name === "create-page")!;

  it("has intent as required argument", () => {
    const intentArg = prompt.arguments.find((a) => a.name === "intent");
    expect(intentArg).toBeDefined();
    expect(intentArg!.required).toBe(true);
  });

  it("has optional slug, sectionCount, contentType, path arguments", () => {
    const optionalArgs = prompt.arguments.filter((a) => !a.required);
    const optionalNames = optionalArgs.map((a) => a.name);
    expect(optionalNames).toContain("slug");
    expect(optionalNames).toContain("sectionCount");
    expect(optionalNames).toContain("contentType");
    expect(optionalNames).toContain("path");
  });
});

describe("migrate-from-url prompt", () => {
  const prompt = PROMPT_DEFINITIONS.find((p) => p.name === "migrate-from-url")!;

  it("has url as required argument", () => {
    const urlArg = prompt.arguments.find((a) => a.name === "url");
    expect(urlArg).toBeDefined();
    expect(urlArg!.required).toBe(true);
  });
});

describe("create-blog-post prompt", () => {
  const prompt = PROMPT_DEFINITIONS.find((p) => p.name === "create-blog-post")!;

  it("has topic as required argument", () => {
    const topicArg = prompt.arguments.find((a) => a.name === "topic");
    expect(topicArg).toBeDefined();
    expect(topicArg!.required).toBe(true);
  });

  it("has optional slug and author arguments", () => {
    const optionalNames = prompt.arguments
      .filter((a) => !a.required)
      .map((a) => a.name);
    expect(optionalNames).toContain("slug");
    expect(optionalNames).toContain("author");
  });
});

describe("translate-page prompt", () => {
  const prompt = PROMPT_DEFINITIONS.find((p) => p.name === "translate-page")!;

  it("has sourceSlug and targetLanguage as required arguments", () => {
    const required = prompt.arguments.filter((a) => a.required);
    const requiredNames = required.map((a) => a.name);
    expect(requiredNames).toContain("sourceSlug");
    expect(requiredNames).toContain("targetLanguage");
  });
});

describe("extend-page prompt", () => {
  const prompt = PROMPT_DEFINITIONS.find((p) => p.name === "extend-page")!;

  it("has storyId as required argument", () => {
    const storyIdArg = prompt.arguments.find((a) => a.name === "storyId");
    expect(storyIdArg).toBeDefined();
    expect(storyIdArg!.required).toBe(true);
  });
});

// ── Message generation ─────────────────────────────────────────────

describe("getPromptMessages", () => {
  it("throws for unknown prompt name", () => {
    expect(() => getPromptMessages("nonexistent", {})).toThrow(
      /Unknown prompt/
    );
  });

  describe.each(PROMPT_DEFINITIONS.map((p) => p.name))(
    "%s — message structure",
    (promptName) => {
      const minArgs: Record<string, string> = {};
      // Provide minimal required args for each prompt
      const prompt = PROMPT_DEFINITIONS.find((p) => p.name === promptName)!;
      prompt.arguments
        .filter((a) => a.required)
        .forEach((a) => {
          minArgs[a.name] = `test-${a.name}`;
        });

      it("returns an array of PromptMessage objects", () => {
        const messages = getPromptMessages(promptName, minArgs);
        expect(Array.isArray(messages)).toBe(true);
        expect(messages.length).toBeGreaterThanOrEqual(1);
      });

      it("returns messages with valid role and content", () => {
        const messages = getPromptMessages(promptName, minArgs);
        messages.forEach((msg) => {
          expect(["user", "assistant"]).toContain(msg.role);
          expect(msg.content.type).toBe("text");
          expect(typeof msg.content.text).toBe("string");
          expect(msg.content.text.length).toBeGreaterThan(0);
        });
      });

      it("starts with a user message", () => {
        const messages = getPromptMessages(promptName, minArgs);
        expect(messages[0].role).toBe("user");
      });

      it("ends with an assistant message", () => {
        const messages = getPromptMessages(promptName, minArgs);
        expect(messages[messages.length - 1].role).toBe("assistant");
      });

      it("returns exactly 2 messages (user + assistant)", () => {
        const messages = getPromptMessages(promptName, minArgs);
        expect(messages).toHaveLength(2);
      });
    }
  );
});

// ── Argument interpolation ─────────────────────────────────────────

describe("argument interpolation", () => {
  it("create-page interpolates intent into messages", () => {
    const messages = getPromptMessages("create-page", {
      intent: "AI-powered landing page",
    });
    expect(messages[0].content.text).toContain("AI-powered landing page");
    expect(messages[1].content.text).toContain("AI-powered landing page");
  });

  it("create-page includes slug when provided", () => {
    const messages = getPromptMessages("create-page", {
      intent: "test",
      slug: "my-slug",
    });
    expect(messages[0].content.text).toContain("my-slug");
  });

  it("create-page includes path when provided", () => {
    const messages = getPromptMessages("create-page", {
      intent: "test",
      path: "en/services",
    });
    expect(messages[0].content.text).toContain("en/services");
  });

  it("create-page includes contentType when provided", () => {
    const messages = getPromptMessages("create-page", {
      intent: "test",
      contentType: "blog-post",
    });
    expect(messages[0].content.text).toContain("blog-post");
  });

  it("migrate-from-url interpolates URL into messages", () => {
    const messages = getPromptMessages("migrate-from-url", {
      url: "https://example.com/page",
    });
    expect(messages[0].content.text).toContain("https://example.com/page");
    expect(messages[1].content.text).toContain("https://example.com/page");
  });

  it("create-blog-post interpolates topic", () => {
    const messages = getPromptMessages("create-blog-post", {
      topic: "AI Trends 2026",
    });
    expect(messages[0].content.text).toContain("AI Trends 2026");
    expect(messages[1].content.text).toContain("AI Trends 2026");
  });

  it("create-blog-post includes author when provided", () => {
    const messages = getPromptMessages("create-blog-post", {
      topic: "test",
      author: "Jane Doe",
    });
    expect(messages[0].content.text).toContain("Jane Doe");
  });

  it("content-audit includes startsWith filter", () => {
    const messages = getPromptMessages("content-audit", {
      startsWith: "blog/",
    });
    expect(messages[0].content.text).toContain("blog/");
  });

  it("content-audit works with no arguments", () => {
    const messages = getPromptMessages("content-audit", {});
    expect(messages).toHaveLength(2);
    expect(messages[0].content.text).toContain("Audit");
  });

  it("extend-page interpolates storyId and intent", () => {
    const messages = getPromptMessages("extend-page", {
      storyId: "home",
      intent: "add a FAQ section",
    });
    expect(messages[0].content.text).toContain("home");
    expect(messages[0].content.text).toContain("add a FAQ section");
  });

  it("translate-page interpolates sourceSlug and targetLanguage", () => {
    const messages = getPromptMessages("translate-page", {
      sourceSlug: "en/about-us",
      targetLanguage: "de",
    });
    expect(messages[0].content.text).toContain("en/about-us");
    expect(messages[0].content.text).toContain("de");
    expect(messages[1].content.text).toContain("en/about-us");
    expect(messages[1].content.text).toContain("de");
  });
});

// ── Workflow instructions ──────────────────────────────────────────

describe("workflow instructions in messages", () => {
  it("create-page references key tools in the workflow", () => {
    const messages = getPromptMessages("create-page", { intent: "test" });
    const text = messages[0].content.text;
    expect(text).toContain("analyze_content_patterns");
    expect(text).toContain("plan_page");
    expect(text).toContain("generate_section");
    expect(text).toContain("create_page_with_content");
  });

  it("migrate-from-url references scrape_url tool", () => {
    const messages = getPromptMessages("migrate-from-url", {
      url: "https://example.com",
    });
    expect(messages[0].content.text).toContain("scrape_url");
  });

  it("create-blog-post references blog-specific tools and fields", () => {
    const messages = getPromptMessages("create-blog-post", {
      topic: "test",
    });
    const text = messages[0].content.text;
    expect(text).toContain("blog-post");
    expect(text).toContain("generate_root_field");
    expect(text).toContain("generate_seo");
    expect(text).toContain("head");
    expect(text).toContain("aside");
    expect(text).toContain("cta");
  });

  it("content-audit references analysis tools", () => {
    const messages = getPromptMessages("content-audit", {});
    const text = messages[0].content.text;
    expect(text).toContain("content_audit");
    expect(text).toContain("analyze_content_patterns");
    expect(text).toContain("get_story");
  });

  it("extend-page references import tool", () => {
    const messages = getPromptMessages("extend-page", { storyId: "home" });
    expect(messages[0].content.text).toContain("import_content_at_position");
  });

  it("translate-page references translation workflow tools", () => {
    const messages = getPromptMessages("translate-page", {
      sourceSlug: "en/about",
      targetLanguage: "de",
    });
    const text = messages[0].content.text;
    expect(text).toContain("get_story");
    expect(text).toContain("generate_section");
    expect(text).toContain("create_page_with_content");
  });
});
