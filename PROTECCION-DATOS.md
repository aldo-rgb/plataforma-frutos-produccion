# 🛡️ SISTEMA DE PROTECCIÓN DE DATOS

## ⚠️ QUÉ PASÓ CON LOS DATOS

### Análisis de la Situación

**Estado Actual:**
- ✅ Base de datos: **3 usuarios** (2 admins + 1 participante)
- ❌ **Pérdida de datos**: Usuarios anteriores desaparecieron

**Causa Más Probable:**

1. **`npx prisma db push` sin backup** 
   - Este comando puede causar **pérdida de datos** si:
     - Hay cambios destructivos en el schema
     - Se eliminan columnas o tablas
     - Se cambian tipos de datos incompatibles
   
2. **Sin sistema de migraciones versionadas**
   - No hay historial de cambios
   - No hay rollback automático
   - No hay backups automáticos

3. **Múltiples ejecuciones de `db push`**
   - En este historial veo ejecuciones de:
     ```bash
     npx prisma db push
     npx prisma db push --skip-generate
     npx prisma db push --accept-data-loss  # ⚠️ PELIGROSO
     ```
   - El flag `--accept-data-loss` **confirma la pérdida de datos**

### Usuarios Actuales

```json
[
  {
    "id": 1,
    "nombre": "Administrador",
    "email": "admin@frutos.com",
    "rol": "ADMINISTRADOR",
    "createdAt": "2025-12-23T13:33:54.906Z"  // ← Creado HOY
  },
  {
    "id": 5,
    "nombre": "Aldo Kmps",
    "email": "aldo@zaia.mx",
    "rol": "ADMINISTRADOR",
    "createdAt": "2025-12-23T13:48:16.368Z"  // ← Creado HOY
  },
  {
    "id": 6,
    "nombre": "Usuario 1",
    "email": "usuario1@frutos.com",
    "rol": "PARTICIPANTE",
    "createdAt": "2025-12-23T13:51:28.044Z"  // ← Creado HOY
  }
]
```

**Conclusión:** Los usuarios anteriores se perdieron y estos 3 se crearon HOY (23 dic 2025).

---

## 🛡️ SISTEMA DE PROTECCIÓN IMPLEMENTADO

He creado un **sistema completo de backups automáticos** para **NUNCA MÁS perder datos**.

### 1. Backup Automático (`scripts/backup-database.js`)

**Características:**
- ✅ Backup completo de toda la base de datos
- ✅ Genera archivo `.sql` con timestamp
- ✅ Mantiene últimos 30 backups automáticamente
- ✅ Limpieza automática de backups antiguos
- ✅ Verifica tamaño y éxito de backup

**Uso:**
```bash
# Backup automático
node scripts/backup-database.js

# Backup manual con nombre personalizado
node scripts/backup-database.js --output=./backups/antes-de-cambio-critico.sql
```

**Output:**
```
🛡️  SISTEMA DE BACKUP AUTOMÁTICO
==================================================
📅 Fecha: 23/12/2025, 10:30:45

🔄 Iniciando backup de base de datos...
📂 Destino: ./backups/backup-2025-12-23T10-30-45.sql
✅ Backup completado exitosamente
📊 Tamaño: 2.45 MB
📁 Ubicación: ./backups/backup-2025-12-23T10-30-45.sql

==================================================
✅ BACKUP COMPLETADO CON ÉXITO

💡 Para restaurar este backup:
   psql $DATABASE_URL < "./backups/backup-2025-12-23T10-30-45.sql"
```

---

### 2. Migración Segura (`scripts/safe-migrate.sh`)

**Características:**
- ✅ **SIEMPRE** hace backup antes de migrar
- ✅ Aborta si el backup falla
- ✅ Muestra instrucciones de rollback si falla
- ✅ Genera Prisma Client automáticamente
- ✅ Modo desarrollo y producción

**Uso:**
```bash
# Para desarrollo (db push)
chmod +x scripts/safe-migrate.sh
./scripts/safe-migrate.sh

# Para producción (migrate deploy)
./scripts/safe-migrate.sh --prod
```

**Output:**
```
🛡️  MIGRACIÓN SEGURA CON BACKUP AUTOMÁTICO
==========================================

🔧 Modo: development

📦 PASO 1/3: Creando backup de seguridad...
-------------------------------------------
✅ Backup completado

🔄 PASO 2/3: Ejecutando migración...
-------------------------------------------
   Comando: npx prisma db push
✅ Migración completada

🔧 PASO 3/3: Generando Prisma Client...
-------------------------------------------
✅ Prisma Client generado

==========================================
✅ MIGRACIÓN COMPLETADA CON ÉXITO
==========================================

📊 Resumen:
   - Backup creado ✓
   - Migración aplicada ✓
   - Prisma Client actualizado ✓

💡 Los backups se encuentran en: ./backups/
```

---

### 3. Restauración de Backups (`scripts/restore-backup.js`)

**Características:**
- ✅ Lista todos los backups disponibles
- ✅ Muestra fecha y tamaño de cada backup
- ✅ Restaura backup específico o el más reciente
- ✅ **Crea backup de seguridad antes de restaurar**
- ✅ Requiere confirmación explícita (escribir "CONFIRMAR")

**Uso:**
```bash
# Ver backups disponibles
node scripts/restore-backup.js

# Restaurar backup específico
node scripts/restore-backup.js backup-2025-12-23T10-30-45.sql

# Restaurar el más reciente
node scripts/restore-backup.js --latest
```

**Output:**
```
🔙 SISTEMA DE RESTAURACIÓN DE BACKUPS
================================================================================

📦 BACKUPS DISPONIBLES
================================================================================

1. backup-2025-12-23T10-30-45.sql 🟢 (más reciente)
   📅 Fecha: 23/12/2025, 10:30:45
   📊 Tamaño: 2.45 MB

2. backup-2025-12-23T09-15-20.sql
   📅 Fecha: 23/12/2025, 09:15:20
   📊 Tamaño: 2.43 MB

💡 Para restaurar un backup:
   node scripts/restore-backup.js backup-xxx.sql
   node scripts/restore-backup.js --latest
```

---

## 🚨 REGLAS DE ORO PARA NUNCA PERDER DATOS

### ❌ NUNCA HACER:

```bash
# ⛔ PELIGRO: Sin backup previo
npx prisma db push

# ⛔ PELIGRO: Acepta pérdida de datos
npx prisma db push --accept-data-loss

# ⛔ PELIGRO: Resetea toda la BD
npx prisma migrate reset
```

### ✅ SIEMPRE HACER:

```bash
# ✅ SEGURO: Backup + Migración
./scripts/safe-migrate.sh

# ✅ SEGURO: Backup manual antes de cambios críticos
node scripts/backup-database.js --output=./backups/antes-de-[nombre].sql
./scripts/safe-migrate.sh
```

---

## 📋 PROTOCOLO DE CAMBIOS EN SCHEMA

### Antes de Modificar `prisma/schema.prisma`:

1. **Crear backup manual:**
   ```bash
   node scripts/backup-database.js --output=./backups/antes-de-[descripcion-cambio].sql
   ```

2. **Modificar el schema** en `prisma/schema.prisma`

3. **Usar migración segura:**
   ```bash
   ./scripts/safe-migrate.sh
   ```

4. **Verificar datos:**
   ```bash
   node scripts/restore-backup.js  # Ver backups disponibles
   ```

5. **Si algo sale mal:**
   ```bash
   node scripts/restore-backup.js --latest
   # Escribe "CONFIRMAR" cuando se solicite
   ```

---

## 🔄 RECUPERACIÓN DE DESASTRES

### Si perdiste datos AHORA MISMO:

1. **Detener el servidor:**
   ```bash
   lsof -ti:3000 | xargs kill -9
   ```

2. **Ver backups disponibles:**
   ```bash
   node scripts/restore-backup.js
   ```

3. **Restaurar el backup más reciente:**
   ```bash
   node scripts/restore-backup.js --latest
   ```

4. **Reiniciar servidor:**
   ```bash
   npm run dev
   ```

### Si NO hay backups disponibles:

1. **Revisar Supabase Dashboard:**
   - Supabase tiene backups automáticos diarios
   - Ir a: Database → Backups
   - Restaurar desde snapshot

2. **Revisar git history:**
   ```bash
   git log --all --grep="migration\|schema" --oneline
   ```

3. **Point-in-time recovery (si está habilitado en Supabase):**
   - Supabase Pro: Restaurar a cualquier punto en el tiempo
   - Ver documentación: https://supabase.com/docs/guides/platform/backups

---

## 🔧 CONFIGURACIÓN DE BACKUPS AUTOMÁTICOS

### Cron Job (Linux/Mac)

Agregar backup diario automático:

```bash
# Editar crontab
crontab -e

# Agregar línea (backup diario a las 3:00 AM)
0 3 * * * cd /ruta/a/plataforma-frutos-FINAL && node scripts/backup-database.js >> logs/backup.log 2>&1
```

### PM2 (Producción)

Agregar al `ecosystem.config.js`:

```javascript
{
  name: 'daily-backup',
  script: 'scripts/backup-database.js',
  cron_restart: '0 3 * * *',  // 3:00 AM diario
  autorestart: false
}
```

---

## 📊 CHECKLIST DE SEGURIDAD

### Antes de cada deploy:

- [ ] ✅ Crear backup manual
- [ ] ✅ Verificar que `./backups/` tiene backups recientes
- [ ] ✅ Usar `./scripts/safe-migrate.sh` en lugar de `npx prisma db push`
- [ ] ✅ Probar en entorno local/staging primero
- [ ] ✅ Tener plan de rollback documentado

### Después de cada deploy:

- [ ] ✅ Verificar que los datos se mantuvieron
- [ ] ✅ Probar funcionalidades críticas
- [ ] ✅ Mantener backup pre-deploy por 7 días

---

## 🎯 RESUMEN EJECUTIVO

### Antes (Sin Protección):
```
Usuario modifica schema.prisma
  ↓
npx prisma db push
  ↓
💥 DATOS PERDIDOS PARA SIEMPRE
```

### Ahora (Con Protección):
```
Usuario modifica schema.prisma
  ↓
./scripts/safe-migrate.sh
  ↓
1. Crea backup automático ✅
2. Aplica migración ✅
3. Si falla → Instrucciones de rollback ✅
  ↓
😊 DATOS PROTEGIDOS
```

---

## 📞 SOPORTE

Si algo sale mal:

1. **NO ENTRES EN PÁNICO** 😌
2. **NO HAGAS MÁS CAMBIOS** ⛔
3. **Revisa los backups disponibles:**
   ```bash
   node scripts/restore-backup.js
   ```
4. **Restaura el último backup bueno:**
   ```bash
   node scripts/restore-backup.js --latest
   ```
5. **Documenta qué pasó** para evitarlo en el futuro

---

## 🔗 Recursos

- [Prisma Migrations Docs](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Supabase Backups](https://supabase.com/docs/guides/platform/backups)
- [PostgreSQL pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html)

---

**Creado:** 23 de diciembre de 2025  
**Última actualización:** 23 de diciembre de 2025  
**Autor:** Sistema de Protección Automática F.R.U.T.O.S.
