# Scripts de Desarrollo

Esta carpeta contiene **271 scripts** de desarrollo/debugging que fueron movidos desde la raíz del proyecto para mantener limpia la estructura.

## ⚠️ IMPORTANTE

Estos scripts fueron usados durante el desarrollo para:
- Debugging de usuarios específicos
- Migración de datos
- Verificación de estados
- Pruebas manuales

**NO son parte del código de producción.**

## Categorías de scripts

| Prefijo | Cantidad | Propósito |
|---------|----------|-----------|
| check-* | ~100 | Verificar estados de usuarios/datos |
| fix-* | ~30 | Corregir datos específicos |
| update-* | ~20 | Actualizar registros |
| migrate-* | ~10 | Migraciones de datos |
| test-* | ~15 | Pruebas manuales |
| debug-* | ~10 | Debugging específico |
| generate-* | ~10 | Generar tareas/datos |
| Otros | ~76 | Diversos |

## Uso

Para ejecutar un script desde la raíz del proyecto:
node scripts/development/check-algo.js

## Limpieza recomendada

Muchos de estos scripts son obsoletos y podrían eliminarse.
Antes de eliminar, verificar que no se usen en producción.

Scripts que probablemente se pueden mantener:
- backup-usuarios.js - Backup de usuarios
- sync-*.js - Sincronización de datos
- generate-*.js - Generación de tareas

---
Movidos el 5 de febrero de 2026 como parte de la limpieza de seguridad
