import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const visionId = parseInt(id);

    if (isNaN(visionId)) {
      return NextResponse.json(
        { error: 'ID de visión inválido' },
        { status: 400 }
      );
    }

    // Generar URL de registro
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3001';
    const registroUrl = `${baseUrl}/registro/${visionId}`;

    // Generar QR Code como Data URL
    const qrCodeUrl = await QRCode.toDataURL(registroUrl, {
      width: 512,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    return NextResponse.json({
      success: true,
      qrCodeUrl,
      registroUrl
    });

  } catch (error) {
    console.error('Error generating QR:', error);
    return NextResponse.json(
      { error: 'Error al generar código QR' },
      { status: 500 }
    );
  }
}
