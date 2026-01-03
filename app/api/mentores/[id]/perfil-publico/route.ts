import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const mentorId = parseInt(id);

    if (isNaN(mentorId)) {
      return NextResponse.json(
        { error: 'ID de mentor inválido' },
        { status: 400 }
      );
    }

    console.log(`🔍 Cargando perfil público del mentor ID: ${mentorId}`);

    // Buscar el perfil del mentor con toda la información
    const perfilMentor = await prisma.perfilMentor.findFirst({
      where: {
        usuarioId: mentorId,
      },
      include: {
        Usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            imagen: true,
          },
        },
      },
    });

    if (!perfilMentor) {
      return NextResponse.json(
        { error: 'Perfil de mentor no encontrado' },
        { status: 404 }
      );
    }

    // Mapear los datos para la respuesta
    const perfilPublico = {
      id: perfilMentor.id,
      usuarioId: perfilMentor.usuarioId,
      nivel: perfilMentor.nivel,
      especialidad: perfilMentor.especialidad,
      biografia: perfilMentor.biografia || '',
      biografiaCompleta: perfilMentor.biografiaCompleta || '',
      biografiaCorta: perfilMentor.biografiaCorta || '',
      titulo: perfilMentor.titulo || '',
      tagline: perfilMentor.tagline || '',
      experienciaAnios: perfilMentor.experienciaAnios,
      calificacionPromedio: Number(perfilMentor.calificacionPromedio),
      totalResenas: perfilMentor.totalResenas,
      totalSesiones: perfilMentor.totalSesiones,
      disponible: perfilMentor.disponible,
      logros: perfilMentor.logros || [],
      especialidadesSecundarias: perfilMentor.especialidadesSecundarias || [],
      expertiseTags: perfilMentor.expertiseTags || [],
      precioBase: Number(perfilMentor.precioBase),
      precioDisciplina: Number(perfilMentor.precioDisciplina),
      horarioInicio: perfilMentor.horarioInicio,
      horarioFin: perfilMentor.horarioFin,
      diasDisponibles: perfilMentor.diasDisponibles || [],
      heroJourneyBio: perfilMentor.heroJourneyBio || '',
      promiseStatement: perfilMentor.promiseStatement || '',
      videoIntroUrl: perfilMentor.videoIntroUrl || '',
      usuario: {
        nombre: perfilMentor.Usuario.nombre,
        email: perfilMentor.Usuario.email,
        imagen: perfilMentor.Usuario.imagen || '',
      },
    };

    console.log(`✅ Perfil público cargado: ${perfilMentor.Usuario.nombre}`);

    return NextResponse.json({
      success: true,
      perfil: perfilPublico,
    });
  } catch (error) {
    console.error('❌ Error al cargar perfil público del mentor:', error);
    return NextResponse.json(
      { 
        error: 'Error al cargar el perfil del mentor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
