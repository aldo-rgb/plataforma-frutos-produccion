import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDynamicPrice } from '@/lib/dynamicPricing';

/**
 * GET /api/student/mentor-details?mentorId=123
 * 
 * Obtiene los detalles completos de un mentor incluyendo:
 * - Información de perfil
 * - Precio dinámico calculado en tiempo real
 * - Estadísticas de disponibilidad
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mentorId = searchParams.get('mentorId');

  if (!mentorId) {
    return NextResponse.json({ 
      error: 'ID del mentor es requerido' 
    }, { status: 400 });
  }

  try {
    // 1. Obtener datos del usuario base
    const usuario = await prisma.usuario.findUnique({
      where: { id: Number(mentorId) },
      select: {
        id: true,
        nombre: true,
        email: true,
        profileImage: true,
        jobTitle: true,
        experienceYears: true,
        bioShort: true,
        skills: true,
        isActive: true
      }
    });

    if (!usuario) {
      return NextResponse.json({ 
        error: 'Mentor no encontrado' 
      }, { status: 404 });
    }

    // 2. Obtener perfil de mentor con estadísticas
    const perfilMentor = await prisma.perfilMentor.findUnique({
      where: { usuarioId: Number(mentorId) },
      select: {
        id: true,
        nivel: true,
        especialidad: true,
        especialidadesSecundarias: true,
        biografiaCorta: true,
        biografiaCompleta: true,
        logros: true,
        experienciaAnios: true,
        calificacionPromedio: true,
        totalResenas: true,
        disponible: true,
        destacado: true,
        completedSessionsCount: true,
        precioBase: true
      }
    });

    if (!perfilMentor) {
      return NextResponse.json({ 
        error: 'Perfil de mentor no encontrado' 
      }, { status: 404 });
    }

    // 3. 🔥 CALCULAR PRECIO DINÁMICO EN TIEMPO REAL
    const pricing = await getDynamicPrice(Number(mentorId));

    // 4. Obtener servicios disponibles (opcional)
    const servicios = await prisma.servicioMentoria.findMany({
      where: { 
        perfilMentorId: perfilMentor.id,
        activo: true 
      },
      select: {
        id: true,
        tipo: true,
        nombre: true,
        descripcion: true,
        duracionHoras: true,
        precioTotal: true
      },
      orderBy: { precioTotal: 'asc' }
    });

    // 5. Obtener disponibilidad horaria (DISCIPLINE para llamadas semanales)
    const disponibilidad = await prisma.callAvailability.findMany({
      where: {
        mentorId: Number(mentorId),
        type: 'DISCIPLINE', // 🔥 Cambiado a DISCIPLINE para llamadas semanales
        isActive: true
      },
      select: {
        id: true,
        dayOfWeek: true,
        startTime: true,
        endTime: true
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' }
      ]
    });

    // 6. Construir respuesta completa
    return NextResponse.json({ 
      success: true,
      mentor: {
        // Datos básicos
        ...usuario,
        
        // Datos de perfil
        nivel: perfilMentor.nivel,
        especialidad: perfilMentor.especialidad,
        especialidadesSecundarias: perfilMentor.especialidadesSecundarias,
        biografia: perfilMentor.biografiaCompleta || perfilMentor.biografiaCorta,
        logros: perfilMentor.logros,
        
        // Estadísticas
        calificacionPromedio: perfilMentor.calificacionPromedio,
        totalResenas: perfilMentor.totalResenas,
        sesionesCompletadas: perfilMentor.completedSessionsCount,
        
        // Estado
        disponible: perfilMentor.disponible,
        destacado: perfilMentor.destacado
      },
      
      // 🔥 PRECIOS DINÁMICOS
      pricing: {
        precioBase: pricing.precioBase,
        precioFinal: pricing.precioFinal,
        multiplicador: pricing.multiplicador,
        etiqueta: pricing.etiqueta,
        icono: pricing.icono,
        tasaOcupacion: pricing.tasaOcupacion,
        
        // Info adicional para UI
        mostrarDescuento: pricing.multiplicador > 1,
        esUrgente: pricing.tasaOcupacion > 70,
        descripcion: pricing.multiplicador > 1 
          ? `Precio aumentado por alta demanda (${pricing.tasaOcupacion}% ocupado en los próximos 30 días)` 
          : 'Precio estándar'
      },
      
      // Servicios y disponibilidad
      servicios,
      disponibilidad
    });

  } catch (error: any) {
    console.error('❌ Error al obtener detalles del mentor:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error.message 
    }, { status: 500 });
  }
}
