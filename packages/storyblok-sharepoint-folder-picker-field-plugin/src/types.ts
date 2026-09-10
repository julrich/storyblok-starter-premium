/** A SharePoint folder as returned by the Microsoft Graph API. */
export interface SharePointFolder {
  id: string;
  name: string;
  webUrl: string;
  parentPath: string;
  childCount: number;
}

/** The JSON value persisted to the Storyblok field. */
export interface StoredFolderValue {
  driveId: string;
  folderId: string;
  folderName: string;
  folderPath: string;
  siteId: string;
  webUrl: string;
}

/** Plugin options configured per-field in Storyblok. */
export interface PluginOptions {
  proxyUrl: string;
  siteHostname: string;
  sitePath: string;
  driveId: string;
}

/** A breadcrumb entry representing a navigation step. */
export interface BreadcrumbEntry {
  id: string | null; // null = drive root
  name: string;
}

/** Response shape from the token proxy. */
export interface TokenResponse {
  accessToken: string;
  expiresIn: number;
}

/** Microsoft Graph folder listing response. */
export interface GraphDriveItemsResponse {
  value: GraphDriveItem[];
  "@odata.nextLink"?: string;
}

/** A single driveItem from Microsoft Graph. */
export interface GraphDriveItem {
  id: string;
  name: string;
  webUrl: string;
  folder?: { childCount: number };
  parentReference?: {
    driveId: string;
    path: string;
  };
}

/** Microsoft Graph site response. */
export interface GraphSiteResponse {
  id: string;
  displayName: string;
  webUrl: string;
}

/** Microsoft Graph drives listing response. */
export interface GraphDrivesResponse {
  value: GraphDrive[];
}

/** A single drive from Microsoft Graph. */
export interface GraphDrive {
  id: string;
  name: string;
  driveType: string;
}
