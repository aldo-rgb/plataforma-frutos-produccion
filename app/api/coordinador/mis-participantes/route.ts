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

    console.log('✅ Coordinador:', coordinador.id, coordinador.nombre);

    // Obtener visiones del coordinador
    let visionesWhere: any = {};
    
    if (coordinador.organizationId) {
      visionesWhere.organizationId = coordinador.organizationId;
    } else {
      visionesWhere.coordinadorId = coordinador.id;
    }

    console.log('🔍 Buscando visiones con:', visionesWhere);

    const visiones = await prisma.vision.findMany({
      where: visionesWhere,
      include: {
        Participantes: {
          include: {
            Participante: {
              select: {
                id: true,
                nombre: true,
                email: true,
                rol: true,
                profileImage: true,
                puntosGamificacion: true,
                puntosCuanticos: true,
                experienciaXP: true,
                completionStreak: true,
                tier: true,
                CartaFrutos: {
                  select: {
                    id: true,
                    estado: true,
                    autorizadoMentor: true,
                    fechaCreacion: true
                  }
                },
                PerfilCompleto: {
                  select: {
                    condecoraciones: true
                  }
                }
              }
            }
          }
        }
      }
    });

    console.log('✅ Visiones encontradas:', visiones.length);
    visiones.forEach(v => console.log('  -', v.nombre, ':', v.Participantes.length, 'participantes'));

    // Organizar por visión y calcular ranking
    const visionesConParticipantes = visiones.map(vision => {
      const participantes = vision.Participantes
        .filter(vp => vp.Participante.rol === 'PARTICIPANTE' || vp.Participante.rol === 'GAMECHANGER')
        .map(vp => vp.Participante)
        .sort((a, b) => (b.puntosGamificacion || 0) - (a.puntosGamificacion || 0))
        .map((p, index) => ({
          id: p.id,
          nombre: p.nombre,
          email: p.email,
          profileImageUrl: p.profileImage,
          condecoraciones: p.PerfilCompleto?.condecoraciones || [],
          puntosCultivo: p.puntosGamificacion || 0,
          puntosQuantum: p.puntosCuanticos || 0,
          xp: p.experienciaXP || 0,
          racha: p.completionStreak || 0,
          tier: p.tier || 'Bronce',
          ranking: index + 1,
          cartaId: p.CartaFrutos[0]?.id,
          cartaEstado: p.CartaFrutos[0]?.estado,
          cartaAutorizada: p.CartaFrutos[0]?.autorizadoMentor === true,
          mentoringStartDate: p.CartaFrutos[0]?.fechaCreacion
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
