'use client';

import { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Send, 
  AlertTriangle, 
  Loader2, 
  CheckCircle2, 
  User,
  Users,
  Building2
} from 'lucide-react';

interface StaffMember {
  id: number;
  nombre: string;
  rol: string;
}

const CATEGORIAS = [
  { value: 'QUEJA', label: 'Queja General', icon: '💬' },
  { value: 'SUGERENCIA', label: 'Sugerencia', icon: '💡' },
  { value: 'ACOSO', label: 'Acoso', icon: '⚠️' },
  { value: 'DISCRIMINACION', label: 'Discriminación', icon: '🚫' },
  { value: 'OTRO', label: 'Otro', icon: '📋' }
];

const TIPOS_STAFF = [
  { value: 'GENERAL', label: 'Reporte General', description: 'No sobre una persona específica', roles: [] as string[] },
  { value: 'TRAINER', label: 'Entrenador', description: 'Sobre un entrenador de visión', roles: ['TRAINER', 'ENTRENADOR'] },
  { value: 'COORDINADOR', label: 'Coordinador', description: 'Sobre el coordinador de visión', roles: ['COORDINADOR', 'COORDINATOR', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED'] },
  { value: 'GAME_CHANGER', label: 'Game Changer', description: 'Sobre un game changer', roles: ['GAMECHANGER', 'GAME_CHANGER', 'LIDER'] },
  { value: 'MENTOR', label: 'Mentor', description: 'Sobre un mentor asignado', roles: ['MENTOR'] }
];

export default function BuzonAnonimoPage() {
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [organizationId, setOrganizationId] = useState<number | null>(null);
  const [organizationName, setOrganizationName] = useState('');
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  
  const [tipoReportado, setTipoReportado] = useState('GENERAL');
  const [reportedUserId, setReportedUserId] = useState<number | null>(null);
  const [categoria, setCategoria] = useState('QUEJA');
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setCargando(true);
      setError(null);
      
      // Obtener info del usuario actual
      console.log('🔍 Fetching /api/user/me...');
      const res = await fetch('/api/user/me');
      
      if (!res.ok) {
        console.error('❌ /api/user/me failed:', res.status);
        setError('Error al obtener información del usuario');
        return;
      }
      
      const data = await res.json();
      console.log('📦 /api/user/me response:', data);
      
      if (!data.organizationId) {
        console.warn('⚠️ No organizationId in user data');
        setError('No tienes una organización asignada');
        return;
      }
      
      setOrganizationId(data.organizationId);
      setOrganizationName(data.organization?.name || 'Tu organización');
      
      // Obtener staff de la organización
      console.log('🔍 Fetching staff for org:', data.organizationId);
      const staffRes = await fetch(`/api/organization/${data.organizationId}/staff`);
      console.log('📦 Staff response status:', staffRes.status);
      
      const staffData = await staffRes.json();
      console.log('📦 Staff data:', staffData);
      
      if (staffRes.ok && staffData.staff) {
        setStaffList(staffData.staff);
        console.log('✅ Staff loaded:', staffData.staff.length, 'members');
      } else {
        console.error('❌ Staff API error:', staffData);
        // No mostrar error al usuario, solo no tendrá staff para seleccionar
      }
    } catch (err) {
      console.error('❌ Error general:', err);
      setError('Error al cargar los datos');
    } finally {
      setCargando(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!organizationId) {
      setError('No se pudo identificar tu organización');
      return;
    }
    
    if (mensaje.trim().length < 20) {
      setError('Por favor describe el problema con al menos 20 caracteres');
      return;
    }

    setEnviando(true);
    setError(null);

    try {
      const res = await fetch('/api/vision/reporte-anonimo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          reportedUserId: tipoReportado !== 'GENERAL' ? reportedUserId : null,
          tipoReportado,
          categoria,
          mensaje: mensaje.trim()
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setExito(true);
      } else {
        setError(data.error || 'Error al enviar el reporte');
      }
    } catch (err) {
      setError('Error de conexión. Intenta nuevamente.');
    } finally {
      setEnviando(false);
    }
  };

  // Filtrar staff por tipo seleccionado
  const staffFiltrado = staffList.filter(s => {
    const tipoSeleccionado = TIPOS_STAFF.find(t => t.value === tipoReportado);
    if (!tipoSeleccionado || tipoSeleccionado.roles.length === 0) return false;
    return tipoSeleccionado.roles.includes(s.rol);
  });

  // Debug - mostrar en consola
  console.log('Staff list:', staffList);
  console.log('Tipo reportado:', tipoReportado);
  console.log('Staff filtrado:', staffFiltrado);
  console.log('Organization ID:', organizationId);

  if (cargando) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-orange-500 mx-auto mb-4" size={48} />
          <p className="text-slate-400">Cargando...</p>
        </div>
      </div>
    );
  }

  // Debug temporal - mostrar si no hay staff
  if (staffList.length === 0 && organizationId) {
    console.warn('⚠️ No se cargó ningún staff para la organización:', organizationId);
  }

  if (exito) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-gradient-to-br from-green-600 to-emerald-600 p-8 rounded-2xl text-center shadow-2xl max-w-md w-full">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={40} className="text-green-600" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">
            ¡Reporte Enviado!
          </h3>
          <p className="text-green-100 mb-6">
            Tu mensaje ha sido enviado de forma confidencial. El administrador lo revisará pronto.
          </p>
          <a 
            href="/dashboard"
            className="inline-block px-6 py-3 bg-white text-green-600 rounded-lg font-bold hover:bg-green-50 transition-colors"
          >
            Volver al Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl p-6 md:p-8 mb-6 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
              <ShieldAlert className="text-white" size={32} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Buzón Anónimo</h1>
              <p className="text-orange-100 text-sm">
                Reporta de forma confidencial
              </p>
            </div>
          </div>
        </div>

        {/* Alert de Confidencialidad */}
        <div className="bg-yellow-900/30 border-2 border-yellow-600/50 rounded-xl p-4 md:p-6 mb-6 flex items-start gap-4">
          <AlertTriangle className="text-yellow-500 flex-shrink-0 mt-1" size={20} />
          <div>
            <h3 className="text-yellow-500 font-bold mb-1">
              Tu reporte es confidencial
            </h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              Este mensaje será revisado únicamente los administradores de la plataforma. 
              <strong> Tu identidad será protegida.</strong>
            </p>
          </div>
        </div>

        {/* Organización */}
        {organizationName && (
          <div className="bg-slate-800/50 rounded-xl p-4 mb-6 flex items-center gap-3">
            <Building2 className="text-indigo-400" size={20} />
            <span className="text-slate-300">Organización: <strong className="text-white">{organizationName}</strong></span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="bg-slate-800/50 rounded-xl p-6 space-y-6">
          {/* Categoría */}
          <div>
            <label className="block text-white font-semibold mb-3">¿Qué tipo de reporte es?</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {CATEGORIAS.map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategoria(cat.value)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    categoria === cat.value
                      ? 'border-orange-500 bg-orange-500/20 text-white'
                      : 'border-slate-600 bg-slate-700/50 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <span className="text-xl mr-2">{cat.icon}</span>
                  <span className="text-sm font-medium">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tipo de Staff */}
          <div>
            <label className="block text-white font-semibold mb-3">¿Sobre quién es el reporte?</label>
            <div className="space-y-2">
              {TIPOS_STAFF.map(tipo => (
                <button
                  key={tipo.value}
                  type="button"
                  onClick={() => {
                    setTipoReportado(tipo.value);
                    setReportedUserId(null);
                  }}
                  className={`w-full p-3 rounded-lg border-2 text-left transition-all flex items-center gap-3 ${
                    tipoReportado === tipo.value
                      ? 'border-orange-500 bg-orange-500/20'
                      : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
                  }`}
                >
                  {tipo.value === 'GENERAL' ? (
                    <Users className="text-slate-400" size={20} />
                  ) : (
                    <User className="text-slate-400" size={20} />
                  )}
                  <div>
                    <p className={tipoReportado === tipo.value ? 'text-white font-medium' : 'text-slate-300 font-medium'}>
                      {tipo.label}
                    </p>
                    <p className="text-slate-400 text-xs">{tipo.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Seleccionar persona específica */}
          {tipoReportado !== 'GENERAL' && (
            <div>
              <label className="block text-white font-semibold mb-3">
                Selecciona la persona (opcional)
              </label>
              {staffFiltrado.length > 0 ? (
                <select
                  value={reportedUserId || ''}
                  onChange={(e) => setReportedUserId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 border border-slate-600"
                >
                  <option value="">-- Seleccionar (opcional) --</option>
                  {staffFiltrado.map(staff => (
                    <option key={staff.id} value={staff.id}>
                      {staff.nombre}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-slate-400 text-sm italic">
                  No hay {TIPOS_STAFF.find(t => t.value === tipoReportado)?.label.toLowerCase()}s registrados. 
                  Puedes continuar sin seleccionar a alguien específico.
                </p>
              )}
            </div>
          )}

          {/* Mensaje */}
          <div>
            <label className="block text-white font-semibold mb-3">
              Describe la situación
            </label>
            <textarea
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              placeholder="Por favor describe lo que sucedió con el mayor detalle posible. Tu identidad será protegida..."
              className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 border border-slate-600 resize-none h-40 placeholder:text-slate-500"
              required
            />
            <p className="text-slate-400 text-xs mt-1">
              Mínimo 20 caracteres. Actualmente: {mensaje.length}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-900/30 border border-red-600/50 rounded-lg p-4 flex items-center gap-3">
              <AlertTriangle className="text-red-500" size={20} />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={enviando || mensaje.trim().length < 20}
            className="w-full py-4 px-6 bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold rounded-xl hover:from-orange-500 hover:to-red-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {enviando ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send size={20} />
                Enviar Reporte Confidencial
              </>
            )}
          </button>

          {/* Nota final */}
          <p className="text-slate-500 text-xs text-center">
            Al enviar este reporte, confirmas que la información es verídica. 
            Los reportes falsos pueden tener consecuencias.
          </p>
        </form>
      </div>
    </div>
  );
}
