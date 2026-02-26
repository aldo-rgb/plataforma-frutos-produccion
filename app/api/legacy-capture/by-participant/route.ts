// API Route: Buscar captura de legacy por participantId y visionId
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

// GET: Obtener una captura específica por participantId y visionId
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const participantId = searchParams.get("participantId");
    const visionId = searchParams.get("visionId");

    if (!participantId || !visionId) {
      return NextResponse.json(
        { error: "participantId y visionId son requeridos" },
        { status: 400 }
      );
    }

    const parsedParticipantId = parseInt(participantId);
    const parsedVisionId = parseInt(visionId);

    if (isNaN(parsedParticipantId) || isNaN(parsedVisionId)) {
      return NextResponse.json(
        { error: "IDs inválidos" },
        { status: 400 }
      );
    }

    const capture = await prisma.legacyCaptureSession.findFirst({
      where: {
        participantId: parsedParticipantId,
        visionId: parsedVisionId,
      },
      include: {
        Usuario_LegacyCaptureSession_participantIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            profileImage: true
          }
        },
        Usuario_LegacyCaptureSession_gcIdToUsuario: {
          select: {
            id: true,
            nombre: true
          }
        },
        Vision: {
          select: {
            id: true,
            nombre: true
          }
        }
      }
    });

    if (!capture) {
      return NextResponse.json({
        success: false,
        message: "No hay captura existente para este participante",
        capture: null
      });
    }

    return NextResponse.json({
      success: true,
      capture: {
        id: capture.id,
        participantId: capture.participantId,
        participantName: capture.Usuario_LegacyCaptureSession_participantIdToUsuario.nombre,
        participantImage: capture.Usuario_LegacyCaptureSession_participantIdToUsuario.profileImage,
        gcId: capture.gcId,
        gcName: capture.Usuario_LegacyCaptureSession_gcIdToUsuario.nombre,
        visionId: capture.visionId,
        visionName: capture.Vision.nombre,
        level: capture.level,
        status: capture.status,
        // Campos BÁSICO
        photoWithGCUrl: capture.photoWithGCUrl,
        photoWithSquadUrl: capture.photoWithSquadUrl,
        photoBlueWallUrl: capture.photoBlueWallUrl,
        // Campos AVANZADO
        lullabyTitle: capture.lullabyTitle,
        lullabyArtist: capture.lullabyArtist,
        lullabyAudioUrl: capture.lullabyAudioUrl,
        contractPhotoUrl: capture.contractPhotoUrl,
        contractDeclaration: capture.contractDeclaration,
        // Campos PL
        plLullabyTitle: capture.plLullabyTitle,
        plLullabyArtist: capture.plLullabyArtist,
        plLullabyAudioUrl: capture.plLullabyAudioUrl,
        photoSalonUrl: capture.photoSalonUrl,
        photoMantaUrl: capture.photoMantaUrl,
        // Metadata
        capturedAt: capture.capturedAt,
        updatedAt: capture.updatedAt,
        completedAt: capture.completedAt
      }
    });
  } catch (error) {
    logger.error("Error en GET /api/legacy-capture/by-participant:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
