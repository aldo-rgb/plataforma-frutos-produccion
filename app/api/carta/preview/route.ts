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
        updatedAt: true,
        finanzasSer: true,
        finanzasDeclaracion: true,
        relacionesSer: true,
        relacionesDeclaracion: true,
        talentosSer: true,
        talentosDeclaracion: true,
        saludSer: true,
        saludDeclaracion: true,
        pazMentalSer: true,
        pazMentalDeclaracion: true,
        ocioSer: true,
        ocioDeclaracion: true,
        servicioTransSer: true,
        servicioTransDeclaracion: true,
        servicioComunSer: true,
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
      { key: 'finanzas', name: 'Finanzas', ser: carta.finanzasSer, obj: carta.finanzasDeclaracion },
      { key: 'relaciones', name: 'Relaciones', ser: carta.relacionesSer, obj: carta.relacionesDeclaracion },
      { key: 'talentos', name: 'Talentos', ser: carta.talentosSer, obj: carta.talentosDeclaracion },
      { key: 'salud', name: 'Salud', ser: carta.saludSer, obj: carta.saludDeclaracion },
      { key: 'pazMental', name: 'Paz Mental', ser: carta.pazMentalSer, obj: carta.pazMentalDeclaracion },
      { key: 'ocio', name: 'Ocio', ser: carta.ocioSer, obj: carta.ocioDeclaracion },
      { key: 'servicioTrans', name: 'Servicio Trans.', ser: carta.servicioTransSer, obj: carta.servicioTransDeclaracion },
      { key: 'servicioComun', name: 'Servicio Comun.', ser: carta.servicioComunSer, obj: carta.servicioComunDeclaracion },
    ];

    const areasConDatos = areas.filter(a => a.ser || a.obj);

    return NextResponse.json({
      hasData: areasConDatos.length > 0,
      estado: carta.estado,
      updatedAt: carta.updatedAt,
      areasConDatos: areasConDatos.length,
      preview: areasConDatos.map(a => ({
        area: a.key,
        name: a.name,
        hasSer: !!a.ser,
        hasObj: !!a.obj,
        serPreview: a.ser ? a.ser.substring(0, 80) + (a.ser.length > 80 ? '...' : '') : null,
      }))
    });

  } catch (error) {
    console.error('Error en carta/preview:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
