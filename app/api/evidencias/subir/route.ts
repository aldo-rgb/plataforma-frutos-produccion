import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST: Subir evidencia de una acción
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
    });

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const { accionId, imagenBase64, descripcion } = body;

    if (!accionId || !imagenBase64) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    // Validar que la acción existe y pertenece al usuario
    const accion = await prisma.accion.findFirst({
      where: {
        id: accionId,
        Meta: {
          cartaId: usuario.id
        }
      },
      include: {
        Meta: true
      }
    });

    if (!accion) {
      return NextResponse.json({ error: 'Acción no encontrada' }, { status: 404 });
    }

    // Verificar que no haya ya una evidencia para hoy
    const fechaHoy = new Date();
    fechaHoy.setHours(0, 0, 0, 0);

    const evidenciaExistente = await prisma.evidenciaAccion.findFirst({
      where: {
        accionId: accionId,
        usuarioId: usuario.id,
        fechaSubida: {
          gte: fechaHoy
        }
      }
    });

    if (evidenciaExistente && evidenciaExistente.estado !== 'RECHAZADA') {
      return NextResponse.json({ 
        error: 'Ya subiste una evidencia para esta acción hoy' 
      }, { status: 400 });
    }

    // TODO: En producción, subir a servicio de almacenamiento (S3, Cloudinary, etc.)
    // Por ahora, guardamos el base64 directamente (NO RECOMENDADO para producción)
    const fotoUrl = imagenBase64; // En producción: URL del servicio de storage

    // Crear evidencia
    const evidencia = await prisma.evidenciaAccion.create({
      data: {
        usuarioId: usuario.id,
        metaId: accion.metaId,
        accionId: accionId,
        fotoUrl: fotoUrl,
        descripcion: descripcion || null,
        estado: 'PENDIENTE',
        updatedAt: new Date()
      }
    });

    console.log(`📸 Nueva evidencia subida por ${usuario.nombre} para acción ${accionId}`);

    return NextResponse.json({ 
      success: true,
      message: 'Evidencia subida exitosamente',
      evidenciaId: evidencia.id
    }, { status: 200 });

  } catch (error) {
    console.error('❌ Error al subir evidencia:', error);
    return NextResponse.json({ error: 'Error al subir evidencia' }, { status: 500 });
  }
}
