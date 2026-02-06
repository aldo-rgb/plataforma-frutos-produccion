const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function check() {
  try {
    const gateways = await prisma.paymentGatewayConfig.findMany({
      include: {
        organization: {
          select: { id: true, name: true, slug: true }
        }
      }
    });
    
    console.log("=== CONFIGURACIONES DE PASARELA DE PAGO ===\n");
    
    for (const gw of gateways) {
      console.log("Organización:", gw.organization.name, "(ID:", gw.organization.id, ")");
      console.log("  Provider:", gw.provider);
      console.log("  isActive:", gw.isActive);
      console.log("  hasSecretKey:", !!gw.secretKey);
      console.log("  secretKey prefix:", gw.secretKey ? gw.secretKey.substring(0, 30) + "..." : "NO CONFIGURADA");
      console.log("");
    }

    // Verificar si el access token de MP es válido
    const mpGateway = gateways.find(g => g.provider === 'MERCADOPAGO' && g.isActive);
    if (mpGateway && mpGateway.secretKey) {
      console.log("=== VERIFICANDO TOKEN DE MERCADO PAGO ===\n");
      
      const response = await fetch('https://api.mercadopago.com/users/me', {
        headers: {
          'Authorization': `Bearer ${mpGateway.secretKey}`
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log("✅ Token de MercadoPago VÁLIDO");
        console.log("   Usuario:", data.nickname || data.email);
        console.log("   ID:", data.id);
        console.log("   Site:", data.site_id);
      } else {
        console.log("❌ Token de MercadoPago INVÁLIDO");
        console.log("   Error:", data.message || JSON.stringify(data));
      }
    }
    
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();
