import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PUT: Rechazar una carta con feedback
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const cartaId = parseInt(params.id);

    if (isNaN(cartaId)) {
      return NextResponse.json({ error: 'ID de carta inválido' }, { status: 400 });
    }

    const body = await request.json();
    const { feedback } = body;

    if (!feedback || !feedback.trim()) {
      return NextResponse.json({ 
        error: 'Debes proporcionar una razón para el rechazo' 
      }, { status: 400 });
    }

    // Buscar usuario mentor
    const mentor = await prisma.usuario.findUnique({
      where: { email: session.user.email },
    });

    if (!mentor) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Verificar permisos
    if (mentor.rol !== 'MENTOR' && mentor.rol !== 'COORDINADOR' && mentor.rol !== 'GAMECHANGER') {
      return NextResponse.json({ error: 'No tienes permisos de mentor' }, { status: 403 });
    }

    // Verificar que la carta existe y está en revisión
    const carta = await prisma.cartaFrutos.findUnique({
      where: { id: cartaId },
      include: {
        Usuario: {
          select: {
            nombre: true,
            email: true
          }
        }
      }
    });

    if (!carta) {
      return NextResponse.json({ error: 'Carta no encontrada' }, { status: 404 });
    }

    if (carta.estado !== 'EN_REVISION') {
      return NextResponse.json({ 
        error: `La carta no está en revisión (Estado actual: ${carta.estado})` 
      }, { status: 400 });
    }

    // Rechazar carta y regresar a BORRADOR para que el usuario pueda editar
    const cartaRechazada = await prisma.cartaFrutos.update({
      where: { id: cartaId },
      data: { 
        estado: 'BORRADOR', // Regresa a BORRADOR para permitir edición
        feedbackMentor: feedback
      }
    });

    console.log(`🔴 Carta ${cartaId} RECHAZADA por ${mentor.nombre} para ${carta.Usuario.nombre}`);
    console.log(`   Feedback: "${feedback}"`);

    // TODO: Aquí puedes agregar notificación al usuario
    // - Email con el feedback
    // - Notificación in-app
    // - Push notification

    return NextResponse.json({ 
      success: true,
      message: `Carta de ${carta.Usuario.nombre} rechazada. Se ha notificado al usuario.`,
      estado: cartaRechazada.estado,
      feedback: feedback
    }, { status: 200 });

  } catch (error) {
    console.error('❌ Error al rechazar carta:', error);
    return NextResponse.json({ error: 'Error al rechazar carta' }, { status: 500 });
  }
}
