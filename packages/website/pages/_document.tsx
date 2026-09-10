import Document, {
  Html,
  Head,
  Main,
  NextScript,
  DocumentContext,
} from "next/document";

class KsDocument extends Document<any> {
  static async getInitialProps(ctx: DocumentContext) {
    let pageProps = null;

    const originalRenderPage = ctx.renderPage;
    ctx.renderPage = () =>
      originalRenderPage({
        enhanceApp: (App) => (props) => {
          pageProps = props.pageProps;
          return <App {...props} />;
        },
        enhanceComponent: (Component) => Component,
      });

    const initialProps = await Document.getInitialProps(ctx);
    return { ...initialProps, pageProps };
  }

  render() {
    const { pageProps } = this.props;

    // Combine theme CSS and manual token overrides for font detection
    const themeCss =
      pageProps?.story?.content.themeCss || pageProps?.settings?.themeCss || "";
    const tokenOverrides =
      pageProps?.story?.content.token || pageProps?.settings?.token || "";
    const appliedToken = [themeCss, tokenOverrides].filter(Boolean).join("\n");

    let displayFontFamilyUrl;
    let copyFontFamilyUrl;
    let interfaceFontFamilyUrl;
    let monoFontFamilyUrl;
    if (appliedToken) {
      const displayFontFamilyName = appliedToken.match(
        /ks-brand-font-family-display: "?([a-zA-Z0-9_,]+( [a-zA-Z0-9_,]+)*)"?/
      )?.[1];
      if (
        displayFontFamilyName &&
        !displayFontFamilyName.includes(",") &&
        !displayFontFamilyName.includes('"')
      ) {
        const params = new URLSearchParams({ family: displayFontFamilyName });
        displayFontFamilyUrl = "https://fonts.googleapis.com/css2?" + params;
      }
      const copyFontFamilyName = appliedToken.match(
        /ks-brand-font-family-copy: "?([a-zA-Z0-9_,]+( [a-zA-Z0-9_,]+)*)"?/
      )?.[1];
      if (
        copyFontFamilyName &&
        !copyFontFamilyName.includes(",") &&
        !copyFontFamilyName.includes('"')
      ) {
        const params = new URLSearchParams({ family: copyFontFamilyName });
        copyFontFamilyUrl = "https://fonts.googleapis.com/css2?" + params;
      }
      const interfaceFontFamilyName = appliedToken.match(
        /ks-brand-font-family-interface: "?([a-zA-Z0-9_,]+( [a-zA-Z0-9_,]+)*)"?/
      )?.[1];
      if (
        interfaceFontFamilyName &&
        !interfaceFontFamilyName.includes(",") &&
        !interfaceFontFamilyName.includes('"')
      ) {
        const params = new URLSearchParams({ family: interfaceFontFamilyName });
        interfaceFontFamilyUrl = "https://fonts.googleapis.com/css2?" + params;
      }
      const monoFontFamilyName = appliedToken.match(
        /ks-brand-font-family-mono: "?([a-zA-Z0-9_,]+( [a-zA-Z0-9_,]+)*)"?/
      )?.[1];
      if (
        monoFontFamilyName &&
        !monoFontFamilyName.includes(",") &&
        !monoFontFamilyName.includes('"')
      ) {
        const params = new URLSearchParams({ family: monoFontFamilyName });
        monoFontFamilyUrl = "https://fonts.googleapis.com/css2?" + params;
      }
    }

    const fontsWereApplied =
      displayFontFamilyUrl ||
      copyFontFamilyUrl ||
      interfaceFontFamilyUrl ||
      monoFontFamilyUrl;

    return (
      <Html
        className={!fontsWereApplied ? pageProps?.fontClassNames : ""}
        lang={pageProps?.language || "en"}
      >
        <Head />
        <body>
          {displayFontFamilyUrl && (
            <link href={displayFontFamilyUrl} rel="stylesheet" />
          )}
          {copyFontFamilyUrl && (
            <link href={copyFontFamilyUrl} rel="stylesheet" />
          )}
          {interfaceFontFamilyUrl && (
            <link href={interfaceFontFamilyUrl} rel="stylesheet" />
          )}
          {monoFontFamilyUrl && (
            <link href={monoFontFamilyUrl} rel="stylesheet" />
          )}
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default KsDocument;
