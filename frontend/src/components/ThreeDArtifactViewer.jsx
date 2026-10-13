import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Eye, RotateCw, Sparkles, Layers, Box } from 'lucide-react';
import AkatsukiCloud from '../assets/AkatsukiCloud';

export const ThreeDArtifactViewer = () => {
  const mountRef = useRef(null);
  const [wireframe, setWireframe] = useState(false);
  const [colorScheme, setColorScheme] = useState('crimson'); // 'crimson' | 'rinnegan' | 'gold'
  const [rotationSpeed, setRotationSpeed] = useState(1);
  const sceneElementsRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.z = 7;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 2. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xff1744, 4, 30);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    const backLight = new THREE.PointLight(0x7928ca, 3, 30);
    backLight.position.set(-5, -5, -3);
    scene.add(backLight);

    // 3. 3D Model: Multi-Ring Rinnegan / Tsukuyomi Geosphere
    const group = new THREE.Group();
    scene.add(group);

    // Outer Geodesic Sphere
    const sphereGeom = new THREE.IcosahedronGeometry(2, 2);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: 0xff1744,
      metalness: 0.85,
      roughness: 0.2,
      emissive: 0x4a000c,
      emissiveIntensity: 0.4,
      wireframe: wireframe,
    });
    const sphereMesh = new THREE.Mesh(sphereGeom, sphereMat);
    group.add(sphereMesh);

    // Concentric Orbit Rings
    const ringGroup = new THREE.Group();
    group.add(ringGroup);

    const rings = [];
    for (let i = 0; i < 4; i++) {
      const ringGeom = new THREE.TorusGeometry(2.3 + i * 0.4, 0.05, 16, 64);
      const ringMat = new THREE.MeshStandardMaterial({
        color: 0xff4d6d,
        metalness: 0.9,
        roughness: 0.1,
      });
      const ringMesh = new THREE.Mesh(ringGeom, ringMat);
      ringMesh.rotation.x = Math.PI / (2 + i * 0.5);
      ringMesh.rotation.y = Math.PI / (3 + i * 0.3);
      ringGroup.add(ringMesh);
      rings.push(ringMesh);
    }

    // 4. Interactive Drag-to-Rotate
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const onMouseDown = (e) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;

      group.rotation.y += deltaX * 0.008;
      group.rotation.x += deltaY * 0.008;

      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // Save references for controls
    sceneElementsRef.current = {
      sphereMat,
      group,
      rings,
      pointLight,
    };

    // Render Loop
    let animId;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (!isDragging) {
        group.rotation.y += 0.006 * rotationSpeed;
        group.rotation.x += 0.002 * rotationSpeed;
      }
      ringGroup.rotation.z += 0.01 * rotationSpeed;
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('resize', handleResize);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Sync Wireframe
  useEffect(() => {
    if (sceneElementsRef.current?.sphereMat) {
      sceneElementsRef.current.sphereMat.wireframe = wireframe;
    }
  }, [wireframe]);

  // Sync Color Scheme
  useEffect(() => {
    if (!sceneElementsRef.current?.sphereMat) return;
    const { sphereMat, pointLight, rings } = sceneElementsRef.current;

    if (colorScheme === 'crimson') {
      sphereMat.color.setHex(0xff1744);
      sphereMat.emissive.setHex(0x4a000c);
      pointLight.color.setHex(0xff1744);
      rings.forEach((r) => r.material.color.setHex(0xff4d6d));
    } else if (colorScheme === 'rinnegan') {
      sphereMat.color.setHex(0x8a2be2);
      sphereMat.emissive.setHex(0x32004f);
      pointLight.color.setHex(0xa855f7);
      rings.forEach((r) => r.material.color.setHex(0xc084fc));
    } else if (colorScheme === 'gold') {
      sphereMat.color.setHex(0xffaa00);
      sphereMat.emissive.setHex(0x4a3200);
      pointLight.color.setHex(0xfbbf24);
      rings.forEach((r) => r.material.color.setHex(0xfde047));
    }
  }, [colorScheme]);

  return (
    <div className="relative rounded-3xl bg-zinc-950/80 border border-red-950/70 p-6 shadow-[0_0_50px_rgba(229,9,20,0.2)] backdrop-blur-md overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-2.5">
          <AkatsukiCloud size={24} />
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <span>Interactive 3D Chakra Matrix</span>
              <span className="text-[10px] text-red-500 font-bold px-1.5 py-0.5 rounded bg-red-950/80 border border-red-800">
                WEBGL 3D
              </span>
            </h3>
            <p className="text-[11px] text-zinc-400">
              Drag with mouse to inspect 360° geometry • Real-time shader rendering
            </p>
          </div>
        </div>

        {/* 3D Controls */}
        <div className="flex items-center gap-2">
          {/* Wireframe Toggle */}
          <button
            type="button"
            onClick={() => setWireframe(!wireframe)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors flex items-center gap-1 ${
              wireframe
                ? 'bg-red-600 text-white border-red-500'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
            }`}
          >
            <Box className="w-3 h-3" />
            <span>Wireframe</span>
          </button>

          {/* Color Schemes */}
          <div className="flex items-center gap-1 bg-black/60 p-1 rounded-lg border border-zinc-800">
            <button
              onClick={() => setColorScheme('crimson')}
              className={`w-4 h-4 rounded-full bg-red-600 border ${
                colorScheme === 'crimson' ? 'border-white scale-110 shadow-sm' : 'border-transparent opacity-60'
              }`}
              title="Crimson Tsukuyomi"
            />
            <button
              onClick={() => setColorScheme('rinnegan')}
              className={`w-4 h-4 rounded-full bg-purple-600 border ${
                colorScheme === 'rinnegan' ? 'border-white scale-110 shadow-sm' : 'border-transparent opacity-60'
              }`}
              title="Purple Rinnegan"
            />
            <button
              onClick={() => setColorScheme('gold')}
              className={`w-4 h-4 rounded-full bg-amber-500 border ${
                colorScheme === 'gold' ? 'border-white scale-110 shadow-sm' : 'border-transparent opacity-60'
              }`}
              title="Golden Chakra"
            />
          </div>
        </div>
      </div>

      {/* 3D WebGL Canvas Container */}
      <div
        ref={mountRef}
        className="w-full h-64 sm:h-72 cursor-grab active:cursor-grabbing rounded-2xl overflow-hidden relative"
      >
        <div className="absolute bottom-2 right-3 pointer-events-none text-[9px] font-mono text-zinc-500 flex items-center gap-1.5">
          <RotateCw className="w-2.5 h-2.5 animate-spin text-red-500" />
          <span>DRAG 3D TO ROTATE</span>
        </div>
      </div>
    </div>
  );
};

export default ThreeDArtifactViewer;
