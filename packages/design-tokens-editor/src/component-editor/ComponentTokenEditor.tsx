import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { FC, useCallback, useMemo } from "react";
import {
  useComponentTokens,
  type ComponentCatalogEntry,
  type TokenMeta,
} from "./ComponentTokenContext";
import { TokenValueInput } from "./TokenValueInput";

interface ComponentTokenEditorProps {
  componentId: string;
}

function TokenRow({
  tokenName,
  meta,
  componentId,
  query,
}: {
  tokenName: string;
  meta: TokenMeta;
  componentId: string;
  query?: string;
}) {
  const { overrides, setTokenOverride, removeTokenOverride } =
    useComponentTokens();

  const currentValue = useMemo(() => {
    const compOverrides = overrides[componentId];
    if (!compOverrides) return undefined;
    if (query) {
      const queryOverrides = compOverrides[query];
      if (typeof queryOverrides === "object" && queryOverrides !== null) {
        return (queryOverrides as Record<string, string>)[tokenName];
      }
      return undefined;
    }
    const val = compOverrides[tokenName];
    return typeof val === "string" ? val : undefined;
  }, [overrides, componentId, tokenName, query]);

  const isOverridden = currentValue !== undefined && currentValue !== "";

  const copyToken = useCallback(() => {
    navigator.clipboard.writeText(tokenName);
  }, [tokenName]);

  return (
    <Box
      sx={{
        px: 1.5,
        py: 0.75,
        ...(isOverridden && { bgcolor: "action.selected" }),
      }}
    >
      {/* Token name — full, copyable */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          mb: 0.5,
        }}
      >
        <Typography
          component="code"
          sx={{
            fontFamily: "monospace",
            fontSize: "0.72rem",
            color: "text.secondary",
            wordBreak: "break-all",
            lineHeight: 1.3,
            flex: 1,
            cursor: "pointer",
            "&:hover": { color: "text.primary" },
          }}
          onClick={copyToken}
          title="Click to copy"
        >
          {tokenName}
        </Typography>
        <Tooltip title="Copy token name">
          <IconButton size="small" onClick={copyToken} sx={{ p: 0.25 }}>
            <ContentCopyIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Value input */}
      <TokenValueInput
        tokenName={tokenName}
        defaultValue={meta.defaultValue}
        value={currentValue}
        onChange={(value) =>
          setTokenOverride(componentId, tokenName, value, query)
        }
        onReset={() => removeTokenOverride(componentId, tokenName, query)}
        referencedToken={meta.referencedToken}
      />

      {/* Default value — shown only when overridden */}
      {isOverridden && (
        <Typography
          variant="caption"
          sx={{
            fontFamily: "monospace",
            fontSize: "0.65rem",
            color: "text.secondary",
            mt: 0.25,
            display: "block",
          }}
        >
          Default: {meta.defaultValue}
        </Typography>
      )}
    </Box>
  );
}

function TokenList({
  tokens,
  componentId,
  query,
}: {
  tokens: Record<string, TokenMeta>;
  componentId: string;
  query?: string;
}) {
  const sortedTokens = useMemo(
    () => Object.entries(tokens).sort(([a], [b]) => a.localeCompare(b)),
    [tokens],
  );

  return (
    <Box>
      {sortedTokens.map(([name, meta], i) => (
        <Box key={name}>
          {i > 0 && <Divider />}
          <TokenRow
            tokenName={name}
            meta={meta}
            componentId={componentId}
            query={query}
          />
        </Box>
      ))}
    </Box>
  );
}

export const ComponentTokenEditor: FC<ComponentTokenEditorProps> = ({
  componentId,
}) => {
  const { catalog, overrideCounts, resetComponent } = useComponentTokens();
  const entry: ComponentCatalogEntry | undefined = catalog[componentId];

  if (!entry) {
    return (
      <Box p={2}>
        <Typography color="text.secondary">Component not found.</Typography>
      </Box>
    );
  }

  const overrideCount = overrideCounts[componentId] || 0;
  const responsiveQueries = Object.keys(entry.responsiveTokens || {});

  return (
    <Box sx={{ overflow: "auto", height: "100%", p: 1 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 1,
          px: 1,
        }}
      >
        <Typography variant="h6" sx={{ fontSize: "1rem" }}>
          {entry.displayName}
          {overrideCount > 0 && (
            <Chip
              label={`${overrideCount} override${overrideCount !== 1 ? "s" : ""}`}
              size="small"
              color="primary"
              sx={{ ml: 1 }}
            />
          )}
        </Typography>
        {overrideCount > 0 && (
          <Button
            size="small"
            startIcon={<RestartAltIcon />}
            onClick={() => resetComponent(componentId)}
          >
            Reset All
          </Button>
        )}
      </Box>

      <Typography variant="overline" sx={{ px: 1, display: "block", mb: 0.5 }}>
        Base Tokens ({Object.keys(entry.tokens).length})
      </Typography>
      <TokenList tokens={entry.tokens} componentId={componentId} />

      {responsiveQueries.map((query) => (
        <Accordion key={query} disableGutters defaultExpanded={false}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography
              variant="body2"
              sx={{ fontFamily: "monospace", fontSize: "0.8rem" }}
            >
              {query}
            </Typography>
            <Chip
              label={Object.keys(entry.responsiveTokens[query]).length}
              size="small"
              sx={{ ml: 1 }}
            />
          </AccordionSummary>
          <AccordionDetails sx={{ p: 0 }}>
            <TokenList
              tokens={entry.responsiveTokens[query]}
              componentId={componentId}
              query={query}
            />
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
};
