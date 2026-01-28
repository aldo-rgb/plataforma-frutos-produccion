import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Función para convertir texto a Title Case (Primera letra mayúscula de cada palabra)
function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['ADMINISTRADOR', 'ADMIN', 'SUPER_ADMIN', 'SCHOOL_ADMIN'].includes(session.user.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const organizations = await prisma.organization.findMany({
      include: {
        Usuario_Organization_schoolAdminIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        },
        MasterOrganization: {
          select: {
            id: true,
            name: true,
            logoUrl: true
          }
        },
        _count: {
          select: {
            License: true,
            Usuario_Usuario_organizationIdToOrganization: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      organizations
    });
  } catch (error) {
    console.error('Error fetching organizations:', error);
    return NextResponse.json(
      { error: 'Error al obtener organizaciones' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['ADMINISTRADOR', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      contactEmail, // Este es el email del coordinador
      schoolAdminEmail, // Este es el email del school admin (OBLIGATORIO)
      logoUrl,
      brandColor,
      isGeofenced,
      campusLatitude,
      campusLongitude,
      geofenceRadius,
      standardLicensePrice,
      premiumLicensePrice,
      renewalOfferDiscount
    } = body;

    // ✅ VALIDACIÓN: Ambos emails son OBLIGATORIOS
    if (!contactEmail) {
      return NextResponse.json(
        { error: 'El email de contacto/coordinador es obligatorio.' },
        { status: 400 }
      );
    }

    if (!schoolAdminEmail) {
      return NextResponse.json(
        { error: 'El email del School Admin es obligatorio.' },
        { status: 400 }
      );
    }

    // Normalizar el nombre a Title Case (primera letra mayúscula de cada palabra)
    const normalizedName = toTitleCase(name);

    // Generar slug único
    const slug = normalizedName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const bcrypt = require('bcryptjs');
    const tempPassword = await bcrypt.hash('admin123', 10);

    // 👤 PASO 1: Crear o actualizar el COORDINADOR automáticamente
    let coordinatorId: number;
    const existingCoordinator = await prisma.usuario.findUnique({
      where: { email: contactEmail }
    });

    if (existingCoordinator) {
      // Usuario ya existe en el sistema
      if (existingCoordinator.rol === 'COORDINADOR') {
        // Ya es coordinador - solo asignar
        coordinatorId = existingCoordinator.id;
      } else {
        // Existe pero NO es coordinador - actualizarlo a COORDINADOR
        const updatedUser = await prisma.usuario.update({
          where: { email: contactEmail },
          data: {
            rol: 'COORDINADOR',
            isActive: true
          }
        });
        coordinatorId = updatedUser.id;
      }
    } else {
      // Usuario NO existe - crear nuevo coordinador
      const newCoordinator = await prisma.usuario.create({
        data: {
          email: contactEmail,
          nombre: `Coordinador de ${name}`,
          password: tempPassword,
          rol: 'COORDINADOR',
          tier: 'STANDARD',
          isActive: true,
          subscriptionStatus: 'ACTIVE',
          requirePasswordChange: true // Forzar cambio de contraseña en primer login
        }
      });
      coordinatorId = newCoordinator.id;
    }

    // 👤 PASO 2: Crear o actualizar el SCHOOL_ADMIN automáticamente
    let schoolAdminId: number;
    const existingSchoolAdmin = await prisma.usuario.findUnique({
      where: { email: schoolAdminEmail },
      include: {
        Organization_Organization_schoolAdminIdToUsuario: true // Verificar si ya es admin de otra org
      }
    });

    if (existingSchoolAdmin) {
      // Verificar si ya es school admin de otra organización
      if (existingSchoolAdmin.Organization_Organization_schoolAdminIdToUsuario) {
        return NextResponse.json(
          { 
            error: `El usuario ${schoolAdminEmail} ya es School Admin de otra organización (${existingSchoolAdmin.Organization_Organization_schoolAdminIdToUsuario.name}). Un School Admin solo puede administrar una organización a la vez.` 
          },
          { status: 400 }
        );
      }

      // Usuario ya existe en el sistema
      if (existingSchoolAdmin.rol === 'SCHOOL_ADMIN') {
        // Ya es school admin - solo asignar
        schoolAdminId = existingSchoolAdmin.id;
      } else {
        // Existe pero NO es school admin - actualizarlo a SCHOOL_ADMIN
        const updatedUser = await prisma.usuario.update({
          where: { email: schoolAdminEmail },
          data: {
            rol: 'SCHOOL_ADMIN',
            isActive: true
          }
        });
        schoolAdminId = updatedUser.id;
      }
    } else {
      // Usuario NO existe - crear nuevo school admin
      const newSchoolAdmin = await prisma.usuario.create({
        data: {
          email: schoolAdminEmail,
          nombre: `School Admin de ${normalizedName}`,
          password: tempPassword,
          rol: 'SCHOOL_ADMIN',
          tier: 'STANDARD',
          isActive: true,
          subscriptionStatus: 'ACTIVE',
          requirePasswordChange: true, // Forzar cambio de contraseña en primer login
        }
      });
      schoolAdminId = newSchoolAdmin.id;
      
      console.log(`✅ School Admin creado: ${schoolAdminEmail}`);
    }

    // 🏫 PASO 3: Crear la organización con ambos roles asignados
    const organization = await prisma.organization.create({
      data: {
        name: normalizedName,
        slug,
        contactEmail,
        logoUrl: logoUrl || null,
        brandColor: brandColor || '#6366F1',
        status: 'ACTIVE',
        isGeofenced: isGeofenced || false,
        campusLatitude: campusLatitude || null,
        campusLongitude: campusLongitude || null,
        geofenceRadius: geofenceRadius || 100,
        schoolAdminId: schoolAdminId, // ✅ School Admin
        standardLicensePrice: standardLicensePrice ? parseFloat(standardLicensePrice) : 600.00,
        premiumLicensePrice: premiumLicensePrice ? parseFloat(premiumLicensePrice) : 1250.00,
        renewalOfferDiscount: renewalOfferDiscount ? parseFloat(renewalOfferDiscount) : 50.00,
        updatedAt: new Date()
      }
    });

    // 🔗 PASO 4: Vincular ambos usuarios con la organización
    await prisma.usuario.update({
      where: { id: coordinatorId },
      data: { organizationId: organization.id }
    });

    await prisma.usuario.update({
      where: { id: schoolAdminId },
      data: { organizationId: organization.id }
    });

    console.log(`✅ Organización creada: ${organization.name} (ID: ${organization.id})`);

    return NextResponse.json({
      success: true,
      organization,
      message: 'Organización creada exitosamente con Coordinador y School Admin asignados'
    });
  } catch (error: any) {
    console.error('Error creating organization:', error);
    return NextResponse.json(
      { error: error.message || 'Error al crear organización' },
      { status: 500 }
    );
  }
}
