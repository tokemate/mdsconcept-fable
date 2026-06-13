/* MDS Concept — Three.js illatköd a hero szekcióban.
   Lassan felfelé gomolygó, arany partikula-pára; egér-parallaxe,
   görgetésre elhalványul. Mobilon kevesebb partikula, alacsonyabb DPR. */

import * as THREE from '../vendor/three.module.min.js';

const stub = { setPointer() {}, setProgress() {}, destroy() {} };

export function createScene(canvas) {
  if (!canvas) return stub;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      powerPreference: 'low-power',
    });
  } catch (e) {
    canvas.style.display = 'none';
    return stub;
  }

  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 60);
  camera.position.set(0, 0.4, 7);

  /* --- Partikula-geometria --- */
  const COUNT = isMobile ? 850 : 2000;
  const Y_MIN = -5.5, Y_RANGE = 13;

  const positions = new Float32Array(COUNT * 3);
  const rand = new Float32Array(COUNT * 3);
  const scale = new Float32Array(COUNT);

  for (let i = 0; i < COUNT; i++) {
    positions[i * 3 + 0] = (Math.random() - 0.5) * 17;
    positions[i * 3 + 1] = Y_MIN + Math.random() * Y_RANGE;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 7;
    rand[i * 3 + 0] = Math.random();
    rand[i * 3 + 1] = Math.random();
    rand[i * 3 + 2] = Math.random();
    // többségében apró szemcse, ~7% nagy, puha "bokeh" folt
    scale[i] = Math.random() < 0.07 ? 3 + Math.random() * 4.5 : 0.35 + Math.random() * 1.1;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aRand', new THREE.BufferAttribute(rand, 3));
  geo.setAttribute('aScale', new THREE.BufferAttribute(scale, 1));

  const uniforms = {
    uTime: { value: 0 },
    uOpacity: { value: 0 },
    uPR: { value: dpr },
  };

  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute vec3 aRand;
      attribute float aScale;
      uniform float uTime;
      uniform float uPR;
      varying float vAlpha;
      varying vec3 vRand;
      varying float vScale;

      void main() {
        vec3 p = position;
        float speed = 0.22 * (0.4 + aRand.y);
        // felfelé gomolygás, hurkolva a sávon belül
        p.y = mod(p.y + uTime * speed - (${Y_MIN.toFixed(1)}), ${Y_RANGE.toFixed(1)}) + (${Y_MIN.toFixed(1)});
        p.x += sin(uTime * 0.14 * (0.5 + aRand.x) + aRand.z * 6.2831) * 0.85;
        p.z += cos(uTime * 0.11 * (0.5 + aRand.z) + aRand.x * 6.2831) * 0.6;

        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aScale * uPR * 34.0 / max(0.001, -mv.z);

        float edge = smoothstep(${Y_MIN.toFixed(1)}, ${(Y_MIN + 1.8).toFixed(1)}, p.y)
                   * (1.0 - smoothstep(${(Y_MIN + Y_RANGE - 1.8).toFixed(1)}, ${(Y_MIN + Y_RANGE).toFixed(1)}, p.y));
        vAlpha = edge;
        vRand = aRand;
        vScale = aScale;
      }
    `,
    fragmentShader: /* glsl */ `
      precision mediump float;
      uniform float uOpacity;
      varying float vAlpha;
      varying vec3 vRand;
      varying float vScale;

      void main() {
        float d = length(gl_PointCoord - 0.5);
        float disc = smoothstep(0.5, 0.04, d);
        // nagy foltok nagyon halványak, apró szemcsék fényesebbek
        float base = mix(0.38, 0.05, smoothstep(1.5, 3.2, vScale));
        vec3 gold = vec3(0.83, 0.66, 0.42);
        vec3 cream = vec3(0.97, 0.91, 0.78);
        vec3 col = mix(gold, cream, vRand.z * 0.7);
        float a = disc * disc * base * vAlpha * uOpacity;
        gl_FragColor = vec4(col, a);
      }
    `,
  });

  const points = new THREE.Points(geo, mat);
  scene.add(points);

  /* --- Állapot --- */
  const clock = new THREE.Clock();
  let elapsed = 0;
  let progress = 0;            // hero scroll-progress (0..1)
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let running = false;
  let rafId = 0;
  let inView = true;

  function resize() {
    const w = canvas.clientWidth || canvas.parentElement.clientWidth;
    const h = canvas.clientHeight || canvas.parentElement.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function frame() {
    rafId = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    elapsed += dt;

    // lágy egér-parallaxe
    pointer.x += (pointer.tx - pointer.x) * 0.035;
    pointer.y += (pointer.ty - pointer.y) * 0.035;
    camera.position.x = pointer.x * 0.55;
    camera.position.y = 0.4 + pointer.y * 0.3 + progress * 1.6;
    camera.lookAt(0, 0.4 + progress * 1.6, 0);

    uniforms.uTime.value = elapsed;
    const fadeIn = Math.min(1, elapsed / 2.4);
    uniforms.uOpacity.value = fadeIn * (1 - progress);

    renderer.render(scene, camera);
  }

  function setRunning(on) {
    if (on && !running) { running = true; clock.getDelta(); frame(); }
    if (!on && running) { running = false; cancelAnimationFrame(rafId); }
  }

  resize();
  window.addEventListener('resize', resize);
  setRunning(true);

  // ha a hero kikerül a képből vagy a fül háttérbe kerül: állj
  const io = new IntersectionObserver(
    (entries) => { inView = entries[0].isIntersecting; setRunning(inView && !document.hidden); },
    { threshold: 0 }
  );
  io.observe(canvas);
  document.addEventListener('visibilitychange', () => setRunning(inView && !document.hidden));

  return {
    setPointer(nx, ny) { pointer.tx = nx; pointer.ty = ny; },
    setProgress(p) { progress = Math.min(1, Math.max(0, p)); },
    destroy() {
      setRunning(false);
      io.disconnect();
      window.removeEventListener('resize', resize);
      geo.dispose(); mat.dispose(); renderer.dispose();
    },
  };
}
