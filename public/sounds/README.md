# Archivos de Audio para The Tether Modal

## Audio Requerido

### disconnect.mp3
**Propósito:** Efecto de sonido que se reproduce cuando el usuario hace clic en "CONTINUAR GRATIS" y se abre el modal The Tether.

**Especificaciones:**
- Duración: 1-2 segundos
- Formato: MP3
- Volumen: Moderado (el código aplica 30% de volumen)
- Estilo: Sonido de "sistema apagándose" o "desconexión de energía"

**Ejemplos de referencias:**
- Sonido de computadora apagándose
- Desconexión de sistema de soporte vital
- Error crítico de sistema
- Sonido de energía desvaneciéndose

## Dónde Conseguir el Audio

### Opciones Gratuitas:
1. **Freesound.org** - https://freesound.org/
   - Buscar: "power down", "disconnect", "system shutdown"
   - Requiere atribución en algunos casos

2. **Zapsplat** - https://www.zapsplat.com/
   - Buscar: "shutdown", "power off", "disconnect"
   - Plan gratuito disponible

3. **Pixabay** - https://pixabay.com/sound-effects/
   - Buscar: "shutdown", "error", "disconnect"
   - Completamente libre de derechos

### Opciones Premium:
1. **Epidemic Sound**
2. **AudioJungle**
3. **PremiumBeat**

## Instalación

1. Descargar el archivo de audio
2. Renombrarlo a `disconnect.mp3`
3. Colocarlo en este directorio: `/public/sounds/`
4. El modal automáticamente lo reproducirá

## Nota Técnica

El código del modal (`TheTetherModal.tsx`) tiene manejo de errores, por lo que si el archivo no existe, simplemente no reproducirá el sonido pero el modal funcionará normalmente.

```javascript
try {
  const audio = new Audio('/sounds/disconnect.mp3');
  audio.volume = 0.3;
  audio.play().catch(e => console.log('Audio no disponible'));
} catch (e) {
  console.log('Audio no disponible');
}
```
