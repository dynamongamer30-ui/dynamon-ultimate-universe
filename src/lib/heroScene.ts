import { ACESFilmicToneMapping, SRGBColorSpace } from "three/src/constants.js";
import { PerspectiveCamera } from "three/src/cameras/PerspectiveCamera.js";
import { IcosahedronGeometry } from "three/src/geometries/IcosahedronGeometry.js";
import { AmbientLight } from "three/src/lights/AmbientLight.js";
import { DirectionalLight } from "three/src/lights/DirectionalLight.js";
import { PointLight } from "three/src/lights/PointLight.js";
import { MeshStandardMaterial } from "three/src/materials/MeshStandardMaterial.js";
import { Mesh } from "three/src/objects/Mesh.js";
import { Group } from "three/src/objects/Group.js";
import { Scene } from "three/src/scenes/Scene.js";
import { WebGLRenderer } from "three/src/renderers/WebGLRenderer.js";

export type HeroSceneController = { dispose: () => void };

export function createHeroScene(canvas: HTMLCanvasElement, host: HTMLElement): HeroSceneController {
  const renderer = new WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false,
    powerPreference: "low-power",
    preserveDrawingBuffer: false,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new Scene();
  const camera = new PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 0, 4.1);

  const group = new Group();
  const geometry = new IcosahedronGeometry(1.08, 2);
  const material = new MeshStandardMaterial({
    color: 0x7d4dff,
    emissive: 0x210b52,
    emissiveIntensity: 0.72,
    metalness: 0.22,
    roughness: 0.34,
  });
  group.add(new Mesh(geometry, material));
  scene.add(group);

  scene.add(new AmbientLight(0x8066ff, 1.35));
  const keyLight = new DirectionalLight(0xffd8f7, 2.3);
  keyLight.position.set(2.8, 3.2, 4);
  scene.add(keyLight);
  const rimLight = new PointLight(0x3d8dff, 12, 8, 2);
  rimLight.position.set(-2.8, -1.2, 2.6);
  scene.add(rimLight);

  let disposed = false;
  let animationFrame = 0;
  let visible = true;
  let documentVisible = document.visibilityState === "visible";
  let lastFrame = performance.now();
  let targetParallaxX = 0;
  let targetParallaxY = 0;
  let currentParallaxX = 0;
  let currentParallaxY = 0;

  const resize = () => {
    const rect = host.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  resize();

  const onPointerMove = (event: PointerEvent) => {
    targetParallaxX = Math.max(-0.06, Math.min(0.06, ((event.clientX / window.innerWidth) - 0.5) * 0.12));
    targetParallaxY = Math.max(-0.06, Math.min(0.06, ((event.clientY / window.innerHeight) - 0.5) * -0.12));
  };
  const onPointerLeave = () => {
    targetParallaxX = 0;
    targetParallaxY = 0;
  };
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("blur", onPointerLeave, { passive: true });

  const stopLoop = () => {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    }
  };
  const renderFrame = (now: number) => {
    animationFrame = 0;
    if (disposed || !visible || !documentVisible) return;
    const delta = Math.min(Math.max((now - lastFrame) / 1000, 0), 0.05);
    lastFrame = now;
    group.rotation.y += delta * 0.15;
    group.rotation.x += delta * 0.035;
    currentParallaxX += (targetParallaxX - currentParallaxX) * 0.08;
    currentParallaxY += (targetParallaxY - currentParallaxY) * 0.08;
    group.rotation.y += currentParallaxX * 0.012;
    group.rotation.x += currentParallaxY * 0.012;
    group.position.x += (currentParallaxX * 0.35 - group.position.x) * 0.08;
    group.position.y += (currentParallaxY * 0.35 - group.position.y) * 0.08;
    renderer.render(scene, camera);
    animationFrame = requestAnimationFrame(renderFrame);
  };
  const startLoop = () => {
    if (!animationFrame && visible && documentVisible) {
      lastFrame = performance.now();
      animationFrame = requestAnimationFrame(renderFrame);
    }
  };

  const visibilityObserver = new IntersectionObserver(([entry]) => {
    visible = Boolean(entry?.isIntersecting);
    if (visible) startLoop();
    else stopLoop();
  }, { rootMargin: "160px 0px" });
  visibilityObserver.observe(host);

  const onVisibilityChange = () => {
    documentVisible = document.visibilityState === "visible";
    if (documentVisible) startLoop();
    else stopLoop();
  };
  document.addEventListener("visibilitychange", onVisibilityChange, { passive: true });

  let resizeObserver: ResizeObserver | undefined;
  if (typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
  } else {
    window.addEventListener("resize", resize, { passive: true });
  }
  startLoop();

  return {
    dispose: () => {
      if (disposed) return;
      disposed = true;
      stopLoop();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("blur", onPointerLeave);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      visibilityObserver.disconnect();
      resizeObserver?.disconnect();
      if (!resizeObserver) window.removeEventListener("resize", resize);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}
