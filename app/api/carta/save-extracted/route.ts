import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * POST /api/carta/save-extracted
 * Guarda los datos extraídos por Quantum Coach directamente en la base de datos
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { cartaData, areasDisponibles } = await req.json();

    logger.debug('📥 Guardando carta extraída:', {
      areas: Object.keys(cartaData || {}),
      areasDisponibles
    });

    if (!cartaData || typeof cartaData !== 'object') {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }

    // Buscar usuario
    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Buscar o crear CartaFrutos
    let carta = await prisma.cartaFrutos.findFirst({
      where: { usuarioId: usuario.id },
      include: { 
        Meta: {
          include: {
            Accion: true
          }
        }
      }
    });

    if (!carta) {
      // Crear nueva carta
      carta = await prisma.cartaFrutos.create({
        data: {
          usuarioId: usuario.id,
          estado: 'BORRADOR',
          fechaActualizacion: new Date()
        },
        include: {
          Meta: {
            include: {
              Accion: true
            }
          }
        }
      });
      logger.debug('✅ Carta creada ID:', carta.id);
    } else {
      logger.debug('📋 Carta existente ID:', carta.id);
    }

    // Mapeo de áreas a categorías de BD
    const areaMapping: Record<string, string> = {
      finanzas: 'FINANZAS',
      relaciones: 'RELACIONES',
      talentos: 'TALENTOS',
      salud: 'SALUD',
      pazMental: 'PAZ_MENTAL',
      ocio: 'OCIO',
      servicioTrans: 'SERVICIO_TRANS',
      servicioComun: 'SERVICIO_COMUN'
    };

    let metasCreadas = 0;
    let accionesCreadas = 0;

    // Procesar cada área
    for (const [areaKey, areaData] of Object.entries(cartaData)) {
      const categoria = areaMapping[areaKey];
      if (!categoria) {
        logger.warn(`⚠️ Área no reconocida: ${areaKey}`);
        continue;
      }

      const data = areaData as any;
      
      // Buscar meta existente para esta área
      const metaExistente = carta.Meta.find(m => m.categoria === categoria);

      let meta;
      if (metaExistente) {
        // Actualizar meta existente
        meta = await prisma.meta.update({
          where: { id: metaExistente.id },
          data: {
            metaPrincipal: data.objetivo || data.declaracion || 'Meta sin definir',
            declaracionPoder: data.declaracion || null,
            updatedAt: new Date()
          }
        });
        logger.debug(`✅ Meta actualizada: ${categoria}`);
      } else {
        // Crear nueva meta
        meta = await prisma.meta.create({
          data: {
            cartaId: carta.id,
            categoria,
            orden: 1,
            metaPrincipal: data.objetivo || data.declaracion || 'Meta sin definir',
            declaracionPoder: data.declaracion || null,
            status: 'PENDING',
            avance: 0,
            updatedAt: new Date()
          }
        });
        metasCreadas++;
        logger.debug(`✅ Meta creada: ${categoria} (ID: ${meta.id})`);
      }

      // Procesar acciones
      if (Array.isArray(data.acciones) && data.acciones.length > 0) {
        // Eliminar acciones antiguas de esta meta
        await prisma.accion.deleteMany({
          where: { metaId: meta.id }
        });

        // Crear nuevas acciones
        for (const accion of data.acciones) {
          let frecuencia = 'Diaria';
          let diasPersonalizados: string[] = [];

          // Determinar frecuencia basada en el formato de accion.nombre o accion.frecuencia
          if (typeof accion === 'string') {
            // Si viene como string, parsearlo
            const accionTexto = accion.toLowerCase();
            if (accionTexto.includes('lun-vie') || accionTexto.includes('lunes a viernes')) {
              frecuencia = 'Lun-Vie';
            } else if (accionTexto.includes('diario') || accionTexto.includes('todos los días')) {
              frecuencia = 'Diaria';
            } else {
              // Buscar días específicos
              const diasSemana = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
              const diasEncontrados = diasSemana.filter(dia => accionTexto.includes(dia));
              
              if (diasEncontrados.length > 0) {
                frecuencia = 'Personalizada';
                diasPersonalizados = diasEncontrados.map(dia => 
                  dia.charAt(0).toUpperCase() + dia.slice(1)
                );
              }
            }
          } else if (typeof accion === 'object') {
            frecuencia = accion.frecuencia || 'Diaria';
            if (accion.dias && Array.isArray(accion.dias)) {
              diasPersonalizados = accion.dias;
            }
          }

          const textoAccion = typeof accion === 'string' ? accion : (accion.nombre || accion.texto || 'Acción sin nombre');
          
          const nuevaAccion = await prisma.accion.create({
            data: {
              metaId: meta.id,
              texto: textoAccion,
              diasProgramados: diasPersonalizados.length > 0 ? diasPersonalizados.join(',') : null,
              completada: false,
              frequency: frecuencia,
              updatedAt: new Date()
            }
          });
          accionesCreadas++;
          logger.debug(`  ✅ Acción creada: ${textoAccion.substring(0, 40)}...`);
        }
      }
    }

    // Actualizar estado de la carta
    await prisma.cartaFrutos.update({
      where: { id: carta.id },
      data: {
        estado: 'BORRADOR',
        fechaActualizacion: new Date()
      }
    });

    logger.debug(`🎉 Guardado completo: ${metasCreadas} metas nuevas, ${accionesCreadas} acciones creadas`);

    return NextResponse.json({
      success: true,
      cartaId: carta.id,
      metasCreadas,
      accionesCreadas,
      message: 'Carta guardada exitosamente'
    });

  } catch (error: any) {
    logger.error('❌ Error guardando carta extraída:', error);
    return NextResponse.json(
      { error: 'Error al guardar la carta', details: error.message },
      { status: 500 }
    );
  }
}
