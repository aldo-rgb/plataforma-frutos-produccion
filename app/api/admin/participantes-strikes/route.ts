import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Verificar que el usuario es admin, director o coordinador
    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id }
    });

    if (!usuario || !['ADMINISTRADOR', 'SCHOOL_ADMIN', 'COORDINADOR'].includes(usuario.rol)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    // Obtener todos los participantes con enrollment activo
    const participantes = await prisma.usuario.findMany({
      where: {
        rol: 'PARTICIPANTE',
        isActive: true,
        ProgramEnrollment_ProgramEnrollment_userIdToUsuario: {
          some: {
            OR: [
              { status: 'ACTIVE' },
              { status: 'SUSPENDED' }
            ]
          }
        }
      },
      include: {
        ProgramEnrollment_ProgramEnrollment_userIdToUsuario: {
          where: {
            OR: [
              { status: 'ACTIVE' },
              { status: 'SUSPENDED' }
            ]
          },
          include: {
            Usuario_ProgramEnrollment_mentorIdToUsuario: {
              select: {
                nombre: true,
                email: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    // Formatear respuesta
    const participantesFormateados = participantes
      .filter(p => p.ProgramEnrollment_ProgramEnrollment_userIdToUsuario.length > 0)
      .map(participante => {
        const enrollment = participante.ProgramEnrollment_ProgramEnrollment_userIdToUsuario[0];
        
        return {
          id: participante.id,
          nombre: participante.nombre || 'Sin nombre',
          email: participante.email,
          profileImage: participante.profileImage,
          enrollment: {
            id: enrollment.id,
            missedCallsCount: enrollment.missedCallsCount || 0,
            maxMissedAllowed: enrollment.maxMissedAllowed || 3,
            status: enrollment.status,
            extraLifeUsed: enrollment.extraLifeUsed || false,
            extraLifeGrantedBy: enrollment.extraLifeGrantedBy,
            extraLifeGrantedAt: enrollment.extraLifeGrantedAt
          },
          mentor: enrollment.Usuario_ProgramEnrollment_mentorIdToUsuario ? {
            nombre: enrollment.Usuario_ProgramEnrollment_mentorIdToUsuario.nombre || 'Sin nombre',
            email: enrollment.Usuario_ProgramEnrollment_mentorIdToUsuario.email
          } : null
        };
      });

    return NextResponse.json({
      success: true,
      participantes: participantesFormateados
    });

  } catch (error) {
    console.error('Error obteniendo participantes:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Error obteniendo participantes' 
    }, { status: 500 });
  }
}
