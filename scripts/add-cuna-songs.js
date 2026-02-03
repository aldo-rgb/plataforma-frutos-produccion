const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cancionesCuna = [
    { title: 'Ella', artist: 'Bebe' },
    { title: 'Si yo fuera un chico', artist: 'Beyonce' },
    { title: 'Solo déjate amar', artist: 'Kalimba' },
    { title: 'El mejor día de mi vida', artist: 'Reyli' },
    { title: 'Ángel de cristal', artist: 'Ednita Nazario' },
    { title: 'El equilibrista', artist: 'Eros Ramazzotti' },
    { title: 'Sinfonía', artist: 'Christopher von Uckermann' },
    { title: 'Sin pausas', artist: 'Ednita Nazario' },
    { title: 'Vuela Águila', artist: 'Tercer Cielo' },
    { title: 'Soñar', artist: 'Carla Morrison' },
    { title: 'Vive ya', artist: 'Andrea Bocelli y Laura Pausini' },
    { title: 'Sé quién soy', artist: 'Reyli' },
    { title: 'Hombre de Luz', artist: 'Lupita D\'Alessio' },
    { title: 'Uno entre mil', artist: 'Mijares' },
    { title: 'Volver a amar', artist: 'Cristian Castro' },
    { title: 'La fuerza de amar', artist: 'Myriam Hernández' },
    { title: 'Creo en mí', artist: 'Natalia Jiménez' },
    { title: 'Veo en ti la luz', artist: 'Chayanne y Danna Paola' },
    { title: 'Libre', artist: 'Alejandra Guzmán' },
    { title: 'Así como hoy', artist: 'Marco Antonio Solís' },
    { title: 'Abrazar la vida', artist: 'Luis Fonsi' },
    { title: 'El poder de tu amor', artist: 'Ricardo Montaner' },
    { title: 'Aquí estoy yo', artist: 'Luis Fonsi' }
  ];

  console.log('Agregando canciones de cuna al sistema...\n');

  for (const c of cancionesCuna) {
    const existing = await prisma.metamorfosisCunaSong.findFirst({
      where: { title: c.title, isSystemDefault: true }
    });

    if (existing) {
      console.log('Ya existe:', c.title);
    } else {
      const created = await prisma.metamorfosisCunaSong.create({
        data: {
          title: c.title,
          artist: c.artist,
          isSystemDefault: true,
          trainerId: null
        }
      });
      console.log('Creada:', created.title, `(${c.artist})`);
    }
  }

  console.log('\n=== Canciones de Cuna del Sistema ===');
  const all = await prisma.metamorfosisCunaSong.findMany({
    where: { isSystemDefault: true },
    orderBy: { title: 'asc' }
  });
  console.log('Total:', all.length);
  all.forEach(s => console.log('-', s.title, s.artist ? `(${s.artist})` : ''));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
