import { NextApiRequest, NextApiResponse } from "next";
import Cors from "cors";
import {
  createOpenAiClient,
  generateStructuredContent,
  ServiceError,
} from "@kickstartds/storyblok-services";

class ApplicationError extends Error {
  constructor(message: string, public data: unknown = {}) {
    super(message);
  }
}

class UserError extends ApplicationError {}

const cors = Cors({
  methods: ["POST"],
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
  await runMiddleware(req, res, cors);

  // Deprecation notice — use /api/prompter/generate-section instead
  res.setHeader("Deprecation", "true");
  res.setHeader("Sunset", "2026-06-01");
  res.setHeader(
    "Link",
    '</api/prompter/generate-section>; rel="successor-version"'
  );
  console.warn(
    "[DEPRECATED] /api/content is deprecated. Use /api/prompter/generate-section instead."
  );

  const openAiKey = process.env.NEXT_OPENAI_API_KEY;

  try {
    if (!openAiKey) {
      throw new ApplicationError(
        "Missing environment variable NEXT_OPENAI_API_KEY"
      );
    }

    const { system, prompt, schema } = JSON.parse(req.body);

    if (!system) throw new UserError("system is required");
    if (!prompt) throw new UserError("prompt is required");
    if (!schema) throw new UserError("schema is required");

    const client = createOpenAiClient({ apiKey: openAiKey });
    const result = await generateStructuredContent(client, {
      system,
      prompt,
      schema,
    });

    res.status(200).send({ content: JSON.stringify(result) });
  } catch (err: unknown) {
    if (err instanceof UserError) {
      console.warn("UserError", err);

      res.status(400).send({
        error: err.message,
        data: err.data,
      });
    } else if (err instanceof ServiceError) {
      console.error(`ServiceError [${err.code}]: ${err.message}`);
      res.status(500).send({
        error: err.message,
      });
    } else if (err instanceof ApplicationError) {
      console.error(`${err.message}: ${JSON.stringify(err.data)}`);
      res.status(500).send({
        error: err.message,
      });
    } else {
      console.error(err);
      res.status(500).send({
        error: "There was an error processing your request",
      });
    }
  }
}
