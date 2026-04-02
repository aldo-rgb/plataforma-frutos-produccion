const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const carta = await prisma.cartaFrutos.findFirst({
    where: {
      Usuario: {
        email: {
          contains: 'brenda'
        }
      }
    },
    select: {
      id: true,
      estado: true,
      // Campos *Meta (metas/objetivos del paso 2)
      finanzasMeta: true,
      relacionesMeta: true,
      talentosMeta: true,
      saludMeta: true,
      pazMentalMeta: true,
      ocioMeta: true,
      servicioTransMeta: true,
      servicioComunMeta: true,
      // Campos *Declaracion (declaraciones YO SOY del paso 1)
      finanzasDeclaracion: true,
      relacionesDeclaracion: true,
      talentosDeclaracion: true,
      saludDeclaracion: true,
      pazMentalDeclaracion: true,
      ocioDeclaracion: true,
      servicioTransDeclaracion: true,
      servicioComunDeclaracion: true,
      Usuario: {
        select: { email: true, nombre: true }
      }
    }
  });
  
  console.log('Usuario:', carta?.Usuario?.nombre, '-', carta?.Usuario?.email);
  console.log('\n=== PASO 1: Declaraciones YO SOY (*Declaracion) ===');
  console.log('finanzasDeclaracion:', carta?.finanzasDeclaracion || '(vacío)');
  console.log('relacionesDeclaracion:', carta?.relacionesDeclaracion || '(vacío)');
  console.log('talentosDeclaracion:', carta?.talentosDeclaracion || '(vacío)');
  console.log('saludDeclaracion:', carta?.saludDeclaracion || '(vacío)');
  console.log('pazMentalDeclaracion:', carta?.pazMentalDeclaracion || '(vacío)');
  console.log('ocioDeclaracion:', carta?.ocioDeclaracion || '(vacío)');
  
  console.log('\n=== PASO 2: Metas/Objetivos (*Meta) ===');
  console.log('finanzasMeta:', carta?.finanzasMeta || '(vacío)');
  console.log('relacionesMeta:', carta?.relacionesMeta || '(vacío)');
  console.log('talentosMeta:', carta?.talentosMeta || '(vacío)');
  console.log('saludMeta:', carta?.saludMeta || '(vacío)');
  console.log('pazMentalMeta:', carta?.pazMentalMeta || '(vacío)');
  console.log('ocioMeta:', carta?.ocioMeta || '(vacío)');
  
  await prisma.$disconnect();
}

check().catch(console.error);
