import {
  ISbStories,
  ISbStoriesParams,
  getStoryblokApi,
  apiPlugin,
  storyblokInit,
  ISbStory,
  StoryblokClient,
  ISbStoryData,
  ISbStoryParams,
} from "@storyblok/react";
import { ISbLinkURLObject } from "storyblok-js-client";
import { components } from "@/components";
import { TraversalCallbackContext, traverse } from "object-traversal";
import { IStoryblokBlock } from "@kickstartds/jsonschema2storyblok";
import { resolveSharePointFolders } from "@/helpers/sharepoint";
import {
  GlobalReferenceStoryblok,
  GlobalStoryblok,
  MultilinkStoryblok,
} from "@/types/components-schema";
import componentsSchema from "@/types/components-schema.json";
import { INDEX_SLUG } from "@/helpers/i18n";

export function initStoryblok(accessToken?: string) {
  storyblokInit({
    accessToken,
    use: accessToken ? [apiPlugin] : undefined,
    components,
  });
}

export function isStoryblokComponent(
  blok: any,
): blok is { content: Record<string, any> } {
  return blok && blok.content !== undefined && blok.id !== undefined;
}

export function isStoryblokComponentSchema(
  object: any,
): object is IStoryblokBlock {
  return object && object.schema && object.id;
}

export function isGlobalReference(blok: any): blok is GlobalReferenceStoryblok {
  return blok && blok.component === "global_reference";
}

export function isGlobal(blok: any): blok is GlobalStoryblok {
  return blok && blok.component === "global";
}

export function isStoryblokLink(object: any): object is MultilinkStoryblok {
  return object && object?.linktype !== undefined;
}

export function isStoryblokStoryLinkObject(
  object: any,
): object is MultilinkStoryblok & {
  story: ISbLinkURLObject;
  linktype: "story";
} {
  return (
    object &&
    typeof object === "object" &&
    object.linktype &&
    object.linktype === "story" &&
    object.story !== undefined &&
    typeof object.story === "object" &&
    object.story.uuid !== undefined &&
    object.story.full_slug !== undefined &&
    object.story.id !== undefined &&
    object.story.slug !== undefined &&
    object.story.url !== undefined
  );
}

// Storyblok sometimes returns a multilink of linktype "story" without the
// resolved `story` object (e.g. when the link was created before the target
// existed, or when resolve_links didn't cover it). Those links would render
// with an empty href, so we detect them and resolve them by id below.
export function isMissingStoryLinkObject(
  object: any,
): object is MultilinkStoryblok & {
  story: ISbLinkURLObject;
  linktype: "story";
} {
  return (
    object &&
    typeof object === "object" &&
    object.linktype &&
    object.linktype === "story" &&
    object.story === undefined
  );
}

export function storyProcessing(
  blok: Record<string, any>,
  preview: boolean = false,
) {
  function removeEmptyImages({ parent, key, value }: TraversalCallbackContext) {
    if (
      parent &&
      key &&
      value &&
      typeof value === "object" &&
      value.fieldtype === "asset" &&
      !value.filename
    ) {
      delete parent[key];
    }
  }

  function mapStoryblokLinks({ parent, key, value }: TraversalCallbackContext) {
    if (parent && key) {
      if (isStoryblokStoryLinkObject(value)) {
        parent[key] = `${
          value.story?.full_slug === INDEX_SLUG ? "/" : value.story.full_slug
        }${value.anchor ? `#${value.anchor}` : ""}`;
      } else if (isStoryblokLink(value)) {
        if (value.linktype === "email") {
          parent[key] = `mailto:${value.email}`;
        } else if (value.linktype === "url") {
          parent[key] = `${value.url}${value.anchor ? `#${value.anchor}` : ""}`;
        } else if (value.linktype === "asset") {
          parent[key] = value.url;
        } else {
          parent[key] = "#";
        }
      }
    }
  }

  function mapStoryblokAssets({
    parent,
    key,
    value,
  }: TraversalCallbackContext) {
    if (
      parent &&
      key &&
      value &&
      value.filename &&
      value.fieldtype === "asset"
    ) {
      if (parent.component === "seo") return;

      parent[key] = !value.filename.startsWith("http")
        ? `https:${value.filename}`
        : value.filename;

      if (key.includes("_")) {
        const [groupName] = key.split("_");
        if (parent.hasOwnProperty(`${groupName}_alt`)) {
          if (!parent[`${groupName}_alt`] || parent[`${groupName}_alt`] === "")
            parent[`${groupName}_alt`] = value.alt;
        }
      }

      if (parent.hasOwnProperty("alt")) {
        if (!parent["alt"] || parent["alt"] === "") parent["alt"] = value.alt;
      }
    }
  }

  function mapResolvedEntries({
    parent,
    key,
    value,
  }: TraversalCallbackContext) {
    if (parent && key && value && value.content && value.uuid) {
      parent[key] = value.content;
      if (value.full_slug) {
        parent[key]["slug"] = value.full_slug;
      }
    }
  }

  function mapBlokEntries({ parent, key, value }: TraversalCallbackContext) {
    if (parent && parent.component && key && Array.isArray(value)) {
      const componentSchema = componentsSchema.find((component) => {
        return component.name === parent.component;
      });

      if (
        componentSchema &&
        isStoryblokComponentSchema(componentSchema as unknown as any)
      ) {
        const propSchema = (componentSchema as unknown as any).schema[key];

        if (
          propSchema &&
          (propSchema.type === "bloks" || propSchema.type === "options") &&
          (propSchema.maximum === 1 || propSchema.max_options === "1")
        ) {
          if (value[0]) {
            parent[key] = isStoryblokComponent(value[0])
              ? value[0].content
              : value[0];
          } else {
            delete parent[key];
          }
        }
      }
    }
  }

  function coerceNumberFields({
    parent,
    key,
    value,
  }: TraversalCallbackContext) {
    if (
      parent &&
      parent.component &&
      key &&
      typeof value === "string" &&
      value !== ""
    ) {
      const componentSchema = componentsSchema.find(
        (component) => component.name === parent.component,
      );
      if (
        componentSchema &&
        isStoryblokComponentSchema(componentSchema as unknown as any)
      ) {
        const propSchema = (componentSchema as unknown as any).schema[key];
        if (propSchema && propSchema.type === "number") {
          const num = Number(value);
          if (!isNaN(num)) {
            parent[key] = num;
          }
        }
      }
    }
  }

  if (!preview && blok.section && blok.section.length > 0) {
    blok.section = blok.section.filter((section: Record<string, any>) => {
      return !section.aiDraft;
    });
  }

  traverse(blok, (context) => {
    removeEmptyImages(context);
    mapStoryblokLinks(context);
    mapStoryblokAssets(context);
    mapResolvedEntries(context);
    mapBlokEntries(context);
    coerceNumberFields(context);
  });

  return blok;
}

let lastContentVersion: number | undefined = undefined;

export const resolvableRelations = [
  "global_reference.reference",
  "global.global",
  "blog-overview.latest",
];

export const sbParams = (
  draft: boolean,
  params: ISbStoriesParams | ISbStoryParams = {},
): ISbStoriesParams | ISbStoryParams => ({
  version: draft ? "draft" : "published",
  cv: lastContentVersion,
  resolve_links: "url",
  resolve_relations: resolvableRelations.join(","),
  ...params,
});

export async function fetchUuid(uuid: string, storyblokApi?: StoryblokClient) {
  const storyblok = storyblokApi || getStoryblokApi();

  const response: ISbStory = await storyblok.get(
    `cdn/stories/${uuid}`,
    sbParams(!!storyblokApi, { find_by: "uuid" }),
  );

  return response.data.story;
}

export async function resolveStoryUuids(
  story: ISbStoryData,
  storyblokApi?: StoryblokClient,
) {
  const promises: Promise<any>[] = [];
  traverse(story, ({ parent, key, value }) => {
    if (
      parent &&
      key &&
      !["_uid", "uuid", "group_id", "id"].includes(key) &&
      typeof value === "string" &&
      value.match(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      )
    ) {
      promises.push(
        fetchUuid(value, storyblokApi).then((data) => {
          parent[key] = data.content;

          return resolveStoryUuids(data, storyblokApi);
        }),
      );
    }
  });

  await Promise.all(promises);
}

export async function resolveMissingStoriesInLinks(
  story: ISbStoryData,
  storyblokApi?: StoryblokClient,
) {
  const promises: Promise<any>[] = [];
  traverse(story, ({ parent, key, value }) => {
    if (parent && key && isMissingStoryLinkObject(value) && value.id) {
      promises.push(
        fetchUuid(value.id, storyblokApi).then((data) => {
          value.story = {
            name: data.name,
            slug: data.slug,
            id: data.id,
            full_slug: data.full_slug,
            url: data.full_slug,
            uuid: data.uuid,
          };
          return resolveMissingStoriesInLinks(data, storyblokApi);
        }),
      );
    }
  });

  await Promise.all(promises);
}

export async function fetchStory(
  slug: string,
  resolveUuids: boolean = false,
  previewStoryblokApi?: StoryblokClient,
) {
  const storyblokApi = previewStoryblokApi || getStoryblokApi();
  const response: ISbStory = await storyblokApi.get(
    `cdn/stories/${slug}`,
    sbParams(!!previewStoryblokApi),
  );

  lastContentVersion = response.data.cv;

  if (resolveUuids) await resolveStoryUuids(response.data.story, storyblokApi);
  await resolveMissingStoriesInLinks(response.data.story, storyblokApi);
  storyProcessing(response.data.story.content, !!previewStoryblokApi);

  return response;
}

// TODO: https://www.storyblok.com/docs/api/content-delivery/v2#topics/pagination
export async function fetchStories(
  params?: ISbStoriesParams,
  resolveUuids: boolean = false,
  previewStoryblokApi?: StoryblokClient,
) {
  const storyblokApi = previewStoryblokApi || getStoryblokApi();
  const response: ISbStories = await storyblokApi.get(
    `cdn/stories`,
    sbParams(!!previewStoryblokApi, { per_page: 100, ...params }),
  );

  for (const story of response.data.stories) {
    if (resolveUuids) {
      await resolveStoryUuids(story, storyblokApi);
    }
    await resolveMissingStoriesInLinks(story, storyblokApi);
    storyProcessing(story.content, !!previewStoryblokApi);
  }

  lastContentVersion = response.data.cv;
  return response;
}

export async function fetchPaths() {
  const { data } = await fetchStories();
  return data.stories
    .filter((story) => story.content.component !== "settings")
    .map((story) => {
      const slug =
        story.full_slug === INDEX_SLUG ? [] : story.full_slug.split("/");

      return {
        params: {
          slug,
          updated_at: story.published_at,
        },
      };
    });
}

export async function fetchPageProps(
  slug: string = INDEX_SLUG,
  previewStoryblokApi?: StoryblokClient,
) {
  const [{ data: pageData }, { data: settingsData }] = await Promise.all([
    fetchStory(slug, true, previewStoryblokApi),
    fetchStories({ content_type: "settings" }, false, previewStoryblokApi),
  ]);

  // Resolve theme references to CSS strings
  const settings = settingsData.stories[0]?.content;
  const pageContent = pageData.story?.content;

  // Resolve the global theme from settings
  // Skip fetch for "default" theme — its tokens are already compiled into the base CSS
  if (settings?.theme && settings.theme !== "default") {
    try {
      const themeStory = await fetchStory(
        `settings/themes/${settings.theme}`,
        false,
        previewStoryblokApi,
      );
      settings.themeCss = themeStory.data.story?.content?.css || "";
    } catch {
      // Theme story not found — ignore
    }
  }

  // Resolve SharePoint folder references in downloads components
  if (pageData.story?.content) {
    await resolveSharePointFolders(pageData.story.content);
  }

  // Resolve page-level theme override
  // Skip fetch for "default" theme — its tokens are already compiled into the base CSS
  if (pageContent?.theme && pageContent.theme !== "default") {
    try {
      const themeStory = await fetchStory(
        `settings/themes/${pageContent.theme}`,
        false,
        previewStoryblokApi,
      );
      pageContent.themeCss = themeStory.data.story?.content?.css || "";
    } catch {
      // Theme story not found — ignore
    }
  }

  return { pageData, settingsData };
}

// Kept exported here for the call sites that already import it from this
// module; the language and URL model itself lives in helpers/i18n.
export { INDEX_SLUG };
