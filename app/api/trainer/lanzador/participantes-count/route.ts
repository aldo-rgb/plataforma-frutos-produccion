// API para obtener el conteo de participantes para el lanzador
// Considera si el trainer es de PL (solo participantes con asistencia)
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import logger from '@/lib/logger';


export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const userId = Number(session.user.id)
    const { searchParams } = new URL(request.url)
    const visionId = searchParams.get('visionId')

    if (!visionId) {
      return NextResponse.json({ error: "visionId requerido" }, { status: 400 })
    }

    // Verificar que es TRAINER
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { id: true, rol: true }
    })

    if (!usuario || usuario.rol !== 'TRAINER') {
      return NextResponse.json({ error: "Solo trainers pueden acceder" }, { status: 403 })
    }

    const visionIdNum = parseInt(visionId)

    // Verificar si el trainer está asignado como PL_TRAINER via VisionStaff
    const isPLTrainer = await prisma.visionStaff.findFirst({
      where: {
        visionId: visionIdNum,
        userId: userId,
        role: 'PL_TRAINER'
      }
    })

    let participantCount = 0
    let levelInfo = ''

    if (isPLTrainer) {
      // Si es trainer de PL, contar solo participantes con asistencia en PL
      participantCount = await prisma.vision_enrollments.count({
        where: {
          visionId: visionIdNum,
          level: 'PL',
          attendanceStatus: 'ATTENDED',
          enrollmentStatus: 'ACTIVE'
        }
      })
      levelInfo = 'PL (con asistencia)'
    } else {
      // Verificar si es trainer directo de ADVANCED
      const isAdvancedTrainer = await prisma.schoolProduct.findFirst({
        where: {
          visionId: visionIdNum,
          trainerId: userId,
          type: 'ADVANCED_TRAINING'
        }
      })

      if (isAdvancedTrainer) {
        // Contar participantes de ADVANCED con asistencia
        participantCount = await prisma.vision_enrollments.count({
          where: {
            visionId: visionIdNum,
            level: 'ADVANCED',
            attendanceStatus: 'ATTENDED',
            enrollmentStatus: 'ACTIVE'
          }
        })
        levelInfo = 'Avanzado (con asistencia)'
      } else {
        // Verificar si es ADVANCED_TRAINER via VisionStaff
        const isAdvancedStaff = await prisma.visionStaff.findFirst({
          where: {
            visionId: visionIdNum,
            userId: userId,
            role: 'ADVANCED_TRAINER'
          }
        })

        if (isAdvancedStaff) {
          participantCount = await prisma.vision_enrollments.count({
            where: {
              visionId: visionIdNum,
              level: 'ADVANCED',
              attendanceStatus: 'ATTENDED',
              enrollmentStatus: 'ACTIVE'
            }
          })
          levelInfo = 'Avanzado (con asistencia)'
        } else {
          // Verificar si es BASIC_TRAINER via VisionStaff
          const isBasicStaff = await prisma.visionStaff.findFirst({
            where: {
              visionId: visionIdNum,
              userId: userId,
              role: 'BASIC_TRAINER'
            }
          })

          if (isBasicStaff) {
            participantCount = await prisma.vision_enrollments.count({
              where: {
                visionId: visionIdNum,
                level: 'BASIC',
                attendanceStatus: 'ATTENDED',
                enrollmentStatus: 'ACTIVE'
              }
            })
            levelInfo = 'Básico (con asistencia)'
          } else {
            // Trainer directo de BASIC
            const isBasicTrainer = await prisma.schoolProduct.findFirst({
              where: {
                visionId: visionIdNum,
                trainerId: userId,
                type: 'CORE_TRAINING'
              }
            })

            if (isBasicTrainer) {
              participantCount = await prisma.vision_enrollments.count({
                where: {
                  visionId: visionIdNum,
                  level: 'BASIC',
                  attendanceStatus: 'ATTENDED',
                  enrollmentStatus: 'ACTIVE'
                }
              })
              levelInfo = 'Básico (con asistencia)'
            }
          }
        }
      }
    }

    logger.debug('Participantes count para lanzador:', {
      trainerId: userId,
      visionId: visionIdNum,
      isPLTrainer: !!isPLTrainer,
      count: participantCount,
      level: levelInfo
    })

    return NextResponse.json({
      success: true,
      count: participantCount,
      level: levelInfo
    })

  } catch (error) {
    logger.error("Error al obtener conteo de participantes:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
