"use client";

import React, { useState, useEffect } from 'react';
import { Star, Sunrise, User, Users, TrendingUp, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

// 🏅 DICCIONARIO DE MEDALLAS
const BADGE_CONFIG: Record<string, { label: string; icon: string; color: string; desc: string }> = {
  INQUEBRANTABLE: {
    label: "Inquebrantable",
    icon: "🛡️",
    color: "bg-slate-200 text-slate-800 border-slate-400",
    desc: "0 faltas en sus últimas sesiones. Fiabilidad total."
  },
  ERUDITO: {
    label: "Erudito",
    icon: "📚",
    color: "bg-blue-900/50 text-blue-200 border-blue-500/50",
    desc: "Comparte herramientas y recursos adicionales."
  },
  FLASH: {
    label: "Flash",
    icon: "⚡",
    color: "bg-yellow-900/50 text-yellow-200 border-yellow-500/50",
    desc: "Responde y valida a velocidad luz."
  },
  ZEN_MASTER: {
    label: "Zen Master",
    icon: "🧘",
    color: "bg-emerald-900/50 text-emerald-200 border-emerald-500/50",
    desc: "Paciencia infinita y trato excelente."
  },
  CLUB_5AM: {
    label: "Club 5 AM",
    icon: "🌅",
    color: "bg-orange-900/50 text-orange-200 border-orange-500/50",
    desc: "Miembro del exclusivo Club 5 AM. Madrugador disciplinado."
  }
};

interface Mentor {
  id: number;
  full_name: string;
  email: string;
  profileImage: string | null;
  jobTitle: string;
  experienceYears: number;
  bioShort: string | null;
  basePrice: number;
  perfilMentorId: number;
  level: 'JUNIOR' | 'SENIOR' | 'MASTER';
  especialidad: string;
  biografiaCorta: string | null;
  average_rating: number;
  totalResenas: number;
  totalSesiones: number;
  destacado: boolean;
  occupancyRate: number;
  activeStudents: number;
  capacity: number;
  availableSlots: number;
  is5AMClub: boolean;
  isSaturated: boolean;
  score: number;
  badges: string[]; // 🏅 Array de medallas ["INQUEBRANTABLE", "ERUDITO", etc.]
}

export default function CatalogoMentoresPage() {
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<{ label: string; icon: string; desc: string } | null>(null);

  useEffect(() => {
    fetch('/api/student/mentors')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setMentors(Array.isArray(data.mentors) ? data.mentors : []);
        } else {
          setError(data.error || 'Error al cargar mentores');
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching mentors:', err);
        setError('Error de conexión');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-500 mx-auto mb-4" />
          <p className="text-slate-400">Cargando catálogo de mentores...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Error al cargar mentores</h3>
          <p className="text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 flex items-center gap-3">
          <TrendingUp className="text-purple-500" size={36} />
          Encuentra a tu Mentor
        </h1>
        <p className="text-slate-400 text-lg">
          Los mejores expertos ordenados por calidad y disponibilidad.
        </p>
        {mentors.length > 0 && (
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
            <Users size={16} />
            <span>{mentors.length} mentores disponibles</span>
          </div>
        )}
      </div>

      {/* Grid de Tarjetas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mentors.map((mentor) => (
          <div 
            key={mentor.id} 
            className={`bg-slate-900 rounded-2xl border overflow-hidden hover:border-purple-500/50 transition-all group relative shadow-xl ${
              mentor.isSaturated ? 'border-slate-700 opacity-75' : 'border-slate-800'
            }`}
          >
            
            {/* Cabecera de Nivel */}
            <div className={`h-28 relative ${
              mentor.level === 'MASTER' ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600' :
              mentor.level === 'SENIOR' ? 'bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600' :
              'bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700'
            }`}>
              {/* Patrón decorativo */}
              <div className="absolute inset-0 opacity-20" style={{
                backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                backgroundSize: '20px 20px'
              }}></div>
            </div>

            <div className="px-6 pb-6 -mt-14">
              {/* Foto */}
              <div className="w-28 h-28 rounded-full border-4 border-slate-900 overflow-hidden bg-slate-700 mb-4 relative shadow-xl">
                {mentor.profileImage ? (
                  <img 
                    src={mentor.profileImage} 
                    alt={mentor.full_name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-600 to-slate-800">
                    <User className="w-14 h-14 text-slate-400" />
                  </div>
                )}
                
                {/* Indicador de Saturación */}
                {mentor.isSaturated && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                    <div className="text-center">
                      <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-1" />
                      <span className="text-[10px] font-bold text-red-300">
                        AGENDA LLENA
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Nombre y Nivel */}
              <div className="mb-3">
                <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-1">
                  {mentor.full_name}
                  {/* Badge Nivel */}
                  <span className={`text-[10px] px-2 py-0.5 rounded-md border font-bold ${
                     mentor.level === 'MASTER' ? 'border-purple-500 text-purple-400 bg-purple-500/10' :
                     mentor.level === 'SENIOR' ? 'border-blue-500 text-blue-400 bg-blue-500/10' :
                     'border-slate-500 text-slate-400 bg-slate-500/10'
                  }`}>
                    {mentor.level}
                  </span>
                </h3>
                
                <p className="text-slate-400 text-sm line-clamp-1">
                  {mentor.jobTitle}
                </p>

                {/* 🏅 MEDALLAS DE HONOR CLICKEABLES */}
                <div className="flex flex-wrap gap-2 mb-4 mt-2">
                  {/* 1. Insignia Especial CLUB 5 AM */}
                  {mentor.is5AMClub && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedBadge({
                          label: "Club 5 AM",
                          icon: "🌅",
                          desc: "Este mentor ofrece sesiones de disciplina de 5:00 AM a 8:00 AM. Ideal para forjar hábitos de acero y crear una rutina matutina inquebrantable."
                        });
                      }}
                      className="px-2 py-1 rounded-md text-[10px] font-bold border flex items-center gap-1 cursor-pointer transition-transform hover:scale-105 active:scale-95 bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-orange-300 border-orange-500/50"
                    >
                      🌅 Club 5 AM
                    </button>
                  )}

                  {/* 2. Resto de Medallas Dinámicas */}
                  {mentor.badges && mentor.badges.map((badgeCode: string) => {
                    const config = BADGE_CONFIG[badgeCode];
                    if (!config) return null;

                    return (
                      <button
                        key={badgeCode}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSelectedBadge({
                            label: config.label,
                            icon: config.icon,
                            desc: config.desc
                          });
                        }}
                        className={`px-2 py-1 rounded-md text-[10px] font-bold border flex items-center gap-1 cursor-pointer transition-transform hover:scale-105 active:scale-95 ${config.color}`}
                      >
                        {config.icon} {config.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Especialidad */}
              {mentor.especialidad && (
                <p className="text-slate-500 text-xs mb-3 line-clamp-1">
                  🎯 {mentor.especialidad}
                </p>
              )}

              {/* Rating y Experiencia */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-1 text-amber-400 text-sm">
                  <Star className="w-4 h-4 fill-amber-400" />
                  <span className="font-bold">
                    {mentor.average_rating > 0 ? mentor.average_rating.toFixed(1) : "N/A"}
                  </span>
                  <span className="text-slate-600 text-xs">
                    ({mentor.totalResenas})
                  </span>
                </div>
                
                <div className="text-xs text-slate-500">
                  {mentor.experienceYears} años exp.
                </div>
              </div>

              {/* Precio Referencia */}
              <div className="mb-4 px-3 py-2 bg-slate-900/50 rounded-lg flex justify-between items-center border border-slate-700">
                <span className="text-xs text-slate-400">Inversión por sesión:</span>
                <span className="text-white font-bold">
                  ${mentor.basePrice ? mentor.basePrice.toLocaleString('es-MX') : '1,000'}
                </span>
              </div>

              {/* Barra de Ocupación */}
              <div className="mb-4">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Disponibilidad</span>
                  <span className={`font-bold ${
                    mentor.occupancyRate > 80 ? 'text-red-400' :
                    mentor.occupancyRate > 50 ? 'text-amber-400' :
                    'text-emerald-400'
                  }`}>
                    {mentor.availableSlots} espacios
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      mentor.occupancyRate > 80 ? 'bg-gradient-to-r from-red-500 to-red-600' :
                      mentor.occupancyRate > 50 ? 'bg-gradient-to-r from-amber-500 to-amber-600' :
                      'bg-gradient-to-r from-emerald-500 to-emerald-600'
                    }`}
                    style={{ width: `${Math.min(100, mentor.occupancyRate)}%` }}
                  />
                </div>
              </div>

              {/* Bio corta */}
              {mentor.biografiaCorta && (
                <p className="text-slate-500 text-xs mb-4 line-clamp-2">
                  {mentor.biografiaCorta}
                </p>
              )}

              {/* Botón de Acción */}
              <Link 
                href={`/dashboard/student/reservar?mentorId=${mentor.id}`}
                className={`block w-full py-3 text-center rounded-xl font-bold transition-all ${
                  mentor.isSaturated 
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50'
                }`}
                onClick={(e) => {
                  if (mentor.isSaturated) {
                    e.preventDefault();
                    alert('Este mentor no tiene espacios disponibles en este momento');
                  }
                }}
              >
                {mentor.isSaturated ? 'Sin Disponibilidad' : 'Ver Disponibilidad'}
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Estado vacío */}
      {mentors.length === 0 && !loading && !error && (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-slate-700 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">
            No hay mentores disponibles
          </h3>
          <p className="text-slate-400">
            Intenta nuevamente más tarde
          </p>
        </div>
      )}

      {/* MODAL DE INFORMACIÓN DE BADGE */}
      {selectedBadge && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedBadge(null)}
        >
          <div 
            className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icono grande */}
            <div className="text-6xl text-center mb-4">
              {selectedBadge.icon}
            </div>

            {/* Título */}
            <h3 className="text-2xl font-bold text-white text-center mb-3">
              {selectedBadge.label}
            </h3>

            {/* Descripción */}
            <p className="text-slate-300 text-center leading-relaxed mb-6">
              {selectedBadge.desc}
            </p>

            {/* Botón cerrar */}
            <button
              onClick={() => setSelectedBadge(null)}
              className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-all"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
