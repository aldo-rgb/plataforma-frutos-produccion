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
    const allowedRoles = ['SCHOOL_ADMIN', 'ADMINISTRADOR', 'COORDINADOR', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED'];
    
    if (!session?.user || !allowedRoles.includes(session.user.rol as string)) {
      console.log('🚫 [add-gamechangers] Unauthorized - rol:', session?.user?.rol);
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const visionId = parseInt(id);
    const body = await request.json();
    const { emails, gameChangerIds, level } = body; // Agregar level

    if (!visionId) {
      return NextResponse.json({ success: false, error: 'ID de visión inválido' }, { status: 400 });
    }

    // Validar que se envió un nivel válido
    if (!level || !['BASIC', 'ADVANCED', 'PL'].includes(level)) {
      return NextResponse.json({ success: false, error: 'Nivel inválido. Debe ser BASIC, ADVANCED o PL' }, { status: 400 });
    }

    // Verificar visión y organización
    const vision = await prisma.vision.findUnique({ 
      where: { id: visionId },
      select: {
        id: true,
        organizationId: true,
        endDate: true,
        advancedEndDate: true,
        plWeekend3EndDate: true
      }
    });
    if (!vision) return NextResponse.json({ success: false, error: 'Visión no encontrada' }, { status: 404 });

    const director = await prisma.usuario.findUnique({ 
      where: { id: session.user.id }, 
      select: { organizationId: true } 
    });

    if (!director?.organizationId || vision.organizationId !== director.organizationId) {
      return NextResponse.json({ success: false, error: 'No tienes acceso a esta visión' }, { status: 403 });
    }

    // Obtener todas las organizaciones relacionadas al mismo master
    const directorOrg = await prisma.organization.findUnique({
      where: { id: director.organizationId },
      select: { id: true, masterOrganizationId: true },
    });
    const masterId = directorOrg?.masterOrganizationId || director.organizationId;
    const relatedOrgs = await prisma.organization.findMany({
      where: {
        OR: [
          { id: masterId },
          { masterOrganizationId: masterId },
        ],
      },
      select: { id: true },
    });
    const relatedOrgIds = relatedOrgs.map(org => org.id);

    // Si se envían IDs directamente, asignar esos usuarios
    if (gameChangerIds && Array.isArray(gameChangerIds)) {
      const addedGameChangers = [];
      const licensesCreated: string[] = [];
      
      // Obtener el producto del nivel para las fechas de expiración
      const levelProduct = await prisma.schoolProduct.findFirst({
        where: {
          visionId: visionId,
          levelType: level,
          type: 'CORE_TRAINING',
          isActive: true
        },
        select: {
          endDate: true,
          plWeekend3EndDate: true
        }
      });

      // Determinar fecha de expiración según el nivel
      let licenseExpiryDate: Date | null = null;
      if (level === 'PL') {
        // Para PL, usar plWeekend3EndDate del producto o de la visión
        licenseExpiryDate = levelProduct?.plWeekend3EndDate || vision.plWeekend3EndDate || vision.endDate;
      } else if (level === 'ADVANCED') {
        licenseExpiryDate = levelProduct?.endDate || vision.advancedEndDate || vision.endDate;
      } else {
        // BASIC
        licenseExpiryDate = levelProduct?.endDate || vision.endDate;
      }

      // Contar cuántos usuarios necesitan licencia nueva para este nivel
      let usersNeedingLicense = 0;
      for (const userId of gameChangerIds) {
        // Verificar si ya está asignado en este nivel (no necesitaría nueva licencia)
        const existingAssignment = await prisma.visionGameChanger.findFirst({
          where: { gameChangerId: userId, visionId, level }
        });
        
        if (!existingAssignment) {
          // Verificar si ya tiene licencia activa para ESTE nivel específico
          // Para PL siempre se crea nueva licencia
          if (level === 'PL') {
            usersNeedingLicense++;
          } else {
            const existingLicense = await prisma.licenseAssignment.findFirst({
              where: { userId, visionId, isActive: true }
            });
            if (!existingLicense) {
              usersNeedingLicense++;
            }
          }
        }
      }

      // Verificar licencias disponibles si hay usuarios que necesitan licencia
      if (usersNeedingLicense > 0) {
        // Obtener todas las licencias activas de la organización
        const allLicenses = await prisma.license.findMany({
          where: {
            organizationId: director.organizationId,
            isActive: true,
          },
          select: { code: true }
        });

        // Obtener códigos de licencias ya asignadas
        const assignedCodes = await prisma.licenseAssignment.findMany({
          where: {
            organizationId: director.organizationId,
            isActive: true,
          },
          select: { licenseCode: true }
        });

        const assignedCodesSet = new Set(assignedCodes.map(a => a.licenseCode));
        const availableLicenses = allLicenses.filter(l => !assignedCodesSet.has(l.code));

        if (availableLicenses.length < usersNeedingLicense) {
          return NextResponse.json({ 
            success: false, 
            error: `Licencias insuficientes. Disponibles: ${availableLicenses.length}, Necesarias: ${usersNeedingLicense}. Compra más licencias primero.` 
          }, { status: 400 });
        }
      }
      
      for (const userId of gameChangerIds) {
        // Verificar que el usuario existe y pertenece a una organización relacionada
        const user = await prisma.usuario.findUnique({
          where: { id: userId },
          select: { id: true, email: true, organizationId: true, rol: true, nombre: true }
        });

        if (!user || !user.organizationId || !relatedOrgIds.includes(user.organizationId)) {
          continue; // Skip usuarios inválidos o de organizaciones no relacionadas
        }

        // Verificar si ya está asignado EN ESE NIVEL
        const existingAssignment = await prisma.visionGameChanger.findFirst({
          where: { 
            gameChangerId: userId, 
            visionId: visionId,
            level: level
          }
        });

        if (!existingAssignment) {
          // Crear la asignación de Game Changer
          await prisma.visionGameChanger.create({
            data: {
              gameChangerId: userId,
              visionId: visionId,
              asignadoPorId: session.user.id,
              level: level,
              createdAt: new Date()
            }
          });

          // Actualizar el usuario a rol GAMECHANGER y flag esGameChanger
          await prisma.usuario.update({
            where: { id: userId },
            data: {
              rol: 'GAMECHANGER',
              esGameChanger: true
            }
          });

          // Lógica de licencias diferente según el nivel
          let shouldCreateLicense = false;
          let finalExpiryDate = licenseExpiryDate;
          
          // Verificar licencia existente del usuario en esta visión
          const existingLicense = await prisma.licenseAssignment.findFirst({
            where: { userId, visionId, isActive: true },
            orderBy: { expiresAt: 'desc' } // Obtener la de mayor vigencia
          });

          if (level === 'PL') {
            // Para PL (Liderato): Crear nueva licencia, pero respetando la mayor vigencia
            if (existingLicense?.expiresAt && licenseExpiryDate) {
              const existingExpiry = new Date(existingLicense.expiresAt);
              const newExpiry = new Date(licenseExpiryDate);
              
              if (existingExpiry > newExpiry) {
                // La licencia existente tiene mayor vigencia, usar esa fecha
                finalExpiryDate = existingLicense.expiresAt;
                console.log(`📅 Usuario ${user.nombre} tiene licencia con mayor vigencia (${existingExpiry.toISOString()}), se respeta`);
              }
            }
            shouldCreateLicense = true;
            console.log(`🎓 Game Changer ${user.nombre} asignado a PL - Creando nueva licencia de Liderato`);
          } else {
            // Para BASIC/ADVANCED: solo crear si no tiene licencia activa O si la nueva tiene mayor vigencia
            if (!existingLicense) {
              shouldCreateLicense = true;
            } else if (existingLicense.expiresAt && licenseExpiryDate) {
              const existingExpiry = new Date(existingLicense.expiresAt);
              const newExpiry = new Date(licenseExpiryDate);
              
              if (newExpiry > existingExpiry) {
                // La nueva licencia tiene mayor vigencia, actualizar la existente
                await prisma.licenseAssignment.update({
                  where: { id: existingLicense.id },
                  data: { 
                    expiresAt: licenseExpiryDate,
                    notes: `${existingLicense.notes || ''} | Extendida a ${level} el ${new Date().toISOString()}`
                  }
                });
                console.log(`📅 Licencia de ${user.nombre} extendida de ${existingExpiry.toISOString()} a ${newExpiry.toISOString()}`);
                // No crear nueva, ya se actualizó
                shouldCreateLicense = false;
              } else {
                // La existente tiene mayor vigencia, no hacer nada
                console.log(`📅 Usuario ${user.nombre} ya tiene licencia con mayor vigencia (${existingExpiry.toISOString()}), se conserva`);
                shouldCreateLicense = false;
              }
            }
          }

          if (shouldCreateLicense) {
            // Generar código de licencia único
            const levelPrefix = level === 'PL' ? 'PL' : (level === 'ADVANCED' ? 'ADV' : 'BAS');
            const licenseCode = `QNT-${levelPrefix}-${Date.now().toString(36).toUpperCase()}-${userId.toString().slice(-4).toUpperCase()}`;
            
            await prisma.licenseAssignment.create({
              data: {
                userId: user.id,
                organizationId: director.organizationId!,
                visionId: visionId,
                assignedBy: session.user.id,
                assignedAt: new Date(),
                licenseCode: licenseCode,
                isActive: true,
                activatedAt: new Date(),
                expiresAt: finalExpiryDate, // Usar la fecha final (puede ser la mayor de las dos)
                notes: `Licencia STANDARD automática - Game Changer ${level} - Activada`
              }
            });

            licensesCreated.push(licenseCode);
            console.log(`✅ Licencia ${level} creada para Game Changer ${user.nombre} (${user.email}): ${licenseCode} - Expira: ${finalExpiryDate}`);
          }

          addedGameChangers.push(user);
        }
      }

      return NextResponse.json({ 
        success: true, 
        message: `${addedGameChangers.length} Game Changer(s) asignado(s). ${licensesCreated.length} licencia(s) creada(s).`,
        gameChangers: addedGameChangers,
        licensesCreated: licensesCreated.length
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

    // Verificar licencias disponibles antes de crear
    const totalNewUsers = newEmails.length + usersWithoutOrg.length;
    if (totalNewUsers > 0) {
      // Obtener todas las licencias activas de la organización
      const allLicensesForEmails = await prisma.license.findMany({
        where: {
          organizationId: director.organizationId,
          isActive: true,
        },
        select: { code: true }
      });

      // Obtener códigos de licencias ya asignadas
      const assignedCodesForEmails = await prisma.licenseAssignment.findMany({
        where: {
          organizationId: director.organizationId,
          isActive: true,
        },
        select: { licenseCode: true }
      });

      const assignedCodesSetForEmails = new Set(assignedCodesForEmails.map(a => a.licenseCode));
      const availableLicensesForEmails = allLicensesForEmails.filter(l => !assignedCodesSetForEmails.has(l.code));

      if (availableLicensesForEmails.length < totalNewUsers) {
        return NextResponse.json({ 
          success: false, 
          error: `Licencias insuficientes. Disponibles: ${availableLicensesForEmails.length}, Necesarias: ${totalNewUsers}. Compra más licencias primero.` 
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
    }

    // Agregar Game Changers de MISMA organización o convertidos de LOBO_SOLITARIO
    const usersToAdd = [...usersInSameOrg, ...convertedLobos];
    const results = [];
    const wizardsReset: string[] = [];

    for (const user of [...usersToAdd, ...created]) {
      // Verificar si ya está en la visión EN ESE NIVEL
      const already = await prisma.visionGameChanger.findFirst({ 
        where: { 
          visionId, 
          gameChangerId: user.id,
          level: level
        } 
      });
      
      if (!already) {
        await prisma.visionGameChanger.create({ 
          data: { 
            visionId, 
            gameChangerId: user.id,
            asignadoPorId: session.user.id,
            level: level
          } 
        });
        
        // Actualizar el usuario a rol GAMECHANGER y flag esGameChanger
        await prisma.usuario.update({
          where: { id: user.id },
          data: {
            rol: 'GAMECHANGER',
            esGameChanger: true
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
