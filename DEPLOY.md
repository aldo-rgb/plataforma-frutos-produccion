# 🚀 Guía de Despliegue - Impacto Cuántico

## ✅ Estado Actual

El repositorio local está listo con:
- 3 commits realizados
- PostgreSQL configurado (Neon)
- .gitignore actualizado
- .env.example incluido
- README completo

## 📋 Pasos para Subir a GitHub

### 1. Crear Repositorio en GitHub

Ve a: https://github.com/new

**Configuración recomendada:**
- Repository name: `plataforma-impacto-cuantico`
- Description: `Sistema de gestión de alto rendimiento personal - Método F.R.U.T.O.S.`
- **Privado** (recomendado por las credenciales)
- **NO** marques "Add README" (ya tienes uno)
- **NO** marques "Add .gitignore" (ya tienes uno)

### 2. Conectar y Subir

Una vez creado el repositorio, copia estos comandos:

```bash
cd /Users/aldokmps/plataforma-frutos

# Conectar con tu repositorio de GitHub
git remote add origin https://github.com/aldokmps/plataforma-impacto-cuantico.git

# Subir todo el código
git push -u origin main
```

### 3. Verificar la Subida

Ve a: `https://github.com/aldokmps/plataforma-impacto-cuantico`

Deberías ver:
- ✅ 59 archivos
- ✅ README con documentación
- ✅ .env.example (sin credenciales reales)
- ✅ Todo el código fuente

## 🔧 Antes de Desplegar

### Actualizar Credenciales de Neon

Tu connection string actual tiene un error de autenticación. Necesitas:

1. **Ve a tu Dashboard de Neon**: https://console.neon.tech
2. **Selecciona tu proyecto**: "neondb"
3. **Copia la Connection String actualizada**
4. **Actualiza tu .env.local**:

```env
DATABASE_URL="postgresql://[nueva_connection_string]"
OPENAI_API_KEY="sk-proj-..." # Tu API key de OpenAI
```

### Sincronizar Base de Datos

```bash
npx prisma db push
npx prisma generate
```

Esto creará todas las tablas en tu base de datos de Neon:
- Usuario
- CartaFrutos
- Tarea
- Evidencia
- MetaExtraordinaria

## 🚀 Desplegar en Vercel

### Paso 1: Conectar GitHub

1. Ve a: https://vercel.com/new
2. Click en "Import Git Repository"
3. Selecciona `plataforma-impacto-cuantico`

### Paso 2: Configurar Variables

En la sección "Environment Variables" agrega:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | Tu connection string de Neon |
| `OPENAI_API_KEY` | Tu API key de OpenAI |

### Paso 3: Deploy

1. Click "Deploy"
2. Vercel detectará Next.js automáticamente
3. Build tarda ~2-3 minutos
4. ✅ Tu app estará en: `https://plataforma-impacto-cuantico.vercel.app`

### Paso 4: Sincronizar Base de Datos en Producción

Después del primer deploy:

```bash
# Desde tu terminal local
DATABASE_URL="[tu_neon_url]" npx prisma db push
```

O desde el dashboard de Vercel en la terminal integrada.

## 🔒 Seguridad Post-Deploy

### Regenerar API Key de OpenAI (Urgente)

⚠️ **Tu API key está expuesta en este chat**. Debes:

1. Ve a: https://platform.openai.com/api-keys
2. Revoca la key actual: `sk-proj-iaCcVfdVF4qSiW...`
3. Genera una nueva
4. Actualiza en:
   - `.env.local` (local)
   - Variables de entorno de Vercel
   - `.env` (si existe)

### Actualizar .gitignore

Ya está configurado para ignorar:
- ✅ `.env*` (excepto .env.example)
- ✅ `node_modules/`
- ✅ `.next/`
- ✅ Base de datos local

## 📝 Comandos Útiles

```bash
# Ver commits
git log --oneline

# Ver archivos ignorados
git status --ignored

# Ver archivos trackeados
git ls-files

# Agregar y commit
git add .
git commit -m "feat: nueva funcionalidad"
git push

# Ver remotes
git remote -v
```

## 🐛 Troubleshooting

### Error: "remote origin already exists"
```bash
git remote remove origin
git remote add origin https://github.com/aldokmps/plataforma-impacto-cuantico.git
```

### Error: "authentication failed"
Usa un Personal Access Token:
1. GitHub → Settings → Developer settings → Personal access tokens
2. Generate new token (classic)
3. Scope: `repo` completo
4. Copia el token
5. En el push, usa: `https://TOKEN@github.com/aldokmps/...`

### Build falla en Vercel
Revisa que:
- ✅ Variables de entorno estén configuradas
- ✅ DATABASE_URL sea válida
- ✅ Node version compatible (18+)

## 🎉 ¡Listo!

Tu proyecto está:
- ✅ En GitHub (respaldo)
- ✅ Con README profesional
- ✅ Listo para desplegar
- ✅ Base de datos en la nube
- ✅ Variables de entorno separadas

---

**Próximos pasos recomendados:**
1. Regenerar API key de OpenAI
2. Actualizar connection string de Neon
3. Desplegar en Vercel
4. Configurar dominio personalizado (opcional)
