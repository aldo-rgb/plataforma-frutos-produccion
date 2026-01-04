'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Users, DollarSign, TrendingUp, Package, Calendar, CheckCircle } from 'lucide-react';

interface MentorPackage {
  client: string;
  package: string;
  visionId: number;
  visionName: string;
  progress: {
    used: number;
    total: number;
  };
  purchaseDate: string;
  totalValue: number;
  status: string;
}

interface MentorData {
  mentor: {
    id: number;
    name: string;
    email: string;
    avatar: string | null;
    available: boolean;
    acceptingClients: boolean;
    rating: number;
  };
  summary: {
    activeStudents: number;
    monthlySales: number;
    retentionRate: number;
    totalPackages: number;
  };
  packages: MentorPackage[];
}

interface PackagesData {
  mentors: MentorData[];
  totalMentors: number;
}

export default function PackagesAndMentors() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PackagesData | null>(null);
  const [expandedMentors, setExpandedMentors] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchPackagesData();
  }, []);

  const fetchPackagesData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/reports/packages');
      
      if (!response.ok) {
        throw new Error('Error al cargar datos de paquetes');
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error fetching packages:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleMentor = (mentorId: number) => {
    const newExpanded = new Set(expandedMentors);
    if (newExpanded.has(mentorId)) {
      newExpanded.delete(mentorId);
    } else {
      newExpanded.add(mentorId);
    }
    setExpandedMentors(newExpanded);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getProgressPercentage = (used: number, total: number) => {
    if (total === 0) return 0;
    return (used / total) * 100;
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-red-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-slate-800 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">📦 Paquetes y Mentores</h1>
          <p className="text-slate-400">Auditoría de Ventas por Mentor - Quién Contrató Qué</p>
        </div>

        {/* Summary Stats */}
        {data && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl p-6 shadow-lg">
              <div className="text-white/80 text-sm mb-2">Total de Mentores</div>
              <div className="text-3xl font-bold text-white">{data.totalMentors}</div>
            </div>
            <div className="bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl p-6 shadow-lg">
              <div className="text-white/80 text-sm mb-2">Alumnos Activos (Total)</div>
              <div className="text-3xl font-bold text-white">
                {data.mentors.reduce((sum, m) => sum + m.summary.activeStudents, 0)}
              </div>
            </div>
            <div className="bg-gradient-to-br from-emerald-600 to-green-600 rounded-xl p-6 shadow-lg">
              <div className="text-white/80 text-sm mb-2">Ventas del Mes</div>
              <div className="text-3xl font-bold text-white">
                {formatCurrency(data.mentors.reduce((sum, m) => sum + m.summary.monthlySales, 0))}
              </div>
            </div>
          </div>
        )}

        {/* Mentors Accordion */}
        <div className="space-y-4">
          {data?.mentors.map((mentorData) => (
            <div
              key={mentorData.mentor.id}
              className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 overflow-hidden"
            >
              {/* Mentor Header (Clickable) */}
              <button
                onClick={() => toggleMentor(mentorData.mentor.id)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-900/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  {mentorData.mentor.avatar ? (
                    <img
                      src={mentorData.mentor.avatar}
                      alt={mentorData.mentor.name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-purple-500"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white text-2xl font-bold">
                      {mentorData.mentor.name.charAt(0)}
                    </div>
                  )}

                  {/* Mentor Info */}
                  <div className="text-left">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold text-white">{mentorData.mentor.name}</h3>
                      {mentorData.mentor.available && (
                        <span className="px-2 py-1 bg-green-900/30 border border-green-500 rounded-full text-xs text-green-400">
                          Disponible
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-400">{mentorData.mentor.email}</p>
                  </div>
                </div>

                {/* Summary Stats */}
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                      <Users size={14} />
                      Alumnos
                    </div>
                    <div className="text-2xl font-bold text-white">{mentorData.summary.activeStudents}</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                      <DollarSign size={14} />
                      Ventas/Mes
                    </div>
                    <div className="text-2xl font-bold text-emerald-400">
                      {formatCurrency(mentorData.summary.monthlySales)}
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                      <TrendingUp size={14} />
                      Retención
                    </div>
                    <div className="text-2xl font-bold text-blue-400">
                      {mentorData.summary.retentionRate}%
                    </div>
                  </div>

                  {/* Expand Icon */}
                  {expandedMentors.has(mentorData.mentor.id) ? (
                    <ChevronUp className="text-slate-400" size={24} />
                  ) : (
                    <ChevronDown className="text-slate-400" size={24} />
                  )}
                </div>
              </button>

              {/* Expanded Content - Packages Table */}
              {expandedMentors.has(mentorData.mentor.id) && (
                <div className="border-t border-slate-700 bg-slate-900/30">
                  {mentorData.packages.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-slate-900/50 border-b border-slate-700">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Cliente</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Paquete</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Progreso</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Fecha Compra</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Valor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                          {mentorData.packages.map((pkg, idx) => {
                            const percentage = getProgressPercentage(pkg.progress.used, pkg.progress.total);
                            const progressColor = getProgressColor(percentage);

                            return (
                              <tr key={idx} className="hover:bg-slate-900/20 transition-colors">
                                <td className="px-6 py-4">
                                  <div>
                                    <div className="text-white font-medium">{pkg.client}</div>
                                    <div className="text-xs text-slate-400">{pkg.visionName}</div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-purple-900/30 border border-purple-500 text-purple-400">
                                    <Package size={14} />
                                    {pkg.package}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                      <span className="text-slate-300">
                                        {pkg.progress.used} / {pkg.progress.total} Llamadas
                                      </span>
                                      <span className="text-slate-400">{percentage.toFixed(0)}%</span>
                                    </div>
                                    <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full ${progressColor} transition-all duration-300`}
                                        style={{ width: `${percentage}%` }}
                                      />
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-2 text-slate-300">
                                    <Calendar size={14} className="text-slate-500" />
                                    {formatDate(pkg.purchaseDate)}
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="text-lg font-bold text-emerald-400">
                                    {formatCurrency(pkg.totalValue)}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="px-6 py-8 text-center">
                      <Package className="mx-auto text-slate-600 mb-3" size={48} />
                      <p className="text-slate-400">Este mentor aún no tiene paquetes contratados</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Empty State */}
        {data?.mentors.length === 0 && (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-12 text-center">
            <Users className="mx-auto text-slate-600 mb-4" size={64} />
            <h3 className="text-xl font-bold text-white mb-2">No hay mentores registrados</h3>
            <p className="text-slate-400">Los mentores aparecerán aquí cuando se registren en el sistema</p>
          </div>
        )}
      </div>
    </div>
  );
}
