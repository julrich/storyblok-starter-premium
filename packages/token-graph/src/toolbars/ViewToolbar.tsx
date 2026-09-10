import * as Toolbar from "@radix-ui/react-toolbar";
import { useLayoutForceAtlas2 } from "@react-sigma/layout-forceatlas2";

import { SymbolIcon, ZoomInIcon, ZoomOutIcon } from "@radix-ui/react-icons";
import IconTooltip from "./components/IconTooltip";

const CosmosViewToolbar = () => {
  const { assign } = useLayoutForceAtlas2({
    iterations: 100,
    outputReducer: (_node, data) => {
      if (data.hidden) {
        return null;
      }
      return data;
    },
  });

  return (
    <div className="ViewToolbarWrapper">
      <Toolbar.Root className="ToolbarRoot" aria-label="View Settings">
        <Toolbar.Button
          style={{ marginRight: ".25rem" }}
          className="ToolbarButton"
        >
          <IconTooltip Icon={ZoomInIcon} text="Zoom in" />
        </Toolbar.Button>

        <Toolbar.Button
          onClick={assign}
          style={{ marginRight: ".25rem" }}
          className="ToolbarButton"
        >
          <IconTooltip Icon={SymbolIcon} text="Retrigger layout" />
        </Toolbar.Button>

        <Toolbar.Button className="ToolbarButton">
          <IconTooltip Icon={ZoomOutIcon} text="Zoom out" />
        </Toolbar.Button>
      </Toolbar.Root>
    </div>
  );
};

export default CosmosViewToolbar;
