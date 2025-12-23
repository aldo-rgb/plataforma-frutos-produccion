#!/bin/bash

###############################################################################
# SISTEMA DE MIGRACIÓN SEGURA CON BACKUP AUTOMÁTICO
#
# Este script SIEMPRE hace un backup antes de cualquier migración
# 
# Uso:
#   ./scripts/safe-migrate.sh          # Para desarrollo (db push)
#   ./scripts/safe-migrate.sh --prod   # Para producción (migrate deploy)
###############################################################################

set -e  # Salir si hay error

echo "🛡️  MIGRACIÓN SEGURA CON BACKUP AUTOMÁTICO"
echo "=========================================="
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Detectar modo
MODE="development"
if [[ "$1" == "--prod" ]]; then
  MODE="production"
fi

echo "🔧 Modo: $MODE"
echo ""

# Paso 1: Crear backup
echo "📦 PASO 1/3: Creando backup de seguridad..."
echo "-------------------------------------------"
node scripts/backup-database.js

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ ERROR: El backup falló. ABORTANDO migración.${NC}"
  echo "   No se realizarán cambios en la base de datos."
  exit 1
fi

echo ""
echo -e "${GREEN}✅ Backup completado${NC}"
echo ""

# Paso 2: Ejecutar migración
echo "🔄 PASO 2/3: Ejecutando migración..."
echo "-------------------------------------------"

if [[ "$MODE" == "production" ]]; then
  echo "   Comando: npx prisma migrate deploy"
  npx prisma migrate deploy
else
  echo "   Comando: npx prisma db push"
  npx prisma db push
fi

if [ $? -ne 0 ]; then
  echo ""
  echo -e "${RED}❌ ERROR: La migración falló${NC}"
  echo ""
  echo "🔙 Para restaurar el backup más reciente:"
  echo "   1. Encuentra el archivo en ./backups/"
  echo "   2. Ejecuta: psql \$DATABASE_URL < backups/[archivo].sql"
  exit 1
fi

echo ""
echo -e "${GREEN}✅ Migración completada${NC}"
echo ""

# Paso 3: Generar Prisma Client
echo "🔧 PASO 3/3: Generando Prisma Client..."
echo "-------------------------------------------"
npx prisma generate

if [ $? -ne 0 ]; then
  echo -e "${YELLOW}⚠️  WARNING: Error generando Prisma Client${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}✅ Prisma Client generado${NC}"
echo ""

# Resumen final
echo "=========================================="
echo -e "${GREEN}✅ MIGRACIÓN COMPLETADA CON ÉXITO${NC}"
echo "=========================================="
echo ""
echo "📊 Resumen:"
echo "   - Backup creado ✓"
echo "   - Migración aplicada ✓"
echo "   - Prisma Client actualizado ✓"
echo ""
echo "💡 Los backups se encuentran en: ./backups/"
echo ""
