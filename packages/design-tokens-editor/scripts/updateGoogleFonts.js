import fs from "node:fs/promises";
import process from "node:process";
import "@dotenvx/dotenvx/config";

const key = process.env.GOOGLE_FONTS_API_KEY;

if (!key) throw new Error("GOOGLE_FONTS_API_KEY not found");

const url = new URL("https://www.googleapis.com/webfonts/v1/webfonts");
url.searchParams.set("key", key);
url.searchParams.set("sort", "popularity");
url.searchParams.set("subset", "latin");
url.searchParams.set("capability", "WOFF2");
const response = await fetch(url);
const json = await response.json();

const fonts = json.items.map((item) => item.family);
await fs.writeFile("src/fonts.json", JSON.stringify(fonts));
