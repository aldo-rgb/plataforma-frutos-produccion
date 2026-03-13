import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import logger from '@/lib/logger';
import crypto from 'crypto';
import { processAmbassadorCommission, determineProductType } from '@/lib/ambassador-engine';
import { autoCreateMedicalFormInTransaction } from '@/lib/medical-form-helper';

/**
 * POST /api/treasury/register-basic
 * 
 * Registra un nuevo usuario con pago Básico desde Tesorería Express.
 * El participante seleccionado es el PADRINO que invita al nuevo usuario.
 * 
 * Body esperado:
 * - nombre: string (nombre del nuevo participante)
 * - email: string 
 * - telefono: string
 * - fechaNacimiento?: string
 * - visionId: number
 * - padrinoId: number (ID del usuario que invita/paga - el participante seleccionado)
 * - amount: number
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que el usuario tiene permisos de tesorería o coordinador
    const currentUser = await prisma.usuario.findUnique({
      where: { id: Number(session.user.id) },
      select: { 
        id: true, 
        rol: true, 
        organizationId: true,
        nombre: true
      }
    });

    if (!currentUser) {
      return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 });
    }

    const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'COORDINADOR', 'TESORERO', 'DIRECTOR', 'SUBDIRECTOR', 'SCHOOL_ADMIN'];
    if (!allowedRoles.includes(currentUser.rol)) {
      return NextResponse.json({ success: false, error: 'Sin permisos para esta acción' }, { status: 403 });
    }

    const body = await request.json();
    
    // Soportar ambos formatos (nuevo y legacy)
    let visionId, nombre, fechaNacimiento, email, telefono, amount, padrinoId, priceType;
    
    if (body.userData) {
      // Formato legacy
      visionId = body.visionId;
      nombre = body.userData.nombre;
      fechaNacimiento = body.userData.fechaNacimiento;
      email = body.userData.email;
      telefono = body.userData.telefono;
      amount = body.amount;
      padrinoId = body.padrinoId || null;
      priceType = body.priceType || 'BASIC';
    } else {
      // Formato nuevo
      visionId = body.visionId;
      nombre = body.nombre;
      fechaNacimiento = body.fechaNacimiento;
      email = body.email;
      telefono = body.telefono;
      amount = body.amount;
      padrinoId = body.padrinoId || null;
      priceType = body.priceType || 'BASIC'; // BASIC, COMBO, etc.
    }
    
    // Determinar si es COMBO (Básico + Avanzado + Liderato)
    const isCombo = priceType === 'COMBO' || priceType === 'BASIC_COMBO';

    // Validaciones básicas - ya NO requerimos visionId, lo buscaremos automáticamente
    if (!nombre || !email || !amount) {
      return NextResponse.json({ 
        success: false, 
        error: 'Datos incompletos. Se requiere nombre, email y amount' 
      }, { status: 400 });
    }

    // Verificar que el email no exista
    const existingUser = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (existingUser) {
      return NextResponse.json({ 
        success: false, 
        error: 'Ya existe un usuario con este correo electrónico' 
      }, { status: 400 });
    }

    // Si hay padrino, verificar que existe y obtener su organización
    let padrinoData = null;
    let organizationId: number | null = null;
    
    if (padrinoId) {
      padrinoData = await prisma.usuario.findUnique({
        where: { id: parseInt(padrinoId) },
        select: { id: true, nombre: true, invitedCount: true, organizationId: true, referralCode: true, isGraduated: true }
      });
      
      if (!padrinoData) {
        logger.warn(`⚠️ [Treasury] Padrino ID ${padrinoId} no encontrado`);
      } else {
        organizationId = padrinoData.organizationId;
      }
    }

    // Si no tenemos organizationId del padrino, usar la del usuario actual
    if (!organizationId) {
      organizationId = currentUser.organizationId;
    }

    if (!organizationId) {
      return NextResponse.json({ 
        success: false, 
        error: 'No se pudo determinar la organización' 
      }, { status: 400 });
    }

    // 🎯 BUSCAR LA PRÓXIMA VISIÓN BÁSICO VIGENTE (igual que signup)
    // Solo visiones que AÚN NO HAN INICIADO
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const nextBasicVision = await prisma.vision.findFirst({
      where: {
        organizationId: organizationId,
        isActive: true,
        enabledLevels: {
          has: 'BASIC'
        },
        // La visión es válida para registro si:
        // - No tiene startDate definido (inscripción siempre abierta)
        // - O su startDate es mayor a hoy (aún no ha iniciado)
        OR: [
          { startDate: null },
          { startDate: { gt: today } }
        ]
      },
      orderBy: {
        startDate: 'asc'
      },
      select: {
        id: true,
        nombre: true,
        organizationId: true,
        startDate: true,
        endDate: true,
        Organization: {
          select: { id: true, name: true }
        }
      }
    });

    if (!nextBasicVision) {
      return NextResponse.json({ 
        success: false, 
        error: 'No hay visiones Básico disponibles para registro. Todas las visiones ya han iniciado.' 
      }, { status: 400 });
    }

    const vision = nextBasicVision;
    logger.info(`🎯 [Treasury] Visión Básico seleccionada automáticamente: ${vision.nombre} (ID: ${vision.id})`);

    // Verificar que la visión tiene organización
    if (!vision.organizationId) {
      return NextResponse.json({ 
        success: false, 
        error: 'La visión no tiene organización asignada' 
      }, { status: 400 });
    }

    // Generar contraseña por defecto
    const defaultPassword = 'Quantum123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // Generar código de referido único
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const nombreLimpio = nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z]/g, '').toUpperCase();
    const prefix = nombreLimpio.substring(0, 3).padEnd(3, 'X');
    const generatedReferralCode = `${prefix}${timestamp}${random}`;

    // Crear usuario y registros en transacción
    const result = await prisma.$transaction(async (tx) => {
      // 1. Crear usuario con invitedBy si hay padrino
      const newUser = await tx.usuario.create({
        data: {
          email: email.toLowerCase().trim(),
          nombre: nombre.trim(),
          telefono: telefono?.trim() || '',
          birthdate: fechaNacimiento ? new Date(fechaNacimiento) : null,
          password: hashedPassword,
          requirePasswordChange: true, // Debe cambiar contraseña al primer login
          referralCode: generatedReferralCode,
          organizationId: vision.organizationId,
          rol: 'PARTICIPANTE',
          isActive: true,
          suscripcion: 'ACTIVO',
          invitedBy: padrinoData?.id || null, // 🎯 Vinculado al padrino
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      logger.info(`✅ [Treasury] Usuario creado: ${newUser.id} - ${newUser.email}${padrinoData ? ` (invitado por ${padrinoData.nombre})` : ''}`);

      // 2. Si hay padrino, incrementar su contador de invitados
      if (padrinoData) {
        await tx.usuario.update({
          where: { id: padrinoData.id },
          data: { 
            invitedCount: { increment: 1 },
            updatedAt: new Date()
          }
        });
        logger.info(`✅ [Treasury] Incrementado invitedCount de padrino ${padrinoData.nombre} (ID: ${padrinoData.id})`);
      }

      // 3. Definir niveles según tipo de compra
      // COMBO = Básico + Avanzado + Liderato (los 3 niveles)
      // Normal = Solo BASIC
      const ticketLevels: ('BASIC' | 'ADVANCED' | 'PL')[] = isCombo 
        ? ['BASIC', 'ADVANCED', 'PL'] 
        : ['BASIC'];
      
      logger.info(`🎫 [Treasury] Creando tickets para niveles: ${ticketLevels.join(', ')} (isCombo: ${isCombo})`);

      // 4. Crear tickets para cada nivel
      const createdTickets = [];
      const amountPerLevel = parseFloat(amount) / ticketLevels.length;
      
      for (const level of ticketLevels) {
        const ticket = await tx.ticket.create({
          data: {
            id: `TKT-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
            ownerId: newUser.id,
            organizationId: vision.organizationId!,
            visionId: vision.id,
            level: level,
            type: 'STANDARD',
            status: 'ACTIVE',
            paymentStatus: 'PAID',
            costAtPurchase: amountPerLevel,
            amountPaid: amountPerLevel,
            isTransferable: false,
            validUntil: vision.endDate || null,
            updatedAt: new Date(),
          },
        });
        createdTickets.push(ticket);
        logger.info(`✅ [Treasury] Ticket ${level} creado: ${ticket.id}`);
      }

      // Usar el primer ticket (BASIC) como referencia principal
      const basicTicket = createdTickets[0];

      // 5. Crear enrollments para cada nivel
      // Buscar un coordinador para esta visión
      const coordinator = await tx.vision_enrollments.findFirst({
        where: {
          visionId: vision.id,
          level: 'BASIC',
        },
        select: { coordinatorId: true },
      });

      for (const level of ticketLevels) {
        await tx.vision_enrollments.create({
          data: {
            userId: newUser.id,
            visionId: vision.id,
            coordinatorId: coordinator?.coordinatorId || currentUser.id,
            level: level,
            enrollmentStatus: 'ENROLLED',
            paymentStatus: 'PAID',
            invitedBy: padrinoData?.id || null,
            enrolledAt: new Date(),
            updatedAt: new Date(),
          },
        });
        logger.info(`✅ [Treasury] Enrollment ${level} creado para visión ${vision.id}`);
      }

      logger.info(`✅ [Treasury] ${ticketLevels.length} enrollments creados${padrinoData ? ` (invitado por ${padrinoData.nombre})` : ''}`);

      // 5.5. Auto-crear formulario médico si es visión 12
      const medicalFormResult = await autoCreateMedicalFormInTransaction(tx, newUser.id, vision.id);
      if (medicalFormResult.created) {
        logger.info(`✅ [Treasury] Formulario médico auto-creado para usuario ${newUser.id}`);
      }

      // 6. También crear registro en VisionParticipante (legacy, para compatibilidad)
      try {
        await tx.visionParticipante.create({
          data: {
            participanteId: newUser.id,
            visionId: vision.id,
            createdAt: new Date(),
          },
        });
        logger.info(`✅ [Treasury] VisionParticipante legacy creado`);
      } catch (err) {
        // Ignorar si la tabla legacy no existe o hay error
        logger.warn(`⚠️ [Treasury] No se pudo crear VisionParticipante legacy:`, err);
      }

      // 7. Crear PaymentCode ya como REDEEMED para registrar el ingreso en el corte
      const paymentCodeId = crypto.randomUUID();
      const codePrefix = isCombo ? 'FULL' : 'BASIC';
      const timestamp = Date.now().toString(36).toUpperCase();
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const paymentCodeValue = `${codePrefix}-${timestamp}-${randomSuffix}`;
      
      const referenceText = isCombo 
        ? `Full (B+A+L) - ${nombre} (Invitado por ${padrinoData?.nombre || 'Registro directo'})`
        : `Inscripción Básico - ${nombre} (Invitado por ${padrinoData?.nombre || 'Registro directo'})`;
      
      const paymentCode = await tx.paymentCode.create({
        data: {
          id: paymentCodeId,
          code: paymentCodeValue,
          amount: parseFloat(amount),
          reference: referenceText,
          status: 'REDEEMED',
          organizationId: vision.organizationId!,
          visionId: vision.id,
          createdById: currentUser.id,
          redeemedById: newUser.id,
          redeemedAt: new Date(),
        },
      });

      logger.info(`✅ [Treasury] PaymentCode REDEEMED creado: ${paymentCode.code} - $${amount}`);

      return {
        user: newUser,
        ticket: basicTicket,
        tickets: createdTickets,
        ticketLevels: ticketLevels,
        padrino: padrinoData,
        vision: vision,
        paymentCode: paymentCode,
        isCombo: isCombo
      };
    });

    logger.info(`🎉 [Treasury] Registro completo: Usuario ${result.user.id} inscrito en ${result.vision.nombre}${result.padrino ? ` (invitado por ${result.padrino.nombre})` : ''}`);

    // 🎁 PROCESAR COMISIÓN POR REFERIDO (si aplica)
    let ambassadorCommission = null;
    if (result.padrino?.referralCode && result.padrino?.isGraduated) {
      try {
        const productType = result.isCombo ? 'COMBO' : 'BASIC';
        const commissionResult = await processAmbassadorCommission({
          referralCode: result.padrino.referralCode,
          referredUserId: result.user.id,
          ticketId: result.ticket.id,
          productType: productType,
          saleAmount: parseFloat(amount),
          organizationId: result.vision.organizationId!,
          visionId: result.vision.id
        });
        
        if (commissionResult.success) {
          ambassadorCommission = {
            ambassadorId: commissionResult.ambassadorId,
            amount: commissionResult.commissionAmount
          };
          logger.info(`💰 [Treasury] Comisión generada: $${commissionResult.commissionAmount} para embajador ${commissionResult.ambassadorId}`);
        } else {
          logger.info(`ℹ️ [Treasury] Sin comisión: ${commissionResult.message}`);
        }
      } catch (commError) {
        logger.warn(`⚠️ [Treasury] Error al procesar comisión:`, commError);
        // No fallar el registro por error de comisión
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Usuario registrado exitosamente',
      usuario: {
        id: result.user.id,
        nombre: result.user.nombre,
        email: result.user.email,
      },
      enrollment: {
        ticketId: result.ticket.id,
        ticketLevel: result.ticket.level,
        visionId: result.vision.id,
        visionName: result.vision.nombre,
      },
      padrino: result.padrino ? {
        id: result.padrino.id,
        nombre: result.padrino.nombre
      } : null,
      paymentCode: {
        id: result.paymentCode.id,
        code: result.paymentCode.code,
        amount: Number(result.paymentCode.amount),
      },
      amount: parseFloat(amount),
      isCombo: result.isCombo,
      ticketLevels: result.ticketLevels,
      ticketsCreated: result.tickets?.length || 1,
      defaultPassword: 'Quantum123' // Para que el tesorero pueda informar al participante
    });

  } catch (error) {
    logger.error('❌ [Treasury] Error en register-basic:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Error al registrar usuario' 
    }, { status: 500 });
  }
}
