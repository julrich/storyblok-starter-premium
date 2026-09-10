import {
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from "n8n-workflow";

export class OpenAiApi implements ICredentialType {
  name = "openAiApi";
  displayName = "OpenAI API";
  documentationUrl = "https://platform.openai.com/docs/api-reference";

  properties: INodeProperties[] = [
    {
      displayName: "API Key",
      name: "apiKey",
      type: "string",
      typeOptions: { password: true },
      default: "",
      required: true,
      description: "Your OpenAI API key (starts with sk-)",
      placeholder: "sk-...",
    },
  ];

  test: ICredentialTestRequest = {
    request: {
      baseURL: "https://api.openai.com",
      url: "/v1/models",
      method: "GET",
      headers: {
        Authorization: "=Bearer {{$credentials.apiKey}}",
      },
    },
  };
}
