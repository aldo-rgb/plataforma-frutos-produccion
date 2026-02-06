import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';
import logger from '@/lib/logger';

// Log de configuración al inicio
logger.debug('🔧 quantum-identity API - Verificando configuración:');
logger.debug('  - OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ Configurado' : '❌ FALTA');
logger.debug('  - NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Configurado' : '❌ FALTA');
logger.debug('  - SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Configurado' : '❌ FALTA');

// OpenAI se inicializa solo si hay API key
let openai: any = null;
if (process.env.OPENAI_API_KEY) {
  const OpenAI = require('openai');
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  logger.debug('✅ OpenAI client inicializado');
} else {
  logger.error('❌ OPENAI_API_KEY no está configurada - la generación de avatares no funcionará');
}

// Función para obtener cliente de Supabase (lazy initialization)
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Descarga una imagen desde una URL y la sube a Supabase Storage
 */
async function downloadAndUploadToSupabase(imageUrl: string, userId: number): Promise<string> {
  try {
    logger.debug('📥 Descargando imagen de:', imageUrl);
    
    // Descargar la imagen
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Error descargando imagen: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Generar nombre único para el archivo
    const timestamp = Date.now();
    const fileName = `${userId}-quantum-${timestamp}.png`;
    const filePath = `profile-images/${fileName}`;
    
    logger.debug('📤 Subiendo a Supabase Storage:', filePath);
    
    // Subir a Supabase Storage
    const { data, error } = await getSupabaseClient().storage
      .from('mentor-assets')
      .upload(filePath, buffer, {
        contentType: 'image/png',
        upsert: true,
      });
    
    if (error) {
      logger.error('❌ Error subiendo a Supabase:', error);
      throw new Error(`Error subiendo a Supabase: ${error.message}`);
    }
    
    // Obtener URL pública
    const { data: { publicUrl } } = getSupabaseClient().storage
      .from('mentor-assets')
      .getPublicUrl(filePath);
    
    logger.debug('✅ Imagen subida exitosamente a Supabase:', publicUrl);
    
    return publicUrl;
  } catch (error) {
    logger.error('❌ Error en downloadAndUploadToSupabase:', error);
    throw error;
  }
}

/**
 * POST /api/quantum-identity/generate
 * Genera 3 designaciones operativas basadas en las metas del usuario
 */
export async function POST(request: NextRequest) {
  try {
    logger.debug('🚀 POST /api/quantum-identity - Iniciando generación de identidad cuántica');
    
    if (!openai) {
      return NextResponse.json({ error: 'Servicio de IA no configurado' }, { status: 503 });
    }

    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      logger.debug('❌ No hay sesión de usuario');
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    logger.debug('✅ Usuario autenticado:', session.user.email);

    // Obtener el género del body
    const body = await request.json();
    const { gender } = body;
    
    if (!gender || !['male', 'female', 'neutral'].includes(gender)) {
      logger.debug('❌ Género no válido:', gender);
      return NextResponse.json({ error: 'Género requerido' }, { status: 400 });
    }

    logger.debug('✅ Género seleccionado:', gender);

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        nombre: true,
        nivelActual: true,
        puntosCuanticos: true,
        experienciaXP: true,
        rangoActual: true,
        profileImage: true,
        CartaFrutos: {
          where: { 
            estado: {
              not: 'RECHAZADA'
            }
          },
          include: {
            Meta: true
          },
          orderBy: { fechaCreacion: 'desc' },
          take: 1
        }
      }
    });

    if (!usuario) {
      logger.debug('❌ Usuario no encontrado en BD');
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    logger.debug('✅ Usuario encontrado:', usuario.id, usuario.nombre);

    // Permitir regenerar avatar si ya existe (solo registramos en log)
    if (usuario.profileImage) {
      logger.debug('ℹ️ Usuario ya tiene profileImage, pero permitiendo regeneración:', usuario.profileImage);
    }

    // Obtener metas si existen (opcional para el avatar)
    const carta = usuario.CartaFrutos[0];
    const metas = carta?.Meta || [];
    logger.debug(`📊 Metas encontradas: ${metas.length}`);

    // Construir contexto para la IA (usar metas si existen, sino contexto genérico)
    const metasText = metas.length > 0 
      ? metas.map(m => `- ${m.metaPrincipal} (${m.categoria})`).join('\n')
      : '- Desarrollo personal y profesional\n- Crecimiento en múltiples áreas de vida';
    const userContext = `
USUARIO: ${usuario.nombre}
NIVEL: ${usuario.nivelActual}
PUNTOS CUÁNTICOS: ${usuario.puntosCuanticos}
XP: ${usuario.experienciaXP}
RANGO: ${usuario.rangoActual}

METAS DEL USUARIO:
${metasText}
`;

    logger.debug('🤖 Llamando a OpenAI para generar designaciones...');

    // Generar designaciones con OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Actúas como la IA Central del 'Consejo Quantum Matter', un sistema corporativo de élite.

Basado en las metas del usuario, selecciona 3 ROLES del Consejo Quantum Matter (12 roles disponibles) que mejor se alineen con su perfil.

CONSEJO QUANTUM MATTER (12 ROLES DISPONIBLES):
1. El Director Cuántico - Autoridad máxima, visión estratégica
2. El Arquitecto de Sistemas - Diseñador del sistema, estructura y orden
3. El Curador de Datos - Guardián de información, integridad de datos
4. El Modelador Cuántico - Simulación y predicción de futuros
5. El Supervisor Ético - Balance ético y límites responsables
6. El Estratega de Riesgos - Evaluación de impacto y prevención
7. El Ingeniero Cuántico - Implementación técnica y ejecución
8. El Analista de Señales - Detección de anomalías y alertas
9. El Archivista del Conocimiento - Memoria del sistema, continuidad
10. El Centinela de Integridad - Seguridad y estabilidad del sistema
11. El Observador - Conciencia cuántica del sistema
12. La Interfaz Ejecutiva - Avatar del usuario en el sistema

REGLAS ESTRICTAS:
1. Selecciona 3 roles DIFERENTES del Consejo basados en las metas del usuario
2. Cada rol debe tener una justificación de 1 línea que conecte con las metas
3. Los roles deben ser complementarios y diversos entre sí
4. Los nombres deben estar en ESPAÑOL (son designaciones oficiales del Consejo)

RESPONDE ÚNICAMENTE CON UN JSON en este formato exacto:
{
  "candidates": [
    {
      "id": "opt_1",
      "designation": "El Director Cuántico",
      "rationale": "Visión estratégica detectada en metas de liderazgo y planificación.",
      "visual_tags": ["authority", "executive", "dark_suit", "quantum_pattern"],
      "archetype": "DIRECTOR"
    },
    {
      "id": "opt_2",
      "designation": "El Curador de Datos",
      "rationale": "Enfoque en organización y control de información detectado.",
      "visual_tags": ["analyst", "data_nodes", "monochrome", "precise"],
      "archetype": "CURATOR"
    },
    {
      "id": "opt_3",
      "designation": "El Estratega de Riesgos",
      "rationale": "Prioridad en evaluación de riesgos y prevención.",
      "visual_tags": ["strategist", "risk_graphs", "amber_accent", "tactical"],
      "archetype": "STRATEGIST"
    }
  ]
}`
        },
        {
          role: 'user',
          content: userContext
        }
      ],
      temperature: 0.9,
      response_format: { type: "json_object" }
    });

    logger.debug('✅ Respuesta de OpenAI recibida');

    const iaResponse = JSON.parse(completion.choices[0].message.content || '{}');
    logger.debug('📝 Candidatos generados:', iaResponse.candidates?.length || 0);

    // Guardar las opciones en la base de datos para referencia
    logger.debug('💾 Intentando guardar en BD...');
    logger.debug('Usuario ID:', usuario.id);
    logger.debug('Candidates:', JSON.stringify(iaResponse.candidates));
    logger.debug('Gender:', gender);
    
    const identityRecord = await prisma.quantumIdentity.create({
      data: {
        userId: usuario.id,
        candidates: iaResponse.candidates,
        status: 'PENDING_SELECTION',
        generatedAt: new Date(),
        gender: gender  // Guardar el género seleccionado
      }
    }).catch((dbError) => {
      logger.error('❌ Error en Prisma create:', dbError);
      throw new Error(`Error de base de datos: ${dbError.message}`);
    });

    logger.debug('✅ Identidad guardada en BD con ID:', identityRecord.id);

    return NextResponse.json({
      success: true,
      identityId: identityRecord.id,
      candidates: iaResponse.candidates,
      userContext: {
        nombre: usuario.nombre,
        nivel: usuario.nivelActual,
        rango: usuario.rangoActual
      }
    });

  } catch (error) {
    logger.error('❌ Error generando identidad cuántica:', error);
    logger.error('Stack trace:', error instanceof Error ? error.stack : 'No stack');
    
    return NextResponse.json(
      { 
        error: 'Error al generar identidad cuántica',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/quantum-identity/select
 * Usuario selecciona una de las 3 designaciones y genera el avatar
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { identityId, selectedOptionId } = await request.json();

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email }
    });

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Obtener el registro de identidad
    const identity = await prisma.quantumIdentity.findUnique({
      where: { id: identityId }
    });

    if (!identity || identity.userId !== usuario.id) {
      return NextResponse.json({ error: 'Identidad no válida' }, { status: 400 });
    }

    // Encontrar la opción seleccionada
    const selectedCandidate = identity.candidates.find((c: any) => c.id === selectedOptionId);
    
    if (!selectedCandidate) {
      return NextResponse.json({ error: 'Opción no válida' }, { status: 400 });
    }

    // Generar prompt para DALL-E basado en el rol del Consejo seleccionado
    const archetype = selectedCandidate.archetype;
    const designation = selectedCandidate.designation;
    const gender = identity.gender || 'neutral';
    
    // Mapeo de género a términos descriptivos corporativos
    const genderTerms: Record<string, string> = {
      'male': 'male',
      'female': 'female',
      'neutral': 'androgynous'
    };
    
    const genderDescriptor = genderTerms[gender];
    
    // Mapeo de roles del Consejo Quantum Matter a descripciones corporativas
    const roleDescriptions: Record<string, string> = {
      'DIRECTOR': `senior executive with calm expression, wearing a minimalist dark suit with subtle quantum-pattern lining, standing before a softly glowing abstract data structure`,
      
      'ARCHITECT': `androgynous systems architect with precise posture, wearing a tailored tech-blazer, thin holographic interface projected subtly from a wrist device`,
      
      'CURATOR': `focused analyst with neutral expression, dressed in layered monochrome attire, surrounded by softly floating data nodes`,
      
      'MODELER': `reserved scientist with minimalist glasses, wearing a clean lab-style jacket over corporate attire, abstract probability waves faintly visible behind them`,
      
      'OVERSEER': `composed figure with authoritative presence, wearing a high-collar dark suit, standing before symmetrical geometric forms`,
      
      'STRATEGIST': `sharp-eyed strategist in a tailored suit, subtle red or amber accent indicating risk thresholds, abstract graphs behind`,
      
      'ENGINEER': `precise engineer with calm focus, wearing dark utilitarian attire with minimal illuminated seams, holding a compact modular device`,
      
      'ANALYST': `analyst with subtle headset, neutral expression, thin waveforms and signal traces softly glowing in the background`,
      
      'ARCHIVIST': `elegant archivist with timeless appearance, holding a thin transparent archive slab with faint inscriptions`,
      
      'SENTINEL': `silent authoritative figure in structured dark attire, standing before a clean, symmetrical interface`,
      
      'OBSERVER': `minimalist figure partially silhouetted, facial features calm and undefined, subtle light patterns suggesting awareness`,
      
      'INTERFACE': `faceless executive silhouette rendered in abstract light geometry, blending seamlessly into the interface`
    };

    const characterDescription = roleDescriptions[archetype] || roleDescriptions['DIRECTOR'];

    // ═══════════════════════════════════════════════════════════════
    // PROMPT MAESTRO - Estilo Anime/Digital 3D Cyberpunk
    // Como personajes de Genshin Impact, Honkai Star Rail, etc.
    // ═══════════════════════════════════════════════════════════════
    const dallePrompt = `A stylized anime-inspired digital 3D illustration of a ${genderDescriptor} futuristic warrior character.

Character Role: ${designation}
Character Profile: ${characterDescription}

ART STYLE (CRITICAL):
- High-quality digital anime illustration style (like Genshin Impact, Honkai Star Rail, or modern gacha game characters)
- Stylized proportions with large expressive eyes
- Smooth cel-shaded skin with soft gradients
- NOT photorealistic - this must look like a digital illustration/game character
- Clean linework with vibrant colors

CHARACTER DESIGN:
- ${genderDescriptor === 'female' ? 'Beautiful anime heroine with elegant features and flowing hair' : genderDescriptor === 'male' ? 'Handsome anime hero with sharp features and dynamic hair' : 'Elegant androgynous anime character with refined features'}
- Expressive eyes with anime-style highlights (blue or purple tints)
- Stylized hair with dynamic flow and cyan/purple energy highlights
- Confident friendly smile showing determination
- Latino-inspired warm skin tone rendered in anime style

OUTFIT - FUTURISTIC ARMOR:
- Sleek white and dark grey futuristic combat armor with hexagonal patterns
- Glowing cyan and purple energy circuits and LED accents throughout the suit
- High-tech shoulder guards with illuminated edges
- Chest piece with central glowing energy core
- Form-fitting advanced tech suit underneath armor plates

TECH ACCESSORIES:
- Futuristic headset or ear-mounted tech device with cyan glow
- Holographic interface elements floating nearby
- Energy particles and data streams around the character

BACKGROUND:
- Blurred futuristic cyberpunk cityscape
- Holographic displays and data screens
- Neon bokeh lights in cyan, blue, and purple
- Digital particle effects

LIGHTING:
- Bright anime-style lighting with soft shadows
- Cyan and purple rim lighting on armor edges
- Glowing energy effects illuminating the face
- High contrast with vibrant colors

QUALITY:
- 8K resolution digital art
- Sharp clean lines
- Professional game character art quality
- Pixiv/ArtStation quality illustration

STRICT RULES - NEVER:
❌ Photorealistic rendering
❌ Real human skin textures
❌ Photography style
❌ Dull or muted colors
❌ Weapons (guns, swords, etc.)
❌ Aggressive or threatening expressions
❌ Dark gritty aesthetic

ALWAYS:
✅ Anime/digital illustration style
✅ Stylized features (not realistic)
✅ Vibrant glowing neon colors
✅ Friendly confident expression
✅ High-tech futuristic white armor with glowing accents
✅ Clean polished digital art aesthetic`;

    logger.debug('🎨 Generando avatar Anime/Digital 3D con DALL-E...');
    logger.debug('Rol del Consejo:', designation);
    logger.debug('Arquetipo:', archetype);

    // Generar avatar con DALL-E
    const imageResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: dallePrompt,
      n: 1,
      size: "1024x1024",
      quality: "hd"
    });

    const temporaryAvatarUrl = imageResponse.data[0].url;
    logger.debug('✅ Avatar generado por DALL-E (temporal):', temporaryAvatarUrl);

    // Descargar y subir a Supabase para tener URL permanente
    logger.debug('🔄 Descargando y subiendo a Supabase Storage...');
    const permanentAvatarUrl = await downloadAndUploadToSupabase(temporaryAvatarUrl!, usuario.id);
    logger.debug('✅ Avatar guardado permanentemente:', permanentAvatarUrl);

    // ═══════════════════════════════════════════════════════════════
    // GUARDAR FOTO ANTERIOR EN THE VAULT (antes de reemplazar)
    // ═══════════════════════════════════════════════════════════════
    if (usuario.profileImage) {
      logger.debug('📸 Guardando foto anterior en The Vault...');
      try {
        await prisma.avatarGenerationAttempt.create({
          data: {
            usuarioId: usuario.id,
            generatedUrl: usuario.profileImage,
            vibe: 'profile-backup', // Identificar como backup de foto de perfil
            gender: gender,
            sourceImage: 'check-in-photo' // Indica que viene de fotos de check-in
          }
        });
        logger.debug('✅ Foto anterior guardada en The Vault:', usuario.profileImage);
      } catch (vaultError) {
        logger.error('⚠️ Error guardando foto en vault (continuando):', vaultError);
        // No bloquear el proceso si falla el guardado en vault
      }
    }

    // Actualizar usuario con la designación y avatar permanente
    logger.debug('💾 Actualizando usuario con avatar permanente...');
    logger.debug('Usuario ID:', usuario.id);
    logger.debug('Avatar URL:', permanentAvatarUrl);
    
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        profileImage: permanentAvatarUrl,
        lastAvatarChangeDate: new Date()
        // Podemos guardar la designación en un campo custom si existe
      }
    });

    logger.debug('✅ Usuario actualizado exitosamente con profileImage');

    // Actualizar el registro de identidad
    await prisma.quantumIdentity.update({
      where: { id: identityId },
      data: {
        selectedOption: selectedCandidate,
        status: 'COMPLETED',
        avatarUrl: permanentAvatarUrl,
        completedAt: new Date()
      }
    });

    logger.debug('✅ QuantumIdentity actualizada a COMPLETED');

    return NextResponse.json({
      success: true,
      designation: selectedCandidate.designation,
      avatarUrl: permanentAvatarUrl,
      message: `IDENTIDAD CONFIRMADA. BIENVENIDO, ${selectedCandidate.designation}.`
    });

  } catch (error: any) {
    logger.error('Error seleccionando identidad:', error);
    logger.error('Error name:', error?.name);
    logger.error('Error message:', error?.message);
    logger.error('Error stack:', error?.stack);
    
    // Proporcionar mensajes de error más específicos
    let errorMessage = 'Error al generar avatar';
    
    if (error?.message?.includes('content_policy_violation')) {
      errorMessage = 'El contenido generado fue rechazado. Por favor intenta de nuevo.';
    } else if (error?.message?.includes('rate_limit')) {
      errorMessage = 'Demasiadas solicitudes. Espera un momento e intenta de nuevo.';
    } else if (error?.message?.includes('billing') || error?.message?.includes('quota')) {
      errorMessage = 'Servicio de generación de imágenes no disponible temporalmente.';
    } else if (error?.message?.includes('Supabase')) {
      errorMessage = 'Error al guardar la imagen. Por favor intenta de nuevo.';
    } else if (error?.code === 'ECONNREFUSED' || error?.code === 'ETIMEDOUT') {
      errorMessage = 'Error de conexión. Verifica tu internet e intenta de nuevo.';
    }
    
    return NextResponse.json(
      { error: errorMessage, details: error?.message },
      { status: 500 }
    );
  }
}
