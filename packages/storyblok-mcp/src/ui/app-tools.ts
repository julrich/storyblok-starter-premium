/**
 * App-only tools for ext-apps UI interaction.
 *
 * These tools have `visibility: ["app"]` — they are callable only from
 * the UI iframe via `app.callTool()`, and are hidden from the LLM.
 * They provide the interactive approve/reject/modify workflow that
 * complements the visual previews.
 *
 * Tools:
 * - approve_section — User approves a generated section
 * - reject_section  — User rejects a section (with optional reason)
 * - modify_section  — User wants to modify a section
 * - remove_section  — User removes a committed section by index
 * - move_section    — User moves a section up or down
 * - save_page       — User saves accumulated sections to Storyblok
 * - approve_plan    — User approves a planned section sequence
 *
 * @see PRD Section 4.6 — App-Only Tools
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";
import {
  SECTION_PREVIEW_URI,
  PAGE_BUILDER_URI,
  PLAN_REVIEW_URI,
} from "./capability.js";

// ── Zod schemas for app-only tool inputs ───────────────────────────

const SectionInputSchema = {
  section: z.record(z.unknown()).describe("The section data from the preview"),
};

const RejectInputSchema = {
  reason: z.string().optional().describe("Optional reason for rejection"),
};

const RemoveSectionInputSchema = {
  index: z.number().describe("Zero-based index of the section to remove"),
  sectionId: z.string().optional().describe("Internal builder section ID"),
};

const MoveSectionInputSchema = {
  fromIndex: z.number().describe("Zero-based source index"),
  toIndex: z.number().describe("Zero-based target index"),
};

const SavePageInputSchema = {
  mode: z
    .enum(["create", "update"])
    .describe("Whether to create a new page or update an existing one"),
  sections: z
    .array(z.record(z.unknown()))
    .describe("Array of section data objects to save"),
  storyUid: z.string().optional().describe("Story UID for update mode"),
  name: z.string().optional().describe("Page name for create mode"),
  slug: z.string().optional().describe("Page slug for create mode"),
  publish: z.boolean().optional().describe("Whether to publish immediately"),
  rootFields: z
    .record(z.unknown())
    .optional()
    .describe("Additional root-level fields"),
};

// ── Registration ───────────────────────────────────────────────────

/**
 * Register all app-only tools on the McpServer.
 *
 * These tools are only visible to the ext-apps UI (not the LLM).
 * They use `registerAppTool()` from the ext-apps SDK which normalizes
 * the `_meta.ui.visibility` metadata.
 */
export function registerAppOnlyTools(server: McpServer): void {
  // ── approve_section ────────────────────────────────────────────

  registerAppTool(
    server,
    "approve_section",
    {
      title: "Approve Section",
      description:
        "Approve a generated section. Called from the section preview UI when the user clicks the approve button.",
      inputSchema: SectionInputSchema,
      _meta: {
        ui: { resourceUri: SECTION_PREVIEW_URI, visibility: ["app"] },
      },
    },
    async ({ section }) => {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              action: "approved",
              section,
              message: "Section approved by user",
            }),
          },
        ],
      };
    }
  );

  // ── reject_section ─────────────────────────────────────────────

  registerAppTool(
    server,
    "reject_section",
    {
      title: "Reject Section",
      description:
        "Reject a generated section. Called from the preview UI when the user clicks reject.",
      inputSchema: RejectInputSchema,
      _meta: {
        ui: { resourceUri: SECTION_PREVIEW_URI, visibility: ["app"] },
      },
    },
    async ({ reason }) => {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              action: "rejected",
              reason: reason || "User rejected the section",
              message:
                "Section rejected. The model should ask for feedback and regenerate.",
            }),
          },
        ],
      };
    }
  );

  // ── modify_section ─────────────────────────────────────────────

  registerAppTool(
    server,
    "modify_section",
    {
      title: "Modify Section",
      description:
        "Request modifications to a generated section. Called from the preview UI when the user wants changes.",
      inputSchema: SectionInputSchema,
      _meta: {
        ui: { resourceUri: SECTION_PREVIEW_URI, visibility: ["app"] },
      },
    },
    async ({ section }) => {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              action: "modify",
              section,
              message:
                "User wants to modify this section. Ask what changes they'd like.",
            }),
          },
        ],
      };
    }
  );

  // ── approve_plan ───────────────────────────────────────────────

  registerAppTool(
    server,
    "approve_plan",
    {
      title: "Approve Plan",
      description:
        "Approve a page plan (section sequence). Called from the plan review UI.",
      inputSchema: {
        order: z
          .array(z.string())
          .describe("Ordered list of component type names"),
      },
      _meta: {
        ui: { resourceUri: PLAN_REVIEW_URI, visibility: ["app"] },
      },
    },
    async ({ order }) => {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              action: "plan_approved",
              order,
              message:
                "Plan approved by user. Proceed with generating each section in the approved order.",
            }),
          },
        ],
      };
    }
  );

  // ── remove_section ─────────────────────────────────────────────

  registerAppTool(
    server,
    "remove_section",
    {
      title: "Remove Section",
      description:
        "Remove a committed section from the page builder by index. Called from the builder UI when the user clicks the remove button on a section.",
      inputSchema: RemoveSectionInputSchema,
      _meta: {
        ui: { resourceUri: PAGE_BUILDER_URI, visibility: ["app"] },
      },
    },
    async ({ index, sectionId }) => {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              action: "section_removed",
              index,
              sectionId,
              message: `Section at index ${index} removed by user.`,
            }),
          },
        ],
      };
    }
  );

  // ── move_section ───────────────────────────────────────────────

  registerAppTool(
    server,
    "move_section",
    {
      title: "Move Section",
      description:
        "Move a section up or down in the page builder. Called from the builder UI when the user clicks the move buttons.",
      inputSchema: MoveSectionInputSchema,
      _meta: {
        ui: { resourceUri: PAGE_BUILDER_URI, visibility: ["app"] },
      },
    },
    async ({ fromIndex, toIndex }) => {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              action: "section_moved",
              fromIndex,
              toIndex,
              message: `Section moved from position ${fromIndex + 1} to ${
                toIndex + 1
              }.`,
            }),
          },
        ],
      };
    }
  );

  // ── save_page ──────────────────────────────────────────────────

  registerAppTool(
    server,
    "save_page",
    {
      title: "Save Page",
      description:
        "Save the accumulated page sections to Storyblok. Called from the builder's Save button. Supports both creating new pages and updating existing ones.",
      inputSchema: SavePageInputSchema,
      _meta: {
        ui: { resourceUri: PAGE_BUILDER_URI, visibility: ["app"] },
      },
    },
    async ({ mode, sections, storyUid, name, slug, publish, rootFields }) => {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              action: "save_page",
              mode,
              sections,
              storyUid,
              name,
              slug,
              publish,
              rootFields,
              message: `User wants to ${mode} a page with ${
                sections.length
              } sections. Please use ${
                mode === "update" ? "update_story" : "create_page_with_content"
              } to save.`,
            }),
          },
        ],
      };
    }
  );
}
