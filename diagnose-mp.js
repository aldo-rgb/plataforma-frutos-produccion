const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function testMercadoPago() {
  try {
    console.log("=== DIAGNÓSTICO COMPLETO DE MERCADO PAGO ===\n");

    // 1. Verificar configuración
    const gateway = await prisma.paymentGatewayConfig.findFirst({
      where: { provider: 'MERCADOPAGO', isActive: true },
      include: {
        organization: { select: { id: true, name: true, customDomain: true } }
      }
    });

    if (!gateway) {
      console.log("❌ No hay gateway de MercadoPago activo");
      return;
    }

    console.log("✅ Gateway encontrado:");
    console.log("   Organización:", gateway.organization.name);
    console.log("   Dominio custom:", gateway.organization.customDomain || "No configurado");
    console.log("   isActive:", gateway.isActive);
    console.log("   hasSecretKey:", !!gateway.secretKey);
    console.log("");

    // 2. Verificar token con API de usuarios
    console.log("=== VERIFICANDO TOKEN ===\n");
    const userResponse = await fetch('https://api.mercadopago.com/users/me', {
      headers: { 'Authorization': `Bearer ${gateway.secretKey}` }
    });
    const userData = await userResponse.json();
    
    if (userResponse.ok) {
      console.log("✅ Token válido");
      console.log("   Usuario:", userData.nickname);
      console.log("   Email:", userData.email);
      console.log("   Site:", userData.site_id);
      console.log("   ID:", userData.id);
    } else {
      console.log("❌ Token inválido:", userData.message);
      return;
    }
    console.log("");

    // 3. Crear una preferencia de prueba
    console.log("=== PROBANDO CREACIÓN DE PREFERENCIA ===\n");
    
    const testPreference = {
      items: [{
        title: "Test - Diagnóstico",
        description: "Prueba de diagnóstico",
        quantity: 1,
        currency_id: "MXN",
        unit_price: 100
      }],
      payer: {
        name: "Test",
        email: "test@test.com"
      },
      back_urls: {
        success: "https://impactocuantico.net/api/checkout/payment-success?provider=mercadopago",
        failure: "https://impactocuantico.net/checkout?payment=failed",
        pending: "https://impactocuantico.net/checkout?payment=pending"
      },
      auto_return: "approved"
    };

    const prefResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${gateway.secretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPreference)
    });

    const prefData = await prefResponse.json();

    if (prefResponse.ok && prefData.init_point) {
      console.log("✅ Preferencia creada exitosamente");
      console.log("   ID:", prefData.id);
      console.log("   init_point:", prefData.init_point);
      console.log("   sandbox_init_point:", prefData.sandbox_init_point);
    } else {
      console.log("❌ Error al crear preferencia:");
      console.log(JSON.stringify(prefData, null, 2));
    }
    console.log("");

    // 4. Verificar si está en modo producción o sandbox
    console.log("=== MODO DE OPERACIÓN ===\n");
    const tokenPrefix = gateway.secretKey.substring(0, 10);
    if (tokenPrefix.includes('TEST')) {
      console.log("⚠️  MODO: SANDBOX (TEST)");
      console.log("   Las tarjetas reales NO funcionarán");
      console.log("   Usa tarjetas de prueba de MP");
    } else if (tokenPrefix.includes('APP_USR')) {
      console.log("✅ MODO: PRODUCCIÓN");
      console.log("   Las tarjetas reales deberían funcionar");
    } else {
      console.log("⚠️  No se puede determinar el modo");
      console.log("   Token prefix:", tokenPrefix);
    }

  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testMercadoPago();
