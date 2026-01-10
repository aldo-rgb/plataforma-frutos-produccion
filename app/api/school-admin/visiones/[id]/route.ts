import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Roles permitidos para acceder a esta API
const ALLOWED_ROLES = [
  'SCHOOL_ADMIN', 
  'ADMINISTRADOR', 
  'COORDINADOR', 
  'COORDINATOR_BASIC', 
  'COORDINATOR_ADVANCED'
];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !ALLOWED_ROLES.includes(session.user.rol as string)) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const visionId = parseInt(id);

    if (isNaN(visionId)) {
      return NextResponse.json(
        { success: false, error: 'ID de visión inválido' },
        { status: 400 }
      );
    }

    // Obtener la visión con participantes y coordinador
    const vision = await prisma.vision.findUnique({
      where: { id: visionId },
      include: {
        Usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
        _count: {
          select: {
            VisionParticipante: true,
            VisionGameChanger: true,
            VisionMentor: true,
          },
        },
      },
    });

    if (!vision) {
      return NextResponse.json(
        { success: false, error: 'Visión no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que la visión pertenece a la organización del director
    const user = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { organizationId: true },
    });

    if (!user?.organizationId || vision.organizationId !== user.organizationId) {
      return NextResponse.json(
        { success: false, error: 'No tienes acceso a esta visión' },
        { status: 403 }
      );
    }

    // Obtener participantes de la visión
    const participantes = await prisma.visionParticipante.findMany({
      where: { visionId },
      include: {
        Usuario_VisionParticipante_participanteIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            telefono: true,
            tier: true,
            assignedMentorId: true,
            Usuario_Usuario_assignedMentorIdToUsuario: {
              select: {
                id: true,
                nombre: true,
                email: true,
                imagen: true,
              },
            },
            CartaFrutos: {
              select: {
                id: true,
                estado: true,
              },
            },
            LicenseAssignment_LicenseAssignment_userIdToUsuario: {
              where: {
                visionId: visionId,
                isActive: true
              },
              select: {
                id: true,
                licenseCode: true,
                activatedAt: true,
                assignedAt: true,
                expiresAt: true
              },
              take: 1
            }
          },
        },
        Usuario_VisionParticipante_gameChangerIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            imagen: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Obtener game changers de la visión
    const gameChangers = await prisma.visionGameChanger.findMany({
      where: { visionId },
      include: {
        Usuario_VisionGameChanger_gameChangerIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            telefono: true,
            tier: true,
            assignedMentorId: true,
            Usuario_Usuario_assignedMentorIdToUsuario: {
              select: {
                id: true,
                nombre: true,
                email: true,
                imagen: true,
              },
            },
            LicenseAssignment_LicenseAssignment_userIdToUsuario: {
              where: {
                visionId: visionId,
                isActive: true
              },
              select: {
                id: true,
                licenseCode: true,
                activatedAt: true,
                assignedAt: true,
                expiresAt: true
              },
              take: 1
            }
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Obtener productos/entrenamientos asociados a esta visión
    const productos = await prisma.schoolProduct.findMany({
      where: { 
        visionId,
        type: 'CORE_TRAINING',
        isActive: true
      },
      include: {
        Trainer: {
          select: {
            id: true,
            nombre: true,
            email: true,
            imagen: true
          }
        },
        Coordinator: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        }
      },
      orderBy: [
        { levelType: 'asc' } // BASIC, ADVANCED, PL
      ]
    });

    // Obtener trainers de PL (3 trainers para el programa de liderato)
    const plTrainersData = await prisma.visionStaff.findMany({
      where: {
        visionId,
        role: 'PL_TRAINER',
        level: 'PL'
      },
      include: {
        Usuario_VisionStaff_userIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            imagen: true
          }
        }
      },
      orderBy: {
        plWeekendNumber: 'asc' // 1, 2, 3
      }
    });

    // Obtener mentores asignados a esta visión con sus costos
    const mentoresAsignados = await prisma.visionMentor.findMany({
      where: { visionId },
      include: {
        Usuario_VisionMentor_mentorIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            imagen: true,
            rol: true,
            organizationId: true,
            PerfilMentor: {
              select: {
                precioDisciplina: true,
                precioBase: true,
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Verificar cuáles tienen paquetes contratados
    const mentoresIds = mentoresAsignados.map(m => m.mentorId);
    const paquetesContratados = await prisma.mentorPackageOrder.findMany({
      where: {
        mentorId: { in: mentoresIds },
        organizationId: user.organizationId,
        status: 'COMPLETED'
      },
      select: {
        mentorId: true
      }
    });

    const mentoresConPaquete = new Set(paquetesContratados.map(p => p.mentorId));

    console.log('👥 Mentores asignados a la visión:', mentoresAsignados.length);
    console.log('📦 Mentores con paquetes contratados:', mentoresConPaquete.size);

    // Calcular semanas y costos del ciclo
    let cicloInfo = null;
    if (vision.startDate && vision.endDate) {
      const start = new Date(vision.startDate);
      const end = new Date(vision.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const semanas = Math.floor(diffDays / 7);
      const llamadasDisciplina = semanas * 2; // 2 llamadas por semana

      cicloInfo = {
        semanas,
        llamadasDisciplina,
        diasTotales: diffDays
      };
    }

    // Enriquecer mentores con cálculos de costo y tipo
    const mentoresConCostos = mentoresAsignados.map(mentor => {
      const usuario = mentor.Usuario_VisionMentor_mentorIdToUsuario;
      const precioDisciplina = usuario?.PerfilMentor?.precioDisciplina || 0;
      const precioBase = usuario?.PerfilMentor?.precioBase || 0;
      const esLider = usuario?.rol === 'LIDER' && usuario?.organizationId === user.organizationId;
      const esMentorContratado = usuario?.rol === 'MENTOR' && mentoresConPaquete.has(mentor.mentorId);
      
      let costoTotal = 0;
      if (!esLider && cicloInfo) {
        costoTotal = cicloInfo.llamadasDisciplina * precioDisciplina;
      }

      return {
        ...mentor,
        precioDisciplina,
        precioBase,
        esLider,
        esContratado: esMentorContratado,
        costoTotal: esLider ? 0 : costoTotal
      };
    });

    return NextResponse.json({
      success: true,
      vision: {
        ...vision,
        startDate: vision.startDate ? vision.startDate.toISOString() : null,
        endDate: vision.endDate ? vision.endDate.toISOString() : null,
      },
      participantes,
      gameChangers,
      mentoresAsignados: mentoresConCostos,
      cicloInfo,
      productos: productos.map(p => ({
        ...p,
        // Si es producto PL, agregar los 3 trainers
        plTrainers: p.levelType === 'PL' ? plTrainersData.map(pt => pt.Usuario_VisionStaff_userIdToUsuario) : undefined,
        startDate: p.startDate ? p.startDate.toISOString() : null,
        endDate: p.endDate ? p.endDate.toISOString() : null,
        plWeekend1StartDate: p.plWeekend1StartDate ? p.plWeekend1StartDate.toISOString() : null,
        plWeekend1EndDate: p.plWeekend1EndDate ? p.plWeekend1EndDate.toISOString() : null,
        plWeekend2StartDate: p.plWeekend2StartDate ? p.plWeekend2StartDate.toISOString() : null,
        plWeekend2EndDate: p.plWeekend2EndDate ? p.plWeekend2EndDate.toISOString() : null,
        plWeekend3StartDate: p.plWeekend3StartDate ? p.plWeekend3StartDate.toISOString() : null,
        plWeekend3EndDate: p.plWeekend3EndDate ? p.plWeekend3EndDate.toISOString() : null,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        promoDeadline: p.promoDeadline ? p.promoDeadline.toISOString() : null
      }))
    });
  } catch (error) {
    console.error('Error fetching vision details:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener detalles de la visión' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !ALLOWED_ROLES.includes(session.user.rol as string)) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const visionId = parseInt(id);

    if (isNaN(visionId)) {
      return NextResponse.json(
        { success: false, error: 'ID de visión inválido' },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    console.log('📥 PUT Request Body:', body);

    // Actualizar fechas de la visión principal
    const visionUpdateData: any = {
      updatedAt: new Date(),
    };

    // Si vienen fechas de básico, actualizamos la visión principal
    if (body.startDate !== undefined) {
      visionUpdateData.startDate = body.startDate;
    }
    if (body.endDate !== undefined) {
      visionUpdateData.endDate = body.endDate;
    }

    await prisma.vision.update({
      where: { id: visionId },
      data: visionUpdateData,
    });

    // Actualizar productos: Básico, Avanzado y PL
    const productos = await prisma.schoolProduct.findMany({
      where: {
        visionId,
        type: 'CORE_TRAINING',
      },
    });
    
    console.log('📦 Productos encontrados:', productos.length);
    productos.forEach(p => console.log(`  - ${p.levelType} (ID: ${p.id})`));

    // Actualizar Producto Básico
    const basicProduct = productos.find(p => p.levelType === 'BASIC');
    if (basicProduct) {
      const basicUpdateData: any = { updatedAt: new Date() };
      if (body.startDate !== undefined) basicUpdateData.startDate = body.startDate;
      if (body.endDate !== undefined) basicUpdateData.endDate = body.endDate;
      
      await prisma.schoolProduct.update({
        where: { id: basicProduct.id },
        data: basicUpdateData,
      });
    }

    // Actualizar Producto Avanzado
    const advancedProduct = productos.find(p => p.levelType === 'ADVANCED');
    if (advancedProduct) {
      const advancedUpdateData: any = { updatedAt: new Date() };
      if (body.advancedStartDate !== undefined) advancedUpdateData.startDate = body.advancedStartDate;
      if (body.advancedEndDate !== undefined) advancedUpdateData.endDate = body.advancedEndDate;
      
      await prisma.schoolProduct.update({
        where: { id: advancedProduct.id },
        data: advancedUpdateData,
      });
    }

    // Actualizar Programa Liderato (PL) con las 3 fechas de fines de semana
    const plProduct = productos.find(p => p.levelType === 'PL');
    if (plProduct) {
      console.log('👑 Producto PL encontrado, ID:', plProduct.id);
      
      const plUpdateData: any = { updatedAt: new Date() };
      
      // Fin de Semana 1
      if (body.plWeekend1StartDate !== undefined) plUpdateData.plWeekend1StartDate = body.plWeekend1StartDate;
      if (body.plWeekend1EndDate !== undefined) plUpdateData.plWeekend1EndDate = body.plWeekend1EndDate;
      
      // Fin de Semana 2
      if (body.plWeekend2StartDate !== undefined) plUpdateData.plWeekend2StartDate = body.plWeekend2StartDate;
      if (body.plWeekend2EndDate !== undefined) plUpdateData.plWeekend2EndDate = body.plWeekend2EndDate;
      
      // Fin de Semana 3 (Graduación)
      if (body.plWeekend3StartDate !== undefined) plUpdateData.plWeekend3StartDate = body.plWeekend3StartDate;
      if (body.plWeekend3EndDate !== undefined) plUpdateData.plWeekend3EndDate = body.plWeekend3EndDate;
      
      console.log('💾 Datos a actualizar en PL:', plUpdateData);
      
      const updatedPL = await prisma.schoolProduct.update({
        where: { id: plProduct.id },
        data: plUpdateData,
      });
      
      console.log('✅ PL actualizado:', updatedPL);
    } else {
      console.log('⚠️ NO se encontró producto PL');
    }

    return NextResponse.json({
      success: true,
      message: 'Fechas actualizadas exitosamente',
    });

  } catch (error) {
    console.error('Error updating vision dates:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar las fechas' },
      { status: 500 }
    );
  }
}
