const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCartaMetas() {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { email: 'game3@quanter.com' },
      select: { id: true }
    });
    
    // Get carta ID
    const carta = await prisma.cartaFrutos.findFirst({
      where: { usuarioId: usuario.id },
      select: { id: true, estado: true },
      orderBy: { fechaCreacion: 'desc' }
    });
    
    console.log('📋 Carta ID:', carta?.id, '- Estado:', carta?.estado);
    
    if (!carta) {
      console.log('❌ No se encontró carta');
      return;
    }
    
    // Get all metas
    const metas = await prisma.meta.findMany({
      where: { cartaId: carta.id },
      select: {
        id: true,
        categoria: true,
        metaPrincipal: true,
        declaracionPoder: true
      },
      orderBy: { id: 'asc' }
    });
    
    console.log('\n📊 Total metas guardadas:', metas.length);
    
    // Group by category
    const grouped = {};
    metas.forEach(m => {
      const cat = m.categoria || 'Sin categoria';
      if (!grouped[cat]) {
        grouped[cat] = { count: 0, metas: [] };
      }
      grouped[cat].count++;
      grouped[cat].metas.push(m.metaPrincipal.substring(0, 50));
    });
    
    console.log('\n📋 Desglose por categoria:');
    Object.entries(grouped).sort().forEach(([cat, data]) => {
      console.log('\n  📌', cat.toUpperCase(), ':', data.count, 'meta(s)');
      data.metas.forEach((meta, i) => {
        console.log('     ', (i+1) + '.', meta + '...');
      });
    });
    
    console.log('\n🔍 Categorias encontradas:', Object.keys(grouped).sort().join(', '));
    
    // Check vision config
    const gameChanger = await prisma.visionGameChanger.findFirst({
      where: { gameChangerId: usuario.id },
      include: {
        Vision: {
          select: {
            nombre: true,
            forceTransformationArea: true,
            forceCommunityServiceArea: true
          }
        }
      }
    });
    
    console.log('\n🎯 Vision Config:');
    console.log('  Nombre:', gameChanger?.Vision?.nombre);
    console.log('  forceTransformationArea:', gameChanger?.Vision?.forceTransformationArea);
    console.log('  forceCommunityServiceArea:', gameChanger?.Vision?.forceCommunityServiceArea);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkCartaMetas();
