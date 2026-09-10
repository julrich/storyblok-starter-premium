import * as Toolbar from "@radix-ui/react-toolbar";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  BoxModelIcon,
  PaddingIcon,
  MarginIcon,
  DesktopIcon,
  LaptopIcon,
  MobileIcon,
  ReloadIcon,
  DashboardIcon,
  MixIcon,
  CheckIcon,
  CookieIcon,
} from "@radix-ui/react-icons";

import { isBreakpointState, useCosmosGraphContext } from "../GraphContext";
import BreakpointRadioItem from "./components/BreakpointRadioItem";
import BreakpointIcon from "./components/BreakpointIcon";
import IconTooltip from "./components/IconTooltip";
import { getComponentName } from "../helpers";

const CosmosMainToolbar = () => {
  const {
    config,
    setInvertedState,
    breakpointState,
    setBreakpointState,
    currentGraphName,
    setCurrentGraphName,
    automaticRelayout,
    setAutomaticRelayout,
    activeCommunities,
    setActiveCommunities,
    filteredCommunities,
    communityPalette,
    components,
    activeComponents,
    componentPalette,
    setActiveComponents,
  } = useCosmosGraphContext();

  const toggleComponent = (component: string) => {
    const newActiveComponents = new Set(activeComponents);
    if (activeComponents.has(component)) {
      newActiveComponents.delete(component);
    } else {
      newActiveComponents.add(component);
    }
    setActiveComponents(newActiveComponents);
  };

  const toggleCommunity = (community: number) => {
    const newActiveCommunities = new Set(activeCommunities);
    if (activeCommunities.has(community)) {
      newActiveCommunities.delete(community);
    } else {
      newActiveCommunities.add(community);
    }
    setActiveCommunities(newActiveCommunities);
  };

  const toggleHide = () => {
    const graphNames = config.graphNames;
    if (graphNames.length < 2) return;
    currentGraphName === graphNames[1]
      ? setCurrentGraphName(graphNames[0])
      : setCurrentGraphName(graphNames[1]);
  };

  const setBreakpoint = (breakpoint: string) => {
    if (isBreakpointState(breakpoint)) setBreakpointState(breakpoint);
  };

  return (
    <div className="MainToolbarWrapper">
      <Toolbar.Root className="ToolbarRoot" aria-label="General Settings">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Toolbar.Button
              className="ToolbarButton"
              style={{ marginLeft: "auto" }}
            >
              <IconTooltip Icon={MixIcon} text="Toggle components" />
            </Toolbar.Button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="DropdownMenuContent"
              sideOffset={15}
            >
              <DropdownMenu.Label className="DropdownMenuLabel">
                Choose components
              </DropdownMenu.Label>

              {Object.keys(components).map((component, index) => (
                <DropdownMenu.CheckboxItem
                  className="DropdownMenuCheckboxItem"
                  style={{ color: componentPalette[component] }}
                  checked={activeComponents.has(component)}
                  onCheckedChange={() => toggleComponent(component)}
                  onSelect={(event) => event.preventDefault()}
                  key={index}
                >
                  <DropdownMenu.ItemIndicator className="DropdownMenuItemIndicator">
                    <CheckIcon />
                  </DropdownMenu.ItemIndicator>
                  {getComponentName(component, config.componentSelectorPrefix)}
                </DropdownMenu.CheckboxItem>
              ))}

              <DropdownMenu.Arrow className="DropdownMenuArrow" />
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
        <Toolbar.Separator className="ToolbarSeparator" />
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Toolbar.Button
              className="ToolbarButton"
              style={{ marginLeft: "auto" }}
            >
              <IconTooltip Icon={DashboardIcon} text="Toggle communities" />
            </Toolbar.Button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="DropdownMenuContent"
              sideOffset={15}
            >
              <DropdownMenu.Label className="DropdownMenuLabel">
                Choose communities
              </DropdownMenu.Label>

              {Object.values(filteredCommunities).map((community) => (
                <DropdownMenu.CheckboxItem
                  className="DropdownMenuCheckboxItem"
                  style={{ color: communityPalette[community.index] }}
                  checked={activeCommunities.has(community.index)}
                  onCheckedChange={() => toggleCommunity(community.index)}
                  onSelect={(event) => event.preventDefault()}
                  key={community.index}
                >
                  <DropdownMenu.ItemIndicator className="DropdownMenuItemIndicator">
                    <CheckIcon />
                  </DropdownMenu.ItemIndicator>
                  {community.name}
                </DropdownMenu.CheckboxItem>
              ))}

              <DropdownMenu.Arrow className="DropdownMenuArrow" />
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
        <Toolbar.Separator className="ToolbarSeparator" />
        <Toolbar.ToggleGroup
          className="ToolbarToggleGroup"
          type="multiple"
          aria-label="Automatic relayout"
          onValueChange={() => setAutomaticRelayout(!automaticRelayout)}
        >
          <Toolbar.ToggleItem
            className="ToolbarToggleItem"
            value="automatic"
            aria-label="Activate automatic relayout"
          >
            <IconTooltip Icon={ReloadIcon} text="Activate automatic relayout" />
          </Toolbar.ToggleItem>
        </Toolbar.ToggleGroup>
        <Toolbar.Separator className="ToolbarSeparator" />
        <Toolbar.ToggleGroup
          className="ToolbarToggleGroup"
          type="multiple"
          aria-label="Show ksDS"
          onValueChange={toggleHide}
        >
          <Toolbar.ToggleItem
            className="ToolbarToggleItem"
            value="ksds"
            aria-label="Show unconnected"
          >
            <IconTooltip Icon={CookieIcon} text="Show unconnected tokens" />
          </Toolbar.ToggleItem>
        </Toolbar.ToggleGroup>
        <Toolbar.Separator className="ToolbarSeparator" />
        <Toolbar.ToggleGroup
          className="ToolbarToggleGroup"
          type="single"
          defaultValue="both"
          aria-label="Inverted"
          onValueChange={setInvertedState}
        >
          <Toolbar.ToggleItem
            className="ToolbarToggleItem"
            value="both"
            aria-label="Both"
          >
            <IconTooltip
              Icon={BoxModelIcon}
              text="Display both default and inverted states"
            />
          </Toolbar.ToggleItem>

          <Toolbar.ToggleItem
            className="ToolbarToggleItem"
            value="default"
            aria-label="Default"
          >
            <IconTooltip Icon={MarginIcon} text="Display default state" />
          </Toolbar.ToggleItem>

          <Toolbar.ToggleItem
            className="ToolbarToggleItem"
            value="inverted"
            aria-label="Inverted"
          >
            <IconTooltip Icon={PaddingIcon} text="Display inverted state" />
          </Toolbar.ToggleItem>
        </Toolbar.ToggleGroup>
        <Toolbar.Separator className="ToolbarSeparator" />
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Toolbar.Button
              className="ToolbarButton"
              style={{ marginLeft: "auto" }}
            >
              <BreakpointIcon name={breakpointState} />
            </Toolbar.Button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="DropdownMenuContent"
              sideOffset={15}
            >
              <DropdownMenu.Label className="DropdownMenuLabel">
                Choose breakpoint
              </DropdownMenu.Label>
              <DropdownMenu.RadioGroup
                value={breakpointState}
                onValueChange={setBreakpoint}
              >
                <BreakpointRadioItem name="All" value="all" />
                <BreakpointRadioItem
                  name="Desktop"
                  value="desktop"
                  Icon={DesktopIcon}
                />
                <BreakpointRadioItem
                  name="Laptop"
                  value="laptop"
                  Icon={LaptopIcon}
                />
                <BreakpointRadioItem
                  name="Tablet"
                  value="tablet"
                  Icon={MobileIcon}
                />
                <BreakpointRadioItem
                  name="Phone"
                  value="phone"
                  Icon={MobileIcon}
                />
              </DropdownMenu.RadioGroup>
              <DropdownMenu.Arrow className="DropdownMenuArrow" />
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </Toolbar.Root>
    </div>
  );
};

export default CosmosMainToolbar;
