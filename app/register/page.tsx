'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Mail, Lock, Loader2, Sparkles, CheckCheck, Building2, Search } from 'lucide-react';
import { registrarUsuario } from '../actions/registro';

interface Organization {
  id: number;
  name: string;
  logoUrl: string | null;
  brandColor: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Estados para autocompletado de organización
  const [organizationSearch, setOrganizationSearch] = useState('');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchingOrgs, setSearchingOrgs] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Buscar organizaciones mientras escribe
  useEffect(() => {
    const searchOrganizations = async () => {
      if (organizationSearch.length < 2) {
        setOrganizations([]);
        return;
      }

      setSearchingOrgs(true);
      try {
        const res = await fetch(`/api/organizations/search?q=${encodeURIComponent(organizationSearch)}`);
        const data = await res.json();
        
        if (data.success) {
          setOrganizations(data.organizations);
          setShowDropdown(true);
        }
      } catch (err) {
        console.error('Error buscando organizaciones:', err);
      } finally {
        setSearchingOrgs(false);
      }
    };

    const debounce = setTimeout(searchOrganizations, 300);
    return () => clearTimeout(debounce);
  }, [organizationSearch]);

  // Cerrar dropdown al hacer click afuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const confirmEmail = formData.get("confirmEmail") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    // --- 1. VALIDACIÓN DE PRECISIÓN (Client Side) ---
    
    // Validar Email
    if (email !== confirmEmail) {
      setError("¡Atención! Los correos electrónicos no coinciden.");
      setLoading(false);
      return;
    }

    // Validar Password
    if (password !== confirmPassword) {
      setError("¡Atención! Las contraseñas no coinciden.");
      setLoading(false);
      return;
    }

    // --- 2. REGISTRO EN SERVIDOR ---
    
    // Solo enviamos los datos necesarios a la Server Action
    const resultado = await registrarUsuario(formData);

    if (resultado?.error) {
      setError(resultado.error);
      setLoading(false);
    } else {
      // Éxito: Redirigir al login con la señal de éxito
      router.push('/login?registrado=true'); 
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center p-4">
      {/* Fondo Decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
            Únete al Movimiento
          </h1>
          <p className="text-slate-400">Crea tu cuenta y comienza el cambio</p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Input Nombre */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400 uppercase ml-1">Nombre Completo</label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
                <input
                  name="nombre"
                  type="text"
                  required
                  placeholder="Tu Nombre"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-slate-100 focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* Input Organización (OPCIONAL) */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400 uppercase ml-1 flex items-center gap-2">
                Centro / Organización 
                <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded-full normal-case">Opcional</span>
              </label>
              <div className="relative" ref={dropdownRef}>
                <Building2 className="absolute left-3 top-3 h-5 w-5 text-slate-500 z-10" />
                <input
                  type="text"
                  value={selectedOrganization ? selectedOrganization.name : organizationSearch}
                  onChange={(e) => {
                    setOrganizationSearch(e.target.value);
                    setSelectedOrganization(null);
                    setShowDropdown(true);
                  }}
                  onFocus={() => {
                    if (organizations.length > 0) setShowDropdown(true);
                  }}
                  placeholder="¿Estudias en algún centro? (opcional)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-slate-100 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                />
                {searchingOrgs && (
                  <Loader2 className="absolute right-3 top-3 h-5 w-5 text-slate-500 animate-spin" />
                )}
                
                {/* Hidden input para enviar el ID al servidor */}
                <input
                  type="hidden"
                  name="communityOrganizationId"
                  value={selectedOrganization?.id || ''}
                />

                {/* Dropdown de organizaciones */}
                {showDropdown && organizations.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {organizations.map((org) => (
                      <button
                        key={org.id}
                        type="button"
                        onClick={() => {
                          setSelectedOrganization(org);
                          setOrganizationSearch(org.name);
                          setShowDropdown(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-800 transition-colors text-left border-b border-slate-800 last:border-0"
                      >
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                          style={{ backgroundColor: org.brandColor }}
                        >
                          {org.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-slate-200">{org.name}</div>
                          <div className="text-xs text-slate-500">Click para seleccionar</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Mensaje si no existe */}
                {showDropdown && organizationSearch.length >= 2 && organizations.length === 0 && !searchingOrgs && (
                  <div className="absolute z-50 w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-4">
                    <div className="text-sm text-slate-400 text-center">
                      <Search className="w-6 h-6 mx-auto mb-2 text-slate-600" />
                      No encontramos "{organizationSearch}".
                      <div className="text-xs text-slate-500 mt-1">Puedes continuar sin seleccionar</div>
                    </div>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-slate-500 ml-1 mt-1">
                Esto nos ayuda a llevar un conteo de comunidad. No afecta tu registro.
              </p>
            </div>

            {/* BLOQUE EMAIL */}
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400 uppercase ml-1">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="lider@ejemplo.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-slate-100 focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                  />
                </div>
              </div>

              {/* Confirmación Email */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400 uppercase ml-1">Confirmar Correo</label>
                <div className="relative">
                  <CheckCheck className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
                  <input
                    name="confirmEmail"
                    type="email"
                    required
                    placeholder="Repite tu correo"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-slate-100 focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                  />
                </div>
              </div>
            </div>

            {/* BLOQUE PASSWORD */}
            <div className="grid grid-cols-1 gap-4 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400 uppercase ml-1">Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
                  <input
                    name="password"
                    type="password"
                    required
                    placeholder="••••••••"
                    minLength={6}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-slate-100 focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                  />
                </div>
              </div>

              {/* Confirmación Password */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400 uppercase ml-1">Confirmar Contraseña</label>
                <div className="relative">
                  <CheckCheck className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
                  <input
                    name="confirmPassword"
                    type="password"
                    required
                    placeholder="Repite tu contraseña"
                    minLength={6}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-slate-100 focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                  />
                </div>
              </div>
            </div>

            {/* Mensaje Error */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center animate-in fade-in slide-in-from-top-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-purple-900/20"
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Crear Cuenta Segura
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-500">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-purple-400 hover:text-purple-300 hover:underline transition-colors">
              Inicia Sesión aquí
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
