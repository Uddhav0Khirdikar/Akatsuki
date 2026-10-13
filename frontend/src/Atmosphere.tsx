import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';

const cloudPath = 'M33 84C10 84 3 67 12 53c7-12 20-13 28-10C30 20 52 4 72 9c13 2 21 12 20 24 14-21 49-20 63-2 7 10 8 23 2 33 20-7 49 3 54 19 6 20-11 34-30 31-17-2-26-11-30-22-12 20-32 31-56 29-27-2-36-17-55-15-19 3-35-4-39-16 12 10 29 7 32-6Z';

export default function Atmosphere({ active }: { active: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    } catch {
      return; // The illustration and CSS lighting remain complete without WebGL.
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    element.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
    camera.position.z = 7;
    scene.add(new THREE.AmbientLight(0xa0a7cc, 1));
    const key = new THREE.DirectionalLight(0xf1e9ff, 3);
    key.position.set(-3, 4, 5);
    scene.add(key);
    const rim = new THREE.PointLight(0xff2449, 20, 12);
    rim.position.set(2, 0, 3);
    scene.add(rim);
    const fill = new THREE.PointLight(0x91a2ff, 9, 12);
    fill.position.set(-2, -2, 2);
    scene.add(fill);

    const emblem = new THREE.Group();
    const metal = new THREE.MeshStandardMaterial({ color: 0x33313c, metalness: .88, roughness: .27 });
    const edge = new THREE.MeshStandardMaterial({ color: 0x8b7b83, metalness: .95, roughness: .24 });
    const ruby = new THREE.MeshStandardMaterial({ color: 0xb51c38, metalness: .7, roughness: .32, emissive: 0x8a1028, emissiveIntensity: .07 });
    const disk = new THREE.Mesh(new THREE.CylinderGeometry(.58, .58, .1, 64), metal);
    disk.rotation.x = Math.PI / 2;
    emblem.add(disk);
    const outer = new THREE.Mesh(new THREE.TorusGeometry(.56, .022, 12, 96), edge);
    outer.position.z = .075;
    emblem.add(outer);
    const inner = new THREE.Mesh(new THREE.TorusGeometry(.48, .008, 8, 96), ruby);
    inner.position.z = .062;
    emblem.add(inner);
    const paths = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${cloudPath}"/></svg>`).paths;
    for (const svgPath of paths) {
      for (const shape of SVGLoader.createShapes(svgPath)) {
        const geometry = new THREE.ExtrudeGeometry(shape, { depth: 6, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 2, bevelThickness: 2, curveSegments: 24 });
        geometry.center();
        const mesh = new THREE.Mesh(geometry, ruby);
        mesh.scale.set(.0037, -.0037, .0037);
        mesh.position.z = .08;
        emblem.add(mesh);
      }
    }
    for (let i = 0; i < 32; i++) {
      const tick = new THREE.Mesh(new THREE.BoxGeometry(.008, .025, .012), edge);
      const angle = i / 32 * Math.PI * 2;
      tick.position.set(Math.sin(angle) * .523, Math.cos(angle) * .523, .07);
      tick.rotation.z = -angle;
      emblem.add(tick);
    }
    emblem.position.set(1.55, -.48, .4);
    emblem.rotation.set(.22, -.5, -.19);
    emblem.scale.setScalar(.72);
    scene.add(emblem);

    const petal = new THREE.Shape();
    petal.moveTo(0, -.16);
    petal.bezierCurveTo(-.12, -.02, -.1, .1, 0, .17);
    petal.bezierCurveTo(.14, .07, .07, -.06, 0, -.16);
    const petalGeometry = new THREE.ShapeGeometry(petal, 8);
    const petalMaterial = new THREE.MeshStandardMaterial({ color: 0xb71839, emissive: 0x510916, emissiveIntensity: .3, roughness: .6, metalness: .2, side: THREE.DoubleSide, transparent: true, opacity: .76 });
    const petals = Array.from({ length: 30 }, (_, i) => {
      const mesh = new THREE.Mesh(petalGeometry, petalMaterial);
      const seed = Math.sin(i * 84.3 + 7) * 1000;
      const random = seed - Math.floor(seed);
      mesh.position.set((random - .5) * 14, ((i * .71) % 6) - 3, (random - .5) * 4);
      mesh.scale.setScalar(.23 + random * .65);
      mesh.rotation.set(i, i * .4, i * .8);
      scene.add(mesh);
      return { mesh, speed: .09 + random * .12, phase: i * 1.7 };
    });
    const pointsGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(140 * 3);
    for (let i = 0; i < positions.length; i++) positions[i] = Math.sin(i * 15.713) * (i % 3 === 2 ? 3 : 7);
    pointsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const sparks = new THREE.Points(pointsGeometry, new THREE.PointsMaterial({ color: 0xf3788a, size: .017, transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false }));
    scene.add(sparks);

    let frame = 0;
    let elapsed = 0;
    let previous = performance.now();
    let pointerX = 0;
    let pointerY = 0;
    let compact = false;
    const render = () => {
      const now = performance.now();
      const delta = Math.min((now - previous) / 1000, .05);
      previous = now;
      if (active) elapsed += delta;
      emblem.rotation.y = -.4 + Math.sin(elapsed * .34) * .2 + pointerX * .1;
      emblem.rotation.x = .18 + Math.cos(elapsed * .24) * .1 + pointerY * .06;
      emblem.position.y = (compact ? .9 : -.48) + Math.sin(elapsed * .7) * .08;
      for (const { mesh, speed, phase } of petals) {
        if (active) {
          mesh.position.y -= delta * speed;
          mesh.position.x += Math.sin(elapsed * .3 + phase) * delta * .09;
          mesh.rotation.x += delta * .25;
          mesh.rotation.y += delta * .32;
          if (mesh.position.y < -3.2) mesh.position.y = 3.2;
        }
      }
      sparks.rotation.y = elapsed * .009;
      renderer.render(scene, camera);
      if (active && !document.hidden) frame = requestAnimationFrame(render);
    };
    const resize = () => {
      const { width, height } = element.getBoundingClientRect();
      if (!width || !height) return;
      camera.aspect = width / height;
      compact = width < 600;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      emblem.position.x = compact ? 0 : Math.min(0.65, camera.aspect * 0.45);
      emblem.position.y = compact ? .85 : -.42;
      emblem.scale.setScalar(compact ? .42 : .65);
      if (!active) renderer.render(scene, camera);
    };
    const pointer = (event: PointerEvent) => {
      if (!active || event.pointerType === 'touch') return;
      pointerX = event.clientX / window.innerWidth - .5;
      pointerY = event.clientY / window.innerHeight - .5;
    };
    const visibility = () => {
      cancelAnimationFrame(frame);
      previous = performance.now();
      if (!document.hidden) render();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    window.addEventListener('pointermove', pointer, { passive: true });
    document.addEventListener('visibilitychange', visibility);
    resize();
    render();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('pointermove', pointer);
      document.removeEventListener('visibilitychange', visibility);
      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      scene.traverse(object => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
          geometries.add(object.geometry);
          const values = Array.isArray(object.material) ? object.material : [object.material];
          values.forEach(material => materials.add(material));
        }
      });
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(material => material.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [active]);
  return <div className="three-atmosphere" ref={host} aria-hidden="true" />;
}
