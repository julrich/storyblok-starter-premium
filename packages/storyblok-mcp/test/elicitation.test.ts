/**
 * Tests for elicitation helpers and pre-built schemas.
 *
 * Verifies the tryElicit() graceful degradation helper and all 5
 * pre-built elicitation schema generators (component type, plan
 * approval, publish confirmation, content type, delete confirmation).
 *
 * @see src/elicitation.ts
 */

import {
  tryElicit,
  elicitComponentType,
  elicitPlanApproval,
  elicitPublishConfirmation,
  elicitContentType,
  elicitDeleteConfirmation,
  elicitSectionApproval,
  elicitPageConfirmation,
  type ElicitationResult,
  type ElicitationProperty,
} from "../src/elicitation.js";

// ── ElicitationResult type ─────────────────────────────────────────

describe("ElicitationResult type", () => {
  it("accepted result has content and no reason", () => {
    const result: ElicitationResult = {
      accepted: true,
      content: { componentType: "hero" },
    };
    expect(result.accepted).toBe(true);
    expect(result.content).toBeDefined();
    expect(result.reason).toBeUndefined();
  });

  it("unsupported result has reason and no content", () => {
    const result: ElicitationResult = {
      accepted: false,
      reason: "unsupported",
    };
    expect(result.accepted).toBe(false);
    expect(result.reason).toBe("unsupported");
    expect(result.content).toBeUndefined();
  });

  it("declined result has reason 'declined'", () => {
    const result: ElicitationResult = {
      accepted: false,
      reason: "declined",
    };
    expect(result.reason).toBe("declined");
  });

  it("cancelled result has reason 'cancelled'", () => {
    const result: ElicitationResult = {
      accepted: false,
      reason: "cancelled",
    };
    expect(result.reason).toBe("cancelled");
  });
});

// ── tryElicit() ────────────────────────────────────────────────────

describe("tryElicit()", () => {
  it("returns unsupported when client has no elicitation capability", async () => {
    const mockServer = {
      getClientCapabilities: () => ({}),
    } as any;

    const result = await tryElicit(mockServer, "Test message", {
      field: { type: "string" as const, title: "Test" },
    });

    expect(result.accepted).toBe(false);
    expect(result.reason).toBe("unsupported");
  });

  it("returns unsupported when client capabilities are null", async () => {
    const mockServer = {
      getClientCapabilities: () => null,
    } as any;

    const result = await tryElicit(mockServer, "Test message", {
      field: { type: "string" as const, title: "Test" },
    });

    expect(result.accepted).toBe(false);
    expect(result.reason).toBe("unsupported");
  });

  it("returns accepted when client supports elicitation and user accepts", async () => {
    const mockServer = {
      getClientCapabilities: () => ({ elicitation: {} }),
      elicitInput: async () => ({
        action: "accept",
        content: { field: "value" },
      }),
    } as any;

    const result = await tryElicit(mockServer, "Pick a value", {
      field: { type: "string" as const, title: "Field" },
    });

    expect(result.accepted).toBe(true);
    expect(result.content).toEqual({ field: "value" });
    expect(result.reason).toBeUndefined();
  });

  it("returns declined when user declines", async () => {
    const mockServer = {
      getClientCapabilities: () => ({ elicitation: {} }),
      elicitInput: async () => ({
        action: "decline",
        content: null,
      }),
    } as any;

    const result = await tryElicit(mockServer, "Pick a value", {
      field: { type: "string" as const, title: "Field" },
    });

    expect(result.accepted).toBe(false);
    expect(result.reason).toBe("declined");
  });

  it("returns cancelled when user cancels", async () => {
    const mockServer = {
      getClientCapabilities: () => ({ elicitation: {} }),
      elicitInput: async () => ({
        action: "cancel",
        content: null,
      }),
    } as any;

    const result = await tryElicit(mockServer, "Pick a value", {
      field: { type: "string" as const, title: "Field" },
    });

    expect(result.accepted).toBe(false);
    expect(result.reason).toBe("cancelled");
  });

  it("returns unsupported when elicitInput throws", async () => {
    const mockServer = {
      getClientCapabilities: () => ({ elicitation: {} }),
      elicitInput: async () => {
        throw new Error("Connection lost");
      },
    } as any;

    const result = await tryElicit(mockServer, "Pick a value", {
      field: { type: "string" as const, title: "Field" },
    });

    expect(result.accepted).toBe(false);
    expect(result.reason).toBe("unsupported");
  });

  it("passes the correct schema to elicitInput", async () => {
    let capturedArgs: any;
    const mockServer = {
      getClientCapabilities: () => ({ elicitation: {} }),
      elicitInput: async (args: any) => {
        capturedArgs = args;
        return { action: "accept", content: { color: "blue" } };
      },
    } as any;

    const properties = {
      color: {
        type: "string" as const,
        title: "Favorite Color",
        enum: ["red", "blue", "green"],
      },
    };

    await tryElicit(mockServer, "Pick a color", properties, ["color"]);

    expect(capturedArgs).toBeDefined();
    expect(capturedArgs.mode).toBe("form");
    expect(capturedArgs.message).toBe("Pick a color");
    expect(capturedArgs.requestedSchema.type).toBe("object");
    expect(capturedArgs.requestedSchema.properties.color.type).toBe("string");
    expect(capturedArgs.requestedSchema.properties.color.enum).toEqual([
      "red",
      "blue",
      "green",
    ]);
    expect(capturedArgs.requestedSchema.required).toEqual(["color"]);
  });

  it("defaults required to empty array when not provided", async () => {
    let capturedArgs: any;
    const mockServer = {
      getClientCapabilities: () => ({ elicitation: {} }),
      elicitInput: async (args: any) => {
        capturedArgs = args;
        return { action: "accept", content: {} };
      },
    } as any;

    await tryElicit(mockServer, "Message", {
      optional: { type: "string" as const },
    });

    expect(capturedArgs.requestedSchema.required).toEqual([]);
  });
});

// ── elicitComponentType() ──────────────────────────────────────────

describe("elicitComponentType()", () => {
  it("returns a valid elicitation schema", () => {
    const result = elicitComponentType(["hero", "faq", "features"]);

    expect(result.message).toBeTruthy();
    expect(result.properties.componentType).toBeDefined();
    expect(result.properties.componentType.type).toBe("string");
    expect(result.properties.componentType.enum).toEqual([
      "hero",
      "faq",
      "features",
    ]);
    expect(result.required).toContain("componentType");
  });

  it("passes the available components list to enum", () => {
    const components = ["cta", "split", "testimonials", "stats"];
    const result = elicitComponentType(components);

    expect(result.properties.componentType.enum).toEqual(components);
  });

  it("has a descriptive title for the field", () => {
    const result = elicitComponentType(["hero"]);
    expect(result.properties.componentType.title).toBe("Component Type");
  });

  it("message mentions selecting a component type", () => {
    const result = elicitComponentType(["hero"]);
    expect(result.message.toLowerCase()).toContain("component type");
  });
});

// ── elicitPlanApproval() ───────────────────────────────────────────

describe("elicitPlanApproval()", () => {
  const planSummary = "1. hero\n2. features\n3. cta";

  it("returns a valid elicitation schema", () => {
    const result = elicitPlanApproval(planSummary);

    expect(result.message).toContain(planSummary);
    expect(result.properties.approval).toBeDefined();
    expect(result.properties.approval.type).toBe("string");
    expect(result.required).toContain("approval");
  });

  it("offers approve, modify, and cancel options", () => {
    const result = elicitPlanApproval(planSummary);

    expect(result.properties.approval.enum).toContain("approve");
    expect(result.properties.approval.enum).toContain("modify");
    expect(result.properties.approval.enum).toContain("cancel");
  });

  it("has human-readable enumNames for each option", () => {
    const result = elicitPlanApproval(planSummary);

    expect(result.properties.approval.enumNames).toHaveLength(3);
    result.properties.approval.enumNames!.forEach((name) => {
      expect(typeof name).toBe("string");
      expect(name.length).toBeGreaterThan(5);
    });
  });

  it("defaults to approve", () => {
    const result = elicitPlanApproval(planSummary);
    expect(result.properties.approval.default).toBe("approve");
  });

  it("includes the plan summary in the message", () => {
    const summary = "1. hero — Main banner\n2. faq — Common questions";
    const result = elicitPlanApproval(summary);
    expect(result.message).toContain("hero — Main banner");
    expect(result.message).toContain("faq — Common questions");
  });
});

// ── elicitPublishConfirmation() ────────────────────────────────────

describe("elicitPublishConfirmation()", () => {
  it("returns a valid elicitation schema", () => {
    const result = elicitPublishConfirmation("My Landing Page");

    expect(result.message).toContain("My Landing Page");
    expect(result.properties.publish).toBeDefined();
    expect(result.properties.publish.type).toBe("string");
    expect(result.required).toContain("publish");
  });

  it("offers publish and keep_draft options", () => {
    const result = elicitPublishConfirmation("Test Page");

    expect(result.properties.publish.enum).toContain("publish");
    expect(result.properties.publish.enum).toContain("keep_draft");
  });

  it("defaults to keep_draft", () => {
    const result = elicitPublishConfirmation("Test Page");
    expect(result.properties.publish.default).toBe("keep_draft");
  });

  it("has human-readable enumNames", () => {
    const result = elicitPublishConfirmation("Test Page");

    expect(result.properties.publish.enumNames).toHaveLength(2);
    result.properties.publish.enumNames!.forEach((name) => {
      expect(typeof name).toBe("string");
      expect(name.length).toBeGreaterThan(5);
    });
  });

  it("includes the page name in the message", () => {
    const result = elicitPublishConfirmation("About Us");
    expect(result.message).toContain("About Us");
    expect(result.message.toLowerCase()).toContain("draft");
  });
});

// ── elicitContentType() ────────────────────────────────────────────

describe("elicitContentType()", () => {
  it("returns a valid elicitation schema", () => {
    const result = elicitContentType();

    expect(result.message).toBeTruthy();
    expect(result.properties.contentType).toBeDefined();
    expect(result.properties.contentType.type).toBe("string");
    expect(result.required).toContain("contentType");
  });

  it("includes all 5 content types", () => {
    const result = elicitContentType();
    const types = result.properties.contentType.enum;

    expect(types).toContain("page");
    expect(types).toContain("blog-post");
    expect(types).toContain("blog-overview");
    expect(types).toContain("event-detail");
    expect(types).toContain("event-list");
  });

  it("has matching enumNames for each type", () => {
    const result = elicitContentType();
    expect(result.properties.contentType.enumNames).toHaveLength(
      result.properties.contentType.enum!.length
    );
  });

  it("defaults to page", () => {
    const result = elicitContentType();
    expect(result.properties.contentType.default).toBe("page");
  });
});

// ── elicitDeleteConfirmation() ─────────────────────────────────────

describe("elicitDeleteConfirmation()", () => {
  it("returns a valid elicitation schema", () => {
    const result = elicitDeleteConfirmation("My Story");

    expect(result.message).toContain("My Story");
    expect(result.properties.confirm).toBeDefined();
    expect(result.properties.confirm.type).toBe("string");
    expect(result.required).toContain("confirm");
  });

  it("offers delete and cancel options", () => {
    const result = elicitDeleteConfirmation("Test Story");

    expect(result.properties.confirm.enum).toContain("delete");
    expect(result.properties.confirm.enum).toContain("cancel");
  });

  it("includes a warning about permanent deletion", () => {
    const result = elicitDeleteConfirmation("Important Page");
    expect(result.message.toLowerCase()).toContain("permanently");
    expect(result.message.toLowerCase()).toContain("cannot be undone");
  });

  it("has human-readable enumNames", () => {
    const result = elicitDeleteConfirmation("Test Story");

    expect(result.properties.confirm.enumNames).toHaveLength(2);
    result.properties.confirm.enumNames!.forEach((name) => {
      expect(typeof name).toBe("string");
      expect(name.length).toBeGreaterThan(5);
    });
  });

  it("includes the story name in the message", () => {
    const result = elicitDeleteConfirmation("Product Page");
    expect(result.message).toContain("Product Page");
  });
});

// ── elicitSectionApproval() ────────────────────────────────────────

describe("elicitSectionApproval()", () => {
  it("returns a valid elicitation schema", () => {
    const result = elicitSectionApproval("hero");

    expect(result.message).toContain("hero");
    expect(result.properties.action).toBeDefined();
    expect(result.properties.action.type).toBe("string");
    expect(result.required).toContain("action");
  });

  it("offers approve, modify, and reject options", () => {
    const result = elicitSectionApproval("features");

    expect(result.properties.action.enum).toContain("approve");
    expect(result.properties.action.enum).toContain("modify");
    expect(result.properties.action.enum).toContain("reject");
  });

  it("defaults to approve", () => {
    const result = elicitSectionApproval("hero");
    expect(result.properties.action.default).toBe("approve");
  });

  it("has human-readable enumNames for each option", () => {
    const result = elicitSectionApproval("cta");

    expect(result.properties.action.enumNames).toHaveLength(3);
    result.properties.action.enumNames!.forEach((name) => {
      expect(typeof name).toBe("string");
      expect(name.length).toBeGreaterThan(5);
    });
  });

  it("includes component type in the message", () => {
    const result = elicitSectionApproval("testimonials");
    expect(result.message).toContain("testimonials");
  });

  it("includes section summary when provided", () => {
    const result = elicitSectionApproval(
      "hero",
      'Headline: "Welcome"\nSubheadline: "To our site"'
    );
    expect(result.message).toContain("Welcome");
    expect(result.message).toContain("To our site");
  });

  it("works without a section summary", () => {
    const result = elicitSectionApproval("faq");
    expect(result.message).toContain("faq");
    expect(result.message).not.toContain("undefined");
  });
});

// ── elicitPageConfirmation() ───────────────────────────────────────

describe("elicitPageConfirmation()", () => {
  it("returns a valid elicitation schema", () => {
    const result = elicitPageConfirmation("My Page", 3, [
      "hero",
      "features",
      "cta",
    ]);

    expect(result.message).toContain("My Page");
    expect(result.properties.action).toBeDefined();
    expect(result.properties.action.type).toBe("string");
    expect(result.required).toContain("action");
  });

  it("offers draft, publish, and discard options", () => {
    const result = elicitPageConfirmation("Test", 1, ["hero"]);

    expect(result.properties.action.enum).toContain("draft");
    expect(result.properties.action.enum).toContain("publish");
    expect(result.properties.action.enum).toContain("discard");
  });

  it("defaults to draft", () => {
    const result = elicitPageConfirmation("Test", 1, ["hero"]);
    expect(result.properties.action.default).toBe("draft");
  });

  it("has human-readable enumNames for each option", () => {
    const result = elicitPageConfirmation("Test", 1, ["hero"]);

    expect(result.properties.action.enumNames).toHaveLength(3);
    result.properties.action.enumNames!.forEach((name) => {
      expect(typeof name).toBe("string");
      expect(name.length).toBeGreaterThan(5);
    });
  });

  it("includes the page name in the message", () => {
    const result = elicitPageConfirmation("About Us", 2, ["hero", "text"]);
    expect(result.message).toContain("About Us");
  });

  it("includes the section count in the message", () => {
    const result = elicitPageConfirmation("Test", 4, [
      "hero",
      "features",
      "faq",
      "cta",
    ]);
    expect(result.message).toContain("4");
  });

  it("lists section types in the message", () => {
    const result = elicitPageConfirmation("Test", 3, [
      "hero",
      "features",
      "cta",
    ]);
    expect(result.message).toContain("hero");
    expect(result.message).toContain("features");
    expect(result.message).toContain("cta");
  });

  it("handles singular section count", () => {
    const result = elicitPageConfirmation("Test", 1, ["hero"]);
    expect(result.message).toContain("1 section");
    expect(result.message).not.toContain("1 sections");
  });

  it("handles plural section count", () => {
    const result = elicitPageConfirmation("Test", 3, [
      "hero",
      "features",
      "cta",
    ]);
    expect(result.message).toContain("3 sections");
  });
});

// ── Integration patterns ───────────────────────────────────────────

describe("Elicitation integration patterns", () => {
  it("elicitComponentType enum can be used with tryElicit", async () => {
    const components = ["hero", "faq"];
    const picker = elicitComponentType(components);

    const mockServer = {
      getClientCapabilities: () => ({ elicitation: {} }),
      elicitInput: async () => ({
        action: "accept",
        content: { componentType: "hero" },
      }),
    } as any;

    const result = await tryElicit(
      mockServer,
      picker.message,
      picker.properties,
      picker.required
    );

    expect(result.accepted).toBe(true);
    expect(result.content?.componentType).toBe("hero");
  });

  it("elicitPlanApproval can be used with tryElicit", async () => {
    const plan = elicitPlanApproval("1. hero\n2. cta");

    const mockServer = {
      getClientCapabilities: () => ({ elicitation: {} }),
      elicitInput: async () => ({
        action: "accept",
        content: { approval: "approve" },
      }),
    } as any;

    const result = await tryElicit(
      mockServer,
      plan.message,
      plan.properties,
      plan.required
    );

    expect(result.accepted).toBe(true);
    expect(result.content?.approval).toBe("approve");
  });

  it("elicitPublishConfirmation can be used with tryElicit", async () => {
    const publish = elicitPublishConfirmation("My Page");

    const mockServer = {
      getClientCapabilities: () => ({ elicitation: {} }),
      elicitInput: async () => ({
        action: "accept",
        content: { publish: "publish" },
      }),
    } as any;

    const result = await tryElicit(
      mockServer,
      publish.message,
      publish.properties,
      publish.required
    );

    expect(result.accepted).toBe(true);
    expect(result.content?.publish).toBe("publish");
  });

  it("elicitDeleteConfirmation can be used with tryElicit", async () => {
    const del = elicitDeleteConfirmation("Old Story");

    const mockServer = {
      getClientCapabilities: () => ({ elicitation: {} }),
      elicitInput: async () => ({
        action: "accept",
        content: { confirm: "delete" },
      }),
    } as any;

    const result = await tryElicit(
      mockServer,
      del.message,
      del.properties,
      del.required
    );

    expect(result.accepted).toBe(true);
    expect(result.content?.confirm).toBe("delete");
  });

  it("elicitSectionApproval can be used with tryElicit", async () => {
    const approval = elicitSectionApproval("hero", 'Headline: "Welcome"');

    const mockServer = {
      getClientCapabilities: () => ({ elicitation: {} }),
      elicitInput: async () => ({
        action: "accept",
        content: { action: "approve" },
      }),
    } as any;

    const result = await tryElicit(
      mockServer,
      approval.message,
      approval.properties,
      approval.required
    );

    expect(result.accepted).toBe(true);
    expect(result.content?.action).toBe("approve");
  });

  it("elicitSectionApproval modify action can be used with tryElicit", async () => {
    const approval = elicitSectionApproval("features");

    const mockServer = {
      getClientCapabilities: () => ({ elicitation: {} }),
      elicitInput: async () => ({
        action: "accept",
        content: { action: "modify" },
      }),
    } as any;

    const result = await tryElicit(
      mockServer,
      approval.message,
      approval.properties,
      approval.required
    );

    expect(result.accepted).toBe(true);
    expect(result.content?.action).toBe("modify");
  });

  it("elicitPageConfirmation can be used with tryElicit", async () => {
    const confirm = elicitPageConfirmation("My Page", 3, [
      "hero",
      "features",
      "cta",
    ]);

    const mockServer = {
      getClientCapabilities: () => ({ elicitation: {} }),
      elicitInput: async () => ({
        action: "accept",
        content: { action: "draft" },
      }),
    } as any;

    const result = await tryElicit(
      mockServer,
      confirm.message,
      confirm.properties,
      confirm.required
    );

    expect(result.accepted).toBe(true);
    expect(result.content?.action).toBe("draft");
  });

  it("elicitPageConfirmation discard action can be used with tryElicit", async () => {
    const confirm = elicitPageConfirmation("Test", 1, ["hero"]);

    const mockServer = {
      getClientCapabilities: () => ({ elicitation: {} }),
      elicitInput: async () => ({
        action: "accept",
        content: { action: "discard" },
      }),
    } as any;

    const result = await tryElicit(
      mockServer,
      confirm.message,
      confirm.properties,
      confirm.required
    );

    expect(result.accepted).toBe(true);
    expect(result.content?.action).toBe("discard");
  });

  it("graceful degradation preserves all schema shapes", () => {
    // Verify all schema generators return compatible shapes
    const schemas = [
      elicitComponentType(["hero", "faq"]),
      elicitPlanApproval("plan summary"),
      elicitPublishConfirmation("page name"),
      elicitContentType(),
      elicitDeleteConfirmation("story name"),
      elicitSectionApproval("hero", "Headline: Test"),
      elicitPageConfirmation("page", 2, ["hero", "cta"]),
    ];

    schemas.forEach((schema) => {
      expect(schema.message).toBeTruthy();
      expect(typeof schema.properties).toBe("object");
      expect(Object.keys(schema.properties).length).toBeGreaterThan(0);
      expect(Array.isArray(schema.required)).toBe(true);
      expect(schema.required.length).toBeGreaterThan(0);

      // Every property should have a type
      Object.values(schema.properties).forEach((prop: ElicitationProperty) => {
        expect(["string", "number", "boolean", "array"]).toContain(prop.type);
      });
    });
  });
});
