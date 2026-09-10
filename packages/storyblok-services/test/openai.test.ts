import { jest, describe, it, expect, beforeEach } from "@jest/globals";

// ─── Mock OpenAI ──────────────────────────────────────────────────────

const mockCreate = jest.fn<(...args: any[]) => any>();

jest.unstable_mockModule("openai", () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  })),
}));

const { OpenAI } = await import("openai");
const {
  generateStructuredContent,
  createOpenAiClient,
  ContentGenerationError,
  OpenAiApiError,
} = await import("../src/index.js");

describe("OpenAI services", () => {
  let client: InstanceType<typeof OpenAI>;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new OpenAI({ apiKey: "test-key" });
  });

  describe("createOpenAiClient", () => {
    it("should create a client with the provided API key", () => {
      const c = createOpenAiClient({ apiKey: "sk-test" });
      expect(c).toBeDefined();
    });
  });

  describe("generateStructuredContent", () => {
    it("should call OpenAI with correct parameters", async () => {
      const mockResponse = { headline: "Hello", text: "World" };
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockResponse) } }],
      });

      const result = await generateStructuredContent(client, {
        system: "You are a content writer.",
        prompt: "Create a hero section",
        schema: { name: "hero", strict: true, schema: { type: "object" } },
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
            name: "hero",
            strict: true,
            schema: { type: "object" },
          },
        },
        model: "gpt-4o-2024-08-06",
      });

      expect(result).toEqual(mockResponse);
    });

    it("should use default model when not specified", async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: '{"ok":true}' } }],
      });

      await generateStructuredContent(client, {
        system: "test",
        prompt: "test",
        schema: { name: "test", schema: { type: "object" } },
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ model: "gpt-4o-2024-08-06" })
      );
    });

    it("should throw ContentGenerationError on empty response", async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: null } }],
      });

      await expect(
        generateStructuredContent(client, {
          system: "test",
          prompt: "test",
          schema: { name: "test", schema: { type: "object" } },
        })
      ).rejects.toThrow(ContentGenerationError);
    });

    it("should throw ContentGenerationError on invalid JSON", async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: "not valid json" } }],
      });

      await expect(
        generateStructuredContent(client, {
          system: "test",
          prompt: "test",
          schema: { name: "test", schema: { type: "object" } },
        })
      ).rejects.toThrow(ContentGenerationError);
    });

    it("should throw OpenAiApiError when API call fails", async () => {
      mockCreate.mockRejectedValue(new Error("API rate limit exceeded"));

      await expect(
        generateStructuredContent(client, {
          system: "test",
          prompt: "test",
          schema: { name: "test", schema: { type: "object" } },
        })
      ).rejects.toThrow(OpenAiApiError);
    });
  });
});
