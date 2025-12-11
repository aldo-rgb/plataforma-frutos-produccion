'use server';

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function registrarUsuario(formData: FormData) {
  const nombre = formData.get("nombre") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  // 1. Validaciones básicas
  if (!nombre || !email || !password) {
    return { error: "Todos los campos son obligatorios." };
  }

  try {
    // 2. Verificar si ya existe el email
    const existeUsuario = await prisma.usuario.findUnique({
      where: { email },
    });

    if (existeUsuario) {
      return { error: "Este correo electrónico ya está registrado." };
    }

    // 3. Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Crear usuario en Base de Datos
    await prisma.usuario.create({
      data: {
        nombre,
        email,
        password: hashedPassword,
        rol: "LIDER",          // Rol por defecto
        suscripcion: "INACTIVO", // Importante: Nace inactivo para forzar el pago
        puntosCuanticos: 0,
      },
    });

    return { success: true };

  } catch (error) {
    console.error("Error al registrar:", error);
    return { error: "Error interno del servidor. Inténtalo más tarde." };
  }
}
