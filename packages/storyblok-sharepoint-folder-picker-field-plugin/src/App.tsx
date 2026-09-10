import { useFieldPlugin } from "@storyblok/field-plugin/react";
import { SharePointFolderPicker } from "./SharePointFolderPicker";
import type { StoredFolderValue, PluginOptions } from "./types";

function parseStoredValue(content: unknown): StoredFolderValue | undefined {
  if (!content || typeof content !== "string") return undefined;
  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed.folderId === "string") {
      return parsed as StoredFolderValue;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

function parseOptions(
  options: Record<string, string> | undefined,
): PluginOptions {
  return {
    proxyUrl: options?.proxyUrl || "/api/sharepoint/token",
    siteHostname: options?.siteHostname || "",
    sitePath: options?.sitePath || "",
    driveId: options?.driveId || "",
  };
}

export function App() {
  const plugin = useFieldPlugin();

  if (plugin.type === "loading") {
    return <div>Loading…</div>;
  }

  if (plugin.type === "error") {
    return <div>Error: {plugin.error?.message}</div>;
  }

  const value = parseStoredValue(plugin.data.content);
  const options = parseOptions(
    plugin.data.options as Record<string, string> | undefined,
  );

  return (
    <SharePointFolderPicker
      value={value}
      token={plugin.data.token ?? ""}
      options={options}
      onChange={(folder: StoredFolderValue | null) =>
        plugin.actions.setContent(folder ? JSON.stringify(folder) : "")
      }
    />
  );
}
