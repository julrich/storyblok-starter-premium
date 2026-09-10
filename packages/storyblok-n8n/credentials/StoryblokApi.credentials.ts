import {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from "n8n-workflow";

export class StoryblokApi implements ICredentialType {
  name = "storyblokApi";
  displayName = "Storyblok API";
  documentationUrl = "https://www.storyblok.com/docs/api";

  properties: INodeProperties[] = [
    {
      displayName: "Space ID",
      name: "spaceId",
      type: "string",
      default: "",
      required: true,
      description: "Your Storyblok space ID (numeric, without #)",
      placeholder: "123456",
    },
    {
      displayName: "Preview API Token",
      name: "apiToken",
      type: "string",
      typeOptions: { password: true },
      default: "",
      required: true,
      description:
        "Preview API token for the Content Delivery API (read operations)",
    },
    {
      displayName: "Management OAuth Token",
      name: "oauthToken",
      type: "string",
      typeOptions: { password: true },
      default: "",
      required: true,
      description:
        "Personal access token or OAuth token for the Management API (write operations)",
    },
  ];

  authenticate: IAuthenticateGeneric = {
    type: "generic",
    properties: {
      headers: {
        Authorization: "={{$credentials.oauthToken}}",
      },
    },
  };

  test: ICredentialTestRequest = {
    request: {
      baseURL: "https://mapi.storyblok.com",
      url: "=/v1/spaces/{{$credentials.spaceId}}",
      method: "GET",
    },
  };
}
