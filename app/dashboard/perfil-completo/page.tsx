'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  User, 
  Save, 
  Upload, 
  Calendar,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Award,
  Camera,
  Users,
  Heart,
  Scale,
  Ruler,
  Cigarette,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
  PartyPopper,
  Lock,
  Eye,
  EyeOff,
  X,
  AlertCircle
} from 'lucide-react';
import Image from 'next/image';
import { CondecoracionesGrid } from '@/components/condecoraciones/CondecoracionesBadge';
import QuantumIdentityModal from '@/components/quantum/QuantumIdentityModal';

interface ConfiguracionData {
  // Datos personales
  nombre: string;
  fechaNacimiento: string;
  email: string;
  whatsapp: string;
  telefono: string;
  
  // Tribu
  misionTribu: string;
  logoTribu: string;
  fraseFavorita: string;
  numeroVision: string;
  angelEnrolamiento: string;
  
  // Domicilio
  calle: string;
  numero: string;
  colonia: string;
  codigoPostal: string;
  estadoMunicipio: string;
  
  // Datos físicos
  ocupacion: string;
  tallaCamiseta: string;
  peso: string;
  imc: string;
  estatura: string;
  fotoTicketPeso: string;
  
  // Hábitos
  fuma: boolean;
  fumaCantidad: string;
  quiereSerStaff: boolean;
  staffBasicoInterest: boolean;
  staffAvanzadoInterest: boolean;
  staffLideratoInterest: boolean;
  staffServicioInterest: boolean;
  
  // Fotos
  fotoPrimerDia: string;
  fotoUltimoDiaPL: string;
  fotoContrato: string;
  contratoAvanzado: string;
  
  // Coaches y Staff
  coachBasico: string;
  staffBasico: string;
  coachAvanzado: string;
  staffAvanzado: string;
  gameChangerNombre: string;
  coachPrimerFin: string;
  coachSegundoFin: string;
  coachTercerFin: string;
  
  // Condecoraciones
  condecoraciones: string[];
}

const CONDECORACIONES = [
  { id: 'basico', label: 'Básico', color: 'bg-blue-500' },
  { id: 'avanzado', label: 'Avanzado', color: 'bg-purple-500' },
  { id: 'primer_fin', label: '1er Fin', color: 'bg-green-500' },
  { id: 'segundo_fin', label: '2do Fin', color: 'bg-yellow-500' },
  { id: 'tercer_fin', label: '3er Fin', color: 'bg-red-500' },
  { id: 'staff_basico', label: 'Staff Básico', color: 'bg-cyan-500' },
  { id: 'staff_avanzado', label: 'Staff Avanzado', color: 'bg-indigo-500' },
  { id: 'senior_certificado', label: 'Senior Certificado', color: 'bg-pink-500' },
  { id: 'master_senior', label: 'Master Senior', color: 'bg-orange-500' },
  { id: 'coach', label: 'Coach', color: 'bg-teal-500' },
  { id: 'master_coach', label: 'Master Coach', color: 'bg-rose-500' }
];

const TALLAS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

export default function ConfiguracionCompletaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isOnboarding = searchParams.get('onboarding') === 'true';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showOnboardingBanner, setShowOnboardingBanner] = useState(isOnboarding);
  const [error, setError] = useState<string | null>(null);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [profileImage, setProfileImage] = useState<string>('');
  const [canChangeAvatar, setCanChangeAvatar] = useState(true);
  const [lastAvatarChange, setLastAvatarChange] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [visionesHistorial, setVisionesHistorial] = useState<Array<{nombre: string, rol: string, fecha: string}>>([]);
  
  // Estados para modal de cambio de contraseña
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [hasBasicAttendance, setHasBasicAttendance] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  
  const [config, setConfig] = useState<ConfiguracionData>({
    nombre: '',
    fechaNacimiento: '',
    email: '',
    whatsapp: '',
    telefono: '',
    misionTribu: '',
    logoTribu: '',
    fraseFavorita: '',
    numeroVision: '',
    angelEnrolamiento: '',
    calle: '',
    numero: '',
    colonia: '',
    codigoPostal: '',
    estadoMunicipio: '',
    ocupacion: '',
    tallaCamiseta: 'M',
    peso: '',
    imc: '',
    estatura: '',
    fotoTicketPeso: '',
    fuma: false,
    fumaCantidad: '',
    quiereSerStaff: false,
    staffBasicoInterest: false,
    staffAvanzadoInterest: false,
    staffLideratoInterest: false,
    staffServicioInterest: false,
    fotoPrimerDia: '',
    fotoUltimoDiaPL: '',
    fotoContrato: '',
    contratoAvanzado: '',
    coachBasico: '',
    staffBasico: '',
    coachAvanzado: '',
    staffAvanzado: '',
    gameChangerNombre: '',
    coachPrimerFin: '',
    coachSegundoFin: '',
    coachTercerFin: '',
    condecoraciones: []
  });

  useEffect(() => {
    fetchConfiguracion();
  }, []);

  const fetchConfiguracion = async () => {
    try {
      const res = await fetch('/api/configuracion');
      const data = await res.json();
      
      if (res.ok && data.success) {
        // Normalizar todos los valores null a string vacío
        const normalizedConfig = Object.entries(data.configuracion).reduce((acc, [key, value]) => {
          acc[key] = value === null ? '' : value;
          return acc;
        }, {} as any);
        
        setConfig(prev => ({
          ...prev,
          ...normalizedConfig,
          fechaNacimiento: data.configuracion.fechaNacimiento 
            ? new Date(data.configuracion.fechaNacimiento).toISOString().split('T')[0] 
            : ''
        }));
        
        // Obtener avatar y verificar si puede cambiarlo
        const avatarUrl = data.usuario?.profileImage || '';
        console.log('🖼️ Avatar cargado:', avatarUrl);
        setProfileImage(avatarUrl);
        setUserEmail(data.usuario?.email || '');
        setLastAvatarChange(data.usuario?.lastAvatarChangeDate || null);
        
        // Guardar historial de visiones
        console.log('📊 Visiones historial recibido:', data.visionesHistorial);
        setVisionesHistorial(data.visionesHistorial || []);
        
        // Verificar si tiene asistencia en Básico (para permitir cambiar nombre)
        setHasBasicAttendance(data.hasBasicAttendance || false);
        
        // Verificar si ha pasado 1 mes desde el último cambio
        if (data.usuario?.lastAvatarChangeDate) {
          const lastChange = new Date(data.usuario.lastAvatarChangeDate);
          const now = new Date();
          const diffTime = Math.abs(now.getTime() - lastChange.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          setCanChangeAvatar(diffDays >= 30);
        } else {
          setCanChangeAvatar(true);
        }
      }
    } catch (error) {
      console.error('Error fetching configuración:', error);
      setError('Error al cargar configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/configuracion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      const data = await res.json();
      
      if (res.ok && data.success) {
        setShowSuccess(true);
        // Si es onboarding, redirigir al dashboard después de guardar
        if (isOnboarding) {
          setTimeout(() => {
            router.push('/dashboard');
          }, 1500);
        } else {
          setTimeout(() => setShowSuccess(false), 3000);
        }
      } else {
        setError(data.error || 'Error al guardar configuración');
      }
    } catch (error) {
      console.error('Error saving configuración:', error);
      setError('Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (field: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('field', field);

    try {
      const res = await fetch('/api/configuracion/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      
      if (res.ok && data.success) {
        setConfig(prev => ({ ...prev, [field]: data.url }));
      } else {
        setError('Error al subir imagen');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      setError('Error al subir imagen');
    }
  };

  const handleChangePassword = async () => {
    setPasswordError(null);
    setPasswordSuccess(false);

    // Validaciones
    if (!passwordData.currentPassword) {
      setPasswordError('Ingresa tu contraseña actual');
      return;
    }

    if (!passwordData.newPassword) {
      setPasswordError('Ingresa la nueva contraseña');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setPasswordError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    const hasUpperCase = /[A-Z]/.test(passwordData.newPassword);
    const hasLowerCase = /[a-z]/.test(passwordData.newPassword);
    const hasNumber = /\d/.test(passwordData.newPassword);

    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      setPasswordError('La contraseña debe contener mayúsculas, minúsculas y números');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Las contraseñas no coinciden');
      return;
    }

    setChangingPassword(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
          isMagicLink: false
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setPasswordSuccess(true);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setTimeout(() => {
          setShowPasswordModal(false);
          setPasswordSuccess(false);
        }, 2000);
      } else {
        setPasswordError(data.error || 'Error al cambiar contraseña');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      setPasswordError('Error al cambiar contraseña');
    } finally {
      setChangingPassword(false);
    }
  };

  const calcularIMC = () => {
    if (config.peso && config.estatura) {
      const pesoNum = parseFloat(config.peso);
      const estaturaNum = parseFloat(config.estatura) / 100; // convertir cm a m
      if (!isNaN(pesoNum) && !isNaN(estaturaNum) && estaturaNum > 0) {
        const imc = (pesoNum / (estaturaNum * estaturaNum)).toFixed(2);
        setConfig(prev => ({ ...prev, imc }));
      }
    }
  };

  useEffect(() => {
    calcularIMC();
  }, [config.peso, config.estatura]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <Loader2 className="animate-spin h-12 w-12 text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                onClick={() => router.back()}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-all flex-shrink-0"
              >
                <ArrowLeft size={20} className="text-cyan-400" />
              </button>
              <div className="p-3 bg-cyan-500/20 rounded-xl flex-shrink-0">
                <User size={24} className="text-cyan-400" />
              </div>
              <div>
                <h1 className="text-xl md:text-3xl font-bold text-white">Perfil Completo</h1>
                <p className="text-sm md:text-base text-slate-400">Completa tu información personal</p>
              </div>
            </div>
            
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full md:w-auto px-6 py-3 bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-600 text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              <Save size={20} />
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>

        {/* Onboarding Welcome Banner */}
        {showOnboardingBanner && (
          <div className="mb-6 bg-gradient-to-r from-purple-600/20 via-cyan-600/20 to-purple-600/20 border border-purple-500/40 rounded-2xl p-6 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-xl flex-shrink-0">
                <PartyPopper size={28} className="text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white mb-2">
                  ¡Bienvenido a Impacto Cuántico! 🎉
                </h2>
                <p className="text-slate-300 mb-3">
                  Tu contraseña ha sido actualizada correctamente. Ahora completa tu perfil para personalizar tu experiencia y que tu equipo pueda conocerte mejor.
                </p>
                <p className="text-cyan-400 text-sm font-medium">
                  ✨ Llena los campos obligatorios marcados y guarda tus cambios para continuar.
                </p>
              </div>
              <button
                onClick={() => setShowOnboardingBanner(false)}
                className="text-slate-400 hover:text-white transition-colors p-1"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Success Message */}
        {showSuccess && (
          <div className="mb-6 bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-3 animate-in fade-in duration-300">
            <CheckCircle2 className="text-green-400 flex-shrink-0" size={24} />
            <div>
              <p className="text-green-400 font-bold">¡Configuración guardada!</p>
              <p className="text-green-300 text-sm">Tus cambios se han guardado correctamente</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        <div className="space-y-4 md:space-y-6">
          
          {/* Avatar Cuántico */}
          <div className="bg-gradient-to-br from-purple-900/30 via-blue-900/30 to-purple-900/30 border-2 border-purple-500/50 rounded-2xl p-4 md:p-6 shadow-xl">
            <h2 className="text-lg md:text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Sparkles size={20} className="text-purple-400" />
              Avatar Cuántico
            </h2>
            
            <div className="flex flex-col items-center gap-4 md:gap-6">
              {/* Avatar Display */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 transition-opacity"></div>
                {profileImage ? (
                  <img 
                    key={profileImage}
                    src={profileImage} 
                    alt="Avatar Cuántico" 
                    className="relative w-32 h-32 md:w-48 md:h-48 rounded-2xl object-cover border-4 border-purple-500/50 shadow-2xl shadow-purple-500/50"
                    onError={(e) => {
                      console.error('❌ Error cargando imagen:', profileImage);
                      e.currentTarget.style.display = 'none';
                    }}
                    onLoad={() => {
                      console.log('✅ Imagen cargada correctamente:', profileImage);
                    }}
                  />
                ) : (
                  <div className="relative w-32 h-32 md:w-48 md:h-48 rounded-2xl border-4 border-purple-500/50 bg-slate-800 flex items-center justify-center">
                    <User size={48} className="text-slate-600" />
                  </div>
                )}
              </div>
              
              {/* Avatar Info & Actions */}
              <div className="w-full text-center space-y-3">
                <p className="text-sm md:text-base text-slate-300">
                  Tu avatar cuántico es tu identidad visual en la plataforma. Refleja tu personalidad y tus metas.
                </p>
                {lastAvatarChange && (
                  <p className="text-xs md:text-sm text-slate-400">
                    Último cambio: {new Date(lastAvatarChange).toLocaleDateString('es-MX', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                )}
                
                <button
                  onClick={() => setShowAvatarModal(true)}
                  disabled={!canChangeAvatar}
                  className={`w-full md:w-auto px-6 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg ${
                    canChangeAvatar 
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-purple-500/30' 
                      : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Sparkles size={20} />
                  {profileImage ? 'Regenerar Avatar' : 'Generar Avatar'}
                </button>
                
                {!canChangeAvatar && (
                  <p className="text-xs md:text-sm text-yellow-400 flex items-center justify-center gap-2">
                    <span className="inline-block w-2 h-2 bg-yellow-400 rounded-full"></span>
                    Solo puedes cambiar tu avatar una vez al mes. Próximo cambio disponible en {
                      lastAvatarChange ? Math.max(0, 30 - Math.ceil((Date.now() - new Date(lastAvatarChange).getTime()) / (1000 * 60 * 60 * 24))) : 0
                    } días.
                  </p>
                )}
              </div>
            </div>
          </div>
          
          {/* Datos Personales */}
          <div className="bg-gradient-to-br from-cyan-900/20 to-slate-900/50 border border-cyan-700/30 rounded-2xl p-4 md:p-6">
            <h2 className="text-lg md:text-xl font-bold text-white mb-4 flex items-center gap-2">
              <User size={20} className="text-cyan-400" />
              Datos Personales
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Nombre Completo</label>
                <input
                  type="text"
                  value={config.nombre}
                  onChange={(e) => hasBasicAttendance && setConfig({...config, nombre: e.target.value})}
                  placeholder="Nombre y apellidos"
                  disabled={!hasBasicAttendance}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none ${
                    hasBasicAttendance 
                      ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-500' 
                      : 'bg-slate-800 border-slate-700 text-slate-400 cursor-not-allowed'
                  }`}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                  <Calendar size={16} />
                  Fecha de Nacimiento
                </label>
                <input
                  type="date"
                  value={config.fechaNacimiento}
                  onChange={(e) => setConfig({...config, fechaNacimiento: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                  <Mail size={16} />
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  value={config.email}
                  disabled
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 cursor-not-allowed"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                  <Phone size={16} />
                  WhatsApp
                </label>
                <input
                  type="tel"
                  value={config.whatsapp}
                  onChange={(e) => setConfig({...config, whatsapp: e.target.value})}
                  placeholder="+52 123 456 7890"
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                  <Briefcase size={16} />
                  Ocupación/Oficio
                </label>
                <input
                  type="text"
                  value={config.ocupacion}
                  onChange={(e) => setConfig({...config, ocupacion: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
              
              {/* Botón Cambiar Contraseña */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                  <Lock size={16} />
                  Seguridad
                </label>
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="w-full px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-cyan-500 rounded-lg text-cyan-400 font-medium transition-all flex items-center justify-center gap-2"
                >
                  <Lock size={18} />
                  Cambiar Contraseña
                </button>
              </div>
            </div>
          </div>

          {/* Tribu */}
          <div className="bg-gradient-to-br from-purple-900/20 to-slate-900/50 border border-purple-700/30 rounded-2xl p-4 md:p-6">
            <h2 className="text-lg md:text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Users size={20} className="text-purple-400" />
              Información de Equipo
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">Misión de Tribu</label>
                <div className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-slate-300 min-h-[80px]">
                  {config.misionTribu || <span className="text-slate-500 italic">Sin misión configurada</span>}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                  <Heart size={16} />
                  Frase Favorita
                </label>
                <input
                  type="text"
                  value={config.fraseFavorita}
                  onChange={(e) => setConfig({...config, fraseFavorita: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-3">Historial de Visiones</label>
                {visionesHistorial.length > 0 ? (
                  <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 space-y-2">
                    {visionesHistorial.map((vision, index) => (
                      <div 
                        key={index}
                        className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-purple-500/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            vision.rol === 'Coordinador' ? 'bg-red-500/20 text-red-400' :
                            vision.rol === 'Mentor' ? 'bg-blue-500/20 text-blue-400' :
                            vision.rol === 'GameChanger' ? 'bg-purple-500/20 text-purple-400' :
                            'bg-green-500/20 text-green-400'
                          }`}>
                            {vision.rol}
                          </span>
                          <span className="text-white font-medium">{vision.nombre}</span>
                        </div>
                        <span className="text-slate-400 text-sm">
                          {new Date(vision.fecha).toLocaleDateString('es-MX', {
                            year: 'numeric',
                            month: 'short'
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 text-center text-slate-400">
                    No hay historial de visiones
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Ángel de Enrolamiento</label>
                <input
                  type="text"
                  value={config.angelEnrolamiento}
                  readOnly
                  disabled
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-slate-300 cursor-not-allowed"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Logo de Tribu
                </label>
                {config.logoTribu ? (
                  <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
                    <Image src={config.logoTribu} alt="Logo Tribu" width={100} height={100} className="rounded-lg" />
                  </div>
                ) : (
                  <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 text-center text-slate-400">
                    El logo será asignado automáticamente desde la votación de tu tribu
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Domicilio */}
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700 rounded-2xl p-4 md:p-6">
            <h2 className="text-lg md:text-xl font-bold text-white mb-2 flex items-center gap-2">
              <MapPin size={20} className="text-green-400" />
              Domicilio
            </h2>
            <p className="text-xs md:text-sm text-slate-400 mb-3">Para recibir correspondencia o paquetería</p>
            
            {/* Mensaje destacado de regalo */}
            <div className="mb-4 p-3 bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30 rounded-xl flex items-center gap-3">
              <span className="text-2xl">🎁</span>
              <p className="text-sm text-pink-200">
                <span className="font-semibold">¡Quizá te enviemos un regalo!</span>
                <span className="text-pink-300/80 ml-1">Asegúrate de que tu dirección esté correcta.</span>
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">Calle</label>
                <input
                  type="text"
                  value={config.calle}
                  onChange={(e) => setConfig({...config, calle: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-green-500 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Número</label>
                <input
                  type="text"
                  value={config.numero}
                  onChange={(e) => setConfig({...config, numero: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-green-500 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Colonia</label>
                <input
                  type="text"
                  value={config.colonia}
                  onChange={(e) => setConfig({...config, colonia: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-green-500 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Código Postal</label>
                <input
                  type="text"
                  value={config.codigoPostal}
                  onChange={(e) => setConfig({...config, codigoPostal: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-green-500 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Estado o Municipio</label>
                <input
                  type="text"
                  value={config.estadoMunicipio}
                  onChange={(e) => setConfig({...config, estadoMunicipio: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-green-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Datos Físicos */}
          <div className="bg-gradient-to-br from-orange-900/20 to-slate-900/50 border border-orange-700/30 rounded-2xl p-4 md:p-6">
            <h2 className="text-lg md:text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Scale size={20} className="text-orange-400" />
              Datos Físicos y Salud
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                  Talla de Camiseta
                  <span className="text-xs text-orange-400/80 font-normal">(de tu votación)</span>
                </label>
                <select
                  value={config.tallaCamiseta}
                  onChange={(e) => setConfig({...config, tallaCamiseta: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                >
                  {TALLAS.map(talla => (
                    <option key={talla} value={talla}>{talla}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                  <Scale size={16} />
                  Peso (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={config.peso}
                  onChange={(e) => setConfig({...config, peso: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                  <Ruler size={16} />
                  Estatura (cm)
                </label>
                <input
                  type="number"
                  value={config.estatura}
                  onChange={(e) => setConfig({...config, estatura: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">IMC (Calculado)</label>
                <input
                  type="text"
                  value={config.imc}
                  disabled
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 cursor-not-allowed"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                  <Cigarette size={16} />
                  ¿Fumas?
                </label>
                <select
                  value={config.fuma ? 'si' : 'no'}
                  onChange={(e) => setConfig({...config, fuma: e.target.value === 'si'})}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                >
                  <option value="no">No</option>
                  <option value="si">Sí</option>
                </select>
              </div>
              
              {config.fuma && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">¿Cuánto?</label>
                  <input
                    type="text"
                    value={config.fumaCantidad}
                    onChange={(e) => setConfig({...config, fumaCantidad: e.target.value})}
                    placeholder="Ej: 5 cigarros al día"
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
              )}
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                  <Camera size={16} />
                  Foto Primer Ticket de Peso
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleImageUpload('fotoTicketPeso', e.target.files[0])}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:border-orange-500 focus:outline-none file:mr-4 file:py-3 file:px-4 file:rounded-lg file:border-0 file:bg-orange-500 file:text-black file:font-medium hover:file:bg-orange-600"
                />
                {config.fotoTicketPeso && (
                  <div className="mt-2">
                    <Image src={config.fotoTicketPeso} alt="Ticket Peso" width={150} height={150} className="rounded-lg" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quiero ser Staff - Sección destacada */}
          <div className={`relative overflow-hidden rounded-2xl p-6 md:p-8 transition-all duration-300 ${
            config.quiereSerStaff 
              ? 'bg-gradient-to-br from-emerald-900/40 via-emerald-800/30 to-slate-900/50 border-2 border-emerald-500/50 shadow-lg shadow-emerald-500/20' 
              : 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700 hover:border-cyan-500/50'
          }`}>
            {/* Decoración de fondo */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-500/10 to-transparent rounded-full blur-2xl" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-emerald-500/10 to-transparent rounded-full blur-2xl" />
            
            <div className="relative z-10">
              <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
                <div className="flex-shrink-0">
                  <div className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                    config.quiereSerStaff 
                      ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30' 
                      : 'bg-slate-700/50'
                  }`}>
                    <span className="text-3xl md:text-4xl">🌟</span>
                  </div>
                </div>
                
                <div className="flex-1">
                  <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
                    ¿Quieres ser parte del Staff?
                  </h2>
                  <p className="text-sm md:text-base text-slate-400 leading-relaxed">
                    Al activar esta opción, aparecerás en la <span className="text-cyan-400 font-medium">lista de prospectos</span> para ser seleccionado como Staff en futuras visiones. Los coordinadores podrán verte y elegirte para formar parte del equipo.
                  </p>
                </div>
                
                <div className="flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setConfig({...config, quiereSerStaff: !config.quiereSerStaff})}
                    className={`relative w-20 h-10 rounded-full transition-all duration-300 ${
                      config.quiereSerStaff 
                        ? 'bg-emerald-500' 
                        : 'bg-slate-700'
                    }`}
                  >
                    <span className={`absolute top-1 w-8 h-8 bg-white rounded-full shadow-md transition-all duration-300 ${
                      config.quiereSerStaff ? 'left-11' : 'left-1'
                    }`} />
                  </button>
                </div>
              </div>
              
              {config.quiereSerStaff && (
                <div className="mt-6 space-y-4">
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3">
                    <span className="text-xl">✅</span>
                    <p className="text-sm text-emerald-300">
                      <span className="font-semibold">¡Estás en la lista!</span>
                      <span className="text-emerald-400/80 ml-1">Los coordinadores pueden verte como prospecto de Staff.</span>
                    </p>
                  </div>
                  
                  {/* Selección de niveles de Staff */}
                  <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
                    <h3 className="text-sm font-semibold text-white mb-3">¿En qué niveles te gustaría ser Staff?</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {/* Básico */}
                      <button
                        type="button"
                        onClick={() => setConfig({...config, staffBasicoInterest: !config.staffBasicoInterest})}
                        className={`p-3 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2 ${
                          config.staffBasicoInterest 
                            ? 'bg-blue-500/20 border-blue-500 text-blue-400' 
                            : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        <span className="text-2xl">🎯</span>
                        <span className="text-sm font-medium">Básico</span>
                      </button>
                      
                      {/* Avanzado */}
                      <button
                        type="button"
                        onClick={() => setConfig({...config, staffAvanzadoInterest: !config.staffAvanzadoInterest})}
                        className={`p-3 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2 ${
                          config.staffAvanzadoInterest 
                            ? 'bg-orange-500/20 border-orange-500 text-orange-400' 
                            : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        <span className="text-2xl">🚀</span>
                        <span className="text-sm font-medium">Avanzado</span>
                      </button>
                      
                      {/* Liderato */}
                      <button
                        type="button"
                        onClick={() => setConfig({...config, staffLideratoInterest: !config.staffLideratoInterest})}
                        className={`p-3 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2 ${
                          config.staffLideratoInterest 
                            ? 'bg-purple-500/20 border-purple-500 text-purple-400' 
                            : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        <span className="text-2xl">👑</span>
                        <span className="text-sm font-medium">Liderato</span>
                      </button>
                      
                      {/* Servicio */}
                      <button
                        type="button"
                        onClick={() => setConfig({...config, staffServicioInterest: !config.staffServicioInterest})}
                        className={`p-3 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2 ${
                          config.staffServicioInterest 
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                            : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        <span className="text-2xl">🤝</span>
                        <span className="text-sm font-medium">Servicio</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Staff y Coaches (Solo lectura - Asignados desde Vision Builder) */}
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700 rounded-2xl p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                <Award size={20} className="text-yellow-400" />
                Mi Historial de Coaches y Staff
              </h2>
              <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded">Asignado automáticamente</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Coach de Básico</label>
                <div className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-300">
                  {config.coachBasico || <span className="text-slate-500 italic">Sin asignar</span>}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Staff de Básico</label>
                <div className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-300">
                  {config.staffBasico || <span className="text-slate-500 italic">Sin asignar</span>}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Coach de Avanzado</label>
                <div className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-300">
                  {config.coachAvanzado || <span className="text-slate-500 italic">Sin asignar</span>}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Staff de Avanzado</label>
                <div className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-300">
                  {config.staffAvanzado || <span className="text-slate-500 italic">Sin asignar</span>}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Game Changer</label>
                <div className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-300">
                  {config.gameChangerNombre || <span className="text-slate-500 italic">Sin asignar</span>}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Coach de 1er Fin</label>
                <div className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-300">
                  {config.coachPrimerFin || <span className="text-slate-500 italic">Sin asignar</span>}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Coach de 2do Fin</label>
                <div className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-300">
                  {config.coachSegundoFin || <span className="text-slate-500 italic">Sin asignar</span>}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Coach de 3er Fin</label>
                <div className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-300">
                  {config.coachTercerFin || <span className="text-slate-500 italic">Sin asignar</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Condecoraciones */}
          <div className="bg-gradient-to-br from-yellow-900/20 to-slate-900/50 border border-yellow-700/30 rounded-2xl p-4 md:p-6">
            <h2 className="text-lg md:text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Award size={20} className="text-yellow-400" />
              Condecoraciones
            </h2>
            <p className="text-xs md:text-sm text-slate-400 mb-4">(Asignadas por el coordinador)</p>
            
            <CondecoracionesGrid condecoraciones={config.condecoraciones} />
          </div>

        </div>

        {/* Save Button (Bottom) */}
        <div className="mt-6 md:mt-8 flex justify-center md:justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full md:w-auto px-8 py-4 bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-600 text-black font-bold text-base md:text-lg rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-cyan-500/20"
          >
            <Save size={20} />
            {saving ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>

      </div>
      
      {/* Modal de Cambiar Contraseña */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/20 rounded-lg">
                  <Lock size={24} className="text-cyan-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Cambiar Contraseña</h3>
              </div>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  setPasswordError(null);
                  setPasswordSuccess(false);
                }}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            {/* Success Message */}
            {passwordSuccess && (
              <div className="mb-4 bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-3">
                <CheckCircle2 className="text-green-400 flex-shrink-0" size={20} />
                <p className="text-green-400 font-medium">¡Contraseña actualizada correctamente!</p>
              </div>
            )}

            {/* Error Message */}
            {passwordError && (
              <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
                <AlertCircle className="text-red-400 flex-shrink-0" size={20} />
                <p className="text-red-400">{passwordError}</p>
              </div>
            )}

            {/* Form */}
            <div className="space-y-4">
              {/* Current Password */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Contraseña Actual
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    placeholder="Ingresa tu contraseña actual"
                    className="w-full px-4 py-3 pr-12 bg-slate-800 border border-slate-600 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nueva Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    placeholder="Mínimo 8 caracteres"
                    className="w-full px-4 py-3 pr-12 bg-slate-800 border border-slate-600 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Debe contener mayúsculas, minúsculas y números
                </p>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Confirmar Nueva Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    placeholder="Repite la nueva contraseña"
                    className="w-full px-4 py-3 pr-12 bg-slate-800 border border-slate-600 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  setPasswordError(null);
                }}
                className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-slate-300 font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleChangePassword}
                disabled={changingPassword}
                className="flex-1 px-4 py-3 bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-600 rounded-lg text-black font-bold transition-colors flex items-center justify-center gap-2"
              >
                {changingPassword ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Cambiando...
                  </>
                ) : (
                  <>
                    <Lock size={18} />
                    Cambiar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de Avatar Cuántico */}
      <QuantumIdentityModal
        isOpen={showAvatarModal}
        onClose={() => {
          setShowAvatarModal(false);
          // Recargar configuración para obtener el nuevo avatar
          fetchConfiguracion();
        }}
        userName={userEmail || 'Usuario'}
        userLevel={1}
        userRank="Novato"
      />
    </div>
  );
}
