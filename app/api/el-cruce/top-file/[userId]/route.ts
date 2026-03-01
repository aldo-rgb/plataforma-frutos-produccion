import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import logger from '@/lib/logger';

/**
 * GET /api/el-cruce/top-file/[userId]
 * 
 * TOP FILE - Perfil completísimo del participante para uso de entrenadores y directores
 * 
 * Incluye:
 * - Información básica del usuario
 * - Historial de llamadas (CallBooking)
 * - Respuestas a tareas de cuestionario (MissionSubmission + MissionQuestionAnswer)
 * - Respuestas de registro avanzado (AdvancedPreRegistration)
 * - Quiz médico (MedicalForm)
 * - Historial de enrollments y productos
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar que el solicitante tiene permisos
    const requester = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true, organizationId: true }
    })

    if (!requester) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Solo trainers, coordinadores, directores y admins pueden ver el TOP FILE
    const allowedRoles = [
      'TRAINER', 'SCHOOL_ADMIN', 'COORDINATOR', 'COORDINADOR', 'COORDINATOR_BASIC',
      'COORDINATOR_ADVANCED', 'COORDINATOR_PL', 'DIRECTOR', 'ADMINISTRADOR',
      'GAMECHANGER', 'MENTOR'
    ]
    
    if (!allowedRoles.includes(requester.rol)) {
      return NextResponse.json({ error: 'Sin permisos para ver TOP FILE' }, { status: 403 })
    }

    const { userId: userIdParam } = await params
    const userId = parseInt(userIdParam)
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'ID de usuario inválido' }, { status: 400 })
    }

    // Obtener usuario con toda la información
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nombre: true,
        email: true,
        apodo: true,
        telefono: true,
        imagen: true,
        profileImage: true,
        createdAt: true,
        rol: true,
        tier: true,
        organizationId: true,
        Organization_Usuario_organizationIdToOrganization: {
          select: {
            id: true,
            name: true,
            logoUrl: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // 1. HISTORIAL DE LLAMADAS (CallBooking - mentorías tradicionales)
    const callBookings = await prisma.callBooking.findMany({
      where: { studentId: userId },
      orderBy: { scheduledAt: 'desc' },
      take: 50,
      select: {
        id: true,
        scheduledAt: true,
        status: true,
        duration: true,
        notes: true,
        rating: true,
        type: true,
        attendanceStatus: true,
        weekNumber: true,
        completedAt: true,
        Usuario_CallBooking_mentorIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            imagen: true
          }
        }
      }
    })

    // 1b. LLAMADAS DE GAME CHANGER (GCCallLog - llamadas del entrenamiento)
    const gcCallLogs = await prisma.gCCallLog.findMany({
      where: { participantId: userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        trainingType: true,
        trainingDay: true,
        callStatus: true,
        callStartedAt: true,
        callEndedAt: true,
        duration: true,
        potentialRating: true,
        commitment: true,
        notes: true,
        isAtRisk: true,
        riskReason: true,
        createdAt: true,
        Usuario_GCCallLog_gameChangerIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            imagen: true
          }
        },
        Vision: {
          select: {
            id: true,
            nombre: true
          }
        }
      }
    })

    // 1c. INTENTOS DE LLAMADA (GCCallAttempt)
    const gcCallAttempts = await prisma.gCCallAttempt.findMany({
      where: { participantId: userId },
      orderBy: { attemptedAt: 'desc' },
      take: 30,
      select: {
        id: true,
        trainingType: true,
        trainingDay: true,
        attemptNumber: true,
        completed: true,
        potentialRating: true,
        notes: true,
        attemptedAt: true,
        Usuario_GCCallAttempt_gameChangerIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            imagen: true
          }
        }
      }
    })

    // Combinar historial de llamadas
    const callHistory = [
      ...callBookings.map(c => ({
        id: c.id,
        tipo: 'MENTORIA',
        fecha: c.scheduledAt,
        estado: c.status,
        duracion: c.duration,
        notas: c.notes,
        calificacion: c.rating,
        tipoLlamada: c.type,
        asistencia: c.attendanceStatus,
        semana: c.weekNumber,
        completadaEn: c.completedAt,
        mentor: c.Usuario_CallBooking_mentorIdToUsuario
      })),
      ...gcCallLogs.map(c => ({
        id: c.id,
        tipo: 'GC_CALL',
        fecha: c.callStartedAt || c.createdAt,
        estado: c.callStatus,
        duracion: c.duration,
        notas: c.notes,
        calificacion: c.potentialRating,
        tipoLlamada: c.trainingType,
        diaEntrenamiento: c.trainingDay,
        compromiso: c.commitment,
        enRiesgo: c.isAtRisk,
        razonRiesgo: c.riskReason,
        mentor: c.Usuario_GCCallLog_gameChangerIdToUsuario,
        vision: c.Vision
      })),
      ...gcCallAttempts.map(c => ({
        id: c.id,
        tipo: 'GC_ATTEMPT',
        fecha: c.attemptedAt,
        estado: c.completed ? 'COMPLETED' : 'ATTEMPTED',
        duracion: null,
        notas: c.notes,
        calificacion: c.potentialRating,
        tipoLlamada: c.trainingType,
        diaEntrenamiento: c.trainingDay,
        intentoNumero: c.attemptNumber,
        mentor: c.Usuario_GCCallAttempt_gameChangerIdToUsuario
      }))
    ].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())

    // 2. RESPUESTAS A TAREAS DE CUESTIONARIO (TrainerMission + MissionSubmission)
    const missionSubmissions = await prisma.missionSubmission.findMany({
      where: { userId: userId },
      orderBy: { submittedAt: 'desc' },
      include: {
        TrainerMission: {
          include: {
            TrainerTaskTemplate: {
              include: {
                TrainerTaskQuestion: {
                  orderBy: { orderIndex: 'asc' }
                }
              }
            },
            Usuario: {
              select: {
                id: true,
                nombre: true,
                imagen: true
              }
            },
            SchoolProduct: {
              select: {
                id: true,
                name: true,
                levelType: true
              }
            }
          }
        },
        MissionQuestionAnswer: {
          include: {
            TrainerTaskQuestion: true
          }
        },
        Usuario_MissionSubmission_reviewedByToUsuario: {
          select: {
            id: true,
            nombre: true
          }
        }
      }
    })

    // 3. RESPUESTAS DE REGISTRO AVANZADO (Pre-registros para avanzar)
    const advancedRegistrations = await prisma.advancedPreRegistration.findMany({
      where: { userId: userId },
      orderBy: { scannedAt: 'desc' },
      select: {
        id: true,
        status: true,
        scannedAt: true,
        promoPrice: true,
        regularPrice: true,
        promoDeadline: true,
        paidAt: true,
        paymentAmount: true,
        paymentMethod: true,
        SchoolProduct_AdvancedPreRegistration_currentProductIdToSchoolProduct: {
          select: {
            id: true,
            name: true,
            levelType: true
          }
        },
        SchoolProduct_AdvancedPreRegistration_targetProductIdToSchoolProduct: {
          select: {
            id: true,
            name: true,
            levelType: true
          }
        },
        Usuario_AdvancedPreRegistration_scannedByStaffIdToUsuario: {
          select: {
            id: true,
            nombre: true
          }
        }
      }
    })

    // 4. QUIZ MÉDICO
    const medicalForm = await prisma.medicalForm.findUnique({
      where: { userId: userId },
      include: {
        Vision: {
          select: {
            id: true,
            nombre: true
          }
        }
      }
    })

    // 5. HISTORIAL DE ENROLLMENTS Y PRODUCTOS
    const enrollments = await prisma.vision_enrollments.findMany({
      where: { userId: userId },
      orderBy: { enrolledAt: 'desc' },
      include: {
        Vision: {
          select: {
            id: true,
            nombre: true
          }
        }
      }
    })

    // Check-ins a productos
    const checkIns = await prisma.checkInRecord.findMany({
      where: { userId: userId },
      orderBy: { checkInTime: 'desc' },
      take: 20,
      select: {
        id: true,
        checkInTime: true,
        checkInMethod: true,
        ticketValidated: true,
        medicalFormValidated: true,
        photoValidated: true,
        SchoolProduct: {
          select: {
            id: true,
            name: true,
            levelType: true,
            startDate: true
          }
        }
      }
    })

    // 6. CARTA FRUTOS (metas y declaraciones)
    const cartaFrutos = await prisma.cartaFrutos.findFirst({
      where: { usuarioId: userId },
      orderBy: { fechaCreacion: 'desc' },
      select: {
        id: true,
        estado: true,
        approvedAt: true,
        fechaCreacion: true,
        // Declaraciones
        finanzasDeclaracion: true,
        relacionesDeclaracion: true,
        talentosDeclaracion: true,
        saludDeclaracion: true,
        pazMentalDeclaracion: true,
        ocioDeclaracion: true,
        servicioTransDeclaracion: true,
        servicioComunDeclaracion: true,
        // Metas
        finanzasMeta: true,
        relacionesMeta: true,
        talentosMeta: true,
        saludMeta: true,
        pazMentalMeta: true,
        ocioMeta: true,
        servicioTransMeta: true,
        servicioComunMeta: true,
        enrolamientoMeta: true,
        // Avances
        finanzasAvance: true,
        relacionesAvance: true,
        talentosAvance: true,
        saludAvance: true,
        pazMentalAvance: true,
        ocioAvance: true,
        servicioTransAvance: true,
        servicioComunAvance: true,
        enrolamientoAvance: true,
        invitadosInscritos: true
      }
    })

    // 7. ESTADÍSTICAS DE TAREAS
    const taskStats = await prisma.taskInstance.groupBy({
      by: ['status'],
      where: { usuarioId: userId },
      _count: true
    })

    const stats = {
      total: 0,
      completed: 0,
      pending: 0,
      cancelled: 0
    }

    taskStats.forEach(stat => {
      stats.total += stat._count
      if (stat.status === 'COMPLETED') stats.completed = stat._count
      if (stat.status === 'PENDING') stats.pending = stat._count
    })

    // Formatear respuesta del TOP FILE
    const topFile = {
      // Información básica
      usuario: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        apodo: user.apodo,
        telefono: user.telefono,
        imagen: user.imagen || user.profileImage,
        fechaRegistro: user.createdAt,
        rol: user.rol,
        tier: user.tier,
        organizacion: user.Organization_Usuario_organizationIdToOrganization
      },

      // Sección de llamadas
      llamadas: {
        total: callHistory.length,
        completadas: callHistory.filter(c => c.estado === 'COMPLETED').length,
        pendientes: callHistory.filter(c => c.estado === 'PENDING' || c.estado === 'NOT_STARTED').length,
        perdidas: callHistory.filter(c => c.estado === 'MISSED' || c.estado === 'NO_SHOW' || c.estado === 'NO_ANSWER').length,
        gcCalls: gcCallLogs.length,
        gcAttempts: gcCallAttempts.length,
        historial: callHistory.filter(c => c.tipo === 'MENTORIA'),
        llamadasGC: gcCallLogs.map(c => ({
          id: c.id,
          fecha: c.callStartedAt || c.createdAt,
          estado: c.callStatus,
          duracion: c.duration,
          notas: c.notes,
          calificacion: c.potentialRating,
          tipoEntrenamiento: c.trainingType,
          diaEntrenamiento: c.trainingDay,
          compromiso: c.commitment,
          enRiesgo: c.isAtRisk,
          razonRiesgo: c.riskReason,
          gameChanger: c.Usuario_GCCallLog_gameChangerIdToUsuario,
          vision: c.Vision
        })),
        intentosGC: gcCallAttempts.map(c => ({
          id: c.id,
          fecha: c.attemptedAt,
          resultado: c.completed ? 'COMPLETED' : 'ATTEMPTED',
          notas: c.notes,
          calificacion: c.potentialRating,
          tipoEntrenamiento: c.trainingType,
          diaEntrenamiento: c.trainingDay,
          intentoNumero: c.attemptNumber,
          gameChanger: c.Usuario_GCCallAttempt_gameChangerIdToUsuario
        }))
      },

      // Sección de cuestionarios y tareas de trainer
      cuestionarios: {
        total: missionSubmissions.length,
        completados: missionSubmissions.filter(m => m.status === 'APPROVED').length,
        pendientes: missionSubmissions.filter(m => m.status === 'PENDING').length,
        respuestas: missionSubmissions.map(sub => ({
          id: sub.id,
          estado: sub.status,
          fechaEnvio: sub.submittedAt,
          fechaRevision: sub.reviewedAt,
          notaRevision: sub.reviewNote,
          puntosGanados: sub.pointsEarned,
          respuestaTexto: sub.textResponse,
          evidencia: sub.evidenceUrl,
          notaAprendizaje: sub.learningNote,
          mision: sub.TrainerMission ? {
            id: sub.TrainerMission.id,
            titulo: sub.TrainerMission.TrainerTaskTemplate?.title,
            descripcion: sub.TrainerMission.TrainerTaskTemplate?.description,
            tipo: sub.TrainerMission.TrainerTaskTemplate?.type,
            tags: sub.TrainerMission.TrainerTaskTemplate?.tags,
            mensajeTrainer: sub.TrainerMission.trainerMessage,
            fechaLanzamiento: sub.TrainerMission.releaseAt,
            fechaLimite: sub.TrainerMission.deadlineAt,
            trainer: sub.TrainerMission.Usuario,
            producto: sub.TrainerMission.SchoolProduct,
            preguntas: sub.TrainerMission.TrainerTaskTemplate?.TrainerTaskQuestion
          } : null,
          respuestasPreguntas: sub.MissionQuestionAnswer?.map((qa: any) => ({
            pregunta: qa.TrainerTaskQuestion?.questionText,
            tipoPregunta: qa.TrainerTaskQuestion?.questionType,
            respuestaTexto: qa.textAnswer,
            opcionesSeleccionadas: qa.selectedOptions,
            valorEscala: qa.scaleValue,
            respuestaBooleana: qa.booleanAnswer
          })) || [],
          revisor: sub.Usuario_MissionSubmission_reviewedByToUsuario
        }))
      },

      // Sección de pre-registros avanzados
      preRegistros: {
        total: advancedRegistrations.length,
        pagados: advancedRegistrations.filter(r => r.status === 'PAID').length,
        pendientes: advancedRegistrations.filter(r => r.status === 'PENDING').length,
        historial: advancedRegistrations.map(reg => ({
          id: reg.id,
          estado: reg.status,
          fechaEscaneo: reg.scannedAt,
          precioPromo: reg.promoPrice,
          precioRegular: reg.regularPrice,
          fechaLimitePromo: reg.promoDeadline,
          fechaPago: reg.paidAt,
          montoPagado: reg.paymentAmount,
          metodoPago: reg.paymentMethod,
          productoOrigen: reg.SchoolProduct_AdvancedPreRegistration_currentProductIdToSchoolProduct,
          productoDestino: reg.SchoolProduct_AdvancedPreRegistration_targetProductIdToSchoolProduct,
          escaneadoPor: reg.Usuario_AdvancedPreRegistration_scannedByStaffIdToUsuario
        }))
      },

      // Quiz médico
      quizMedico: medicalForm ? {
        completado: true,
        fechaCreacion: medicalForm.createdAt,
        fechaFirma: medicalForm.signedAt,
        tieneAlertas: medicalForm.hasAlerts,
        vision: medicalForm.Vision ? { id: medicalForm.Vision.id, name: medicalForm.Vision.nombre } : null,
        condiciones: {
          enfermedadActual: { tiene: medicalForm.hasCurrentIllness, detalles: medicalForm.currentIllnessDetails },
          tratamientoActual: { tiene: medicalForm.hasCurrentTreatment, detalles: medicalForm.currentTreatmentDetails },
          tomaMedicamentos: { tiene: medicalForm.takesMedication, detalles: medicalForm.medicationDetails },
          alergias: { tiene: medicalForm.hasAllergies, detalles: medicalForm.allergyDetails },
          cirugias: { tiene: medicalForm.hadSurgery, detalles: medicalForm.surgeryDetails },
          hospitalizaciones: { tiene: medicalForm.wasHospitalized, detalles: medicalForm.hospitalizationDetails },
          enfermedadCronica: { tiene: medicalForm.hasChronicIllness, detalles: medicalForm.chronicIllnessDetails },
          lesionFisica: { tiene: medicalForm.hasPhysicalInjury, detalles: medicalForm.physicalInjuryDetails },
          restriccionesActividad: { tiene: medicalForm.hasActivityRestrictions, detalles: medicalForm.activityRestrictionDetails },
          condicionPsicologica: { tiene: medicalForm.hasPsychologicalCondition, detalles: medicalForm.psychologicalConditionDetails }
        },
        contactoEmergencia: {
          nombre: medicalForm.emergencyContactName,
          relacion: medicalForm.emergencyContactRelation,
          telefono: medicalForm.emergencyContactPhone
        }
      } : {
        completado: false
      },

      // Enrollments y productos
      historialProductos: {
        enrollments: enrollments.map(e => ({
          id: e.id,
          nivel: e.level,
          estado: e.enrollmentStatus,
          fechaInscripcion: e.enrolledAt,
          vision: e.Vision ? { id: e.Vision.id, name: e.Vision.nombre } : null
        })),
        checkIns: checkIns.map(ci => ({
          id: ci.id,
          fecha: ci.checkInTime,
          metodo: ci.checkInMethod,
          producto: ci.SchoolProduct,
          validaciones: {
            ticket: ci.ticketValidated,
            formaMedica: ci.medicalFormValidated,
            foto: ci.photoValidated
          }
        }))
      },

      // Carta Frutos
      cartaFrutos: cartaFrutos ? {
        id: cartaFrutos.id,
        estado: cartaFrutos.estado,
        fechaAprobacion: cartaFrutos.approvedAt,
        fechaCreacion: cartaFrutos.fechaCreacion,
        declaraciones: {
          finanzas: cartaFrutos.finanzasDeclaracion,
          relaciones: cartaFrutos.relacionesDeclaracion,
          talentos: cartaFrutos.talentosDeclaracion,
          salud: cartaFrutos.saludDeclaracion,
          pazMental: cartaFrutos.pazMentalDeclaracion,
          ocio: cartaFrutos.ocioDeclaracion,
          servicioTrans: cartaFrutos.servicioTransDeclaracion,
          servicioComunidad: cartaFrutos.servicioComunDeclaracion
        },
        metas: {
          finanzas: { meta: cartaFrutos.finanzasMeta, avance: cartaFrutos.finanzasAvance },
          relaciones: { meta: cartaFrutos.relacionesMeta, avance: cartaFrutos.relacionesAvance },
          talentos: { meta: cartaFrutos.talentosMeta, avance: cartaFrutos.talentosAvance },
          salud: { meta: cartaFrutos.saludMeta, avance: cartaFrutos.saludAvance },
          pazMental: { meta: cartaFrutos.pazMentalMeta, avance: cartaFrutos.pazMentalAvance },
          ocio: { meta: cartaFrutos.ocioMeta, avance: cartaFrutos.ocioAvance },
          servicioTrans: { meta: cartaFrutos.servicioTransMeta, avance: cartaFrutos.servicioTransAvance },
          servicioComunidad: { meta: cartaFrutos.servicioComunMeta, avance: cartaFrutos.servicioComunAvance },
          enrolamiento: { 
            meta: cartaFrutos.enrolamientoMeta, 
            avance: cartaFrutos.enrolamientoAvance,
            invitadosInscritos: cartaFrutos.invitadosInscritos
          }
        }
      } : null,

      // Estadísticas de tareas
      estadisticasTareas: stats,

      // Quiz Avanzado - TODO: Implementar cuando exista el modelo
      quizAvanzado: {
        completado: false,
        mensaje: 'Quiz de Avanzado pendiente de implementación'
      },

      // Quiz PL - TODO: Implementar cuando exista el modelo
      quizPL: {
        completado: false,
        mensaje: 'Quiz de PL pendiente de implementación'
      }
    }

    return NextResponse.json({
      success: true,
      topFile
    })

  } catch (error) {
    logger.error('Error obteniendo TOP FILE:', error)
    console.error('TOP FILE ERROR DETAILS:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
