import { useCallback, useEffect, useMemo, useState } from "react";

interface ThemeColors {
  primary: string | null;
  fg: string | null;
  bg: string | null;
  bgInverted: string | null;
}

interface Theme {
  slug: string;
  name: string;
  colors: ThemeColors;
}

interface ThemeSelectProps {
  value: string | undefined;
  token: string;
  spaceId: number | null;
  onChange: (slug: string | null) => void;
}

const STORYBLOK_CDN = "https://api.storyblok.com/v2/cdn/stories";

/** Convert [0-1] float components to hex color. */
function componentsToHex(components: number[] | undefined): string | null {
  if (!components || components.length < 3) return null;
  const hex = (v: number) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${hex(components[0])}${hex(components[1])}${hex(components[2])}`;
}

/** Extract theme colors from the W3C Design Token JSON structure. */
function extractThemeColors(tokensJson: string | undefined): ThemeColors {
  const fallback: ThemeColors = {
    primary: null,
    fg: null,
    bg: null,
    bgInverted: null,
  };
  if (!tokensJson) return fallback;
  try {
    const tokens = JSON.parse(tokensJson);
    const color = tokens?.color;
    if (!color) return fallback;
    return {
      primary: componentsToHex(color.primary?.$root?.$value?.components),
      fg: componentsToHex(color.fg?.$root?.$value?.components),
      bg: componentsToHex(color.bg?.$root?.$value?.components),
      bgInverted: componentsToHex(color.bg?.inverted?.$value?.components),
    };
  } catch {
    return fallback;
  }
}

export function ThemeSelect({
  value,
  token,
  spaceId,
  onChange,
}: ThemeSelectProps) {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchThemes = useCallback(async () => {
    if (!token) {
      setError("No API token available");
      setLoading(false);
      return;
    }

    try {
      const params = new URLSearchParams({
        token,
        starts_with: "settings/themes/",
        content_type: "token-theme",
        per_page: "100",
        version: "published",
      });

      const res = await fetch(`${STORYBLOK_CDN}?${params}`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);

      const data = await res.json();
      const fetched: Theme[] = (data.stories ?? []).map(
        (story: Record<string, unknown>) => ({
          slug: (story as { slug: string }).slug,
          name:
            ((story as { content?: { name?: string } }).content
              ?.name as string) || (story as { name: string }).name,
          colors: extractThemeColors(
            (story as { content?: { tokens?: string } }).content
              ?.tokens as string,
          ),
        }),
      );

      fetched.sort((a, b) => a.name.localeCompare(b.name));
      setThemes(fetched);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load themes");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchThemes();
  }, [fetchThemes]);

  const filtered = useMemo(() => {
    if (!search) return themes;
    const q = search.toLowerCase();
    return themes.filter((t) => t.name.toLowerCase().includes(q));
  }, [themes, search]);

  const selectedTheme = themes.find((t) => t.slug === value);

  if (loading) {
    return <div style={styles.container}>Loading themes…</div>;
  }

  if (error) {
    return <div style={{ ...styles.container, color: "#b00020" }}>{error}</div>;
  }

  if (themes.length === 0) {
    return (
      <div style={styles.container}>
        <span style={styles.empty}>
          No themes found. Create token-theme stories under settings/themes/.
        </span>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Current selection */}
      <div style={styles.selectedSection}>
        <div style={styles.selectedLabel}>Selected theme</div>
        {selectedTheme ? (
          <div style={styles.selectedCard}>
            <ThemeSwatch colors={selectedTheme.colors} size={36} />
            <span style={styles.selectedName}>{selectedTheme.name}</span>
            <button
              type="button"
              style={styles.clearBtn}
              onClick={() => onChange(null)}
              title="Clear theme selection"
            >
              ✕
            </button>
          </div>
        ) : (
          <div style={styles.selectedCardEmpty}>
            <span style={styles.placeholder}>No theme selected</span>
          </div>
        )}
      </div>

      {/* Available themes */}
      <div style={styles.listSection}>
        <div style={styles.listLabel}>Available themes</div>

        {themes.length > 5 && (
          <input
            type="text"
            placeholder="Search themes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
        )}

        <div style={styles.list}>
          {filtered.map((theme) => {
            const isActive = theme.slug === value;
            return (
              <button
                key={theme.slug}
                type="button"
                style={{
                  ...styles.option,
                  ...(isActive ? styles.optionActive : {}),
                }}
                onClick={() => onChange(theme.slug)}
              >
                <ThemeSwatch colors={theme.colors} size={28} />
                <span style={isActive ? styles.optionNameActive : undefined}>
                  {theme.name}
                </span>
                {isActive && <span style={styles.checkmark}>✓</span>}
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div style={styles.noResults}>No matching themes</div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * 4-dot theme swatch inspired by the Storybook ThemePreview component.
 * Shows fg + primary on light bg (left half) and primary + fg on dark bg (right half).
 */
function ThemeSwatch({
  colors,
  size = 28,
}: {
  colors: ThemeColors;
  size?: number;
}) {
  const bg = colors.bg || "#ffffff";
  const bgInv = colors.bgInverted || "#1a1a1a";
  const fg = colors.fg || "#1a1a1a";
  const primary = colors.primary || "#0070f3";
  const dotSize = size * 0.28;

  return (
    <span
      style={{
        display: "inline-flex",
        width: size,
        height: size,
        borderRadius: 4,
        overflow: "hidden",
        flexShrink: 0,
        boxShadow:
          "rgba(0,0,0,0.1) 0px 1px 3px 0px, rgba(0,0,0,0.06) 0px 1px 2px 0px",
      }}
    >
      {/* Light half */}
      <span
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: dotSize * 0.3,
          backgroundColor: bg,
        }}
      >
        <span
          style={{
            width: dotSize,
            height: dotSize,
            borderRadius: "50%",
            backgroundColor: fg,
          }}
        />
        <span
          style={{
            width: dotSize,
            height: dotSize,
            borderRadius: "50%",
            backgroundColor: primary,
          }}
        />
      </span>
      {/* Dark half */}
      <span
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: dotSize * 0.3,
          backgroundColor: bgInv,
        }}
      >
        <span
          style={{
            width: dotSize,
            height: dotSize,
            borderRadius: "50%",
            backgroundColor: primary,
          }}
        />
        <span
          style={{
            width: dotSize,
            height: dotSize,
            borderRadius: "50%",
            backgroundColor: fg,
          }}
        />
      </span>
    </span>
  );
}

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
    alignItems: "center",
    gap: 10,
    padding: "8px 10px",
    borderRadius: 6,
    border: "2px solid #2563eb",
    backgroundColor: "#eff6ff",
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
    flex: 1,
    color: "#111827",
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
    maxHeight: 220,
    overflowY: "auto",
    border: "1px solid #e5e7eb",
    borderRadius: 6,
    backgroundColor: "#ffffff",
  },
  option: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    padding: "7px 10px",
    border: "none",
    background: "none",
    cursor: "pointer",
    textAlign: "left",
    fontSize: 13,
    borderBottom: "1px solid #f3f4f6",
    color: "#374151",
  },
  optionActive: {
    backgroundColor: "#eff6ff",
  },
  optionNameActive: {
    fontWeight: 600,
    color: "#1d4ed8",
  },
  checkmark: {
    marginLeft: "auto",
    color: "#2563eb",
    fontWeight: 700,
    fontSize: 14,
  },
  noResults: {
    padding: "12px 10px",
    color: "#9ca3af",
    textAlign: "center",
    fontSize: 13,
  },
  empty: {
    color: "#9ca3af",
    fontSize: 13,
  },
};
