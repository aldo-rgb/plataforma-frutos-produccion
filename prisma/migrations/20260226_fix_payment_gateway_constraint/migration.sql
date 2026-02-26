-- Cambiar constraint único de organizationId a (organizationId, provider)
-- Esto permite múltiples proveedores por organización

ALTER TABLE "PaymentGatewayConfig" DROP CONSTRAINT IF EXISTS "PaymentGatewayConfig_organizationId_key";
ALTER TABLE "PaymentGatewayConfig" ADD CONSTRAINT "PaymentGatewayConfig_organizationId_provider_key" UNIQUE ("organizationId", "provider");
