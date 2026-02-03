'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Rocket, Mail, MessageCircle, Users, Filter, Send, 
  CheckCircle, AlertCircle, Loader2, ArrowLeft, Video,
  ChevronDown, Search, Check, X
} from 'lucide-react';

interface Usuario {
  id: number;
  nombre: string;
  email: string;
  telefono: string | null;
  imagen: string | null;
}

interface Vision {
  id: number;
  nombre: string;
  tipo: string;
  enrollments: {
    id: number;
    level: string;
    status: string;
    usuario: Usuario;
  }[];
}

interface VideoOption {
  key: string;
  label: string;
  description: string;
  icon: string;
}

const VIDEO_OPTIONS: VideoOption[] = [
  { 
    key: 'videoBienvenidaLideres1Url', 
    label: 'Bienvenida Básico',
    description: 'Video de bienvenida para el programa básico',
    icon: '🎬'
  },
  { 
    key: 'videoBienvenidaLideres2Url', 
    label: 'Bienvenida Básico 2',
    description: 'Segundo video de bienvenida para el programa básico',
    icon: '🎥'
  },
  { 
    key: 'video2daLlamadaPerdidaUrl', 
    label: '2da Llamada Perdida',
    description: 'Video para reactivar usuarios que no respondieron',
    icon: '📞'
  },
  { 
    key: 'videoInvitacionTransformadoraUrl', 
    label: 'Invitación Transformadora',
    description: 'Video de invitación al programa básico',
    icon: '✨'
  },
  { 
    key: 'video3raLlamadaUrl', 
    label: '3ra Llamada',
    description: 'Video de seguimiento para tercera llamada',
    icon: '🔔'
  },
  { 
    key: 'videoEnrolamientoUrl', 
    label: 'Enrolamiento',
    description: 'Video motivacional para inscripción',
    icon: '🚀'
  },
  { 
    key: 'videoCierreLideresTuVidaUrl', 
    label: 'Cierre Líderes Tu Vida',
    description: 'Video de cierre para programa de líderes',
    icon: '🎯'
  }
];

const LEVEL_OPTIONS = [
  { value: 'ALL', label: 'Todos los niveles', color: 'purple' },
  { value: 'BASIC', label: 'Básico', color: 'green' },
  { value: 'ADVANCED', label: 'Avanzado', color: 'blue' },
  { value: 'PL', label: 'Programa de Líderes', color: 'amber' }
];

const INVITE_MESSAGES: Record<string, { email: string; whatsapp: string }> = {
  videoBienvenidaLideres1Url: {
    email: `🌟 ¡ESTO VA A CAMBIARTE LA VIDA! 🌟

Hola {nombre},

¿Alguna vez has sentido que tu vida podría ser MUCHO más de lo que es ahora? 

Tengo algo especial para ti... un video que ha transformado la perspectiva de miles de personas como tú.

👉 Este NO es un video cualquiera. Es el primer paso hacia la versión más extraordinaria de ti mismo.

🔥 Los que lo han visto dicen que es "el empujón que necesitaban" para finalmente tomar acción en sus sueños.

¿Estás listo para descubrir tu potencial oculto?

Dale play y prepárate para que tu mente se expanda:
{videoUrl}

⚡ No lo dejes para después. Tu futuro yo te lo agradecerá.

Con energía transformadora,
Tu equipo de liderazgo`,
    whatsapp: `🌟 *¡{nombre}! Esto va a CAMBIARTE LA VIDA* 🌟

¿Alguna vez sentiste que tu vida podría ser MUCHO más?

Tengo algo especial para ti... 👀

🎬 Un video que ha *transformado* la perspectiva de MILES de personas.

Los que lo han visto dicen que es "el empujón que necesitaban" 🚀

¿Estás listo para descubrir tu potencial oculto?

👉 Dale play aquí:
{videoUrl}

⚡ *No lo dejes para después*. Tu futuro yo te lo agradecerá.`
  },
  videoBienvenidaLideres2Url: {
    email: `🚀 ¡EL SIGUIENTE NIVEL TE ESPERA! 🚀

Hola {nombre},

Si viste el primer video, ya sabes que esto es diferente...

Pero lo que viene ahora es AÚN MÁS PODEROSO.

Este segundo video revela los secretos que los líderes más exitosos usan para:
✅ Multiplicar su impacto
✅ Crear equipos imparables  
✅ Vivir con propósito REAL

🔥 El 90% de las personas se queda en el primer paso. Tú ya demostraste que eres diferente.

¿Listo para el siguiente nivel?

{videoUrl}

Tu transformación apenas comienza...`,
    whatsapp: `🚀 *¡{nombre}! El siguiente nivel te espera* 🚀

Si viste el primer video, ya sabes que esto es diferente...

Pero lo que viene ahora es *AÚN MÁS PODEROSO* 💪

Este video revela los SECRETOS que usan los líderes más exitosos 🏆

El 90% se queda en el primer paso... *Tú eres diferente* ⭐

👉 {videoUrl}

Tu transformación apenas comienza...`
  },
  video2daLlamadaPerdidaUrl: {
    email: `⏰ ¡OYE! ¿TODO BIEN POR ALLÁ? ⏰

{nombre},

Intenté comunicarme contigo pero no logré encontrarte...

Y honestamente, me preocupa que estés dejando pasar una oportunidad que podría cambiarlo TODO.

🎯 Sé que la vida está ocupada. Sé que hay mil cosas compitiendo por tu atención.

Pero también sé que hay una voz dentro de ti que dice: "Quiero más".

Este video es para esa voz. Es para la parte de ti que sabe que merece VIVIR EN GRANDE.

👉 {videoUrl}

💡 Solo te tomará unos minutos, pero el impacto puede durar toda la vida.

¿Me das una oportunidad?`,
    whatsapp: `⏰ *¡{nombre}! ¿Todo bien?* ⏰

Intenté comunicarme contigo... 📞

Y me preocupa que estés dejando pasar algo que podría *cambiarlo TODO* 🎯

Sé que la vida está ocupada...

Pero hay una voz dentro de ti que dice: *"Quiero más"* 💫

Este video es para esa voz 👇

{videoUrl}

Solo toma unos minutos, pero el impacto puede durar *toda la vida* ✨`
  },
  videoInvitacionTransformadoraUrl: {
    email: `✨ UNA INVITACIÓN QUE PUEDE CAMBIARLO TODO ✨

Querido/a {nombre},

Esto no es un correo cualquiera. Es una invitación a transformar tu vida.

¿Te has preguntado alguna vez por qué algunas personas logran TODO lo que se proponen mientras otras siguen postergando sus sueños?

🔑 La diferencia está en UN SOLO PASO. Y ese paso está frente a ti ahora mismo.

El Entrenamiento Básico ha transformado a más de 10,000 personas que estaban exactamente donde tú estás hoy.

En este video te cuento:
🌟 Qué es realmente este programa
🌟 Por qué funciona (cuando nada más lo ha hecho)
🌟 Cómo puede cambiar tu vida en solo días

👉 {videoUrl}

⚡ Los cupos son LIMITADOS. No dejes que este momento pase.

Tu nueva vida está a un click de distancia.`,
    whatsapp: `✨ *{nombre}, tengo una invitación especial para ti* ✨

Esto puede *cambiarlo TODO*...

¿Te has preguntado por qué algunos logran TODO lo que se proponen? 🤔

🔑 La diferencia está en *UN SOLO PASO*

El Entrenamiento Básico ha transformado a *+10,000 personas* 🚀

En este video te cuento TODO 👇

{videoUrl}

⚡ Los cupos son *LIMITADOS*

Tu nueva vida está a un click 💫`
  },
  video3raLlamadaUrl: {
    email: `🔔 TERCERA Y ÚLTIMA LLAMADA 🔔

{nombre},

Esta es mi tercera vez intentando conectar contigo, y será la última.

No porque me rinda fácilmente... sino porque respeto tu tiempo y tus decisiones.

Pero antes de cerrar esta puerta, quiero que veas algo importante.

Este video es diferente. Es directo, honesto, y puede que te confronte un poco.

🎯 A veces necesitamos que alguien nos diga la verdad:
"El momento perfecto no existe. Solo existe AHORA."

👉 {videoUrl}

Si después de verlo decides que esto no es para ti, lo entiendo perfectamente.

Pero si algo dentro de ti despierta... estaré aquí.

Con respeto y esperanza,
Tu equipo de liderazgo`,
    whatsapp: `🔔 *{nombre}, tercera y última llamada* 🔔

Esta es mi última vez intentando conectar contigo...

No porque me rinda, sino porque *respeto tu tiempo* 🙏

Antes de cerrar esta puerta, quiero que veas algo:

Este video es *directo y honesto*... 

🎯 "El momento perfecto no existe. Solo existe *AHORA*"

👉 {videoUrl}

Si después de verlo decides que no es para ti, lo entiendo ✌️

Pero si algo dentro de ti despierta... *estaré aquí* 💫`
  },
  videoEnrolamientoUrl: {
    email: `🚀 ¡ES HORA DE INSCRIBIRTE! 🚀

¡{nombre}!

Si estás leyendo esto, es porque algo dentro de ti ya tomó la decisión.

Ya viste los videos. Ya sentiste esa chispa. Ya imaginaste cómo sería tu vida transformada.

🎯 Ahora solo falta UN paso: HACERLO OFICIAL.

Este video te guía paso a paso en el proceso de inscripción. Es más fácil de lo que piensas.

👉 {videoUrl}

💡 Los que dan este paso reportan:
✅ Más claridad en sus metas
✅ Más energía para la vida
✅ Más conexión con personas extraordinarias
✅ Más resultados en menos tiempo

⏰ Los cupos se están llenando. No dejes que la duda gane.

¡Tu transformación comienza AHORA!`,
    whatsapp: `🚀 *¡{nombre}! Es hora de inscribirte* 🚀

Si estás leyendo esto... *ya tomaste la decisión* 💪

Ya viste los videos. Ya sentiste esa chispa ✨

🎯 Solo falta UN paso: *HACERLO OFICIAL*

Este video te guía paso a paso 👇

{videoUrl}

Los que dan este paso reportan:
✅ Más claridad
✅ Más energía
✅ Más resultados

⏰ *Los cupos se están llenando*

¡Tu transformación comienza AHORA! 🔥`
  },
  videoCierreLideresTuVidaUrl: {
    email: `🎯 EL CIERRE MÁS IMPORTANTE DE TU VIDA 🎯

{nombre},

Has llegado hasta aquí. Eso ya te hace diferente al 99% de las personas.

Este video de cierre no es solo un final... es un NUEVO COMIENZO.

🌟 En él descubrirás:
- El secreto para mantener tu transformación PERMANENTE
- Cómo convertirte en un líder que inspira a otros
- Los próximos pasos para seguir creciendo

👉 {videoUrl}

💎 "El verdadero liderazgo comienza cuando termina el entrenamiento."

Estoy increíblemente orgulloso/a de tu recorrido.

¡Prepárate para tu siguiente capítulo!`,
    whatsapp: `🎯 *{nombre}, el cierre más importante* 🎯

Has llegado hasta aquí... *Eso te hace diferente al 99%* 🏆

Este video no es solo un final...

*Es un NUEVO COMIENZO* 🌅

🌟 Descubrirás:
- Cómo mantener tu transformación *PERMANENTE*
- Convertirte en un líder que inspira
- Los próximos pasos

👉 {videoUrl}

💎 "El verdadero liderazgo comienza cuando termina el entrenamiento"

¡Prepárate para tu siguiente capítulo! 🚀`
  }
};

export default function AutomatizacionesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [visiones, setVisiones] = useState<Vision[]>([]);
  const [selectedVision, setSelectedVision] = useState<number | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');
  const [selectedVideo, setSelectedVideo] = useState<string>('');
  const [videoUrls, setVideoUrls] = useState<Record<string, string>>({});
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
  const [sendMethod, setSendMethod] = useState<'email' | 'whatsapp' | 'both'>('both');
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success'
  });
  const [sendResults, setSendResults] = useState<{ sent: number; failed: number } | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }
    if (session?.user?.rol !== 'SCHOOL_ADMIN') {
      router.push('/dashboard');
      return;
    }
    fetchData();
  }, [status, session, router]);

  const fetchData = async () => {
    try {
      // Fetch visiones con enrollments
      const visionesRes = await fetch('/api/school-admin/automatizaciones/visiones');
      const visionesData = await visionesRes.json();
      if (visionesData.success) {
        setVisiones(visionesData.visiones);
      }

      // Fetch video URLs from organization branding
      const brandingRes = await fetch('/api/school-admin/branding');
      const brandingData = await brandingRes.json();
      if (brandingData.success) {
        setVideoUrls({
          videoBienvenidaLideres1Url: brandingData.organization.videoBienvenidaLideres1Url || '',
          videoBienvenidaLideres2Url: brandingData.organization.videoBienvenidaLideres2Url || '',
          video2daLlamadaPerdidaUrl: brandingData.organization.video2daLlamadaPerdidaUrl || '',
          videoInvitacionTransformadoraUrl: brandingData.organization.videoInvitacionTransformadoraUrl || '',
          video3raLlamadaUrl: brandingData.organization.video3raLlamadaUrl || '',
          videoEnrolamientoUrl: brandingData.organization.videoEnrolamientoUrl || '',
          videoCierreLideresTuVidaUrl: brandingData.organization.videoCierreLideresTuVidaUrl || ''
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      showToast('Error al cargar los datos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  const getFilteredUsers = () => {
    if (!selectedVision) return [];
    
    const vision = visiones.find(v => v.id === selectedVision);
    if (!vision) return [];

    let users = vision.enrollments
      .filter(e => e.status === 'ENROLLED' || e.status === 'ACTIVE' || e.status === 'COMPLETED')
      .map(e => ({
        ...e.usuario,
        level: e.level
      }));

    // Filter by level
    if (selectedLevel !== 'ALL') {
      users = users.filter(u => u.level === selectedLevel);
    }

    // Filter by search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      users = users.filter(u => 
        u.nombre.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        (u.telefono && u.telefono.includes(term))
      );
    }

    return users;
  };

  const filteredUsers = getFilteredUsers();

  const toggleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
    }
  };

  const toggleUser = (userId: number) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleSendMessages = async () => {
    if (!selectedVideo || selectedUsers.size === 0) {
      showToast('Selecciona un video y al menos un usuario', 'error');
      return;
    }

    const videoUrl = videoUrls[selectedVideo];
    if (!videoUrl) {
      showToast('El video seleccionado no tiene URL configurada. Ve a Branding para configurarla.', 'error');
      return;
    }

    setSending(true);
    setSendResults(null);

    try {
      const usersToSend = filteredUsers.filter(u => selectedUsers.has(u.id));
      
      const res = await fetch('/api/school-admin/automatizaciones/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          users: usersToSend,
          videoKey: selectedVideo,
          videoUrl,
          sendMethod,
          messages: INVITE_MESSAGES[selectedVideo]
        })
      });

      const data = await res.json();

      if (data.success) {
        setSendResults({ sent: data.sent, failed: data.failed });
        showToast(`✅ ${data.sent} mensajes enviados correctamente`, 'success');
        setSelectedUsers(new Set());
      } else {
        showToast(data.error || 'Error al enviar mensajes', 'error');
      }
    } catch (error) {
      console.error('Error sending messages:', error);
      showToast('Error al enviar los mensajes', 'error');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  const selectedVideoData = VIDEO_OPTIONS.find(v => v.key === selectedVideo);

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      {/* Toast */}
      {toast.show && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
          toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white`}>
          {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          {toast.message}
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard/school-admin/branding')}
            className="mb-4 flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Volver a Branding</span>
          </button>
          
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Rocket className="text-cyan-400" />
            Centro de Automatizaciones
          </h1>
          <p className="text-slate-400 mt-2">
            Envía videos promocionales y de seguimiento a tus usuarios por correo o WhatsApp
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Panel de Configuración */}
          <div className="lg:col-span-1 space-y-6">
            {/* Selector de Visión */}
            <div className="bg-slate-800 rounded-xl p-5">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <Filter size={18} className="text-purple-400" />
                Filtrar Usuarios
              </h3>

              {/* Vision Selector */}
              <div className="mb-4">
                <label className="text-slate-400 text-sm mb-2 block">Seleccionar Visión</label>
                <select
                  value={selectedVision || ''}
                  onChange={(e) => {
                    setSelectedVision(e.target.value ? parseInt(e.target.value) : null);
                    setSelectedUsers(new Set());
                  }}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                >
                  <option value="">-- Selecciona una visión --</option>
                  {visiones.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.nombre} ({v.enrollments.length} usuarios)
                    </option>
                  ))}
                </select>
              </div>

              {/* Level Filter */}
              <div className="mb-4">
                <label className="text-slate-400 text-sm mb-2 block">Filtrar por Nivel</label>
                <div className="grid grid-cols-2 gap-2">
                  {LEVEL_OPTIONS.map(level => (
                    <button
                      key={level.value}
                      onClick={() => {
                        setSelectedLevel(level.value);
                        setSelectedUsers(new Set());
                      }}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        selectedLevel === level.value
                          ? `bg-${level.color}-500/30 border border-${level.color}-500 text-${level.color}-400`
                          : 'bg-slate-700 border border-slate-600 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {level.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Buscar usuario..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-purple-500"
                />
              </div>
            </div>

            {/* Selector de Video */}
            <div className="bg-slate-800 rounded-xl p-5">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <Video size={18} className="text-cyan-400" />
                Seleccionar Video
              </h3>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {VIDEO_OPTIONS.map(video => {
                  const hasUrl = !!videoUrls[video.key];
                  return (
                    <button
                      key={video.key}
                      onClick={() => setSelectedVideo(video.key)}
                      disabled={!hasUrl}
                      className={`w-full p-3 rounded-lg text-left transition-all ${
                        selectedVideo === video.key
                          ? 'bg-cyan-500/20 border border-cyan-500'
                          : hasUrl
                            ? 'bg-slate-700 border border-slate-600 hover:bg-slate-600'
                            : 'bg-slate-700/50 border border-slate-700 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{video.icon}</span>
                        <div className="flex-1">
                          <p className={`font-medium ${selectedVideo === video.key ? 'text-cyan-400' : 'text-white'}`}>
                            {video.label}
                          </p>
                          <p className="text-xs text-slate-400">{video.description}</p>
                        </div>
                        {!hasUrl && (
                          <span className="text-xs text-red-400 bg-red-500/20 px-2 py-1 rounded">
                            Sin URL
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedVideo && !videoUrls[selectedVideo] && (
                <div className="mt-4 p-3 bg-amber-500/20 border border-amber-500/30 rounded-lg">
                  <p className="text-amber-400 text-sm">
                    ⚠️ Este video no tiene URL configurada. Ve a la sección de Branding para configurarla.
                  </p>
                </div>
              )}
            </div>

            {/* Método de Envío */}
            <div className="bg-slate-800 rounded-xl p-5">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <Send size={18} className="text-green-400" />
                Método de Envío
              </h3>

              <div className="space-y-2">
                <button
                  onClick={() => setSendMethod('both')}
                  className={`w-full p-3 rounded-lg flex items-center gap-3 transition-all ${
                    sendMethod === 'both'
                      ? 'bg-gradient-to-r from-blue-500/20 to-green-500/20 border border-cyan-500'
                      : 'bg-slate-700 border border-slate-600 hover:bg-slate-600'
                  }`}
                >
                  <div className="flex gap-1">
                    <Mail size={18} className="text-blue-400" />
                    <MessageCircle size={18} className="text-green-400" />
                  </div>
                  <span className={sendMethod === 'both' ? 'text-white font-medium' : 'text-slate-300'}>
                    Correo + WhatsApp
                  </span>
                </button>

                <button
                  onClick={() => setSendMethod('email')}
                  className={`w-full p-3 rounded-lg flex items-center gap-3 transition-all ${
                    sendMethod === 'email'
                      ? 'bg-blue-500/20 border border-blue-500'
                      : 'bg-slate-700 border border-slate-600 hover:bg-slate-600'
                  }`}
                >
                  <Mail size={18} className="text-blue-400" />
                  <span className={sendMethod === 'email' ? 'text-white font-medium' : 'text-slate-300'}>
                    Solo Correo
                  </span>
                </button>

                <button
                  onClick={() => setSendMethod('whatsapp')}
                  className={`w-full p-3 rounded-lg flex items-center gap-3 transition-all ${
                    sendMethod === 'whatsapp'
                      ? 'bg-green-500/20 border border-green-500'
                      : 'bg-slate-700 border border-slate-600 hover:bg-slate-600'
                  }`}
                >
                  <MessageCircle size={18} className="text-green-400" />
                  <span className={sendMethod === 'whatsapp' ? 'text-white font-medium' : 'text-slate-300'}>
                    Solo WhatsApp
                  </span>
                </button>
              </div>
            </div>

            {/* Botón de Enviar */}
            <button
              onClick={handleSendMessages}
              disabled={sending || selectedUsers.size === 0 || !selectedVideo}
              className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-slate-600 disabled:to-slate-600 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-3 disabled:cursor-not-allowed"
            >
              {sending ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Enviando...
                </>
              ) : (
                <>
                  <Send size={20} />
                  Enviar a {selectedUsers.size} usuario{selectedUsers.size !== 1 ? 's' : ''}
                </>
              )}
            </button>

            {/* Resultados */}
            {sendResults && (
              <div className="bg-slate-800 rounded-xl p-5">
                <h3 className="text-white font-bold mb-3">📊 Resultados del Envío</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-green-400">{sendResults.sent}</p>
                    <p className="text-sm text-green-300">Enviados</p>
                  </div>
                  <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-red-400">{sendResults.failed}</p>
                    <p className="text-sm text-red-300">Fallidos</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Panel de Usuarios */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold flex items-center gap-2">
                  <Users size={18} className="text-purple-400" />
                  Usuarios ({filteredUsers.length})
                </h3>

                {filteredUsers.length > 0 && (
                  <button
                    onClick={toggleSelectAll}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
                  >
                    {selectedUsers.size === filteredUsers.length ? (
                      <>
                        <X size={16} />
                        Deseleccionar todos
                      </>
                    ) : (
                      <>
                        <Check size={16} />
                        Seleccionar todos
                      </>
                    )}
                  </button>
                )}
              </div>

              {!selectedVision ? (
                <div className="text-center py-12">
                  <Filter size={48} className="mx-auto text-slate-600 mb-4" />
                  <p className="text-slate-400">Selecciona una visión para ver los usuarios</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-12">
                  <Users size={48} className="mx-auto text-slate-600 mb-4" />
                  <p className="text-slate-400">No hay usuarios con los filtros seleccionados</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                  {filteredUsers.map(user => (
                    <div
                      key={user.id}
                      onClick={() => toggleUser(user.id)}
                      className={`p-4 rounded-lg cursor-pointer transition-all ${
                        selectedUsers.has(user.id)
                          ? 'bg-cyan-500/20 border border-cyan-500'
                          : 'bg-slate-700 border border-slate-600 hover:bg-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {/* Checkbox */}
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          selectedUsers.has(user.id)
                            ? 'bg-cyan-500 border-cyan-500'
                            : 'border-slate-500'
                        }`}>
                          {selectedUsers.has(user.id) && <Check size={14} className="text-white" />}
                        </div>

                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center overflow-hidden">
                          {user.imagen ? (
                            <img src={user.imagen} alt={user.nombre} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-lg">👤</span>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1">
                          <p className="text-white font-medium">{user.nombre}</p>
                          <div className="flex items-center gap-3 text-sm">
                            <span className="text-slate-400 flex items-center gap-1">
                              <Mail size={12} />
                              {user.email}
                            </span>
                            {user.telefono && (
                              <span className="text-green-400 flex items-center gap-1">
                                <MessageCircle size={12} />
                                {user.telefono}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Level Badge */}
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          user.level === 'BASIC' ? 'bg-green-500/20 text-green-400' :
                          user.level === 'ADVANCED' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-amber-500/20 text-amber-400'
                        }`}>
                          {user.level === 'BASIC' ? 'Básico' : user.level === 'ADVANCED' ? 'Avanzado' : 'PL'}
                        </span>

                        {/* Contact Status */}
                        <div className="flex gap-1">
                          <span className={`w-6 h-6 rounded flex items-center justify-center ${
                            user.email ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-600 text-slate-500'
                          }`}>
                            <Mail size={14} />
                          </span>
                          <span className={`w-6 h-6 rounded flex items-center justify-center ${
                            user.telefono ? 'bg-green-500/20 text-green-400' : 'bg-slate-600 text-slate-500'
                          }`}>
                            <MessageCircle size={14} />
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Preview del Mensaje */}
            {selectedVideo && selectedVideoData && (
              <div className="bg-slate-800 rounded-xl p-5 mt-6">
                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                  <span className="text-xl">{selectedVideoData.icon}</span>
                  Vista Previa del Mensaje
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Email Preview */}
                  {(sendMethod === 'email' || sendMethod === 'both') && (
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Mail size={16} className="text-blue-400" />
                        <span className="text-blue-400 font-medium text-sm">Correo Electrónico</span>
                      </div>
                      <div className="bg-slate-900 rounded-lg p-4 text-sm text-slate-300 whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                        {INVITE_MESSAGES[selectedVideo]?.email
                          .replace('{nombre}', 'Juan')
                          .replace('{videoUrl}', videoUrls[selectedVideo] || '[URL del video]')
                        }
                      </div>
                    </div>
                  )}

                  {/* WhatsApp Preview */}
                  {(sendMethod === 'whatsapp' || sendMethod === 'both') && (
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <MessageCircle size={16} className="text-green-400" />
                        <span className="text-green-400 font-medium text-sm">WhatsApp</span>
                      </div>
                      <div className="bg-[#0d1418] rounded-lg p-4 text-sm text-slate-300 whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                        {INVITE_MESSAGES[selectedVideo]?.whatsapp
                          .replace('{nombre}', 'Juan')
                          .replace('{videoUrl}', videoUrls[selectedVideo] || '[URL del video]')
                        }
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
