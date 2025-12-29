# Solución a Errores del Sistema de Avatares con Selfie

## 🔴 Errores Encontrados

### 1. Error de Cámara: "NotFoundError: Requested device not found"

**Causa:** El navegador no puede encontrar ninguna cámara conectada o no tiene permisos.

**Soluciones implementadas:**
- ✅ Mejor manejo de errores con mensajes específicos
- ✅ Detección de dispositivos antes de solicitar acceso
- ✅ Verificación de compatibilidad del navegador
- ✅ Reproducción automática del video con `await videoRef.current.play()`

**Soluciones del usuario:**

1. **Verificar permisos de cámara:**
   - Chrome: Click en el candado 🔒 junto a la URL → Configuración del sitio → Cámara → Permitir
   - Safari: Safari → Preferencias → Sitios web → Cámara → Permitir para localhost
   - Firefox: Click en el icono de cámara ⚙️ en la barra de direcciones → Permitir

2. **Verificar cámara física:**
   - Asegúrate de que tu dispositivo tenga una cámara
   - Si es una cámara externa, verifica que esté conectada
   - Cierra otras aplicaciones que puedan estar usando la cámara (Zoom, Teams, FaceTime, etc.)

3. **Navegador compatible:**
   - Chrome 63+
   - Firefox 36+
   - Safari 11+
   - Edge 79+
   - ⚠️ Requiere HTTPS en producción (localhost funciona en HTTP)

4. **Probar en consola del navegador:**
   ```javascript
   // Verificar si getUserMedia está disponible
   console.log('getUserMedia disponible:', !!navigator.mediaDevices?.getUserMedia);
   
   // Listar cámaras disponibles
   navigator.mediaDevices.enumerateDevices()
     .then(devices => {
       const cameras = devices.filter(d => d.kind === 'videoinput');
       console.log('Cámaras encontradas:', cameras.length, cameras);
     });
   
   // Intentar acceder a la cámara
   navigator.mediaDevices.getUserMedia({ video: true })
     .then(stream => {
       console.log('✅ Cámara accesible', stream);
       stream.getTracks().forEach(track => track.stop());
     })
     .catch(err => console.error('❌ Error:', err.name, err.message));
   ```

### 2. Error 500: Backend "Internal Server Error"

**Causa:** El cliente de Prisma no reconoce el modelo `AvatarGenerationAttempt`.

**Solución temporal implementada:**
- ✅ Comentado el código de verificación de límites
- ✅ Comentado el código de registro de intentos
- ✅ Sistema funcional sin tracking (temporalmente)

**Solución permanente:**

1. **Verificar que la tabla existe en la base de datos:**
   ```sql
   SELECT * FROM "AvatarGenerationAttempt" LIMIT 1;
   ```

2. **Si la tabla no existe, crearla:**
   ```bash
   cd /Users/aldokmps/plataforma-frutos-FINAL
   psql $DATABASE_URL -f create-avatar-attempts-table.sql
   ```

3. **Regenerar cliente de Prisma:**
   ```bash
   cd /Users/aldokmps/plataforma-frutos-FINAL
   rm -rf node_modules/.prisma
   npx prisma generate
   ```

4. **Reiniciar servidor:**
   ```bash
   pkill -f "next dev"
   npm run dev
   ```

5. **Descomentar el código en `/app/api/avatar/generate-from-selfie/route.ts`:**
   - Buscar: `// TEMPORAL: Comentado mientras se regenera el cliente de Prisma`
   - Descomentar ambos bloques de código relacionados con `prisma.avatarGenerationAttempt`

### 3. Error: REPLICATE_API_TOKEN no configurado

**Causa:** La variable de entorno no está configurada o tiene el valor placeholder.

**Solución:**

1. **Obtener API Key de Replicate:**
   - Ir a https://replicate.com
   - Crear cuenta o iniciar sesión
   - Ir a https://replicate.com/account/api-tokens
   - Crear nuevo token
   - Copiar el token (empieza con `r8_...`)

2. **Configurar en `.env`:**
   ```bash
   # Abrir el archivo .env
   nano /Users/aldokmps/plataforma-frutos-FINAL/.env
   
   # Reemplazar:
   REPLICATE_API_TOKEN="tu_api_key_aqui"
   
   # Con tu token real:
   REPLICATE_API_TOKEN="r8_TuTokenReal123..."
   ```

3. **Reiniciar servidor:**
   ```bash
   pkill -f "next dev"
   npm run dev
   ```

4. **Verificar configuración:**
   ```bash
   # En una nueva terminal
   cd /Users/aldokmps/plataforma-frutos-FINAL
   grep REPLICATE_API_TOKEN .env
   ```

## 📋 Checklist de Verificación

Antes de usar el sistema de selfie avatar, verifica:

- [ ] ✅ Cámara física conectada y funcionando
- [ ] ✅ Permisos de cámara otorgados al navegador
- [ ] ✅ Navegador compatible (Chrome 63+, Firefox 36+, Safari 11+)
- [ ] ✅ Tabla `AvatarGenerationAttempt` creada en BD
- [ ] ✅ Cliente de Prisma regenerado (`npx prisma generate`)
- [ ] ✅ `REPLICATE_API_TOKEN` configurado en `.env` con token válido
- [ ] ✅ Servidor reiniciado después de cambios en `.env`
- [ ] ✅ No hay otras aplicaciones usando la cámara

## 🧪 Flujo de Testing

### Test 1: Verificar Cámara
```bash
# Abrir DevTools en el navegador (F12)
# Ir a Console
# Ejecutar:
navigator.mediaDevices.getUserMedia({ video: true })
  .then(s => { console.log('✅ OK'); s.getTracks().forEach(t => t.stop()); })
  .catch(e => console.error('❌', e));
```

**Resultado esperado:** `✅ OK`
**Si falla:** Revisar permisos y cámara física

### Test 2: Verificar Tabla en BD
```bash
cd /Users/aldokmps/plataforma-frutos-FINAL
npx prisma studio
# Buscar modelo AvatarGenerationAttempt en la lista
```

**Resultado esperado:** Modelo visible en Prisma Studio
**Si falla:** Ejecutar `create-avatar-attempts-table.sql`

### Test 3: Verificar Replicate API
```bash
curl -X POST https://api.replicate.com/v1/predictions \
  -H "Authorization: Bearer $REPLICATE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"version":"stability-ai/sdxl","input":{"prompt":"test"}}'
```

**Resultado esperado:** JSON con `id` del prediction
**Si falla:** Verificar API token

### Test 4: Flujo Completo
1. Seleccionar género
2. Click en "📸 Crear Avatar con mi Selfie"
3. Permitir acceso a cámara
4. Ver preview de video
5. Capturar foto
6. Confirmar con "Generar mi Avatar"
7. Esperar 15-30 segundos
8. Ver avatar generado

## 🔧 Comandos Rápidos

```bash
# Reiniciar todo desde cero
cd /Users/aldokmps/plataforma-frutos-FINAL
pkill -f "next dev"
rm -rf node_modules/.prisma
npx prisma generate
npm run dev

# Ver logs en tiempo real
tail -f .next/trace

# Verificar variables de entorno
grep -E "(REPLICATE|DATABASE)" .env

# Verificar tabla en BD
npx prisma studio
```

## 📞 Soporte

Si los errores persisten:

1. **Capturar pantalla de:**
   - Error en consola del navegador (F12)
   - Error en terminal del servidor
   - Configuración de permisos del navegador

2. **Ejecutar diagnóstico:**
   ```bash
   echo "=== Diagnóstico ==="
   echo "Node version:" $(node -v)
   echo "NPM version:" $(npm -v)
   echo "Prisma version:" $(npx prisma -v | head -1)
   echo "Replicate configurado:" $(grep REPLICATE_API_TOKEN .env | wc -l)
   echo "Cámaras del sistema:" $(system_profiler SPCameraDataType 2>/dev/null | grep "Model ID" || echo "N/A")
   ```

3. **Verificar logs del servidor:**
   - Buscar líneas que empiecen con 🚀 🎨 ✅ o ❌
   - Compartir el contexto completo del error

## ✅ Estado Actual

**Implementado:**
- ✅ UI de selección de género mejorada
- ✅ Manejo de errores de cámara con mensajes específicos
- ✅ Detección de dispositivos antes de acceso
- ✅ Validación de REPLICATE_API_TOKEN
- ✅ Bypass temporal de límites hasta regenerar Prisma
- ✅ Logging detallado en backend

**Pendiente:**
- ⏳ Configurar REPLICATE_API_TOKEN con token real
- ⏳ Descomentar tracking de límites después de regenerar Prisma
- ⏳ Probar generación completa con selfie real
- ⏳ Implementar almacenamiento permanente (S3/Cloudinary)

**Archivos modificados:**
- `components/quantum/SelfieAvatarCapture.tsx` - Mejor manejo de errores de cámara
- `components/quantum/QuantumIdentityModal.tsx` - UI mejorada con selección de género primero
- `app/api/avatar/generate-from-selfie/route.ts` - Validaciones y bypass temporal
