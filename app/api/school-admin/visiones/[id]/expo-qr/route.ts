import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: Obtener participantes de una visión con sus negocios para QR de Expo
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const visionId = parseInt(id);

    if (isNaN(visionId)) {
      return NextResponse.json({ error: 'ID de visión inválido' }, { status: 400 });
    }

    // Verificar acceso a la visión
    const vision = await prisma.vision.findUnique({
      where: { id: visionId },
      select: { 
        id: true, 
        nombre: true,
        organizationId: true,
        coordinadorId: true
      }
    });

    if (!vision) {
      return NextResponse.json({ error: 'Visión no encontrada' }, { status: 404 });
    }

    // Verificar permisos
    const userRole = session.user.rol;
    const userId = session.user.id;
    
    const allowedRoles = ['SCHOOL_ADMIN', 'ADMINISTRADOR', 'COORDINADOR', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED'];
    
    if (!allowedRoles.includes(userRole)) {
      // Verificar si es el coordinador de la visión
      if (vision.coordinadorId !== userId) {
        return NextResponse.json({ error: 'No tienes acceso a esta visión' }, { status: 403 });
      }
    }

    // Obtener participantes de la visión con sus negocios
    const participantes = await prisma.visionParticipante.findMany({
      where: { visionId },
      include: {
        Participante: {
          select: {
            id: true,
            nombre: true,
            email: true,
            referralCode: true,
            QuantumBusinessSite: {
              select: {
                id: true,
                businessName: true,
                slug: true,
                logoUrl: true,
                isPublished: true
              }
            }
          }
        }
      }
    });

    // Formatear respuesta
    const result = participantes.map(p => ({
      userId: p.Participante?.id,
      nombre: p.Participante?.nombre || 'Sin nombre',
      email: p.Participante?.email,
      referralCode: p.Participante?.referralCode,
      businessName: p.Participante?.QuantumBusinessSite?.businessName || p.Participante?.nombre || 'Mi Negocio',
      businessSlug: p.Participante?.QuantumBusinessSite?.slug,
      logoUrl: p.Participante?.QuantumBusinessSite?.logoUrl,
      hasBusinessSite: !!p.Participante?.QuantumBusinessSite
    })).filter(p => p.userId); // Solo participantes válidos

    return NextResponse.json({
      success: true,
      vision: {
        id: vision.id,
        nombre: vision.nombre
      },
      participantes: result,
      total: result.length
    });

  } catch (error) {
    console.error('Error fetching expo QR data:', error);
    return NextResponse.json(
      { error: 'Error al obtener datos de expo' },
      { status: 500 }
    );
  }
}
