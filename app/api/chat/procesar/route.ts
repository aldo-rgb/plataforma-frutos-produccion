import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';
import { extraerJSONDeRespuestaIA } from '../../../../utils/extraer-json';

/**
 * POST /api/chat/procesar
 * 
 * Procesa la respuesta completa de la IA después del streaming
 * y guarda la carta de frutos si detecta el JSON.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 2. Obtener el usuario de la BD
    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // 3. Obtener la respuesta completa del body
    const { respuestaCompleta } = await req.json();

    if (!respuestaCompleta || typeof respuestaCompleta !== 'string') {
      return NextResponse.json({ error: 'Respuesta inválida' }, { status: 400 });
    }

    console.log('📥 Procesando respuesta de IA...');
    console.log('📝 Longitud de respuesta:', respuestaCompleta.length, 'caracteres');
    console.log('📄 Primeros 300 caracteres:', respuestaCompleta.substring(0, 300));
    console.log('🔍 ¿Contiene ```json?', respuestaCompleta.includes('```json'));
    console.log('🔍 ¿Contiene carta_de_frutos?', respuestaCompleta.includes('carta_de_frutos'));

    // 4. Guardar el mensaje de la IA en el historial
    await prisma.mensajeChat.create({
      data: {
        role: 'assistant',
        contenido: respuestaCompleta,
        usuarioId: usuario.id
      }
    });

    console.log('✅ Mensaje guardado en historial');

    // 5. Extraer y procesar JSON de carta de frutos
    const resultado = extraerJSONDeRespuestaIA(respuestaCompleta);

    if (resultado.status === 'exito' && resultado.data?.carta_de_frutos) {
      console.log('✅ JSON de Carta detectado, procesando...');
      console.log('📊 Datos recibidos:', JSON.stringify(resultado.data, null, 2));

      const cartaData = resultado.data.carta_de_frutos;
      const metas = cartaData.metas || [];

      console.log(`📝 Procesando ${metas.length} metas...`);

      // Mapear las metas al formato de la BD
      const metasFormateadas: any = {};
      const accionesSemanales: any = {};

      metas.forEach((meta: any) => {
        const area = meta.area.toUpperCase().replace(/ /g, '_');

        // Priorizar meta_principal, luego meta_cuantificable, luego declaracion_poder
        const metaTexto = meta.meta_principal ||
          meta.meta_cuantificable ||
          meta.declaracion_poder ||
          "";

        // Extraer acciones de tareas_acciones o acciones_concretas
        const acciones = meta.tareas_acciones || meta.acciones_concretas || [];

        console.log(`  📌 ${area}: "${metaTexto}" (${acciones.length} acciones)`);

        // Mapeo de áreas a campos de BD
        const campoMapping: { [key: string]: string } = {
          'FINANZAS': 'finanzas',
          'RELACIONES': 'relaciones',
          'TALENTOS': 'talentos',
          'PAZ_MENTAL': 'pazMental',
          'DIVERSIÓN': 'ocio',
          'SALUD': 'salud',
          'COMUNIDAD': 'servicioComun' // CORREGIDO: "COMUNIDAD" -> "servicioComun" (sin "idad")
        };

        const campoBD = campoMapping[area];
        if (campoBD) {
          metasFormateadas[`${campoBD}Meta`] = metaTexto;
          accionesSemanales[area] = acciones; // Guardamos las acciones para crear tareas después
        } else {
          console.warn(`⚠️ Área desconocida: ${area}`);
        }
      });

      // 6. Crear o actualizar CartaFrutos
      const cartaExistente = await prisma.cartaFrutos.findFirst({
        where: { usuarioId: usuario.id },
        include: { Tarea: true }
      });

      let cartaFrutos;

      if (cartaExistente) {
        console.log('🔄 Actualizando carta existente...');
        // Eliminar tareas antiguas
        await prisma.tarea.deleteMany({
          where: { cartaId: cartaExistente.id }
        });

        // Actualizar carta
        cartaFrutos = await prisma.cartaFrutos.update({
          where: { id: cartaExistente.id },
          data: {
            ...metasFormateadas,
            fechaActualizacion: new Date()
          }
        });
      } else {
        console.log('🆕 Creando nueva carta...');
        cartaFrutos = await prisma.cartaFrutos.create({
          data: {
            usuarioId: usuario.id,
            ...metasFormateadas,
            estado: 'activo'
          }
        });
      }

      // 7. Crear tareas para cada área
      console.log('📋 Creando tareas...');
      let tareasCreadas = 0;

      for (const [area, acciones] of Object.entries(accionesSemanales)) {
        for (const accion of acciones as string[]) {
          // Determinar la categoría según el área
          const categoriaMapping: { [key: string]: string } = {
            'FINANZAS': 'finanzas',
            'RELACIONES': 'relaciones',
            'TALENTOS': 'talentos',
            'PAZ_MENTAL': 'pazMental',
            'DIVERSIÓN': 'ocio',
            'SALUD': 'salud',
            'COMUNIDAD': 'servicioComun' // CORREGIDO
          };

          const categoria = categoriaMapping[area] || 'otras';

          await prisma.tarea.create({
            data: {
              descripcion: accion,
              categoria: categoria,
              completada: false,
              requiereFoto: true,
              cartaId: cartaFrutos.id
            }
          });
          tareasCreadas++;
        }
      }

      console.log(`✅ Carta guardada exitosamente con ${tareasCreadas} tareas`);

      return NextResponse.json({
        success: true,
        mensaje: 'Carta de Frutos guardada exitosamente',
        cartaId: cartaFrutos.id,
        tareasCreadas
      });
    } else {
      console.log('ℹ️ No se detectó JSON de carta_de_frutos en la respuesta');
      return NextResponse.json({
        success: true,
        mensaje: 'Mensaje guardado (sin carta de frutos)'
      });
    }
  } catch (error) {
    console.error('❌ Error al procesar respuesta:', error);
    return NextResponse.json(
      { error: 'Error al procesar la respuesta', detalles: (error as Error).message },
      { status: 500 }
    );
  }
}
