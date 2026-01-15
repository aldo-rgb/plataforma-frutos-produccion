'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  UserX,
  Users,
  Loader2,
  Search,
  Filter,
  Ticket,
  Calendar,
  Mail,
  Phone,
  ChevronDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  GraduationCap
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface EnrollmentData {
  id: number;
  level: string;
  attendanceStatus: string;
  updatedAt: string;
  usuario: {
    id: number;
    nombre: string;
    email: string;
    telefono?: string;
    imagen?: string;
  };
  vision: {
    id: number;
    nombre: string;
    startDate?: string;
    endDate?: string;
  };
  courtesyTicket: {
    id: string;
    status: string;
    targetVision: string;
    targetStartDate?: string;
    validUntil?: string;
  } | null;
}

interface Stats {
  byType: { BACKLOG: number; DROP: number };
  byLevel: { BASIC: number; ADVANCED: number; PL: number };
  withTicket: number;
  withoutTicket: number;
}

export default function BacklogsDropsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [enrollments, setEnrollments] = useState<EnrollmentData[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'BACKLOG' | 'DROP'>('ALL');
  const [filterLevel, setFilterLevel] = useState<'ALL' | 'BASIC' | 'ADVANCED' | 'PL'>('ALL');
  const [showFilters, setShowFilters] = useState(false);

  // Roles permitidos
  const allowedRoles = [
    'COORDINADOR',
    'COORDINATOR_BASIC',
    'COORDINATOR_ADVANCED',
    'TRAINER',
    'ADMINISTRADOR',
    'SCHOOL_ADMIN'
  ];

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (session?.user?.rol && !allowedRoles.includes(session.user.rol)) {
      router.push('/dashboard');
    } else if (status === 'authenticated') {
      fetchData();
    }
  }, [status, session, filterType, filterLevel]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType !== 'ALL') params.set('type', filterType);
      if (filterLevel !== 'ALL') params.set('level', filterLevel);
      
      const res = await fetch(`/api/coordinador/backlogs-drops?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setEnrollments(data.enrollments);
          setStats(data.stats);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar por búsqueda
  const filteredEnrollments = enrollments.filter(e => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      e.usuario.nombre.toLowerCase().includes(search) ||
      e.usuario.email.toLowerCase().includes(search) ||
      e.vision.nombre.toLowerCase().includes(search)
    );
  });

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-orange-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Cargando datos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/dashboard" 
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al Dashboard</span>
          </Link>
          
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-500/20 rounded-xl">
              <UserX className="w-8 h-8 text-orange-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Backlogs y Drops</h1>
              <p className="text-slate-400">Gestión de participantes con reposición pendiente</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-amber-900/30 border border-amber-500/30 rounded-xl p-4">
              <div className="text-3xl font-bold text-amber-400">{stats.byType.BACKLOG}</div>
              <div className="text-sm text-slate-400">Backlogs</div>
            </div>
            <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-4">
              <div className="text-3xl font-bold text-red-400">{stats.byType.DROP}</div>
              <div className="text-sm text-slate-400">Drops</div>
            </div>
            <div className="bg-emerald-900/30 border border-emerald-500/30 rounded-xl p-4">
              <div className="text-3xl font-bold text-emerald-400">{stats.withTicket}</div>
              <div className="text-sm text-slate-400">Con Ticket</div>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <div className="text-3xl font-bold text-slate-300">{stats.withoutTicket}</div>
              <div className="text-sm text-slate-400">Sin Ticket</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-slate-800/50 rounded-xl p-4 mb-6 border border-slate-700">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, email o visión..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none"
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 rounded-lg text-slate-300 hover:bg-slate-600 transition-colors"
            >
              <Filter className="w-5 h-5" />
              <span>Filtros</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-slate-700 grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Type Filter */}
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Tipo</label>
                <div className="flex flex-wrap gap-2">
                  {(['ALL', 'BACKLOG', 'DROP'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setFilterType(type)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        filterType === type
                          ? type === 'BACKLOG' 
                            ? 'bg-amber-500 text-white'
                            : type === 'DROP'
                            ? 'bg-red-500 text-white'
                            : 'bg-orange-500 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {type === 'ALL' ? 'Todos' : type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Level Filter */}
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Nivel</label>
                <div className="flex flex-wrap gap-2">
                  {(['ALL', 'BASIC', 'ADVANCED', 'PL'] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => setFilterLevel(level)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        filterLevel === level
                          ? 'bg-cyan-500 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {level === 'ALL' ? 'Todos' : level}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="mb-4 text-slate-400">
          Mostrando {filteredEnrollments.length} de {enrollments.length} registros
        </div>

        {/* Enrollments List */}
        <div className="space-y-4">
          {filteredEnrollments.length === 0 ? (
            <div className="bg-slate-800/50 rounded-xl p-12 text-center border border-slate-700">
              <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-300 mb-2">No hay registros</h3>
              <p className="text-slate-500">
                {searchTerm 
                  ? 'No se encontraron resultados para tu búsqueda'
                  : 'No hay participantes con BACKLOG o DROP en esta organización'}
              </p>
            </div>
          ) : (
            filteredEnrollments.map((enrollment) => (
              <div
                key={enrollment.id}
                className={`bg-slate-800/50 rounded-xl p-5 border-2 transition-all hover:scale-[1.01] ${
                  enrollment.attendanceStatus === 'BACKLOG'
                    ? 'border-amber-500/30 hover:border-amber-500/50'
                    : 'border-red-500/30 hover:border-red-500/50'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  {/* User Info */}
                  <div className="flex items-center gap-4 flex-1">
                    <div className="relative">
                      {enrollment.usuario.imagen ? (
                        <Image
                          src={enrollment.usuario.imagen}
                          alt={enrollment.usuario.nombre}
                          width={56}
                          height={56}
                          className="rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-14 h-14 bg-slate-700 rounded-full flex items-center justify-center">
                          <span className="text-xl font-bold text-slate-400">
                            {enrollment.usuario.nombre.charAt(0)}
                          </span>
                        </div>
                      )}
                      {/* Status Badge */}
                      <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center ${
                        enrollment.attendanceStatus === 'BACKLOG' 
                          ? 'bg-amber-500' 
                          : 'bg-red-500'
                      }`}>
                        {enrollment.attendanceStatus === 'BACKLOG' ? (
                          <Clock className="w-3.5 h-3.5 text-white" />
                        ) : (
                          <UserX className="w-3.5 h-3.5 text-white" />
                        )}
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white">
                        {enrollment.usuario.nombre}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
                        <span className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          {enrollment.usuario.email}
                        </span>
                        {enrollment.usuario.telefono && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            {enrollment.usuario.telefono}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Vision & Level Info */}
                  <div className="flex flex-col md:items-end gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        enrollment.attendanceStatus === 'BACKLOG'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
                          : 'bg-red-500/20 text-red-400 border border-red-500/50'
                      }`}>
                        {enrollment.attendanceStatus}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        enrollment.level === 'BASIC'
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                          : enrollment.level === 'ADVANCED'
                          ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                      }`}>
                        {enrollment.level}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <GraduationCap className="w-4 h-4" />
                      <span>{enrollment.vision.nombre}</span>
                    </div>
                    <div className="text-xs text-slate-500">
                      {formatDate(enrollment.vision.startDate)} - {formatDate(enrollment.vision.endDate)}
                    </div>
                  </div>
                </div>

                {/* Ticket Info */}
                {enrollment.level === 'BASIC' && (
                  <div className={`mt-4 pt-4 border-t ${
                    enrollment.attendanceStatus === 'BACKLOG'
                      ? 'border-amber-500/20'
                      : 'border-red-500/20'
                  }`}>
                    {enrollment.courtesyTicket ? (
                      <div className="flex items-center gap-3 text-sm">
                        <div className="flex items-center gap-2 text-emerald-400">
                          <Ticket className="w-4 h-4" />
                          <span className="font-medium">Ticket de cortesía generado</span>
                        </div>
                        <span className="text-slate-500">→</span>
                        <span className="text-slate-300">
                          {enrollment.courtesyTicket.targetVision}
                        </span>
                        {enrollment.courtesyTicket.targetStartDate && (
                          <span className="text-slate-500">
                            (Inicia: {formatDate(enrollment.courtesyTicket.targetStartDate)})
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          enrollment.courtesyTicket.status === 'ACTIVE'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {enrollment.courtesyTicket.status}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-amber-400 text-sm">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Sin ticket de cortesía (ya usó su oportunidad o error en generación)</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
