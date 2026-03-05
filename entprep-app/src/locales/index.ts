import { useApp } from '../contexts/AppContext';
import ru from './ru';
import kk from './kk';

const locales = { ru, kk } as const;

/** Use inside React components */
export function useT() {
  const { st } = useApp();
  return locales[st.lang || 'ru'];
}

/** Use outside React (config files, utils, Netlify functions) */
export function getT(lang: 'ru' | 'kk' = 'ru') {
  return locales[lang];
}

export type { Translations } from './ru';
