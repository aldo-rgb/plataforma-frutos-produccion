import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppTextMessage, sendProductInterest } from '@/lib/whatsapp';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      phoneNumber, 
      businessName,
      businessPhone,
      productName, 
      productDescription,
      productPrice,
      customerName,
      customerPhone,
      useTemplate = true
    } = body;

    if (!phoneNumber || !productName) {
      return NextResponse.json(
        { success: false, error: 'Faltan datos requeridos' },
        { status: 400 }
      );
    }

    const targetPhone = businessPhone || phoneNumber;
    const priceStr = `$${productPrice?.toLocaleString() || '0'} MXN`;
    
    let result;
    
    // Intentar con plantilla primero
    if (useTemplate) {
      result = await sendProductInterest(
        targetPhone,
        businessName || 'Tu Negocio',
        productName,
        priceStr,
        customerPhone || 'No proporcionado'
      );
    }
    
    // Si falla la plantilla, usar mensaje de texto
    if (!result?.success) {
      const businessMessage = `🛍️ *NUEVO INTERÉS EN PRODUCTO*

🏢 *${businessName || 'Tu Negocio'}*

━━━━━━━━━━━━━━━━━━━━
📦 *Producto:* ${productName}
${productDescription ? `📝 *Descripción:* ${productDescription}` : ''}
💰 *Precio:* ${priceStr}
━━━━━━━━━━━━━━━━━━━━

👤 *Cliente interesado:* ${customerName || 'No proporcionado'}
📱 *Teléfono:* ${customerPhone || 'No proporcionado'}

━━━━━━━━━━━━━━━━━━━━
_¡Contáctalo pronto!_`;

      result = await sendWhatsAppTextMessage(targetPhone, businessMessage);
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        message: 'Interés en producto enviado correctamente'
      });
    } else {
      const fallbackMessage = `Hola, me interesa el producto:\n\n🛍️ *${productName}*\n💰 Precio: ${priceStr}\n\n¿Está disponible?`;
      return NextResponse.json({
        success: false,
        error: result.error,
        fallbackUrl: `https://wa.me/${targetPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(fallbackMessage)}`
      });
    }

  } catch (error: any) {
    console.error('Error enviando interés de producto por WhatsApp:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
