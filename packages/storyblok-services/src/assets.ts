/**
 * Asset management utilities for Storyblok.
 *
 * Handles the full lifecycle of transferring external images into Storyblok:
 *
 * 1. **Discovery** — Traverse a JSON structure and collect all image URLs.
 * 2. **Download** — Fetch the image bytes from each external URL.
 * 3. **Upload** — Use Storyblok's signed upload flow to register and store assets.
 * 4. **Rewrite** — Replace original URLs in the content with Storyblok CDN URLs.
 *
 * Rate-limited to avoid hitting Storyblok API limits.
 */
import StoryblokClient from "storyblok-js-client";
import { traverse as objectTraverse } from "object-traversal";
import { StoryblokApiError } from "./types.js";

// ─── Types ────────────────────────────────────────────────────────────

/** A discovered image URL with a reference back to its location in the content tree. */
interface ImageReference {
  /** The parent object containing the image URL property. */
  parent: Record<string, any>;
  /** The property key on the parent that holds the URL. */
  key: string;
  /** The original image URL value. */
  url: string;
}

/** Result of uploading a single asset to Storyblok. */
export interface UploadedAsset {
  /** The Storyblok asset ID. */
  id: number;
  /** The Storyblok CDN URL for the uploaded asset. */
  url: string;
  /** The original source URL that was replaced. */
  originalUrl: string;
}

/** Options for the asset upload process. */
export interface UploadAssetsOptions {
  /** Storyblok space ID. */
  spaceId: string;
  /**
   * Optional asset folder ID to upload into.
   * When not provided, assets are uploaded to the root folder.
   */
  assetFolderId?: number;
  /**
   * Optional asset folder name to create or reuse.
   * When provided (and `assetFolderId` is not), a folder with this name
   * is created (or the first existing match is reused).
   */
  assetFolderName?: string;
  /**
   * Maximum number of upload requests per second.
   * @default 2
   */
  requestsPerSecond?: number;
  /**
   * Custom predicate to determine whether a string value is an image URL
   * that should be downloaded and uploaded to Storyblok.
   *
   * The default heuristic matches URLs starting with `http://` or `https://`
   * whose pathname ends with a common image extension, or URLs from known
   * AI image generators (e.g. DALL·E on `oaidalleapiprodscus.blob.core.windows.net`).
   */
  isImageUrl?: (value: string) => boolean;
}

/** Summary returned after processing all assets in a content tree. */
export interface UploadAssetsSummary {
  /** Number of unique images uploaded. */
  uploaded: number;
  /** Number of URL references rewritten (may exceed `uploaded` for duplicates). */
  rewritten: number;
  /** Details of each uploaded asset. */
  assets: UploadedAsset[];
  /** Asset folder ID used (if any). */
  assetFolderId?: number;
}

// ─── Default image URL detection ──────────────────────────────────────

/** File extensions recognized as images. */
const IMAGE_EXTENSIONS =
  /\.(jpe?g|png|gif|webp|avif|svg|bmp|tiff?|ico|heic|heif)(\?.*)?$/i;

/** Hosts known to serve AI-generated images without file extensions. */
const AI_IMAGE_HOSTS = [
  "oaidalleapiprodscus.blob.core.windows.net",
  "dalleprodsec.blob.core.windows.net",
];

/**
 * Hosts known to serve images without file extensions in the URL path.
 *
 * These are popular placeholder/stock image services whose URLs don't
 * end with a recognizable image extension, e.g.:
 * - `https://images.unsplash.com/photo-xxx?w=1920`
 * - `https://via.placeholder.com/200x80/e2e8f0/475569?text=Foo`
 * - `https://placehold.co/600x400/EEE/31343C`
 */
const IMAGE_HOSTING_SERVICES = [
  "images.unsplash.com",
  "plus.unsplash.com",
  "via.placeholder.com",
  "placehold.co",
  "placeholder.co",
  "picsum.photos",
  "fastly.picsum.photos",
  "placekitten.com",
  "loremflickr.com",
  "dummyimage.com",
  "fakeimg.pl",
];

/**
 * Storyblok image service suffix pattern.
 *
 * Storyblok's image service appends `/m/{options}` to asset URLs for
 * on-the-fly resizing and filtering, e.g.:
 * - `.../image.png/m/1024x1024`
 * - `.../photo.jpg/m/800x0/filters:quality(80)`
 * - `.../hero.webp/m/smart`
 *
 * This suffix must be stripped before checking file extensions (detection)
 * and before downloading (to fetch the original full-resolution asset).
 */
const STORYBLOK_IMAGE_SERVICE_SUFFIX = /\/m\/.*$/;

/**
 * Strip the Storyblok image service suffix (`/m/...`) from a URL, if present.
 *
 * Returns the original URL unchanged when there is no image service suffix.
 */
export function stripStoryblokImageService(url: string): string {
  return url.replace(STORYBLOK_IMAGE_SERVICE_SUFFIX, "");
}

/**
 * Default heuristic for detecting image URLs in content.
 *
 * Matches:
 * - Any `http(s)://` URL whose path ends with a known image extension.
 * - Any URL hosted on a known AI image generation domain.
 */
export function defaultIsImageUrl(value: string): boolean {
  if (typeof value !== "string") return false;
  if (!value.startsWith("http://") && !value.startsWith("https://"))
    return false;

  // Check for file extension (strip Storyblok image service suffix first)
  try {
    const url = new URL(stripStoryblokImageService(value));
    if (IMAGE_EXTENSIONS.test(url.pathname)) return true;

    // Check for AI image hosts (DALL·E etc.)
    if (AI_IMAGE_HOSTS.some((host) => url.hostname.includes(host))) return true;

    // Check for known image hosting / placeholder services
    if (
      IMAGE_HOSTING_SERVICES.some(
        (host) => url.hostname === host || url.hostname.endsWith(`.${host}`)
      )
    )
      return true;
  } catch {
    // Malformed URL — skip
    return false;
  }

  return false;
}

// ─── Image discovery ──────────────────────────────────────────────────

/**
 * Traverse a JSON structure and collect all values that look like image URLs.
 *
 * @param content - The object tree to scan.
 * @param isImageUrl - Predicate to identify image URLs. Defaults to {@link defaultIsImageUrl}.
 * @returns An array of references that can be used to rewrite URLs in place.
 */
export function findImageUrls(
  content: Record<string, any>,
  isImageUrl: (value: string) => boolean = defaultIsImageUrl
): ImageReference[] {
  const references: ImageReference[] = [];

  objectTraverse(content, ({ parent, key, value }) => {
    if (typeof value === "string" && parent && key && isImageUrl(value)) {
      references.push({
        parent: parent as Record<string, any>,
        key,
        url: value,
      });
    }
  });

  return references;
}

// ─── Throttle utility ─────────────────────────────────────────────────

/**
 * Minimal promise throttle that limits concurrency to `n` requests per second.
 */
function createThrottle(requestsPerSecond: number) {
  const interval = 1000 / requestsPerSecond;
  let lastCall = 0;

  return async <T>(fn: () => Promise<T>): Promise<T> => {
    const now = Date.now();
    const wait = Math.max(0, lastCall + interval - now);
    lastCall = now + wait;
    if (wait > 0) {
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
    return fn();
  };
}

// ─── Download ─────────────────────────────────────────────────────────

/**
 * Download an image from a URL and return it as a `Buffer` together with
 * the inferred filename and content type.
 */
async function downloadImage(
  url: string
): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
  // Strip Storyblok image service suffix to download the original asset
  const downloadUrl = stripStoryblokImageService(url);
  const response = await fetch(downloadUrl);

  if (!response.ok) {
    throw new StoryblokApiError(
      `Failed to download image from ${url}: ${response.status} ${response.statusText}`
    );
  }

  const contentType =
    response.headers.get("content-type") || "application/octet-stream";
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Derive a filename from the URL (use the stripped URL for correct path segments)
  let filename: string;
  try {
    const parsed = new URL(downloadUrl);
    const pathSegments = parsed.pathname.split("/").filter(Boolean);
    const lastSegment = pathSegments[pathSegments.length - 1] || "image";

    // If the last segment has no extension, synthesize one from content-type
    if (!/\.\w+$/.test(lastSegment)) {
      const ext = contentType.includes("png")
        ? "png"
        : contentType.includes("gif")
        ? "gif"
        : contentType.includes("webp")
        ? "webp"
        : contentType.includes("svg")
        ? "svg"
        : "jpg";
      filename = `${lastSegment}.${ext}`;
    } else {
      filename = lastSegment;
    }
  } catch {
    filename = "image.jpg";
  }

  return { buffer, filename, contentType };
}

// ─── Storyblok signed upload ──────────────────────────────────────────

/**
 * Upload a buffer to Storyblok using the signed upload flow:
 *
 * 1. `POST /spaces/:id/assets/` — register the asset and get a signed S3 URL.
 * 2. `POST` the file as multipart form data to the signed URL.
 *
 * @returns The asset ID and its public Storyblok CDN URL.
 */
async function uploadToStoryblok(
  client: StoryblokClient,
  spaceId: string,
  file: { buffer: Buffer; filename: string; contentType: string },
  assetFolderId?: number
): Promise<{ id: number; url: string }> {
  // 1. Register the asset
  const registerPayload: Record<string, any> = {
    filename: file.filename,
    size: `0x0`, // Storyblok allows 0x0 for non-image or unknown dimensions
  };
  if (assetFolderId) {
    registerPayload.asset_folder_id = assetFolderId;
  }

  const registerResponse = await client.post(
    `spaces/${spaceId}/assets/`,
    registerPayload
  );

  const signedData = (registerResponse as any).data;

  // 2. Upload to the signed S3 URL
  const formData = new FormData();
  for (const [key, value] of Object.entries(signedData.fields)) {
    formData.append(key, value as string);
  }
  formData.append(
    "file",
    new Blob([new Uint8Array(file.buffer)], { type: file.contentType }),
    file.filename
  );

  const uploadResponse = await fetch(signedData.post_url, {
    method: "POST",
    body: formData,
  });

  if (!uploadResponse.ok) {
    throw new StoryblokApiError(
      `Failed to upload asset "${file.filename}" to Storyblok S3: ` +
        `${uploadResponse.status} ${uploadResponse.statusText}`
    );
  }

  return {
    id: signedData.id,
    url: signedData.pretty_url,
  };
}

// ─── Asset folder management ──────────────────────────────────────────

/**
 * Find or create an asset folder by name.
 */
async function resolveAssetFolder(
  client: StoryblokClient,
  spaceId: string,
  folderName: string
): Promise<number> {
  // Try to find existing folder
  const foldersResponse = await client.get(`spaces/${spaceId}/asset_folders/`);
  const folders = (foldersResponse as any).data?.asset_folders || [];
  const existing = folders.find((f: { name: string }) => f.name === folderName);

  if (existing) {
    return existing.id;
  }

  // Create new folder
  const createResponse = await client.post(`spaces/${spaceId}/asset_folders/`, {
    asset_folder: { name: folderName },
  } as any);

  return (createResponse as any).data.asset_folder.id;
}

// ─── Main entry point ─────────────────────────────────────────────────

/**
 * Find all image URLs in a content tree, download them, upload them to
 * Storyblok, and rewrite the URLs in the content to point to the
 * Storyblok CDN.
 *
 * **Mutates** the `content` object in place (URLs are replaced).
 *
 * Duplicate URLs are only downloaded and uploaded once; all references
 * to the same source URL are rewritten to the same Storyblok URL.
 *
 * @param client - Storyblok Management API client.
 * @param content - The content tree to process (mutated in place).
 * @param options - Upload configuration.
 * @returns Summary of uploaded and rewritten assets.
 */
export async function uploadAndReplaceAssets(
  client: StoryblokClient,
  content: Record<string, any>,
  options: UploadAssetsOptions
): Promise<UploadAssetsSummary> {
  const {
    spaceId,
    assetFolderName,
    requestsPerSecond = 2,
    isImageUrl,
  } = options;
  let { assetFolderId } = options;

  // Resolve asset folder if a name was given but no ID
  if (!assetFolderId && assetFolderName) {
    assetFolderId = await resolveAssetFolder(client, spaceId, assetFolderName);
  }

  // 1. Discover image URLs
  const references = findImageUrls(content, isImageUrl);

  if (references.length === 0) {
    return { uploaded: 0, rewritten: 0, assets: [], assetFolderId };
  }

  // 2. Deduplicate by canonical URL (strip image service suffixes so that
  //    e.g. "image.png" and "image.png/m/1024x1024" resolve to one upload)
  const canonicalMap = new Map<string, string>(); // canonical → first raw URL
  for (const ref of references) {
    const canonical = stripStoryblokImageService(ref.url);
    if (!canonicalMap.has(canonical)) {
      canonicalMap.set(canonical, ref.url);
    }
  }
  const uniqueUrls = [...canonicalMap.values()];

  // 3. Download + upload each unique URL (rate-limited)
  const throttle = createThrottle(requestsPerSecond);
  const urlMap = new Map<string, UploadedAsset>(); // canonical → asset

  for (const url of uniqueUrls) {
    const canonical = stripStoryblokImageService(url);
    const asset = await throttle(async () => {
      const file = await downloadImage(url);
      const uploaded = await uploadToStoryblok(
        client,
        spaceId,
        file,
        assetFolderId
      );
      return {
        id: uploaded.id,
        url: uploaded.url,
        originalUrl: url,
      };
    });
    urlMap.set(canonical, asset);
  }

  // 4. Rewrite all references with full Storyblok asset objects
  let rewritten = 0;
  for (const ref of references) {
    const asset = urlMap.get(stripStoryblokImageService(ref.url));
    if (asset) {
      if (ref.key === "filename" && ref.parent.fieldtype === "asset") {
        // The URL lives inside an existing Storyblok asset object —
        // update the object in place instead of nesting a new one.
        ref.parent.filename = asset.url;
        ref.parent.id = asset.id;
        ref.parent.is_external_url = false;
      } else {
        ref.parent[ref.key] = createAssetObject(asset.url, asset.id);
      }
      rewritten++;
    }
  }

  return {
    uploaded: urlMap.size,
    rewritten,
    assets: [...urlMap.values()],
    assetFolderId,
  };
}

// ─── Asset object helpers ─────────────────────────────────────────────

/**
 * Create a full Storyblok asset object from a URL and optional asset ID.
 *
 * Storyblok stores asset fields as structured objects (not plain URL strings).
 * The CMS interface produces objects like:
 * ```json
 * {
 *   "id": 12345,
 *   "alt": "",
 *   "name": "",
 *   "focus": "",
 *   "title": "",
 *   "source": "",
 *   "filename": "https://a.storyblok.com/f/…/image.jpg",
 *   "copyright": "",
 *   "fieldtype": "asset",
 *   "meta_data": {},
 *   "is_external_url": false
 * }
 * ```
 *
 * @param url - The Storyblok CDN URL (or any image URL).
 * @param id - Optional Storyblok asset ID. Use `0` when unknown.
 * @param alt - Optional alt text for the image.
 * @returns A properly structured Storyblok asset object.
 */
export function createAssetObject(
  url: string,
  id: number = 0,
  alt: string = ""
): Record<string, any> {
  const isStoryblokUrl =
    url.includes("a.storyblok.com") || url.includes("img2.storyblok.com");
  return {
    id: id || null,
    alt,
    name: "",
    focus: "",
    title: "",
    source: "",
    filename: url,
    copyright: "",
    fieldtype: "asset",
    meta_data: {},
    is_external_url: !isStoryblokUrl,
  };
}

/**
 * Known Storyblok asset field names from the CMS component schema.
 *
 * These fields have `"type": "asset"` in the Storyblok component definitions
 * and expect a structured asset object rather than a plain URL string.
 *
 * @deprecated Prefer passing `flatAssetFields` from `ValidationRules` to
 *   the schema-aware `wrapAssetUrlsWithSchema` function instead of relying
 *   on this hardcoded set. This fallback will be removed in a future version.
 */
const KNOWN_ASSET_FIELDS = new Set([
  "author_image",
  "backgroundImage",
  "cardImage",
  "consentBackgroundImage",
  "image",
  "image_src",
  "image_srcDesktop",
  "image_srcMobile",
  "image_srcTablet",
  "logo_src",
  "logo_srcInverted",
  "previewImage",
  "src",
  "video_srcDesktop",
  "video_srcMobile",
  "video_srcTablet",
]);

/**
 * Walk a Storyblok content tree and wrap any plain URL strings in asset
 * fields into proper Storyblok asset objects.
 *
 * This handles cases where:
 * - Content was generated by the MCP pipeline and images are already on
 *   the Storyblok CDN (no upload needed, but the field format is wrong).
 * - `uploadAndReplaceAssets` was NOT called (e.g. `uploadAssets: false`),
 *   and external URLs sit in asset fields.
 *
 * Fields are identified by matching property names against `KNOWN_ASSET_FIELDS`.
 * Only plain string values that look like URLs are wrapped — existing asset
 * objects (with `fieldtype: "asset"`) are left untouched.
 *
 * **Mutates** the content tree in place.
 *
 * @param content - The Storyblok content tree to process.
 */
export function wrapAssetUrls(content: Record<string, any>): void {
  objectTraverse(content, ({ parent, key, value }) => {
    if (
      parent &&
      key &&
      typeof value === "string" &&
      value.length > 0 &&
      KNOWN_ASSET_FIELDS.has(key) &&
      // Don't wrap values that are already asset objects
      !(typeof value === "object" && (value as any)?.fieldtype === "asset")
    ) {
      parent[key] = createAssetObject(value);
    }
  });
}

// ─── Asset field normalization ────────────────────────────────────────

/**
 * Normalize wrongly-flattened asset field names in a Storyblok content tree.
 *
 * When LLMs manually construct content (outside the generation pipeline),
 * they may follow the pattern of components that use nested image objects
 * (`{ image: { src, alt } }` → `image_src`, `image_alt`) and apply it to
 * components where `image` is a flat `{ type: "string", format: "image" }`
 * field. This produces `image_src` instead of the correct `image` — which
 * causes rendering failures on the frontend (`unflatten()` would split
 * `image_src` into `{ image: { src } }`, but the component expects a string).
 *
 * This function walks the content tree and, for each component node:
 * 1. Looks up its `flatAssetFields` from the schema-derived map.
 * 2. For each flat asset field name (e.g. `"image"`):
 *    a. If a wrongly-flattened variant exists (e.g. `image_src`), renames it.
 *    b. If the field contains a nested object `{ src: "url" }` instead of a
 *       plain string, extracts the `src` (or `filename`) value.
 *
 * **Mutates** the content tree in place.
 *
 * @param content - The Storyblok content tree (sections array or single node).
 * @param flatAssetFields - Map of component name → set of flat asset field
 *   names, from `ValidationRules.flatAssetFields`.
 */
export function normalizeAssetFieldNames(
  content: Record<string, any> | Record<string, any>[],
  flatAssetFields: Map<string, Set<string>>
): void {
  if (!flatAssetFields || flatAssetFields.size === 0) return;

  const nodes = Array.isArray(content) ? content : [content];
  for (const node of nodes) {
    normalizeNode(node, flatAssetFields);
  }
}

/**
 * Recursively normalize a single content node and its children.
 */
function normalizeNode(
  node: Record<string, any>,
  flatAssetFields: Map<string, Set<string>>
): void {
  if (!node || typeof node !== "object" || Array.isArray(node)) return;

  const componentName = node.component;
  if (typeof componentName === "string") {
    const flatFields = flatAssetFields.get(componentName);
    if (flatFields) {
      for (const fieldName of flatFields) {
        // Case 1: The correct field is missing but a flattened variant exists.
        // E.g. `image_src` exists but the schema expects `image` as a flat string.
        if (
          node[fieldName] === undefined ||
          node[fieldName] === null ||
          node[fieldName] === ""
        ) {
          const srcKey = `${fieldName}_src`;
          if (node[srcKey] !== undefined) {
            // Extract the URL value from the wrongly-named field
            node[fieldName] = extractUrlValue(node[srcKey]);
            delete node[srcKey];

            // Also clean up other flattened sub-properties (e.g. image_alt)
            for (const key of Object.keys(node)) {
              if (key.startsWith(`${fieldName}_`) && key !== fieldName) {
                delete node[key];
              }
            }
          }
        }

        // Case 2: The field exists but contains a nested object instead of a string.
        // E.g. `image: { src: "url", alt: "text" }` instead of `image: "url"`.
        if (
          node[fieldName] !== undefined &&
          typeof node[fieldName] === "object" &&
          node[fieldName] !== null &&
          !Array.isArray(node[fieldName]) &&
          node[fieldName].fieldtype !== "asset"
        ) {
          node[fieldName] = extractUrlValue(node[fieldName]);
        }
      }
    }
  }

  // Recurse into child properties
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "object" && item !== null) {
          normalizeNode(item, flatAssetFields);
        }
      }
    } else if (typeof value === "object" && value !== null) {
      normalizeNode(value, flatAssetFields);
    }
  }
}

/**
 * Extract a URL string from a value that may be a plain string, a nested
 * object with `src`/`filename`, or a Storyblok asset object.
 */
function extractUrlValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    const obj = value as Record<string, any>;
    // Storyblok asset object
    if (obj.filename) return obj.filename;
    // Nested image object from Design System
    if (obj.src) return obj.src;
  }
  return "";
}
