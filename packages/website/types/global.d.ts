type _ks = {
  radio: {
    on: (topic: string, cb: (topic: string, payload: any) => void) => string;
    once: (topic: string, cb: (topic: string, payload: any) => void) => void;
    off: (token: string) => void;
    emit: (topic: string, payload: any) => boolean;
  };
};

export declare global {
  interface Window {
    _ks: _ks;
  }
}

declare module "@kickstartds/design-system/tokens/tokensToCss.mjs" {
  export const tokensToCss: (tokens: Record<string, unknown>) => string;
}
