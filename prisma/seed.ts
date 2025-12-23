import { PrismaClient, Rol, NivelMentor } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Actualizando mentores con comisiones correctas...');

  const mentorsData = [
    {
      email: 'roberto@impactovia.com',
      nombre: 'Roberto Martínez',
      // SENIOR: 15% para la plataforma
      nivel: 'SENIOR' as NivelMentor, 
      comisionPlataforma: 15,
      comisionMentor: 85,
      profileImage: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&h=400',
      jobTitle: 'Senior Business Strategist',
      experienceYears: 10,
      bioShort: 'Experto en escalar empresas de manera sostenible.',
      especialidad: 'Estrategia de Negocios',
      especialidadesSecundarias: ['Estrategia', 'Finanzas', 'Escalamiento'],
      skills: ['Estrategia', 'Finanzas'],
      disciplineDays: [1, 3, 5], 
    },
    {
      email: 'ana@impactovia.com',
      nombre: 'Ana Sofía Guerra',
      // MASTER: Solo 10% para la plataforma (Premio)
      nivel: 'MASTER' as NivelMentor,
      comisionPlataforma: 10,
      comisionMentor: 90,
      profileImage: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&h=400',
      jobTitle: 'Executive Leadership Coach',
      experienceYears: 15,
      bioShort: 'Coach ejecutiva certificada transformando equipos.',
      especialidad: 'Liderazgo Ejecutivo',
      especialidadesSecundarias: ['Coaching', 'Liderazgo', 'Transformación Organizacional'],
      skills: ['Coaching', 'Liderazgo'],
      disciplineDays: [2, 4], 
    },
    {
      email: 'carlos@impactovia.com',
      nombre: 'Carlos Rueda',
      // JUNIOR: 30% para la plataforma (Derecho de piso)
      nivel: 'JUNIOR' as NivelMentor,
      comisionPlataforma: 30,
      comisionMentor: 70,
      profileImage: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&h=400',
      jobTitle: 'Digital Marketing Specialist',
      experienceYears: 3,
      bioShort: 'Especialista en Growth Hacking y automatización.',
      especialidad: 'Marketing Digital',
      especialidadesSecundarias: ['Marketing', 'Tech', 'Growth Hacking'],
      skills: ['Marketing', 'Tech'],
      disciplineDays: [1, 2, 3, 4, 5], 
    },
  ];

  for (const mentor of mentorsData) {
    // PASO 1: Crear o actualizar el Usuario
    const usuario = await prisma.usuario.upsert({
      where: { email: mentor.email },
      update: {
        nombre: mentor.nombre,
        rol: Rol.MENTOR,
        isActive: true,
        profileImage: mentor.profileImage,
        jobTitle: mentor.jobTitle,
        experienceYears: mentor.experienceYears,
        bioShort: mentor.bioShort,
        skills: mentor.skills,
      }, 
      create: {
        email: mentor.email,
        nombre: mentor.nombre,
        rol: Rol.MENTOR, 
        isActive: true,
        profileImage: mentor.profileImage,
        jobTitle: mentor.jobTitle,
        experienceYears: mentor.experienceYears,
        bioShort: mentor.bioShort,
        skills: mentor.skills,
      },
    });

    // PASO 2: Crear o actualizar el PerfilMentor con comisiones
    const perfilMentor = await prisma.perfilMentor.upsert({
      where: { usuarioId: usuario.id },
      update: {
        nivel: mentor.nivel,
        comisionPlataforma: mentor.comisionPlataforma,
        comisionMentor: mentor.comisionMentor,
        especialidad: mentor.especialidad,
        especialidadesSecundarias: mentor.especialidadesSecundarias,
        biografiaCorta: mentor.bioShort,
        experienciaAnios: mentor.experienceYears,
        disponible: true,
        precioBase: 1500.0, // Precio base por sesión
      },
      create: {
        usuarioId: usuario.id,
        nivel: mentor.nivel,
        comisionPlataforma: mentor.comisionPlataforma,
        comisionMentor: mentor.comisionMentor,
        especialidad: mentor.especialidad,
        especialidadesSecundarias: mentor.especialidadesSecundarias,
        biografiaCorta: mentor.bioShort,
        experienciaAnios: mentor.experienceYears,
        disponible: true,
        precioBase: 1500.0, // Precio base por sesión
      },
    });

    console.log(`✅ ${usuario.nombre} actualizado: Nivel ${perfilMentor.nivel} | Comisión Plataforma ${perfilMentor.comisionPlataforma}% | Comisión Mentor ${perfilMentor.comisionMentor}%`);
  }

  console.log('🏁 Proceso terminado. 3 mentores actualizados con comisiones correctas.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
