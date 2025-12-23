import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: Obtener todas las metas de un usuario por categoría
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Buscar usuario
    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
    });

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Buscar carta del usuario
    const carta = await prisma.cartaFrutos.findFirst({
      where: { usuarioId: usuario.id },
      include: {
        Meta: {
          include: {
            Accion: {
              orderBy: { id: 'asc' }
            }
          },
          orderBy: [
            { categoria: 'asc' },
            { orden: 'asc' }
          ]
        }
      }
    });

    if (!carta) {
      return NextResponse.json({ metas: [] }, { status: 200 });
    }

    // Agrupar metas por categoría
    const metasPorCategoria: any = {};
    
    carta.Meta.forEach((meta: any) => {
      if (!metasPorCategoria[meta.categoria]) {
        metasPorCategoria[meta.categoria] = [];
      }
      
      metasPorCategoria[meta.categoria].push({
        id: meta.id,
        orden: meta.orden,
        declaracionPoder: meta.declaracionPoder,
        metaPrincipal: meta.metaPrincipal,
        avance: meta.avance,
        acciones: meta.Accion.map((accion: any) => ({
          id: accion.id,
          texto: accion.texto,
          diasProgramados: accion.diasProgramados ? JSON.parse(accion.diasProgramados) : [],
          completada: accion.completada,
          enRevision: accion.enRevision,
          requiereEvidencia: accion.requiereEvidencia,
          lastCompletedDate: accion.lastCompletedDate
        })),
        createdAt: meta.createdAt,
        updatedAt: meta.updatedAt
      });
    });

    return NextResponse.json({ 
      cartaId: carta.id,
      estado: carta.estado,
      feedbackMentor: carta.feedbackMentor,
      metas: metasPorCategoria 
    }, { status: 200 });

  } catch (error) {
    console.error('❌ Error al obtener metas:', error);
    return NextResponse.json({ error: 'Error al cargar metas' }, { status: 500 });
  }
}

// PUT: Enviar carta a revisión
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (action !== 'enviar_a_revision') {
      return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    }

    // Buscar usuario
    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
    });

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Buscar carta del usuario
    const carta = await prisma.cartaFrutos.findFirst({
      where: { usuarioId: usuario.id },
      include: {
        Meta: {
          include: { Accion: true }
        }
      }
    });

    if (!carta) {
      return NextResponse.json({ error: 'No tienes una carta creada' }, { status: 404 });
    }

    // Validar que la carta esté en estado BORRADOR
    if (carta.estado !== 'BORRADOR') {
      return NextResponse.json({ 
        error: 'La carta ya fue enviada a revisión', 
        estado: carta.estado 
      }, { status: 400 });
    }

    // Validar que tenga al menos una meta con contenido
    const metasConContenido = carta.Meta.filter((m: any) => 
      m.metaPrincipal.trim() && m.acciones.length > 0
    );

    if (metasConContenido.length === 0) {
      return NextResponse.json({ 
        error: 'Debes definir al menos una meta con acciones antes de enviar a revisión' 
      }, { status: 400 });
    }

    // Actualizar estado de la carta a EN_REVISION
    const cartaActualizada = await prisma.cartaFrutos.update({
      where: { id: carta.id },
      data: { estado: 'EN_REVISION' }
    });

    return NextResponse.json({ 
      success: true,
      message: 'Carta enviada a revisión exitosamente',
      estado: cartaActualizada.estado
    }, { status: 200 });

  } catch (error) {
    console.error('❌ Error al enviar carta a revisión:', error);
    return NextResponse.json({ error: 'Error al enviar carta' }, { status: 500 });
  }
}

// POST: Crear o actualizar metas múltiples
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { categoria, metas } = body;

    if (!categoria || !metas || !Array.isArray(metas)) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }

    // Buscar usuario
    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
    });

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Buscar o crear carta
    let carta = await prisma.cartaFrutos.findFirst({
      where: { usuarioId: usuario.id },
    });

    if (!carta) {
      carta = await prisma.cartaFrutos.create({
        data: { 
          usuarioId: usuario.id,
          fechaActualizacion: new Date()
        },
      });
    }

    // Eliminar metas antiguas de esta categoría
    await prisma.meta.deleteMany({
      where: {
        cartaId: carta.id,
        categoria: categoria
      }
    });

    // Crear nuevas metas
    const metasCreadas = [];

    for (let i = 0; i < metas.length; i++) {
      const metaData = metas[i];
      
      const nuevaMeta = await prisma.meta.create({
        data: {
          cartaId: carta.id,
          categoria: metaData.categoria,
          orden: i + 1,
          declaracionPoder: metaData.declaracionPoder || null,
          metaPrincipal: metaData.metaPrincipal || '',
          avance: metaData.avance || 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          Accion: {
            create: (metaData.acciones || []).map((accion: any) => ({
              texto: accion.texto,
              diasProgramados: accion.diasProgramados ? JSON.stringify(accion.diasProgramados) : null,
              completada: accion.completada || false,
              enRevision: accion.enRevision || false,
              requiereEvidencia: accion.requiereEvidencia || false,
              lastCompletedDate: accion.lastCompletedDate || null,
              updatedAt: new Date()
            }))
          }
        },
        include: {
          Accion: true
        }
      });

      metasCreadas.push(nuevaMeta);
    }

    return NextResponse.json({ 
      success: true,
      metas: metasCreadas 
    }, { status: 200 });

  } catch (error) {
    console.error('❌ Error al guardar metas:', error);
    return NextResponse.json({ error: 'Error al guardar metas' }, { status: 500 });
  }
}

// DELETE: Eliminar una meta específica
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const metaId = searchParams.get('metaId');

    if (!metaId) {
      return NextResponse.json({ error: 'ID de meta requerido' }, { status: 400 });
    }

    // Eliminar meta (las acciones se eliminan automáticamente por el CASCADE)
    await prisma.meta.delete({
      where: { id: parseInt(metaId) }
    });

    return NextResponse.json({ 
      success: true,
      message: 'Meta eliminada correctamente'
    }, { status: 200 });

  } catch (error) {
    console.error('❌ Error al eliminar meta:', error);
    return NextResponse.json({ error: 'Error al eliminar meta' }, { status: 500 });
  }
}
