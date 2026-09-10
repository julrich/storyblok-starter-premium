import * as Toolbar from "@radix-ui/react-toolbar";
import * as Label from "@radix-ui/react-label";

import { isAncestryState, useCosmosGraphContext } from "../GraphContext";
import {
  MinusCircledIcon,
  PlusCircledIcon,
  Share1Icon,
} from "@radix-ui/react-icons";
import IconTooltip from "./components/IconTooltip";

const CosmosTokenToolbar = () => {
  const {
    selectedToken,
    ancestryLevel,
    setAncestryLevel,
    setAncestryState,
    activeComponents,
  } = useCosmosGraphContext();

  const increaseAncestryLevel = () => {
    setAncestryLevel(ancestryLevel + 1);
  };

  const decreaseAncestryLevel = () => {
    setAncestryLevel(ancestryLevel - 1 < 0 ? 0 : ancestryLevel - 1);
  };

  const setAncestry = (ancestry: string) => {
    if (isAncestryState(ancestry)) setAncestryState(ancestry);
  };

  if (
    (selectedToken && selectedToken.length > 0) ||
    activeComponents.size > 0
  ) {
    return (
      <div className="TokenToolbarWrapper">
        <Toolbar.Root className="ToolbarRoot" aria-label="Token Settings">
          {selectedToken && selectedToken.length > 0 ? (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                alignItems: "center",
              }}
            >
              <Label.Root className="LabelRoot" htmlFor="token">
                Selected:
              </Label.Root>
              <input
                className="Input"
                type="text"
                id="token"
                value={selectedToken}
                readOnly
              />
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                alignItems: "center",
              }}
            >
              <Label.Root className="LabelRoot" htmlFor="token">
                Component mode
              </Label.Root>
            </div>
          )}
          <Toolbar.Separator className="ToolbarSeparator" />
          <Toolbar.ToggleGroup
            className="ToolbarToggleGroup ToggleDirection"
            type="single"
            defaultValue="both"
            aria-label="Connections to show"
            onValueChange={setAncestry}
          >
            <Toolbar.ToggleItem
              className="ToolbarToggleItem"
              value="ascendents"
              aria-label="Show incoming"
            >
              <IconTooltip Icon={Share1Icon} text="Show incoming" />
            </Toolbar.ToggleItem>

            <Toolbar.ToggleItem
              className="ToolbarToggleItem"
              value="both"
              aria-label="Show all"
            >
              <IconTooltip Icon={Share1Icon} text="Show all" />
            </Toolbar.ToggleItem>

            <Toolbar.ToggleItem
              className="ToolbarToggleItem"
              value="descendents"
              aria-label="Show outgoing"
            >
              <IconTooltip Icon={Share1Icon} text="Show outgoing" />
            </Toolbar.ToggleItem>
          </Toolbar.ToggleGroup>
          <Toolbar.Separator className="ToolbarSeparator" />
          <Toolbar.Button
            className="ToolbarButton"
            style={{ marginRight: ".3rem" }}
            onClick={increaseAncestryLevel}
          >
            <IconTooltip Icon={PlusCircledIcon} text="Increase level" />
          </Toolbar.Button>
          <Toolbar.Button
            className="ToolbarButton"
            onClick={decreaseAncestryLevel}
          >
            <IconTooltip Icon={MinusCircledIcon} text="Decrease level" />
          </Toolbar.Button>
        </Toolbar.Root>
      </div>
    );
  } else {
    return null;
  }
};

export default CosmosTokenToolbar;
