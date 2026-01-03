import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Replicate from 'replicate';

if (!process.env.REPLICATE_API_TOKEN) {
  console.error('❌ REPLICATE_API_TOKEN no está configurado en .env');
}

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || '',
});

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
    const { image } = body;

    if (!image) {
      return NextResponse.json({ error: 'Imagen requerida' }, { status: 400 });
    }

    console.log('✅ Usuario encontrado:', usuario.id, usuario.nombre, usuario.rol);

    // Prompt específico para mentores/maestros con perfil avanzado
    const mentorPrompt = `A photo of a img person, professional master teacher appearance, highly evolved human, advanced mentor presence, wise and accomplished look, professional business attire with subtle futuristic elements, confident and inspiring expression, guru-like aura, sophisticated and refined aesthetic, premium lighting with soft glow, high-end professional background with elegant tech elements, cinematic quality, 8k ultra detailed, photorealistic render, sharp focus, professional portrait photography, from shoulders up, masterful composition, premium quality`;

    const negativePrompt = 'ugly, deformed, disfigured, bad anatomy, bad proportions, extra limbs, cloned face, malformed limbs, missing arms, missing legs, fused fingers, too many fingers, long neck, watermark, signature, text, logo, casual clothing, unprofessional, messy, low quality, blurry';

    console.log('🎨 Generando avatar de maestro con Replicate...');

    // Crear predicción en Replicate
    const prediction = await replicate.predictions.create({
      version: "ddfc2b08d209f9fa8c1eca692712918bd449f695dabb4a958da31802a9570fe4",
      input: {
        input_image: image,
        prompt: mentorPrompt,
        negative_prompt: negativePrompt,
        num_outputs: 1,
        guidance_scale: 7.5,
        num_inference_steps: 30,
        scheduler: "DPMSolverMultistep",
      }
    });

    console.log('🔄 Predicción creada:', prediction.id);

    // Polling: Esperar a que termine la generación
    let result = prediction;
    while (result.status !== 'succeeded' && result.status !== 'failed') {
      console.log('⏳ Estado:', result.status);
      await new Promise(resolve => setTimeout(resolve, 1000));
      result = await replicate.predictions.get(prediction.id);
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

    let avatarUrl = Array.isArray(result.output) ? result.output[0] : result.output;

    // TODO: En producción, descarga esta imagen y súbela a tu S3/Cloudinary
    // Por ahora usamos la URL temporal de Replicate

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
