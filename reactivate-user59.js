const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Script para reactivar/crear enrollment del usuario 59 (Jorge Campos)
 * Si ya completó el pago y el proceso de enrollment, este script lo restaurará
 */

async function reactivateUser59Enrollment() {
  try {
    console.log('🔧 Iniciando reactivación de enrollment para Usuario 59...\n');
    
    // 1. Verificar usuario
    const user = await prisma.usuario.findUnique({
      where: { id: 59 }
    });
    
    if (!user) {
      console.log('❌ Usuario 59 no encontrado');
      return;
    }
    
    console.log('👤 Usuario:', user.nombre, '(', user.email, ')');
    console.log('   Current Subscription Status:', user.subscriptionStatus);
    
    // 2. Buscar enrollments existentes (TODOS)
    const existingEnrollments = await prisma.programEnrollment.findMany({
      where: { userId: 59 }
    });
    
    console.log(`\n📚 Enrollments existentes: ${existingEnrollments.length}`);
    
    if (existingEnrollments.length > 0) {
      console.log('\n¿Qué deseas hacer?');
      console.log('1. Reactivar un enrollment existente (cambiando status a ACTIVE)');
      console.log('2. Crear un nuevo enrollment desde cero');
      console.log('\nEnrollments encontrados:');
      existingEnrollments.forEach((e, idx) => {
        console.log(`   ${idx + 1}. ID: ${e.id}, Status: ${e.status}, Type: ${e.cycleType}, Created: ${e.createdAt}`);
      });
      
      // Para propósitos de este script, vamos a reactivar el más reciente si está INACTIVE
      const latestEnrollment = existingEnrollments[existingEnrollments.length - 1];
      
      if (latestEnrollment.status !== 'ACTIVE') {
        console.log(`\n🔄 Reactivando enrollment ID ${latestEnrollment.id}...`);
        
        const updated = await prisma.programEnrollment.update({
          where: { id: latestEnrollment.id },
          data: {
            status: 'ACTIVE'
          }
        });
        
        console.log('✅ Enrollment reactivado:', updated);
      } else {
        console.log('\n✅ Ya existe un enrollment ACTIVE');
      }
      
    } else {
      console.log('\n⚠️  No hay enrollments. Necesitas proporcionar:');
      console.log('   - mentorId: ID del mentor asignado');
      console.log('   - cycleType: VISION, SOLO, INTENSIVE_17_WEEKS, etc.');
      console.log('   - cycleStartDate: Fecha de inicio');
      console.log('   - cycleEndDate: Fecha de fin');
      console.log('\n💡 Ejemplo para crear un enrollment:');
      console.log('   Modificar este script y descomentar la sección de creación');
      
      // DESCOMENTAR Y MODIFICAR ESTO PARA CREAR UN NUEVO ENROLLMENT:
      /*
      const newEnrollment = await prisma.programEnrollment.create({
        data: {
          userId: 59,
          mentorId: 14, // ID del mentor (cambiar según corresponda)
          cycleType: 'VISION', // o 'SOLO', 'INTENSIVE_17_WEEKS', etc.
          cycleStartDate: new Date('2026-01-02'), // Fecha de inicio
          cycleEndDate: new Date('2026-06-30'), // Fecha de fin
          status: 'ACTIVE',
          totalWeeks: 26, // Calcular según el tipo
          missedCallsCount: 0
        }
      });
      
      console.log('✅ Nuevo enrollment creado:', newEnrollment);
      */
    }
    
    // 3. Verificar/Actualizar subscriptionStatus del usuario
    if (user.subscriptionStatus !== 'ACTIVE') {
      console.log('\n🔄 Actualizando subscriptionStatus a ACTIVE...');
      
      await prisma.usuario.update({
        where: { id: 59 },
        data: {
          subscriptionStatus: 'ACTIVE'
        }
      });
      
      console.log('✅ subscriptionStatus actualizado a ACTIVE');
    }
    
    // 4. Verificar licencia
    const licenses = await prisma.licenseAssignment.findMany({
      where: { userId: 59 }
    });
    
    console.log(`\n🎫 Licencias encontradas: ${licenses.length}`);
    
    if (licenses.length > 0) {
      licenses.forEach((l, idx) => {
        console.log(`   ${idx + 1}. Code: ${l.licenseCode}, Active: ${l.isActive}, Expires: ${l.expiresAt}`);
      });
      
      const activeLicense = licenses.find(l => l.isActive);
      if (!activeLicense) {
        console.log('\n⚠️  Ninguna licencia está activa. Considera activar una.');
      } else {
        console.log('\n✅ Licencia activa encontrada');
      }
    } else {
      console.log('   ⚠️  No hay licencias asignadas');
    }
    
    console.log('\n✅ Proceso completado');
    console.log('\n💡 Próximos pasos:');
    console.log('   1. Verificar que el usuario tenga enrollment ACTIVE');
    console.log('   2. Verificar que tenga licencia activa');
    console.log('   3. Verificar que tenga mentor asignado (si aplica)');
    console.log('   4. Refrescar la página del dashboard');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

reactivateUser59Enrollment();
