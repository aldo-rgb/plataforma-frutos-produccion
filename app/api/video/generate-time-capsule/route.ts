import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/video/generate-time-capsule
 * Genera un video reel con las mejores evidencias del usuario
 * 
 * En producción, este endpoint:
 * 1. Selecciona las mejores evidencias (HIGH_QUALITY + LEGENDARY/EPIC)
 * 2. Genera texto motivacional con IA
 * 3. Usa un servicio de video (FFmpeg, Remotion, o similar)
 * 4. Agrega música épica
 * 5. Sube el video a Cloudinary
 * 6. Retorna la URL del video
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { 
        id: true,
        nombre: true,
        nivelActual: true,
        rangoActual: true
      }
    });

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const { evidencias } = await req.json();

    if (!evidencias || evidencias.length < 10) {
      return NextResponse.json(
        { error: 'Se requieren al menos 10 evidencias para generar el video' },
        { status: 400 }
      );
    }

    console.log(`🎬 Generando Time Capsule para ${usuario.nombre}...`);
    console.log(`   Evidencias totales: ${evidencias.length}`);

    // ========== PASO 1: Seleccionar mejores evidencias ==========
    
    // Obtener información completa de las evidencias
    const evidenciasCompletas = await prisma.evidenciaAccion.findMany({
      where: {
        id: { in: evidencias.map((ev: any) => ev.id) },
        usuarioId: usuario.id,
        estado: 'APROBADA'
      },
      include: {
        Accion: {
          include: {
            Meta: true
          }
        }
      },
      orderBy: [
        { fechaSubida: 'asc' }
      ]
    });

    // Priorizar: LEGENDARY > EPIC > HIGH_QUALITY > Resto
    const legendary = evidenciasCompletas.filter(ev => {
      const frequency = ev.Accion?.frequency;
      return frequency === 'ONE_TIME';
    });

    const highQuality = evidenciasCompletas.filter((ev: any) => 
      ev.highQuality === true && ev.qualityScore && ev.qualityScore >= 85
    );

    // Seleccionar máximo 20 evidencias para el video (mezcla de las mejores)
    const seleccionadas = [
      ...legendary.slice(0, 5),
      ...highQuality.slice(0, 10),
      ...evidenciasCompletas.slice(0, 5)
    ]
      .filter((ev, index, self) => self.findIndex(e => e.id === ev.id) === index) // Eliminar duplicados
      .slice(0, 20);

    console.log(`   Seleccionadas: ${seleccionadas.length}`);
    console.log(`   - Legendarias: ${legendary.length}`);
    console.log(`   - Alta calidad: ${highQuality.length}`);

    // ========== PASO 2: Generar texto motivacional con IA ==========
    
    const textoMotivacional = await generarTextoMotivacional(
      usuario.nombre,
      usuario.rangoActual,
      seleccionadas.length,
      evidencias.length
    );

    // ========== PASO 3: Generar video (SIMULADO) ==========
    
    // En producción, aquí se llamaría a:
    // - FFmpeg para combinar imágenes con música
    // - Remotion para renderizado programático
    // - Cloudinary Video API
    // - Servicio externo como Creatomate o Shotstack
    
    // Por ahora, simulamos la generación y retornamos un video de ejemplo
    
    // Simular delay de procesamiento
    await new Promise(resolve => setTimeout(resolve, 3000));

    // En producción, esto sería la URL real del video generado
    const videoUrl = await simularGeneracionVideo(seleccionadas, textoMotivacional);

    console.log(`✅ Time Capsule generada exitosamente`);

    return NextResponse.json({
      success: true,
      videoUrl,
      metadata: {
        evidenciasUsadas: seleccionadas.length,
        evidenciasTotales: evidencias.length,
        duracionSegundos: seleccionadas.length * 3, // 3 segundos por foto
        textoMotivacional
      }
    });

  } catch (error) {
    console.error('Error generando Time Capsule:', error);
    return NextResponse.json(
      { error: 'Error al generar video' },
      { status: 500 }
    );
  }
}

/**
 * Genera texto motivacional personalizado usando IA
 */
async function generarTextoMotivacional(
  nombre: string,
  rango: string,
  evidenciasSeleccionadas: number,
  evidenciasTotales: number
): Promise<string> {
  try {
    const prompt = `Genera un texto motivacional épico y corto (máximo 100 palabras) para un video Time Capsule de transformación personal.

Contexto:
- Usuario: ${nombre}
- Rango actual: ${rango}
- Evidencias en video: ${evidenciasSeleccionadas}
- Total evidencias: ${evidenciasTotales}

El texto debe:
1. Ser inspirador y celebrar el viaje de transformación
2. Mencionar que cada momento capturado es prueba de quién es, no quién dice ser
3. Usar lenguaje épico pero genuino
4. Terminar con un call to action sobre seguir creciendo

Responde SOLO con el texto, sin comillas ni formato adicional.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Eres un coach inspirador que escribe textos motivacionales para videos de transformación personal.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 200,
        temperature: 0.8
      })
    });

    if (!response.ok) {
      throw new Error('Error en llamada a OpenAI');
    }

    const data = await response.json();
    return data.choices[0]?.message?.content?.trim() || 
      `${nombre}, cada momento capturado en este video es prueba de tu transformación. No son solo fotos, son artefactos de verdad que muestran quién ERES. Tu viaje continúa, y cada día es una nueva oportunidad para preservar momentos épicos en The Quantum Archive. ¡Sigue capturando tu grandeza! 🚀`;

  } catch (error) {
    console.error('Error generando texto motivacional:', error);
    // Fallback
    return `${nombre}, este video captura tu increíble viaje de transformación. Cada imagen representa un momento de esfuerzo, disciplina y crecimiento. Eres prueba viviente de que el cambio es posible cuando capturas la verdad de tus acciones. ¡Continúa este camino extraordinario! ✨`;
  }
}

/**
 * Simula la generación del video
 * En producción, esto usaría FFmpeg, Remotion o un servicio de video
 */
async function simularGeneracionVideo(
  evidencias: any[],
  textoMotivacional: string
): Promise<string> {
  // En producción, aquí iría:
  /*
  
  const videoConfig = {
    width: 1920,
    height: 1080,
    fps: 30,
    duration: evidencias.length * 3 // 3 segundos por foto
  };

  // Usar FFmpeg para combinar imágenes
  const ffmpegCommand = `
    ffmpeg -framerate 1/3 \\
      ${evidencias.map((ev, i) => `-loop 1 -t 3 -i ${ev.fotoUrl}`).join(' ')} \\
      -i music-epic.mp3 \\
      -filter_complex "[0:v]scale=1920:1080,fade=in:0:30[v0]; \\
                       [1:v]scale=1920:1080,fade=in:0:30,fade=out:60:30[v1]; \\
                       [v0][v1]concat=n=${evidencias.length}:v=1[outv]" \\
      -map "[outv]" -map ${evidencias.length}:a \\
      -c:v libx264 -c:a aac -shortest \\
      output.mp4
  `;

  // Subir a Cloudinary
  const cloudinaryResponse = await cloudinary.uploader.upload(
    'output.mp4',
    { resource_type: 'video', folder: 'time-capsules' }
  );

  return cloudinaryResponse.secure_url;
  
  */

  // Por ahora, retornamos un video de ejemplo (en producción sería el video real)
  return 'https://res.cloudinary.com/demo/video/upload/v1/sample-time-capsule.mp4';
}
