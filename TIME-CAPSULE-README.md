# 🎬 TIME CAPSULE VIDEO GENERATOR

## Descripción

El **Time Capsule** es una funcionalidad épica que genera automáticamente un video reel con las mejores evidencias de transformación del usuario, acompañado de música épica y texto motivacional generado por IA.

## 🎯 Ubicación

**Botón "Time Capsule 🎬"** en `/dashboard/vault` (The Vault)

---

## 🏗️ Arquitectura

### 1. **Frontend: Modal Interactivo** (`/components/vault/TimeCapsuleVideoModal.tsx`)

**Tecnologías:**
- React + TypeScript
- Framer Motion (animaciones)
- Canvas Confetti (celebraciones)
- Lucide React (iconos)

**Fases del Modal:**

#### Fase 1: Información y Validación
- Muestra estadísticas del usuario:
  * Total de artefactos
  * Legendarios
  * Épicos
  * Alta calidad
- Requisito: **Mínimo 10 evidencias aprobadas**
- Descripción de qué es Time Capsule
- Botón "Generar Mi Time Capsule"

#### Fase 2: Generación (Loading)
- Animación de spinner rotatorio
- Barra de progreso (0-100%)
- Mensajes de estado:
  * 🎬 Seleccionando mejores evidencias...
  * 🎵 Agregando música épica...
  * ✨ Aplicando efectos cinematográficos...

#### Fase 3: Video Listo
- Confetti celebration
- Video player integrado
- Botones:
  * **Descargar Video** (gradiente púrpura-rosa)
  * **Cerrar**

---

### 2. **Backend: API Endpoint** (`/app/api/video/generate-time-capsule/route.ts`)

**Endpoint:** `POST /api/video/generate-time-capsule`

**Flujo de Procesamiento:**

```typescript
1. Validar usuario autenticado
2. Verificar mínimo 10 evidencias
3. Obtener evidencias aprobadas de la base de datos
4. Priorizar evidencias por calidad:
   - LEGENDARY (frequency: ONE_TIME)
   - HIGH_QUALITY (qualityScore >= 85)
   - Resto de evidencias
5. Seleccionar máximo 20 evidencias (sin duplicados)
6. Generar texto motivacional con GPT-4o-mini
7. [SIMULADO] Generar video
8. Retornar URL del video + metadata
```

**Request Body:**
```json
{
  "evidencias": [
    {
      "id": 123,
      "fotoUrl": "https://...",
      "descripcion": "...",
      "fecha": "2025-12-22T...",
      "rarity": "LEGENDARY"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "videoUrl": "https://res.cloudinary.com/.../time-capsule.mp4",
  "metadata": {
    "evidenciasUsadas": 20,
    "evidenciasTotales": 45,
    "duracionSegundos": 60,
    "textoMotivacional": "..."
  }
}
```

---

## 🤖 Generación de Texto Motivacional

**Función:** `generarTextoMotivacional()`

**Prompt para GPT-4o-mini:**
```
Genera un texto motivacional épico y corto (máximo 100 palabras) 
para un video Time Capsule de transformación cuantica.

Contexto:
- Usuario: [nombre]
- Rango actual: [rango]
- Evidencias en video: [número]
- Total evidencias: [número]

El texto debe:
1. Ser inspirador y celebrar el viaje de transformación
2. Mencionar que cada momento capturado es prueba de quién es
3. Usar lenguaje épico pero genuino
4. Terminar con un call to action sobre seguir creciendo
```

**Ejemplo de Output:**
> "Carlos, cada momento capturado en este video es prueba de tu transformación. No son solo fotos, son artefactos de verdad que muestran quién ERES. Tu viaje continúa, y cada día es una nueva oportunidad para preservar momentos épicos en The Quantum Archive. ¡Sigue capturando tu grandeza! 🚀"

---

## 🎥 Generación del Video (Estado Actual)

### **Implementación Actual: SIMULADA**

Por ahora, el sistema retorna un video de ejemplo después de 3 segundos de delay simulado:

```typescript
await new Promise(resolve => setTimeout(resolve, 3000));
const videoUrl = 'https://res.cloudinary.com/demo/video/upload/v1/sample-time-capsule.mp4';
```

### **Implementación en Producción: REAL**

Para implementar la generación real del video, se pueden usar las siguientes tecnologías:

#### Opción 1: **FFmpeg** (Recomendada)
```bash
ffmpeg -framerate 1/3 \
  -loop 1 -t 3 -i image1.jpg \
  -loop 1 -t 3 -i image2.jpg \
  -loop 1 -t 3 -i image3.jpg \
  -i music-epic.mp3 \
  -filter_complex "[0:v]scale=1920:1080,fade=in:0:30[v0]; \
                   [1:v]scale=1920:1080,fade=in:0:30,fade=out:60:30[v1]; \
                   [v0][v1]concat=n=20:v=1[outv]" \
  -map "[outv]" -map 20:a \
  -c:v libx264 -c:a aac -shortest \
  output.mp4
```

**Ventajas:**
- Open source y gratuito
- Control total sobre efectos
- Alta calidad de output

**Desventajas:**
- Requiere instalar FFmpeg en servidor
- Procesamiento puede ser lento (30-60s)

#### Opción 2: **Remotion** (React-based)
```typescript
import { Composition } from 'remotion';

const TimeCapsuleVideo = () => {
  return (
    <AbsoluteFill>
      {evidencias.map((ev, i) => (
        <Sequence from={i * 90} durationInFrames={90} key={i}>
          <ImageWithFade src={ev.fotoUrl} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
```

**Ventajas:**
- Renderizado programático con React
- Fácil de personalizar
- Previsualización en desarrollo

**Desventajas:**
- Requiere infraestructura de renderizado
- Costo de recursos (Lambda o EC2)

#### Opción 3: **Servicios Externos**
- **Shotstack**: API de video editing
- **Creatomate**: Templates con API
- **Cloudinary Video API**: Transformaciones y overlays

**Ventajas:**
- No requiere infraestructura propia
- Renderizado rápido
- APIs simples

**Desventajas:**
- Costo por video generado
- Menor control sobre efectos

---

## 📦 Recursos Necesarios

### **Música Épica** 🎵
Ubicación sugerida: `/public/music/epic-motivation.mp3`

**Opciones recomendadas (royalty-free):**
- Epidemic Sound
- Artlist
- YouTube Audio Library (free)
- Incompetech (free with attribution)

**Duración ideal:** 60-90 segundos

### **Fonts & Overlays**
Para agregar texto sobre el video:
- Font: Montserrat Bold / Inter Black
- Efectos: Fade in/out, blur de fondo
- Texto: Nombre del usuario, fechas, citas motivacionales

---

## 🔧 Configuración de Producción

### 1. **Instalar FFmpeg** (si se usa)
```bash
# Ubuntu/Debian
sudo apt-get install ffmpeg

# macOS
brew install ffmpeg

# Docker
FROM node:18
RUN apt-get update && apt-get install -y ffmpeg
```

### 2. **Configurar Cloudinary** (para almacenamiento)
```typescript
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Subir video
const result = await cloudinary.uploader.upload(
  'output.mp4',
  { 
    resource_type: 'video',
    folder: 'time-capsules',
    public_id: `capsule-${userId}-${Date.now()}`
  }
);

return result.secure_url;
```

### 3. **Variables de Entorno**
```env
OPENAI_API_KEY=sk-...           # Para texto motivacional
CLOUDINARY_CLOUD_NAME=...       # Para almacenamiento
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

---

## 🎨 Personalización

### **Duración por Foto**
Actualmente: **3 segundos por foto**

Para cambiar:
```typescript
// En generarTextoMotivacional()
duracionSegundos: seleccionadas.length * 5  // 5 segundos por foto
```

### **Transiciones**
FFmpeg opciones:
- `fade`: Fade in/out
- `xfade`: Cross-fade entre imágenes
- `zoompan`: Efecto Ken Burns
- `overlay`: Agregar texto/logo

### **Resolución**
- **HD**: 1280x720
- **Full HD**: 1920x1080
- **4K**: 3840x2160

---

## 📊 Estadísticas y Métricas

### **Priorización de Evidencias**

El sistema selecciona hasta 20 evidencias en este orden:

1. **Top 5 LEGENDARY** (frequency: ONE_TIME)
2. **Top 10 HIGH_QUALITY** (qualityScore >= 85)
3. **Top 5 Restantes** (más recientes)

**Eliminación de duplicados:** Si una evidencia aparece en varias categorías, solo se incluye una vez.

### **Ejemplo de Selección**
```
Usuario con 45 evidencias:
- 3 LEGENDARY     → Se incluyen todas (3)
- 12 HIGH_QUALITY → Se incluyen top 10
- 30 restantes    → Se incluyen top 5
Total en video: 18 evidencias
```

---

## 🚀 Roadmap

### **v1.0** (Actual)
- ✅ Modal interactivo con 3 fases
- ✅ Validación de 10+ evidencias
- ✅ Texto motivacional con IA
- ✅ Simulación de generación

### **v2.0** (Próximo)
- 🔄 Generación real con FFmpeg
- 🔄 Música épica integrada
- 🔄 Subida a Cloudinary
- 🔄 Overlays con nombre y fechas

### **v3.0** (Futuro)
- 🔄 Templates personalizables
- 🔄 Compartir en redes sociales
- 🔄 Timeline interactivo
- 🔄 Notificación cuando video esté listo
- 🔄 Generación asíncrona con webhook

---

## 🐛 Debugging

### **Logs en Consola**
```bash
🎬 Generando Time Capsule para Carlos Usuario...
   Evidencias totales: 45
   Seleccionadas: 20
   - Legendarias: 3
   - Alta calidad: 12
✅ Time Capsule generada exitosamente
```

### **Errores Comunes**

1. **"Se requieren al menos 10 evidencias"**
   - Usuario tiene menos de 10 evidencias aprobadas
   - Solución: Subir y aprobar más evidencias

2. **"Error generando texto motivacional"**
   - OPENAI_API_KEY no configurada o inválida
   - Solución: Verificar variable de entorno

3. **"Error al generar video"**
   - FFmpeg no instalado (en producción)
   - Solución: Instalar FFmpeg o usar servicio externo

---

## 💡 Tips de UX

1. **Notificar cuando esté listo**: Si la generación toma más de 30s, enviar notificación por email/Socket.IO

2. **Preview de imágenes**: Mostrar thumbnails de las evidencias seleccionadas antes de generar

3. **Progreso real**: Conectar barra de progreso con eventos reales de FFmpeg

4. **Compartir**: Botón para compartir video en redes sociales

5. **Historial**: Guardar videos generados en base de datos para re-descarga

---

## 📄 Licencia y Consideraciones

- **Música**: Asegurarse de tener licencia para uso comercial
- **Fotos del usuario**: Usuario otorga permiso al crear cuenta
- **GDPR**: Permitir eliminar videos generados
- **Almacenamiento**: Límite de X videos por usuario o borrado automático después de 30 días

---

*Documentación actualizada: 22 de diciembre de 2025*
