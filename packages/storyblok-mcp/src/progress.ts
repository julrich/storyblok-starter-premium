/**
 * Progress notification helpers for long-running tool operations.
 *
 * MCP clients can request progress notifications by including a
 * `progressToken` in the request's `_meta`. When present, the server
 * sends `notifications/progress` updates during multi-step operations.
 *
 * Uses the high-level `extra.sendNotification()` from McpServer's
 * registerTool callback, rather than the low-level Server API.
 *
 * @see PRD Section 3.5 and ADR-005
 */

import type { ServerNotification } from "@modelcontextprotocol/sdk/types.js";

/**
 * Minimal interface for what ProgressReporter needs from the
 * `extra` parameter provided to registerTool callbacks.
 */
export interface ProgressExtra {
  _meta?: { progressToken?: string | number };
  sendNotification: (notification: ServerNotification) => Promise<void>;
}

/**
 * A progress reporter that sends notifications if the client requested them.
 * If no progressToken was provided, calls are silently no-ops.
 */
export class ProgressReporter {
  private extra: ProgressExtra;
  private progressToken: string | number | undefined;
  private total: number;
  private current: number;

  constructor(extra: ProgressExtra, total: number) {
    this.extra = extra;
    this.progressToken = extra._meta?.progressToken;
    this.total = total;
    this.current = 0;
  }

  /**
   * Report progress on the current step.
   * @param message - Human-readable description of what's happening
   */
  async advance(message?: string): Promise<void> {
    this.current++;
    if (!this.progressToken) return;

    try {
      await this.extra.sendNotification({
        method: "notifications/progress",
        params: {
          progressToken: this.progressToken,
          progress: this.current,
          total: this.total,
          ...(message && { message }),
        },
      } as ServerNotification);
    } catch (error) {
      // Progress notifications are best-effort; don't fail the operation
      console.error("[MCP] Failed to send progress notification:", error);
    }
  }

  /**
   * Report completion (progress === total).
   */
  async complete(message?: string): Promise<void> {
    this.current = this.total;
    if (!this.progressToken) return;

    try {
      await this.extra.sendNotification({
        method: "notifications/progress",
        params: {
          progressToken: this.progressToken,
          progress: this.total,
          total: this.total,
          ...(message && { message }),
        },
      } as ServerNotification);
    } catch (error) {
      console.error("[MCP] Failed to send progress completion:", error);
    }
  }
}
