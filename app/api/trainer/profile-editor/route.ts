import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import logger from '@/lib/logger';

const prisma = new PrismaClient();

// GET: Leer el perfil actual (Usuario + PerfilTrainer)
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
        esEntrenador: true,
        PerfilTrainer: {
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
            disponible: true,
            enlaceVideoLlamada: true,
            tipoVideoLlamada: true,
            maxClients: true,
            acceptingNewClients: true,
            profileApprovalStatus: true,
            profileSubmittedAt: true,
            tagline: true,
            expertiseTags: true,
            methodologyStyle: true,
            idealClientDescription: true,
            heroJourneyBio: true,
            promiseStatement: true,
            videoIntroUrl: true
          }
        }
      }
    });

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    if (!usuario.esEntrenador && !usuario.PerfilTrainer) {
      return NextResponse.json({ error: 'No eres un entrenador aprobado' }, { status: 403 });
    }

    // Combinar datos de Usuario y PerfilTrainer
    const perfilCompleto = {
      ...usuario,
      ...(usuario.PerfilTrainer || {})
    };

    return NextResponse.json(perfilCompleto);
  } catch (error) {
    logger.error('Error obteniendo perfil de trainer:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// PUT: Guardar cambios en Usuario y PerfilTrainer
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Verificar que sea trainer
    const currentUser = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { esEntrenador: true, PerfilTrainer: { select: { id: true } } }
    });

    if (!currentUser?.esEntrenador && !currentUser?.PerfilTrainer) {
      return NextResponse.json({ error: 'No eres un entrenador aprobado' }, { status: 403 });
    }

    const body = await request.json();
    const { usuario: usuarioData, perfilTrainer: perfilTrainerData } = body;

    if (!usuarioData && !perfilTrainerData) {
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

    // Actualizar PerfilTrainer si hay datos
    if (perfilTrainerData) {
      // Convertir números
      if (perfilTrainerData.experienciaAnios !== undefined) {
        perfilTrainerData.experienciaAnios = Number(perfilTrainerData.experienciaAnios);
      }
      if (perfilTrainerData.maxClients !== undefined) {
        perfilTrainerData.maxClients = Number(perfilTrainerData.maxClients);
      }

      // Verificar si existe el perfil de trainer
      const perfilExiste = await prisma.perfilTrainer.findUnique({
        where: { usuarioId: session.user.id }
      });

      if (perfilExiste) {
        // Actualizar perfil existente
        await prisma.perfilTrainer.update({
          where: { usuarioId: session.user.id },
          data: {
            titulo: perfilTrainerData.titulo,
            especialidad: perfilTrainerData.especialidad,
            especialidadesSecundarias: perfilTrainerData.especialidadesSecundarias,
            biografia: perfilTrainerData.biografia,
            biografiaCorta: perfilTrainerData.biografiaCorta,
            biografiaCompleta: perfilTrainerData.biografiaCompleta,
            logros: perfilTrainerData.logros,
            experienciaAnios: perfilTrainerData.experienciaAnios,
            disponible: perfilTrainerData.disponible,
            enlaceVideoLlamada: perfilTrainerData.enlaceVideoLlamada,
            tipoVideoLlamada: perfilTrainerData.tipoVideoLlamada,
            maxClients: perfilTrainerData.maxClients,
            acceptingNewClients: perfilTrainerData.acceptingNewClients,
            tagline: perfilTrainerData.tagline,
            expertiseTags: perfilTrainerData.expertiseTags,
            methodologyStyle: perfilTrainerData.methodologyStyle,
            idealClientDescription: perfilTrainerData.idealClientDescription,
            heroJourneyBio: perfilTrainerData.heroJourneyBio,
            promiseStatement: perfilTrainerData.promiseStatement,
            videoIntroUrl: perfilTrainerData.videoIntroUrl
          }
        });
      } else {
        // Crear nuevo perfil si no existe (aunque ya debería existir al aprobar la solicitud)
        await prisma.perfilTrainer.create({
          data: {
            usuarioId: session.user.id,
            titulo: perfilTrainerData.titulo || '',
            especialidad: perfilTrainerData.especialidad || '',
            especialidadesSecundarias: perfilTrainerData.especialidadesSecundarias || [],
            biografia: perfilTrainerData.biografia || '',
            biografiaCorta: perfilTrainerData.biografiaCorta || '',
            biografiaCompleta: perfilTrainerData.biografiaCompleta || '',
            logros: perfilTrainerData.logros || [],
            experienciaAnios: perfilTrainerData.experienciaAnios || 0,
            disponible: perfilTrainerData.disponible ?? true,
            enlaceVideoLlamada: perfilTrainerData.enlaceVideoLlamada,
            tipoVideoLlamada: perfilTrainerData.tipoVideoLlamada,
            maxClients: perfilTrainerData.maxClients || 10,
            acceptingNewClients: perfilTrainerData.acceptingNewClients ?? true,
            tagline: perfilTrainerData.tagline,
            expertiseTags: perfilTrainerData.expertiseTags || [],
            methodologyStyle: perfilTrainerData.methodologyStyle,
            idealClientDescription: perfilTrainerData.idealClientDescription,
            heroJourneyBio: perfilTrainerData.heroJourneyBio,
            promiseStatement: perfilTrainerData.promiseStatement,
            videoIntroUrl: perfilTrainerData.videoIntroUrl
          }
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Perfil de entrenador actualizado correctamente' 
    });
  } catch (error) {
    logger.error('Error actualizando perfil de trainer:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
