/**
 * Parse JSON Schema → tree model.
 *
 * Converts dereferenced JSON Schema objects into the FieldNode / ComponentNode
 * tree structure used by the editor UI. Handles nested objects, arrays,
 * polymorphic composition slots, and content type classification.
 *
 * See PRD §7 for parsing rules.
 */

import type {
  FieldNode,
  FieldType,
  FieldMeta,
  ComponentNode,
  ContentTypeInfo,
  ContentTypeName,
  RootFieldInfo,
  SECTION_BASED_TYPES,
} from "../../shared/types.js";
import { ROOT_CONTENT_TYPES } from "../../shared/types.js";

// ─── JSON Schema type helpers ───────────────────────────────────────────────

interface JsonSchema {
  $schema?: string;
  $id?: string;
  $ref?: string;
  title?: string;
  description?: string;
  type?: string | string[];
  format?: string;
  enum?: unknown[];
  default?: unknown;
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
  allOf?: JsonSchema[];
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  additionalProperties?: boolean | JsonSchema;
  [key: string]: unknown;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function resolveType(schema: JsonSchema): FieldType {
  if (schema.anyOf || schema.oneOf) {
    const variants = schema.anyOf || schema.oneOf || [];
    if (variants.length > 1) {
      // Check if all variants share the same type
      const types = new Set(
        variants.map((v) => (typeof v.type === "string" ? v.type : "unknown"))
      );
      if (types.size === 1) {
        return resolveType(variants[0]);
      }
      return "polymorphic";
    }
    if (variants.length === 1) {
      return resolveType(variants[0]);
    }
  }
  const t = typeof schema.type === "string" ? schema.type : undefined;
  if (t === "string") return "string";
  if (t === "number") return "number";
  if (t === "integer") return "integer";
  if (t === "boolean") return "boolean";
  if (t === "object") return "object";
  if (t === "array") return "array";
  // Infer from properties/items
  if (schema.properties) return "object";
  if (schema.items) return "array";
  return "unknown";
}

function isPolymorphic(schema: JsonSchema): boolean {
  const variants = schema.anyOf || schema.oneOf;
  if (!variants) return false;
  if (variants.length <= 1) return false;

  // If multiple variants have different types or have properties, it's
  // a true polymorphic composition slot
  const hasMultipleObjectSchemas =
    variants.filter((v) => v.type === "object" || v.properties).length > 1;
  return hasMultipleObjectSchemas;
}

/** Extract human-readable variant names from anyOf/oneOf schemas */
function extractVariantNames(schema: JsonSchema): string[] {
  const variants = schema.anyOf || schema.oneOf;
  if (!variants) return [];
  return variants
    .map((v) => {
      // Prefer title, then try to derive from $id or properties.type.const
      if (v.title) return v.title;
      if (v.$id) {
        const match = v.$id.match(/\/([^/]+)\.schema\.json$/);
        if (match) return match[1];
      }
      // Check for a discriminator const
      const typeConst = v.properties?.type;
      if (typeConst && typeof typeConst === "object" && "const" in typeConst) {
        return String((typeConst as { const: unknown }).const);
      }
      return undefined;
    })
    .filter((n): n is string => !!n);
}

function mergeAllOf(schema: JsonSchema): JsonSchema {
  if (!schema.allOf || schema.allOf.length === 0) return schema;

  const merged: JsonSchema = { ...schema };
  delete merged.allOf;

  for (const sub of schema.allOf) {
    // Skip $ref entries (shouldn't appear in dereffed but handle gracefully)
    if (sub.$ref) continue;

    if (sub.properties) {
      merged.properties = { ...merged.properties, ...sub.properties };
    }
    if (sub.required) {
      merged.required = [...(merged.required || []), ...sub.required];
    }
    if (sub.type && !merged.type) {
      merged.type = sub.type;
    }
    if (sub.title && !merged.title) {
      merged.title = sub.title;
    }
    if (sub.description && !merged.description) {
      merged.description = sub.description;
    }
    // Recursively merge nested allOf
    if (sub.allOf) {
      const innerMerged = mergeAllOf(sub);
      if (innerMerged.properties) {
        merged.properties = { ...merged.properties, ...innerMerged.properties };
      }
      if (innerMerged.required) {
        merged.required = [...(merged.required || []), ...innerMerged.required];
      }
    }
  }

  return merged;
}

// ─── Core Parsing ───────────────────────────────────────────────────────────

/**
 * Parse a JSON Schema property into a FieldNode.
 *
 * @param name - Property name
 * @param schema - The property's schema
 * @param parentPath - Dot-separated path of the parent
 * @param requiredFields - Set of required field names at this level
 */
export function parseField(
  name: string,
  schema: JsonSchema,
  parentPath: string,
  requiredFields: Set<string>,
  schemaOrder: number = 0
): FieldNode {
  // Warn about unexpected $ref in dereffed schemas (PRD §11)
  if (schema.$ref) {
    console.warn(
      `Warning: Unexpected $ref in dereffed schema at "${
        parentPath ? parentPath + "." : ""
      }${name}". ` + `Field will be shown as opaque. $ref: ${schema.$ref}`
    );
  }

  const resolved = mergeAllOf(schema);
  const path = parentPath ? `${parentPath}.${name}` : name;
  const type = resolveType(resolved);

  const meta: FieldMeta = {
    name,
    path,
    type,
    title: resolved.title,
    description: resolved.description,
    format: resolved.format,
    enumValues: resolved.enum?.map(String),
    defaultValue: resolved.default,
    required: requiredFields.has(name),
    schemaOrder,
  };

  // Check for polymorphic before expanding children
  if (type === "polymorphic" || isPolymorphic(resolved)) {
    return {
      kind: "field",
      meta: { ...meta, type: "polymorphic" },
      children: [],
      isPolymorphic: true,
      polymorphicVariants: extractVariantNames(resolved),
      isSectionArray: false,
    };
  }

  const children: FieldNode[] = [];

  if (type === "object" && resolved.properties) {
    const reqSet = new Set(resolved.required || []);
    const entries = Object.entries(resolved.properties);
    entries.forEach(([propName, propSchema], idx) => {
      children.push(parseField(propName, propSchema, path, reqSet, idx));
    });
  } else if (type === "array" && resolved.items) {
    const items = resolved.items;

    // Check if items is polymorphic
    if (isPolymorphic(items)) {
      return {
        kind: "field",
        meta: { ...meta, type: "array" },
        children: [],
        isPolymorphic: true,
        polymorphicVariants: extractVariantNames(items),
        isSectionArray: false,
      };
    }

    const resolvedItems = mergeAllOf(items);
    if (resolvedItems.properties) {
      const reqSet = new Set(resolvedItems.required || []);
      const entries = Object.entries(resolvedItems.properties);
      entries.forEach(([propName, propSchema], idx) => {
        children.push(
          parseField(propName, propSchema, `${path}[]`, reqSet, idx)
        );
      });
    }
  }

  return {
    kind: "field",
    meta,
    children,
    isPolymorphic: false,
    polymorphicVariants: [],
    isSectionArray: false,
  };
}

/**
 * Parse a full component schema into a ComponentNode.
 */
export function parseComponent(
  name: string,
  schema: JsonSchema
): ComponentNode {
  const resolved = mergeAllOf(schema);
  const fields: FieldNode[] = [];

  if (resolved.properties) {
    const reqSet = new Set(resolved.required || []);
    const entries = Object.entries(resolved.properties);
    let idx = 0;
    for (const [propName, propSchema] of entries) {
      // Skip internal fields
      if (propName === "type" || propName === "component") continue;
      fields.push(parseField(propName, propSchema, "", reqSet, idx));
      idx++;
    }
  }

  return {
    kind: "component",
    name,
    schemaId: schema.$id || "",
    fields,
  };
}

// ─── Content Type Parsing ───────────────────────────────────────────────────

/**
 * Detect which property is the section array in a content type schema.
 * Looks for an array property whose items have a `components` property with anyOf.
 */
function findSectionProperty(
  properties: Record<string, JsonSchema>
): { name: string; schema: JsonSchema; componentNames: string[] } | null {
  for (const [propName, propSchema] of Object.entries(properties)) {
    const resolved = mergeAllOf(propSchema);
    if (resolved.type !== "array" || !resolved.items) continue;

    const items = mergeAllOf(resolved.items);
    if (!items.properties?.components) continue;

    const comps = items.properties.components;
    if (!comps.items) continue;

    const compItems = comps.items;
    const variants = compItems.anyOf || compItems.oneOf;
    if (variants && variants.length > 1) {
      // Extract component names from $ref or $id or title
      const componentNames = variants
        .map((v) => {
          if (v.$ref) {
            const match = v.$ref.match(/\/([^/]+)\.schema\.json$/);
            return match ? match[1] : undefined;
          }
          if (v.$id) {
            const match = v.$id.match(/\/([^/]+)\.schema\.json$/);
            return match ? match[1] : undefined;
          }
          return v.title?.toLowerCase().replace(/\s+/g, "-");
        })
        .filter((n): n is string => !!n);

      return { name: propName, schema: propSchema, componentNames };
    }
  }
  return null;
}

/**
 * Parse a content type schema into ContentTypeInfo.
 *
 * Classifies properties into section array, root fields (object/array/scalar),
 * and extracts section component names.
 */
export function parseContentType(
  name: ContentTypeName,
  schema: JsonSchema
): ContentTypeInfo {
  const resolved = mergeAllOf(schema);
  const properties = resolved.properties || {};

  // Find the section array property
  const sectionInfo = findSectionProperty(properties);
  const sectionPropertyName = sectionInfo?.name;

  const rootFields: RootFieldInfo[] = [];
  const requiredSet = new Set(resolved.required || []);

  for (const [propName, propSchema] of Object.entries(properties)) {
    // Skip the section array — handled separately
    if (propName === sectionPropertyName) continue;
    // Skip internal fields
    if (propName === "type" || propName === "component") continue;

    const fieldResolved = mergeAllOf(propSchema);
    const fieldType = resolveType(fieldResolved);

    let rfType: "scalar" | "object" | "array";
    if (fieldType === "object") {
      rfType = "object";
    } else if (fieldType === "array") {
      rfType = "array";
    } else {
      rfType = "scalar";
    }

    rootFields.push({
      name: propName,
      fieldType: rfType,
      fieldNode: parseField(propName, fieldResolved, "", requiredSet),
    });
  }

  return {
    name,
    hasSections: !!sectionInfo,
    rootFields,
    sectionComponents: sectionInfo?.componentNames || [],
  };
}

/**
 * Check if a schema name is a known content type.
 */
export function isContentType(name: string): name is ContentTypeName {
  return (ROOT_CONTENT_TYPES as readonly string[]).includes(name);
}
