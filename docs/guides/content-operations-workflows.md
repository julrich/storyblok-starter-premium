# Content Operations – n8n Workflows mit dem Storyblok MCP Server

This document describes automation workflows that editors can build using **n8n** connected to the **Storyblok MCP Server** via an MCP client node. Each workflow combines MCP tools with external n8n nodes to automate content production, quality assurance, and housekeeping.

> **💡 Native n8n Node Available:** All MCP tools referenced in these workflows are also available as **native n8n operations** via the [`n8n-nodes-storyblok-kickstartds`](../n8n-nodes-storyblok-kickstartds/) community node package. The native node provides 22 operations across 3 resources (AI Content, Story, Space) and is the recommended approach — no MCP client node needed. See the [n8n node README](../n8n-nodes-storyblok-kickstartds/README.md) for the full operation reference and ready-to-import workflow templates (`workflows/template-*.json`).

---

## 🔴 Höchste Priorität: Content-Produktion automatisieren

### 1. Bulk-Seiten-Generierung aus Datenquellen

Ein Spreadsheet (Google Sheets, Airtable) enthält Zeilen mit Produktnamen, Beschreibungen und Bildern. n8n iteriert über jede Zeile und erstellt automatisch eine vollständige Landing Page.

| Schritt              | Tool                                                | Zweck                                                    |
| -------------------- | --------------------------------------------------- | -------------------------------------------------------- |
| Daten holen          | _n8n Google Sheets Node_                            | Produktdaten auslesen                                    |
| Muster analysieren   | `analyze_content_patterns`                          | Bestehende Seitenstrukturen und Komponentennutzung lesen |
| Sektionen generieren | `generate_section` (pro Sektion)                    | KI erzeugt Sektionen (Hero, Features, CTA) pro Produkt   |
| Bilder hochladen     | `create_page_with_content` mit `uploadAssets: true` | Seite anlegen, Bilder automatisch nach Storyblok         |
| Benachrichtigung     | _n8n Slack Node_                                    | Team über neue Seiten informieren                        |

### 2. Website-Relaunch / Content-Migration

Eine Liste von URLs der alten Website wird Seite für Seite gescrapt, per KI in Design-System-konforme Struktur konvertiert und als neue Storyblok-Seiten angelegt.

| Schritt                 | Tool                                                | Zweck                                                      |
| ----------------------- | --------------------------------------------------- | ---------------------------------------------------------- |
| URLs auflisten          | _n8n Spreadsheet / Sitemap-Parser_                  | Alle zu migrierenden Seiten sammeln                        |
| Ziel-Muster analysieren | `analyze_content_patterns`                          | Bestehende Seitenstrukturen der neuen Site verstehen       |
| Seite scrapen           | `scrape_url`                                        | HTML → sauberes Markdown konvertieren                      |
| Sektionen generieren    | `generate_section` (pro Sektion)                    | Markdown als Prompt → strukturierter Design-System-Content |
| Seite erstellen         | `create_page_with_content` mit `uploadAssets: true` | Neue Seite in Storyblok inkl. Bilder                       |
| Altes/Neues vergleichen | _n8n Comparison Node_                               | Diff-Report für manuelle QA                                |

### 3. Blog-Autopilot aus RSS / Newsletter

Externe Branchennews (RSS-Feeds, Newsletter) werden automatisch in Blogpost-Entwürfe umgewandelt – fertig zur redaktionellen Prüfung.

| Schritt              | Tool                                                                                             | Zweck                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| RSS lesen            | _n8n RSS Feed Node_                                                                              | Neue Artikel erkennen                                                             |
| Quelle scrapen       | `scrape_url`                                                                                     | Volltexte der Artikel extrahieren                                                 |
| Sektionen generieren | `generate_section` (pro Sektion, `contentType: "blog-post"`)                                     | KI erzeugt Sektionen (Text, Split-Even) pro Artikel — kein Hero/CTA (Root-Felder) |
| Root-Felder gen.     | `generate_root_field` für `head`, `aside`, `cta`                                                 | Titel/Autor, Sidebar, Blogpost-CTA generieren                                     |
| SEO generieren       | `generate_seo` mit `contentType: "blog-post"`                                                    | SEO-Metadaten (Titel, Description, Keywords) ableiten                             |
| Entwurf anlegen      | `create_page_with_content` (`contentType: "blog-post"`, `rootFields: { head, aside, cta, seo }`) | Draft in Storyblok mit allen Feldern                                              |
| Team benachrichtigen | _n8n Slack/E-Mail Node_                                                                          | „Neuer Entwurf wartet auf Review"                                                 |

---

## 🟠 Hohe Priorität: Content-Qualität & Governance

### 4. Automatischer Content-Audit (Scheduled)

Einmal pro Woche crawlt n8n alle Stories und prüft auf typische Probleme: fehlende Bilder, leere Alt-Texte, zu kurze Texte, verwaiste Seiten.

| Schritt            | Tool                                                | Zweck                                                        |
| ------------------ | --------------------------------------------------- | ------------------------------------------------------------ |
| Alle Stories laden | `list_stories` (paginiert, `excludeContent: false`) | Komplettes Content-Inventar erfassen                         |
| Details pro Story  | `get_story`                                         | Vollständige Inhalte inspizieren                             |
| Schema prüfen      | `get_component`                                     | Erwartete Felder pro Komponente kennen                       |
| Regeln anwenden    | _n8n Code/Function Node_                            | Prüfungen: leere Felder, Alt-Texte, Textlänge, defekte Links |
| Report erstellen   | _n8n Spreadsheet/Slack Node_                        | Audit-Report ans Team senden                                 |

### 5. SEO-Monitoring & -Optimierung

Stories werden gegen SEO-Regeln geprüft (Meta-Titel, Description, Heading-Hierarchie, Bildoptimierung). Bei Verstößen wird automatisch ein Fix vorgeschlagen.

| Schritt              | Tool                                                   | Zweck                                                                                   |
| -------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| Stories laden        | `list_stories` (`excludeContent: false`) + `get_story` | Inhalte pro Seite holen                                                                 |
| SEO analysieren      | _n8n Code Node_                                        | H1-Existenz, Meta-Länge, Alt-Texte, Keyword-Dichte prüfen                               |
| Fix generieren       | `generate_section` oder `generate_seo`                 | KI schlägt verbesserte Sektionen / Meta-Texte / Headlines vor                           |
| Optional: einspielen | `update_seo`                                           | SEO-Fixes gezielt als Draft speichern (oder `update_story` für umfassendere Änderungen) |
| Report               | _n8n E-Mail/Notion Node_                               | SEO-Scorecard pro Seite                                                                 |

### 6. Broken-Asset-Detektion

Alle verwendeten Bilder in Stories werden mit der Asset-Library abgeglichen – fehlende oder verwaiste Assets werden erkannt.

| Schritt       | Tool                                                   | Zweck                                         |
| ------------- | ------------------------------------------------------ | --------------------------------------------- |
| Stories laden | `list_stories` (`excludeContent: false`) + `get_story` | Alle Bild-URLs aus Content extrahieren        |
| Assets listen | `list_assets` (paginiert)                              | Komplettes Asset-Inventar                     |
| Abgleich      | _n8n Code Node_                                        | Verwaiste Assets & fehlende Referenzen finden |
| Report        | _n8n Slack/Spreadsheet Node_                           | Cleanup-Liste fürs Team                       |

---

## 🟡 Mittlere Priorität: Redaktionelle Workflows

### 7. Competitor-Content-Monitoring

Regelmäßig werden Wettbewerber-Websites gescrapt und per KI zusammengefasst – der Editor erhält Inspiration für eigene Inhalte.

| Schritt                 | Tool                       | Zweck                                             |
| ----------------------- | -------------------------- | ------------------------------------------------- |
| Competitor-URLs scrapen | `scrape_url`               | Inhalte der Wettbewerber extrahieren              |
| Zusammenfassen          | `generate_section`         | KI erstellt Zusammenfassung & Content-Gap-Analyse |
| Ideen speichern         | _n8n Notion/Airtable Node_ | Themenideen im Redaktionsplan ablegen             |
| Optional: Entwurf       | `create_page_with_content` | Direkt Gegeninhalt als Draft erzeugen             |

### 8. Event-/Kampagnen-Seiten auf Knopfdruck

Bei Anlage eines Events in einem externen System (Eventbrite, CRM, Kalender) wird automatisch eine Event-Seite in Storyblok erstellt.

| Schritt            | Tool                                                                                             | Zweck                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| Event-Trigger      | _n8n Webhook / Eventbrite Node_                                                                  | Neues Event erkannt                                        |
| Content generieren | `generate_root_field` mit `contentType: "event-detail"` (pro Feld)                               | KI erzeugt Event-Inhalte (Titel, Beschreibung, Kategorien) |
| Seite erstellen    | `create_page_with_content` mit `contentType: "event-detail"`, `rootFields`, `uploadAssets: true` | Event-Seite live oder als Draft                            |
| Kalender-Link      | _n8n HTTP Node_                                                                                  | .ics Datei generieren und als Asset hochladen              |

### 9. Übersetzungs-Pipeline

Bestehende Stories werden automatisch in andere Sprachen übersetzt und als neue Sprachversionen angelegt.

| Schritt               | Tool                                                  | Zweck                                                   |
| --------------------- | ----------------------------------------------------- | ------------------------------------------------------- |
| Quelle laden          | `get_story`                                           | Originalinhalt holen                                    |
| Übersetzen            | `generate_section` (pro Sektion, Übersetzungs-Prompt) | KI-basierte Übersetzung unter Beibehaltung der Struktur |
| Sprachversion anlegen | `create_page_with_content` oder `update_story`        | Übersetzte Version speichern                            |
| Review-Reminder       | _n8n Slack Node_                                      | Native Speaker zur Prüfung einladen                     |

---

## 🟢 Nice-to-have: Monitoring & Housekeeping

### 10. Content-Freshness-Tracker

Stories, die seit X Monaten nicht aktualisiert wurden, werden identifiziert. Optional generiert die KI Aktualisierungsvorschläge – und kann veraltete Sektionen oder SEO-Daten direkt chirurgisch aktualisieren.

| Schritt               | Tool                   | Zweck                                                               |
| --------------------- | ---------------------- | ------------------------------------------------------------------- |
| Alle Stories laden    | `list_stories`         | Timestamps aller Stories prüfen (Metadata-only-Standard reicht aus) |
| Veraltete filtern     | _n8n Filter/Code Node_ | Stories älter als z.B. 6 Monate                                     |
| Refresh vorschlagen   | `generate_section`     | KI schlägt aktualisierte Sektionen vor                              |
| Sektion aktualisieren | `replace_section`      | Veraltete Sektion gezielt ersetzen, ohne Rest der Seite anzufassen  |
| SEO auffrischen       | `update_seo`           | Veraltete Meta-Daten aktualisieren                                  |
| Report                | _n8n E-Mail Node_      | „12 Seiten aktualisiert, 5 weitere brauchen manuelles Review"       |

### 11. Content-Statistik-Dashboard

Regelmäßig wird ein Snapshot erstellt: Wie viele Stories pro Typ, wie viele Assets, durchschnittliche Sektionen pro Seite etc.

| Schritt             | Tool                                 | Zweck                                                         |
| ------------------- | ------------------------------------ | ------------------------------------------------------------- |
| Stories zählen      | `list_stories` (pro `contentType`)   | Content-Inventar nach Typ (Metadata-only-Standard reicht aus) |
| Assets zählen       | `list_assets`                        | Medien-Statistiken                                            |
| Komponenten-Nutzung | `analyze_content_patterns`           | Komponentenfrequenz, Sektionsfolgen, Sub-Item-Counts          |
| Dashboard           | _n8n Google Sheets / Dashboard Node_ | Wöchentlicher Content-KPI-Report                              |

### 12. Automatische Archivierung

Abgelaufene Event-Seiten oder veraltete Kampagnen-Seiten werden automatisch depubliziert oder in einen Archiv-Ordner verschoben.

| Schritt           | Tool                                             | Zweck                                 |
| ----------------- | ------------------------------------------------ | ------------------------------------- |
| Events laden      | `list_stories` mit `contentType: 'event-detail'` | Alle Event-Seiten                     |
| Details prüfen    | `get_story`                                      | Event-Datum auslesen                  |
| Archivieren       | `update_story`                                   | Status ändern / in Archiv verschieben |
| Optional: löschen | `delete_story`                                   | Endgültig entfernen                   |

### 13. Bulk-SEO-Generierung

Alle Seiten ohne SEO-Metadaten werden automatisch erkannt, per KI werden passende Titel, Descriptions und Keywords generiert und direkt eingespielt – ohne den restlichen Seiteninhalt anzufassen.

| Schritt             | Tool                                                | Zweck                                                         |
| ------------------- | --------------------------------------------------- | ------------------------------------------------------------- |
| Alle Stories laden  | `list_stories` (paginiert, `excludeContent: false`) | Komplettes Content-Inventar erfassen                          |
| SEO-Lücken erkennen | _n8n Code/Filter Node_                              | Stories ohne `seo`-Feld oder mit leeren Meta-Daten filtern    |
| SEO generieren      | `generate_seo` (pro Story)                          | KI erzeugt Titel, Description, Keywords aus Seiteninhalt      |
| SEO einspielen      | `update_seo` (pro Story)                            | Meta-Daten gezielt setzen, ohne restlichen Content anzufassen |
| Report              | _n8n Slack/Spreadsheet Node_                        | „SEO für 23 Seiten generiert und eingespielt"                 |

### 14. Kampagnen-Sektions-Swap

Vor einer Kampagne (Messe, Saisonverkauf, Produktlaunch) werden Heroes oder CTAs auf vielen Seiten gleichzeitig mit Kampagnen-Inhalten ausgetauscht. Nach der Kampagne wird automatisch auf die Originalversionen zurückgewechselt.

| Schritt                    | Tool                           | Zweck                                                       |
| -------------------------- | ------------------------------ | ----------------------------------------------------------- |
| Zielseiten identifizieren  | `list_stories` mit Slug-Filter | Alle betroffenen Seiten finden (z.B. `industry/*`)          |
| Originale sichern          | `get_story` (pro Seite)        | Aktuelle Hero-/CTA-Sektion als Backup speichern             |
| Kampagnen-Content erzeugen | `generate_section`             | KI generiert Kampagnen-Hero oder -CTA                       |
| Sektion austauschen        | `replace_section` (pro Seite)  | Nur die Zielsektion ersetzen, Rest bleibt unangetastet      |
| Nach Kampagne: Rollback    | `replace_section` (pro Seite)  | Original-Sektionen aus Backup wiederherstellen              |
| Report                     | _n8n Slack Node_               | „Kampagnen-Rollout: 15 Seiten aktualisiert / zurückgesetzt" |

---

## MCP-Tool-Referenz

Alle im MCP Server verfügbaren Tools auf einen Blick:

| Kategorie          | Tool                         | Beschreibung                                                                                                                                           |
| ------------------ | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Stories**        | `list_stories`               | Stories im Space auflisten, optional nach Content-Typ oder Slug filtern. Standardmäßig nur Metadaten; `excludeContent: false` für vollständigen Inhalt |
|                    | `get_story`                  | Einzelne Story mit vollständigem Inhalt abrufen                                                                                                        |
|                    | `create_story`               | Neue Story mit Basisinhalt anlegen (unterstützt `path` für automatische Ordnererstellung)                                                              |
|                    | `create_page_with_content`   | Neue Seite mit vorgefertigten Sektionen erstellen, UIDs auto-generieren (unterstützt `path`)                                                           |
|                    | `update_story`               | Bestehende Story aktualisieren (Inhalt, Name, Slug)                                                                                                    |
|                    | `delete_story`               | Story dauerhaft löschen                                                                                                                                |
|                    | `search_content`             | Volltextsuche über alle Stories                                                                                                                        |
|                    | `get_ideas`                  | Ideen/Notizen aus dem Space abrufen                                                                                                                    |
|                    | `ensure_path`                | Ordnerpfad sicherstellen (wie `mkdir -p`), fehlende Zwischenordner anlegen, Ordner-ID zurückgeben                                                      |
| **Import**         | `import_content`             | Prompter-Komponente in einer Story durch neue Sektionen ersetzen                                                                                       |
|                    | `import_content_at_position` | Sektionen an bestimmter Position einfügen, ohne bestehende Inhalte zu entfernen                                                                        |
|                    | `replace_section`            | Einzelne Sektion per Index ersetzen – ohne die gesamte Story laden/zurückschreiben zu müssen                                                           |
| **Convenience**    | `update_seo`                 | SEO-Metadaten (Titel, Description, Keywords, Bild) setzen/aktualisieren – erstellt die SEO-Komponente automatisch, falls nicht vorhanden               |
| **KI-Generierung** | `generate_content`           | Strukturierte Inhalte per KI (GPT-4) erzeugen — für automatisierte Workflows (n8n). In Chat-Interfaces `generate_section` bevorzugen.                  |
| **Guided Gen.**    | `analyze_content_patterns`   | Strukturmuster aller Stories aus Startup-Cache (sofort, kein API-Call; `refresh: true` nach Publish)                                                   |
|                    | `list_recipes`               | Kuratierte Sektions-Rezepte und Seitentemplates, optional mit Live-Mustern aus dem Space                                                               |
|                    | `plan_page`                  | KI-gestützte Seitenstruktur-Planung anhand von Intent und Website-Mustern (bei Hybrid-Typen inkl. `rootFieldMeta`)                                     |
|                    | `generate_section`           | Einzelne Sektion generieren mit automatischer Site-Kontext-Injektion und Übergangshinweisen                                                            |
|                    | `generate_root_field`        | Einzelnes Root-Feld für Hybrid-Content-Typen generieren (z.B. `head`, `aside`, `cta` bei blog-post)                                                    |
|                    | `generate_seo`               | SEO-Metadaten (Titel, Description, Keywords, OG-Image) für beliebigen Content-Typ generieren                                                           |
| **Komponenten**    | `list_components`            | Alle Komponenten-Schemas im Space auflisten                                                                                                            |
|                    | `get_component`              | Detailliertes Schema einer einzelnen Komponente abrufen                                                                                                |
| **Assets**         | `list_assets`                | Medien-Assets (Bilder, Dateien) auflisten mit optionaler Suche                                                                                         |
| **Icons**          | `list_icons`                 | Alle verfügbaren Icon-Bezeichner auflisten (für Icon-Felder in Komponenten)                                                                            |
| **Web-Scraping**   | `scrape_url`                 | Webseite herunterladen und in sauberes Markdown konvertieren                                                                                           |

---

## 💬 Interaktive Anwendungsfälle mit Claude Desktop

Neben den automatisierten n8n-Workflows kann ein Redakteur den MCP Server auch **direkt über Claude Desktop** nutzen – im Dialog, iterativ und explorativ. Claude Desktop verbindet sich per MCP (stdio-Transport) mit dem Server und stellt alle Tools als natürlichsprachige Aktionen bereit.

### Neue Seiten & Inhalte erstellen

#### Komplette Seiten per Prompt generieren

Der Editor beschreibt in natürlicher Sprache, welche Seite er braucht – z.B. _„Erstelle eine Landing Page für unser neues Produkt X mit Hero, Features-Sektion und FAQ"_. Claude analysiert zunächst bestehende Seitenmuster, plant die Struktur und generiert die Sektionen einzeln – mit automatischem Site-Kontext und Übergangshinweisen für konsistentere Ergebnisse.

| Tool                       | Zweck                                                    |
| -------------------------- | -------------------------------------------------------- |
| `analyze_content_patterns` | Bestehende Seitenmuster und Komponentennutzung verstehen |
| `plan_page`                | KI-gestützte Seitenstruktur planen                       |
| `generate_section`         | Einzelne Sektionen mit Site-Kontext generieren           |
| `create_page_with_content` | Fertige Seite direkt in Storyblok anlegen                |

#### Einzelne Sektionen zu bestehenden Seiten hinzufügen

Eine Seite existiert bereits, aber es fehlt z.B. ein Testimonial-Bereich oder eine FAQ-Sektion. Der Editor beschreibt den gewünschten Inhalt, und die neue Sektion wird an der richtigen Position eingefügt, ohne bestehende Inhalte zu verändern.

| Tool                         | Zweck                                         |
| ---------------------------- | --------------------------------------------- |
| `get_story`                  | Bestehende Seitenstruktur laden und verstehen |
| `generate_section`           | Neue Sektion passend zum Kontext erzeugen     |
| `import_content_at_position` | An gewünschter Stelle einfügen                |

#### Iteratives Verfeinern im Dialog

_„Mach die Hero-Headline kürzer"_, _„Tausche die Testimonials-Sektion gegen eine Stats-Sektion"_, _„Füge noch ein CTA am Ende ein"_. Claude behält den Kontext und kann gezielt `generate_section` für neue oder ersetzte Sektionen, `replace_section` für chirurgische Updates einzelner Sektionen, `update_seo` für SEO-Metadaten oder `update_story` für umfassendere Änderungen aufrufen, bis das Ergebnis stimmt.

| Tool               | Zweck                                     |
| ------------------ | ----------------------------------------- |
| `generate_section` | Einzelne Sektion neu generieren           |
| `replace_section`  | Einzelne Sektion gezielt ersetzen         |
| `update_seo`       | SEO-Metadaten setzen/aktualisieren        |
| `update_story`     | Umfassende Änderungen als Draft speichern |
| `get_story`        | Zwischenstand prüfen                      |

### Inhalte aus externen Quellen übernehmen

#### Webseiten scrapen und aufbereiten

Der Editor nennt eine URL – z.B. von einer Konkurrenz-Seite, einem Artikel oder einer alten Website – und bittet Claude, den Inhalt als neue Storyblok-Seite aufzubereiten. Claude scrapt die Seite, plant die Sektionsstruktur, generiert jede Sektion einzeln und legt die Seite an.

| Tool                                                | Zweck                                      |
| --------------------------------------------------- | ------------------------------------------ |
| `scrape_url`                                        | Webseite → Markdown extrahieren            |
| `plan_page`                                         | Seitenstruktur planen                      |
| `generate_section` (pro Sektion)                    | Markdown → Design-System-Sektionen einzeln |
| `create_page_with_content` mit `uploadAssets: true` | Seite inkl. Bilder in Storyblok anlegen    |

#### Inhalte aus Dokumenten übernehmen

Der Editor kopiert Fließtext aus einem PDF, Word-Dokument oder einer E-Mail direkt in den Claude-Desktop-Chat und bittet darum, daraus eine CMS-Seite zu machen. Claude plant die Seitenstruktur, generiert passende Sektionen (Hero, Text/Bild, CTA) und importiert sie.

| Tool                             | Zweck                                     |
| -------------------------------- | ----------------------------------------- |
| `plan_page`                      | Seitenstruktur aus dem Text ableiten      |
| `generate_section` (pro Sektion) | Text in Komponenten pro Sektion umwandeln |
| `create_page_with_content`       | Fertige Seite anlegen                     |

### Bestehende Inhalte durchsuchen & verstehen

#### Inhalte im Space finden und inspizieren

Ein Editor fragt: _„Welche Blogposts haben wir zum Thema Nachhaltigkeit?"_ oder _„Zeig mir alle Event-Seiten"_. Claude durchsucht den Space und liefert eine übersichtliche Zusammenfassung.

| Tool                       | Zweck                                     |
| -------------------------- | ----------------------------------------- |
| `search_content`           | Volltextsuche über alle Stories           |
| `list_stories` mit Filtern | Nach Content-Typ oder Slug-Präfix filtern |
| `get_story`                | Details einer gefundenen Story anzeigen   |

#### Seitenstruktur verstehen

_„Was steht aktuell auf der Startseite?"_ – Claude lädt die Story und beschreibt die Struktur in natürlicher Sprache: welche Sektionen es gibt, welche Komponenten verwendet werden, ob Bilder oder CTAs fehlen.

| Tool            | Zweck                             |
| --------------- | --------------------------------- |
| `get_story`     | Vollständige Seitenstruktur laden |
| `get_component` | Komponentenschema erklären        |

### Komponenten & Schema erkunden

#### Verfügbare Bausteine entdecken

_„Welche Komponenten kann ich auf einer Seite verwenden?"_ – Claude listet alle verfügbaren Komponenten auf und erklärt ihre Felder und Optionen in verständlicher Sprache, ohne dass der Editor das JSON-Schema verstehen muss.

| Tool              | Zweck                              |
| ----------------- | ---------------------------------- |
| `list_components` | Übersicht aller Komponenten        |
| `get_component`   | Detailinfo zu einzelner Komponente |

#### Komponentenvergleich und -empfehlung

_„Was ist der Unterschied zwischen Hero und Image-Story?"_ oder _„Welche Komponente eignet sich am besten für Kundenzitate?"_ – Claude vergleicht die Schemas und gibt eine Empfehlung.

| Tool                       | Zweck                                          |
| -------------------------- | ---------------------------------------------- |
| `get_component` (mehrfach) | Schemas vergleichen                            |
| `list_components`          | Gesamtübersicht für Empfehlung                 |
| `list_recipes`             | Bewährte Kombinationen und Rezepte vorschlagen |

#### Verfügbare Icons nachschlagen

_„Welche Icons kann ich im Hero-Button verwenden?"_ – Claude listet alle verfügbaren Icon-Bezeichner auf und hilft bei der Auswahl des passenden Icons für CTAs, Features oder Kontaktdaten.

| Tool         | Zweck                                                     |
| ------------ | --------------------------------------------------------- |
| `list_icons` | Alle gültigen Icon-Bezeichner für Komponenten-Icon-Felder |

### Content-Pflege im Dialog

#### Seiten umschreiben oder aktualisieren

_„Aktualisiere die About-Seite, wir sind jetzt 50 Mitarbeiter statt 35"_ – Claude lädt die aktuelle Seite, findet die relevante Sektion, generiert den aktualisierten Inhalt und ersetzt nur diese eine Sektion.

| Tool               | Zweck                                           |
| ------------------ | ----------------------------------------------- |
| `get_story`        | Aktuellen Inhalt laden                          |
| `generate_section` | Überarbeitete Sektion generieren                |
| `replace_section`  | Nur die betroffene Sektion chirurgisch ersetzen |

#### Tonalität oder Zielgruppe anpassen

_„Schreibe die Startseite um, wir wollen jünger und lockerer klingen"_ – Claude lädt den Content, generiert jede Sektion mit angepasster Tonalität und zeigt sie einzeln zur Prüfung.

| Tool               | Zweck                                                    |
| ------------------ | -------------------------------------------------------- |
| `get_story`        | Originalinhalt laden                                     |
| `generate_section` | Sektion für Sektion mit angepasster Tonalität generieren |
| `replace_section`  | Jede genehmigte Sektion einzeln ersetzen                 |

#### Quick-Cleanup: Alt-Texte, CTAs, Meta-Daten ergänzen

_„Geh alle Seiten durch und schlage fehlende Alt-Texte vor"_ – Claude iteriert über Stories, identifiziert Lücken und generiert passende Texte. Der Editor bestätigt im Dialog, bevor gespeichert wird.

| Tool               | Zweck                       |
| ------------------ | --------------------------- |
| `list_stories`     | Alle Seiten durchgehen      |
| `get_story`        | Inhalte inspizieren         |
| `generate_section` | Bereinigte Sektion erzeugen |
| `replace_section`  | Nach Bestätigung ersetzen   |

### Ideen & Planung

#### Brainstorming mit CMS-Kontext

_„Wir brauchen eine neue Kampagnen-Seite zum Thema Sommerschlussverkauf. Was hast du für Ideen?"_ – Claude kennt durch `list_components` die verfügbaren Bausteine und durch `list_stories` die bestehenden Inhalte, und kann so kontextbewusste Vorschläge machen, die direkt umsetzbar sind.

| Tool              | Zweck                                      |
| ----------------- | ------------------------------------------ |
| `list_components` | Verfügbare Bausteine für Vorschläge kennen |
| `list_stories`    | Bestehende Inhalte als Kontext             |
| `get_ideas`       | Vorhandene Ideen einbeziehen               |

#### Von der Idee zur fertigen Seite in einem Gespräch

Der Editor startet mit einer vagen Idee, Claude hilft bei der Strukturierung, generiert Inhalte Sektion für Sektion, der Editor gibt Feedback, und am Ende steht eine fertige Seite in Storyblok – alles in einer einzigen Chat-Session.

| Tool                             | Zweck                                                     |
| -------------------------------- | --------------------------------------------------------- |
| `analyze_content_patterns`       | Bestehende Muster als Grundlage verstehen                 |
| `list_recipes`                   | Bewährte Sektions-Rezepte und Seitentemplates vorschlagen |
| `plan_page`                      | Seitenstruktur auf Basis der Idee planen                  |
| `generate_section` (pro Sektion) | Sektionen einzeln erzeugen und im Dialog anpassen         |
| `create_page_with_content`       | Finales Ergebnis in Storyblok anlegen                     |

---

> **Das Muster:** Fast jeder Workflow kombiniert **Daten-Input** (extern oder aus Storyblok selbst) → **Muster-Analyse** (`analyze_content_patterns`) → **Planung** (`plan_page`, `list_recipes`) → **KI-Generierung** (`generate_section` pro Sektion für maximale Kontrolle; `generate_content` nur in vollautomatisierten n8n-Workflows) → **CMS-Aktion** (`create_page_with_content`, `import_content_at_position`, `replace_section`, `update_seo`, `update_story`) → **Benachrichtigung**. Die Convenience-Tools `replace_section` und `update_seo` ermöglichen dabei **chirurgische Eingriffe** – einzelne Sektionen oder SEO-Metadaten aktualisieren, ohne die gesamte Story laden und zurückschreiben zu müssen. n8n kann diese Ketten vollautomatisch oder per Trigger auslösen, während Claude Desktop dieselben Tools für **interaktive, explorative Arbeit** bereitstellt – der Editor wird vom Produzenten zum Kurator.
