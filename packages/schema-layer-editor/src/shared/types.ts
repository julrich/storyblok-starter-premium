/**
 * Shared types used by both server and client code in the Schema Layer Editor.
 */

// ─── Content Hierarchy ──────────────────────────────────────────────────────

/** Known root content types in the Design System */
export const ROOT_CONTENT_TYPES = [
  "page",
  "blog-post",
  "blog-overview",
  "settings",
  "event-detail",
  "event-list",
  "search",
] as const;

export type ContentTypeName = (typeof ROOT_CONTENT_TYPES)[number];

/** Section-based content types (have a section[] array) */
export const SECTION_BASED_TYPES: readonly ContentTypeName[] = [
  "page",
  "blog-post",
  "blog-overview",
];

// ─── Schema Tree Model ─────────────────────────────────────────────────────

export type FieldType =
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "object"
  | "array"
  | "polymorphic"
  | "unknown";

export interface FieldMeta {
  /** JSON property name */
  name: string;
  /** Dot-separated path within the component (e.g. "image.srcMobile") */
  path: string;
  /** JSON Schema type */
  type: FieldType;
  /** JSON Schema title from the base schema */
  title?: string;
  /** JSON Schema description from the base schema */
  description?: string;
  /** JSON Schema format (e.g. "markdown", "image", "uri") */
  format?: string;
  /** JSON Schema enum values */
  enumValues?: string[];
  /** JSON Schema default value */
  defaultValue?: unknown;
  /** Whether this field is in the parent's `required` array */
  required: boolean;
  /** Original position in the JSON Schema properties object (0-based) */
  schemaOrder: number;
}

export interface FieldNode {
  kind: "field";
  meta: FieldMeta;
  /** Child fields (for objects: properties; for arrays: item properties) */
  children: FieldNode[];
  /** Whether this is a polymorphic slot that should not be expanded */
  isPolymorphic: boolean;
  /** Available component names in a polymorphic anyOf/oneOf slot */
  polymorphicVariants: string[];
  /** Whether this is the section array (identified during content type parsing) */
  isSectionArray: boolean;
}

export interface ComponentNode {
  kind: "component";
  /** Component name (e.g. "hero", "cta") */
  name: string;
  /** $id from the base schema */
  schemaId: string;
  /** Top-level fields of the component */
  fields: FieldNode[];
}

export interface RootFieldInfo {
  /** Property name in the content type schema */
  name: string;
  /** Whether this is a scalar (inline toggle) or object/array (clickable) */
  fieldType: "scalar" | "object" | "array";
  /** The parsed field tree (for objects and arrays) */
  fieldNode: FieldNode;
}

export interface ContentTypeInfo {
  /** Content type name (e.g. "page", "blog-post") */
  name: ContentTypeName;
  /** Whether this content type has a section[] array */
  hasSections: boolean;
  /** Root fields (non-section properties) */
  rootFields: RootFieldInfo[];
  /** Component names available in this content type's section.components anyOf */
  sectionComponents: string[];
}

// ─── Override Model ─────────────────────────────────────────────────────────

export interface FieldOverride {
  /** x-cms-hidden value (undefined = no override) */
  hidden?: boolean;
  /** title override (undefined = no override) */
  title?: string;
  /** description override (undefined = no override) */
  description?: string;
  /** x-cms-order value (undefined = no override) */
  order?: number;
  /** default value override (undefined = no override) */
  defaultValue?: unknown;
  /** For polymorphic fields: allowed component names (undefined = all allowed) */
  allowedComponents?: string[];
}

/** Map from field path to override. Keyed by dot-separated path. */
export type OverrideMap = Map<string, FieldOverride>;

/** Map from component/content-type-root-field name to its overrides */
export type ComponentOverrides = Map<string, OverrideMap>;

// ─── API Types ──────────────────────────────────────────────────────────────

export interface SchemaResponse {
  contentTypes: ContentTypeInfo[];
  components: ComponentNode[];
}

export interface LayerResponse {
  overrides: Record<string, Record<string, FieldOverride>>;
  /** "component::path" keys for overrides that reference missing schema fields */
  staleOverrides?: string[];
}

export interface SaveRequest {
  overrides: Record<string, Record<string, FieldOverride>>;
  outputDir?: string;
  namespace?: string;
  baseUrl?: string;
}

export interface SaveResponse {
  success: boolean;
  filesWritten: string[];
  filesDeleted: string[];
  errors: string[];
}

export interface ConfigResponse {
  schemasDir: string;
  layerDir?: string;
  namespace: string;
  baseUrl: string;
  outputDir: string;
}
