'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Shield, Star, Plus, X, Save, CheckCircle } from 'lucide-react';

interface Usuario {
  id: number;
  nombre: string;
  email: string;
  strikes: number;
}

export default function GestionStrikesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedUsuario, setSelectedUsuario] = useState<Usuario | null>(null);
  const [tareaForm, setTareaForm] = useState({
    titulo: '',
    descripcion: '',
    fechaLimite: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (session?.user?.rol !== 'COORDINADOR') {
      router.push('/dashboard');
    } else {
      fetchUsuarios();
    }
  }, [status, session]);

  const fetchUsuarios = async () => {
    try {
      const res = await fetch('/api/coordinador/usuarios-strikes');
      const result = await res.json();
      if (res.ok && result.success) {
        setUsuarios(result.usuarios);
      }
    } catch (error) {
      console.error('Error fetching usuarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAsignarTarea = (usuario: Usuario) => {
    setSelectedUsuario(usuario);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUsuario) return;

    setSaving(true);
    try {
      const res = await fetch('/api/coordinador/asignar-tarea-strike', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuarioId: selectedUsuario.id,
          ...tareaForm
        })
      });

      const result = await res.json();
      if (res.ok && result.success) {
        alert('Tarea extraordinaria asignada correctamente');
        setShowModal(false);
        setTareaForm({ titulo: '', descripcion: '', fechaLimite: '' });
        setSelectedUsuario(null);
      } else {
        alert(result.error || 'Error al asignar tarea');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al asignar tarea');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-purple-500/20 rounded-xl">
              <Shield size={32} className="text-purple-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Gestión de Strikes</h1>
              <p className="text-slate-400">Asigna tareas extraordinarias para ganar vidas extra</p>
            </div>
          </div>
        </div>

        {/* Lista de usuarios */}
        {usuarios.length === 0 ? (
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-12 text-center">
            <Shield size={48} className="text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-400 mb-2">No hay usuarios disponibles</h3>
            <p className="text-slate-500">No hay participantes que requieran gestión de strikes</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {usuarios.map((usuario) => (
              <div
                key={usuario.id}
                className="bg-gradient-to-br from-purple-900/20 to-slate-900/50 border-2 border-purple-500/30 rounded-2xl p-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="p-3 bg-purple-500/20 rounded-xl">
                      <Shield size={24} className="text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white mb-1">
                        {usuario.nombre}
                      </h3>
                      <p className="text-sm text-slate-400 mb-2">{usuario.email}</p>
                      <div className="flex items-center gap-2">
                        <Star size={16} className="text-yellow-400" />
                        <span className="text-slate-300">
                          Strikes: {usuario.strikes}/3
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleAsignarTarea(usuario)}
                    className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-bold transition-all flex items-center gap-2"
                  >
                    <Plus size={18} />
                    Asignar Tarea Extraordinaria
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {showModal && selectedUsuario && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/30 rounded-2xl p-8 max-w-2xl w-full">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-500/20 rounded-xl">
                    <Shield size={24} className="text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Tarea Extraordinaria</h2>
                    <p className="text-slate-400">Para: {selectedUsuario.nombre}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-slate-700 rounded-lg transition-all"
                >
                  <X size={24} className="text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">
                    Título de la Tarea
                  </label>
                  <input
                    type="text"
                    value={tareaForm.titulo}
                    onChange={(e) => setTareaForm({ ...tareaForm, titulo: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">
                    Descripción
                  </label>
                  <textarea
                    value={tareaForm.descripcion}
                    onChange={(e) => setTareaForm({ ...tareaForm, descripcion: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">
                    Fecha Límite
                  </label>
                  <input
                    type="date"
                    value={tareaForm.fechaLimite}
                    onChange={(e) => setTareaForm({ ...tareaForm, fechaLimite: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle size={20} className="text-purple-400 mt-0.5" />
                    <div className="text-sm text-slate-300">
                      <p className="font-bold mb-1">Al completar esta tarea:</p>
                      <p>El participante deberá enviar evidencia al coordinador. Una vez autorizada, ganará una vida extra (se reduce un strike).</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-bold transition-all flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>Guardando...</>
                    ) : (
                      <>
                        <Save size={18} />
                        Asignar Tarea
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
