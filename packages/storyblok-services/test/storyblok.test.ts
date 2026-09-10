import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import {
  getStoryManagement,
  saveStory,
  importByPrompterReplacement,
  importAtPosition,
  createStoryblokClient,
  PrompterNotFoundError,
  StoryblokApiError,
} from "../src/index.js";

// ─── Mock StoryblokClient ─────────────────────────────────────────────

function createMockClient(storyData: Record<string, any>) {
  return {
    get: jest.fn<(...args: any[]) => any>().mockResolvedValue({
      data: { story: structuredClone(storyData) },
    }),
    put: jest
      .fn<(...args: any[]) => any>()
      .mockImplementation(async (_path: string, payload: any) => ({
        data: { story: payload.story },
      })),
  } as any;
}

const SPACE_ID = "12345";

function makeStory(sections: Record<string, unknown>[]) {
  return {
    id: 100,
    name: "Test Story",
    content: {
      component: "page",
      section: sections,
    },
  };
}

describe("Storyblok services", () => {
  describe("createStoryblokClient", () => {
    it("should create a client with the provided oauthToken", () => {
      const client = createStoryblokClient({
        spaceId: "123",
        oauthToken: "test-token",
      });
      expect(client).toBeDefined();
    });
  });

  describe("getStoryManagement", () => {
    it("should fetch a story by ID", async () => {
      const storyData = makeStory([]);
      const client = createMockClient(storyData);

      const result = await getStoryManagement(client, SPACE_ID, "100");

      expect(client.get).toHaveBeenCalledWith(`spaces/${SPACE_ID}/stories/100`);
      expect(result.name).toBe("Test Story");
    });
  });

  describe("saveStory", () => {
    it("should save as draft by default", async () => {
      const storyData = makeStory([]);
      const client = createMockClient(storyData);

      await saveStory(client, SPACE_ID, "100", storyData);

      expect(client.put).toHaveBeenCalledWith(
        `spaces/${SPACE_ID}/stories/100`,
        { story: storyData, publish: 0 }
      );
    });

    it("should publish when requested", async () => {
      const storyData = makeStory([]);
      const client = createMockClient(storyData);

      await saveStory(client, SPACE_ID, "100", storyData, true);

      expect(client.put).toHaveBeenCalledWith(
        `spaces/${SPACE_ID}/stories/100`,
        { story: storyData, publish: 1 }
      );
    });
  });

  describe("importByPrompterReplacement", () => {
    it("should replace prompter with new sections", async () => {
      const storyData = makeStory([
        { _uid: "sec-1", component: "hero" },
        { _uid: "prompter-1", component: "prompter" },
        { _uid: "sec-2", component: "faq" },
      ]);
      const client = createMockClient(storyData);
      const newSections = [
        { component: "cta", headline: "A" },
        { component: "text", body: "B" },
      ];

      await importByPrompterReplacement(client, SPACE_ID, {
        storyUid: "100",
        prompterUid: "prompter-1",
        sections: newSections,
      });

      const savedStory = client.put.mock.calls[0][1].story;
      expect(savedStory.content.section).toHaveLength(4);
      expect(savedStory.content.section[0]._uid).toBe("sec-1");
      expect(savedStory.content.section[1].component).toBe("cta");
      expect(savedStory.content.section[2].component).toBe("text");
      expect(savedStory.content.section[3]._uid).toBe("sec-2");
    });

    it("should publish when publish=true", async () => {
      const storyData = makeStory([
        { _uid: "prompter-1", component: "prompter" },
      ]);
      const client = createMockClient(storyData);

      await importByPrompterReplacement(client, SPACE_ID, {
        storyUid: "100",
        prompterUid: "prompter-1",
        sections: [{ component: "hero" }],
        publish: true,
      });

      expect(client.put.mock.calls[0][1].publish).toBe(1);
    });

    it("should throw PrompterNotFoundError with available UIDs", async () => {
      const storyData = makeStory([
        { _uid: "sec-1", component: "hero" },
        { _uid: "sec-2", component: "faq" },
      ]);
      const client = createMockClient(storyData);

      await expect(
        importByPrompterReplacement(client, SPACE_ID, {
          storyUid: "100",
          prompterUid: "nonexistent",
          sections: [{ component: "hero" }],
        })
      ).rejects.toThrow(PrompterNotFoundError);

      try {
        await importByPrompterReplacement(client, SPACE_ID, {
          storyUid: "100",
          prompterUid: "nonexistent",
          sections: [{ component: "hero" }],
        });
      } catch (error) {
        expect((error as PrompterNotFoundError).details?.availableUids).toEqual(
          ["hero:sec-1", "faq:sec-2"]
        );
      }
    });

    it("should throw when story has no section array", async () => {
      const client = createMockClient({
        id: 100,
        content: { component: "page" },
      });

      await expect(
        importByPrompterReplacement(client, SPACE_ID, {
          storyUid: "100",
          prompterUid: "p-1",
          sections: [{ component: "hero" }],
        })
      ).rejects.toThrow(StoryblokApiError);
    });
  });

  describe("importAtPosition", () => {
    it("should insert at the beginning (position 0)", async () => {
      const storyData = makeStory([
        { _uid: "sec-1", component: "hero" },
        { _uid: "sec-2", component: "faq" },
      ]);
      const client = createMockClient(storyData);

      await importAtPosition(client, SPACE_ID, {
        storyUid: "100",
        position: 0,
        sections: [{ component: "cta", headline: "New" }],
      });

      const saved = client.put.mock.calls[0][1].story;
      expect(saved.content.section[0].component).toBe("cta");
      expect(saved.content.section).toHaveLength(3);
    });

    it("should append at the end (position -1)", async () => {
      const storyData = makeStory([{ _uid: "sec-1", component: "hero" }]);
      const client = createMockClient(storyData);

      await importAtPosition(client, SPACE_ID, {
        storyUid: "100",
        position: -1,
        sections: [{ component: "faq" }],
      });

      const saved = client.put.mock.calls[0][1].story;
      expect(saved.content.section).toHaveLength(2);
      expect(saved.content.section[1].component).toBe("faq");
    });

    it("should insert at a specific middle index", async () => {
      const storyData = makeStory([
        { _uid: "sec-1", component: "hero" },
        { _uid: "sec-2", component: "faq" },
        { _uid: "sec-3", component: "text" },
      ]);
      const client = createMockClient(storyData);

      await importAtPosition(client, SPACE_ID, {
        storyUid: "100",
        position: 1,
        sections: [{ component: "cta" }],
      });

      const saved = client.put.mock.calls[0][1].story;
      expect(saved.content.section[1].component).toBe("cta");
      expect(saved.content.section).toHaveLength(4);
    });

    it("should clamp position to array length if too large", async () => {
      const storyData = makeStory([{ _uid: "sec-1", component: "hero" }]);
      const client = createMockClient(storyData);

      await importAtPosition(client, SPACE_ID, {
        storyUid: "100",
        position: 999,
        sections: [{ component: "cta" }],
      });

      const saved = client.put.mock.calls[0][1].story;
      expect(saved.content.section).toHaveLength(2);
      // Should be appended at end since 999 > length
      expect(saved.content.section[1].component).toBe("cta");
    });

    it("should create section array if story has none", async () => {
      const client = createMockClient({
        id: 100,
        content: { component: "page" },
      });

      await importAtPosition(client, SPACE_ID, {
        storyUid: "100",
        position: 0,
        sections: [{ component: "hero" }],
      });

      const saved = client.put.mock.calls[0][1].story;
      expect(saved.content.section).toHaveLength(1);
      expect(saved.content.section[0].component).toBe("hero");
    });

    it("should not remove any existing sections", async () => {
      const storyData = makeStory([
        { _uid: "sec-1", component: "hero" },
        { _uid: "sec-2", component: "faq" },
      ]);
      const client = createMockClient(storyData);

      await importAtPosition(client, SPACE_ID, {
        storyUid: "100",
        position: 1,
        sections: [{ component: "cta" }],
      });

      const saved = client.put.mock.calls[0][1].story;
      expect(saved.content.section).toHaveLength(3);
      expect(
        saved.content.section.find((s: any) => s._uid === "sec-1")
      ).toBeDefined();
      expect(
        saved.content.section.find((s: any) => s._uid === "sec-2")
      ).toBeDefined();
    });

    it("should respect publish flag", async () => {
      const storyData = makeStory([]);
      const client = createMockClient(storyData);

      await importAtPosition(client, SPACE_ID, {
        storyUid: "100",
        position: 0,
        sections: [{ component: "hero" }],
        publish: true,
      });

      expect(client.put.mock.calls[0][1].publish).toBe(1);
    });
  });
});
