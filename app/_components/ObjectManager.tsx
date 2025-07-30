"use client";

import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";

import Button from "@/components/Button";
import { Context } from "@/core/context";
import React from "react";

import * as THREE from "three";

function ObjectManager() {
  const context = Context.getInstance();

  const handleClickAddSkeleton = () => {
    // 1단계: 지오메트리와 머티리얼
    const lowerBoxGeometry = new THREE.BoxGeometry(1, 1, 1);
    const upperBoxGeometry = new THREE.BoxGeometry(1, 1, 1);

    const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });

    // 2단계: 뼈대 구조
    const rootBone = new THREE.Bone();
    rootBone.position.set(0, 0, 0);
    rootBone.name = "rootBone";

    const childBone = new THREE.Bone();
    childBone.position.set(0, 1.5, 0);
    childBone.name = "childBone";

    rootBone.add(childBone);

    // 3단계: Skeleton 생성
    const skeleton = new THREE.Skeleton([rootBone, childBone]);

    // 4단계: 지오메트리 결합
    const upperBoxMatrix = new THREE.Matrix4().makeTranslation(0, 1.5, 0);
    upperBoxGeometry.applyMatrix4(upperBoxMatrix);

    const mergedGeometry = BufferGeometryUtils.mergeGeometries([
      lowerBoxGeometry,
      upperBoxGeometry,
    ]);

    // 5단계: Skin weights 설정 (중요!)
    const vertexCount = mergedGeometry.attributes.position.count;
    const skinIndices = new Float32Array(vertexCount * 4);
    const skinWeights = new Float32Array(vertexCount * 4);

    // 각 정점에 대해 본 인덱스와 가중치 설정
    for (let i = 0; i < vertexCount; i++) {
      const position = new THREE.Vector3();
      position.fromBufferAttribute(mergedGeometry.attributes.position, i);

      if (position.y < 0.75) {
        // 하단 박스 정점들 - rootBone에 영향
        skinIndices[i * 4] = 0; // rootBone 인덱스
        skinWeights[i * 4] = 1; // 100% 영향
      } else {
        // 상단 박스 정점들 - childBone에 영향
        skinIndices[i * 4] = 1; // childBone 인덱스
        skinWeights[i * 4] = 1; // 100% 영향
      }
    }

    mergedGeometry.setAttribute(
      "skinIndex",
      new THREE.Uint16BufferAttribute(skinIndices, 4)
    );
    mergedGeometry.setAttribute(
      "skinWeight",
      new THREE.Float32BufferAttribute(skinWeights, 4)
    );

    // 6단계: SkinnedMesh 생성
    const skinnedMesh = new THREE.SkinnedMesh(mergedGeometry, material);
    skinnedMesh.name = "TwoBoxSkeleton";

    skinnedMesh.add(rootBone);
    skinnedMesh.bind(skeleton);

    console.log(skinnedMesh);

    // 7단계: 씬에 추가
    context.scene.add(skinnedMesh);

    // 뼈대 시각화
    const skeletonHelper = new THREE.SkeletonHelper(skinnedMesh);
    context.scene.add(skeletonHelper);

    context.setSelectedObject(skinnedMesh);
    context.notify();
  };

  const handleClickAddMesh = () => {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = "New Mesh";
    mesh.position.set(0, 0, 0);

    context.scene.add(mesh);
    context.setSelectedObject(mesh);
    context.notify();
  };

  const handleClickAddGroup = () => {
    const group = new THREE.Group();
    group.name = "New Group";

    const geometry = new THREE.SphereGeometry(0.5, 16, 16);
    const material = new THREE.MeshStandardMaterial({ color: 0x0000ff });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.name = "New Sphere";

    group.add(sphere);
    group.position.set(2, 0, 0);

    context.scene.add(group);
    context.setSelectedObject(group);
    context.notify();
  };

  const handleClickAddBone = () => {
    const bone = new THREE.Bone();
    bone.name = "New Bone";
    bone.position.set(0, 0, 0);

    console.log(bone);
    const parent = context.selectedObject ?? context.scene;

    parent.add(bone);
    context.notify();
  };

  const test = () => {
    const skeleton = new THREE.Skeleton();
    const parent = context.selectedObject ?? context.scene;
    parent.add(skeleton);
    context.notify();
  };

  return (
    <div className="absolute bottom-5 left-5">
      <div className="flex flex-col gap-2">
        <Button onClick={handleClickAddSkeleton}>Add Skeleton</Button>
        <Button onClick={test}>Add Skeleton</Button>
        <Button onClick={handleClickAddBone}>Add Bone</Button>
        <Button onClick={handleClickAddMesh}>Add Mesh</Button>
        <Button onClick={handleClickAddGroup}>Add Group</Button>
      </div>
    </div>
  );
}

export default ObjectManager;
