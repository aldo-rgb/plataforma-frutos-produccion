import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedMentores() {
  console.log('🌱 Sembrando datos de mentores...');

  // Buscar o crear usuarios mentores
  const mentores = [
    {
      email: 'roberto.martinez@impactovia.com',
      nombre: 'Roberto Martínez',
      rol: 'MENTOR',
      nivel: 'SENIOR',
      titulo: 'Senior Business Strategist',
      especialidad: 'Estrategia de Negocios',
      especialidadesSecundarias: ['Finanzas Corporativas', 'Revenue Operations', 'Escalamiento'],
      biografiaCorta: 'Experto en ayudar empresas a escalar de manera sostenible. Más de 500 negocios transformados en 10 años.',
      biografiaCompleta: `Con más de una década de experiencia en el mundo corporativo y emprendedor, Roberto Martínez se ha especializado en ayudar a líderes a transformar sus negocios mediante estrategias financieras sólidas y procesos escalables.

Ha trabajado con startups, PyMEs y empresas Fortune 500, llevándolas de la incertidumbre financiera a modelos de crecimiento predecible. Su enfoque único combina análisis cuantitativo riguroso con una visión humanista del liderazgo.

Roberto cree que cada negocio tiene potencial ilimitado cuando se alinean tres factores: estrategia clara, ejecución disciplinada y liderazgo auténtico.`,
      logros: [
        '500+ emprendedores asesorados con éxito',
        'Empresas escaladas de $0 a $1M+ en revenue',
        'Speaker en 20+ conferencias internacionales',
        'Mentor certificado por ICF',
        '95% de satisfacción en sesiones'
      ],
      experienciaAnios: 10,
      imagen: 'https://i.pravatar.cc/300?img=12',
      destacado: true,
    },
    {
      email: 'ana.guerra@impactovia.com',
      nombre: 'Ana Sofía Guerra',
      rol: 'MENTOR',
      nivel: 'MASTER',
      titulo: 'Executive Leadership Coach',
      especialidad: 'Liderazgo y Desarrollo Personal',
      especialidadesSecundarias: ['Coaching Ejecutivo', 'Transformación Cultural', 'High Performance Teams'],
      biografiaCorta: 'Coach ejecutiva certificada con 15 años transformando equipos de alto rendimiento. Experta en liderazgo consciente.',
      biografiaCompleta: `Ana Sofía Guerra es reconocida internacionalmente como una de las coaches ejecutivas más influyentes en América Latina. Con 15 años de trayectoria, ha trabajado con CEOs, directores y equipos de alto rendimiento en empresas de tecnología, retail y servicios financieros.

Su metodología única combina neurociencia aplicada, mindfulness y técnicas de coaching ontológico para desbloquear el potencial humano en entornos corporativos de alta presión.

Ha facilitado transformaciones culturales en más de 50 organizaciones, logrando incrementos medibles en engagement, productividad y retención de talento. Ana cree que el liderazgo del futuro es empático, estratégico y centrado en el propósito.`,
      logros: [
        '15 años de experiencia en coaching ejecutivo',
        'Certificación ICF PCC (Professional Certified Coach)',
        '1000+ líderes transformados',
        'Autora del libro "Liderazgo Consciente en la Era Digital"',
        'Rating 5.0/5.0 en todas las sesiones',
        'TEDx Speaker: "El Poder de la Vulnerabilidad en el Liderazgo"'
      ],
      experienciaAnios: 15,
      imagen: 'https://i.pravatar.cc/300?img=47',
      destacado: false,
    },
    {
      email: 'carlos.rueda@impactovia.com',
      nombre: 'Carlos Rueda',
      rol: 'MENTOR',
      nivel: 'JUNIOR',
      titulo: 'Digital Marketing Specialist',
      especialidad: 'Tecnología y Marketing Digital',
      especialidadesSecundarias: ['SEO', 'Automatización', 'Growth Hacking', 'Social Media'],
      biografiaCorta: 'Especialista en marketing digital y automatización. Ayudo a negocios a generar leads y ventas online de forma escalable.',
      biografiaCompleta: `Carlos Rueda es un joven talento en el mundo del marketing digital con 3 años de experiencia intensa en agencias y startups tecnológicas. Su enfoque data-driven y orientado a resultados lo ha convertido en un aliado clave para negocios que buscan despegar en el mundo online.

Especializado en estrategias de SEO, automatización de marketing y growth hacking, Carlos ha ayudado a decenas de emprendedores a construir sistemas de generación de leads predecibles y escalables.

Su pasión por la tecnología y la creatividad lo llevan a estar siempre al día con las últimas tendencias en IA, herramientas no-code y plataformas emergentes. Carlos cree que el marketing del futuro es automatizado, personalizado y profundamente humano.`,
      logros: [
        '3 años de experiencia en agencias digitales',
        '100+ campañas de marketing ejecutadas',
        'Especialista certificado en Google Ads y Meta Ads',
        'Experto en herramientas de automatización (Zapier, Make, n8n)',
        'Generación de 10M+ impresiones orgánicas para clientes'
      ],
      experienciaAnios: 3,
      imagen: 'https://i.pravatar.cc/300?img=33',
      destacado: false,
    },
  ];

  for (const mentorData of mentores) {
    // Crear o actualizar usuario
    const usuario = await prisma.usuario.upsert({
      where: { email: mentorData.email },
      update: {
        nombre: mentorData.nombre,
        rol: mentorData.rol as any,
        suscripcion: 'ACTIVO',
        isActive: true,
      },
      create: {
        email: mentorData.email,
        nombre: mentorData.nombre,
        password: '$2a$10$hashedpassword', // Password hasheado genérico
        rol: mentorData.rol as any,
        suscripcion: 'ACTIVO',
        isActive: true,
        imagen: mentorData.imagen,
      },
    });

    // Crear perfil de mentor
    const perfilMentor = await prisma.perfilMentor.upsert({
      where: { usuarioId: usuario.id },
      update: {
        nivel: mentorData.nivel as any,
        titulo: mentorData.titulo,
        especialidad: mentorData.especialidad,
        especialidadesSecundarias: mentorData.especialidadesSecundarias,
        biografia: mentorData.biografiaCorta, // Campo legacy
        biografiaCorta: mentorData.biografiaCorta,
        biografiaCompleta: mentorData.biografiaCompleta,
        logros: mentorData.logros,
        experienciaAnios: mentorData.experienciaAnios,
        totalSesiones: Math.floor(Math.random() * 100) + 20, // 20-120 sesiones
        calificacionPromedio: 4.5 + Math.random() * 0.5, // 4.5-5.0
        totalResenas: Math.floor(Math.random() * 50) + 10, // 10-60 reseñas
        disponible: true,
        destacado: mentorData.destacado,
      },
      create: {
        usuarioId: usuario.id,
        nivel: mentorData.nivel as any,
        titulo: mentorData.titulo,
        especialidad: mentorData.especialidad,
        especialidadesSecundarias: mentorData.especialidadesSecundarias,
        biografia: mentorData.biografiaCorta,
        biografiaCorta: mentorData.biografiaCorta,
        biografiaCompleta: mentorData.biografiaCompleta,
        logros: mentorData.logros,
        experienciaAnios: mentorData.experienciaAnios,
        totalSesiones: Math.floor(Math.random() * 100) + 20,
        calificacionPromedio: 4.5 + Math.random() * 0.5,
        totalResenas: Math.floor(Math.random() * 50) + 10,
        disponible: true,
        destacado: mentorData.destacado,
        comisionMentor: 85,
        comisionPlataforma: 15,
      },
    });

    // Crear servicios para el mentor
    const precioBase = mentorData.nivel === 'MASTER' ? 900 : mentorData.nivel === 'SENIOR' ? 1000 : 800;

    // Limpiar servicios existentes para recrear
    await prisma.servicioMentoria.deleteMany({
      where: { perfilMentorId: perfilMentor.id },
    });

    // Crear servicios
    await prisma.servicioMentoria.create({
      data: {
        perfilMentorId: perfilMentor.id,
        tipo: 'SESION_1_1',
        nombre: 'Sesión 1:1 (1 hora)',
        descripcion: 'Sesión personalizada enfocada en resolver tus desafíos específicos',
        duracionHoras: 1,
        precioTotal: precioBase,
        activo: true,
      },
    });

    await prisma.servicioMentoria.create({
      data: {
        perfilMentorId: perfilMentor.id,
        tipo: 'PAQUETE_MENSUAL',
        nombre: 'Paquete Mensual (4 horas)',
        descripcion: '4 sesiones de 1 hora con seguimiento continuo durante el mes',
        duracionHoras: 4,
        precioTotal: precioBase * 3.5,
        activo: true,
      },
    });

    await prisma.servicioMentoria.create({
      data: {
        perfilMentorId: perfilMentor.id,
        tipo: 'CONSULTORIA_EXPRESS',
        nombre: 'Consultoría Express (30 min)',
        descripcion: 'Respuesta rápida a una pregunta o desafío específico',
        duracionHoras: 0.5,
        precioTotal: precioBase * 0.6,
        activo: true,
      },
    });

    console.log(`✅ Mentor ${mentorData.nombre} - ${perfilMentor.nivel} - ${mentorData.especialidad}`);
  }

  console.log('🎉 Seed de mentores completado!');
}

seedMentores()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
