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
    const { emails } = await request.json();

    if (!emails || !visionId) {
      return NextResponse.json({ success: false, error: 'Datos inválidos' }, { status: 400 });
    }

    // Parse emails
    const emailList = emails
      .split(/[\s,;\n]+/)
      .map((e: string) => e.trim().toLowerCase())
      .filter((e: string) => e && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));

    if (emailList.length === 0) {
      return NextResponse.json({ success: false, error: 'No se detectaron correos válidos' }, { status: 400 });
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

    // Buscar usuarios existentes
    const allExistingUsers = await prisma.usuario.findMany({
      where: { email: { in: emailList } },
      select: { id: true, email: true, organizationId: true, rol: true }
    });

    // Separar por organización
    const usersInSameOrg = allExistingUsers.filter(u => u.organizationId === director.organizationId);
    const usersInDifferentOrg = allExistingUsers.filter(u => u.organizationId && u.organizationId !== director.organizationId);
    const usersWithoutOrg = allExistingUsers.filter(u => !u.organizationId);

    const newEmails = emailList.filter((e: string) => !allExistingUsers.find(u => u.email === e));

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

      // Crear licencia estándar en estado Pendiente
      await prisma.licenseAssignment.create({
        data: {
          userId: user.id,
          organizationId: director.organizationId!,
          visionId: visionId,
          assignedBy: session.user.id,
          assignedAt: new Date(),
          licenseCode: `QNT-GC-${user.id}-${Date.now()}`,
          isActive: false, // Pendiente de activación
          notes: 'Licencia estándar automática - Game Changer - Pendiente de activación'
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

    // Actualizar organización de usuarios SIN organización
    for (const user of usersWithoutOrg) {
      await prisma.usuario.update({
        where: { id: user.id },
        data: { 
          organizationId: director.organizationId,
          rol: 'GAMECHANGER' // Asegurar que sea GAMECHANGER
        }
      });
    }

    // Agregar Game Changers de MISMA organización o SIN organización
    const usersToAdd = [...usersInSameOrg, ...usersWithoutOrg];
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

        // Si el usuario ya existía, reiniciar su wizard
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
      existingUsersAdded: usersInSameOrg.length + usersWithoutOrg.length,
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
