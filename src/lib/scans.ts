import type { SimInput } from './knn';

const KEY = 'flamesight-saved-scans';

export interface SavedScan {
  id: string;
  savedAt: string;
  label: string;
  input: SimInput;
  verdict: string;
  score: number;
  confidence: string;
  plain: string;
}

function read(): SavedScan[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as SavedScan[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function write(list: SavedScan[]) {
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, 40)));
}

export function loadScans(): SavedScan[] {
  return read().sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export function saveScan(scan: Omit<SavedScan, 'id' | 'savedAt'>): SavedScan {
  const next: SavedScan = {
    ...scan,
    id: `scan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    savedAt: new Date().toISOString(),
  };
  write([next, ...read().filter(s =>
    !(s.input.fuel === next.input.fuel
      && s.input.o2 === next.input.o2
      && s.input.psi === next.input.psi
      && s.input.flow === next.input.flow
      && s.input.gravity === next.input.gravity
      && s.input.diluent === next.input.diluent),
  )]);
  return next;
}

export function removeScan(id: string): void {
  write(read().filter(s => s.id !== id));
}

export function scanLabel(input: SimInput, verdict: string): string {
  const fuel = input.fuel === 'any' ? 'Any fuel' : input.fuel;
  return `${verdict} · ${fuel} · ${Math.round(input.o2 * 100)}% O₂ · ${input.psi.toFixed(1)} psi`;
}
