import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/carta/save-meta
 * Guarda o actualiza una meta en la tabla Meta
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { cartaId, categoria, orden, metaPrincipal, declaracionPoder } = await req.json();

    console.log('📥 Datos recibidos para guardar meta:', {
      cartaId,
      categoria,
      orden,
      metaPrincipal: metaPrincipal?.substring(0, 50) + '...',
      declaracionPoder: declaracionPoder?.substring(0, 50) + '...'
    });

    if (!cartaId || !categoria || !metaPrincipal) {
      console.error('❌ Datos incompletos:', { cartaId, categoria, metaPrincipal: !!metaPrincipal });
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    // Verificar que la carta pertenece al usuario
    const carta = await prisma.cartaFrutos.findFirst({
      where: {
        id: cartaId,
        usuarioId: typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id
      }
    });

    if (!carta) {
      return NextResponse.json({ error: 'Carta no encontrada' }, { status: 404 });
    }

    // Buscar si ya existe una meta con esta categoria y orden
    const existingMeta = await prisma.meta.findFirst({
      where: {
        cartaId,
        categoria,
        orden: orden || 1
      }
    });

    let meta;
    if (existingMeta) {
      // Actualizar meta existente
      meta = await prisma.meta.update({
        where: { id: existingMeta.id },
        data: {
          metaPrincipal,
          declaracionPoder,
          updatedAt: new Date()
        }
      });
      console.log('✅ Meta actualizada ID:', meta.id);
    } else {
      // Crear nueva meta
      meta = await prisma.meta.create({
        data: {
          cartaId,
          categoria,
          orden: orden || 1,
          metaPrincipal,
          declaracionPoder,
          status: 'PENDING',
          avance: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      console.log('✅ Meta creada ID:', meta.id);
    }

    return NextResponse.json({ 
      success: true, 
      meta 
    });

  } catch (error: any) {
    console.error('Error saving meta:', error);
    return NextResponse.json(
      { error: 'Error al guardar la meta', details: error.message },
      { status: 500 }
    );
  }
}
