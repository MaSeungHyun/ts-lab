import { cn } from "@/utils/style";
import React, { ComponentProps } from "react";

type ButtonProps = ComponentProps<"button">;

export default function Button({ className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "rounded-md px-4 py-1.5 bg-primary-500 hover:bg-primary-400 cursor-pointer",
        className
      )}
      {...props}
    />
  );
}
