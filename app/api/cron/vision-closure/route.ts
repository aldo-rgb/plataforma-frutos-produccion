import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * 🔒 TICKET 4: Vision Closure & Final Audit
 * POST /api/cron/vision-closure
 * 
 * Cierra visiones finalizadas y procesa remanentes al wallet
 * Debe ejecutarse diariamente via cron job
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar API key para seguridad del cron
    const apiKey = request.headers.get('x-api-key');
    if (apiKey !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const now = new Date();

    // Buscar visiones que ya terminaron pero su escrow está activo
    const completedVisions = await prisma.vision.findMany({
      where: {
        fechaFin: {
          lt: now
        },
        VisionEscrow: {
          status: 'ACTIVE'
        }
      },
      include: {
        VisionEscrow: true,
        Organization: true,
      }
    });

    logger.debug(`🔍 Encontradas ${completedVisions.length} visiones para cerrar`);

    const results = [];

    for (const vision of completedVisions) {
      const escrow = vision.VisionEscrow;
      if (!escrow) continue;

      logger.debug(`\n📊 Procesando Visión: ${vision.nombre} (ID: ${vision.id})`);

      // Auditar el escrow
      const totalDeposited = Number(escrow.totalDeposited);
      const totalPaid = Number(escrow.totalPaid);
      const remainingBalance = Number(escrow.remainingBalance);
      const remanente = totalDeposited - totalPaid;

      logger.debug(`  💰 Total depositado: $${totalDeposited}`);
      logger.debug(`  💸 Total pagado: $${totalPaid}`);
      logger.debug(`  🏦 Remanente: $${remanente}`);

      if (Math.abs(remainingBalance - remanente) > 0.01) {
        logger.warn(`  ⚠️ Discrepancia en balance: esperado ${remanente}, actual ${remainingBalance}`);
      }

      // Procesar cierre
      const result = await prisma.$transaction(async (tx) => {
        // 1. Si hay remanente positivo, acreditar a wallet
        let walletTransaction = null;
        
        if (remanente > 0) {
          // Obtener o crear wallet
          let wallet = await tx.organizationWallet.findUnique({
            where: { organizationId: vision.organizationId }
          });

          if (!wallet) {
            wallet = await tx.organizationWallet.create({
              data: {
                organizationId: vision.organizationId,
                balance: 0,
                currency: 'MXN',
              }
            });
          }

          // Crear transacción de crédito
          walletTransaction = await tx.walletTransaction.create({
            data: {
              walletId: wallet.id,
              amount: remanente,
              type: 'CREDIT',
              source: 'REFUND_VISION_CLOSE',
              description: `Remanente de Visión ${vision.nombre} (ID: ${vision.id}) - Ciclo finalizado`,
              visionId: vision.id,
            }
          });

          // Actualizar balance
          await tx.organizationWallet.update({
            where: { id: wallet.id },
            data: {
              balance: {
                increment: remanente
              }
            }
          });

          logger.debug(`  ✅ Wallet acreditado: $${remanente}`);
        }

        // 2. Cerrar escrow
        await tx.visionEscrow.update({
          where: { id: escrow.id },
          data: {
            status: 'CLOSED',
            closedAt: now,
            remainingBalance: 0, // Ya se procesó
          }
        });

        logger.debug(`  🔒 Escrow cerrado`);

        return { walletTransaction, remanente };
      });

      results.push({
        visionId: vision.id,
        visionNombre: vision.nombre,
        organizationId: vision.organizationId,
        organizationName: vision.Organization.name,
        totalDeposited,
        totalPaid,
        remanente: result.remanente,
        walletCredited: result.remanente > 0,
        closedAt: now,
      });

      // TODO: Enviar email al director con resumen de cierre
      // await sendVisionClosureSummary(vision, result);
    }

    logger.debug(`\n✅ Procesadas ${results.length} visiones`);

    return NextResponse.json({
      success: true,
      visionsProcessed: results.length,
      totalRefunded: results.reduce((sum, r) => sum + r.remanente, 0),
      details: results,
      message: `${results.length} visiones cerradas exitosamente`
    });

  } catch (error) {
    logger.error('❌ Error en vision-closure cron:', error);
    return NextResponse.json(
      { error: 'Error al cerrar visiones' },
      { status: 500 }
    );
  }
}

/**
 * 📊 GET: Ver visiones pendientes de cierre
 */
export async function GET(request: NextRequest) {
  try {
    const now = new Date();

    const pendingClosure = await prisma.vision.findMany({
      where: {
        fechaFin: {
          lt: now
        },
        VisionEscrow: {
          status: 'ACTIVE'
        }
      },
      include: {
        VisionEscrow: true,
        Organization: {
          select: {
            id: true,
            name: true,
          }
        },
        _count: {
          select: {
            enrollments: {
              where: { status: 'ACTIVE' }
            }
          }
        }
      }
    });

    const summary = pendingClosure.map(v => ({
      visionId: v.id,
      nombre: v.nombre,
      organizacion: v.Organization.name,
      fechaFin: v.fechaFin,
      diasVencida: Math.floor((now.getTime() - v.fechaFin.getTime()) / (1000 * 60 * 60 * 24)),
      enrollmentsActivos: v._count.enrollments,
      escrow: {
        totalDeposited: Number(v.VisionEscrow?.totalDeposited || 0),
        totalPaid: Number(v.VisionEscrow?.totalPaid || 0),
        remainingBalance: Number(v.VisionEscrow?.remainingBalance || 0),
      }
    }));

    return NextResponse.json({
      success: true,
      pendingClosure: summary.length,
      visions: summary,
    });

  } catch (error) {
    logger.error('❌ Error obteniendo visiones pendientes:', error);
    return NextResponse.json(
      { error: 'Error al obtener datos' },
      { status: 500 }
    );
  }
}
