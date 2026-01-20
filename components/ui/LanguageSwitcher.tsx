'use client';

import { Globe, Check } from 'lucide-react';
import { useState, useEffect } from 'react';

type Locale = 'es' | 'en';

interface LanguageOption {
  code: Locale;
  name: string;
  flag: string;
}

const languages: LanguageOption[] = [
  { code: 'es', name: 'Español', flag: '🇲🇽' },
  { code: 'en', name: 'English', flag: '🇺🇸' }
];

export default function LanguageSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentLocale, setCurrentLocale] = useState<Locale>('es');

  useEffect(() => {
    // Leer desde cookie primero (tiene prioridad porque es lo que lee el servidor)
    const cookieLocale = document.cookie
      .split('; ')
      .find(row => row.startsWith('NEXT_LOCALE='))
      ?.split('=')[1] as Locale | undefined;
    
    if (cookieLocale && (cookieLocale === 'es' || cookieLocale === 'en')) {
      setCurrentLocale(cookieLocale);
      // Sincronizar localStorage con cookie
      localStorage.setItem('locale', cookieLocale);
    } else {
      // Si no hay cookie, leer de localStorage y crear cookie
      const savedLocale = localStorage.getItem('locale') as Locale;
      if (savedLocale) {
        setCurrentLocale(savedLocale);
        document.cookie = `NEXT_LOCALE=${savedLocale}; path=/; max-age=31536000`;
      }
    }
  }, []);

  const handleLanguageChange = async (newLocale: Locale) => {
    if (newLocale === currentLocale) {
      setIsOpen(false);
      return;
    }

    // Guardar en cookie (que el servidor puede leer)
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`; // 1 año
    
    // También guardar en localStorage como respaldo
    localStorage.setItem('locale', newLocale);
    setCurrentLocale(newLocale);
    setIsOpen(false);
    
    // Recargar para aplicar el cambio
    window.location.reload();
  };

  const currentLanguage = languages.find(lang => lang.code === currentLocale) || languages[0];

  return (
    <div className="relative">
      {/* Botón activador */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 dark:hover:from-purple-900/20 dark:hover:to-blue-900/20 transition-all duration-300"
        aria-label="Cambiar idioma"
      >
        <Globe className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        <span className="text-sm font-medium hidden sm:inline text-slate-700 dark:text-slate-300">
          {currentLanguage.flag} {currentLanguage.name}
        </span>
        <span className="text-sm font-medium sm:hidden">
          {currentLanguage.flag}
        </span>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <>
          {/* Overlay para cerrar al hacer click fuera */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu de opciones */}
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors ${
                  currentLocale === lang.code
                    ? 'bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/30 dark:to-blue-900/30 text-purple-700 dark:text-purple-300'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                <span className="flex items-center gap-3">
                  <span className="text-xl">{lang.flag}</span>
                  <span className="font-medium">{lang.name}</span>
                </span>
                {currentLocale === lang.code && (
                  <Check className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
