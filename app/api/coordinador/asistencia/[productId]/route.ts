import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// GET - Obtener datos del producto, participantes y asistencia
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true, organizationId: true }
    });

    if (!usuario || !['COORDINATOR_BASIC', 'SCHOOL_ADMIN', 'ADMIN', 'DIRECTOR'].includes(usuario.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const resolvedParams = await params;
    const productId = parseInt(resolvedParams.productId);

    // Obtener el producto
    const producto = await prisma.schoolProduct.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        levelType: true,
        startDate: true,
        endDate: true,
        maxCapacity: true,
        currentEnrollment: true,
        visionId: true,
        Vision: {
          select: {
            id: true,
            nombre: true,
            organizationId: true
          }
        }
      }
    });

    if (!producto) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    // Verificar que el producto pertenece a la organización del usuario
    if (producto.Vision?.organizationId !== usuario.organizationId) {
      return NextResponse.json({ error: 'No autorizado para este producto' }, { status: 403 });
    }

    // Determinar el nivel del producto
    const levelMapping: Record<string, string> = {
      'BASIC': 'BASICO',
      'INTERMEDIATE': 'INTERMEDIO', 
      'ADVANCED': 'AVANZADO',
      'PL': 'PL'
    };
    const enrollmentLevel = levelMapping[producto.levelType] || 'BASICO';

    // Obtener participantes inscritos en la visión con el nivel correspondiente
    const enrollments = await prisma.vision_enrollments.findMany({
      where: {
        visionId: producto.visionId!,
        level: enrollmentLevel as any,
        enrollmentStatus: { in: ['ENROLLED', 'ACTIVE', 'COMPLETED'] }
      },
      select: {
        id: true,
        userId: true,
        level: true,
        Usuario_vision_enrollments_userIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            telefono: true,
            profileImage: true
          }
        }
      }
    });

    // Mapear a formato de participantes
    const participants = enrollments
      .filter(e => e.Usuario_vision_enrollments_userIdToUsuario)
      .map(e => ({
        id: e.id, // Usamos el ID del enrollment
        enrollmentId: e.id,
        userId: e.Usuario_vision_enrollments_userIdToUsuario!.id,
        nombre: e.Usuario_vision_enrollments_userIdToUsuario!.nombre || 'Sin nombre',
        email: e.Usuario_vision_enrollments_userIdToUsuario!.email || '',
        telefono: e.Usuario_vision_enrollments_userIdToUsuario!.telefono,
        profileImage: e.Usuario_vision_enrollments_userIdToUsuario!.profileImage
      }));

    // Obtener asistencia existente
    const existingAttendance = await prisma.productAttendance.findMany({
      where: {
        productId: productId
      },
      select: {
        enrollmentId: true,
        sessionNumber: true,
        attended: true,
        attendedAt: true
      }
    });

    // Generar sesiones basadas en las fechas del producto
    const sessions: { number: number; date: string; title: string }[] = [];
    
    if (producto.startDate && producto.endDate) {
      const start = new Date(producto.startDate);
      const end = new Date(producto.endDate);
      const diffWeeks = Math.ceil((end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
      const numSessions = Math.min(diffWeeks, 12); // Máximo 12 sesiones
      
      for (let i = 0; i < numSessions; i++) {
        const sessionDate = new Date(start);
        sessionDate.setDate(sessionDate.getDate() + (i * 7));
        sessions.push({
          number: i + 1,
          date: sessionDate.toISOString(),
          title: `Sesión ${i + 1}`
        });
      }
    } else {
      // Si no hay fechas, generar 12 sesiones por defecto
      for (let i = 1; i <= 12; i++) {
        sessions.push({
          number: i,
          date: new Date().toISOString(),
          title: `Sesión ${i}`
        });
      }
    }

    return NextResponse.json({
      success: true,
      producto,
      participants,
      sessions,
      attendance: existingAttendance
    });

  } catch (error: any) {
    logger.error('❌ Error obteniendo datos de asistencia:', error);
    return NextResponse.json(
      { error: 'Error al obtener datos', message: error?.message },
      { status: 500 }
    );
  }
}

// POST - Guardar asistencia
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true, organizationId: true }
    });

    if (!usuario || !['COORDINATOR_BASIC', 'SCHOOL_ADMIN', 'ADMIN', 'DIRECTOR'].includes(usuario.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const resolvedParams = await params;
    const productId = parseInt(resolvedParams.productId);
    const body = await req.json();
    const { sessionNumber, attendance: attendanceData } = body;

    if (!sessionNumber || !attendanceData || !Array.isArray(attendanceData)) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    // Verificar que el producto existe y pertenece a la organización
    const producto = await prisma.schoolProduct.findUnique({
      where: { id: productId },
      include: { Vision: { select: { organizationId: true } } }
    });

    if (!producto || producto.Vision?.organizationId !== usuario.organizationId) {
      return NextResponse.json({ error: 'Producto no encontrado o no autorizado' }, { status: 404 });
    }

    // Guardar asistencia usando upsert para cada registro
    const results = await Promise.all(
      attendanceData.map(async (record: { enrollmentId: number; attended: boolean }) => {
        return prisma.productAttendance.upsert({
          where: {
            productId_enrollmentId_sessionNumber: {
              productId,
              enrollmentId: record.enrollmentId,
              sessionNumber
            }
          },
          update: {
            attended: record.attended,
            attendedAt: record.attended ? new Date() : null,
            markedBy: usuario.id
          },
          create: {
            productId,
            enrollmentId: record.enrollmentId,
            sessionNumber,
            attended: record.attended,
            attendedAt: record.attended ? new Date() : null,
            markedBy: usuario.id
          }
        });
      })
    );

    return NextResponse.json({
      success: true,
      message: 'Asistencia guardada correctamente',
      count: results.length
    });

  } catch (error: any) {
    logger.error('❌ Error guardando asistencia:', error);
    return NextResponse.json(
      { error: 'Error al guardar asistencia', message: error?.message },
      { status: 500 }
    );
  }
}
