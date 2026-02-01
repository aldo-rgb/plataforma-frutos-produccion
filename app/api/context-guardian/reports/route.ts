import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Tipos de quiebre predefinidos
const BREACH_TYPES = {
  TARDANZA: 'Llegó tarde a actividad',
  INASISTENCIA: 'No asistió sin avisar',
  DROGAS: 'Consumo de sustancias prohibidas',
  CONFLICTO: 'Conflicto con otro miembro',
  INCUMPLIMIENTO: 'Incumplimiento de acuerdos',
  FALTA_RESPETO: 'Falta de respeto',
  OTRO: 'Otro'
};

// GET: Obtener reportes del guardián o todos para el coordinador
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true }
    });

    if (!usuario) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const visionId = searchParams.get('visionId');
    const status = searchParams.get('status');

    // Verificar si es coordinador/staff o guardián del contexto
    const isStaff = ['ADMINISTRADOR', 'SUPER_ADMIN', 'GAMECHANGER', 'COORDINATOR', 'COORDINATOR_ADVANCED'].includes(usuario.rol);
    
    let isContextGuardian = false;
    if (visionId) {
      const guardianCaptaincy = await prisma.tribeCaptaincy.findUnique({
        where: {
          visionId_roleType: {
            visionId: parseInt(visionId),
            roleType: 'CONTEXT_GUARDIAN'
          }
        },
        include: {
          assignments: {
            where: {
              userId: usuario.id,
              status: 'ACCEPTED'
            }
          }
        }
      });
      isContextGuardian = !!(guardianCaptaincy && guardianCaptaincy.assignments.length > 0);
    }

    if (!isStaff && !isContextGuardian) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    // Construir query
    const where: any = {};
    
    if (visionId) {
      where.visionId = parseInt(visionId);
    }
    
    if (status) {
      where.status = status;
    }

    // Si es guardián, solo ve los que él reportó
    if (!isStaff && isContextGuardian) {
      where.reportedById = usuario.id;
    }

    const reports = await prisma.tribeBreachReport.findMany({
      where,
      include: {
        reportedBy: {
          select: {
            id: true,
            nombre: true,
            imagen: true
          }
        },
        reportedUser: {
          select: {
            id: true,
            nombre: true,
            imagen: true
          }
        },
        resolvedBy: {
          select: {
            id: true,
            nombre: true
          }
        },
        vision: {
          select: {
            id: true,
            nombre: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Obtener miembros de la tribu (usuarios inscritos en esta visión)
    let tribeMembers: any[] = [];
    if (visionId) {
      const enrollments = await prisma.vision_enrollments.findMany({
        where: {
          visionId: parseInt(visionId),
          enrollmentStatus: { in: ['CONFIRMED', 'ACTIVE', 'ENROLLED'] }
        },
        include: {
          Usuario_vision_enrollments_userIdToUsuario: {
            select: {
              id: true,
              nombre: true,
              profileImage: true
            }
          }
        }
      });
      
      tribeMembers = enrollments.map(e => ({
        id: e.Usuario_vision_enrollments_userIdToUsuario.id,
        nombre: e.Usuario_vision_enrollments_userIdToUsuario.nombre,
        image: e.Usuario_vision_enrollments_userIdToUsuario.profileImage
      }));
    }

    return NextResponse.json({
      success: true,
      reports: reports.map(r => ({
        ...r,
        reportedBy: {
          ...r.reportedBy,
          image: r.reportedBy.imagen
        },
        reportedUser: {
          ...r.reportedUser,
          image: r.reportedUser.imagen
        }
      })),
      tribeMembers,
      breachTypes: BREACH_TYPES,
      isStaff,
      isContextGuardian
    });

  } catch (error) {
    console.error("Error en GET /api/context-guardian/reports:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// POST: Crear nuevo reporte
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, nombre: true, rol: true }
    });

    if (!usuario) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const body = await request.json();
    const { visionId, reportedUserId, breachType, description, evidenceUrls, severity } = body;

    if (!visionId || !reportedUserId || !breachType || !description) {
      return NextResponse.json({ 
        error: "Faltan campos requeridos: visionId, reportedUserId, breachType, description" 
      }, { status: 400 });
    }

    // Verificar que es Guardián del Contexto o staff
    const isStaff = ['ADMINISTRADOR', 'SUPER_ADMIN', 'GAMECHANGER', 'COORDINATOR', 'COORDINATOR_ADVANCED'].includes(usuario.rol);
    
    const guardianCaptaincy = await prisma.tribeCaptaincy.findUnique({
      where: {
        visionId_roleType: {
          visionId: parseInt(visionId),
          roleType: 'CONTEXT_GUARDIAN'
        }
      },
      include: {
        assignments: {
          where: {
            userId: usuario.id,
            status: 'ACCEPTED'
          }
        }
      }
    });
    
    const isContextGuardian = guardianCaptaincy && guardianCaptaincy.assignments.length > 0;

    if (!isStaff && !isContextGuardian) {
      return NextResponse.json({ 
        error: "Solo el Guardián del Contexto puede crear reportes" 
      }, { status: 403 });
    }

    // Obtener info del usuario reportado
    const reportedUser = await prisma.usuario.findUnique({
      where: { id: parseInt(reportedUserId) },
      select: { nombre: true }
    });

    // Obtener info de la visión
    const vision = await prisma.vision.findUnique({
      where: { id: parseInt(visionId) },
      select: { nombre: true, coordinadorId: true }
    });

    if (!vision) {
      return NextResponse.json({ error: "Visión no encontrada" }, { status: 404 });
    }

    // Crear el reporte
    const report = await prisma.tribeBreachReport.create({
      data: {
        visionId: parseInt(visionId),
        reportedById: usuario.id,
        reportedUserId: parseInt(reportedUserId),
        breachType,
        description,
        evidenceUrls: evidenceUrls || [],
        severity: severity || 'MEDIUM',
        status: 'PENDING'
      },
      include: {
        reportedUser: {
          select: { nombre: true }
        }
      }
    });

    // Crear notificación para el coordinador
    if (vision.coordinadorId) {
      await prisma.notification.create({
        data: {
          userId: vision.coordinadorId,
          title: '⚠️ Nuevo Reporte del Guardián del Contexto',
          message: `${usuario.nombre} reportó a ${reportedUser?.nombre || 'un miembro'} por: ${BREACH_TYPES[breachType as keyof typeof BREACH_TYPES] || breachType}. Ver en: /dashboard/coordinator/breach-reports?visionId=${visionId}&reportId=${report.id}`,
          type: 'OTHER',
          relatedId: report.id,
          isRead: false
        }
      });
    }

    // También notificar a staff de la visión
    const visionStaff = await prisma.visionStaff.findMany({
      where: {
        visionId: parseInt(visionId)
      },
      select: { userId: true }
    });

    for (const staff of visionStaff) {
      if (staff.userId !== vision.coordinadorId) {
        await prisma.notification.create({
          data: {
            userId: staff.userId,
            title: '⚠️ Nuevo Reporte del Guardián del Contexto',
            message: `${usuario.nombre} reportó a ${reportedUser?.nombre || 'un miembro'} por: ${BREACH_TYPES[breachType as keyof typeof BREACH_TYPES] || breachType}. Ver en: /dashboard/coordinator/breach-reports?visionId=${visionId}&reportId=${report.id}`,
            type: 'OTHER',
            relatedId: report.id,
            isRead: false
          }
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Reporte creado exitosamente",
      report
    });

  } catch (error) {
    console.error("Error en POST /api/context-guardian/reports:", error);
    return NextResponse.json(
      { error: "Error interno del servidor", details: String(error) },
      { status: 500 }
    );
  }
}

// PATCH: Actualizar estado del reporte (solo coordinador/staff)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true }
    });

    if (!usuario) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Solo staff/coordinador puede actualizar
    const isStaff = ['ADMINISTRADOR', 'SUPER_ADMIN', 'GAMECHANGER', 'COORDINATOR', 'COORDINATOR_ADVANCED'].includes(usuario.rol);
    
    if (!isStaff) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const { reportId, status, resolution } = body;

    if (!reportId || !status) {
      return NextResponse.json({ 
        error: "reportId y status son requeridos" 
      }, { status: 400 });
    }

    const validStatuses = ['PENDING', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    }

    const updateData: any = {
      status
    };

    if (status === 'RESOLVED' || status === 'DISMISSED') {
      updateData.resolvedById = usuario.id;
      updateData.resolvedAt = new Date();
      if (resolution) {
        updateData.resolution = resolution;
      }
    }

    const report = await prisma.tribeBreachReport.update({
      where: { id: parseInt(reportId) },
      data: updateData,
      include: {
        reportedBy: { select: { id: true, nombre: true } },
        reportedUser: { select: { nombre: true } }
      }
    });

    // Notificar al guardián que creó el reporte
    await prisma.notification.create({
      data: {
        userId: report.reportedBy.id,
        title: status === 'RESOLVED' ? '✅ Reporte Resuelto' : status === 'DISMISSED' ? '❌ Reporte Descartado' : '📋 Reporte en Revisión',
        message: `Tu reporte sobre ${report.reportedUser.nombre} ha sido ${status === 'RESOLVED' ? 'resuelto' : status === 'DISMISSED' ? 'descartado' : 'puesto en revisión'}${resolution ? `: ${resolution}` : ''}`,
        type: 'OTHER',
        relatedId: report.id,
        isRead: false
      }
    });

    return NextResponse.json({
      success: true,
      message: "Reporte actualizado",
      report
    });

  } catch (error) {
    console.error("Error en PATCH /api/context-guardian/reports:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
