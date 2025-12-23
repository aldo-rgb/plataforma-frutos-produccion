import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/lideres/[id]
 * Obtiene información completa de un líder/participante
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    // Obtener información del usuario
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        puntosCuanticos: true,
        profileImage: true,
        imagen: true,
        createdAt: true,
        assignedMentorId: true
      }
    });

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Verificar que el usuario que consulta tenga permisos
    // (mentor puede ver a sus estudiantes, coordinador puede ver a todos)
    const canView = 
      session.user.rol === 'COORDINADOR' ||
      session.user.rol === 'ADMIN' ||
      (session.user.rol === 'MENTOR' && usuario.assignedMentorId === session.user.id) ||
      session.user.id === userId; // El usuario puede ver su propio perfil

    if (!canView) {
      return NextResponse.json({ error: 'No tienes permiso para ver este perfil' }, { status: 403 });
    }

    // Obtener carta FRUTOS activa
    const carta = await prisma.cartaFrutos.findFirst({
      where: { 
        usuarioId: userId,
        estado: { in: ['APROBADA', 'EN_REVISION'] }
      },
      orderBy: { fechaCreacion: 'desc' }
    });

    // Construir metas desde la carta
    const metas = [];
    if (carta) {
      const categorias = [
        { key: 'finanzas', nombre: 'FINANZAS', meta: carta.finanzasMeta, avance: carta.finanzasAvance, declaracion: carta.finanzasDeclaracion },
        { key: 'relaciones', nombre: 'RELACIONES', meta: carta.relacionesMeta, avance: carta.relacionesAvance, declaracion: carta.relacionesDeclaracion },
        { key: 'talentos', nombre: 'TALENTOS', meta: carta.talentosMeta, avance: carta.talentosAvance, declaracion: carta.talentosDeclaracion },
        { key: 'pazMental', nombre: 'PAZ MENTAL', meta: carta.pazMentalMeta, avance: carta.pazMentalAvance, declaracion: carta.pazMentalDeclaracion },
        { key: 'ocio', nombre: 'OCIO', meta: carta.ocioMeta, avance: carta.ocioAvance, declaracion: carta.ocioDeclaracion },
        { key: 'salud', nombre: 'SALUD', meta: carta.saludMeta, avance: carta.saludAvance, declaracion: carta.saludDeclaracion },
        { key: 'servicioTrans', nombre: 'SERVICIO TRANSFORMACIONAL', meta: carta.servicioTransMeta, avance: carta.servicioTransAvance, declaracion: carta.servicioTransDeclaracion },
        { key: 'servicioComun', nombre: 'SERVICIO COMUNITARIO', meta: carta.servicioComunMeta, avance: carta.servicioComunAvance, declaracion: carta.servicioComunDeclaracion },
      ];

      categorias.forEach(cat => {
        if (cat.meta) {
          const progreso = cat.meta > 0 ? Math.round((cat.avance / cat.meta) * 100) : 0;
          metas.push({
            categoria: cat.nombre,
            progreso: Math.min(progreso, 100),
            objetivo: cat.declaracion || `Meta: ${cat.meta}`,
            avance: cat.avance,
            meta: cat.meta
          });
        }
      });
    }

    // Obtener historial de evidencias
    const evidencias = await prisma.evidenciaAccion.findMany({
      where: { usuarioId: userId },
      include: {
        Accion: {
          select: {
            texto: true,
            Meta: {
              select: {
                categoria: true
              }
            }
          }
        }
      },
      orderBy: { fechaSubida: 'desc' },
      take: 20
    });

    const historialEvidencias = evidencias.map(ev => {
      const fechaDiff = Math.floor((Date.now() - new Date(ev.fechaSubida).getTime()) / (1000 * 60 * 60 * 24));
      let fechaTexto = '';
      if (fechaDiff === 0) {
        const horasDiff = Math.floor((Date.now() - new Date(ev.fechaSubida).getTime()) / (1000 * 60 * 60));
        fechaTexto = horasDiff === 0 ? 'hace unos minutos' : `hace ${horasDiff} ${horasDiff === 1 ? 'hora' : 'horas'}`;
      } else {
        fechaTexto = `hace ${fechaDiff} ${fechaDiff === 1 ? 'día' : 'días'}`;
      }

      return {
        id: ev.id,
        meta: ev.Accion?.texto || 'Acción desconocida',
        categoria: ev.Accion?.Meta?.categoria || 'General',
        estado: ev.estado,
        mentor: 'Pendiente',
        puntos: ev.estado === 'APROBADA' ? 500 : 0,
        fecha: fechaTexto,
        fechaCompleta: ev.fechaSubida,
        feedback: ev.comentarioMentor || null,
        imagenUrl: ev.fotoUrl
      };
    });

    // Calcular ranking (posición en tabla de líderes)
    const ranking = await prisma.usuario.count({
      where: {
        puntosCuanticos: { gt: usuario.puntosCuanticos },
        rol: 'PARTICIPANTE',
        isActive: true
      }
    });

    return NextResponse.json({
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      puntosCuanticos: usuario.puntosCuanticos || 0,
      ranking: ranking + 1,
      profileImage: usuario.profileImage || usuario.imagen,
      estadoCarta: carta?.estado || 'SIN_CARTA',
      metas,
      historialEvidencias,
      miembroDesde: usuario.createdAt
    });

  } catch (error) {
    console.error('❌ Error al obtener perfil de líder:', error);
    return NextResponse.json({ 
      error: 'Error al cargar perfil',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
