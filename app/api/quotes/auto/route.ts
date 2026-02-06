import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { nanoid } from 'nanoid';
import logger from '@/lib/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST - Crear cotización automática (desde widget público)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, client, items, leadSource } = body;
    
    if (!userId) {
      return NextResponse.json({ error: 'userId requerido' }, { status: 400 });
    }
    
    if (!client?.name && !client?.phone) {
      return NextResponse.json({ 
        error: 'Nombre o teléfono del cliente requerido' 
      }, { status: 400 });
    }
    
    if (!items || items.length === 0) {
      return NextResponse.json({ 
        error: 'Debe seleccionar al menos un servicio' 
      }, { status: 400 });
    }
    
    // Calcular totales
    const subtotal = items.reduce((sum: number, item: any) => sum + item.total, 0);
    const total = subtotal;
    
    const shortCode = nanoid(8).toLowerCase();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 15); // 15 días de vigencia por defecto
    
    const newQuote = {
      id: uuidv4(),
      short_code: shortCode,
      user_id: parseInt(userId),
      client_data: JSON.stringify(client),
      items: JSON.stringify(items),
      optional_items: null,
      subtotal,
      discount: 0,
      discount_type: null,
      tax: 0,
      total,
      currency: 'MXN',
      valid_days: 15,
      expires_at: expiresAt.toISOString(),
      notes: null,
      requires_deposit: false,
      deposit_percent: 0,
      status: 'sent', // Auto-cotizaciones se marcan como enviadas
      view_count: 0,
      is_auto_generated: true,
      lead_source: leadSource || 'auto-quoter',
      sent_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('quotes')
      .insert(newQuote)
      .select()
      .single();
    
    if (error) throw error;
    
    // Notificar al proveedor (Hot Lead!)
    await notifyProviderNewLead(data, client, total);
    
    // Enviar cotización al cliente por WhatsApp si tiene número
    if (client.phone || client.whatsapp) {
      await sendQuoteToClient(data, client);
    }
    
    return NextResponse.json({ 
      success: true, 
      quote: {
        id: data.id,
        shortCode: data.short_code,
        total: data.total
      },
      quoteUrl: `${process.env.NEXT_PUBLIC_APP_URL}/propuesta/${shortCode}`
    });
    
  } catch (error: any) {
    logger.error('Error creating auto quote:', error);
    return NextResponse.json({ 
      error: error.message || 'Error al crear cotización' 
    }, { status: 500 });
  }
}

// Notificar al proveedor de nuevo lead
async function notifyProviderNewLead(quote: any, client: any, total: number) {
  logger.debug('🔥 HOT LEAD!', {
    provider: quote.user_id,
    client: client.name,
    total,
    source: quote.lead_source
  });
  
  // TODO: Integrar con sistema de notificaciones push/WhatsApp
  // Ejemplo de mensaje: "¡Hot Lead! Juan Pérez acaba de cotizar un paquete de $6,000"
}

// Enviar cotización al cliente
async function sendQuoteToClient(quote: any, client: any) {
  const quoteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/propuesta/${quote.short_code}`;
  
  logger.debug('📧 Enviando cotización a cliente:', {
    phone: client.phone || client.whatsapp,
    url: quoteUrl
  });
  
  // TODO: Integrar con API de WhatsApp para enviar el link
}
