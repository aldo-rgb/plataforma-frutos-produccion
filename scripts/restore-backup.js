#!/usr/bin/env node

/**
 * SISTEMA DE RESTAURACIÓN DE BACKUPS (Supabase Compatible)
 * 
 * Este script permite restaurar un backup JSON comprimido
 * 
 * Uso:
 *   node scripts/restore-backup.js                    # Muestra backups disponibles
 *   node scripts/restore-backup.js backup-xxx.json.gz # Restaura un backup específico
 *   node scripts/restore-backup.js --latest           # Restaura el backup más reciente
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');
const { gunzipSync } = require('zlib');

const prisma = new PrismaClient();
const BACKUP_DIR = path.join(__dirname, '../backups');

/**
 * Listar backups disponibles
 */
async function listBackups() {
  try {
    const files = await fs.readdir(BACKUP_DIR);
    const backupFiles = files.filter(f => f.startsWith('backup-') && f.endsWith('.json.gz'));
    
    if (backupFiles.length === 0) {
      console.log('⚠️  No se encontraron backups disponibles');
      console.log(`📁 Directorio: ${BACKUP_DIR}`);
      return [];
    }
    
    // Obtener info de cada backup
    const backupsInfo = await Promise.all(
      backupFiles.map(async (filename) => {
        const filePath = path.join(BACKUP_DIR, filename);
        const stats = await fs.stat(filePath);
        
        return {
          filename,
          path: filePath,
          size: stats.size,
          date: stats.mtime
        };
      })
    );
    
    // Ordenar por fecha (más recientes primero)
    backupsInfo.sort((a, b) => b.date - a.date);
    
    return backupsInfo;
  } catch (error) {
    console.error('❌ Error listando backups:', error.message);
    return [];
  }
}

/**
 * Mostrar backups disponibles
 */
async function showBackups() {
  console.log('📦 BACKUPS DISPONIBLES');
  console.log('='.repeat(80));
  console.log('');
  
  const backups = await listBackups();
  
  if (backups.length === 0) {
    return null;
  }
  
  backups.forEach((backup, index) => {
    const sizeInMB = (backup.size / (1024 * 1024)).toFixed(2);
    const date = backup.date.toLocaleString('es-MX');
    const isLatest = index === 0 ? ' 🟢 (más reciente)' : '';
    
    console.log(`${index + 1}. ${backup.filename}${isLatest}`);
    console.log(`   📅 Fecha: ${date}`);
    console.log(`   📊 Tamaño: ${sizeInMB} MB`);
    console.log('');
  });
  
  return backups;
}

/**
 * Confirmar restauración
 */
async function confirmRestore(backupFilename) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    console.log('⚠️  ADVERTENCIA: Esta acción SOBRESCRIBIRÁ todos los datos actuales');
    console.log('');
    rl.question(`¿Confirmas que deseas restaurar "${backupFilename}"? (escribe "CONFIRMAR"): `, (answer) => {
      rl.close();
      resolve(answer.trim() === 'CONFIRMAR');
    });
  });
}

/**
 * Restaurar datos en la base de datos
 */
async function restoreData(backup) {
  console.log('🔄 Restaurando datos...');
  console.log('');
  
  try {
    // Orden de restauración (respetando foreign keys)
    const restoreOrder = [
      { name: 'usuario', model: 'usuario' },
      { name: 'perfilMentor', model: 'perfilMentor' },
      { name: 'cartaFrutos', model: 'cartaFrutos' },
      { name: 'meta', model: 'meta' },
      { name: 'accion', model: 'accion' },
      { name: 'evidenciaAccion', model: 'evidenciaAccion' },
      { name: 'tarea', model: 'tarea' },
      { name: 'taskInstance', model: 'taskInstance' },
      { name: 'producto', model: 'producto' },
      { name: 'transaccion', model: 'transaccion' },
      { name: 'solicitudMentoria', model: 'solicitudMentoria' },
      { name: 'resenasMentoria', model: 'resenasMentoria' },
      { name: 'permisoMenu', model: 'permisoMenu' },
      { name: 'socialReaction', model: 'socialReaction' },
      { name: 'callBooking', model: 'callBooking' },
      { name: 'callAvailability', model: 'callAvailability' },
      { name: 'programEnrollment', model: 'programEnrollment' },
      { name: 'phoenixSession', model: 'phoenixSession' },
      { name: 'vision', model: 'vision' },
      { name: 'visionGameChanger', model: 'visionGameChanger' },
      { name: 'visionParticipante', model: 'visionParticipante' },
    ];
    
    let totalRestored = 0;
    
    for (const { name, model } of restoreOrder) {
      if (!backup.data[name]) continue;
      
      const records = backup.data[name];
      if (records.length === 0) {
        console.log(`   ⊘ ${name}: 0 registros (omitiendo)`);
        continue;
      }
      
      try {
        // Limpiar tabla existente
        await prisma[model].deleteMany({});
        
        // Insertar nuevos datos
        await prisma[model].createMany({
          data: records,
          skipDuplicates: true
        });
        
        console.log(`   ✓ ${name}: ${records.length} registros restaurados`);
        totalRestored += records.length;
      } catch (error) {
        console.error(`   ✗ ${name}: Error - ${error.message}`);
      }
    }
    
    console.log('');
    console.log(`📊 Total restaurado: ${totalRestored} registros`);
    
    return true;
  } catch (error) {
    console.error('❌ Error restaurando datos:', error.message);
    throw error;
  }
}

/**
 * Restaurar backup
 */
async function restoreBackup(backupPath) {
  try {
    console.log('');
    console.log('🔄 Iniciando restauración...');
    console.log('='.repeat(80));
    console.log('');
    
    // Leer archivo comprimido
    console.log('📂 Leyendo archivo de backup...');
    const compressed = await fs.readFile(backupPath);
    
    // Descomprimir
    console.log('🗜️  Descomprimiendo datos...');
    const jsonString = gunzipSync(compressed).toString('utf-8');
    const backup = JSON.parse(jsonString);
    
    console.log(`✓ Backup cargado: versión ${backup.metadata.version}`);
    console.log(`✓ Fecha del backup: ${new Date(backup.metadata.timestamp).toLocaleString('es-MX')}`);
    console.log('');
    
    // Crear backup de seguridad antes de restaurar
    console.log('📦 Creando backup de seguridad...');
    const { execSync } = require('child_process');
    try {
      execSync('node scripts/backup-database.js --output=./backups/pre-restore-backup.json.gz', {
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit'
      });
      console.log('✅ Backup de seguridad creado');
    } catch (error) {
      console.warn('⚠️  No se pudo crear backup de seguridad');
    }
    console.log('');
    
    // Restaurar datos
    await restoreData(backup);
    
    console.log('');
    console.log('='.repeat(80));
    console.log('✅ RESTAURACIÓN COMPLETADA CON ÉXITO');
    console.log('='.repeat(80));
    console.log('');
    console.log('💡 Recuerda:');
    console.log('   - Reiniciar el servidor si está corriendo');
    console.log('   - Verificar que los datos se restauraron correctamente');
    console.log('');
    
    return true;
  } catch (error) {
    console.error('');
    console.error('❌ ERROR EN LA RESTAURACIÓN:', error.message);
    console.error('');
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Función principal
 */
async function main() {
  const args = process.argv.slice(2);
  
  console.log('🔙 SISTEMA DE RESTAURACIÓN DE BACKUPS');
  console.log('='.repeat(80));
  console.log('');
  
  // Si no hay argumentos, mostrar backups disponibles
  if (args.length === 0) {
    await showBackups();
    console.log('💡 Para restaurar un backup:');
    console.log('   node scripts/restore-backup.js backup-xxx.json.gz');
    console.log('   node scripts/restore-backup.js --latest');
    console.log('');
    return;
  }
  
  // Determinar qué backup restaurar
  let backupToRestore;
  
  if (args[0] === '--latest') {
    const backups = await listBackups();
    if (backups.length === 0) {
      console.error('❌ No hay backups disponibles');
      process.exit(1);
    }
    backupToRestore = backups[0];
    console.log(`📦 Backup seleccionado: ${backupToRestore.filename} (más reciente)`);
  } else {
    const filename = args[0];
    const backupPath = path.join(BACKUP_DIR, filename);
    
    try {
      const stats = await fs.stat(backupPath);
      backupToRestore = {
        filename,
        path: backupPath,
        size: stats.size,
        date: stats.mtime
      };
    } catch (error) {
      console.error(`❌ Backup no encontrado: ${filename}`);
      console.error(`📁 Buscar en: ${BACKUP_DIR}`);
      process.exit(1);
    }
  }
  
  // Mostrar info del backup
  const sizeInMB = (backupToRestore.size / (1024 * 1024)).toFixed(2);
  console.log(`📅 Fecha: ${backupToRestore.date.toLocaleString('es-MX')}`);
  console.log(`📊 Tamaño: ${sizeInMB} MB`);
  console.log('');
  
  // Confirmar restauración
  const confirmed = await confirmRestore(backupToRestore.filename);
  
  if (!confirmed) {
    console.log('');
    console.log('❌ Restauración cancelada por el usuario');
    process.exit(0);
  }
  
  // Ejecutar restauración
  const success = await restoreBackup(backupToRestore.path);
  
  process.exit(success ? 0 : 1);
}

// Ejecutar
main().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
