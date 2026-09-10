import {
  importContentIntoStory,
  insertContentAtPosition,
} from "../nodes/StoryblokKickstartDs/GenericFunctions";

// ─── Mock Storyblok Client ───────────────────────────────────────────

const mockGet = jest.fn();
const mockPut = jest.fn();

jest.mock("storyblok-js-client", () => {
  return jest.fn().mockImplementation(() => ({
    get: mockGet,
    put: mockPut,
  }));
});

import StoryblokClient from "storyblok-js-client";

describe("Import Content", () => {
  let client: StoryblokClient;
  const spaceId = "123456";

  beforeEach(() => {
    jest.clearAllMocks();
    client = new StoryblokClient({ oauthToken: "test-token" });
  });

  // ── Helpers ───────────────────────────────────────────────────────

  function mockStoryWithPrompter(prompterUid: string) {
    return {
      data: {
        story: {
          id: 999,
          name: "Test Page",
          slug: "test-page",
          content: {
            component: "page",
            section: [
              {
                _uid: "section-1",
                component: "section",
                headline_text: "Existing Section",
              },
              {
                _uid: prompterUid,
                component: "prompter",
                prompt: "Generate hero content",
              },
              {
                _uid: "section-3",
                component: "section",
                headline_text: "Another Section",
              },
            ],
          },
        },
      },
    };
  }

  // ── Tests ─────────────────────────────────────────────────────────

  describe("importContentIntoStory", () => {
    it("should replace prompter with new sections", async () => {
      const prompterUid = "prompter-abc-123";

      mockGet.mockResolvedValue(mockStoryWithPrompter(prompterUid));
      mockPut.mockResolvedValue({
        data: { story: { id: 999, content: { section: [] } } },
      });

      const newSections = [
        {
          component: "section",
          components: [
            {
              component: "hero",
              headline: "Generated Hero",
              text: "AI-generated content",
            },
          ],
        },
        {
          component: "section",
          headline_text: "Generated Features",
        },
      ];

      await importContentIntoStory(
        client,
        spaceId,
        "999",
        prompterUid,
        newSections,
        false
      );

      // Verify the PUT call
      expect(mockPut).toHaveBeenCalledTimes(1);
      const putCall = mockPut.mock.calls[0];
      expect(putCall[0]).toBe(`spaces/${spaceId}/stories/999`);

      const putBody = putCall[1];
      expect(putBody.publish).toBe(0);

      // The section array should have the prompter replaced
      const sections = putBody.story.content.section;
      expect(sections).toHaveLength(4); // 1 existing + 2 new + 1 existing
      expect(sections[0]._uid).toBe("section-1");
      expect(sections[1].component).toBe("section");
      expect(sections[1].components[0].component).toBe("hero");
      expect(sections[2].component).toBe("section");
      expect(sections[3]._uid).toBe("section-3");
    });

    it("should publish when publish flag is true", async () => {
      const prompterUid = "prompter-publish";

      mockGet.mockResolvedValue(mockStoryWithPrompter(prompterUid));
      mockPut.mockResolvedValue({
        data: { story: { id: 999 } },
      });

      await importContentIntoStory(
        client,
        spaceId,
        "999",
        prompterUid,
        [
          {
            component: "section",
            components: [{ component: "hero", headline: "Test" }],
          },
        ],
        true // publish = true
      );

      const putBody = mockPut.mock.calls[0][1];
      expect(putBody.publish).toBe(1);
    });

    it("should throw when prompter UID is not found", async () => {
      mockGet.mockResolvedValue(mockStoryWithPrompter("prompter-real-uid"));

      await expect(
        importContentIntoStory(
          client,
          spaceId,
          "999",
          "nonexistent-uid",
          [{ component: "section", components: [{ component: "hero" }] }],
          false
        )
      ).rejects.toThrow(/not found/);
    });

    it("should include available UIDs in error message when prompter not found", async () => {
      mockGet.mockResolvedValue(mockStoryWithPrompter("prompter-real-uid"));

      try {
        await importContentIntoStory(
          client,
          spaceId,
          "999",
          "wrong-uid",
          [{ component: "section", components: [{ component: "hero" }] }],
          false
        );
        fail("Should have thrown");
      } catch (error: any) {
        expect(error.message).toContain("section-1");
        expect(error.message).toContain("prompter-real-uid");
        expect(error.message).toContain("section-3");
      }
    });

    it("should throw when story has no section array", async () => {
      mockGet.mockResolvedValue({
        data: {
          story: {
            id: 999,
            content: {
              component: "page",
              // no section array
            },
          },
        },
      });

      await expect(
        importContentIntoStory(
          client,
          spaceId,
          "999",
          "any-uid",
          [{ component: "section", components: [{ component: "hero" }] }],
          false
        )
      ).rejects.toThrow(/section/);
    });

    it("should replace prompter with a single section", async () => {
      const prompterUid = "prompter-single";

      mockGet.mockResolvedValue(mockStoryWithPrompter(prompterUid));
      mockPut.mockResolvedValue({
        data: { story: { id: 999 } },
      });

      await importContentIntoStory(
        client,
        spaceId,
        "999",
        prompterUid,
        [
          {
            component: "section",
            components: [{ component: "faq", questions: [] }],
          },
        ],
        false
      );

      const sections = mockPut.mock.calls[0][1].story.content.section;
      expect(sections).toHaveLength(3); // 1 existing + 1 new + 1 existing
      expect(sections[1].component).toBe("section");
      expect(sections[1].components[0].component).toBe("faq");
    });
  });

  // ── Position-based insertion tests ────────────────────────────────

  describe("insertContentAtPosition", () => {
    function mockStoryWithSections() {
      return {
        data: {
          story: {
            id: 999,
            name: "Test Page",
            slug: "test-page",
            content: {
              component: "page",
              section: [
                {
                  _uid: "s-1",
                  component: "section",
                  components: [{ component: "hero", headline: "First" }],
                },
                { _uid: "s-2", component: "section", headline_text: "Second" },
                {
                  _uid: "s-3",
                  component: "section",
                  components: [{ component: "cta", headline: "Third" }],
                },
              ],
            },
          },
        },
      };
    }

    it("should insert at the beginning (position 0)", async () => {
      mockGet.mockResolvedValue(mockStoryWithSections());
      mockPut.mockResolvedValue({ data: { story: { id: 999 } } });

      await insertContentAtPosition(
        client,
        spaceId,
        "999",
        0,
        [
          {
            component: "section",
            components: [{ component: "text", text: "Prepended" }],
          },
        ],
        false
      );

      const sections = mockPut.mock.calls[0][1].story.content.section;
      expect(sections).toHaveLength(4);
      expect(sections[0].component).toBe("section");
      expect(sections[0].components[0].text).toBe("Prepended");
      expect(sections[1]._uid).toBe("s-1");
    });

    it("should append at the end (position -1)", async () => {
      mockGet.mockResolvedValue(mockStoryWithSections());
      mockPut.mockResolvedValue({ data: { story: { id: 999 } } });

      await insertContentAtPosition(
        client,
        spaceId,
        "999",
        -1,
        [
          {
            component: "section",
            components: [{ component: "faq", questions: [] }],
          },
        ],
        false
      );

      const sections = mockPut.mock.calls[0][1].story.content.section;
      expect(sections).toHaveLength(4);
      expect(sections[3].component).toBe("section");
      expect(sections[3].components[0].component).toBe("faq");
      expect(sections[0]._uid).toBe("s-1");
    });

    it("should insert at a specific middle index", async () => {
      mockGet.mockResolvedValue(mockStoryWithSections());
      mockPut.mockResolvedValue({ data: { story: { id: 999 } } });

      await insertContentAtPosition(
        client,
        spaceId,
        "999",
        2, // after s-1 and s-2
        [
          {
            component: "section",
            components: [{ component: "features", feature: [] }],
          },
          {
            component: "section",
            components: [{ component: "testimonials", testimonial: [] }],
          },
        ],
        false
      );

      const sections = mockPut.mock.calls[0][1].story.content.section;
      expect(sections).toHaveLength(5);
      expect(sections[0]._uid).toBe("s-1");
      expect(sections[1]._uid).toBe("s-2");
      expect(sections[2].component).toBe("section");
      expect(sections[2].components[0].component).toBe("features");
      expect(sections[3].component).toBe("section");
      expect(sections[3].components[0].component).toBe("testimonials");
      expect(sections[4]._uid).toBe("s-3");
    });

    it("should clamp position to array length if too large", async () => {
      mockGet.mockResolvedValue(mockStoryWithSections());
      mockPut.mockResolvedValue({ data: { story: { id: 999 } } });

      await insertContentAtPosition(
        client,
        spaceId,
        "999",
        100, // way past the end
        [{ component: "section", components: [{ component: "stats" }] }],
        false
      );

      const sections = mockPut.mock.calls[0][1].story.content.section;
      expect(sections).toHaveLength(4);
      expect(sections[3].component).toBe("section"); // appended at end
      expect(sections[3].components[0].component).toBe("stats");
    });

    it("should create section array if story has none", async () => {
      mockGet.mockResolvedValue({
        data: {
          story: {
            id: 999,
            content: { component: "page" },
          },
        },
      });
      mockPut.mockResolvedValue({ data: { story: { id: 999 } } });

      await insertContentAtPosition(
        client,
        spaceId,
        "999",
        0,
        [
          {
            component: "section",
            components: [{ component: "hero", headline: "Brand New" }],
          },
        ],
        false
      );

      const sections = mockPut.mock.calls[0][1].story.content.section;
      expect(sections).toHaveLength(1);
      expect(sections[0].component).toBe("section");
      expect(sections[0].components[0].headline).toBe("Brand New");
    });

    it("should not remove any existing sections", async () => {
      mockGet.mockResolvedValue(mockStoryWithSections());
      mockPut.mockResolvedValue({ data: { story: { id: 999 } } });

      await insertContentAtPosition(
        client,
        spaceId,
        "999",
        1,
        [
          {
            component: "section",
            components: [{ component: "text", text: "Inserted" }],
          },
        ],
        false
      );

      const sections = mockPut.mock.calls[0][1].story.content.section;
      // All 3 originals + 1 inserted = 4
      expect(sections).toHaveLength(4);
      expect(sections.filter((s: any) => s._uid).length).toBe(3);
    });

    it("should respect publish flag", async () => {
      mockGet.mockResolvedValue(mockStoryWithSections());
      mockPut.mockResolvedValue({ data: { story: { id: 999 } } });

      await insertContentAtPosition(
        client,
        spaceId,
        "999",
        0,
        [{ component: "section", components: [{ component: "hero" }] }],
        true
      );

      const putBody = mockPut.mock.calls[0][1];
      expect(putBody.publish).toBe(1);
    });
  });
});
