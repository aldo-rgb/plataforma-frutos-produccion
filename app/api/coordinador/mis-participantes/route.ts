import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const coordinador = await prisma.usuario.findUnique({
      where: { email: session.user.email }
    });

    if (!coordinador || coordinador.rol !== 'COORDINADOR') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Obtener visiones del coordinador
    let visionesWhere: any = {};
    
    if (coordinador.organizationId) {
      visionesWhere.organizationId = coordinador.organizationId;
    } else {
      visionesWhere.coordinadorId = coordinador.id;
    }

    const visiones = await prisma.vision.findMany({
      where: visionesWhere,
      include: {
        Enrollments: {
          where: {
            Usuario: {
              rol: {
                in: ['PARTICIPANTE', 'GAMECHANGER']
              }
            }
          },
          include: {
            Usuario: {
              select: {
                id: true,
                nombre: true,
                email: true,
                puntosCultivo: true,
                puntosQuantum: true,
                xp: true,
                racha: true,
                tier: true
              }
            }
          }
        }
      }
    });

    // Organizar por visión y calcular ranking
    const visionesConParticipantes = visiones.map(vision => {
      const participantes = vision.Enrollments
        .map(e => e.Usuario)
        .sort((a, b) => b.puntosCultivo - a.puntosCultivo)
        .map((p, index) => ({
          id: p.id,
          nombre: p.nombre,
          email: p.email,
          puntosCultivo: p.puntosCultivo,
          puntosQuantum: p.puntosQuantum,
          xp: p.xp,
          racha: p.racha,
          tier: p.tier || 'Bronce',
          ranking: index + 1
        }));

      return {
        visionId: vision.id,
        visionNombre: vision.nombre,
        participantes
      };
    }).filter(v => v.participantes.length > 0);

    return NextResponse.json({
      success: true,
      visiones: visionesConParticipantes
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo participantes:', error);
    return NextResponse.json(
      { 
        error: 'Error al obtener participantes',
        message: error?.message || 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
