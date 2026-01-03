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

    // Si hay designación, construir prompt personalizado según el Consejo Quantum Matter
    let promptToUse = selectedVibe.positive;
    let negativePromptToUse = selectedVibe.negative;

    if (designation && visualTags && archetype) {
      const genderPrompts: Record<string, string> = {
        male: 'male person',
        female: 'female person',
        neutral: 'androgynous person'
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
      
      // Prompt estilo Cinematic Concept Art
      promptToUse = `A cinematic, highly detailed concept art portrait of ${characterRole}, based on the facial features of a img ${genderPrompts[gender]}.

Corporate role: ${designation}

CRITICAL - Preserve identity: Keep the exact facial structure, nose shape, eye shape, jawline, skin tone, beard style, hair style, and overall facial proportions from the input image. The face must remain identical and seamlessly integrated into the sci-fi art style, not just a photo paste-up.

BODY ADJUSTMENT: The person appears fit and athletic, with a slightly slimmer silhouette suggesting good physical conditioning. Natural, healthy appearance without exaggeration.

OUTFIT & STYLE: They are wearing ${outfit}.

ACCESSORY: ${accessory}.

THE LOOK: The character has a determined, intense expression. The face is seamlessly integrated into the sci-fi art style with realistic skin texture, subsurface scattering, and proper lighting interaction.

AESTHETIC: The style is "Organic Sci-Fi" meets "High-Tech Luxury". Elegant, mysterious, and clean. Not dirty or military.

LIGHTING & ATMOSPHERE: Dramatic neon side-lighting (rim light) in ${accentColor} tones, casting realistic shadows and highlights on the skin with subsurface scattering. The background is a dark, blurred futuristic data interface with floating particles and hexagonal bokeh.

QUALITY BOOSTERS: Masterpiece, 8k resolution, sharp focus, Unreal Engine 5 render, highly polished, intricate details, trending on ArtStation, cinematic concept art quality, photorealistic with artistic enhancement.

STRICT RULES:
✅ PRESERVE: Exact facial features, skin tone, face shape, eye shape, nose, mouth, hair, beard
✅ INTEGRATE: Face seamlessly into the art style with proper lighting and texture
✅ CHANGE: Only clothing, accessories, background, lighting style, sci-fi elements
❌ NEVER: Weapons, face alterations, aggressive poses, military armor, dirty aesthetic, photo paste effect`;
      
      negativePromptToUse = 'changing face shape, different person, altered facial features, photo collage, cut and paste, poorly integrated face, flat lighting, weapons, guns, swords, knives, military uniform, dirty, grungy, post-apocalyptic, aggressive pose, angry expression, armor plates, battle damage, violent, cartoon, anime, illustration, painting, drawing, ugly, deformed, disfigured, bad anatomy, bad proportions, extra limbs, cloned face, malformed limbs, missing arms, missing legs, fused fingers, too many fingers, long neck, watermark, signature, text, logo, blurry face, low quality, amateur';
      
      console.log('🎭 Prompt Cinematic Concept Art para PhotoMaker');
      console.log('🏢 Designación:', designation);
      console.log('🏢 Arquetipo:', archetype);
      console.log('👔 Outfit:', outfit.substring(0, 50) + '...');
      console.log('⚡ Accesorio:', accessory.substring(0, 50) + '...');
      console.log('🎨 Color acento:', accentColor);
    }

    console.log('🎨 Generando con Replicate...');
    console.log('Vibe:', vibe);
    console.log('Gender:', gender);

    // IMPORTANTE: Usamos el método de predictions para obtener URLs directamente
    // PhotoMaker retorna ReadableStream con replicate.run(), necesitamos polling
    
    // Crear predicción en Replicate con parámetros optimizados para preservación facial
    const prediction = await replicate.predictions.create({
      version: "ddfc2b08d209f9fa8c1eca692712918bd449f695dabb4a958da31802a9570fe4",
      input: {
        input_image: image, // base64 string
        prompt: promptToUse,
        negative_prompt: negativePromptToUse,
        num_outputs: 1,
        guidance_scale: 5.0, // Reducido de 7.5 a 5.0 para mejor preservación facial
        num_inference_steps: 50, // Aumentado de 30 a 50 para mejor calidad
        scheduler: "DPMSolverMultistep",
        style_strength_ratio: 15, // Control de cuánto estilo aplicar (menor = más parecido al original)
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
