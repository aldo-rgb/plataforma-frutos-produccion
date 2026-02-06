#!/usr/bin/env node

/**
 * Script para limpiar console.log/error/warn de APIs
 * 
 * IMPORTANTE: Este script NO modifica la base de datos
 * Solo reemplaza console.* por logger.* en el código fuente
 * 
 * Uso: 
 *   node scripts/clean-console-logs.js --dry-run  (ver cambios sin aplicar)
 *   node scripts/clean-console-logs.js            (aplicar cambios)
 */

const fs = require('fs');
const path = require('path');

const API_DIR = path.join(__dirname, '..', 'app', 'api');
const DRY_RUN = process.argv.includes('--dry-run');

const LOGGER_IMPORT = "import logger from '@/lib/logger';";

function getAllTsFiles(dir, files = []) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        getAllTsFiles(fullPath, files);
      } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
        files.push(fullPath);
      }
    }
  } catch (e) {
    // Ignorar errores de acceso
  }
  
  return files;
}

function hasConsoleStatements(content) {
  return /console\.(log|error|warn|info|debug)\s*\(/g.test(content);
}

function hasLoggerImport(content) {
  return content.includes("import logger from '@/lib/logger'") || 
         content.includes('import logger from "@/lib/logger"') ||
         content.includes("import { logger }") ||
         content.includes("from '@/lib/logger'");
}

function addLoggerImport(content) {
  // Buscar la última línea de import
  const lines = content.split('\n');
  let lastImportIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ')) {
      lastImportIndex = i;
    }
  }
  
  if (lastImportIndex >= 0) {
    lines.splice(lastImportIndex + 1, 0, LOGGER_IMPORT);
    return lines.join('\n');
  } else {
    // No hay imports, agregar al inicio
    return LOGGER_IMPORT + '\n' + content;
  }
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;
  
  if (!hasConsoleStatements(content)) {
    return { changed: false, file: filePath };
  }
  
  let changeCount = 0;
  
  // Reemplazar console.log -> logger.debug
  const logMatches = content.match(/console\.log\s*\(/g);
  if (logMatches) {
    changeCount += logMatches.length;
    content = content.replace(/console\.log\s*\(/g, 'logger.debug(');
  }
  
  // Reemplazar console.error -> logger.error
  const errorMatches = content.match(/console\.error\s*\(/g);
  if (errorMatches) {
    changeCount += errorMatches.length;
    content = content.replace(/console\.error\s*\(/g, 'logger.error(');
  }
  
  // Reemplazar console.warn -> logger.warn
  const warnMatches = content.match(/console\.warn\s*\(/g);
  if (warnMatches) {
    changeCount += warnMatches.length;
    content = content.replace(/console\.warn\s*\(/g, 'logger.warn(');
  }
  
  // Reemplazar console.info -> logger.info
  const infoMatches = content.match(/console\.info\s*\(/g);
  if (infoMatches) {
    changeCount += infoMatches.length;
    content = content.replace(/console\.info\s*\(/g, 'logger.info(');
  }
  
  // Agregar import si es necesario
  if (changeCount > 0 && !hasLoggerImport(content)) {
    content = addLoggerImport(content);
  }
  
  if (content !== originalContent) {
    if (!DRY_RUN) {
      fs.writeFileSync(filePath, content, 'utf-8');
    }
    return { 
      changed: true, 
      file: filePath, 
      changes: changeCount,
      relativePath: path.relative(path.join(__dirname, '..'), filePath)
    };
  }
  
  return { changed: false, file: filePath };
}

function main() {
  console.log('🔍 Buscando archivos en app/api/...');
  console.log(DRY_RUN ? '🏃 Modo DRY RUN - No se aplicarán cambios\n' : '⚡ Modo REAL - Se aplicarán cambios\n');
  
  const files = getAllTsFiles(API_DIR);
  console.log(`📁 Encontrados ${files.length} archivos TypeScript\n`);
  
  const results = [];
  
  for (const file of files) {
    const result = processFile(file);
    if (result.changed) {
      results.push(result);
      console.log(`  ✅ ${result.relativePath} (${result.changes} cambios)`);
    }
  }
  
  console.log('\n📊 Resumen:');
  console.log(`  - Archivos analizados: ${files.length}`);
  console.log(`  - Archivos modificados: ${results.length}`);
  console.log(`  - Total de console.* reemplazados: ${results.reduce((sum, r) => sum + r.changes, 0)}`);
  
  if (DRY_RUN) {
    console.log('\n💡 Ejecuta sin --dry-run para aplicar los cambios');
  } else {
    console.log('\n✅ Cambios aplicados correctamente');
  }
}

main();
