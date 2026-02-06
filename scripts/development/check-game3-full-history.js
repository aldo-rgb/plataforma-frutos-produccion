const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllGame3History() {
  try {
    console.log('🔍 Historial completo de game3@quanter.com...\n');
    
    // 1. Usuario base
    const user = await prisma.usuario.findUnique({
      where: { email: 'game3@quanter.com' },
      select: {
        id: true,
        nombre: true,
        email: true,
        organizationId: true,
        createdAt: true,
        updatedAt: true,
        onboardingOrigin: true
      }
    });

    console.log('👤 USUARIO:');
    console.log('   ID:', user.id);
    console.log('   Nombre:', user.nombre);
    console.log('   Email:', user.email);
    console.log('   Org ID:', user.organizationId);
    console.log('   Creado:', user.createdAt);
    console.log('   Actualizado:', user.updatedAt);
    console.log('   Origen:', user.onboardingOrigin);
    console.log('');

    // 2. TODAS las entradas en VisionParticipante (incluso soft-deleted si existen)
    const allParticipaciones = await prisma.$queryRaw`
      SELECT 
        vp."visionId",
        vp."participanteId", 
        vp."asignadoPorId",
        vp."createdAt",
        vp."updatedAt",
        v."nombre" as vision_nombre,
        v."organizationId" as vision_org,
        u."nombre" as asignador_nombre,
        u."email" as asignador_email,
        u."organizationId" as asignador_org
      FROM "VisionParticipante" vp
      LEFT JOIN "Vision" v ON vp."visionId" = v.id
      LEFT JOIN "Usuario" u ON vp."asignadoPorId" = u.id
      WHERE vp."participanteId" = 31
      ORDER BY vp."createdAt" ASC
    `;

    console.log(`📋 HISTORIAL VISIONPARTICIPANTE (${allParticipaciones.length} registros):\n`);
    
    if (allParticipaciones.length === 0) {
      console.log('⚠️ No hay registros en VisionParticipante');
    } else {
      allParticipaciones.forEach((part, i) => {
        console.log(`━━━ Registro ${i + 1} ━━━`);
        console.log('Visión:', part.vision_nombre, `(ID: ${part.visionId})`);
        console.log('  Org de visión:', part.vision_org);
        console.log('Asignado por:', part.asignador_nombre || 'NULL');
        console.log('  Email:', part.asignador_email || 'NULL');
        console.log('  Org:', part.asignador_org || 'NULL');
        console.log('Fechas:');
        console.log('  Creado:', part.createdAt);
        console.log('  Actualizado:', part.updatedAt || 'NULL');
        console.log('');
      });
    }

    // 3. Verificar si existe en Carta (lo que indica que completó onboarding en alguna visión)
    const carta = await prisma.carta.findFirst({
      where: { usuarioId: 31 },
      include: {
        Vision: {
          select: { id: true, nombre: true, organizationId: true }
        }
      }
    });

    console.log('📝 CARTA:');
    if (carta) {
      console.log('   Existe carta: SÍ');
      console.log('   Visión de la carta:', carta.Vision?.nombre);
      console.log('   Visión ID:', carta.visionId);
      console.log('   Org de visión:', carta.Vision?.organizationId);
      console.log('   Fecha creación carta:', carta.createdAt);
    } else {
      console.log('   Existe carta: NO');
    }
    console.log('');

    // 4. Verificar tareas
    const tareas = await prisma.tarea.count({
      where: { usuarioId: 31 }
    });

    console.log('✅ TAREAS:');
    console.log('   Cantidad:', tareas);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllGame3History();
