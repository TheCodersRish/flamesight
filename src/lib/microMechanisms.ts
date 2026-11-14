/**
 * Microgravity flame transport & thermal mechanisms.
 * Educational models (normalized units) that drive the Fluid Physics simulations.
 * User-facing copy aims for high-school plain English; equations keep the science.
 */

export type MechGroup = 'primary' | 'secondary';

export type MechId =
  | 'no-buoyancy'
  | 'diffusion'
  | 'forced'
  | 'stefan'
  | 'lewis'
  | 'radiation'
  | 'marangoni';

export interface Mechanism {
  id: MechId;
  group: MechGroup;
  name: string;
  equation: string;
  tagline: string;
  summary: string;
  freefall: string;
  flameNote: string;
  takeaway: string;
  /** Slider labels / hints for the live sim */
  paramA: { label: string; min: number; max: number; step: number; format: (v: number) => string; hint: string };
  paramB: { label: string; min: number; max: number; step: number; format: (v: number) => string; hint: string };
  defaults: { a: number; b: number };
  chart: { xLabel: string; yLabel: string; title: string };
}

export const MECHANISMS: Mechanism[] = [
  {
    id: 'no-buoyancy',
    group: 'primary',
    name: 'No Rising Hot Air',
    equation: 'Gr = g β ΔT L³ / ν² → 0 · Ra = Gr · Pr → 0',
    tagline: 'In freefall, hot gas does not float upward',
    summary:
      'On Earth, hot air rises and cool air sinks. That rising “plume” brings fresh oxygen to a flame and carries heat away. Scientists measure how strong that lift is with a number called the Grashof number (Gr). In space, gravity is nearly zero, so Gr drops to about zero—there is no rising plume at all.',
    freefall:
      'With no rising hot air, a flame cannot “breathe” the Earth way. Oxygen has to creep in by slow mixing, gentle cabin fans, or gas flowing out from the fuel. The familiar teardrop shape becomes a slow, nearly round flame—the same shape NASA sees in droplet and solid-fuel freefall tests.',
    flameNote: 'Turn residual gravity up: the round flame stretches into a teardrop. At true zero-g the rising plume disappears.',
    takeaway: 'When gravity goes away, rising hot air stops. Freefall flames wait on slow mixing and cabin fans—not on a rising plume.',
    paramA: {
      label: 'How much gravity (vs Earth)',
      min: 0,
      max: 1,
      step: 0.01,
      format: v => (v < 0.01 ? '≈ 0 (freefall)' : `${v.toFixed(2)} g`),
      hint: '0 = space station freefall · 1 = full Earth gravity',
    },
    paramB: {
      label: 'How much hotter than the air',
      min: 0.2,
      max: 2,
      step: 0.05,
      format: v => v.toFixed(2),
      hint: 'A hotter flame rises harder on Earth; at zero-g that lift still vanishes',
    },
    defaults: { a: 0, b: 1 },
    chart: { xLabel: 'g / g₀', yLabel: 'Gr / Gr⊕', title: 'Rising-air strength vs gravity' },
  },
  {
    id: 'diffusion',
    group: 'primary',
    name: 'Slow Mixing (Diffusion)',
    equation: 'J = −D ∇Y · δ ∼ √(D t) · r_f ≈ ṁ_F / (4π ρ D ln(1+B))',
    tagline: 'Oxygen and fuel slowly spread into each other',
    summary:
      'When air is still, gases mix by diffusion: molecules wander from high concentration to low. How far they travel grows like the square root of time. For a round droplet flame with almost no wind, a number called Spalding’s B helps predict how far out the flame sits.',
    freefall:
      'In quiet microgravity, oxygen mostly reaches the flame by this slow mixing. Raise diffusivity D (lighter gases or lower pressure) and the mixing layer thickens—the round flame can grow. Starve D and the flame shrinks and fades until it goes out.',
    flameNote: 'Boost how fast gases mix: the blue shell grows and softens. Cut mixing: the flame collapses toward the fuel.',
    takeaway: 'Still freefall flames are true diffusion flames—their size follows how fast gases mix and the Spalding B number.',
    paramA: {
      label: 'Mixing speed D (vs normal)',
      min: 0.25,
      max: 2.5,
      step: 0.05,
      format: v => v.toFixed(2),
      hint: 'Helium-rich mixes mix faster; high pressure slows mixing',
    },
    paramB: {
      label: 'Spalding B (fuel–oxygen drive)',
      min: 0.2,
      max: 4,
      step: 0.05,
      format: v => v.toFixed(2),
      hint: 'Higher B means a stronger push for fuel vapor and oxygen to meet',
    },
    defaults: { a: 1, b: 1.2 },
    chart: { xLabel: 'D / D₀', yLabel: 'r_f / r₀', title: 'Flame size vs how fast gases mix' },
  },
  {
    id: 'forced',
    group: 'primary',
    name: 'Cabin Fan Flow',
    equation: 'Pe = U L / D · Nu ∼ c Re^m Pr^n',
    tagline: 'Fans replace the missing rising plume',
    summary:
      'Forced flow is air pushed by fans or ducts. The Péclet number (Pe) compares that push to slow mixing. When Pe is large, oxygen is swept to the flame and smoke is carried away. Heat transfer also scales with how fast the air moves.',
    freefall:
      'Space stations and SAFFIRE-style habitats always have some ventilation. Even a few centimeters per second breaks pure slow-mixing control: the round flame stretches downstream, local oxygen rises, and flames can spread faster—until flow is so strong it cools or blows the flame off.',
    flameNote: 'Speed up the fan: the freefall flame stretches downwind and brightens, then can thin and lift off.',
    takeaway: 'Cabin fans are the main oxygen highway in freefall. Pe tells you whether slow mixing or fan push wins.',
    paramA: {
      label: 'Fan speed U (cm/s)',
      min: 0,
      max: 40,
      step: 1,
      format: v => `${Math.round(v)} cm/s`,
      hint: 'Still air ≈ 0 · ISS fans ~10–20 · SAFFIRE 20–30',
    },
    paramB: {
      label: 'Sample size L (vs normal)',
      min: 0.5,
      max: 2,
      step: 0.05,
      format: v => v.toFixed(2),
      hint: 'Bigger samples feel more fan push at the same speed',
    },
    defaults: { a: 20, b: 1 },
    chart: { xLabel: 'U (cm/s)', yLabel: 'Pe', title: 'Fan-push number (Pe) vs ventilation' },
  },
  {
    id: 'stefan',
    group: 'primary',
    name: 'Outward Gas Push',
    equation: 'ρ v_r = ṁ″ · v_r = (ṁ_F)/(4π r² ρ) · Blowing parameter',
    tagline: 'Burning fuel blows product gases outward',
    summary:
      'When liquid fuel evaporates or solid fuel turns into gas, that vapor pushes outward. Scientists call this Stefan flow. The outward wind fights oxygen trying to creep inward, so the flame sits at a balance point away from the fuel.',
    freefall:
      'Around a freefall droplet flame this outward push is round and steady. Strong blowing thickens the gap and can dilute the reaction zone; weak blowing lets oxygen creep closer, so the flame brightens—until heat loss catches up.',
    flameNote: 'Raise how much gas leaves the fuel: the shell expands and can dim. Lower it: a tighter, brighter sphere.',
    takeaway: 'Outward gas push sets how far a round freefall flame sits—balancing fuel going out against oxygen creeping in.',
    paramA: {
      label: 'Gas leaving the fuel (vs normal)',
      min: 0.2,
      max: 2.5,
      step: 0.05,
      format: v => v.toFixed(2),
      hint: 'Faster evaporation or pyrolysis → stronger outward wind',
    },
    paramB: {
      label: 'Air density (vs normal)',
      min: 0.4,
      max: 1.6,
      step: 0.05,
      format: v => v.toFixed(2),
      hint: 'Thinner cabin air → faster outward speed for the same gas rate',
    },
    defaults: { a: 1, b: 1 },
    chart: { xLabel: 'ṁ″ / ṁ₀', yLabel: 'v_r / v₀', title: 'Outward wind speed vs gas leaving the fuel' },
  },
  {
    id: 'lewis',
    group: 'secondary',
    name: 'Heat vs Fuel Speed',
    equation: 'Le = α / D · Le_i = α / D_i · preferential diffusion',
    tagline: 'Heat and fuel vapor do not travel at the same speed',
    summary:
      'The Lewis number (Le) compares how fast heat spreads to how fast fuel (or oxygen) spreads. When Le is not 1, heat and the scarce reactant move differently. That shifts flame temperature and how easily the flame goes out.',
    freefall:
      'Round freefall flames are tightly curved. Le below 1 (fuel spreads faster than heat) can strengthen that curved flame; Le above 1 weakens it. Adding helium changes heat and mass speeds unevenly—a classic reason NASA droplet tests jump between hot flames and cooler “cool flames.”',
    flameNote: 'Sweep Le: below 1 the shell brightens and holds; above 1 it cools and may fade into a dim cool-flame state.',
    takeaway: 'When heat and fuel travel at different speeds, freefall flame temperature changes—key to hot ↔ cool flame switches.',
    paramA: {
      label: 'Lewis number Le',
      min: 0.4,
      max: 2.2,
      step: 0.05,
      format: v => v.toFixed(2),
      hint: 'Le = 1 same speeds · Le < 1 can strengthen round flames',
    },
    paramB: {
      label: 'How curved the flame is',
      min: 0.2,
      max: 2,
      step: 0.05,
      format: v => v.toFixed(2),
      hint: 'Smaller spheres curve more → stronger Lewis-number effects',
    },
    defaults: { a: 1, b: 1 },
    chart: { xLabel: 'Le', yLabel: 'T_f / T₀', title: 'Flame temperature vs Lewis number' },
  },
  {
    id: 'radiation',
    group: 'secondary',
    name: 'Glow Heat Loss',
    equation: 'Q̇_rad ≈ 4π r² σ ε T⁴ · q̇_chem ∼ (4/3)π r³ ω̇ Q · extinction when Q̇_rad ≳ Q̇_chem',
    tagline: 'Without rising air, glowing heat loss runs the energy budget',
    summary:
      'Hot gas and soot glow and lose heat as infrared light. That loss grows with surface area and temperature to the fourth power. Chemical heat release grows with how much reacting gas you have. As a round freefall flame grows, the glowing loss can beat the heat the chemistry makes.',
    freefall:
      'Because there is no rising plume to cool the flame the Earth way, glow heat loss becomes the main cooling path. Growing droplet flames often go out on their own—or drop into nearly invisible cool flames—when glow loss overtakes heat release (FLEX and Cool Flames Investigation).',
    flameNote: 'Grow the sphere or raise how strongly it glows: brightness crashes toward going out or a cool-flame remnant.',
    takeaway: 'In freefall, glow heat loss vs chemical heat decides whether the flame dies—not rising-air cooling.',
    paramA: {
      label: 'Flame size (vs normal)',
      min: 0.5,
      max: 3,
      step: 0.05,
      format: v => v.toFixed(2),
      hint: 'Bigger spheres lose glow heat faster relative to heat made',
    },
    paramB: {
      label: 'How strongly it glows (ε)',
      min: 0.05,
      max: 1,
      step: 0.01,
      format: v => v.toFixed(2),
      hint: 'Sooty flames glow more; lean blue flames glow less',
    },
    defaults: { a: 1.2, b: 0.35 },
    chart: { xLabel: 'r / r₀', yLabel: 'Q̇_rad / Q̇_chem', title: 'Glow loss vs heat made by the flame' },
  },
  {
    id: 'marangoni',
    group: 'secondary',
    name: 'Surface-Tension Stirring',
    equation: 'Ma = (−dσ/dT) ΔT L / (μ α) · τ = ∇_s σ',
    tagline: 'Hot and cool spots on liquid fuel pull the surface differently',
    summary:
      'Surface tension usually falls as a liquid warms. A hot spot on a pool pulls less than a cool rim, so liquid is dragged along the surface from warm to cool. That surface-tension drive is Marangoni flow. The Marangoni number (Ma) compares that pull to how thick and thermally stubborn the liquid is.',
    freefall:
      'Without gravity stirring the liquid, Marangoni flow often runs the show inside pools and droplets in space. It controls how fast fresh fuel reaches the evaporating surface, which changes burn rate, flame size, and whether a liquid fire spreads across a surface.',
    flameNote: 'Raise Ma: surface currents feed vapor faster and the freefall flame intensifies. Low Ma: evaporation-limited, dimmer burn.',
    takeaway: 'In microgravity liquid fires, surface-tension stirring replaces gravity stirring inside the fuel.',
    paramA: {
      label: 'Marangoni drive (vs normal)',
      min: 0.1,
      max: 5,
      step: 0.05,
      format: v => v.toFixed(2),
      hint: 'Bigger temperature contrast → stronger surface flow',
    },
    paramB: {
      label: 'How thick the liquid is',
      min: 0.3,
      max: 3,
      step: 0.05,
      format: v => v.toFixed(2),
      hint: 'Thicker fuels damp surface-tension stirring',
    },
    defaults: { a: 1.5, b: 1 },
    chart: { xLabel: 'Ma / Ma₀', yLabel: 'ṁ_evap / ṁ₀', title: 'Evaporation rate vs surface-tension drive' },
  },
];

export const PRIMARY = MECHANISMS.filter(m => m.group === 'primary');
export const SECONDARY = MECHANISMS.filter(m => m.group === 'secondary');

export function mechById(id: MechId): Mechanism {
  return MECHANISMS.find(m => m.id === id)!;
}

const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));

export interface MechState {
  metric: number;
  metricLabel: string;
  intensity: number;
  series: { x: number; y: number }[];
  marker: { x: number; y: number }[];
  flame: { gravity: number; o2: number; flow: number; dilution: number };
  extras: { label: string; value: string }[];
}

/** Evaluate the educational model for the selected mechanism at slider values (a, b). */
export function evaluateMechanism(id: MechId, a: number, b: number): MechState {
  const pts = 48;

  if (id === 'no-buoyancy') {
    const g = a;
    const dT = b;
    const Gr = g * dT; // normalized to Earth Gr at g=1, ΔT=1
    const series = Array.from({ length: pts + 1 }, (_, i) => {
      const gi = i / pts;
      return { x: +gi.toFixed(3), y: +(gi * dT).toFixed(3) };
    });
    return {
      metric: Gr,
      metricLabel: 'Gr / Gr⊕',
      intensity: clamp(0.35 + 0.55 * (1 - g) + 0.1 * dT),
      series,
      marker: [{ x: +g.toFixed(3), y: +Gr.toFixed(3) }],
      flame: {
        gravity: g,
        o2: clamp(0.35 + 0.35 * (1 - 0.5 * g) + 0.1 * dT),
        flow: 0.05 + 0.15 * g,
        dilution: clamp(0.15 + 0.25 * (1 - g)),
      },
      extras: [
        { label: 'Ra / Ra⊕', value: (Gr * 0.7).toFixed(2) },
        { label: 'Rising plume?', value: g < 0.05 ? 'None' : g < 0.4 ? 'Weak' : 'Strong' },
      ],
    };
  }

  if (id === 'diffusion') {
    const D = a;
    const B = b;
    const rf = D * Math.log(1 + B); // normalized Spalding-like radius
    const series = Array.from({ length: pts + 1 }, (_, i) => {
      const Di = 0.25 + (2.5 - 0.25) * (i / pts);
      return { x: +Di.toFixed(3), y: +(Di * Math.log(1 + B)).toFixed(3) };
    });
    return {
      metric: rf,
      metricLabel: 'r_f / r₀',
      intensity: clamp(0.25 + 0.35 * D + 0.25 * Math.log(1 + B)),
      series,
      marker: [{ x: +D.toFixed(3), y: +rf.toFixed(3) }],
      flame: {
        gravity: 0,
        o2: clamp(0.3 + 0.25 * D + 0.15 * Math.min(B, 2) / 2),
        flow: 0.04 + 0.08 * Math.min(D, 1.5) / 1.5,
        dilution: clamp(0.55 - 0.35 * D),
      },
      extras: [
        { label: 'δ / δ₀ ∼ √D', value: Math.sqrt(D).toFixed(2) },
        { label: 'ln(1+B)', value: Math.log(1 + B).toFixed(2) },
      ],
    };
  }

  if (id === 'forced') {
    const U = a;
    const L = b;
    const Dref = 0.2; // cm²/s-ish scale in educational units with U in cm/s
    const Pe = (U * L) / (Dref * 10);
    const series = Array.from({ length: pts + 1 }, (_, i) => {
      const Ui = (40 * i) / pts;
      return { x: +Ui.toFixed(2), y: +((Ui * L) / (Dref * 10)).toFixed(2) };
    });
    const flowN = clamp(U / 40);
    // Mid flow brightest; very high flow begins to lift off (dilution up)
    const lift = clamp((U - 28) / 12);
    return {
      metric: Pe,
      metricLabel: 'Péclet Pe',
      intensity: clamp(0.25 + 0.7 * flowN * (1 - 0.55 * lift)),
      series,
      marker: [{ x: +U.toFixed(2), y: +Pe.toFixed(2) }],
      flame: {
        gravity: 0,
        o2: clamp(0.28 + 0.55 * flowN * (1 - 0.4 * lift)),
        flow: flowN,
        dilution: clamp(0.1 + 0.55 * lift),
      },
      extras: [
        { label: 'Regime', value: Pe < 0.5 ? 'Slow mixing' : Pe < 5 ? 'Mixed' : 'Fan-driven' },
        { label: 'Re (rel.)', value: (U * L / 15).toFixed(2) },
      ],
    };
  }

  if (id === 'stefan') {
    const mDot = a;
    const rho = b;
    const vr = mDot / rho;
    const series = Array.from({ length: pts + 1 }, (_, i) => {
      const mi = 0.2 + (2.5 - 0.2) * (i / pts);
      return { x: +mi.toFixed(3), y: +(mi / rho).toFixed(3) };
    });
    const blow = clamp((mDot - 0.5) / 2);
    return {
      metric: vr,
      metricLabel: 'v_r / v₀',
      intensity: clamp(0.7 - 0.35 * blow + 0.15 * rho),
      series,
      marker: [{ x: +mDot.toFixed(3), y: +vr.toFixed(3) }],
      flame: {
        gravity: 0,
        o2: clamp(0.55 - 0.3 * blow),
        flow: 0.06 + 0.25 * blow, // radial expansion reads as slight stretch in the shader
        dilution: clamp(0.1 + 0.55 * blow),
      },
      extras: [
        { label: 'Flame gap', value: (0.8 + 0.6 * blow).toFixed(2) },
        { label: 'Outward push', value: blow < 0.25 ? 'Weak' : blow < 0.6 ? 'Moderate' : 'Strong' },
      ],
    };
  }

  if (id === 'lewis') {
    const Le = a;
    const curv = b;
    // Curvature–Lewis coupling: T rises when Le<1 on positively curved (spherical) flames
    const Tf = 1 + 0.35 * (1 - Le) * curv;
    const series = Array.from({ length: pts + 1 }, (_, i) => {
      const Lei = 0.4 + (2.2 - 0.4) * (i / pts);
      return { x: +Lei.toFixed(3), y: +(1 + 0.35 * (1 - Lei) * curv).toFixed(3) };
    });
    const cool = clamp((Le - 0.9) / 1.2);
    return {
      metric: Tf,
      metricLabel: 'T_f / T₀',
      intensity: clamp(Tf / 1.4),
      series,
      marker: [{ x: +Le.toFixed(3), y: +Tf.toFixed(3) }],
      flame: {
        gravity: 0,
        o2: clamp(0.25 + 0.55 * clamp(Tf / 1.5)),
        flow: 0.05,
        dilution: clamp(0.1 + 0.65 * cool),
      },
      extras: [
        { label: 'Branch', value: Tf < 0.85 ? 'Cool flame' : Tf < 1.05 ? 'Borderline' : 'Hot flame' },
        { label: 'Le effect', value: Le < 0.95 ? 'Strengthening' : Le > 1.05 ? 'Weakening' : 'Neutral' },
      ],
    };
  }

  if (id === 'radiation') {
    const r = a;
    const eps = b;
    // Heat release ~ r² (flame sheet) with mild volume boost; radiation ~ ε r² T⁴ with T dropping as r grows
    const T = Math.max(0.45, 1.15 - 0.22 * (r - 1));
    const Qrad = eps * r * r * Math.pow(T, 4);
    const Qchem = r * r * (0.85 + 0.15 / r);
    const ratio = Qrad / Qchem;
    const series = Array.from({ length: pts + 1 }, (_, i) => {
      const ri = 0.5 + (3 - 0.5) * (i / pts);
      const Ti = Math.max(0.45, 1.15 - 0.22 * (ri - 1));
      const qr = eps * ri * ri * Math.pow(Ti, 4);
      const qc = ri * ri * (0.85 + 0.15 / ri);
      return { x: +ri.toFixed(3), y: +(qr / qc).toFixed(3) };
    });
    const extinct = clamp((ratio - 0.7) / 0.8);
    return {
      metric: ratio,
      metricLabel: 'Q̇_rad / Q̇_chem',
      intensity: clamp(0.85 - 0.75 * extinct),
      series,
      marker: [{ x: +r.toFixed(3), y: +ratio.toFixed(3) }],
      flame: {
        gravity: 0,
        o2: clamp(0.55 - 0.45 * extinct),
        flow: 0.04 + 0.12 * clamp((r - 0.5) / 2.5),
        dilution: clamp(0.05 + 0.85 * extinct),
      },
      extras: [
        { label: 'T / T₀', value: T.toFixed(2) },
        { label: 'State', value: ratio < 0.85 ? 'Hot flame' : ratio < 1.15 ? 'Cooling' : 'Out / cool flame' },
      ],
    };
  }

  // marangoni
  const Ma = a;
  const mu = b;
  const mevap = Ma / mu;
  const series = Array.from({ length: pts + 1 }, (_, i) => {
    const Mai = 0.1 + (5 - 0.1) * (i / pts);
    return { x: +Mai.toFixed(3), y: +(Mai / mu).toFixed(3) };
  });
  const feed = clamp(mevap / 4);
  return {
    metric: mevap,
    metricLabel: 'ṁ_evap / ṁ₀',
    intensity: clamp(0.25 + 0.7 * feed),
    series,
    marker: [{ x: +Ma.toFixed(3), y: +mevap.toFixed(3) }],
    flame: {
      gravity: 0,
      o2: clamp(0.3 + 0.55 * feed),
      flow: 0.05 + 0.2 * feed,
      dilution: clamp(0.45 - 0.35 * feed),
    },
    extras: [
      { label: 'Surface flow', value: feed < 0.25 ? 'Weak' : feed < 0.55 ? 'Active' : 'Strong' },
      { label: 'Ma / μ', value: mevap.toFixed(2) },
    ],
  };
}
