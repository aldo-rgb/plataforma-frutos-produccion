import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * 🧬 QUANTUM IA - Consejo Diario para Activar Visión
 * 
 * Genera consejos personalizados cada día para motivar y activar
 * a los participantes de la visión mediante tareas virales y de impacto.
 */

const CONSEJOS_QUANTUM = [
  {
    emoji: '📱',
    tipo: 'Redes Sociales',
    consejo: 'Crea tareas de <span class="font-bold text-cyan-300">compartir en redes sociales</span> para activar tu visión y motivar a tus participantes. ¡Las misiones virales generan compromiso y recuperan vidas extra!',
    accion: 'Tarea: Publica tu transformación en Instagram/TikTok'
  },
  {
    emoji: '🎥',
    tipo: 'Video Viral',
    consejo: 'Asigna una tarea de <span class="font-bold text-cyan-300">crear un video de 60 segundos</span> compartiendo su meta más ambiciosa. Los videos cortos generan 3x más engagement.',
    accion: 'Tarea: Video testimonio de tu visión personal'
  },
  {
    emoji: '🔥',
    tipo: 'Challenge',
    consejo: 'Lanza un <span class="font-bold text-cyan-300">reto de 7 días</span> donde compartan su progreso diario en stories. Los challenges crean comunidad y compromiso sostenido.',
    accion: 'Tarea: Challenge de consistencia de 7 días'
  },
  {
    emoji: '💪',
    tipo: 'Transformación',
    consejo: 'Pide que compartan un <span class="font-bold text-cyan-300">antes y después</span> de algún área de su carta. Las transformaciones visuales inspiran a otros a comprometerse.',
    accion: 'Tarea: Foto de tu transformación (antes/después)'
  },
  {
    emoji: '🎯',
    tipo: 'Meta Pública',
    consejo: 'Crea una tarea de <span class="font-bold text-cyan-300">declarar públicamente su meta #1</span> en redes. El compromiso público aumenta 5x la probabilidad de cumplir objetivos.',
    accion: 'Tarea: Declara tu meta #1 públicamente'
  },
  {
    emoji: '🌟',
    tipo: 'Historia Inspiradora',
    consejo: 'Solicita que graben un <span class="font-bold text-cyan-300">audio de 2 minutos contando su WHY</span>. Las historias auténticas conectan emocionalmente y activan a otros.',
    accion: 'Tarea: Audio compartiendo tu propósito'
  },
  {
    emoji: '👥',
    tipo: 'Invitación',
    consejo: 'Asigna una tarea de <span class="font-bold text-cyan-300">invitar a 3 personas</span> a conocer el programa. El crecimiento orgánico fortalece el compromiso de todos.',
    accion: 'Tarea: Invita a 3 personas a transformarse'
  },
  {
    emoji: '✨',
    tipo: 'Aprendizaje',
    consejo: 'Pide que compartan <span class="font-bold text-cyan-300">el aprendizaje más valioso</span> de la semana en un post. Enseñar lo aprendido refuerza el conocimiento.',
    accion: 'Tarea: Comparte tu aprendizaje clave de la semana'
  },
  {
    emoji: '🎬',
    tipo: 'Day in the Life',
    consejo: 'Crea una tarea de <span class="font-bold text-cyan-300">grabar un "día en mi nueva vida"</span> mostrando su rutina transformada. El contenido lifestyle genera identificación.',
    accion: 'Tarea: Muestra un día en tu vida transformada'
  },
  {
    emoji: '💬',
    tipo: 'Testimonial',
    consejo: 'Solicita un <span class="font-bold text-cyan-300">testimonial en video de 90 segundos</span> sobre su experiencia. Los testimonios reales son la mejor publicidad.',
    accion: 'Tarea: Video testimonial de tu experiencia'
  },
  {
    emoji: '🎨',
    tipo: 'Creatividad',
    consejo: 'Asigna crear un <span class="font-bold text-cyan-300">meme o contenido creativo</span> sobre su transformación. El contenido divertido se viraliza más rápido.',
    accion: 'Tarea: Crea un meme sobre tu transformación'
  },
  {
    emoji: '📊',
    tipo: 'Resultados',
    consejo: 'Pide que compartan <span class="font-bold text-cyan-300">sus métricas de progreso</span> en un post. Los números concretos generan credibilidad y motivación.',
    accion: 'Tarea: Comparte tus números de progreso'
  },
  {
    emoji: '🎙️',
    tipo: 'Live',
    consejo: 'Organiza que hagan un <span class="font-bold text-cyan-300">live compartiendo su viaje</span> en Instagram/TikTok. El contenido en vivo genera urgencia y autenticidad.',
    accion: 'Tarea: Haz un live sobre tu transformación'
  },
  {
    emoji: '🌈',
    tipo: 'Inspiración',
    consejo: 'Crea una tarea de <span class="font-bold text-cyan-300">compartir una cita motivacional</span> que resuma su cambio. Las frases inspiradoras se comparten masivamente.',
    accion: 'Tarea: Crea y comparte tu frase motivacional'
  },
  {
    emoji: '🎁',
    tipo: 'Valor Gratis',
    consejo: 'Pide que compartan <span class="font-bold text-cyan-300">3 consejos gratuitos</span> de lo que han aprendido. Dar valor primero atrae a personas comprometidas.',
    accion: 'Tarea: Comparte 3 tips valiosos gratis'
  }
];

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Usar el día del año para rotar el consejo (cambia cada día)
    const today = new Date();
    const dayOfYear = Math.floor(
      (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
    );
    
    // Seleccionar consejo basado en el día
    const consejoIndex = dayOfYear % CONSEJOS_QUANTUM.length;
    const consejoDelDia = CONSEJOS_QUANTUM[consejoIndex];

    return NextResponse.json({
      success: true,
      consejo: consejoDelDia,
      fecha: today.toISOString().split('T')[0],
      totalConsejos: CONSEJOS_QUANTUM.length
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo consejo Quantum:', error);
    return NextResponse.json(
      { 
        error: 'Error al obtener consejo',
        message: error?.message || 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
