import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";
import SecurityGate from "@/components/dashboard/SecurityGate";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Verificar Sesión (Capa de Autenticación)
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.email) {
    redirect("/login");
  }

  // 2. Obtener Datos Frescos de la BD (Capa de Datos Real)
  // Usamos el email de la sesión para buscar al usuario completo en PostgreSQL
  const usuarioReal = await prisma.usuario.findUnique({
    where: { email: session.user.email },
    include: {
      mentor: true, // Traemos datos del mentor si los necesitamos
    }
  });

  if (!usuarioReal) {
    // Caso borde: Usuario borrado de BD pero con sesión activa
    redirect("/login");
  }

  // 3. Lógica del "Candado de Seguridad" (Simplificada)
  // Aquí verificamos si debe ser redirigido a pagar.
  const esStaff = ["ADMIN", "MENTOR", "COORDINADOR"].includes(usuarioReal.rol);
  const esActivo = usuarioReal.suscripcion === "ACTIVO";

  /* NOTA: Para activar el candado real sin bucles infinitos, 
  necesitaremos verificar el pathname actual en el Middleware o 
  usar un Client Component wrapper. Por ahora, dejamos pasar 
  para verificar la inyección de datos.
  */

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      
      {/* PASO CRUCIAL:
        Pasamos el "usuarioReal" como prop al Sidebar.
        Esto elimina la necesidad de los Mocks dentro del componente.
      */}
      <Sidebar usuario={usuarioReal} />

      <div className="relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
        {/* También pasamos datos al Topbar (Nombre, Avatar, Puntos) */}
        <Topbar usuario={usuarioReal} />

        <main className="w-full flex-grow p-6">
          {/* Envolvemos el contenido con el Guardián */}
          <SecurityGate rol={usuarioReal.rol} suscripcion={usuarioReal.suscripcion}>
            {children}
          </SecurityGate>
        </main>
      </div>
    </div>
  );
}
