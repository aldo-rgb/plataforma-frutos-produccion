'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useToast, ToastContainer } from '@/components/Toast';
import {
  ArrowLeft,
  Users,
  UserPlus,
  Trash2,
  CreditCard,
  Loader2,
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
  Coordinador?: {
    id: number;
    nombre: string;
    email: string;
  };
  _count: {
    Participantes: number;
    GameChangers: number;
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
    assignedMentorId: number | null;
    Usuario_Usuario_assignedMentorIdToUsuario: {
      id: number;
      nombre: string;
      email: string;
      imagen: string | null;
    } | null;
  };
  createdAt: string;
}

interface GameChanger {
  id: number;
  gameChangerId: number;
  GameChanger: {
    id: number;
    nombre: string;
    email: string;
    tier: string;
    licenseCode: string | null;
    assignedMentorId: number | null;
    Usuario_Usuario_assignedMentorIdToUsuario: {
      id: number;
      nombre: string;
      email: string;
      imagen: string | null;
    } | null;
  };
  createdAt: string;
}

interface Mentor {
  id: number;
  nombre: string;
  email: string;
  imagen: string | null;
  isActive: boolean;
  tieneHorarios: boolean;
  perfilMentor?: any;
}

interface MentorAsignado {
  id: number;
  mentorId: number;
  mentor: Mentor;
  tieneHorarios: boolean;
  createdAt: string;
}

export default function VisionDetailPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const visionId = params.id as string;

  const [vision, setVision] = useState<Vision | null>(null);
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [gameChangers, setGameChangers] = useState<GameChanger[]>([]);
  const [mentoresAsignados, setMentoresAsignados] = useState<MentorAsignado[]>([]);
  const [mentoresDisponibles, setMentoresDisponibles] = useState<Mentor[]>([]);
  const [showAddMentorModal, setShowAddMentorModal] = useState(false);
  const [availableCredits, setAvailableCredits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedParticipante, setSelectedParticipante] = useState<Participante | null>(null);
  const [selectedGameChanger, setSelectedGameChanger] = useState<GameChanger | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [teamEmailInput, setTeamEmailInput] = useState('');
  const [emailProcessing, setEmailProcessing] = useState(false);
  const [teamEmailProcessing, setTeamEmailProcessing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const { showToast, toasts } = useToast();

  useEffect(() => {
    if (session?.user?.rol === 'SCHOOL_ADMIN') {
      fetchVisionDetails();
      fetchCredits();
      fetchMentores();
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
        setGameChangers(data.gameChangers || []);
      }
    } catch (error) {
      console.error('Error fetching vision:', error);
    } finally {
      setLoading(false);
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

  const fetchMentores = async () => {
    try {
      const res = await fetch(`/api/school-admin/visiones/${visionId}/mentores`);
      const data = await res.json();
      
      if (res.ok) {
        setMentoresAsignados(data.mentoresAsignados || []);
        setMentoresDisponibles(data.mentoresDisponibles || []);
      }
    } catch (error) {
      console.error('Error fetching mentores:', error);
    }
  };

  const handleAsignarMentor = async (mentorId: number) => {
    try {
      setProcessing(true);
      const res = await fetch(`/api/school-admin/visiones/${visionId}/mentores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          mentorId,
          asignadoPorId: session?.user?.id
        }),
      });

      const data = await res.json();

      if (data.success) {
        setShowAddMentorModal(false);
        fetchMentores();
        showToast({
          message: 'Mentor asignado exitosamente',
          type: 'success'
        });
      } else {
        showToast({
          message: data.error || 'Error al asignar mentor',
          type: data.requiresConfig ? 'warning' : 'error',
          duration: data.requiresConfig ? 6000 : 4000
        });
      }
    } catch (error) {
      console.error('Error assigning mentor:', error);
      showToast({
        message: 'Error al asignar mentor',
        type: 'error'
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleRemoverMentor = async (mentorId: number) => {
    if (!confirm('¿Estás seguro de remover este mentor de la visión?')) return;

    try {
      const res = await fetch(`/api/school-admin/visiones/${visionId}/mentores?mentorId=${mentorId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        fetchMentores();
        showToast({
          message: 'Mentor removido exitosamente',
          type: 'success'
        });
      } else {
        showToast({
          message: data.error || 'Error al remover mentor',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error removing mentor:', error);
      showToast({
        message: 'Error al remover mentor',
        type: 'error'
      });
    }
  };

  const handleToggleUser = (userId: number) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleSelectAll = () => {
    const allUsersWithoutLicense = [
      ...participantes.filter(p => !p.Participante.licenseCode).map(p => p.Participante.id),
      ...gameChangers.filter(gc => !gc.GameChanger.licenseCode).map(gc => gc.GameChanger.id)
    ];
    
    if (selectedUsers.size === allUsersWithoutLicense.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(allUsersWithoutLicense));
    }
  };

  const handleBulkAssignLicenses = async () => {
    if (selectedUsers.size === 0) return;
    
    if (selectedUsers.size > availableCredits) {
      showToast({
        message: `No tienes suficientes licencias. Necesitas ${selectedUsers.size} pero solo tienes ${availableCredits} disponibles.`,
        type: 'error',
        duration: 6000
      });
      return;
    }

    setBulkAssigning(true);
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const userId of Array.from(selectedUsers)) {
      try {
        const res = await fetch(`/api/school-admin/visiones/${visionId}/assign-license`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ participanteId: userId }),
        });

        const data = await res.json();
        
        if (data.success) {
          successCount++;
        } else {
          errorCount++;
          errors.push(`${data.error}`);
        }
      } catch (error) {
        errorCount++;
        errors.push('Error de conexión');
      }
    }

    setBulkAssigning(false);
    setSelectedUsers(new Set());
    setShowBulkAssignModal(false);
    
    await fetchVisionDetails();
    await fetchCredits();

    if (successCount > 0) {
      showToast({
        message: `${successCount} licencia(s) asignada(s) exitosamente${errorCount > 0 ? `. ${errorCount} falló/fallaron.` : ''}`,
        type: successCount > 0 && errorCount === 0 ? 'success' : 'warning',
        duration: 6000
      });
    } else {
      showToast({
        message: 'No se pudo asignar ninguna licencia',
        type: 'error',
        duration: 5000
      });
    }
  };

  const handleOpenAssignMentorModal = (userId: number, userType: string, userName: string, hasLicense: boolean) => {
    // Validar que tenga licencia
    if (!hasLicense) {
      showToast({
        message: 'El usuario debe tener una licencia asignada antes de poder asignar un mentor',
        type: 'error',
        duration: 5000
      });
      return;
    }
    
    // Redirigir a la página de asignación de mentor
    router.push(`/dashboard/school-admin/visiones/${visionId}/asignar-mentor/${userId}`);
  };

  const handleRemoverMentorDeUsuario = async (userId: number, userType: string) => {
    if (!confirm('¿Estás seguro de remover el mentor asignado?')) return;

    try {
      const res = await fetch(`/api/school-admin/visiones/${visionId}/assign-mentor?userId=${userId}&userType=${userType}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        fetchVisionDetails();
        showToast({
          message: 'Mentor removido del usuario',
          type: 'success'
        });
      } else {
        showToast({
          message: data.error || 'Error al remover mentor',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error removing mentor from user:', error);
      showToast({
        message: 'Error al remover mentor',
        type: 'error'
      });
    }
  };


  // Alta masiva por correo
  const handleAddEmails = async () => {
    if (!emailInput.trim()) return;
    setEmailProcessing(true);
    try {
      const res = await fetch(`/api/school-admin/visiones/${visionId}/add-emails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails: emailInput }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        setEmailInput('');
        fetchVisionDetails();
        
        showToast({
          message: 'Operación completada',
          type: 'success',
          details: {
            created: data.newUsersCreated || 0,
            existing: data.existingUsersAdded || 0,
            pending: data.pendingChanges || 0,
            total: data.total || 0,
            pendingEmails: data.pendingEmails || []
          },
          duration: 8000
        });
      } else {
        showToast({
          message: data.error || 'Error al agregar participantes',
          type: 'error'
        });
      }
    } catch (error) {
      showToast({
        message: 'Error al agregar participantes',
        type: 'error'
      });
    } finally {
      setEmailProcessing(false);
    }
  };

  // Alta masiva de Game Changers por correo
  const handleAddTeam = async () => {
    if (!teamEmailInput.trim()) return;
    setTeamEmailProcessing(true);
    try {
      const res = await fetch(`/api/school-admin/visiones/${visionId}/add-gamechangers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails: teamEmailInput }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddTeamModal(false);
        setTeamEmailInput('');
        fetchVisionDetails();
        
        showToast({
          message: 'Team agregado exitosamente',
          type: 'success',
          details: {
            created: data.newUsersCreated || 0,
            existing: data.existingUsersAdded || 0,
            pending: data.pendingChanges || 0,
            total: data.total || 0,
            pendingEmails: data.pendingEmails || []
          },
          duration: 8000
        });
      } else {
        showToast({
          message: data.error || 'Error al agregar game changers',
          type: 'error'
        });
      }
    } catch (error) {
      showToast({
        message: 'Error al agregar game changers',
        type: 'error'
      });
    } finally {
      setTeamEmailProcessing(false);
    }
  };

  const handleAssignLicense = async () => {
    if (!selectedParticipante && !selectedGameChanger) return;

    if (availableCredits < 1) {
      showToast({
        message: 'No tienes licencias disponibles',
        type: 'warning',
        duration: 4000
      });
      return;
    }

    try {
      setProcessing(true);
      const userId = selectedParticipante 
        ? selectedParticipante.participanteId 
        : selectedGameChanger?.gameChangerId;

      const res = await fetch(`/api/school-admin/visiones/${visionId}/assign-license`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          participanteId: userId 
        }),
      });

      const data = await res.json();

      if (data.success) {
        setShowAssignModal(false);
        setSelectedParticipante(null);
        setSelectedGameChanger(null);
        fetchVisionDetails();
        fetchCredits();
        
        showToast({
          message: `Licencia asignada: ${data.licenseCode}`,
          type: 'success',
          duration: 6000
        });
      } else {
        showToast({
          message: data.error || 'Error al asignar licencia',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error assigning license:', error);
      showToast({
        message: 'Error al asignar licencia',
        type: 'error'
      });
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
        showToast({
          message: 'Participante eliminado',
          type: 'success'
        });
      } else {
        showToast({
          message: data.error || 'Error al eliminar participante',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error removing participante:', error);
      showToast({
        message: 'Error al eliminar participante',
        type: 'error'
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast({
      message: 'Código copiado al portapapeles',
      type: 'success',
      duration: 2000
    });
  };

  const participantesWithLicense = participantes.filter(p => p.Participante.licenseCode);
  const participantesWithoutLicense = participantes.filter(p => !p.Participante.licenseCode);
  const gameChangersWithLicense = gameChangers.filter(gc => gc.GameChanger.licenseCode);
  const gameChangersWithoutLicense = gameChangers.filter(gc => !gc.GameChanger.licenseCode);
  const totalWithLicense = participantesWithLicense.length + gameChangersWithLicense.length;
  const totalWithoutLicense = participantesWithoutLicense.length + gameChangersWithoutLicense.length;

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
      <ToastContainer toasts={toasts} />
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
              {vision.Coordinador && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm text-purple-400 font-medium">Coordinador:</span>
                  <span className="text-sm text-white">{vision.Coordinador.nombre}</span>
                  <span className="text-sm text-slate-500">({vision.Coordinador.email})</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddTeamModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold transition-colors"
            >
              <Users size={20} />
              Agregar Team
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
            >
              <UserPlus size={20} />
              Agregar Participante
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-slate-900/50 backdrop-blur border border-purple-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="text-purple-400" size={24} />
              <span className="text-3xl font-bold text-purple-400">
                {vision._count.Participantes}
              </span>
            </div>
            <p className="text-slate-400 text-sm">Participantes</p>
            {vision.maxParticipantes && (
              <p className="text-xs text-slate-500 mt-1">
                Límite: {vision.maxParticipantes}
              </p>
            )}
          </div>

          <div className="bg-slate-900/50 backdrop-blur border border-cyan-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="text-cyan-400" size={24} />
              <span className="text-3xl font-bold text-cyan-400">
                {vision._count.GameChangers}
              </span>
            </div>
            <p className="text-slate-400 text-sm">Team (GC)</p>
          </div>          <div className="bg-slate-900/50 backdrop-blur border border-emerald-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="text-emerald-400" size={24} />
              <span className="text-3xl font-bold text-emerald-400">
                {totalWithLicense}
              </span>
            </div>
            <p className="text-slate-400 text-sm">Con Licencia</p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur border border-red-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <XCircle className="text-red-400" size={24} />
              <span className="text-3xl font-bold text-red-400">
                {totalWithoutLicense}
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
          <div className="p-6 border-b border-slate-700 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Participantes</h2>
            {selectedUsers.size > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-400">
                  {selectedUsers.size} seleccionado(s)
                </span>
                <button
                  onClick={() => setShowBulkAssignModal(true)}
                  disabled={availableCredits < selectedUsers.size}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors text-sm"
                >
                  <Key size={16} />
                  Asignar {selectedUsers.size} Licencia(s)
                </button>
                <button
                  onClick={() => setSelectedUsers(new Set())}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors text-sm"
                >
                  Cancelar
                </button>
              </div>
            )}
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
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase w-12">
                      <input
                        type="checkbox"
                        checked={selectedUsers.size > 0 && selectedUsers.size === participantes.filter(p => !p.Participante.licenseCode).length + gameChangers.filter(gc => !gc.GameChanger.licenseCode).length}
                        onChange={handleSelectAll}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-600 focus:ring-2 focus:ring-cyan-500"
                      />
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">
                      Participante
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase">
                      Tier
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase">
                      Mentor Asignado
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
                      <td className="px-6 py-4 text-center">
                        {!p.Participante.licenseCode && (
                          <input
                            type="checkbox"
                            checked={selectedUsers.has(p.Participante.id)}
                            onChange={() => handleToggleUser(p.Participante.id)}
                            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-600 focus:ring-2 focus:ring-cyan-500"
                          />
                        )}
                      </td>
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
                        {p.Participante.Usuario_Usuario_assignedMentorIdToUsuario ? (
                          <div className="flex items-center justify-center gap-2">
                            <span className="text-sm text-white">
                              {p.Participante.Usuario_Usuario_assignedMentorIdToUsuario.nombre}
                            </span>
                            <button
                              onClick={() => handleRemoverMentorDeUsuario(p.Participante.id, 'PARTICIPANTE')}
                              className="p-1 hover:bg-red-600/20 text-red-400 rounded transition-colors"
                              title="Remover mentor"
                            >
                              <XCircle size={14} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleOpenAssignMentorModal(p.Participante.id, 'PARTICIPANTE', p.Participante.nombre, !!p.Participante.licenseCode)}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
                          >
                            <Users size={14} />
                            Asignar Mentor
                          </button>
                        )}
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

        {/* Game Changers (Team) List */}
        <div className="bg-slate-900/50 backdrop-blur border border-slate-700 rounded-xl overflow-hidden mt-8">
          <div className="p-6 border-b border-slate-700">
            <h2 className="text-xl font-bold text-white">Team (Game Changers)</h2>
          </div>

          {gameChangers.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-lg mb-2">No hay game changers</p>
              <p className="text-slate-500 text-sm mb-6">
                Agrega game changers (equipo) a esta visión
              </p>
              <button
                onClick={() => setShowAddTeamModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold transition-colors"
              >
                <Users size={20} />
                Agregar Primer Game Changer
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800/50 border-b border-slate-700">
                  <tr>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase w-12">
                      {/* Espacio para checkbox */}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">
                      Game Changer
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase">
                      Tier
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase">
                      Mentor Asignado
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
                  {gameChangers.map((gc) => (
                    <tr key={gc.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 text-center">
                        {!gc.GameChanger.licenseCode && (
                          <input
                            type="checkbox"
                            checked={selectedUsers.has(gc.GameChanger.id)}
                            onChange={() => handleToggleUser(gc.GameChanger.id)}
                            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-600 focus:ring-2 focus:ring-cyan-500"
                          />
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-white">{gc.GameChanger.nombre}</p>
                          <p className="text-xs text-slate-500">{gc.GameChanger.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          gc.GameChanger.tier === 'PREMIUM'
                            ? 'bg-purple-900/20 text-purple-400 border border-purple-600'
                            : 'bg-cyan-900/20 text-cyan-400 border border-cyan-600'
                        }`}>
                          {gc.GameChanger.tier || 'FREE'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {gc.GameChanger.Usuario_Usuario_assignedMentorIdToUsuario ? (
                          <div className="flex items-center justify-center gap-2">
                            <span className="text-sm text-white">
                              {gc.GameChanger.Usuario_Usuario_assignedMentorIdToUsuario.nombre}
                            </span>
                            <button
                              onClick={() => handleRemoverMentorDeUsuario(gc.GameChanger.id, 'GAMECHANGER')}
                              className="p-1 hover:bg-red-600/20 text-red-400 rounded transition-colors"
                              title="Remover mentor"
                            >
                              <XCircle size={14} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleOpenAssignMentorModal(gc.GameChanger.id, 'GAMECHANGER', gc.GameChanger.nombre, !!gc.GameChanger.licenseCode)}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
                          >
                            <Users size={14} />
                            Asignar Mentor
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {gc.GameChanger.licenseCode ? (
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
                        {gc.GameChanger.licenseCode ? (
                          <div className="flex items-center justify-center gap-2">
                            <code className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-300 font-mono">
                              {gc.GameChanger.licenseCode}
                            </code>
                            <button
                              onClick={() => copyToClipboard(gc.GameChanger.licenseCode!)}
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
                          {!gc.GameChanger.licenseCode && (
                            <button
                              onClick={() => {
                                setSelectedGameChanger(gc);
                                setShowAssignModal(true);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors"
                            >
                              <Key size={14} />
                              Asignar Licencia
                            </button>
                          )}
                          <button
                            onClick={() => handleRemoveParticipante(gc.id)}
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

        {/* Mentores de Disciplina List */}
        <div className="bg-slate-900/50 backdrop-blur border border-slate-700 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-slate-700 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Mentores de Disciplina</h2>
              <p className="text-sm text-slate-400 mt-1">
                Solo estos mentores podrán ser seleccionados para llamadas de disciplina
              </p>
            </div>
            <button
              onClick={() => setShowAddMentorModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-colors"
            >
              <UserPlus size={18} />
              Asignar Mentor
            </button>
          </div>

          {mentoresAsignados.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-lg mb-2">No hay mentores asignados</p>
              <p className="text-slate-500 text-sm mb-6">
                Asigna mentores para que los participantes puedan agendar llamadas de disciplina
              </p>
              <button
                onClick={() => setShowAddMentorModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-colors"
              >
                <UserPlus size={20} />
                Asignar Primer Mentor
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800/50 border-b border-slate-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">
                      Mentor
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase">
                      Estado
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase">
                      Horarios
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {mentoresAsignados.map((ma) => (
                    <tr key={ma.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {ma.mentor.imagen ? (
                            <img
                              src={ma.mentor.imagen}
                              alt={ma.mentor.nombre}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold">
                              {ma.mentor.nombre.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-white">{ma.mentor.nombre}</p>
                            <p className="text-xs text-slate-500">{ma.mentor.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {ma.mentor.isActive ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-900/20 text-green-400 border border-green-600 rounded-full text-xs font-medium">
                            <CheckCircle size={14} />
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-900/20 text-gray-400 border border-gray-600 rounded-full text-xs font-medium">
                            <XCircle size={14} />
                            Inactivo
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {ma.tieneHorarios ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-900/20 text-blue-400 border border-blue-600 rounded-full text-xs font-medium">
                            <CheckCircle size={14} />
                            Configurado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-900/20 text-amber-400 border border-amber-600 rounded-full text-xs font-medium">
                            <AlertCircle size={14} />
                            Sin horarios
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleRemoverMentor(ma.mentorId)}
                            className="p-2 hover:bg-red-600/20 text-red-400 rounded-lg transition-colors"
                            title="Remover mentor"
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

      {/* Add Mentor Modal */}
      {showAddMentorModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-white mb-2">
              Asignar Mentor de Disciplina
            </h2>
            <p className="text-slate-400 text-sm mb-6">
              Selecciona un mentor activo con horarios configurados para llamadas de disciplina
            </p>

            {mentoresDisponibles.length === 0 ? (
              <div className="py-12 text-center">
                <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                <p className="text-slate-300 text-lg mb-2">No hay mentores disponibles</p>
                <p className="text-slate-500 text-sm">
                  Todos los mentores activos ya están asignados o no tienen horarios de disciplina configurados
                </p>
              </div>
            ) : (
              <div className="space-y-3 mb-6">
                {mentoresDisponibles.map((mentor) => (
                  <div
                    key={mentor.id}
                    className="flex items-center justify-between p-4 bg-slate-800 border border-slate-700 rounded-lg hover:border-indigo-500 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {mentor.imagen ? (
                        <img
                          src={mentor.imagen}
                          alt={mentor.nombre}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold text-lg">
                          {mentor.nombre.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-white">{mentor.nombre}</p>
                        <p className="text-xs text-slate-400">{mentor.email}</p>
                        {!mentor.tieneHorarios && (
                          <div className="flex items-center gap-1 mt-1">
                            <AlertCircle size={12} className="text-amber-500" />
                            <span className="text-xs text-amber-500">Sin horarios de disciplina configurados</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleAsignarMentor(mentor.id)}
                      disabled={!mentor.tieneHorarios || processing}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors text-sm"
                    >
                      {!mentor.tieneHorarios ? 'No disponible' : processing ? 'Asignando...' : 'Asignar'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAddMentorModal(false)}
                className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Participante Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-white mb-4">
              Agregar Participante
            </h2>

            <div className="mb-4">
              <textarea
                className="w-full min-h-[120px] bg-slate-800 border border-slate-700 rounded-lg text-white p-3 placeholder-slate-400 focus:outline-none focus:border-purple-500"
                placeholder="Ingresa uno o varios correos, separados por coma o salto de línea"
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
              />
              <p className="text-xs text-slate-400 mt-2">Se crearán cuentas nuevas para los correos que no existan. Contraseña temporal: <span className="font-mono">Frutos2025!</span></p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEmailInput('');
                }}
                className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddEmails}
                disabled={emailProcessing || !emailInput.trim()}
                className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
              >
                {emailProcessing ? 'Agregando...' : 'Agregar Participantes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Team (Game Changers) Modal */}
      {showAddTeamModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-white mb-4">
              Agregar Team (Game Changers)
            </h2>

            <div className="mb-4">
              <textarea
                className="w-full min-h-[120px] bg-slate-800 border border-slate-700 rounded-lg text-white p-3 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                placeholder="Ingresa uno o varios correos de Game Changers, separados por coma o salto de línea"
                value={teamEmailInput}
                onChange={e => setTeamEmailInput(e.target.value)}
              />
              <p className="text-xs text-slate-400 mt-2">Se crearán cuentas Game Changer para los correos que no existan. Contraseña temporal: <span className="font-mono">Frutos2025!</span></p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setShowAddTeamModal(false);
                  setTeamEmailInput('');
                }}
                className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddTeam}
                disabled={teamEmailProcessing || !teamEmailInput.trim()}
                className="flex-1 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
              >
                {teamEmailProcessing ? 'Agregando...' : 'Agregar Game Changers'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign License Modal */}
      {showAssignModal && (selectedParticipante || selectedGameChanger) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold text-white mb-4">
              Asignar Licencia
            </h2>

            <div className="bg-slate-800 rounded-lg p-4 mb-6">
              <p className="text-sm text-slate-400 mb-2">
                {selectedParticipante ? 'Participante:' : 'Game Changer:'}
              </p>
              <p className="font-semibold text-white">
                {selectedParticipante?.Participante.nombre || selectedGameChanger?.GameChanger.nombre}
              </p>
              <p className="text-sm text-slate-400">
                {selectedParticipante?.Participante.email || selectedGameChanger?.GameChanger.email}
              </p>
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

      {/* Bulk Assign Licenses Modal */}
      {showBulkAssignModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold text-white mb-4">
              Asignar Licencias Masivamente
            </h2>

            <div className="bg-slate-800 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-300">Usuarios seleccionados:</span>
                <span className="text-2xl font-bold text-cyan-400">{selectedUsers.size}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Licencias disponibles:</span>
                <span className="text-2xl font-bold text-emerald-400">{availableCredits}</span>
              </div>
            </div>

            {selectedUsers.size > availableCredits && (
              <div className="bg-red-900/20 border border-red-600 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 text-red-400">
                  <AlertCircle size={20} />
                  <p className="text-sm">
                    No tienes suficientes licencias. Necesitas {selectedUsers.size} pero solo tienes {availableCredits} disponibles.
                  </p>
                </div>
              </div>
            )}

            {selectedUsers.size <= availableCredits && (
              <div className="bg-cyan-900/20 border border-cyan-600 rounded-lg p-4 mb-6">
                <p className="text-sm text-cyan-300">
                  Se asignarán <span className="font-bold">{selectedUsers.size} licencia(s) PREMIUM</span> a los usuarios seleccionados.
                </p>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowBulkAssignModal(false)}
                disabled={bulkAssigning}
                className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-lg font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleBulkAssignLicenses}
                disabled={selectedUsers.size > availableCredits || bulkAssigning}
                className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
              >
                {bulkAssigning ? (
                  <span className="flex items-center gap-2 justify-center">
                    <Loader2 className="animate-spin" size={16} />
                    Asignando...
                  </span>
                ) : (
                  'Confirmar Asignación'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
