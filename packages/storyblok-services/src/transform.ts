/**
 * Content transformation utilities.
 *
 * Handles two directions of transformation:
 *
 * 1. **OpenAI → Design System** (`processOpenAiResponse`):
 *    Reverses the `type__X` discriminator mangling, restores `type` fields,
 *    and merges component defaults from the original schemas.
 *
 * 2. **Design System → Storyblok** (`processForStoryblok`):
 *    Flattens nested objects into Storyblok's `key_subKey` convention,
 *    adds `component` fields, and marks sections as AI drafts.
 *
 * 3. **Root field component injection** (`injectRootFieldComponentTypes`):
 *    Adds `type` discriminator fields to root field content (head, aside,
 *    cta, seo) so that `processForStoryblok` can convert them to
 *    `component` fields. Also wraps single component objects in arrays
 *    for Storyblok bloks fields.
 *
 * Pure functions — no framework dependencies.
 */
import { traverse as objectTraverse } from "object-traversal";
import { getSchemaName } from "./schema.js";

// ─── Types ────────────────────────────────────────────────────────────

/** Result of processing an OpenAI response into both DS and Storyblok shapes. */
export interface TransformedContent {
  /** Design-System-shaped props (nested objects, `type` fields). */
  designSystemProps: Record<string, any>;
  /** Storyblok-shaped props (flat `key_subKey`, `component` fields). */
  storyblokContent: Record<string, any>;
}

// ─── OpenAI → Design System ──────────────────────────────────────────

/**
 * Post-process raw OpenAI structured output back into kickstartDS
 * Design System component props.
 *
 * This reverses the transformations applied by `prepareSchemaForOpenAi`:
 * - `type__hero` → `type: "hero"`
 * - Merges default values from the original component schemas
 *
 * @param response - Raw parsed JSON from OpenAI.
 * @param schemaMap - Map of component type → original schema. Produced by
 *   `prepareSchemaForOpenAi().schemaMap`. When provided, default values are
 *   merged into the response.
 * @param defaultObjectForSchema - Optional function to derive defaults from
 *   a JSON Schema object. When omitted, default merging is skipped.
 *   Signature: `(schema: object) => Record<string, any>`.
 * @param deepMerge - Optional deep-merge function. When omitted, a simple
 *   shallow fallback is used.
 *   Signature: `(a: object, b: object) => object`.
 * @returns A new object with Design System–shaped props.
 */
export function processOpenAiResponse(
  response: Record<string, any>,
  schemaMap?: Record<string, Record<string, any>>,
  defaultObjectForSchema?: (schema: object) => Record<string, any>,
  deepMerge?: (a: any, b: any) => any
): Record<string, any> {
  const result = structuredClone(response);

  objectTraverse(
    result,
    ({ value }) => {
      if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
      ) {
        const typePropKey = Object.keys(value).find((key) =>
          key.startsWith("type__")
        );

        if (typePropKey) {
          const type = typePropKey.split("type__")[1];

          delete value[typePropKey];
          value.type = type;

          // Merge defaults from the original component schema
          if (schemaMap && schemaMap[type] && defaultObjectForSchema) {
            const schema = schemaMap[type];
            const defaults = defaultObjectForSchema(schema);

            if (defaults && typeof defaults === "object") {
              const merge = deepMerge || shallowMerge;

              for (const prop of Object.keys(defaults)) {
                if (value[prop] !== undefined) {
                  // If the value is an object (not array), deep-merge
                  if (
                    typeof value[prop] === "object" &&
                    !Array.isArray(value[prop]) &&
                    typeof defaults[prop] === "object" &&
                    !Array.isArray(defaults[prop])
                  ) {
                    value[prop] = merge(value[prop], defaults[prop]);
                  }
                  // Otherwise keep the generated value
                } else {
                  value[prop] = defaults[prop];
                }
              }
            }
          }
        }
      }
    },
    { traversalType: "breadth-first" }
  );

  return result;
}

// ─── Design System → Storyblok ───────────────────────────────────────

/**
 * Transform Design System–shaped page props into the flat structure
 * that Storyblok expects.
 *
 * - Nested objects are flattened: `{ image: { src, alt } }` → `{ image_src, image_alt }`
 * - `type` (DS discriminator) is moved to `component` (Storyblok discriminator)
 * - Each section gets `aiDraft: true` and `component: "section"`
 *
 * After this transform every component node carries `component` as its
 * identity field — the DS `type` field is removed so it cannot collide
 * with user-facing `type` props in Storyblok (e.g. CTA variant).
 *
 * @param page - Design System page props (with nested objects and `type` fields).
 * @param flatAssetFields - Optional map of component name → set of flat asset
 *   field names (from `ValidationRules.flatAssetFields`). When provided, these
 *   fields are skipped during flattening — they are scalar URL strings, not
 *   nested objects that should be underscore-split.
 * @returns A new object with Storyblok-compatible flat props.
 */
export function processForStoryblok(
  page: Record<string, any>,
  flatAssetFields?: Map<string, Set<string>>
): Record<string, any> {
  const result = structuredClone(page);

  objectTraverse(
    result,
    ({ value }) => {
      if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value) &&
        value.type
      ) {
        const componentName = value.type;
        value.component = componentName;
        delete value.type;
        const skipFields = flatAssetFields?.get(componentName);
        flattenNestedObjects(value, skipFields);
      }
    },
    { traversalType: "breadth-first" }
  );

  // Section-level annotations
  for (const section of result.section || []) {
    section.aiDraft = true;
    section.component = "section";
    delete section.type;
    const sectionSkipFields = flatAssetFields?.get("section");
    flattenNestedObjects(section, sectionSkipFields);
  }

  // Final safety pass: strip `type` from any node that already has
  // `component` set — Storyblok content must never carry both.
  // Also strip numeric `component` values — these are internal column
  // indices from Storyblok's table field type, not real component names.
  // Leaving them in causes the Visual Editor to crash when it calls
  // `.indexOf()` on a number instead of a string.
  objectTraverse(
    result,
    ({ value }) => {
      if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
      ) {
        if (value.component && value.type !== undefined) {
          delete value.type;
        }
        if (typeof value.component === "number") {
          delete value.component;
        }
      }
    },
    { traversalType: "breadth-first" }
  );

  return result;
}

// ─── Root field component injection ───────────────────────────────────

/**
 * Inject `type` discriminator fields into root field content so that
 * `processForStoryblok` can convert them to `component` fields.
 *
 * Root field schemas (head, aside, cta, seo on blog-post, etc.) are
 * monomorphic — there's no `anyOf` discriminator. But Storyblok still
 * requires a `component` identifier on every bloks-field object.
 *
 * This function walks the generated content alongside the **original**
 * (pre-cleanup) field schema and:
 *
 * 1. **Root level** — Derives the component name from the schema's `$id`
 *    (e.g. `blog-head.schema.json` → `type: "blog-head"`).
 *
 * 2. **Nested single objects with `$id`** — Adds `type` from `$id` and
 *    wraps the object in an array (Storyblok bloks fields are always arrays).
 *
 * 3. **Nested array-of-objects items** — Adds `type` using the **property
 *    name** as the component name. This matches the Storyblok convention
 *    where sub-component bloks fields are named after their component
 *    (e.g. `tags[]` items → `component: "tags"`, `buttons[]` items →
 *    `component: "buttons"`).
 *
 * After this function, call `processForStoryblok()` to convert `type` →
 * `component`, flatten nested value objects, and strip leftover `type`.
 *
 * @param content - The raw generated content (from OpenAI).
 * @param fieldSchema - The **original** field schema with `$id` values
 *   intact (before `UNSUPPORTED_KEYWORDS` cleanup).
 * @returns A new object with `type` fields injected and single component
 *   objects wrapped in arrays.
 */
export function injectRootFieldComponentTypes(
  content: Record<string, any>,
  fieldSchema: Record<string, any>
): Record<string, any> {
  const result = structuredClone(content);

  // Root level: derive component name from $id
  if (fieldSchema.$id) {
    result.type = getSchemaName(fieldSchema.$id);
  }

  injectNestedComponentTypes(result, fieldSchema);

  return result;
}

/**
 * Recursively walk an object's properties and inject `type` fields for
 * nested component objects / array items, based on their schema definitions.
 *
 * **Mutates** the object in place.
 */
function injectNestedComponentTypes(
  obj: Record<string, any>,
  schema: Record<string, any>
): void {
  const schemaProps = schema.properties || {};

  for (const [propName, propSchema] of Object.entries<any>(schemaProps)) {
    if (obj[propName] === undefined || obj[propName] === null) continue;

    if (
      propSchema.type === "array" &&
      propSchema.items?.type === "object" &&
      propSchema.items?.properties
    ) {
      // Array of objects → each item is a sub-component.
      // Component name = property name (matches Storyblok bloks convention).
      const items = obj[propName];
      if (Array.isArray(items)) {
        for (const item of items) {
          if (typeof item === "object" && item !== null) {
            item.type = propName;
            // Recurse into item's own nested properties
            injectNestedComponentTypes(item, propSchema.items);
          }
        }
      }
    } else if (
      propSchema.type === "object" &&
      propSchema.$id &&
      propSchema.properties
    ) {
      // Single object that is a component (has $id) → inject type, wrap
      // in array for Storyblok bloks fields.
      const child = obj[propName];
      if (typeof child === "object" && !Array.isArray(child)) {
        child.type = getSchemaName(propSchema.$id);
        injectNestedComponentTypes(child, propSchema);
        // Storyblok bloks fields are always arrays
        obj[propName] = [child];
      }
    }
    // else: plain nested value object or scalar — left as-is.
    // processForStoryblok will flatten plain nested objects via
    // flattenNestedObjects.
  }
}

// ─── Flatten / Unflatten utilities ────────────────────────────────────

/**
 * Flatten one level of nested objects using `_` as separator.
 *
 * Transforms `{ image: { src: "x", alt: "y" } }` into
 * `{ image_src: "x", image_alt: "y" }`.
 *
 * Objects that have a `type` or `component` property are left intact
 * (they are component blocks, not nested plain objects).
 *
 * Properties listed in `skipFields` are also left intact — used for flat
 * asset fields (`{ type: "string", format: "image" }` in the schema) that
 * should remain as scalar URL strings rather than being flattened.
 *
 * **Mutates** the input object in place.
 *
 * @param value - The object to flatten.
 * @param skipFields - Optional set of property names to skip (e.g. flat
 *   asset fields that must not be underscore-split).
 */
export function flattenNestedObjects(
  value: Record<string, any>,
  skipFields?: Set<string>
): void {
  for (const prop of Object.keys(value)) {
    if (skipFields?.has(prop)) continue;
    const child = value[prop];
    if (
      child &&
      typeof child === "object" &&
      !Array.isArray(child) &&
      !child.type &&
      !child.component
    ) {
      for (const nestedProp of Object.keys(child)) {
        value[`${prop}_${nestedProp}`] = structuredClone(child[nestedProp]);
      }
      delete value[prop];
    }
  }
}

/**
 * Reverse of `flattenNestedObjects`.
 *
 * Transforms `{ image_src: "x", image_alt: "y" }` into
 * `{ image: { src: "x", alt: "y" } }`.
 *
 * Keys starting with `_` (e.g. `_uid`, `_editable`) are preserved as-is.
 */
export function unflattenNestedObjects(
  blok: Record<string, any>
): Record<string, any> {
  return Object.entries(blok).reduce((a, [k, v]) => {
    if (k.startsWith("_")) {
      a[k] = v;
      return a;
    }

    k.split("_").reduce((r: any, e: string, i: number, arr: string[]) => {
      return r[e] || (r[e] = arr[i + 1] ? {} : v);
    }, a);

    return a;
  }, {} as Record<string, any>);
}

// ─── Missing component injection ──────────────────────────────────────

/**
 * Walk a Storyblok content tree and inject missing `component` fields on
 * items that sit inside monomorphic container slots (slots where only a
 * single component type is allowed).
 *
 * Storyblok bloks fields require every item to carry a `component`
 * discriminator. The generation pipeline converts `type` → `component`
 * via `processForStoryblok`, but that only works when the item already
 * has a `type` field from OpenAI output. Monomorphic sub-items (e.g.
 * `stat` inside `stats.stat[]`) often lack a `type` because the schema
 * preparation doesn't add a discriminator for single-type arrays.
 *
 * This function acts as a **safety net** — it runs after all other
 * transforms and uses the schema-derived `containerSlots` to inject
 * `component` where it's unambiguous (monomorphic = exactly 1 allowed type).
 *
 * **Mutates** the input in place.
 *
 * @param sections - Array of section objects (Storyblok format).
 * @param containerSlots - Map from `buildValidationRules()`.
 * @param rootArrayField - The root field name (default `"section"`).
 */
export function ensureSubItemComponents(
  sections: Record<string, any>[],
  containerSlots: Map<string, Set<string>>,
  rootArrayField = "section"
): void {
  for (const section of sections) {
    injectInNode(section, rootArrayField, containerSlots);
  }
}

/**
 * Recursively walk a node's array children and inject `component` on
 * items in monomorphic container slots.
 */
function injectInNode(
  node: Record<string, any>,
  nodeType: string,
  containerSlots: Map<string, Set<string>>
): void {
  for (const [key, value] of Object.entries(node)) {
    if (!Array.isArray(value)) continue;

    // Check if this array corresponds to a known container slot
    const slotPath = `${nodeType}.${key}`;
    const allowedTypes = containerSlots.get(slotPath);

    if (!allowedTypes) continue;

    for (const item of value) {
      if (typeof item !== "object" || item === null || Array.isArray(item)) {
        continue;
      }

      // Inject component if missing and slot is monomorphic
      if (!item.component && allowedTypes.size === 1) {
        item.component = [...allowedTypes][0];
      }

      // Recurse into the child's own container slots
      if (item.component) {
        injectInNode(item, item.component, containerSlots);
      }
    }
  }
}

/**
 * Ensure root-level bloks fields (like `seo` on `page`) are correctly
 * formatted for Storyblok: wrapped in an array with `component` injected.
 *
 * Root field schemas define component objects (with `$id`) that Storyblok
 * stores as bloks fields (arrays of component objects). When content is
 * passed as a plain object (e.g. from `generate_seo` output that was
 * unwrapped), this function re-wraps it.
 *
 * @param rootFields - The rootFields object from `create_page_with_content`.
 * @param rootBloksFields - Map of field name → component name, from
 *   `ValidationRules.rootBloksFields`.
 * @returns A new rootFields object with bloks fields correctly formatted.
 */
export function ensureRootFieldBloks(
  rootFields: Record<string, unknown>,
  rootBloksFields: Map<string, string>
): Record<string, unknown> {
  const result = { ...rootFields };

  for (const [fieldName, componentName] of rootBloksFields) {
    const value = result[fieldName];
    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      // Already an array — ensure items have `component`
      for (const item of value) {
        if (
          typeof item === "object" &&
          item !== null &&
          !Array.isArray(item) &&
          !item.component
        ) {
          item.component = componentName;
        }
      }
    } else if (typeof value === "object" && !Array.isArray(value)) {
      // Plain object — inject component and wrap in array
      const obj = value as Record<string, any>;
      if (!obj.component) {
        obj.component = componentName;
      }
      result[fieldName] = [obj];
    }
  }

  return result;
}

// ─── Internal helpers ─────────────────────────────────────────────────

/** Simple shallow merge fallback when deepmerge is not provided. */
function shallowMerge(a: any, b: any): any {
  if (
    typeof a === "object" &&
    !Array.isArray(a) &&
    typeof b === "object" &&
    !Array.isArray(b)
  ) {
    return { ...b, ...a };
  }
  return a;
}
