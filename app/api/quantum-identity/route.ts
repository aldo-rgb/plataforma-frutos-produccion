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
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      include: {
        CartaFrutos: {
          where: { estado: 'AUTORIZADA' },
          include: {
            MetasCarta: {
              include: {
                Meta: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Verificar que tenga carta autorizada
    const cartaAutorizada = usuario.CartaFrutos[0];
    if (!cartaAutorizada) {
      return NextResponse.json({ 
        error: 'No tienes una carta autorizada',
        requiresCarta: true 
      }, { status: 400 });
    }

    // Verificar si ya tiene foto
    if (usuario.profileImage) {
      return NextResponse.json({ 
        error: 'Ya tienes una foto de perfil',
        hasImage: true 
      }, { status: 400 });
    }

    // Obtener todas las metas del usuario
    const metas = cartaAutorizada.MetasCarta.map(mc => mc.Meta);

    // Construir contexto para la IA
    const metasText = metas.map(m => `- ${m.objetivo} (${m.categoria})`).join('\n');
    const userContext = `
USUARIO: ${usuario.nombre}
NIVEL: ${usuario.nivelActual}
PUNTOS CUÁNTICOS: ${usuario.puntosCuanticos}
XP: ${usuario.experienciaXP}
RANGO: ${usuario.rangoActual}

METAS DEL USUARIO:
${metasText}
`;

    // Generar designaciones con OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Actúas como la IA Central del Sistema Operativo 'Quantum Matter'. Tu tono es militar-futurista y analítico.

Basado en las metas del usuario, genera 3 Designaciones Operativas (Apodos de Élite) distintas entre sí.

REGLAS ESTRICTAS:
1. Los nombres deben ser en INGLÉS (estilo militar sci-fi)
2. Deben sonar a rangos de ciencia ficción o especialidades tácticas (Ej: 'KINETIC VANGUARD', 'NETWORK ARCHITECT', 'ALPHA OPERATOR')
3. NO repitas términos entre las 3 opciones (Si una es 'Architect', las otras no pueden ser 'Engineer')
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
      "designation": "NEURAL ARCHITECT",
      "rationale": "Enfoque detectado en aprendizaje profundo y sistemas.",
      "visual_tags": ["intellect_blue", "data_stream", "tech_visor", "cerebral"],
      "archetype": "CEREBRAL"
    },
    {
      "id": "opt_2",
      "designation": "LOGIC VANGUARD",
      "rationale": "Alta prioridad en ejecución rápida y resolución de problemas.",
      "visual_tags": ["speed_green", "light_armor", "hud_display", "athletic"],
      "archetype": "PHYSICAL"
    },
    {
      "id": "opt_3",
      "designation": "CORE STRATEGIST",
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

    const iaResponse = JSON.parse(completion.choices[0].message.content || '{}');

    // Guardar las opciones en la base de datos para referencia
    const identityRecord = await prisma.quantumIdentity.create({
      data: {
        userId: usuario.id,
        candidates: iaResponse.candidates,
        status: 'PENDING_SELECTION',
        generatedAt: new Date()
      }
    });

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
    console.error('Error generando identidad cuántica:', error);
    return NextResponse.json(
      { error: 'Error al generar identidad cuántica' },
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

    // Generar prompt para DALL-E basado en la designación seleccionada
    const visualTags = selectedCandidate.visual_tags.join(', ');
    const dallePrompt = `A futuristic military sci-fi avatar portrait of a ${selectedCandidate.archetype.toLowerCase()} operative called "${selectedCandidate.designation}". 
Visual style: ${visualTags}. 
High-tech tactical appearance, professional headshot, cinematic lighting, unreal engine quality, 4K detail.
Background: abstract holographic interface with data streams.`;

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
