import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  BreadcrumbEntry,
  GraphDriveItem,
  GraphDriveItemsResponse,
  GraphDrivesResponse,
  GraphSiteResponse,
  PluginOptions,
  SharePointFolder,
  StoredFolderValue,
  TokenResponse,
} from "./types";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

interface SharePointFolderPickerProps {
  value: StoredFolderValue | undefined;
  token: string;
  options: PluginOptions;
  onChange: (folder: StoredFolderValue | null) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────

function toSharePointFolder(item: GraphDriveItem): SharePointFolder {
  const parentPath = item.parentReference?.path
    ? decodeURIComponent(
        item.parentReference.path.replace(/^\/drives\/[^/]+\/root:?\/?/, "/"),
      )
    : "/";
  return {
    id: item.id,
    name: item.name,
    webUrl: item.webUrl,
    parentPath: parentPath === "" ? "/" : parentPath,
    childCount: item.folder?.childCount ?? 0,
  };
}

function buildFolderPath(
  breadcrumb: BreadcrumbEntry[],
  folderName: string,
): string {
  const parts = breadcrumb.slice(1).map((b) => b.name);
  parts.push(folderName);
  return "/" + parts.join("/");
}

// ─── Component ────────────────────────────────────────────────────────

export function SharePointFolderPicker({
  value,
  token,
  options,
  onChange,
}: SharePointFolderPickerProps) {
  const [folders, setFolders] = useState<SharePointFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbEntry[]>([
    { id: null, name: "Root" },
  ]);
  const [staleWarning, setStaleWarning] = useState(false);

  // Graph token + drive/site context
  const [graphToken, setGraphToken] = useState<string | null>(null);
  const [driveId, setDriveId] = useState<string | null>(
    options.driveId || null,
  );
  const [siteId, setSiteId] = useState<string | null>(null);
  const tokenExpiresAt = useRef<number>(0);

  // ── Token acquisition ───────────────────────────────────────────────

  const acquireToken = useCallback(async (): Promise<string> => {
    // Return cached token if still valid (with 60s buffer)
    if (graphToken && Date.now() < tokenExpiresAt.current - 60_000) {
      return graphToken;
    }

    const proxyUrl = options.proxyUrl || "/api/sharepoint/token";
    const url = new URL(proxyUrl, window.location.origin);
    url.searchParams.set("token", token);

    const res = await fetch(url.toString());
    if (res.status === 401 || res.status === 403) {
      throw new Error("SharePoint access denied. Contact your administrator.");
    }
    if (!res.ok) {
      throw new Error(
        "Unable to connect to SharePoint. Check proxy configuration.",
      );
    }

    const data: TokenResponse = await res.json();
    setGraphToken(data.accessToken);
    tokenExpiresAt.current = Date.now() + data.expiresIn * 1000;
    return data.accessToken;
  }, [graphToken, options.proxyUrl, token]);

  // ── Graph API helpers ───────────────────────────────────────────────

  const graphFetch = useCallback(
    async <T,>(path: string): Promise<T> => {
      const accessToken = await acquireToken();
      const res = await fetch(`${GRAPH_BASE}${path}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.status === 401 || res.status === 403) {
        throw new Error(
          "SharePoint access denied. Contact your administrator.",
        );
      }
      if (res.status === 404) {
        throw new Error(
          "SharePoint site or drive not found. Check plugin options.",
        );
      }
      if (!res.ok) {
        throw new Error(`Graph API error: ${res.status}`);
      }
      return res.json();
    },
    [acquireToken],
  );

  // ── Resolve site & drive ─────────────────────────────────────────────

  const resolveDrive = useCallback(async (): Promise<{
    resolvedSiteId: string;
    resolvedDriveId: string;
  }> => {
    if (siteId && driveId) {
      return { resolvedSiteId: siteId, resolvedDriveId: driveId };
    }

    // Resolve site
    let resolvedSiteId = siteId;
    if (!resolvedSiteId) {
      const { siteHostname, sitePath } = options;
      if (!siteHostname) {
        throw new Error(
          "SharePoint site hostname not configured. Set the siteHostname plugin option.",
        );
      }
      const siteLookupPath = sitePath
        ? `/sites/${siteHostname}:/sites/${sitePath}`
        : `/sites/${siteHostname}`;
      const site = await graphFetch<GraphSiteResponse>(siteLookupPath);
      resolvedSiteId = site.id;
      setSiteId(resolvedSiteId);
    }

    // Resolve drive
    let resolvedDriveId = driveId;
    if (!resolvedDriveId) {
      const drives = await graphFetch<GraphDrivesResponse>(
        `/sites/${resolvedSiteId}/drives`,
      );
      const docLib = drives.value.find(
        (d) => d.driveType === "documentLibrary",
      );
      if (!docLib) {
        throw new Error("No document library found on this SharePoint site.");
      }
      resolvedDriveId = docLib.id;
      setDriveId(resolvedDriveId);
    }

    return {
      resolvedSiteId: resolvedSiteId!,
      resolvedDriveId: resolvedDriveId!,
    };
  }, [siteId, driveId, options, graphFetch]);

  // ── Fetch folders ────────────────────────────────────────────────────

  const fetchFolders = useCallback(
    async (folderId: string | null) => {
      setLoading(true);
      setError(null);
      try {
        const { resolvedDriveId } = await resolveDrive();
        const basePath = folderId
          ? `/drives/${resolvedDriveId}/items/${folderId}/children`
          : `/drives/${resolvedDriveId}/root/children`;
        const params =
          "?$filter=folder ne null&$select=id,name,folder,parentReference,webUrl&$orderby=name";

        // Fetch all pages
        let allItems: GraphDriveItem[] = [];
        let nextLink: string | undefined = `${GRAPH_BASE}${basePath}${params}`;

        while (nextLink) {
          const accessToken = await acquireToken();
          const res = await fetch(nextLink, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (!res.ok) {
            if (res.status === 401 || res.status === 403) {
              throw new Error(
                "SharePoint access denied. Contact your administrator.",
              );
            }
            throw new Error(`Graph API error: ${res.status}`);
          }
          const data: GraphDriveItemsResponse = await res.json();
          allItems = allItems.concat(data.value);
          nextLink = data["@odata.nextLink"];
        }

        setFolders(allItems.map(toSharePointFolder));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load folders");
        setFolders([]);
      } finally {
        setLoading(false);
      }
    },
    [resolveDrive, acquireToken],
  );

  // ── Validate stored folder on load ──────────────────────────────────

  useEffect(() => {
    const init = async () => {
      try {
        // Start by resolving the drive (also acquires token)
        const { resolvedDriveId } = await resolveDrive();

        // Validate stored folder if present
        if (value) {
          try {
            const targetDriveId = value.driveId || resolvedDriveId;
            await graphFetch(
              `/drives/${targetDriveId}/items/${value.folderId}`,
            );
            setStaleWarning(false);
          } catch {
            setStaleWarning(true);
          }
        }

        // Load root folders
        await fetchFolders(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to initialize");
        setLoading(false);
      }
    };
    init();
    // Run only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Navigation handlers ─────────────────────────────────────────────

  const handleDrillIn = (folder: SharePointFolder) => {
    setBreadcrumb((prev) => [...prev, { id: folder.id, name: folder.name }]);
    setSearch("");
    fetchFolders(folder.id);
  };

  const handleBreadcrumbClick = (index: number) => {
    const newBreadcrumb = breadcrumb.slice(0, index + 1);
    setBreadcrumb(newBreadcrumb);
    setSearch("");
    const targetId = newBreadcrumb[newBreadcrumb.length - 1].id;
    fetchFolders(targetId);
  };

  const handleSelect = (folder: SharePointFolder) => {
    onChange({
      driveId: driveId!,
      folderId: folder.id,
      folderName: folder.name,
      folderPath: buildFolderPath(breadcrumb, folder.name),
      siteId: siteId!,
      webUrl: folder.webUrl,
    });
    setStaleWarning(false);
  };

  const handleSelectCurrentFolder = () => {
    const current = breadcrumb[breadcrumb.length - 1];
    if (!current.id) return; // Can't select root
    onChange({
      driveId: driveId!,
      folderId: current.id,
      folderName: current.name,
      folderPath:
        "/" +
        breadcrumb
          .slice(1)
          .map((b) => b.name)
          .join("/"),
      siteId: siteId!,
      webUrl: "", // We don't have webUrl for breadcrumb entries
    });
    setStaleWarning(false);
  };

  const handleClear = () => {
    onChange(null);
    setStaleWarning(false);
  };

  // ── Filtering ───────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    if (!search) return folders;
    const q = search.toLowerCase();
    return folders.filter((f) => f.name.toLowerCase().includes(q));
  }, [folders, search]);

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <div style={styles.container}>
      {/* ── Selected folder card ─────────────────────────────────── */}
      <div style={styles.selectedSection}>
        <div style={styles.selectedLabel}>Selected folder</div>
        {value ? (
          <div
            style={{
              ...styles.selectedCard,
              ...(staleWarning ? styles.selectedCardStale : {}),
            }}
          >
            <span style={styles.folderIcon}>📁</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={styles.selectedName}>{value.folderName}</div>
              <div style={styles.selectedPath}>{value.folderPath}</div>
              {staleWarning && (
                <div style={styles.staleWarning}>
                  ⚠ This folder may have been moved or deleted
                </div>
              )}
            </div>
            {value.webUrl && (
              <a
                href={value.webUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.externalLink}
                title="Open in SharePoint"
              >
                ↗
              </a>
            )}
            <button
              type="button"
              style={styles.clearBtn}
              onClick={handleClear}
              title="Clear folder selection"
            >
              ✕
            </button>
          </div>
        ) : (
          <div style={styles.selectedCardEmpty}>
            <span style={styles.placeholder}>No folder selected</span>
          </div>
        )}
      </div>

      {/* ── Browse folders ───────────────────────────────────────── */}
      <div style={styles.listSection}>
        <div style={styles.listLabel}>Browse folders</div>

        {/* Breadcrumb */}
        <div style={styles.breadcrumb}>
          {breadcrumb.map((entry, i) => (
            <span key={i}>
              {i > 0 && <span style={styles.breadcrumbSep}> › </span>}
              {i < breadcrumb.length - 1 ? (
                <button
                  type="button"
                  style={styles.breadcrumbBtn}
                  onClick={() => handleBreadcrumbClick(i)}
                >
                  {entry.name}
                </button>
              ) : (
                <span style={styles.breadcrumbCurrent}>{entry.name}</span>
              )}
            </span>
          ))}
        </div>

        {/* Error state */}
        {error && (
          <div style={styles.errorBox}>
            <span>{error}</span>
            <button
              type="button"
              style={styles.retryBtn}
              onClick={() => fetchFolders(breadcrumb[breadcrumb.length - 1].id)}
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && !error && (
          <div style={styles.loadingText}>Loading folders…</div>
        )}

        {/* Folder list */}
        {!loading && !error && (
          <>
            {/* Search (shown if >5 folders) */}
            {folders.length > 5 && (
              <input
                type="text"
                placeholder="Search folders…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={styles.searchInput}
              />
            )}

            <div style={styles.list}>
              {filtered.map((folder) => {
                const isSelected = value?.folderId === folder.id;
                return (
                  <div
                    key={folder.id}
                    style={{
                      ...styles.option,
                      ...(isSelected ? styles.optionActive : {}),
                    }}
                  >
                    <button
                      type="button"
                      style={styles.folderBtn}
                      onClick={() =>
                        folder.childCount > 0
                          ? handleDrillIn(folder)
                          : handleSelect(folder)
                      }
                      title={
                        folder.childCount > 0
                          ? `Open ${folder.name} (${folder.childCount} subfolder${folder.childCount !== 1 ? "s" : ""})`
                          : folder.name
                      }
                    >
                      <span style={styles.folderIcon}>📁</span>
                      <span
                        style={isSelected ? styles.optionNameActive : undefined}
                      >
                        {folder.name}
                      </span>
                      {folder.childCount > 0 && (
                        <span style={styles.childCount}>›</span>
                      )}
                    </button>
                    <button
                      type="button"
                      style={styles.selectBtn}
                      onClick={() => handleSelect(folder)}
                    >
                      {isSelected ? "✓" : "Select"}
                    </button>
                  </div>
                );
              })}

              {/* Empty states */}
              {filtered.length === 0 && folders.length > 0 && (
                <div style={styles.noResults}>No matching folders</div>
              )}
              {folders.length === 0 && (
                <div style={styles.noResults}>
                  <div>This folder has no subfolders.</div>
                  {breadcrumb.length > 1 && (
                    <button
                      type="button"
                      style={styles.selectCurrentBtn}
                      onClick={handleSelectCurrentFolder}
                    >
                      Select "{breadcrumb[breadcrumb.length - 1].name}"
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: 14,
    lineHeight: 1.4,
  },
  selectedSection: {
    marginBottom: 12,
  },
  selectedLabel: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "#6b7280",
    marginBottom: 6,
  },
  selectedCard: {
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    padding: "8px 10px",
    borderRadius: 6,
    border: "2px solid #2563eb",
    backgroundColor: "#eff6ff",
  },
  selectedCardStale: {
    borderColor: "#d97706",
    backgroundColor: "#fffbeb",
  },
  selectedCardEmpty: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 10px",
    borderRadius: 6,
    border: "2px dashed #d1d5db",
    backgroundColor: "#f9fafb",
  },
  selectedName: {
    fontWeight: 600,
    color: "#111827",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  selectedPath: {
    fontSize: 12,
    color: "#6b7280",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  staleWarning: {
    fontSize: 11,
    color: "#d97706",
    marginTop: 2,
  },
  placeholder: {
    color: "#9ca3af",
    fontStyle: "italic",
    fontSize: 13,
  },
  clearBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#6b7280",
    fontSize: 14,
    padding: "2px 6px",
    borderRadius: 4,
    lineHeight: 1,
    flexShrink: 0,
  },
  externalLink: {
    color: "#2563eb",
    fontSize: 14,
    textDecoration: "none",
    padding: "2px 4px",
    borderRadius: 4,
    lineHeight: 1,
    flexShrink: 0,
  },
  folderIcon: {
    fontSize: 16,
    lineHeight: 1,
    flexShrink: 0,
  },
  listSection: {},
  listLabel: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "#6b7280",
    marginBottom: 6,
  },
  breadcrumb: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 6,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  breadcrumbBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#2563eb",
    fontSize: 12,
    padding: 0,
    textDecoration: "underline",
  },
  breadcrumbCurrent: {
    color: "#111827",
    fontWeight: 600,
    fontSize: 12,
  },
  breadcrumbSep: {
    color: "#9ca3af",
  },
  searchInput: {
    width: "100%",
    padding: "6px 8px",
    border: "1px solid #d1d5db",
    borderRadius: 4,
    fontSize: 13,
    marginBottom: 4,
    boxSizing: "border-box",
  },
  list: {
    maxHeight: 260,
    overflowY: "auto",
    border: "1px solid #e5e7eb",
    borderRadius: 6,
    backgroundColor: "#ffffff",
  },
  option: {
    display: "flex",
    alignItems: "center",
    width: "100%",
    borderBottom: "1px solid #f3f4f6",
  },
  optionActive: {
    backgroundColor: "#eff6ff",
  },
  folderBtn: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flex: 1,
    padding: "7px 10px",
    border: "none",
    background: "none",
    cursor: "pointer",
    textAlign: "left",
    fontSize: 13,
    color: "#374151",
    minWidth: 0,
  },
  optionNameActive: {
    fontWeight: 600,
    color: "#1d4ed8",
  },
  childCount: {
    marginLeft: "auto",
    color: "#9ca3af",
    fontSize: 14,
    flexShrink: 0,
  },
  selectBtn: {
    padding: "4px 10px",
    border: "1px solid #d1d5db",
    borderRadius: 4,
    backgroundColor: "#ffffff",
    color: "#374151",
    fontSize: 12,
    cursor: "pointer",
    marginRight: 8,
    flexShrink: 0,
    lineHeight: 1.4,
  },
  selectCurrentBtn: {
    marginTop: 8,
    padding: "6px 14px",
    border: "1px solid #2563eb",
    borderRadius: 4,
    backgroundColor: "#eff6ff",
    color: "#2563eb",
    fontSize: 13,
    cursor: "pointer",
    fontWeight: 600,
  },
  noResults: {
    padding: "12px 10px",
    color: "#9ca3af",
    textAlign: "center",
    fontSize: 13,
  },
  loadingText: {
    padding: "12px 10px",
    color: "#6b7280",
    fontSize: 13,
  },
  errorBox: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 10px",
    borderRadius: 6,
    border: "1px solid #fca5a5",
    backgroundColor: "#fef2f2",
    color: "#b91c1c",
    fontSize: 13,
    marginBottom: 6,
  },
  retryBtn: {
    padding: "4px 10px",
    border: "1px solid #fca5a5",
    borderRadius: 4,
    backgroundColor: "#ffffff",
    color: "#b91c1c",
    fontSize: 12,
    cursor: "pointer",
    marginLeft: "auto",
    flexShrink: 0,
  },
};
