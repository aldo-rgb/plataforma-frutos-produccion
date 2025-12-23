"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import Image from "next/image";

interface ServiceContribution {
  id: number;
  serviceLevel: string;
  evidenciaUrl: string;
  description: string | null;
  submittedAt: string;
  Usuario: {
    id: number;
    nombre: string;
    imagen: string | null;
    vision: string | null;
  };
  Location: {
    id: number;
    name: string;
    city: string | null;
  };
}

const SERVICE_LEVEL_LABELS: Record<string, { label: string; pc: number; color: string }> = {
  CONTRIBUCION_NIVEL_1: { label: "Contribución Nivel 1", pc: 200, color: "bg-blue-500" },
  CONTRIBUCION_NIVEL_2: { label: "Contribución Nivel 2", pc: 500, color: "bg-purple-500" },
  SERVICIO_FIN_SEMANA: { label: "Servicio Fin de Semana", pc: 800, color: "bg-indigo-500" },
  STAFF_NIVEL_1: { label: "Staff Nivel 1", pc: 1000, color: "bg-yellow-500" },
  STAFF_NIVEL_2: { label: "Staff Nivel 2", pc: 1500, color: "bg-orange-500" },
  STAFF_NIVEL_3: { label: "Staff Nivel 3 (Game Changer)", pc: 2500, color: "bg-red-500" }
};

export default function ServiceValidationPanel() {
  const [contributions, setContributions] = useState<ServiceContribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    fetchContributions();
  }, []);

  const fetchContributions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/mentor/service-validation");
      const data = await res.json();
      
      if (res.ok) {
        setContributions(data.contributions || []);
      } else {
        toast.error(data.error || "Error al cargar contribuciones");
      }
    } catch (error) {
      toast.error("Error de conexión");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (contributionId: number, action: "APPROVED" | "REJECTED") => {
    if (action === "REJECTED" && !feedback.trim()) {
      toast.error("Por favor proporciona feedback al rechazar");
      return;
    }

    setReviewing(contributionId);

    try {
      const res = await fetch("/api/mentor/service-validation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contributionId,
          action,
          feedbackMentor: feedback || undefined
        })
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(data.message);
        
        // Mostrar logros desbloqueados
        if (data.rewards?.superNovaUnlocked) {
          setTimeout(() => {
            toast.success("🌟 ¡SUPER NOVA DESBLOQUEADA PARA EL ESTUDIANTE!", {
              duration: 6000
            });
          }, 1500);
        }
        
        if (data.rewards?.ambassadorUnlocked) {
          setTimeout(() => {
            toast.success("✨ ¡EMBAJADOR DE LUZ DESBLOQUEADO!", {
              duration: 6000
            });
          }, 2500);
        }

        // Refrescar lista
        fetchContributions();
        setFeedback("");
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      toast.error("Error al procesar la revisión");
      console.error(error);
    } finally {
      setReviewing(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 flex items-center justify-center">
        <div className="text-white text-xl">Cargando contribuciones...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
          <h1 className="text-3xl font-bold text-white mb-2">
            🛡️ Validación de Servicios
          </h1>
          <p className="text-gray-300">
            Revisa y aprueba las contribuciones de servicio de tus estudiantes
          </p>
          <div className="mt-4 text-yellow-400 font-semibold">
            {contributions.length} {contributions.length === 1 ? "contribución pendiente" : "contribuciones pendientes"}
          </div>
        </div>

        {/* Modal de imagen ampliada */}
        {selectedImage && (
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedImage(null)}
          >
            <div className="relative max-w-4xl max-h-[90vh]">
              <Image
                src={selectedImage}
                alt="Evidencia ampliada"
                width={1200}
                height={1200}
                className="rounded-lg object-contain"
              />
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-4 right-4 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

        {/* Lista de contribuciones */}
        {contributions.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-12 border border-white/20 text-center">
            <div className="text-6xl mb-4">✅</div>
            <div className="text-white text-xl font-semibold mb-2">
              ¡Todo revisado!
            </div>
            <div className="text-gray-300">
              No hay contribuciones de servicio pendientes en este momento.
            </div>
          </div>
        ) : (
          <div className="grid gap-6">
            {contributions.map((contribution) => {
              const levelInfo = SERVICE_LEVEL_LABELS[contribution.serviceLevel];
              
              return (
                <div
                  key={contribution.id}
                  className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20"
                >
                  <div className="grid md:grid-cols-2 gap-6">
                    
                    {/* Izquierda: Info del estudiante y servicio */}
                    <div className="space-y-4">
                      
                      {/* Usuario */}
                      <div className="flex items-center gap-3">
                        {contribution.Usuario.imagen ? (
                          <Image
                            src={contribution.Usuario.imagen}
                            alt={contribution.Usuario.nombre}
                            width={50}
                            height={50}
                            className="rounded-full"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-xl">
                            {contribution.Usuario.nombre.charAt(0)}
                          </div>
                        )}
                        <div>
                          <div className="text-white font-semibold text-lg">
                            {contribution.Usuario.nombre}
                          </div>
                          {contribution.Usuario.vision && (
                            <div className="text-gray-300 text-sm">
                              {contribution.Usuario.vision}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Ubicación */}
                      <div className="bg-white/5 p-4 rounded-lg">
                        <div className="text-gray-400 text-sm mb-1">Ubicación</div>
                        <div className="text-white font-semibold">
                          📍 {contribution.Location.name}
                        </div>
                        {contribution.Location.city && (
                          <div className="text-gray-300 text-sm">
                            {contribution.Location.city}
                          </div>
                        )}
                      </div>

                      {/* Nivel de servicio */}
                      <div className="bg-white/5 p-4 rounded-lg">
                        <div className="text-gray-400 text-sm mb-2">Nivel de Servicio</div>
                        <div className={`inline-flex items-center gap-2 px-4 py-2 ${levelInfo.color} text-white font-bold rounded-lg`}>
                          {levelInfo.label}
                        </div>
                        <div className="text-yellow-400 font-bold text-xl mt-2">
                          {levelInfo.pc} PC
                        </div>
                      </div>

                      {/* Descripción */}
                      {contribution.description && (
                        <div className="bg-white/5 p-4 rounded-lg">
                          <div className="text-gray-400 text-sm mb-1">Descripción</div>
                          <div className="text-white">
                            {contribution.description}
                          </div>
                        </div>
                      )}

                      {/* Fecha */}
                      <div className="text-gray-400 text-sm">
                        Enviado: {new Date(contribution.submittedAt).toLocaleString('es-MX')}
                      </div>
                    </div>

                    {/* Derecha: Evidencia y acciones */}
                    <div className="space-y-4">
                      
                      {/* Evidencia */}
                      <div>
                        <div className="text-gray-300 text-sm mb-2 font-medium">
                          Evidencia Fotográfica
                        </div>
                        <div
                          onClick={() => setSelectedImage(contribution.evidenciaUrl)}
                          className="relative aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity border-2 border-white/20"
                        >
                          <Image
                            src={contribution.evidenciaUrl}
                            alt="Evidencia de servicio"
                            fill
                            className="object-cover"
                          />
                          <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-all flex items-center justify-center">
                            <div className="bg-black/50 text-white px-3 py-1 rounded opacity-0 hover:opacity-100 transition-opacity">
                              Click para ampliar
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Feedback */}
                      <div>
                        <label className="text-gray-300 text-sm font-medium mb-2 block">
                          Feedback (Opcional para aprobar, requerido para rechazar)
                        </label>
                        <textarea
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
                          rows={3}
                          placeholder="Escribe tu feedback aquí..."
                        />
                      </div>

                      {/* Botones de acción */}
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleReview(contribution.id, "REJECTED")}
                          disabled={reviewing === contribution.id}
                          className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {reviewing === contribution.id ? "Procesando..." : "❌ Rechazar"}
                        </button>
                        <button
                          onClick={() => handleReview(contribution.id, "APPROVED")}
                          disabled={reviewing === contribution.id}
                          className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {reviewing === contribution.id ? "Procesando..." : "✅ Aprobar"}
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
