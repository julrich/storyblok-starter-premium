import { useRegisterEvents } from "@react-sigma/core";
import { Command } from "cmdk";

import { useCallback, useEffect, useState } from "react";
import { useCosmosGraphContext } from "../GraphContext";

const CosmosCommandMenu = () => {
  const [open, setOpen] = useState(false);
  const registerEvents = useRegisterEvents();

  const { graph, setSelectedToken } = useCosmosGraphContext();

  const onSelect = useCallback(
    (value: string) => {
      setSelectedToken(value === "Reset" ? "" : value);
      setOpen(false);
    },
    [setSelectedToken],
  );

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    registerEvents({
      clickNode: (event) => onSelect(event.node),
    });
  }, [registerEvents, onSelect]);

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Global Command Menu"
      className="cosmos DialogContent"
    >
      <Command.Input />
      <Command.List>
        <Command.Empty>No results found.</Command.Empty>
        <Command.Group heading="Reset">
          <Command.Item onSelect={onSelect}>Reset</Command.Item>
        </Command.Group>
        <Command.Group heading="Tokens">
          {graph.nodes().map((node, index) => (
            <Command.Item key={index} onSelect={onSelect}>
              {node}
            </Command.Item>
          ))}
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
};

export default CosmosCommandMenu;
