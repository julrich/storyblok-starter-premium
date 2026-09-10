import { DesktopIcon, LaptopIcon, MobileIcon } from "@radix-ui/react-icons";
import { isBreakpointState } from "../../GraphContext";

const BreakpointIcon: React.FC<{ name: string }> = ({ name }) => {
  if (isBreakpointState(name)) {
    switch (name) {
      case "all":
        return "All";
      case "desktop":
        return <DesktopIcon />;
      case "laptop":
        return <LaptopIcon />;
      case "tablet":
        return <MobileIcon />;
      case "phone":
        return <MobileIcon />;
    }
  }

  return null;
};
export default BreakpointIcon;
