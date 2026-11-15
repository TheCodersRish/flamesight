import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export const UI_VARIATION_KEY = 'flamesight-ui-variation';
export const UI_PREVIOUS_KEY = 'flamesight-ui-previous';
export const UI_OVERHAUL_MIGRATION_KEY = 'flamesight-ember-forge-v1';
/** Classic pre-overhaul look */
export const CLASSIC_UI_VARIATION = 'glass-cards';
/** New default after the design overhaul */
export const OVERHAUL_UI_VARIATION = 'ember-forge';
export const DEFAULT_UI_VARIATION = OVERHAUL_UI_VARIATION;

type Ctx = {
  id: string;
  setId: (id: string) => void;
  previousId: string;
  revert: () => void;
  canRevert: boolean;
  isOverhaul: boolean;
};

const UiVariationContext = createContext<Ctx | null>(null);

function migrateOnce(): string | null {
  if (typeof localStorage === 'undefined') return null;
  if (localStorage.getItem(UI_OVERHAUL_MIGRATION_KEY) === '1') return null;
  const current = localStorage.getItem(UI_VARIATION_KEY);
  // First visit after overhaul: move classic default users onto Ember Forge, keep a revert target.
  if (!current || current === CLASSIC_UI_VARIATION) {
    localStorage.setItem(UI_PREVIOUS_KEY, current || CLASSIC_UI_VARIATION);
    localStorage.setItem(UI_VARIATION_KEY, OVERHAUL_UI_VARIATION);
  }
  localStorage.setItem(UI_OVERHAUL_MIGRATION_KEY, '1');
  return localStorage.getItem(UI_VARIATION_KEY);
}

function readStored(): string {
  if (typeof localStorage === 'undefined') return DEFAULT_UI_VARIATION;
  const migrated = migrateOnce();
  if (migrated) return migrated;
  return localStorage.getItem(UI_VARIATION_KEY) || DEFAULT_UI_VARIATION;
}

function readPrevious(): string {
  if (typeof localStorage === 'undefined') return CLASSIC_UI_VARIATION;
  return localStorage.getItem(UI_PREVIOUS_KEY) || CLASSIC_UI_VARIATION;
}

function applyToDom(id: string) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-ui', id);
}

export function UiVariationProvider({ children }: { children: ReactNode }) {
  const [id, setIdState] = useState<string>(() => {
    const initial = readStored();
    applyToDom(initial);
    return initial;
  });
  const [previousId, setPreviousId] = useState<string>(() => readPrevious());

  useEffect(() => {
    localStorage.setItem(UI_VARIATION_KEY, id);
    applyToDom(id);
  }, [id]);

  useEffect(() => {
    localStorage.setItem(UI_PREVIOUS_KEY, previousId);
  }, [previousId]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === UI_VARIATION_KEY && e.newValue) setIdState(e.newValue);
      if (e.key === UI_PREVIOUS_KEY && e.newValue) setPreviousId(e.newValue);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setId = useCallback((next: string) => {
    setIdState(curr => {
      if (next !== curr) setPreviousId(curr);
      return next;
    });
  }, []);

  const revert = useCallback(() => {
    setIdState(curr => {
      const target = previousId && previousId !== curr ? previousId : CLASSIC_UI_VARIATION;
      setPreviousId(curr);
      return target;
    });
  }, [previousId]);

  const canRevert = previousId !== id;
  const isOverhaul = id === OVERHAUL_UI_VARIATION;

  const value = useMemo(
    () => ({ id, setId, previousId, revert, canRevert, isOverhaul }),
    [id, setId, previousId, revert, canRevert, isOverhaul],
  );
  return <UiVariationContext.Provider value={value}>{children}</UiVariationContext.Provider>;
}

export function useUiVariation() {
  const ctx = useContext(UiVariationContext);
  if (!ctx) throw new Error('useUiVariation requires UiVariationProvider');
  return ctx;
}
