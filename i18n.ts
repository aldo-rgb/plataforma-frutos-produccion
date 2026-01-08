import {getRequestConfig} from 'next-intl/server';
import {notFound} from 'next/navigation';

// Lista de locales soportados
export const locales = ['es', 'en'] as const;
export type Locale = (typeof locales)[number];

export default getRequestConfig(async ({locale}) => {
  // Validar que el locale existe
  if (!locales.includes(locale as Locale)) notFound();

  return {
    messages: (await import(`../messages/${locale}.json`)).default
  };
});
