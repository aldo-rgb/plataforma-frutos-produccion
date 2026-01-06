import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/mentor/application/create
 * Crea una solicitud de mentor en estado DRAFT (sin crear sesión de pago)
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = session.user.id;
    const data = await req.json();

    // Verificar si ya tiene una solicitud
    const existingApplication = await prisma.mentorApplication.findUnique({
      where: { usuarioId: userId }
    });

    if (existingApplication) {
      return NextResponse.json(
        { error: 'Ya tienes una solicitud activa' },
        { status: 400 }
      );
    }

    // Crear la solicitud en estado DRAFT (sin pago)
    const application = await prisma.mentorApplication.create({
      data: {
        usuarioId: userId,
        status: 'DRAFT',
        titulo: data.titulo,
        especialidad: data.especialidad === 'Otros' ? data.especialidadOtra : data.especialidad,
        especialidadesSecundarias: data.especialidadesSecundarias || [],
        experienciaAnios: data.experienciaAnios,
        biografiaCompleta: data.biografiaCompleta,
        logros: data.logros || [],
        expertiseTags: data.expertiseTags || [],
        documentosUrls: data.documentosUrls || [],
        videoIntroUrl: data.videoIntroUrl || null
      }
    });

    return NextResponse.json({
      success: true,
      application: {
        id: application.id,
        status: application.status,
        createdAt: application.createdAt.toISOString()
      }
    });

  } catch (error) {
    console.error('Error creating application:', error);
    
    // Log detallado del error
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Error al crear solicitud',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}
