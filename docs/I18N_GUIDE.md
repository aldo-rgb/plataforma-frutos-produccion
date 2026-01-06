# 🌍 Sistema de Internacionalización (i18n)

La plataforma Frutos ahora es multi-idioma usando **next-intl**. Actualmente soporta:
- 🇲🇽 **Español (es)** - Idioma por defecto
- 🇺🇸 **English (en)** - Inglés

---

## 📁 Estructura de Archivos

```
plataforma-frutos-FINAL/
├── i18n/
│   └── request.ts            # Configuración principal de i18n
├── middleware.ts              # Middleware de autenticación (NextAuth)
├── messages/                  # Archivos de traducción
│   ├── es.json               # Traducciones en español
│   └── en.json               # Traducciones en inglés
├── types/
│   └── next-intl.d.ts        # Tipos TypeScript para autocompletado
├── contexts/
│   └── LocaleContext.tsx     # Contexto para manejo de idioma (opcional)
└── components/
    └── ui/
        └── LanguageSwitcher.tsx  # Componente selector de idioma
```

---

## ✅ Implementación Completada

### ✅ Configuración Base
- ✅ next-intl instalado y configurado
- ✅ Archivos de traducción creados (es.json, en.json)
- ✅ Plugin de Next.js configurado en next.config.ts
- ✅ Middleware integrado con NextAuth
- ✅ LanguageSwitcher agregado al Topbar del dashboard

### ✅ Compilación Exitosa
```bash
npm run build
# ✓ Build completed successfully
```

### ✅ Servidor Corriendo
```bash
npm run dev
# ✓ Ready in 658ms
# Local: http://localhost:3000
```

---

## 🚀 Cómo Usar Traducciones

### 1. En Componentes de Cliente ('use client')

```tsx
'use client';

import { useTranslations } from 'next-intl';

export default function MyComponent() {
  // Obtener traducciones del namespace 'common'
  const t = useTranslations('common');
  
  return (
    <div>
      <h1>{t('welcome')}</h1>
      <button>{t('save')}</button>
      <button>{t('cancel')}</button>
    </div>
  );
}
```

### 2. En Componentes de Servidor (Server Components)

```tsx
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';

export default async function ServerComponent() {
  const t = await getTranslations('dashboard');
  
  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('progress')}</p>
    </div>
  );
}
```

### 3. Múltiples Namespaces

```tsx
'use client';

import { useTranslations } from 'next-intl';

export default function MultiNamespaceComponent() {
  const tCommon = useTranslations('common');
  const tAuth = useTranslations('auth');
  const tDashboard = useTranslations('dashboard');
  
  return (
    <div>
      <h1>{tDashboard('title')}</h1>
      <button>{tCommon('save')}</button>
      <p>{tAuth('login')}</p>
    </div>
  );
}
```

---

## 📝 Estructura de messages/es.json y messages/en.json

Los archivos de traducción están organizados por **namespaces** (secciones):

```json
{
  "common": {
    "welcome": "Bienvenido",
    "save": "Guardar",
    "cancel": "Cancelar"
  },
  "auth": {
    "login": "Iniciar Sesión",
    "register": "Registrarse"
  },
  "dashboard": {
    "title": "Panel de Control",
    "myCart": "Mi Carta Frutos"
  }
}
```

### Namespaces Disponibles:
- **common** - Textos comunes (botones, acciones básicas)
- **nav** - Navegación y menús
- **auth** - Autenticación y login
- **dashboard** - Dashboard principal
- **carta** - Sistema de Cartas Frutos
- **areas** - Áreas de vida
- **mentor** - Sistema de mentoría
- **profile** - Perfil de usuario
- **wizard** - Asistente de configuración
- **quantum** - Sistema quantum e identidad
- **notifications** - Notificaciones
- **errors** - Mensajes de error
- **validation** - Validaciones de formularios

---

## 🎨 Componente LanguageSwitcher

El componente `LanguageSwitcher` ya está integrado en el **Topbar** del dashboard.

### Características:
- ✅ Cambio de idioma sin recargar página
- ✅ Detecta idioma del navegador automáticamente
- ✅ Guarda preferencia del usuario
- ✅ Funciona con todas las rutas protegidas
- ✅ Diseño responsive (móvil y escritorio)
- ✅ Dropdown con banderas y checkmark

### Uso Manual (opcional):
```tsx
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';

<LanguageSwitcher />
```

---

## 🔧 Configuración Técnica

### i18n.ts
```typescript
import { getRequestConfig } from 'next-intl/server';

export const locales = ['es', 'en'] as const;
export const defaultLocale = 'es';

export default getRequestConfig(async ({ locale }) => {
  return {
    messages: (await import(`./messages/${locale}.json`)).default,
    timeZone: 'America/Mexico_City',
    now: new Date()
  };
});
```

### middleware.ts
- ✅ Combina autenticación (NextAuth) con i18n (next-intl)
- ✅ Detecta automáticamente el idioma del navegador
- ✅ Español (es) no tiene prefijo en URL: `/dashboard`
- ✅ Inglés (en) usa prefijo: `/en/dashboard`

---

## 📌 Ejemplo Completo

Ver el componente de ejemplo: **`components/examples/DashboardWelcomeCard.tsx`**

```tsx
'use client';

import { useTranslations } from 'next-intl';

export default function Example() {
  const t = useTranslations('dashboard');
  const tCommon = useTranslations('common');
  
  return (
    <div>
      <h1>{tCommon('welcome')}</h1>
      <p>{t('myCart')}</p>
      <button>{tCommon('save')}</button>
    </div>
  );
}
```

---

## 🌐 URLs y Routing

- **Español (default):**
  - `/login`
  - `/dashboard`
  - `/dashboard/carta/wizard-v2`

- **Inglés:**
  - `/en/login`
  - `/en/dashboard`
  - `/en/dashboard/carta/wizard-v2`

---

## ✅ Checklist de Migración

Al migrar un componente a i18n:

1. ✅ Agregar traducciones a `messages/es.json` y `messages/en.json`
2. ✅ Importar `useTranslations` en componentes cliente
3. ✅ Usar `getTranslations` en server components
4. ✅ Reemplazar strings hardcodeados con `t('key')`
5. ✅ Verificar que funcione en ambos idiomas
6. ✅ Probar cambio de idioma en tiempo real

---

## 🎯 Próximos Pasos

1. **Migrar componentes principales:**
   - CartaWizardRelacional
   - Sidebar
   - Topbar
   - Dashboard pages

2. **Agregar más idiomas:**
   - Portugués (pt)
   - Francés (fr)

3. **Traducir notificaciones del sistema**

4. **Traducir emails y mensajes automáticos**

---

## 🐛 Troubleshooting

### Error: "locale" is undefined
- **Causa:** El layout no está recibiendo el parámetro locale
- **Solución:** Asegúrate de que el layout tenga `params: { locale }`

### Traducciones no se actualizan
- **Causa:** Caché del navegador
- **Solución:** Recargar con Ctrl+Shift+R o limpiar caché

### LanguageSwitcher no aparece
- **Causa:** No está importado en el componente
- **Solución:** Importar y agregar `<LanguageSwitcher />` en el Topbar

---

## 📚 Recursos

- [next-intl Documentation](https://next-intl-docs.vercel.app/)
- [Next.js i18n Routing](https://nextjs.org/docs/app/building-your-application/routing/internationalization)
- [ISO 639-1 Language Codes](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes)

---

**¡La plataforma ya es multi-idioma! 🎉**
