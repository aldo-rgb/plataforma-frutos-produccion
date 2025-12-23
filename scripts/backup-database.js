#!/usr/bin/env node

/**
 * SISTEMA DE BACKUP AUTOMÁTICO DE BASE DE DATOS (Supabase Compatible)
 * 
 * Este script crea backups completos usando Prisma (no requiere pg_dump)
 * 
 * Uso:
 *   node scripts/backup-database.js
 *   node scripts/backup-database.js --output=./backups/manual-backup.json
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');
const { gzipSync } = require('zlib');

const prisma = new PrismaClient();

// Configuración
const BACKUP_DIR = path.join(__dirname, '../backups');
const MAX_BACKUPS = 30;

// Parsear argumentos
const args = process.argv.slice(2);
const outputArg = args.find(arg => arg.startsWith('--output='));
const customOutput = outputArg ? outputArg.split('=')[1] : null;

/**
 * Crear directorio de backups si no existe
 */
async function ensureBackupDir() {
  try {
    await fs.access(BACKUP_DIR);
  } catch {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    console.log(`📁 Directorio de backups creado: ${BACKUP_DIR}`);
  }
}

/**
 * Generar nombre de archivo con timestamp
 */
function generateBackupFilename() {
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/:/g, '-')
    .replace(/\./g, '-')
    .substring(0, 19);
  
  return `backup-${timestamp}.json.gz`;
}

/**
 * Exportar todas las tablas
 */
async function exportAllTables() {
  try {
    console.log('📊 Exportando datos de todas las tablas...');
    
    const backup = {
      metadata: {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        database: 'PostgreSQL (Supabase)',
      },
      data: {
        usuario: await prisma.usuario.findMany(),
        cartaFrutos: await prisma.cartaFrutos.findMany(),
        meta: await prisma.meta.findMany(),
        accion: await prisma.accion.findMany(),
        evidenciaAccion: await prisma.evidenciaAccion.findMany(),
        tarea: await prisma.tarea.findMany(),
        taskInstance: await prisma.taskInstance.findMany(),
        producto: await prisma.producto.findMany(),
        transaccion: await prisma.transaccion.findMany(),
        perfilMentor: await prisma.perfilMentor.findMany(),
        solicitudMentoria: await prisma.solicitudMentoria.findMany(),
        resenasMentoria: await prisma.resenasMentoria.findMany(),
        permisoMenu: await prisma.permisoMenu.findMany(),
        socialReaction: await prisma.socialReaction.findMany(),
        callBooking: await prisma.callBooking.findMany(),
        callAvailability: await prisma.callAvailability.findMany(),
        programEnrollment: await prisma.programEnrollment.findMany(),
        phoenixSession: await prisma.phoenixSession.findMany(),
        vision: await prisma.vision.findMany(),
        visionGameChanger: await prisma.visionGameChanger.findMany(),
        visionParticipante: await prisma.visionParticipante.findMany(),
      }
    };
    
    // Contar registros totales
    let totalRecords = 0;
    for (const [table, records] of Object.entries(backup.data)) {
      const count = records.length;
      totalRecords += count;
      console.log(`   ✓ ${table}: ${count} registros`);
    }
    
    console.log(`   📊 Total: ${totalRecords} registros`);
    
    return backup;
  } catch (error) {
    console.error('❌ Error exportando datos:', error.message);
    throw error;
  }
}

/**
 * Crear backup
 */
async function createBackup(outputPath) {
  try {
    console.log('🔄 Iniciando backup de base de datos...');
    console.log(`📂 Destino: ${outputPath}`);
    console.log('');
    
    // Exportar datos
    const backup = await exportAllTables();
    
    // Convertir a JSON
    const jsonString = JSON.stringify(backup, null, 2);
    
    // Comprimir con gzip
    console.log('');
    console.log('🗜️  Comprimiendo datos...');
    const compressed = gzipSync(jsonString);
    
    // Guardar archivo
    await fs.writeFile(outputPath, compressed);
    
    // Verificar tamaño
    const stats = await fs.stat(outputPath);
    const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    const originalSizeInMB = (jsonString.length / (1024 * 1024)).toFixed(2);
    const compressionRatio = ((1 - stats.size / jsonString.length) * 100).toFixed(1);
    
    console.log(`✅ Backup completado exitosamente`);
    console.log(`📊 Tamaño original: ${originalSizeInMB} MB`);
    console.log(`📊 Tamaño comprimido: ${sizeInMB} MB (${compressionRatio}% de compresión)`);
    console.log(`📁 Ubicación: ${outputPath}`);
    
    return outputPath;
  } catch (error) {
    console.error('❌ Error creando backup:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Limpiar backups antiguos
 */
async function cleanOldBackups() {
  try {
    const files = await fs.readdir(BACKUP_DIR);
    const backupFiles = files
      .filter(f => f.startsWith('backup-') && f.endsWith('.json.gz'))
      .map(f => ({
        name: f,
        path: path.join(BACKUP_DIR, f),
        time: fs.stat(path.join(BACKUP_DIR, f)).then(s => s.mtime)
      }));
    
    if (backupFiles.length === 0) return;
    
    // Resolver todas las promesas de tiempo
    const filesWithTime = await Promise.all(
      backupFiles.map(async f => ({
        ...f,
        time: await f.time
      }))
    );
    
    // Ordenar por fecha (más recientes primero)
    filesWithTime.sort((a, b) => b.time - a.time);
    
    // Eliminar backups antiguos
    if (filesWithTime.length > MAX_BACKUPS) {
      const toDelete = filesWithTime.slice(MAX_BACKUPS);
      
      console.log('');
      console.log(`🗑️  Limpiando backups antiguos (manteniendo ${MAX_BACKUPS})...`);
      
      for (const file of toDelete) {
        await fs.unlink(file.path);
        console.log(`   ✓ Eliminado: ${file.name}`);
      }
    }
  } catch (error) {
    console.warn('⚠️  Error limpiando backups antiguos:', error.message);
  }
}

/**
 * Función principal
 */
async function main() {
  try {
    console.log('🛡️  SISTEMA DE BACKUP AUTOMÁTICO');
    console.log('=' .repeat(50));
    console.log(`📅 Fecha: ${new Date().toLocaleString('es-MX')}`);
    console.log('');
    
    // 1. Asegurar directorio de backups
    await ensureBackupDir();
    
    // 2. Determinar ruta de salida
    const outputPath = customOutput || path.join(BACKUP_DIR, generateBackupFilename());
    
    // 3. Crear backup
    await createBackup(outputPath);
    
    // 4. Limpiar backups antiguos (solo si es backup automático)
    if (!customOutput) {
      await cleanOldBackups();
    }
    
    console.log('');
    console.log('=' .repeat(50));
    console.log('✅ BACKUP COMPLETADO CON ÉXITO');
    console.log('');
    console.log('💡 Para restaurar este backup:');
    console.log(`   node scripts/restore-backup.js ${path.basename(outputPath)}`);
    console.log('');
    
    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('=' .repeat(50));
    console.error('❌ ERROR EN BACKUP');
    console.error('=' .repeat(50));
    console.error(error);
    process.exit(1);
  }
}

// Ejecutar
main();
