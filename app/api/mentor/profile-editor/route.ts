import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import logger from '@/lib/logger';


// GET: Leer el perfil actual (Usuario + PerfilMentor)
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: {
        nombre: true,
        profileImage: true,
        jobTitle: true,
        bioShort: true,
        bioFull: true,
        experienceYears: true,
        skills: true,
        vision: true,
        sede: true,
        PerfilMentor: {
          select: {
            nivel: true,
            titulo: true,
            especialidad: true,
            especialidadesSecundarias: true,
            biografia: true,
            biografiaCorta: true,
            biografiaCompleta: true,
            logros: true,
            experienciaAnios: true,
            precioBase: true,
            precioDisciplina: true,
            disponible: true,
            comisionMentor: true,
            comisionPlataforma: true,
            enlaceVideoLlamada: true,
            tipoVideoLlamada: true,
            videoIntroUrl: true,
            maxDisciplineClients: true,
            acceptingNewClients: true,
            profileApprovalStatus: true,
            profileSubmittedAt: true
          }
        }
      }
    });

    logger.debug('🔍 Enlace leído de la BD:', usuario?.PerfilMentor?.enlaceVideoLlamada);
    logger.debug('🔍 Tipo leído de la BD:', usuario?.PerfilMentor?.tipoVideoLlamada);

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Combinar datos de Usuario y PerfilMentor
    const perfilCompleto = {
      ...usuario,
      ...(usuario.PerfilMentor || {})
    };

    return NextResponse.json(perfilCompleto);
  } catch (error) {
    logger.error('Error obteniendo perfil:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// PUT: Guardar cambios en Usuario y PerfilMentor
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { usuario: usuarioData, perfilMentor: perfilMentorData } = body;

    if (!usuarioData && !perfilMentorData) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
    }

    // Actualizar Usuario si hay datos
    if (usuarioData) {
      if (usuarioData.experienceYears !== undefined) {
        usuarioData.experienceYears = Number(usuarioData.experienceYears);
      }

      await prisma.usuario.update({
        where: { id: session.user.id },
        data: {
          profileImage: usuarioData.profileImage,
          jobTitle: usuarioData.jobTitle,
          bioShort: usuarioData.bioShort,
          bioFull: usuarioData.bioFull,
          experienceYears: usuarioData.experienceYears,
          skills: usuarioData.skills,
          vision: usuarioData.vision,
          sede: usuarioData.sede
        }
      });
    }

    // Actualizar o crear PerfilMentor si hay datos
    if (perfilMentorData) {
      logger.debug('📝 Datos de PerfilMentor recibidos:', {
        enlaceVideoLlamada: perfilMentorData.enlaceVideoLlamada,
        tipoVideoLlamada: perfilMentorData.tipoVideoLlamada
      });
      
      // Convertir números
      if (perfilMentorData.experienciaAnios !== undefined) {
        perfilMentorData.experienciaAnios = Number(perfilMentorData.experienciaAnios);
      }
      if (perfilMentorData.precioBase !== undefined) {
        perfilMentorData.precioBase = Number(perfilMentorData.precioBase);
      }
      if (perfilMentorData.precioDisciplina !== undefined) {
        perfilMentorData.precioDisciplina = Number(perfilMentorData.precioDisciplina);
      }

      // Verificar si existe el perfil de mentor
      const perfilExiste = await prisma.perfilMentor.findUnique({
        where: { usuarioId: session.user.id }
      });

      if (perfilExiste) {
        // Actualizar perfil existente (sin nivel ni comisiones)
        await prisma.perfilMentor.update({
          where: { usuarioId: session.user.id },
          data: {
            titulo: perfilMentorData.titulo,
            especialidad: perfilMentorData.especialidad,
            especialidadesSecundarias: perfilMentorData.especialidadesSecundarias,
            biografia: perfilMentorData.biografia,
            biografiaCorta: perfilMentorData.biografiaCorta,
            biografiaCompleta: perfilMentorData.biografiaCompleta,
            logros: perfilMentorData.logros,
            experienciaAnios: perfilMentorData.experienciaAnios,
            precioBase: perfilMentorData.precioBase,
            precioDisciplina: perfilMentorData.precioDisciplina,
            disponible: perfilMentorData.disponible,
            enlaceVideoLlamada: perfilMentorData.enlaceVideoLlamada,
            tipoVideoLlamada: perfilMentorData.tipoVideoLlamada,
            videoIntroUrl: perfilMentorData.videoIntroUrl,
            maxDisciplineClients: perfilMentorData.maxDisciplineClients !== undefined ? Number(perfilMentorData.maxDisciplineClients) : undefined,
            acceptingNewClients: perfilMentorData.acceptingNewClients,
            updatedAt: new Date()
          }
        });
        
        logger.debug('✅ PerfilMentor actualizado con enlace:', perfilMentorData.enlaceVideoLlamada);

        // Si se actualizó el precio base, actualizar también el servicio
        if (perfilMentorData.precioBase !== undefined) {
          const nuevoPrecio = Number(perfilMentorData.precioBase);
          
          // Buscar el servicio principal del mentor
          const servicioPrincipal = await prisma.servicioMentoria.findFirst({
            where: { 
              perfilMentorId: perfilExiste.id,
              tipo: 'SESION_1_1'
            }
          });

          if (servicioPrincipal) {
            // Actualizar el precio del servicio existente
            await prisma.servicioMentoria.update({
              where: { id: servicioPrincipal.id },
              data: { precioTotal: nuevoPrecio }
            });
            logger.debug(`✅ Precio del servicio actualizado automáticamente: $${nuevoPrecio}`);
          } else {
            // Si no existe servicio, crear uno
            await prisma.servicioMentoria.create({
              data: {
                perfilMentorId: perfilExiste.id,
                tipo: 'SESION_1_1',
                nombre: 'Sesión Individual de Mentoría',
                descripcion: 'Sesión personalizada 1 a 1 con tu mentor',
                duracionHoras: 1,
                precioTotal: nuevoPrecio,
                activo: true
              }
            });
            logger.debug(`✅ Servicio creado automáticamente con precio: $${nuevoPrecio}`);
          }
        }
      } else {
        // Crear nuevo perfil de mentor (con valores predeterminados para nivel y comisiones)
        const nuevoPerfilMentor = await prisma.perfilMentor.create({
          data: {
            usuarioId: session.user.id,
            nivel: 'JUNIOR', // Nivel inicial por defecto
            titulo: perfilMentorData.titulo || '',
            especialidad: perfilMentorData.especialidad || '',
            especialidadesSecundarias: perfilMentorData.especialidadesSecundarias || [],
            biografia: perfilMentorData.biografia,
            biografiaCorta: perfilMentorData.biografiaCorta,
            biografiaCompleta: perfilMentorData.biografiaCompleta,
            logros: perfilMentorData.logros || [],
            experienciaAnios: perfilMentorData.experienciaAnios || 0,
            precioBase: perfilMentorData.precioBase || 1000,
            precioDisciplina: perfilMentorData.precioDisciplina || 90,
            disponible: perfilMentorData.disponible !== undefined ? perfilMentorData.disponible : true,
            comisionMentor: perfilMentorData.comisionMentor || 70,
            comisionPlataforma: perfilMentorData.comisionPlataforma || 30,
            enlaceVideoLlamada: perfilMentorData.enlaceVideoLlamada,
            tipoVideoLlamada: perfilMentorData.tipoVideoLlamada,
            videoIntroUrl: perfilMentorData.videoIntroUrl,
            maxDisciplineClients: perfilMentorData.maxDisciplineClients !== undefined ? Number(perfilMentorData.maxDisciplineClients) : 10,
            acceptingNewClients: perfilMentorData.acceptingNewClients !== undefined ? perfilMentorData.acceptingNewClients : true
          }
        });

        // Crear servicio automáticamente con el precio base
        const precioInicial = perfilMentorData.precioBase || 1000;
        await prisma.servicioMentoria.create({
          data: {
            perfilMentorId: nuevoPerfilMentor.id,
            tipo: 'SESION_1_1',
            nombre: 'Sesión Individual de Mentoría',
            descripcion: 'Sesión personalizada 1 a 1 con tu mentor',
            duracionHoras: 1,
            precioTotal: precioInicial,
            activo: true
          }
        });
        logger.debug(`✅ Servicio creado automáticamente para nuevo mentor con precio: $${precioInicial}`);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error guardando perfil:', error);
    return NextResponse.json({ error: 'Error al guardar perfil' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
