// API Route: Verificar acceso a sección Liderato
// El acceso se otorga cuando el usuario:
// 1. Está inscrito en PL (Programa de Liderato)
// 2. O ha completado el nivel ADVANCED

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ 
        hasAccess: false, 
        message: "No autenticado" 
      });
    }

    // Obtener usuario
    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { 
        id: true, 
        rol: true,
        organizationId: true
      }
    });

    if (!usuario) {
      return NextResponse.json({ 
        hasAccess: false, 
        message: "Usuario no encontrado" 
      });
    }

    // Staff siempre tiene acceso (ADMINISTRADOR, DIRECTOR, COORDINADOR, TRAINER, GAMECHANGER, LIDER, MENTOR, SCHOOL_ADMIN)
    const staffRoles = ['ADMINISTRADOR', 'DIRECTOR', 'COORDINADOR', 'TRAINER', 'GAMECHANGER', 'LIDER', 'MENTOR', 'SCHOOL_ADMIN'];
    if (staffRoles.includes(usuario.rol)) {
      return NextResponse.json({
        hasAccess: true,
        reason: 'staff',
        message: "Acceso como staff"
      });
    }

    // Para PARTICIPANTE: verificar AMBAS condiciones
    
    // 1. Verificar si está inscrito en PL
    const plEnrollment = await prisma.vision_enrollments.findFirst({
      where: {
        userId: usuario.id,
        level: 'PL',
        enrollmentStatus: { in: ['CONFIRMED', 'ENROLLED', 'ACTIVE'] }
      },
      select: {
        id: true,
        enrolledAt: true,
        visionId: true,
        Vision: {
          select: {
            id: true,
            nombre: true
          }
        }
      }
    });

    // 2. Verificar si tiene ADVANCED completado de alguna forma:
    //    a) completedAt no es null (marcado por entrenador)
    //    b) graduatedAt no es null
    //    c) enrollmentStatus es COMPLETED o GRADUATED
    //    d) La fecha advancedEndDate de la visión ya pasó (+ 23:00 hrs)
    
    // Primero buscar enrollment ADVANCED
    const advancedEnrollment = await prisma.vision_enrollments.findFirst({
      where: {
        userId: usuario.id,
        level: 'ADVANCED',
        enrollmentStatus: { in: ['CONFIRMED', 'ENROLLED', 'ACTIVE', 'COMPLETED', 'GRADUATED'] }
      },
      select: {
        id: true,
        completedAt: true,
        graduatedAt: true,
        enrollmentStatus: true,
        visionId: true,
        Vision: {
          select: {
            id: true,
            nombre: true,
            advancedEndDate: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    let hasCompletedAdvanced = false;
    let advancedCompletionReason = '';

    if (advancedEnrollment) {
      // Verificar si está marcado como completado
      if (advancedEnrollment.completedAt || advancedEnrollment.graduatedAt) {
        hasCompletedAdvanced = true;
        advancedCompletionReason = 'marked_completed';
      } 
      // Verificar si tiene status COMPLETED o GRADUATED
      else if (['COMPLETED', 'GRADUATED'].includes(advancedEnrollment.enrollmentStatus)) {
        hasCompletedAdvanced = true;
        advancedCompletionReason = 'status_completed';
      }
      // Verificar si ya pasó la fecha de fin del avanzado (a las 23:00)
      else if (advancedEnrollment.Vision?.advancedEndDate) {
        const endDate = new Date(advancedEnrollment.Vision.advancedEndDate);
        // Establecer a las 23:00 del último día
        endDate.setHours(23, 0, 0, 0);
        const now = new Date();
        
        if (now > endDate) {
          hasCompletedAdvanced = true;
          advancedCompletionReason = 'date_passed';
        }
      }
    }

    // Debe cumplir al menos UNA de estas condiciones:
    // - Estar inscrito en PL (ya implica que completó avanzado)
    // - O tener avanzado completado
    const isEnrolledInPL = !!plEnrollment;

    // Si está en PL, tiene acceso automático
    if (isEnrolledInPL) {
      return NextResponse.json({
        hasAccess: true,
        reason: 'enrolled_in_pl',
        message: "Acceso completo: inscrito en Programa de Liderato",
        plEnrollment: {
          enrolledAt: plEnrollment.enrolledAt,
          vision: plEnrollment.Vision?.nombre
        }
      });
    }

    // Si tiene Avanzado completado (aunque no esté en PL), también tiene acceso
    if (hasCompletedAdvanced) {
      return NextResponse.json({
        hasAccess: true,
        reason: 'advanced_completed',
        advancedCompletionReason,
        message: "Acceso completo: Avanzado completado",
        advancedInfo: advancedEnrollment ? {
          completedAt: advancedEnrollment.completedAt,
          graduatedAt: advancedEnrollment.graduatedAt,
          status: advancedEnrollment.enrollmentStatus,
          vision: advancedEnrollment.Vision?.nombre,
          advancedEndDate: advancedEnrollment.Vision?.advancedEndDate
        } : null
      });
    }

    // No tiene acceso - indicar qué le falta
    const missingRequirements = [];
    if (!isEnrolledInPL && !hasCompletedAdvanced) {
      if (advancedEnrollment?.Vision?.advancedEndDate) {
        const endDate = new Date(advancedEnrollment.Vision.advancedEndDate);
        missingRequirements.push(`completar el nivel Avanzado (termina el ${endDate.toLocaleDateString('es-MX')}) o inscribirte en Programa de Liderato`);
      } else {
        missingRequirements.push("completar el nivel Avanzado o inscribirte en Programa de Liderato");
      }
    }

    return NextResponse.json({
      hasAccess: false,
      isEnrolledInPL,
      hasCompletedAdvanced,
      advancedInfo: advancedEnrollment ? {
        status: advancedEnrollment.enrollmentStatus,
        advancedEndDate: advancedEnrollment.Vision?.advancedEndDate
      } : null,
      message: `Necesitas: ${missingRequirements.join(" y ")}`
    });

  } catch (error) {
    console.error('Error verificando acceso a Liderato:', error);
    return NextResponse.json({ 
      hasAccess: false, 
      message: "Error verificando acceso" 
    }, { status: 500 });
  }
}
