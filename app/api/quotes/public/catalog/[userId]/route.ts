import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import logger from '@/lib/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Params {
  params: { userId: string };
}

// GET - Obtener catálogo público de un usuario (para el widget)
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { userId } = params;
    
    if (!userId) {
      return NextResponse.json({ error: 'Usuario requerido' }, { status: 400 });
    }
    
    const { data: items, error } = await supabase
      .from('quote_catalog_items')
      .select('id, name, description, price, price_type, icon, category')
      .eq('user_id', parseInt(userId))
      .eq('is_active', true)
      .order('order', { ascending: true });
    
    if (error) throw error;
    
    // Solo devolver info pública
    const publicItems = (items || []).map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.price,
      priceType: item.price_type,
      icon: item.icon || '📦',
      category: item.category || 'general'
    }));
    
    return NextResponse.json({ 
      success: true, 
      items: publicItems 
    });
    
  } catch (error: any) {
    logger.error('Error fetching public catalog:', error);
    return NextResponse.json({ 
      error: error.message || 'Error al obtener catálogo' 
    }, { status: 500 });
  }
}
