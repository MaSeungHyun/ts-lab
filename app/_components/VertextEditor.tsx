import React, { useRef, useEffect, useState, useCallback } from "react";
import * as THREE from "three";

interface VertexPoint {
  position: THREE.Vector3;
  index: number;
  mesh: THREE.Mesh;
}

interface MouseState {
  isDown: boolean;
  startX: number;
  startY: number;
}

const VertexEditor: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const boxRef = useRef<THREE.Mesh | null>(null);
  const vertexPointsRef = useRef<VertexPoint[]>([]);
  const selectedVertexRef = useRef<VertexPoint | null>(null);
  const mouseRef = useRef<MouseState>({ isDown: false, startX: 0, startY: 0 });
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mousePositionRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const planeRef = useRef<THREE.Plane>(new THREE.Plane());
  const intersectionPointRef = useRef<THREE.Vector3>(new THREE.Vector3());

  const [selectedVertexIndex, setSelectedVertexIndex] = useState<number | null>(
    null
  );
  const [vertexCount, setVertexCount] = useState<number>(0);

  // 고유한 버텍스 위치들을 추출하는 함수
  const getUniqueVertices = useCallback(
    (geometry: THREE.BufferGeometry): THREE.Vector3[] => {
      const positions = geometry.attributes.position.array as Float32Array;
      const uniqueVertices: THREE.Vector3[] = [];
      const vertexMap = new Map<string, THREE.Vector3>();

      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        const z = positions[i + 2];

        // 좌표를 문자열로 변환하여 중복 제거
        const key = `${x.toFixed(6)},${y.toFixed(6)},${z.toFixed(6)}`;

        if (!vertexMap.has(key)) {
          const vertex = new THREE.Vector3(x, y, z);
          vertexMap.set(key, vertex);
          uniqueVertices.push(vertex);
        }
      }

      return uniqueVertices;
    },
    []
  );

  // 버텍스 위치를 업데이트하는 함수
  const updateVertexPosition = useCallback(
    (vertexIndex: number, newPosition: THREE.Vector3) => {
      if (!boxRef.current) return;

      const geometry = boxRef.current.geometry as THREE.BufferGeometry;
      const positions = geometry.attributes.position.array as Float32Array;
      const uniqueVertices = getUniqueVertices(geometry);
      const oldPosition = uniqueVertices[vertexIndex];

      // 모든 같은 위치의 버텍스들을 찾아서 업데이트
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        const z = positions[i + 2];

        // 기존 위치와 같은 버텍스들을 새 위치로 업데이트
        if (
          Math.abs(x - oldPosition.x) < 0.001 &&
          Math.abs(y - oldPosition.y) < 0.001 &&
          Math.abs(z - oldPosition.z) < 0.001
        ) {
          positions[i] = newPosition.x;
          positions[i + 1] = newPosition.y;
          positions[i + 2] = newPosition.z;
        }
      }

      geometry.attributes.position.needsUpdate = true;
      geometry.computeVertexNormals();

      // 버텍스 포인트 메쉬도 업데이트
      if (vertexPointsRef.current[vertexIndex]) {
        vertexPointsRef.current[vertexIndex].position.copy(newPosition);
        vertexPointsRef.current[vertexIndex].mesh.position.copy(newPosition);
      }
    },
    [getUniqueVertices]
  );

  // 버텍스 포인트들을 생성하는 함수
  const createVertexPoints = useCallback(() => {
    if (!sceneRef.current || !boxRef.current) return;

    // 기존 버텍스 포인트들 제거
    vertexPointsRef.current.forEach((point) => {
      sceneRef.current!.remove(point.mesh);
    });
    vertexPointsRef.current = [];

    const geometry = boxRef.current.geometry as THREE.BufferGeometry;
    const uniqueVertices = getUniqueVertices(geometry);

    uniqueVertices.forEach((vertex, index) => {
      const sphereGeometry = new THREE.SphereGeometry(0.05, 8, 6);
      const sphereMaterial = new THREE.MeshBasicMaterial({
        color: 0x4a90e2,
        transparent: true,
        opacity: 0.8,
      });
      const sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);

      sphereMesh.position.copy(vertex);
      sphereMesh.userData = { vertexIndex: index, isVertexPoint: true };

      sceneRef.current!.add(sphereMesh);

      vertexPointsRef.current.push({
        position: vertex.clone(),
        index,
        mesh: sphereMesh,
      });
    });

    setVertexCount(uniqueVertices.length);
  }, [getUniqueVertices]);

  // 마우스 이벤트 핸들러
  const handleMouseDown = useCallback((event: MouseEvent) => {
    if (!cameraRef.current || !sceneRef.current) return;

    const rect = containerRef.current!.getBoundingClientRect();
    mousePositionRef.current.x =
      ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mousePositionRef.current.y =
      -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(
      mousePositionRef.current,
      cameraRef.current
    );
    const intersects = raycasterRef.current.intersectObjects(
      vertexPointsRef.current.map((p) => p.mesh)
    );

    if (intersects.length > 0) {
      const intersectedObject = intersects[0].object;
      const vertexIndex = intersectedObject.userData.vertexIndex;

      selectedVertexRef.current = vertexPointsRef.current[vertexIndex];
      setSelectedVertexIndex(vertexIndex);

      // 선택된 버텍스 하이라이트
      vertexPointsRef.current.forEach((point, index) => {
        const material = point.mesh.material as THREE.MeshBasicMaterial;
        if (index === vertexIndex) {
          material.color.setHex(0xff4444);
          material.opacity = 1.0;
        } else {
          material.color.setHex(0x4a90e2);
          material.opacity = 0.8;
        }
      });

      mouseRef.current.isDown = true;
      mouseRef.current.startX = event.clientX;
      mouseRef.current.startY = event.clientY;

      // 카메라 기준으로 평면 설정
      const cameraDirection = new THREE.Vector3();
      cameraRef.current.getWorldDirection(cameraDirection);
      planeRef.current.setFromNormalAndCoplanarPoint(
        cameraDirection.negate(),
        selectedVertexRef.current.position
      );
    }
  }, []);

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (
        !mouseRef.current.isDown ||
        !selectedVertexRef.current ||
        !cameraRef.current
      )
        return;

      const rect = containerRef.current!.getBoundingClientRect();
      mousePositionRef.current.x =
        ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mousePositionRef.current.y =
        -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(
        mousePositionRef.current,
        cameraRef.current
      );

      if (
        raycasterRef.current.ray.intersectPlane(
          planeRef.current,
          intersectionPointRef.current
        )
      ) {
        updateVertexPosition(
          selectedVertexRef.current.index,
          intersectionPointRef.current
        );
      }
    },
    [updateVertexPosition]
  );

  const handleMouseUp = useCallback(() => {
    mouseRef.current.isDown = false;
    selectedVertexRef.current = null;
    setSelectedVertexIndex(null);

    // 모든 버텍스 포인트 색상 초기화
    vertexPointsRef.current.forEach((point) => {
      const material = point.mesh.material as THREE.MeshBasicMaterial;
      material.color.setHex(0x4a90e2);
      material.opacity = 0.8;
    });
  }, []);

  // 박스 리셋 함수
  const resetBox = useCallback(() => {
    if (!boxRef.current || !sceneRef.current) return;

    sceneRef.current.remove(boxRef.current);

    const geometry = new THREE.BoxGeometry(2, 2, 2, 10, 10, 10);
    const material = new THREE.MeshLambertMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.7,
      wireframe: true,
    });

    boxRef.current = new THREE.Mesh(geometry, material);
    sceneRef.current.add(boxRef.current);

    createVertexPoints();
  }, [createVertexPoints]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene 설정
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    sceneRef.current = scene;

    // Camera 설정
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(5, 5, 5);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer 설정
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(
      containerRef.current.clientWidth,
      containerRef.current.clientHeight
    );
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 조명 설정
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // 박스 생성
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.7,
      wireframe: true,
    });

    const box = new THREE.Mesh(geometry, material);
    box.castShadow = true;
    scene.add(box);
    boxRef.current = box;

    // 바닥 추가
    const floorGeometry = new THREE.PlaneGeometry(10, 10);
    const floorMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2;
    floor.receiveShadow = true;
    scene.add(floor);

    createVertexPoints();

    // 마우스 이벤트 리스너
    const canvas = renderer.domElement;
    canvas.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    // 카메라 컨트롤 (간단한 마우스 회전)
    let isRotating = false;
    let previousMousePosition = { x: 0, y: 0 };

    const handleCanvasMouseDown = (event: MouseEvent) => {
      if (!selectedVertexRef.current) {
        isRotating = true;
        previousMousePosition = { x: event.clientX, y: event.clientY };
      }
    };

    const handleCanvasMouseMove = (event: MouseEvent) => {
      if (isRotating && !selectedVertexRef.current) {
        const deltaX = event.clientX - previousMousePosition.x;
        const deltaY = event.clientY - previousMousePosition.y;

        const spherical = new THREE.Spherical();
        spherical.setFromVector3(camera.position);
        spherical.theta -= deltaX * 0.01;
        spherical.phi += deltaY * 0.01;
        spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));

        camera.position.setFromSpherical(spherical);
        camera.lookAt(0, 0, 0);

        previousMousePosition = { x: event.clientX, y: event.clientY };
      }
    };

    const handleCanvasMouseUp = () => {
      isRotating = false;
    };

    canvas.addEventListener("mousedown", handleCanvasMouseDown);
    canvas.addEventListener("mousemove", handleCanvasMouseMove);
    canvas.addEventListener("mouseup", handleCanvasMouseUp);

    // 렌더링 루프
    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // 리사이즈 핸들러
    const handleResize = () => {
      if (!containerRef.current) return;

      camera.aspect =
        containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(
        containerRef.current.clientWidth,
        containerRef.current.clientHeight
      );
    };

    window.addEventListener("resize", handleResize);

    // 클린업
    return () => {
      window.removeEventListener("resize", handleResize);
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousedown", handleCanvasMouseDown);
      canvas.removeEventListener("mousemove", handleCanvasMouseMove);
      canvas.removeEventListener("mouseup", handleCanvasMouseUp);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);

      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [handleMouseDown, handleMouseMove, handleMouseUp, createVertexPoints]);

  return (
    <div className="w-full h-screen relative bg-gray-900">
      <div ref={containerRef} className="w-full h-full" />

      {/* UI 패널 */}
      <div className="absolute top-4 left-4 bg-black bg-opacity-80 text-white p-4 rounded-lg max-w-sm">
        <h3 className="text-lg font-bold mb-3">Vertex Editor</h3>
        <div className="space-y-2 text-sm">
          <p>
            • <span className="text-blue-400">파란 점</span>을 클릭해서 버텍스
            선택
          </p>
          <p>• 드래그해서 버텍스 위치 변경</p>
          <p>• 마우스로 카메라 회전</p>
          <p>
            • 총 버텍스 개수:{" "}
            <span className="text-green-400">{vertexCount}</span>
          </p>
          {selectedVertexIndex !== null && (
            <p>
              • 선택된 버텍스:{" "}
              <span className="text-red-400">#{selectedVertexIndex}</span>
            </p>
          )}
        </div>

        <button
          onClick={resetBox}
          className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
        >
          박스 리셋
        </button>
      </div>

      {/* 상태 표시 */}
      {selectedVertexIndex !== null && (
        <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-2 rounded">
          버텍스 #{selectedVertexIndex} 편집 중
        </div>
      )}
    </div>
  );
};

export default VertexEditor;
