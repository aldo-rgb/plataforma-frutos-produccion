import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: Obtener evidencias pendientes SOLO de usuarios asignados al mentor
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const mentor = await prisma.usuario.findUnique({
      where: { email: session.user.email },
    });

    if (!mentor) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Verificar permisos
    if (mentor.rol !== 'MENTOR' && mentor.rol !== 'COORDINADOR' && mentor.rol !== 'GAMECHANGER') {
      return NextResponse.json({ error: 'No tienes permisos de mentor' }, { status: 403 });
    }

    // FILTRO DE SEGURIDAD CRÍTICO: Solo evidencias de usuarios asignados a este mentor
    // Si es COORDINADOR o GAMECHANGER, puede ver todas las evidencias pendientes
    const esSupervisor = mentor.rol === 'COORDINADOR' || mentor.rol === 'GAMECHANGER';

    const whereClause = {
      estado: 'PENDIENTE' as const,
      ...(esSupervisor ? {} : {
        Usuario: {
          mentorId: mentor.id // FILTRO: Solo usuarios donde mentor_id = ID del mentor actual
        }
      })
    };

    // Obtener evidencias pendientes de CARTA con filtro de seguridad
    const evidenciasCarta = await prisma.evidenciaAccion.findMany({
      where: whereClause,
      include: {
        Usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            mentorId: true
          }
        },
        Accion: {
          select: {
            texto: true
          }
        },
        Meta: {
          select: {
            metaPrincipal: true,
            categoria: true
          }
        }
      },
      orderBy: {
        fechaSubida: 'desc'
      }
    });

    // Obtener evidencias pendientes de TAREAS EXTRAORDINARIAS
    const whereClauseExtraordinarias = {
      status: 'SUBMITTED' as const,
      evidenciaUrl: {
        not: null
      },
      ...(esSupervisor ? {} : {
        Usuario: {
          mentorId: mentor.id
        }
      })
    };

    const evidenciasExtraordinarias = await prisma.taskSubmission.findMany({
      where: whereClauseExtraordinarias,
      include: {
        Usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            mentorId: true
          }
        },
        AdminTask: {
          select: {
            titulo: true,
            descripcion: true,
            type: true
          }
        }
      },
      orderBy: {
        submittedAt: 'desc'
      }
    });

    // Calcular tiempo relativo
    const getTiempoRelativo = (fecha: Date) => {
      const ahora = new Date();
      const diff = ahora.getTime() - fecha.getTime();
      const minutos = Math.floor(diff / 60000);
      const horas = Math.floor(minutos / 60);
      const dias = Math.floor(horas / 24);

      if (minutos < 1) return 'Hace un momento';
      if (minutos < 60) return `Hace ${minutos} min`;
      if (horas < 24) return `Hace ${horas}h`;
      if (dias === 1) return 'Hace 1 día';
      return `Hace ${dias} días`;
    };

    // Formatear evidencias de CARTA
    const evidenciasCartaFormateadas = evidenciasCarta.map((ev: any) => ({
      id: ev.id,
      tipo: 'CARTA',
      usuarioId: ev.usuarioId,
      usuarioNombre: ev.Usuario.nombre,
      usuarioEmail: ev.Usuario.email,
      metaTitulo: ev.Meta?.metaPrincipal || 'Sin meta',
      categoria: ev.Meta?.categoria || 'SIN_CATEGORIA',
      accionTexto: ev.Accion.texto,
      fotoUrl: ev.fotoUrl,
      descripcion: ev.descripcion,
      fechaSubida: ev.fechaSubida,
      tiempoRelativo: getTiempoRelativo(new Date(ev.fechaSubida))
    }));

    // Formatear evidencias de EXTRAORDINARIAS
    const evidenciasExtraordinariasFormateadas = evidenciasExtraordinarias.map((ev: any) => ({
      id: `extra-${ev.id}`,
      submissionId: ev.id,
      tipo: 'EXTRAORDINARIA',
      usuarioId: ev.usuarioId,
      usuarioNombre: ev.Usuario.nombre,
      usuarioEmail: ev.Usuario.email,
      metaTitulo: ev.AdminTask.titulo,
      categoria: ev.AdminTask.type === 'EVENT' ? 'EVENTO' : 'MISION_ESPECIAL',
      accionTexto: ev.AdminTask.descripcion || ev.AdminTask.titulo,
      fotoUrl: ev.evidenciaUrl,
      descripcion: ev.comentario,
      fechaSubida: ev.submittedAt,
      tiempoRelativo: getTiempoRelativo(new Date(ev.submittedAt))
    }));

    // Combinar y ordenar por fecha
    const todasLasEvidencias = [
      ...evidenciasCartaFormateadas,
      ...evidenciasExtraordinariasFormateadas
    ].sort((a, b) => new Date(b.fechaSubida).getTime() - new Date(a.fechaSubida).getTime());

    console.log(`📋 Mentor ${mentor.nombre} consultó ${todasLasEvidencias.length} evidencias pendientes (${evidenciasCartaFormateadas.length} carta + ${evidenciasExtraordinariasFormateadas.length} extraordinarias)`);

    return NextResponse.json({ 
      evidencias: todasLasEvidencias,
      total: todasLasEvidencias.length,
      breakdown: {
        carta: evidenciasCartaFormateadas.length,
        extraordinarias: evidenciasExtraordinariasFormateadas.length
      }
    }, { status: 200 });

  } catch (error) {
    console.error('❌ Error al obtener evidencias para validación:', error);
    return NextResponse.json({ error: 'Error al cargar evidencias' }, { status: 500 });
  }
}
