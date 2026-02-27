import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!usuario) {
      return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Obtener la carta del usuario
    const carta = await prisma.cartaFrutos.findFirst({
      where: { usuarioId: usuario.id }
    });

    if (!carta) {
      return NextResponse.json({
        success: true,
        data: {
          areas: [],
          totalPercent: 0,
          hasCompletedCarta: false
        }
      });
    }

    // Verificar si tiene al menos una declaración
    const hasCompletedCarta = !!(
      (carta as any).finanzasDeclaracion ||
      (carta as any).relacionesDeclaracion ||
      (carta as any).talentosDeclaracion ||
      (carta as any).pazMentalDeclaracion ||
      (carta as any).ocioDeclaracion ||
      (carta as any).saludDeclaracion ||
      (carta as any).servicioTransDeclaracion ||
      (carta as any).servicioComunDeclaracion
    );

    // Obtener metas con acciones y tareas
    const metas = await prisma.meta.findMany({
      where: { cartaId: carta.id },
      include: {
        Accion: {
          include: {
            TaskInstance: {
              where: { usuarioId: usuario.id }
            }
          }
        }
      }
    });

    // Mapeo de categorías a keys de área
    const categoriaToKey: Record<string, string> = {
      'finanzas': 'finanzas',
      'relaciones': 'relaciones',
      'talentos': 'talentos',
      'pazMental': 'pazMental',
      'paz_mental': 'pazMental',
      'ocio': 'ocio',
      'salud': 'salud',
      'servicioTrans': 'servicioTrans',
      'servicio_trans': 'servicioTrans',
      'servicioComun': 'servicioComun',
      'servicio_comun': 'servicioComun',
      // Versiones con mayúsculas
      'FINANZAS': 'finanzas',
      'RELACIONES': 'relaciones',
      'TALENTOS': 'talentos',
      'PAZ_MENTAL': 'pazMental',
      'OCIO': 'ocio',
      'SALUD': 'salud',
      'SERVICIO_TRANSFORMACIONAL': 'servicioTrans',
      'SERVICIO_COMUNITARIO': 'servicioComun',
    };

    // Definir todas las áreas posibles
    const allAreas = [
      'finanzas',
      'relaciones',
      'talentos',
      'pazMental',
      'ocio',
      'salud',
      'servicioTrans',
      'servicioComun'
    ];

    // Calcular progreso por área
    const areas = allAreas.map(areaKey => {
      // Obtener la declaración del área
      const declarationKey = `${areaKey}Declaracion`;
      const declaration = (carta as any)[declarationKey] || null;

      // Filtrar metas de esta área
      const metasDeArea = metas.filter(m => {
        const key = categoriaToKey[m.categoria] || categoriaToKey[m.categoria.toLowerCase()];
        return key === areaKey;
      });

      let tasksTotal = 0;
      let tasksCompleted = 0;

      metasDeArea.forEach(meta => {
        meta.Accion.forEach(accion => {
          const instances = accion.TaskInstance || [];
          tasksTotal += instances.length;
          tasksCompleted += instances.filter(t => t.status === 'COMPLETED').length;
        });
      });

      const percent = tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : 0;

      return {
        key: areaKey,
        label: areaKey,
        declaration,
        tasksCompleted,
        tasksTotal,
        percent
      };
    }).filter(area => area.declaration || area.tasksTotal > 0); // Solo mostrar áreas con declaración o tareas

    // Calcular progreso total
    const totalTasks = areas.reduce((sum, area) => sum + area.tasksTotal, 0);
    const completedTasks = areas.reduce((sum, area) => sum + area.tasksCompleted, 0);
    const totalPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return NextResponse.json({
      success: true,
      data: {
        areas,
        totalPercent,
        hasCompletedCarta
      }
    });

  } catch (error) {
    console.error('Error en /api/carta/progress-areas:', error);
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}
