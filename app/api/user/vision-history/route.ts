import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET - Obtener historial de visiones del usuario
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true, nombre: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    let visiones: any[] = [];
    const roles: string[] = [];
    let totalParticipantesGlobal = 0;
    let totalAtomos = 0;

    // Obtener visiones según el rol
    if (user.rol === 'GAMECHANGER') {
      roles.push('Game Changer');
      
      // Obtener todos los átomos (SmallGroups) donde el GC es líder (activos e inactivos para historial)
      const atomos = await prisma.smallGroup.findMany({
        where: { 
          leaderId: user.id
          // Sin filtro de isActive para mostrar historial completo
        },
        include: {
          vision: {
            include: {
              Organization: {
                select: { id: true, name: true, logoUrl: true }
              }
            }
          },
          members: {
            // Para historial, incluir datos de los miembros
            include: {
              user: {
                select: { 
                  id: true, 
                  nombre: true, 
                  imagen: true,
                  profileImage: true,
                  email: true 
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      totalAtomos = atomos.length;

      // Contar participantes únicos (sin duplicados entre átomos)
      const participantesUnicos = new Set<number>();
      atomos.forEach(atomo => {
        atomo.members.forEach(member => {
          participantesUnicos.add(member.userId);
        });
      });
      totalParticipantesGlobal = participantesUnicos.size;

      // Agrupar por visión para mostrar en el historial
      const visionMap = new Map();
      
      for (const atomo of atomos) {
        if (atomo.vision) {
          const existing = visionMap.get(atomo.vision.id);
          const atomosEnVision = existing?.atomos || [];
          const levels = existing?.levels || [];
          
          if (!levels.includes(atomo.level)) {
            levels.push(atomo.level);
          }
          
          // Incluir lista de participantes con sus datos
          const participantesList = atomo.members.map(m => ({
            id: m.user.id,
            nombre: m.user.nombre,
            imagen: m.user.profileImage || m.user.imagen,
            email: m.user.email
          }));
          
          atomosEnVision.push({
            id: atomo.id,
            name: atomo.name,
            level: atomo.level,
            membersCount: atomo.members.length,
            members: participantesList
          });
          
          // Contar participantes únicos en esta visión
          const participantesVision = new Set<number>(existing?.participantesIds || []);
          atomo.members.forEach(member => {
            participantesVision.add(member.userId);
          });
          
          visionMap.set(atomo.vision.id, {
            id: atomo.vision.id,
            nombre: atomo.vision.nombre,
            descripcion: atomo.vision.descripcion,
            startDate: atomo.vision.startDate,
            endDate: atomo.vision.endDate,
            isActive: atomo.vision.isActive,
            organization: atomo.vision.Organization,
            totalParticipantes: participantesVision.size,
            participantesIds: Array.from(participantesVision),
            assignedAt: existing?.assignedAt || atomo.createdAt,
            role: 'Game Changer',
            levels,
            atomos: atomosEnVision,
            totalAtomos: atomosEnVision.length
          });
        }
      }

      // TAMBIÉN buscar visiones asignadas via VisionGameChanger (que no tienen SmallGroups)
      const visionGCAssignments = await prisma.visionGameChanger.findMany({
        where: { gameChangerId: user.id },
        include: {
          Vision: {
            include: {
              Organization: {
                select: { id: true, name: true, logoUrl: true }
              }
            }
          }
        }
      });

      // Agregar visiones de VisionGameChanger que no están ya en el mapa
      for (const vgc of visionGCAssignments) {
        if (!visionMap.has(vgc.Vision.id)) {
          // Contar participantes en esta visión
          const participantesVision = await prisma.vision_enrollments.count({
            where: {
              visionId: vgc.Vision.id,
              level: vgc.level,
              enrollmentStatus: { in: ['ENROLLED', 'ACTIVE'] }
            }
          });

          // Cada asignación VisionGameChanger cuenta como 1 átomo (aunque no tenga SmallGroups creados)
          totalAtomos += 1;
          totalParticipantesGlobal += participantesVision;

          visionMap.set(vgc.Vision.id, {
            id: vgc.Vision.id,
            nombre: vgc.Vision.nombre,
            descripcion: vgc.Vision.descripcion,
            startDate: vgc.Vision.startDate,
            endDate: vgc.Vision.endDate,
            isActive: vgc.Vision.isActive,
            organization: vgc.Vision.Organization,
            totalParticipantes: participantesVision,
            participantesIds: [],
            assignedAt: vgc.createdAt,
            role: 'Game Changer',
            levels: [vgc.level],
            atomos: [],
            totalAtomos: 1  // Cada VisionGameChanger asignación cuenta como 1 átomo
          });
        } else {
          // Si ya existe, agregar el nivel si no está
          const existing = visionMap.get(vgc.Vision.id);
          if (!existing.levels.includes(vgc.level)) {
            existing.levels.push(vgc.level);
          }
        }
      }

      visiones = Array.from(visionMap.values());

    } else if (user.rol === 'TRAINER') {
      roles.push('Trainer');
      
      // Trainers: Productos donde han sido asignados como trainer
      const trainerProducts = await prisma.schoolProduct.findMany({
        where: { trainerId: user.id },
        include: {
          Vision: {
            include: {
              Organization: {
                select: { id: true, name: true, logoUrl: true }
              }
            }
          }
        },
        orderBy: { startDate: 'desc' }
      });

      // También buscar en VisionStaff como trainer (BASIC_TRAINER, ADVANCED_TRAINER, PL_TRAINER)
      const staffAssignments = await prisma.visionStaff.findMany({
        where: { 
          userId: user.id,
          role: { in: ['BASIC_TRAINER', 'ADVANCED_TRAINER', 'PL_TRAINER'] }
        },
        include: {
          Vision: {
            include: {
              Organization: {
                select: { id: true, name: true, logoUrl: true }
              }
            }
          }
        }
      });

      // Combinar visiones y contar inscritos en vision_enrollments
      const visionMap = new Map();
      const visionIds = new Set<number>();

      // Recopilar todos los visionIds
      for (const product of trainerProducts) {
        if (product.Vision) {
          visionIds.add(product.Vision.id);
        }
      }

      // Obtener encuestas existentes del trainer
      const existingSurveys = await prisma.trainerSurvey.findMany({
        where: { trainerId: user.id },
        select: { productId: true }
      });
      const surveysCompletedIds = new Set(existingSurveys.map(s => s.productId));

      // Contar inscritos por visión (vision_enrollments con nivel BASIC)
      for (const product of trainerProducts) {
        if (product.Vision) {
          const existing = visionMap.get(product.Vision.id);
          const products = existing?.products || [];
          
          products.push({
            id: product.id,
            name: product.name,
            levelType: product.levelType,
            startDate: product.startDate,
            endDate: product.endDate,
            trainingStatus: product.trainingStatus,
            currentEnrollment: product.currentEnrollment,
            surveyCompleted: surveysCompletedIds.has(product.id)
          });
          
          // Contar inscritos en la visión (vision_enrollments nivel BASIC)
          const inscritosVision = await prisma.vision_enrollments.count({
            where: {
              visionId: product.Vision.id,
              level: 'BASIC',
              enrollmentStatus: { in: ['ENROLLED', 'ACTIVE'] }
            }
          });
          
          visionMap.set(product.Vision.id, {
            id: product.Vision.id,
            nombre: product.Vision.nombre,
            descripcion: product.Vision.descripcion,
            startDate: product.Vision.startDate,
            endDate: product.Vision.endDate,
            isActive: product.Vision.isActive,
            organization: product.Vision.Organization,
            totalParticipantes: inscritosVision,
            assignedAt: existing?.assignedAt || product.createdAt,
            role: 'Trainer',
            products
          });
        }
      }
      
      // Calcular total de participantes (sumando de todas las visiones)
      totalParticipantesGlobal = Array.from(visionMap.values()).reduce(
        (sum, v) => sum + (v.totalParticipantes || 0), 0
      );

      for (const assignment of staffAssignments) {
        if (assignment.Vision && !visionMap.has(assignment.Vision.id)) {
          const roleName = assignment.role === 'BASIC_TRAINER' ? 'Trainer Básico' 
            : assignment.role === 'ADVANCED_TRAINER' ? 'Trainer Avanzado' 
            : 'Trainer PL';
          
          if (!roles.includes(roleName)) roles.push(roleName);
          
          // Contar check-ins de los productos del trainer en esta visión
          const checkInsVision = await prisma.checkInRecord.count({
            where: {
              visionId: assignment.Vision.id,
              Product: {
                trainerId: user.id
              }
            }
          });
          
          visionMap.set(assignment.Vision.id, {
            id: assignment.Vision.id,
            nombre: assignment.Vision.nombre,
            descripcion: assignment.Vision.descripcion,
            startDate: assignment.Vision.startDate,
            endDate: assignment.Vision.endDate,
            isActive: assignment.Vision.isActive,
            organization: assignment.Vision.Organization,
            totalParticipantes: checkInsVision,
            assignedAt: assignment.createdAt,
            role: roleName,
            level: assignment.level,
            products: []
          });
        }
      }

      visiones = Array.from(visionMap.values());
    }

    // Usar el total global calculado, o sumar de las visiones
    const totalParticipantes = totalParticipantesGlobal > 0 
      ? totalParticipantesGlobal 
      : visiones.reduce((sum, v) => sum + (v.totalParticipantes || 0), 0);

    // Separar en activas y finalizadas
    const now = new Date();
    const activas = visiones.filter(v => v.isActive || (v.endDate && new Date(v.endDate) > now));
    const finalizadas = visiones.filter(v => !v.isActive && (!v.endDate || new Date(v.endDate) <= now));

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        nombre: user.nombre,
        rol: user.rol
      },
      stats: {
        total: visiones.length,
        activas: activas.length,
        finalizadas: finalizadas.length,
        totalParticipantes,
        totalAtomos, // Para Game Changers
        roles
      },
      visiones: [...activas, ...finalizadas]
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo historial de visiones:', error);
    return NextResponse.json(
      { error: 'Error al obtener historial', message: error?.message },
      { status: 500 }
    );
  }
}
