import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * API para obtener el staff de una organización
 * Solo accesible por usuarios de la misma organización
 */

export async function GET(
  request: Request,
  { params }: { params: Promise<{ organizationId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { organizationId } = await params;
    const orgId = parseInt(organizationId);

    if (isNaN(orgId)) {
      return NextResponse.json(
        { error: 'ID de organización inválido' },
        { status: 400 }
      );
    }

    // Verificar que el usuario pertenece a la organización
    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { organizationId: true, rol: true }
    });

    const isAdmin = usuario?.rol && ['ADMIN', 'ADMINISTRADOR'].includes(usuario.rol);
    
    if (!isAdmin && usuario?.organizationId !== orgId) {
      return NextResponse.json(
        { error: 'No tienes acceso a esta organización' },
        { status: 403 }
      );
    }

    // Obtener staff de la organización (Trainers, Coordinadores, Game Changers, Mentores)
    // Incluye tanto usuarios directos como los asignados a visiones de la org
    
    // 1. Staff directo de la organización por rol
    const staffDirecto = await prisma.usuario.findMany({
      where: {
        organizationId: orgId,
        rol: {
          in: ['TRAINER', 'COORDINADOR', 'GAMECHANGER', 'MENTOR', 'LIDER']
        }
      },
      select: {
        id: true,
        nombre: true,
        rol: true
      }
    });

    // 2. Coordinadores de visiones de la organización
    const visiones = await prisma.vision.findMany({
      where: { organizationId: orgId },
      select: {
        coordinadorId: true,
        Usuario: {
          select: { id: true, nombre: true, rol: true }
        }
      }
    });

    // 3. Staff (Trainers y Coordinadores) asignados a visiones via VisionStaff
    const visionStaff = await prisma.visionStaff.findMany({
      where: {
        Vision: { organizationId: orgId }
      },
      select: {
        role: true, // BASIC_TRAINER, ADVANCED_TRAINER, PL_TRAINER, BASIC_COORDINATOR, etc.
        Usuario_VisionStaff_userIdToUsuario: {
          select: { id: true, nombre: true, rol: true }
        }
      }
    });

    // 4. Game Changers asignados a visiones de la organización
    const gameChangers = await prisma.visionGameChanger.findMany({
      where: {
        Vision: { organizationId: orgId }
      },
      select: {
        Usuario_VisionGameChanger_gameChangerIdToUsuario: {
          select: { id: true, nombre: true, rol: true }
        }
      }
    });

    // 5. Mentores asignados a visiones de la organización
    const mentores = await prisma.visionMentor.findMany({
      where: {
        Vision: { organizationId: orgId }
      },
      select: {
        Usuario_VisionMentor_mentorIdToUsuario: {
          select: { id: true, nombre: true, rol: true }
        }
      }
    });

    // Combinar todos los staff únicos
    const staffMap = new Map<number, { id: number; nombre: string; rol: string }>();
    
    // Agregar staff directo
    staffDirecto.forEach(s => staffMap.set(s.id, s));
    
    // Agregar coordinadores de visiones
    visiones.forEach(v => {
      if (v.Usuario) staffMap.set(v.Usuario.id, { ...v.Usuario, rol: 'COORDINADOR' });
    });
    
    // Agregar staff de visiones (trainers y coordinadores de VisionStaff)
    visionStaff.forEach(vs => {
      const user = vs.Usuario_VisionStaff_userIdToUsuario;
      if (user) {
        // Determinar si es TRAINER o COORDINADOR basándose en el role de VisionStaff
        const visionRole = vs.role || '';
        let rolParaReporte = user.rol || 'TRAINER';
        
        if (visionRole.includes('TRAINER')) {
          rolParaReporte = 'TRAINER';
        } else if (visionRole.includes('COORDINATOR')) {
          rolParaReporte = 'COORDINADOR';
        }
        
        staffMap.set(user.id, { ...user, rol: rolParaReporte });
      }
    });
    
    // Agregar game changers (siempre marcar como GAMECHANGER para el filtro)
    gameChangers.forEach(gc => {
      const user = gc.Usuario_VisionGameChanger_gameChangerIdToUsuario;
      if (user) staffMap.set(user.id, { ...user, rol: 'GAMECHANGER' });
    });

    // Agregar mentores (siempre marcar como MENTOR para el filtro)
    mentores.forEach(m => {
      const user = m.Usuario_VisionMentor_mentorIdToUsuario;
      if (user) staffMap.set(user.id, { ...user, rol: 'MENTOR' });
    });

    const staff = Array.from(staffMap.values()).sort((a, b) => {
      // Ordenar por rol y luego por nombre
      if (a.rol !== b.rol) return a.rol.localeCompare(b.rol);
      return a.nombre.localeCompare(b.nombre);
    });

    console.log(`📋 Staff encontrado para org ${orgId}:`, staff.length, staff.map(s => `${s.nombre} (${s.rol})`));

    return NextResponse.json({ 
      staff,
      total: staff.length 
    });

  } catch (error) {
    console.error('❌ Error al obtener staff:', error);
    return NextResponse.json(
      { error: 'Error al cargar el staff' },
      { status: 500 }
    );
  }
}
