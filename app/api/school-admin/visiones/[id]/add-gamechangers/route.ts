import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { generateMagicLinkToken, sendVisionMagicLinkMessage } from '@/lib/whatsapp';
import { sendVisionMagicLinkEmail } from '@/lib/email';

const DEFAULT_PASSWORD = 'Quantum123';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const visionId = parseInt(id);
    const body = await request.json();
    const { emails, gameChangerIds } = body;

    if (!visionId) {
      return NextResponse.json({ success: false, error: 'ID de visión inválido' }, { status: 400 });
    }

    // Verificar visión y organización
    const vision = await prisma.vision.findUnique({ where: { id: visionId } });
    if (!vision) return NextResponse.json({ success: false, error: 'Visión no encontrada' }, { status: 404 });

    const director = await prisma.usuario.findUnique({ 
      where: { id: session.user.id }, 
      select: { organizationId: true } 
    });

    if (!director?.organizationId || vision.organizationId !== director.organizationId) {
      return NextResponse.json({ success: false, error: 'No tienes acceso a esta visión' }, { status: 403 });
    }

    // Si se envían IDs directamente, asignar esos usuarios
    if (gameChangerIds && Array.isArray(gameChangerIds)) {
      const addedGameChangers = [];
      
      for (const userId of gameChangerIds) {
        // Verificar que el usuario existe y pertenece a la organización
        const user = await prisma.usuario.findUnique({
          where: { id: userId },
          select: { id: true, email: true, organizationId: true, rol: true }
        });

        if (!user || user.organizationId !== director.organizationId) {
          continue; // Skip usuarios inválidos
        }

        // Verificar si ya está asignado
        const existingAssignment = await prisma.visionGameChanger.findFirst({
          where: { gameChangerId: userId, visionId: visionId }
        });

        if (!existingAssignment) {
          await prisma.visionGameChanger.create({
            data: {
              gameChangerId: userId,
              visionId: visionId,
              asignadoPorId: session.user.id,
              createdAt: new Date()
            }
          });
          addedGameChangers.push(user);
        }
      }

      return NextResponse.json({ 
        success: true, 
        message: `${addedGameChangers.length} Game Changer(s) asignado(s)`,
        gameChangers: addedGameChangers
      });
    }

    // Si no hay IDs, procesar emails (lógica original)
    if (!emails) {
      return NextResponse.json({ success: false, error: 'Se requiere emails o gameChangerIds' }, { status: 400 });
    }

    // Parse emails
    const emailList = emails
      .split(/[\s,;\n]+/)
      .map((e: string) => e.trim().toLowerCase())
      .filter((e: string) => e && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));

    if (emailList.length === 0) {
      return NextResponse.json({ success: false, error: 'No se detectaron correos válidos' }, { status: 400 });
    }

    // Buscar usuarios existentes
    const allExistingUsers = await prisma.usuario.findMany({
      where: { email: { in: emailList } },
      select: { id: true, email: true, organizationId: true, rol: true }
    });

    // Separar por organización
    const usersInSameOrg = allExistingUsers.filter(u => u.organizationId === director.organizationId);
    const usersInDifferentOrg = allExistingUsers.filter(u => u.organizationId && u.organizationId !== director.organizationId);
    const usersWithoutOrg = allExistingUsers.filter(u => !u.organizationId); // LOBO_SOLITARIO

    const newEmails = emailList.filter((e: string) => !allExistingUsers.find(u => u.email === e));

    // Verificar créditos disponibles antes de crear
    const totalNewUsers = newEmails.length + usersWithoutOrg.length;
    if (totalNewUsers > 0) {
      const schoolCredit = await prisma.schoolCredit.findFirst({
        where: {
          organizationId: director.organizationId,
          isActive: true
        }
      });

      if (!schoolCredit) {
        return NextResponse.json({ 
          success: false, 
          error: 'No hay créditos de licencias configurados para esta organización' 
        }, { status: 400 });
      }

      const availableCredits = (schoolCredit.totalPurchased || 0) - (schoolCredit.totalAllocated || 0);
      if (availableCredits < totalNewUsers) {
        return NextResponse.json({ 
          success: false, 
          error: `Créditos insuficientes. Disponibles: ${availableCredits}, Necesarios: ${totalNewUsers}` 
        }, { status: 400 });
      }
    }

    // Crear usuarios nuevos como GAMECHANGER
    const created: any[] = [];
    for (const email of newEmails) {
      const hashed = await bcrypt.hash(DEFAULT_PASSWORD, 10);
      const magicToken = generateMagicLinkToken();
      const tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días
      
      const user = await prisma.usuario.create({
        data: {
          email,
          nombre: email.split('@')[0],
          password: hashed,
          rol: 'GAMECHANGER',
          tier: 'STANDARD',
          isActive: true,
          organizationId: director.organizationId,
          requirePasswordChange: true,
          onboardingOrigin: 'VISION_IMPORT',
          wizardCompleted: false,
          magicLinkToken: magicToken,
          magicLinkExpiry: tokenExpiry,
          temporaryPassword: DEFAULT_PASSWORD
        },
        select: { id: true, email: true, nombre: true, telefono: true }
      });
      created.push(user);

      // Crear licencia STANDARD en estado ACTIVADA (Game Changers se activan automáticamente)
      await prisma.licenseAssignment.create({
        data: {
          userId: user.id,
          organizationId: director.organizationId!,
          visionId: visionId,
          assignedBy: session.user.id,
          assignedAt: new Date(),
          licenseCode: `QNT-GC-STD-${user.id}-${Date.now()}`,
          isActive: true, // ACTIVADA automáticamente para Game Changers
          activatedAt: new Date(), // Fecha de activación
          expiresAt: vision.endDate, // Expira cuando termina la visión
          notes: 'Licencia STANDARD automática - Game Changer - Activada'
        }
      });

      // Descontar de SchoolCredit
      await prisma.schoolCredit.updateMany({
        where: {
          organizationId: director.organizationId,
          isActive: true
        },
        data: {
          totalAllocated: { increment: 1 }
        }
      });
      
      // Enviar WhatsApp con Magic Link si tiene teléfono
      if (user.telefono) {
        try {
          const visionData = await prisma.vision.findUnique({
            where: { id: visionId },
            select: { nombre: true }
          });
          
          await sendVisionMagicLinkMessage(
            user.telefono,
            user.nombre,
            visionData?.nombre || 'Quantum',
            magicToken
          );
          console.log(`📱 Magic Link enviado a ${user.nombre} (${user.telefono})`);
        } catch (error) {
          console.warn('⚠️ No se pudo enviar WhatsApp:', error);
        }
      }

      // Enviar Email con Magic Link
      try {
        const visionData = await prisma.vision.findUnique({
          where: { id: visionId },
          select: { nombre: true }
        });
        
        await sendVisionMagicLinkEmail(
          user.email,
          user.nombre,
          visionData?.nombre || 'Quantum',
          magicToken
        );
        console.log(`📧 Magic Link email enviado a ${user.nombre} (${user.email})`);
      } catch (error) {
        console.warn('⚠️ No se pudo enviar email:', error);
      }
    }

    // Marcar usuarios de OTRA organización como cambio pendiente
    const pendingChanges: any[] = [];
    for (const user of usersInDifferentOrg) {
      await prisma.usuario.update({
        where: { id: user.id },
        data: {
          newOrganizationId: director.organizationId,
          isActive: false
        }
      });
      pendingChanges.push(user);
    }

    // Incorporar usuarios LOBO_SOLITARIO (sin organización) a la organización y convertirlos en GAMECHANGER
    const convertedLobos: any[] = [];
    for (const user of usersWithoutOrg) {
      const updatedUser = await prisma.usuario.update({
        where: { id: user.id },
        data: { 
          organizationId: director.organizationId,
          rol: 'GAMECHANGER',
          tier: 'STANDARD'
        },
        select: { id: true, email: true, nombre: true, telefono: true }
      });
      convertedLobos.push(updatedUser);

      // Crear licencia STANDARD ACTIVADA para el lobo solitario convertido
      await prisma.licenseAssignment.create({
        data: {
          userId: user.id,
          organizationId: director.organizationId!,
          visionId: visionId,
          assignedBy: session.user.id,
          assignedAt: new Date(),
          licenseCode: `QNT-GC-STD-${user.id}-${Date.now()}`,
          isActive: true, // ACTIVADA automáticamente para Game Changers
          activatedAt: new Date(),
          expiresAt: vision.endDate, // Expira cuando termina la visión
          notes: 'Licencia STANDARD automática - Lobo Solitario convertido a Game Changer - Activada'
        }
      });

      // Descontar de SchoolCredit
      await prisma.schoolCredit.updateMany({
        where: {
          organizationId: director.organizationId,
          isActive: true
        },
        data: {
          totalAllocated: { increment: 1 }
        }
      });
    }

    // Agregar Game Changers de MISMA organización o convertidos de LOBO_SOLITARIO
    const usersToAdd = [...usersInSameOrg, ...convertedLobos];
    const results = [];
    const wizardsReset: string[] = [];

    for (const user of [...usersToAdd, ...created]) {
      // Verificar si ya está en la visión
      const already = await prisma.visionGameChanger.findFirst({ 
        where: { visionId, gameChangerId: user.id } 
      });
      
      if (!already) {
        await prisma.visionGameChanger.create({ 
          data: { 
            visionId, 
            gameChangerId: user.id,
            asignadoPorId: session.user.id
          } 
        });
        results.push(user.email);

        // Si el usuario ya existía en la organización (no es recién creado), crear NUEVA licencia para la NUEVA visión
        if (!created.find(c => c.id === user.id)) {
          // Verificar que tenga créditos disponibles
          const currentCredit = await prisma.schoolCredit.findFirst({
            where: {
              organizationId: director.organizationId,
              isActive: true
            }
          });

          if (currentCredit) {
            const availableCredits = currentCredit.totalPurchased - currentCredit.totalAllocated;
            
            if (availableCredits > 0) {
              // Crear NUEVA licencia para la NUEVA visión
              await prisma.licenseAssignment.create({
                data: {
                  userId: user.id,
                  organizationId: director.organizationId!,
                  visionId: visionId,
                  assignedBy: session.user.id,
                  assignedAt: new Date(),
                  licenseCode: `QNT-GC-STD-${user.id}-${Date.now()}`,
                  isActive: true, // ACTIVADA automáticamente para Game Changers
                  activatedAt: new Date(),
                  expiresAt: vision.endDate, // Expira cuando termina la visión
                  notes: 'Licencia STANDARD automática - Game Changer existente reasignado - Activada'
                }
              });

              // Descontar de SchoolCredit
              await prisma.schoolCredit.update({
                where: { id: currentCredit.id },
                data: {
                  totalAllocated: { increment: 1 }
                }
              });

              console.log(`🎫 Nueva licencia creada para usuario existente ${user.email} en nueva visión`);
            } else {
              console.warn(`⚠️ Sin créditos disponibles para crear licencia de usuario existente ${user.email}`);
            }
          }

          // Reiniciar su wizard si ya existía
        if (!created.find(c => c.id === user.id)) {
          const carta = await prisma.cartaFrutos.findFirst({
            where: { usuarioId: user.id }
          });

          if (carta) {
            await prisma.cartaFrutos.update({
              where: { id: carta.id },
              data: {
                finanzasDeclaracion: null,
                relacionesDeclaracion: null,
                talentosDeclaracion: null,
                pazMentalDeclaracion: null,
                ocioDeclaracion: null,
                saludDeclaracion: null,
                estado: 'BORRADOR'
              }
            });

            const enrollment = await prisma.programEnrollment.findFirst({
              where: {
                userId: user.id,
                status: 'ACTIVE'
              }
            });

            if (enrollment) {
              await prisma.programEnrollment.update({
                where: { id: enrollment.id },
                data: { status: 'PENDING_CARTA' }
              });
            }

            wizardsReset.push(user.email);
          }
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      newUsersCreated: created.length,
      existingUsersAdded: usersInSameOrg.length,
      lobosSolitariosConverted: convertedLobos.length,
      wizardsReset: wizardsReset.length,
      pendingChanges: pendingChanges.length,
      pendingEmails: pendingChanges.map(u => u.email),
      total: results.length
    });
  } catch (error) {
    console.error('Error alta masiva game changers:', error);
    return NextResponse.json({ success: false, error: 'Error al agregar game changers' }, { status: 500 });
  }
}
