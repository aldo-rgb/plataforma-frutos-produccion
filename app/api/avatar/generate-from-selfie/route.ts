import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Replicate from 'replicate';
import { createClient } from '@supabase/supabase-js';
import logger from '@/lib/logger';

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

// Cliente de Supabase para storage
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
    logger.warn('⚠️ Supabase no configurado, usando URL temporal');
    return imageUrl;
  }

  try {
    logger.debug('📥 Descargando imagen de Replicate...');
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Error descargando imagen: ${response.status}`);
    }
    
    const imageBuffer = await response.arrayBuffer();
    const fileName = `avatars/${userId}-${Date.now()}.png`;
    
    logger.debug('📤 Subiendo a Supabase Storage:', fileName);
    const { data, error } = await supabaseClient.storage
      .from('mentor-assets')
      .upload(fileName, imageBuffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (error) {
      logger.error('❌ Error subiendo a Supabase:', error);
      throw error;
    }

    // Obtener URL pública permanente
    const { data: { publicUrl } } = supabaseClient.storage
      .from('mentor-assets')
      .getPublicUrl(fileName);

    logger.debug('✅ Imagen guardada permanentemente:', publicUrl);
    return publicUrl;
  } catch (error) {
    logger.error('❌ Error en uploadImageToSupabase:', error);
    // Si falla, retornar la URL temporal como fallback
    return imageUrl;
  }
}

/**
 * POST /api/avatar/generate-from-selfie
 * Genera un avatar estilizado basado en una selfie del usuario
 */
export async function POST(request: NextRequest) {
  try {
    logger.debug('🚀 POST /api/avatar/generate-from-selfie - Iniciando');
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      logger.debug('❌ No hay sesión de usuario');
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    logger.debug('✅ Usuario autenticado:', session.user.email);

    // Verificar que Replicate esté configurado
    if (!process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_TOKEN === 'tu_api_key_aqui') {
      logger.error('❌ REPLICATE_API_TOKEN no configurado');
      return NextResponse.json({
        error: 'Servicio de generación de avatares no configurado. Contacta al administrador.',
        hint: 'REPLICATE_API_TOKEN no está configurado en las variables de entorno'
      }, { status: 503 });
    }

    // Obtener datos del request
    const body = await request.json();
    const { image, images, gender, vibe = 'cyberpunk', designation, archetype, visualTags, identityId, selectedOptionId } = body;

    // Soportar múltiples imágenes o imagen única
    const inputImages: string[] = images && images.length > 0 ? images : (image ? [image] : []);

    logger.debug('📥 Request recibido:');
    logger.debug('  - Gender:', gender);
    logger.debug('  - Vibe:', vibe);
    logger.debug('  - Designation:', designation);
    logger.debug('  - Archetype:', archetype);
    logger.debug('  - Número de imágenes:', inputImages.length);

    if (inputImages.length === 0) {
      return NextResponse.json({ error: 'Al menos una imagen es requerida' }, { status: 400 });
    }

    if (!gender || (gender !== 'male' && gender !== 'female' && gender !== 'neutral')) {
      return NextResponse.json({ error: 'Género inválido. Debe ser "male", "female" o "neutral"' }, { status: 400 });
    }

    // Buscar usuario
    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email }
    });

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    logger.debug('✅ Usuario encontrado:', usuario.id, usuario.nombre);
    logger.debug('🎭 Designación:', designation);
    logger.debug('🏷️ Visual Tags:', visualTags);

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

    logger.debug(`📊 Intentos usados: ${attemptCount}/3`);
    */

    logger.debug('⚠️ Verificación de límites temporalmente deshabilitada');

    // Construir el prompt según el género y vibe
    const genderPrompts: Record<string, string> = {
      male: 'male person',
      female: 'female person'
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

    // Si hay designación, construir prompt personalizado según el Consejo Quantum Matter
    let promptToUse = selectedVibe.positive;
    let negativePromptToUse = selectedVibe.negative;

    if (designation && visualTags && archetype) {
      const genderPrompts: Record<string, string> = {
        male: 'male person',
        female: 'female person'
      };

      // Nuevos arquetipos del sistema de niveles
      const roleDescriptions: Record<string, string> = {
        'SCOUT': `Futuristic Scout`,
        'ARCHIVIST': `Data Archivist`,
        'HUNTER': `Quantum Bounty Hunter`,
        'ARCHITECT': `Reality Architect`,
        'BIOHACKER': `Cybernetic Bio-Hacker`,
        'SENTINEL': `Vault Sentinel`,
        'WEAVER': `Quantum Network Weaver`,
        'ALCHEMIST': `Matter Alchemist`,
        'VOYAGER': `Deep Space Voyager`,
        'APEX': `Grandmaster Apex Legend`,
        // Mantener compatibilidad con arquetipos antiguos
        'DIRECTOR': `Grandmaster Apex Legend`,
        'CURATOR': `Data Archivist`,
        'MODELER': `Reality Architect`,
        'OVERSEER': `Vault Sentinel`,
        'STRATEGIST': `Quantum Bounty Hunter`,
        'ENGINEER': `Reality Architect`,
        'ANALYST': `Data Archivist`,
        'OBSERVER': `Futuristic Scout`,
        'INTERFACE': `Quantum Network Weaver`
      };

      const characterRole = roleDescriptions[archetype] || roleDescriptions['SCOUT'];
      
      // Outfits futuristas por arquetipo
      const outfits: Record<string, string> = {
        'SCOUT': 'advanced tactical exploration suit in matte grey and cyan with integrated hexagonal mesh patterns, sleek shoulder guards, and luminescent circuit traces running down the arms',
        'ARCHIVIST': 'sophisticated long coat with structured shoulders, multiple glowing data-ports embedded in the chest, electric blue circuitry lines elegantly flowing down the sleeves, high-tech collar with holographic displays',
        'HUNTER': 'sleek aerodynamic stealth bodysuit with dark purple reinforced armor plates on chest and shoulders, integrated hooded cowl with subtle tech lining, form-fitting but protective design',
        'ARCHITECT': 'elegant futuristic formal suit with sharp angular shoulders, geometric crystalline tie, structured blazer with glowing seams, high-collar design with embedded interface panels',
        'BIOHACKER': 'pristine white and neon-green laboratory tactical suit with reinforced vest panels, integrated medical diagnostic displays on the forearms, tight biomechanical skinsuit underneath with visible tech-veins',
        'SENTINEL': 'heavy-duty tactical armor suit with metallic chrome finish, hexagonal armor plates covering shoulders and chest, stylish yet tank-like protection with glowing energy conduits',
        'WEAVER': 'flowing quantum robes made of fiber-optic smart fabric that shifts colors dynamically, elegant draping with embedded light nodes, high-tech ceremonial appearance',
        'ALCHEMIST': 'vintage-futuristic alchemist coat with brass and gold accents, leather apron overlay with tech-inscriptions, underneath a sleek black bodysuit with energy channels',
        'VOYAGER': 'sleek deep-space explorer suit with astronaut-inspired design (helmet off), reflective glass panels on shoulders, blue-tinted protective plating, streamlined for zero-gravity',
        'APEX': 'divine ceremonial armor made of pure white luminescent material with solid gold geometric plates forming sacred patterns, regal and transcendent design radiating authority'
      };

      const outfit = outfits[archetype] || outfits['SCOUT'];
      
      // Accesorios específicos por arquetipo
      const accessories: Record<string, string> = {
        'SCOUT': 'holding a floating holographic compass that projects a map',
        'ARCHIVIST': 'holding a glowing crystallized data-shard, examining it closely',
        'HUNTER': 'equipped with a wrist-mounted scanner emitting a red laser grid',
        'ARCHITECT': 'manipulating floating 3D wireframe blueprints of a hexagon structure with their hands',
        'BIOHACKER': 'visible bioluminescent tattoos on the neck and a smart-injector device in hand',
        'SENTINEL': 'a hexagonal energy shield projected from the forearm',
        'WEAVER': 'surrounded by floating nodes of light connected by thin energy threads',
        'ALCHEMIST': 'holding a flask where liquid energy is turning into a solid gold crystal',
        'VOYAGER': 'looking at a floating hologram of a distant galaxy',
        'APEX': 'a crown of floating hexagonal crystals hovering above their head'
      };

      const accessory = accessories[archetype] || accessories['SCOUT'];
      
      // Colores según arquetipo
      const accentColors: Record<string, string> = {
        'SCOUT': 'cyan',
        'ARCHIVIST': 'electric blue',
        'HUNTER': 'dark purple and red',
        'ARCHITECT': 'white and gold',
        'BIOHACKER': 'neon green',
        'SENTINEL': 'metallic silver',
        'WEAVER': 'rainbow spectrum',
        'ALCHEMIST': 'brass and gold',
        'VOYAGER': 'deep blue and silver',
        'APEX': 'white and gold'
      };

      const accentColor = accentColors[archetype] || 'cyan';
      
      // ═══════════════════════════════════════════════════════════════
      // PROMPT MAESTRO - Estilo Digital Painting Cyberpunk
      // Personaje futurista con gadgets cuánticos, desde la cintura
      // IMPORTANTE: Solo usar 'img' UNA VEZ en todo el prompt
      // ═══════════════════════════════════════════════════════════════
      promptToUse = `img ${genderPrompts[gender]}, digital painting illustration, semi-realistic anime style, waist-up portrait shot showing upper body and hands, bright ${accentColor} glowing eyes, friendly confident smile, stylized smooth skin with soft cel-shading, sleek white and dark grey futuristic cyber armor with glowing ${accentColor} circuit lines and hexagonal patterns, circular glowing ${accentColor} energy core on chest, futuristic single-eye quantum visor or monocle scanner with ${accentColor} holographic display, ear-mounted tech headset with spiral ${accentColor} glow pattern, one hand raised showing palm in friendly wave gesture or touching holographic interface, floating holographic data panels nearby, blurred cyberpunk city background with neon bokeh lights in ${accentColor} blue and purple, high quality digital art illustration, artstation trending, 8k, vibrant glowing colors, clean sharp lines, professional game character concept art, ${outfit}, ${accessory}`;
    
      negativePromptToUse = 'photorealistic, real photo, photography, realistic skin texture, muted colors, dark gritty, weapons, guns, swords, aggressive, ugly, deformed, bad anatomy, watermark, text, blurry, low quality, cropped, headshot only, face only';
      
      logger.debug('🎭 Prompt Anime/Digital 3D Style para PhotoMaker');
      logger.debug('🏢 Designación:', designation);
      logger.debug('🏢 Arquetipo:', archetype);
      logger.debug('👤 Rol:', characterRole);
    }

    logger.debug('🎨 Generando con Replicate...');
    logger.debug('Vibe:', vibe);
    logger.debug('Gender:', gender);
    logger.debug('Número de imágenes de entrada:', inputImages.length);

    // Obtener instancia de Replicate
    const replicateClient = getReplicate();
    if (!replicateClient) {
      logger.error('❌ Replicate client no disponible');
      return NextResponse.json({
        error: 'Servicio de generación de avatares no disponible.',
        hint: 'REPLICATE_API_TOKEN no está configurado'
      }, { status: 503 });
    }

    // Preparar imágenes de entrada
    // PhotoMaker soporta múltiples imágenes para mejor fidelidad facial
    // Si hay múltiples imágenes, las combinamos o usamos la primera principal
    const primaryImage = inputImages[0];
    
    // Si hay más de una imagen, PhotoMaker puede usar input_image2, input_image3, input_image4
    const inputParams: any = {
      input_image: primaryImage,
      prompt: promptToUse,
      negative_prompt: negativePromptToUse,
      num_outputs: 1,
      guidance_scale: inputImages.length > 1 ? 4.0 : 3.5, // Ligeramente mayor con múltiples fotos
      num_inference_steps: 60,
      scheduler: "DPMSolverMultistep",
      style_strength_ratio: inputImages.length > 1 ? 20 : 15, // Más estilo con múltiples fotos para consistencia
    };

    // Agregar imágenes adicionales si están disponibles
    if (inputImages.length > 1 && inputImages[1]) {
      inputParams.input_image2 = inputImages[1];
      logger.debug('📸 Agregando imagen secundaria para mejor fidelidad');
    }
    if (inputImages.length > 2 && inputImages[2]) {
      inputParams.input_image3 = inputImages[2];
      logger.debug('📸 Agregando tercera imagen');
    }
    if (inputImages.length > 3 && inputImages[3]) {
      inputParams.input_image4 = inputImages[3];
      logger.debug('📸 Agregando cuarta imagen');
    }

    // IMPORTANTE: Usamos el método de predictions para obtener URLs directamente
    // PhotoMaker retorna ReadableStream con replicate.run(), necesitamos polling
    
    // Crear predicción en Replicate con parámetros optimizados para máxima preservación facial
    const prediction = await replicateClient.predictions.create({
      version: "ddfc2b08d209f9fa8c1eca692712918bd449f695dabb4a958da31802a9570fe4",
      input: inputParams
    });

    logger.debug('🔄 Predicción creada:', prediction.id);

    // Polling: Esperar a que termine la generación
    let result = prediction;
    while (result.status !== 'succeeded' && result.status !== 'failed') {
      logger.debug('⏳ Estado:', result.status);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Esperar 1 segundo
      result = await replicateClient.predictions.get(prediction.id);
    }

    if (result.status === 'failed') {
      logger.error('❌ Predicción falló:', result.error);
      return NextResponse.json({
        success: false,
        error: 'La generación falló: ' + result.error
      }, { status: 500 });
    }

    logger.debug('✅ Imagen generada por IA');
    logger.debug('Output:', result.output);

    // El output ahora es un array de URLs (strings)
    let replicateUrl = Array.isArray(result.output) ? result.output[0] : result.output;

    // IMPORTANTE: Subir la imagen a Supabase Storage para URL permanente
    // Las URLs de Replicate son temporales y expiran
    logger.debug('🔄 Guardando imagen permanentemente en Supabase...');
    let avatarUrl = await uploadImageToSupabase(replicateUrl, usuario.id);
    logger.debug('✅ URL permanente:', avatarUrl);

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

    logger.debug('✅ Intento registrado en BD');
    */

    logger.debug('⚠️ Registro de intento temporalmente deshabilitado');

    // Actualizar profileImage del usuario
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        profileImage: avatarUrl,
        lastAvatarChangeDate: new Date()
      }
    });

    logger.debug('✅ Avatar actualizado en perfil del usuario');

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
        logger.debug('✅ QuantumIdentity actualizado con ID:', identityId);
      } catch (qiError) {
        logger.error('⚠️ Error actualizando QuantumIdentity:', qiError);
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
    logger.error('❌ Error generando avatar:', error);
    logger.error('❌ Stack trace:', error.stack);
    logger.error('❌ Error name:', error.name);
    logger.error('❌ Error message:', error.message);
    return NextResponse.json(
      { 
        error: 'Error al generar el avatar',
        details: error.message,
        errorName: error.name
      },
      { status: 500 }
    );
  }
}
