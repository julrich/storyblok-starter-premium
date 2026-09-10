/**
 * Component and asset introspection functions for Storyblok.
 *
 * Pure functions that accept a StoryblokClient (Management API) and return results.
 * No framework-specific code — usable from API routes, MCP servers, or n8n nodes.
 */
import StoryblokClient from "storyblok-js-client";
import { StoryblokApiError } from "./types.js";
import type { ListAssetsOptions } from "./types.js";

// ─── List Components ──────────────────────────────────────────────────

/**
 * List all components defined in the Storyblok space.
 *
 * Returns component schemas including field definitions, validation rules,
 * presets, and nesting constraints.
 */
export async function listComponents(
  client: StoryblokClient,
  spaceId: string
): Promise<Record<string, any>[]> {
  try {
    const response = await client.get(`spaces/${spaceId}/components/`);
    return response.data.components;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new StoryblokApiError(`Failed to list components: ${message}`);
  }
}

// ─── Get Component ────────────────────────────────────────────────────

/**
 * Get a specific component by its technical name.
 *
 * @throws {StoryblokApiError} if the component is not found.
 */
export async function getComponent(
  client: StoryblokClient,
  spaceId: string,
  name: string
): Promise<Record<string, any>> {
  const components = await listComponents(client, spaceId);
  const component = components.find(
    (c: Record<string, any>) => c.name === name
  );

  if (!component) {
    throw new StoryblokApiError(`Component "${name}" not found`);
  }

  return component;
}

// ─── List Assets ──────────────────────────────────────────────────────

/**
 * List assets (images, files) in the Storyblok space.
 *
 * Supports pagination, filename search, and folder filtering.
 */
export async function listAssets(
  client: StoryblokClient,
  spaceId: string,
  options: ListAssetsOptions = {}
): Promise<Record<string, any>> {
  const params: Record<string, unknown> = {
    page: options.page || 1,
    per_page: options.perPage || 25,
  };

  if (options.search) {
    params.search = options.search;
  }

  if (options.inFolder) {
    params.in_folder = options.inFolder;
  }

  try {
    const response = await client.get(`spaces/${spaceId}/assets/`, params);
    return response.data;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new StoryblokApiError(`Failed to list assets: ${message}`);
  }
}
