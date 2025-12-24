'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  Users,
  UserPlus,
  Trash2,
  CreditCard,
  Loader2,
  Search,
  CheckCircle,
  XCircle,
  Package,
  AlertCircle,
  Edit,
  Key,
  Copy,
  Download
} from 'lucide-react';
import Link from 'next/link';

interface Vision {
  id: number;
  nombre: string;
  descripcion: string | null;
  maxParticipantes: number | null;
  licensesAllocated: number;
  organizationId: number;
  _count: {
    Participantes: number;
  };
}

interface Participante {
  id: number;
  participanteId: number;
  Participante: {
    id: number;
    nombre: string;
    email: string;
    tier: string;
    licenseCode: string | null;
  };
  createdAt: string;
}

interface AvailableUser {
  id: number;
  nombre: string;
  email: string;
  tier: string;
}

export default function VisionDetailPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const visionId = params.id as string;

  const [vision, setVision] = useState<Vision | null>(null);
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [availableCredits, setAvailableCredits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AvailableUser | null>(null);
  const [selectedParticipante, setSelectedParticipante] = useState<Participante | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (session?.user?.rol === 'SCHOOL_ADMIN') {
      fetchVisionDetails();
      fetchAvailableUsers();
      fetchCredits();
    }
  }, [session, visionId]);

  const fetchVisionDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/school-admin/visiones/${visionId}`);
      const data = await res.json();

      if (data.success) {
        setVision(data.vision);
        setParticipantes(data.participantes);
      }
    } catch (error) {
      console.error('Error fetching vision:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      const res = await fetch('/api/school-admin/users/available');
      const data = await res.json();
      if (data.success) {
        setAvailableUsers(data.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchCredits = async () => {
    try {
      const res = await fetch('/api/school-admin/dashboard');
      const data = await res.json();
      if (data.success) {
        setAvailableCredits(data.stats.availableCredits || 0);
      }
    } catch (error) {
      console.error('Error fetching credits:', error);
    }
  };

  const handleAddParticipante = async () => {
    if (!selectedUser) return;

    try {
      setProcessing(true);
      const res = await fetch(`/api/school-admin/visiones/${visionId}/add-participante`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participanteId: selectedUser.id }),
      });

      const data = await res.json();

      if (data.success) {
        setShowAddModal(false);
        setSelectedUser(null);
        fetchVisionDetails();
        fetchAvailableUsers();
      } else {
        alert(data.error || 'Error al agregar participante');
      }
    } catch (error) {
      console.error('Error adding participante:', error);
      alert('Error al agregar participante');
    } finally {
      setProcessing(false);
    }
  };

  const handleAssignLicense = async () => {
    if (!selectedParticipante) return;

    if (availableCredits < 1) {
      alert('No tienes licencias disponibles. Compra más licencias primero.');
      return;
    }

    try {
      setProcessing(true);
      const res = await fetch(`/api/school-admin/visiones/${visionId}/assign-license`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          participanteId: selectedParticipante.participanteId 
        }),
      });

      const data = await res.json();

      if (data.success) {
        setShowAssignModal(false);
        setSelectedParticipante(null);
        fetchVisionDetails();
        fetchCredits();
        // Mostrar el código generado
        alert(`✅ Licencia asignada exitosamente!\n\nCódigo: ${data.licenseCode}\n\nEl usuario ahora tiene acceso a la plataforma.`);
      } else {
        alert(data.error || 'Error al asignar licencia');
      }
    } catch (error) {
      console.error('Error assigning license:', error);
      alert('Error al asignar licencia');
    } finally {
      setProcessing(false);
    }
  };

  const handleRemoveParticipante = async (participanteRelationId: number) => {
    if (!confirm('¿Estás seguro de eliminar este participante?')) return;

    try {
      const res = await fetch(`/api/school-admin/visiones/${visionId}/remove-participante`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participanteRelationId }),
      });

      const data = await res.json();

      if (data.success) {
        fetchVisionDetails();
        fetchAvailableUsers();
      } else {
        alert(data.error || 'Error al eliminar participante');
      }
    } catch (error) {
      console.error('Error removing participante:', error);
      alert('Error al eliminar participante');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Código copiado al portapapeles');
  };

  const filteredUsers = availableUsers.filter(
    (user) =>
      user.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const participantesWithLicense = participantes.filter(p => p.Participante.licenseCode);
  const participantesWithoutLicense = participantes.filter(p => !p.Participante.licenseCode);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  if (!vision) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <p className="text-white text-xl">Visión no encontrada</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/school-admin/visiones"
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="text-slate-400" size={24} />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{vision.nombre}</h1>
              {vision.descripcion && (
                <p className="text-slate-400">{vision.descripcion}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
          >
            <UserPlus size={20} />
            Agregar Participante
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-900/50 backdrop-blur border border-purple-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="text-purple-400" size={24} />
              <span className="text-3xl font-bold text-purple-400">
                {vision._count.Participantes}
              </span>
            </div>
            <p className="text-slate-400 text-sm">Participantes Totales</p>
            {vision.maxParticipantes && (
              <p className="text-xs text-slate-500 mt-1">
                Límite: {vision.maxParticipantes}
              </p>
            )}
          </div>

          <div className="bg-slate-900/50 backdrop-blur border border-emerald-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="text-emerald-400" size={24} />
              <span className="text-3xl font-bold text-emerald-400">
                {participantesWithLicense.length}
              </span>
            </div>
            <p className="text-slate-400 text-sm">Con Licencia</p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur border border-red-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <XCircle className="text-red-400" size={24} />
              <span className="text-3xl font-bold text-red-400">
                {participantesWithoutLicense.length}
              </span>
            </div>
            <p className="text-slate-400 text-sm">Sin Licencia</p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur border border-cyan-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <CreditCard className="text-cyan-400" size={24} />
              <span className="text-3xl font-bold text-cyan-400">
                {availableCredits}
              </span>
            </div>
            <p className="text-slate-400 text-sm">Licencias Disponibles</p>
          </div>
        </div>

        {/* Participantes List */}
        <div className="bg-slate-900/50 backdrop-blur border border-slate-700 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-slate-700">
            <h2 className="text-xl font-bold text-white">Participantes</h2>
          </div>

          {participantes.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-lg mb-2">No hay participantes</p>
              <p className="text-slate-500 text-sm mb-6">
                Agrega participantes a esta visión para gestionar sus licencias
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
              >
                <UserPlus size={20} />
                Agregar Primer Participante
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800/50 border-b border-slate-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">
                      Participante
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase">
                      Tier
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase">
                      Estado Licencia
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase">
                      Código
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {participantes.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-white">{p.Participante.nombre}</p>
                          <p className="text-xs text-slate-500">{p.Participante.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          p.Participante.tier === 'PREMIUM'
                            ? 'bg-purple-900/20 text-purple-400 border border-purple-600'
                            : 'bg-cyan-900/20 text-cyan-400 border border-cyan-600'
                        }`}>
                          {p.Participante.tier || 'FREE'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {p.Participante.licenseCode ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-900/20 text-green-400 border border-green-600 rounded-full text-xs font-medium">
                            <CheckCircle size={14} />
                            Activa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-900/20 text-red-400 border border-red-600 rounded-full text-xs font-medium">
                            <XCircle size={14} />
                            Sin licencia
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {p.Participante.licenseCode ? (
                          <div className="flex items-center justify-center gap-2">
                            <code className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-300 font-mono">
                              {p.Participante.licenseCode}
                            </code>
                            <button
                              onClick={() => copyToClipboard(p.Participante.licenseCode!)}
                              className="p-1 hover:bg-slate-700 rounded transition-colors"
                              title="Copiar código"
                            >
                              <Copy size={14} className="text-slate-400" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {!p.Participante.licenseCode && (
                            <button
                              onClick={() => {
                                setSelectedParticipante(p);
                                setShowAssignModal(true);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors"
                            >
                              <Key size={14} />
                              Asignar Licencia
                            </button>
                          )}
                          <button
                            onClick={() => handleRemoveParticipante(p.id)}
                            className="p-2 hover:bg-red-600/20 text-red-400 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Participante Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-white mb-4">
              Agregar Participante
            </h2>

            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Buscar por nombre o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="space-y-2 mb-6 max-h-96 overflow-y-auto">
              {filteredUsers.length === 0 ? (
                <p className="text-slate-400 text-center py-8">
                  No hay usuarios disponibles
                </p>
              ) : (
                filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                      selectedUser?.id === user.id
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <p className="font-semibold text-white">{user.nombre}</p>
                    <p className="text-sm text-slate-400">{user.email}</p>
                    <span className={`inline-block mt-2 px-2 py-1 rounded text-xs ${
                      user.tier === 'PREMIUM'
                        ? 'bg-purple-900/20 text-purple-400'
                        : 'bg-cyan-900/20 text-cyan-400'
                    }`}>
                      {user.tier || 'FREE'}
                    </span>
                  </button>
                ))
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedUser(null);
                  setSearchTerm('');
                }}
                className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddParticipante}
                disabled={!selectedUser || processing}
                className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
              >
                {processing ? 'Agregando...' : 'Agregar Participante'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign License Modal */}
      {showAssignModal && selectedParticipante && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold text-white mb-4">
              Asignar Licencia
            </h2>

            <div className="bg-slate-800 rounded-lg p-4 mb-6">
              <p className="text-sm text-slate-400 mb-2">Participante:</p>
              <p className="font-semibold text-white">{selectedParticipante.Participante.nombre}</p>
              <p className="text-sm text-slate-400">{selectedParticipante.Participante.email}</p>
            </div>

            <div className="bg-cyan-900/20 border border-cyan-600 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Licencias disponibles:</span>
                <span className="text-2xl font-bold text-cyan-400">{availableCredits}</span>
              </div>
            </div>

            {availableCredits < 1 && (
              <div className="bg-red-900/20 border border-red-600 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 text-red-400">
                  <AlertCircle size={20} />
                  <p className="text-sm">
                    No tienes licencias disponibles. Compra más licencias primero.
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedParticipante(null);
                }}
                className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAssignLicense}
                disabled={availableCredits < 1 || processing}
                className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
              >
                {processing ? 'Asignando...' : 'Asignar Licencia'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
