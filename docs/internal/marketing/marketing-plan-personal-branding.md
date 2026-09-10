# Flankierende Personal-Branding-Posts: Jonas & Daniel

## Übersicht

| Eigenschaft        | Details                                                                   |
| ------------------ | ------------------------------------------------------------------------- |
| **Zweck**          | Persönliche Perspektive zur Hauptkampagne – informell, nahbar, technisch  |
| **Frequenz**       | Dienstag + Donnerstag (zwischen den Mo/Mi/Fr-Hauptposts)                  |
| **Laufzeit**       | 3 Wochen (12 Posts: 6× Jonas, 6× Daniel)                                  |
| **Tonalität**      | Persönlich, locker, „Aus dem Alltag eines Entwicklers/Designers"          |
| **Format**         | Kurze Text-Posts (600–1.000 Zeichen), gelegentlich mit Screenshot/Snippet |
| **Hashtags (fix)** | `#kickstartDS` `#MCP` + jeweiliger individueller Hashtag                  |

---

## Rollen & Perspektiven

### Jonas – Tech Lead 🛠️

| Eigenschaft                 | Details                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------- |
| **MCP-Server**              | Design System Component Builder MCP                                                   |
| **Perspektive**             | „Wie baut man Komponenten, die eine KI versteht?"                                     |
| **Wiederkehrender Hashtag** | `#ComponentBuilderMCP`                                                                |
| **Tonalität**               | Entwickler spricht zu Entwicklern – Code-Snippets, technische Insights, „TIL"-Momente |

**Jonas' roter Faden:** Das JSON-Schema als „API-Vertrag zwischen Mensch, Design System und KI". Wenn die Komponentendefinition sauber ist, kann die KI sie nutzen – ohne Training, ohne Fine-Tuning.

### Daniel – Gründer, UX & Designer 🎨

| Eigenschaft                 | Details                                                                                        |
| --------------------------- | ---------------------------------------------------------------------------------------------- |
| **MCP-Server**              | Design Tokens MCP                                                                              |
| **Perspektive**             | „Wie gibt man einer KI ein Marken-Gefühl?"                                                     |
| **Wiederkehrender Hashtag** | `#DesignTokensMCP`                                                                             |
| **Tonalität**               | Designer spricht zu Designern und Strategen – visuelle Beispiele, Token-Logik, Markenidentität |

**Daniels roter Faden:** Design Tokens sind die Sprache zwischen Marke und Maschine. Wer seine Tokens sauber hat, kann das Look & Feel per Prompt ändern – und die KI hält sich trotzdem an die Brand Guidelines.

---

## Content-Kalender

### Woche 1 – „Warum MCP?"

Passend zur Hauptkampagne (Awareness) erklären Jonas und Daniel jeweils, warum sie einen MCP-Server gebaut haben und was das überhaupt ist.

---

#### Dienstag W1 – Jonas 🛠️

**Thema:** „Warum ich einen MCP-Server für Komponenten gebaut habe"

> Wir haben ein Design System mit 50+ Komponenten.
> Jede hat ein JSON Schema, Props, Varianten, Slots.
>
> Und dann kam die Frage: Kann eine KI damit arbeiten?
>
> Spoiler: Ja – aber nur, wenn sie weiß, was es gibt.
>
> Also hab ich einen MCP-Server gebaut, der genau das macht:
> Er erklärt einer KI unser Komponentensystem.
>
> `get-component-structure` → „So sieht eine Komponente bei uns aus"
> `get-json-schema-template` → „Das sind die erlaubten Props"
> `get-react-component-template` → „So wird's implementiert"
>
> Die KI bekommt keinen Freitext-Spielplatz.
> Sie bekommt eine API. Mit Regeln. Und Grenzen.
>
> Und genau deshalb funktioniert es.
>
> Was haltet ihr davon – braucht KI mehr Leitplanken oder mehr Freiheit?

**Hashtags:** `#kickstartDS` `#MCP` `#ComponentBuilderMCP` `#DesignSystem` `#DeveloperExperience`

---

#### Donnerstag W1 – Daniel 🎨

**Thema:** „Wie erklärt man einer KI, was ‚on brand' bedeutet?"

> Ich bin Designer. Ich arbeite seit Jahren mit Design Tokens.
> Farben, Fonts, Abstände – alles in CSS Custom Properties.
>
> Bisher waren die nur für Entwickler relevant.
> Jetzt sind sie die Schnittstelle zur KI.
>
> Unser Design Tokens MCP-Server gibt einer KI Zugriff auf:
> → 12 Token-Dateien (Farben, Typo, Spacing, Schatten, …)
> → 50 Component-Token-Dateien
> → Die gesamte Token-Hierarchie: Branding → Semantic → Component
>
> Die KI fragt nicht „Welche Farbe soll der Button haben?"
> Sie fragt: `get_branding_tokens { type: "colors" }`
> Und bekommt: `--ks-brand-color-primary: #4e7cff`
>
> Sie generiert keine zufälligen Styles.
> Sie nutzt unser System.
>
> Das ist der Unterschied zwischen „KI macht Design"
> und „KI arbeitet MIT dem Design System".
>
> Wie handhabt ihr das – lasst ihr KI einfach los, oder gebt ihr ihr Token-Leitplanken?

**Hashtags:** `#kickstartDS` `#MCP` `#DesignTokensMCP` `#DesignTokens` `#BrandDesign`

---

### Woche 2 – „Hands-on: So funktioniert's"

Passend zur Hauptkampagne (Detail-Workflows) zeigen Jonas und Daniel jeweils konkrete Beispiele aus ihrem MCP-Server.

---

#### Dienstag W2 – Jonas 🛠️

**Thema:** „JSON Schema First: Wie unser Design System KI-ready wurde"

> Kleine Geschichte aus der Entwicklung:
>
> Früher haben wir Komponenten gebaut und dann irgendwann
> eine Doku geschrieben. Maybe. Wenn Zeit war.
>
> Heute starten wir jede Komponente mit dem JSON Schema.
> Das Schema definiert:
> → Welche Props gibt es?
> → Welche Typen sind erlaubt?
> → Was sind die Defaults?
> → Welche Varianten existieren?
>
> Daraus wird generiert:
> ✅ TypeScript-Types
> ✅ Storybook-Stories
> ✅ CMS-Komponentenschema
> ✅ Und jetzt: OpenAI-kompatible Schemas für KI-Generierung
>
> Ein Schema. Vier Outputs. Zero Drift.
>
> Das war nicht geplant als „KI-Feature".
> Das war Software-Engineering-Hygiene.
> Aber genau die macht den KI-Use-Case erst möglich.
>
> 🔑 Lektion: Wer sein Component API sauber hält,
> bekommt KI-Fähigkeit geschenkt.

**Hashtags:** `#kickstartDS` `#MCP` `#ComponentBuilderMCP` `#JSONSchema` `#SchemaFirst`

---

#### Donnerstag W2 – Daniel 🎨

**Thema:** „In 5 Minuten ein neues Branding – live"

> Gestern hat mich jemand gefragt:
> „Wie lange braucht ihr, um einer Website ein neues Branding zu geben?"
>
> Meine Antwort: 5 Minuten. Ernsthaft.
>
> So geht's:
>
> 1️⃣ `extract_theme_from_css` → CSS von der Ziel-Website fetchen
> 2️⃣ `generate_theme_from_image` → Screenshot analysieren
> 3️⃣ Die KI erkennt: Primärfarbe, Fonts, Spacing-Rhythmus
> 4️⃣ `update_token` für jeden Branding-Token
> 5️⃣ Fertig. Alle 50+ Komponenten sehen sofort anders aus.
>
> Keine CSS-Datei angefasst.
> Kein Figma-File aktualisiert.
> Nur die Tokens geändert – alles andere folgt.
>
> Das ist die Kraft einer sauberen Token-Architektur:
> Branding → Semantic → Component.
> Änderst du die Basis, ändert sich alles.
>
> [Screenshot: Vorher/Nachher der gleichen Seite mit zwei verschiedenen Token-Sets]

**Hashtags:** `#kickstartDS` `#MCP` `#DesignTokensMCP` `#Theming` `#DesignOps`

---

#### Dienstag W2 (alternativ, falls Donnerstag besser passt – tauschen ok)

_Hinweis: Die Reihenfolge innerhalb einer Woche (Di=Jonas, Do=Daniel) ist fix, damit das Publikum den Rhythmus lernt._

---

### Woche 3 – „Die größere Vision"

Passend zur Hauptkampagne (Vision + CTA) reflektieren Jonas und Daniel über das Zusammenspiel und die Zukunft.

---

#### Dienstag W3 – Jonas 🛠️

**Thema:** „50 Komponenten, 0 Zeilen KI-Training"

> Was mich am meisten überrascht hat:
>
> Wir haben null KI-Training gemacht.
> Kein Fine-Tuning. Kein RAG-Setup. Keine Embeddings.
>
> Trotzdem generiert die KI Inhalte,
> die exakt zu unseren 50+ Komponenten passen.
>
> Wie?
>
> Weil wir ihr die Schemas geben. Zur Laufzeit.
> MCP ist im Grunde „Tool Calling mit Kontext".
>
> Die KI bekommt:
> → Welche Komponenten existieren (`list_components`)
> → Wie jede einzelne aussieht (`get_component`)
> → Welche Props erlaubt sind (JSON Schema → OpenAI Schema)
>
> Und dann generiert sie gegen dieses Schema.
> Structured Output. Validiert. Typsicher.
>
> Kein Prompt-Engineering-Voodoo.
> Einfach: saubere Schemas rein → sauberer Content raus.
>
> Das ist kein KI-Trick.
> Das ist die Dividende von gutem Software-Engineering.

**Hashtags:** `#kickstartDS` `#MCP` `#ComponentBuilderMCP` `#StructuredOutput` `#ZeroTraining`

---

#### Donnerstag W3 – Daniel 🎨

**Thema:** „Design Tokens sind die Brandsprache der KI-Ära"

> Vor 3 Wochen haben wir angefangen, über AI-enabled CMS zu sprechen.
> Heute mein persönliches Fazit als Designer:
>
> Design Tokens waren schon immer eine gute Idee.
> Konsistenz. Skalierbarkeit. Single Source of Truth.
>
> Aber jetzt sind sie mehr als das.
> Sie sind die Sprache, in der KI eure Marke versteht.
>
> Ohne Tokens: KI generiert generischen Content.
> Random Farben. Beliebige Fonts. Kein Wiedererkennungswert.
>
> Mit Tokens: KI generiert Content IN eurer Marke.
> → `--ks-brand-color-primary` statt `#random`
> → `--ks-font-family-display` statt `Arial`
> → `--ks-spacing-m` statt `16px maybe 20px who knows`
>
> 3 Ebenen. 12 Dateien. 50 Komponenten-Token-Dateien.
> Alles per MCP für die KI zugänglich.
>
> 🎯 Mein Take: Investiert in eure Token-Architektur.
> Nicht weil es trendy ist.
> Sondern weil es die Grundlage für alles ist, was kommt.
>
> Danke an alle, die mitdiskutiert haben! 🙏
> Wer es ausprobieren will → Link zum Repo in den Kommentaren.

**Hashtags:** `#kickstartDS` `#MCP` `#DesignTokensMCP` `#DesignTokens` `#DesignSystemsForAI`

---

## Verknüpfung mit der Hauptkampagne

Jeder Personal-Branding-Post greift das Thema des vorherigen oder folgenden Hauptposts auf – ohne ihn zu wiederholen. Stattdessen beleuchten Jonas und Daniel die **technische Tiefe dahinter**.

| Hauptkampagne (Mo/Mi/Fr)                      | Jonas – Dienstag 🛠️                      | Daniel – Donnerstag 🎨                  |
| --------------------------------------------- | ---------------------------------------- | --------------------------------------- |
| **Mo W1:** Bulk-Seiten-Generierung            | Warum ich einen MCP-Server gebaut habe   | Wie erklärt man einer KI „on brand"?    |
| **Mi W1:** Live-Demo: Idee → CMS-Seite        | ↗️ Baut auf Demo auf, erklärt das „Wie"  | ↗️ Erklärt die Token-Ebene der Demo     |
| **Fr W1:** „Dein CMS ist ein leeres Textfeld" | —                                        | —                                       |
| **Mo W2:** Content-Migration per KI           | JSON Schema First: KI-ready by Design    | In 5 Min. ein neues Branding – live     |
| **Mi W2:** Automatischer Content-Audit        | ↗️ Zeigt Schema-Validierung hinter Audit | ↗️ Zeigt Token-Checks im Audit          |
| **Fr W2:** Blog-Autopilot aus RSS             | —                                        | —                                       |
| **Mo W3:** 12 Workflows auf einer Slide       | 50 Komponenten, 0 Zeilen KI-Training     | Design Tokens = Brandsprache der KI-Ära |
| **Mi W3:** „Redakteur als Kurator"            | ↗️ Schließt den Tech-Bogen               | ↗️ Schließt den Design-Bogen            |
| **Fr W3:** Zusammenfassung + Demo-CTA         | —                                        | —                                       |

---

## Posting-Regeln für Jonas & Daniel

1. **Immer in Ich-Form.** Kein Unternehmens-„Wir" – das macht der Hauptkanal.
2. **Maximal 1 technischer Fachbegriff pro Post erklären** – den Rest voraussetzen oder verlinken.
3. **Jeder Post endet mit einer Frage** – um Diskussion zu starten.
4. **Cross-Referenz:** In jedem Post den jeweils anderen oder den Hauptkanal taggen. Z.B. „Mehr dazu, wie das auf CMS-Ebene aussieht, hat @[Unternehmensseite] am Montag gezeigt."
5. **Screenshots > Theorie.** Wo möglich ein Terminal-Output, ein Token-Diff oder einen Schema-Snippet als Bild anhängen.
6. **Reagieren auf Kommentare des anderen Posts.** Jonas kommentiert bei Daniel, Daniel bei Jonas – zeigt Team-Dynamik.

---

## Post-Übersicht (kompakt)

| #   | Tag         | Person    | Thema                                             |
| --- | ----------- | --------- | ------------------------------------------------- |
| 1   | Di, Woche 1 | 🛠️ Jonas  | Warum ich einen Component-Builder-MCP gebaut habe |
| 2   | Do, Woche 1 | 🎨 Daniel | Wie erklärt man einer KI „on brand"?              |
| 3   | Di, Woche 2 | 🛠️ Jonas  | JSON Schema First: KI-ready by Design             |
| 4   | Do, Woche 2 | 🎨 Daniel | In 5 Minuten ein neues Branding – live            |
| 5   | Di, Woche 3 | 🛠️ Jonas  | 50 Komponenten, 0 Zeilen KI-Training              |
| 6   | Do, Woche 3 | 🎨 Daniel | Design Tokens = Brandsprache der KI-Ära           |

---

## Gesamtbild: Posting-Rhythmus der Kampagnenwoche

```
Mo  → 📢 Hauptkampagne (Unternehmensseite)
Di  → 🛠️ Jonas (persönlich, Component Builder MCP)
Mi  → 📢 Hauptkampagne (Unternehmensseite)
Do  → 🎨 Daniel (persönlich, Design Tokens MCP)
Fr  → 📢 Hauptkampagne (Unternehmensseite)
```

**5 Posts pro Woche, 3 Kanäle, 1 Story.** Jeden Tag kommt etwas Neues – ohne dass es nach Spam aussieht, weil es von unterschiedlichen Personen und aus unterschiedlichen Perspektiven kommt.
