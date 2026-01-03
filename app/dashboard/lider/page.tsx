import React from 'react';
import Link from 'next/link';
import { Calendar, CheckCircle, Clock, AlertTriangle, FileText, Phone } from 'lucide-react';
import ProfileAlert from '@/components/dashboard/mentor/ProfileAlert';
import AgendaDelDia from '@/components/dashboard/mentor/AgendaDelDia';
import NotificacionSesionesPendientes from '@/components/dashboard/mentor/NotificacionSesionesPendientes';
import WidgetDisciplinaV2 from '@/components/dashboard/mentor/WidgetDisciplinaV2';
import CartaReviewPanel from '@/components/dashboard/mentor/CartaReviewPanel';
import RevisionEvidenciasWidget from '@/components/dashboard/RevisionEvidenciasWidget';
import AlertasProcrastinacion from '@/components/dashboard/mentor/AlertasProcrastinacion';
import MentorStrikesWidget from '@/components/dashboard/mentor/MentorStrikesWidget';
import MentorAccountabilityWidget from '@/components/dashboard/mentor/MentorAccountabilityWidget';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function LiderDashboard() {

  // 1. OBTENER LA SESIÓN DEL USUARIO LOGUEADO
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return <div className="p-8 text-white">No se encontró la sesión del usuario.</div>;
  }

  // 2. OBTENER LOS DATOS DEL USUARIO LOGUEADO
  const user = await prisma.usuario.findUnique({
    where: { 
      id: session.user.id
    },
    include: {
      PerfilMentor: {
        select: {
          biografiaCorta: true,
          especialidad: true,
          biografia: true
        }
      }
    }
  });

  // Si no hay usuario, mostramos error
  if (!user) return <div className="p-8 text-white">No se encontró el usuario líder.</div>;

  // Verificar si el perfil está pendiente de aprobación
  const perfilEnRevision = user.PerfilMentor && 
    user.PerfilMentor.biografia && 
    user.PerfilMentor.biografia.length >= 50 && 
    !user.mentorMarketplaceApproved;

  // 3. CALCULAR PENDIENTES TOTALES DEL LÍDER
  const liderId = user.id;
  
  // Contar cartas pendientes de revisión
  const cartasPendientes = await prisma.cartaFrutos.count({
    where: {
      estado: 'EN_REVISION',
      Usuario: {
        OR: [
          { mentorId: liderId },
          { assignedMentorId: liderId }
        ]
      }
    }
  });

  // Contar evidencias pendientes de autorizar
  const evidenciasPendientes = await prisma.evidenciaAccion.count({
    where: {
      estado: 'PENDIENTE',
      Usuario: {
        OR: [
          { mentorId: liderId },
          { assignedMentorId: liderId }
        ]
      }
    }
  });

  // Contar submissions de tareas extraordinarias pendientes
  const submissionsPendientes = await prisma.taskSubmission.count({
    where: {
      status: 'SUBMITTED',
      Usuario_TaskSubmission_usuarioIdToUsuario: {
        OR: [
          { mentorId: liderId },
          { assignedMentorId: liderId }
        ]
      }
    }
  });

  // Contar llamadas de disciplina pendientes (hoy)
  const hoy = new Date();
  const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const finDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1);

  const llamadasDisciplinaPendientes = await prisma.callBooking.count({
    where: {
      mentorId: liderId,
      type: 'DISCIPLINE',
      scheduledAt: {
        gte: inicioDia,
        lt: finDia
      },
      status: {
        in: ['PENDING', 'CONFIRMED']
      }
    }
  });

  // Contar llamadas de mentoría pendientes
  const llamadasMentoriaPendientes = await prisma.callBooking.count({
    where: {
      mentorId: liderId,
      type: 'MENTORSHIP',
      scheduledAt: {
        gte: hoy
      },
      status: {
        in: ['PENDING', 'CONFIRMED']
      }
    }
  });

  const totalPendientes = 
    cartasPendientes + 
    evidenciasPendientes + 
    submissionsPendientes +
    llamadasDisciplinaPendientes + 
    llamadasMentoriaPendientes;

  return (
    <div className="p-8 space-y-6 min-h-screen bg-slate-950">
      
      {/* NOTIFICACIÓN DE SESIONES PENDIENTES */}
      <NotificacionSesionesPendientes />
      
      {/* ALERTAS DE PROCRASTINACIÓN */}
      <AlertasProcrastinacion />
      
      {/* NOTIFICACIÓN DE PERFIL EN REVISIÓN */}
      {perfilEnRevision && (
        <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-2 border-blue-500/30 rounded-xl p-6 backdrop-blur-sm animate-pulse">
          <div className="flex items-start gap-4">
            <div className="bg-blue-500/20 p-3 rounded-lg shrink-0">
              <Clock className="text-blue-400 w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-blue-400 mb-2 flex items-center gap-2">
                📋 Perfil en Revisión
              </h3>
              <div className="text-slate-300 space-y-2 text-sm leading-relaxed">
                <p>
                  <strong className="text-white">Tu perfil de líder está siendo revisado</strong> por el director de tu organización.
                </p>
                <p className="text-blue-200">
                  ⏳ Una vez aprobado, podrás acceder al marketplace de mentoría y comenzar a gestionar mentorados.
                </p>
                <div className="mt-4 p-3 bg-slate-900/50 border border-slate-700 rounded-lg">
                  <p className="text-xs text-slate-400 flex items-start gap-2">
                    <span className="text-cyan-400 shrink-0">💡</span>
                    <span>
                      <strong className="text-white">Tip:</strong> Mientras esperas, puedes continuar configurando tu disponibilidad y familiarizándote con las herramientas del dashboard.
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 2. PASAMOS EL USUARIO REAL A LA ALERTA */}
      <div className="animate-fadeIn">
        <ProfileAlert user={user} />
      </div>

      {/* --- ENC: TÍTULO Y ESTADÍSTICAS --- */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-black text-white italic tracking-wide">
            CENTRO DE <span className="text-cyan-400">LIDERAZGO</span>
          </h1>
          <p className="text-slate-400 mt-1">
            Hola, <span className="text-white font-bold">{user.nombre}</span>. Gestiona tu progreso.
          </p>
        </div>
        
        {/* Chips de estado */}
        <div className="flex gap-3">
          <div className="bg-slate-900 border border-slate-700 px-4 py-2 rounded-lg text-center">
            <span className="text-xs text-slate-500 uppercase font-bold block">Nivel</span>
            <span className="text-xl font-bold text-white">JUNIOR</span>
          </div>
          <div className="bg-slate-900 border border-slate-700 px-4 py-2 rounded-lg text-center">
            <span className="text-xs text-amber-500 uppercase font-bold block">Pendientes</span>
            <span className="text-xl font-bold text-white">{totalPendientes}</span>
          </div>
        </div>
      </div>

      {/* --- NAVEGACIÓN DE PESTAÑAS --- */}
      <div className="flex gap-6 border-b border-slate-800 text-sm font-bold text-slate-500 overflow-x-auto">
        <Link href="/dashboard/lider" className="pb-3 border-b-2 border-orange-500 text-orange-500 flex items-center gap-2 whitespace-nowrap">
          <Clock className="w-4 h-4" /> Club 5 AM
        </Link>
        <Link href="/dashboard/lider/validacion" className="pb-3 hover:text-slate-300 transition-colors flex items-center gap-2 whitespace-nowrap">
          <CheckCircle className="w-4 h-4" /> Revisión de Evidencias
        </Link>
        <Link href="/dashboard/lider/cartas" className="pb-3 hover:text-slate-300 transition-colors flex items-center gap-2 whitespace-nowrap">
          <FileText className="w-4 h-4" /> Cartas F.R.U.T.O.S.
        </Link>
      </div>

      {/* --- GRID PRINCIPAL --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUMNA IZQUIERDA (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* WIDGET DE DISCIPLINA V2 - LLAMADAS 5AM CON SISTEMA DE VIDAS */}
          <WidgetDisciplinaV2 />
          
          {/* NUEVO: WIDGET DE REVISIÓN DE EVIDENCIAS DE TAREAS/EVENTOS */}
          <RevisionEvidenciasWidget />
          
          <AgendaDelDia />
          
          {/* CARTA F.R.U.T.O.S. REVIEWS PANEL */}
          <CartaReviewPanel />
        </div>

        {/* COLUMNA DERECHA (1/3) */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-2xl border border-slate-700">
            <div className="flex items-center gap-2 mb-4">
               <span className="p-2 bg-orange-900/30 text-orange-500 rounded-lg">
                 <FileText className="w-4 h-4" />
               </span>
               <div>
                 <h4 className="text-white font-bold text-sm">Consejo Matutino</h4>
                 <p className="text-xs text-slate-500">Inspiración diaria</p>
               </div>
            </div>
            <p className="text-slate-300 text-sm italic leading-relaxed">
              "La disciplina es hacer lo que tienes que hacer, cuando lo tienes que hacer, tengas ganas o no."
            </p>
          </div>

          {/* WIDGET DE STRIKES */}
          <MentorStrikesWidget />

          {/* WIDGET DE ACCOUNTABILITY DEL LÍDER */}
          <MentorAccountabilityWidget />
        </div>
      </div>
    </div>
  );
}
