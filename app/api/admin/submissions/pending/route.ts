import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/submissions/pending
 * Obtiene submissions pendientes de tareas extraordinarias y eventos
 * Para ADMIN, COORDINADOR, DIRECTOR
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { 
        id: true, 
        rol: true, 
        organizationId: true 
      }
    });

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Verificar que sea ADMIN, COORDINADOR o DIRECTOR
    const rolesPermitidos = ['ADMIN', 'ADMINISTRADOR', 'COORDINADOR', 'DIRECTOR', 'SCHOOL_ADMIN'];
    if (!rolesPermitidos.includes(usuario.rol)) {
      return NextResponse.json({ 
        error: 'Acceso denegado',
        mensaje: 'Solo Admin, Coordinador y Director pueden revisar estas evidencias'
      }, { status: 403 });
    }

    console.log(`🔍 ${usuario.rol} ${usuario.id} solicitando submissions pendientes`);

    // Construir filtros según el rol
    let whereUsuarios: any = {};

    if (usuario.rol === 'DIRECTOR' || usuario.rol === 'SCHOOL_ADMIN') {
      // Director/School Admin: solo usuarios de su organización
      if (!usuario.organizationId) {
        return NextResponse.json({ 
          error: 'Director sin organización asignada' 
        }, { status: 400 });
      }
      whereUsuarios.organizationId = usuario.organizationId;
    } else if (usuario.rol === 'COORDINADOR') {
      // Coordinador: solo usuarios de sus visiones asignadas
      const visiones = await prisma.vision.findMany({
        where: { coordinadorId: usuario.id },
        select: { id: true }
      });
      const visionIds = visiones.map(v => v.id);
      
      if (visionIds.length === 0) {
        // Si no tiene visiones asignadas, no ve ninguna evidencia
        return NextResponse.json({
          success: true,
          submissions: []
        });
      }
      
      whereUsuarios.OR = [
        {
          ParticipanteEnVisiones: {
            some: {
              visionId: { in: visionIds }
            }
          }
        },
        {
          GameChangerEnVisiones: {
            some: {
              visionId: { in: visionIds }
            }
          }
        }
      ];
    }
    // ADMIN: ve todos (no agrega filtro)

    // Obtener submissions pendientes de tareas extraordinarias y eventos
    const submissions = await prisma.taskSubmission.findMany({
      where: {
        status: { in: ['SUBMITTED', 'PENDING'] },
        AdminTask: {
          type: { in: ['EXTRAORDINARY', 'EVENT'] },
          isActive: true
        },
        Usuario: whereUsuarios
      },
      include: {
        Usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            vision: true
          }
        },
        AdminTask: {
          select: {
            id: true,
            type: true,
            titulo: true,
            descripcion: true,
            pointsReward: true,
            fechaLimite: true,
            horaEvento: true,
            requiereEvidencia: true,
            isMultiDay: true,
            diaNumero: true,
            duracionDias: true,
            parentTaskId: true
          }
        }
      },
      orderBy: {
        submittedAt: 'desc'
      }
    });

    console.log(`✅ ${submissions.length} submissions encontradas para ${usuario.rol}`);

    return NextResponse.json({
      success: true,
      submissions: submissions.map(s => ({
        id: s.id,
        status: s.status,
        evidenciaUrl: s.evidenciaUrl,
        comentario: s.comentario,
        submittedAt: s.submittedAt,
        usuario: {
          id: s.Usuario.id,
          nombre: s.Usuario.nombre,
          email: s.Usuario.email,
          vision: s.Usuario.Vision?.nombre || 'Sin visión'
        },
        tarea: {
          id: s.AdminTask.id,
          type: s.AdminTask.type,
          titulo: s.AdminTask.titulo,
          descripcion: s.AdminTask.descripcion,
          pointsReward: s.AdminTask.pointsReward,
          fechaLimite: s.AdminTask.fechaLimite,
          horaEvento: s.AdminTask.horaEvento,
          requiereEvidencia: s.AdminTask.requiereEvidencia,
          isMultiDay: s.AdminTask.isMultiDay,
          diaNumero: s.AdminTask.diaNumero,
          duracionDias: s.AdminTask.duracionDias
        }
      }))
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo submissions pendientes:', error);
    return NextResponse.json(
      { error: 'Error al obtener submissions', details: error.message },
      { status: 500 }
    );
  }
}
