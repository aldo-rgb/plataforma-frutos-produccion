'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';

interface Organization {
  id: number;
  name: string;
  logoUrl: string | null;
  brandColor: string | null;
  slug: string;
}

interface NextVision {
  id: number;
  nombre: string;
  startDate: string;
  descripcion: string | null;
  maxParticipantes: number;
  currentParticipantes: number;
}

export default function SignUpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgCode = searchParams.get('org');

  const [masterOrganization, setMasterOrganization] = useState<Organization | null>(null);
  const [childOrganizations, setChildOrganizations] = useState<Organization[]>([]);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [nextVision, setNextVision] = useState<NextVision | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingVision, setLoadingVision] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'sede' | 'registro'>('sede');

  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (orgCode) {
      fetchOrganizationData();
    } else {
      setLoading(false);
    }
  }, [orgCode]);

  const fetchOrganizationData = async () => {
    try {
      console.log('🔍 Fetching organization data for code:', orgCode);
      const res = await fetch(`/api/public/organization/${orgCode}`);
      const data = await res.json();
      
      console.log('📦 API Response:', data);

      if (data.success) {
        console.log('✅ Master Organization:', data.masterOrganization);
        console.log('🏢 Child Organizations:', data.childOrganizations);
        setMasterOrganization(data.masterOrganization);
        setChildOrganizations(data.childOrganizations || []);
        
        // Si solo hay una organización hija, seleccionarla automáticamente
        if (data.childOrganizations && data.childOrganizations.length === 1) {
          handleSelectOrganization(data.childOrganizations[0]);
        }
      } else {
        console.error('❌ API Error:', data.error);
        setError(data.error || 'Error al cargar la información');
      }
    } catch (error) {
      console.error('❌ Error fetching organization:', error);
      setError('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOrganization = async (org: Organization) => {
    setSelectedOrganization(org);
    setLoadingVision(true);
    setError('');

    try {
      console.log('🔍 Fetching next vision for organization:', org.id);
      const res = await fetch(`/api/public/organization/${org.id}/next-vision`);
      const data = await res.json();

      if (data.success) {
        console.log('📅 Next Vision:', data.nextVision);
        setNextVision(data.nextVision);
        setStep('registro');
      } else {
        console.error('❌ No vision found');
        setNextVision(null);
        setStep('registro');
      }
    } catch (error) {
      console.error('❌ Error fetching vision:', error);
      setNextVision(null);
      setStep('registro');
    } finally {
      setLoadingVision(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validaciones
    if (!formData.nombre || !formData.email || !formData.password) {
      setError('Por favor completa todos los campos');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (!selectedOrganization) {
      setError('Por favor selecciona una sede');
      return;
    }

    setSubmitting(true);

    try {
      // Registrar usuario
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre: formData.nombre,
          email: formData.email,
          password: formData.password,
          organizationId: selectedOrganization.id,
          visionId: nextVision?.id
        }),
      });

      const data = await res.json();

      if (data.success) {
        // Auto login después del registro
        const result = await signIn('credentials', {
          email: formData.email,
          password: formData.password,
          redirect: false,
        });

        if (result?.ok) {
          router.push('/dashboard');
        } else {
          setError('Registro exitoso. Por favor inicia sesión.');
          router.push('/auth/signin');
        }
      } else {
        setError(data.error || 'Error al registrar usuario');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Error al procesar el registro');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Cargando información...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full space-y-8">
        {/* Logo y nombre de la organización master */}
        {masterOrganization && (
          <div className="text-center">
            {masterOrganization.logoUrl ? (
              <img
                src={masterOrganization.logoUrl}
                alt={masterOrganization.name}
                className="mx-auto h-20 w-auto rounded-lg shadow-lg"
              />
            ) : (
              <div 
                className="mx-auto h-20 w-20 rounded-lg flex items-center justify-center text-white font-bold text-2xl shadow-lg"
                style={{ backgroundColor: masterOrganization.brandColor || '#8B5CF6' }}
              >
                {masterOrganization.name.charAt(0)}
              </div>
            )}
            <h1 className="mt-6 text-3xl font-black text-white">
              {masterOrganization.name}
            </h1>
            <p className="text-slate-400 mt-2">
              {step === 'sede' ? 'Selecciona tu sede' : 'Completa tu registro'}
            </p>
          </div>
        )}

        {/* PASO 1: Selección de Sede */}
        {step === 'sede' && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 backdrop-blur-sm">
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-bold text-white mb-2">¿En qué sede te encuentras?</h2>
              <p className="text-slate-400 text-sm">
                Selecciona la sede más cercana para continuar
              </p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm mb-6">
                {error}
              </div>
            )}

            {loadingVision ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
                <p className="text-slate-400">Buscando próximo programa básico...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {childOrganizations.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => handleSelectOrganization(org)}
                    className="bg-slate-800/50 hover:bg-slate-800 border-2 border-slate-700 hover:border-purple-500 rounded-xl p-6 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      {org.logoUrl ? (
                        <img
                          src={org.logoUrl}
                          alt={org.name}
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div 
                          className="h-12 w-12 rounded-lg flex items-center justify-center text-white font-bold text-xl"
                          style={{ backgroundColor: org.brandColor || '#8B5CF6' }}
                        >
                          {org.name.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1 text-left">
                        <h3 className="text-lg font-bold text-white group-hover:text-purple-400 transition-colors">
                          {org.name}
                        </h3>
                        <p className="text-slate-400 text-sm">Ver disponibilidad →</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {childOrganizations.length === 0 && !loadingVision && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🏢</div>
                <p className="text-slate-400 text-lg mb-2">No hay sedes disponibles</p>
                <p className="text-slate-500 text-sm mb-4">
                  No se encontraron organizaciones asociadas a este grupo
                </p>
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 text-left max-w-md mx-auto">
                  <p className="text-amber-400 text-sm">
                    <strong>💡 Posibles causas:</strong>
                  </p>
                  <ul className="text-amber-300/80 text-xs mt-2 space-y-1 ml-4 list-disc">
                    <li>Las sedes no tienen configurado el campo "Master Organization"</li>
                    <li>Esta organización no tiene sedes asociadas</li>
                    <li>Problema de configuración en la base de datos</li>
                  </ul>
                  <p className="text-slate-400 text-xs mt-3">
                    Por favor contacta al administrador del sistema
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PASO 2: Formulario de Registro con información del básico */}
        {step === 'registro' && selectedOrganization && (
          <div className="space-y-6">
            {/* Información de la sede seleccionada */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {selectedOrganization.logoUrl ? (
                    <img
                      src={selectedOrganization.logoUrl}
                      alt={selectedOrganization.name}
                      className="h-10 w-10 rounded-lg object-cover"
                    />
                  ) : (
                    <div 
                      className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: selectedOrganization.brandColor || '#8B5CF6' }}
                    >
                      {selectedOrganization.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-bold text-white">{selectedOrganization.name}</h3>
                    <p className="text-slate-400 text-sm">Sede seleccionada</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setStep('sede');
                    setSelectedOrganization(null);
                    setNextVision(null);
                  }}
                  className="text-slate-400 hover:text-white text-sm transition-colors"
                >
                  Cambiar sede
                </button>
              </div>

              {/* Información del próximo básico */}
              {nextVision ? (
                <div className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 border-2 border-blue-500/30 rounded-xl p-6 mt-4">
                  <div className="text-blue-300 text-sm font-medium mb-2">🎯 Próximo Programa Básico</div>
                  <h2 className="text-2xl font-bold text-white mb-2">{nextVision.nombre}</h2>
                  <div className="text-3xl font-black text-blue-400 mb-2">
                    {new Date(nextVision.startDate).toLocaleDateString('es-MX', { 
                      day: 'numeric', 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </div>
                  {nextVision.descripcion && (
                    <p className="text-slate-300 text-sm mb-3">{nextVision.descripcion}</p>
                  )}
                  <div className="flex items-center justify-center gap-4 text-sm text-slate-400">
                    <div className="flex items-center gap-1">
                      <span>👥</span>
                      <span>{nextVision.currentParticipantes} / {nextVision.maxParticipantes}</span>
                    </div>
                    <div className="h-4 w-px bg-slate-600"></div>
                    <div className="flex items-center gap-1">
                      <span>📅</span>
                      <span>
                        Inicia en {Math.ceil((new Date(nextVision.startDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} días
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 border-2 border-slate-700/30 rounded-xl p-6 mt-4">
                  <div className="text-slate-400 text-sm font-medium mb-2">📅 Próximas Convocatorias</div>
                  <h2 className="text-xl font-bold text-white mb-2">Aún no hay fechas programadas</h2>
                  <p className="text-slate-400 text-sm">
                    Te notificaremos cuando se abran nuevos grupos básicos en esta sede
                  </p>
                </div>
              )}
            </div>

            {/* Formulario de registro */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 backdrop-blur-sm">
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-bold text-white mb-2">Crea tu cuenta</h2>
                <p className="text-slate-400 text-sm">
                  Completa tus datos para continuar
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Juan Pérez"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="tu@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Contraseña
                  </label>
                  <input
                    type="password"
                    required
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Mínimo 6 caracteres"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Confirmar contraseña
                  </label>
                  <input
                    type="password"
                    required
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Repite tu contraseña"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-slate-600 disabled:to-slate-700 text-white font-bold rounded-lg transition-all shadow-lg disabled:cursor-not-allowed"
                >
                  {submitting ? 'Registrando...' : 'Crear cuenta'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-slate-400 text-sm">
                  ¿Ya tienes cuenta?{' '}
                  <Link href="/auth/signin" className="text-purple-400 hover:text-purple-300 font-medium">
                    Inicia sesión
                  </Link>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
