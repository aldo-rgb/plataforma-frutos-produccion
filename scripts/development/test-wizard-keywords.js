const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Buscar un usuario con wizard completado (Iri tiene ticket de PL)
  const user = await prisma.usuario.findFirst({
    where: { id: 34 }, // Iri
    select: {
      id: true,
      nombre: true,
      goals: true,
      CartaFrutos: {
        take: 1,
        orderBy: { fechaCreacion: 'desc' },
        select: {
          id: true,
          estado: true,
          finanzasDeclaracion: true,
          relacionesDeclaracion: true,
          talentosDeclaracion: true,
          saludDeclaracion: true,
          pazMentalDeclaracion: true,
          ocioDeclaracion: true,
          servicioTransDeclaracion: true,
          servicioComunDeclaracion: true,
          Meta: {
            orderBy: { orden: 'asc' },
            select: { metaPrincipal: true, categoria: true }
          }
        }
      }
    }
  });
  
  console.log('=== USUARIO ===');
  console.log('ID:', user.id, '| Nombre:', user.nombre);
  console.log('Goals:', user.goals);
  
  const carta = user.CartaFrutos?.[0];
  if (carta) {
    console.log('\n=== CARTA FRUTOS ===');
    console.log('Estado:', carta.estado);
    console.log('Finanzas:', carta.finanzasDeclaracion);
    console.log('Relaciones:', carta.relacionesDeclaracion);
    console.log('\n=== METAS ===');
    carta.Meta?.forEach((m, i) => {
      console.log(`  ${i+1}. [${m.categoria}] ${m.metaPrincipal}`);
    });
  } else {
    console.log('No tiene CartaFrutos');
  }
  
  await prisma.$disconnect();
}

check().catch(console.error);
