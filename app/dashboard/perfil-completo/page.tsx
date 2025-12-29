'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  ArrowLeft
} from 'lucide-react';
import Image from 'next/image';
import { CondecoracionesGrid } from '@/components/condecoraciones/CondecoracionesBadge';

interface ConfiguracionData {
  // Datos personales
  nombre: string;
  apellido: string;
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<ConfiguracionData>({
    nombre: '',
    apellido: '',
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
        setConfig(prev => ({
          ...prev,
          ...data.configuracion,
          fechaNacimiento: data.configuracion.fechaNacimiento 
            ? new Date(data.configuracion.fechaNacimiento).toISOString().split('T')[0] 
            : ''
        }));
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
        setTimeout(() => setShowSuccess(false), 3000);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-all"
              >
                <ArrowLeft size={24} className="text-cyan-400" />
              </button>
              <div className="p-3 bg-cyan-500/20 rounded-xl">
                <User size={32} className="text-cyan-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Perfil Completo</h1>
                <p className="text-slate-400">Completa tu información personal</p>
              </div>
            </div>
            
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-600 text-black font-bold rounded-xl transition-all flex items-center gap-2"
            >
              <Save size={20} />
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>

        {/* Success Message */}
        {showSuccess && (
          <div className="mb-6 bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle2 className="text-green-400" size={24} />
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

        <div className="space-y-6">
          
          {/* Datos Personales */}
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <User size={24} className="text-cyan-400" />
              Datos Personales
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Nombre</label>
                <input
                  type="text"
                  value={config.nombre}
                  onChange={(e) => setConfig({...config, nombre: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Apellido</label>
                <input
                  type="text"
                  value={config.apellido}
                  onChange={(e) => setConfig({...config, apellido: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
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
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
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
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
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
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Tribu */}
          <div className="bg-gradient-to-br from-purple-900/20 to-slate-900/50 border border-purple-700/30 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Users size={24} className="text-purple-400" />
              Información de Tribu
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">Misión de Tribu</label>
                <textarea
                  value={config.misionTribu}
                  onChange={(e) => setConfig({...config, misionTribu: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                />
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
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Número de Visión</label>
                <input
                  type="text"
                  value={config.numeroVision}
                  disabled
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 cursor-not-allowed"
                  placeholder="Se actualiza automáticamente"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Ángel de Enrolamiento</label>
                <input
                  type="text"
                  value={config.angelEnrolamiento}
                  onChange={(e) => setConfig({...config, angelEnrolamiento: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                  <Upload size={16} />
                  Logo de Tribu (JPG)
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg"
                  onChange={(e) => e.target.files?.[0] && handleImageUpload('logoTribu', e.target.files[0])}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-purple-500 file:text-black file:font-medium hover:file:bg-purple-600"
                />
                {config.logoTribu && (
                  <div className="mt-2">
                    <Image src={config.logoTribu} alt="Logo Tribu" width={100} height={100} className="rounded-lg" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Domicilio */}
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <MapPin size={24} className="text-green-400" />
              Domicilio (Para recibir correspondencia o paquetería)
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">Calle</label>
                <input
                  type="text"
                  value={config.calle}
                  onChange={(e) => setConfig({...config, calle: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-green-500 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Número</label>
                <input
                  type="text"
                  value={config.numero}
                  onChange={(e) => setConfig({...config, numero: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-green-500 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Colonia</label>
                <input
                  type="text"
                  value={config.colonia}
                  onChange={(e) => setConfig({...config, colonia: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-green-500 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Código Postal</label>
                <input
                  type="text"
                  value={config.codigoPostal}
                  onChange={(e) => setConfig({...config, codigoPostal: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-green-500 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Estado o Municipio</label>
                <input
                  type="text"
                  value={config.estadoMunicipio}
                  onChange={(e) => setConfig({...config, estadoMunicipio: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-green-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Datos Físicos */}
          <div className="bg-gradient-to-br from-orange-900/20 to-slate-900/50 border border-orange-700/30 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Scale size={24} className="text-orange-400" />
              Datos Físicos y Salud
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Talla de Camiseta</label>
                <select
                  value={config.tallaCamiseta}
                  onChange={(e) => setConfig({...config, tallaCamiseta: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-orange-500 focus:outline-none"
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
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-orange-500 focus:outline-none"
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
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-orange-500 focus:outline-none"
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
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-orange-500 focus:outline-none"
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
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-orange-500 focus:outline-none"
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
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:border-orange-500 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-orange-500 file:text-black file:font-medium hover:file:bg-orange-600"
                />
                {config.fotoTicketPeso && (
                  <div className="mt-2">
                    <Image src={config.fotoTicketPeso} alt="Ticket Peso" width={150} height={150} className="rounded-lg" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Staff y Coaches */}
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Award size={24} className="text-yellow-400" />
              Coaches y Staff
            </h2>
            
            <div className="mb-4">
              <label className="flex items-center gap-2 text-slate-300">
                <input
                  type="checkbox"
                  checked={config.quiereSerStaff}
                  onChange={(e) => setConfig({...config, quiereSerStaff: e.target.checked})}
                  className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500"
                />
                <span className="font-medium">¿Quiero ser Staff?</span>
              </label>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Coach de Básico</label>
                <input
                  type="text"
                  value={config.coachBasico}
                  onChange={(e) => setConfig({...config, coachBasico: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-yellow-500 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Staff de Básico</label>
                <input
                  type="text"
                  value={config.staffBasico}
                  onChange={(e) => setConfig({...config, staffBasico: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-yellow-500 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Coach de Avanzado</label>
                <input
                  type="text"
                  value={config.coachAvanzado}
                  onChange={(e) => setConfig({...config, coachAvanzado: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-yellow-500 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Staff de Avanzado</label>
                <input
                  type="text"
                  value={config.staffAvanzado}
                  onChange={(e) => setConfig({...config, staffAvanzado: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-yellow-500 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Game Changer (Asignado)</label>
                <input
                  type="text"
                  value={config.gameChangerNombre}
                  disabled
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 cursor-not-allowed"
                  placeholder="Asignado automáticamente"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Coach de 1er Fin</label>
                <input
                  type="text"
                  value={config.coachPrimerFin}
                  onChange={(e) => setConfig({...config, coachPrimerFin: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-yellow-500 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Coach de 2do Fin</label>
                <input
                  type="text"
                  value={config.coachSegundoFin}
                  onChange={(e) => setConfig({...config, coachSegundoFin: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-yellow-500 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Coach de 3er Fin</label>
                <input
                  type="text"
                  value={config.coachTercerFin}
                  onChange={(e) => setConfig({...config, coachTercerFin: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-yellow-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Fotos y Documentos */}
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Camera size={24} className="text-pink-400" />
              Fotos y Documentos
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Foto de Primer Día (JPG)</label>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg"
                  onChange={(e) => e.target.files?.[0] && handleImageUpload('fotoPrimerDia', e.target.files[0])}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:border-pink-500 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-pink-500 file:text-black file:font-medium hover:file:bg-pink-600"
                />
                {config.fotoPrimerDia && (
                  <div className="mt-2">
                    <Image src={config.fotoPrimerDia} alt="Primer Día" width={200} height={200} className="rounded-lg object-cover" />
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Foto de Último Día de PL (JPG)</label>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg"
                  onChange={(e) => e.target.files?.[0] && handleImageUpload('fotoUltimoDiaPL', e.target.files[0])}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:border-pink-500 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-pink-500 file:text-black file:font-medium hover:file:bg-pink-600"
                />
                {config.fotoUltimoDiaPL && (
                  <div className="mt-2">
                    <Image src={config.fotoUltimoDiaPL} alt="Último Día PL" width={200} height={200} className="rounded-lg object-cover" />
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Foto de Contrato (JPG)</label>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg"
                  onChange={(e) => e.target.files?.[0] && handleImageUpload('fotoContrato', e.target.files[0])}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:border-pink-500 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-pink-500 file:text-black file:font-medium hover:file:bg-pink-600"
                />
                {config.fotoContrato && (
                  <div className="mt-2">
                    <Image src={config.fotoContrato} alt="Contrato" width={200} height={200} className="rounded-lg object-cover" />
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Contrato Avanzado (PDF/Imagen)</label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => e.target.files?.[0] && handleImageUpload('contratoAvanzado', e.target.files[0])}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:border-pink-500 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-pink-500 file:text-black file:font-medium hover:file:bg-pink-600"
                />
              </div>
            </div>
          </div>

          {/* Condecoraciones */}
          <div className="bg-gradient-to-br from-yellow-900/20 to-slate-900/50 border border-yellow-700/30 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Award size={24} className="text-yellow-400" />
              Condecoraciones
              <span className="text-sm text-slate-400 font-normal ml-2">(Asignadas por el coordinador)</span>
            </h2>
            
            <CondecoracionesGrid condecoraciones={config.condecoraciones} />
          </div>

        </div>

        {/* Save Button (Bottom) */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-4 bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-600 text-black font-bold text-lg rounded-xl transition-all flex items-center gap-3 shadow-lg shadow-cyan-500/20"
          >
            <Save size={24} />
            {saving ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>

      </div>
    </div>
  );
}
