/**
 * Storyblok Management API client for token theme CRUD operations.
 *
 * Stores token themes as Storyblok stories under settings/themes/ folder.
 * Each theme is a story using the "token-theme" content type with fields:
 * - name: Display name
 * - tokens: JSON string of branding token values
 * - css: Compiled CSS custom properties
 */

const STORYBLOK_API_BASE_DEFAULT = "https://api.storyblok.com/v1";

function getApiBase(config: StoryblokConfig): string {
  return config.apiBase || STORYBLOK_API_BASE_DEFAULT;
}

interface StoryblokStory {
  id: number;
  uuid: string;
  name: string;
  slug: string;
  full_slug: string;
  content: {
    component: string;
    name?: string;
    tokens?: string;
    css?: string;
    componentTokens?: string;
    componentCss?: string;
    [key: string]: unknown;
  };
}

interface StoryblokListResponse {
  stories: StoryblokStory[];
}

interface StoryblokSingleResponse {
  story: StoryblokStory;
}

export interface StoryblokConfig {
  oauthToken: string;
  spaceId: string;
  apiBase: string;
}

function headers(config: StoryblokConfig): Record<string, string> {
  return {
    Authorization: config.oauthToken,
    "Content-Type": "application/json",
  };
}

// ─── Rate-limited fetch ───────────────────────────────────────────────

/** Storyblok Management API allows max 6 req/s. Keep a safe margin. */
const REQUESTS_PER_SECOND = 3;
const MIN_INTERVAL = 1000 / REQUESTS_PER_SECOND;
let lastRequestTime = 0;

async function rateLimitedFetch(
  input: string,
  init?: RequestInit,
): Promise<Response> {
  const now = Date.now();
  const wait = Math.max(0, lastRequestTime + MIN_INTERVAL - now);
  lastRequestTime = now + wait;
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  return fetch(input, init);
}

/**
 * Find a story/folder by its full slug via the Management API.
 * Returns the story object or null if not found.
 */
async function findByFullSlug(
  config: StoryblokConfig,
  fullSlug: string,
): Promise<StoryblokStory | null> {
  const url = `${getApiBase(config)}/spaces/${config.spaceId}/stories?by_slugs=${encodeURIComponent(fullSlug)}&per_page=1`;
  console.log(`[storyblok] findByFullSlug GET ${url}`);
  const res = await rateLimitedFetch(url, { headers: headers(config) });
  console.log(`[storyblok] findByFullSlug → ${res.status}`);
  if (!res.ok) return null;
  const data = (await res.json()) as StoryblokListResponse;
  console.log(
    `[storyblok] findByFullSlug stories found: ${data.stories.length}`,
  );
  return data.stories[0] ?? null;
}

/**
 * Create a folder story in Storyblok.
 * Returns the created story's ID.
 */
async function createFolder(
  config: StoryblokConfig,
  name: string,
  slug: string,
  parentId?: number,
): Promise<number> {
  const story: Record<string, unknown> = {
    name,
    slug,
    is_folder: true,
  };
  if (parentId !== undefined) {
    story.parent_id = parentId;
  }

  const url = `${getApiBase(config)}/spaces/${config.spaceId}/stories/`;
  const payload = JSON.stringify({ story });
  console.log(`[storyblok] createFolder POST ${url}`);
  console.log(`[storyblok] createFolder payload: ${payload}`);
  const res = await rateLimitedFetch(url, {
    method: "POST",
    headers: headers(config),
    body: payload,
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`[storyblok] createFolder FAILED ${res.status}: ${body}`);
    throw new Error(
      `Failed to create folder "${slug}": ${res.status} — ${body}`,
    );
  }

  const created = (await res.json()) as StoryblokSingleResponse;
  console.log(`[storyblok] createFolder OK → id=${created.story.id}`);
  return created.story.id;
}

/**
 * Ensure the settings/themes/ folder path exists (like mkdir -p).
 * Creates missing folders along the way. Returns the themes folder ID.
 */
async function ensureThemesFolder(config: StoryblokConfig): Promise<number> {
  const segments = [
    { slug: "settings", name: "Settings", fullSlug: "settings" },
    { slug: "themes", name: "Themes", fullSlug: "settings/themes" },
  ];

  let parentId: number | undefined;

  for (const seg of segments) {
    console.log(`[storyblok] ensureThemesFolder checking "${seg.fullSlug}"`);
    const existing = await findByFullSlug(config, seg.fullSlug);
    if (existing) {
      console.log(
        `[storyblok] ensureThemesFolder "${seg.fullSlug}" exists → id=${existing.id}`,
      );
      parentId = existing.id;
      continue;
    }

    // Folder doesn't exist — create it
    console.log(
      `[storyblok] ensureThemesFolder creating "${seg.fullSlug}" (parentId=${parentId})`,
    );
    parentId = await createFolder(config, seg.name, seg.slug, parentId);
  }

  return parentId!;
}

export interface ThemeListEntry {
  name: string;
  displayName: string;
  system: boolean;
  tokens?: string;
}

/** List all token themes with metadata. */
export async function listThemes(
  config: StoryblokConfig,
): Promise<ThemeListEntry[]> {
  const url = `${getApiBase(config)}/spaces/${config.spaceId}/stories?starts_with=settings/themes/&content_type=token-theme&per_page=100`;
  const res = await rateLimitedFetch(url, { headers: headers(config) });

  if (res.status === 404) {
    // Folder or content type doesn't exist yet — no themes available
    return [];
  }
  if (!res.ok) {
    throw new Error(`Failed to list themes: ${res.status}`);
  }

  const data = (await res.json()) as StoryblokListResponse;

  // Management API list endpoint doesn't return content fields.
  // Fetch each story individually to get tokens, name, and system flag.
  const entries: ThemeListEntry[] = await Promise.all(
    data.stories.map(async (s) => {
      const fullRes = await rateLimitedFetch(
        `${getApiBase(config)}/spaces/${config.spaceId}/stories/${s.id}`,
        { headers: headers(config) },
      );
      const content = fullRes.ok
        ? ((await fullRes.json()) as StoryblokSingleResponse).story.content
        : undefined;
      return {
        name: s.slug,
        displayName: content?.name || s.name || s.slug,
        system: content?.system === true,
        tokens: (content?.tokens as string) || undefined,
      };
    }),
  );

  return entries;
}

/** Check if a token theme is system-managed (protected from modification). */
export async function isSystemTheme(
  config: StoryblokConfig,
  slug: string,
): Promise<boolean> {
  const url = `${getApiBase(config)}/spaces/${
    config.spaceId
  }/stories?starts_with=settings/themes/${encodeURIComponent(
    slug,
  )}&content_type=token-theme`;
  const res = await rateLimitedFetch(url, { headers: headers(config) });
  if (!res.ok) return false;
  const data = (await res.json()) as StoryblokListResponse;
  const story = data.stories.find((s) => s.slug === slug);
  if (!story) return false;
  return story.content?.system === true;
}

export interface ThemeData {
  tokens: string | null;
  componentTokens: string | null;
}

/** Get a single token theme by slug. Returns tokens and componentTokens, or null if not found. */
export async function getTheme(
  config: StoryblokConfig,
  slug: string,
): Promise<ThemeData | null> {
  const url = `${getApiBase(config)}/spaces/${
    config.spaceId
  }/stories?starts_with=settings/themes/${encodeURIComponent(
    slug,
  )}&content_type=token-theme`;
  const res = await rateLimitedFetch(url, { headers: headers(config) });

  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    throw new Error(`Failed to fetch theme: ${res.status}`);
  }

  const data = (await res.json()) as StoryblokListResponse;
  const story = data.stories.find((s) => s.slug === slug);

  if (!story) return null;

  // The list endpoint may not include `content` — fetch the full story if needed
  let content = story.content;
  if (!content) {
    const fullRes = await rateLimitedFetch(
      `${getApiBase(config)}/spaces/${config.spaceId}/stories/${story.id}`,
      { headers: headers(config) },
    );
    if (!fullRes.ok) return null;
    const fullData = (await fullRes.json()) as StoryblokSingleResponse;
    content = fullData.story.content;
  }

  return {
    tokens: content?.tokens || null,
    componentTokens: content?.componentTokens || null,
  };
}

/** Create a new token theme. Returns true if created, false if already exists. */
export async function createTheme(
  config: StoryblokConfig,
  slug: string,
  tokens: string,
  css: string,
  componentTokens?: string,
  componentCss?: string,
): Promise<boolean> {
  // Check if it already exists
  const existing = await getTheme(config, slug);
  if (existing !== null) return false;

  const folderId = await ensureThemesFolder(config);

  const content: Record<string, unknown> = {
    component: "token-theme",
    name: slug,
    tokens,
    css,
  };
  if (componentTokens) content.componentTokens = componentTokens;
  if (componentCss) content.componentCss = componentCss;

  const res = await rateLimitedFetch(
    `${getApiBase(config)}/spaces/${config.spaceId}/stories`,
    {
      method: "POST",
      headers: headers(config),
      body: JSON.stringify({
        story: {
          name: slug,
          slug,
          parent_id: folderId,
          content,
        },
        publish: 1,
      }),
    },
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to create theme: ${res.status} — ${body}`);
  }

  return true;
}

/** Update an existing token theme. Returns true if updated, false if not found. */
export async function updateTheme(
  config: StoryblokConfig,
  slug: string,
  tokens: string,
  css: string,
  componentTokens?: string,
  componentCss?: string,
): Promise<boolean> {
  // Find the story by slug
  const url = `${getApiBase(config)}/spaces/${
    config.spaceId
  }/stories?starts_with=settings/themes/${encodeURIComponent(
    slug,
  )}&content_type=token-theme`;
  const res = await rateLimitedFetch(url, { headers: headers(config) });

  if (res.status === 404) {
    return false;
  }
  if (!res.ok) {
    throw new Error(`Failed to fetch theme for update: ${res.status}`);
  }

  const data = (await res.json()) as StoryblokListResponse;
  const story = data.stories.find((s) => s.slug === slug);

  if (!story) return false;

  const content: Record<string, unknown> = {
    component: "token-theme",
    name: slug,
    tokens,
    css,
  };
  if (componentTokens !== undefined) content.componentTokens = componentTokens;
  if (componentCss !== undefined) content.componentCss = componentCss;

  const updateRes = await rateLimitedFetch(
    `${getApiBase(config)}/spaces/${config.spaceId}/stories/${story.id}`,
    {
      method: "PUT",
      headers: headers(config),
      body: JSON.stringify({
        story: {
          content,
        },
        publish: 1,
      }),
    },
  );

  if (!updateRes.ok) {
    const body = await updateRes.text();
    throw new Error(`Failed to update theme: ${updateRes.status} — ${body}`);
  }

  return true;
}

/** Delete a token theme by slug. */
export async function deleteTheme(
  config: StoryblokConfig,
  slug: string,
): Promise<boolean> {
  // Find the story by slug
  const url = `${getApiBase(config)}/spaces/${
    config.spaceId
  }/stories?starts_with=settings/themes/${encodeURIComponent(
    slug,
  )}&content_type=token-theme`;
  const res = await rateLimitedFetch(url, { headers: headers(config) });

  if (res.status === 404) {
    // Folder or content type doesn't exist yet — nothing to delete
    return false;
  }
  if (!res.ok) {
    throw new Error(`Failed to fetch theme for deletion: ${res.status}`);
  }

  const data = (await res.json()) as StoryblokListResponse;
  const story = data.stories.find((s) => s.slug === slug);

  if (!story) return false;

  const deleteRes = await rateLimitedFetch(
    `${getApiBase(config)}/spaces/${config.spaceId}/stories/${story.id}`,
    {
      method: "DELETE",
      headers: headers(config),
    },
  );

  if (!deleteRes.ok) {
    throw new Error(`Failed to delete theme: ${deleteRes.status}`);
  }

  return true;
}
