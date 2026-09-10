# Seite übersetzen

## Wann verwenden

Der Editor möchte eine bestehende Seite in eine andere Sprache übersetzen – z.B. _„Übersetze die Startseite ins Englische"_ oder _„Wir brauchen die Produktseite auf Französisch"_.

## Voraussetzungen

- Die Quellseite existiert in Storyblok
- Die Zielsprache ist bekannt
- Optional: Glossar oder Marken-spezifische Begriffe, die nicht übersetzt werden sollen

## Ablauf

### Schritt 1: Originalseite laden

- **Tool:** `get_story`
- **Parameter:**
  - `identifier`: Slug der Quellseite
  - `version`: `"published"` ← für Übersetzung die veröffentlichte Version verwenden
- **Zweck:** Den vollständigen Inhalt als Basis für die Übersetzung erhalten
- Dem Editor die Seitenstruktur kurz zusammenfassen

### Schritt 2: Verfügbare Komponenten prüfen

- **Tool:** `list_components`
- **Zweck:** Sicherstellen, dass die gleichen Sektionstypen auch für die übersetzte Version verfügbar sind (normalerweise ja, aber gut zu prüfen)

### Schritt 3: Übersetzung generieren

Für JEDE Sektion der Originalseite `generate_section` mit dem gleichen `componentType` aufrufen:

- **Tool:** `generate_section`
- **Parameter:**

  - `componentType`: Der gleiche Sektionstyp wie im Original (z.B. `"hero"`, `"features"`)
  - `prompt`: Die Original-Sektion als JSON + Übersetzungsanweisung:

    ```
    Übersetze den folgenden Sektionsinhalt von [Quellsprache] nach [Zielsprache].
    Behalte die exakt gleiche Struktur und Feldanzahl bei.
    Übersetze alle Texte, Headlines, Button-Labels und Alt-Texte.
    Lasse URLs, Bild-Pfade und technische Felder unverändert.
    Passe Redewendungen kulturell an, statt wörtlich zu übersetzen.
    [Optional: Glossar einfügen]

    Original-Sektion:
    [JSON der Sektion]
    ```

  - `previousSection` / `nextSection`: Gleiche Nachbar-Typen wie im Original

- **Vorteil:** Jede übersetzte Sektion wird isoliert angezeigt — der Editor kann sofort prüfen, ob die Übersetzung korrekt ist, bevor die nächste generiert wird
- ⚠️ **Besonders wichtig:** Die Komponentenstruktur muss 1:1 erhalten bleiben – nur Textinhalte werden übersetzt

> 💡 **Warum nicht `generate_content`?** Bei Übersetzungen ist die sektionsweise Kontrolle besonders wertvoll — der Editor kann jede Sektion sofort mit dem Original vergleichen und Korrekturen bei Fachterminologie oder Markennamen anfordern.

### Schritt 4: Ergebnis prüfen

- Dem Editor die übersetzten Sektionen im Vergleich zum Original zeigen
- Besonders auf diese Punkte achten:
  - Wurden alle Sektionen übersetzt?
  - Stimmen Fachbegriffe und Markennamen?
  - Sind CTAs und Button-Texte passend formuliert?
  - Wurden URLs versehentlich verändert?
- Bei Korrekturbedarf: `generate_section` für die betreffende Sektion mit angepasstem Prompt erneut aufrufen

### Schritt 5: Übersetzte Seite anlegen

- **Tool:** `create_page_with_content`
- **Parameter:**
  - `name`: Übersetzter Seitenname
  - `slug`: Lokalisierter Slug (z.B. `"en/home"` oder `"fr/produit"`)
  - `path`: Sprachordner angeben, z.B. `"en"` oder `"fr"` — wird automatisch erstellt falls nötig (wie `mkdir -p`)
  - `sections`: Die übersetzten Sektionen aus Schritt 3
  - `uploadAssets: false` ← Bilder können vom Original wiederverwendet werden (gleiche Storyblok-URLs)
  - `publish: false` ← Draft für Review
- ⚠️ Alternativ `update_story` verwenden, falls in Storyblok mit Feld-Level-Übersetzung gearbeitet wird

### Schritt 6: Review-Hinweis

- Dem Editor empfehlen, die Übersetzung von einem Native Speaker prüfen zu lassen
- Darauf hinweisen, dass KI-Übersetzungen bei Fachterminologie und Markenton überprüft werden sollten

## Häufige Fehler

| Fehler                        | Auswirkung                              | Vermeidung                                                |
| ----------------------------- | --------------------------------------- | --------------------------------------------------------- |
| Komponentenstruktur verändert | Seite sieht anders aus als das Original | Im System-Prompt explizit fordern, Struktur beizubehalten |
| URLs übersetzt                | Links funktionieren nicht mehr          | Im System-Prompt ausschließen                             |
| Alt-Texte vergessen           | Bilder bleiben in Originalsprache       | Explizit im Prompt erwähnen                               |
| `publish: true` gesetzt       | Ungeprüfte Übersetzung geht live        | Immer als Draft                                           |
| Gleicher Slug wie Original    | Slug-Konflikt in Storyblok              | Sprachpräfix verwenden (z.B. `en/`, `fr/`)                |

## Varianten

- **Mehrere Seiten übersetzen:** Workflow pro Seite wiederholen. Für Bulk-Übersetzungen besser n8n verwenden.
- **Bestehende Übersetzung aktualisieren:** `get_story` mit dem Slug der übersetzten Version laden → Änderungen identifizieren → betroffene Sektionen per `generate_section` neu übersetzen → `replace_section` für chirurgische Updates
- **Nur bestimmte Sektionen übersetzen:** Original laden, nur ausgewählte Sektionen durch `generate_section` übersetzen, dann `update_story` mit gemischtem Content
