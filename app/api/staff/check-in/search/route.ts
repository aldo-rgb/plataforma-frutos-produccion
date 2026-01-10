import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET - Buscar participantes por nombre para check-in manual
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json({ error: 'Se requiere productId' }, { status: 400 });
    }

    if (!query || query.length < 2) {
      return NextResponse.json({ participants: [] });
    }

    // Buscar el producto
    const product = await prisma.schoolProduct.findUnique({
      where: { id: parseInt(productId) }
    });

    if (!product) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    if (!product.visionId) {
      return NextResponse.json({ participants: [] });
    }

    // Buscar participantes inscritos en la visión del producto
    const enrollments = await prisma.vision_enrollments.findMany({
      where: {
        visionId: product.visionId,
        enrollmentStatus: 'ENROLLED',
        Usuario_vision_enrollments_userIdToUsuario: {
          OR: [
            { nombre: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
            { apodo: { contains: query, mode: 'insensitive' } }
          ]
        }
      },
      include: {
        Usuario_vision_enrollments_userIdToUsuario: true,
        Vision: true
      },
      take: 10
    });

    // Verificar check-ins del día para cada participante
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendances = await (prisma as any).productAttendance.findMany({
      where: {
        productId: parseInt(productId),
        enrollmentId: { in: enrollments.map((e: any) => e.id) },
        sessionNumber: 1,
        attended: true,
        attendedAt: { gte: today }
      }
    });

    const attendanceMap = new Map(attendances.map((a: any) => [a.enrollmentId, a]));

    // Buscar formularios médicos
    const userIds = enrollments.map((e: any) => e.userId);
    const medicalForms = await prisma.medicalForm.findMany({
      where: {
        userId: { in: userIds }
      }
    });
    const medicalFormMap = new Map(medicalForms.map((m: any) => [m.userId, m]));

    const participants = enrollments.map((e: any) => {
      const user = e.Usuario_vision_enrollments_userIdToUsuario;
      return {
        id: user.id,
        name: user.nombre,
        email: user.email,
        nickname: user.apodo,
        photoUrl: user.imagen || user.profileImage,
        role: e.level || 'Participante',
        visionId: e.visionId,
        visionName: e.Vision?.nombre,
        enrollmentId: e.id,
        hasMedicalForm: medicalFormMap.has(user.id),
        hasProfilePhoto: !!(user.imagen || user.profileImage),
        checkedIn: attendanceMap.has(e.id),
        checkInTime: (attendanceMap.get(e.id) as any)?.attendedAt
      };
    });

    return NextResponse.json({ participants });

  } catch (error) {
    console.error('Error buscando participantes:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
