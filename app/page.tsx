"use client";

import { Context } from "@/core/context";
import Canvas from "./_components/Canvas";
import SceneGraph from "./_components/SceneGraph";
import TransformMode from "./_components/TransformMode";
import ObjectManager from "./_components/ObjectManager";
import VertexEditor from "./_components/VertextEditor";

export default function Home() {
  new Context();

  return (
    <div className="flex flex-col min-h-screen min-w-screen items-center justify-center">
      <TransformMode />
      <SceneGraph />
      <Canvas />
      {/* <VertexEditor /> */}
      <ObjectManager />
    </div>
  );
}
