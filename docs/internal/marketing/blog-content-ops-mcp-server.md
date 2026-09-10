# Dein CMS kann jetzt denken – Content Operations mit KI automatisieren

![Abstrakte Darstellung von vernetzten Bausteinen und KI – Symbolbild für die Verbindung von Design System und künstlicher Intelligenz](https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1400&q=80)

**Die meisten Unternehmen investieren sechsstellig in ihr CMS. Und dann sitzen Redakteure davor und tippen. Kein Kontext. Keine Automatisierung. Keine Intelligenz. Was wäre, wenn dein CMS sein eigenes Design System verstehen würde – und Inhalte generiert, die sofort zu den verfügbaren Bausteinen passen?**

---

## Das Problem: Content-Produktion skaliert nicht

Kennst du das? 50 Landing Pages für die nächste Messe. Ein neuer Blogpost pro Woche. Produktseiten für einen Katalog mit 200 Einträgen. Jede einzelne Seite wird manuell zusammengestellt: Text schreiben, Bilder suchen, Komponenten konfigurieren, Meta-Daten pflegen. Immer derselbe Ablauf. Immer dieselben Handgriffe.

Das CMS – egal ob Storyblok, Contentful oder ein anderes Headless-System – ist dabei im Grunde ein leeres Formular. Es weiß nicht, welche Komponenten es gibt. Es weiß nicht, wie deine Marke klingt. Es weiß nicht, dass der Alt-Text fehlt oder die Heading-Hierarchie kaputt ist.

Gleichzeitig zeigt die Praxis, was Designsysteme leisten können: Konsistenz, Effizienz und Skalierbarkeit – wie wir in [früheren Beiträgen](https://www.ruhmesmeile.com/design-system-insights/die-zeit-ist-reif-fuer-designsysteme) beschrieben haben. Die Spark­box-Studie belegt, dass die Verwendung eines Design Systems die Implementierung um 47 % beschleunigt. Doch was, wenn wir diesen Effizienzvorteil auch auf die _Inhaltserstellung_ selbst übertragen könnten?

Genau das haben wir gemacht.

![Illustration eines modernen Arbeitsplatzes mit Bildschirmen und Automatisierungssymbolen](https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1400&q=80)

---

## Die Idee: Das Design System als API-Vertrag für die KI

Unser Open-Source-Starterkit [kickstartDS](https://www.kickstartds.com) basiert auf einem zentralen Prinzip: **Jede Komponente wird durch ein JSON Schema definiert.** Dieses Schema beschreibt exakt, welche Properties eine Komponente akzeptiert, welche Typen erlaubt sind, welche Varianten existieren und wie Komponenten ineinander verschachtelt werden dürfen.

```
JSON Schema → TypeScript-Types
JSON Schema → Storybook-Stories
JSON Schema → CMS-Komponentenschema
JSON Schema → OpenAI-kompatible Schemas ← NEU
```

Ein Schema. Vier Outputs. Zero Drift.

Und genau hier wird es spannend: Wenn dein Design System eine maschinenlesbare, formale Beschreibung jeder verfügbaren Komponente mitbringt, dann kann eine KI diese Beschreibung nutzen, um **strukturierte Inhalte zu generieren, die exakt zum Design System passen** – ohne Training, ohne Fine-Tuning, ohne Prompt-Engineering-Voodoo.

Die Verbindung zwischen KI und CMS haben wir über das **Model Context Protocol (MCP)** realisiert – einen offenen Standard, der KI-Assistenten wie Claude oder GPT-4 mit externen Tools und Datenquellen verbindet.

---

## Der Storyblok MCP Server: Dein CMS bekommt einen Co-Piloten

Unser [Storyblok MCP Server](https://github.com/kickstartDS/storyblok-starter-premium/tree/main/packages/storyblok-mcp) ist ein Open-Source-Server, der dein Storyblok CMS mit KI-Assistenten verbindet. Er bietet 30 spezialisierte Tools, die sich in sechs Kategorien gliedern:

| Kategorie                  | Was es tut                                      | Beispiel-Tools                                                |
| -------------------------- | ----------------------------------------------- | ------------------------------------------------------------- |
| **Content Management**     | Seiten lesen, erstellen, aktualisieren, löschen | `list_stories`, `create_page_with_content`, `replace_section` |
| **KI-Content-Generierung** | Inhalte strukturiert generieren und importieren | `generate_section`, `generate_root_field`, `generate_seo`     |
| **Analyse & Planung**      | Bestehende Muster erkennen, Qualität prüfen     | `analyze_content_patterns`, `plan_page`, `content_audit`      |
| **Web Scraping**           | Externe Inhalte extrahieren und aufbereiten     | `scrape_url`                                                  |
| **Introspection**          | Komponenten, Assets und Icons auflisten         | `list_components`, `get_component`, `list_icons`              |
| **Theming**                | Design-Token-Themes verwalten und anwenden      | `list_themes`, `get_theme`, `apply_theme`                     |

Aber die wirkliche Innovation steckt nicht in der Anzahl der Tools – sondern darin, **wie** sie die KI anleiten.

![Abstrakte Netzwerkstruktur mit Knotenpunkten – Symbolbild für die Verbindung verschiedener Systeme](https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1400&q=80)

---

## Das Geheimnis: Multi-Layered Hints und Schema-Injection

Die meiste „KI-generierte Content"-Erfahrung kennt man so: Du gibst einen Prompt ein, die KI antwortet mit Freitext, und du kopierst das Ergebnis irgendwohin. Das Ergebnis ist beliebig, unstrukturiert und passt selten zur vorhandenen Komponentenstruktur.

Unser Ansatz ist grundlegend anders. Wir nutzen **OpenAI Structured Outputs** – ein Feature, bei dem die KI nicht beliebigen Text zurückgibt, sondern ein JSON-Objekt, das einem vorgegebenen Schema entspricht. Und dieses Schema leiten wir automatisch aus dem Design System ab.

### Schritt 1: Schema-Transformation (15 Passes)

Das Design System liefert Standard-JSON-Schemas. OpenAI hat aber eigene Einschränkungen: kein `const`-Keyword, kein `format`, keine optionalen Properties. Also transformieren wir das Schema in 15 automatisierten Durchläufen:

- **`const` → Discriminator-Replacement:** Das `const`-Keyword (z. B. `"type": { "const": "hero" }`) wird durch ein `type__hero`-String-Feld ersetzt, das die KI als Discriminator nutzt
- **Unsupported Keywords entfernen:** `format`, `minItems`, `$id`, `$schema` und andere werden gestrippt
- **Strict Mode erzwingen:** Jedes Objekt bekommt `additionalProperties: false`, alle Properties werden `required`
- **Field Annotations injizieren:** Properties wie `spaceBefore` oder `variant` bekommen kontextuelle Beschreibungen, die der KI Guidance geben

Das Ergebnis: Ein Schema, das OpenAI versteht und das exakt die Struktur deiner Design-System-Komponenten abbildet.

### Schritt 2: Site-Aware Context Injection

Die KI bekommt nicht nur das Schema – sie bekommt **Kontext über deine konkrete Website**. Das Tool `analyze_content_patterns` analysiert alle veröffentlichten Stories und extrahiert:

- **Komponentenfrequenz:** Welche Komponenten werden tatsächlich genutzt und wie oft?
- **Sektionssequenzen:** Welche Komponenten folgen typischerweise aufeinander?
- **Sub-Component-Counts:** Wie viele Feature-Items hat eine Feature-Sektion typischerweise? (3? 4? 6?)
- **Seiten-Archetypen:** Welche wiederkehrenden Seitenstrukturen gibt es?
- **Field Value Distributions:** Welche Werte haben Felder wie `width`, `content_mode` oder `variant` auf deiner Site typischerweise?

All diese Informationen fließen automatisch in den System-Prompt ein, wenn `generate_section` aufgerufen wird.

### Schritt 3: Compositional Guidance

Hier wird es richtig clever. Das System erkennt **drei Dimensionen** von Kontext für jedes Feld:

1. **Context-free Baseline** – Wie wird das Feld generell auf der Site genutzt? (z. B. „80 % aller Sections haben `width: full`")
2. **Component-Aware** – Wie verhält sich das Feld, wenn eine bestimmte Komponente enthalten ist? (z. B. „Sections mit Hero haben zu 95 % `spaceBefore: none`")
3. **Position-Aware** – Wie verhält sich das Feld je nach Position auf der Seite? (z. B. „Die erste Sektion hat immer `spaceBefore: none`")

Diese dreischichtige Guidance wird nicht als vager Hinweis formuliert, sondern **direkt in die Schema-Descriptions injiziert** – sodass die KI die Information als Teil der formalen Strukturbeschreibung erhält.

> **Das Ergebnis:** Die KI generiert keine beliebigen Inhalte. Sie generiert Inhalte, die aussehen, als hätte ein erfahrener Redakteur jede Seite manuell zusammengebaut – weil die KI dieselben Muster gelernt hat, die auch der Redakteur intuitiv anwendet.

![Nahaufnahme einer Zahnradmechanik – Symbolbild für präzise ineinandergreifende Systeme](https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=1400&q=80)

---

## Von der Theorie zur Praxis: Content-Operations-Workflows

Was bedeutet das alles im Alltag? Hier sind drei konkrete Workflows, die wir mit dem MCP Server und dem Workflow-Automatisierungstool n8n umgesetzt haben:

### 1. Bulk-Seiten-Generierung: 50 Landing Pages in 50 Minuten

**Das Szenario:** Eine Messe steht an. 50 Produktseiten müssen her. Jede mit Hero, Features, FAQ und CTA.

**Der Workflow:**

1. Google Sheet mit Produktdaten (Name, Beschreibung, Features, Tonalität)
2. `analyze_content_patterns` → Bestehende Seitenstrukturen verstehen
3. `plan_page` → KI plant die optimale Sektionsreihenfolge pro Produkt
4. `generate_section` → Jede Sektion wird einzeln generiert, mit Kontext zur vorherigen und nächsten Sektion
5. `create_page_with_content` mit `uploadAssets: true` → Seite wird angelegt, Bilder automatisch nach Storyblok hochgeladen

**Das Ergebnis:** 50 Seiten. 50 Minuten. Kein Copy-Paste. Jede Seite sieht aus, als wäre sie individuell gestaltet worden – weil sie es im Grunde auch wurde, nur eben von einer KI, die das Design System versteht.

### 2. Content-Migration: Website-Relaunch ohne Schmerzen

**Das Szenario:** 120 Seiten von einem Legacy-CMS in eine neue Storyblok-Instanz migrieren.

**Der Workflow:**

1. Sitemap der alten Website als URL-Liste
2. `scrape_url` → Jede Seite wird als sauberes Markdown extrahiert, inklusive Bilder und Struktur
3. `generate_section` → Markdown dient als Prompt, die KI konvertiert in Design-System-konforme Komponenten
4. `create_page_with_content` mit `uploadAssets: true` → Neue Seiten inkl. Bilder
5. Diff-Report für manuelle QA

**Das Ergebnis:** 2 Tage statt 3 Wochen. Der Redakteur reviewt und freigegeben – das Grundgerüst baut die KI.

### 3. Blog-Autopilot: Von RSS zu fertigem Draft

**Das Szenario:** Externe Branchennews automatisch in Blogpost-Entwürfe verwandeln.

**Der Workflow:**

1. RSS-Feed als Trigger in n8n
2. `scrape_url` → Volltext extrahieren
3. `plan_page` mit `contentType: "blog-post"` → Sektionsplan
4. `generate_section` pro Sektion → Inhalte generieren
5. `generate_root_field` für `head`, `aside`, `cta` → Blog-Metadaten generieren
6. `generate_seo` → SEO-optimierte Metadaten erzeugen
7. `create_page_with_content` → Draft in Storyblok
8. Slack-Notification: „Neuer Entwurf wartet auf Review"

**Das Ergebnis:** 80 % weniger Aufwand. 100 % Kontrolle. Die KI liefert den Rohstoff, der Redakteur liefert die Qualität.

![Person am Laptop in einem modernen Büro – Symbolbild für produktive Content-Arbeit](https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1400&q=80)

---

## Qualitätssicherung: Nicht nur generieren, auch validieren

Ein entscheidender Aspekt, der unseren Ansatz von „einfach GPT an das CMS anklemmen" unterscheidet: **Jeder generierte Inhalt wird vor dem Speichern gegen das Design-System-Schema validiert.**

Die Validierung prüft automatisch:

- **Unbekannte Komponententypen** → Keine halluzinierten Bausteine
- **Verschachtelungsverletzungen** → Sub-Komponenten nur dort, wo sie hingehören
- **Dual-Discriminator-Konflikte** → Kein `type` und `component` auf demselben Knoten

Zusätzlich gibt es **nicht-blockierende Qualitätswarnungen** für kompositorische Probleme:

- Doppelte Hero-Sektionen auf einer Seite
- Zu wenige Items in einer Feature-Liste (< 3)
- Fehlende CTAs am Seitenende
- Konkurrierende Call-to-Actions
- Redundante Headlines (Section-Headline + Komponenten-Headline mit demselben Text)

Diese Warnungen sind das digitale Äquivalent eines erfahrenen Art Directors, der über die Schulter schaut und sagt: „Das sieht nicht ganz richtig aus."

---

## Die Architektur: Drei Ebenen, ein Ökosystem

```
┌─────────────────────────────────────────────────────┐
│  KI-Assistenten (Claude, GPT-4, Custom Agents)      │
│  + n8n Workflows (26 native Operations)             │
├─────────────────────────────────────────────────────┤
│  MCP Server / Shared Services Library               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │ Schema   │ │ Generate │ │ Validate │ │ Assets │ │
│  │ Prepare  │ │ + Plan   │ │ + Warn   │ │ Upload │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────┘ │
├─────────────────────────────────────────────────────┤
│  Storyblok CMS + kickstartDS Design System          │
│  (JSON Schema → Komponenten → Website)              │
└─────────────────────────────────────────────────────┘
```

Die gesamte Intelligenz steckt in der mittleren Schicht – einer **Shared Services Library** (`@kickstartds/storyblok-services`), die von drei verschiedenen Runtimes konsumiert wird:

1. **MCP Server** → Für KI-Assistenten wie Claude Desktop oder VS Code Copilot
2. **n8n Community Node** → Für Workflow-Automatisierung ohne Code
3. **Next.js API Routes** → Für den In-Visual-Editor „Prompter" in Storyblok

Dieselbe Schema-Vorbereitung, dieselbe Validierung, dieselbe Content-Transformation – unabhängig davon, ob ein KI-Assistent, ein n8n-Workflow oder ein Redakteur im Visual Editor den Inhalt generiert.

---

## 5 Content Types, 1 Schema Registry

Der MCP Server unterstützt nicht nur Standard-Seiten, sondern **fünf verschiedene Content-Types** über eine zentrale Schema Registry:

| Content Type      | Architektur                      | Beispiel                         |
| ----------------- | -------------------------------- | -------------------------------- |
| **page**          | Sektions-basiert                 | Landing Pages, Produktseiten     |
| **blog-post**     | Hybrid (Sektionen + Root-Felder) | Blogartikel mit Head, Aside, CTA |
| **blog-overview** | Hybrid                           | Blog-Übersichtsseiten            |
| **event-detail**  | Flat (Root-Level-Felder)         | Einzelne Veranstaltungen         |
| **event-list**    | Flat                             | Veranstaltungsübersichten        |

Jeder Content Type bringt seine eigenen Schemas, Validierungsregeln und Rezepte mit. Die KI weiß automatisch, dass ein Blogpost keinen Hero braucht (das erledigt das `head`-Root-Feld), aber eine Landing Page typischerweise mit einem Hero beginnt.

![Geordnete, farbige Ordner in einem Regal – Symbolbild für strukturierte Content-Typen](https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=1400&q=80)

---

## Section Recipes: Erprobte Muster statt Zufallstreffer

Neben der statistischen Analyse bietet der MCP Server **kuratierte Section Recipes** – erprobte Komponenten-Kombinationen, die nachweislich gut funktionieren:

- **19 Sektions-Rezepte** (14 für Seiten, 3 für Blogposts, 2 für Events)
- **14 Seiten-Templates** (Product Landing Page, About Page, FAQ Page, ...)
- **13 Anti-Patterns** (Doppelte Heroes, zu wenige Stats, fehlende CTAs, ...)

Das Tool `plan_page` kombiniert diese Rezepte mit den Live-Patterns deiner Website und den Wünschen des Nutzers zu einem optimalen Seitenaufbau. Das Ergebnis ist nicht generisch – es ist eine Empfehlung, die auf deiner konkreten Website und deinem Design System basiert.

---

## Der empfohlene Workflow: Section by Section

Die höchste Qualität erreichst du mit unserem empfohlenen Workflow für die sektionsweise Generierung:

```
analyze_content_patterns   → Site-Muster verstehen
         ↓
      plan_page            → Sektionssequenz planen
         ↓
  generate_section (×n)    → Jede Sektion einzeln generieren
         ↓
  generate_root_field (×n) → Root-Felder generieren (Blog, Events)
         ↓
     generate_seo          → SEO-Metadaten erzeugen
         ↓
create_page_with_content   → Alles zusammensetzen und speichern
```

Jede Sektion wird mit dem Kontext der vorherigen und nächsten Sektion generiert – für saubere Übergänge. Jeder Schritt ist validiert. Und das Ergebnis sieht aus, als hätte ein Content-Stratege jede Entscheidung manuell getroffen.

---

## Was das für dein Team bedeutet

Die Frage ist nicht „Brauchen wir KI im CMS?" Die Frage ist: „Wie lange können wir es uns leisten, ohne zu arbeiten?"

Unser Ansatz dreht die Rollen um:

|                           | Vorher                                | Nachher                                 |
| ------------------------- | ------------------------------------- | --------------------------------------- |
| **Redakteur**             | Produzent (tippt, formatiert, klickt) | Kurator (prüft, verfeinert, publiziert) |
| **Zeit pro Landing Page** | 3 Stunden                             | 15 Minuten inkl. Review                 |
| **Content-Audit**         | „Machen wir irgendwann mal"           | Läuft jeden Montag automatisch          |
| **SEO-Checks**            | Manuelle Stichproben                  | Automatisch bei jeder Generierung       |
| **50 Messeseiten**        | 3 Wochen, 1 Burnout                   | 50 Minuten, 0 Burnout                   |

Die KI ersetzt den Redakteur nicht. Sie macht ihn schneller, konsistenter und gibt ihm die Zeit zurück, die er für das Wesentliche braucht: bessere Geschichten erzählen.

---

## Open Source und sofort einsatzbereit

Der gesamte Stack ist Open Source:

- **[kickstartDS](https://www.kickstartds.com)** – Das Design-System-Starterkit
- **[Storyblok MCP Server](https://github.com/kickstartDS/storyblok-starter-premium)** – Der MCP Server mit 30 Tools
- **[n8n Community Node](https://www.npmjs.com/package/n8n-nodes-storyblok-kickstartds)** – 26 native n8n-Operations
- **[Shared Services Library](https://www.npmjs.com/package/@kickstartds/storyblok-services)** – Schema, Validierung, Transformation

Du brauchst: ein Storyblok-Konto, einen OpenAI-API-Key und ein Design System auf Basis von kickstartDS. Den Rest macht der Accelerator.

![Teamarbeit an einem Whiteboard mit Post-its – Symbolbild für kollaborative Planung](https://images.unsplash.com/photo-1552664730-d307ca884978?w=1400&q=80)

---

## Fazit: Das Design System ist der Schlüssel

Wer ein sauberes Design System hat, hat den Grundstein für AI-enabled Content Operations gelegt. Wer keins hat, automatisiert Chaos.

Das JSON Schema ist nicht nur eine Dokumentation für Entwickler – es ist der **API-Vertrag zwischen Mensch, Design System und KI**. Wenn die Komponentendefinition sauber ist, kann die KI sie nutzen – ohne Training, ohne Fine-Tuning. Einfach: saubere Schemas rein → sauberer Content raus.

Das ist kein KI-Trick. Das ist die Dividende von gutem Software-Engineering.

---

**Du willst sehen, wie das funktioniert? Wir zeigen es dir gerne in einer Live-Demo.**

[Sprich uns an](https://www.ruhmesmeile.com/ueber-uns/kontakt) · [GitHub Repository](https://github.com/kickstartDS/storyblok-starter-premium) · [kickstartDS Website](https://www.kickstartds.com)

---

_Dieser Beitrag ist Teil unserer Serie zu AI-enabled Content Operations. Folge uns auf [LinkedIn](https://www.linkedin.com/company/ruhmesmeile/) für wöchentliche Insights zu Design Systems, MCP und Content-Automatisierung._

`#AIenabledCMS` `#ContentOperations` `#kickstartDS` `#MCP` `#DesignSystem`
