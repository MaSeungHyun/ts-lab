"use client";

import Button from "@/components/Button";
import { Context } from "@/core/context";
import React, { useEffect } from "react";

type mode = "translate" | "rotate" | "scale";

function TransformMode() {
  const handleChangeTransformMode = (mode: mode) => {
    const context = Context.getInstance();
    context.transformControls.setMode(mode);
  };

  return (
    <div className="flex flex-col absolute top-5 left-5 justify-center items-center gap-1">
      <Button
        className="bg-black border-1 hover:bg-[#353535]"
        onClick={() => handleChangeTransformMode("translate")}
      >
        T
      </Button>
      <Button
        className="bg-black border-1 hover:bg-[#353535]"
        onClick={() => handleChangeTransformMode("rotate")}
      >
        R
      </Button>
      <Button
        className="bg-black border-1 hover:bg-[#353535]"
        onClick={() => handleChangeTransformMode("scale")}
      >
        S
      </Button>
    </div>
  );
}

export default TransformMode;
