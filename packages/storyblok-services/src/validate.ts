/**
 * Schema-driven validation for content structures.
 *
 * Extracts component nesting rules from dereferenced JSON Schemas and
 * validates content trees against those rules.
 *
 * **Design principle:** All knowledge comes from the schema — no component
 * names, slot names, or hierarchy assumptions are hardcoded. This makes
 * the module work with any kickstartDS-based Design System.
 *
 * Pure functions — no framework dependencies.
 */

import { getSchemaName } from "./schema.js";

// ─── Types ────────────────────────────────────────────────────────────

/** A container slot in the schema — an array property that holds components. */
export interface ContainerSlot {
  /** Dot-separated path, e.g. `"section.components"`, `"mosaic.tile"`. */
  path: string;
  /** The set of component type names allowed in this slot. */
  allowedTypes: Set<string>;
}

/**
 * Rules extracted from a dereferenced root schema.
 *
 * These capture the full component hierarchy — which components exist,
 * where they can be placed, and which slots hold them.
 */
export interface ValidationRules {
  /**
   * Map from container-slot path to the set of component type names
   * allowed in that slot.
   *
   * Examples:
   * - `"section.components"` → `Set(["hero", "faq", "mosaic", …])`
   * - `"mosaic.tile"` → `Set(["tile"])`
   * - `"slider.components"` → `Set(["cta", "features", …])`
   */
  containerSlots: Map<string, Set<string>>;

  /**
   * Reverse index: for each component type, which container slot path(s)
   * it may appear in.
   *
   * Example: `"tile"` → `["mosaic.tile"]`
   */
  componentToSlots: Map<string, string[]>;

  /**
   * Union of all component type names found anywhere in the schema.
   */
  allKnownComponents: Set<string>;

  /**
   * Names of the top-level array properties in the root schema that hold
   * container structures (e.g. `["section"]`).
   */
  rootArrayFields: string[];

  /**
   * Maps parent component names to the property keys that hold their
   * sub-component arrays. Derived from `containerSlots`.
   *
   * Example: `"mosaic"` → `"tile"`, `"downloads"` → `"download"`
   *
   * Only includes entries where the sub-array is *exclusive* to that parent
   * (i.e. it's not a top-level container slot like `section.components`).
   */
  subComponentMap: Record<string, string>;

  /**
   * Maps component names to the set of property names that are "flat asset
   * fields" — i.e. `{ type: "string", format: "image" | "video" }` in the
   * Design System JSON Schema.
   *
   * These fields hold a single URL string (not a nested object with `src`,
   * `alt`, etc.). They must NOT be flattened by underscore splitting and
   * must be distinguished from nested image objects during content
   * normalization.
   *
   * Example: `"teaser-card"` → `Set(["image"])`,
   *          `"cta"` → `Set(["backgroundImage"])`
   */
  flatAssetFields: Map<string, Set<string>>;

  /**
   * Maps root-level bloks field names to their component name.
   *
   * These are root properties defined as single objects with `$id` in the
   * JSON Schema but stored as arrays of blok objects in Storyblok.
   *
   * Example: `"seo"` → `"seo"` (page), `"head"` → `"blog-head"` (blog-post)
   *
   * Used by `ensureRootFieldBloks()` to wrap plain objects in arrays and
   * inject the correct `component` identifier.
   */
  rootBloksFields: Map<string, string>;
}

/** Describes a single validation error. */
export interface ValidationError {
  /** JSON-path-like location, e.g. `"section[0].components[2]"`. */
  path: string;
  /** The component type that caused the error. */
  component: string;
  /** Human-readable, actionable error message. */
  message: string;
  /** Optional remediation hint. */
  suggestion?: string;
}

/** Result of validating a content tree. */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/** Options for `validateContent()`. */
export interface ValidateContentOptions {
  /**
   * When `false`, unknown component types produce warnings but are not
   * treated as errors. Useful for forward-compatibility during schema
   * transitions.
   * @default true
   */
  strict?: boolean;
  /**
   * Hint about which content format the input uses.
   * - `"storyblok"` — component type is in the `component` field.
   * - `"design-system"` — component type is in the `type` field.
   * - `"auto"` — try both, preferring `component`, then `type`.
   * @default "auto"
   */
  format?: "storyblok" | "design-system" | "auto";
}

// ─── Phase 1: Extract Validation Rules ────────────────────────────────

/**
 * Walk a dereferenced root JSON Schema and extract component nesting rules.
 *
 * The function discovers the hierarchy by inspecting the schema tree — it
 * never hardcodes component names, slot names, or structural assumptions.
 *
 * @param derefSchema - A fully dereferenced root JSON Schema (e.g. page,
 *   blog-post, event-detail — any content type).
 * @returns Validation rules describing every container slot and which
 *   component types may appear in each.
 */
export function buildValidationRules(
  derefSchema: Record<string, any>
): ValidationRules {
  const containerSlots = new Map<string, Set<string>>();
  const allKnownComponents = new Set<string>();
  const rootArrayFields: string[] = [];
  const flatAssetFields = new Map<string, Set<string>>();

  // ── Discover top-level array properties that hold containers ────
  const rootProps = derefSchema.properties || {};
  for (const [key, value] of Object.entries<any>(rootProps)) {
    if (
      value &&
      value.type === "array" &&
      value.items &&
      typeof value.items === "object"
    ) {
      // Check if items look like a component (has properties with nested arrays)
      // or if items have a `components` property with `anyOf`
      const itemProps = value.items.properties;
      if (itemProps) {
        // This top-level array holds structured objects — likely a container
        rootArrayFields.push(key);

        // Walk the items to discover container slots inside
        walkSchemaNode(
          value.items,
          key,
          containerSlots,
          allKnownComponents,
          flatAssetFields
        );
      }
    }
  }

  // ── Discover root-level bloks fields (single-object properties with $id) ──
  const rootBloksFields = new Map<string, string>();
  for (const [key, value] of Object.entries<any>(rootProps)) {
    if (value && value.type === "object" && value.$id && value.properties) {
      const name = getSchemaName(value.$id);
      if (name) {
        rootBloksFields.set(key, name);
        allKnownComponents.add(name);
        walkSchemaNode(
          value,
          name,
          containerSlots,
          allKnownComponents,
          flatAssetFields
        );
      }
    }
  }

  // ── Build reverse index ─────────────────────────────────────────
  const componentToSlots = new Map<string, string[]>();
  for (const [slotPath, allowedTypes] of containerSlots) {
    for (const typeName of allowedTypes) {
      const existing = componentToSlots.get(typeName) || [];
      existing.push(slotPath);
      componentToSlots.set(typeName, existing);
    }
  }

  // ── Derive sub-component map ────────────────────────────────────
  // A sub-component is one that appears ONLY in non-root container slots.
  // We identify root container slots as those whose path starts with a
  // rootArrayField followed by a dot and a single property name
  // (e.g. "section.components").
  const subComponentMap: Record<string, string> = {};
  for (const [slotPath, allowedTypes] of containerSlots) {
    const parts = slotPath.split(".");
    // Sub-component arrays are always nested inside a parent component:
    // format is "parentComponent.arrayKey"
    if (parts.length === 2) {
      const [parentComponent, arrayKey] = parts;
      // Skip the root-level container slots (e.g. "section.components")
      if (rootArrayFields.includes(parentComponent)) {
        continue;
      }
      // Only mark as sub-component if ALL types in this slot do NOT
      // appear in any root-level container slot
      const isExclusivelyNested = [...allowedTypes].every((typeName) => {
        const slots = componentToSlots.get(typeName) || [];
        return slots.every((s) => {
          const sParts = s.split(".");
          return !(sParts.length === 2 && rootArrayFields.includes(sParts[0]));
        });
      });
      if (isExclusivelyNested && allowedTypes.size > 0) {
        subComponentMap[parentComponent] = arrayKey;
      }
    }
  }

  return {
    containerSlots,
    componentToSlots,
    allKnownComponents,
    rootArrayFields,
    subComponentMap,
    flatAssetFields,
    rootBloksFields,
  };
}

/**
 * Recursively walk a schema node, discovering container arrays and the
 * component types they accept.
 *
 * A "container array" is an array property whose `items` contains either:
 * - An `anyOf` array of component-like objects (polymorphic slot)
 * - A single component-like object (monomorphic slot, e.g. `mosaic.tile`)
 *
 * A "component-like object" is identified by:
 * - Having a `type` property with a `const` value, OR
 * - Having a `$id` from which a name can be extracted via `getSchemaName()`
 */
function walkSchemaNode(
  schemaNode: Record<string, any>,
  contextPath: string,
  containerSlots: Map<string, Set<string>>,
  allKnownComponents: Set<string>,
  flatAssetFields?: Map<string, Set<string>>
): void {
  if (!schemaNode || typeof schemaNode !== "object") return;

  const properties = schemaNode.properties || {};

  // ── Discover flat asset fields (type: "string", format: "image"|"video") ──
  // These are scalar URL fields that must NOT be underscore-split during
  // flattening. Collected per component name (contextPath).
  if (flatAssetFields) {
    const componentName = extractComponentName(schemaNode);
    if (componentName) {
      for (const [propKey, propValue] of Object.entries<any>(properties)) {
        if (
          propValue &&
          propValue.type === "string" &&
          (propValue.format === "image" || propValue.format === "video")
        ) {
          const existing = flatAssetFields.get(componentName) || new Set();
          existing.add(propKey);
          flatAssetFields.set(componentName, existing);
        }
      }
    }
  }

  for (const [propKey, propValue] of Object.entries<any>(properties)) {
    if (!propValue || typeof propValue !== "object") continue;

    // Is this an array property?
    if (propValue.type === "array" && propValue.items) {
      const items = propValue.items;

      // ─ Case 1: anyOf (polymorphic container) ───────────────
      if (items.anyOf && Array.isArray(items.anyOf)) {
        const slotPath = `${contextPath}.${propKey}`;
        const allowedTypes = new Set<string>();

        for (const variant of items.anyOf) {
          const name = extractComponentName(variant, propKey);
          if (name) {
            allowedTypes.add(name);
            allKnownComponents.add(name);
            // Recurse into the variant to find nested containers
            walkSchemaNode(
              variant,
              name,
              containerSlots,
              allKnownComponents,
              flatAssetFields
            );
          }
        }

        if (allowedTypes.size > 0) {
          containerSlots.set(slotPath, allowedTypes);
        }
      }
      // ─ Case 2: single item schema (monomorphic container) ──
      else if (items.properties) {
        const name = extractComponentName(items, propKey);
        if (name) {
          const slotPath = `${contextPath}.${propKey}`;
          containerSlots.set(slotPath, new Set([name]));
          allKnownComponents.add(name);
          // Recurse into the item schema
          walkSchemaNode(
            items,
            name,
            containerSlots,
            allKnownComponents,
            flatAssetFields
          );
        } else {
          // The items don't have a component name but may contain
          // nested container arrays — recurse anyway
          walkSchemaNode(
            items,
            `${contextPath}.${propKey}`,
            containerSlots,
            allKnownComponents,
            flatAssetFields
          );
        }
      }
    }
  }
}

/**
 * Extract a component type name from a schema node.
 *
 * Checks in order:
 * 1. `properties.type.const` — explicit type discriminator
 * 2. `$id` — derive name via `getSchemaName()` (e.g. `hero.schema.json` → `hero`)
 * 3. `nameHint` — the array property key from the parent schema (e.g. the
 *    `logo` key in `logos.logo[]`).  Used for inline sub-component schemas
 *    that have neither `type.const` nor `$id` but are still structured
 *    objects with `properties`.
 */
function extractComponentName(
  schemaNode: Record<string, any>,
  nameHint?: string
): string | null {
  if (!schemaNode || typeof schemaNode !== "object") return null;

  // Check for type const
  const typeConst = schemaNode.properties?.type?.const;
  if (typeof typeConst === "string") return typeConst;

  // Check for $id
  const schemaId = schemaNode.$id;
  if (typeof schemaId === "string") {
    const name = getSchemaName(schemaId);
    if (name) return name;
  }

  // Fallback: use the array property key as the component name when the
  // items schema is a structured object (has `properties`) but was defined
  // inline without its own `$id` or `type.const` discriminator.
  if (nameHint && schemaNode.properties) return nameHint;

  return null;
}

// ─── Phase 2: Content Validation ──────────────────────────────────────

/**
 * Validate a content tree against schema-derived nesting rules.
 *
 * Works with any content format (Design System props, Storyblok-flattened,
 * or OpenAI `type__X` format) and any root schema structure.
 *
 * @param content - The content tree to validate. Can be a single object,
 *   an array of objects, or a full page object.
 * @param rules - Validation rules from `buildValidationRules()`.
 * @param options - Optional configuration.
 * @returns A `ValidationResult` with `valid: true` if no errors, or
 *   `valid: false` with an array of actionable errors.
 */
export function validateContent(
  content: Record<string, any> | Record<string, any>[],
  rules: ValidationRules,
  options: ValidateContentOptions = {}
): ValidationResult {
  const { strict = true, format = "auto" } = options;
  const errors: ValidationError[] = [];

  if (Array.isArray(content)) {
    // Array of top-level containers (e.g. sections)
    content.forEach((item, index) => {
      validateNode(item, `[${index}]`, null, rules, errors, strict, format);
    });
  } else {
    // Single content object — could be a full page or a single component
    validateNode(content, "", null, rules, errors, strict, format);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate an array of section objects. Convenience wrapper.
 *
 * Each section must either carry an explicit discriminator
 * (`component: "section"` in Storyblok format, `type: "section"` in
 * Design System format) or be structurally recognisable (has a
 * `components` array).  Missing discriminators are flagged as errors in
 * strict mode.
 */
export function validateSections(
  sections: Record<string, any>[],
  rules: ValidationRules,
  options?: ValidateContentOptions
): ValidationResult {
  const errors: ValidationError[] = [];
  const { strict = true, format = "auto" } = options || {};

  // Determine the primary root-array field that represents sections.
  // Typically "section", but derived from the schema so it works for
  // any root schema structure.
  const sectionField = rules.rootArrayFields[0] || "section";

  sections.forEach((section, index) => {
    const sectionPath = `${sectionField}[${index}]`;
    const detectedType = getComponentType(section, format);

    if (detectedType && detectedType !== sectionField) {
      // The object claims to be a different component — that's wrong
      // at the section level.
      errors.push({
        path: sectionPath,
        component: detectedType,
        message: `Expected a "${sectionField}" container but found component "${detectedType}".`,
        suggestion: `Wrap "${detectedType}" inside a "${sectionField}" container with a "components" array.`,
      });
      return;
    }

    if (!detectedType && strict) {
      // No discriminator — check if structurally valid (has a child
      // array that matches a known container slot for the section type).
      const hasChildSlot = Object.keys(section).some((key) => {
        if (!Array.isArray(section[key])) return false;
        return rules.containerSlots.has(`${sectionField}.${key}`);
      });

      if (!hasChildSlot) {
        errors.push({
          path: sectionPath,
          component: "(unknown)",
          message: `Section is missing a component discriminator and has no recognisable child slot.`,
          suggestion:
            format === "storyblok" || format === "auto"
              ? `Add \`"component": "${sectionField}"\` to identify it as a section.`
              : `Add \`"type": "${sectionField}"\` to identify it as a section.`,
        });
        return;
      }
      // Structurally valid — proceed with inferred type
    }

    // Validate the section's contents against known container slots.
    // Pass the inferred section type so slot lookup works even when the
    // discriminator is absent.
    validateContainerChildren(
      section,
      sectionPath,
      rules,
      errors,
      strict,
      format,
      sectionField
    );
  });

  return { valid: errors.length === 0, errors };
}

/**
 * Validate a full page content object. Convenience wrapper.
 */
export function validatePageContent(
  pageContent: Record<string, any>,
  rules: ValidationRules,
  options?: ValidateContentOptions
): ValidationResult {
  const errors: ValidationError[] = [];
  const { strict = true, format = "auto" } = options || {};

  // Walk root array fields (e.g. "section")
  for (const rootField of rules.rootArrayFields) {
    const rootArray = pageContent[rootField];
    if (Array.isArray(rootArray)) {
      rootArray.forEach((item: Record<string, any>, index: number) => {
        const path = `${rootField}[${index}]`;
        validateContainerChildren(
          item,
          path,
          rules,
          errors,
          strict,
          format,
          rootField
        );
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Recursively validate a single node in the content tree.
 *
 * If the node is inside a known container slot, checks that its component
 * type is allowed in that slot.
 */
function validateNode(
  node: Record<string, any>,
  path: string,
  parentSlotPath: string | null,
  rules: ValidationRules,
  errors: ValidationError[],
  strict: boolean,
  format: string
): void {
  if (!node || typeof node !== "object" || Array.isArray(node)) return;

  const componentType = getComponentType(node, format);

  // Flag Storyblok-format nodes that carry both `component` and `type`.
  // In Storyblok content, `type` is reserved for user-facing variant props
  // (e.g. CTA visual variant) — it must never act as a second discriminator.
  if (
    typeof node.component === "string" &&
    typeof node.type === "string" &&
    (format === "storyblok" || format === "auto")
  ) {
    errors.push({
      path: path || "(root)",
      component: node.component,
      message: `Component "${node.component}" has both "component" and "type" fields. Storyblok content must only use "component" as the discriminator.`,
      suggestion: `Remove the "type" field or run processForStoryblok() to clean it up.`,
    });
  }

  // If we know the parent slot, check that this component is allowed there
  if (parentSlotPath && componentType) {
    const allowedTypes = rules.containerSlots.get(parentSlotPath);
    if (allowedTypes && !allowedTypes.has(componentType)) {
      // Build actionable error
      const allowedSlots = rules.componentToSlots.get(componentType);
      const isKnown = rules.allKnownComponents.has(componentType);

      if (!isKnown && strict) {
        errors.push({
          path,
          component: componentType,
          message: `Unknown component "${componentType}" is not defined in the Design System schema.`,
          suggestion: `Known components: ${[...rules.allKnownComponents]
            .sort()
            .join(", ")}`,
        });
      } else if (isKnown) {
        const slotsDisplay = allowedSlots?.join(", ") || "nowhere";
        const parentName = parentSlotPath.split(".")[0];
        errors.push({
          path,
          component: componentType,
          message: `Component "${componentType}" cannot be a direct child of "${parentSlotPath}".`,
          suggestion: allowedSlots
            ? `"${componentType}" is allowed in: ${slotsDisplay}. ${buildNestingSuggestion(
                componentType,
                parentSlotPath,
                allowedSlots
              )}`
            : undefined,
        });
      }
    } else if (!componentType && strict) {
      // Content in a container slot but no identifiable component type.
      // Every component must carry a discriminator:
      //   - Storyblok format: `component`
      //   - Design System format: `type`
      const formatHint =
        format === "storyblok"
          ? 'a `"component"` field'
          : format === "design-system"
          ? 'a `"type"` field'
          : 'a `"component"` or `"type"` field';
      errors.push({
        path,
        component: "(unknown)",
        message: `Component inside "${parentSlotPath}" is missing ${formatHint} — cannot identify its type.`,
        suggestion: `Every component must have ${formatHint} set to one of the allowed types for this slot.`,
      });
    }
  }

  // Check if this component type is known at all (top-level check)
  if (componentType && !parentSlotPath && strict) {
    if (!rules.allKnownComponents.has(componentType)) {
      // Only flag if it looks like it should be a component
      // (has a `component` or `type` field)
      const hasExplicitType =
        node.component || node.type || hasTypeDiscriminator(node);
      if (hasExplicitType) {
        errors.push({
          path: path || "(root)",
          component: componentType,
          message: `Unknown component "${componentType}" is not defined in the Design System schema.`,
          suggestion: `Known components: ${[...rules.allKnownComponents]
            .sort()
            .join(", ")}`,
        });
      }
    }
  }

  // Recurse into child container arrays
  validateContainerChildren(node, path, rules, errors, strict, format);
}

/**
 * Walk child arrays of a node, checking each against matching container
 * slot rules.
 *
 * @param inferredType - When the caller already knows the logical component
 *   type of this node (e.g. the node is a section that was identified by
 *   position rather than by a discriminator field), pass it here so slot
 *   lookup still works correctly.
 */
function validateContainerChildren(
  node: Record<string, any>,
  path: string,
  rules: ValidationRules,
  errors: ValidationError[],
  strict: boolean,
  format: string,
  inferredType?: string
): void {
  // Use the explicit discriminator when present, fall back to the
  // caller-supplied inferred type (e.g. for sections without a field).
  const componentType = getComponentType(node, format) || inferredType || null;

  for (const [key, value] of Object.entries(node)) {
    if (!Array.isArray(value)) continue;

    // Determine which container slot this array corresponds to
    let slotPath: string | null = null;

    if (componentType) {
      // This is a named component — check "componentType.key" slot
      const candidateSlot = `${componentType}.${key}`;
      if (rules.containerSlots.has(candidateSlot)) {
        slotPath = candidateSlot;
      }
    }

    // Also check for root-level container slots: "rootField.key"
    // (e.g. when walking a section object, key might be "components")
    if (!slotPath) {
      for (const rootField of rules.rootArrayFields) {
        const rootSlot = `${rootField}.${key}`;
        if (rules.containerSlots.has(rootSlot)) {
          // Match if the current node IS a root-level container
          // (by discriminator, inferred type, or path position)
          if (componentType === rootField || path.startsWith(rootField)) {
            slotPath = rootSlot;
          }
        }
      }
    }

    if (!slotPath) {
      // If we still don't have a slot, try to match against any known slot
      // where the array key matches (fallback for content where the parent
      // type might be expressed differently)
      for (const [knownSlot] of rules.containerSlots) {
        const parts = knownSlot.split(".");
        if (parts.length === 2 && parts[1] === key) {
          const parentType = parts[0];
          if (componentType === parentType) {
            slotPath = knownSlot;
            break;
          }
        }
      }
    }

    // Validate each child in the array
    value.forEach((child: any, index: number) => {
      if (child && typeof child === "object" && !Array.isArray(child)) {
        const childPath = `${path}.${key}[${index}]`;
        validateNode(child, childPath, slotPath, rules, errors, strict, format);
      }
    });
  }
}

// ─── Formatting ───────────────────────────────────────────────────────

/**
 * Format validation errors into a clear, LLM-friendly message.
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) return "✅ Content validation passed.";

  const lines = [
    `❌ Content validation failed (${errors.length} error${
      errors.length === 1 ? "" : "s"
    }):`,
    "",
  ];

  errors.forEach((err, i) => {
    lines.push(`${i + 1}. ${err.path}: ${err.message}`);
    if (err.suggestion) {
      lines.push(`   → ${err.suggestion}`);
    }
    lines.push("");
  });

  return lines.join("\n");
}

// ─── Helpers ──────────────────────────────────────────────────────────

/**
 * Extract the component type name from a content node.
 *
 * Supports three formats:
 * - Storyblok: `{ component: "hero" }`
 * - Design System: `{ type: "hero" }`
 * - OpenAI transformed: `{ type__hero: "hero" }`
 */
function getComponentType(
  node: Record<string, any>,
  format: string
): string | null {
  if (!node || typeof node !== "object") return null;

  switch (format) {
    case "storyblok":
      return typeof node.component === "string" ? node.component : null;

    case "design-system":
      return typeof node.type === "string" ? node.type : null;

    case "auto":
    default: {
      // Try Storyblok format first
      if (typeof node.component === "string") return node.component;
      // Then Design System format
      if (typeof node.type === "string") return node.type;
      // Then OpenAI type__ format
      const typeKey = Object.keys(node).find((k) => k.startsWith("type__"));
      if (typeKey) return typeKey.replace("type__", "");
      return null;
    }
  }
}

/**
 * Check if a node has a `type__X` discriminator key (OpenAI format).
 */
function hasTypeDiscriminator(node: Record<string, any>): boolean {
  return Object.keys(node).some((k) => k.startsWith("type__"));
}

/**
 * Build a human-readable nesting suggestion.
 */
function buildNestingSuggestion(
  componentType: string,
  currentSlot: string,
  allowedSlots: string[]
): string {
  if (!allowedSlots || allowedSlots.length === 0) return "";

  // Find a parent component that has a slot for this component
  const parents = allowedSlots.map((slot) => {
    const parts = slot.split(".");
    return parts[0]; // parent component name
  });

  const uniqueParents = [...new Set(parents)];

  if (uniqueParents.length === 1) {
    return `Wrap it inside a "${uniqueParents[0]}" component.`;
  }

  return `Place it inside one of: ${uniqueParents
    .map((p) => `"${p}"`)
    .join(", ")}.`;
}

// ─── Compositional Quality Warnings ───────────────────────────────────

/**
 * A non-blocking quality warning about content composition.
 *
 * Unlike `ValidationError`, warnings don't prevent content from being saved.
 * They flag patterns that produce suboptimal visual or UX results.
 */
export interface ValidationWarning {
  /** Severity level. */
  level: "info" | "warning" | "suggestion";
  /** Human-readable warning message. */
  message: string;
  /** JSON-path-like location, if applicable. */
  path?: string;
  /** Suggested improvement. */
  suggestion?: string;
}

/**
 * Minimum sub-item counts for components to render well.
 *
 * Derived from Design System layout constraints — e.g. a stats row needs
 * at least 3 items to avoid awkward whitespace, a slider needs ≥3 slides.
 *
 * Schema-driven: keys must match `subComponentMap` parent names.
 */
const MIN_SUB_ITEMS: Record<string, { min: number; label: string }> = {
  stats: { min: 3, label: "stat items" },
  features: { min: 2, label: "feature items" },
  testimonials: { min: 2, label: "testimonials" },
  slider: { min: 3, label: "slides" },
  "logos-companies": { min: 4, label: "logo items" },
  mosaic: { min: 3, label: "tiles" },
  gallery: { min: 3, label: "gallery images" },
};

/**
 * Check content for compositional quality issues.
 *
 * This is a "soft" check that produces warnings, not errors. Content is
 * still valid even if warnings are present — they're hints for improvement.
 *
 * @param sections  - Array of section objects (Storyblok or Design System format).
 * @param rules     - Validation rules (for subComponentMap and topLevelComponents).
 * @param options   - Same format options as validateContent.
 * @returns Array of warnings (empty = no issues detected).
 */
export function checkCompositionalQuality(
  sections: Record<string, any>[],
  rules: ValidationRules,
  options: ValidateContentOptions = {}
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const format = options.format ?? "auto";

  if (!sections || sections.length === 0) return warnings;

  // Extract all top-level components from sections
  const sectionComponents: Array<{
    type: string;
    index: number;
    section: Record<string, any>;
    components: Record<string, any>[];
  }> = [];

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    // Find the component array in the section
    const componentsKey = Object.keys(section).find(
      (k) =>
        Array.isArray(section[k]) &&
        section[k].length > 0 &&
        typeof section[k][0] === "object"
    );
    const components: Record<string, any>[] = componentsKey
      ? section[componentsKey]
      : [];

    for (const comp of components) {
      const type = getComponentType(comp, format);
      if (type) {
        sectionComponents.push({
          type,
          index: i,
          section,
          components,
        });
      }
    }
  }

  // 1. Duplicate heroes
  const heroComponents = sectionComponents.filter(
    (c) => c.type === "hero" || c.type === "video-curtain"
  );
  if (heroComponents.length > 1) {
    warnings.push({
      level: "warning",
      message: `Multiple hero-type components found (${heroComponents
        .map((h) => h.type)
        .join(", ")}). Pages typically have exactly one hero.`,
      path: `section[${heroComponents[1].index}]`,
      suggestion:
        "Keep only the first hero/video-curtain. Use a different component type for subsequent sections.",
    });
  }

  // 2. Same component type in adjacent sections
  for (let i = 1; i < sectionComponents.length; i++) {
    const prev = sectionComponents[i - 1];
    const curr = sectionComponents[i];
    if (
      prev.type === curr.type &&
      prev.type !== "divider" &&
      prev.index !== curr.index // only if in different sections
    ) {
      warnings.push({
        level: "info",
        message: `Adjacent sections both use "${curr.type}". This may look repetitive.`,
        path: `section[${curr.index}]`,
        suggestion: `Consider using a different component type, or merging the content into a single "${curr.type}" section.`,
      });
    }
  }

  // 3. Too few sub-items
  for (const comp of sectionComponents) {
    const subKey = rules.subComponentMap[comp.type];
    if (!subKey) continue;

    const minSpec = MIN_SUB_ITEMS[comp.type];
    if (!minSpec) continue;

    // Find the component node with sub-items
    const compNode = comp.components.find((c) => {
      const t = getComponentType(c, format);
      return t === comp.type;
    });
    if (!compNode) continue;

    const subItems = compNode[subKey];
    if (Array.isArray(subItems) && subItems.length < minSpec.min) {
      warnings.push({
        level: "warning",
        message: `"${comp.type}" has only ${subItems.length} ${minSpec.label} (minimum recommended: ${minSpec.min}).`,
        path: `section[${comp.index}].${comp.type}.${subKey}`,
        suggestion: `Add more ${
          minSpec.label
        } for a balanced layout. Most sites use ${minSpec.min}-${
          minSpec.min + 2
        }.`,
      });
    }
  }

  // 4. blog-teaser without link_url
  for (const comp of sectionComponents) {
    if (comp.type !== "blog-teaser") continue;
    const compNode = comp.components.find((c) => {
      const t = getComponentType(c, format);
      return t === "blog-teaser";
    });
    if (compNode && !compNode.link_url && !compNode.link?.url) {
      warnings.push({
        level: "warning",
        message: `"blog-teaser" section at index ${comp.index} has no link URL. Visitors can't navigate to the blog.`,
        path: `section[${comp.index}].blog-teaser`,
        suggestion: "Add a link_url pointing to the blog overview page.",
      });
    }
  }

  // 5. No CTA component on a page that looks like a conversion page
  const hasHero = sectionComponents.some((c) => c.type === "hero");
  const hasFeatures = sectionComponents.some(
    (c) => c.type === "features" || c.type === "split"
  );
  const hasCta = sectionComponents.some((c) => c.type === "cta");
  if (hasHero && hasFeatures && !hasCta && sectionComponents.length >= 4) {
    warnings.push({
      level: "info",
      message:
        "This looks like a conversion page (hero + features) but has no CTA section.",
      suggestion:
        'Consider adding a "cta" section near the end to drive conversions.',
    });
  }

  // ─── Field-level composition warnings ───────────────────────────

  // Components whose own headline should take precedence over the section headline
  const COMPONENTS_WITH_OWN_HEADLINE = new Set([
    "hero",
    "cta",
    "video-curtain",
  ]);
  // Components whose own buttons should take precedence over section buttons
  const COMPONENTS_WITH_OWN_BUTTONS = new Set(["hero", "cta", "video-curtain"]);

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const sectionField = rules.rootArrayFields[0] || "section";

    // Find child components in this section
    const componentsKey = Object.keys(section).find(
      (k) =>
        Array.isArray(section[k]) &&
        section[k].length > 0 &&
        typeof section[k][0] === "object"
    );
    const components: Record<string, any>[] = componentsKey
      ? section[componentsKey]
      : [];
    const childTypes = components
      .map((c) => getComponentType(c, format))
      .filter(Boolean) as string[];

    // 6. Redundant section headline — section has headline_text AND contains
    // a component that has its own headline
    const sectionHasHeadline =
      (typeof section.headline_text === "string" &&
        section.headline_text.trim().length > 0) ||
      (typeof section.headline === "string" &&
        section.headline.trim().length > 0);
    const childWithOwnHeadline = childTypes.find((t) =>
      COMPONENTS_WITH_OWN_HEADLINE.has(t)
    );
    if (sectionHasHeadline && childWithOwnHeadline) {
      warnings.push({
        level: "suggestion",
        message: `Section has headline_text but contains a ${childWithOwnHeadline} which has its own headline. Consider removing the section headline.`,
        path: `${sectionField}[${i}].headline_text`,
        suggestion: `Clear the section headline to avoid visual competition with the ${childWithOwnHeadline}'s headline.`,
      });
    }

    // 7. Competing CTAs — section has buttons AND child has buttons
    const sectionHasButtons =
      Array.isArray(section.buttons) && section.buttons.length > 0;
    const childWithOwnButtons = childTypes.find((t) =>
      COMPONENTS_WITH_OWN_BUTTONS.has(t)
    );
    if (sectionHasButtons && childWithOwnButtons) {
      warnings.push({
        level: "suggestion",
        message: `Section has buttons but its child ${childWithOwnButtons} also has buttons. Two CTA groups will render.`,
        path: `${sectionField}[${i}].buttons`,
        suggestion: `Remove section-level buttons when the child component already has CTAs.`,
      });
    }

    // 8. (Removed — list mode with single component is valid)

    // 9. First section spacing — first section should use spaceBefore "none"
    if (i === 0) {
      const spaceBefore = section.spaceBefore ?? section.space_before;
      if (spaceBefore && spaceBefore !== "none" && spaceBefore !== "") {
        warnings.push({
          level: "info",
          message: `First section has spaceBefore "${spaceBefore}". The first section typically uses "none" to align with the page top.`,
          path: `${sectionField}[0].spaceBefore`,
          suggestion: `Consider setting spaceBefore to "none" for the opening section.`,
        });
      }
    }
  }

  return warnings;
}
