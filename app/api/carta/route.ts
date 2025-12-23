import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

// 1. OBTENER DATOS (GET)
// Esto se ejecuta cuando entras a la página para cargar lo que ya tenías guardado.
export async function GET() {
  try {
    // Obtener usuario autenticado
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Buscar el usuario en la BD
    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    console.log('🔍 Buscando carta para usuario:', usuario.id);

    // Buscamos la carta del usuario autenticado
    const carta = await prisma.cartaFrutos.findFirst({
      where: { usuarioId: usuario.id },
      orderBy: { id: 'desc' }, // Tomamos la más reciente
      include: {
        tareas: true // Incluir las tareas asociadas
      }
    });

    console.log('📊 Carta encontrada:', carta ? `ID ${carta.id}` : 'No existe');

    // Si no tiene carta, devolvemos un objeto vacío pero exitoso
    return NextResponse.json(carta || {});
  } catch (error) {
    console.error('❌ Error cargando carta:', error);
    return NextResponse.json({ error: 'Error cargando carta' }, { status: 500 });
  }
}

// 2. GUARDAR DATOS (POST)
// Esto se ejecuta cuando le das clic al botón "Guardar Progreso".
export async function POST(request: Request) {
  try {
    // Obtener usuario autenticado
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Buscar el usuario en la BD
    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const body = await request.json();

    // Usamos "upsert": Si existe, actualiza. Si no existe, crea una nueva.
    const cartaActualizada = await prisma.cartaFrutos.upsert({
      where: { 
        id: body.id || 0 // Si no hay ID, usamos 0 para forzar la creación
      },
      update: {
        finanzasMeta: body.FINANZAS?.meta,
        finanzasAvance: body.FINANZAS?.avance,
        finanzasScheduledDays: body.FINANZAS?.scheduledDays ? JSON.stringify(body.FINANZAS.scheduledDays) : null,
        relacionesMeta: body.RELACIONES?.meta,
        relacionesAvance: body.RELACIONES?.avance,
        relacionesScheduledDays: body.RELACIONES?.scheduledDays ? JSON.stringify(body.RELACIONES.scheduledDays) : null,
        talentosMeta: body.TALENTOS?.meta,
        talentosAvance: body.TALENTOS?.avance,
        talentosScheduledDays: body.TALENTOS?.scheduledDays ? JSON.stringify(body.TALENTOS.scheduledDays) : null,
        pazMentalMeta: body.PAZ_MENTAL?.meta,
        pazMentalAvance: body.PAZ_MENTAL?.avance,
        pazMentalScheduledDays: body.PAZ_MENTAL?.scheduledDays ? JSON.stringify(body.PAZ_MENTAL.scheduledDays) : null,
        ocioMeta: body.OCIO?.meta,
        ocioAvance: body.OCIO?.avance,
        ocioScheduledDays: body.OCIO?.scheduledDays ? JSON.stringify(body.OCIO.scheduledDays) : null,
        saludMeta: body.SALUD?.meta,
        saludAvance: body.SALUD?.avance,
        saludScheduledDays: body.SALUD?.scheduledDays ? JSON.stringify(body.SALUD.scheduledDays) : null,
        servicioComunMeta: body.COMUNIDAD?.meta,
        servicioComunAvance: body.COMUNIDAD?.avance,
        servicioComunScheduledDays: body.COMUNIDAD?.scheduledDays ? JSON.stringify(body.COMUNIDAD.scheduledDays) : null,
        enrolamientoMeta: body.ENROLAMIENTO?.meta,
        enrolamientoAvance: body.ENROLAMIENTO?.avance,
      },
      create: {
        usuarioId: usuario.id, // CORREGIDO: Usar el ID del usuario autenticado
        finanzasMeta: body.FINANZAS?.meta || "",
        finanzasAvance: body.FINANZAS?.avance || 0,
        finanzasScheduledDays: body.FINANZAS?.scheduledDays ? JSON.stringify(body.FINANZAS.scheduledDays) : null,
        relacionesMeta: body.RELACIONES?.meta || "",
        relacionesAvance: body.RELACIONES?.avance || 0,
        relacionesScheduledDays: body.RELACIONES?.scheduledDays ? JSON.stringify(body.RELACIONES.scheduledDays) : null,
        talentosMeta: body.TALENTOS?.meta || "",
        talentosAvance: body.TALENTOS?.avance || 0,
        talentosScheduledDays: body.TALENTOS?.scheduledDays ? JSON.stringify(body.TALENTOS.scheduledDays) : null,
        pazMentalMeta: body.PAZ_MENTAL?.meta || "",
        pazMentalAvance: body.PAZ_MENTAL?.avance || 0,
        pazMentalScheduledDays: body.PAZ_MENTAL?.scheduledDays ? JSON.stringify(body.PAZ_MENTAL.scheduledDays) : null,
        ocioMeta: body.OCIO?.meta || "",
        ocioAvance: body.OCIO?.avance || 0,
        ocioScheduledDays: body.OCIO?.scheduledDays ? JSON.stringify(body.OCIO.scheduledDays) : null,
        saludMeta: body.SALUD?.meta || "",
        saludAvance: body.SALUD?.avance || 0,
        saludScheduledDays: body.SALUD?.scheduledDays ? JSON.stringify(body.SALUD.scheduledDays) : null,
        servicioComunMeta: body.COMUNIDAD?.meta || "",
        servicioComunAvance: body.COMUNIDAD?.avance || 0,
        servicioComunScheduledDays: body.COMUNIDAD?.scheduledDays ? JSON.stringify(body.COMUNIDAD.scheduledDays) : null,
        enrolamientoMeta: body.ENROLAMIENTO?.meta || "Compromiso de enrolar 4 invitados.",
        enrolamientoAvance: body.ENROLAMIENTO?.avance || 0,
        fechaActualizacion: new Date(),
      },
    });

    // 🔥 GUARDAR TAREAS ADICIONALES EN LA TABLA Tarea
    const categorias = ['FINANZAS', 'RELACIONES', 'TALENTOS', 'PAZ_MENTAL', 'OCIO', 'SALUD', 'COMUNIDAD'];
    
    for (const categoria of categorias) {
      if (body[categoria]?.tareasAdicionales && Array.isArray(body[categoria].tareasAdicionales)) {
        // Eliminar tareas antiguas de esta categoría
        await prisma.tarea.deleteMany({
          where: {
            cartaId: cartaActualizada.id,
            categoria: categoria
          }
        });
        
        // Crear nuevas tareas
        const tareasAdicionales = body[categoria].tareasAdicionales;
        for (const tarea of tareasAdicionales) {
          // Solo guardar tareas con descripción válida
          if (tarea.descripcion && tarea.descripcion.trim() !== '') {
            await prisma.tarea.create({
              data: {
                cartaId: cartaActualizada.id,
                categoria: categoria,
                descripcion: tarea.descripcion,
                completada: tarea.completada || false,
                requiereFoto: tarea.requiereFoto || false
              }
            });
          }
        }
      }
    }

    return NextResponse.json(cartaActualizada);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error guardando carta' }, { status: 500 });
  }
}