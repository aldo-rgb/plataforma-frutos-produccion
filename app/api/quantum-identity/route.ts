import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
    console.log('📥 Descargando imagen de:', imageUrl);
    
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
    
    console.log('📤 Subiendo a Supabase Storage:', filePath);
    
    // Subir a Supabase Storage
    const { data, error } = await getSupabaseClient().storage
      .from('mentor-assets')
      .upload(filePath, buffer, {
        contentType: 'image/png',
        upsert: true,
      });
    
    if (error) {
      console.error('❌ Error subiendo a Supabase:', error);
      throw new Error(`Error subiendo a Supabase: ${error.message}`);
    }
    
    // Obtener URL pública
    const { data: { publicUrl } } = getSupabaseClient().storage
      .from('mentor-assets')
      .getPublicUrl(filePath);
    
    console.log('✅ Imagen subida exitosamente a Supabase:', publicUrl);
    
    return publicUrl;
  } catch (error) {
    console.error('❌ Error en downloadAndUploadToSupabase:', error);
    throw error;
  }
}

/**
 * POST /api/quantum-identity/generate
 * Genera 3 designaciones operativas basadas en las metas del usuario
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 POST /api/quantum-identity - Iniciando generación de identidad cuántica');
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      console.log('❌ No hay sesión de usuario');
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    console.log('✅ Usuario autenticado:', session.user.email);

    // Obtener el género del body
    const body = await request.json();
    const { gender } = body;
    
    if (!gender || !['male', 'female', 'neutral'].includes(gender)) {
      console.log('❌ Género no válido:', gender);
      return NextResponse.json({ error: 'Género requerido' }, { status: 400 });
    }

    console.log('✅ Género seleccionado:', gender);

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
      console.log('❌ Usuario no encontrado en BD');
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    console.log('✅ Usuario encontrado:', usuario.id, usuario.nombre);

    // Permitir regenerar avatar si ya existe (solo registramos en log)
    if (usuario.profileImage) {
      console.log('ℹ️ Usuario ya tiene profileImage, pero permitiendo regeneración:', usuario.profileImage);
    }

    // Obtener metas si existen (opcional para el avatar)
    const carta = usuario.CartaFrutos[0];
    const metas = carta?.Meta || [];
    console.log(`📊 Metas encontradas: ${metas.length}`);

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

    console.log('🤖 Llamando a OpenAI para generar designaciones...');

    // Generar designaciones con OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Actúas como la IA Central del 'Consejo Quantum Matter', un sistema corporativo de élite.

Basado en las metas del usuario, selecciona 3 ROLES del Consejo Quantum Matter (12 roles disponibles) que mejor se alineen con su perfil.

CONSEJO QUANTUM MATTER (12 ROLES DISPONIBLES):
1. The Quantum Director - Autoridad máxima, visión estratégica
2. The Systems Architect - Diseñador del sistema, estructura y orden
3. The Data Curator - Guardián de información, integridad de datos
4. The Quantum Modeler - Simulación y predicción de futuros
5. The Ethics Overseer - Balance ético y límites responsables
6. The Risk Strategist - Evaluación de impacto y prevención
7. The Quantum Engineer - Implementación técnica y ejecución
8. The Signal Analyst - Detección de anomalías y alertas
9. The Knowledge Archivist - Memoria del sistema, continuidad
10. The Integrity Sentinel - Seguridad y estabilidad del sistema
11. The Observer - Conciencia cuántica del sistema
12. The Executive Interface - Avatar del usuario en el sistema

REGLAS ESTRICTAS:
1. Selecciona 3 roles DIFERENTES del Consejo basados en las metas del usuario
2. Cada rol debe tener una justificación de 1 línea que conecte con las metas
3. Los roles deben ser complementarios y diversos entre sí
4. Mantén los nombres en INGLÉS (son designaciones oficiales del Consejo)

RESPONDE ÚNICAMENTE CON UN JSON en este formato exacto:
{
  "candidates": [
    {
      "id": "opt_1",
      "designation": "The Quantum Director",
      "rationale": "Visión estratégica detectada en metas de liderazgo y planificación.",
      "visual_tags": ["authority", "executive", "dark_suit", "quantum_pattern"],
      "archetype": "DIRECTOR"
    },
    {
      "id": "opt_2",
      "designation": "The Data Curator",
      "rationale": "Enfoque en organización y control de información detectado.",
      "visual_tags": ["analyst", "data_nodes", "monochrome", "precise"],
      "archetype": "CURATOR"
    },
    {
      "id": "opt_3",
      "designation": "The Risk Strategist",
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

    console.log('✅ Respuesta de OpenAI recibida');

    const iaResponse = JSON.parse(completion.choices[0].message.content || '{}');
    console.log('📝 Candidatos generados:', iaResponse.candidates?.length || 0);

    // Guardar las opciones en la base de datos para referencia
    console.log('💾 Intentando guardar en BD...');
    console.log('Usuario ID:', usuario.id);
    console.log('Candidates:', JSON.stringify(iaResponse.candidates));
    console.log('Gender:', gender);
    
    const identityRecord = await prisma.quantumIdentity.create({
      data: {
        userId: usuario.id,
        candidates: iaResponse.candidates,
        status: 'PENDING_SELECTION',
        generatedAt: new Date(),
        gender: gender  // Guardar el género seleccionado
      }
    }).catch((dbError) => {
      console.error('❌ Error en Prisma create:', dbError);
      throw new Error(`Error de base de datos: ${dbError.message}`);
    });

    console.log('✅ Identidad guardada en BD con ID:', identityRecord.id);

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
    console.error('❌ Error generando identidad cuántica:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack');
    
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

    const dallePrompt = `A professional corporate portrait of a ${genderDescriptor} executive in a futuristic tech company setting.

The subject is a ${characterDescription}.

Corporate role: ${designation}

Art style: Clean, professional corporate photography with subtle sci-fi elements. Minimalist and sophisticated aesthetic. Modern tech company executive portrait.

Lighting: Soft professional lighting with subtle technological glow from interfaces. Clean shadows. Corporate environment.

Background: Blurred modern office environment with abstract data visualizations or clean geometric patterns. Professional depth of field.

Composition: Professional headshot to upper body, facing forward with calm, confident expression. Corporate posture. High resolution, sharp focus on face.

STRICT RULES - NO:
❌ Weapons of any kind
❌ Visible cybernetic implants
❌ Excessive neon colors
❌ Aggressive postures or expressions
❌ Armor or military gear

REQUIRED - YES:
✅ Calm, professional demeanor
✅ Sober, sophisticated colors (blacks, grays, dark blues)
✅ Subtle technology integration
✅ Silent authority and confidence
✅ Corporate executive appearance`;

    console.log('🎨 Generando avatar corporativo con DALL-E...');
    console.log('Rol del Consejo:', designation);
    console.log('Arquetipo:', archetype);

    // Generar avatar con DALL-E
    const imageResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: dallePrompt,
      n: 1,
      size: "1024x1024",
      quality: "hd"
    });

    const temporaryAvatarUrl = imageResponse.data[0].url;
    console.log('✅ Avatar generado por DALL-E (temporal):', temporaryAvatarUrl);

    // Descargar y subir a Supabase para tener URL permanente
    console.log('🔄 Descargando y subiendo a Supabase Storage...');
    const permanentAvatarUrl = await downloadAndUploadToSupabase(temporaryAvatarUrl!, usuario.id);
    console.log('✅ Avatar guardado permanentemente:', permanentAvatarUrl);

    // Actualizar usuario con la designación y avatar permanente
    console.log('💾 Actualizando usuario con avatar permanente...');
    console.log('Usuario ID:', usuario.id);
    console.log('Avatar URL:', permanentAvatarUrl);
    
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        profileImage: permanentAvatarUrl,
        lastAvatarChangeDate: new Date()
        // Podemos guardar la designación en un campo custom si existe
      }
    });

    console.log('✅ Usuario actualizado exitosamente con profileImage');

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

    console.log('✅ QuantumIdentity actualizada a COMPLETED');

    return NextResponse.json({
      success: true,
      designation: selectedCandidate.designation,
      avatarUrl: permanentAvatarUrl,
      message: `IDENTIDAD CONFIRMADA. BIENVENIDO, ${selectedCandidate.designation}.`
    });

  } catch (error) {
    console.error('Error seleccionando identidad:', error);
    return NextResponse.json(
      { error: 'Error al generar avatar' },
      { status: 500 }
    );
  }
}
