'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Users, Star, Search, Phone, Mail, MapPin, Shirt, 
  Briefcase, Calendar, ArrowLeft, Loader2, UserCheck, GraduationCap
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface Prospecto {
  id: number;
  nombre: string;
  email: string;
  telefono: string | null;
  profileImage: string | null;
  rol: string;
  tallaCamiseta: string | null;
  ciudad: string | null;
  estado: string | null;
  ocupacion: string | null;
  fechaRegistro: string;
  fechaSolicitud: string;
  // Nuevos campos de interés en Staff
  staffBasico?: boolean;
  staffAvanzado?: boolean;
  staffLiderato?: boolean;
  staffServicio?: boolean;
  productName?: string;
  visionName?: string;
}

export default function ProspectosStaffPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [prospectos, setProspectos] = useState<Prospecto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProspectos, setFilteredProspectos] = useState<Prospecto[]>([]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    fetchProspectos();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = prospectos.filter(p => 
        p.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.ciudad?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProspectos(filtered);
    } else {
      setFilteredProspectos(prospectos);
    }
  }, [searchTerm, prospectos]);

  const fetchProspectos = async () => {
    try {
      // Intentar primero con el nuevo API de encuestas de participantes
      const resSurvey = await fetch('/api/school-admin/prospectos-staff');
      const dataSurvey = await resSurvey.json();
      
      if (resSurvey.ok && dataSurvey.success && dataSurvey.prospectos.length > 0) {
        // Usar los prospectos de las encuestas de PL
        const prospectosFromSurvey = dataSurvey.prospectos.map((p: any) => ({
          id: p.usuario.id,
          nombre: p.usuario.nombre,
          email: p.usuario.email,
          telefono: p.usuario.telefono || null,
          profileImage: p.usuario.imagen || null,
          rol: 'PARTICIPANTE_PL',
          tallaCamiseta: null,
          ciudad: null,
          estado: null,
          ocupacion: null,
          fechaRegistro: p.createdAt || new Date().toISOString(),
          fechaSolicitud: p.createdAt || new Date().toISOString(),
          staffBasico: p.intereses?.basico,
          staffAvanzado: p.intereses?.avanzado,
          staffLiderato: p.intereses?.liderato,
          staffServicio: p.intereses?.servicio,
          productName: p.producto?.nombre,
          visionName: p.producto?.vision,
        }));
        setProspectos(prospectosFromSurvey);
        setFilteredProspectos(prospectosFromSurvey);
      } else {
        // Fallback al API antiguo
        const res = await fetch('/api/coordinador/prospectos-staff');
        const data = await res.json();
        
        if (res.ok && data.success) {
          setProspectos(data.prospectos);
          setFilteredProspectos(data.prospectos);
        }
      }
    } catch (error) {
      console.error('Error fetching prospectos:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link 
            href="/dashboard" 
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft size={20} />
            <span>Volver al Dashboard</span>
          </Link>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-xl flex items-center justify-center">
                  <Star className="w-6 h-6 text-white" />
                </div>
                Prospectos de Staff
              </h1>
              <p className="text-slate-400 mt-2">
                Participantes interesados en formar parte del equipo de Staff
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-xl px-4 py-2">
                <span className="text-emerald-400 font-bold text-xl">{prospectos.length}</span>
                <span className="text-emerald-300/80 ml-2 text-sm">prospectos</span>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
            <input
              type="text"
              placeholder="Buscar por nombre, email o ciudad..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Lista de Prospectos */}
        {filteredProspectos.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center">
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-10 h-10 text-slate-600" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              {searchTerm ? 'No se encontraron resultados' : 'No hay prospectos aún'}
            </h3>
            <p className="text-slate-400">
              {searchTerm 
                ? 'Intenta con otro término de búsqueda' 
                : 'Los participantes que activen la opción "Quiero ser Staff" aparecerán aquí'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProspectos.map((prospecto) => (
              <div 
                key={prospecto.id}
                className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700 hover:border-emerald-500/50 rounded-2xl p-5 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10"
              >
                {/* Header del card */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="relative">
                    {prospecto.profileImage ? (
                      <Image
                        src={prospecto.profileImage}
                        alt={prospecto.nombre}
                        width={56}
                        height={56}
                        className="w-14 h-14 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-xl flex items-center justify-center">
                        <span className="text-white font-bold text-xl">
                          {prospecto.nombre?.charAt(0)?.toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-slate-900">
                      <UserCheck size={10} className="text-white" />
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">{prospecto.nombre}</h3>
                    <p className="text-sm text-slate-400 truncate">{prospecto.email}</p>
                  </div>
                </div>
                
                {/* Info */}
                <div className="space-y-2 text-sm">
                  {/* Staff Interest Badges */}
                  {(prospecto.staffBasico || prospecto.staffAvanzado || prospecto.staffLiderato || prospecto.staffServicio) && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {prospecto.staffBasico && (
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full border border-blue-500/30">
                          Básico
                        </span>
                      )}
                      {prospecto.staffAvanzado && (
                        <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs rounded-full border border-orange-500/30">
                          Avanzado
                        </span>
                      )}
                      {prospecto.staffLiderato && (
                        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full border border-purple-500/30">
                          Liderato
                        </span>
                      )}
                      {prospecto.staffServicio && (
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full border border-emerald-500/30">
                          Servicio
                        </span>
                      )}
                    </div>
                  )}
                  
                  {/* Product/Vision info */}
                  {prospecto.productName && (
                    <div className="flex items-center gap-2 text-slate-300">
                      <GraduationCap size={14} className="text-slate-500" />
                      <span className="truncate">{prospecto.productName} {prospecto.visionName ? `• ${prospecto.visionName}` : ''}</span>
                    </div>
                  )}
                  
                  {prospecto.telefono && (
                    <div className="flex items-center gap-2 text-slate-300">
                      <Phone size={14} className="text-slate-500" />
                      <a href={`tel:${prospecto.telefono}`} className="hover:text-cyan-400 transition-colors">
                        {prospecto.telefono}
                      </a>
                    </div>
                  )}
                  
                  {(prospecto.ciudad || prospecto.estado) && (
                    <div className="flex items-center gap-2 text-slate-300">
                      <MapPin size={14} className="text-slate-500" />
                      <span>{[prospecto.ciudad, prospecto.estado].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                  
                  {prospecto.tallaCamiseta && (
                    <div className="flex items-center gap-2 text-slate-300">
                      <Shirt size={14} className="text-slate-500" />
                      <span>Talla: <span className="font-medium text-white">{prospecto.tallaCamiseta}</span></span>
                    </div>
                  )}
                  
                  {prospecto.ocupacion && (
                    <div className="flex items-center gap-2 text-slate-300">
                      <Briefcase size={14} className="text-slate-500" />
                      <span className="truncate">{prospecto.ocupacion}</span>
                    </div>
                  )}
                </div>
                
                {/* Footer */}
                <div className="mt-4 pt-4 border-t border-slate-700/50 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Calendar size={12} />
                    <span>Solicitó: {formatDate(prospecto.fechaSolicitud)}</span>
                  </div>
                  
                  <a
                    href={`https://wa.me/${prospecto.telefono?.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-xs font-medium transition-colors"
                  >
                    Contactar
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
