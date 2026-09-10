import { SbBlokData, storyblokEditable } from "@storyblok/react";
import { Section } from "@kickstartds/design-system/components/section/index.js";
import { Headline } from "@kickstartds/design-system/components/headline/index.js";
import { Text } from "@kickstartds/design-system/components/text/index.js";

type SettingsPreviewProps = {
  blok: SbBlokData;
};

const SettingsPreview: React.FC<SettingsPreviewProps> = ({ blok }) => (
  <main {...storyblokEditable(blok)}>
    <Section spaceBefore="default" spaceAfter="default">
      <Headline
        text="Vorschau der globalen Einstellungen"
        sub="So sieht Ihre Website mit den aktuell angewendeten Header-, Footer- und Theme-Einstellungen aus."
        align="center"
        level="h1"
        style="h1"
      />
      <Text
        text={`Der auf dieser Seite angezeigte **Header** und **Footer** spiegeln Ihre aktuellen, seitenweiten Einstellungen wider. Nutzen Sie die Seitenleiste, um Navigationselemente, Logo, Social-Links und weitere globale Optionen zu konfigurieren.\n\nAlle Änderungen, die Sie an den Einstellungen vornehmen, werden hier in Echtzeit angezeigt, sodass Sie genau sehen können, wie die Rahmenbereiche Ihrer Website für Besucher erscheinen.`}
        layout="singleColumn"
        align="center"
      />
    </Section>
  </main>
);

export default SettingsPreview;
