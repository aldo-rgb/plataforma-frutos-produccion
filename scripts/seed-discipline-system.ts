/**
 * Script para poblar el sistema de disciplina con datos de prueba
 * 
 * Crea:
 * - 1 Mentor con ventana de disponibilidad (Lunes-Viernes 05:00-08:00)
 * - 3 Alumnos con suscripciones activas
 * - Diferentes estados de vidas (3, 2, 1)
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌅 Iniciando seeding del sistema de disciplina Club 5 AM...\n');

  // 1. Crear o encontrar el mentor
  const mentorEmail = 'mentor.club5am@frutos.com';
  let mentor = await prisma.usuario.findUnique({
    where: { email: mentorEmail }
  });

  if (!mentor) {
    console.log('📝 Creando mentor de prueba...');
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    mentor = await prisma.usuario.create({
      data: {
        nombre: 'Ricardo Martínez',
        email: mentorEmail,
        password: hashedPassword,
        rol: 'MENTOR',
        isActive: true
      }
    });
    console.log(`✅ Mentor creado: ${mentor.nombre} (ID: ${mentor.id})\n`);
  } else {
    console.log(`✅ Mentor encontrado: ${mentor.nombre} (ID: ${mentor.id})\n`);
  }

  // 2. Configurar ventana de disponibilidad del mentor
  console.log('⏰ Configurando ventana de disponibilidad...');
  
  const existingSchedule = await prisma.disciplineSchedule.findUnique({
    where: { mentorId: mentor.id }
  });

  if (!existingSchedule) {
    await prisma.disciplineSchedule.create({
      data: {
        mentorId: mentor.id,
        allowedDays: [1, 2, 3, 4, 5], // Lunes a Viernes
        startTime: '05:00',
        endTime: '08:00',
        isActive: true
      }
    });
    console.log('✅ Ventana configurada: Lunes-Viernes 05:00-08:00\n');
  } else {
    console.log('✅ Ventana ya existe\n');
  }

  // 3. Crear alumnos con diferentes estados
  const alumnos = [
    {
      nombre: 'Aldo 1',
      email: 'aldo1.club5am@frutos.com',
      day1: 1, // Lunes
      time1: '05:15',
      day2: 4, // Jueves
      time2: '05:15',
      missedCalls: 0 // 3 vidas ❤️❤️❤️
    },
    {
      nombre: 'Ana Sofía',
      email: 'ana.sofia@frutos.com',
      day1: 2, // Martes
      time1: '05:30',
      day2: 5, // Viernes
      time2: '05:30',
      missedCalls: 1 // 2 vidas ❤️❤️💔
    },
    {
      nombre: 'Pedro K.',
      email: 'pedro.k@frutos.com',
      day1: 1, // Lunes
      time1: '06:00',
      day2: 3, // Miércoles
      time2: '06:00',
      missedCalls: 2 // 1 vida ❤️💔💔 (EN RIESGO)
    }
  ];

  console.log('👥 Creando alumnos y suscripciones...\n');

  for (const alumnoData of alumnos) {
    // Crear o encontrar alumno
    let alumno = await prisma.usuario.findUnique({
      where: { email: alumnoData.email }
    });

    if (!alumno) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      alumno = await prisma.usuario.create({
        data: {
          nombre: alumnoData.nombre,
          email: alumnoData.email,
          password: hashedPassword,
          rol: 'PARTICIPANTE',
          isActive: true
        }
      });
      console.log(`  ✅ Alumno creado: ${alumno.nombre}`);
    } else {
      console.log(`  ✅ Alumno encontrado: ${alumno.nombre}`);
    }

    // Crear o actualizar suscripción
    const existingSub = await prisma.disciplineSubscription.findUnique({
      where: { studentId: alumno.id }
    });

    if (!existingSub) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 10); // Empezó hace 10 días

      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 120); // 120 días desde el inicio

      await prisma.disciplineSubscription.create({
        data: {
          studentId: alumno.id,
          mentorId: mentor.id,
          day1: alumnoData.day1,
          time1: alumnoData.time1,
          day2: alumnoData.day2,
          time2: alumnoData.time2,
          startDate,
          endDate,
          status: 'ACTIVE',
          missedCallsCount: alumnoData.missedCalls
        }
      });

      const hearts = '❤️'.repeat(3 - alumnoData.missedCalls) + '💔'.repeat(alumnoData.missedCalls);
      const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      
      console.log(`     📅 Horario: ${days[alumnoData.day1]} ${alumnoData.time1} & ${days[alumnoData.day2]} ${alumnoData.time2}`);
      console.log(`     ${hearts} Vidas restantes: ${3 - alumnoData.missedCalls}/3\n`);
    } else {
      console.log(`     ⚠️  Suscripción ya existe\n`);
    }
  }

  console.log('\n✨ Seeding completado exitosamente!\n');
  console.log('📊 Resumen:');
  console.log(`   - 1 mentor con ventana configurada`);
  console.log(`   - ${alumnos.length} alumnos con suscripciones activas`);
  console.log(`   - Sistema listo para probar en /dashboard/mentor\n`);
  
  console.log('🔑 Credenciales de prueba:');
  console.log(`   Mentor: ${mentorEmail} / password123`);
  alumnos.forEach(a => {
    console.log(`   Alumno: ${a.email} / password123`);
  });
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
