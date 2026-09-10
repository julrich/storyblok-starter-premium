import { NextApiRequest, NextApiResponse } from "next";
import Cors from "cors";
import {
  createStoryblokClient,
  importByPrompterReplacement,
  buildValidationRules,
  validateSections,
  formatValidationErrors,
  ServiceError,
  type ValidationRules,
} from "@kickstartds/storyblok-services";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";

// ─── Schema-driven validation ────────────────────────────────────────
// Load the dereferenced page schema from the Design System package and
// build validation rules once at module load.
let PAGE_VALIDATION_RULES: ValidationRules | null = null;
try {
  const schemaPath = resolve(
    dirname(require.resolve("@kickstartds/design-system/package.json")),
    "dist/components/page/page.schema.dereffed.json"
  );
  const pageSchema = JSON.parse(readFileSync(schemaPath, "utf-8"));
  PAGE_VALIDATION_RULES = buildValidationRules(pageSchema);
} catch {
  // Schema not available — validation will be skipped gracefully
  console.warn(
    "Could not load page schema for import validation — validation will be skipped"
  );
}

const cors = Cors({
  methods: ["POST"],
  origin: "*",
});

function runMiddleware(
  req: NextApiRequest,
  res: NextApiResponse,
  fn: Function
) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }

      return resolve(result);
    });
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    await runMiddleware(req, res, cors);

    // Deprecation notice — use /api/prompter/import instead
    res.setHeader("Deprecation", "true");
    res.setHeader("Sunset", "2026-06-01");
    res.setHeader("Link", '</api/prompter/import>; rel="successor-version"');
    console.warn(
      "[DEPRECATED] /api/import is deprecated. Use /api/prompter/import instead."
    );

    try {
      const { storyUid, prompterUid, page } = JSON.parse(req.body);

      if (!storyUid)
        return res.status(400).send({ error: "storyUid is required" });
      if (!prompterUid)
        return res.status(400).send({ error: "prompterUid is required" });
      if (!page) return res.status(400).send({ error: "page is required" });

      const spaceId = process.env.NEXT_STORYBLOK_SPACE_ID;
      const oauthToken = process.env.NEXT_STORYBLOK_OAUTH_TOKEN;

      if (!spaceId || !oauthToken) {
        return res.status(500).send({
          error:
            "Missing Storyblok environment variables (NEXT_STORYBLOK_SPACE_ID, NEXT_STORYBLOK_OAUTH_TOKEN)",
        });
      }

      const client = createStoryblokClient({
        spaceId,
        apiToken: "",
        oauthToken,
      });

      // Validate sections against the Design System schema before writing
      const sections = page.content.section;
      if (PAGE_VALIDATION_RULES) {
        const validationResult = validateSections(
          sections,
          PAGE_VALIDATION_RULES
        );
        if (!validationResult.valid) {
          return res.status(400).send({
            error: "Content validation failed",
            details: formatValidationErrors(validationResult.errors),
          });
        }
      }

      const story = await importByPrompterReplacement(client, spaceId, {
        storyUid,
        prompterUid,
        sections,
        publish: false,
      });

      res.status(200).send({ response: { data: { story } } });
    } catch (err) {
      if (err instanceof ServiceError) {
        console.error(`ServiceError [${err.code}]: ${err.message}`);
        res.status(500).send({ error: err.message });
      } else {
        console.error(err);
        res.status(500).send({ error: "failed", err });
      }
    }
  } else {
    return res.status(405).send({ error: "method not allowed" });
  }
}
