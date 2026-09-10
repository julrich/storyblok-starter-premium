# Content-Audit einer Seite durchführen

## Wann verwenden

Der Editor möchte die Qualität einer bestehenden Seite prüfen – z.B. _„Prüfe die Startseite auf fehlende Alt-Texte und leere Felder"_ oder _„Gibt es Probleme auf unserer About-Seite?"_.

## Voraussetzungen

- Die zu prüfende Seite existiert in Storyblok
- Optional: Spezifische Prüfkriterien vom Editor (SEO, Barrierefreiheit, Vollständigkeit)

## Ablauf

### Schritt 1: Seite laden

- **Tool:** `get_story`
- **Parameter:**
  - `identifier`: Slug oder ID der Seite
  - `version`: `"draft"` ← um auch unveröffentlichte Änderungen zu sehen
- **Zweck:** Den vollständigen Content-Baum mit allen verschachtelten Komponenten erhalten

### Schritt 2: Komponenten-Schema laden

- **Tool:** `get_component` (für die relevanten Komponenten auf der Seite)
- **Zweck:** Verstehen, welche Felder es gibt, welche Pflichtfelder existieren, welche Typen erwartet werden
- Für jede auf der Seite verwendete Komponente einmal aufrufen
- ⚠️ Nicht für alle Komponenten im Space – nur für die, die auf der Seite tatsächlich vorkommen

### Schritt 3: Audit durchführen

Mit dem Content aus Schritt 1 und den Schemas aus Schritt 2 die folgenden Prüfungen durchführen:

**Inhaltliche Vollständigkeit:**

- Leere oder fehlende Textfelder (Headlines, Body-Text, Button-Labels)
- Sektionen ohne sichtbaren Inhalt
- CTAs ohne Ziel-URL

**Bilder & Assets:**

- Fehlende Bilder (leere `image`-Felder)
- Fehlende Alt-Texte bei vorhandenen Bildern
- Bilder, die auf externe URLs statt Storyblok-Assets verweisen

**SEO-Aspekte:**

- Fehlende Meta-Daten (Seitentitel, Description)
- Fehlende oder doppelte H1-Überschriften
- Meta-Description zu kurz (< 120 Zeichen) oder zu lang (> 160 Zeichen)

**Strukturelle Qualität:**

- Leere Sektionen (Sektion vorhanden, aber ohne Inhalt-Komponenten)
- Sehr kurze Seiten (nur 1 Sektion)
- Doppelte Sektionstypen, die ungewollt sein könnten

**Kompositions-Qualität (automatisch via `checkCompositionalQuality`):**

- Doppelte Heroes (mehr als ein Hero/Video-Curtain pro Seite)
- Benachbarte Sektionen gleichen Typs (wirkt repetitiv)
- Zu wenige Sub-Items (z.B. Stats mit <3 Einträgen, Features mit <2 Items)
- Fehlende CTA-Sektion auf Konversionsseiten (Hero + Features, aber kein CTA)
- Redundante Section-Headlines (Section hat Headline UND enthält Hero/CTA mit eigener Headline)
- Konkurrierende CTAs (Section-Buttons UND Kind-Komponente mit eigenen Buttons)
- Erste Sektion mit `spaceBefore` (sollte `"none"` sein)
- Blog-Teaser ohne Link-URL

**Konsistenz mit Website-Mustern (aus `analyze_content_patterns` Startup-Cache):**

- Sektionsfolge dieser Seite mit den typischen Mustern der Website vergleichen
- Ungewöhnliche Komponentenwahl identifizieren, die sonst nirgends auf der Website vorkommt
- Sub-Element-Anzahlen prüfen (z.B. hat diese Seite nur 1 Feature, obwohl der Website-Durchschnitt 4 ist?)
- Anti-Patterns aus den Rezepten (`recipes://section-recipes`) abgleichen

### Schritt 4: Ergebnis präsentieren

Dem Editor einen übersichtlichen Report zeigen:

```
✅ 12 Prüfungen bestanden
⚠️ 3 Warnungen
  - Hero-Bild hat keinen Alt-Text
  - Meta-Description fehlt
  - CTA-Button „Mehr erfahren" hat keine Ziel-URL
🧩 2 Kompositions-Hinweise
  - Features hat nur 1 Sub-Item (Minimum: 2)
  - Benachbarte „split"-Sektionen wirken repetitiv
❌ 1 Fehler
  - Testimonials-Sektion ist komplett leer
```

### Schritt 5: Fixes anbieten (optional)

Falls der Editor Fixes wünscht:

- **Tool:** `generate_section` für fehlende oder leere Sektionen (z.B. leere Testimonials-Sektion durch eine neu generierte ersetzen)
- **Tool:** `generate_seo` für fehlende SEO-Metadaten (Titel, Description, Keywords) — nutzt einen spezialisierten SEO-Prompt
- **Tool:** `replace_section` für einzelne Sektions-Fixes (z.B. leere Testimonials ersetzen)
- **Tool:** `update_story` für umfassendere Änderungen, die mehrere Sektionen betreffen
- ⚠️ Immer erst bestätigen lassen, bevor Änderungen gespeichert werden

## Häufige Fehler

| Fehler                             | Auswirkung                                    | Vermeidung                                   |
| ---------------------------------- | --------------------------------------------- | -------------------------------------------- |
| Nur `published` Version geprüft    | Draft-Änderungen werden nicht berücksichtigt  | Immer `version: "draft"`                     |
| Schema nicht geladen               | Pflichtfelder können nicht geprüft werden     | `get_component` für relevante Typen aufrufen |
| Fixes ohne Bestätigung gespeichert | Editor verliert die Kontrolle                 | Immer Report zeigen und bestätigen lassen    |
| Zu viele Seiten auf einmal         | Kontext-Overflow, Report wird unübersichtlich | Seite für Seite auditieren                   |

## Varianten

- **Gesamter Space:** `list_stories` paginiert aufrufen, dann für jede Story `get_story` → Ergebnis als Gesamt-Report zusammenfassen. Besser über n8n automatisieren (siehe Content Operations Workflows).
- **Nur SEO-Audit:** Fokus auf Meta-Daten und Heading-Struktur
- **Nur Bilder-Audit:** Fokus auf fehlende Bilder, Alt-Texte, externe URLs
- **Nur Kompositions-Audit:** Fokus auf strukturelle Anti-Patterns — duplicate Heroes, sparse Sub-Items, fehlende CTAs, redundante Headlines. Im `content_audit`-Report nach Kategorie `composition` filtern.
- **Audit + Auto-Fix:** Nach dem Audit direkt `generate_section` für fehlende/leere Sektionen, `generate_seo` für SEO-Fixes, dann `replace_section` / `update_seo` / `update_story` zum Speichern
