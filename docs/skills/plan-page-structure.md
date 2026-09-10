# Seite Sektion für Sektion planen und erstellen

## Wann verwenden

Wenn eine neue Seite mit 3 oder mehr Sektionen erstellt werden soll. Dies ist der **empfohlene Standard-Workflow** für interaktive Chat-Interfaces (Claude Desktop, ChatGPT, etc.), da jede Sektion einzeln reviewt werden kann. Erzeugt deutlich bessere Ergebnisse als `generate_content` mit `sectionCount`, weil jede Sektion individuelle Aufmerksamkeit bekommt.

## Voraussetzungen

- Der Editor hat eine Vorstellung vom Seiteninhalt (Thema, Zweck, Zielgruppe)
- Optional: Texte, Bilder oder URLs als Ausgangsmaterial

## Ablauf

### Schritt 1: Bestehende Muster analysieren

- **Tool:** `analyze_content_patterns`
- **Zweck:** Die etablierten Muster dieser Website lernen — welche Komponenten werden häufig verwendet, welche Abfolgen sind typisch, wie viele Sub-Elemente haben Komponenten normalerweise?
- Antwort kommt **sofort aus dem Startup-Cache** (kein API-Call). Bei frisch publiziertem Content `refresh: true` übergeben.
- Das Ergebnis als Leitfaden für die Planung nutzen
- Alternativ: `list_recipes` oder die Rezepte-Ressource (`recipes://section-recipes`) als Orientierung verwenden

### Schritt 2: Verfügbare Komponenten prüfen

- **Tool:** `list_components`
- **Zweck:** Die vollständige Palette und Verschachtelungsregeln verstehen
- Die `typicalUsage`-Hinweise pro Komponente beachten — sie enthalten Empfehlungen für Einsatzzweck und typische Sub-Element-Anzahlen

### Schritt 2b: Verfügbare Icons prüfen (bei Bedarf)

- **Tool:** `list_icons`
- **Wann:** Wenn die Seite Komponenten mit Icon-Feldern enthalten wird (z.B. Features, Hero-CTA, Kontakt)
- **Wichtig:** Nur Werte aus `list_icons` verwenden — keine Icons erfinden!

### Schritt 3: Sektionsfolge planen

Basierend auf dem Briefing des Editors + den Website-Mustern eine Sektionsfolge mit 4-7 Sektionen festlegen. Bevorzugt Komponentenabfolgen verwenden, die bereits auf der Website existieren.

- **Tool (optional):** `plan_page` — KI-gestützte Planung auf Basis von Intent und Website-Mustern
- **Tipp:** Wenn die neue Seite einem bestimmten Seitenbereich ähneln soll (z.B. Case Studies), den `startsWith`-Parameter verwenden:
  `plan_page(intent: "...", startsWith: "case-studies/")` — nutzt dann nur Patterns aus diesem Bereich statt dem globalen Cache

**Planungsheuristiken:**

- Mit `hero` oder `video-curtain` für visuellen Impact starten
- `features`, `split-even` oder `mosaic` für den Kerninhalt folgen lassen
- Social Proof über `testimonials`, `stats` oder `logos` einbauen
- Einwände über `faq` adressieren
- Mit `cta` für Conversion abschließen
- `divider` sparsam zwischen thematischen Wechseln einsetzen
- Sub-Element-Anzahlen an die Website-Normen anpassen (aus `analyze_content_patterns`)

**Beispielplan:**

```
1. hero — Produkt mit starkem Visual vorstellen (2 Buttons)
2. features — 4 Hauptvorteile mit Icons
3. split-even — Detaillierte Demo mit Screenshot
4. testimonials — 3 Kundenstimmen
5. cta — Kostenlose Demo anfragen (1-2 Buttons)
```

Diesen Plan dem Editor vorstellen und bestätigen lassen.

### Schritt 4: Jede Sektion einzeln generieren

Für JEDE geplannte Sektion `generate_section` separat aufrufen:

- **Tool:** `generate_section`
- **Parameter:**
  - `componentType`: Der Sektionstyp aus dem Plan (z.B. `"hero"`)
  - `prompt`: Eine Beschreibung für NUR diese Sektion — was soll sie kommunizieren?
  - `previousSection` / `nextSection`: Typ der Nachbar-Sektionen für Übergangshinweise
    (z.B. `previousSection: "hero"`, `nextSection: "testimonials"`)
  - `startsWith` (optional): Slug-Präfix für gefilterte Patterns (z.B. `"case-studies/"`) —
    gleicher Wert wie bei `plan_page` verwenden, damit Planung und Generierung konsistent sind

**Vorteile von `generate_section`:** Site-Kontext (Sub-Item-Counts, Komponentenfrequenz, Rezept-Best-Practices) und **Field-Level Guidance** (Feldwert-Verteilungen aus bestehenden Inhalten, Composition Hints aus Rezepten) werden automatisch in den System-Prompt injiziert.

**Wichtig:** Nicht alle Sektionen mit demselben generischen Prompt generieren — jede Sektion braucht eine spezifische Beschreibung für gute Ergebnisse.

### Schritt 5: Seite zusammenbauen und erstellen

Alle generierten Sektionen in einem Array zusammenführen.

- **Tool:** `create_page_with_content`
- **Parameter:**
  - `name`: Seitenname (mit Editor abstimmen)
  - `slug`: URL-Slug vorschlagen
  - `sections`: Das kombinierte Array aller Sektionen
  - `uploadAssets: true` ← **immer setzen** bei KI-generierten Bildern
  - `assetFolderName`: Sinnvollen Ordnernamen vorschlagen
  - `publish: false` ← als Draft, Editor prüft im Visual Editor
  - `path`: Optional, z.B. `"en/products"` — legt Ordner automatisch an (wie `mkdir -p`). Alternativ `parentId` verwenden.

### Schritt 6: Bestätigung

- Den Storyblok-Editor-Link teilen
- Auf den Draft-Status hinweisen
- Fragen, ob Anpassungen gewünscht sind

## Häufige Fehler

| Fehler                                               | Warum problematisch                                     | Vermeidung                                                   |
| ---------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------ |
| `sectionCount` bei 5+ Sektionen nutzen               | Schema zu groß, OpenAI trifft schlechte Komponentenwahl | `generate_section` pro Sektion — bessere Qualität UND Review |
| Bestehende Muster nicht geprüft                      | Neuer Content passt nicht zum Rest der Website          | Immer `analyze_content_patterns` oder Rezepte zuerst         |
| Alle Sektionen mit gleichem Prompt                   | Jede Sektion braucht spezifische Anweisungen            | Individuelle Prompts pro Sektion                             |
| `list_icons` übersprungen                            | Ungültige Icon-Bezeichner im generierten Content        | Immer vor Icon-Nutzung aufrufen                              |
| `uploadAssets: true` vergessen                       | Bilder bleiben als externe URLs                         | Immer setzen                                                 |
| Zwei Hero-Sektionen auf einer Seite                  | Verwirrt die visuelle Hierarchie                        | Maximal eine Hero/Video-Curtain pro Seite                    |
| Gleiche Komponente in aufeinanderfolgenden Sektionen | Visuelle Monotonie                                      | Layout zwischen Sektionen variieren                          |
| Root-Felder bei blog-post vergessen                  | head/aside/cta/seo fehlen im fertigen Artikel           | `plan_page` gibt `rootFieldMeta` zurück — befolgen           |
| `generate_seo` übersprungen                          | Fehlende SEO-Metadaten (Titel, Beschreibung, OG-Image)  | Immer als letzten Schritt vor Seitenerstellung               |

## Vergleich: Sektion-für-Sektion vs. sectionCount

| Aspekt                    | Sektion-für-Sektion (`generate_section`)               | `generate_content` mit `sectionCount`   |
| ------------------------- | ------------------------------------------------------ | --------------------------------------- |
| Komponentenwahl           | LLM wählt bewusst basierend auf Kontext                | OpenAI wählt aus riesigem Schema        |
| Feedback & Kontrolle      | Jede Sektion einzeln reviewbar (Approve/Modify/Reject) | Alles auf einmal, kein Zwischenfeedback |
| Sub-Element-Anzahl        | Kontrolliert pro Sektion                               | Oft zu viele oder zu wenige             |
| Konsistenz mit Website    | Kann an bestehende Muster angepasst werden             | Keine Awareness für bestehenden Content |
| Qualität bei 5+ Sektionen | Gleichbleibend hoch                                    | Nimmt deutlich ab                       |
| Aufwand                   | Mehr Tool-Calls                                        | Ein einziger Call                       |
| Empfehlung                | ✅ Für Chat-Interfaces (Claude, ChatGPT)               | ⚠️ Nur für n8n-Automatisierung          |

## Multi-Content-Type Support

Der Workflow funktioniert nicht nur für `page`, sondern auch für alle anderen Content-Typen:

### Tier 1 (Sektions-basiert): `page`

`page` hat ein reines Sektions-Array ohne zusätzliche Root-Felder. Der Standard-Workflow (Schritt 1–6) gilt direkt.

### Hybrid (Sektionen + Root-Felder): `blog-post`, `blog-overview`

Diese Content-Typen haben sowohl ein Sektions-Array als auch eigenständige Root-Felder (z.B. `head`, `aside`, `cta`, `seo`). `plan_page` erkennt Hybrid-Typen automatisch und gibt neben der Sektionsfolge auch `rootFieldMeta` mit Prioritäten zurück:

- **required:** Muss immer generiert werden (z.B. `head`)
- **recommended:** Sollte generiert werden (z.B. `aside`, `cta`, `seo`)
- **optional:** Kann generiert werden

#### Erweiterter Workflow für Hybrid-Typen

Nach Schritt 4 (Sektionen generieren) zusätzlich:

**Schritt 4b: Root-Felder generieren**

Für jedes Root-Feld aus `rootFieldMeta` (Priorität `required` oder `recommended`):

- **Tool:** `generate_root_field`
- **Parameter:**
  - `fieldName`: Name des Feldes (z.B. `"head"`, `"aside"`, `"cta"`)
  - `prompt`: Beschreibung des gewünschten Inhalts
  - `contentType`: Der Content-Typ (z.B. `"blog-post"`)

```
generate_root_field(fieldName: "head", prompt: "Blog-Artikel über KI-Trends, Autorin: Maria Schmidt", contentType: "blog-post")
generate_root_field(fieldName: "aside", prompt: "Sidebar mit Autorin-Info und verwandten Artikeln", contentType: "blog-post")
generate_root_field(fieldName: "cta", prompt: "Newsletter-Anmeldung mit Hinweis auf wöchentliche KI-Updates", contentType: "blog-post")
```

**Schritt 4c: SEO-Metadaten generieren**

- **Tool:** `generate_seo`
- **Parameter:**
  - `prompt`: Zusammenfassung des Seiteninhalts mit Keywords und Zielgruppe
  - `contentType`: Der Content-Typ

```
generate_seo(prompt: "Blog-Artikel über KI-Trends 2026, Zielgruppe: CTOs und Engineering-Leader. Keywords: KI, Machine Learning, Enterprise", contentType: "blog-post")
```

**Schritt 5: Seite zusammenbauen (erweitert)**

Alle generierten Sektionen UND Root-Felder zusammenführen:

```
create_page_with_content(
  contentType: "blog-post",
  sections: [text, split-even, text, ...],
  rootFields: {
    head: <Ergebnis von generate_root_field("head")>,
    aside: <Ergebnis von generate_root_field("aside")>,
    cta: <Ergebnis von generate_root_field("cta")>,
    seo: <Ergebnis von generate_seo()>
  },
  uploadAssets: true
)
```

#### Beispiel blog-post Workflow

```
1. analyze_content_patterns(contentType: "blog-post")
2. plan_page(intent: "Tutorial-Artikel über KI", contentType: "blog-post")
   → Gibt sections + rootFieldMeta zurück
   → Sektionen sind text/split-even-fokussiert (KEIN hero, KEIN cta — die werden über Root-Felder abgedeckt)
3. generate_section(componentType: "text", ..., contentType: "blog-post")
   generate_section(componentType: "split-even", ..., contentType: "blog-post")
   generate_section(componentType: "text", ..., contentType: "blog-post")
4. generate_root_field(fieldName: "head", prompt: "...", contentType: "blog-post")
   generate_root_field(fieldName: "aside", prompt: "...", contentType: "blog-post")
   generate_root_field(fieldName: "cta", prompt: "...", contentType: "blog-post")
5. generate_seo(prompt: "...", contentType: "blog-post")
6. create_page_with_content(contentType: "blog-post", sections: [...], rootFields: { head, aside, cta, seo })
```

**Wichtig für blog-post:** Sektionen sollten überwiegend aus `text` und `split-even` bestehen. Niemals `hero` oder `cta` als Sektionen verwenden — blog-posts haben dedizierte Root-Objekte dafür (`head` für Titel/Datum/Autor/Bild, `cta` für den Call-to-Action). Andere Komponenten wie `faq` sind nur ausnahmsweise erlaubt, wenn der Inhalt es erfordert.

### Tier 2 (Flach): `event-detail`, `event-list`

Diese Content-Typen haben KEINE Sektionen. Stattdessen werden Root-Felder direkt befüllt:

```
plan_page(intent: "Workshop-Event", contentType: "event-detail")
→ Gibt einen Feld-Befüllungsplan zurück (fields statt sections)

generate_root_field(fieldName: "title", prompt: "Workshop zu KI-Tools", contentType: "event-detail")
generate_root_field(fieldName: "categories", prompt: "Kategorien: KI, Workshop, Fortbildung", contentType: "event-detail")

create_page_with_content(contentType: "event-detail", sections: [], rootFields: { title: "...", description: "...", categories: [...] })
```

### Rezepte nach Content-Typ filtern

```
list_recipes(contentType: "blog-post")
→ Gibt nur Blog-spezifische Rezepte zurück (text, split-even, faq) — KEINE Page-Rezepte (hero, cta, features etc.)
→ Anti-Patterns werden ebenfalls nach Content-Typ gefiltert
```
