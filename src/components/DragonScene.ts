import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export type DragonMotion = "Idle" | "Fly Flap" | "Fly Hover" | "Roar";
export interface DragonController {
  pause(value: boolean): void;
  motion(value: DragonMotion): void;
  rotate(delta: number): void;
  reset(): void;
  dispose(): void;
}

/** Isolated, lazy-loaded renderer. No auth, application state or network side effects. */
export function createDragonScene(
  host: HTMLDivElement,
  reduced: boolean,
  onReady: () => void,
  onError: () => void,
): DragonController {
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 640 ? 1.25 : 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute("aria-label", "Animated three-dimensional shadow dragon");
  renderer.domElement.setAttribute("role", "img");
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(33, 1, 0.1, 80);
  const rig = new THREE.Group();
  scene.add(rig);
  scene.add(new THREE.HemisphereLight(0xd5e3ff, 0x171321, 2.7));
  const key = new THREE.DirectionalLight(0xe9efff, 4.2);
  key.position.set(-5, 7, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 0.1, far: 25 });
  key.shadow.bias = -0.0008;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xc7c1e5, 3.5);
  rim.position.set(4, 3, -4);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0xc6dcff, 1.8);
  fill.position.set(2, 1, 6);
  scene.add(fill);

  const stage = new THREE.Mesh(
    new THREE.CylinderGeometry(3.5, 3.7, 0.16, 80),
    new THREE.MeshStandardMaterial({ color: 0x11131a, metalness: 0.5, roughness: 0.6 }),
  );
  stage.position.y = -0.16;
  stage.receiveShadow = true;
  scene.add(stage);
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(3.55, 0.012, 6, 100),
    new THREE.MeshBasicMaterial({ color: 0x82749d, transparent: true, opacity: 0.55 }),
  );
  halo.rotation.x = Math.PI / 2;
  halo.position.y = -0.065;
  scene.add(halo);

  // Quiet shadow motes; deterministic positions avoid hydration/random layout differences.
  const positions = new Float32Array(96 * 3);
  for (let i = 0; i < 96; i++) {
    const angle = i * 2.39996;
    const radius = 2.7 + (i % 11) * 0.13;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = (i % 17) * 0.18;
    positions[i * 3 + 2] = Math.sin(angle) * radius;
  }
  const particlesGeometry = new THREE.BufferGeometry();
  particlesGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const particles = new THREE.Points(
    particlesGeometry,
    new THREE.PointsMaterial({
      color: 0xbcb2de,
      size: 0.025,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    }),
  );
  scene.add(particles);

  let dead = false;
  let paused = reduced;
  let visible = true;
  let loaded = false;
  let frame = 0;
  let previous = 0;
  let mixer: THREE.AnimationMixer | undefined;
  let action: THREE.AnimationAction | undefined;
  let clips: THREE.AnimationClip[] = [];
  let dragon: THREE.Group | undefined;
  let desiredMotion: DragonMotion = "Fly Hover";
  let angle = -0.55;
  let targetAngle = angle;

  const resize = () => {
    if (dead) return;
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // Frame the complete wingspan on portrait phones as well as desktop.
    const distance = Math.max(11.5, 9 / camera.aspect);
    camera.position.set(0, 4.4, distance);
    camera.lookAt(0, 0.4, 0);
    camera.updateProjectionMatrix();
    renderOnce();
  };
  const renderOnce = () => {
    if (!dead) renderer.render(scene, camera);
  };
  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    previous = 0;
  };
  const tick = (now: number) => {
    frame = 0;
    if (dead || !visible || document.hidden) return;
    const delta = previous ? Math.min((now - previous) / 1000, 0.05) : 0;
    previous = now;
    angle += (targetAngle - angle) * 0.12;
    rig.rotation.y = angle;
    if (!paused) {
      mixer?.update(delta);
      particles.rotation.y += delta * 0.035;
    }
    renderOnce();
    if ((!paused && loaded) || Math.abs(targetAngle - angle) > 0.001)
      frame = requestAnimationFrame(tick);
    else previous = 0;
  };
  const wake = () => {
    if (!dead && visible && !document.hidden && !frame) frame = requestAnimationFrame(tick);
  };
  const setMotion = (name: DragonMotion) => {
    desiredMotion = name;
    const clip = clips.find((c) => c.name === name);
    if (!clip || !mixer) return;
    const next = mixer.clipAction(clip);
    if (next !== action) {
      action?.fadeOut(reduced ? 0 : 0.35);
      next
        .reset()
        .fadeIn(reduced ? 0 : 0.35)
        .play();
      action = next;
    }
    mixer.update(0);
    renderOnce();
    wake();
  };
  const observer = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      if (visible) wake();
      else stop();
    },
    { rootMargin: "80px" },
  );
  observer.observe(host);
  const sizing = new ResizeObserver(resize);
  sizing.observe(host);
  const visibility = () => {
    if (document.hidden) stop();
    else wake();
  };
  document.addEventListener("visibilitychange", visibility);
  const contextLost = (event: Event) => {
    event.preventDefault();
    stop();
    if (!dead) onError();
  };
  renderer.domElement.addEventListener("webglcontextlost", contextLost);

  const disposeObject = (object: THREE.Object3D) => {
    object.traverse((item) => {
      const mesh = item as THREE.Mesh;
      mesh.geometry?.dispose();
      if (!mesh.material) return;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) {
        for (const value of Object.values(material)) {
          if (value instanceof THREE.Texture) {
            value.dispose();
            if (value.image instanceof ImageBitmap) value.image.close();
          }
        }
        material.dispose();
      }
    });
  };
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), 25000);
  fetch("/models/shadow-dragon.glb", { signal: abort.signal })
    .then((response) => {
      if (!response.ok) throw new Error("Dragon unavailable");
      return response.arrayBuffer();
    })
    .then((buffer) => new GLTFLoader().parseAsync(buffer, "/models/"))
    .then((gltf) => {
      clearTimeout(timeout);
      if (dead) {
        disposeObject(gltf.scene);
        return;
      }
      dragon = gltf.scene;
      dragon.traverse((item) => {
        const mesh = item as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        // Animation bounds vary significantly with wings and tail; never cull a skinned wing.
        mesh.frustumCulled = false;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const original of materials) {
          const material = original as THREE.MeshStandardMaterial;
          if (!material.isMeshStandardMaterial) continue;
          // Retain the sculpted texture detail, tint the original to obsidian.
          material.color.set(0xc5cbd5);
          material.onBeforeCompile = (shader) => {
            shader.fragmentShader = shader.fragmentShader.replace(
              "#include <map_fragment>",
              "#include <map_fragment>\n float stone = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722)); diffuseColor.rgb = vec3(stone) * vec3(0.57, 0.61, 0.69);",
            );
          };
          material.metalness = 0.48;
          material.roughness = 0.52;
          material.emissive.set(0x0b0813);
          material.emissiveIntensity = 0.22;
        }
      });
      rig.add(dragon);
      clips = gltf.animations;
      mixer = new THREE.AnimationMixer(dragon);
      setMotion(desiredMotion);
      mixer.update(0.01);
      dragon.updateMatrixWorld(true);
      dragon.traverse((item) => {
        if (item instanceof THREE.SkinnedMesh) {
          item.skeleton.update();
          item.computeBoundingBox();
        }
      });
      const bounds = new THREE.Box3().setFromObject(dragon);
      const size = bounds.getSize(new THREE.Vector3());
      const scale = 12 / Math.max(size.x, size.z, size.y);
      const center = bounds.getCenter(new THREE.Vector3());
      dragon.scale.setScalar(scale);
      dragon.position.set(-center.x * scale, -bounds.min.y * scale + 0.02, -center.z * scale);
      rig.rotation.y = angle;
      loaded = true;
      resize();
      onReady();
      wake();
    })
    .catch(() => {
      clearTimeout(timeout);
      if (!dead) onError();
    });
  resize();
  return {
    pause(value) {
      paused = value;
      stop();
      wake();
    },
    motion: setMotion,
    rotate(delta) {
      targetAngle += delta;
      wake();
    },
    reset() {
      targetAngle = -0.55;
      setMotion("Fly Hover");
      wake();
    },
    dispose() {
      dead = true;
      abort.abort();
      clearTimeout(timeout);
      stop();
      observer.disconnect();
      sizing.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      renderer.domElement.removeEventListener("webglcontextlost", contextLost);
      mixer?.stopAllAction();
      if (dragon) mixer?.uncacheRoot(dragon);
      disposeObject(scene);
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
