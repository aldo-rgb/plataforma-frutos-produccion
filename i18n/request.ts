import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

// Idiomas soportados
export const locales = ['es', 'en'] as const;
export type Locale = (typeof locales)[number];

// Idioma por defecto
export const defaultLocale: Locale = 'es';

// Función para detectar el idioma desde cookies
async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('NEXT_LOCALE');
  
  if (localeCookie && locales.includes(localeCookie.value as Locale)) {
    return localeCookie.value as Locale;
  }
  
  return defaultLocale;
}

export default getRequestConfig(async () => {
  const locale = await getLocale();
  
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
});
