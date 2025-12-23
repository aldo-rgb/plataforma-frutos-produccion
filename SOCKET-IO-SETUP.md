# Configuración de Socket.IO con Redis para Escalabilidad

## 📋 Resumen

Esta configuración permite que tu aplicación Next.js maneje 1k-10k usuarios concurrentes usando:
- **Socket.IO** para comunicación en tiempo real
- **Redis** como adaptador para sincronizar múltiples instancias
- **PM2** para clustering y aprovechar todos los núcleos del CPU

## 🚀 Instalación

### 1. Instalar Dependencias

```bash
npm install socket.io socket.io-client redis @socket.io/redis-adapter
npm install -g pm2
npm install -g ts-node
```

### 2. Instalar Redis

**macOS (con Homebrew):**
```bash
brew install redis
brew services start redis
```

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install redis-server
sudo systemctl start redis
```

**Docker (recomendado para desarrollo):**
```bash
docker run -d -p 6379:6379 --name redis redis:alpine
```

### 3. Configurar Variables de Entorno

Copia las variables de `.env.socket` a tu archivo `.env`:

```bash
cat .env.socket >> .env
```

## 🔧 Uso en Desarrollo

### Opción 1: Modo Normal (un solo proceso)
```bash
npm run dev
```

### Opción 2: Con servidor personalizado (Socket.IO activo)
```bash
ts-node server.ts
```

### Opción 3: Con PM2 (clustering - recomendado para testing)
```bash
pm2 start ecosystem.config.js --env development
pm2 logs plataforma-frutos
```

## 🌐 Uso en Producción

### 1. Build de la aplicación
```bash
npm run build
```

### 2. Iniciar con PM2
```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup  # Para auto-iniciar al reiniciar el servidor
```

### 3. Monitorear
```bash
pm2 monit                    # Dashboard interactivo
pm2 logs plataforma-frutos   # Ver logs en tiempo real
pm2 status                   # Ver estado de los procesos
```

### 4. Comandos útiles de PM2
```bash
pm2 restart plataforma-frutos   # Reiniciar
pm2 reload plataforma-frutos    # Reinicio sin downtime
pm2 stop plataforma-frutos      # Detener
pm2 delete plataforma-frutos    # Eliminar proceso
```

## 💻 Uso en el Cliente

### Ejemplo básico (React Component)

```typescript
'use client';

import { useSocket, useSocketEvent } from '@/hooks/useSocket';
import { useSession } from 'next-auth/react';

export default function NotificacionesComponent() {
  const { data: session } = useSession();
  const { socket, isConnected } = useSocket(session?.user?.id);

  // Escuchar evento de notificación
  useSocketEvent('nueva_evidencia', (data) => {
    console.log('Nueva evidencia recibida:', data);
    // Actualizar UI o mostrar notificación
  });

  // Escuchar evento de mentor
  useSocketEvent('mentor_aprobacion', (data) => {
    console.log('Mentor aprobó evidencia:', data);
  });

  return (
    <div>
      <p>Estado: {isConnected ? '🟢 Conectado' : '🔴 Desconectado'}</p>
    </div>
  );
}
```

## 📡 Emitir Eventos desde el Servidor

### En tus API routes:

```typescript
// app/api/evidencia/aprobar/route.ts
import { emitToUser, emitToMentor } from '@/lib/socket';

export async function POST(request: Request) {
  // ... tu lógica de aprobación ...

  // Notificar al estudiante
  emitToUser(estudianteId, 'evidencia_aprobada', {
    evidenciaId: evidencia.id,
    mensaje: 'Tu evidencia fue aprobada'
  });

  // Notificar al mentor
  emitToMentor(mentorId, 'evidencia_procesada', {
    evidenciaId: evidencia.id,
    estudianteNombre: estudiante.nombre
  });

  return NextResponse.json({ success: true });
}
```

## 🎯 Eventos Recomendados

### Para Estudiantes:
- `evidencia_aprobada` - Cuando mentor aprueba evidencia
- `evidencia_rechazada` - Cuando mentor rechaza evidencia
- `nueva_tarea` - Nueva tarea asignada
- `mentor_mensaje` - Mensaje del mentor

### Para Mentores:
- `nueva_evidencia` - Estudiante sube evidencia
- `estudiante_progreso` - Actualización de progreso
- `sesion_solicitada` - Estudiante solicita sesión

### Globales:
- `sistema_mantenimiento` - Notificación de mantenimiento
- `actualizacion_disponible` - Nueva versión disponible

## 📊 Monitoreo y Escalabilidad

### Ver recursos usados:
```bash
pm2 monit  # Dashboard con CPU, RAM, etc.
```

### Escalar manualmente:
```bash
pm2 scale plataforma-frutos 4  # Ejecutar 4 instancias
pm2 scale plataforma-frutos +2 # Agregar 2 instancias más
```

### Logs avanzados:
```bash
pm2 logs --lines 100           # Ver últimas 100 líneas
pm2 logs --timestamp           # Logs con timestamp
pm2 flush                      # Limpiar logs antiguos
```

## 🔒 Seguridad

### En producción:
1. Configura Redis con password:
```bash
REDIS_URL=redis://username:password@host:6379
```

2. Limita origins en CORS (lib/socket.ts):
```typescript
cors: {
  origin: ['https://tudominio.com'],
  credentials: true
}
```

3. Implementa autenticación en conexiones:
```typescript
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (isValidToken(token)) {
    next();
  } else {
    next(new Error('Unauthorized'));
  }
});
```

## 🌍 Redis Gestionado (Recomendado para Producción)

### Opciones:
- **Redis Cloud** (https://redis.com/cloud/)
- **AWS ElastiCache**
- **Google Cloud Memorystore**
- **DigitalOcean Managed Redis**

Ventajas:
- Alta disponibilidad
- Backups automáticos
- Escalado automático
- Monitoreo incluido

## 🐛 Troubleshooting

### Redis no conecta:
```bash
redis-cli ping  # Debe responder "PONG"
```

### PM2 no inicia:
```bash
pm2 kill        # Matar todos los procesos
pm2 start ecosystem.config.js  # Reiniciar
```

### Socket.IO no conecta:
- Verificar que el servidor custom esté corriendo
- Revisar logs: `pm2 logs`
- Verificar firewall/puertos

## 📈 Capacidad Estimada

Con esta configuración:
- **1 CPU core**: ~1,000 conexiones concurrentes
- **4 CPU cores**: ~4,000 conexiones concurrentes
- **8 CPU cores**: ~8,000 conexiones concurrentes

Redis puede manejar **100k+ operaciones/segundo** fácilmente.

## ✅ Checklist de Deployment

- [ ] Redis instalado y corriendo
- [ ] PM2 instalado globalmente
- [ ] Variables de entorno configuradas
- [ ] Build de producción completado
- [ ] PM2 startup configurado
- [ ] Logs configurados en `/logs`
- [ ] Monitoreo activo con `pm2 monit`
