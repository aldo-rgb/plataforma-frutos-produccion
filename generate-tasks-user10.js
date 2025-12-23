/**
 * Script de emergencia para generar tareas de Usuario 10
 * Carta #15 ya está APROBADA pero no tiene TaskInstances
 */

const { execSync } = require('child_process');

console.log('🚀 GENERACIÓN DE TAREAS - Usuario 10 (Carta #15)');
console.log('================================================\n');

// Construir el script TypeScript inline
const script = `
import { prisma } from './lib/prisma';
import { generateTasksForLetter } from './lib/taskGenerator';

async function main() {
  const cartaId = 15;
  
  console.log('📋 Verificando carta...');
  const carta = await prisma.cartaFrutos.findUnique({
    where: { id: cartaId },
    include: { Usuario: { select: { nombre: true } } }
  });
  
  if (!carta) {
    console.error('❌ Carta no encontrada');
    process.exit(1);
  }
  
  console.log(\`✅ Carta encontrada: \${carta.Usuario.nombre}\`);
  console.log(\`   Estado: \${carta.estado}\`);
  
  const existingTasks = await prisma.taskInstance.count({
    where: { usuarioId: carta.usuarioId }
  });
  
  console.log(\`   Tareas existentes: \${existingTasks}\`);
  
  if (existingTasks > 0) {
    console.log('⚠️  Ya existen tareas. Saliendo...');
    process.exit(0);
  }
  
  console.log('\\n🚀 Iniciando generación de tareas...');
  const result = await generateTasksForLetter(cartaId);
  
  if (result.success) {
    console.log(\`\\n✅ ¡ÉXITO! Se generaron \${result.tasksCreated} tareas\`);
    
    // Verificar
    const tasksAfter = await prisma.taskInstance.count({
      where: { usuarioId: carta.usuarioId }
    });
    console.log(\`✅ Verificación: \${tasksAfter} tareas en base de datos\`);
  } else {
    console.error('❌ Error:', result.errors);
    process.exit(1);
  }
}

main().catch(console.error).finally(() => process.exit(0));
`;

// Guardar script temporal y ejecutar con tsx
const fs = require('fs');
const path = require('path');
const tmpFile = path.join(__dirname, '.tmp-generate-tasks.ts');

fs.writeFileSync(tmpFile, script);

try {
  console.log('Ejecutando generador...\n');
  execSync(`npx tsx ${tmpFile}`, { stdio: 'inherit' });
} catch (error) {
  console.error('Error ejecutando script:', error.message);
} finally {
  // Limpiar archivo temporal
  if (fs.existsSync(tmpFile)) {
    fs.unlinkSync(tmpFile);
  }
}
