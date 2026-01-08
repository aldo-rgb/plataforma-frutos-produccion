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

    console.log('📥 Request recibido:');
    console.log('  - Gender:', gender);
    console.log('  - Vibe:', vibe);
    console.log('  - Designation:', designation);
    console.log('  - Archetype:', archetype);
    console.log('  - Image length:', image ? image.length : 0);

    if (!image) {
      return NextResponse.json({ error: 'Imagen requerida' }, { status: 400 });
    }

    if (!gender || (gender !== 'male' && gender !== 'female')) {
      return NextResponse.json({ error: 'Género inválido. Debe ser "male" o "female"' }, { status: 400 });
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
      
      // Prompt optimizado para PhotoMaker - preservación facial máxima
      // IMPORTANTE: Solo usar 'img' UNA VEZ en todo el prompt
      promptToUse = `A cinematic corporate portrait of a img ${genderPrompts[gender]} executive, with a highly accurate likeness to the subject.

The subject is a ${characterRole} (Quantum Jumper).

Corporate role: ${designation}

CRITICAL - Facial Preservation:
The face, facial structure, skin tone, eyes, nose, mouth, jawline, hair style, hair color, facial hair (if any), and all unique facial features from the input image MUST be preserved exactly. The person's identity must remain 100% recognizable and identical to the uploaded photo.

Art style: The "Matrix" meets high-end corporate photography. Cinematic color grading with cool tones (steely blues, deep greens) and dramatic contrast. Sleek, and futuristic.

Lighting: Dramatic rim lighting outlining the subject, mixed with the glow of advanced interfaces. A subtle, faint visual effect around the subject suggestive of quantum displacement or phasing (a very slight chromatic aberration or digital aura).

Background: A luxurious, minimalist office that feels like it's inside a digital construct. Abstract flowing data streams, subtle digital rain code patterns, or shifting geometric architecture. Deep depth of field.

Clothing: Sleek, tailored, minimalist dark attire (structured jacket with a high collar, dark shirt). Expensive fabric texture. Modern executive fashion.

Composition: Professional headshot to upper body, facing forward with an intense, and confident expression. Silent authority. Sharp focus on the eyes. High resolution.

STRICT RULES - NO:
❌ Changing facial features from the input image
❌ Generic or different face than the person
❌ Weapons of any kind
❌ Visible cumbersome cybernetic implants
❌ Excessive bright neon colors (keep it moody)
❌ Aggressive postures or expressions

REQUIRED - YES:
✅ Exact facial likeness to the person in the input image
✅ Preserve all unique facial characteristics
✅ Sleek, dark, Matrix-inspired fashion
✅ Subtle quantum/digital distortion effect around subject
✅ Silent authority and confidence
✅ MATRIX aesthetic with cool cinematic tones`;
    
      negativePromptToUse = 'different face, face swap, changed facial features, wrong person, altered face shape, different skin tone, different hair color, different facial hair, generic face, face morph, bad face match, poor facial preservation, face paint, face mask, cybernetic face, robotic face parts, face scars, face tattoos, deformed face, ugly, disfigured, bad anatomy, extra limbs, weapons, guns, swords, knives, aggressive pose, angry expression, sunglasses, goggles over eyes, eye coverings, trench coat, military armor, dirty, grungy, post-apocalyptic, excessive neon, cartoon, anime, illustration, watermark, text, logo, blurry face, low quality';
      
      console.log('🎭 Prompt optimizado para PhotoMaker');
      console.log('🏢 Designación:', designation);
      console.log('🏢 Arquetipo:', archetype);
      console.log('👤 Rol:', characterRole);
    }

    console.log('🎨 Generando con Replicate...');
    console.log('Vibe:', vibe);
    console.log('Gender:', gender);

    // IMPORTANTE: Usamos el método de predictions para obtener URLs directamente
    // PhotoMaker retorna ReadableStream con replicate.run(), necesitamos polling
    
    // Crear predicción en Replicate con parámetros optimizados para máxima preservación facial
    const prediction = await replicate.predictions.create({
      version: "ddfc2b08d209f9fa8c1eca692712918bd449f695dabb4a958da31802a9570fe4",
      input: {
        input_image: image, // base64 string
        prompt: promptToUse,
        negative_prompt: negativePromptToUse,
        num_outputs: 1,
        guidance_scale: 3.5, // Reducido a 3.5 para máxima preservación (menos interpretación de la IA)
        num_inference_steps: 60, // Aumentado a 60 para mejor calidad y precisión
        scheduler: "DPMSolverMultistep",
        style_strength_ratio: 15, // Mínimo permitido por el modelo (menor = más parecido al original)
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
    const fileName = 'avatars/' + usuario.id + '-' + Date.now() + '.png';
    const uploadedUrl = await uploadToS3(imageBuffer, fileName);
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
    console.error('❌ Stack trace:', error.stack);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
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
