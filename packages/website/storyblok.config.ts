import { defineConfig } from "storyblok/config";

export default defineConfig({
  region: (process.env.STORYBLOK_REGION ?? "eu") as
    | "eu"
    | "us"
    | "cn"
    | "ca"
    | "ap",
  space: process.env.NEXT_STORYBLOK_SPACE_ID,
  verbose: false,
  api: {
    maxRetries: 3,
    maxConcurrency: 6,
  },
  modules: {
    components: {
      push: {},
    },
  },
});
