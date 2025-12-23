import { prisma } from '@/lib/prisma';
import { addDays, startOfDay, endOfDay } from 'date-fns';

/**
 * 🧮 SISTEMA DE PRECIOS DINÁMICOS
 * Calcula el precio de una sesión de mentoría basado en:
 * - Precio base del mentor
 * - Ocupación de su agenda en los próximos 30 días
 * 
 * Reglas de Negocio:
 * - 0-40% ocupado: 1.0x (Precio Estándar)
 * - 41-70% ocupado: 1.2x (+20%) - Alta Demanda
 * - 71-90% ocupado: 1.5x (+50%) - Últimos Lugares
 * - 91-100% ocupado: 2.0x (+100%) - Tarifa Premium
 */

interface DynamicPricing {
  precioBase: number;
  precioFinal: number;
  multiplicador: number;
  etiqueta: string;
  icono: string;
  tasaOcupacion: number; // Porcentaje (0-100)
  capacidadMensual: number;
  reservasActuales: number;
}

export async function getDynamicPrice(mentorId: number): Promise<DynamicPricing> {
  // 1️⃣ DEFINIR VENTANA DE TIEMPO (Próximos 30 días)
  const hoy = startOfDay(new Date());
  const proximos30Dias = endOfDay(addDays(hoy, 30));

  // 2️⃣ OBTENER CAPACIDAD TOTAL (OFERTA)
  // Calculamos cuántas horas ofrece el mentor a la semana para MENTORÍAS
  const disponibilidad = await prisma.callAvailability.findMany({
    where: { 
      mentorId: mentorId,
      type: 'MENTORSHIP', // Solo nos importan las mentorías pagadas (no disciplina)
      isActive: true 
    }
  });

  // Calculamos horas disponibles por semana aproximadamente
  let horasSemanales = 0;
  disponibilidad.forEach(slot => {
    const inicio = parseInt(slot.startTime.split(':')[0]);
    const fin = parseInt(slot.endTime.split(':')[0]);
    horasSemanales += (fin - inicio);
  });
  
  // Capacidad mensual estimada (Horas semana × 4.2 semanas promedio)
  const capacidadMensual = horasSemanales * 4.2; 

  // Si no tiene horario configurado, asumimos capacidad mínima de 20 horas para evitar división por cero
  const capacidadReal = capacidadMensual > 0 ? capacidadMensual : 20;

  // 3️⃣ OBTENER RESERVAS ACTUALES (DEMANDA)
  const reservasCount = await prisma.callBooking.count({
    where: {
      mentorId: mentorId,
      type: 'MENTORSHIP',
      scheduledAt: { 
        gte: hoy, 
        lte: proximos30Dias 
      },
      status: { 
        notIn: ['CANCELLED', 'MISSED'] 
      }
    }
  });

  // 4️⃣ CALCULAR TASA DE OCUPACIÓN
  const tasaOcupacion = reservasCount / capacidadReal;

  // 5️⃣ OBTENER PRECIO BASE DEL MENTOR
  const perfilMentor = await prisma.perfilMentor.findUnique({
    where: { usuarioId: mentorId },
    select: { precioBase: true }
  });
  
  const precioBase = perfilMentor?.precioBase || 1000;

  // 6️⃣ APLICAR TARIFA DINÁMICA (EL ALGORITMO) 🎯
  let multiplicador = 1.0;
  let etiqueta = '🏷️ Precio Estándar';
  let icono = '🏷️';

  if (tasaOcupacion > 0.9) {
    // 91-100%: SATURADO
    multiplicador = 2.0;
    etiqueta = '💎 Tarifa Premium';
    icono = '💎';
  } else if (tasaOcupacion > 0.7) {
    // 71-90%: LLENO
    multiplicador = 1.5;
    etiqueta = '🔥 Últimos Lugares';
    icono = '🔥';
  } else if (tasaOcupacion > 0.4) {
    // 41-70%: NORMAL
    multiplicador = 1.2;
    etiqueta = '📈 Alta Demanda';
    icono = '📈';
  }
  // 0-40%: Precio estándar (multiplicador = 1.0)

  const precioFinal = Math.round(precioBase * multiplicador);

  return {
    precioBase,
    precioFinal,
    multiplicador,
    etiqueta,
    icono,
    tasaOcupacion: Math.round(tasaOcupacion * 100), // Convertir a porcentaje para mostrar
    capacidadMensual: Math.round(capacidadReal),
    reservasActuales: reservasCount
  };
}

/**
 * 📊 OBTENER ESTADÍSTICAS DE OCUPACIÓN DETALLADAS
 * Para mostrar al mentor en su dashboard
 */
export async function getMentorOccupancyStats(mentorId: number) {
  const pricing = await getDynamicPrice(mentorId);
  
  return {
    ...pricing,
    mensaje: pricing.tasaOcupacion > 70 
      ? '¡Tu agenda está muy solicitada! Considera aumentar tu disponibilidad.' 
      : pricing.tasaOcupacion > 40
      ? 'Tu agenda tiene buena demanda. Sigue así.'
      : 'Tienes disponibilidad. Considera promocionar tus servicios.',
    colorEstado: pricing.tasaOcupacion > 70 
      ? 'text-red-500' 
      : pricing.tasaOcupacion > 40
      ? 'text-amber-500'
      : 'text-green-500'
  };
}
