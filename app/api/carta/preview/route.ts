import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const carta = await prisma.cartaFrutos.findFirst({
      where: { usuarioId: parseInt(session.user.id) },
      select: {
        id: true,
        estado: true,
        fechaActualizacion: true,
        wizardStep: true,
        wizardCompletedAt: true,
        // Metas (objetivos)
        finanzasMeta: true,
        relacionesMeta: true,
        talentosMeta: true,
        saludMeta: true,
        pazMentalMeta: true,
        ocioMeta: true,
        servicioTransMeta: true,
        servicioComunMeta: true,
        // Declaraciones (SER)
        finanzasDeclaracion: true,
        relacionesDeclaracion: true,
        talentosDeclaracion: true,
        saludDeclaracion: true,
        pazMentalDeclaracion: true,
        ocioDeclaracion: true,
        servicioTransDeclaracion: true,
        servicioComunDeclaracion: true,
      }
    });

    if (!carta) {
      return NextResponse.json({
        hasData: false,
        message: 'No tienes una carta guardada en el servidor'
      });
    }

    const areas = [
      { 
        key: 'finanzas', 
        name: 'Finanzas', 
        meta: carta.finanzasMeta, 
        declaracion: carta.finanzasDeclaracion 
      },
      { 
        key: 'relaciones', 
        name: 'Relaciones', 
        meta: carta.relacionesMeta, 
        declaracion: carta.relacionesDeclaracion 
      },
      { 
        key: 'talentos', 
        name: 'Talentos', 
        meta: carta.talentosMeta, 
        declaracion: carta.talentosDeclaracion 
      },
      { 
        key: 'salud', 
        name: 'Salud', 
        meta: carta.saludMeta, 
        declaracion: carta.saludDeclaracion 
      },
      { 
        key: 'pazMental', 
        name: 'Paz Mental', 
        meta: carta.pazMentalMeta, 
        declaracion: carta.pazMentalDeclaracion 
      },
      { 
        key: 'ocio', 
        name: 'Ocio', 
        meta: carta.ocioMeta, 
        declaracion: carta.ocioDeclaracion 
      },
      { 
        key: 'servicioTrans', 
        name: 'Servicio Trans.', 
        meta: carta.servicioTransMeta, 
        declaracion: carta.servicioTransDeclaracion 
      },
      { 
        key: 'servicioComun', 
        name: 'Servicio Comun.', 
        meta: carta.servicioComunMeta, 
        declaracion: carta.servicioComunDeclaracion 
      },
    ];

    // Filtrar áreas que tienen algún dato
    const areasConDatos = areas.filter(a => a.meta || a.declaracion);

    return NextResponse.json({
      hasData: areasConDatos.length > 0 || (carta.wizardStep && carta.wizardStep > 1),
      estado: carta.estado,
      updatedAt: carta.fechaActualizacion,
      wizardStep: carta.wizardStep || 1,
      wizardCompletedAt: carta.wizardCompletedAt,
      areasConDatos: areasConDatos.length,
      preview: areasConDatos.map(a => ({
        area: a.key,
        name: a.name,
        hasMeta: !!a.meta,
        hasDeclaracion: !!a.declaracion,
        // Mostrar la declaración como preview, o la meta si no hay declaración
        serPreview: a.declaracion 
          ? (a.declaracion.substring(0, 80) + (a.declaracion.length > 80 ? '...' : ''))
          : (a.meta ? `Meta: ${a.meta.substring(0, 60)}${a.meta.length > 60 ? '...' : ''}` : null),
      }))
    });

  } catch (error) {
    console.error('Error en carta/preview:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
