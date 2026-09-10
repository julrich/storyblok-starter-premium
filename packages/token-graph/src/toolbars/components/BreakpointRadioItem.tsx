import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { DotFilledIcon } from "@radix-ui/react-icons";

const BreakpointRadioItem: React.FC<{
  name: string;
  value: string;
  Icon?: React.FC;
}> = ({ name, value, Icon }) => {
  return (
    <DropdownMenu.RadioItem className="DropdownMenuRadioItem" value={value}>
      <DropdownMenu.ItemIndicator className="DropdownMenuItemIndicator">
        <DotFilledIcon />
      </DropdownMenu.ItemIndicator>
      {name}
      {Icon && (
        <div className="RightSlot">
          <Icon />
        </div>
      )}
    </DropdownMenu.RadioItem>
  );
};

export default BreakpointRadioItem;
