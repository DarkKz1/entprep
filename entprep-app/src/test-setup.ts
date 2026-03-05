import '@testing-library/jest-dom/vitest';

// Mock CSS custom properties (themes set these on :root)
const cssVars: Record<string, string> = {
  '--bg-card': 'rgba(24,24,36,0.65)',
  '--bg-sheet': 'rgba(18,18,28,0.99)',
  '--bg-modal': '#161620',
  '--bg-subtle': 'rgba(255,255,255,0.04)',
  '--bg-option': 'rgba(255,255,255,0.03)',
  '--text': '#fff',
  '--text-body': '#e2e8f0',
  '--text-secondary': '#94a3b8',
  '--text-muted': '#64748b',
  '--border': 'rgba(255,255,255,0.08)',
  '--border-light': 'rgba(255,255,255,0.06)',
};
Object.entries(cssVars).forEach(([k, v]) => {
  document.documentElement.style.setProperty(k, v);
});

// Mock matchMedia (required by some components)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver,
});
