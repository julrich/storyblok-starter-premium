/**
 * OpenAI content generation service functions.
 *
 * Pure functions that accept an OpenAI client and return results.
 * No framework-specific code — usable from API routes, MCP servers, or n8n nodes.
 */
import { OpenAI } from "openai";
import type { OpenAiCredentials, GenerateContentOptions } from "./types.js";
import { ContentGenerationError, OpenAiApiError } from "./types.js";

// ─── Client factory ───────────────────────────────────────────────────

/**
 * Create an OpenAI client from credentials.
 */
export function createOpenAiClient(credentials: OpenAiCredentials): OpenAI {
  return new OpenAI({ apiKey: credentials.apiKey });
}

// ─── Content generation ───────────────────────────────────────────────

const DEFAULT_MODEL = "gpt-4o-2024-08-06";

/**
 * Generate structured content via OpenAI using JSON Schema `response_format`.
 *
 * @returns Parsed JSON object matching the provided schema.
 * @throws {ContentGenerationError} when the response is empty or unparseable.
 * @throws {OpenAiApiError} when the OpenAI API call itself fails.
 */
export async function generateStructuredContent(
  client: OpenAI,
  options: GenerateContentOptions
): Promise<Record<string, unknown>> {
  const { system, prompt, schema, model = DEFAULT_MODEL } = options;

  let result;
  try {
    result = await client.chat.completions.create({
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: schema,
      },
      model,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new OpenAiApiError(`OpenAI API call failed: ${message}`);
  }

  const content = result.choices[0]?.message?.content;

  if (!content) {
    throw new ContentGenerationError(
      "OpenAI returned an empty response – no content generated."
    );
  }

  try {
    return JSON.parse(content);
  } catch {
    throw new ContentGenerationError(
      `OpenAI response is not valid JSON: ${content.substring(0, 200)}`
    );
  }
}
