import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export const UI_VARIATION_KEY = 'flamesight-ui-variation';
export const DEFAULT_UI_VARIATION = 'glass-cards';

type Ctx = {
  id: string;
  setId: (id: string) => void;
};

const UiVariationContext = createContext<Ctx | null>(null);

function readStored(): string {
  if (typeof localStorage === 'undefined') return DEFAULT_UI_VARIATION;
  return localStorage.getItem(UI_VARIATION_KEY) || DEFAULT_UI_VARIATION;
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

  useEffect(() => {
    localStorage.setItem(UI_VARIATION_KEY, id);
    applyToDom(id);
  }, [id]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === UI_VARIATION_KEY && e.newValue) setIdState(e.newValue);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const value = useMemo(() => ({ id, setId: setIdState }), [id]);
  return <UiVariationContext.Provider value={value}>{children}</UiVariationContext.Provider>;
}

export function useUiVariation() {
  const ctx = useContext(UiVariationContext);
  if (!ctx) throw new Error('useUiVariation requires UiVariationProvider');
  return ctx;
}
