const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const canciones = [
    { title: 'Pelo suelto', artist: 'Gloria Trevi' },
    { title: 'Single Ladies', artist: 'Beyonce' },
    { title: 'Beethoven Fur Elise', artist: null },
    { title: 'Torero', artist: 'Chayanne' },
    { title: 'Lady in Red', artist: 'Chris de Burgh' },
    { title: 'YMCA y Macho Man', artist: 'Village People' },
    { title: 'Bohemia Rhapsody y We will Rock You', artist: 'Queen' },
    { title: 'Lago de los cisnes', artist: null },
    { title: 'Quiero que me hagas el amor', artist: 'Ednita Nazario' },
    { title: 'Canción instrumental', artist: null },
    { title: 'Poker Face', artist: 'Lady Gaga' },
    { title: 'La vida es un carnaval', artist: 'Celia Cruz' },
    { title: 'Earned It (Fifty Shades Of Grey)', artist: 'The Weeknd' },
    { title: 'You Sexy, Chependale', artist: null },
    { title: 'Fuego de noche nieve de día', artist: 'Ricky Martin' },
    { title: 'Rata de dos patas, tres veces te engañé', artist: 'Paquita la del barrio y Lady Mamadal' },
    { title: 'Culpable o no y cuando calienta el sol', artist: 'Luis Miguel' },
    { title: 'Doctor Psiquiatra y todos me miran', artist: 'Gloria Trevi' },
    { title: 'Todos me miran', artist: 'Gloria Trevi' },
    { title: 'Libertad', artist: 'Christian Chávez y Anahí' },
    { title: 'De Color de Rosas', artist: 'Prisma' },
    { title: 'Copa de la Vida', artist: 'Ricky Martín' },
    { title: 'Welcome to the Jungle', artist: "Guns N'Roses" }
  ];

  console.log('Agregando canciones al sistema...\n');

  for (const c of canciones) {
    const existing = await prisma.metamorfosisSong.findFirst({
      where: { title: c.title, isSystemDefault: true }
    });

    if (existing) {
      console.log('Ya existe:', c.title);
    } else {
      const created = await prisma.metamorfosisSong.create({
        data: {
          title: c.title,
          artist: c.artist,
          isSystemDefault: true,
          trainerId: null
        }
      });
      console.log('Creada:', created.title, c.artist ? `(${c.artist})` : '');
    }
  }

  console.log('\n=== Canciones del Sistema ===');
  const all = await prisma.metamorfosisSong.findMany({
    where: { isSystemDefault: true },
    orderBy: { title: 'asc' }
  });
  console.log('Total:', all.length);
  all.forEach(s => console.log('-', s.title, s.artist ? `(${s.artist})` : ''));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
