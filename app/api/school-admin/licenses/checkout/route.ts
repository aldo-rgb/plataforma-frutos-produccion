import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    logger.debug('🛒 Iniciando proceso de checkout...');
    
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      logger.error('❌ No hay sesión activa o falta user.id');
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    logger.debug('✅ Usuario autenticado:', session.user.email);

    // Verificar que el usuario es director
    const user = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      include: {
        ManagedOrganization: true,
      },
    });

    if (!user || user.rol !== 'SCHOOL_ADMIN') {
      logger.error('❌ Usuario no es SCHOOL_ADMIN:', user?.rol);
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 403 }
      );
    }

    logger.debug('✅ Usuario verificado como SCHOOL_ADMIN');

    const body = await req.json();
    const { orderId, paymentMethod, proofUrl } = body;

    logger.debug('📦 Datos recibidos:', { orderId, paymentMethod, proofUrl: proofUrl ? '✅' : '❌' });

    if (!orderId || !paymentMethod) {
      logger.error('❌ Datos incompletos');
      return NextResponse.json(
        { success: false, error: 'Datos incompletos' },
        { status: 400 }
      );
    }

    logger.debug('🔍 Buscando orden:', orderId);

    // Buscar la orden
    const order = await prisma.licenseOrder.findUnique({
      where: { id: orderId },
      include: {
        Organization: true,
      },
    });

    logger.debug('📋 Orden encontrada:', order ? '✅' : '❌');

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Orden no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que la orden pertenece al director
    if (order.requestedBy !== user.id) {
      return NextResponse.json(
        { success: false, error: 'No autorizado para esta orden' },
        { status: 403 }
      );
    }

    // Verificar que la orden está pendiente
    if (order.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: 'Esta orden ya ha sido procesada' },
        { status: 400 }
      );
    }

    // Procesar según el método de pago
    logger.debug('💳 Método de pago seleccionado:', paymentMethod);
    
    // Preservar paymentData original (funciona tanto para string como objeto)
    let existingPaymentData: any = {};
    try {
      if (order.paymentData) {
        if (typeof order.paymentData === 'string') {
          existingPaymentData = JSON.parse(order.paymentData);
        } else {
          existingPaymentData = order.paymentData;
        }
      }
      logger.debug('📦 PaymentData existente:', existingPaymentData);
    } catch (error) {
      logger.error('⚠️ Error parseando paymentData, usando objeto vacío:', error);
      existingPaymentData = {};
    }
    
    if (paymentMethod === 'transfer') {
      logger.debug('💸 Procesando pago por transferencia...');
      
      // Para transferencia, solo actualizamos el método de pago y guardamos el comprobante
      // El director recibirá instrucciones por correo/pantalla
      const updatedOrder = await prisma.licenseOrder.update({
        where: { id: orderId },
        data: {
          status: 'PROCESSING', // Cambiar a PROCESSING en lugar de PENDING
          paymentMethod: 'transfer',
          paymentData: {
            ...existingPaymentData, // Preservar datos originales (como VISION_MENTOR_PAYMENT)
            method: 'transfer',
            proofUrl: proofUrl || null, // URL del comprobante
            uploadedAt: new Date().toISOString(),
            instructions: {
              bank: 'BBVA',
              account: '0123456789',
              clabe: '012345678901234567',
              beneficiary: 'Frutos del Espíritu A.C.',
              reference: orderId,
            },
          },
        },
      });

      logger.debug('✅ Orden actualizada a PROCESSING');

      return NextResponse.json({
        success: true,
        order: updatedOrder,
        paymentMethod: 'transfer',
        instructions: {
          bank: 'BBVA',
          account: '0123456789',
          clabe: '012345678901234567',
          beneficiary: 'Frutos del Espíritu A.C.',
          reference: orderId,
          amount: order.amount,
        },
      });
    } else if (paymentMethod === 'stripe') {
      logger.debug('💳 Procesando pago con Stripe (simulación)...');
      
      // Para Stripe simulado, marcamos como COMPLETED y generamos créditos
      const updatedOrder = await prisma.licenseOrder.update({
        where: { id: orderId },
        data: {
          status: 'COMPLETED',
          paymentMethod: 'stripe',
          paidAt: new Date(),
          paymentData: {
            ...existingPaymentData, // Preservar datos originales
            method: 'stripe',
            status: 'completed',
            paidAt: new Date().toISOString(),
            transactionId: `STRIPE-${orderId.slice(0, 8)}-${Date.now()}`,
          },
        },
      });

      logger.debug('✅ Orden marcada como COMPLETED con Stripe');

      // Verificar si es un pago de visión (mentorías) o de licencias
      const isVisionPayment = existingPaymentData?.type === 'VISION_MENTOR_PAYMENT';
      
      if (isVisionPayment) {
        logger.debug('🎯 Pago de VISIÓN detectado - Creando MentorPackageOrder y VisionMentor');
        
        const visionId = existingPaymentData.visionId;
        const mentorAssignments = existingPaymentData.mentorAssignments || [];
        
        // Crear MentorPackageOrder y VisionMentor para cada mentor
        for (const assignment of mentorAssignments) {
          const { mentorId, studentCount, ratePerCall } = assignment;
          const totalSessions = studentCount * 18; // 18 llamadas por estudiante
          const totalCost = totalSessions * ratePerCall;
          
          // Crear MentorPackageOrder
          const packageOrder = await prisma.mentorPackageOrder.create({
            data: {
              usuarioId: updatedOrder.requestedBy, // Director que compró
              mentorId: mentorId,
              visionId: visionId,
              organizationId: updatedOrder.organizationId,
              cantidad: totalSessions,
              precioUnitario: ratePerCall,
              precioTotal: totalCost,
              currency: 'MXN',
              metodoPago: 'stripe',
              status: 'COMPLETED',
              externalPaymentId: `STRIPE-${orderId}`,
              paidAt: new Date(),
            },
          });
          
          logger.debug(`📦 MentorPackageOrder creado: ${packageOrder.id} para mentor ${mentorId}`);
          
          // Verificar si ya existe VisionMentor para evitar duplicados
          const existingVisionMentor = await prisma.visionMentor.findFirst({
            where: {
              visionId: visionId,
              mentorId: mentorId,
            },
          });
          
          if (!existingVisionMentor) {
            // Crear VisionMentor para asignar el mentor a la visión
            await prisma.visionMentor.create({
              data: {
                visionId: visionId,
                mentorId: mentorId,
                assignedById: updatedOrder.requestedBy,
              },
            });
            
            logger.debug(`✅ VisionMentor creado para mentor ${mentorId} en visión ${visionId}`);
          } else {
            logger.debug(`ℹ️  VisionMentor ya existe para mentor ${mentorId} en visión ${visionId}`);
          }
        }
        
        return NextResponse.json({
          success: true,
          order: updatedOrder,
          paymentType: 'vision',
          message: 'Pago de mentorías procesado exitosamente',
        });
      }

      // Si NO es pago de visión, generar créditos de licencias
      // Actualizar o crear los créditos de licencia
      logger.debug(`🎫 Agregando ${order.quantity} créditos para organización ${order.organizationId}...`);
      
      // Buscar crédito existente o crear uno nuevo
      const existingCredit = await prisma.schoolCredit.findFirst({
        where: {
          organizationId: order.organizationId,
          isActive: true,
        },
      });

      let creditRecord;
      if (existingCredit) {
        // Actualizar crédito existente
        creditRecord = await prisma.schoolCredit.update({
          where: { id: existingCredit.id },
          data: {
            totalPurchased: existingCredit.totalPurchased + order.quantity,
            totalPaid: existingCredit.totalPaid + order.amount,
            expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Extender 1 año
          },
        });
      } else {
        // Crear nuevo registro de crédito
        creditRecord = await prisma.schoolCredit.create({
          data: {
            organizationId: order.organizationId,
            planType: order.tier as any,
            totalPurchased: order.quantity,
            totalAllocated: 0,
            unitPrice: order.amount / order.quantity,
            totalPaid: order.amount,
            expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 año
            isActive: true,
            notes: `Pago con Stripe - Orden ${orderId}`,
          },
        });
      }

      logger.debug(`✅ Créditos actualizados: ${creditRecord.totalPurchased} total`);

      return NextResponse.json({
        success: true,
        order: updatedOrder,
        creditsGenerated: order.quantity,
        totalCredits: creditRecord.totalPurchased,
        message: 'Pago procesado exitosamente con Stripe',
      });
    } else if (paymentMethod === 'paypal') {
      logger.debug('💳 Procesando pago con PayPal (simulación)...');
      
      try {
        // Para PayPal simulado, marcamos como COMPLETED y generamos créditos
        const updatedOrder = await prisma.licenseOrder.update({
          where: { id: orderId },
          data: {
            status: 'COMPLETED',
            paymentMethod: 'paypal',
            paidAt: new Date(),
            paymentData: existingPaymentData
              ? {
                  ...(typeof existingPaymentData === 'object' ? existingPaymentData : JSON.parse(existingPaymentData as string)),
                  method: 'paypal',
                  status: 'completed',
                  paidAt: new Date().toISOString(),
                  transactionId: `PAYPAL-${orderId.slice(0, 8)}-${Date.now()}`,
                }
              : {
                  method: 'paypal',
                  status: 'completed',
                  paidAt: new Date().toISOString(),
                  transactionId: `PAYPAL-${orderId.slice(0, 8)}-${Date.now()}`,
                },
          },
        });

        logger.debug('✅ Orden marcada como COMPLETED con PayPal');

        // Verificar si es un pago de visión (mentorías) o de licencias
        const isVisionPaymentPaypal = existingPaymentData?.type === 'VISION_MENTOR_PAYMENT';
        
        if (isVisionPaymentPaypal) {
          logger.debug('🎯 Pago de VISIÓN detectado - Creando MentorPackageOrder y VisionMentor');
          
          const visionId = existingPaymentData.visionId;
          const mentorAssignments = existingPaymentData.mentorAssignments || [];
          
          // Crear MentorPackageOrder y VisionMentor para cada mentor
          for (const assignment of mentorAssignments) {
            const { mentorId, studentCount, ratePerCall } = assignment;
            const totalSessions = studentCount * 18;
            const totalCost = totalSessions * ratePerCall;
            
            // Crear MentorPackageOrder
            const packageOrder = await prisma.mentorPackageOrder.create({
              data: {
                usuarioId: updatedOrder.requestedBy,
                mentorId: mentorId,
                visionId: visionId,
                organizationId: updatedOrder.organizationId,
                cantidad: totalSessions,
                precioUnitario: ratePerCall,
                precioTotal: totalCost,
                currency: 'MXN',
                metodoPago: 'paypal',
                status: 'COMPLETED',
                externalPaymentId: `PAYPAL-${orderId}`,
                paidAt: new Date(),
              },
            });
            
            logger.debug(`📦 MentorPackageOrder creado: ${packageOrder.id} para mentor ${mentorId}`);
            
            // Verificar si ya existe VisionMentor
            const existingVisionMentor = await prisma.visionMentor.findFirst({
              where: { visionId: visionId, mentorId: mentorId },
            });
            
            if (!existingVisionMentor) {
              await prisma.visionMentor.create({
                data: {
                  visionId: visionId,
                  mentorId: mentorId,
                  assignedById: updatedOrder.requestedBy,
                },
              });
              logger.debug(`✅ VisionMentor creado para mentor ${mentorId}`);
            }
          }
          
          return NextResponse.json({
            success: true,
            order: updatedOrder,
            paymentType: 'vision',
            message: 'Pago de mentorías procesado exitosamente con PayPal',
          });
        }

        // Si NO es pago de visión, generar créditos de licencias
        // Actualizar o crear los créditos de licencia
        logger.debug(`🎫 Agregando ${order.quantity} créditos para organización ${order.organizationId}...`);
        
        // Buscar crédito existente o crear uno nuevo
        const existingCredit = await prisma.schoolCredit.findFirst({
          where: {
            organizationId: order.organizationId,
            isActive: true,
          },
        });

        let creditRecord;
        if (existingCredit) {
          // Actualizar crédito existente
          creditRecord = await prisma.schoolCredit.update({
            where: { id: existingCredit.id },
            data: {
              totalPurchased: existingCredit.totalPurchased + order.quantity,
              totalPaid: existingCredit.totalPaid + order.amount,
              expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Extender 1 año
            },
          });
        } else {
          // Crear nuevo registro de crédito
          creditRecord = await prisma.schoolCredit.create({
            data: {
              organizationId: order.organizationId,
              planType: order.tier as any,
              totalPurchased: order.quantity,
              totalAllocated: 0,
              unitPrice: order.amount / order.quantity,
              totalPaid: order.amount,
              expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 año
              isActive: true,
              notes: `Pago con PayPal - Orden ${orderId}`,
            },
          });
        }

        logger.debug(`✅ Créditos actualizados: ${creditRecord.totalPurchased} total`);

        return NextResponse.json({
          success: true,
          order: updatedOrder,
          creditsGenerated: order.quantity,
          totalCredits: creditRecord.totalPurchased,
          message: 'Pago procesado exitosamente con PayPal',
        });
      } catch (error: any) {
        logger.error('❌ Error en PayPal:', error);
        return NextResponse.json({
          success: false,
          error: 'Error al procesar pago con PayPal',
          details: error.message
        }, { status: 500 });
      }
    } else if (paymentMethod === 'mercadopago') {
      logger.debug('💳 Procesando pago con Mercado Pago (simulación)...');
      
      // Para Mercado Pago simulado, marcamos como COMPLETED y generamos créditos
      const updatedOrder = await prisma.licenseOrder.update({
        where: { id: orderId },
        data: {
          status: 'COMPLETED',
          paymentMethod: 'mercadopago',
          paidAt: new Date(),
          paymentData: {
            ...existingPaymentData, // Preservar datos originales
            method: 'mercadopago',
            status: 'completed',
            paidAt: new Date().toISOString(),
            transactionId: `MP-${orderId.slice(0, 8)}-${Date.now()}`,
          },
        },
      });

      logger.debug('✅ Orden marcada como COMPLETED con Mercado Pago');

      // Verificar si es un pago de visión (mentorías) o de licencias
      const isVisionPaymentMP = existingPaymentData?.type === 'VISION_MENTOR_PAYMENT';
      
      if (isVisionPaymentMP) {
        logger.debug('🎯 Pago de VISIÓN detectado - Creando MentorPackageOrder y VisionMentor');
        
        const visionId = existingPaymentData.visionId;
        const mentorAssignments = existingPaymentData.mentorAssignments || [];
        
        // Crear MentorPackageOrder y VisionMentor para cada mentor
        for (const assignment of mentorAssignments) {
          const { mentorId, studentCount, ratePerCall } = assignment;
          const totalSessions = studentCount * 18;
          const totalCost = totalSessions * ratePerCall;
          
          // Crear MentorPackageOrder
          const packageOrder = await prisma.mentorPackageOrder.create({
            data: {
              usuarioId: updatedOrder.requestedBy,
              mentorId: mentorId,
              visionId: visionId,
              organizationId: updatedOrder.organizationId,
              cantidad: totalSessions,
              precioUnitario: ratePerCall,
              precioTotal: totalCost,
              currency: 'MXN',
              metodoPago: 'mercadopago',
              status: 'COMPLETED',
              externalPaymentId: `MP-${orderId}`,
              paidAt: new Date(),
            },
          });
          
          logger.debug(`📦 MentorPackageOrder creado: ${packageOrder.id} para mentor ${mentorId}`);
          
          // Verificar si ya existe VisionMentor
          const existingVisionMentor = await prisma.visionMentor.findFirst({
            where: { visionId: visionId, mentorId: mentorId },
          });
          
          if (!existingVisionMentor) {
            await prisma.visionMentor.create({
              data: {
                visionId: visionId,
                mentorId: mentorId,
                assignedById: updatedOrder.requestedBy,
              },
            });
            logger.debug(`✅ VisionMentor creado para mentor ${mentorId}`);
          }
        }
        
        return NextResponse.json({
          success: true,
          order: updatedOrder,
          paymentType: 'vision',
          message: 'Pago de mentorías procesado exitosamente con Mercado Pago',
        });
      }

      // Si NO es pago de visión, generar créditos de licencias
      // Actualizar o crear los créditos de licencia
      logger.debug(`🎫 Agregando ${order.quantity} créditos para organización ${order.organizationId}...`);
      
      // Buscar crédito existente o crear uno nuevo
      const existingCredit = await prisma.schoolCredit.findFirst({
        where: {
          organizationId: order.organizationId,
          isActive: true,
        },
      });

      let creditRecord;
      if (existingCredit) {
        // Actualizar crédito existente
        creditRecord = await prisma.schoolCredit.update({
          where: { id: existingCredit.id },
          data: {
            totalPurchased: existingCredit.totalPurchased + order.quantity,
            totalPaid: existingCredit.totalPaid + order.amount,
            expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Extender 1 año
          },
        });
      } else {
        // Crear nuevo registro de crédito
        creditRecord = await prisma.schoolCredit.create({
          data: {
            organizationId: order.organizationId,
            planType: order.tier as any,
            totalPurchased: order.quantity,
            totalAllocated: 0,
            unitPrice: order.amount / order.quantity,
            totalPaid: order.amount,
            expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 año
            isActive: true,
            notes: `Pago con Mercado Pago - Orden ${orderId}`,
          },
        });
      }

      logger.debug(`✅ Créditos actualizados: ${creditRecord.totalPurchased} total`);

      return NextResponse.json({
        success: true,
        order: updatedOrder,
        creditsGenerated: order.quantity,
        totalCredits: creditRecord.totalPurchased,
        message: 'Pago procesado exitosamente con Mercado Pago',
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Método de pago no soportado' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    logger.error('❌ Error en checkout:', error);
    logger.error('Stack trace:', error.stack);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al procesar el pago',
        details: error.message || 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
