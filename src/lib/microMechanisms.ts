/**
 * Microgravity flame transport & thermal mechanisms.
 * Educational models (normalized units) that drive the Fluid Physics simulations.
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
    name: 'Absence of Buoyant Convection',
    equation: 'Gr = g β ΔT L³ / ν² → 0 · Ra = Gr · Pr → 0',
    tagline: 'No hot plume — gravity no longer sorts density',
    summary:
      'On Earth, buoyancy (hot gas rises) drives natural convection that feeds oxygen and removes heat. The Grashof number Gr compares buoyant to viscous forces; the Rayleigh number Ra = Gr·Pr gauges whether convection overturns the fluid. In freefall, g ≈ 0 so Gr and Ra collapse—there is no buoyant plume.',
    freefall:
      'Without buoyant convection, a flame cannot “breathe” by rising. Oxidizer arrives only by molecular diffusion, weak cabin ventilation, or Stefan outflow from the fuel surface. The classic teardrop becomes a slow, nearly spherical diffusion flame—exactly what NASA’s droplet and solid-fuel freefall tests show.',
    flameNote: 'Raise residual gravity: the sphere stretches into a buoyant teardrop. At true 0 g the plume vanishes.',
    takeaway: 'Gr → 0 kills natural convection; freefall flames are diffusion- and ventilation-limited, not plume-limited.',
    paramA: {
      label: 'Residual gravity g / g₀',
      min: 0,
      max: 1,
      step: 0.01,
      format: v => (v < 0.01 ? '≈ 0 (freefall)' : `${v.toFixed(2)} g`),
      hint: '0 = ISS freefall · 1 = Earth buoyancy',
    },
    paramB: {
      label: 'Temperature contrast ΔT / ΔT₀',
      min: 0.2,
      max: 2,
      step: 0.05,
      format: v => v.toFixed(2),
      hint: 'Hotter flame → larger Gr on Earth; irrelevant at g = 0',
    },
    defaults: { a: 0, b: 1 },
    chart: { xLabel: 'g / g₀', yLabel: 'Gr / Gr⊕', title: 'Buoyancy strength vs gravity' },
  },
  {
    id: 'diffusion',
    group: 'primary',
    name: 'Molecular Diffusion',
    equation: 'J = −D ∇Y · δ ∼ √(D t) · r_f ≈ ṁ_F / (4π ρ D ln(1+B))',
    tagline: 'Species crawl by concentration gradients',
    summary:
      'Fick’s law says molar flux J is proportional to the gradient of mass fraction Y. The diffusion length grows as √(Dt). For a quasi-steady spherical droplet flame, Spalding’s transfer number B sets standoff radius when convection is absent.',
    freefall:
      'In quiescent microgravity, oxygen reaches the reaction zone almost purely by diffusion. Increasing D (lighter gases, lower pressure) thickens the transport layer and can enlarge the spherical flame; starving D shrinks and dims it until extinction.',
    flameNote: 'Boost diffusivity: the blue shell grows and softens. Cut D: the flame collapses toward the fuel.',
    takeaway: 'Quiescent freefall flames are diffusion flames in the literal sense—size tracks D and the Spalding B number.',
    paramA: {
      label: 'Diffusivity D / D₀',
      min: 0.25,
      max: 2.5,
      step: 0.05,
      format: v => v.toFixed(2),
      hint: 'Helium-rich mixes raise D; high pressure lowers it',
    },
    paramB: {
      label: 'Spalding B number',
      min: 0.2,
      max: 4,
      step: 0.05,
      format: v => v.toFixed(2),
      hint: 'B = (Y_O,∞/s + Y_F,s) / (1 − Y_F,s) for droplet flames',
    },
    defaults: { a: 1, b: 1.2 },
    chart: { xLabel: 'D / D₀', yLabel: 'r_f / r₀', title: 'Flame radius vs diffusivity' },
  },
  {
    id: 'forced',
    group: 'primary',
    name: 'Forced Convection (Ventilation)',
    equation: 'Pe = U L / D · Nu ∼ c Re^m Pr^n',
    tagline: 'Cabin fans replace the missing plume',
    summary:
      'Forced convection is flow imposed by fans or ducts. The Péclet number Pe = UL/D compares advection to diffusion. When Pe ≫ 1, oxygen is swept to the flame and products are carried away; heat transfer follows Reynolds–Nusselt scalings.',
    freefall:
      'ISS and SAFFIRE-style habitats always have some ventilation. Even a few cm/s breaks pure diffusion control: the spherical flame stretches downstream into a wake, local O₂ rises, and spread rates climb—until flow is fast enough to blow off or cool the reaction zone.',
    flameNote: 'Increase ventilation velocity: the freefall flame elongates downstream and brightens, then can thin and lift off.',
    takeaway: 'Ventilation is the primary oxygen highway in freefall; Pe sets whether diffusion or advection wins.',
    paramA: {
      label: 'Ventilation U (cm/s)',
      min: 0,
      max: 40,
      step: 1,
      format: v => `${Math.round(v)} cm/s`,
      hint: 'Quiescent ≈ 0 · ISS fans ~10–20 · SAFFIRE 20–30',
    },
    paramB: {
      label: 'Length scale L / L₀',
      min: 0.5,
      max: 2,
      step: 0.05,
      format: v => v.toFixed(2),
      hint: 'Larger samples raise Pe for the same U',
    },
    defaults: { a: 20, b: 1 },
    chart: { xLabel: 'U (cm/s)', yLabel: 'Pe', title: 'Péclet number vs ventilation' },
  },
  {
    id: 'stefan',
    group: 'primary',
    name: 'Stefan Flow (Outward Expansion)',
    equation: 'ρ v_r = ṁ″ · v_r = (ṁ_F)/(4π r² ρ) · Blowing parameter',
    tagline: 'Combustion products push outward from the fuel',
    summary:
      'Stefan flow is the bulk gas motion caused by phase change or gas production at a surface. Evaporating fuel and hot products leave the droplet or solid at a radial mass flux ṁ″, inducing an outward velocity that opposes incoming oxidizer diffusion.',
    freefall:
      'Around a freefall droplet flame the Stefan wind is spherical and steady. Strong blowing thickens the standoff and can dilute the reaction zone; weak blowing lets oxygen diffuse closer, raising intensity until radiative losses catch up.',
    flameNote: 'Raise mass flux: the shell expands and can dim as products dilute the zone. Lower flux: a tighter, brighter sphere.',
    takeaway: 'Stefan outflow sets the spherical standoff in freefall—balancing fuel gas-out against O₂ diffusion-in.',
    paramA: {
      label: 'Mass flux ṁ″ / ṁ₀',
      min: 0.2,
      max: 2.5,
      step: 0.05,
      format: v => v.toFixed(2),
      hint: 'Higher evaporation / pyrolysis → stronger outward wind',
    },
    paramB: {
      label: 'Ambient density ρ / ρ₀',
      min: 0.4,
      max: 1.6,
      step: 0.05,
      format: v => v.toFixed(2),
      hint: 'Lower cabin pressure → faster radial velocity for same ṁ″',
    },
    defaults: { a: 1, b: 1 },
    chart: { xLabel: 'ṁ″ / ṁ₀', yLabel: 'v_r / v₀', title: 'Stefan velocity vs mass flux' },
  },
  {
    id: 'lewis',
    group: 'secondary',
    name: 'Differential Diffusion (Lewis Number)',
    equation: 'Le = α / D · Le_i = α / D_i · preferential diffusion',
    tagline: 'Heat and species do not travel at the same speed',
    summary:
      'The Lewis number Le compares thermal diffusivity α to mass diffusivity D. When Le ≠ 1, heat and deficient reactant spread differently, shifting flame temperature, curvature response, and extinction stretch.',
    freefall:
      'Spherical freefall flames are highly curved. Le < 1 (fuel diffuses faster than heat) can strengthen positively curved flames; Le > 1 weakens them. Helium dilution raises α and D unevenly—classic Lewis-number control of cool-flame and hot-flame branches in droplet experiments.',
    flameNote: 'Sweep Le: below 1 the shell brightens and holds; above 1 it cools and may fade into a dim cool-flame state.',
    takeaway: 'Lewis-number mismatch reshapes freefall flame temperature—key to hot ↔ cool flame transitions.',
    paramA: {
      label: 'Lewis number Le',
      min: 0.4,
      max: 2.2,
      step: 0.05,
      format: v => v.toFixed(2),
      hint: 'Le = 1 equal rates · Le < 1 fuel-lean strengthening on spheres',
    },
    paramB: {
      label: 'Curvature κ L',
      min: 0.2,
      max: 2,
      step: 0.05,
      format: v => v.toFixed(2),
      hint: 'Smaller spheres → higher κ → stronger Le effects',
    },
    defaults: { a: 1, b: 1 },
    chart: { xLabel: 'Le', yLabel: 'T_f / T₀', title: 'Flame temperature vs Lewis number' },
  },
  {
    id: 'radiation',
    group: 'secondary',
    name: 'Radiative Heat Loss',
    equation: 'Q̇_rad ≈ 4π r² σ ε T⁴ · q̇_chem ∼ (4/3)π r³ ω̇ Q · extinction when Q̇_rad ≳ Q̇_chem',
    tagline: 'Without convection, radiation rules the energy budget',
    summary:
      'Thermal radiation from hot gas and soot scales with surface area and T⁴. Chemical heat release scales with the reacting volume (or flame-sheet area × rate). As a spherical freefall flame grows, area outpaces effective heat generation, so net cooling rises.',
    freefall:
      'Because buoyant convective cooling is gone, radiation becomes the dominant heat-loss path. Growing droplet flames often self-extinguish—or drop into invisible low-temperature “cool flames”—when radiative loss overtakes heat release (FLEX / Cool Flames Investigation).',
    flameNote: 'Grow the sphere or raise emissivity: luminosity crashes toward radiative extinction or a cool-flame remnant.',
    takeaway: 'In freefall, radiative loss vs heat release sets extinction and cool-flame transitions—not buoyant cooling.',
    paramA: {
      label: 'Flame radius r / r₀',
      min: 0.5,
      max: 3,
      step: 0.05,
      format: v => v.toFixed(2),
      hint: 'Larger spheres lose heat faster relative to generation',
    },
    paramB: {
      label: 'Emissivity ε',
      min: 0.05,
      max: 1,
      step: 0.01,
      format: v => v.toFixed(2),
      hint: 'Sooty flames radiate more; blue lean flames less',
    },
    defaults: { a: 1.2, b: 0.35 },
    chart: { xLabel: 'r / r₀', yLabel: 'Q̇_rad / Q̇_chem', title: 'Radiation-to-heat-release ratio' },
  },
  {
    id: 'marangoni',
    group: 'secondary',
    name: 'Marangoni Convection (Liquid Fuels)',
    equation: 'Ma = (−dσ/dT) ΔT L / (μ α) · τ = ∇_s σ',
    tagline: 'Surface-tension gradients stir the liquid fuel',
    summary:
      'Surface tension σ usually falls with temperature. A hot spot on a liquid pool pulls less than a cool rim, so liquid is dragged from warm to cool along the surface (Marangoni stress τ = ∇_s σ). The Marangoni number Ma compares that drive to viscous and thermal resistance.',
    freefall:
      'Without buoyancy-driven liquid circulation, Marangoni flow often dominates pool and droplet interiors in space. It controls how fast fuel is brought to the evaporating surface, changing burn rate, flame size, and whether a liquid fire spreads across a surface.',
    flameNote: 'Raise Ma: surface circulation feeds vapor faster and the freefall flame intensifies. Low Ma: evaporation-limited, dimmer burn.',
    takeaway: 'In microgravity liquid fires, Marangoni convection replaces buoyant stirring inside the fuel.',
    paramA: {
      label: 'Marangoni number Ma / Ma₀',
      min: 0.1,
      max: 5,
      step: 0.05,
      format: v => v.toFixed(2),
      hint: 'Larger ΔT or |dσ/dT| → stronger surface flow',
    },
    paramB: {
      label: 'Viscosity μ / μ₀',
      min: 0.3,
      max: 3,
      step: 0.05,
      format: v => v.toFixed(2),
      hint: 'Thicker fuels damp Marangoni transport',
    },
    defaults: { a: 1.5, b: 1 },
    chart: { xLabel: 'Ma / Ma₀', yLabel: 'ṁ_evap / ṁ₀', title: 'Evaporation rate vs Marangoni drive' },
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
        { label: 'Plume?', value: g < 0.05 ? 'None' : g < 0.4 ? 'Weak' : 'Buoyant' },
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
        { label: 'Regime', value: Pe < 0.5 ? 'Diffusion' : Pe < 5 ? 'Mixed' : 'Advection' },
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
        { label: 'Standoff', value: (0.8 + 0.6 * blow).toFixed(2) },
        { label: 'Blowing', value: blow < 0.25 ? 'Weak' : blow < 0.6 ? 'Moderate' : 'Strong' },
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
        { label: 'Branch', value: Tf < 0.85 ? 'Cool flame' : Tf < 1.05 ? 'Marginal' : 'Hot flame' },
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
        { label: 'State', value: ratio < 0.85 ? 'Hot flame' : ratio < 1.15 ? 'Cooling' : 'Extinct / cool flame' },
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
      { label: 'Surface flow', value: feed < 0.25 ? 'Weak' : feed < 0.55 ? 'Active' : 'Vigorous' },
      { label: 'Ma / μ', value: mevap.toFixed(2) },
    ],
  };
}
