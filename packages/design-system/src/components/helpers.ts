export function canBeCloned(val: unknown): boolean {
  try {
    window.postMessage(val, "*");
  } catch (err) {
    return false;
  }
  return true;
}

export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

export function deepMergeDefaults<T extends Record<string, any>>(
  defaults: DeepPartial<T>,
  props: T,
  replaceExamples: boolean = false
): T {
  const keys = Array.from(
    new Set([...Object.keys(defaults), ...Object.keys(props)])
  );

  return keys.reduce((acc, key) => {
    const val1 = defaults[key] as unknown;
    const val2 = props[key] as unknown;

    if (Array.isArray(val1) && Array.isArray(val2)) {
      acc[key] =
        key === "examples" && replaceExamples
          ? val2
          : (acc[key] = [...val1, ...val2].filter((value, index, self) => {
              return self.findIndex((v) => v === value) === index;
            }));
    } else if (
      typeof val1 === "object" &&
      val1 !== null &&
      typeof val2 === "object" &&
      val2 !== null
    ) {
      acc[key] = deepMergeDefaults(val1, val2, replaceExamples);
    } else if (key in props) {
      acc[key] = canBeCloned(val2) ? structuredClone(val2) : val2;
    } else {
      acc[key] = canBeCloned(val1) ? structuredClone(val1) : val1;
    }

    return acc;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }, {} as any) as T;
}
