/** Tab registry — drives the sidebar, the breadcrumbs and the router. */

export const TABS = [
  { id: 'overview',   n: 1, label: 'Overview',          built: true  },
  { id: 'outcomes',   n: 2, label: 'Outcomes',          built: false },
  { id: 'users',      n: 3, label: 'Users and use case', built: false },
  { id: 'guardrails', n: 4, label: 'Guardrails',        built: false },
  { id: 'systems',    n: 5, label: 'Systems',           built: false },
  { id: 'plan',       n: 6, label: 'Project management', built: false },
  { id: 'agents',     n: 7, label: 'AI agents',         built: false },
  { id: 'knowledge',  n: 8, label: 'Knowledge base',    built: false },
  { id: 'model',      n: 9, label: 'Data model',        built: false },
];

export const tabById = (id) => TABS.find((t) => t.id === id);
