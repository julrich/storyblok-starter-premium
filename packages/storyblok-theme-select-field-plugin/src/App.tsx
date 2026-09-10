import { useFieldPlugin } from "@storyblok/field-plugin/react";
import { ThemeSelect } from "./ThemeSelect";

export function App() {
  const plugin = useFieldPlugin();

  if (plugin.type === "loading") {
    return <div>Loading…</div>;
  }

  if (plugin.type === "error") {
    return <div>Error: {plugin.error?.message}</div>;
  }

  return (
    <ThemeSelect
      value={plugin.data.content as string | undefined}
      token={plugin.data.token ?? ""}
      spaceId={plugin.data.spaceId ?? null}
      onChange={(slug) => plugin.actions.setContent(slug ?? "")}
    />
  );
}
