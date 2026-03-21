import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!usuario) {
      return NextResponse.json({ success: false, error: "Usuario no encontrado" }, { status: 404 });
    }

    // Obtener los enrollments activos del usuario en visión
    const enrollments = await prisma.vision_enrollments.findMany({
      where: {
        userId: usuario.id,
        enrollmentStatus: {
          in: ['ENROLLED', 'ACTIVE', 'ATTENDED', 'COMPLETED']
        }
      },
      include: {
        Vision: {
          include: {
            SchoolProduct: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Transformar los datos para el widget
    const trainings = enrollments
      .map(enrollment => {
        // Buscar el producto correspondiente al nivel del enrollment
        const levelTypeMap: { [key: string]: string } = {
          'BASIC': 'BASIC',
          'ADVANCED': 'ADVANCED',
          'PL': 'PL',
          'LEADERSHIP': 'PL'
        };
        
        const matchingProduct = enrollment.Vision?.SchoolProduct?.find(
          p => p.levelType === levelTypeMap[enrollment.level] && p.type === 'CORE_TRAINING'
        );

        return {
          id: enrollment.id,
          name: matchingProduct?.name || `${enrollment.Vision?.nombre || 'Visión'} - ${enrollment.level}`,
          levelType: enrollment.level,
          type: matchingProduct?.type || 'CORE_TRAINING',
          trainingStatus: matchingProduct?.trainingStatus || 'SCHEDULED',
          startDate: matchingProduct?.startDate?.toISOString() || null,
          endDate: matchingProduct?.endDate?.toISOString() || null,
          location: matchingProduct?.location || null,
          visionId: enrollment.visionId,
          visionName: enrollment.Vision?.nombre || null,
          enrollmentStatus: enrollment.enrollmentStatus
        };
      });

    return NextResponse.json({
      success: true,
      trainings
    });
  } catch (error) {
    console.error("Error fetching active trainings:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener entrenamientos activos" },
      { status: 500 }
    );
  }
}
