import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: Obtener evidencias pendientes de revisión
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

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

    // Obtener evidencias pendientes
    const evidencias = await prisma.evidenciaAccion.findMany({
      where: {
        estado: 'PENDIENTE'
      },
      include: {
        Usuario: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        },
        Accion: {
          select: {
            texto: true
          }
        },
        Meta: {
          select: {
            metaPrincipal: true,
            categoria: true
          }
        }
      },
      orderBy: {
        fechaSubida: 'desc'
      }
    });

    const evidenciasFormateadas = evidencias.map((ev: any) => ({
      id: ev.id,
      usuarioId: ev.usuarioId,
      usuarioNombre: ev.usuario.nombre,
      usuarioEmail: ev.usuario.email,
      metaTitulo: ev.meta?.metaPrincipal || 'Sin meta',
      categoria: ev.meta?.categoria || 'SIN_CATEGORIA',
      accionTexto: ev.accion.texto,
      fotoUrl: ev.fotoUrl,
      descripcion: ev.descripcion,
      fechaSubida: ev.fechaSubida,
      estado: ev.estado
    }));

    return NextResponse.json({ 
      evidencias: evidenciasFormateadas 
    }, { status: 200 });

  } catch (error) {
    console.error('❌ Error al obtener evidencias pendientes:', error);
    return NextResponse.json({ error: 'Error al cargar evidencias' }, { status: 500 });
  }
}
