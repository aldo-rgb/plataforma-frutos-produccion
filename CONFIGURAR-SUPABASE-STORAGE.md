# 🔐 Configuración de Variables de Entorno para Supabase Storage

## ❌ Error Detectado

Tu archivo `.env` no tiene las variables necesarias para Supabase Storage:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## 📋 Cómo Obtener las Credenciales

### 1. Ve al Dashboard de Supabase

1. Abre: https://supabase.com/dashboard
2. Selecciona tu proyecto: **plataforma-frutos** (o el nombre que tengas)

### 2. Obtén la URL del Proyecto

1. En el menú lateral, ve a **Settings** (⚙️)
2. Click en **API**
3. Busca la sección **Project URL**
4. Copia la URL (ejemplo: `https://fteqhmntkmmppxufjrwt.supabase.co`)

### 3. Obtén las API Keys

En la misma página de **Settings → API**, encontrarás:

#### 📗 **anon / public key** (para el frontend)
- Esta es segura para usar en el navegador
- Tiene restricciones de RLS (Row Level Security)

#### 📕 **service_role key** (para el backend)
- ⚠️ **NUNCA expongas esta key en el frontend**
- Tiene acceso completo a la base de datos
- Solo para uso en servidor

### 4. Agrega las Variables a tu `.env`

Abre tu archivo `.env` y agrega estas líneas:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL="https://fteqhmntkmmppxufjrwt.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Reemplaza:**
- La URL con tu URL de proyecto
- Las keys con tus keys reales

## 🚀 Una vez configurado

Ejecuta el script para crear el bucket:

```bash
node scripts/create-storage-bucket.js
```

El script automáticamente:
1. ✅ Verificará si el bucket existe
2. ✅ Creará el bucket "mentor-assets" (si no existe)
3. ✅ Lo configurará como público
4. ✅ Te mostrará las políticas que debes crear manualmente

## 📝 Crear las Políticas Manualmente

Después de ejecutar el script, ve a:
```
https://TU_URL_SUPABASE/project/_/storage/buckets/mentor-assets
```

Y crea estas 4 políticas en la pestaña **Policies**:

### Política 1: Lectura Pública
- **Name:** Public read access
- **Operation:** SELECT
- **Target roles:** public
- **Policy definition:**
  ```sql
  bucket_id = 'mentor-assets'
  ```

### Política 2: Subida Autenticada
- **Name:** Authenticated users can upload
- **Operation:** INSERT
- **Target roles:** authenticated
- **Policy definition:**
  ```sql
  bucket_id = 'mentor-assets'
  ```

### Política 3: Actualización Propia
- **Name:** Users can update their own files
- **Operation:** UPDATE
- **Target roles:** authenticated
- **Policy definition:**
  ```sql
  bucket_id = 'mentor-assets' AND
  (storage.foldername(name))[1] = auth.uid()::text
  ```

### Política 4: Eliminación Propia
- **Name:** Users can delete their own files
- **Operation:** DELETE
- **Target roles:** authenticated
- **Policy definition:**
  ```sql
  bucket_id = 'mentor-assets' AND
  (storage.foldername(name))[1] = auth.uid()::text
  ```

## ✅ Verificación

Una vez configurado todo:

1. Reinicia el servidor: `npm run dev`
2. Ve a: http://localhost:3000/dashboard/mentor/perfil
3. Click en "Subir Imagen"
4. Selecciona una foto
5. ¡Debería subirse exitosamente!

## 🐛 Troubleshooting

### "Bucket not found"
- Asegúrate de ejecutar el script primero
- Verifica que el bucket se creó en el Dashboard

### "Policy violation"
- Crea las 4 políticas manualmente
- Verifica que estén habilitadas

### "Invalid API key"
- Verifica que copiaste las keys correctamente
- Asegúrate de no incluir espacios adicionales

---

**Nota:** Las variables de Supabase son DIFERENTES a las de la base de datos PostgreSQL que ya tienes configurada. Supabase tiene su propia API REST y Storage que requieren estas credenciales adicionales.
