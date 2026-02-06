const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyPaymentFlow(orderId) {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 VERIFICACIÓN DE FLUJO DE PAGO - SISTEMA DE DISCIPLINA');
  console.log('='.repeat(70) + '\n');

  try {
    // 1. Verificar la orden
    console.log('📦 PASO 1: Verificando Orden de Pago...\n');
    const order = await prisma.licenseOrder.findUnique({
      where: { id: orderId },
      include: {
        Organization: {
          select: { id: true, name: true }
        }
      }
    });

    if (!order) {
      console.log('❌ Orden no encontrada:', orderId);
      return;
    }

    console.log(`✅ Orden encontrada: ${order.id}`);
    console.log(`   Status: ${order.status}`);
    console.log(`   Monto: $${order.amount.toLocaleString()} MXN`);
    console.log(`   Método de Pago: ${order.paymentMethod || 'N/A'}`);
    console.log(`   Organización: ${order.Organization?.name || 'N/A'}`);
    console.log(`   Fecha de Pago: ${order.paidAt ? order.paidAt.toISOString() : 'No pagada'}\n`);

    // Parsear paymentData
    let paymentData;
    try {
      paymentData = typeof order.paymentData === 'string' 
        ? JSON.parse(order.paymentData) 
        : order.paymentData;
    } catch (e) {
      console.log('⚠️ No se pudo parsear paymentData\n');
      return;
    }

    if (paymentData.type !== 'VISION_MENTOR_PAYMENT') {
      console.log('ℹ️ Esta orden no es de tipo VISION_MENTOR_PAYMENT\n');
      return;
    }

    const visionId = paymentData.visionId;
    const mentorAssignments = paymentData.mentorAssignments || [];
    const totalStudents = paymentData.totalStudents || 0;

    console.log('📋 Detalles del Pago:');
    console.log(`   Visión ID: ${visionId}`);
    console.log(`   Visión Nombre: ${paymentData.visionName || 'N/A'}`);
    console.log(`   Total Estudiantes: ${totalStudents}`);
    console.log(`   Mentores Seleccionados: ${mentorAssignments.length}\n`);

    // 2. Verificar la visión
    console.log('👁️ PASO 2: Verificando Visión...\n');
    const vision = await prisma.vision.findUnique({
      where: { id: visionId },
      select: {
        id: true,
        nombre: true,
        startDate: true,
        endDate: true,
        _count: {
          select: {
            VisionParticipante: true,
            VisionMentor: true
          }
        }
      }
    });

    if (vision) {
      console.log(`✅ Visión encontrada: ${vision.nombre}`);
      console.log(`   Fecha Inicio: ${vision.startDate?.toISOString().split('T')[0] || 'N/A'}`);
      console.log(`   Fecha Fin: ${vision.endDate?.toISOString().split('T')[0] || 'N/A'}`);
      console.log(`   Participantes: ${vision._count.VisionParticipante}`);
      console.log(`   Mentores Asignados: ${vision._count.VisionMentor}\n`);
    } else {
      console.log('❌ Visión no encontrada\n');
      return;
    }

    // 3. Verificar mentores asignados
    console.log('👨‍🏫 PASO 3: Verificando Mentores Asignados a la Visión...\n');
    const mentoresAsignados = await prisma.visionMentor.findMany({
      where: { visionId },
      include: {
        Usuario_VisionMentor_mentorIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            PerfilMentor: {
              select: {
                precioDisciplina: true,
                maxDisciplineClients: true
              }
            }
          }
        }
      }
    });

    console.log(`✅ Total de mentores asignados a la visión: ${mentoresAsignados.length}\n`);
    
    mentoresAsignados.forEach((vm, idx) => {
      const mentor = vm.Usuario_VisionMentor_mentorIdToUsuario;
      const assignment = mentorAssignments.find((a: any) => 
        mentor.PerfilMentor?.id === a.mentorId || 
        mentor.id === a.mentorId
      );
      
      console.log(`   ${idx + 1}. ${mentor.nombre} (${mentor.email})`);
      console.log(`      Tarifa Disciplina: $${mentor.PerfilMentor?.precioDisciplina || 'N/A'}/llamada`);
      console.log(`      Espacios Máximos: ${mentor.PerfilMentor?.maxDisciplineClients || 'N/A'}`);
      if (assignment) {
        console.log(`      Alumnos Asignados en Orden: ${assignment.studentCount}`);
        console.log(`      Costo Total: $${assignment.totalCost?.toLocaleString() || 'N/A'}`);
      }
      console.log('');
    });

    // 4. Verificar créditos de llamadas (ESCROW)
    console.log('💰 PASO 4: Verificando Créditos de Llamadas (ESCROW)...\n');
    const schoolCredit = await prisma.schoolCredit.findFirst({
      where: {
        organizationId: order.organizationId,
        isActive: true
      }
    });

    if (schoolCredit) {
      const callsPerStudent = 18;
      const expectedCalls = totalStudents * callsPerStudent;
      
      console.log('✅ Créditos de llamadas encontrados:');
      console.log(`   Total Comprado (Histórico): ${schoolCredit.totalPurchased} llamadas`);
      console.log(`   Total Asignado (Usado): ${schoolCredit.totalAllocated} llamadas`);
      console.log(`   Disponible: ${schoolCredit.totalPurchased - schoolCredit.totalAllocated} llamadas`);
      console.log(`   Total Pagado (Histórico): $${schoolCredit.totalPaid.toLocaleString()} MXN`);
      console.log(`   Precio Unitario: $${schoolCredit.unitPrice.toFixed(2)}/llamada`);
      console.log(`   Expira: ${schoolCredit.expirationDate.toISOString().split('T')[0]}\n`);
      
      console.log('📊 Cálculo de esta Orden:');
      console.log(`   Estudiantes: ${totalStudents}`);
      console.log(`   Llamadas por Estudiante: ${callsPerStudent}`);
      console.log(`   Llamadas Esperadas: ${expectedCalls}`);
      console.log(`   Monto de Orden: $${order.amount.toLocaleString()} MXN`);
      console.log(`   Precio por Llamada: $${(order.amount / expectedCalls).toFixed(2)}\n`);
    } else {
      console.log('❌ No se encontraron créditos de llamadas\n');
    }

    // 5. Resumen del estado actual
    console.log('📈 PASO 5: Resumen del Sistema...\n');
    
    // Contar llamadas completadas
    const completedCalls = await prisma.callBooking.count({
      where: {
        mentorId: { in: mentoresAsignados.map(m => m.mentorId) },
        type: 'DISCIPLINE',
        status: { in: ['COMPLETED', 'MISSED_BY_USER'] }
      }
    });

    // Contar llamadas pendientes
    const pendingCalls = await prisma.callBooking.count({
      where: {
        mentorId: { in: mentoresAsignados.map(m => m.mentorId) },
        type: 'DISCIPLINE',
        status: 'SCHEDULED'
      }
    });

    console.log('📞 Estado de Llamadas:');
    console.log(`   Completadas/Pagables: ${completedCalls} llamadas`);
    console.log(`   Agendadas (Pendientes): ${pendingCalls} llamadas`);
    console.log(`   Créditos Disponibles: ${schoolCredit ? schoolCredit.totalPurchased - schoolCredit.totalAllocated : 0} llamadas\n`);

    if (schoolCredit) {
      const callsUsed = completedCalls;
      const callsPurchased = schoolCredit.totalPurchased;
      const estimatedRemaining = callsPurchased - callsUsed;
      const estimatedRefund = estimatedRemaining * schoolCredit.unitPrice;

      console.log('💵 Proyección Financiera:');
      console.log(`   Dinero en ESCROW (Pagado): $${schoolCredit.totalPaid.toLocaleString()} MXN`);
      console.log(`   Llamadas Usadas: ${callsUsed} (${((callsUsed / callsPurchased) * 100).toFixed(1)}%)`);
      console.log(`   Llamadas Restantes: ${estimatedRemaining}`);
      console.log(`   Reembolso Estimado: $${estimatedRefund.toLocaleString()} MXN\n`);
    }

    console.log('='.repeat(70));
    console.log('✅ VERIFICACIÓN COMPLETADA');
    console.log('='.repeat(70) + '\n');

  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Obtener orderId de los argumentos de línea de comandos
const orderId = process.argv[2];

if (!orderId) {
  console.log('\n❌ Error: Debes proporcionar un Order ID');
  console.log('\nUso: node verify-payment-flow.js <ORDER_ID>');
  console.log('Ejemplo: node verify-payment-flow.js VISION-abc123xyz\n');
  process.exit(1);
}

verifyPaymentFlow(orderId);
