import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
      include: {
        CartaFrutos: {
          // Aceptar cualquier estado excepto RECHAZADA
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

    // Verificar que tenga una carta (en cualquier estado excepto rechazada)
    const carta = usuario.CartaFrutos[0];
    if (!carta) {
      console.log('⚠️ Usuario sin carta');
      return NextResponse.json({ 
        error: 'Necesitas crear tu Carta F.R.U.T.O.S. primero',
        requiresCarta: true 
      }, { status: 400 });
    }

    console.log('✅ Carta encontrada:', carta.id, 'Estado:', carta.estado);

    // Permitir regenerar avatar si ya existe (solo registramos en log)
    if (usuario.profileImage) {
      console.log('ℹ️ Usuario ya tiene profileImage, pero permitiendo regeneración:', usuario.profileImage);
    }

    // Obtener todas las metas del usuario
    const metas = carta.Meta;
    console.log(`📊 Metas encontradas: ${metas.length}`);

    // Construir contexto para la IA
    const metasText = metas.map(m => `- ${m.metaPrincipal} (${m.categoria})`).join('\n');
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
          content: `Actúas como la IA Central del Sistema Operativo 'Quantum Matter'. Tu tono es militar-futurista y analítico.

Basado en las metas del usuario, genera 3 Designaciones Operativas (Apodos de Élite) distintas entre sí.

REGLAS ESTRICTAS:
1. Los nombres deben ser en ESPAÑOL (estilo militar sci-fi traducido al español)
2. Deben sonar a rangos de ciencia ficción o especialidades tácticas en español (Ej: 'VANGUARDIA CINÉTICA', 'ARQUITECTO DE REDES', 'OPERADOR ALFA', 'ESTRATEGA NÚCLEO', 'CAZADOR VELOZ', 'ANALISTA CIFRADO')
3. NO repitas términos entre las 3 opciones (Si una es 'Arquitecto', las otras no pueden ser 'Ingeniero')
4. Para cada opción, incluye una breve justificación de 1 línea en español
5. Cada designación debe tener visual_tags que describan arquetipos visuales diferentes:
   - Uno más cerebral/intelectual (azules, visores tech, data streams)
   - Uno más físico/acción (verdes, armadura ligera, velocidad)
   - Uno más líder/estratega (dorados, traje táctico, comando)

RESPONDE ÚNICAMENTE CON UN JSON en este formato exacto:
{
  "candidates": [
    {
      "id": "opt_1",
      "designation": "ARQUITECTO NEURAL",
      "rationale": "Enfoque detectado en aprendizaje profundo y sistemas.",
      "visual_tags": ["intellect_blue", "data_stream", "tech_visor", "cerebral"],
      "archetype": "CEREBRAL"
    },
    {
      "id": "opt_2",
      "designation": "VANGUARDIA LÓGICA",
      "rationale": "Alta prioridad en ejecución rápida y resolución de problemas.",
      "visual_tags": ["speed_green", "light_armor", "hud_display", "athletic"],
      "archetype": "PHYSICAL"
    },
    {
      "id": "opt_3",
      "designation": "ESTRATEGA CENTRAL",
      "rationale": "Equilibrio entre planificación financiera y salud mental.",
      "visual_tags": ["leadership_gold", "tactical_suit", "minimalist", "commander"],
      "archetype": "LEADER"
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

    // Generar prompt para DALL-E basado en la designación seleccionada y arquetipo
    const archetype = selectedCandidate.archetype;
    const designation = selectedCandidate.designation;
    const gender = identity.gender || 'neutral';
    
    // Mapeo de género a términos descriptivos
    const genderTerms: Record<string, string> = {
      'male': 'male',
      'female': 'female',
      'neutral': 'androgynous'
    };
    
    const genderDescriptor = genderTerms[gender];
    
    // Mapeo de arquetipos a descripciones de personajes
    const archetypeDescriptions: Record<string, string> = {
      'CEREBRAL': `${genderDescriptor} character with glowing blue optical visor covering their eyes, wearing a hooded tactical jacket with circuit patterns, holding a transparent data tablet with holographic displays`,
      'PHYSICAL': `athletic ${genderDescriptor} character with light armor plating, wearing a tactical vest with glowing green energy cells, equipped with advanced movement gear and speed-enhancing technology`,
      'LEADER': `commanding ${genderDescriptor} character with a sleek armored suit featuring golden accents, wearing a tactical helmet with holographic map interface projected from wrist gauntlet`
    };

    const characterDescription = archetypeDescriptions[archetype] || archetypeDescriptions['CEREBRAL'];

    const dallePrompt = `A stylized portrait of a futuristic cyberpunk ${genderDescriptor} character, used as an avatar.

The character is a ${characterDescription}.

Role designation: ${designation}

The art style is detailed sci-fi concept art, digital painting, with a heavy focus on advanced technology integrated with tactical clothing.

Lighting is dramatic, with neon light sources (blues, purples, electric oranges) reflecting off metallic and synthetic materials. The background is a blurred, futuristic cityscape at night or a glowing data interface. The composition is a portrait from waist up, facing forward with a confident or determined expression. Show only from the waist up, upper body shot. High resolution, sharp focus, professional digital art quality.`;

    console.log('🎨 Generando avatar con DALL-E...');
    console.log('Prompt:', dallePrompt);

    // Generar avatar con DALL-E
    const imageResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: dallePrompt,
      n: 1,
      size: "1024x1024",
      quality: "hd"
    });

    const avatarUrl = imageResponse.data[0].url;

    // Actualizar usuario con la designación y avatar
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        profileImage: avatarUrl,
        lastAvatarChangeDate: new Date()
        // Podemos guardar la designación en un campo custom si existe
      }
    });

    // Actualizar el registro de identidad
    await prisma.quantumIdentity.update({
      where: { id: identityId },
      data: {
        selectedOption: selectedCandidate,
        status: 'COMPLETED',
        avatarUrl: avatarUrl,
        completedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      designation: selectedCandidate.designation,
      avatarUrl: avatarUrl,
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
