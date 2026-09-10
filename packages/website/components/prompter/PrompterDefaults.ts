import { DeepPartial } from "../helpers";
import { PrompterProps } from "./PrompterProps";

const defaults: DeepPartial<PrompterProps> = {
  mode: "section",
  includeStory: true,
  useIdea: true,
  relatedStories: [],
  componentTypes: [],
  contentType: "page",
  uploadAssets: true,
  systemPrompt:
    "You are a helpful assistant that generates high-quality website content based on the provided context and user instructions. Ensure the content is engaging, relevant, and well-structured.",
};

export default defaults;
