import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const AREA_MAP: Record<string, string> = {
  // IDs originales
  finanzas: 'finanzas',
  relaciones: 'relaciones',
  talentos: 'talentos',
  pazMental: 'pazMental',
  ocio: 'ocio',
  salud: 'salud',
  servicioTrans: 'servicioTrans',
  servicioComun: 'servicioComun',
  // IDs alternativos del frontend
  tiempo: 'ocio',
  ocupacion: 'talentos',
  espiritualidad: 'pazMental'
};

export async function PUT(req: NextRequest) {
  let areaId = '';
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    areaId = body.areaId;
    const declaracion = body.declaracion;

    console.log('🔄 Actualizando declaración:', { areaId, declaracion });

    if (!areaId || !declaracion) {
      return NextResponse.json(
        { error: 'Área y declaración son requeridos' },
        { status: 400 }
      );
    }

    // Validar que el área existe
    const areaKey = AREA_MAP[areaId];
    if (!areaKey) {
      console.error('❌ Área no encontrada en AREA_MAP:', areaId);
      console.error('❌ Áreas disponibles:', Object.keys(AREA_MAP));
      return NextResponse.json({ error: `Área inválida: ${areaId}` }, { status: 400 });
    }

    // Buscar la carta del usuario
    const carta = await prisma.cartaFrutos.findFirst({
      where: { usuarioId: parseInt(session.user.id) }
    });

    if (!carta) {
      return NextResponse.json({ error: 'Carta no encontrada' }, { status: 404 });
    }

    // Construir el nombre del campo dinámicamente
    const fieldName = `${areaKey}Declaracion`;

    console.log('📝 Actualizando campo:', fieldName);
    console.log('📝 Carta ID:', carta.id);

    // Actualizar la declaración en CartaFrutos
    const updatedCarta = await prisma.cartaFrutos.update({
      where: { id: carta.id },
      data: {
        [fieldName]: declaracion.trim(),
        fechaActualizacion: new Date()
      }
    });

    // IMPORTANTE: También actualizar las metas de esta área con la nueva declaración
    // Esto asegura que se muestre el cambio en la UI
    const areaCategoria = areaKey === 'ocio' ? 'ocio' : 
                          areaKey === 'talentos' ? 'talentos' : 
                          areaKey === 'pazMental' ? 'pazMental' : areaKey;
    
    await prisma.meta.updateMany({
      where: {
        cartaId: carta.id,
        categoria: areaCategoria
      },
      data: {
        declaracionPoder: declaracion.trim()
      }
    });

    console.log('✅ Declaración actualizada en CartaFrutos y Metas:', fieldName);

    return NextResponse.json({
      success: true,
      carta: updatedCarta
    });

  } catch (error: any) {
    console.error('❌ Error actualizando declaración:', error);
    console.error('❌ Stack:', error.stack);
    console.error('❌ Message:', error.message);
    return NextResponse.json(
      { 
        error: 'Error al actualizar la declaración',
        details: error.message,
        areaId: areaId 
      },
      { status: 500 }
    );
  }
}
