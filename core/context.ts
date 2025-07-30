import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { TransformControls } from "three/addons/controls/TransformControls.js";
import model from "@/assets/Soldier.glb";
import { Controls } from "./control";

export class Context {
  static instance: Context;
  public domElement!: HTMLDivElement;
  public scene!: THREE.Scene;
  public sceneHelper!: THREE.Scene;
  public camera!: THREE.Camera;
  public renderer!: THREE.WebGLRenderer;
  public clock!: THREE.Clock;
  public controls!: Controls;
  public transformControls!: TransformControls;
  public raycaster!: THREE.Raycaster;
  public selectedObject!: THREE.Object3D;
  private listeners: (() => void)[] = [];
  private isDragging = false;

  private onMouseDown = () => {};
  private onMouseUp = () => {};
  private onMouseMove = () => {};

  constructor() {
    if (Context.instance) {
      return Context.instance;
    }

    this.scene = new THREE.Scene();
    this.sceneHelper = new THREE.Scene();
    this.scene.background = null;
    this.sceneHelper.background = null;
    this.scene.fog = new THREE.Fog(0x1e1f21, 1, 50);
    this.sceneHelper.fog = new THREE.Fog(0x1e1f21, 1, 50);

    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);

    this.clock = new THREE.Clock();
    this.defaultScene();
    this.loadModel();

    Context.instance = this;

    this.notify();
  }

  public static getInstance() {
    return Context.instance;
  }

  setSelectedObject(object: THREE.Object3D) {
    this.selectedObject = object;
    console.log(object);
    this.transformControls.detach();
    this.transformControls.attach(object);

    this.notify();
  }

  initRaycaster() {
    this.raycaster = new THREE.Raycaster();

    this.renderer.domElement.addEventListener("mousedown", (event) => {
      if (this.isDragging) return;

      event.stopPropagation();
      this.handleObjectCycling(event);
    });
    this.notify();
  }

  private handleObjectCycling(event: MouseEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2();

    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(mouse, this.camera);

    // 모든 객체를 재귀적으로 수집 (SkinnedMesh 포함)
    const allObjects: THREE.Object3D[] = [];
    this.scene.traverse((object) => {
      // SkinnedMesh, Mesh, Group 등 모든 객체 포함
      if (
        object instanceof THREE.Mesh ||
        object instanceof THREE.SkinnedMesh ||
        object instanceof THREE.Group ||
        object instanceof THREE.Object3D
      ) {
        allObjects.push(object);
      }
    });

    // TransformControls 헬퍼 객체 제외
    const excludeObjects = [this.transformControls.getHelper()];
    const filteredObjects = allObjects.filter(
      (obj) => !excludeObjects.includes(obj as THREE.Object3D)
    );

    const intersects = this.raycaster.intersectObjects(filteredObjects, true);
    console.log("교차된 객체들:", intersects);

    if (intersects.length === 0) return;

    // 선택 로직
    let nextSelectedObject: THREE.Object3D;

    if (!this.selectedObject) {
      // 선택된 오브젝트가 없으면 첫 번째 선택
      nextSelectedObject = intersects[0].object;
      console.log(
        "🎯 첫 번째 오브젝트 선택:",
        nextSelectedObject.name,
        nextSelectedObject.type
      );
    } else {
      // 현재 선택된 오브젝트가 교차점에 있는지 확인
      const currentIndex = intersects.findIndex((intersect) => {
        return intersect.object.uuid === this.selectedObject.uuid;
      });

      console.log(currentIndex);
      console.log("현재 선택된 객체 인덱스:", currentIndex);
      console.log(
        "교차된 객체들:",
        intersects.map((i) => ({ name: i.object.name, type: i.object.type }))
      );

      if (currentIndex === -1) {
        // 현재 선택된 오브젝트가 교차점에 없으면 첫 번째 선택
        nextSelectedObject = intersects[0].object;
        console.log(
          "🔄 새 위치 - 첫 번째 오브젝트 선택:",
          nextSelectedObject.name,
          nextSelectedObject.type
        );
      } else {
        // 다음 오브젝트로 순환 선택
        console.log(currentIndex);
        const nextIndex = (currentIndex + 1) % intersects.length;
        console.log(nextIndex);
        nextSelectedObject = intersects[nextIndex].object;
        console.log(intersects[nextIndex].object);
        console.log(
          `🔄 순환 선택: ${currentIndex} → ${nextIndex} (총 ${intersects.length}개)`,
          nextSelectedObject.name,
          nextSelectedObject.type
        );
      }
    }

    this.setSelectedObject(nextSelectedObject);
  }

  initTransformControls() {
    this.transformControls = new TransformControls(
      this.camera,
      this.renderer.domElement
    );

    this.sceneHelper.add(this.transformControls.getHelper());

    this.transformControls.addEventListener("mouseDown", () => {
      this.isDragging = true;
      this.controls.enabled = false;
    });

    this.transformControls.addEventListener("mouseUp", () => {
      this.isDragging = false;
      this.controls.enabled = true;
    });

    this.transformControls.addEventListener("dragging-changed", (event) => {
      this.isDragging = event.value as boolean;
      this.controls.enabled = !event.value;
    });
  }

  animate() {
    this.renderer.render(this.scene, this.camera);
    this.renderer.autoClear = false;
    this.renderer.render(this.sceneHelper, this.camera);
    this.renderer.setSize(
      this.domElement.clientWidth,
      this.domElement.clientHeight
    );
    this.controls.render();

    this.renderer.setAnimationLoop(this.animate.bind(this));
  }

  resize() {
    this.renderer.setSize(
      this.domElement.clientWidth,
      this.domElement.clientHeight
    );
  }

  didMount(dom: HTMLDivElement) {
    this.domElement = dom;
    this.renderer = new THREE.WebGLRenderer();
    this.camera = new THREE.PerspectiveCamera(
      75,
      dom.clientWidth / dom.clientHeight,
      0.1,
      5000
    );
    this.camera.position.set(0, 2, 3);
    this.camera.lookAt(0, 1, 0);
    this.renderer.setSize(dom.clientWidth, dom.clientHeight);
    this.controls = new Controls(this.camera, this.renderer.domElement);

    this.domElement.appendChild(this.renderer.domElement);

    this.initTransformControls();
    this.initRaycaster();
    this.animate();
  }

  traverseLoad(children: THREE.Object3D, parent: THREE.Object3D) {
    parent.attach(children);
    if (children.children) {
      children.children.forEach((child: THREE.Object3D) =>
        this.traverseLoad(child, children)
      );
    }
  }

  loadModel() {
    const loader = new GLTFLoader();

    loader.load(model, (gltf) => {
      gltf.scene.position.set(2, 0, 0);
      gltf.scene.rotation.set(0, (Math.PI / 2) * 90, 0);

      // gltf.scene을 직접 추가 (내부 메쉬들이 선택 가능)
      this.scene.add(gltf.scene);

      this.notify();
    });
  }

  defaultScene() {
    const light = new THREE.DirectionalLight(0xffffff, 3);
    light.position.set(2, 10, 3);
    light.name = "DirectionalLight";

    const gridGroup = new THREE.Group();
    const grid = new THREE.GridHelper(1000, 2000, 0xacacac, 0xacacac);
    const subGrid = new THREE.GridHelper(1000, 1000, 0x505050, 0x505050);

    gridGroup.add(grid);
    gridGroup.add(subGrid);
    this.sceneHelper.add(gridGroup);
    this.scene.add(light);

    // this.scene.add(cube);
  }

  removeObject(object: THREE.Object3D = this.selectedObject) {
    object.parent?.remove(object);
    this.notify();
  }

  dispose() {
    this.domElement.removeChild(this.renderer.domElement);
    this.renderer.dispose();
    this.controls.dispose();
  }

  subscribe(listener: () => void) {
    this.listeners.push(listener);
  }

  unsubscribe(listener: () => void) {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  notify() {
    this.listeners.forEach((listener) => listener());
  }

  createWaveEffect(geometry: THREE.BufferGeometry, time: number) {
    const positions = geometry.attributes.position.array;
    const vertexCount = positions.length / 3;

    for (let i = 0; i < vertexCount; i++) {
      const x = positions[i * 3];
      const z = positions[i * 3 + 2];

      // 사인파로 높이 조절
      positions[i * 3 + 1] =
        Math.sin(x * 2 + time) * 0.5 + Math.cos(z * 2 + time) * 0.3;
    }

    geometry.attributes.position.needsUpdate = true;
  }

  forceNotify() {
    this.notify();
  }
}
