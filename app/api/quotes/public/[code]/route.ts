import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import logger from '@/lib/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Params {
  params: { code: string };
}

// GET - Ver propuesta pública (sin auth)
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { code } = params;
    
    if (!code) {
      return NextResponse.json({ error: 'Código requerido' }, { status: 400 });
    }
    
    // Buscar cotización por código corto
    const { data: quote, error } = await supabase
      .from('quotes')
      .select(`
        *,
        users:user_id (
          id,
          nombre,
          apellido,
          email,
          whatsapp,
          avatar,
          direccion
        )
      `)
      .eq('short_code', code)
      .single();
    
    if (error || !quote) {
      return NextResponse.json({ 
        error: 'Propuesta no encontrada' 
      }, { status: 404 });
    }
    
    // Verificar si está expirada
    const now = new Date();
    const expiresAt = new Date(quote.expires_at);
    if (expiresAt < now && quote.status !== 'approved') {
      // Marcar como expirada si no lo está
      if (quote.status !== 'expired') {
        await supabase
          .from('quotes')
          .update({ status: 'expired' })
          .eq('id', quote.id);
      }
      
      return NextResponse.json({
        error: 'Esta propuesta ha expirado',
        expired: true,
        expiresAt: quote.expires_at
      }, { status: 410 });
    }
    
    // Incrementar contador de vistas
    const newViewCount = (quote.view_count || 0) + 1;
    
    // Actualizar estado a "viewed" si estaba en "sent"
    const updates: any = {
      view_count: newViewCount,
      last_viewed_at: new Date().toISOString()
    };
    
    if (quote.status === 'sent') {
      updates.status = 'viewed';
    }
    
    await supabase
      .from('quotes')
      .update(updates)
      .eq('id', quote.id);
    
    // Notificar al proveedor que vieron su cotización (si es primera vez)
    if (newViewCount === 1) {
      await notifyProviderViewed(quote);
    }
    
    // Transformar datos para el cliente
    const provider = quote.users;
    
    return NextResponse.json({
      success: true,
      quote: {
        id: quote.id,
        shortCode: quote.short_code,
        client: JSON.parse(quote.client_data || '{}'),
        items: JSON.parse(quote.items || '[]'),
        optionalItems: quote.optional_items ? JSON.parse(quote.optional_items) : [],
        subtotal: quote.subtotal,
        discount: quote.discount,
        discountType: quote.discount_type,
        tax: quote.tax,
        total: quote.total,
        currency: quote.currency,
        validDays: quote.valid_days,
        expiresAt: quote.expires_at,
        notes: quote.notes,
        requiresDeposit: quote.requires_deposit,
        depositPercent: quote.deposit_percent,
        status: quote.status === 'sent' ? 'viewed' : quote.status, // Ya lo actualizamos
        createdAt: quote.created_at,
        isApproved: quote.status === 'approved',
        signedAt: quote.signed_at
      },
      provider: provider ? {
        id: provider.id,
        name: `${provider.nombre || ''} ${provider.apellido || ''}`.trim(),
        email: provider.email,
        whatsapp: provider.whatsapp,
        avatar: provider.avatar,
        address: provider.direccion
      } : null
    });
    
  } catch (error: any) {
    logger.error('Error fetching public quote:', error);
    return NextResponse.json({ 
      error: error.message || 'Error al cargar propuesta' 
    }, { status: 500 });
  }
}

// POST - Acciones en la propuesta (aprobar, rechazar, comentar)
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { code } = params;
    const body = await request.json();
    const { action, signature, selectedOptionals, comment, clientName } = body;
    
    if (!code) {
      return NextResponse.json({ error: 'Código requerido' }, { status: 400 });
    }
    
    // Buscar cotización
    const { data: quote, error } = await supabase
      .from('quotes')
      .select('*')
      .eq('short_code', code)
      .single();
    
    if (error || !quote) {
      return NextResponse.json({ 
        error: 'Propuesta no encontrada' 
      }, { status: 404 });
    }
    
    // Verificar que no esté ya finalizada
    if (quote.status === 'approved' || quote.status === 'rejected') {
      return NextResponse.json({ 
        error: 'Esta propuesta ya fue procesada' 
      }, { status: 400 });
    }
    
    // Verificar expiración
    const now = new Date();
    const expiresAt = new Date(quote.expires_at);
    if (expiresAt < now) {
      return NextResponse.json({ 
        error: 'Esta propuesta ha expirado' 
      }, { status: 410 });
    }
    
    // Obtener IP del cliente
    const clientIp = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    
    if (action === 'approve') {
      // Aprobar cotización
      if (!signature) {
        return NextResponse.json({ 
          error: 'Firma digital requerida' 
        }, { status: 400 });
      }
      
      // Recalcular total si hay opcionales seleccionados
      let finalTotal = quote.total;
      let updatedItems = JSON.parse(quote.items || '[]');
      
      if (selectedOptionals && selectedOptionals.length > 0) {
        const optionalItems = JSON.parse(quote.optional_items || '[]');
        selectedOptionals.forEach((optId: string) => {
          const opt = optionalItems.find((o: any) => o.id === optId);
          if (opt) {
            finalTotal += opt.total;
            updatedItems.push({ ...opt, isOptional: true, isSelected: true });
          }
        });
      }
      
      const { error: updateError } = await supabase
        .from('quotes')
        .update({
          status: 'approved',
          signature_image: signature,
          signed_at: new Date().toISOString(),
          signed_by_name: clientName || JSON.parse(quote.client_data || '{}').name,
          signed_by_ip: clientIp,
          total: finalTotal,
          items: JSON.stringify(updatedItems),
          updated_at: new Date().toISOString()
        })
        .eq('id', quote.id);
      
      if (updateError) throw updateError;
      
      // Notificar al proveedor
      await notifyProviderApproved(quote, finalTotal);
      
      return NextResponse.json({
        success: true,
        message: '¡Propuesta aprobada exitosamente!',
        total: finalTotal,
        requiresDeposit: quote.requires_deposit,
        depositAmount: quote.requires_deposit ? (finalTotal * quote.deposit_percent / 100) : 0
      });
      
    } else if (action === 'reject') {
      // Rechazar cotización
      const { error: updateError } = await supabase
        .from('quotes')
        .update({
          status: 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', quote.id);
      
      if (updateError) throw updateError;
      
      // Guardar comentario si hay
      if (comment) {
        await supabase
          .from('quote_comments')
          .insert({
            quote_id: quote.id,
            author_type: 'client',
            author_name: JSON.parse(quote.client_data || '{}').name,
            message: comment,
            created_at: new Date().toISOString()
          });
      }
      
      // Notificar al proveedor
      await notifyProviderRejected(quote, comment);
      
      return NextResponse.json({
        success: true,
        message: 'Gracias por tu respuesta. Hemos notificado al proveedor.'
      });
      
    } else if (action === 'comment') {
      // Solo agregar comentario
      if (!comment) {
        return NextResponse.json({ 
          error: 'Comentario requerido' 
        }, { status: 400 });
      }
      
      await supabase
        .from('quote_comments')
        .insert({
          quote_id: quote.id,
          author_type: 'client',
          author_name: JSON.parse(quote.client_data || '{}').name,
          message: comment,
          created_at: new Date().toISOString()
        });
      
      // Notificar al proveedor
      await notifyProviderComment(quote, comment);
      
      return NextResponse.json({
        success: true,
        message: 'Comentario enviado'
      });
      
    } else {
      return NextResponse.json({ 
        error: 'Acción no válida' 
      }, { status: 400 });
    }
    
  } catch (error: any) {
    logger.error('Error processing quote action:', error);
    return NextResponse.json({ 
      error: error.message || 'Error al procesar acción' 
    }, { status: 500 });
  }
}

// Notificaciones al proveedor
async function notifyProviderViewed(quote: any) {
  logger.debug('🔔 Cotización vista:', quote.short_code);
  // TODO: Integrar con sistema de notificaciones
  // Enviar push notification, email, etc.
}

async function notifyProviderApproved(quote: any, total: number) {
  logger.debug('🎉 Cotización aprobada:', quote.short_code, 'Total:', total);
  // TODO: Integrar con sistema de notificaciones
}

async function notifyProviderRejected(quote: any, comment?: string) {
  logger.debug('❌ Cotización rechazada:', quote.short_code, 'Razón:', comment);
  // TODO: Integrar con sistema de notificaciones
}

async function notifyProviderComment(quote: any, comment: string) {
  logger.debug('💬 Nuevo comentario en cotización:', quote.short_code);
  // TODO: Integrar con sistema de notificaciones
}
