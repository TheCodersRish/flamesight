import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

// FlameSight flame engine.
// gravity 0 = microgravity (round, blue, slow) → 1 = Earth (tall yellow/orange teardrop, flickering)
// o2 0..1 = brighter / bigger · flow 0..1 = stretched downstream (to the right) · dilution 0..1 = CO₂/He dims it
export interface FlameProps { gravity: number; o2: number; flow: number; dilution: number; className?: string; label?: string; paused?: boolean }

const vert = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const frag = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uTime, uGravity, uO2, uFlow, uDilute;
uniform vec2 uRes;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }

vec3 fireRamp(float t) {
  // t: 0 edge → 1 core
  vec3 c = mix(vec3(0.55, 0.05, 0.0), vec3(1.0, 0.35, 0.02), smoothstep(0.0, 0.35, t));
  c = mix(c, vec3(1.0, 0.72, 0.18), smoothstep(0.3, 0.65, t));
  c = mix(c, vec3(1.0, 0.95, 0.75), smoothstep(0.65, 1.0, t));
  return c;
}

void main() {
  float aspect = uRes.x / uRes.y;
  vec2 uv = (vUv - 0.5) * vec2(aspect, 1.0);
  float g = clamp(uGravity, 0.0, 1.0);
  float o2 = clamp(uO2, 0.0, 1.0);
  float fl = clamp(uFlow, 0.0, 1.0);
  float dil = clamp(uDilute, 0.0, 1.0);
  float speed = mix(0.35, 2.4, g);
  float t = uTime * speed;

  float size = mix(0.13, 0.24, o2) * mix(1.0, 0.72, dil);
  vec2 base = vec2(-0.10 * fl, -0.22 * g);       // fuel source position
  vec2 p = uv - base;

  // airflow (+x): the flame stands off less upstream and trails downstream like a comet tail
  p.x -= fl * size * 0.35;
  p.x = p.x > 0.0 ? p.x / (1.0 + fl * 1.9) : p.x * (1.0 + fl * 0.6);
  p.y += fl * 0.05 * sin(max(p.x, 0.0) * 9.0 - t * 2.0) * smoothstep(0.0, 0.3, max(p.x, 0.0));
  // with gravity, the plume also leans downstream as it rises
  p.x -= fl * g * 0.6 * max(p.y, 0.0);

  // buoyancy: teardrop stretched up, tapered tip, flicker
  float up = max(p.y, 0.0);
  float n = fbm(vec2(p.x * 5.0, p.y * 3.5 - t * 1.6));
  float n2 = fbm(vec2(p.x * 9.0 + 3.0, p.y * 6.0 - t * 2.4));
  float stretch = mix(1.0, 2.7 + o2 * 0.5, g);
  vec2 q = vec2(p.x, p.y > 0.0 ? p.y / stretch : p.y * mix(1.0, 1.6, g));
  q.x *= 1.0 + g * smoothstep(0.0, size * stretch * 1.1, up) * mix(1.1, 1.8, n2);
  q.x += (n - 0.5) * 0.14 * g * smoothstep(0.0, 0.35, up);

  // microgravity: gentle breathing sphere
  float breathe = 1.0 + (1.0 - g) * 0.03 * sin(uTime * 1.3) + (n - 0.5) * mix(0.05, 0.2, g);
  float r = length(q) / (size * breathe);

  float body = smoothstep(1.02, 0.1, r);                  // filled luminous body (buoyant flame)
  float shell = exp(-pow((r - 0.8) / 0.17, 2.0));          // thin reaction shell (spherical diffusion flame)

  // Earth-like colors
  vec3 earth = fireRamp(pow(body, 0.85)) * smoothstep(0.0, 0.2, body) * 1.25;
  earth += vec3(1.0, 0.45, 0.1) * exp(-r * 2.4) * 0.22;   // glow
  float blueBase = exp(-pow((p.y + 0.015) / 0.045, 2.0)) * smoothstep(1.1, 0.4, r);
  earth += vec3(0.15, 0.35, 1.0) * blueBase * 0.55;         // blue base, like a candle

  // microgravity colors: blue shell, faint sooty core when O2 is high
  vec3 micro = vec3(0.10, 0.36, 1.0) * shell * 1.5 + vec3(0.6, 0.82, 1.0) * pow(shell, 3.0) * 0.8;
  micro += vec3(1.0, 0.5, 0.15) * smoothstep(0.65, 0.0, r) * 0.16 * o2;
  micro += vec3(0.1, 0.3, 0.9) * exp(-r * 1.8) * 0.15;

  // partial gravity: keep a crisp blue shell and grow a bright yellow core (avoids a muddy mix)
  float earthW = smoothstep(0.1, 0.95, g);
  float microW = 1.0 - smoothstep(0.0, 0.8, g);
  vec3 coreOnly = fireRamp(body) * pow(body, mix(2.2, 1.0, g)) * 1.3;
  vec3 col = micro * microW + mix(coreOnly, earth, earthW) * smoothstep(0.0, 0.35, g);
  float bright = mix(0.55, 1.35, o2) * mix(1.0, 0.4, dil);
  col *= bright;
  col = mix(col, col * vec3(0.7, 0.85, 1.25), dil * 0.6);   // dilution shifts color cooler

  // fuel source (droplet / sample)
  float drop = smoothstep(0.022, 0.012, length(uv - base));
  col = mix(col, vec3(0.75, 0.82, 0.95), drop * 0.8);

  // tone map
  col = 1.0 - exp(-col * 1.6);
  float a = clamp(max(max(col.r, col.g), col.b) * 1.2, 0.0, 1.0);
  gl_FragColor = vec4(col, a);
}
`;

function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}

export default function Flame({ gravity, o2, flow, dilution, className = '', label, paused }: FlameProps) {
  const host = useRef<HTMLDivElement>(null);
  const target = useRef({ gravity, o2, flow, dilution });
  const [mode, setMode] = useState<'webgl' | 'canvas'>(() => (typeof window !== 'undefined' && hasWebGL() ? 'webgl' : 'canvas'));
  target.current = { gravity, o2, flow, dilution };

  useEffect(() => {
    const el = host.current; if (!el) return;
    let raf = 0, visible = true, disposed = false;
    const cur = { ...target.current };
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const io = new IntersectionObserver(e => { visible = e[0]?.isIntersecting ?? true; });
    io.observe(el);
    const ease = (dt: number) => {
      const k = 1 - Math.exp(-dt * 3.5);
      (Object.keys(cur) as (keyof typeof cur)[]).forEach(key => { cur[key] += (target.current[key] - cur[key]) * k; });
    };

    if (mode === 'webgl') {
      let renderer: THREE.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
      } catch { setMode('canvas'); return; }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      renderer.setClearColor(0x000000, 0);
      el.appendChild(renderer.domElement);
      renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%'; renderer.domElement.style.display = 'block';
      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const uniforms = { uTime: { value: 0 }, uGravity: { value: cur.gravity }, uO2: { value: cur.o2 }, uFlow: { value: cur.flow }, uDilute: { value: cur.dilution }, uRes: { value: new THREE.Vector2(1, 1) } };
      const mat = new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms, transparent: true });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
      scene.add(mesh);
      const resize = () => {
        const w = el.clientWidth || 300, h = el.clientHeight || 300;
        renderer.setSize(w, h, false);
        uniforms.uRes.value.set(w, h);
      };
      resize();
      const ro = new ResizeObserver(resize); ro.observe(el);
      let last = performance.now();
      const loop = (now: number) => {
        if (disposed) return;
        raf = requestAnimationFrame(loop);
        const dt = Math.min(0.1, (now - last) / 1000); last = now;
        if (!visible || paused) return;
        ease(dt);
        uniforms.uTime.value += reduce ? dt * 0.2 : dt;
        uniforms.uGravity.value = cur.gravity; uniforms.uO2.value = cur.o2; uniforms.uFlow.value = cur.flow; uniforms.uDilute.value = cur.dilution;
        renderer.render(scene, camera);
      };
      raf = requestAnimationFrame(loop);
      return () => { disposed = true; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); mat.dispose(); mesh.geometry.dispose(); renderer.dispose(); renderer.domElement.remove(); };
    }

    // ---------- Canvas 2D fallback ----------
    const canvas = document.createElement('canvas');
    canvas.style.width = '100%'; canvas.style.height = '100%'; canvas.style.display = 'block';
    el.appendChild(canvas);
    const ctx = canvas.getContext('2d')!;
    let t = 0, last = performance.now();
    const loop = (now: number) => {
      if (disposed) return;
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      if (!visible || paused) return;
      ease(dt); t += dt * (0.4 + cur.gravity * 2);
      const w = (canvas.width = el.clientWidth || 300), h = (canvas.height = el.clientHeight || 300);
      ctx.clearRect(0, 0, w, h);
      const s = Math.min(w, h) * (0.13 + 0.12 * cur.o2) * (1 - 0.28 * cur.dilution);
      const cx = w / 2 - cur.flow * 0.06 * h, cy = h / 2 + cur.gravity * 0.2 * h;
      const stretchY = 1 + cur.gravity * 1.9, stretchX = 1 + cur.flow * 1.2;
      const flick = 1 + Math.sin(t * 7) * 0.04 * cur.gravity + Math.sin(t * 13) * 0.03 * cur.gravity;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.translate(cx + s * cur.flow * 0.8, cy - s * cur.gravity * 1.1);
      ctx.scale(stretchX, stretchY * flick);
      const alpha = (0.6 + 0.5 * cur.o2) * (1 - 0.55 * cur.dilution);
      const gEarth = ctx.createRadialGradient(0, s * 0.35, 0, 0, 0, s);
      gEarth.addColorStop(0, `rgba(255,245,200,${alpha * cur.gravity})`);
      gEarth.addColorStop(0.45, `rgba(255,160,40,${alpha * cur.gravity})`);
      gEarth.addColorStop(1, 'rgba(200,40,0,0)');
      ctx.fillStyle = gEarth; ctx.beginPath(); ctx.arc(0, 0, s, 0, Math.PI * 2); ctx.fill();
      const gMicro = ctx.createRadialGradient(0, 0, s * 0.55, 0, 0, s);
      gMicro.addColorStop(0, 'rgba(40,110,255,0)');
      gMicro.addColorStop(0.75, `rgba(80,160,255,${alpha * (1 - cur.gravity)})`);
      gMicro.addColorStop(1, 'rgba(20,60,200,0)');
      ctx.fillStyle = gMicro; ctx.beginPath(); ctx.arc(0, 0, s, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.fillStyle = 'rgba(200,215,240,0.85)'; ctx.beginPath(); ctx.arc(cx, cy, Math.max(3, s * 0.08), 0, Math.PI * 2); ctx.fill();
    };
    raf = requestAnimationFrame(loop);
    return () => { disposed = true; cancelAnimationFrame(raf); io.disconnect(); canvas.remove(); };
  }, [mode, paused]);

  return (
    <div ref={host} className={`relative ${className}`} role="img" aria-label={label || `Simulated flame: ${gravity < 0.2 ? 'microgravity, round and blue' : gravity > 0.8 ? 'Earth gravity, tall teardrop' : 'partial gravity'}`}>
      <span className="pointer-events-none absolute bottom-1 right-2 text-[10px] uppercase tracking-widest text-slate-500">{mode === 'webgl' ? 'WebGL shader' : 'Canvas fallback'} · illustrative</span>
    </div>
  );
}
