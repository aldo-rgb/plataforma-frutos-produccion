import { getServerSession } from 'next-auth/next';
import { authOptions } from "../../lib/auth";
import { redirect } from 'next/navigation';
import { prisma } from "../../lib/prisma";
import { Sidebar, Topbar, SecurityGate } from "../../components/dashboard";
import SocketWrapper from "../../components/SocketWrapper";
import DashboardProviders from "../../components/DashboardProviders";
import TimezoneWrapper from "../../components/dashboard/TimezoneWrapper";
import { ToastProvider } from "../../components/ui/ToastProvider";

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
      PerfilMentor: true, // Traemos datos del mentor si los necesitamos
    }
  });

  if (!usuarioReal) {
    // Caso borde: Usuario borrado de BD pero con sesión activa
    redirect("/login");
  }

  // Serializar campos Decimal del perfil de mentor para componentes de cliente
  const usuarioSerializado = {
    ...usuarioReal,
    PerfilMentor: usuarioReal.PerfilMentor ? {
      ...usuarioReal.PerfilMentor,
      comisionMentor: usuarioReal.PerfilMentor.comisionMentor?.toString() || null,
      comisionPlataforma: usuarioReal.PerfilMentor.comisionPlataforma?.toString() || null,
      calificacionPromedio: usuarioReal.PerfilMentor.calificacionPromedio?.toString() || null,
      ratingSum: usuarioReal.PerfilMentor.ratingSum?.toString() || null,
      precioBase: usuarioReal.PerfilMentor.precioBase?.toString() || null,
    } : null
  };

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
    <DashboardProviders session={session}>
      <ToastProvider>
        <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
          
          {/* Detector de zona horaria */}
          <TimezoneWrapper initialTimezone={usuarioSerializado.timezone || 'America/Mexico_City'} />
          
          {/* PASO CRUCIAL:
            Pasamos el "usuarioSerializado" como prop al Sidebar.
            Esto elimina la necesidad de los Mocks dentro del componente.
          */}
          <Sidebar usuario={usuarioSerializado} />

          <div className="relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
            {/* También pasamos datos al Topbar (Nombre, Avatar, Puntos) */}
            <Topbar usuario={usuarioSerializado} />

            <main className="w-full flex-grow p-6">
              {/* Envolvemos el contenido con el Guardián */}
              <SecurityGate rol={usuarioSerializado.rol} suscripcion={usuarioSerializado.suscripcion}>
                {children}
              </SecurityGate>
            </main>
          </div>

          {/* Componentes de Socket.IO */}
          <SocketWrapper />
        </div>
      </ToastProvider>
    </DashboardProviders>
  );
}
