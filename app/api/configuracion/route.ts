import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        nombre: true,
        email: true,
        telefono: true,
        rol: true,
        organizationId: true,
        gameChangerId: true,
        profileImage: true,
        birthdate: true
      }
    }) as any;

    if (!usuario) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Obtener perfil completo
    let perfilCompleto = await prisma.perfilCompleto.findUnique({
      where: { usuarioId: usuario.id }
    });

    // Si no existe, crear uno vacío
    if (!perfilCompleto) {
      perfilCompleto = await prisma.perfilCompleto.create({
        data: { 
          usuarioId: usuario.id,
          updatedAt: new Date()
        }
      });
    }

    // Obtener GameChanger si existe
    let gameChangerNombre = '';
    if (usuario.gameChangerId) {
      const gameChanger = await prisma.usuario.findUnique({
        where: { id: usuario.gameChangerId },
        select: { nombre: true }
      });
      gameChangerNombre = gameChanger?.nombre || '';
    }

    // Obtener ángel de enrolamiento desde vision_enrollments
    let angelEnrolamientoNombre = '';
    let tribeLogoUrl = '';
    let tribeMission = '';
    try {
      // Buscar el enrollment más reciente del usuario
      const enrollment = await (prisma as any).vision_enrollments.findFirst({
        where: { userId: usuario.id },
        orderBy: { enrolledAt: 'desc' },
        include: {
          Usuario_vision_enrollments_invitedByToUsuario: {
            select: { nombre: true }
          },
          Vision: {
            select: { tribeLogoUrl: true, tribeMission: true }
          }
        }
      });

      if (enrollment) {
        // Nombre del ángel de enrolamiento
        if (enrollment.Usuario_vision_enrollments_invitedByToUsuario?.nombre) {
          angelEnrolamientoNombre = enrollment.Usuario_vision_enrollments_invitedByToUsuario.nombre;
        }
        // Logo de la tribu desde la visión
        if (enrollment.Vision?.tribeLogoUrl) {
          tribeLogoUrl = enrollment.Vision.tribeLogoUrl;
        }
        // Misión de la tribu desde la visión
        if (enrollment.Vision?.tribeMission) {
          tribeMission = enrollment.Vision.tribeMission;
        }
      }
    } catch (angelError) {
      logger.debug('⚠️ Error obteniendo ángel/logo/misión (no crítico):', angelError);
    }

    // Obtener historial completo de visiones
    let visionesHistorial: Array<{nombre: string, rol: string, fecha: Date}> = [];
    if (usuario.organizationId) {
      try {
        // Mapa para rastrear visiones y sus roles (puede tener múltiples roles)
        const visionesMap = new Map<string, {roles: Array<{rol: string, fecha: Date}>, nombre: string}>();

        // Como participante
        const visionesParticipante = await (prisma as any).visionParticipante.findMany({
          where: { participanteId: usuario.id },
          include: {
            Vision: { select: { nombre: true } }
          },
          orderBy: { createdAt: 'asc' }
        });
        
        visionesParticipante.forEach((vp: any) => {
          if (!visionesMap.has(vp.Vision.nombre)) {
            visionesMap.set(vp.Vision.nombre, { nombre: vp.Vision.nombre, roles: [] });
          }
          visionesMap.get(vp.Vision.nombre)!.roles.push({ rol: 'Participante', fecha: vp.createdAt });
        });

        // Como GameChanger
        const visionesGameChanger = await (prisma as any).visionGameChanger.findMany({
          where: { gameChangerId: usuario.id },
          include: {
            Vision: { select: { nombre: true } }
          },
          orderBy: { createdAt: 'asc' }
        });
        
        visionesGameChanger.forEach((vg: any) => {
          if (!visionesMap.has(vg.Vision.nombre)) {
            visionesMap.set(vg.Vision.nombre, { nombre: vg.Vision.nombre, roles: [] });
          }
          visionesMap.get(vg.Vision.nombre)!.roles.push({ rol: 'GameChanger', fecha: vg.createdAt });
        });

        // Como Mentor
        const visionesMentor = await (prisma as any).visionMentor.findMany({
          where: { mentorId: usuario.id },
          include: {
            Vision: { select: { nombre: true } }
          },
          orderBy: { createdAt: 'asc' }
        });
        
        visionesMentor.forEach((vm: any) => {
          if (!visionesMap.has(vm.Vision.nombre)) {
            visionesMap.set(vm.Vision.nombre, { nombre: vm.Vision.nombre, roles: [] });
          }
          visionesMap.get(vm.Vision.nombre)!.roles.push({ rol: 'Mentor', fecha: vm.createdAt });
        });

        // Como Coordinador (si es SCHOOL_ADMIN de una organización)
        if (usuario.rol === 'SCHOOL_ADMIN') {
          const visionesCoordinador = await (prisma as any).vision.findMany({
            where: { organizationId: usuario.organizationId },
            select: { nombre: true, createdAt: true },
            orderBy: { createdAt: 'asc' }
          });
          
          visionesCoordinador.forEach((vc: any) => {
            if (!visionesMap.has(vc.nombre)) {
              visionesMap.set(vc.nombre, { nombre: vc.nombre, roles: [] });
            }
            visionesMap.get(vc.nombre)!.roles.push({ rol: 'Coordinador', fecha: vc.createdAt });
          });
        }

        // Determinar el rol principal para cada visión basado en el rol del usuario
        const prioridadRoles: Record<string, number> = {
          'GAMECHANGER': { 'GameChanger': 1, 'Mentor': 2, 'Participante': 3, 'Coordinador': 4 },
          'MENTOR': { 'Mentor': 1, 'GameChanger': 2, 'Participante': 3, 'Coordinador': 4 },
          'PARTICIPANTE': { 'Participante': 1, 'GameChanger': 2, 'Mentor': 3, 'Coordinador': 4 },
          'SCHOOL_ADMIN': { 'Coordinador': 1, 'Mentor': 2, 'GameChanger': 3, 'Participante': 4 }
        };

        const prioridades = prioridadRoles[usuario.rol] || prioridadRoles['PARTICIPANTE'];

        visionesMap.forEach((vision) => {
          // Si hay múltiples roles, elegir el de mayor prioridad según el rol del usuario
          let rolSeleccionado = vision.roles[0];
          if (vision.roles.length > 1) {
            rolSeleccionado = vision.roles.reduce((mejor, actual) => {
              const prioridadMejor = prioridades[mejor.rol] || 999;
              const prioridadActual = prioridades[actual.rol] || 999;
              return prioridadActual < prioridadMejor ? actual : mejor;
            });
          }
          
          visionesHistorial.push({
            nombre: vision.nombre,
            rol: rolSeleccionado.rol,
            fecha: rolSeleccionado.fecha
          });
        });

        // Ordenar por fecha
        visionesHistorial.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
        
        logger.debug('✅ Visiones historial encontradas:', visionesHistorial.length);
        logger.debug('📊 Detalles:', visionesHistorial);
        
      } catch (visionError) {
        logger.debug('⚠️ Error cargando visiones (no crítico):', visionError);
      }
    }

    // Obtener lastAvatarChangeDate usando prisma con type assertion
    const usuarioWithDate = await prisma.usuario.findUnique({
      where: { id: usuario.id }
    }) as any;

    // Obtener nombre del negocio si existe (para ocupación)
    let businessName = '';
    try {
      const businessProfile = await prisma.businessProfile.findFirst({
        where: { userId: usuario.id },
        select: { headline: true }
      });
      if (businessProfile?.headline) {
        businessName = businessProfile.headline;
      }
    } catch (e) {
      // Ignorar errores si no hay BusinessProfile
    }

    // Obtener talla de camiseta del voto de encuesta (si existe)
    let tallaVotacion = '';
    try {
      const pollVote = await prisma.tribePollVote.findFirst({
        where: { 
          userId: usuario.id,
          shirtSize: { not: null }
        },
        orderBy: { votedAt: 'desc' },
        select: { shirtSize: true }
      });
      if (pollVote?.shirtSize) {
        tallaVotacion = pollVote.shirtSize;
      }
    } catch (e) {
      logger.debug('⚠️ Error obteniendo talla de votación (no crítico):', e);
    }

    // Construir configuración con valores fallback
    const whatsappFinal = perfilCompleto.whatsapp || usuario.telefono || '';
    const fechaNacimientoFinal = perfilCompleto.fechaNacimiento || usuario.birthdate || null;
    const ocupacionFinal = perfilCompleto.ocupacion || businessName || '';
    // Usar ángel de enrolamiento desde enrollment, fallback a perfilCompleto
    const angelEnrolamientoFinal = angelEnrolamientoNombre || perfilCompleto.angelEnrolamiento || '';
    // Usar logo de tribu desde Vision.tribeLogoUrl, fallback a perfilCompleto
    const logoTribuFinal = tribeLogoUrl || perfilCompleto.logoTribu || '';
    // Usar misión de tribu desde Vision.tribeMission, fallback a perfilCompleto
    const misionTribuFinal = tribeMission || perfilCompleto.misionTribu || '';
    // Usar talla de votación si no tiene talla en perfil
    const tallaCamisetaFinal = perfilCompleto.tallaCamiseta || tallaVotacion || 'M';

    return NextResponse.json({
      success: true,
      configuracion: {
        ...perfilCompleto,
        nombre: usuario.nombre,
        email: usuario.email,
        telefono: usuario.telefono,
        whatsapp: whatsappFinal,
        fechaNacimiento: fechaNacimientoFinal,
        ocupacion: ocupacionFinal,
        angelEnrolamiento: angelEnrolamientoFinal,
        logoTribu: logoTribuFinal,
        misionTribu: misionTribuFinal,
        tallaCamiseta: tallaCamisetaFinal,
        gameChangerNombre
      },
      visionesHistorial: visionesHistorial,
      usuario: {
        email: usuario.email,
        profileImage: usuario.profileImage,
        lastAvatarChangeDate: usuarioWithDate?.lastAvatarChangeDate || null
      }
    });

  } catch (error: any) {
    logger.error('❌ Error en GET /api/configuracion:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al cargar configuración' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, nombre: true }
    });

    if (!usuario) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const body = await req.json();

    // Actualizar nombre del usuario si cambió
    if (body.nombre && body.nombre !== usuario.nombre) {
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { nombre: body.nombre }
      });
    }

    // Actualizar teléfono del usuario si cambió
    if (body.telefono !== undefined) {
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { telefono: body.telefono || null }
      });
    }

    // Preparar datos del perfil completo
    const perfilData = {
      apellido: body.apellido || null,
      fechaNacimiento: body.fechaNacimiento ? new Date(body.fechaNacimiento) : null,
      whatsapp: body.whatsapp || null,
      misionTribu: body.misionTribu || null,
      logoTribu: body.logoTribu || null,
      fraseFavorita: body.fraseFavorita || null,
      angelEnrolamiento: body.angelEnrolamiento || null,
      calle: body.calle || null,
      numero: body.numero || null,
      colonia: body.colonia || null,
      codigoPostal: body.codigoPostal || null,
      estadoMunicipio: body.estadoMunicipio || null,
      ocupacion: body.ocupacion || null,
      tallaCamiseta: body.tallaCamiseta || null,
      peso: body.peso || null,
      imc: body.imc || null,
      estatura: body.estatura || null,
      fotoTicketPeso: body.fotoTicketPeso || null,
      fuma: body.fuma || false,
      fumaCantidad: body.fumaCantidad || null,
      quiereSerStaff: body.quiereSerStaff || false,
      fotoPrimerDia: body.fotoPrimerDia || null,
      fotoUltimoDiaPL: body.fotoUltimoDiaPL || null,
      fotoContrato: body.fotoContrato || null,
      contratoAvanzado: body.contratoAvanzado || null,
      coachBasico: body.coachBasico || null,
      staffBasico: body.staffBasico || null,
      coachAvanzado: body.coachAvanzado || null,
      staffAvanzado: body.staffAvanzado || null,
      coachPrimerFin: body.coachPrimerFin || null,
      coachSegundoFin: body.coachSegundoFin || null,
      coachTercerFin: body.coachTercerFin || null,
      condecoraciones: body.condecoraciones || []
    };

    // Upsert del perfil completo
    const perfilCompleto = await prisma.perfilCompleto.upsert({
      where: { usuarioId: usuario.id },
      update: {
        ...perfilData,
        updatedAt: new Date()
      },
      create: {
        usuarioId: usuario.id,
        ...perfilData,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      perfil: perfilCompleto
    });

  } catch (error: any) {
    logger.error('❌ Error en POST /api/configuracion:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al guardar configuración' },
      { status: 500 }
    );
  }
}
