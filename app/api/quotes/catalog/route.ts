import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Obtener catálogo de servicios del usuario
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    
    const { data: items, error } = await supabase
      .from('quote_catalog_items')
      .select('*')
      .eq('user_id', parseInt(userId))
      .eq('is_active', true)
      .order('order', { ascending: true });
    
    if (error) throw error;
    
    // Transformar snake_case a camelCase
    const transformedItems = (items || []).map(item => ({
      id: item.id,
      userId: item.user_id,
      name: item.name,
      description: item.description,
      priceType: item.price_type,
      price: item.price,
      priceMax: item.price_max,
      unit: item.unit,
      photo: item.photo,
      icon: item.icon,
      category: item.category,
      isActive: item.is_active,
      order: item.order,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    }));
    
    return NextResponse.json({ 
      success: true, 
      items: transformedItems 
    });
    
  } catch (error: any) {
    console.error('Error fetching catalog:', error);
    return NextResponse.json({ 
      error: error.message || 'Error al obtener catálogo' 
    }, { status: 500 });
  }
}

// POST - Crear nuevo item en el catálogo
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    
    const body = await request.json();
    const { name, description, priceType, price, priceMax, unit, photo, icon, category } = body;
    
    if (!name || !priceType || price === undefined) {
      return NextResponse.json({ 
        error: 'Nombre, tipo de precio y precio son requeridos' 
      }, { status: 400 });
    }
    
    // Obtener el orden máximo actual
    const { data: maxOrderData } = await supabase
      .from('quote_catalog_items')
      .select('order')
      .eq('user_id', parseInt(userId))
      .order('order', { ascending: false })
      .limit(1);
    
    const nextOrder = maxOrderData && maxOrderData.length > 0 ? maxOrderData[0].order + 1 : 0;
    
    const newItem = {
      id: uuidv4(),
      user_id: parseInt(userId),
      name,
      description: description || '',
      price_type: priceType,
      price: parseFloat(price),
      price_max: priceMax ? parseFloat(priceMax) : null,
      unit: unit || null,
      photo: photo || null,
      icon: icon || '📦',
      category: category || 'general',
      is_active: true,
      order: nextOrder,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('quote_catalog_items')
      .insert(newItem)
      .select()
      .single();
    
    if (error) throw error;
    
    return NextResponse.json({ 
      success: true, 
      item: {
        id: data.id,
        userId: data.user_id,
        name: data.name,
        description: data.description,
        priceType: data.price_type,
        price: data.price,
        priceMax: data.price_max,
        unit: data.unit,
        photo: data.photo,
        icon: data.icon,
        category: data.category,
        isActive: data.is_active,
        order: data.order,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }
    });
    
  } catch (error: any) {
    console.error('Error creating catalog item:', error);
    return NextResponse.json({ 
      error: error.message || 'Error al crear item' 
    }, { status: 500 });
  }
}

// PUT - Actualizar item del catálogo
export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    
    const body = await request.json();
    const { id, name, description, priceType, price, priceMax, unit, photo, icon, category, isActive, order } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }
    
    // Verificar que el item pertenece al usuario
    const { data: existing } = await supabase
      .from('quote_catalog_items')
      .select('id')
      .eq('id', id)
      .eq('user_id', parseInt(userId))
      .single();
    
    if (!existing) {
      return NextResponse.json({ error: 'Item no encontrado' }, { status: 404 });
    }
    
    const updates: any = {
      updated_at: new Date().toISOString()
    };
    
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (priceType !== undefined) updates.price_type = priceType;
    if (price !== undefined) updates.price = parseFloat(price);
    if (priceMax !== undefined) updates.price_max = priceMax ? parseFloat(priceMax) : null;
    if (unit !== undefined) updates.unit = unit;
    if (photo !== undefined) updates.photo = photo;
    if (icon !== undefined) updates.icon = icon;
    if (category !== undefined) updates.category = category;
    if (isActive !== undefined) updates.is_active = isActive;
    if (order !== undefined) updates.order = order;
    
    const { data, error } = await supabase
      .from('quote_catalog_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return NextResponse.json({ 
      success: true, 
      item: {
        id: data.id,
        userId: data.user_id,
        name: data.name,
        description: data.description,
        priceType: data.price_type,
        price: data.price,
        priceMax: data.price_max,
        unit: data.unit,
        photo: data.photo,
        icon: data.icon,
        category: data.category,
        isActive: data.is_active,
        order: data.order,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }
    });
    
  } catch (error: any) {
    console.error('Error updating catalog item:', error);
    return NextResponse.json({ 
      error: error.message || 'Error al actualizar item' 
    }, { status: 500 });
  }
}

// DELETE - Eliminar item del catálogo (soft delete)
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
    
    // Soft delete - solo marcar como inactivo
    const { error } = await supabase
      .from('quote_catalog_items')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', parseInt(userId));
    
    if (error) throw error;
    
    return NextResponse.json({ success: true });
    
  } catch (error: any) {
    console.error('Error deleting catalog item:', error);
    return NextResponse.json({ 
      error: error.message || 'Error al eliminar item' 
    }, { status: 500 });
  }
}
