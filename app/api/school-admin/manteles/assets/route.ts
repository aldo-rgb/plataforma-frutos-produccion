// API para gestionar assets de manteles (fondos y logos)
// Usa Supabase Storage para guardar archivos y un JSON de configuración
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

const BUCKET_NAME = 'mantel-assets';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    return null;
  }
  return createClient(supabaseUrl, supabaseKey);
}

// GET - Obtener configuración de assets de la organización
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['SCHOOL_ADMIN', 'ADMINISTRADOR'].includes(session.user.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const orgId = session.user.organizationId;
    if (!orgId) {
      return NextResponse.json({ error: 'Sin organización asignada' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Storage no configurado' }, { status: 500 });
    }

    // Intentar leer el archivo de configuración
    const configPath = `org-${orgId}/config.json`;
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .download(configPath);

    if (error) {
      // Si no existe, devolver configuración vacía
      return NextResponse.json({
        orgLogo: null,
        backgrounds: [null, null, null, null]
      });
    }

    const configText = await data.text();
    const config = JSON.parse(configText);

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error getting mantel assets:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// POST - Subir un asset (logo o fondo)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['SCHOOL_ADMIN', 'ADMINISTRADOR'].includes(session.user.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const orgId = session.user.organizationId;
    if (!orgId) {
      return NextResponse.json({ error: 'Sin organización asignada' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Storage no configurado' }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string; // 'orgLogo' | 'background1' | 'background2' | 'background3' | 'background4'

    if (!file || !type) {
      return NextResponse.json({ error: 'Archivo y tipo requeridos' }, { status: 400 });
    }

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Solo se permiten imágenes' }, { status: 400 });
    }

    // Crear bucket si no existe
    const { error: bucketError } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      allowedMimeTypes: ['image/*'],
      fileSizeLimit: 10485760 // 10MB
    });
    // Ignorar error si ya existe

    // Subir archivo
    const timestamp = Date.now();
    const ext = file.name.split('.').pop() || 'png';
    const filePath = `org-${orgId}/${type}-${timestamp}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: 'Error al subir archivo' }, { status: 500 });
    }

    // Obtener URL pública
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    // Actualizar configuración
    const configPath = `org-${orgId}/config.json`;
    let config = {
      orgLogo: null as string | null,
      backgrounds: [null, null, null, null] as (string | null)[]
    };

    // Intentar leer configuración existente
    const { data: existingConfig } = await supabase.storage
      .from(BUCKET_NAME)
      .download(configPath);

    if (existingConfig) {
      const text = await existingConfig.text();
      config = JSON.parse(text);
    }

    // Actualizar el campo correspondiente
    if (type === 'orgLogo') {
      config.orgLogo = publicUrl;
    } else if (type.startsWith('background')) {
      const index = parseInt(type.replace('background', '')) - 1;
      if (index >= 0 && index < 4) {
        config.backgrounds[index] = publicUrl;
      }
    }

    // Guardar configuración actualizada
    const configBuffer = Buffer.from(JSON.stringify(config, null, 2));
    await supabase.storage
      .from(BUCKET_NAME)
      .upload(configPath, configBuffer, {
        contentType: 'application/json',
        upsert: true
      });

    return NextResponse.json({
      success: true,
      url: publicUrl,
      config
    });
  } catch (error) {
    console.error('Error uploading mantel asset:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// DELETE - Eliminar un asset
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['SCHOOL_ADMIN', 'ADMINISTRADOR'].includes(session.user.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const orgId = session.user.organizationId;
    if (!orgId) {
      return NextResponse.json({ error: 'Sin organización asignada' }, { status: 400 });
    }

    const { type } = await request.json();

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Storage no configurado' }, { status: 500 });
    }

    // Leer configuración actual
    const configPath = `org-${orgId}/config.json`;
    const { data: existingConfig } = await supabase.storage
      .from(BUCKET_NAME)
      .download(configPath);

    if (!existingConfig) {
      return NextResponse.json({ error: 'No hay configuración' }, { status: 404 });
    }

    const config = JSON.parse(await existingConfig.text());

    // Limpiar el campo correspondiente
    if (type === 'orgLogo') {
      config.orgLogo = null;
    } else if (type.startsWith('background')) {
      const index = parseInt(type.replace('background', '')) - 1;
      if (index >= 0 && index < 4) {
        config.backgrounds[index] = null;
      }
    }

    // Guardar configuración actualizada
    const configBuffer = Buffer.from(JSON.stringify(config, null, 2));
    await supabase.storage
      .from(BUCKET_NAME)
      .upload(configPath, configBuffer, {
        contentType: 'application/json',
        upsert: true
      });

    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error('Error deleting mantel asset:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
