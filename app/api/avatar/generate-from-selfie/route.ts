import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Replicate from 'replicate';

// Verificar que el token esté configurado
if (!process.env.REPLICATE_API_TOKEN) {
  console.error('❌ REPLICATE_API_TOKEN no está configurado en .env');
}

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || '',
});

/**
 * POST /api/avatar/generate-from-selfie
 * Genera un avatar estilizado basado en una selfie del usuario
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 POST /api/avatar/generate-from-selfie - Iniciando');
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      console.log('❌ No hay sesión de usuario');
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    console.log('✅ Usuario autenticado:', session.user.email);

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
    const { image, gender, vibe = 'cyberpunk', designation, archetype, visualTags, identityId, selectedOptionId } = body;

    if (!image) {
      return NextResponse.json({ error: 'Imagen requerida' }, { status: 400 });
    }

    // Buscar usuario
    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email }
    });

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    console.log('✅ Usuario encontrado:', usuario.id, usuario.nombre);
    console.log('🎭 Designación:', designation);
    console.log('🏷️ Visual Tags:', visualTags);

    // TEMPORAL: Comentado mientras se regenera el cliente de Prisma
    // TODO: Descomentar después de verificar que el modelo existe
    /*
    // Verificar intentos disponibles (límite de 3 gratuitos)
    const attemptCount = await prisma.avatarGenerationAttempt.count({
      where: {
        usuarioId: usuario.id,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // últimos 30 días
        }
      }
    });

    if (attemptCount >= 3) {
      return NextResponse.json({
        error: 'Has alcanzado el límite de 3 avatares gratuitos por mes',
        requiresPremium: true
      }, { status: 429 });
    }

    console.log(`📊 Intentos usados: ${attemptCount}/3`);
    */

    console.log('⚠️ Verificación de límites temporalmente deshabilitada');

    // Construir el prompt según el género y vibe
    const genderPrompts: Record<string, string> = {
      male: 'male person',
      female: 'female person',
      neutral: 'androgynous person'
    };

    const vibePrompts: Record<string, { positive: string; negative: string }> = {
      cyberpunk: {
        positive: `A photo of a img ${genderPrompts[gender]}, cyberpunk aesthetic, neon lights reflecting on face, futuristic tactical jacket with glowing circuit patterns, holographic displays in background, advanced tech visor, metallic and synthetic materials, dramatic lighting with blue and purple neon glow, high-tech urban environment, unreal engine 5 render, 8k quality, professional digital art, sharp focus, cinematic composition, from waist up`,
        negative: 'ugly, deformed, disfigured, bad anatomy, bad proportions, extra limbs, cloned face, malformed limbs, missing arms, missing legs, fused fingers, too many fingers, long neck, watermark, signature, text, logo'
      },
      mystic: {
        positive: `A photo of a img ${genderPrompts[gender]}, fantasy druid aesthetic, glowing mystical runes on forehead, ethereal energy emanating from hands, organic elements like leaves and vines integrated into clothing, magical particles floating around, soft ethereal lighting, fantasy forest background, concept art style, 8k quality, professional digital art, sharp focus, from waist up`,
        negative: 'ugly, deformed, disfigured, bad anatomy, bad proportions, watermark, signature, text, logo'
      }
    };

    const selectedVibe = vibePrompts[vibe] || vibePrompts.cyberpunk;

    // Si hay designación, construir prompt personalizado
    let promptToUse = selectedVibe.positive;
    let negativePromptToUse = selectedVibe.negative;

    if (designation && visualTags && archetype) {
      const genderPrompts: Record<string, string> = {
        male: 'male person',
        female: 'female person',
        neutral: 'androgynous person'
      };

      // Mapeo de arquetipos a descripciones visuales
      const archetypeDescriptions: Record<string, string> = {
        CEREBRAL: 'intellectual appearance, data visualization elements, neural interface technology, cerebral focused design, analytical expression',
        PHYSICAL: 'athletic build, dynamic pose, movement-focused gear, agile appearance, physical strength emphasis',
        LEADER: 'commanding presence, leadership aura, strategic equipment, tactical gear, authoritative stance'
      };

      // Construir prompt con la designación
      const visualTagsStr = visualTags.join(', ');
      const archetypeDesc = archetypeDescriptions[archetype] || '';
      
      promptToUse = `A photo of a img ${genderPrompts[gender]}, embodying the ${designation} designation, ${archetypeDesc}, ${visualTagsStr}, cyberpunk aesthetic, neon lights, futuristic environment, high-tech suit, dramatic lighting with blue and purple neon glow, unreal engine 5 render, 8k quality, professional digital art, sharp focus, cinematic composition, from waist up`;
      
      console.log('🎭 Prompt personalizado con designación:', designation);
    }

    console.log('🎨 Generando con Replicate...');
    console.log('Vibe:', vibe);
    console.log('Gender:', gender);

    // IMPORTANTE: Usamos el método de predictions para obtener URLs directamente
    // PhotoMaker retorna ReadableStream con replicate.run(), necesitamos polling
    
    // Crear predicción en Replicate
    const prediction = await replicate.predictions.create({
      version: "ddfc2b08d209f9fa8c1eca692712918bd449f695dabb4a958da31802a9570fe4",
      input: {
        input_image: image, // base64 string
        prompt: promptToUse,
        negative_prompt: negativePromptToUse,
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
      await new Promise(resolve => setTimeout(resolve, 1000)); // Esperar 1 segundo
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

    // El output ahora es un array de URLs (strings)
    let avatarUrl = Array.isArray(result.output) ? result.output[0] : result.output;

    // TODO: IMPORTANTE - En producción, descarga esta imagen y súbela a tu S3/Cloudinary
    // Por ahora usamos la URL temporal de Replicate
    // Ejemplo con fetch + upload a S3:
    /*
    const imageResponse = await fetch(avatarUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const uploadedUrl = await uploadToS3(imageBuffer, `avatars/${usuario.id}-${Date.now()}.png`);
    avatarUrl = uploadedUrl;
    */

    // TEMPORAL: Comentado mientras se regenera el cliente de Prisma
    /*
    // Registrar intento
    await prisma.avatarGenerationAttempt.create({
      data: {
        usuarioId: usuario.id,
        sourceImage: 'selfie', // No guardamos la imagen original por privacidad
        generatedUrl: avatarUrl,
        vibe: vibe,
        gender: gender,
        createdAt: new Date()
      }
    });

    console.log('✅ Intento registrado en BD');
    */

    console.log('⚠️ Registro de intento temporalmente deshabilitado');

    // Actualizar profileImage del usuario
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        profileImage: avatarUrl,
        lastAvatarChangeDate: new Date()
      }
    });

    console.log('✅ Avatar actualizado en perfil del usuario');

    // Si hay identityId, actualizar también el QuantumIdentity
    if (identityId && selectedOptionId) {
      try {
        await prisma.quantumIdentity.update({
          where: { id: identityId },
          data: {
            selectedOption: selectedOptionId,
            status: 'COMPLETED',
            avatarUrl: avatarUrl,
            completedAt: new Date()
          }
        });
        console.log('✅ QuantumIdentity actualizado con ID:', identityId);
      } catch (qiError) {
        console.error('⚠️ Error actualizando QuantumIdentity:', qiError);
        // No fallar la request, el avatar ya está guardado en el usuario
      }
    }

    // Nota de privacidad: La imagen base64 original NO se guarda
    // Solo mantenemos la URL del avatar generado

    return NextResponse.json({
      success: true,
      avatarUrl: avatarUrl,
      attemptsRemaining: 2, // Temporal, hasta que se active el tracking
      message: 'Avatar generado exitosamente'
    });

  } catch (error: any) {
    console.error('❌ Error generando avatar:', error);
    return NextResponse.json(
      { 
        error: 'Error al generar el avatar',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
