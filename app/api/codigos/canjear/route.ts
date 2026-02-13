import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { rateLimit, RateLimitPresets } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    // Rate limiting - proteger contra abuso de códigos
    const { result, response } = rateLimit(req, RateLimitPresets.auth);
    if (response) {
      logger.warn('Rate limit exceeded on codigos/canjear');
      return response;
    }

    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { codigo, nombreOrganizacion, address, logoUrl, geofencing, masterOrganizationId } = body;

    if (!codigo || !codigo.trim()) {
      return NextResponse.json({ error: 'Código requerido' }, { status: 400 });
    }

    // Buscar el usuario actual
    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { 
        id: true, 
        rol: true,
        nombre: true,
        email: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Buscar el código en la base de datos
    const codigoAcceso = await prisma.codigoAcceso.findUnique({
      where: { codigo: codigo.trim().toUpperCase() },
      include: {
        Usuario: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        }
      }
    });

    if (!codigoAcceso) {
      return NextResponse.json({ error: 'Código no válido' }, { status: 404 });
    }

    // Validar estado del código
    if (codigoAcceso.estado === 'EXPIRADO') {
      return NextResponse.json({ error: 'Este código ha expirado' }, { status: 400 });
    }

    // Para códigos que no son institucionales, verificar si ya fue canjeado
    if (codigoAcceso.tipo !== 'LICENCIAS_INSTITUCIONAL' && codigoAcceso.estado === 'CANJEADO') {
      return NextResponse.json({ 
        error: `Este código ya fue canjeado por ${codigoAcceso.Usuario?.nombre || 'otro usuario'}` 
      }, { status: 400 });
    }

    // Para códigos institucionales, verificar si hay licencias disponibles
    if (codigoAcceso.tipo === 'LICENCIAS_INSTITUCIONAL') {
      const licenciasUsadas = codigoAcceso.licenciasUsadas || 0;
      const licenciasTotales = codigoAcceso.cantidadLicencias || 0;

      if (licenciasUsadas >= licenciasTotales) {
        return NextResponse.json({ 
          error: 'Este código institucional ha agotado todas sus licencias' 
        }, { status: 400 });
      }
    }

    // Aplicar el beneficio según el tipo de código
    let resultado: any = {};

    switch (codigoAcceso.tipo) {
      case 'LICENCIAS_INSTITUCIONAL':
        // Crear organización si se proporcionó información
        let organizationId = null;
        
        if (nombreOrganizacion && nombreOrganizacion.trim()) {
          // Verificar si el usuario ya tiene una organización
          const existingOrg = await prisma.organization.findUnique({
            where: { schoolAdminId: user.id }
          });

          if (existingOrg) {
            // Si ya existe una organización, no permitir crear otra
            return NextResponse.json({ 
              error: 'Ya tienes una organización creada. No puedes canjear más códigos institucionales.',
              organizacion: existingOrg.name
            }, { status: 400 });
          }

          // Verificar si ya existe una organización con el mismo nombre (case-insensitive)
          const orgWithSameName = await prisma.organization.findFirst({
            where: {
              name: {
                equals: nombreOrganizacion.trim(),
                mode: 'insensitive'
              }
            }
          });

          if (orgWithSameName) {
            return NextResponse.json({ 
              error: 'Ya existe una organización con este nombre. Por favor elige otro nombre.',
              existingOrg: orgWithSameName.name
            }, { status: 400 });
          }

          // Generar slug único desde el nombre
          const baseSlug = nombreOrganizacion.trim().toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
          
          // Verificar si el slug ya existe y agregar número si es necesario
          let slug = baseSlug;
          let counter = 1;
          while (await prisma.organization.findUnique({ where: { slug } })) {
            slug = `${baseSlug}-${counter}`;
            counter++;
          }

          // Parsear geofencing data si existe
          let geofencingData = null;
          let isGeofenced = false;
          let campusLatitude = null;
          let campusLongitude = null;
          let geofenceRadius = 100;

          if (geofencing) {
            try {
              geofencingData = JSON.parse(geofencing);
              if (geofencingData.latitude && geofencingData.longitude) {
                isGeofenced = true;
                campusLatitude = geofencingData.latitude;
                campusLongitude = geofencingData.longitude;
                geofenceRadius = geofencingData.radius || 50;
              }
            } catch (e) {
              // Si no es JSON, es texto legacy
              logger.debug('Geofencing como texto legacy:', geofencing);
            }
          }

          const organization = await prisma.organization.create({
            data: {
              name: nombreOrganizacion.trim(),
              slug: slug,
              contactEmail: user.email || '',
              logoUrl: logoUrl || null,
              address: address?.trim() || null,
              isGeofenced: isGeofenced,
              campusLatitude: campusLatitude,
              campusLongitude: campusLongitude,
              geofenceRadius: geofenceRadius,
              totalLicenses: codigoAcceso.cantidadLicencias || 100,
              activeLicenses: 1, // Primera licencia usada por el que canjea
              licensesAvailable: (codigoAcceso.cantidadLicencias || 100) - 1, // Total - 1 (la del que canjea)
              schoolAdminId: user.id,
              masterOrganizationId: masterOrganizationId || null,
              status: 'ACTIVE',
              updatedAt: new Date()
            }
          });
          organizationId = organization.id;

          // Crear los registros individuales de License
          const cantidadLicencias = codigoAcceso.cantidadLicencias || 100;
          const licensesToCreate = [];
          
          for (let i = 0; i < cantidadLicencias; i++) {
            const licenseCode = `${organization.slug.toUpperCase()}-${String(i + 1).padStart(4, '0')}`;
            licensesToCreate.push({
              code: licenseCode,
              organizationId: organization.id,
              isActive: true,
              tierAssigned: 'PREMIUM',
              createdAt: new Date(),
              updatedAt: new Date(),
              expiresAt: new Date(new Date().setFullYear(new Date().getFullYear() + 1)) // 1 año
            });
          }
          
          // Crear todas las licencias en una sola transacción
          await prisma.license.createMany({
            data: licensesToCreate
          });
        }

        // Activar membresía del usuario y convertirlo en Director (SCHOOL_ADMIN)
        await prisma.usuario.update({
          where: { id: user.id },
          data: {
            rol: 'SCHOOL_ADMIN', // Convertir en Director de la institución
            suscripcion: 'ACTIVO',
            tier: 'PREMIUM',
            subscriptionStatus: 'ACTIVE',
            subscriptionPlan: 'SCHOOL_LICENSE',
            subscriptionStartDate: new Date(),
            subscriptionEndDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)), // 1 año
            organizationId: organizationId,
            isActive: true
          }
        });

        // Incrementar contador de licencias usadas
        await prisma.codigoAcceso.update({
          where: { id: codigoAcceso.id },
          data: {
            licenciasUsadas: (codigoAcceso.licenciasUsadas || 0) + 1,
            // Si ya se usaron todas las licencias, marcar como canjeado
            estado: (codigoAcceso.licenciasUsadas || 0) + 1 >= (codigoAcceso.cantidadLicencias || 0) 
              ? 'CANJEADO' 
              : 'DISPONIBLE',
            canjeadoPorId: user.id,
            canjeadoEn: new Date(),
            updatedAt: new Date()
          }
        });

        resultado = {
          tipo: 'LICENCIAS_INSTITUCIONAL',
          licenciasAsignadas: codigoAcceso.cantidadLicencias,
          licenciasUsadas: (codigoAcceso.licenciasUsadas || 0) + 1,
          organizationId
        };
        break;

      case 'MEMBRESIA_MENTOR':
        // Activar rol de mentor y membresía
        await prisma.usuario.update({
          where: { id: user.id },
          data: {
            rol: 'MENTOR',
            suscripcion: 'ACTIVO',
            tier: 'PREMIUM',
            subscriptionStatus: 'ACTIVE',
            subscriptionPlan: 'MENTOR',
            subscriptionStartDate: new Date(),
            subscriptionEndDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
            isActive: true
          }
        });

        // Crear perfil de mentor si no existe
        const existingMentorProfile = await prisma.perfilMentor.findUnique({
          where: { usuarioId: user.id }
        });

        if (!existingMentorProfile) {
          await prisma.perfilMentor.create({
            data: {
              usuarioId: user.id,
              biografia: `Mentor verificado - ${user.nombre}`,
              disponible: true,
              membershipActive: true,
              membershipStartDate: new Date(),
              membershipExpiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
              profileApprovalStatus: 'APPROVED'
            }
          });
        } else {
          await prisma.perfilMentor.update({
            where: { usuarioId: user.id },
            data: {
              membershipActive: true,
              membershipStartDate: new Date(),
              membershipExpiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
              disponible: true
            }
          });
        }

        // Marcar código como canjeado
        await prisma.codigoAcceso.update({
          where: { id: codigoAcceso.id },
          data: {
            estado: 'CANJEADO',
            canjeadoPorId: user.id,
            canjeadoEn: new Date(),
            updatedAt: new Date()
          }
        });

        resultado = {
          tipo: 'MEMBRESIA_MENTOR',
          mensaje: 'Membresía de mentor activada exitosamente'
        };
        break;

      case 'MEMBRESIA_STANDARD':
        await prisma.usuario.update({
          where: { id: user.id },
          data: {
            suscripcion: 'ACTIVO',
            tier: 'STANDARD',
            subscriptionStatus: 'ACTIVE',
            subscriptionPlan: 'STANDARD',
            subscriptionStartDate: new Date(),
            subscriptionEndDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
            isActive: true
          }
        });

        await prisma.codigoAcceso.update({
          where: { id: codigoAcceso.id },
          data: {
            estado: 'CANJEADO',
            canjeadoPorId: user.id,
            canjeadoEn: new Date(),
            updatedAt: new Date()
          }
        });

        resultado = {
          tipo: 'MEMBRESIA_STANDARD',
          mensaje: 'Membresía estándar activada exitosamente'
        };
        break;

      case 'MEMBRESIA_PREMIUM':
        await prisma.usuario.update({
          where: { id: user.id },
          data: {
            suscripcion: 'ACTIVO',
            tier: 'PREMIUM',
            subscriptionStatus: 'ACTIVE',
            subscriptionPlan: 'PREMIUM',
            subscriptionStartDate: new Date(),
            subscriptionEndDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
            isActive: true
          }
        });

        await prisma.codigoAcceso.update({
          where: { id: codigoAcceso.id },
          data: {
            estado: 'CANJEADO',
            canjeadoPorId: user.id,
            canjeadoEn: new Date(),
            updatedAt: new Date()
          }
        });

        resultado = {
          tipo: 'MEMBRESIA_PREMIUM',
          mensaje: 'Membresía premium activada exitosamente'
        };
        break;

      case 'MENTORIA_1_1':
        // Aquí podrías crear un crédito de sesión 1:1 o similar
        // Por ahora, simplemente activamos una membresía básica
        await prisma.usuario.update({
          where: { id: user.id },
          data: {
            suscripcion: 'ACTIVO',
            tier: 'STANDARD',
            subscriptionStatus: 'ACTIVE',
            isActive: true
          }
        });

        await prisma.codigoAcceso.update({
          where: { id: codigoAcceso.id },
          data: {
            estado: 'CANJEADO',
            canjeadoPorId: user.id,
            canjeadoEn: new Date(),
            updatedAt: new Date()
          }
        });

        resultado = {
          tipo: 'MENTORIA_1_1',
          mensaje: 'Sesión de mentoría 1:1 activada exitosamente'
        };
        break;

      default:
        return NextResponse.json({ error: 'Tipo de código no soportado' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      mensaje: 'Código canjeado exitosamente',
      ...resultado
    });

  } catch (error) {
    logger.error('Error canjeando código:', error);
    logger.error('Error details:', JSON.stringify(error, null, 2));
    
    // Enviar mensaje de error más específico
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    
    return NextResponse.json({ 
      error: 'Error al canjear el código',
      details: errorMessage
    }, { status: 500 });
  }
}
