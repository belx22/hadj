import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

// Node 25 injecte un `localStorage` global non fonctionnel (il exige un flag
// --localstorage-file). On le remplace par une implémentation en mémoire, fiable
// et réinitialisable, utilisée par le mock backend (mockApi persiste dedans).
function createMemoryStorage() {
  let store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(String(k), String(v)); },
    removeItem: (k) => { store.delete(k); },
    clear: () => { store = new Map(); },
    key: (i) => [...store.keys()][i] ?? null,
    get length() { return store.size; },
  };
}

const memoryStorage = createMemoryStorage();
const sessionMemoryStorage = createMemoryStorage();
Object.defineProperty(globalThis, 'localStorage', { value: memoryStorage, configurable: true });
Object.defineProperty(globalThis, 'sessionStorage', { value: sessionMemoryStorage, configurable: true });
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', { value: memoryStorage, configurable: true });
  Object.defineProperty(window, 'sessionStorage', { value: sessionMemoryStorage, configurable: true });
}

// Nettoyage du DOM et du localStorage entre chaque test pour éviter toute fuite
// d'état (le mock backend persiste dans localStorage).
afterEach(() => {
  cleanup();
});

beforeEach(() => {
  memoryStorage.clear();
  sessionMemoryStorage.clear();
});

// jsdom ne fournit pas matchMedia ni scrollTo : on les stub pour les composants
// qui les appellent.
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

window.scrollTo = window.scrollTo || vi.fn();

// jsdom ne fournit pas ces API utilisées par les exports (PDF/Excel) et médias.
if (typeof URL.createObjectURL !== 'function') URL.createObjectURL = vi.fn(() => 'blob:mock');
if (typeof URL.revokeObjectURL !== 'function') URL.revokeObjectURL = vi.fn();
