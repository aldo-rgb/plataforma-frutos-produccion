// Script para crear las categorías iniciales del Directorio de Talentos
// Ejecutar con: npx ts-node --compiler-options '{"module":"CommonJS"}' seed-business-categories.ts

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const categories = [
  { name: 'Salud', slug: 'salud', icon: '🏥', description: 'Médicos, dentistas, psicólogos, nutriólogos, fisioterapeutas' },
  { name: 'Construcción', slug: 'construccion', icon: '🏗️', description: 'Arquitectos, ingenieros, contratistas, albañiles' },
  { name: 'Legal', slug: 'legal', icon: '⚖️', description: 'Abogados, notarios, gestores, asesores legales' },
  { name: 'Alimentos', slug: 'alimentos', icon: '🍽️', description: 'Restaurantes, catering, comida preparada, pastelerías' },
  { name: 'Tecnología', slug: 'tecnologia', icon: '💻', description: 'Desarrollo de software, diseño web, IT, soporte técnico' },
  { name: 'Oficios', slug: 'oficios', icon: '🔧', description: 'Electricistas, plomeros, carpinteros, mecánicos' },
  { name: 'Transporte', slug: 'transporte', icon: '🚚', description: 'Mudanzas, fletes, transporte ejecutivo, mensajería' },
  { name: 'Educación', slug: 'educacion', icon: '📚', description: 'Tutores, coaches, capacitadores, instructores' },
  { name: 'Belleza y Estética', slug: 'belleza', icon: '💅', description: 'Estilistas, maquillistas, spas, barberías' },
  { name: 'Finanzas', slug: 'finanzas', icon: '💰', description: 'Contadores, asesores financieros, seguros, inversiones' },
  { name: 'Inmobiliaria', slug: 'inmobiliaria', icon: '🏠', description: 'Venta y renta de propiedades, valuadores, administradores' },
  { name: 'Marketing y Publicidad', slug: 'marketing', icon: '📣', description: 'Diseño gráfico, redes sociales, fotografía, video' },
  { name: 'Eventos', slug: 'eventos', icon: '🎉', description: 'Organizadores, decoradores, DJ, animadores' },
  { name: 'Automotriz', slug: 'automotriz', icon: '🚗', description: 'Mecánicos, refaccionarias, car wash, hojalatería' },
  { name: 'Mascotas', slug: 'mascotas', icon: '🐕', description: 'Veterinarios, estéticas caninas, entrenadores, paseadores' },
  { name: 'Fitness y Deporte', slug: 'fitness', icon: '💪', description: 'Entrenadores personales, gimnasios, nutrición deportiva' },
  { name: 'Arte y Creatividad', slug: 'arte', icon: '🎨', description: 'Artistas, músicos, artesanos, fotógrafos' },
  { name: 'Comercio', slug: 'comercio', icon: '🛒', description: 'Tiendas, distribuidores, mayoristas, minoristas' },
  { name: 'Limpieza', slug: 'limpieza', icon: '🧹', description: 'Limpieza de casas, oficinas, fumigación, jardinería' },
  { name: 'Otro', slug: 'otro', icon: '📦', description: 'Otros servicios no clasificados' },
];

async function main() {
  console.log('🌱 Sembrando categorías del Directorio de Talentos...\n');

  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    
    const existing = await prisma.businessCategory.findUnique({
      where: { slug: cat.slug }
    });

    if (existing) {
      console.log(`⏭️  Categoría "${cat.name}" ya existe, saltando...`);
      continue;
    }

    await prisma.businessCategory.create({
      data: {
        ...cat,
        sortOrder: i + 1,
        isActive: true,
      }
    });

    console.log(`✅ Categoría "${cat.icon} ${cat.name}" creada`);
  }

  console.log('\n✨ Categorías creadas exitosamente!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
