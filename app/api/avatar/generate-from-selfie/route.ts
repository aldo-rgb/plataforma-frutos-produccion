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

    // ═══════════════════════════════════════════════════════════════
    // SISTEMA DE PROMPTS - Estilo Comic Book Animado Digital
    // Fusión de estética anime y novela gráfica occidental
    // Similar a un still de película animada de alta calidad
    // ═══════════════════════════════════════════════════════════════

    // Descriptor de género para el prompt
    const genderDescriptors: Record<string, string> = {
      male: 'man',
      female: 'woman',
      neutral: 'person'
    };
    const genderDescriptor = genderDescriptors[gender] || 'person';

    // Vibes por defecto (sin arquetipo específico)
    const vibePrompts: Record<string, { positive: string; negative: string }> = {
      cyberpunk: {
        positive: `digital comic book illustration of img, stylized animated ${genderDescriptor} character, cyberpunk aesthetic, vibrant colors, bold clean lines, anime-western fusion art style, cel-shaded skin, futuristic tech-wear with glowing cyan and purple circuits, holographic displays, neon city background, dynamic waist-up portrait, high quality digital art, artstation, not a photograph`,
        negative: 'photorealistic, real photo, photography, realistic skin, 3D render, unreal engine, muted colors, dark gritty, weapons, guns, aggressive, ugly, deformed, bad anatomy, watermark, text, blurry, low quality, multiple people'
      },
      mystic: {
        positive: `digital comic book illustration of img, stylized animated ${genderDescriptor} mystic character, ethereal magical aesthetic, vibrant colors, bold clean lines, anime-western fusion art style, cel-shaded skin, flowing mystical robes with glowing runes, magical particles, cosmic sanctuary background, dynamic waist-up portrait, high quality digital art, artstation, not a photograph`,
        negative: 'photorealistic, real photo, photography, realistic skin, 3D render, unreal engine, muted colors, dark gritty, weapons, guns, aggressive, ugly, deformed, bad anatomy, watermark, text, blurry, low quality, multiple people'
      }
    };

    const selectedVibe = vibePrompts[vibe] || vibePrompts.cyberpunk;

    // Si hay designación, construir prompt personalizado según el Consejo Quantum Matter
    let promptToUse = selectedVibe.positive;
    let negativePromptToUse = selectedVibe.negative;

    if (designation && visualTags && archetype) {
      // Roles y descripciones por arquetipo
      const roleDescriptions: Record<string, string> = {
        'SCOUT': 'Quantum Scout',
        'ARCHIVIST': 'Data Archivist',
        'HUNTER': 'Quantum Bounty Hunter',
        'ARCHITECT': 'Reality Architect',
        'BIOHACKER': 'Cybernetic Bio-Hacker',
        'SENTINEL': 'Vault Sentinel',
        'WEAVER': 'Quantum Network Weaver',
        'ALCHEMIST': 'Matter Alchemist',
        'VOYAGER': 'Deep Space Voyager',
        'APEX': 'Quantum Director',
        // Compatibilidad con arquetipos antiguos
        'DIRECTOR': 'Quantum Director',
        'CURATOR': 'Data Archivist',
        'MODELER': 'Reality Architect',
        'OVERSEER': 'Vault Sentinel',
        'STRATEGIST': 'Quantum Bounty Hunter',
        'ENGINEER': 'Reality Architect',
        'ANALYST': 'Data Archivist',
        'OBSERVER': 'Quantum Scout',
        'INTERFACE': 'Quantum Network Weaver'
      };

      const characterRole = roleDescriptions[archetype] || 'Quantum Jumper';
      
      // Outfits ilustrados por arquetipo (estilo dibujado, no texturizado)
      const outfits: Record<string, string> = {
        'SCOUT': 'illustrated tactical exploration suit in matte grey with glowing cyan geometric accents, sleek shoulder guards with luminescent circuit patterns, rendered with bold colors and clean highlights',
        'ARCHIVIST': 'illustrated sophisticated long coat with structured shoulders, glowing electric blue data-ports on the chest, circuitry lines flowing down the sleeves, painted with sharp clean lines',
        'HUNTER': 'illustrated sleek stealth bodysuit with dark purple and red reinforced armor plates, integrated hooded cowl with subtle neon lining, rendered as stylized drawings',
        'ARCHITECT': 'illustrated elegant futuristic formal suit with sharp angular shoulders, geometric crystalline tie with white and gold glow, structured blazer with glowing seams',
        'BIOHACKER': 'illustrated pristine white laboratory tactical suit with neon-green glowing accents, integrated diagnostic displays on forearms, biomechanical patterns rendered with bold lines',
        'SENTINEL': 'illustrated heavy-duty tactical armor with metallic silver finish, hexagonal armor plates with glowing energy conduits, painted with dramatic highlights',
        'WEAVER': 'illustrated flowing quantum robes with fiber-optic patterns that shift in rainbow spectrum colors, elegant draping with embedded light nodes',
        'ALCHEMIST': 'illustrated vintage-futuristic alchemist coat with brass and gold glowing accents, leather apron with tech-inscriptions, rendered in warm metallics',
        'VOYAGER': 'illustrated sleek deep-space explorer suit with astronaut-inspired design, reflective deep blue and silver panels, streamlined silhouette with glowing accents',
        'APEX': 'illustrated divine ceremonial armor in pure white luminescent material with solid gold geometric plates forming sacred patterns, radiating authority and transcendence'
      };

      const outfit = outfits[archetype] || outfits['SCOUT'];
      
      // Accesorios ilustrados por arquetipo
      const accessories: Record<string, string> = {
        'SCOUT': 'holding a floating illustrated holographic compass projecting a stylized map',
        'ARCHIVIST': 'holding a glowing crystallized data-shard, examining it with focused expression',
        'HUNTER': 'equipped with an illustrated wrist-mounted scanner emitting a stylized red laser grid',
        'ARCHITECT': 'manipulating floating 3D wireframe blueprints with geometric patterns',
        'BIOHACKER': 'visible illustrated bioluminescent tattoos on the neck, holding a glowing smart-injector',
        'SENTINEL': 'projecting an illustrated hexagonal energy shield from the forearm',
        'WEAVER': 'surrounded by floating illustrated nodes of light connected by colorful energy threads',
        'ALCHEMIST': 'holding an illustrated flask where liquid energy transforms into a glowing gold crystal',
        'VOYAGER': 'looking at a floating illustrated hologram of a distant galaxy with stars',
        'APEX': 'with an illustrated crown of floating hexagonal crystals hovering above the head'
      };

      const accessory = accessories[archetype] || accessories['SCOUT'];
      
      // Colores de acento por arquetipo
      const accentColors: Record<string, string> = {
        'SCOUT': 'cyan and teal',
        'ARCHIVIST': 'electric blue and white',
        'HUNTER': 'purple, red and crimson',
        'ARCHITECT': 'white and gold',
        'BIOHACKER': 'neon green and white',
        'SENTINEL': 'metallic silver and blue',
        'WEAVER': 'rainbow spectrum with purple base',
        'ALCHEMIST': 'brass, gold and amber',
        'VOYAGER': 'deep blue, silver and starlight',
        'APEX': 'white, gold and divine light'
      };

      const accentColor = accentColors[archetype] || 'cyan and purple';

      // Fondos ilustrados por arquetipo
      const backgrounds: Record<string, string> = {
        'SCOUT': 'a richly illustrated exploration outpost with holographic terrain maps, scanning equipment, and a view of an alien landscape with geometric formations',
        'ARCHIVIST': 'a richly illustrated data archive chamber with floating holographic books, glowing data streams, and towering crystalline storage structures',
        'HUNTER': 'a richly illustrated urban rooftop at night with neon city lights below, holographic target displays, and stylized rain effects',
        'ARCHITECT': 'a richly illustrated design studio with floating 3D blueprints, geometric wireframes, and a view of futuristic buildings being constructed',
        'BIOHACKER': 'a richly illustrated high-tech laboratory with glowing specimen tubes, holographic DNA strands, and bioluminescent plant specimens',
        'SENTINEL': 'a richly illustrated vault command center with security displays, energy barriers, and massive protected doors with geometric patterns',
        'WEAVER': 'a richly illustrated quantum nexus with flowing data rivers, interconnected light nodes, and a cosmic network visualization',
        'ALCHEMIST': 'a richly illustrated alchemical workshop with floating formulas, transmutation circles, and shelves of glowing crystalline substances',
        'VOYAGER': 'a richly illustrated spacecraft bridge with a panoramic view of distant galaxies, star maps, and navigation holographics',
        'APEX': 'a richly illustrated quantum command center with holographic displays showing growth charts, abstract data streams flowing, and a panoramic view of a glowing cyber-city through massive windows'
      };

      const background = backgrounds[archetype] || backgrounds['APEX'];
      
      // ═══════════════════════════════════════════════════════════════
      // PROMPT MAESTRO - Estilo Comic Book Animado Digital
      // Para PhotoMaker-Style: usar "img" como trigger word
      // Estilo: Ilustración digital vibrante tipo película animada
      // ═══════════════════════════════════════════════════════════════
      promptToUse = `digital comic book illustration of img, stylized animated character portrait, ${genderDescriptor} ${characterRole}, vibrant colors, bold clean lines, anime-western fusion art style, cel-shaded skin, ${outfit}, ${accessory}, glowing ${accentColor} neon accents, holographic elements, ${background}, dynamic waist-up composition, high quality digital art, artstation, painterly finish, not a photograph`;
    
      negativePromptToUse = 'photorealistic, real photo, photography, realistic skin, realistic fabric, 3D render, unreal engine, muted colors, dark gritty, weapons, guns, aggressive, ugly, deformed, bad anatomy, watermark, text, blurry, low quality, cropped, multiple people, bad hands';
      
      logger.debug('🎨 Prompt Comic Book Animado para PhotoMaker');
      logger.debug('🏢 Designación:', designation);
      logger.debug('🎭 Arquetipo:', archetype);
      logger.debug('👤 Rol:', characterRole);
      logger.debug('🎨 Colores:', accentColor);
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
    
    // ═══════════════════════════════════════════════════════════════
    // PhotoMaker: Genera avatares manteniendo identidad facial
    // Aumentamos style_strength_ratio para más estilización
    // ═══════════════════════════════════════════════════════════════
    const inputParams: any = {
      input_image: primaryImage,
      prompt: promptToUse,
      negative_prompt: negativePromptToUse,
      num_outputs: 1,
      guidance_scale: 7.5, // Alto para seguir el prompt de estilo
      num_inference_steps: 50,
      scheduler: "EulerDiscreteScheduler",
      style_strength_ratio: 45, // 45% estilo, 55% identidad - más artístico
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
    
    // Crear predicción con PhotoMaker
    // Modelo: tencentarc/photomaker
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
