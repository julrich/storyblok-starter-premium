// Stub for jsdom — its transitive dependency @exodus/bytes is ESM-only
// and breaks Jest's CJS require chain. No tests exercise scraping.
export class JSDOM {
  constructor() {
    throw new Error("jsdom is stubbed in tests");
  }
}
