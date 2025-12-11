"use server";

import { prisma } from "../../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { revalidatePath } from "next/cache";

export async function procesarPagoSimulado(planNombre: string, monto: number) {
  // 1. Verificar seguridad (nadie paga sin sesión)
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user?.email) {
    return { success: false, error: "No autorizado" };
  }

  try {
    // 2. Ejecutar Transacción Atómica (Todo o Nada)
    // Usamos prisma.$transaction para asegurar que si falla el registro del pago,
    // no se active la suscripción, y viceversa.
    await prisma.$transaction(async (tx) => {
      
      // A. Buscar ID del usuario basado en el email de la sesión
      const usuario = await tx.usuario.findUnique({
        where: { email: session.user.email! }
      });

      if (!usuario) throw new Error("Usuario no encontrado");

      // B. Registrar la transacción financiera
      await tx.transaccion.create({
        data: {
          usuarioId: usuario.id,
          montoDinero: monto,
          metodo: "STRIPE", // Simulamos que fue Stripe
          montoPuntos: 0,   // Pago en dinero
        }
      });

      // C. Activar al usuario
      await tx.usuario.update({
        where: { id: usuario.id },
        data: {
          suscripcion: "ACTIVO",
          planActual: planNombre,
          // Opcional: Dar puntos de regalo por suscribirse
          puntosCuanticos: { increment: 500 } 
        }
      });
    });

    // 3. Revalidar caché
    // Esto avisa a Next.js que los datos del dashboard han cambiado
    // y debe volver a pedirlos a la BD (actualizando el Layout y el Candado).
    revalidatePath('/dashboard');
    
    return { success: true };

  } catch (error) {
    console.error("Error en pago simulado:", error);
    return { success: false, error: "Error al procesar el pago" };
  }
}
