// API Route: Obtener captura de legacy por ID
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// GET: Obtener una captura específica por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const captureId = parseInt(params.id);
    if (isNaN(captureId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const capture = await prisma.legacyCaptureSession.findUnique({
      where: { id: captureId },
      include: {
        Participant: {
          select: {
            id: true,
            nombre: true,
            email: true,
            profileImage: true
          }
        },
        GC: {
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
      return NextResponse.json({ error: "Captura no encontrada" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      capture: {
        id: capture.id,
        participantId: capture.participantId,
        participantName: capture.Participant.nombre,
        participantImage: capture.Participant.profileImage,
        gcId: capture.gcId,
        gcName: capture.GC.nombre,
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
    console.error("Error en GET /api/legacy-capture/[id]:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar una captura (solo admin)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true }
    });

    if (!usuario || (usuario.rol !== 'ADMINISTRADOR' && usuario.rol !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const captureId = parseInt(params.id);
    if (isNaN(captureId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    await prisma.legacyCaptureSession.delete({
      where: { id: captureId }
    });

    return NextResponse.json({
      success: true,
      message: "Captura eliminada"
    });
  } catch (error) {
    console.error("Error en DELETE /api/legacy-capture/[id]:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
