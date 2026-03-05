export const APP_URL = 'https://entprep.netlify.app';

export const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || "dzakpelov@gmail.com,monabekova2@gmail.com")
  .split(",").map((e: string) => e.trim());
