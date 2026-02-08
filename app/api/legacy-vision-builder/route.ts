// API Route: Legacy Vision Builder - Capitanías PL
// Sistema de gestión de roles de tribu para participantes de Liderato

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TribeCaptaincyRole, CaptainAssignmentStatus } from "@prisma/client";
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Las 16 Promesas del Juramento
export const TRIBE_PROMISES = [
  { id: 1, title: "Salud", description: "Me comprometo a cuidar mi cuerpo como el templo que es." },
  { id: 2, title: "No Drogas", description: "Me comprometo a mantener mi mente y cuerpo libres de sustancias dañinas." },
  { id: 3, title: "Futuro Imposible", description: "Me comprometo a crear un futuro que antes parecía imposible." },
  { id: 4, title: "Excelencia", description: "Me comprometo a dar lo mejor de mí en todo lo que hago." },
  { id: 5, title: "Integridad", description: "Me comprometo a ser mi palabra, sin excusas." },
  { id: 6, title: "Responsabilidad", description: "Me comprometo a ser responsable de mi vida y mis resultados." },
  { id: 7, title: "Comunicación", description: "Me comprometo a comunicarme con claridad y autenticidad." },
  { id: 8, title: "Puntualidad", description: "Me comprometo a respetar el tiempo de los demás siendo puntual." },
  { id: 9, title: "Contribución", description: "Me comprometo a contribuir al bienestar de mi tribu y comunidad." },
  { id: 10, title: "Aprendizaje", description: "Me comprometo a ser un estudiante de la vida." },
  { id: 11, title: "Gratitud", description: "Me comprometo a vivir desde la gratitud." },
  { id: 12, title: "Amor", description: "Me comprometo a actuar desde el amor, no desde el miedo." },
  { id: 13, title: "Servicio", description: "Me comprometo a servir a otros desinteresadamente." },
  { id: 14, title: "Familia", description: "Me comprometo a honrar y fortalecer mis lazos familiares." },
  { id: 15, title: "Liderazgo", description: "Me comprometo a liderar con el ejemplo." },
  { id: 16, title: "Legado", description: "Me comprometo a dejar un legado que trascienda." },
];

// Definición de Capitanías con sus descripciones y permisos
export const CAPTAINCY_DEFINITIONS: Record<TribeCaptaincyRole, {
  name: string;
  description: string;
  mission: string;
  widgetType: string;
  widgetName: string;
  icon: string;
  maxCaptains: number;
  permissions: string[];
}> = {
  TRIBE_CAPTAIN: {
    name: "Capitán de Tribu",
    description: "Líder principal de la tribu. Responsable de la unión y comunicación del equipo.",
    mission: "Unión y Comunicación",
    widgetType: "TOWER_CONTROL",
    widgetName: "La Torre de Control",
    icon: "👑",
    maxCaptains: 1,
    permissions: ["can_send_push_notifications", "can_view_tribe_dashboard", "can_view_attendance"],
  },
  TRIBE_CO_CAPTAIN: {
    name: "Co-Capitán de Tribu",
    description: "Apoyo del Capitán de Tribu. Asiste en la coordinación y comunicación.",
    mission: "Apoyo en Unión y Comunicación",
    widgetType: "TOWER_CONTROL",
    widgetName: "La Torre de Control",
    icon: "🎖️",
    maxCaptains: 1,
    permissions: ["can_send_push_notifications", "can_view_tribe_dashboard"],
  },
  TREASURER: {
    name: "Tesorero",
    description: "Encargado de colectar fondos, ganar-ganar, cero deudas.",
    mission: "Administración financiera de la tribu",
    widgetType: "VAULT",
    widgetName: "Bóveda de Tribu",
    icon: "💰",
    maxCaptains: 1,
    permissions: ["can_create_payment_links", "can_view_payment_status", "can_create_fundraising"],
  },
  SHIRTS_LOGO: {
    name: "Capitán de Playeras y Logo",
    description: "Encargado de la identidad visual de la tribu (playera negra y blanca).",
    mission: "Identidad Visual",
    widgetType: "IDENTITY_MANAGER",
    widgetName: "Gestor de Identidad",
    icon: "👕",
    maxCaptains: 1,
    permissions: ["can_manage_logo_voting", "can_collect_shirt_sizes"],
  },
  CONTRIBUTION_BASIC: {
    name: "Capitán de Contribución Básicos",
    description: "Presencia activa en graduaciones de Básicos.",
    mission: "Contribución en Entrenamientos Básicos",
    widgetType: "EVENT_LOGISTICS",
    widgetName: "Logística de Eventos",
    icon: "🎓",
    maxCaptains: 1,
    permissions: ["can_view_basic_calendar", "can_check_in_attendance"],
  },
  CONTRIBUTION_ADVANCED: {
    name: "Capitán de Contribución Avanzados",
    description: "Presencia activa en graduaciones y cunas de Avanzados.",
    mission: "Contribución en Entrenamientos Avanzados",
    widgetType: "EVENT_LOGISTICS",
    widgetName: "Logística de Eventos",
    icon: "🎓",
    maxCaptains: 1,
    permissions: ["can_view_advanced_calendar", "can_check_in_attendance"],
  },
  COMMUNITY_SERVICE: {
    name: "Capitán de Comunitaria Grupal",
    description: "Encargado de coordinar el día especial de servicio comunitario.",
    mission: "El día especial de servicio",
    widgetType: "PROJECT_MANAGER",
    widgetName: "Project Manager Comunitaria",
    icon: "🤝",
    maxCaptains: 1,
    permissions: ["can_manage_community_proposals", "can_assign_tribe_tasks"],
  },
  BOOKS_MOVIES: {
    name: "Capitán de Libros y Películas",
    description: "Asegurar lectura y resúmenes de libros/películas asignadas.",
    mission: "Aprendizaje continuo",
    widgetType: "LMS",
    widgetName: "Sistema de Aprendizaje",
    icon: "📚",
    maxCaptains: 1,
    permissions: ["can_view_homework_status", "can_send_homework_reminders"],
  },
  FOOD: {
    name: "Capitán de Comidas",
    description: "Nutrición congruente y saludable para la tribu.",
    mission: "Alimentación saludable",
    widgetType: "MENU_PLANNER",
    widgetName: "Menú Planner",
    icon: "🍽️",
    maxCaptains: 1,
    permissions: ["can_manage_food_allergies", "can_coordinate_meals"],
  },
  CLEANLINESS: {
    name: "Capitán de Vestimenta y Limpieza",
    description: "Códigos de vestimenta y espacios impecables.",
    mission: "Excelencia en imagen y orden",
    widgetType: "DAILY_AUDIT",
    widgetName: "Auditoría Diaria",
    icon: "✨",
    maxCaptains: 1,
    permissions: ["can_submit_audit_checklist", "can_report_issues"],
  },
  CONTEXT_GUARDIAN: {
    name: "Guardián del Contexto",
    description: "El rol más difícil. Reglas, calendarios, dispuesto a ser 'odiado' por integridad.",
    mission: "Integridad y cumplimiento de reglas",
    widgetType: "BOOK_OF_LAW",
    widgetName: "El Libro de la Ley",
    icon: "⚖️",
    maxCaptains: 1,
    permissions: ["can_view_rules", "can_report_breach"],
  },
  GRADUATION_CAPTAIN: {
    name: "Capitán de Graduación",
    description: "Encargado de crear la experiencia final de celebración en el 3er Fin de Semana.",
    mission: "Coordinación de la graduación",
    widgetType: "EVENT_PLANNER",
    widgetName: "Event Planner Graduación",
    icon: "🎉",
    maxCaptains: 1,
    permissions: ["can_manage_guest_list", "can_generate_qr_tickets"],
  },
};

// GET: Obtener estado del Legacy Vision Builder para el usuario
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const visionId = searchParams.get("visionId");

    // Obtener el usuario
    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { 
        id: true, 
        nombre: true, 
        rol: true,
        organizationId: true,
        currentVisionLevel: true,
      }
    });

    if (!usuario) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Verificar que es participante PL con asistencia marcada o Staff/Admin
    const isStaff = ['ADMINISTRADOR', 'SUPER_ADMIN', 'GAMECHANGER', 'COORDINATOR', 'COORDINATOR_ADVANCED'].includes(usuario.rol);
    
    // Buscar enrollment PL del usuario
    let targetVisionId: number | null = visionId ? parseInt(visionId) : null;
    
    // Primero buscar un enrollment PL con asistencia marcada (prioridad)
    let plEnrollment = await prisma.vision_enrollments.findFirst({
      where: {
        userId: usuario.id,
        level: 'PL',
        enrollmentStatus: { in: ['CONFIRMED', 'ACTIVE', 'ENROLLED'] },
        attendanceStatus: 'ATTENDED',
        ...(targetVisionId ? { visionId: targetVisionId } : {}),
      },
      include: {
        Vision: {
          select: {
            id: true,
            nombre: true,
            plWeekend1StartDate: true,
            plWeekend1EndDate: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Si no hay enrollment con asistencia, buscar cualquier enrollment PL
    if (!plEnrollment) {
      plEnrollment = await prisma.vision_enrollments.findFirst({
        where: {
          userId: usuario.id,
          level: 'PL',
          enrollmentStatus: { in: ['CONFIRMED', 'ACTIVE', 'ENROLLED'] },
          ...(targetVisionId ? { visionId: targetVisionId } : {}),
        },
        include: {
          Vision: {
            select: {
              id: true,
              nombre: true,
              plWeekend1StartDate: true,
              plWeekend1EndDate: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    // Si no tiene enrollment PL y no es staff, no tiene acceso
    if (!plEnrollment && !isStaff) {
      return NextResponse.json({
        hasAccess: false,
        hasAttendance: false,
        message: "Necesitas estar inscrito en PL para acceder al Legacy Vision Builder"
      });
    }

    // Verificar asistencia marcada para participantes (no staff)
    const hasAttendance = isStaff || (plEnrollment?.attendanceStatus === 'ATTENDED');
    
    // Si es participante pero no tiene asistencia marcada, denegar acceso
    if (!isStaff && !hasAttendance) {
      return NextResponse.json({
        hasAccess: false,
        hasAttendance: false,
        message: "Necesitas tener asistencia marcada en PL para acceder a esta sección"
      });
    }

    // Usar la visión del enrollment o buscar una visión activa si es staff
    if (!targetVisionId && plEnrollment) {
      targetVisionId = plEnrollment.visionId;
    }

    if (!targetVisionId) {
      // Staff sin visionId específico - buscar visiones activas
      const activeVision = await prisma.vision.findFirst({
        where: {
          isActive: true,
          organizationId: usuario.organizationId!,
          enabledLevels: { has: 'PL' },
        },
        orderBy: { plWeekend1StartDate: 'desc' }
      });
      
      if (activeVision) {
        targetVisionId = activeVision.id;
      }
    }

    if (!targetVisionId) {
      return NextResponse.json({
        hasAccess: false,
        message: "No hay visión PL activa"
      });
    }

    // Verificar si el usuario ha firmado el juramento
    const oath = await prisma.tribeOath.findUnique({
      where: {
        userId_visionId: {
          userId: usuario.id,
          visionId: targetVisionId
        }
      }
    });

    // Obtener datos de la visión incluyendo el logo
    const visionInfo = await prisma.vision.findUnique({
      where: { id: targetVisionId },
      select: {
        id: true,
        nombre: true,
        tribeLogoUrl: true,
        tribeShirtDesignUrl: true,
        tribeMission: true,
      }
    });

    // Obtener las capitanías de esta visión
    const captaincies = await prisma.tribeCaptaincy.findMany({
      where: { visionId: targetVisionId },
      include: {
        assignments: {
          include: {
            user: {
              select: { id: true, nombre: true, profileImage: true }
            }
          }
        }
      }
    });

    // Obtener las asignaciones del usuario actual
    const userAssignments = await prisma.tribeCaptainAssignment.findMany({
      where: {
        userId: usuario.id,
        captaincy: { visionId: targetVisionId }
      },
      include: {
        captaincy: true
      }
    });

    // Obtener notificaciones pendientes del usuario
    const pendingNotifications = await prisma.captaincyNotification.findMany({
      where: {
        userId: usuario.id,
        isRead: false
      },
      include: {
        assignment: {
          include: {
            captaincy: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Obtener miembros de la tribu (participantes PL de esta visión)
    const tribeMembers = await prisma.vision_enrollments.findMany({
      where: {
        visionId: targetVisionId,
        level: 'PL',
        enrollmentStatus: { in: ['CONFIRMED', 'ACTIVE', 'ENROLLED'] }
      },
      include: {
        Usuario_vision_enrollments_userIdToUsuario: {
          select: { id: true, nombre: true, profileImage: true, email: true }
        }
      }
    });

    // Mapear capitanías con definiciones
    const captainciesWithDefinitions = Object.entries(CAPTAINCY_DEFINITIONS).map(([role, def]) => {
      const existingCaptaincy = captaincies.find(c => c.roleType === role);
      
      return {
        roleType: role as TribeCaptaincyRole,
        ...def,
        captaincyId: existingCaptaincy?.id || null,
        isActive: existingCaptaincy?.isActive ?? true,
        assignments: existingCaptaincy?.assignments.map(a => ({
          id: a.id,
          userId: a.userId,
          userName: a.user.nombre,
          userImage: a.user.profileImage,
          status: a.status,
          acceptedAt: a.acceptedAt,
        })) || [],
        confirmedCount: existingCaptaincy?.assignments.filter(
          a => a.status === 'ACCEPTED'
        ).length || 0,
        pendingCount: existingCaptaincy?.assignments.filter(
          a => a.status === 'PENDING'
        ).length || 0,
      };
    });

    return NextResponse.json({
      hasAccess: true,
      hasAttendance: true,
      userId: usuario.id,
      userName: usuario.nombre,
      isStaff,
      visionId: targetVisionId,
      visionName: plEnrollment?.Vision.nombre || visionInfo?.nombre || 'Visión PL',
      
      // Logo oficial de la tribu
      tribeLogoUrl: visionInfo?.tribeLogoUrl || null,
      tribeShirtDesignUrl: visionInfo?.tribeShirtDesignUrl || null,
      
      // Misión de la tribu (legado transformacional)
      tribeMission: visionInfo?.tribeMission || null,
      
      // Visión completa para Identity Lab
      vision: visionInfo ? {
        id: visionInfo.id,
        nombre: visionInfo.nombre,
        tribeLogoUrl: visionInfo.tribeLogoUrl,
        tribeShirtDesignUrl: visionInfo.tribeShirtDesignUrl,
        tribeMission: visionInfo.tribeMission,
      } : null,
      
      // Fase 1: Juramento
      oathSigned: !!oath,
      oathSignedAt: oath?.signedAt || null,
      promises: TRIBE_PROMISES,
      
      // Fase 2: Capitanías
      captaincies: captainciesWithDefinitions,
      
      // Asignaciones del usuario actual
      userAssignments: userAssignments.map(ua => ({
        roleType: ua.captaincy.roleType,
        status: ua.status,
        permissions: ua.permissions,
      })),
      
      // Notificaciones pendientes
      pendingNotifications: pendingNotifications.map(n => ({
        id: n.id,
        title: n.title,
        message: n.message,
        roleType: n.assignment.captaincy.roleType,
        assignmentId: n.assignmentId,
        createdAt: n.createdAt,
      })),
      
      // Miembros de la tribu
      tribeMembers: tribeMembers.map(m => ({
        id: m.Usuario_vision_enrollments_userIdToUsuario.id,
        nombre: m.Usuario_vision_enrollments_userIdToUsuario.nombre,
        profileImage: m.Usuario_vision_enrollments_userIdToUsuario.profileImage,
        email: m.Usuario_vision_enrollments_userIdToUsuario.email,
      })),
    });
  } catch (error) {
    logger.error("Error en GET /api/legacy-vision-builder:", error);
    return NextResponse.json(
      { error: "Error interno del servidor", details: String(error) },
      { status: 500 }
    );
  }
}

// POST: Firmar juramento o asignar capitanía
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
    const { action, visionId } = body;

    if (!visionId) {
      return NextResponse.json({ error: "visionId es requerido" }, { status: 400 });
    }

    // ACCIÓN: Firmar juramento
    if (action === 'sign_oath') {
      const { signatureText, signatureImageUrl } = body;
      
      if (!signatureText || signatureText.trim().length < 3) {
        return NextResponse.json({ 
          error: "Debes escribir tu nombre completo para firmar el juramento" 
        }, { status: 400 });
      }

      // Verificar que no haya firmado ya
      const existingOath = await prisma.tribeOath.findUnique({
        where: {
          userId_visionId: {
            userId: usuario.id,
            visionId: parseInt(visionId)
          }
        }
      });

      if (existingOath) {
        return NextResponse.json({ 
          error: "Ya has firmado el juramento para esta visión" 
        }, { status: 400 });
      }

      const oath = await prisma.tribeOath.create({
        data: {
          userId: usuario.id,
          visionId: parseInt(visionId),
          signatureText: signatureText.trim(),
          signatureImageUrl: signatureImageUrl || null,
        }
      });

      return NextResponse.json({
        success: true,
        message: "¡Has firmado el Juramento de la Tribu!",
        oath: {
          id: oath.id,
          signedAt: oath.signedAt,
        }
      });
    }

    // ACCIÓN: Reclamar capitanía de tribu (primer participante que lo reclama)
    if (action === 'claim_tribe_captain') {
      const { tribeMission } = body;
      
      // Validar que se proporcione la misión
      if (!tribeMission || tribeMission.trim().length < 10) {
        return NextResponse.json({ 
          error: "La misión de la tribu debe tener al menos 10 caracteres" 
        }, { status: 400 });
      }

      // Verificar que el usuario tenga enrollment PL en esta visión
      const plEnrollment = await prisma.vision_enrollments.findFirst({
        where: {
          userId: usuario.id,
          visionId: parseInt(visionId),
          level: 'PL',
          enrollmentStatus: { in: ['CONFIRMED', 'ACTIVE', 'ENROLLED'] }
        }
      });

      if (!plEnrollment) {
        return NextResponse.json({ 
          error: "Debes estar inscrito en PL para reclamar la capitanía" 
        }, { status: 403 });
      }

      // Verificar que haya firmado el juramento
      const oath = await prisma.tribeOath.findUnique({
        where: {
          userId_visionId: {
            userId: usuario.id,
            visionId: parseInt(visionId)
          }
        }
      });

      if (!oath) {
        return NextResponse.json({ 
          error: "Debes firmar el Juramento antes de reclamar la capitanía" 
        }, { status: 400 });
      }

      // Buscar o crear la capitanía TRIBE_CAPTAIN
      let captaincy = await prisma.tribeCaptaincy.findUnique({
        where: {
          visionId_roleType: {
            visionId: parseInt(visionId),
            roleType: 'TRIBE_CAPTAIN'
          }
        },
        include: {
          assignments: {
            where: { status: { in: ['PENDING', 'ACCEPTED'] } }
          }
        }
      });

      // Verificar si ya hay un capitán
      if (captaincy && captaincy.assignments.length > 0) {
        return NextResponse.json({ 
          error: "Ya hay un Capitán de Tribu asignado" 
        }, { status: 400 });
      }

      // Crear la capitanía si no existe
      if (!captaincy) {
        captaincy = await prisma.tribeCaptaincy.create({
          data: {
            visionId: parseInt(visionId),
            roleType: 'TRIBE_CAPTAIN',
            maxCaptains: 1,
          },
          include: { assignments: true }
        });
      }

      // Guardar la misión de la tribu en la visión
      await prisma.vision.update({
        where: { id: parseInt(visionId) },
        data: { tribeMission: tribeMission.trim() }
      });

      // Crear la asignación directamente como ACCEPTED (se auto-asigna)
      const assignment = await prisma.tribeCaptainAssignment.create({
        data: {
          captaincyId: captaincy.id,
          userId: usuario.id,
          status: 'ACCEPTED',
          acceptedAt: new Date(),
          permissions: ['can_send_push_notifications', 'can_view_tribe_dashboard', 'can_view_attendance', 'can_assign_captains'],
        }
      });

      return NextResponse.json({
        success: true,
        message: `¡${usuario.nombre} es ahora el Capitán de Tribu!`,
        assignment: {
          id: assignment.id,
          roleType: 'TRIBE_CAPTAIN',
          status: 'ACCEPTED',
        },
        tribeMission: tribeMission.trim()
      });
    }

    // ACCIÓN: Actualizar misión de tribu (solo Capitán de Tribu)
    if (action === 'update_mission') {
      const { tribeMission } = body;

      if (!tribeMission || tribeMission.trim().length < 10) {
        return NextResponse.json({ 
          error: "La misión debe tener al menos 10 caracteres" 
        }, { status: 400 });
      }

      // Verificar que el usuario sea el Capitán de Tribu
      const tribeCaptaincy = await prisma.tribeCaptaincy.findUnique({
        where: {
          visionId_roleType: {
            visionId: parseInt(visionId),
            roleType: 'TRIBE_CAPTAIN'
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

      const isStaff = ['ADMINISTRADOR', 'SUPER_ADMIN', 'GAMECHANGER', 'COORDINATOR', 'COORDINATOR_ADVANCED'].includes(usuario.rol);
      const isTribeCaptain = tribeCaptaincy && tribeCaptaincy.assignments.length > 0;

      if (!isStaff && !isTribeCaptain) {
        return NextResponse.json({ 
          error: "Solo el Capitán de Tribu puede editar la misión" 
        }, { status: 403 });
      }

      // Actualizar la misión
      await prisma.vision.update({
        where: { id: parseInt(visionId) },
        data: { tribeMission: tribeMission.trim() }
      });

      return NextResponse.json({
        success: true,
        message: "Misión actualizada correctamente",
        tribeMission: tribeMission.trim()
      });
    }

    // ACCIÓN: Nominar capitán (Staff, Capitán de Tribu o Co-Capitán de Tribu puede hacer esto)
    if (action === 'nominate_captain') {
      const isStaff = ['ADMINISTRADOR', 'SUPER_ADMIN', 'GAMECHANGER', 'COORDINATOR', 'COORDINATOR_ADVANCED'].includes(usuario.rol);
      
      // Verificar si es el Capitán de Tribu o Co-Capitán de Tribu
      const tribeCaptaincies = await prisma.tribeCaptaincy.findMany({
        where: {
          visionId: parseInt(visionId),
          roleType: { in: ['TRIBE_CAPTAIN', 'TRIBE_CO_CAPTAIN'] }
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
      
      const isTribeCaptainOrCo = tribeCaptaincies.some(c => c.assignments.length > 0);
      
      if (!isStaff && !isTribeCaptainOrCo) {
        return NextResponse.json({ 
          error: "Solo el Capitán de Tribu, Co-Capitán o Staff pueden asignar capitanías" 
        }, { status: 403 });
      }

      const { roleType, nominatedUserId } = body;

      if (!roleType || !nominatedUserId) {
        return NextResponse.json({ 
          error: "roleType y nominatedUserId son requeridos" 
        }, { status: 400 });
      }

      // Verificar que el rol existe
      const roleDef = CAPTAINCY_DEFINITIONS[roleType as TribeCaptaincyRole];
      if (!roleDef) {
        return NextResponse.json({ error: "Rol de capitanía inválido" }, { status: 400 });
      }

      // Buscar o crear la capitanía para esta visión
      let captaincy = await prisma.tribeCaptaincy.findUnique({
        where: {
          visionId_roleType: {
            visionId: parseInt(visionId),
            roleType: roleType as TribeCaptaincyRole
          }
        }
      });

      if (!captaincy) {
        captaincy = await prisma.tribeCaptaincy.create({
          data: {
            visionId: parseInt(visionId),
            roleType: roleType as TribeCaptaincyRole,
            maxCaptains: roleDef.maxCaptains,
          }
        });
      }

      // Verificar que no exceda el máximo de capitanes
      const existingAssignments = await prisma.tribeCaptainAssignment.count({
        where: {
          captaincyId: captaincy.id,
          status: { in: ['PENDING', 'ACCEPTED'] }
        }
      });

      if (existingAssignments >= roleDef.maxCaptains) {
        return NextResponse.json({ 
          error: `Este rol ya tiene el máximo de ${roleDef.maxCaptains} capitán(es)` 
        }, { status: 400 });
      }

      // Verificar que el usuario no esté ya nominado para este rol
      const existingNomination = await prisma.tribeCaptainAssignment.findUnique({
        where: {
          captaincyId_userId: {
            captaincyId: captaincy.id,
            userId: parseInt(nominatedUserId)
          }
        }
      });

      if (existingNomination) {
        return NextResponse.json({ 
          error: "Este usuario ya está nominado para este rol" 
        }, { status: 400 });
      }

      // Crear la asignación
      const assignment = await prisma.tribeCaptainAssignment.create({
        data: {
          captaincyId: captaincy.id,
          userId: parseInt(nominatedUserId),
          nominatedBy: usuario.id,
          status: 'PENDING',
          permissions: roleDef.permissions,
        }
      });

      // Crear notificación para el usuario nominado
      await prisma.captaincyNotification.create({
        data: {
          assignmentId: assignment.id,
          userId: parseInt(nominatedUserId),
          title: `¡Has sido postulado como ${roleDef.name}!`,
          message: `Has sido nominado para el cargo de ${roleDef.name}. ${roleDef.mission}. ¿Aceptas la responsabilidad ineludible?`,
        }
      });

      return NextResponse.json({
        success: true,
        message: `Usuario nominado como ${roleDef.name}`,
        assignment: {
          id: assignment.id,
          roleType,
          status: assignment.status,
        }
      });
    }

    // ACCIÓN: Responder a nominación (aceptar/rechazar)
    if (action === 'respond_nomination') {
      const { assignmentId, accept } = body;

      if (!assignmentId || accept === undefined) {
        return NextResponse.json({ 
          error: "assignmentId y accept son requeridos" 
        }, { status: 400 });
      }

      // Buscar la asignación
      const assignment = await prisma.tribeCaptainAssignment.findUnique({
        where: { id: parseInt(assignmentId) },
        include: { captaincy: true }
      });

      if (!assignment) {
        return NextResponse.json({ error: "Asignación no encontrada" }, { status: 404 });
      }

      if (assignment.userId !== usuario.id) {
        return NextResponse.json({ 
          error: "No puedes responder a una nominación que no es tuya" 
        }, { status: 403 });
      }

      if (assignment.status !== 'PENDING') {
        return NextResponse.json({ 
          error: "Esta nominación ya fue respondida" 
        }, { status: 400 });
      }

      // Actualizar la asignación
      const updatedAssignment = await prisma.tribeCaptainAssignment.update({
        where: { id: assignment.id },
        data: {
          status: accept ? 'ACCEPTED' : 'REJECTED',
          acceptedAt: accept ? new Date() : null,
          rejectedAt: accept ? null : new Date(),
        }
      });

      // Marcar notificación como leída
      await prisma.captaincyNotification.updateMany({
        where: {
          assignmentId: assignment.id,
          userId: usuario.id,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        }
      });

      const roleDef = CAPTAINCY_DEFINITIONS[assignment.captaincy.roleType];

      return NextResponse.json({
        success: true,
        message: accept 
          ? `¡Has aceptado el cargo de ${roleDef.name}!` 
          : `Has rechazado el cargo de ${roleDef.name}`,
        assignment: {
          id: updatedAssignment.id,
          roleType: assignment.captaincy.roleType,
          status: updatedAssignment.status,
        }
      });
    }

    // ACCIÓN: Actualizar logo oficial de la tribu
    if (action === 'updateTribeLogo') {
      const { logoUrl } = body;

      if (!visionId || !logoUrl) {
        return NextResponse.json({ 
          error: "visionId y logoUrl son requeridos" 
        }, { status: 400 });
      }

      // Verificar que el usuario es capitán de identidad o staff
      const isIdentityCaptain = await prisma.tribeCaptainAssignment.findFirst({
        where: {
          userId: usuario.id,
          status: 'ACCEPTED',
          captaincy: {
            visionId: parseInt(visionId),
            roleType: 'SHIRTS_LOGO'
          }
        }
      });

      const isStaffMember = ['ADMINISTRADOR', 'SUPER_ADMIN', 'GAMECHANGER', 'COORDINATOR', 'COORDINATOR_ADVANCED'].includes(usuario.rol);

      if (!isIdentityCaptain && !isStaffMember) {
        return NextResponse.json({ 
          error: "Solo el Capitán de Identidad o Staff pueden actualizar el logo" 
        }, { status: 403 });
      }

      // Actualizar el logo de la visión
      const updatedVision = await prisma.vision.update({
        where: { id: parseInt(visionId) },
        data: { tribeLogoUrl: logoUrl },
        select: { id: true, nombre: true, tribeLogoUrl: true }
      });

      return NextResponse.json({
        success: true,
        message: '¡Logo oficial de la tribu actualizado!',
        vision: updatedVision
      });
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  } catch (error) {
    logger.error("Error en POST /api/legacy-vision-builder:", error);
    return NextResponse.json(
      { error: "Error interno del servidor", details: String(error) },
      { status: 500 }
    );
  }
}

// DELETE: Remover capitán de un rol
export async function DELETE(request: NextRequest) {
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
    const assignmentId = searchParams.get("assignmentId");
    const visionId = searchParams.get("visionId");

    if (!assignmentId) {
      return NextResponse.json({ error: "assignmentId es requerido" }, { status: 400 });
    }

    // Staff/Admin puede remover
    const isStaff = ['ADMINISTRADOR', 'SUPER_ADMIN', 'GAMECHANGER', 'COORDINATOR', 'COORDINATOR_ADVANCED'].includes(usuario.rol);
    
    // Verificar si es Capitán de Tribu o Co-Capitán de Tribu
    let isTribeCaptainOrCo = false;
    if (visionId) {
      const tribeCaptaincies = await prisma.tribeCaptaincy.findMany({
        where: {
          visionId: parseInt(visionId),
          roleType: { in: ['TRIBE_CAPTAIN', 'TRIBE_CO_CAPTAIN'] }
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
      isTribeCaptainOrCo = tribeCaptaincies.some(c => c.assignments.length > 0);
    }
    
    if (!isStaff && !isTribeCaptainOrCo) {
      return NextResponse.json({ error: "Solo el Capitán de Tribu, Co-Capitán o Staff pueden remover capitanías" }, { status: 403 });
    }

    // Actualizar el estado a REMOVED
    const assignment = await prisma.tribeCaptainAssignment.update({
      where: { id: parseInt(assignmentId) },
      data: { status: 'REMOVED' },
      include: { captaincy: true }
    });

    const roleDef = CAPTAINCY_DEFINITIONS[assignment.captaincy.roleType];

    return NextResponse.json({
      success: true,
      message: `Capitán removido del rol de ${roleDef.name}`,
    });
  } catch (error) {
    logger.error("Error en DELETE /api/legacy-vision-builder:", error);
    return NextResponse.json(
      { error: "Error interno del servidor", details: String(error) },
      { status: 500 }
    );
  }
}
