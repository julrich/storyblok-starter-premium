/**
 * Elicitation helpers for interactive tool workflows.
 *
 * Elicitation lets tools pause execution and ask the user for input via
 * the MCP client's UI (e.g., a form dialog). This module provides:
 *
 * 1. `tryElicit()` — graceful wrapper that degrades silently when the client
 *    doesn't support elicitation (per ADR-003)
 * 2. Pre-built elicitation schemas for common workflows
 *
 * @see PRD Section 3.3 and ADR-003
 */

import type { Server } from "@modelcontextprotocol/sdk/server/index.js";

// ── Types ──────────────────────────────────────────────────────────

/** Result from a tryElicit call */
export interface ElicitationResult {
  /** Whether elicitation was performed and accepted */
  accepted: boolean;
  /** The user's input (only present if accepted) */
  content?: Record<string, string | number | boolean | string[]>;
  /** Why elicitation didn't happen: 'unsupported' | 'declined' | 'cancelled' */
  reason?: "unsupported" | "declined" | "cancelled";
}

/** Schema property for elicitation form fields */
export interface ElicitationProperty {
  type: "string" | "number" | "boolean" | "array";
  title?: string;
  description?: string;
  default?: string | number | boolean;
  enum?: string[];
  enumNames?: string[];
  minLength?: number;
  maxLength?: number;
}

// ── Core helper ────────────────────────────────────────────────────

/**
 * Attempt to elicit input from the user via the client.
 * Falls back gracefully if elicitation is not supported by the client.
 *
 * Per ADR-003, this never throws — it returns { accepted: false, reason }
 * so tools can proceed with defaults when elicitation is unavailable.
 *
 * @param server - The MCP Server instance
 * @param message - The message to display to the user
 * @param properties - The form schema properties to collect
 * @param required - Which properties are required (optional)
 */
export async function tryElicit(
  server: Server,
  message: string,
  properties: Record<string, ElicitationProperty>,
  required?: string[]
): Promise<ElicitationResult> {
  // Check if the client supports elicitation
  const clientCapabilities = server.getClientCapabilities();
  if (!clientCapabilities?.elicitation) {
    return { accepted: false, reason: "unsupported" };
  }

  try {
    const result = await server.elicitInput({
      mode: "form",
      message,
      requestedSchema: {
        type: "object",
        properties: properties as any,
        required: required || [],
      },
    });

    if (result.action === "accept" && result.content) {
      return {
        accepted: true,
        content: result.content as Record<
          string,
          string | number | boolean | string[]
        >,
      };
    }

    return {
      accepted: false,
      reason: result.action === "decline" ? "declined" : "cancelled",
    };
  } catch (error) {
    // Elicitation failed (e.g., client disconnected, timeout)
    console.error("[MCP] Elicitation failed:", error);
    return { accepted: false, reason: "unsupported" };
  }
}

// ── Pre-built elicitation schemas ──────────────────────────────────

/**
 * Elicit component type selection for generate_section when
 * the user hasn't specified a componentType.
 */
export function elicitComponentType(availableComponents: string[]): {
  message: string;
  properties: Record<string, ElicitationProperty>;
  required: string[];
} {
  return {
    message:
      "Which component type would you like to generate? Select one from the available options.",
    properties: {
      componentType: {
        type: "string",
        title: "Component Type",
        description: "The type of section component to generate",
        enum: availableComponents,
      },
    },
    required: ["componentType"],
  };
}

/**
 * Elicit page plan approval before proceeding with generation.
 * Shows the planned sections and asks for confirmation.
 */
export function elicitPlanApproval(planSummary: string): {
  message: string;
  properties: Record<string, ElicitationProperty>;
  required: string[];
} {
  return {
    message: `Here's the planned page structure:\n\n${planSummary}\n\nWould you like to proceed with this plan?`,
    properties: {
      approval: {
        type: "string",
        title: "Action",
        description: "Approve or modify the plan",
        enum: ["approve", "modify", "cancel"],
        enumNames: [
          "Approve — proceed with generation",
          "Modify — I'll adjust the plan",
          "Cancel — don't generate",
        ],
        default: "approve",
      },
    },
    required: ["approval"],
  };
}

/**
 * Elicit publish confirmation before publishing a page.
 */
export function elicitPublishConfirmation(pageName: string): {
  message: string;
  properties: Record<string, ElicitationProperty>;
  required: string[];
} {
  return {
    message: `The page "${pageName}" has been created as a draft. Would you like to publish it now?`,
    properties: {
      publish: {
        type: "string",
        title: "Publish",
        description: "Choose whether to publish the page",
        enum: ["publish", "keep_draft"],
        enumNames: [
          "Publish now — make it live",
          "Keep as draft — review first",
        ],
        default: "keep_draft",
      },
    },
    required: ["publish"],
  };
}

/**
 * Elicit content type selection when creating a new page.
 */
export function elicitContentType(): {
  message: string;
  properties: Record<string, ElicitationProperty>;
  required: string[];
} {
  return {
    message: "What type of content would you like to create?",
    properties: {
      contentType: {
        type: "string",
        title: "Content Type",
        description:
          "The content type determines the page structure and available fields",
        enum: [
          "page",
          "blog-post",
          "blog-overview",
          "event-detail",
          "event-list",
        ],
        enumNames: [
          "Page — standard website page",
          "Blog Post — article with head, aside, CTA",
          "Blog Overview — blog listing page",
          "Event Detail — single event page",
          "Event List — event listing page",
        ],
        default: "page",
      },
    },
    required: ["contentType"],
  };
}

/**
 * Elicit a destructive action confirmation (e.g., delete).
 */
export function elicitDeleteConfirmation(storyName: string): {
  message: string;
  properties: Record<string, ElicitationProperty>;
  required: string[];
} {
  return {
    message: `Are you sure you want to permanently delete "${storyName}"? This action cannot be undone.`,
    properties: {
      confirm: {
        type: "string",
        title: "Confirm Deletion",
        description: "Type 'delete' to confirm",
        enum: ["delete", "cancel"],
        enumNames: ["Delete permanently", "Cancel — keep the story"],
      },
    },
    required: ["confirm"],
  };
}

/**
 * Elicit section approval after generation.
 *
 * This is the key gate that blocks the LLM from continuing to the
 * next section until the user has reviewed the current one.
 * In automation contexts (n8n, clients without elicitation), tryElicit()
 * returns unsupported and the tool falls through to immediate return.
 */
export function elicitSectionApproval(
  componentType: string,
  sectionSummary?: string
): {
  message: string;
  properties: Record<string, ElicitationProperty>;
  required: string[];
} {
  const summaryBlock = sectionSummary
    ? `\n\nGenerated content summary:\n${sectionSummary}`
    : "";

  return {
    message: `A "${componentType}" section has been generated.${summaryBlock}\n\nPlease review and choose an action:`,
    properties: {
      action: {
        type: "string",
        title: "Section Review",
        description: "Approve, modify, or reject this section",
        enum: ["approve", "modify", "reject"],
        enumNames: [
          "Approve — use this section",
          "Modify — request changes",
          "Reject — skip this section",
        ],
        default: "approve",
      },
    },
    required: ["action"],
  };
}

/**
 * Elicit page confirmation before creating in Storyblok.
 *
 * Shows a summary of the planned page and asks whether to create
 * it as a draft, publish immediately, or discard entirely.
 * This blocks the tool BEFORE the Storyblok API call, giving the
 * user full control over whether the page is created at all.
 */
export function elicitPageConfirmation(
  pageName: string,
  sectionCount: number,
  sectionTypes: string[]
): {
  message: string;
  properties: Record<string, ElicitationProperty>;
  required: string[];
} {
  const sectionList = sectionTypes.map((t, i) => `  ${i + 1}. ${t}`).join("\n");

  return {
    message: `Ready to create page "${pageName}" with ${sectionCount} section${
      sectionCount !== 1 ? "s" : ""
    }:\n\n${sectionList}\n\nWhat would you like to do?`,
    properties: {
      action: {
        type: "string",
        title: "Page Action",
        description: "Choose how to save this page",
        enum: ["draft", "publish", "discard"],
        enumNames: [
          "Save as draft — review in Storyblok first",
          "Publish — make it live immediately",
          "Discard — don't create the page",
        ],
        default: "draft",
      },
    },
    required: ["action"],
  };
}
