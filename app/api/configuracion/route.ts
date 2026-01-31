import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
        profileImage: true
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
        
        console.log('✅ Visiones historial encontradas:', visionesHistorial.length);
        console.log('📊 Detalles:', visionesHistorial);
        
      } catch (visionError) {
        console.log('⚠️ Error cargando visiones (no crítico):', visionError);
      }
    }

    // Obtener lastAvatarChangeDate usando prisma con type assertion
    const usuarioWithDate = await prisma.usuario.findUnique({
      where: { id: usuario.id }
    }) as any;

    return NextResponse.json({
      success: true,
      configuracion: {
        ...perfilCompleto,
        nombre: usuario.nombre,
        email: usuario.email,
        telefono: usuario.telefono,
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
    console.error('❌ Error en GET /api/configuracion:', error);
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
    console.error('❌ Error en POST /api/configuracion:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al guardar configuración' },
      { status: 500 }
    );
  }
}
