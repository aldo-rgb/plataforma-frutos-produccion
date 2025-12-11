'use server';

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 1. OBTENER HISTORIAL
export async function obtenerHistorialChat() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.email) {
    return { error: "No autorizado" };
  }

  try {
    // Buscamos al usuario por email para obtener su ID real
    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!usuario) return { error: "Usuario no encontrado" };

    // Recuperamos los mensajes ordenados cronológicamente
    const mensajes = await prisma.mensajeChat.findMany({
      where: { usuarioId: usuario.id },
      orderBy: { fecha: 'asc' },
      take: 50, // Limite inicial para rendimiento (opcional)
    });

    return { success: true, mensajes };
  } catch (error) {
    console.error("Error al obtener historial:", error);
    return { error: "Error al cargar la memoria del Mentor" };
  }
}

// 2. GUARDAR MENSAJE (User o AI)
export async function guardarMensajeChat(role: string, contenido: string) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.email) {
    return { error: "No autorizado" };
  }

  if (!contenido.trim()) {
    return { error: "El mensaje no puede estar vacío" };
  }

  try {
    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!usuario) return { error: "Usuario no encontrado" };

    // Creamos el registro en la BD
    const nuevoMensaje = await prisma.mensajeChat.create({
      data: {
        role, // 'user' o 'assistant'
        contenido,
        usuarioId: usuario.id,
      },
    });

    return { success: true, mensaje: nuevoMensaje };
  } catch (error) {
    console.error("Error al guardar mensaje:", error);
    return { error: "Error de persistencia cuántica" };
  }
}
