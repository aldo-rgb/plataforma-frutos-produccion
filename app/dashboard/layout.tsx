import { getServerSession } from 'next-auth/next';
import { authOptions } from "../../lib/auth";
import { redirect } from 'next/navigation';
import { prisma } from "../../lib/prisma";
import { SecurityGate } from "../../components/dashboard";
import DashboardProviders from "../../components/DashboardProviders";
import { ToastProvider } from "../../components/ui/ToastProvider";
import { PhoenixProvider } from "../../contexts/PhoenixContext";
import { VisionAccessProvider } from "../../contexts/VisionAccessContext";
import { DashboardClientLayout } from "../../components/dashboard/DashboardClientLayout";

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

  // Validar que el email exista en la sesión
  if (!session.user.email) {
    redirect('/auth/signin');
  }

  // 2. Obtener Datos Frescos de la BD (Capa de Datos Real)
  // Usamos el email de la sesión para buscar al usuario completo en PostgreSQL
  const usuarioReal = await prisma.usuario.findUnique({
    where: { email: session.user.email },
    include: {
      PerfilMentor: true, // Traemos datos del mentor si los necesitamos
      Organization_Usuario_organizationIdToOrganization: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
          brandColor: true,
        }
      }
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
    } : null,
    organization: usuarioReal.Organization_Usuario_organizationIdToOrganization || null
  };

  // 3. Lógica del "Candado de Seguridad" (Simplificada)
  // Aquí verificamos si debe ser redirigido a pagar.
  const esStaff = ["ADMIN", "MENTOR", "COORDINADOR", "LIDER"].includes(usuarioReal.rol);
  const esActivo = usuarioReal.suscripcion === "ACTIVO";

  /* NOTA: Para activar el candado real sin bucles infinitos, 
  necesitaremos verificar el pathname actual en el Middleware o 
  usar un Client Component wrapper. Por ahora, dejamos pasar 
  para verificar la inyección de datos.
  */

  return (
    <DashboardProviders session={session}>
      <ToastProvider>
        <PhoenixProvider>
          <VisionAccessProvider>
            <DashboardClientLayout usuario={usuarioSerializado}>
              <SecurityGate rol={usuarioSerializado.rol} suscripcion={usuarioSerializado.suscripcion}>
                {children}
              </SecurityGate>
            </DashboardClientLayout>
          </VisionAccessProvider>
        </PhoenixProvider>
      </ToastProvider>
    </DashboardProviders>
  );
}
