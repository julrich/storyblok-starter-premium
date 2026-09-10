import { traverse } from "object-traversal";

interface StoredFolderValue {
  driveId: string;
  folderId: string;
  folderName: string;
  folderPath: string;
  siteId: string;
  webUrl: string;
}

interface GraphDriveItem {
  id: string;
  name: string;
  webUrl: string;
  size: number;
  file?: { mimeType: string };
  folder?: { childCount: number };
  "@microsoft.graph.downloadUrl"?: string;
}

interface DownloadItem {
  name: string;
  url: string;
  format: string;
  size: string;
  description: string;
}

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

async function acquireGraphToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.accessToken;
  }

  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error(
      "SharePoint integration requires AZURE_TENANT_ID, AZURE_CLIENT_ID, and AZURE_CLIENT_SECRET",
    );
  }

  const tokenUrl = `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://graph.microsoft.com/.default",
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    throw new Error(`Failed to acquire Graph token: ${res.status}`);
  }

  const data = await res.json();
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return cachedToken.accessToken;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function extractFormat(name: string): string {
  const ext = name.split(".").pop()?.toUpperCase();
  return ext || "";
}

async function fetchFolderFiles(
  folder: StoredFolderValue,
): Promise<DownloadItem[]> {
  const token = await acquireGraphToken();
  const items: GraphDriveItem[] = [];

  let url = `https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(folder.driveId)}/items/${encodeURIComponent(folder.folderId)}/children?$select=id,name,size,file,webUrl,@microsoft.graph.downloadUrl&$orderby=name`;

  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      console.error(
        `SharePoint folder fetch failed: ${res.status} for folder ${folder.folderId}`,
      );
      return [];
    }

    const data = await res.json();
    items.push(...(data.value || []));
    url = data["@odata.nextLink"] || "";
  }

  return items
    .filter((item) => item.file)
    .map((item) => ({
      name: item.name,
      url: item.webUrl,
      format: extractFormat(item.name),
      size: formatFileSize(item.size),
      description: "",
    }));
}

/**
 * Walks the story content tree, finds downloads components with a
 * `sharepointFolder` value, fetches the folder's files from Microsoft
 * Graph API, and populates the `download` array with the results.
 */
export async function resolveSharePointFolders(
  content: Record<string, any>,
): Promise<void> {
  if (!process.env.AZURE_TENANT_ID) return;

  const pending: Array<{
    parent: Record<string, any>;
    folder: StoredFolderValue;
  }> = [];

  traverse(content, ({ value }) => {
    if (
      value &&
      typeof value === "object" &&
      value.component === "downloads" &&
      value.sharepointFolder &&
      typeof value.sharepointFolder === "string"
    ) {
      try {
        const folder: StoredFolderValue = JSON.parse(value.sharepointFolder);
        if (folder.driveId && folder.folderId) {
          pending.push({ parent: value, folder });
        }
      } catch {
        // Invalid JSON — skip
      }
    }
  });

  await Promise.all(
    pending.map(async ({ parent, folder }) => {
      const files = await fetchFolderFiles(folder);
      if (files.length > 0) {
        parent.download = files;
      }
    }),
  );
}
