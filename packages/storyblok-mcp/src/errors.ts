/**
 * Error types for the MCP server
 */

export class MCPError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "MCPError";
  }
}

export class ValidationError extends MCPError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "VALIDATION_ERROR", details);
    this.name = "ValidationError";
  }
}

export class ConfigurationError extends MCPError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "CONFIGURATION_ERROR", details);
    this.name = "ConfigurationError";
  }
}

export class StoryblokApiError extends MCPError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "STORYBLOK_API_ERROR", details);
    this.name = "StoryblokApiError";
  }
}

export class OpenAIApiError extends MCPError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "OPENAI_API_ERROR", details);
    this.name = "OpenAIApiError";
  }
}

export class NotFoundError extends MCPError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "NOT_FOUND", details);
    this.name = "NotFoundError";
  }
}

/**
 * Wrap an async function with error handling
 */
export function withErrorHandling<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  errorType: string
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof MCPError) {
        throw error;
      }

      const message = error instanceof Error ? error.message : String(error);
      const details =
        error instanceof Error ? { originalError: error.name } : {};

      throw new MCPError(`${errorType}: ${message}`, errorType, details);
    }
  };
}

/**
 * Format error for MCP response
 *
 * Also logs the error to stderr so it appears in stdio / server logs.
 */
export function formatErrorResponse(error: unknown): {
  content: Array<{ type: "text"; text: string }>;
  isError: true;
} {
  let message: string;
  let code = "UNKNOWN_ERROR";
  let details: Record<string, unknown> = {};

  if (error instanceof MCPError) {
    message = error.message;
    code = error.code;
    details = error.details || {};
  } else if (error instanceof Error) {
    message = error.message;
    details = { stack: error.stack };
  } else {
    message = String(error);
  }

  // Log every error to stderr so it is visible in stdio / server logs
  console.error(`[MCP Error] [${code}] ${message}`);
  if (Object.keys(details).length > 0) {
    console.error(`[MCP Error Details]`, JSON.stringify(details, null, 2));
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            error: true,
            code,
            message,
            details,
          },
          null,
          2
        ),
      },
    ],
    isError: true,
  };
}
