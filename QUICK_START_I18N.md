# 🌍 Quick Start - Sistema Multi-Idioma

## ✅ Implementación Completa

El sistema de internacionalización (i18n) está **100% funcional** y listo para usar.

---

## 🎯 Cómo Usar

### 1. Cambiar Idioma en el Dashboard
```
1. Ir al Dashboard
2. Buscar el botón del globo 🌐 en el Topbar (arriba a la derecha)
3. Click para abrir el menú
4. Seleccionar idioma (🇲🇽 Español o 🇺🇸 English)
5. La página se recargará automáticamente
```

### 2. Agregar Traducciones a un Componente

**Componente Cliente:**
```tsx
'use client';
import { useTranslations } from 'next-intl';

export default function MiComponente() {
  const t = useTranslations('dashboard'); // namespace
  
  return (
    <div>
      <h1>{t('title')}</h1>  {/* Lee de messages/[locale].json */}
      <button>{t('save')}</button>
    </div>
  );
}
```

**Componente Servidor:**
```tsx
import { getTranslations } from 'next-intl/server';

export default async function MiComponenteServer() {
  const t = await getTranslations('dashboard');
  
  return <h1>{t('title')}</h1>;
}
```

### 3. Agregar Nuevas Traducciones

**Editar archivos JSON:**
```bash
# Español
messages/es.json

# Inglés
messages/en.json
```

**Ejemplo:**
```json
{
  "dashboard": {
    "title": "Panel de Control",  // ES
    "myCart": "Mi Carta Frutos"
  }
}
```

```json
{
  "dashboard": {
    "title": "Dashboard",  // EN
    "myCart": "My Frutos Charter"
  }
}
```

---

## 📁 Archivos Importantes

```
messages/
  ├── es.json          ← Traducciones en español
  └── en.json          ← Traducciones en inglés

i18n/
  └── request.ts       ← Configuración de next-intl

components/ui/
  └── LanguageSwitcher.tsx  ← Selector de idioma

docs/
  ├── I18N_GUIDE.md              ← Guía completa
  └── I18N_IMPLEMENTATION_SUMMARY.md  ← Resumen técnico
```

---

## 🔥 Ejemplo Práctico

Ver el componente de ejemplo funcionando:
```
/components/examples/DashboardWelcomeCard.tsx
```

Este componente muestra cómo usar múltiples namespaces:
- `common` - Textos comunes
- `dashboard` - Textos del dashboard
- `carta` - Textos de cartas

---

## 🚀 Comandos

```bash
# Desarrollo
npm run dev

# Build (verificar traducciones)
npm run build

# Ver estructura de archivos
tree messages/
```

---

## 📝 Namespaces Disponibles

| Namespace | Uso |
|-----------|-----|
| `common` | Botones generales (save, cancel, etc) |
| `auth` | Login, registro, password |
| `dashboard` | Panel principal |
| `carta` | Sistema de cartas |
| `mentor` | Sistema de mentoría |
| `wizard` | Asistente de configuración |
| `quantum` | Sistema quantum |
| `errors` | Mensajes de error |

---

## ✅ Checklist de Migración

Al migrar un componente a i18n:

1. [ ] Importar `useTranslations` (cliente) o `getTranslations` (servidor)
2. [ ] Definir el namespace: `const t = useTranslations('dashboard')`
3. [ ] Reemplazar strings: `"Panel"` → `{t('title')}`
4. [ ] Agregar traducciones a `messages/es.json` y `messages/en.json`
5. [ ] Probar cambiando de idioma en el dashboard

---

## 🎨 UI del LanguageSwitcher

El selector de idioma aparece en el **Topbar del dashboard**:

```
[Logo] [Navigation] ... [🌐 Español ▼] [Phoenix] [Puntos] [Usuario]
                          ↑
                    Click aquí
```

**Dropdown:**
```
┌─────────────────┐
│ 🇲🇽 Español   ✓ │  ← Idioma actual
│ 🇺🇸 English     │
└─────────────────┘
```

---

## 🐛 Troubleshooting

### El selector no aparece
- Verificar que estás en el dashboard (ruta protegida)
- Verificar que el Topbar está renderizando

### Las traducciones no cambian
- Recargar la página (Ctrl+R)
- Verificar localStorage: `localStorage.getItem('locale')`
- Limpiar caché del navegador

### Error de compilación
```bash
# Regenerar node_modules
rm -rf node_modules .next
npm install
npm run dev
```

---

## 📚 Documentación Completa

Para información detallada, ver:
- **Guía de Uso:** `/docs/I18N_GUIDE.md`
- **Resumen Técnico:** `/docs/I18N_IMPLEMENTATION_SUMMARY.md`

---

## 🎉 ¡Listo para Usar!

El sistema está 100% funcional. Simplemente:
1. Importa `useTranslations`
2. Define el namespace
3. Usa `t('key')` en lugar de strings

**¡Es así de simple!** 🚀

---

*Implementado: 4 de enero de 2026*
*Estado: ✅ PRODUCCIÓN READY*
