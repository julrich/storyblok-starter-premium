# Bestehende Seite erweitern

## Wann verwenden

Der Editor hat eine bestehende Seite in Storyblok und möchte eine oder mehrere neue Sektionen hinzufügen – z.B. _„Füge eine FAQ-Sektion nach dem Hero auf der Startseite ein"_.

## Voraussetzungen

- Die Zielseite existiert bereits in Storyblok
- Der Editor kennt den Seitennamen oder Slug

## Ablauf

### Schritt 1: Bestehende Seite laden

- **Tool:** `get_story`
- **Parameter:**
  - `identifier`: Slug der Seite (z.B. `"home"`) oder Story-ID
  - `findBy`: `"slug"` (Standard) oder `"id"`
  - `version`: `"draft"` ← immer Draft laden, um den aktuellen Arbeitsstand zu sehen
- **Zweck:** Die aktuelle Seitenstruktur verstehen – welche Sektionen gibt es bereits, in welcher Reihenfolge?
- Dem Editor die bestehende Struktur kurz zusammenfassen (z.B. _„Die Seite hat aktuell: Hero → Features → CTA"_)
- Die `story.uuid` oder `story.id` merken – wird in Schritt 4 benötigt

### Schritt 2: Verfügbare Komponenten prüfen

- **Tool:** `list_components`
- **Zweck:** Sicherstellen, dass der gewünschte Sektionstyp existiert
- Falls der Editor unsicher ist, Optionen vorschlagen, die zur bestehenden Seite passen
- Die `typicalUsage`-Hinweise pro Komponente beachten — sie enthalten Empfehlungen für passende Folge-Sektionen
- **Tool:** `analyze_content_patterns`
- **Zweck:** Prüfen, welche Komponenten auf dieser Website typischerweise nach der aktuell letzten Sektion kommen (Antwort kommt sofort aus dem Startup-Cache)
- Beispiel: _„Auf dieser Website folgt nach features typischerweise testimonials oder cta"_
- Abgleichen, ob die gewünschte Ergänzung zu den bestehenden Mustern passt

### Schritt 2b: Verfügbare Icons prüfen (bei Bedarf)

- **Tool:** `list_icons`
- **Wann:** Wenn die neue Sektion Icon-Felder enthält (z.B. Features mit Icons, CTA mit Icon)
- **Zweck:** Nur gültige Icon-Bezeichner im Prompt verwenden (z.B. `star`, `arrow-right`, `phone`)

### Schritt 3: Neue Sektion(en) generieren

- **Tool:** `generate_section`
- **Parameter:**
  - `componentType`: Der gewünschte Sektionstyp (z.B. `"faq"`)
  - `prompt`: Beschreibung des Editors — was soll die Sektion kommunizieren?
  - `previousSection`: Typ der Sektion, die davor steht (z.B. `"features"`) — für fließende Übergänge
  - `nextSection`: Typ der Sektion, die danach kommt (falls bekannt)
- **Vorteil:** Die generierte Sektion wird isoliert angezeigt — der Editor kann sie sofort prüfen, genehmigen, ablehnen oder Änderungen anfordern
- **Vorteil:** Site-Kontext wird automatisch injiziert (Komponentenfrequenz, Sub-Item-Counts, Feldwert-Verteilungen)

> 💡 **Warum nicht `generate_content`?** `generate_section` zeigt die Sektion isoliert und ermöglicht direktes Feedback (Approve/Modify/Reject). `generate_content` bietet keine interaktive Review-Möglichkeit und ist nur für automatisierte Pipelines sinnvoll.

### Schritt 4: An der richtigen Position einfügen

- **Tool:** `import_content_at_position`
- **Parameter:**
  - `storyUid`: Die UUID oder ID der Story aus Schritt 1
  - `position`: Aus dem Gespräch ableiten:
    - `0` = ganz oben (vor allen bestehenden Sektionen)
    - `-1` = ganz unten (nach allen bestehenden Sektionen)
    - Konkrete Zahl = nach der n-ten Sektion (z.B. `1` = nach dem Hero)
  - `sections`: Die generierten Sektionen aus Schritt 3
  - `uploadAssets: true`
  - `publish: false` ← als Draft speichern
- ⚠️ Dieses Tool **entfernt keine bestehenden Sektionen** – es fügt nur ein

### Schritt 5: Ergebnis bestätigen

- Dem Editor bestätigen, dass die Sektion eingefügt wurde
- Position benennen (z.B. _„Die FAQ-Sektion steht jetzt zwischen Features und CTA"_)
- Auf den Visual Editor verweisen zum Feinschliff

## Häufige Fehler

| Fehler                                              | Auswirkung                                                          | Vermeidung                                |
| --------------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------- |
| `get_story` übersprungen                            | Position kann nicht korrekt bestimmt werden                         | Immer zuerst die Seite laden              |
| `import_content` statt `import_content_at_position` | Funktioniert nur mit Prompter-Komponente, nicht für freies Einfügen | `import_content_at_position` verwenden    |
| Falsche `position`                                  | Sektion landet an falscher Stelle                                   | Bestehende Struktur mit Editor besprechen |
| `version: "published"` in Schritt 1                 | Ungespeicherte Draft-Änderungen werden nicht gesehen                | Immer `"draft"` verwenden                 |

## Varianten

- **Sektion ersetzen statt hinzufügen:** `replace_section` mit `storyUid` und `position` (0-basiert, -1 für letzte) verwenden – erspart das Laden und Zurückschreiben der gesamten Story via `update_story`
- **Mehrere Sektionen an verschiedenen Stellen:** Workflow mehrfach durchlaufen mit verschiedenen Positionen
- **Sektion am Ende anhängen:** `position: -1` als Kurzform
