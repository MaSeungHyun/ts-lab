import React, { ComponentProps } from "react";

type InputProps = ComponentProps<"input">;

function Input(props: InputProps) {
  return (
    <input
      className="w-full h-[2rem] border-2 border-gray-300 rounded-md p-2 bg-gray-50 text-black focus:outline-none"
      {...props}
    />
  );
}

export default Input;
