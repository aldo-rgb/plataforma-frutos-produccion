import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { nanoid } from 'nanoid';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Generar código corto único para URL
function generateShortCode(): string {
  return nanoid(8).toLowerCase();
}

// GET - Obtener cotizaciones del usuario
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const quoteId = searchParams.get('id');
    
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    
    // Si piden una cotización específica
    if (quoteId) {
      const { data: quote, error } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', quoteId)
        .eq('user_id', parseInt(userId))
        .single();
      
      if (error || !quote) {
        return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 });
      }
      
      return NextResponse.json({ success: true, quote: transformQuote(quote) });
    }
    
    // Obtener todas las cotizaciones
    let query = supabase
      .from('quotes')
      .select('*')
      .eq('user_id', parseInt(userId))
      .order('created_at', { ascending: false });
    
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    
    const { data: quotes, error } = await query;
    
    if (error) throw error;
    
    // Calcular stats
    const stats = calculateStats(quotes || []);
    
    return NextResponse.json({ 
      success: true, 
      quotes: (quotes || []).map(transformQuote),
      stats
    });
    
  } catch (error: any) {
    console.error('Error fetching quotes:', error);
    return NextResponse.json({ 
      error: error.message || 'Error al obtener cotizaciones' 
    }, { status: 500 });
  }
}

// POST - Crear nueva cotización
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    
    const body = await request.json();
    const { 
      client, 
      items, 
      optionalItems,
      discount,
      discountType,
      tax,
      currency = 'MXN',
      validDays = 15,
      notes,
      requiresDeposit = false,
      depositPercent = 50,
      sendNow = false
    } = body;
    
    if (!client?.name) {
      return NextResponse.json({ 
        error: 'Nombre del cliente requerido' 
      }, { status: 400 });
    }
    
    if (!items || items.length === 0) {
      return NextResponse.json({ 
        error: 'Debe agregar al menos un item' 
      }, { status: 400 });
    }
    
    // Calcular totales
    const subtotal = items.reduce((sum: number, item: any) => sum + item.total, 0);
    let total = subtotal;
    
    if (discount) {
      if (discountType === 'percentage') {
        total -= (subtotal * discount / 100);
      } else {
        total -= discount;
      }
    }
    
    if (tax) {
      total += (total * tax / 100);
    }
    
    const shortCode = generateShortCode();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + validDays);
    
    const newQuote = {
      id: uuidv4(),
      short_code: shortCode,
      user_id: parseInt(userId),
      client_data: JSON.stringify(client),
      items: JSON.stringify(items),
      optional_items: optionalItems ? JSON.stringify(optionalItems) : null,
      subtotal,
      discount: discount || 0,
      discount_type: discountType || null,
      tax: tax || 0,
      total,
      currency,
      valid_days: validDays,
      expires_at: expiresAt.toISOString(),
      notes: notes || null,
      requires_deposit: requiresDeposit,
      deposit_percent: depositPercent,
      status: sendNow ? 'sent' : 'draft',
      view_count: 0,
      sent_at: sendNow ? new Date().toISOString() : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('quotes')
      .insert(newQuote)
      .select()
      .single();
    
    if (error) throw error;
    
    // Si se envía ahora, notificar por WhatsApp/Email
    if (sendNow && (client.whatsapp || client.email)) {
      await sendQuoteNotification(data, client);
    }
    
    return NextResponse.json({ 
      success: true, 
      quote: transformQuote(data),
      quoteUrl: `${process.env.NEXT_PUBLIC_APP_URL}/propuesta/${shortCode}`
    });
    
  } catch (error: any) {
    console.error('Error creating quote:', error);
    return NextResponse.json({ 
      error: error.message || 'Error al crear cotización' 
    }, { status: 500 });
  }
}

// PUT - Actualizar cotización
export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    
    const body = await request.json();
    const { id, ...updates } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }
    
    // Verificar propiedad
    const { data: existing } = await supabase
      .from('quotes')
      .select('id, status')
      .eq('id', id)
      .eq('user_id', parseInt(userId))
      .single();
    
    if (!existing) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 });
    }
    
    // No permitir editar cotizaciones aprobadas o rechazadas
    if (existing.status === 'approved' || existing.status === 'rejected') {
      return NextResponse.json({ 
        error: 'No se puede editar una cotización finalizada' 
      }, { status: 400 });
    }
    
    const dbUpdates: any = {
      updated_at: new Date().toISOString()
    };
    
    if (updates.client) dbUpdates.client_data = JSON.stringify(updates.client);
    if (updates.items) {
      dbUpdates.items = JSON.stringify(updates.items);
      // Recalcular totales
      const subtotal = updates.items.reduce((sum: number, item: any) => sum + item.total, 0);
      dbUpdates.subtotal = subtotal;
      let total = subtotal;
      if (updates.discount) {
        if (updates.discountType === 'percentage') {
          total -= (subtotal * updates.discount / 100);
        } else {
          total -= updates.discount;
        }
      }
      if (updates.tax) {
        total += (total * updates.tax / 100);
      }
      dbUpdates.total = total;
    }
    if (updates.optionalItems) dbUpdates.optional_items = JSON.stringify(updates.optionalItems);
    if (updates.discount !== undefined) dbUpdates.discount = updates.discount;
    if (updates.discountType !== undefined) dbUpdates.discount_type = updates.discountType;
    if (updates.tax !== undefined) dbUpdates.tax = updates.tax;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (updates.validDays) {
      dbUpdates.valid_days = updates.validDays;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + updates.validDays);
      dbUpdates.expires_at = expiresAt.toISOString();
    }
    if (updates.status) {
      dbUpdates.status = updates.status;
      if (updates.status === 'sent') {
        dbUpdates.sent_at = new Date().toISOString();
      }
    }
    
    const { data, error } = await supabase
      .from('quotes')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return NextResponse.json({ 
      success: true, 
      quote: transformQuote(data) 
    });
    
  } catch (error: any) {
    console.error('Error updating quote:', error);
    return NextResponse.json({ 
      error: error.message || 'Error al actualizar cotización' 
    }, { status: 500 });
  }
}

// DELETE - Eliminar cotización
export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    
    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }
    
    const { error } = await supabase
      .from('quotes')
      .delete()
      .eq('id', id)
      .eq('user_id', parseInt(userId));
    
    if (error) throw error;
    
    return NextResponse.json({ success: true });
    
  } catch (error: any) {
    console.error('Error deleting quote:', error);
    return NextResponse.json({ 
      error: error.message || 'Error al eliminar cotización' 
    }, { status: 500 });
  }
}

// Transformar de DB a modelo
function transformQuote(dbQuote: any) {
  return {
    id: dbQuote.id,
    shortCode: dbQuote.short_code,
    userId: dbQuote.user_id,
    client: JSON.parse(dbQuote.client_data || '{}'),
    items: JSON.parse(dbQuote.items || '[]'),
    optionalItems: dbQuote.optional_items ? JSON.parse(dbQuote.optional_items) : [],
    subtotal: dbQuote.subtotal,
    discount: dbQuote.discount,
    discountType: dbQuote.discount_type,
    tax: dbQuote.tax,
    total: dbQuote.total,
    currency: dbQuote.currency,
    validDays: dbQuote.valid_days,
    expiresAt: dbQuote.expires_at,
    notes: dbQuote.notes,
    requiresDeposit: dbQuote.requires_deposit,
    depositPercent: dbQuote.deposit_percent,
    status: dbQuote.status,
    viewCount: dbQuote.view_count,
    lastViewedAt: dbQuote.last_viewed_at,
    signatureImage: dbQuote.signature_image,
    signedAt: dbQuote.signed_at,
    signedByName: dbQuote.signed_by_name,
    signedByIp: dbQuote.signed_by_ip,
    paymentIntentId: dbQuote.payment_intent_id,
    paidAt: dbQuote.paid_at,
    paidAmount: dbQuote.paid_amount,
    createdAt: dbQuote.created_at,
    updatedAt: dbQuote.updated_at,
    sentAt: dbQuote.sent_at,
    isAutoGenerated: dbQuote.is_auto_generated,
    leadSource: dbQuote.lead_source
  };
}

// Calcular estadísticas
function calculateStats(quotes: any[]) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  const stats = {
    totalQuotes: quotes.length,
    draftCount: 0,
    sentCount: 0,
    viewedCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    expiredCount: 0,
    totalApprovedValue: 0,
    avgQuoteValue: 0,
    conversionRate: 0,
    monthlyQuotes: 0,
    monthlyApproved: 0,
    monthlyValue: 0
  };
  
  let totalValue = 0;
  let sentOrBetter = 0;
  
  quotes.forEach(q => {
    const quote = transformQuote(q);
    totalValue += quote.total || 0;
    
    switch (quote.status) {
      case 'draft': stats.draftCount++; break;
      case 'sent': stats.sentCount++; sentOrBetter++; break;
      case 'viewed': stats.viewedCount++; sentOrBetter++; break;
      case 'approved': 
        stats.approvedCount++; 
        sentOrBetter++;
        stats.totalApprovedValue += quote.total || 0;
        break;
      case 'rejected': stats.rejectedCount++; sentOrBetter++; break;
      case 'expired': stats.expiredCount++; sentOrBetter++; break;
    }
    
    // Métricas mensuales
    const createdAt = new Date(quote.createdAt);
    if (createdAt >= startOfMonth) {
      stats.monthlyQuotes++;
      if (quote.status === 'approved') {
        stats.monthlyApproved++;
        stats.monthlyValue += quote.total || 0;
      }
    }
  });
  
  stats.avgQuoteValue = quotes.length > 0 ? totalValue / quotes.length : 0;
  stats.conversionRate = sentOrBetter > 0 ? (stats.approvedCount / sentOrBetter) * 100 : 0;
  
  return stats;
}

// Enviar notificación de cotización
async function sendQuoteNotification(quote: any, client: any) {
  // TODO: Integrar con sistema de notificaciones existente
  // Por ahora solo log
  console.log('Enviando cotización a:', client);
  
  // Si hay WhatsApp, enviar link
  if (client.whatsapp) {
    // Llamar a API de WhatsApp
  }
  
  // Si hay email, enviar email
  if (client.email) {
    // Llamar a API de email
  }
}
