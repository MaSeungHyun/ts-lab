import * as THREE from "three";
import { Camera } from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import {
  CONTROLS_SPEED,
  MICRO_SECOND,
  MOUSE_LEFT,
  MOUSE_RIGHT,
  MOUSE_WHEEL,
  PAN_SPEED,
} from "../constants/control";
import { MOUSE_MOVE_THRESHOLD } from "../constants/control";
// import pointerlockImage from "../assets/controls/pointerlock.svg";

interface ControlsEvent {
  change: { message?: string };
  keydown: { message?: string };
}

interface GCPointerLockControls extends PointerLockControls {
  camera: Camera | THREE.PerspectiveCamera | THREE.OrthographicCamera;
}

const acceleration_speed = 10;
export class Controls extends THREE.EventDispatcher<ControlsEvent> {
  private _controls: Controls | null = null;
  enabled: boolean = true;
  private _dom: HTMLElement;

  // 키보드 방향 관련 상태 변수
  private _moveForward: boolean = false;
  private _moveBackward: boolean = false;
  private _moveLeft: boolean = false;
  private _moveRight: boolean = false;
  private _moveUp: boolean = false;
  private _moveDown: boolean = false;

  // 이동 관련 변수
  private _prevTime: number = 0;
  private _velocity: THREE.Vector3 = new THREE.Vector3();
  private _direction: THREE.Vector3 = new THREE.Vector3();
  private _camera: Camera;
  private delta = new THREE.Vector3();

  // 포커스 관련 변수
  private box = new THREE.Box3();
  private center = new THREE.Vector3();
  private sphere = new THREE.Sphere();

  // 드래그를 통한 Controls Lock 감지 변수
  private _dragging: boolean = false;
  private _dragStart: { x: number; y: number } = { x: 0, y: 0 };
  private _dragEnd: { x: number; y: number } = { x: 0, y: 0 };

  private _active_pointer_left: boolean = false;
  private _active_pointer_right: boolean = false;
  private _active_mouse_wheel: boolean = false;

  private _pointerLockImage: HTMLImageElement = new Image();

  private _animationFrameId: number | null = null;
  private _activePointer: "left" | "right" | "wheel" | null = null;

  public object: THREE.Object3D;
  constructor(camera: Camera, dom: HTMLElement) {
    super();
    this._controls = new PointerLockControls(
      camera,
      dom
    ) as GCPointerLockControls;

    this._dom = dom;
    this.enabled = true;
    this._camera = camera;
    this.object = camera;
    this._moveForward = false;
    this._moveBackward = false;
    this._moveLeft = false;
    this._moveRight = false;
    this._moveUp = false;
    this._moveDown = false;
    this._prevTime = 0;
    this._velocity.set(0, 0, 0);
    this._direction.set(0, 0, 0);

    this.box = new THREE.Box3();

    // this._pointerLockImage.src = pointerlockImage;
    this._pointerLockImage.style.width = "30px";
    this._pointerLockImage.style.height = "30px";
    this._pointerLockImage.style.position = "absolute";

    this._dragStart = { x: 0, y: 0 };

    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);

    // 키보드 이벤트는 한 번만 등록
    dom.addEventListener("pointerdown", this.onPointerDown.bind(this));
    dom.addEventListener("pointermove", this.onPointerMove.bind(this));
    dom.addEventListener("pointerup", this.onPointerUp.bind(this));

    dom.addEventListener("wheel", this.zoom.bind(this));

    window.addEventListener("keydown", this.onKeyDown.bind(this));
    window.addEventListener("keyup", this.onKeyUp.bind(this));

    // 애니메이션 프레임 시작
  }

  get moveForward(): boolean {
    return this._moveForward;
  }
  get moveBackward(): boolean {
    return this._moveBackward;
  }
  get moveLeft(): boolean {
    return this._moveLeft;
  }
  get moveRight(): boolean {
    return this._moveRight;
  }

  public init(): void {
    // this._moveForward = false;
    // this._moveBackward = false;
    // this._moveLeft = false;
    // this._moveRight = false;
    // this._prevTime = 0;
    // this._velocity.set(0, 0, 0);
    // this._direction.set(0, 0, 0);
  }

  public zoom(event: WheelEvent): void {
    if (!this.enabled) return;
    const direction = new THREE.Vector3();
    this._controls?.camera.getWorldDirection(direction);

    // 휠의 방향에 따라 이동 거리 설정

    const delta = event.deltaY > 0 ? -1 : 1;

    const moveDistance = 1 * delta;

    // 카메라의 위치 업데이트
    this._controls?.camera?.position.addScaledVector(direction, moveDistance);
    // this._controls?.update(delta);
    this.dispatchEvent({ type: "change" });
  }

  public pan(event: MouseEvent): void {
    const right = new THREE.Vector3();
    const up = new THREE.Vector3();

    this._controls?.camera.matrix.extractBasis(right, up, new THREE.Vector3());

    // 카메라와 원점 사이의 거리 계산
    const distance = this._controls!.camera.position.length() / 10;

    // 거리 비례 팬 속도 설정
    const basePanSpeed = PAN_SPEED;
    const panSpeed = basePanSpeed * (distance || 1); // 거리에 비례하여 팬 속도 조정

    const deltaX = -event.movementX * panSpeed;
    const deltaY = event.movementY * panSpeed;

    this._controls?.camera?.position.addScaledVector(right, deltaX);
    this._controls?.camera?.position.addScaledVector(up, deltaY);

    this.dispatchEvent({ type: "change" });
  }

  private onPointerDown(event: PointerEvent): void {
    if (this.enabled && !this._activePointer) {
      if (event.button === MOUSE_LEFT) {
        this._activePointer = "left";
        this._active_pointer_left = true;
        this.onPointerLeftDown(event);
      } else if (event.button === MOUSE_RIGHT) {
        this._activePointer = "right";
        this._active_pointer_right = true;
        // this.startAnimation();
        this.onPointerRightDown(event);
      } else if (event.button === MOUSE_WHEEL) {
        this._activePointer = "wheel";
        this._active_mouse_wheel = true;
        this.onMouseWheelDown();
      }
    }
  }

  private onPointerMove(event: PointerEvent): void {
    if (this._activePointer === "left") {
      this.onPointerLeftMove(event);
    } else if (this._activePointer === "right") {
      this.onPointerRightMove(event);
    } else if (this._activePointer === "wheel") {
      this.onMouseWheelMove(event);
    }
  }

  private onPointerUp(event: PointerEvent): void {
    // if (this.enabled && this._activePointer) {
    //   if (event.button === MOUSE_LEFT && this._activePointer === "left") {
    //     this._active_pointer_left = false;
    //     this.onPointerLeftUp(event);
    //   } else if (
    //     event.button === MOUSE_RIGHT &&
    //     this._activePointer === "right"
    //   ) {
    //     this._active_pointer_right = false;
    //     this.onPointerRightUp();
    //   } else if (
    //     event.button === MOUSE_WHEEL &&
    //     this._activePointer === "wheel"
    //   ) {
    //     this._active_mouse_wheel = false;
    //     this.onMouseWheelUp();
    //   }
    //   this._activePointer = null;
    // }

    if (this.enabled && this._activePointer) {
      this._active_pointer_left = false;
      this._active_pointer_right = false;
      this._active_mouse_wheel = false;
      this.onPointerLeftUp(event);
      this.onPointerRightUp();
      this.onMouseWheelUp();
      this._activePointer = null;
      this._dom.style.cursor = "default";
    }
  }

  private onPointerLeftDown(event: MouseEvent): void {}
  private onPointerLeftMove(event: MouseEvent): void {}
  private onPointerLeftUp(event: MouseEvent): void {}

  private onPointerRightDown(event: MouseEvent): void {
    this._dragStart = { x: event.clientX, y: event.clientY };
  }

  private onPointerRightMove(event: MouseEvent): void {
    if (this._active_pointer_right && !this._dragging) {
      const deltaX = Math.abs(this._dragStart.x - event.clientX);
      const deltaY = Math.abs(this._dragStart.y - event.clientY);

      const rect = this._dom.getBoundingClientRect();
      this._pointerLockImage.style.top = `${event.clientY - rect.top - 15}px`;
      this._pointerLockImage.style.left = `${event.clientX - rect.left - 15}px`;

      if (deltaX >= MOUSE_MOVE_THRESHOLD || deltaY >= MOUSE_MOVE_THRESHOLD) {
        this._dragging = true;
        this._dom.appendChild(this._pointerLockImage);
      }
    }
    if (this._dragging && !this._controls?.isLocked) {
      this._controls?.lock();
    }
  }

  private onPointerRightUp(): void {
    if (this._dragging) {
      this._dragging = false;
      if (this._pointerLockImage.parentElement) {
        this._dom.removeChild(this._pointerLockImage);
      }
      this._controls?.unlock();
    }
    // this.stopAnimation();
  }

  private onMouseWheelDown(): void {
    this._dom.style.cursor = "grab";
  }

  private onMouseWheelMove(event: MouseEvent): void {
    this._dom.style.cursor = "grabbing";
    this.pan(event);
  }

  private onMouseWheelUp(): void {
    this._dom.style.cursor = "default";
    if (this._active_mouse_wheel) {
      this._active_mouse_wheel = false;
    }
  }

  public onKeyDown(event: KeyboardEvent): void {
    switch (event.code) {
      case "ArrowUp":
      case "KeyW":
        this._moveForward = true;
        break;
      case "ArrowLeft":
      case "KeyA":
        this._moveLeft = true;
        break;
      case "ArrowDown":
      case "KeyS":
        this._moveBackward = true;
        break;
      case "ArrowRight":
      case "KeyD":
        this._moveRight = true;
        break;
      case "Space":
      case "KeyE":
        this._moveUp = true;
        break;
      case "KeyQ":
        this._moveDown = true;
        break;
    }
  }
  public onKeyUp(event: KeyboardEvent): void {
    switch (event.code) {
      case "ArrowUp":
      case "KeyW":
        this._moveForward = false;
        break;
      case "ArrowLeft":
      case "KeyA":
        this._moveLeft = false;
        break;
      case "ArrowDown":
      case "KeyS":
        this._moveBackward = false;
        break;
      case "ArrowRight":
      case "KeyD":
        this._moveRight = false;
        break;
      case "Space":
      case "KeyE":
        this._moveUp = false;
        break;
      case "KeyQ":
        this._moveDown = false;
        break;
    }
  }

  public render = (): void => {
    const time = performance.now();
    const delta = Math.min((time - this._prevTime) / MICRO_SECOND, 0.02);
    this._prevTime = time;

    // 카메라 방향 벡터 계산
    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(
      this._camera.quaternion
    );

    // 카메라의 로컬 X축을 직접 사용하여 항상 일관된 좌우 방향 유지
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(
      this._camera.quaternion
    );

    // const distanceFromOrigin = this._camera.position.length();
    // const speedMultiplier = Math.max(1, distanceFromOrigin / 100);

    // 이동 방향 설정
    const moveForward = Number(this._moveForward);
    const moveBackward = Number(this._moveBackward);
    const moveLeft = Number(this._moveLeft);
    const moveRight = Number(this._moveRight);
    const moveUp = Number(this._moveUp);
    const moveDown = Number(this._moveDown);

    this._velocity.set(0, 0, 0);

    const RESULT_SPEED = 250;

    if (moveForward || moveBackward) {
      // this._velocity.addScaledVector(
      //   direction,
      //   (moveForward - moveBackward) * RESULT_SPEED * delta * speedMultiplier
      // );
      this._velocity.addScaledVector(
        direction,
        (moveForward - moveBackward) * RESULT_SPEED * delta
      );
    }

    if (moveLeft || moveRight) {
      // this._velocity.addScaledVector(
      //   right,
      //   (moveRight - moveLeft) * RESULT_SPEED * delta * speedMultiplier
      // );
      this._velocity.addScaledVector(
        right,
        (moveRight - moveLeft) * RESULT_SPEED * delta
      );
    }

    if (moveUp || moveDown) {
      // this._velocity.addScaledVector(
      //   new THREE.Vector3(0, 1, 0), // 항상 월드 Y축 사용
      //   (moveUp - moveDown) * CONTROLS_SPEED * delta * speedMultiplier
      // );
      this._velocity.addScaledVector(
        new THREE.Vector3(0, 1, 0), // 항상 월드 Y축 사용
        (moveUp - moveDown) * RESULT_SPEED * delta
      );
    }

    // 이동 적용

    if (this._velocity.length() > 0) {
      this._controls!.object.position.addScaledVector(this._velocity, delta);
    }
  };

  private startAnimation(): void {
    const animate = (): void => {
      this.dispatchEvent({ type: "keydown" });
      this.render();

      this._animationFrameId = requestAnimationFrame(animate);
    };
    animate();
  }

  private stopAnimation(): void {
    if (this._animationFrameId !== null) {
      cancelAnimationFrame(this._animationFrameId);
    }
  }

  get camera(): THREE.PerspectiveCamera {
    return this._camera;
  }

  set camera(camera: THREE.PerspectiveCamera) {
    this._camera = camera;
  }

  public dispose(): void {
    if (this._animationFrameId !== null) {
      cancelAnimationFrame(this._animationFrameId);
    }
    this._controls?.dispose();
    this._dom.removeEventListener("pointerdown", this.onPointerDown.bind(this));
    this._dom.removeEventListener("pointermove", this.onPointerMove.bind(this));
    this._dom.removeEventListener("pointerup", this.onPointerUp.bind(this));
    this._dom.removeEventListener("wheel", this.zoom.bind(this));
  }
}
