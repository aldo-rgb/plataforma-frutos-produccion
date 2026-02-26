import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { 
        id: true, 
        rol: true,
        organizationId: true,
        Organization_Usuario_organizationIdToOrganization: {
          select: {
            id: true,
            masterOrganizationId: true
          }
        }
      }
    });

    // Roles permitidos para ver productos activos
    const allowedRoles = [
      'COORDINATOR_BASIC',
      'COORDINATOR_ADVANCED', 
      'COORDINADOR',
      'TRAINER',
      'SCHOOL_ADMIN',
      'ADMINISTRADOR'
    ];

    if (!usuario || !allowedRoles.includes(usuario.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    if (!usuario.organizationId) {
      return NextResponse.json({
        success: true,
        productos: []
      });
    }

    // TODOS los roles ven SOLO los productos de su propia organización
    // Ya no se expande a sibling orgs del master
    let allowedOrganizationIds: number[] = [usuario.organizationId];

    // Buscar todos los productos activos de la organización (todos los niveles y tipos)
    // Un producto está activo si:
    // 1. Aún no ha terminado (endDate >= ahora) O
    // 2. Va a iniciar en los próximos 60 días O
    // 3. Está COMPLETED pero el siguiente nivel de su visión aún no ha iniciado
    const now = new Date();
    const in60Days = new Date(now);
    in60Days.setDate(in60Days.getDate() + 60);
    in60Days.setHours(23, 59, 59, 999);

    // Establecer el inicio del día actual para comparar con endDate
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    // Para TRAINER: incluir también productos donde es trainer, sin importar la organización
    const isTrainer = usuario.rol === 'TRAINER'

    // Primero obtener productos no completados (en curso o próximos)
    // Para productos PL, usar plWeekend3EndDate si endDate es null
    const productosActivos = await prisma.schoolProduct.findMany({
      where: {
        AND: [
          // Filtro de organización
          {
            OR: [
              // Productos de las organizaciones del mismo master
              {
                Vision: {
                  organizationId: { in: allowedOrganizationIds }
                }
              },
              {
                organizationId: { in: allowedOrganizationIds }
              },
              // Si es TRAINER, incluir productos donde es trainer (cualquier org)
              ...(isTrainer ? [{ trainerId: usuario.id }] : [])
            ]
          },
          // Filtros de estado
          { isActive: true },
          { trainingStatus: { not: 'COMPLETED' } },
          // Filtro de fechas
          {
            OR: [
              { endDate: { gte: startOfToday } },
              { endDate: null }, // Productos sin endDate también
              { 
                levelType: 'PL',
                plWeekend3EndDate: { gte: startOfToday }
              },
              {
                levelType: 'PL',
                plWeekend1EndDate: { gte: startOfToday }
              }
            ]
          }
        ]
      },
      orderBy: {
        startDate: 'asc'
      },
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        levelType: true,
        startDate: true,
        endDate: true,
        plWeekend1StartDate: true,
        plWeekend1EndDate: true,
        plWeekend2StartDate: true,
        plWeekend2EndDate: true,
        plWeekend3StartDate: true,
        plWeekend3EndDate: true,
        maxCapacity: true,
        currentEnrollment: true,
        visionId: true,
        location: true,
        videoUrl: true,
        trainingStatus: true
      }
    });

    // Obtener productos COMPLETADOS cuyo siguiente nivel aún no ha iniciado
    const productosCompletados = await prisma.schoolProduct.findMany({
      where: {
        OR: [
          {
            Vision: {
              organizationId: usuario.organizationId
            }
          },
          {
            organizationId: usuario.organizationId
          }
        ],
        isActive: true,
        trainingStatus: 'COMPLETED'
      },
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        levelType: true,
        startDate: true,
        endDate: true,
        maxCapacity: true,
        currentEnrollment: true,
        visionId: true,
        location: true,
        videoUrl: true,
        trainingStatus: true
      }
    });

    // Filtrar productos completados: solo mostrar si el siguiente nivel no ha iniciado
    const productosCompletadosVisibles = [];
    
    for (const producto of productosCompletados) {
      if (!producto.visionId) continue;
      
      // Determinar el siguiente nivel
      let siguienteNivel: string | null = null;
      if (producto.levelType === 'BASIC') {
        siguienteNivel = 'ADVANCED';
      } else if (producto.levelType === 'ADVANCED') {
        siguienteNivel = 'PL';
      }
      // Si es PL, no hay siguiente nivel, no se muestra después de completado
      
      if (!siguienteNivel) continue;
      
      // Buscar si existe el producto del siguiente nivel para esta visión
      const siguienteProducto = await prisma.schoolProduct.findFirst({
        where: {
          visionId: producto.visionId,
          levelType: siguienteNivel,
          isActive: true
        },
        select: { startDate: true }
      });
      
      // Si no hay siguiente producto o aún no ha iniciado, mostrar el completado
      if (!siguienteProducto || !siguienteProducto.startDate || siguienteProducto.startDate > now) {
        productosCompletadosVisibles.push(producto);
      }
    }

    // Combinar productos activos y completados visibles
    const todosProductos = [...productosActivos, ...productosCompletadosVisibles];
    
    // Ordenar por fecha de inicio
    todosProductos.sort((a, b) => {
      const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
      const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
      return dateA - dateB;
    });

    // FILTRAR: Solo el próximo entrenamiento vigente por visión
    // Agrupar por visionId y tomar solo el que tenga la fecha de inicio más próxima que no ha terminado
    const productosPorVision = new Map<number, typeof todosProductos[0]>();
    
    for (const producto of todosProductos) {
      if (!producto.visionId) continue;
      
      const visionId = producto.visionId;
      const existente = productosPorVision.get(visionId);
      
      // Si ya tenemos un producto para esta visión, comparar cuál es más relevante
      if (existente) {
        // Prioridad: productos no completados sobre completados
        if (existente.trainingStatus === 'COMPLETED' && producto.trainingStatus !== 'COMPLETED') {
          productosPorVision.set(visionId, producto);
          continue;
        }
        
        // Si ambos tienen el mismo estado, tomar el de fecha más próxima
        if (existente.trainingStatus === producto.trainingStatus) {
          const fechaExistente = existente.startDate ? new Date(existente.startDate).getTime() : Infinity;
          const fechaProducto = producto.startDate ? new Date(producto.startDate).getTime() : Infinity;
          
          // Si el producto actual tiene fecha más próxima y no ha terminado aún
          if (fechaProducto < fechaExistente) {
            // Para PL, verificar plWeekend3EndDate o endDate
            const endDateProducto = producto.levelType === 'PL' 
              ? (producto.plWeekend3EndDate || producto.endDate)
              : producto.endDate;
            
            // Solo reemplazar si el entrenamiento no ha terminado
            if (!endDateProducto || new Date(endDateProducto) >= now) {
              productosPorVision.set(visionId, producto);
            }
          }
        }
      } else {
        // Verificar que el producto no haya terminado
        const endDateProducto = producto.levelType === 'PL' 
          ? (producto.plWeekend3EndDate || producto.endDate)
          : producto.endDate;
        
        // Solo agregar si no ha terminado o está en curso
        const haTerminado = endDateProducto && new Date(endDateProducto) < now;
        
        if (!haTerminado || producto.trainingStatus !== 'COMPLETED') {
          productosPorVision.set(visionId, producto);
        }
      }
    }
    
    // Convertir Map a array y ordenar por fecha
    const productos = Array.from(productosPorVision.values());
    productos.sort((a, b) => {
      const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
      const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
      return dateA - dateB;
    });

    // Calcular el conteo real de inscripciones pagadas por cada producto
    const productosConConteoReal = await Promise.all(
      productos.map(async (producto) => {
        // Si no tiene visionId o levelType, no podemos contar tickets
        if (!producto.visionId || !producto.levelType) {
          return { ...producto, currentEnrollment: 0 };
        }

        // Mapear levelType del producto al nivel de enrollment
        const validLevels = ['BASIC', 'ADVANCED', 'PL'];
        const levelMap: Record<string, string> = {
          'BASIC': 'BASIC',
          'ADVANCED': 'ADVANCED',
          'PL': 'PL',
          'INTERMEDIATE': 'ADVANCED',
        };
        const enrollmentLevel = levelMap[producto.levelType] || producto.levelType;

        // Si el nivel no es válido para tickets, retornar 0
        if (!validLevels.includes(enrollmentLevel)) {
          return { ...producto, currentEnrollment: 0 };
        }

        // Contar tickets pagados para esta visión y nivel
        const paidTicketsCount = await prisma.ticket.count({
          where: {
            visionId: producto.visionId,
            level: enrollmentLevel as any,
            status: 'ACTIVE',
            paymentStatus: { in: ['PAID', 'PARTIAL'] }
          }
        });

        return {
          ...producto,
          currentEnrollment: paidTicketsCount
        };
      })
    );

    logger.debug('📦 Productos encontrados:', productosConConteoReal.length, productosConConteoReal);

    return NextResponse.json({
      success: true,
      productos: productosConConteoReal
    });

  } catch (error: any) {
    logger.error('❌ Error obteniendo productos activos:', error);
    return NextResponse.json(
      { 
        error: 'Error al obtener productos',
        message: error?.message || 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
