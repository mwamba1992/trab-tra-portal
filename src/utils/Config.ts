const DEV_API_BASE_URL = 'http://localhost:3000/api';

function resolveApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');
  if (import.meta.env.DEV) return DEV_API_BASE_URL;
  // Runtime (not build-time) check: a production bundle must never silently talk to localhost.
  throw new Error('[Config] VITE_API_BASE_URL is not set. Set it in .env.production (e.g. https://api.trab.go.tz/api) and rebuild.');
}

export const Config = {
  API_BASE_URL: resolveApiBaseUrl(),
  APP_NAME: import.meta.env.VITE_APP_NAME || 'IDRAS · TRA Appeals Portal',
};
