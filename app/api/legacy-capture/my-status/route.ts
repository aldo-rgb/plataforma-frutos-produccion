// API Route: Verificar estado de Legacy Capture del participante
// Para saber si debe mostrar el modal de bloqueo

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { VisionLevel } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Buscar inscripciones activas del usuario
    const enrollment = await prisma.vision_enrollments.findFirst({
      where: {
        userId,
        enrollmentStatus: "ENROLLED",
      },
      include: {
        Vision: true,
      },
      orderBy: {
        enrolledAt: "desc",
      },
    });

    if (!enrollment || !enrollment.Vision) {
      return NextResponse.json({
        success: true,
        hasLegacyPending: false,
        message: "No hay entrenamientos activos",
      });
    }

    const vision = enrollment.Vision;
    const trainingLevel = enrollment.level;

    // Determinar fecha de fin según el nivel
    let endDate: Date | null = null;
    if (trainingLevel === VisionLevel.BASIC) {
      endDate = vision.endDate;
    } else if (trainingLevel === VisionLevel.ADVANCED) {
      endDate = vision.advancedEndDate;
    } else if (trainingLevel === VisionLevel.PL) {
      // Para PL, usar el último fin de semana
      endDate = vision.plWeekend3EndDate || vision.plWeekend2EndDate || vision.plWeekend1EndDate;
    }

    if (!endDate) {
      return NextResponse.json({
        success: true,
        hasLegacyPending: false,
        message: "Visión sin fecha de fin configurada",
      });
    }

    // Verificar si es el último día del entrenamiento
    const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    const isLastDay = today.getTime() === endDateOnly.getTime();

    // Para testing, también permitir el día anterior
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterdayOrToday = today.getTime() === endDateOnly.getTime() || 
                               yesterday.getTime() === endDateOnly.getTime();

    if (!isYesterdayOrToday) {
      return NextResponse.json({
        success: true,
        hasLegacyPending: false,
        message: "No es el último día del entrenamiento",
        debug: {
          today: today.toISOString(),
          endDate: endDateOnly.toISOString(),
          trainingLevel,
        },
      });
    }

    // Verificar si existe captura para este usuario en esta visión
    const capture = await prisma.legacyCaptureSession.findFirst({
      where: {
        visionId: vision.id,
        participantId: userId,
      },
    });

    // Si ya está completa, no bloquear
    if (capture?.status === "COMPLETED") {
      return NextResponse.json({
        success: true,
        hasLegacyPending: false,
        message: "Captura de legado completada",
        capture: {
          status: capture.status,
          hasPhotoWithGC: !!capture.photoWithGCUrl,
          hasPhotoWithSquad: !!capture.photoWithSquadUrl,
          hasPhotoBlueWall: !!capture.photoBlueWallUrl,
          hasLullaby: !!capture.lullabyTitle,
          hasContract: !!capture.contractPhotoUrl,
          hasDeclaration: !!capture.contractDeclaration,
        },
      });
    }

    // Hay legacy pendiente - bloquear al usuario
    return NextResponse.json({
      success: true,
      hasLegacyPending: true,
      vision: {
        id: vision.id,
        nombre: vision.nombre,
        endDate: endDate,
        trainingLevel,
      },
      capture: capture
        ? {
            status: capture.status,
            hasPhotoWithGC: !!capture.photoWithGCUrl,
            hasPhotoWithSquad: !!capture.photoWithSquadUrl,
            hasPhotoBlueWall: !!capture.photoBlueWallUrl,
            hasLullaby: !!capture.lullabyTitle,
            hasContract: !!capture.contractPhotoUrl,
            hasDeclaration: !!capture.contractDeclaration,
          }
        : {
            status: "PENDING",
            hasPhotoWithGC: false,
            hasPhotoWithSquad: false,
            hasPhotoBlueWall: false,
            hasLullaby: false,
            hasContract: false,
            hasDeclaration: false,
          },
    });
  } catch (error) {
    console.error("Error en GET /api/legacy-capture/my-status:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
