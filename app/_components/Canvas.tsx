"use client";

import { Context } from "@/core/context";
import React, { useEffect, useRef } from "react";

function Canvas() {
  const canvasRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!canvasRef.current) return;

    const context = Context.getInstance();

    context.didMount(canvasRef.current);

    context.forceNotify();
    return () => {
      context.dispose();
    };
  }, []);

  return <div ref={canvasRef} className="w-screen h-screen" />;
}

export default Canvas;
