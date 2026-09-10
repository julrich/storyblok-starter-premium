# Structured Outputs: JSON Schema Support — Claude vs OpenAI GPT

> **Last updated:** 2026-02-23
>
> This comparison documents the JSON Schema subset supported by each provider's
> Structured Outputs feature. It serves as a reference for building **provider
> adapters** so that `packages/storyblok-services/src/schema.ts` can target
> multiple LLM backends without over-stripping or under-preparing schemas.
>
> **Sources:**
> - Claude: https://platform.claude.com/docs/en/build-with-claude/structured-outputs#json-schema-limitations
> - OpenAI: https://developers.openai.com/api/docs/guides/structured-outputs/#supported-schemas

---

## Supported Types

| Type | OpenAI | Claude |
|------|--------|--------|
| `string` | ✅ | ✅ |
| `number` | ✅ | ✅ |
| `boolean` | ✅ | ✅ |
| `integer` | ✅ | ✅ |
| `object` | ✅ | ✅ |
| `array` | ✅ | ✅ |
| `null` | ✅ (via union `["string", "null"]`) | ✅ |
| `enum` | ✅ | ✅ |

## Composition Keywords

| Keyword | OpenAI | Claude |
|---------|--------|--------|
| `anyOf` | ✅ (not at root level) | ✅ (max 16 params with union types) |
| `allOf` | ❌ | ❌ |
| `oneOf` | ❌ | ❌ |
| `not` | ❌ | ❌ |
| `if` / `then` / `else` | ❌ | ❌ |
| `dependentRequired` / `dependentSchemas` | ❌ | ❌ |

## References & Recursion

| Feature | OpenAI | Claude |
|---------|--------|--------|
| `$ref` | ✅ | ✅ |
| `$defs` / `definitions` | ✅ | ✅ |
| Recursive schemas | ✅ | ✅ (implied via `$ref`) |

## String Constraints

| Keyword | OpenAI | Claude |
|---------|--------|--------|
| `pattern` (regex) | ✅ (not for fine-tuned models) | ✅ |
| `format` | ✅ 9 formats: `date-time`, `time`, `date`, `duration`, `email`, `hostname`, `ipv4`, `ipv6`, `uuid` (not for fine-tuned) | ⚠️ Partial — SDK filters to a supported subset |
| `minLength` | ❌ | ❌ (SDK removes, adds to description) |
| `maxLength` | ❌ | ❌ (SDK removes, adds to description) |
| `const` | ❌ | ✅ |

## Numeric Constraints

| Keyword | OpenAI | Claude |
|---------|--------|--------|
| `minimum` | ✅ (not for fine-tuned) | ❌ (SDK removes, adds to description) |
| `maximum` | ✅ (not for fine-tuned) | ❌ (SDK removes, adds to description) |
| `exclusiveMinimum` | ✅ (not for fine-tuned) | ❌ |
| `exclusiveMaximum` | ✅ (not for fine-tuned) | ❌ |
| `multipleOf` | ✅ (not for fine-tuned) | ❌ |

## Array Constraints

| Keyword | OpenAI | Claude |
|---------|--------|--------|
| `minItems` | ✅ (not for fine-tuned) | ❌ |
| `maxItems` | ✅ (not for fine-tuned) | ❌ |

## Object Rules

| Rule | OpenAI | Claude |
|------|--------|--------|
| `additionalProperties: false` required | ✅ Always | ✅ Always (SDK auto-adds) |
| `patternProperties` | ❌ | ❌ |
| All fields must be `required` | ✅ — emulate optional via `["type", "null"]` union | ❌ — optional fields allowed (max 24 total) |

## Other Keywords

| Keyword | OpenAI | Claude |
|---------|--------|--------|
| `description` | ✅ | ✅ |
| `default` | ❌ | ❌ |
| `examples` | ❌ | ❌ |
| `$id` / `$schema` | ❌ | ❌ |

## Schema Size & Complexity Limits

| Limit | OpenAI | Claude |
|-------|--------|--------|
| Max object properties | 5,000 total | No explicit limit (grammar complexity-based) |
| Max nesting depth | 10 levels | No explicit limit (grammar complexity-based) |
| Max enum values | 1,000 total; 15K chars if >250 values | No explicit limit |
| Max string length (names/enums/const) | 120,000 chars | No explicit limit |
| Max strict tools per request | Not explicitly stated | 20 |
| Max optional params | N/A (all must be required) | 24 total |
| Max union-type params | Not explicitly stated | 16 total |
| Root schema | Must be `object` (no `anyOf` at root) | Must be `object` |
| Compilation timeout | Not stated | 180 seconds |

## Key Architectural Differences

| Aspect | OpenAI | Claude |
|--------|--------|--------|
| **Optionality model** | All fields `required`; use `["type", "null"]` for optional | True optional fields allowed (up to 24) |
| **`const` support** | ❌ Not supported | ✅ Supported — big win for discriminated unions |
| **Numeric/array validation** | ✅ Recently added (`minimum`, `maximum`, `minItems`, etc.) | ❌ Not supported at grammar level; SDK moves to descriptions |
| **String `format`** | ✅ 9 formats supported | ⚠️ Partial list |
| **Compilation approach** | Not documented in detail | Grammar-based constrained decoding, cached 24h |
| **Refusal handling** | Separate `refusal` field in response | `stop_reason: "refusal"` |
| **SDK auto-transform** | Pydantic / Zod helpers | Pydantic / Zod helpers + auto-strips unsupported constraints into descriptions |

---

## Adapter Strategy

### Current State

`packages/storyblok-services/src/schema.ts` performs **15 transformation passes**
that assume OpenAI as the sole target. The `UNSUPPORTED_KEYWORDS` list strips
keywords that OpenAI didn't support at the time of writing:

```ts
export const UNSUPPORTED_KEYWORDS = [
  "format", "minItems", "maxItems", "minimum", "maximum",
  "examples", "default", "$id", "$schema",
] as const;
```

Additionally, `const` values are replaced with synthetic `type__<value>` enum
discriminators because OpenAI does not support `const`.

### Opportunity: Provider Adapters

With the differences documented above, we can refactor schema preparation into
a **common pipeline + provider-specific adapter** pattern:

```
┌─────────────────────────────────────────────────────┐
│  Raw Design System JSON Schema (dereffed)           │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│  Common passes (provider-independent)               │
│  • Drop layout/styling props                        │
│  • Annotate fields (spaceBefore, variant, etc.)     │
│  • Inject field-level guidance                      │
│  • Strip $id, $schema, examples, default            │
│  • Add additionalProperties: false                  │
│  • Root object enforcement                          │
└──────────────────────┬──────────────────────────────┘
                       │
              ┌────────┴────────┐
              ▼                 ▼
┌──────────────────┐  ┌──────────────────┐
│  OpenAI Adapter  │  │  Claude Adapter  │
│                  │  │                  │
│  • Strip format  │  │  • Keep const ✅ │
│  • Strip min/max │  │  • Keep format   │
│    Items         │  │    (subset)      │
│  • Replace const │  │  • Strip min/max │
│    → enum disc.  │  │    (to descr.)   │
│  • Force all     │  │  • Allow optional│
│    required      │  │    (up to 24)    │
│  • Null unions   │  │  • Strip minItems│
│    for optional  │  │    / maxItems    │
└──────────────────┘  └──────────────────┘
```

### What This Unlocks

1. **Simpler schemas for Claude** — keeping `const` avoids the
   `type__<value>` discriminator workaround and the post-processing pass to
   reverse it, reducing token count and improving generation accuracy.

2. **Better validation for OpenAI** — now that OpenAI supports `minimum`,
   `maximum`, `minItems`, `maxItems`, `pattern`, and `format`, we can stop
   stripping those keywords for non-fine-tuned models and get server-side
   validation "for free."

3. **Future providers** — the adapter pattern makes adding support for
   Google Gemini, Mistral, or other providers straightforward: implement
   a new adapter that strips/transforms only what that provider doesn't
   support.

### Suggested Interface

```ts
interface SchemaAdapter {
  /** Human-readable provider name */
  name: string;

  /** Keywords to strip from the schema */
  unsupportedKeywords: readonly string[];

  /** Whether `const` is natively supported (skip discriminator rewrite) */
  supportsConst: boolean;

  /** Whether optional (non-required) fields are allowed */
  supportsOptionalFields: boolean;

  /** Max number of optional fields allowed (Infinity if unlimited) */
  maxOptionalFields: number;

  /** Max number of anyOf / union-type params */
  maxUnionTypeParams: number;

  /** Whether to force all object props into `required` array */
  forceAllRequired: boolean;

  /** Supported string format values (empty = strip all) */
  supportedStringFormats: readonly string[];

  /** Provider-specific post-processing (e.g., const→enum rewrite) */
  postProcess?: (schema: Record<string, unknown>) => Record<string, unknown>;
}
```

### Implementation Plan

1. Extract provider-independent passes from `schema.ts` into a
   `prepareSchemaCommon()` function.
2. Create `adapters/openai.ts` and `adapters/claude.ts` implementing the
   `SchemaAdapter` interface.
3. Update `prepareSchemaForProvider(schema, adapter)` to apply common
   passes + adapter-specific transforms.
4. Update the MCP server, n8n node, and pipeline to accept a provider
   parameter (default: `"openai"` for backward compatibility).
5. Add tests verifying that Claude-targeted schemas retain `const` and
   OpenAI-targeted schemas apply the discriminator rewrite.
