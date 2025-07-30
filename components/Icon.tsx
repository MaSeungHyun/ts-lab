import { cn } from "@/utils/style";
import { icons, type LucideProps } from "lucide-react";

type TransformIconProps = LucideProps & {
  icon: keyof typeof icons;
  className?: string;
  fill?: string;
  size?: number;
  onClick?: () => void;
};

export default function Icon({
  className,
  icon,
  fill = "transparent",
  size = 18,
  onClick,
  ...props
}: TransformIconProps) {
  const Icon = icons[icon as keyof typeof icons];

  return (
    <Icon
      className={cn(className)}
      fill={fill}
      size={size}
      onClick={onClick}
      {...props}
    />
  );
}
