# Nota: Este archivo debe ser reemplazado con una imagen PNG real

Para crear un avatar por defecto, puedes:
1. Usar una imagen placeholder de 200x200px
2. Copiar una imagen existente y renombrarla
3. Generar una imagen de perfil genérica

Ejemplo de comando para crear un placeholder simple (requiere ImageMagick):
convert -size 200x200 xc:#6366f1 -gravity center -pointsize 80 -fill white -annotate +0+0 "?" default-avatar.png
