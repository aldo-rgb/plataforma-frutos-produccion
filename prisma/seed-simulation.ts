/**
 * 🧪 SCRIPT: Simulación de Mentores Realistas
 * 
 * Crea mentores de prueba con historial completo de sesiones, reseñas,
 * transacciones y disciplina para probar el sistema de gamificación.
 * 
 * Ejecución:
 * npx ts-node --compiler-options '{"module":"commonjs"}' prisma/seed-simulation.ts
 */

import { PrismaClient } from '@prisma/client';
import { subDays } from 'date-fns';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Helper para crear historial falso
async function createHistory(
  mentorId: number,
  perfilMentorId: number,
  count: number,
  ratingMin: number,
  ratingMax: number,
  shareResourcesProb: number, // 0.0 a 1.0
  missedProb: number // Probabilidad de falta
) {
  console.log(`   ↳ Generando ${count} sesiones históricas...`);

  // Buscar o crear estudiante genérico
  let student = await prisma.usuario.findFirst({
    where: { email: 'estudiante@test.com' }
  });

  if (!student) {
    const hashedPassword = await bcrypt.hash('password123', 10);
    student = await prisma.usuario.create({
      data: {
        nombre: 'Estudiante Test',
        email: 'estudiante@test.com',
        password: hashedPassword,
        rol: 'PARTICIPANTE',
        isActive: true
      }
    });
  }

  for (let i = 0; i < count; i++) {
    // Fechas en el pasado para que cuenten como historial
    const date = subDays(new Date(), i + 1);

    // Determinar si faltó (Para probar INQUEBRANTABLE)
    // Los últimos 5 (i < 5) forzamos que NO falten para dar la medalla
    const isMissed = i >= 5 && Math.random() < missedProb;
    const status = isMissed ? 'MISSED' : 'COMPLETED';

    // Crear la Reserva (Booking)
    const booking = await prisma.callBooking.create({
      data: {
        mentorId: mentorId,
        studentId: student.id,
        scheduledAt: date,
        status: status,
        type: 'MENTORSHIP',
        duration: 60,
        completedAt: status === 'COMPLETED' ? date : null
      }
    });

    // Crear la Transacción Financiera (Para que sume en Finanzas)
    await prisma.transaction.create({
      data: {
        bookingId: booking.id,
        amountTotal: 1000,
        platformFee: 150,
        mentorEarnings: 850,
        status: 'RELEASED',
        releasedAt: date
      }
    });

    // Crear Solicitud de Mentoría (requerida por ResenasMentoria)
    const servicio = await prisma.servicioMentoria.findFirst({
      where: { perfilMentorId: perfilMentorId }
    });

    if (!servicio) {
      console.log(`   ⚠️  No hay servicio para perfilMentorId ${perfilMentorId}, creando uno...`);
      await prisma.servicioMentoria.create({
        data: {
          perfilMentorId: perfilMentorId,
          tipo: 'SESION_1_1',
          nombre: 'Sesión Individual',
          duracionHoras: 1,
          precioTotal: 1000,
          activo: true
        }
      });
    }

    const servicioFinal = await prisma.servicioMentoria.findFirst({
      where: { perfilMentorId: perfilMentorId }
    });

    const solicitud = await prisma.solicitudMentoria.create({
      data: {
        clienteId: student.id,
        perfilMentorId: perfilMentorId,
        servicioId: servicioFinal!.id,
        estado: 'COMPLETADA',
        fechaSolicitada: date,
        montoTotal: 1000,
        montoPagadoMentor: 850,
        montoPagadoPlataforma: 150
      }
    });

    // Crear la Reseña (Solo si asistió)
    if (status === 'COMPLETED') {
      const rating = Math.floor(Math.random() * (ratingMax - ratingMin + 1)) + ratingMin;
      const shared = Math.random() < shareResourcesProb; // Para medalla ERUDITO

      await prisma.resenasMentoria.create({
        data: {
          solicitudId: solicitud.id,
          clienteId: student.id,
          perfilMentorId: perfilMentorId,
          calificacion: rating,
          comentario: `Reseña simulada ${i}. Excelente sesión.`,
          sharedResources: shared,
          verificadaSesion: true
        }
      });

      // Actualizar stats del perfil mentor
      await prisma.perfilMentor.update({
        where: { id: perfilMentorId },
        data: {
          completedSessionsCount: { increment: 1 },
          ratingSum: { increment: rating },
          ratingCount: { increment: 1 },
          totalResenas: { increment: 1 },
          totalSesiones: { increment: 1 }
        }
      });
    }
  }

  // Calcular calificación promedio final
  const perfil = await prisma.perfilMentor.findUnique({
    where: { id: perfilMentorId },
    select: { ratingSum: true, ratingCount: true }
  });

  if (perfil && perfil.ratingCount > 0 && perfil.ratingSum !== null) {
    const ratingSum = typeof perfil.ratingSum === 'number' ? perfil.ratingSum : Number(perfil.ratingSum);
    const avgRating = ratingSum / perfil.ratingCount;
    await prisma.perfilMentor.update({
      where: { id: perfilMentorId },
      data: { calificacionPromedio: avgRating }
    });
  }
}

async function main() {
  console.log('🧪 =============================================');
  console.log('🧪 INICIANDO SIMULACIÓN DE MENTORES REALISTAS');
  console.log('🧪 =============================================\n');

  const hashedPassword = await bcrypt.hash('password123', 10);

  // --- 1. EL MASTER (EL DIOS DEL SISTEMA) ---
  console.log('👑 Creando MASTER - Dr. Strange Master...');
  let masterUser = await prisma.usuario.findUnique({
    where: { email: 'master@test.com' }
  });

  if (!masterUser) {
    masterUser = await prisma.usuario.create({
      data: {
        email: 'master@test.com',
        nombre: 'Dr. Strange Master',
        password: hashedPassword,
        rol: 'MENTOR',
        isActive: true,
        imagen: 'https://images.unsplash.com/photo-1556157382-97eda2d62296',
        jobTitle: 'Grand Master Strategist',
        experienceYears: 20,
        bioShort: 'El mentor definitivo. Resultados garantizados.',
        bioFull: 'He mentorizado a CEOs de Fortune 500. Mi disciplina es absoluta.',
        skills: ['Estrategia', 'Misticismo', 'Alto Rendimiento'],
        badges: ['INQUEBRANTABLE', 'ERUDITO', 'FLASH', 'ZEN_MASTER', 'CLUB_5AM']
      }
    });
  }

  let masterPerfil = await prisma.perfilMentor.findUnique({
    where: { usuarioId: masterUser.id }
  });

  if (!masterPerfil) {
    masterPerfil = await prisma.perfilMentor.create({
      data: {
        usuarioId: masterUser.id,
        nivel: 'MASTER',
        titulo: 'Grand Master Strategist',
        especialidad: 'Estrategia Empresarial',
        biografiaCorta: 'El mentor definitivo. Resultados garantizados.',
        biografiaCompleta: 'He mentorizado a CEOs de Fortune 500. Mi disciplina es absoluta.',
        experienciaAnios: 20,
        disponible: true,
        destacado: true,
        comisionMentor: 90,
        comisionPlataforma: 10,
        logros: ['100+ CEOs mentoreados', 'Speaker TEDx', 'Best Seller Author'],
        especialidadesSecundarias: ['Liderazgo', 'Finanzas', 'Operaciones']
      }
    });
  }

  // Configurar Horario 5 AM
  const existingSchedule = await prisma.disciplineSchedule.findFirst({
    where: { mentorId: masterUser.id }
  });

  if (!existingSchedule) {
    await prisma.disciplineSchedule.create({
      data: {
        mentorId: masterUser.id,
        allowedDays: [1, 2, 3, 4, 5],
        startTime: '05:00',
        endTime: '08:00',
        updatedAt: new Date()
      }
    });
  }

  // GENERAR HISTORIAL (60 sesiones, Rating 5.0, 90% comparte recursos, 0 faltas recientes)
  await createHistory(masterUser.id, masterPerfil.id, 60, 5, 5, 0.9, 0.0);

  // --- 2. EL SENIOR (EL CONSTANTE) ---
  console.log('\n⭐ Creando SENIOR - Tony Senior Stark...');
  let seniorUser = await prisma.usuario.findUnique({
    where: { email: 'senior@test.com' }
  });

  if (!seniorUser) {
    seniorUser = await prisma.usuario.create({
      data: {
        email: 'senior@test.com',
        nombre: 'Tony Senior Stark',
        password: hashedPassword,
        rol: 'MENTOR',
        isActive: true,
        imagen: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
        jobTitle: 'Tech Lead & Senior Mentor',
        experienceYears: 8,
        bioShort: 'Tecnología y negocios con enfoque práctico.',
        skills: ['Tech', 'Innovation'],
        badges: ['CLUB_5AM', 'INQUEBRANTABLE']
      }
    });
  }

  let seniorPerfil = await prisma.perfilMentor.findUnique({
    where: { usuarioId: seniorUser.id }
  });

  if (!seniorPerfil) {
    seniorPerfil = await prisma.perfilMentor.create({
      data: {
        usuarioId: seniorUser.id,
        nivel: 'SENIOR',
        titulo: 'Tech Lead & Senior Mentor',
        especialidad: 'Tecnología e Innovación',
        biografiaCorta: 'Tecnología y negocios con enfoque práctico.',
        biografiaCompleta: 'Experto en transformación digital y liderazgo técnico.',
        experienciaAnios: 8,
        disponible: true,
        destacado: false,
        comisionMentor: 85,
        comisionPlataforma: 15,
        logros: ['CTO en 3 startups', 'Patent holder', 'Tech conference speaker'],
        especialidadesSecundarias: ['Startups', 'Product Management']
      }
    });
  }

  // Configurar Horario 5 AM
  const existingScheduleSenior = await prisma.disciplineSchedule.findFirst({
    where: { mentorId: seniorUser.id }
  });

  if (!existingScheduleSenior) {
    await prisma.disciplineSchedule.create({
      data: {
        mentorId: seniorUser.id,
        allowedDays: [1, 3, 5],
        startTime: '05:00',
        endTime: '08:00',
        updatedAt: new Date()
      }
    });
  }

  // GENERAR HISTORIAL (25 sesiones, Rating 4-5, 40% comparte recursos)
  await createHistory(seniorUser.id, seniorPerfil.id, 25, 4, 5, 0.4, 0.1);

  // --- 3. EL JUNIOR (EL NOVATO) ---
  console.log('\n🌱 Creando JUNIOR - Peter Junior Parker...');
  let juniorUser = await prisma.usuario.findUnique({
    where: { email: 'junior@test.com' }
  });

  if (!juniorUser) {
    juniorUser = await prisma.usuario.create({
      data: {
        email: 'junior@test.com',
        nombre: 'Peter Junior Parker',
        password: hashedPassword,
        rol: 'MENTOR',
        isActive: true,
        imagen: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e',
        jobTitle: 'Junior Growth Hacker',
        experienceYears: 2,
        bioShort: 'Aprendiendo y enseñando con mucha energía.',
        skills: ['Social Media', 'Hustle'],
        badges: []
      }
    });
  }

  let juniorPerfil = await prisma.perfilMentor.findUnique({
    where: { usuarioId: juniorUser.id }
  });

  if (!juniorPerfil) {
    juniorPerfil = await prisma.perfilMentor.create({
      data: {
        usuarioId: juniorUser.id,
        nivel: 'JUNIOR',
        titulo: 'Junior Growth Hacker',
        especialidad: 'Marketing Digital',
        biografiaCorta: 'Aprendiendo y enseñando con mucha energía.',
        biografiaCompleta: 'Entusiasta del crecimiento digital con enfoque en redes sociales.',
        experienciaAnios: 2,
        disponible: true,
        destacado: false,
        comisionMentor: 70,
        comisionPlataforma: 30,
        logros: ['Viralizó 3 campañas', '100K+ followers generados'],
        especialidadesSecundarias: ['Instagram', 'TikTok']
      }
    });
  }

  // JUNIOR NO TIENE CLUB 5 AM (Empieza a las 9)
  const existingScheduleJunior = await prisma.disciplineSchedule.findFirst({
    where: { mentorId: juniorUser.id }
  });

  if (!existingScheduleJunior) {
    await prisma.disciplineSchedule.create({
      data: {
        mentorId: juniorUser.id,
        allowedDays: [1, 2],
        startTime: '09:00',
        endTime: '12:00',
        updatedAt: new Date()
      }
    });
  }

  // GENERAR HISTORIAL (5 sesiones, Rating variable)
  await createHistory(juniorUser.id, juniorPerfil.id, 5, 3, 5, 0.2, 0.0);

  console.log('\n✅ =============================================');
  console.log('✅ ¡SIMULACIÓN COMPLETA!');
  console.log('✅ =============================================\n');
  console.log('📊 MENTORES CREADOS:');
  console.log('   👑 MASTER: master@test.com (60 sesiones, 5.0★, 5 badges)');
  console.log('   ⭐ SENIOR: senior@test.com (25 sesiones, 4-5★, 2 badges)');
  console.log('   🌱 JUNIOR: junior@test.com (5 sesiones, 3-5★, 0 badges)');
  console.log('\n💡 Contraseña para todos: password123');
  console.log('💡 Ejecuta el sistema de badges para actualizar:');
  console.log('   npx ts-node --compiler-options \'{"module":"commonjs"}\' lib/badgeSystem.ts\n');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
