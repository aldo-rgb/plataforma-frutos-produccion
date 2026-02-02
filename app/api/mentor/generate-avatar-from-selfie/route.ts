import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Replicate from 'replicate';
import { createClient } from '@supabase/supabase-js';

// Inicialización lazy de Replicate - solo si hay API token
let replicate: Replicate | null = null;
function getReplicate(): Replicate | null {
  if (!replicate && process.env.REPLICATE_API_TOKEN) {
    replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });
  }
  return replicate;
}

// Cliente de Supabase para storage permanente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fteqhmntkmmppxufjrwt.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
let supabase: ReturnType<typeof createClient> | null = null;

function getSupabase() {
  if (!supabase && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
  }
  return supabase;
}

/**
 * Sube una imagen a Supabase Storage y retorna la URL pública permanente
 */
async function uploadImageToSupabase(imageUrl: string, userId: number): Promise<string> {
  const supabaseClient = getSupabase();
  if (!supabaseClient) {
    console.warn('⚠️ Supabase no configurado, usando URL temporal');
    return imageUrl;
  }

  try {
    console.log('📥 Descargando imagen de Replicate...');
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Error descargando imagen: ${response.status}`);
    }
    
    const imageBuffer = await response.arrayBuffer();
    const fileName = `avatars/mentor-${userId}-${Date.now()}.png`;
    
    console.log('📤 Subiendo a Supabase Storage:', fileName);
    const { data, error } = await supabaseClient.storage
      .from('mentor-assets')
      .upload(fileName, imageBuffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (error) {
      console.error('❌ Error subiendo a Supabase:', error);
      throw error;
    }

    // Obtener URL pública permanente
    const { data: { publicUrl } } = supabaseClient.storage
      .from('mentor-assets')
      .getPublicUrl(fileName);

    console.log('✅ Imagen guardada permanentemente:', publicUrl);
    return publicUrl;
  } catch (error) {
    console.error('❌ Error en uploadImageToSupabase:', error);
    return imageUrl;
  }
}

/**
 * POST /api/mentor/generate-avatar-from-selfie
 * Genera un avatar estilizado de maestro/mentor basado en una selfie
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 POST /api/mentor/generate-avatar-from-selfie - Iniciando');
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      console.log('❌ No hay sesión de usuario');
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    console.log('✅ Usuario autenticado:', session.user.email);

    // Verificar que sea MENTOR o LIDER
    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true, nombre: true }
    });

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    if (usuario.rol !== 'MENTOR' && usuario.rol !== 'LIDER') {
      return NextResponse.json({ 
        error: 'Solo mentores y líderes pueden generar avatares de maestros' 
      }, { status: 403 });
    }

    // Verificar que Replicate esté configurado
    if (!process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_TOKEN === 'tu_api_key_aqui') {
      console.error('❌ REPLICATE_API_TOKEN no configurado');
      return NextResponse.json({
        error: 'Servicio de generación de avatares no configurado. Contacta al administrador.',
        hint: 'REPLICATE_API_TOKEN no está configurado en las variables de entorno'
      }, { status: 503 });
    }

    // Obtener datos del request
    const body = await request.json();
    const { image, images } = body;

    // Soportar múltiples imágenes o imagen única (compatibilidad hacia atrás)
    const inputImages: string[] = images && images.length > 0 ? images : (image ? [image] : []);

    if (inputImages.length === 0) {
      return NextResponse.json({ error: 'Al menos una imagen es requerida' }, { status: 400 });
    }

    console.log('✅ Usuario encontrado:', usuario.id, usuario.nombre, usuario.rol);
    console.log('📸 Número de imágenes recibidas:', inputImages.length);

    // Prompt específico para mentores/maestros - DEBE SALIR CON TRAJE FORMAL
    const mentorPrompt = `A photo of a img person, wearing an elegant dark navy blue formal suit with white dress shirt and subtle tie, professional master teacher appearance, highly evolved human mentor, wise accomplished executive look, premium tailored business suit jacket, confident inspiring leader expression, sophisticated refined aesthetic, premium studio lighting with soft professional glow, high-end corporate office background with elegant wooden bookshelves and warm lighting, cinematic quality, 8k ultra detailed, photorealistic professional headshot, sharp focus, executive portrait photography, from chest up showing suit collar and shoulders, masterful composition, premium quality, formal business executive style`;

    const negativePrompt = 'ugly, deformed, disfigured, bad anatomy, bad proportions, extra limbs, cloned face, malformed limbs, missing arms, missing legs, fused fingers, too many fingers, long neck, watermark, signature, text, logo, casual clothing, t-shirt, hoodie, unprofessional attire, messy, low quality, blurry, no suit, informal wear';

    console.log('🎨 Generando avatar de maestro con Replicate...');

    // Obtener instancia de Replicate
    const replicateClient = getReplicate();
    if (!replicateClient) {
      console.error('❌ Replicate client no disponible');
      return NextResponse.json({
        error: 'Servicio de generación de avatares no disponible.',
        hint: 'REPLICATE_API_TOKEN no está configurado'
      }, { status: 503 });
    }

    // Preparar imágenes de entrada
    // PhotoMaker soporta múltiples imágenes para mejor fidelidad facial
    const primaryImage = inputImages[0];
    
    // Configurar parámetros base
    const inputParams: any = {
      input_image: primaryImage,
      prompt: mentorPrompt,
      negative_prompt: negativePrompt,
      num_outputs: 1,
      guidance_scale: inputImages.length > 1 ? 5.0 : 7.5, // Ajustado para múltiples fotos
      num_inference_steps: inputImages.length > 1 ? 50 : 30, // Más pasos con múltiples fotos
      scheduler: "DPMSolverMultistep",
      style_strength_ratio: inputImages.length > 1 ? 20 : 15, // Mejor consistencia con múltiples fotos
    };

    // Agregar imágenes adicionales si están disponibles (mejora la fidelidad facial)
    if (inputImages.length > 1 && inputImages[1]) {
      inputParams.input_image2 = inputImages[1];
      console.log('📸 Agregando imagen secundaria para mejor fidelidad');
    }
    if (inputImages.length > 2 && inputImages[2]) {
      inputParams.input_image3 = inputImages[2];
      console.log('📸 Agregando tercera imagen');
    }
    if (inputImages.length > 3 && inputImages[3]) {
      inputParams.input_image4 = inputImages[3];
      console.log('📸 Agregando cuarta imagen');
    }

    // Crear predicción en Replicate
    const prediction = await replicateClient.predictions.create({
      version: "ddfc2b08d209f9fa8c1eca692712918bd449f695dabb4a958da31802a9570fe4",
      input: inputParams
    });

    console.log('🔄 Predicción creada:', prediction.id);

    // Polling: Esperar a que termine la generación
    let result = prediction;
    while (result.status !== 'succeeded' && result.status !== 'failed') {
      console.log('⏳ Estado:', result.status);
      await new Promise(resolve => setTimeout(resolve, 1000));
      result = await replicateClient.predictions.get(prediction.id);
    }

    if (result.status === 'failed') {
      console.error('❌ Predicción falló:', result.error);
      return NextResponse.json({
        success: false,
        error: 'La generación falló: ' + result.error
      }, { status: 500 });
    }

    console.log('✅ Imagen generada por IA');
    console.log('Output:', result.output);

    let replicateUrl = Array.isArray(result.output) ? result.output[0] : result.output;

    // Subir imagen a Supabase Storage para URL permanente
    console.log('🔄 Guardando imagen permanentemente en Supabase...');
    let avatarUrl = await uploadImageToSupabase(replicateUrl, usuario.id);
    console.log('✅ URL permanente:', avatarUrl);

    // Actualizar profileImage del usuario
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        profileImage: avatarUrl,
        lastAvatarChangeDate: new Date()
      }
    });

    console.log('✅ Avatar de maestro actualizado en perfil del usuario');

    return NextResponse.json({
      success: true,
      avatarUrl: avatarUrl,
      message: 'Avatar de maestro generado exitosamente'
    });

  } catch (error: any) {
    console.error('❌ Error generando avatar de maestro:', error);
    return NextResponse.json(
      { 
        error: 'Error al generar el avatar',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
