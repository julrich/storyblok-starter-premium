import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import {
  generateStructuredContent,
  PRESET_SCHEMAS,
} from "../nodes/StoryblokKickstartDs/GenericFunctions";

// ─── Mock OpenAI ──────────────────────────────────────────────────────

const mockCreate = jest.fn<(...args: any[]) => any>();

jest.mock("openai", () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  })),
}));

import { OpenAI } from "openai";

describe("Generate Content", () => {
  let client: OpenAI;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new OpenAI({ apiKey: "test-key" });
  });

  // ── Preset schemas ────────────────────────────────────────────────

  describe("Preset schemas", () => {
    it("should have all expected preset schemas", () => {
      const expectedPresets = [
        "hero",
        "faq",
        "testimonials",
        "features",
        "cta",
        "text",
        "blog-teaser",
        "stats",
        "image-text",
      ];

      for (const preset of expectedPresets) {
        expect(PRESET_SCHEMAS[preset]).toBeDefined();
        expect(PRESET_SCHEMAS[preset].name).toBeTruthy();
        expect(PRESET_SCHEMAS[preset].schema).toBeDefined();
        expect(PRESET_SCHEMAS[preset].schema.type).toBe("object");
      }
    });

    it("hero schema should require headline, text, and buttons", () => {
      const { schema } = PRESET_SCHEMAS.hero;
      expect(schema.required).toContain("headline");
      expect(schema.required).toContain("text");
      expect(schema.required).toContain("buttons");
    });

    it("faq schema should require questions array", () => {
      const { schema } = PRESET_SCHEMAS.faq;
      expect(schema.required).toContain("questions");
      const props = schema.properties as Record<string, any>;
      expect(props.questions.type).toBe("array");
    });
  });

  // ── generateStructuredContent ─────────────────────────────────────

  describe("generateStructuredContent", () => {
    it("should call OpenAI with correct parameters", async () => {
      const mockResponse = {
        headline: "Test Hero",
        text: "This is test content",
        buttons: [{ label: "Click", url: "/test" }],
      };

      mockCreate.mockResolvedValue({
        choices: [
          {
            message: { content: JSON.stringify(mockResponse) },
          },
        ],
      });

      const result = await generateStructuredContent(client as any, {
        system: "You are a content writer.",
        prompt: "Create a hero section",
        schema: {
          name: "hero_section",
          strict: true,
          schema: PRESET_SCHEMAS.hero.schema,
        },
        model: "gpt-4o-2024-08-06",
      });

      expect(mockCreate).toHaveBeenCalledWith({
        messages: [
          { role: "system", content: "You are a content writer." },
          { role: "user", content: "Create a hero section" },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "hero_section",
            strict: true,
            schema: PRESET_SCHEMAS.hero.schema,
          },
        },
        model: "gpt-4o-2024-08-06",
      });

      expect(result).toEqual(mockResponse);
    });

    it("should throw on empty AI response", async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: null } }],
      });

      await expect(
        generateStructuredContent(client as any, {
          system: "test",
          prompt: "test",
          schema: { name: "test", schema: { type: "object" } },
          model: "gpt-4o-2024-08-06",
        })
      ).rejects.toThrow("empty response");
    });

    it("should throw on invalid JSON response", async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: "not valid json" } }],
      });

      await expect(
        generateStructuredContent(client as any, {
          system: "test",
          prompt: "test",
          schema: { name: "test", schema: { type: "object" } },
          model: "gpt-4o-2024-08-06",
        })
      ).rejects.toThrow();
    });

    it("should support custom schema pass-through", async () => {
      const customSchema = {
        type: "object" as const,
        properties: {
          title: { type: "string" },
          items: { type: "array", items: { type: "string" } },
        },
        required: ["title"],
      };

      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                title: "Custom",
                items: ["a", "b"],
              }),
            },
          },
        ],
      });

      const result = await generateStructuredContent(client as any, {
        system: "test",
        prompt: "generate custom content",
        schema: { name: "custom", strict: true, schema: customSchema },
        model: "gpt-4o-mini",
      });

      expect(result).toEqual({ title: "Custom", items: ["a", "b"] });
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ model: "gpt-4o-mini" })
      );
    });
  });
});
