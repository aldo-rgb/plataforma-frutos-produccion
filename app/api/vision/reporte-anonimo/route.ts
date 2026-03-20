import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * 🛡️ API: Buzón Anónimo para Reportes de Participantes de Visión
 * 
 * Permite a los participantes de visión reportar problemas con el staff
 * (Trainers, Coordinadores, Game Changers, Mentores) de forma anónima
 * Los mensajes se envían al SCHOOL_ADMIN de su organización y al ADMIN global
 */

// POST - Crear un nuevo reporte anónimo
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      organizationId, 
      reportedUserId, // Opcional - puede ser reporte general
      tipoReportado = 'GENERAL', // TRAINER, COORDINADOR, GAME_CHANGER, MENTOR, GENERAL
      mensaje, 
      categoria = 'QUEJA' // QUEJA, SUGERENCIA, ACOSO, DISCRIMINACION, OTRO
    } = body;

    // Validación de campos
    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organización no especificada' },
        { status: 400 }
      );
    }

    if (!mensaje || mensaje.trim().length < 20) {
      return NextResponse.json(
        { error: 'Por favor describe el problema con al menos 20 caracteres' },
        { status: 400 }
      );
    }

    // Verificar que el usuario pertenece a la organización
    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { 
        id: true,
        nombre: true,
        email: true,
        organizationId: true 
      }
    });

    if (!usuario || usuario.organizationId !== organizationId) {
      return NextResponse.json(
        { error: 'No perteneces a esta organización' },
        { status: 403 }
      );
    }

    // Verificar que la organización existe
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { 
        id: true, 
        name: true,
        schoolAdminId: true,
        Usuario_Organization_schoolAdminIdToUsuario: {
          select: {
            nombre: true,
            email: true
          }
        }
      }
    });

    if (!organization) {
      return NextResponse.json(
        { error: 'Organización no encontrada' },
        { status: 404 }
      );
    }

    // Si se especificó un usuario reportado, verificar que existe
    let reportedUser = null;
    if (reportedUserId) {
      reportedUser = await prisma.usuario.findUnique({
        where: { id: reportedUserId },
        select: {
          id: true,
          nombre: true,
          email: true,
          rol: true
        }
      });

      if (!reportedUser) {
        return NextResponse.json(
          { error: 'Usuario reportado no encontrado' },
          { status: 404 }
        );
      }
    }

    // Crear el reporte en la base de datos
    const reporte = await prisma.reporteAnonimoVision.create({
      data: {
        reporterId: session.user.id,
        organizationId: organizationId,
        reportedUserId: reportedUserId || null,
        tipoReportado,
        mensaje: mensaje.trim(),
        categoria,
        estado: 'PENDIENTE',
        updatedAt: new Date()
      }
    });

    // Log para respaldo
    logger.debug(`
      ⚠️ =============================================
      🛡️ REPORTE ANÓNIMO DE VISIÓN RECIBIDO
      ⚠️ =============================================
      
      📅 Fecha: ${new Date().toISOString()}
      🏫 Organización: ${organization.name}
      👤 Reportante: ${usuario.nombre} (${usuario.email})
      ${reportedUser ? `🎯 Reportado: ${reportedUser.nombre} (${reportedUser.rol})` : '🎯 Reporte General'}
      🏷️ Tipo: ${tipoReportado}
      📁 Categoría: ${categoria}
      
      💬 Mensaje:
      ${mensaje.trim()}
      
      📬 Notificar a:
      - School Admin: ${organization.Usuario_Organization_schoolAdminIdToUsuario.nombre}
      - Administrador Global
      
      ⚠️ =============================================
    `);

    return NextResponse.json({
      success: true,
      message: 'Tu reporte ha sido enviado de forma confidencial'
    });

  } catch (error) {
    logger.error('❌ Error al procesar reporte anónimo de visión:', error);
    return NextResponse.json(
      { error: 'Error al enviar el reporte' },
      { status: 500 }
    );
  }
}

// GET - Obtener reportes (SCHOOL_ADMIN ve los de su org, ADMIN ve todos)
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar rol del usuario
    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { 
        id: true,
        rol: true,
        organizationId: true
      }
    });

    if (!usuario) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Verificar permisos
    const isAdmin = ['ADMIN', 'ADMINISTRADOR'].includes(usuario.rol);
    const isSchoolAdmin = usuario.rol === 'SCHOOL_ADMIN';

    if (!isAdmin && !isSchoolAdmin) {
      return NextResponse.json(
        { error: 'No tienes permisos para ver reportes' },
        { status: 403 }
      );
    }

    // Si es SCHOOL_ADMIN, obtener su organización
    let organizationId: number | undefined;
    if (isSchoolAdmin) {
      // Primero buscar si es schoolAdmin de alguna org
      let org = await prisma.organization.findFirst({
        where: { schoolAdminId: session.user.id },
        select: { id: true }
      });
      
      // Si no es schoolAdmin directo, usar su organizationId
      if (!org && usuario.organizationId) {
        org = { id: usuario.organizationId };
      }
      
      if (!org) {
        return NextResponse.json(
          { error: 'No se encontró tu organización' },
          { status: 404 }
        );
      }
      organizationId = org.id;
    }

    // Construir filtro
    const where = organizationId ? { organizationId } : {};

    // Obtener reportes
    const reportes = await prisma.reporteAnonimoVision.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        Usuario_ReporteAnonimoVision_reporterIdToUsuario: {
          select: {
            nombre: true,
            email: true
          }
        },
        Usuario_ReporteAnonimoVision_reportedUserIdToUsuario: {
          select: {
            nombre: true,
            email: true,
            rol: true
          }
        },
        Organization: {
          select: {
            name: true
          }
        },
        Usuario_ReporteAnonimoVision_revisadoPorToUsuario: {
          select: {
            nombre: true
          }
        }
      }
    });

    // Formatear los datos para el frontend
    const reportesFormateados = reportes.map(reporte => ({
      id: reporte.id,
      organizationName: reporte.Organization.name,
      reporterNombre: reporte.Usuario_ReporteAnonimoVision_reporterIdToUsuario.nombre,
      reporterEmail: reporte.Usuario_ReporteAnonimoVision_reporterIdToUsuario.email,
      reportedUserNombre: reporte.Usuario_ReporteAnonimoVision_reportedUserIdToUsuario?.nombre || null,
      reportedUserEmail: reporte.Usuario_ReporteAnonimoVision_reportedUserIdToUsuario?.email || null,
      reportedUserRol: reporte.Usuario_ReporteAnonimoVision_reportedUserIdToUsuario?.rol || null,
      tipoReportado: reporte.tipoReportado,
      mensaje: reporte.mensaje,
      categoria: reporte.categoria,
      estado: reporte.estado,
      notaInterna: reporte.notaInterna,
      revisadoPorNombre: reporte.Usuario_ReporteAnonimoVision_revisadoPorToUsuario?.nombre || null,
      revisadoAt: reporte.revisadoAt?.toISOString() || null,
      createdAt: reporte.createdAt.toISOString()
    }));

    return NextResponse.json(reportesFormateados);

  } catch (error) {
    logger.error('❌ Error al obtener reportes de visión:', error);
    return NextResponse.json(
      { error: 'Error al cargar reportes' },
      { status: 500 }
    );
  }
}

// PATCH - Actualizar estado de un reporte (solo SCHOOL_ADMIN o ADMIN)
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { reporteId, estado, notaInterna } = body;

    if (!reporteId || !estado) {
      return NextResponse.json(
        { error: 'ID del reporte y estado son requeridos' },
        { status: 400 }
      );
    }

    // Validar estado
    const estadosValidos = ['PENDIENTE', 'EN_REVISION', 'RESUELTO', 'RECHAZADO'];
    if (!estadosValidos.includes(estado)) {
      return NextResponse.json(
        { error: 'Estado no válido' },
        { status: 400 }
      );
    }

    // Verificar permisos
    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { rol: true }
    });

    if (!usuario || !['ADMIN', 'ADMINISTRADOR', 'SCHOOL_ADMIN'].includes(usuario.rol)) {
      return NextResponse.json(
        { error: 'No tienes permisos para actualizar reportes' },
        { status: 403 }
      );
    }

    // Verificar que el reporte existe
    const reporte = await prisma.reporteAnonimoVision.findUnique({
      where: { id: reporteId }
    });

    if (!reporte) {
      return NextResponse.json(
        { error: 'Reporte no encontrado' },
        { status: 404 }
      );
    }

    // Si es SCHOOL_ADMIN, verificar que el reporte pertenece a su organización
    if (usuario.rol === 'SCHOOL_ADMIN') {
      const org = await prisma.organization.findFirst({
        where: { schoolAdminId: session.user.id },
        select: { id: true }
      });

      if (!org || reporte.organizationId !== org.id) {
        return NextResponse.json(
          { error: 'No tienes permisos para este reporte' },
          { status: 403 }
        );
      }
    }

    // Actualizar el reporte
    const reporteActualizado = await prisma.reporteAnonimoVision.update({
      where: { id: reporteId },
      data: {
        estado,
        notaInterna: notaInterna || reporte.notaInterna,
        revisadoPor: session.user.id,
        revisadoAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Reporte actualizado correctamente',
      reporte: reporteActualizado
    });

  } catch (error) {
    logger.error('❌ Error al actualizar reporte:', error);
    return NextResponse.json(
      { error: 'Error al actualizar el reporte' },
      { status: 500 }
    );
  }
}
