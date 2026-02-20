// API para obtener participantes de una visión con sus contratos para manteles
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET - Obtener participantes con contratos
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ visionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['SCHOOL_ADMIN', 'ADMINISTRADOR', 'COORDINADOR'].includes(session.user.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { visionId } = await params;
    const visionIdNum = parseInt(visionId);

    // Obtener la visión
    const vision = await prisma.vision.findUnique({
      where: { id: visionIdNum },
      select: { id: true, nombre: true }
    });

    if (!vision) {
      return NextResponse.json({ error: 'Visión no encontrada' }, { status: 404 });
    }

    // Obtener enrollments con asistencia PL confirmada
    const enrollments = await prisma.vision_enrollments.findMany({
      where: {
        visionId: visionIdNum,
        level: 'PL',
        attendanceStatus: 'ATTENDED'
      },
      include: {
        Usuario: {
          select: {
            id: true,
            nombre: true,
            contrato: true
          }
        }
      },
      orderBy: {
        Usuario: {
          nombre: 'asc'
        }
      }
    });

    // Formatear datos para la tabla de validación
    const participants = enrollments.map(e => {
      const fullName = e.Usuario.nombre || '';
      const firstName = fullName.split(' ')[0];
      
      return {
        id: e.id,
        odiseoId: e.odiseoId,
        fullName,
        firstName,
        displayName: firstName, // Editable por el coordinador
        contract: e.Usuario.contrato || '',
        hasContract: !!e.Usuario.contrato && e.Usuario.contrato.trim().length > 0,
        status: (!!e.Usuario.contrato && e.Usuario.contrato.trim().length > 0) ? 'ready' : 'missing'
      };
    });

    return NextResponse.json({
      vision,
      participants,
      totalParticipants: participants.length,
      readyCount: participants.filter(p => p.hasContract).length,
      missingCount: participants.filter(p => !p.hasContract).length
    });
  } catch (error) {
    console.error('Error getting participants:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// PATCH - Actualizar contrato de un participante
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ visionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['SCHOOL_ADMIN', 'ADMINISTRADOR', 'COORDINADOR'].includes(session.user.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { odiseoId, contract, displayName } = await request.json();

    if (!odiseoId) {
      return NextResponse.json({ error: 'odiseoId requerido' }, { status: 400 });
    }

    // Actualizar contrato si se proporciona
    if (contract !== undefined) {
      await prisma.usuario.update({
        where: { id: odiseoId },
        data: { contrato: contract }
      });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Actualizado correctamente'
    });
  } catch (error) {
    console.error('Error updating participant:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
