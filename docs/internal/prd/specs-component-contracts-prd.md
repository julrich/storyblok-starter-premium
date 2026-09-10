# PRD: Supporting Specs Component Contracts in the kickstartDS Design System

**Status:** 🔍 Evaluation — Recommendation pending decision
**Date:** 2026-08-01
**Author:** Design System / Platform
**Subject:** Evaluation of the [Specs](https://www.specsplugin.com/) component-contract standard ([DirectedEdges/specs](https://github.com/DirectedEdges/specs), Nathan Curtis) for **one-way, partial support** from `packages/design-system` — emitting conformant contracts from our existing, unchanged source of truth
**Packages inspected:** `@directededges/specs-schema@0.28.0` (CC BY 4.0), `@directededges/specs-cli@0.25.0` (MIT)
**Posture:** Support, don't converge — see §3.0. Every gap is enumerated and severity-ranked in §8.

---

## Executive Summary

**Recommendation: adopt — as a one-way emitter, gated on a five-component spike.** Estimated net new recurring cost: **€0** through Phase 3.

### The question

Nathan Curtis's [Specs](https://www.specsplugin.com/) standard defines a component contract that is a **superset of what we express today**. Our JSON Schemas describe props and nothing else. Specs additionally describes _anatomy_ (named parts), _layout_ (the nesting tree), _variants_ (per-configuration style deltas), _slot cardinality_, and _examples_ — the design system knowledge that currently lives only in TSX, SCSS, and people's heads. The question was whether to adopt it.

### The answer, and the crucial reframe

**Yes, but strictly one-way and deliberately partial.** We emit conformant Specs files _out of_ our existing, unchanged sources. Nothing reads them back in. We do not restructure schemas, flatten props, or linearise the token pipeline to raise fidelity. Where the standard cannot represent us, the spec is **silent, never wrong**.

This reframe is what makes the proposal cheap. Adoption-as-convergence would be a multi-quarter migration. Adoption-as-projection is a build script.

### Five findings that decide it

1. **The CLI's useful half is Figma-independent.** `specs transform` and `specs analyze` discover work by looking for `api.yaml` on disk — no Figma coupling, no Pro licence, no metering. We can produce specs and get cross-component API governance (`enumDiscordance`, naming drift, API surface across all 77 components) for free. _(§2.3, §2.5)_

2. **The code-generating half is a regression for us.** The `contract` transformer emits every prop optional, skips slots entirely, and cannot express nested objects or arrays. All four transformers are marked EXPERIMENTAL. Our existing `kickstartDS schema types|defaults` generation is strictly better and stays. _(§2.4)_

3. **We are already DTCG where it matters most.** `branding-tokens.json` ships W3C DTCG, and our colours use the DTCG Color Module `{ colorSpace, components }` shape — **structurally identical to Specs' `ColorObject`**. Style emission via `TokenReference` is largely a naming exercise, not a conversion. _(§6.1)_

4. **★ Anatomy — the one required field we don't have — is derivable.** 512 of 807 component tokens (63 %) encode a BEM element path (`--dsa-blog-aside__author__title--font`). The token names already describe the component's parts. The single "new authored artifact" this PRD introduces starts life as a generated draft. _(§6.4)_

5. **Only five things are genuinely unmappable, and they are all one thing.** Of 35 catalogued mismatches, 5 are S1 — and every one reduces to the same root cause: _our tokens are computed and responsive; Specs describes a single static state._ 8 parametric `*-factor` ratios, 326 `calc()` expressions, and 4 responsive breakpoint tiers have no representation in a model that allows one literal value per property. _(§6.2, §6.3, §8.6)_

### Mismatch profile

| Severity          | Count | Meaning                                                            |
| ----------------- | ----- | ------------------------------------------------------------------ |
| **S1** Unmappable | 5     | Omitted and declared. Computed + responsive tokens only            |
| **S2** Lossy      | 7     | Emitted with material information dropped                          |
| **S3** Displaced  | 13    | Fully expressible, but only under `$extensions['com.kickstartds']` |
| **S4** Mechanical | 6     | Pure transform, nothing lost                                       |
| **S5** Non-issue  | 4     | Maps cleanly, or Figma-only and never emitted                      |

Because coverage is partial by design, **every emitted spec carries a machine-readable `coverage` / `omissions` block** (§8.7). Partial support becomes a stated contract instead of an undiscovered gap.

### What we get

- One validated artifact per component replacing four files (schema + TSX + SCSS + stories) as the agent/MCP context source
- The `schema enum → BEM modifier → component token` chain converted from **convention into a build-breaking contract**
- Cross-component API governance across all 77 components — enum discordance and naming drift become visible for the first time
- A neutral interchange format that a future Figma library could plug into

### On Figma

**No Figma library exists in this repo today** — the inspection found zero integration, only four incidental mentions. Specs cannot _create_ one; it extracts from an existing library. That makes full adoption (design → spec → code) fail on its first precondition.

It is not rejected as a _destination_. §7 sets out a code-first model where the spec is the shared contract that makes design and code diffable, plus a bounded probe: **two components, one $10 plugin seat, one month** — no Figma Enterprise required. The measured diff signal-to-noise ratio decides.

### Cost and shape

|                           |                                                                                  |
| ------------------------- | -------------------------------------------------------------------------------- |
| **New packages**          | None. Two scripts inside the existing design system build                        |
| **New dependency**        | `@directededges/specs-schema` as a pinned `devDependency`, schema files vendored |
| **New authored artifact** | `{name}.anatomy.json` — seeded from the BEM-derived draft, human-reviewed        |
| **Runtime impact**        | None. Nothing ships in `dist/` consumer bundles                                  |
| **Recurring cost**        | €0 through Phase 3; €10 for one month if the Figma probe runs                    |

### Decision gate

Phase 0 is a hand-written spike over five deliberately awkward components (`button`, `section`, `faq`, `slider`, one nested-object prop). Proceed only if all five validate, **≥ 70 % of props map natively**, and the derived anatomy draft is closer to "review and correct" than "rewrite". Otherwise fall back to a private `component-contract.json` (Option C) reusing everything learned.

---

## 1. Background & Problem Statement

### 1.1 What we have today

Every one of the **77 components** in [packages/design-system/src/components/](packages/design-system/src/components) carries a consistent, machine-readable contract — but only for **props**:

| Artifact                                         | Source / Generated                           | What it captures                                                                            |
| ------------------------------------------------ | -------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `{name}.schema.json`                             | **authored**                                 | Prop names, types, enums, defaults, `required`, nested objects, arrays, `anyOf` composition |
| `{name}.schema.dereffed.json`                    | generated (`kickstartDS schema dereference`) | Same, `$ref`-resolved, feeds Storybook                                                      |
| `{Name}Props.ts`                                 | generated (`kickstartDS schema types`)       | TypeScript interface                                                                        |
| `{Name}Defaults.ts`                              | generated (`kickstartDS schema defaults`)    | `DeepPartial<Props>` default object                                                         |
| `_{name}-tokens.scss`                            | **authored**                                 | `--dsa-*` component tokens, incl. variant-scoped (`--dsa-button_primary--color`)            |
| `{name}-tokens.json`                             | generated (`customPropertyExtract.cjs`)      | Token → `[{ value, selector }]` catalog                                                     |
| `{name}.scss`                                    | **authored**                                 | BEM classes, modifier classes per enum value                                                |
| `{Name}.stories.tsx`                             | **authored**                                 | Storybook CSF, args via `getArgsShared(schema)`                                             |
| `snippets.json` → `dist/components/presets.json` | generated (`generatePresets.test.ts`)        | `{ id, group, name, code, args, screenshot }` per story                                     |
| `src/token/component-token-catalog.json`         | generated                                    | Aggregated token catalog with `valueType` classification + container-query metadata         |
| `src/token/token-graph.json`                     | generated                                    | CSS custom property reference graph                                                         |

### 1.2 The gap

The **prop API** is fully specified and mechanically verified. Everything _around_ it is not:

1. **Anatomy is invisible.** Which named elements make up a `Section`? Only `SectionComponent.tsx` and `section.scss` know. Nothing enumerates them, so nothing can reason about them — not the MCP servers, not agents, not docs, not a future Figma sync.
2. **Variant behaviour is convention, not contract.** `variant: "primary"` → `.c-button--solid` → `--dsa-button_primary--color`. That chain is real, consistent, and completely unasserted. A rename on either side silently breaks the relationship.
3. **Element-level styling is not addressable.** We know `--dsa-button--padding` exists; we do not know _which anatomy element_ it applies to.
4. **Composition rules are implicit.** `section.schema.json` expresses allowed children as an `anyOf` of `$ref`s. Slot cardinality (min/max children), which slots exist, and when a slot renders are nowhere.
5. **No cross-component API governance.** With 77 components we have no mechanism to detect that `variant`, `kind`, and `style` mean the same thing in three places, or that `size` has three different enum value sets.
6. **No design-tool bridge.** There is **no Figma integration anywhere in this repo** (verified: Figma appears only in marketing copy and as explicit out-of-scope in [docs/internal/prd/cosmos-token-graph-prd.md](docs/internal/prd/cosmos-token-graph-prd.md)). Tokens are authored directly in SCSS/JSON.

### 1.3 Why Specs is a candidate

Specs is a schema + tooling ecosystem that formalises exactly items 1–5 as a single validated artifact per component, with a published JSON Schema, TypeScript types, a CLI, and a stated goal of being _"the record engineers, agents, and pipelines build from."_ It is a **superset** of what a props schema covers, which matches how we want to grow our contract surface.

---

## 2. What Specs Actually Is — Evaluation Findings

### 2.1 Ecosystem shape

| Component                     | License       | Cost               | Notes                                                                              |
| ----------------------------- | ------------- | ------------------ | ---------------------------------------------------------------------------------- |
| `@directededges/specs-schema` | **CC BY 4.0** | free               | Types + JSON Schema. Type-only exports except `DEFAULT_CONFIG`. Zero runtime deps. |
| `@directededges/specs-cli`    | **MIT**       | free binary        | Single 190 KB bundle, no deps in `package.json`.                                   |
| Specs 2 Figma plugin          | proprietary   | $10/mo/seat        | Pro tier. Volume discounts at 5+/10+ seats.                                        |
| CLI Pro license               | proprietary   | included in $10/mo | **Metered: 50 `generate` calls/month.**                                            |

The schema is CC BY 4.0 — attribution to Nathan Curtis and a link to the repository are required when reusing or deriving from it.

### 2.2 The spec model

```
Component                       required: title, anatomy, default
├─ title            string
├─ anatomy          Record<name, { type, instanceOf?, detectedIn?, $extensions? }>
│                   type ∈ text | glyph | vector | container | slot | instance
│                          | line | ellipse | rectangle | polygon | star
├─ props            Record<name, AnyProp>
│                   AnyProp = BooleanProp | StringProp | EnumProp
│                           | NumberProp | SlotProp | ImageProp
├─ default          Variant  ← the complete baseline, every element fully described
├─ variants         Variant[]  ← deltas only; keyed by `configuration` (PropConfigurations)
│   └─ Variant { configuration?, invalid?, layout?, elements? }
│       └─ Elements: Record<name, { children, parent, instanceOf, content, styles, propConfigurations }>
│           └─ styles: 48 properties (styles.schema.json) — literal | TokenReference | PropBinding | Conditional
├─ invalidVariantCombinations  PropConfigurations[]
├─ subcomponents    Record<name, Subcomponent>   (Component minus metadata/subcomponents)
├─ instanceExamples Record<name, { title, propConfigurations }>          [Pro]
├─ slotContentExamples Record<name, SlotContent{ anatomy, elements, layout }>  [Pro]
├─ images           Record<id, ImageData>
└─ metadata         { author, lastUpdated, generator, schema, source, config }
```

Key modelling decisions:

- **The default variant is complete; variants are deltas.** Consumers merge overrides onto the default. This is the single best idea in the model and maps well onto CSS cascade thinking.
- **Style values are rich.** Any style property may be a literal, a `TokenReference` (`{ $value, $variable }`), a `PropBinding` (`{ $binding: "#/props/showLabel" }`), or a `Conditional`.
- **Props are a flat map.** `Record<string, AnyProp>` — no nesting, no object props, no array-of-object props.

### 2.3 CLI surface

| Command                                           | Purpose                                           | Requires Figma? |
| ------------------------------------------------- | ------------------------------------------------- | --------------- |
| `specs init`                                      | Scaffold `specs.config.yaml`                      | no              |
| `specs fetch`                                     | Pull file/variables/styles via Figma REST API     | **yes**         |
| `specs scan`                                      | Produce a component manifest from Figma file JSON | **yes**         |
| `specs generate`                                  | Figma JSON → spec YAML/JSON                       | **yes**         |
| `specs applyCustomTokens`                         | Rewrite token references                          | no              |
| `specs analyze [props\|styling]`                  | Aggregate reports into `_analysis/`               | **no**          |
| `specs transform [contract\|css\|react\|stories]` | Fan a spec out into code artifacts                | **no**          |

> **Critical finding.** `specs transform` and `specs analyze` are **source-agnostic**. Both discover work by scanning the output directory for subfolders containing `api.yaml`, then parse that YAML — they never touch Figma. Verified directly in the shipped bundle (`dist/specs.js`, the component-directory filters at the `TransformCommand` and `AnalyzeCommand` entry points both reduce to `existsSync(join(outputPath, name, 'api.yaml'))`).
>
> **Consequence: we can adopt the Specs _format_ without adopting the Figma _pipeline_.** If we emit conformant `api.yaml`/`variants.yaml`, the free MIT CLI's analyzers and transformers work against our design system as-is.

### 2.4 Transformer quality assessment

All four transformers are marked **EXPERIMENTAL** on the docs site. We read the `contract` transformer's implementation in full.

`specs transform contract` emits, per component:

```ts
export type DsAlertSeverity = "info" | "warning" | "error";
export interface DsAlertProps {
  severity?: DsAlertSeverity;
  dismissible?: boolean;
  icon?: string | null;
}
export const DsAlertDefaults = {
  severity: "info",
  dismissible: false,
} satisfies DsAlertProps;
```

Measured against what we already generate:

| Capability                                   | `specs transform contract`               | `kickstartDS schema types` + `defaults` |
| -------------------------------------------- | ---------------------------------------- | --------------------------------------- |
| Enum union types                             | ✅                                       | ✅                                      |
| Required props                               | ❌ — **every prop is emitted optional**  | ✅ (`label: Label` non-optional)        |
| Nested object props                          | ❌ not representable                     | ✅                                      |
| Arrays of sub-objects                        | ❌ not representable                     | ✅                                      |
| Polymorphic children (`anyOf`)               | ❌ (slot props are **skipped entirely**) | ✅                                      |
| `format` hints (`icon`, `image`, `markdown`) | ❌                                       | ✅ (drives CMS + editor UI)             |
| Defaults type                                | plain object literal                     | `DeepPartial<Props>`                    |
| Schema layering (`kickstartDS schema layer`) | ❌                                       | ✅                                      |

**Conclusion: adopting the `contract` transformer would be a strict regression.** The same applies by extension to `css` (cannot express our `var(--a, var(--b, literal))` fallback chains or `@container` scoping), `react` (would collide with our pure-component + Context-override architecture), and `stories` (we already generate schema-driven args plus screenshot presets).

### 2.5 Analyzer quality assessment

`specs analyze props` is a different story — it is genuinely useful and we have no equivalent. Its aggregate output contains:

- `summary` — total props, total components, unique prop names, type distribution
- `propNameFrequency` — every prop name ranked by occurrence, with the components using it and the types it takes
- **`enumDiscordance`** — prop names that carry _different enum value sets_ in different components
- `booleanNamingPatterns` — `is*` / `has*` / `can*` / bare counts
- `apiSurface` — per component: prop count, total enum values, slot count, boolean count
- `slots` — every slot with `anyOf`, `minItems`/`maxItems`, `nullable`

Across 77 components this is exactly the API-governance signal we lack. It requires only `api.yaml` — no Figma, no license.

`specs analyze styling` produces `styling.byComponent.json` / `styling.byToken.json`. This **overlaps heavily** with our existing `component-token-catalog.json`, `token-graph.json`, and the 29-tool Design Tokens MCP. Low incremental value.

### 2.6 Licensing gates (relevant only if a Figma path is ever pursued)

Free-tier `generate` output contains **only the default variant with raw literal values** — no variants, no token references, no named styles, no prop bindings, no invalid combinations. For a design system canon that is close to worthless.

Additionally, Figma's REST API restricts the `variables` and `styles` endpoints to **Enterprise** organisations. So the Figma ingest path requires: a Figma library (we have none) + Figma Enterprise + a Specs Pro subscription + staying under 50 generations/month.

---

## 3. Goals & Non-Goals

### 3.0 Governing posture: support, don't converge

This proposal is about **supporting** an external standard, not adopting it as an architecture. The distinction drives every decision below:

|                     |                                                                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Direction**       | **One-way only.** We write Specs files out of our sources. Nothing ever reads them back in.                                        |
| **Source of truth** | **Untouched.** JSON Schema, the SCSS token layers, and the build pipeline do not change to accommodate the standard.               |
| **Fidelity**        | **Partial is acceptable and expected.** A spec covering 70 % of a component honestly beats one covering 100 % by inventing values. |
| **Failure mode**    | **Omission beats approximation.** A silent spec is correct-but-incomplete; a guessed spec is wrong.                                |

Everything the standard cannot carry is enumerated and severity-ranked in **§8** rather than treated as a defect to design around.

### 3.1 Goals

1. Give every design system component a **single machine-readable contract** that covers anatomy, props, layout, variants, slots, and examples — not just props.
2. Keep **JSON Schema as the authoritative source of truth for props**, and **SCSS as the authoritative source of truth for tokens**. Nothing about this proposal changes how either is authored.
3. Make the **schema-enum → BEM-modifier → component-token** relationship explicit and verifiable instead of conventional.
4. Gain **cross-component API governance** (enum discordance, naming drift, API surface) as a CI signal.
5. Produce an artifact that is **useful to agents and MCP consumers** without them having to read TSX and SCSS.
6. Stay **interoperable** with a broader ecosystem rather than inventing a private format, so that a future Figma library could plug in.
7. Add **near-zero authoring burden** — everything derivable must be derived. The only new authored input is a reviewed anatomy file, itself draftable from existing token names (§6.4).
8. **Declare coverage machine-readably** so partial support is a contract, not a caveat (§8.7).

### 3.2 Non-Goals

1. **Not evolving our architecture toward the standard.** We will not restructure schemas, flatten nested props, denormalise the token layers, or abandon `calc()`-based scales to improve spec fidelity. Where the standard cannot represent us, the spec stays silent.
2. **Not bidirectional.** No import, no round-trip, no reconciliation of Specs files back into our sources.
3. **Not adopting the Figma pipeline in Phases 0–3.** `fetch`, `scan`, `generate`, the Figma plugin, and any Pro subscription are out of scope for initial adoption. A Figma library is treated as a legitimate _future destination_ rather than a permanent exclusion — see **§7**.
4. **Not replacing our type/defaults generation.** `kickstartDS schema types|defaults|layer|dereference` stay exactly as they are.
5. **Not adopting `transform contract|css|react|stories`.** Established as a regression in §2.4.
6. **Not replacing our token pipeline.** `branding-tokens.json`, `component-token-catalog.json`, `semantic-token-catalog.json`, `token-graph.json`, and the Design Tokens MCP remain canonical.
7. **Not making Specs a runtime dependency.** No Specs code should end up in `dist/` consumer bundles.
8. **Not migrating `packages/website` or the CMS schema pipeline.** Storyblok config generation is untouched.

---

## 4. Fit Analysis

### 4.1 Concept mapping

| Specs concept                                         | kickstartDS today                                | Fit                               | Notes                                                                                                                                                                              |
| ----------------------------------------------------- | ------------------------------------------------ | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`                                               | schema `title`                                   | ✅ 1:1                            |                                                                                                                                                                                    |
| `description` (metadata)                              | schema `description`                             | ✅ 1:1                            |                                                                                                                                                                                    |
| `EnumProp`                                            | `type: string` + `enum` + `default`              | ✅ 1:1                            |                                                                                                                                                                                    |
| `BooleanProp`                                         | `type: boolean` + `default`                      | ⚠️ near                           | Specs _requires_ `default`; ours frequently omits it                                                                                                                               |
| `StringProp` + `examples`                             | `type: string` + `examples`                      | ✅ 1:1                            |                                                                                                                                                                                    |
| `NumberProp`                                          | `type: number`                                   | ✅ 1:1                            |                                                                                                                                                                                    |
| `ImageProp`                                           | `format: "image"`                                | ✅ close                          |                                                                                                                                                                                    |
| `SlotProp` (`anyOf`, `minChildren`, `maxChildren`)    | `type: array` + `items.anyOf: [$ref…]`           | ⚠️ lossy                          | Specs `anyOf` takes bare component **names**; ours takes `$ref` **URIs**. Ours is an ordered array-of-children prop; Specs models a named slot. Cardinality is absent on our side. |
| **`required`**                                        | JSON Schema `required`                           | ❌ **no equivalent**              | Specs has no notion of a required prop. Must ride in `$extensions`.                                                                                                                |
| **Nested object props** (`headline: { text }`)        | very common                                      | ❌ **not representable**          | Must be flattened or dropped                                                                                                                                                       |
| **Arrays of sub-objects** (faq items, timeline items) | very common                                      | ❌ **not representable** as props | Partially expressible via `subcomponents`                                                                                                                                          |
| `format: "icon" \| "markdown" \| "uri"`               | used throughout                                  | ❌ no equivalent                  | Must ride in `$extensions['com.kickstartds']`                                                                                                                                      |
| `anatomy`                                             | implicit in TSX + BEM classes                    | 🟡 **the prize**                  | Nothing machine-readable today                                                                                                                                                     |
| `default` Variant → `elements[].styles`               | `_{name}-tokens.scss` (component-scoped)         | ⚠️ granularity mismatch           | Our tokens are component-scoped; Specs styles are element-scoped                                                                                                                   |
| `variants[]` deltas                                   | `.c-button--primary` + `--dsa-button_primary--*` | 🟡 **derivable by convention**    | The mapping is real but unasserted — this is the highest-value thing to formalise                                                                                                  |
| `layout` (flex/absolute tree)                         | SCSS + Bedrock primitives                        | ❌ poor fit                       | Figma auto-layout vocabulary; we'd emit nothing here                                                                                                                               |
| `instanceExamples`                                    | `snippets.json` / `presets.json`                 | ✅ 1:1, **ours is richer**        | We additionally carry rendered JSX `code` and a `screenshot` path                                                                                                                  |
| `slotContentExamples` / `Composition`                 | Section/Slider composition, Storyblok recipes    | 🟡 conceptual match               | Interesting for the MCP recipe layer                                                                                                                                               |
| `subcomponents`                                       | inline sub-object schemas (e.g. faq items)       | ⚠️ partial                        | Would let us model repeated item shapes properly                                                                                                                                   |
| `invalidVariantCombinations`                          | —                                                | 🟡 net-new                        | We have no way to express "`variant: ghost` + `size: large` is invalid"                                                                                                            |
| `metadata.config` / `metadata.source`                 | —                                                | ➖ N/A                            | Figma-generation provenance                                                                                                                                                        |
| `images`                                              | blurhash + asset pipeline                        | ➖ N/A                            | Different concern                                                                                                                                                                  |

### 4.2 Where the model actively fights us

1. **`ElementType` is a Figma vocabulary.** `ellipse`, `polygon`, `star`, `vector`, `line` are node kinds, not web semantics. A code-first emitter would realistically only ever use `container`, `text`, `instance`, `slot`, `glyph`. Workable, but it signals where the model's centre of gravity is.
2. **`Styles` is a computed-style snapshot, not a stylesheet.** Our styling relies on `var(--dsa-x, var(--ks-y, literal))` fallback chains, `@include container.size()` container-query scoping, and three-layer token resolution. The Specs `Styles` model resolves each element to a flat set of values and has no vocabulary for the cascade, fallbacks, container queries, relative units, or grid. It _does_ however carry token provenance in DTCG form, which maps onto our architecture better than the Figma-derived property names suggest — see **§5** for the full 46-property analysis and the proposed emission policy.
3. **Props are flat.** Roughly half our components have at least one nested object or array-of-object prop. Any props projection into Specs is therefore _lossy by construction_ — acceptable only because JSON Schema remains authoritative and the Specs props block is a _view_, not a _source_.
4. **Direction of flow is inverted.** Specs is architected design → spec → code. We are schema → code, with no design tool. Emitting code → spec is supported by the _format_ (it is explicitly platform-independent — `TokenReference` even documents Figma provenance as optional) and by the CLI's disk-based transform/analyze, but it is **not a workflow the project documents or supports**. We would own the emitter completely. See **§7** for what this means if a Figma library becomes a goal rather than a non-goal.

### 4.3 Maturity and dependency risk

- Schema is at **0.28.0** — pre-1.0. The ADR record shows repeated breaking changes: ADR-007 removed three config properties (MAJOR), ADR-054 relocated `Config` to a new schema file, ADR-056 renamed `SlotProp.minItems`/`maxItems` → `minChildren`/`maxChildren`.
- All four transformers are labelled **EXPERIMENTAL**.
- Single maintainer / single-vendor project (Directed Edges, LLC).
- Mitigation is straightforward: we consume the schema for _validation_ only, pin an exact version, and vendor a copy so a registry disappearance is not an outage.

---

## 5. Styles & Layout — What We Could Actually Map

### 5.1 Correcting a first-pass assumption

A surface reading of `Styles` suggests a Figma-shaped model of limited use to us. Direct inspection of `styles.schema.json@0.28.0` shows that is **only half true**. The _vocabulary_ is Figma-derived; the _value model_ is deliberately platform-neutral and DTCG-aligned:

- **`TokenReference` is DTCG, not Figma.** Shape is `{ $token: "DS Color.Text.Primary", $type: "color" }` — a dot-separated DTCG token path, "usable directly as DTCG alias `{DS Color.Text.Primary}`". The schema states outright that `$token` + `$type` _"are the complete platform-facing API surface; `$extensions['com.figma']` carries Figma extraction provenance only and is not required by platform consumers."_ `$type` ∈ `color | dimension | string | number | boolean | shadow | gradient | typography | effects | image`.
- **`ColorObject` implements DTCG Color Module §4.1** — `colorSpace` (incl. `oklch`, `display-p3`, `lab`) + `components[]` + optional 6-digit `hex` fallback.
- **`Shadow` field names "align with the DTCG Format Module shadow token."**
- **`Sides` uses CSS logical directions.** `start` is documented as _"Inline-start value (left in LTR, right in RTL)"_. That is a web-first decision, not a Figma one — Figma itself uses absolute left/right.

This matters because **we already emit branding tokens in W3C DTCG format** (`buildBrandingTokens.mjs`; `get_theme_schema` / `validate_theme` in the Design Tokens MCP). The token vocabulary is _already shared_. The §4.2 concern is therefore narrower than first stated: what does not survive is not _tokens_, it is _CSS mechanics_ (fallback chains, container queries, the cascade).

### 5.2 Style property mapping — all 46 properties

`Styles` has 46 properties. Every value slot accepts `literal | TokenReference | PropBinding | Conditional | null`.

**Paint, visibility, transform (9)**

| Specs             | CSS                                 | Our token layer           | Fit                                                   |
| ----------------- | ----------------------------------- | ------------------------- | ----------------------------------------------------- |
| `backgroundColor` | `background-color`                  | `--ks-background-color-*` | ✅                                                    |
| `backgroundImage` | `background-image` + `object-fit`   | —                         | ✅                                                    |
| `fillColor`       | `fill` (SVG glyphs)                 | icon tokens               | ✅                                                    |
| `textColor`       | `color`                             | `--ks-text-color-*`       | ✅                                                    |
| `opacity`         | `opacity`                           | —                         | ✅                                                    |
| `visible`         | conditional render / `display:none` | —                         | ✅ **bindable** — `{ $binding: "#/props/showLabel" }` |
| `rotation`        | `transform: rotate()`               | —                         | ✅                                                    |
| `clipContent`     | `overflow: hidden`                  | —                         | ✅                                                    |
| `locked`          | —                                   | —                         | ➖ Figma-editor concept, ignore                       |

**Border & corners (6)**

| Specs                                       | CSS                                                      | Fit                                                                                 |
| ------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `strokes`                                   | `border-color`                                           | ✅                                                                                  |
| `strokeWeight: Sides`                       | `border-block-start-width` / `border-inline-end-width` … | ✅ logical, 1:1                                                                     |
| `cornerRadius: Corners`                     | `border-radius` / logical corner longhands               | ✅                                                                                  |
| `strokeAlign` (`INSIDE`/`OUTSIDE`/`CENTER`) | no CSS equivalent                                        | ⚠️ CLI ships `rules/borderShiftInsetShadow` to approximate; we emit `INSIDE` always |
| `strokeDashPattern`                         | `border-style: dashed` (lossy)                           | ⚠️                                                                                  |
| `cornerSmoothing`                           | — ("squircle")                                           | ❌ no CSS                                                                           |

**Effects (1)**

| Specs                           | CSS                                                                   | Our token layer     | Fit            |
| ------------------------------- | --------------------------------------------------------------------- | ------------------- | -------------- |
| `effects` → `Shadow[]` + `Blur` | `box-shadow` (`inset` supported), `filter: blur()`, `backdrop-filter` | `--ks-box-shadow-*` | ✅ DTCG-shaped |

**Typography (5)**

| Specs                                                                                                           | CSS                           | Our token layer | Fit                                  |
| --------------------------------------------------------------------------------------------------------------- | ----------------------------- | --------------- | ------------------------------------ |
| `typography` (composite: `fontSize`, `fontFamily`, `fontStyle`, `fontWeight`, `lineHeight`, `letterSpacing`, …) | font longhands                | `--ks-font-*`   | ✅ composite maps to our font tokens |
| `textAlignHorizontal`                                                                                           | `text-align`                  | —               | ✅                                   |
| `textOverflow` (`CLIP`/`ELLIPSIS`)                                                                              | `text-overflow`               | —               | ✅                                   |
| `maxLines`                                                                                                      | `-webkit-line-clamp`          | —               | ✅                                   |
| `textAlignVertical`                                                                                             | `align-items` on the text box | —               | ⚠️ Figma text-frame concept          |

**Sizing (9)**

| Specs                                                                    | CSS                                      | Fit                                                                                                                     |
| ------------------------------------------------------------------------ | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `width` / `height` / `minWidth` / `minHeight` / `maxWidth` / `maxHeight` | corresponding CSS                        | ⚠️ **`NumberStyleValue` = `number \| TokenReference \| null` — px only.** No `%`, `em`, `ch`, `vw`, `clamp()`, `calc()` |
| `aspectRatio`                                                            | `aspect-ratio`                           | ✅                                                                                                                      |
| `layoutSizingHorizontal` / `layoutSizingVertical` (`FIXED`/`HUG`/`FILL`) | `width: Npx` / `fit-content` / `flex: 1` | ✅ conceptually clean                                                                                                   |

**Flex layout (9)**

| Specs                                                              | CSS                                                      | Fit                  |
| ------------------------------------------------------------------ | -------------------------------------------------------- | -------------------- |
| `layoutMode` (`NONE`/`HORIZONTAL`/`VERTICAL`)                      | `display: block` / `flex; flex-direction: row \| column` | ✅ 1:1               |
| `mainAxisAlignment` (`START`/`END`/`CENTER`/`SPACE_BETWEEN`)       | `justify-content`                                        | ✅ 1:1               |
| `crossAxisAlignment` (`START`/`END`/`CENTER`/`STRETCH`/`BASELINE`) | `align-items`                                            | ✅ 1:1               |
| `wrap` / `wrapAlignment`                                           | `flex-wrap` / `align-content`                            | ✅                   |
| `itemSpacing` (`{ horizontal, vertical }`)                         | `column-gap` / `row-gap`                                 | ✅                   |
| `padding: Sides`                                                   | `padding-inline-start` / `padding-block-end` …           | ✅ logical, 1:1      |
| `primaryAxisSizingMode`                                            | `flex-grow` / `height: auto`                             | ✅                   |
| `itemReverseZIndex`                                                | —                                                        | ❌ no CSS equivalent |

**Position (7)**

| Specs                                             | CSS                                        | Fit                         |
| ------------------------------------------------- | ------------------------------------------ | --------------------------- |
| `position` (`AUTO`/`ABSOLUTE`)                    | `position: static \| absolute`             | ✅                          |
| `top` / `bottom` / `start` / `end`                | `inset-block-start` / `inset-inline-end` … | ✅ logical                  |
| `centerHorizontalOffset` / `centerVerticalOffset` | `left:50%; translate(-50%)` idiom          | ⚠️ Figma constraint concept |

**Net: ~36 of 46 properties (78 %) map cleanly to CSS.** Four are lossy, four are Figma-only, and the sizing group is constrained to absolute px.

### 5.3 Layout

`LayoutNode` is refreshingly simple — a plain nested tree of element names:

```yaml
layout:
  - root:
      - label
      - icon:
          - glyph
```

Leaf = string, parent = `{ name: [children] }`. This is **trivially derivable from our rendered DOM** (a Storybook render + `querySelectorAll` walk, or a static JSX walk). It is the single cheapest high-value field in the whole spec, and it is the one that lets an agent understand component structure without reading TSX.

Interactive states are handled outside `Styles`, via `processing.states` in the workspace config (ADR-055): a `VariantStateEntry` maps a Figma variant prop to a semantic concept (`hover`, `disabled`, `focus`, `focus-within`) with `contract: 'omit' | 'keep'`, so browser-driven states can be excluded from generated prop interfaces. For a code-first producer this is a **declaration mechanism we can use directly** — we assert which of our states are CSS pseudo-classes rather than props.

### 5.4 What CSS has that Specs does not

This is the honest gap list, and it is where our system genuinely does not fit:

| CSS capability                                                     | Used by us                                                          | Specs equivalent                                                                                         |
| ------------------------------------------------------------------ | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Container queries** (`@include container.size(...)`)             | heavily — tracked as `responsive` in `component-token-catalog.json` | ❌ **none.** Variants are prop-driven only; there is no viewport or container axis anywhere in the model |
| **Media queries**                                                  | yes                                                                 | ❌ none                                                                                                  |
| **`var()` fallback chains** (`var(--dsa-x, var(--ks-y, literal))`) | the core of our three-layer architecture                            | ❌ `TokenReference` is a single path                                                                     |
| **Relative units** (`em`, `rem`, `%`, `ch`)                        | e.g. `--dsa-button--padding: 0.75em 1.5em`                          | ❌ px numbers only                                                                                       |
| **`clamp()` / `min()` / `max()`**                                  | fluid type & spacing                                                | ❌                                                                                                       |
| **CSS Grid**                                                       | yes                                                                 | ❌ `layoutMode` is flex-only                                                                             |
| **Pseudo-elements** (`::before`/`::after`)                         | common in our SCSS                                                  | ❌ no anatomy slot for them                                                                              |
| **Cascade, specificity, inheritance**                              | fundamental                                                         | ❌ styles are resolved per element                                                                       |
| **Transitions / animations**                                       | yes                                                                 | ❌                                                                                                       |
| **`currentColor`, `:has()`, sibling selectors**                    | some                                                                | ❌                                                                                                       |

**The correct mental model: Specs `Styles` is a _computed-style snapshot_, not a _stylesheet_.** It describes what an element resolves to, per variant, with token provenance. It does not and cannot describe how that resolution happens.

That is not a defect — it is the right model for a design tool and for a conformance diff. It is the wrong model for generating CSS, which is why the `css` transformer stays rejected (§2.4).

### 5.5 What we could emit today, from artifacts we already build

The join is more tractable than it looks, because the hard inputs already exist:

| Input we already produce                                             | Supplies                                                                                                                      |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `sass.compile()` output (already run by `customPropertyExtract.cjs`) | resolved CSS declarations grouped by selector                                                                                 |
| `{name}-tokens.json`                                                 | `--dsa-*` token → `[{ value, selector }]`                                                                                     |
| `component-token-catalog.json`                                       | `valueType` (`semantic-ref` / `component-ref` / `literal`), `referencedToken`, `responsive` flag, resolved `@container` query |
| `token-graph.json`                                                   | full `--dsa-*` → `--ks-*` → `--ks-brand-*` reference chain                                                                    |
| `{name}.anatomy.json` (Phase 2, new)                                 | **the missing join key:** BEM selector → anatomy element name                                                                 |

Emission algorithm:

```
for each compiled CSS rule:
  element = anatomyFile.selectorToElement[rule.selector]        # the one new input
  variant = anatomyFile.modifierToVariant[rule.modifierClass]   # from $extensions modifiers map
  for each declaration:
    specsKey = CSS_TO_SPECS[decl.property]                      # the §5.2 table, inverted
    if decl.value is var(--x):
      $token = tokenGraph.resolveToSemanticLayer('--x')         # pick the --ks-* layer
      value  = { $token: dtcgPath($token), $type: dtcgType(specsKey) }
    else:
      value = literal
    spec.variants[variant].elements[element].styles[specsKey] = value
```

The only genuinely new authored input is the anatomy file — and §6.4 shows even that is draftable from existing token names. Everything else is a re-projection of data we already generate, which is exactly the property we want (§11.2: derived, not authored).

### 5.6 Proposed emission policy

| Category                                                            | Policy                                  | Rationale                                                                                                             |
| ------------------------------------------------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Layout tree** (`layout`)                                          | ✅ **emit fully**                       | Cheapest, highest agent value, derivable from a DOM walk                                                              |
| **Flex layout** (9 props)                                           | ✅ **emit fully**                       | 1:1 with flexbox; skip only `itemReverseZIndex`                                                                       |
| **Paint / border / effects / typography**                           | ✅ **emit with `TokenReference`**       | DTCG paths from `token-graph.json`; this is the token provenance payload                                              |
| **Sizing**                                                          | 🟡 **emit only where absolute**         | Emit px literals and token refs; **omit** any declaration using `em`/`%`/`clamp()` rather than lying about it         |
| **Position**                                                        | 🟡 **emit `position` + logical insets** | Skip the two `center*Offset` Figma constraint props                                                                   |
| **Container-query-scoped rules**                                    | ❌ **do not emit into `Styles`**        | No representation exists. Record under `$extensions['com.kickstartds'].responsive` so nothing is silently lost        |
| **Fallback chains**                                                 | 📦 **`$extensions`**                    | Emit the resolved semantic layer as `$token`; record the full chain in `$extensions['com.kickstartds'].fallbackChain` |
| **Pseudo-elements, transitions, grid**                              | 📦 **`$extensions`**                    | Flag presence so a Figma consumer knows the spec is incomplete for that element, rather than assuming parity          |
| **`strokeAlign`, `cornerSmoothing`, `itemReverseZIndex`, `locked`** | ❌ **never emit**                       | No CSS meaning                                                                                                        |

The governing rule: **omit rather than approximate.** A missing property is honest; a wrong one poisons a conformance diff.

### 5.7 Assessment

| Pros                                                                                       | Cons                                                                                               |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Token references are DTCG — the vocabulary we already use for branding tokens              | ~22 % of style properties are unmappable or lossy                                                  |
| ~78 % of style properties map cleanly to CSS                                               | **Zero representation for responsive** — a first-class dimension of our system                     |
| `Sides`/insets are CSS-logical, so RTL survives                                            | px-only sizing collides with our deliberate `em`-relative component tokens                         |
| Layout tree is near-free to emit and immediately useful to agents                          | Requires the anatomy file (Phase 2) before any of it can be joined                                 |
| `visible` and any style value can be `PropBinding` — prop→appearance links become explicit | Resolved-snapshot model means the spec must be regenerated on every token change, or it goes stale |
| `states` config lets us declare which states are CSS pseudo-classes vs. props              | Cascade/specificity are invisible, so the spec cannot explain _why_ a value won                    |

**Recommendation for this section:** emit layout + flex + token-referenced paint/typography/effects in Phase 2; treat sizing conservatively; record everything unmappable under `$extensions['com.kickstartds']` so the gap is auditable rather than invisible.

---

## 6. Design Token Tooling — DTCG Alignment & Divergence

### 6.1 We are already DTCG — at the branding layer

`src/token/branding-tokens.json` (plus eight sibling theme files) is **already a W3C DTCG document**, validated at build time by [packages/design-system/scripts/buildBrandingTokens.mjs](packages/design-system/scripts/buildBrandingTokens.mjs) with Ajv against `branding-tokens.schema.json` (JSON Schema draft 2020-12), then compiled to CSS by `tokensToCss.mjs`.

Sections: `color`, `font`, `spacing`, `border`, `box-shadow`, `duration`, `_fontHref`.
`$type` values in use: `color`, `fontFamily`, `fontWeight`, `dimension`, `number`.

The colour representation is the **single strongest alignment in this entire evaluation**:

```jsonc
// ours — src/token/branding-tokens.json
"color": { "primary": { "$root": {
  "$type": "color",
  "$value": { "colorSpace": "srgb", "components": [0.1882, 0.3961, 0.7529] }
}}}
```

```jsonc
// Specs — styles.schema.json#/definitions/ColorObject
{
  "colorSpace": "srgb",
  "components": [0.1882, 0.3961, 0.7529],
  "hex": "#3065C0",
}
```

**Structurally identical.** Both implement DTCG Color Module §4.1. Dimensions align too: ours are DTCG `{ "value": 20, "unit": "px" }`, Specs takes a bare px `number` — the transform is an unwrap. And `TokenReference.$token` wants a DTCG dot path, which our branding tree already _is_ (`color.primary.$root`, `font.weight.semi-bold`, `font.size.copy.base`).

For the branding layer, the mapping is essentially free.

### 6.2 …but the branding layer is parametric, not enumerative

This is where it stops being free. Outside `color` and `font.family` / `font.weight`, our branding tokens are **generator inputs, not design values**:

| Token                                                         | `$type`     | `$value` | What it actually is             |
| ------------------------------------------------------------- | ----------- | -------- | ------------------------------- |
| `spacing.factor`                                              | `number`    | `1.5`    | modular-scale ratio             |
| `spacing.shrink-factor` / `grow-factor` / `bp-factor`         | `number`    | `1.5`    | scale direction ratios          |
| `font.size.copy.base`                                         | `dimension` | `16px`   | scale origin                    |
| `font.size.copy.shrink-factor` / `grow-factor` / `bp-factor`  | `number`    | `1.5`    | scale ratios (×4 font families) |
| `border.radius-factor`                                        | `number`    | `1.5`    |                                 |
| `box-shadow.blur-factor` / `opacity-factor` / `spread-factor` | `number`    | `1.5`    |                                 |
| `duration.factor`                                             | `number`    | `1.5`    |                                 |

**There is no `spacing.m` anywhere in the branding tokens.** The entire spacing, type, shadow, radius, and duration scales are _generated_ from ratios. A design tool cannot consume `spacing.factor = 1.5` — Figma has no notion of a modular scale, and Specs `TokenReference` assumes you point at a named, resolvable value.

This is the architectural crux of the whole evaluation: **our theming power comes from parameterisation, and parameterisation is precisely what a static token reference cannot express.**

### 6.3 The semantic layer is computed by the browser, not by a build step

The `--ks-*` layer is not a set of values. It is a set of **CSS `calc()` expressions over custom properties**, resolved by the browser at render time:

```scss
// src/token/spacing-token.scss
--ks-spacing-m-base: calc(
  (var(--ks-brand-spacing-factor) - 0.5) * var(--ks-font-size-copy-m)
);
--ks-spacing-s-base: calc(
  var(--ks-spacing-m-base) * var(--ks-scale-spacing-shrink-factor)
);

// src/token/font-size-token.scss
--ks-font-size-copy-m: calc(
  var(--ks-font-size-copy-m-base) * var(--ks-font-size-copy-m-bp-factor, 1)
);
```

Measured `calc()` occurrences in `src/token/*.scss`:

| File                    | `calc()` count |
| ----------------------- | -------------- |
| `font-size-token.scss`  | 198            |
| `spacing-token.scss`    | 51             |
| `font-token.scss`       | 36             |
| `scaling-token.scss`    | 18             |
| `box-shadow-token.scss` | 16             |
| `transition-token.scss` | 4              |
| `border-token.scss`     | 3              |
| **Total**               | **326**        |

Three consequences, each significant:

1. **Nothing is statically resolvable.** Extracting a numeric value for `--ks-spacing-m` requires a CSS engine with a viewport, not a JSON transform. (Note: there is **zero** `clamp()` / `min()` / `max()` usage — the fluidity comes entirely from `calc()` + breakpoints.)
2. **Every semantic token has five values, not one.** `font-size-token.scss` and `spacing-token.scss` both redefine their tokens inside four `@media (min-width: …)` tiers — `36em`, `48em`, `62em`, `75em`. A `TokenReference` to `ks.spacing.m` points at something with no single value.
3. **Font tokens are CSS `font` shorthands**, not scalars:
   ```scss
   --ks-font-copy-m: var(--ks-font-size-copy-m) / var(--ks-line-height-copy-m)
     var(--ks-font-family-copy);
   ```
   Specs `Typography` is a composite object with discrete `fontSize` / `lineHeight` / `fontFamily` fields, so this must be **decomposed** — and each decomposed part is itself a `calc()` chain.

The generated `semantic-token-catalog.json` confirms the shape: 16 categories, entries of `{ value, valueType }` where `valueType` is overwhelmingly `"reference"` — e.g. `--ks-background-color-accent` → `var(--ks-background-color-accent-inverted-base)`. It is a reference index, not a value table.

Selectors also carry a **theming axis Specs has no vocabulary for**: `:root, [ks-inverted="false"], [ks-inverted="true"]` and `:root, [ks-theme]`. The branding schema formalises this as `colorPair { $root, inverted }`.

### 6.4 The component layer is the good news — and it encodes anatomy

`component-token-catalog.json` covers **50 components with 807 tokens**:

| `valueType`                           | Count | Share |
| ------------------------------------- | ----- | ----- |
| `semantic-ref` (→ a `--ks-*` token)   | 510   | 63 %  |
| `literal`                             | 197   | 24 %  |
| `component-ref` (→ another `--dsa-*`) | 100   | 12 %  |

```jsonc
"blog-aside": {
  "displayName": "Blog Aside",
  "selector": ".dsa-blog-aside",
  "tokens": {
    "--dsa-blog-aside__author__title--font": {
      "defaultValue": "var(--ks-font-copy-m)",
      "valueType": "semantic-ref",
      "referencedToken": "--ks-font-copy-m"
    },
    "--dsa-blog-aside__author__image--flex-basis": {
      "defaultValue": "120px", "valueType": "literal", "referencedToken": null
    }
  }
}
```

> **★ Finding: our component token names already encode anatomy.**
> **512 of 807 tokens (63 %) contain a BEM element path** — `--dsa-{component}__{element}__{subElement}--{property}`. `--dsa-blog-aside__author__title--font` states that `blog-aside` contains an `author` element containing a `title` element whose `font` is set.
>
> A first-draft `anatomy` tree and a first-draft element→style mapping are therefore **mechanically derivable from token names alone**, for 50 components, today. This materially de-risks Phase 2 — the anatomy file becomes a _review-and-correct_ task rather than an _author-from-scratch_ one.

`token-graph.json` provides the resolution machinery: a Graphology graph with **3,091 nodes / 5,179 edges** (`full`) and 1,219 / 1,738 (`design-system`), edges shaped `{ source, target, attributes: { selector, purpose: "reference" } }`. This is exactly what is needed to walk `--dsa-blog-aside__author__title--font` → `--ks-font-copy-m` → its constituents and pick the layer to cite as `$token`.

`extractComponentTokenCatalog.cjs` also already resolves container queries — `@include container.size("≥", 640px, "hero")` → `@container hero (min-width: 640px)` — though **zero responsive entries currently appear** in the emitted catalog, so this is latent capability rather than active load.

### 6.5 DTCG alignment scorecard

| Layer                               | DTCG today?                         | Maps to Specs `TokenReference`?    | Verdict                     |
| ----------------------------------- | ----------------------------------- | ---------------------------------- | --------------------------- |
| **Branding — colours**              | ✅ full DTCG, Color Module §4.1     | ✅ structurally identical          | **Free**                    |
| **Branding — font family / weight** | ✅ DTCG `fontFamily` / `fontWeight` | ✅                                 | **Free**                    |
| **Branding — dimensions**           | ✅ DTCG `{value, unit}`             | ✅ unwrap to px number             | **Mechanical**              |
| **Branding — `*-factor` ratios**    | ✅ DTCG `number`                    | ❌ no concept of a scale ratio     | **Unmappable — never emit** |
| **Semantic (`--ks-*`)**             | ❌ SCSS `calc()` chains             | 🟡 **reference only, never value** | **Reference-only**          |
| **Semantic — responsive tiers**     | ❌ 4 `@media` redefinitions         | ❌ no viewport axis                | **Unmappable**              |
| **Semantic — font shorthand**       | ❌ CSS shorthand                    | 🟡 decompose to `Typography`       | **Lossy**                   |
| **Component (`--dsa-*`)**           | ❌ SCSS custom properties           | ✅ via `referencedToken` + graph   | **Good**                    |
| **Component — BEM element paths**   | n/a                                 | ✅ **yields draft anatomy**        | **Bonus**                   |

### 6.6 Consequent emission policy for tokens

1. **Never emit resolved numeric values for anything downstream of a factor.** Emit `TokenReference` only. A `$token` that names the right token is true; a number computed by guessing a viewport is false.
2. **Cite the semantic (`--ks-*`) layer** as `$token`, resolved via `token-graph.json`. It is the most portable and the layer our themes actually vary.
3. **Emit branding colours as literal `ColorObject`** where a component token bottoms out in a colour — this is the one place a real value is both available and stable.
4. **Never emit `*-factor` tokens.** They are build inputs with no design-tool meaning.
5. **Emit the base breakpoint tier only**, and declare that in `metadata` so no consumer infers responsive parity.
6. **Decompose font shorthands** into `Typography.fontSize` / `lineHeight` / `fontFamily`, each as a `TokenReference`.
7. **Derive draft anatomy from BEM token names**, then have a human confirm it.

---

## 7. The Figma Library Question

### 7.1 The core reframing: Specs cannot _create_ a Figma library

Every Specs pipeline runs **Figma → spec**. There is no `spec → Figma` writer in the schema, the CLI, or the plugin, and none is on the roadmap. So "use Specs to get to a Figma library" is not directly possible. What Specs can do is act as the **shared contract on both ends of the bridge**.

Three possible operating models:

| Model                                        | Flow                                                                                                                                | Verdict                                                                    |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **1 — Figma-first** (Specs' intended design) | Design authors library → `specs generate` → code generated/checked                                                                  | ❌ Requires code to cede prop authority to Figma. Contradicts §3.1 goal 2. |
| **2 — Code-first, Figma as target**          | We emit spec-from-code → spec is the **build brief** for design → design builds library → `specs generate` → **diff the two specs** | ✅ **The only model compatible with our goals**                            |
| **3 — Parallel, unreconciled**               | Code and Figma evolve independently                                                                                                 | ➖ What we (and most design systems) have today                            |

**Model 2 is the strongest single argument for adopting the Specs format now, before any Figma work begins.** It converts a future Figma library from an unverifiable parallel artifact into a **mechanically diffable** one. Without a shared format, "does Figma match code?" is answered by eyeballing. With one, it is a CI job.

### 7.2 What actually makes this hard

**1. The design work is the cost, and Specs does not reduce it.**
77 components have to be drawn, variant-ed, tokenised, and maintained in Figma by someone. Specs reduces the _verification_ cost, not the _authoring_ cost. Nothing here is a shortcut to having a library.

**2. Structural impedance: Figma variants vs. our schemas.**
Figma models variation as a cartesian product of variant props on a component set. Our schemas model four different things:

| Our pattern                                                         | Figma representation                              | Difficulty                                                                                                |
| ------------------------------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Scalar enum (`variant`, `size`)                                     | variant property                                  | ✅ clean                                                                                                  |
| Boolean (`disabled`)                                                | boolean variant property                          | ✅ clean                                                                                                  |
| Nested object (`headline: { text }`)                                | nested instance + code-only props                 | ⚠️ awkward; `FigmaCodeOnlySource` exists for exactly this (`{ kind: 'codeOnlyProp', layer, instanceOf }`) |
| Array of sub-objects (faq items, timeline items)                    | N hand-placed instances — **Figma has no repeat** | ❌ structurally unlike the code                                                                           |
| Polymorphic children (`section.components` = `anyOf` of 15 `$ref`s) | instance-swap slot with 15 candidates             | ❌ the extracted spec will not resemble the code-derived one                                              |

The last two are where a faithful Figma library gets expensive **and** where the two specs will diverge for legitimate reasons — meaning the diff needs a documented allowlist, not just a match/mismatch verdict.

**3. Variant explosion.**
`button` alone: 3 variants × 3 sizes × disabled × ~4 interaction states = **72 Figma variants** for a component that is roughly 40 lines of SCSS. Specs' `processing.states` config (ADR-055) exists precisely to tame this — it classifies a Figma variant prop as browser-driven (`contract: 'omit'`) so it never reaches a props interface. Genuinely useful, but it only works if the **Figma library is built to that naming convention from day one**. Retrofitting it is painful.

**4. Responsive has no representation anywhere on the bridge.**
We rely on container queries; Figma has no container queries; Specs `Styles` has no viewport or container axis at all (§5.4). An entire dimension of our design system simply cannot cross. Any Figma library will describe **one breakpoint**, and the spec will not record which one. This must be stated explicitly or it will be mistaken for parity.

**5. Token naming must be made bijective.**
Ours: `--ks-background-color-primary-interactive`, three layers, fallback chains. DTCG/Specs: `DS Color.Background.Primary.Interactive`. A deterministic, _reversible_ naming convention has to be designed, documented, and enforced on both sides. The CLI's `applyCustomTokens` command exists for exactly this rewrite step, which helps — but the convention itself is ours to design.

**6. Token _values_ do not all survive the trip.**
Figma Variables have no fallback chains, no `em`-relative sizing, no `calc()`/`clamp()`. `--dsa-button--padding: 0.75em 1.5em` is em-relative _by design_ — in Figma it must be resolved to px per size variant. Pushing that back into code would be a regression. **The token bridge is one-way in practice: code → Figma.**

**7. Licensing and Figma plan gates — with one important escape hatch.**

| Path                         | Figma plan required                                                         | Specs cost  | Notes                                                                                                        |
| ---------------------------- | --------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------ |
| **CLI `fetch` + `generate`** | **Enterprise** (REST `variables` + `styles` endpoints are Enterprise-gated) | $10/mo/seat | Metered at **50 `generate` calls/month** — one full 77-component regeneration exceeds a month's quota        |
| **Figma plugin**             | **any plan** — uses the Plugin API, not REST                                | $10/mo/seat | ⭐ **The cheap pilot route.** Sidesteps the Enterprise requirement entirely                                  |
| **Free tier (either)**       | any                                                                         | €0          | Default variant + raw literal values only. No variants, no token refs, no bindings. **Unusable as a canon.** |

The plugin path is the material finding here: a **single $10/month seat on our existing Figma plan** is enough to pilot extraction from a handful of components. That is a trivial cost to de-risk the whole question.

**8. Authority conflict must be settled before the first diff, not after.**
Once two producers exist, something breaks ties. Our position has to be declared up front: **JSON Schema wins for props, unconditionally. Figma is advisory for visual style and anatomy.** Otherwise the first red diff becomes a governance argument instead of a bug report.

**9. Diff semantics are not free.**
Spec-from-code and spec-from-Figma will use different `anatomy` element _names_ — ours derived from BEM classes, Figma's from layer names. A naive diff would be ~100 % noise. Normalisation is required, and the schema provides the hooks: `AnatomyElement.$extensions['com.figma'].originalName` and `AnatomyElement.detectedIn`. Building the normalisation + name-mapping layer is a real, non-trivial piece of work that must be budgeted separately from the emitter.

**10. Single-breakpoint, single-theme.**
We ship five theme variations (DS Agency, Business, NGO, Google, Telekom) compiled by Style Dictionary. Figma Variable _modes_ can model this, but only if the library is built mode-aware from the start, and only for values that are variables (not for structural differences).

### 7.3 Assessment

| Pros                                                                                         | Cons                                                                                     |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Turns a Figma library from unverifiable into **diffable** — the core value                   | The library itself is a multi-month design project Specs does not help with              |
| Our emitted spec becomes an unambiguous **build brief**: exact props, enums, anatomy, tokens | Two of our four prop patterns (arrays, polymorphic children) have no clean Figma form    |
| DTCG token vocabulary is shared with our existing branding tokens — no new token model       | Token bridge is one-way; `em`/`clamp()`/fallback chains cannot round-trip                |
| Plugin path avoids the Figma Enterprise gate at $10/mo/seat — cheap to pilot                 | CLI path needs Enterprise **and** is metered at 50 generations/month                     |
| `processing.states` gives a principled way to keep CSS pseudo-states out of the props API    | Only works if the library is built to that convention from day one                       |
| Drift detection becomes a CI signal rather than a review ritual                              | Responsive and multi-theme are unrepresentable — parity claims must be carefully bounded |
| Nothing in Phases 0–3 has to change to enable this later                                     | Diff normalisation layer is meaningful additional engineering                            |

### 7.4 Preconditions — what would have to be true

Before committing to a Figma track, all of these must hold:

1. ✅ Phases 0–2 shipped, so a code-derived spec with anatomy and styles actually exists to diff against.
2. ⬜ A **design owner** is allocated. This is not a platform-team deliverable.
3. ⬜ Component scope agreed — realistically the **top 20 by content usage**, not all 77 (measure with `analyze_content_patterns` from the Storyblok MCP).
4. ⬜ A bijective token naming convention is designed and documented (`--ks-*` ↔ DTCG dot path).
5. ⬜ A Figma authoring convention is documented **before** drawing starts: state variant prop naming (for `processing.states`), layer naming (for anatomy normalisation), variable modes for themes.
6. ⬜ Authority policy ratified: JSON Schema owns props; Figma advisory for visuals.
7. ⬜ Explicit written acknowledgement that responsive behaviour and four of five themes are **out of scope for the bridge**.

### 7.5 Recommended entry point

**Do not commit to the Figma track. Buy one seat and run a two-component probe.**

1. Take `button` and `section` — one trivial, one compositional.
2. Have a designer build them in Figma to a documented convention.
3. Extract with the **plugin** (no Enterprise needed, $10/mo, one seat).
4. Diff the extracted spec against our Phase 2 code-derived spec.
5. Measure: how much of the diff is real drift, how much is naming noise, how much is structural impedance.

Total cost: one month of one Figma seat plus a few days of design time. That single number — the **signal-to-noise ratio of the diff** — determines whether a Figma library via Specs is a viable programme or a research curiosity. It is by far the cheapest way to answer the question.

---

## 8. Unsupported Features — Severity-Ranked Mismatch Register

### 8.1 Framing: support, don't converge

The purpose of this register is **not** to list things we should change about our design system. It is to enumerate, honestly and exhaustively, where our existing source of truth **cannot be projected onto the Specs standard**, so that the emitter is built with known, declared blind spots rather than discovering them as bugs.

The operating assumptions are:

- **One-way.** We write Specs files out of our sources. Nothing reads Specs files back in.
- **Source of truth untouched.** JSON Schema, SCSS tokens, and the build pipeline do not change to accommodate the standard.
- **Partial is acceptable.** A spec that covers 70 % of a component honestly is more valuable than one that covers 100 % by inventing values.
- **Omission beats approximation.** A silent spec is correct-but-incomplete; a guessed spec is wrong.

### 8.2 Severity scale

| Severity | Name           | Meaning for the emitted spec                                                                                                   |
| -------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **S1**   | **Unmappable** | No honest projection exists. Field is omitted and the omission is declared in `metadata`. The spec is _silent_, never _wrong_. |
| **S2**   | **Lossy**      | We can emit something, but material information is dropped. Consumers must not assume fidelity.                                |
| **S3**   | **Displaced**  | Fully expressible, but only under `$extensions['com.kickstartds']`. Standard Specs consumers will not see it.                  |
| **S4**   | **Mechanical** | A pure transform handles it. No information lost.                                                                              |
| **S5**   | **Non-issue**  | Maps cleanly, or is a Figma-only concept we simply never emit.                                                                 |

### 8.3 Register A — Prop model

| #   | Our feature                                            | Specs equivalent                              | Sev    | Emission strategy                                                                                            |
| --- | ------------------------------------------------------ | --------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------ |
| P1  | Nested object props (`headline: { text }`)             | none — `Props` is a flat map                  | **S2** | Flatten to dot-named scalar props (`headline.text`); record the original object shape in `$extensions.shape` |
| P2  | Arrays of sub-objects (faq items, timeline items)      | none — no array prop kind                     | **S2** | One `SlotProp` per array; item shape under `subcomponents`. Ordering and per-item props are lost             |
| P3  | Polymorphic children (`anyOf` of up to 15 `$ref` URIs) | `SlotProp.anyOf: string[]`                    | **S3** | Emit bare component names; preserve authoritative `$ref` URIs in `$extensions.refs`                          |
| P4  | `required: ["label"]`                                  | **none** — all Specs props are optional       | **S3** | `$extensions.required: true` per prop                                                                        |
| P5  | `format: "icon"` / `"markdown"` / `"uri"`              | only `ImageProp` covers `image`               | **S3** | `format: image` → `ImageProp`; the rest to `$extensions.format`                                              |
| P6  | Cross-package `$ref` into kickstartDS core schemas     | none                                          | **S3** | `$extensions.extends`                                                                                        |
| P7  | `additionalProperties: false` on our schemas           | none                                          | **S4** | Informational; no Specs carrier needed                                                                       |
| P8  | A prop literally named `type` (e.g. `button.type`)     | `AnyProp.type` is the kind discriminator      | **S5** | **Non-issue** — props are a keyed map, so `props.type.type = "string"` is legal                              |
| P9  | Missing `default` on boolean props                     | `BooleanProp.default` is **required**         | **S4** | Synthesise `false`; log so the schema can be tightened later if desired                                      |
| P10 | `examples`                                             | `StringProp.examples` / `NumberProp.examples` | **S5** | 1:1                                                                                                          |
| P11 | `title` / `description` per property                   | not carried on `AnyProp`                      | **S3** | `$extensions.title` / `.description` — note this is our CMS/editor-facing copy                               |

### 8.4 Register B — Token & style model

| #   | Our feature                                                                                             | Specs equivalent                                                 | Sev                                                              | Emission strategy                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| T1  | **Parametric branding tokens** — 8 `*-factor` ratios driving generated scales (§6.2)                    | none; no concept of a modular scale                              | **S1**                                                           | **Never emit.** They are build inputs, not design values                                                |
| T2  | **`calc()`-computed semantic tokens** — 326 occurrences (§6.3)                                          | style values must be literal or `TokenReference`                 | **S1** for values / **S4** for references                        | Emit `TokenReference` only. Never emit a resolved number                                                |
| T3  | **Breakpoint-redefined tokens** — 4 `@media` tiers (`36/48/62/75em`); every semantic token has 5 values | no viewport or container axis anywhere in the model              | **S1**                                                           | Emit the base tier only; declare the limitation in `metadata`                                           |
| T4  | `em`-relative component values (`--dsa-button--padding: 0.75em 1.5em`)                                  | `NumberStyleValue` = `number \| TokenReference \| null`, px only | **S2**                                                           | Omit the numeric; keep the raw declaration in `$extensions.raw`                                         |
| T5  | CSS `font` **shorthand** tokens (`size / line-height family`)                                           | `Typography` composite with discrete fields                      | **S2**                                                           | Decompose into `fontSize` / `lineHeight` / `fontFamily` — each itself a `TokenReference`, never a value |
| T6  | `var()` fallback chains (`var(--dsa-x, var(--ks-y, literal))`)                                          | `TokenReference` is a single `$token` path                       | **S3**                                                           | Cite the resolved semantic layer; full chain to `$extensions.fallbackChain`                             |
| T7  | **Inversion axis** — `[ks-inverted="true"]` + `colorPair { $root, inverted }`                           | none                                                             | **S2**                                                           | Emit `$root` only; record the inverted counterpart in `$extensions.inverted`                            |
| T8  | **9 branding themes** (`branding-tokens{,-blizzard,…}.json`)                                            | one spec describes one theme                                     | **S3**                                                           | Emit the default theme; optionally one spec set per theme later                                         |
| T9  | Container queries (`@include container.size(…)`)                                                        | none                                                             | **S1** (currently **S5** in practice — 0 entries in the catalog) | `$extensions.responsive`; extractor already resolves the query strings                                  |
| T10 | Media queries in component SCSS                                                                         | none                                                             | **S1**                                                           | `$extensions.responsive`                                                                                |
| T11 | CSS Grid                                                                                                | `layoutMode` ∈ `NONE\|HORIZONTAL\|VERTICAL` — flex only          | **S2**                                                           | Emit `layoutMode: NONE` + `$extensions.display: "grid"`; grid tracks are lost                           |
| T12 | Transitions / animations (`transition-token.scss`)                                                      | no field                                                         | **S3**                                                           | `$extensions.transition`                                                                                |
| T13 | Pseudo-elements `::before` / `::after`                                                                  | no anatomy element kind for them                                 | **S2**                                                           | Either synthesise a pseudo anatomy element or omit and flag — decide in Phase 0                         |
| T14 | Cascade / specificity / inheritance                                                                     | resolved per-element snapshot                                    | **S3**                                                           | Inherent to the model; document rather than work around                                                 |
| T15 | `strokeAlign`, `cornerSmoothing`, `itemReverseZIndex`, `locked`                                         | Figma-only style properties                                      | **S5**                                                           | Never emit                                                                                              |
| T16 | **27 of 77 components have no component-token file** (catalog covers 50)                                | `Component.default` is **required**                              | **S3**                                                           | Emit a minimal `default` carrying anatomy and layout but no `styles`                                    |
| T17 | `--dsa-*` → `--dsa-*` indirection (100 `component-ref` tokens)                                          | `TokenReference` has no notion of a component-scoped token layer | **S3**                                                           | Resolve through `token-graph.json` to the semantic layer; note the hop in `$extensions`                 |

### 8.5 Register C — Structure & runtime

| #   | Our feature                                                                          | Specs equivalent                                   | Sev    | Emission strategy                                                                                        |
| --- | ------------------------------------------------------------------------------------ | -------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------- |
| C1  | Client behaviour (`*.client.ts`, `Section.client.js`, `spotlight.client.js`)         | none — Specs is explicitly "no logic"              | **S3** | `$extensions.clientBehavior` (file reference only)                                                       |
| C2  | Context-overridable components (`PictureContext.Provider`)                           | no concept of runtime substitution                 | **S3** | `$extensions.overridable`                                                                                |
| C3  | `ElementType` is a Figma vocabulary (`ellipse`, `polygon`, `star`, `vector`, `line`) | —                                                  | **S4** | We use only `container`, `text`, `instance`, `slot`, `glyph`                                             |
| C4  | Storybook presets carry rendered JSX `code` + `screenshot`                           | `InstanceExample` = `title` + `propConfigurations` | **S4** | Map `args` → `propConfigurations`; JSX and screenshot path to `$extensions`                              |
| C5  | `instanceExamples` / `slotContentExamples` are Pro-tier                              | —                                                  | **S5** | **Non-issue** — Pro gates _extraction from Figma_, not the schema. We author these, so they cost nothing |
| C6  | Schema layering (`kickstartDS schema layer`)                                         | no concept                                         | **S3** | Emit from the post-layer dereferenced schema; record the layer source in `$extensions`                   |
| C7  | `Component.required = [title, anatomy, default]`                                     | —                                                  | **S4** | Anatomy is draftable from BEM token names for the 50 catalogued components (§6.4)                        |
| C8  | Undiscriminated `anyOf` in our schemas (no `component` key until Storyblok adds it)  | Specs slots list candidate names                   | **S4** | Derive names from the `$ref` URI basenames                                                               |

### 8.6 Rollup

| Severity            | Count | Items                                                       |
| ------------------- | ----- | ----------------------------------------------------------- |
| **S1 — Unmappable** | 5     | T1, T2 (values), T3, T9, T10                                |
| **S2 — Lossy**      | 7     | P1, P2, T4, T5, T7, T11, T13                                |
| **S3 — Displaced**  | 13    | P3, P4, P5, P6, P11, T6, T8, T12, T14, T16, T17, C1, C2, C6 |
| **S4 — Mechanical** | 6     | P7, P9, C3, C4, C7, C8                                      |
| **S5 — Non-issue**  | 4     | P8, P10, T15, C5                                            |

**Reading of this table.** Only five items are genuinely unmappable — and **all five are the same underlying issue: our tokens are computed and responsive, and Specs describes a single static state.** Everything else is either a mechanical transform or fits under `$extensions`.

That is a good result for a one-way, partial-support goal. It means the emitted spec can be **structurally complete** (title, anatomy, props, layout, variants, examples, token _references_) while being **explicitly silent on computed values and responsive behaviour**.

### 8.7 Declaring coverage machine-readably

Because support is partial by design, every emitted spec should declare its own coverage rather than leaving consumers to infer it:

```yaml
metadata:
  generator: { name: "kickstartds-specs-emit", version: "0.1.0" }
  $extensions:
    com.kickstartds:
      coverage:
        props: full # from JSON Schema
        anatomy: draft # derived from BEM token names, unreviewed
        layout: full
        styleTokens: references-only
        styleValues: omitted # T1, T2 — calc()-computed
        responsive: omitted # T3, T9, T10 — no model support
        themes: default-only # T8 — 1 of 9
        inverted: omitted # T7
        instanceExamples: full
      omissions: [T1, T2, T3, T9, T10]
```

This single block turns "partial support" from a caveat buried in a PRD into a contract that tooling and future diffs can rely on.

---

## 9. Options Considered

### Option A — Full adoption (Figma plugin + CLI generate + transformers)

Buy Pro seats, build a Figma library mirroring 77 components, generate specs from Figma, consume transformer output.

- ✅ The intended, supported workflow; genuine design↔code sync
- ❌ Requires a Figma library that does not exist (months of design work)
- ❌ Requires Figma Enterprise for token/style references
- ❌ Recurring cost + 50 generations/month meter
- ❌ Transformers are a regression against our generated types
- ❌ Inverts our authoring model: Figma would become the source of truth for props

**Verdict: reject _as an entry point_.** It fails on its very first precondition — a Figma library that does not exist. It is not, however, rejected as a _destination_: **§7** sets out how a code-first spec makes a future Figma library verifiable, and defines a €10 two-component probe to test it.

### Option B — Adopt the schema as an emitted projection; skip the pipeline ✅

Emit a Specs-conformant `api.yaml` (+ `variants.yaml`) per component from artifacts we already own — JSON Schema, token catalog, SCSS modifier classes, `snippets.json` — plus a small hand-authored `anatomy` block. Validate with Ajv against `component.schema.json`. Run `specs analyze props` in CI. Never run `generate` or `transform`.

- ✅ JSON Schema stays authoritative for props (the stated requirement)
- ✅ Zero cost, zero Figma, MIT CLI only
- ✅ Unlocks `analyze props` API governance immediately
- ✅ Produces a real, interoperable component canon for MCP/agent consumption
- ✅ Forward-compatible: if a Figma library ever appears, the ingest path is already the same format
- ⚠️ We own the emitter (~1 script, comparable in size to `extractComponentTokenCatalog.cjs`)
- ⚠️ `anatomy` must be authored per component — the real cost
- ⚠️ CC BY 4.0 attribution obligation on any derived/extended schema we publish
- ⚠️ Pre-1.0 upstream churn

**Verdict: recommend.**

### Option C — Roll our own `component-contract.json`

Design a private contract format that references the JSON Schema and adds anatomy, variant→class→token bindings, slot cardinality, and examples.

- ✅ Perfect fit; can model token fallback chains, container queries, `required`, nested props
- ✅ No CC BY 4.0 obligation, no upstream churn, no vendor
- ❌ No ecosystem, no interop, no free analyzers, no Figma on-ramp ever
- ❌ We design, document, version, and evangelise a standard — that is a product, not a feature

**Verdict: viable fallback if the Phase 0 spike shows the Specs model cannot carry enough of our semantics. Explicitly keep on the table.**

### Option D — Do nothing

- ✅ Zero cost
- ❌ All six gaps in §1.2 persist and worsen as the component count grows

**Verdict: reject.**

---

## 10. Recommendation

> **Adopt Option B, gated on a Phase 0 spike — as one-way, partial support, not as convergence.**
>
> Treat the Specs schema as an **additional emitted projection** of the design system, never as a source of truth and never as a target our architecture moves toward. JSON Schema continues to define props; the SCSS token layers continue to define styling. The Specs artifact adds anatomy, layout, variant deltas, token-_referenced_ styles, slot cardinality, and examples — the things we cannot express today — and buys us the free `analyze props` governance layer.
>
> Explicitly **do not** adopt `specs generate` or any of the four transformers. Explicitly **do not** restructure schemas, flatten props, or linearise the token pipeline to raise fidelity.
>
> On styles and layout, follow the **§5.6** and **§6.6** emission policies: emit the ~78 % of `Styles` that maps cleanly, always as DTCG `$token` references resolved from our existing token graph, **never as computed values**; **omit rather than approximate** the rest.
>
> Accept the **§8 mismatch register** as the design brief for the emitter. Only five items (T1, T2, T3, T9, T10) are genuinely unmappable, and all five reduce to one root cause: _our tokens are computed and responsive, and Specs describes a single static state._ Every emitted spec carries the **§8.7 `coverage` / `omissions` block** so that partial support is a stated contract rather than an undiscovered gap.
>
> On Figma, adopt **Model 2 from §7.1** — code-first, Figma as a _target_, the spec as the shared contract that makes the two diffable. Do not commit to a library. Run the bounded Phase 4 probe (two components, one $10 plugin seat, no Figma Enterprise required) and let the measured diff signal-to-noise ratio decide.
>
> If the Phase 0 spike shows that fewer than ~70 % of props can be represented without material semantic loss, fall back to **Option C**.

---

## 11. Proposed Architecture

### 11.1 Where the spec comes from

```
                SOURCES (untouched)                         EMITTED (one-way)
  ┌──────────────────────────────────┐        ┌────────────────────────────────┐
  │ {name}.schema.json               │───────▶│ props:        (EnumProp,       │
  │   props, enums, defaults,        │        │                BooleanProp,    │
  │   required, formats, anyOf       │        │                SlotProp, …)    │
  └──────────────────────────────────┘        │                                │
  ┌──────────────────────────────────┐        │ anatomy:      element map      │
  │ {name}.anatomy.json   ← NEW      │───────▶│   draft from BEM token names,  │
  │   reviewed draft, see §6.4       │        │   then human-reviewed (§6.4)   │
  └──────────────────────────────────┘        │                                │
  ┌──────────────────────────────────┐        │ default:      baseline variant │
  │ {name}-tokens.json               │───────▶│ variants[]:   deltas keyed by  │
  │ component-token-catalog.json     │        │               configuration    │
  │ token-graph.json  (3091n/5179e)  │        │                                │
  │ branding-tokens.json  (DTCG)     │        │ styles:       TokenReference   │
  └──────────────────────────────────┘        │   { $token, $type } only —     │
  ┌──────────────────────────────────┐        │   never computed values (§6.6) │
  │ snippets.json  (Storybook)       │───────▶│                                │
  └──────────────────────────────────┘        │ instanceExamples:              │
                                              │               from stories     │
     ✖ never read back into sources           │                                │
     ✖ never emit computed values             │ $extensions['com.kickstartds'] │
     ✖ never emit *-factor tokens             │   required, formats, refs,     │
                                              │   fallbackChain, responsive,   │
                                              │   coverage, omissions (§8.7)   │
                                              └────────────────────────────────┘
                                                            │
                                     ┌──────────────────────┼──────────────────────┐
                                     ▼                      ▼                      ▼
                          dist/specs/{name}/         Ajv validation        specs analyze props
                            api.yaml                 (CI gate)              → _analysis/props.json
                            variants.yaml                                   (CI governance gate)
```

### 11.2 Extension strategy

Specs supports DTCG-style `$extensions` on props and anatomy elements. Everything the Specs model cannot express goes into a reverse-domain namespace we own:

```yaml
props:
  label:
    type: string
    examples: ["Book a meeting"]
    $extensions:
      com.kickstartds:
        required: true # Specs has no `required`
  icon:
    type: string
    $extensions:
      com.kickstartds:
        format: icon # Specs has no format hints
  variant:
    type: string
    default: secondary
    enum: [primary, secondary, tertiary]
    $extensions:
      com.kickstartds:
        modifiers: # enum value → BEM class → token prefix
          primary:
            { class: "c-button--solid", tokenPrefix: "--dsa-button_primary" }
          secondary:
            {
              class: "c-button--outlined",
              tokenPrefix: "--dsa-button_secondary",
            }
          tertiary:
            { class: "c-button--ghost", tokenPrefix: "--dsa-button_tertiary" }
  components:
    type: slot
    anyOf: [cta, features, gallery, hero, image-text]
    $extensions:
      com.kickstartds:
        refs: # preserve the authoritative $ref URIs
          - "http://schema.mydesignsystem.com/cta.schema.json"
```

This keeps every spec **schema-valid** (`additionalProperties: false` is satisfied because `$extensions` is an allowed key) while losing nothing.

### 11.3 What we emit, and what we deliberately leave empty

| Specs field                                                       | Emit?                    | Why                                                                                                           |
| ----------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `layout`                                                          | ✅ full                  | Plain nested element-name tree; derivable from a DOM walk. Highest value-per-effort field in the spec (§5.3)  |
| `default.elements[].styles` — flex + paint + typography + effects | ✅ with `TokenReference` | ~78 % of `Styles` maps cleanly; DTCG paths come from `token-graph.json` (§5.2, §5.5)                          |
| `default.elements[].styles` — sizing                              | 🟡 partial               | Emit absolute px and token refs only; **omit** `em` / `%` declarations rather than approximate them (T4)      |
| `default.elements[].styles` — computed values                     | ❌ **never**             | Everything downstream of a `*-factor` is a browser-time `calc()` (T1, T2). Emit the reference, never a number |
| Responsive tiers, container queries, media queries                | 📦 `$extensions`         | No representation exists in the model (T3, T9, T10); record so the gap is auditable, not invisible            |
| Inverted / non-default themes                                     | ❌                       | Default theme, `$root` colour only (T7, T8); declared in `coverage`                                           |
| Fallback chains                                                   | 📦 `$extensions`         | Emit resolved semantic layer as `$token`; keep full chain in `com.kickstartds.fallbackChain`                  |
| `strokeAlign`, `cornerSmoothing`, `itemReverseZIndex`, `locked`   | ❌                       | No CSS meaning                                                                                                |
| `images`                                                          | ❌                       | Handled by the blurhash/asset pipeline                                                                        |
| `metadata.source` / `metadata.config`                             | ❌                       | Figma-generation provenance; not applicable to a code-first producer                                          |
| `metadata.generator`                                              | ✅                       | Set to our emitter name + version, per schema requirements                                                    |

Governing rule: **omit rather than approximate.** A missing property is honest; a wrong one poisons any future conformance diff (§7.3). Coverage is declared machine-readably per §8.7.

### 11.4 Package placement

New script in the existing design system build, not a new package:

- `packages/design-system/scripts/emitComponentSpecs.mjs` — the emitter
- `packages/design-system/scripts/validateComponentSpecs.mjs` — Ajv validation against a vendored `component.schema.json`
- `packages/design-system/src/components/{name}/{name}.anatomy.json` — the one new authored artifact
- Output: `dist/specs/{name}/api.yaml` + `variants.yaml`, plus `dist/specs/index.json`
- `@directededges/specs-schema` enters as a **`devDependency` only**, pinned to an exact version, with the schema files vendored into `packages/design-system/vendor/specs-schema/` so builds never depend on registry availability.

---

## 12. Phased Plan

### Phase 0 — Spike (decision gate)

**Objective:** determine empirically whether the Specs model can carry enough of our semantics to be worth emitting — **not** whether we should change our semantics to fit it.

1. Hand-write conformant `api.yaml` for **five deliberately chosen components**: `button` (trivial), `section` (compositional + slots + client behaviour), `faq` (array of sub-objects), `slider` (polymorphic `anyOf` children), and one component with a nested object prop (e.g. one using `headline: { text }`).
2. Validate all five against `component.schema.json@0.28.0` with Ajv.
3. Run `npx @directededges/specs-cli analyze props` over them and inspect `_analysis/props.json`.
4. **Prototype the BEM-derived anatomy draft** for those five from `component-token-catalog.json` and measure how much manual correction it needs (§6.4).
5. Record, per component, a **fidelity score** against the §8 register: how many props map natively, how many land in `$extensions`, how many fields are omitted entirely.

**Exit criteria — proceed to Phase 1 only if:**

- All five validate cleanly, **and**
- ≥ 70 % of props map to a native `AnyProp` kind without `$extensions` carrying load-bearing semantics, **and**
- The BEM-derived anatomy draft is judged closer to "review and correct" than "rewrite", **and**
- `analyze props` output is judged actionable by the design system owner.

**Otherwise:** switch to Option C and reuse everything learned here as the design input for a private format.

### Phase 1 — Props + examples emitter (no anatomy)

1. Build `emitComponentSpecs.mjs`: JSON Schema → `props`, `snippets.json` → `instanceExamples`, minimal placeholder `anatomy` (`{ root: { type: container } }`) to satisfy the required field.
2. Wire Ajv validation into the build; fail the build on a non-conformant spec.
3. Emit for all 77 components; publish under `dist/specs/`.
4. Add `specs analyze props` as a **non-blocking** CI report.

**Value delivered:** enum discordance and prop-naming drift across all 77 components become visible for the first time. No authoring burden.

### Phase 2 — Anatomy, styles + variant deltas

1. Build `deriveAnatomyDraft.mjs`: parse the 512 BEM-pathed token names in `component-token-catalog.json` into draft anatomy trees for the 50 catalogued components (§6.4).
2. Define the `{name}.anatomy.json` format (named elements, `ElementType`, slot flags, and the **selector → element** and **modifier class → variant** join maps). Seed each file from the draft; a human reviews and corrects.
3. Extend the emitter to produce `layout` (DOM walk) and `default.elements[].styles` per the §5.6 and §6.6 policies — resolving `var()` references to DTCG `$token` paths via `token-graph.json`, and **emitting references only, never computed values**.
4. Derive `variants[]` deltas from the `enum → modifier class → token prefix` mapping declared in `$extensions`.
5. Add a **consistency check**: every declared modifier class must exist in the component's compiled CSS, and every declared token prefix must exist in `{name}-tokens.json`. This is the check that converts convention into contract.
6. Populate the `coverage` / `omissions` block (§8.7) on every emitted spec.

**Value delivered:** the schema↔CSS↔token chain becomes mechanically verified. Renames on either side now fail the build. The spec becomes rich enough to serve as a design build brief (§7.1, Model 2).

### Phase 3 — Consumption

1. Expose specs as an MCP resource: `design-system://specs` (index) and `design-system://specs/{component}` from `packages/component-builder-mcp`.
2. Add a `get-component-spec` tool so agents read one validated artifact instead of crawling TSX + SCSS + schema + stories.
3. Promote `specs analyze props` from report to **blocking CI gate** with an allowlist for accepted discordance.
4. Author anatomy for the remaining ~57 components, opportunistically as components are touched.

### Phase 4 — Optional: Figma probe (two components, one seat)

Gated on Phase 2 shipping and a design owner being allocated (§7.4). Not a commitment to a Figma library — a bounded experiment to measure whether one is viable via Specs.

1. Document the Figma authoring convention **before** anything is drawn: state variant prop naming (for `processing.states`), layer naming (for anatomy normalisation), variable modes for themes.
2. Design `button` and `section` in Figma to that convention.
3. Extract with the **Figma plugin** — one $10/month seat, no Figma Enterprise required (§7.2 item 7).
4. Diff extracted spec against the Phase 2 code-derived spec.
5. Report the **signal-to-noise ratio**: real drift vs. naming noise vs. structural impedance.

**Decision output:** SNR above an agreed threshold → write a follow-up PRD for a scoped Figma library (top 20 components). Below → close the question, keep the code-first spec, and record the result.

### Phase 5 — Deferred: full design-tool bridge

Only if Phase 4 succeeds and a design owner commits. At that point re-evaluate seat count, whether the CLI path (and thus Figma Enterprise) is needed over the plugin, the token naming bijection, and the diff normalisation layer. Nothing in Phases 0–3 blocks or prejudices this.

---

## 13. Risks & Mitigations

| #   | Risk                                                                                                               | Severity | Mitigation                                                                                                                                                                                                                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Upstream breaking changes** (pre-1.0, documented history of MAJOR bumps)                                         | High     | Pin exact version; vendor `component.schema.json`; consume for validation only; treat upgrades as deliberate, scheduled work                                                                                                                                               |
| 2   | **CC BY 4.0 attribution obligation** conflicts with our `MIT OR Apache-2.0` posture                                | Medium   | We _validate against_ the schema rather than redistributing it in `dist/`. If we ever publish a derived/extended schema, add explicit attribution to Nathan Curtis + repo link in `COPYRIGHT.md` and the package README. **Requires legal sign-off before Phase 1 ships.** |
| 3   | **Anatomy authoring burden** across 77 components                                                                  | High     | Phase it by usage frequency; placeholder anatomy in Phase 1 keeps specs valid meanwhile; consider deriving a first draft from BEM classes in the compiled CSS                                                                                                              |
| 4   | **Spec drift** — generated spec diverges from real component                                                       | High     | Everything derivable is derived, never authored. The only authored file is `{name}.anatomy.json`, and Phase 2's consistency check validates it against compiled CSS                                                                                                        |
| 5   | **`$extensions` becomes the real schema** — if most semantics live there, we have Option C wearing a Specs costume | Medium   | This is precisely what the Phase 0 fidelity score measures; the 70 % exit criterion exists to catch it                                                                                                                                                                     |
| 6   | **Single-vendor dependency**                                                                                       | Medium   | MIT CLI + CC BY schema are both forkable. Our emitter is ours. Worst case we keep the format and drop the tooling.                                                                                                                                                         |
| 7   | **Build time regression**                                                                                          | Low      | Emitter is pure file transformation over already-generated artifacts; comparable cost to `extractComponentTokenCatalog.cjs`                                                                                                                                                |
| 8   | **Effort spent on an artifact nobody consumes**                                                                    | Medium   | Phase 3 (MCP exposure) is the payoff; if Phase 1's `analyze props` output is not acted on within one cycle, stop and reassess                                                                                                                                              |
| 9   | **Style snapshots go stale** — `Styles` is resolved, so any token change invalidates every spec                    | Medium   | Emitter runs inside the existing build, after `token`/`component-token-catalog`; specs are never committed, only built                                                                                                                                                     |
| 10  | **Responsive behaviour is silently misread as absent**                                                             | High     | Never emit a partial/approximated responsive value. Record container-query rules under `$extensions['com.kickstartds'].responsive` and state the limitation in the spec's `metadata`                                                                                       |
| 11  | **Figma probe (Phase 4) reads as a commitment**                                                                    | Medium   | Scope is two components, one seat, one month, with an explicit close-the-question outcome. Write the decision down either way                                                                                                                                              |
| 12  | **Diff noise makes a Figma bridge look worse than it is**                                                          | Medium   | Budget the anatomy normalisation layer separately (§7.2 item 9); use `$extensions['com.figma'].originalName` + `detectedIn` as the mapping hooks                                                                                                                           |
| 13  | **Spec is read as describing responsive behaviour it does not describe**                                           | High     | Five S1 mismatches (§8.6) all stem from computed/responsive tokens. Every spec carries an explicit `coverage` + `omissions` block (§8.7) so silence is never mistaken for parity                                                                                           |
| 14  | **Draft anatomy derived from token names is wrong for some components**                                            | Medium   | Derivation covers 63 % of tokens across 50 of 77 components; treat output as a **draft requiring human review**, never as authoritative                                                                                                                                    |

---

## 14. Success Metrics

| Metric                                                                   | Baseline                                | Target                                                                    |
| ------------------------------------------------------------------------ | --------------------------------------- | ------------------------------------------------------------------------- |
| Components with a schema-valid spec                                      | 0 / 77                                  | 77 / 77 after Phase 1                                                     |
| Components with reviewed anatomy                                         | 0 / 77                                  | 50 / 77 after Phase 2 (the token-catalogued set), 77 / 77 after Phase 3   |
| Manual edits needed per BEM-derived anatomy draft                        | n/a                                     | measured in Phase 0; target ≤ 30 % of elements corrected                  |
| Enum discordance instances detected                                      | unknown                                 | measured after Phase 1; reduced by ≥ 50 % after Phase 3                   |
| Schema-enum → BEM-modifier → token mappings mechanically verified        | 0                                       | 100 % of components with reviewed anatomy                                 |
| Agent context cost to understand one component                           | 4 files (schema + TSX + SCSS + stories) | 1 file (`api.yaml`)                                                       |
| Style declarations emitted as a DTCG `TokenReference` (vs. bare literal) | 0 %                                     | ≥ 80 % of colour/spacing/typography declarations after Phase 2            |
| Style declarations emitted as a **computed numeric value**               | n/a                                     | **0** — hard invariant (T1, T2)                                           |
| Unmappable constructs silently dropped                                   | n/a                                     | **0** — every one either in `$extensions` or listed in `omissions` (§8.7) |
| Specs carrying a `coverage` block                                        | n/a                                     | 100 % after Phase 2                                                       |
| Figma↔code diff signal-to-noise ratio (Phase 4 only)                     | n/a                                     | measured; threshold agreed before the probe runs                          |
| Net new recurring cost                                                   | —                                       | **€0** through Phase 3; **€10/month for one month** for the Phase 4 probe |

---

## 15. Open Questions

1. **Legal:** does validating against a CC BY 4.0 JSON Schema, without redistributing it, create an attribution obligation? Assume yes and attribute anyway, or get a definitive answer? _(Blocks Phase 1 ship, not Phase 0.)_
2. **Anatomy authoring:** §6.4 establishes that 512 of 807 component tokens carry a BEM element path, so a draft is derivable for the 50 catalogued components. The open question is the _review_ model: does a human own `{name}.anatomy.json` from then on, or does the draft regenerate on every build with a small override file carrying the corrections? The latter is cheaper but couples anatomy to CSS-class churn.
3. **Slot semantics:** our array-of-`anyOf` children prop is genuinely a different concept from a Specs named slot. Do we model each as one `SlotProp` (lossy but native), or as a `StringProp`-free custom `$extensions` construct (faithful but non-native)?
4. **Subcomponents:** should repeated item shapes (faq items, timeline items) become Specs `subcomponents`? That would improve fidelity materially but changes how those schemas are authored.
5. **Do we upstream anything?** Several of our gaps (`required`, `format` hints, token fallback chains) are plausibly general. Is engaging the Specs project on these worth the effort, or do we stay a pure consumer? Compare with the approach in [docs/adr/adr-optoma-upstreaming.md](docs/adr/adr-optoma-upstreaming.md).
6. **Storyblok relationship:** `instanceExamples` and `slotContentExamples` overlap conceptually with the section recipes in [packages/storyblok-mcp/schemas/section-recipes.json](packages/storyblok-mcp/schemas/section-recipes.json). Should recipes eventually be expressed as Specs `Composition` entries, or stay independent?
7. **Token naming bijection:** what is the canonical mapping between `--ks-background-color-primary-interactive` and a DTCG dot path? The _branding_ layer already ships as DTCG (§6.1), so `--ks-brand-color-primary` ↔ `color.primary.$root` is mechanical. The **semantic** layer has no DTCG source — only compiled SCSS and `semantic-token-catalog.json` (16 categories, values overwhelmingly `"reference"`). Do we derive dot paths from the custom-property name, or generate a DTCG semantic file as an emitter-only side artifact? This blocks both §5 style emission and any future Figma work.
8. **Which token layer does `$token` cite?** `--dsa-button_primary--color` → `--ks-text-color-on-primary` → `--ks-brand-*`. §6.6 proposes citing the **semantic** layer as the most portable choice, but that discards the component-token indirection our theming relies on — and 100 of 807 component tokens (12 %) point at _another component token_, so the hop is not always single. Confirm with the Design Tokens MCP owner.
9. **Responsive:** §6.3 confirms four `@media` tiers (`36/48/62/75em`) redefine every semantic spacing and font-size token, so each has five values where Specs allows one. Is recording these under `$extensions` sufficient, or should we propose a viewport/container axis upstream? This is arguably the single most general gap in the Specs model, and the root cause of all five S1 mismatches.
10. **Figma probe:** who is the design owner, and what signal-to-noise threshold counts as success? Both must be agreed _before_ Phase 4 starts, not after the diff is looked at.
11. **Multi-theme and inversion:** we ship **9 branding token files** (default + 8 named variants) plus an orthogonal `[ks-inverted]` axis via `colorPair { $root, inverted }`. Specs describes one theme in one state. Do we emit the default `$root` only (cheapest — T7/T8), or one spec set per theme × inversion? The latter is what a Figma variable-mode bridge would eventually need, and is the one place where the two goals in this PRD pull in different directions.

---

## Appendix A — Inspection Record

Packages downloaded and inspected on 2026-08-01:

```bash
npm pack @directededges/specs-schema @directededges/specs-cli
# → directededges-specs-schema-0.28.0.tgz  (38 KB, 3 files-worth: dist/, types/, schema/)
# → directededges-specs-cli-0.25.0.tgz     (46 KB, single 190 KB dist/specs.js bundle)
```

**`@directededges/specs-schema@0.28.0`**

- `license: "CC-BY-4.0"`, `author: Nathan Curtis <nathan@directededges.com>`
- `devDependencies: { typescript }` only — zero runtime dependencies
- Ships `schema/{component,components,root,styles,workspace}.schema.json` and `types/*.ts`
- `component.schema.json`: 42 definitions; `Component.required = ["title", "anatomy", "default"]`
- `styles.schema.json`: 53 definitions; `Styles` has **46 properties**. `TokenReference` requires `{ $token, $type }` and is documented as the _"complete platform-facing API surface"_ with Figma provenance explicitly optional. `ColorObject` implements DTCG Color Module §4.1; `Shadow` aligns with the DTCG Format Module. `Sides` uses CSS logical `start`/`end`. `NumberStyleValue` = `number | TokenReference | null` — no string units.
- Layout enums confirmed: `layoutMode` ∈ `NONE|HORIZONTAL|VERTICAL`; `mainAxisAlignment` ∈ `START|END|CENTER|SPACE_BETWEEN`; `crossAxisAlignment` ∈ `START|END|CENTER|STRETCH|BASELINE`; `position` ∈ `AUTO|ABSOLUTE`; `textOverflow` ∈ `CLIP|ELLIPSIS`
- `LayoutNode` is a plain recursive tree: `string | { name: LayoutNode[] }`
- `workspace.schema.json` definitions: `VariantStateEntry`, `TransformEntry`, `Config`. `VariantStateEntry` (ADR-055) carries `{ prop, value?, contract?: 'omit'|'keep' }`
- `DEFAULT_CONFIG` is the only runtime export

**`@directededges/specs-cli@0.25.0`**

- `license: MIT`; single bundled ESM file, no declared dependencies
- Internal modules confirmed present: `commands/{Generate,Scan,Fetch,Init,Analyze,ApplyCustomTokens,Transform}Command`, `analyzers/{Props,Styling}`, `transforms/{Contract,Css,React,Stories}`
- `TransformCommand` and `AnalyzeCommand` both discover work via `existsSync(join(outputPath, name, 'api.yaml'))` — **no Figma coupling**
- `ContractTransformer.buildContractLines()` confirmed to emit all props optional and to `continue` past `type === 'slot'`

**kickstartDS design token tooling** (inspected in `packages/design-system/`, same date):

| Artifact                                 | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/token/branding-tokens.json`         | **Already W3C DTCG.** Sections: `color`, `font`, `spacing`, `border`, `box-shadow`, `duration`, `_fontHref`. `$type` values used: `color`, `fontFamily`, `fontWeight`, `dimension`, `number`. Colours use DTCG Color Module §4.1 — `{"colorSpace":"srgb","components":[…]}` — **structurally identical to the Specs `ColorObject`**                                                                                                        |
| `src/token/branding-tokens.schema.json`  | JSON Schema draft 2020-12. Colour entries are `colorPair { $root, inverted }`                                                                                                                                                                                                                                                                                                                                                              |
| `scripts/buildBrandingTokens.mjs`        | Ajv-validates each branding file against that schema, then compiles to CSS custom properties via `tokensToCss()`                                                                                                                                                                                                                                                                                                                           |
| Branding theme files                     | **9 total**: `branding-tokens.json` + `-blizzard`, `-burgundy`, `-coffee`, `-ember`, `-granit`, `-mint`, `-neon`, `-water`. One `sd.config.cjs`                                                                                                                                                                                                                                                                                            |
| Parametric factors                       | **8 `$type: number` ratio tokens**, all `1.5`: `spacing.{factor,shrink-factor,grow-factor,bp-factor}`, `font.size.*.{shrink,grow,bp}-factor`, `border.radius-factor`, `box-shadow.{blur,opacity,spread}-factor`, `duration.factor`. **No `spacing.m` exists** — scales are generated, not enumerated                                                                                                                                       |
| Semantic layer (`src/token/*.scss`)      | **326 `calc()` occurrences** (font-size 198, spacing 51, font 36, scaling 18, box-shadow 16, transition 4, border 3). **Zero `clamp()` / `min()` / `max()`**                                                                                                                                                                                                                                                                               |
| Breakpoints                              | **4 `@media (min-width: …)` tiers — 36em, 48em, 62em, 75em** — in both `font-size-token.scss` and `spacing-token.scss`. Every semantic spacing and font-size token therefore has five values                                                                                                                                                                                                                                               |
| `src/token/semantic-token-catalog.json`  | 16 categories; entries `{ value, valueType }` with `valueType` overwhelmingly `"reference"`                                                                                                                                                                                                                                                                                                                                                |
| `src/token/component-token-catalog.json` | **50 components, 807 tokens.** `valueType` split: `semantic-ref` 510 (63 %), `literal` 197 (24 %), `component-ref` 100 (12 %). **512 of 807 (63 %) contain a BEM element path (`__`)** → anatomy is mechanically derivable. **0 responsive / container-query entries currently emitted**, although `extractComponentTokenCatalog.cjs` does resolve `@include container.size("≥", 640px, "hero")` into `@container hero (min-width: 640px)` |
| `src/token/token-graph.json`             | Two Graphology graphs: `full` = **3,091 nodes / 5,179 edges**; `design-system` = 1,219 / 1,738. Edges carry `{ selector, purpose: "reference" }` — this is the reference resolver the emitter would use                                                                                                                                                                                                                                    |
| Figma integration                        | **None anywhere in the repo.** Four incidental mentions only (two marketing docs, one out-of-scope note, one landing-page copy string)                                                                                                                                                                                                                                                                                                     |

## Appendix B — Sources

- Product site: <https://www.specsplugin.com/>
- Schema reference: <https://www.specsplugin.com/schema/>
- Transforms (EXPERIMENTAL): <https://www.specsplugin.com/cli/transforms/>
- `contract` transformer: <https://www.specsplugin.com/cli/transforms/contract/>
- Licensing / Free vs Pro: <https://www.specsplugin.com/overview/licensing/>
- License terms: <https://www.specsplugin.com/overview/license/>
- Repository: <https://github.com/DirectedEdges/specs>
- RFC 001 — Component Dictionary: <https://github.com/DirectedEdges/specs/blob/main/rfc/001-component-dictionary/README.md>
- Schema constitution (governance & versioning policy): `.specify/memory/constitution.md` in the repository

## Appendix C — Related Internal Documents

- [docs/internal/prd/cosmos-token-graph-prd.md](docs/internal/prd/cosmos-token-graph-prd.md) — token graph scope; establishes CSS-custom-property-only precedent
- [docs/adr/adr-cosmos-token-graph.md](docs/adr/adr-cosmos-token-graph.md) — rationale for excluding DTCG/Figma Tokens as direct inputs
- [docs/adr/adr-optoma-upstreaming.md](docs/adr/adr-optoma-upstreaming.md) — precedent for upstream-vs-fork decisions
- [docs/internal/README-component-builder-mcp.md](docs/internal/README-component-builder-mcp.md) — the MCP surface that would consume specs in Phase 3
- [docs/internal/README-design-token-mcp.md](docs/internal/README-design-token-mcp.md) — overlapping token analysis surface
