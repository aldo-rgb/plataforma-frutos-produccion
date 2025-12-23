# 🚀 GUÍA DE DEPLOY A PRODUCCIÓN

## 1. Subir a GitHub

Después de crear tu repositorio en GitHub (https://github.com/new), ejecuta:

```bash
cd /Users/aldokmps/plataforma-frutos-FINAL

# Agregar remote (REEMPLAZA 'tu-usuario' con tu usuario de GitHub)
git remote add origin https://github.com/tu-usuario/plataforma-frutos-produccion.git

# Subir código
git branch -M main
git push -u origin main
```

## 2. Deploy en Vercel

### Opción A: Desde la Web (Recomendado)

1. Ve a https://vercel.com/new
2. Conecta tu cuenta de GitHub
3. Selecciona el repositorio `plataforma-frutos-produccion`
4. Click en **"Import"**
5. **NO** hagas cambios en la configuración (Next.js se detecta automáticamente)
6. Click en **"Deploy"**

### 3. Configurar Variables de Entorno en Vercel

Después del primer deploy, ve a:

**Settings → Environment Variables** y agrega:

```
DATABASE_URL=postgresql://...  (tu URL de Neon u otro proveedor)
NEXTAUTH_SECRET=xxx (genera uno nuevo con: openssl rand -base64 32)
NEXTAUTH_URL=https://tu-app.vercel.app
OPENAI_API_KEY=sk-...
```

**IMPORTANTE:** Después de agregar las variables, haz **"Redeploy"** para que surtan efecto.

## 4. Migrar la Base de Datos de Producción

Vercel NO ejecuta `prisma migrate` automáticamente. Debes hacerlo manualmente:

```bash
# En tu terminal local
npx prisma migrate deploy

# O desde Vercel CLI (después de instalarlo)
vercel env pull
npx prisma migrate deploy
```

## 5. URL de Producción

Después del deploy, Vercel te dará:

- **URL temporal:** `https://plataforma-frutos-produccion-xxxxx.vercel.app`
- **Dominio personalizado:** Puedes agregar uno en Settings → Domains

## 📱 Acceso desde Celular

Una vez desplegado, simplemente abre la URL de Vercel desde tu celular. La app es responsive y funciona perfecto en móviles.

## 🔍 Verificar que Todo Funcione

1. Login: `https://tu-app.vercel.app/login`
2. Chat IA: `/dashboard/mentor-ia`
3. Carta de Frutos: `/dashboard/carta`

## 🐛 Si Algo Falla

Ver logs en tiempo real:
```bash
vercel logs
```

O desde el dashboard: https://vercel.com/dashboard → Tu Proyecto → Logs

## 📦 Variables de Entorno Necesarias

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DATABASE_URL` | URL de PostgreSQL (Neon/Supabase) | `postgresql://user:pass@host/db` |
| `NEXTAUTH_SECRET` | Secret para autenticación | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | URL pública de tu app | `https://tu-app.vercel.app` |
| `OPENAI_API_KEY` | API Key de OpenAI | `sk-...` |

---

**¿Listo?** Una vez que subas a GitHub y configures Vercel, tu app estará en producción y accesible desde cualquier dispositivo. 🎉
