import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

interface FileItem {
  path: string;
  content: string;
}

interface ThreeTreeProps {
  files: FileItem[];
  selectedPath: string;
  onSelectPath: (path: string) => void;
}

interface TreeNode {
  name: string;
  fullPath: string;
  isDir: boolean;
  children: { [key: string]: TreeNode };
  size: number;
  // coordinate positions assigned dynamically
  x?: number;
  y?: number;
  z?: number;
}

export default function ThreeTree({ files, selectedPath, onSelectPath }: ThreeTreeProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<{ name: string; path: string; size: number } | null>(null);
  const [useOrbitalMotion, setUseOrbitalMotion] = useState(true);

  useEffect(() => {
    if (!mountRef.current || files.length === 0) return;

    // 1. Parse Flat File Array into a Hierarchical Tree
    const root: TreeNode = {
      name: "ROOT",
      fullPath: "",
      isDir: true,
      children: {},
      size: 0,
    };

    files.forEach((file) => {
      const parts = file.path.split("/");
      let current = root;
      parts.forEach((part, index) => {
        const isLast = index === parts.length - 1;
        if (!current.children[part]) {
          current.children[part] = {
            name: part,
            fullPath: parts.slice(0, index + 1).join("/"),
            isDir: !isLast,
            children: {},
            size: isLast ? file.content.split("\n").length : 0,
          };
        }
        current = current.children[part];
        if (isLast) {
          current.size = file.content.split("\n").length;
        }
      });
    });

    // 2. Assign 3D Coordinates Recursively using Spherical Distribution
    const positionNodes = (node: TreeNode, px: number, py: number, pz: number, depth: number) => {
      node.x = px;
      node.y = py;
      node.z = pz;

      const childrenKeys = Object.keys(node.children);
      const count = childrenKeys.length;
      if (count === 0) return;

      const radius = 6.5 / (depth + 0.5); // Spherical range contracts as structure deepens

      childrenKeys.forEach((key, index) => {
        const child = node.children[key];
        
        // Distribute coordinates uniformly over spherical sector
        const theta = (index / count) * Math.PI * 2;
        const phi = Math.acos(1 - (2 * (index + 0.5)) / count);

        const cx = px + radius * Math.sin(phi) * Math.cos(theta);
        const cy = py + radius * Math.sin(phi) * Math.sin(theta);
        const cz = pz + radius * Math.cos(phi);

        positionNodes(child, cx, cy, cz, depth + 1);
      });
    };

    positionNodes(root, 0, 0, 0, 0);

    // 3. Collect visual meshes for rendering
    const nodesList: { node: TreeNode; color: THREE.Color; size: number }[] = [];
    const linesList: { from: [number, number, number]; to: [number, number, number] }[] = [];

    const traverse = (node: TreeNode) => {
      const parentPos: [number, number, number] = [node.x || 0, node.y || 0, node.z || 0];

      Object.values(node.children).forEach((child) => {
        const childPos: [number, number, number] = [child.x || 0, child.y || 0, child.z || 0];
        linesList.push({ from: parentPos, to: childPos });

        // Node thematic colors: folder vs core file types
        let col = new THREE.Color("#64748b"); // Slate
        let sz = 0.35;

        if (child.isDir) {
          col = new THREE.Color("#06b6d4"); // Cyan folders
          sz = 0.45;
        } else {
          // File extension specific glowing colors
          const ext = child.name.split(".").pop()?.toLowerCase();
          if (ext === "tsx" || ext === "jsx") {
            col = new THREE.Color("#22d3ee"); // cyan
            sz = Math.min(0.2 + (child.size / 600) * 0.4, 0.7);
          } else if (ext === "ts" || ext === "js") {
            col = new THREE.Color("#fbbf24"); // Amber
            sz = Math.min(0.2 + (child.size / 600) * 0.4, 0.7);
          } else if (ext === "json") {
            col = new THREE.Color("#e11d48"); // Pink
            sz = 0.3;
          } else if (ext === "css") {
            col = new THREE.Color("#3b82f6"); // Blue
            sz = 0.3;
          } else if (ext === "md" || ext === "txt") {
            col = new THREE.Color("#c084fc"); // Purple
            sz = 0.35;
          }
        }

        // Active highlighted selected path glow
        if (selectedPath === child.fullPath) {
          col = new THREE.Color("#22c55e"); // Green active target
          sz += 0.2;
        }

        nodesList.push({ node: child, color: col, size: sz });
        traverse(child);
      });
    };

    traverse(root);

    // 4. Set up Scene, Camera and WebGL Renderer
    const width = mountRef.current.clientWidth || 600;
    const height = mountRef.current.clientHeight || 450;
    const scene = new THREE.Scene();
    
    // Transparent space environment with deep space lighting fallback
    scene.background = new THREE.Color("#020617");
    scene.fog = new THREE.FogExp2("#020617", 0.04);

    const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 100);
    camera.position.set(0, 4, 11);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    // 5. Add Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(10, 20, 15);
    scene.add(dirLight);

    // Point lighting at center for stardust atmosphere
    const pointLight = new THREE.PointLight(0x06b6d4, 1.5, 30);
    pointLight.position.set(0, 0, 0);
    scene.add(pointLight);

    // 6. Draw Codebase Nodes as Shiny Spheres
    const nodeMeshes: { mesh: THREE.Mesh; item: TreeNode }[] = [];
    const sphereGeometry = new THREE.SphereGeometry(1, 16, 16);

    nodesList.forEach(({ node, color, size }) => {
      const nodeMat = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.2,
        metalness: 0.8,
        emissive: color.clone().multiplyScalar(0.25),
      });

      const mesh = new THREE.Mesh(sphereGeometry, nodeMat);
      mesh.scale.set(size, size, size);
      mesh.position.set(node.x || 0, node.y || 0, node.z || 0);
      scene.add(mesh);
      nodeMeshes.push({ mesh, item: node });
    });

    // 7. Draw Connection Lines
    const linesMaterial = new THREE.LineBasicMaterial({
      color: 0x334155, // slate connection
      transparent: true,
      opacity: 0.45,
    });

    linesList.forEach(({ from, to }) => {
      const points = [
        new THREE.Vector3(...from),
        new THREE.Vector3(...to)
      ];
      const geom = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geom, linesMaterial);
      scene.add(line);
    });

    // 8. Add Orbit/Rotation animation group for cosmic stardust feel
    const galaxyGroup = new THREE.Group();
    // Move all items to galaxy group except lights and grid
    const objectsToMove = [...scene.children].filter(
      (child) => !(child instanceof THREE.Light)
    );
    objectsToMove.forEach((obj) => {
      galaxyGroup.add(obj);
    });
    scene.add(galaxyGroup);

    // 9. Interactive Raycasting & Cursor Coordinates Selection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerMove = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      // Flatten meshes for raycasting check
      const intersects = raycaster.intersectObjects(
        nodeMeshes.map((n) => n.mesh)
      );

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object as THREE.Mesh;
        const record = nodeMeshes.find((n) => n.mesh === hitMesh);
        if (record) {
          setHoveredNode({
            name: record.item.name,
            path: record.item.fullPath,
            size: record.item.size,
          });
          document.body.style.cursor = "pointer";
          // Light up hovered element in real-time
          (hitMesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x22c55e);
        }
      } else {
        setHoveredNode(null);
        document.body.style.cursor = "default";
        // Reset emissive values
        nodeMeshes.forEach(({ mesh, item }) => {
          const ext = item.name.split(".").pop()?.toLowerCase();
          let baseGlow = 0.25;
          if (selectedPath === item.fullPath) baseGlow = 0.65;
          const mat = mesh.material as THREE.MeshStandardMaterial;
          mat.emissive.copy(mat.color).multiplyScalar(baseGlow);
        });
      }
    };

    const onPointerClick = () => {
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(
        nodeMeshes.map((n) => n.mesh)
      );

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object as THREE.Mesh;
        const record = nodeMeshes.find((n) => n.mesh === hitMesh);
        if (record && !record.item.isDir) {
          onSelectPath(record.item.fullPath);
        }
      }
    };

    renderer.domElement.addEventListener("mousemove", onPointerMove);
    renderer.domElement.addEventListener("click", onPointerClick);

    // 10. Frame Render Animation Loop with Orbital Spin
    let animationFrameId: number;
    let rotationAngle = 0;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (useOrbitalMotion) {
        rotationAngle += 0.0035;
        galaxyGroup.rotation.y = rotationAngle;
        galaxyGroup.rotation.x = Math.sin(rotationAngle * 0.5) * 0.05;
      }

      renderer.render(scene, camera);
    };

    animate();

    // 11. Handle dynamic resizing changes gracefully
    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(mountRef.current);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      if (renderer.domElement && mountRef.current) {
        try {
          renderer.domElement.removeEventListener("mousemove", onPointerMove);
          renderer.domElement.removeEventListener("click", onPointerClick);
          mountRef.current.removeChild(renderer.domElement);
        } catch (e) {
          // ignore cleanup failures
        }
      }
      renderer.dispose();
      sphereGeometry.dispose();
      linesMaterial.dispose();
    };
  }, [files, selectedPath, useOrbitalMotion]);

  return (
    <div className="w-full h-full relative bg-slate-950 flex flex-col overflow-hidden rounded-xl border border-slate-900" id="threejs-workspace-container">
      
      {/* 3D CONTROLS METADATA BAR */}
      <div className="absolute top-3 left-3 z-10 bg-slate-950/90 border border-slate-800/80 px-3.5 py-2.5 rounded-lg text-xs font-mono text-slate-300 pointer-events-auto space-y-1 backdrop-blur max-w-xs shadow-xl shadow-black/40">
        <div className="flex items-center space-x-2 text-cyan-400 font-bold mb-1">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping inline-block" />
          <span>Interactive 3D Galaxy Tree</span>
        </div>
        <p className="text-[10px] text-slate-500">Nodes represent files and directories positioned automatically in cosmic space structures.</p>
        
        <div className="pt-2 flex items-center justify-between">
          <span className="text-[10px] text-slate-400">Gravitational Spin:</span>
          <button 
            onClick={() => setUseOrbitalMotion(!useOrbitalMotion)}
            className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-[10px] text-cyan-300 font-bold cursor-pointer"
          >
            {useOrbitalMotion ? "PAUSE" : "ORBIT"}
          </button>
        </div>
      </div>

      {/* RENDER CANVAS CONTAINER */}
      <div ref={mountRef} className="w-full h-full flex-1 min-h-[300px] lg:min-h-0" id="three-canvas-root" />

      {/* FLOAT TOOLTIP OVER HOVERED NODES */}
      <div className="absolute bottom-3 left-3 right-3 z-10 pointer-events-none">
        {hoveredNode ? (
          <div className="bg-slate-900/95 border border-slate-700 p-3 rounded-lg shadow-2xl flex items-center justify-between pointer-events-auto max-w-md mx-auto backdrop-blur">
            <div className="min-w-0 pr-3">
              <span className="text-[10px] text-slate-500 block font-mono">FILE INTERACTION GLOW</span>
              <span className="text-xs font-mono font-bold text-slate-100 truncate block">
                {hoveredNode.path}
              </span>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs text-cyan-400 font-mono font-bold">
                {hoveredNode.size ? `${hoveredNode.size} LOC` : "Directory Link"}
              </span>
              <span className="text-[9px] block text-slate-500">Click to Inspect Code</span>
            </div>
          </div>
        ) : (
          <div className="text-center text-[10px] text-slate-600 font-mono pointer-events-none">
            Hover clusters to identify directories. Click files to inspect code on right panel.
          </div>
        )}
      </div>

    </div>
  );
}
