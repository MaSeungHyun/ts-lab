"use client";

import Icon from "@/components/Icon";
import { Context } from "@/core/context";
import { cn } from "@/utils/style";
import React, { useEffect, useState } from "react";
import * as THREE from "three";

const ICON_TYPE = {
  Group: "Boxes",
  SkinnedMesh: "Box",
  Mesh: "Box",
  PerspectiveCamera: "Video",
  Object3D: "Box",
  Bone: "Bone",
};
const depth = 0;

function SceneGraph() {
  const [scene, setScene] = useState<THREE.Object3D[] | null>(null);
  const [selectedObject, setSelectedObject] = useState<THREE.Object3D | null>(
    null
  );

  const handleKeyDown = (e: KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.key === "Backspace") {
      const context = Context.getInstance();
      context.removeObject(selectedObject);
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedObject]);

  const getSceneGraph = () => {
    const context = Context.getInstance();
    const scene = context.scene;

    setScene(scene.children);
  };

  const getSelectedObject = () => {
    const context = Context.getInstance();
    const selectedObject = context.selectedObject;
    setSelectedObject(selectedObject);
  };

  useEffect(() => {
    const context = Context.getInstance();
    getSceneGraph();
    getSelectedObject();
    context.subscribe(getSceneGraph);
    context.subscribe(getSelectedObject);
    return () => {
      context.unsubscribe(getSceneGraph);
      context.unsubscribe(getSelectedObject);
    };
  }, []);

  const handleClickSelectObject = (object: THREE.Object3D) => {
    const context = Context.getInstance();
    context.setSelectedObject(object);
  };
  return (
    <div className="absolute w-100 max-h-11/12 min-h-11/12 right-5 top-5 bg-black/50 overflow-y-auto border-1 border-[#505050]">
      <div className="flex flex-col">
        {scene?.map((object) => (
          <SceneGraphItem
            key={object.uuid}
            object={object}
            depth={depth + 1}
            selected={selectedObject}
            onClickSceneGraph={handleClickSelectObject}
          />
        ))}
      </div>
    </div>
  );
}

export default SceneGraph;

function SceneGraphItem({
  object,
  onClickSceneGraph,
  depth,
  selected,
}: {
  object: THREE.Object3D;
  onClickSceneGraph: (object: THREE.Object3D) => void;
  depth: number;
  selected: boolean;
}) {
  const [open, setOpen] = useState(true);

  const handleOpen = () => {
    setOpen(!open);
  };

  return (
    <div className="flex flex-col">
      <div
        className={`flex items-center cursor-pointer text-sm text-[#f0f0f0] gap-2 hover:bg-[#2e2e2e]`}
        onClick={() => onClickSceneGraph(object)}
      >
        <div
          role="figure"
          className="w-3 h-full flex items-center justify-center relative"
          style={{ marginLeft: `${(depth - 1) * 10}px` }}
        />

        <Icon
          icon="Play"
          className={cn(
            "fill-[#f0f0f0] size-3",
            open ? "rotate-90" : "rotate-0"
          )}
          onClick={handleOpen}
        />
        {/* <div role="figure" className="w-2 h-2 rounded-full bg-green-500 " />{" "} */}
        <Icon
          icon={
            (ICON_TYPE[object.type as keyof typeof ICON_TYPE] ??
              "Box") as keyof typeof ICON_TYPE
          }
          size={14}
        />
        <div
          className={cn("min-h-6", selected === object && "text-orange-400")}
        >
          {object.name}
        </div>
      </div>

      {open && (
        <div className="relative">
          {object.children.map((child) => (
            <SceneGraphItem
              key={child.uuid}
              object={child}
              depth={depth + 1}
              selected={selected}
              onClickSceneGraph={onClickSceneGraph}
            />
          ))}
        </div>
      )}
    </div>
  );
}
