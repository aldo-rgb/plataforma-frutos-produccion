// API Route: Verificar estado de Legacy Capture del participante
// Este endpoint es informativo - NO debe bloquear la pantalla del participante
// Solo proporciona información para que puedan ver su estado cuando quieran

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { VisionLevel } from "@prisma/client";
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userId = Number(session.user.id);

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
        shouldBlock: false, // NUNCA bloquear
        message: "No hay entrenamientos activos",
      });
    }

    const vision = enrollment.Vision;
    const trainingLevel = enrollment.level;

    // Verificar si existe captura para este usuario en esta visión
    const capture = await prisma.legacyCaptureSession.findFirst({
      where: {
        visionId: vision.id,
        participantId: userId,
      },
    });

    // Devolver información del estado - pero NUNCA bloquear
    return NextResponse.json({
      success: true,
      // hasLegacyPending indica si hay una sesión activa, pero NO debe usarse para bloquear
      hasLegacyPending: capture && capture.status !== "COMPLETED",
      shouldBlock: false, // IMPORTANTE: Nunca bloquear la pantalla del participante
      vision: {
        id: vision.id,
        nombre: vision.nombre,
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
        : null,
    });
  } catch (error) {
    logger.error("Error en GET /api/legacy-capture/my-status:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
