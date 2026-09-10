/**
 * HTML preview templates for ext-apps UI resources.
 *
 * Each template is a self-contained HTML5 document that:
 * 1. Imports the ext-apps SDK via ESM CDN
 * 2. Initializes via `ui/initialize` handshake
 * 3. Receives tool data via `ui/notifications/tool-result`
 * 4. Renders kickstartDS component HTML with inlined design tokens
 * 5. Calls app-only tools via `tools/call` through the host
 *
 * Templates use the ext-apps SDK from the `app-with-deps` subpath which
 * bundles all dependencies for iframe usage (no import maps needed).
 *
 * @see PRD Section 6.2 — UI Resource Templates
 */

import { THEME_BRIDGE_CSS, PREVIEW_CHROME_CSS } from "./theme-bridge.js";
import { KDS_GLOBAL_CSS } from "./tokens.generated.js";
import { KDS_COMPONENT_CSS } from "./components-css.generated.js";

// ── Shared HTML helpers ────────────────────────────────────────────

const SHARED_HEAD = `
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      ${KDS_GLOBAL_CSS}
      ${KDS_COMPONENT_CSS}
      ${THEME_BRIDGE_CSS}
      ${PREVIEW_CHROME_CSS}
    </style>
`;

/**
 * The ext-apps SDK script block. Uses the CDN-served bundle with all
 * dependencies included, so no import map is needed in the iframe.
 */
const EXT_APPS_SDK_SCRIPT = `https://unpkg.com/@modelcontextprotocol/ext-apps@1/dist/src/app-with-deps.js`;

// ── Section Preview Template ───────────────────────────────────────

/**
 * Stateless single-section preview template.
 *
 * Shows one generated section in isolation with Approve/Modify/Reject
 * buttons. Each `generate_section` call produces its own preview —
 * no state accumulation, no sessionStorage.
 *
 * On approve/reject/modify, the UI:
 * 1. Calls the corresponding app-only tool via `callServerTool`
 * 2. Sends a synthetic user message via `sendMessage` so the LLM
 *    knows the decision and can continue (or stop)
 *
 * Supports token theming (branding CSS + Google Fonts) for design
 * fidelity in the preview.
 *
 * @see PRD Section 3.2 — Section Preview
 */
export const SECTION_PREVIEW_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    ${SHARED_HEAD}
    <title>Section Preview</title>
</head>
<body>
    <div id="preview-container" class="kds-preview kds-preview--loading">
        Waiting for section data…
    </div>
    <div id="actions" class="kds-preview-actions" style="display: none;">
        <button id="btn-approve" class="primary">✅ Approve</button>
        <button id="btn-modify">✏️ Modify</button>
        <button id="btn-reject" class="danger">❌ Reject</button>
    </div>

    <script type="module">
        import { App, applyDocumentTheme, applyHostStyleVariables, applyHostFonts } from "${EXT_APPS_SDK_SCRIPT}";

        const app = new App(
            { name: "kds-section-preview", version: "1.0.0" },
            { availableDisplayModes: ["inline"] }
        );

        let currentSection = null;

        // ── Host styling ─────────────────────────────────────────────
        function applyHostStyles(ctx) {
            if (ctx.theme) applyDocumentTheme(ctx.theme);
            if (ctx.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
            if (ctx.styles?.css?.fonts) applyHostFonts(ctx.styles.css.fonts);
        }

        // ── Token theme + Google Fonts ───────────────────────────────
        let _tokenStyleEl = null;
        const _loadedFontLinks = new Set();

        function applyTokenTheme(tokenCss) {
            if (!tokenCss || typeof tokenCss !== "string") return;

            if (!_tokenStyleEl) {
                _tokenStyleEl = document.createElement("style");
                _tokenStyleEl.id = "kds-token-theme";
                document.head.appendChild(_tokenStyleEl);
            }
            _tokenStyleEl.textContent = tokenCss;

            const fontTypes = ["display", "copy", "interface", "mono"];
            for (const fontType of fontTypes) {
                const re = new RegExp(
                    "ks-brand-font-family-" + fontType + ':\\\\s*"?([a-zA-Z0-9_,]+(?:\\\\s+[a-zA-Z0-9_,]+)*)"?',
                    "m"
                );
                const match = tokenCss.match(re);
                if (!match) continue;
                const family = match[1].trim();
                if (!family || family.includes(",") || family.includes('"')) continue;
                if (_loadedFontLinks.has(family)) continue;
                _loadedFontLinks.add(family);

                if (_loadedFontLinks.size === 1) {
                    const preconnect = document.createElement("link");
                    preconnect.rel = "preconnect";
                    preconnect.href = "https://fonts.gstatic.com";
                    preconnect.crossOrigin = "anonymous";
                    document.head.appendChild(preconnect);
                }

                const params = new URLSearchParams({ family: family + ":wght@300;400;500;600;700" });
                const link = document.createElement("link");
                link.rel = "stylesheet";
                link.href = "https://fonts.googleapis.com/css2?" + params;
                document.head.appendChild(link);
            }
        }

        function applyContainerDimensions(ctx) {
            if (!ctx?.containerDimensions) return;
            const dims = ctx.containerDimensions;
            const html = document.documentElement;
            if ('width' in dims) {
                html.style.width = '100vw';
                document.body.style.minWidth = '0';
            } else if ('maxWidth' in dims && dims.maxWidth) {
                html.style.maxWidth = dims.maxWidth + 'px';
            }
            if ('height' in dims) {
                html.style.height = '100vh';
            } else if ('maxHeight' in dims && dims.maxHeight) {
                html.style.maxHeight = dims.maxHeight + 'px';
            }
        }

        // ── Render the section ───────────────────────────────────────
        function renderSection(data) {
            const container = document.getElementById("preview-container");
            const actions = document.getElementById("actions");

            if (data.tokenCss) {
                applyTokenTheme(data.tokenCss);
            }

            currentSection = data;

            if (data.renderedHtml) {
                container.className = "kds-preview";
                container.innerHTML = data.renderedHtml;
                // Remove c-visual--full from hero components — 100vh is
                // arbitrary inside the MCP Apps iframe preview
                container.querySelectorAll(".c-visual--full").forEach(el =>
                    el.classList.remove("c-visual--full")
                );
                actions.style.display = "flex";
                wireActions();
            } else {
                container.className = "kds-preview";
                container.innerHTML = "<p>No preview available for this section.</p>";
            }
        }

        // ── Action wiring ────────────────────────────────────────────
        function wireActions() {
            document.getElementById("btn-approve").addEventListener("click", async () => {
                const actions = document.getElementById("actions");
                const buttons = actions.querySelectorAll("button");
                buttons.forEach(b => b.disabled = true);
                try {
                    await app.callServerTool({
                        name: "approve_section",
                        arguments: { section: currentSection.sectionData },
                    });
                    actions.classList.add("submitted");
                    actions.innerHTML = '<span class="kds-action-status success">✅ Section approved</span>';
                    try {
                        await app.sendMessage({
                            role: "user",
                            content: [{ type: "text", text: "approve_section: Section approved" }],
                        });
                    } catch {}
                } catch (err) {
                    buttons.forEach(b => b.disabled = false);
                    const errSpan = document.createElement("span");
                    errSpan.className = "kds-action-status error";
                    errSpan.textContent = "⚠️ " + (err.message || "Action failed");
                    actions.prepend(errSpan);
                    setTimeout(() => errSpan.remove(), 4000);
                }
            });

            document.getElementById("btn-modify").addEventListener("click", async () => {
                const actions = document.getElementById("actions");
                const buttons = actions.querySelectorAll("button");
                buttons.forEach(b => b.disabled = true);
                try {
                    await app.callServerTool({
                        name: "modify_section",
                        arguments: { section: currentSection.sectionData },
                    });
                    actions.classList.add("submitted");
                    actions.innerHTML = '<span class="kds-action-status success">✏️ Modification requested — describe your changes in the chat</span>';
                    try {
                        await app.sendMessage({
                            role: "user",
                            content: [{ type: "text", text: "modify_section: Modification requested" }],
                        });
                    } catch {}
                } catch (err) {
                    buttons.forEach(b => b.disabled = false);
                    const errSpan = document.createElement("span");
                    errSpan.className = "kds-action-status error";
                    errSpan.textContent = "⚠️ " + (err.message || "Action failed");
                    actions.prepend(errSpan);
                    setTimeout(() => errSpan.remove(), 4000);
                }
            });

            document.getElementById("btn-reject").addEventListener("click", async () => {
                const actions = document.getElementById("actions");
                const buttons = actions.querySelectorAll("button");
                buttons.forEach(b => b.disabled = true);
                try {
                    await app.callServerTool({
                        name: "reject_section",
                        arguments: { reason: "User rejected section" },
                    });
                    actions.classList.add("submitted");
                    actions.innerHTML = '<span class="kds-action-status success">❌ Section rejected</span>';
                    try {
                        await app.sendMessage({
                            role: "user",
                            content: [{ type: "text", text: "reject_section: Section rejected" }],
                        });
                    } catch {}
                } catch (err) {
                    buttons.forEach(b => b.disabled = false);
                    const errSpan = document.createElement("span");
                    errSpan.className = "kds-action-status error";
                    errSpan.textContent = "⚠️ " + (err.message || "Action failed");
                    actions.prepend(errSpan);
                    setTimeout(() => errSpan.remove(), 4000);
                }
            });
        }

        // ── Tool lifecycle handlers ──────────────────────────────────

        app.ontoolinput = (params) => {
            const container = document.getElementById("preview-container");
            const args = params?.arguments;
            if (args?.componentType) {
                container.className = "kds-preview kds-preview--loading";
                container.textContent = "Generating " + args.componentType + " section…";
            }
        };

        app.ontoolinputpartial = (partial) => {
            const container = document.getElementById("preview-container");
            const args = partial?.arguments;
            if (args?.componentType) {
                container.className = "kds-preview kds-preview--loading";
                container.textContent = "Generating " + args.componentType + " section…";
            }
        };

        app.ontoolresult = (result) => {
            const data = result?.structuredContent || result;
            if (data?.renderedHtml) {
                renderSection(data);
            } else {
                const container = document.getElementById("preview-container");
                container.className = "kds-preview";
                container.innerHTML = "<p>No preview available.</p>";
            }
        };

        app.ontoolcancelled = (params) => {
            const container = document.getElementById("preview-container");
            container.className = "kds-preview";
            container.innerHTML = "<p>Generation cancelled" + (params?.reason ? ": " + params.reason : "") + "</p>";
        };

        app.onteardown = async () => {
            return {};
        };

        app.onhostcontextchanged = (ctx) => {
            applyHostStyles(ctx);
            applyContainerDimensions(ctx);
        };

        // ── Connect with timeout ─────────────────────────────────────
        try {
            const connectTimeout = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Connection timed out")), 10000)
            );
            await Promise.race([app.connect(), connectTimeout]);
            const hostCtx = app.getHostContext();
            if (hostCtx) {
                applyHostStyles(hostCtx);
                applyContainerDimensions(hostCtx);
            }
        } catch (err) {
            const container = document.getElementById("preview-container");
            container.className = "kds-preview";
            container.innerHTML = '<div class="kds-connection-error">'
                + '<div class="kds-connection-error__icon">⚠️</div>'
                + '<div class="kds-connection-error__title">Could not connect to host</div>'
                + '<div class="kds-connection-error__detail">' + (err.message || "Unknown error") + '</div>'
                + '</div>';
        }
    </script>
</body>
</html>`;

// ── Page Builder Template ──────────────────────────────────────────

/**
 * Page builder template — final assembly view for reviewing all
 * generated sections together before saving to Storyblok.
 *
 * This template is NOT linked to `generate_section` — individual
 * sections get their own isolated previews via `SECTION_PREVIEW_HTML`.
 *
 * The page builder is triggered by `save_page` or when loading an
 * existing page via `get_story`. It shows all sections stacked
 * together with:
 * - Per-section reorder (move up/down) and remove controls
 * - Section badges showing component type and position
 * - A save bar to persist to Storyblok
 * - Fullscreen toggle for better review
 * - Edit mode when loading an existing page
 *
 * Sections are provided via `ontoolresult` structuredContent:
 * - `save_page` → receives sections array from the app-only tool
 * - `get_story` → receives existing page sections for editing
 * - `create_page_with_content` → shows save confirmation
 *
 * @see PRD Section 5 — Builder UI Layout
 */
export const PAGE_BUILDER_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    ${SHARED_HEAD}
    <title>Page Builder</title>
</head>
<body>
    <div id="builder-header" class="kds-builder-header" style="display: none;">
        <div class="kds-builder-header__title">
            <span id="header-title">Page Builder</span>
        </div>
        <div class="kds-builder-header__actions">
            <span id="header-count" class="kds-builder-header__count"></span>
            <button id="btn-fullscreen" class="kds-builder-header__fullscreen" style="display: none;" title="Toggle fullscreen">⛶</button>
        </div>
    </div>
    <div id="preview-container" class="kds-preview kds-preview--loading">
        Waiting for page data…
    </div>
    <div id="actions" class="kds-preview-actions" style="display: none;"></div>
    <div id="save-bar" class="kds-builder-save-bar" style="display: none;">
        <span id="save-status"></span>
        <button id="btn-save">💾 Save to Storyblok</button>
    </div>

    <script type="module">
        import { App, applyDocumentTheme, applyHostStyleVariables, applyHostFonts } from "${EXT_APPS_SDK_SCRIPT}";

        const app = new App(
            { name: "kds-page-builder", version: "1.0.0" },
            { availableDisplayModes: ["inline", "fullscreen"] }
        );
        let currentDisplayMode = "inline";

        // ── Builder state (in-memory only — no sessionStorage) ───────
        let state = {
            mode: "empty",
            sections: [],
            sourceStory: null,
            rootFields: {},
            saved: false,
            saveResult: null,
        };
        let nextSectionId = 1;

        // ── Host styling ─────────────────────────────────────────────
        function applyHostStyles(ctx) {
            if (ctx.theme) applyDocumentTheme(ctx.theme);
            if (ctx.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
            if (ctx.styles?.css?.fonts) applyHostFonts(ctx.styles.css.fonts);
        }

        // ── Token theme + Google Fonts ───────────────────────────────
        let _tokenStyleEl = null;
        const _loadedFontLinks = new Set();

        function applyTokenTheme(tokenCss) {
            if (!tokenCss || typeof tokenCss !== "string") return;

            if (!_tokenStyleEl) {
                _tokenStyleEl = document.createElement("style");
                _tokenStyleEl.id = "kds-token-theme";
                document.head.appendChild(_tokenStyleEl);
            }
            _tokenStyleEl.textContent = tokenCss;

            const fontTypes = ["display", "copy", "interface", "mono"];
            for (const fontType of fontTypes) {
                const re = new RegExp(
                    "ks-brand-font-family-" + fontType + ':\\\\s*"?([a-zA-Z0-9_,]+(?:\\\\s+[a-zA-Z0-9_,]+)*)"?',
                    "m"
                );
                const match = tokenCss.match(re);
                if (!match) continue;
                const family = match[1].trim();
                if (!family || family.includes(",") || family.includes('"')) continue;
                if (_loadedFontLinks.has(family)) continue;
                _loadedFontLinks.add(family);

                if (_loadedFontLinks.size === 1) {
                    const preconnect = document.createElement("link");
                    preconnect.rel = "preconnect";
                    preconnect.href = "https://fonts.gstatic.com";
                    preconnect.crossOrigin = "anonymous";
                    document.head.appendChild(preconnect);
                }

                const params = new URLSearchParams({ family: family + ":wght@300;400;500;600;700" });
                const link = document.createElement("link");
                link.rel = "stylesheet";
                link.href = "https://fonts.googleapis.com/css2?" + params;
                document.head.appendChild(link);
            }
        }

        function applyContainerDimensions(ctx) {
            if (!ctx?.containerDimensions) return;
            const dims = ctx.containerDimensions;
            const html = document.documentElement;
            if ('width' in dims) {
                html.style.width = '100vw';
                document.body.style.minWidth = '0';
            } else if ('maxWidth' in dims && dims.maxWidth) {
                html.style.maxWidth = dims.maxWidth + 'px';
            }
            if ('height' in dims) {
                html.style.height = '100vh';
            } else if ('maxHeight' in dims && dims.maxHeight) {
                html.style.maxHeight = dims.maxHeight + 'px';
            }
        }

        // ── Render functions ─────────────────────────────────────────

        function getActiveSections() {
            return state.sections.filter(s => s.status !== "removed");
        }

        function renderBuilder() {
            const container = document.getElementById("preview-container");
            const actions = document.getElementById("actions");
            const header = document.getElementById("builder-header");
            const saveBar = document.getElementById("save-bar");

            // If saved, show the save result
            if (state.saved && state.saveResult) {
                showSaveResult(state.saveResult);
                return;
            }

            const active = getActiveSections();

            // No sections yet — loading state
            if (active.length === 0) {
                container.className = "kds-preview kds-preview--loading";
                container.textContent = "Waiting for page data…";
                actions.style.display = "none";
                header.style.display = "none";
                saveBar.style.display = "none";
                return;
            }

            // Render all sections in multi mode
            renderMultiMode();
        }

        function renderMultiMode() {
            const container = document.getElementById("preview-container");
            const actions = document.getElementById("actions");
            const header = document.getElementById("builder-header");
            const saveBar = document.getElementById("save-bar");

            const active = getActiveSections();
            const isEdit = state.mode === "edit-page";

            header.style.display = "flex";
            if (isEdit) {
                header.classList.add("kds-builder-header--edit");
            } else {
                header.classList.remove("kds-builder-header--edit");
            }
            document.getElementById("header-title").textContent =
                isEdit ? ("Editing: " + (state.sourceStory?.name || "Page")) : "Page Builder";
            document.getElementById("header-count").textContent =
                active.length + " section" + (active.length !== 1 ? "s" : "");

            // Wire fullscreen button
            const fsBtn = document.getElementById("btn-fullscreen");
            if (fsBtn) {
                fsBtn.style.display = "inline-flex";
                fsBtn.onclick = toggleFullscreen;
            }

            // Hide single-mode actions
            actions.style.display = "none";

            // Render all sections
            container.className = "kds-preview";
            let html = "";
            let visibleIndex = 0;

            for (const section of state.sections) {
                if (section.status === "removed") continue;
                visibleIndex++;

                const label = visibleIndex + ". " + (section.componentType || "section");

                html += '<div class="kds-builder-section" data-section-id="' + section.id + '">';

                // Section badge
                html += '<div class="kds-section-badge" data-section-label="' + label + '">';
                html += (section.renderedHtml || '<p>No preview</p>');
                html += '</div>';

                // Per-section controls (reorder + remove)
                html += '<div class="kds-builder-section__controls">'
                    + '<button class="move" onclick="window.__builderAction(\\'moveUp\\', \\'' + section.id + '\\')" title="Move up">↑</button>'
                    + '<button class="move" onclick="window.__builderAction(\\'moveDown\\', \\'' + section.id + '\\')" title="Move down">↓</button>'
                    + '<button class="danger" onclick="window.__builderAction(\\'remove\\', \\'' + section.id + '\\')" title="Remove">✕</button>'
                    + '</div>';

                html += '</div>';
            }

            container.innerHTML = html;

            // Show save bar
            if (active.length >= 1) {
                saveBar.style.display = "flex";
                document.getElementById("save-status").textContent =
                    active.length + " section" + (active.length !== 1 ? "s" : "") + " ready";
                wireSaveButton();
            } else {
                saveBar.style.display = "none";
            }
        }

        function showSaveResult(data) {
            const container = document.getElementById("preview-container");
            const actions = document.getElementById("actions");
            const header = document.getElementById("builder-header");
            const saveBar = document.getElementById("save-bar");

            header.style.display = "none";
            actions.style.display = "none";
            saveBar.style.display = "none";

            const emoji = data.wasPublished ? '🌍' : '📄';
            const status = data.wasPublished ? 'Published' : 'Draft';

            container.className = "kds-preview";
            container.innerHTML = '<div class="kds-write-result">'
                + '<div class="kds-write-result__icon">' + emoji + '</div>'
                + '<div class="kds-write-result__title">' + (data.message || 'Page created') + '</div>'
                + '<div class="kds-write-result__meta">'
                + '<span>' + status + '</span>'
                + (data.storyName ? ' · <strong>' + data.storyName + '</strong>' : '')
                + (data.sectionCount > 0 ? ' · ' + data.sectionCount + ' section' + (data.sectionCount !== 1 ? 's' : '') : '')
                + '</div>'
                + (data.storySlug ? '<div class="kds-write-result__slug">/' + data.storySlug + '</div>' : '')
                + (data.warnings && data.warnings.length > 0
                    ? '<div class="kds-write-result__warnings">'
                        + data.warnings.map(w => '<div class="kds-write-result__warning">⚠️ ' + w.message + '</div>').join('')
                        + '</div>'
                    : '')
                + '</div>';
        }

        // ── Section management ───────────────────────────────────────

        function loadSections(sections) {
            state.sections = sections.map((s, i) => ({
                id: "s" + (nextSectionId++),
                componentType: s.componentType || "section",
                renderedHtml: s.renderedHtml || null,
                sectionData: s.sectionData || s,
                status: "committed",
                origin: s.origin || "generated",
            }));
            renderBuilder();
        }

        function loadExistingPage(data) {
            const story = data.story;
            const sections = data.sections || [];
            state.mode = "edit-page";
            state.sourceStory = {
                uid: story.uid || story.uuid,
                name: story.name,
                slug: story.slug || story.full_slug,
                storyId: story.id,
            };
            state.sections = sections.map((s, i) => ({
                id: "s" + (nextSectionId++),
                componentType: s.componentType || "section",
                renderedHtml: s.renderedHtml || null,
                sectionData: s.sectionData || s,
                status: "committed",
                origin: "existing",
            }));
            state.saved = false;
            state.saveResult = null;
            renderBuilder();
        }

        // ── Builder actions (called from onclick) ────────────────────

        window.__builderAction = async function(action, sectionId) {
            const idx = state.sections.findIndex(s => s.id === sectionId);
            if (idx === -1) return;

            if (action === "remove") {
                try {
                    await app.callServerTool({
                        name: "remove_section",
                        arguments: { index: idx, sectionId: sectionId },
                    });
                } catch {}
                state.sections.splice(idx, 1);
                if (state.sections.length === 0) state.mode = "empty";
                renderBuilder();
                try {
                    await app.sendMessage({
                        role: "user",
                        content: [{ type: "text", text: "Removed section " + (idx + 1) }],
                    });
                } catch {}
            } else if (action === "moveUp") {
                const visible = state.sections.filter(s => s.status !== "removed");
                const visIdx = visible.indexOf(state.sections[idx]);
                if (visIdx > 0) {
                    const prevVisible = visible[visIdx - 1];
                    const prevIdx = state.sections.indexOf(prevVisible);
                    [state.sections[prevIdx], state.sections[idx]] = [state.sections[idx], state.sections[prevIdx]];
                    try {
                        await app.callServerTool({
                            name: "move_section",
                            arguments: { fromIndex: visIdx, toIndex: visIdx - 1 },
                        });
                    } catch {}
                    renderBuilder();
                }
            } else if (action === "moveDown") {
                const visible = state.sections.filter(s => s.status !== "removed");
                const visIdx = visible.indexOf(state.sections[idx]);
                if (visIdx < visible.length - 1) {
                    const nextVisible = visible[visIdx + 1];
                    const nextIdx = state.sections.indexOf(nextVisible);
                    [state.sections[idx], state.sections[nextIdx]] = [state.sections[nextIdx], state.sections[idx]];
                    try {
                        await app.callServerTool({
                            name: "move_section",
                            arguments: { fromIndex: visIdx, toIndex: visIdx + 1 },
                        });
                    } catch {}
                    renderBuilder();
                }
            }
        };

        // ── Save button wiring ───────────────────────────────────────

        function wireSaveButton() {
            const btn = document.getElementById("btn-save");
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.addEventListener("click", async () => {
                newBtn.disabled = true;
                newBtn.textContent = "Saving…";
                const committed = state.sections.filter(s => s.status === "committed");
                const sectionData = committed.map(s => s.sectionData);
                const isEdit = state.mode === "edit-page";
                try {
                    await app.callServerTool({
                        name: "save_page",
                        arguments: {
                            mode: isEdit ? "update" : "create",
                            sections: sectionData,
                            storyUid: isEdit ? state.sourceStory?.uid : undefined,
                            rootFields: Object.keys(state.rootFields).length > 0 ? state.rootFields : undefined,
                        },
                    });
                    state.saved = true;
                    state.saveResult = {
                        success: true,
                        message: isEdit ? "Page updated" : "Page created",
                        storyName: state.sourceStory?.name || "New Page",
                        storySlug: state.sourceStory?.slug || "",
                        sectionCount: committed.length,
                        wasPublished: false,
                    };
                    renderBuilder();
                    try {
                        await app.sendMessage({
                            role: "user",
                            content: [{ type: "text", text: "save_page: " + (isEdit ? "Page updated" : "Page created") + " with " + committed.length + " sections" }],
                        });
                    } catch {}
                } catch (err) {
                    newBtn.disabled = false;
                    newBtn.textContent = "💾 Save to Storyblok";
                    const saveBar = document.getElementById("save-bar");
                    const errSpan = document.createElement("span");
                    errSpan.className = "kds-action-status error";
                    errSpan.textContent = "⚠️ " + (err.message || "Save failed");
                    saveBar.prepend(errSpan);
                    setTimeout(() => errSpan.remove(), 5000);
                }
            });
        }

        // ── Tool lifecycle handlers ──────────────────────────────────

        app.ontoolinput = (params) => {
            // No loading state needed — builder receives fully formed data
        };

        app.ontoolresult = (result) => {
            const data = result?.structuredContent || result;

            // Apply token CSS if present
            if (data?.tokenCss) {
                applyTokenTheme(data.tokenCss);
            }

            if (data?.story && data?.sections && Array.isArray(data.sections)) {
                // get_story result → load existing page for editing
                loadExistingPage(data);
            } else if (data?.sections && Array.isArray(data.sections)) {
                // save_page result or assembled sections → load them
                loadSections(data.sections);
            } else if (data?.renderedSections && Array.isArray(data.renderedSections)) {
                // create_page_with_content result → show save confirmation
                state.saved = true;
                state.saveResult = {
                    success: true,
                    message: data.message || "Page created",
                    storyName: data.storyName || "",
                    storySlug: data.storySlug || "",
                    sectionCount: data.sectionCount || data.renderedSections.length,
                    wasPublished: data.wasPublished || false,
                    warnings: data.warnings,
                };
                showSaveResult(state.saveResult);
            } else if (data?.success && data?.message) {
                // Generic write result
                state.saved = true;
                state.saveResult = data;
                showSaveResult(data);
            } else {
                const container = document.getElementById("preview-container");
                container.className = "kds-preview";
                container.innerHTML = "<p>No page data available.</p>";
            }
        };

        app.ontoolcancelled = (params) => {
            if (state.sections.length === 0) {
                const container = document.getElementById("preview-container");
                container.className = "kds-preview";
                container.innerHTML = "<p>Cancelled" + (params?.reason ? ": " + params.reason : "") + "</p>";
            }
        };

        app.onteardown = async () => {
            return {};
        };

        app.onhostcontextchanged = (ctx) => {
            applyHostStyles(ctx);
            applyContainerDimensions(ctx);
            if (ctx.displayMode) {
                currentDisplayMode = ctx.displayMode;
                document.body.classList.toggle("fullscreen", ctx.displayMode === "fullscreen");
            }
        };

        async function toggleFullscreen() {
            const newMode = currentDisplayMode === "fullscreen" ? "inline" : "fullscreen";
            try {
                const result = await app.requestDisplayMode({ mode: newMode });
                currentDisplayMode = result.mode;
                document.body.classList.toggle("fullscreen", result.mode === "fullscreen");
            } catch {}
        }

        // ── Connect with timeout ─────────────────────────────────────
        try {
            const connectTimeout = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Connection timed out")), 10000)
            );
            await Promise.race([app.connect(), connectTimeout]);
            const hostCtx = app.getHostContext();
            if (hostCtx) {
                applyHostStyles(hostCtx);
                applyContainerDimensions(hostCtx);
            }
            renderBuilder();
        } catch (err) {
            const container = document.getElementById("preview-container");
            container.className = "kds-preview";
            container.innerHTML = '<div class="kds-connection-error">'
                + '<div class="kds-connection-error__icon">⚠️</div>'
                + '<div class="kds-connection-error__title">Could not connect to host</div>'
                + '<div class="kds-connection-error__detail">' + (err.message || "Unknown error") + '</div>'
                + '</div>';
        }
    </script>
</body>
</html>`;

// ── Plan Review Template ───────────────────────────────────────────

/**
 * Plan review template — displays the planned section sequence.
 *
 * Shown after `plan_page` completes. Renders each planned section as
 * a card in a vertical list. Supports drag-to-reorder and provides
 * approve/reject buttons for the overall plan.
 *
 * Display mode: `inline`
 */
export const PLAN_REVIEW_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    ${SHARED_HEAD}
    <title>Plan Review</title>
    <style>
        .kds-plan-item.dragging {
            opacity: 0.5;
            border-style: dashed;
        .kds-plan-item.drag-over {
            border-color: var(--color-ring-primary, var(--ks-background-color-accent, #4e63e0));
            border-width: 2px;
        }
    </style>
</head>
<body>
    <div id="preview-container" class="kds-preview kds-preview--loading">
        Waiting for plan data…
    </div>
    <div id="actions" class="kds-preview-actions" style="display: none;">
        <button id="btn-approve" class="primary">✅ Approve Plan</button>
        <button id="btn-reject" class="danger">❌ Reject</button>
    </div>

    <script type="module">
        import { App, applyDocumentTheme, applyHostStyleVariables, applyHostFonts } from "${EXT_APPS_SDK_SCRIPT}";

        const app = new App({ name: "kds-plan-review", version: "1.0.0" });
        let currentPlan = null;

        // Apply host styling (theme, CSS variables, fonts)
        function applyHostStyles(ctx) {
            if (ctx.theme) applyDocumentTheme(ctx.theme);
            if (ctx.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
            if (ctx.styles?.css?.fonts) applyHostFonts(ctx.styles.css.fonts);
        }

        function renderPlan(plan) {
            if (!plan || !plan.length) return "<p>No plan available.</p>";

            const items = plan.map((step) => {
                const type = step.componentType || step.fieldName || step.type || "unknown";
                const desc = step.intent || step.description || step.prompt || "";
                return '<li class="kds-plan-item" draggable="true" data-type="' + type + '">'
                    + '<span class="kds-plan-item__drag-handle">⠿</span>'
                    + '<div class="kds-plan-item__content">'
                    + '<div class="kds-plan-item__type">' + type + '</div>'
                    + (desc ? '<div class="kds-plan-item__description">' + desc + '</div>' : '')
                    + '</div>'
                    + '</li>';
            }).join("");

            return '<ol class="kds-plan-list">' + items + '</ol>';
        }

        function getCurrentOrder() {
            const items = document.querySelectorAll(".kds-plan-item");
            return Array.from(items).map(item => item.getAttribute("data-type"));
        }

        // Drag-and-drop reorder
        function setupDragAndDrop() {
            const list = document.querySelector(".kds-plan-list");
            if (!list) return;

            let dragItem = null;

            list.addEventListener("dragstart", (e) => {
                dragItem = e.target.closest(".kds-plan-item");
                if (dragItem) dragItem.classList.add("dragging");
            });

            list.addEventListener("dragend", (e) => {
                const item = e.target.closest(".kds-plan-item");
                if (item) item.classList.remove("dragging");
                document.querySelectorAll(".kds-plan-item").forEach(el =>
                    el.classList.remove("drag-over")
                );
                // DOM order is captured by getCurrentOrder() at approve time
            });

            list.addEventListener("dragover", (e) => {
                e.preventDefault();
                const target = e.target.closest(".kds-plan-item");
                if (target && target !== dragItem) {
                    document.querySelectorAll(".kds-plan-item").forEach(el =>
                        el.classList.remove("drag-over")
                    );
                    target.classList.add("drag-over");

                    const rect = target.getBoundingClientRect();
                    const midY = rect.top + rect.height / 2;
                    if (e.clientY < midY) {
                        list.insertBefore(dragItem, target);
                    } else {
                        list.insertBefore(dragItem, target.nextSibling);
                    }
                }
            });
        }

        // Handle complete tool input — show loading state
        app.ontoolinput = (params) => {
            const container = document.getElementById("preview-container");
            container.className = "kds-preview kds-preview--loading";
            container.textContent = "Planning page structure…";
        };

        app.ontoolresult = (result) => {
            const sc = result?.structuredContent || result;
            // PagePlan has { sections?: [], fields?: [], reasoning } — unwrap the array
            const planObj = sc?.plan || sc;
            currentPlan = planObj?.sections || planObj?.fields || (Array.isArray(planObj) ? planObj : null);
            const container = document.getElementById("preview-container");
            const actions = document.getElementById("actions");

            if (Array.isArray(currentPlan) && currentPlan.length > 0) {
                container.className = "kds-preview";
                // Show reasoning if available
                const reasoning = planObj?.reasoning;
                const reasoningHtml = reasoning
                    ? '<div class="kds-plan-reasoning">' + reasoning + '</div>'
                    : '';
                container.innerHTML = reasoningHtml + renderPlan(currentPlan);
                actions.style.display = "flex";
                setupDragAndDrop();
            } else {
                container.className = "kds-preview";
                container.innerHTML = "<p>No plan data received.</p>";
            }
        };

        // Handle tool cancellation
        app.ontoolcancelled = (params) => {
            const container = document.getElementById("preview-container");
            container.className = "kds-preview";
            container.innerHTML = "<p>Planning cancelled" + (params?.reason ? ": " + params.reason : "") + "</p>";
        };

        // Handle teardown
        app.onteardown = async () => {
            return {};
        };

        // Apply container dimensions from host context (per ext-apps spec)
        function applyContainerDimensions(ctx) {
            if (!ctx?.containerDimensions) return;
            const dims = ctx.containerDimensions;
            const html = document.documentElement;

            if ('width' in dims) {
                html.style.width = '100vw';
                document.body.style.minWidth = '0';
            } else if ('maxWidth' in dims && dims.maxWidth) {
                html.style.maxWidth = dims.maxWidth + 'px';
            }

            if ('height' in dims) {
                html.style.height = '100vh';
            } else if ('maxHeight' in dims && dims.maxHeight) {
                html.style.maxHeight = dims.maxHeight + 'px';
            }
        }

        // Respond to host theme/style changes
        app.onhostcontextchanged = (ctx) => {
            applyHostStyles(ctx);
            applyContainerDimensions(ctx);
        };

        // Helper: run an action with loading/success/error feedback
        async function runAction(actionName, toolCall, successMsg) {
            const actions = document.getElementById("actions");
            const buttons = actions.querySelectorAll("button");
            buttons.forEach(b => b.disabled = true);
            try {
                await app.callServerTool(toolCall);
                actions.classList.add("submitted");
                actions.innerHTML = '<span class="kds-action-status success">✅ ' + successMsg + '</span>';
                try {
                    await app.sendMessage({
                        role: "user",
                        content: [{ type: "text", text: actionName + ": " + successMsg }],
                    });
                } catch { /* sendMessage not supported by host */ }
            } catch (err) {
                console.error("Action failed:", err);
                buttons.forEach(b => b.disabled = false);
                const errSpan = document.createElement("span");
                errSpan.className = "kds-action-status error";
                errSpan.textContent = "⚠️ " + (err.message || "Action failed");
                actions.prepend(errSpan);
                setTimeout(() => errSpan.remove(), 4000);
            }
        }

        document.getElementById("btn-approve").addEventListener("click", () => {
            const order = getCurrentOrder();
            runAction("approve_plan",
                { name: "approve_plan", arguments: { order } },
                "Plan approved — proceeding with generation");
        });

        document.getElementById("btn-reject").addEventListener("click", () => {
            runAction("reject_section",
                { name: "reject_section", arguments: { reason: "User rejected plan" } },
                "Plan rejected");
        });

        // Connect to the host with timeout
        try {
            const connectTimeout = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Connection timed out")), 10000)
            );
            await Promise.race([app.connect(), connectTimeout]);
            const hostCtx = app.getHostContext();
            if (hostCtx) {
                applyHostStyles(hostCtx);
                applyContainerDimensions(hostCtx);
            }
        } catch (err) {
            const container = document.getElementById("preview-container");
            container.className = "kds-preview";
            container.innerHTML = '<div class="kds-connection-error">'
                + '<div class="kds-connection-error__icon">⚠️</div>'
                + '<div class="kds-connection-error__title">Could not connect to host</div>'
                + '<div class="kds-connection-error__detail">' + (err.message || "Unknown error") + '</div>'
                + '</div>';
        }
    </script>
</body>
</html>`;
