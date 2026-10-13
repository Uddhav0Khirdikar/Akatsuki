import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export const Akatsuki3DScene = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x060308, 0.035);

    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 24;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    currentMount.appendChild(renderer.domElement);

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight(0x2a0812, 1.5);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xff1744, 3.5, 50);
    pointLight.position.set(0, 0, 15);
    scene.add(pointLight);

    const blueRimLight = new THREE.PointLight(0x6b11ff, 1.8, 40);
    blueRimLight.position.set(-15, 10, -5);
    scene.add(blueRimLight);

    // 3. 3D Particle Cloud: Rising Crimson Embers
    const particleCount = 1200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const scales = new Float32Array(particleCount);
    const colors = new Float32Array(particleCount * 3);

    const colorChoices = [
      new THREE.Color(0xff2233), // Crimson
      new THREE.Color(0xd5001c), // Blood red
      new THREE.Color(0xff6b81), // Sakura glow
      new THREE.Color(0x7a0010), // Deep ruby
    ];

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 60;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
      scales[i] = Math.random() * 2 + 0.5;

      const c = colorChoices[Math.floor(Math.random() * colorChoices.length)];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Particle Shader / Material
    const particleMaterial = new THREE.PointsMaterial({
      size: 0.28,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(geometry, particleMaterial);
    scene.add(particles);

    // 4. 3D Orbiting Akatsuki Ring Toruses
    const ringsGroup = new THREE.Group();
    scene.add(ringsGroup);

    const ringCount = 5;
    const ringMeshes = [];

    for (let i = 0; i < ringCount; i++) {
      const radius = 2.5 + i * 2.2;
      const tube = 0.08 + (i % 2 === 0 ? 0.04 : 0.01);
      const ringGeom = new THREE.TorusGeometry(radius, tube, 16, 100);
      const ringMat = new THREE.MeshStandardMaterial({
        color: i % 2 === 0 ? 0xff2233 : 0xaa0022,
        roughness: 0.2,
        metalness: 0.85,
        emissive: 0x550011,
        emissiveIntensity: 0.35,
        wireframe: i % 2 === 1,
      });

      const ringMesh = new THREE.Mesh(ringGeom, ringMat);
      ringMesh.rotation.x = Math.PI * (0.2 + i * 0.15);
      ringMesh.rotation.y = Math.PI * (0.1 + i * 0.2);
      ringsGroup.add(ringMesh);
      ringMeshes.push(ringMesh);
    }

    // 5. Central 3D Chakra Core (Glowing Icosahedron / Akatsuki seal)
    const coreGeom = new THREE.IcosahedronGeometry(2.4, 1);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xff1744,
      wireframe: true,
      emissive: 0xdd0022,
      emissiveIntensity: 0.6,
      roughness: 0.1,
      metalness: 0.9,
    });
    const coreMesh = new THREE.Mesh(coreGeom, coreMat);
    coreMesh.position.set(0, 0, 0);
    scene.add(coreMesh);

    // Inner Core Sphere
    const innerGeom = new THREE.SphereGeometry(1.5, 32, 32);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x8b0000,
      wireframe: false,
    });
    const innerMesh = new THREE.Mesh(innerGeom, innerMat);
    coreMesh.add(innerMesh);

    // 6. Mouse Interaction & Camera Parallax
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (event) => {
      mouseX = (event.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (event.clientY / window.innerHeight - 0.5) * 2;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Handle Resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    // 7. Animation Loop
    let animationFrameId;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Smooth camera interpolation
      targetX += (mouseX - targetX) * 0.05;
      targetY += (mouseY - targetY) * 0.05;

      camera.position.x = targetX * 4;
      camera.position.y = -targetY * 3;
      camera.lookAt(scene.position);

      // Move point light with mouse
      pointLight.position.x = targetX * 12;
      pointLight.position.y = -targetY * 10;

      // Rotate central core
      coreMesh.rotation.x = elapsedTime * 0.25;
      coreMesh.rotation.y = elapsedTime * 0.4;
      coreMesh.scale.setScalar(1 + Math.sin(elapsedTime * 2) * 0.05);

      // Rotate rings with variable frequencies
      ringMeshes.forEach((rm, idx) => {
        rm.rotation.z = elapsedTime * (0.15 + idx * 0.08);
        rm.rotation.x += 0.002 * (idx + 1);
      });

      // Slowly float particles upwards
      const posAttr = particles.geometry.attributes.position;
      for (let i = 0; i < particleCount; i++) {
        let y = posAttr.getY(i);
        y += 0.04;
        if (y > 25) y = -25;
        posAttr.setY(i, y);
      }
      posAttr.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (currentMount && renderer.domElement) {
        currentMount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
      style={{ opacity: 0.65 }}
    />
  );
};

export default Akatsuki3DScene;
