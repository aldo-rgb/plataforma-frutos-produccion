// API Route: Upload Photo to Cloudinary
// Para subir fotos al álbum cuántico y legacy capture

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadImage, getThumbnailUrl } from "@/lib/cloudinary";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userId = session.user.id;
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as string; // 'album' | 'legacy' | 'contract'
    const slot = formData.get("slot") as string; // para álbum
    const participantId = formData.get("participantId") as string; // para legacy capture

    if (!file) {
      return NextResponse.json(
        { error: "No se proporcionó archivo" },
        { status: 400 }
      );
    }

    // Validar tipo de archivo
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/heic"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipo de archivo no válido. Usa JPG, PNG, WEBP o HEIC" },
        { status: 400 }
      );
    }

    // Validar tamaño (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "El archivo es demasiado grande. Máximo 10MB" },
        { status: 400 }
      );
    }

    // Convertir File a Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Determinar carpeta según tipo
    let customFolder: string;

    switch (type) {
      case "album":
        customFolder = `user_${userId}/slot_${slot}`;
        break;
      case "legacy":
        customFolder = `participant_${participantId}`;
        break;
      case "contract":
        customFolder = `contracts/participant_${participantId}`;
        break;
      default:
        customFolder = `misc/user_${userId}`;
    }

    // Usar el preset correcto según el tipo
    const preset = type === "legacy" || type === "contract" 
      ? "LEGACY_CAPTURE" 
      : "QUANTUM_ALBUM";

    // Subir a Cloudinary (pasar el mime type del archivo)
    const result = await uploadImage(buffer, preset, customFolder, file.type);

    // Generar thumbnail URL
    const thumbnailUrl = getThumbnailUrl(result.secure_url);

    return NextResponse.json({
      success: true,
      photoUrl: result.secure_url,
      thumbnailUrl,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      size: result.bytes,
    });
  } catch (error: any) {
    console.error("Error uploading to Cloudinary:", error);
    console.error("Error details:", {
      message: error?.message,
      name: error?.name,
      http_code: error?.http_code,
      error: error?.error
    });
    return NextResponse.json(
      { 
        error: "Error al subir la imagen",
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}
