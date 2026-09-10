import * as Tooltip from "@radix-ui/react-tooltip";

export const IconTooltip: React.FC<{ Icon: React.FC; text: string }> = ({
  Icon,
  text,
}) => {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <Icon />
      </Tooltip.Trigger>
      <Tooltip.Content className="TooltipContent" sideOffset={15}>
        {text}
        <Tooltip.Arrow className="TooltipArrow" />
      </Tooltip.Content>
    </Tooltip.Root>
  );
};

export default IconTooltip;
