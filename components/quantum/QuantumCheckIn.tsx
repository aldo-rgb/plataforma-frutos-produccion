"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "react-hot-toast";
import { Html5QrcodeScanner } from "html5-qrcode";
import confetti from "canvas-confetti";

interface CheckInResponse {
  success: boolean;
  error?: string;
  checkIn?: any;
  location?: {
    id: number;
    name: string;
    distance: number;
  };
  rewards?: {
    xpGranted: number;
    newLevel: number | null;
  };
  badges?: {
    explorerBadgeUnlocked: boolean;
  };
  message?: string;
}

export default function QuantumCheckIn() {
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [checkInHistory, setCheckInHistory] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [askingForService, setAskingForService] = useState(false);
  const [selectedServiceLevel, setSelectedServiceLevel] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [lastCheckInLocation, setLastCheckInLocation] = useState<number | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  // Solicitar ubicación del usuario al montar el componente
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          toast.error("Por favor activa la ubicación para usar esta función");
          console.error("Geolocation error:", error);
        }
      );
    }
  }, []);

  // Cargar historial de check-ins
  useEffect(() => {
    fetchCheckInHistory();
  }, []);

  // Inicializar scanner cuando se activa scanning
  useEffect(() => {
    if (scanning && !scannerRef.current) {
      const html5QrcodeScanner = new Html5QrcodeScanner(
        "qr-reader",
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        false
      );

      html5QrcodeScanner.render(
        (decodedText) => {
          // QR escaneado exitosamente
          html5QrcodeScanner.clear();
          scannerRef.current = null;
          performCheckIn(decodedText, "QR");
        },
        (errorMessage) => {
          // Error de escaneo - silenciar
        }
      );

      scannerRef.current = html5QrcodeScanner;
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
    };
  }, [scanning]);

  const fetchCheckInHistory = async () => {
    try {
      const res = await fetch("/api/quantum/check-in");
      const data = await res.json();
      
      if (res.ok) {
        setCheckInHistory(data.checkIns || []);
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Error fetching check-ins:", error);
    }
  };

  const performCheckIn = async (identifier: string, type: "QR" | "NFC") => {
    if (!userLocation) {
      toast.error("Ubicación no disponible. Por favor activa el GPS.");
      return;
    }

    setLoading(true);
    setScanning(false);

    try {
      const res = await fetch("/api/quantum/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationIdentifier: identifier,
          identifierType: type,
          userLatitude: userLocation.lat,
          userLongitude: userLocation.lng
        })
      });

      const data: CheckInResponse = await res.json();

      if (res.ok && data.success) {
        // 🎉 Check-in exitoso
        toast.success(data.message || "Check-in exitoso");
        
        // Confetti celebration
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });

        // Si subió de nivel
        if (data.rewards?.newLevel) {
          setTimeout(() => {
            toast.success(`🎖️ ¡NIVEL ${data.rewards!.newLevel}!`, {
              duration: 5000
            });
            confetti({
              particleCount: 200,
              spread: 100,
              origin: { y: 0.4 }
            });
          }, 1500);
        }

        // Si desbloqueó explorador
        if (data.badges?.explorerBadgeUnlocked) {
          setTimeout(() => {
            toast.success("🏆 ¡EXPLORADOR SUPREMO DESBLOQUEADO! +5000 PC", {
              duration: 6000
            });
          }, 3000);
        }

        // Guardar location para preguntar por servicio
        if (data.location) {
          setLastCheckInLocation(data.location.id);
          setAskingForService(true);
        }
        
        // Refrescar historial
        fetchCheckInHistory();
      } else {
        toast.error(data.error || "Error en el check-in");
      }
    } catch (error: any) {
      toast.error("Error de conexión");
      console.error("Check-in error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleServiceSubmit = async () => {
    if (!selectedServiceLevel || !evidenceFile) {
      toast.error("Debes seleccionar un nivel de servicio y subir evidencia");
      return;
    }

    setLoading(true);

    try {
      // 1. Subir imagen a Cloudinary
      const formData = new FormData();
      formData.append("file", evidenceFile);
      formData.append("upload_preset", "frutos_evidencias");

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData
        }
      );

      const uploadData = await uploadRes.json();

      if (!uploadData.secure_url) {
        throw new Error("Error al subir imagen");
      }

      // 2. Enviar contribución de servicio
      const res = await fetch("/api/quantum/service-contribution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId: lastCheckInLocation,
          serviceLevel: selectedServiceLevel,
          evidenciaUrl: uploadData.secure_url,
          description: serviceDescription
        })
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(data.message);
        toast.success(`Potencial recompensa: ${data.potentialReward} PC`, {
          duration: 5000
        });
        
        // Reset form
        setAskingForService(false);
        setSelectedServiceLevel("");
        setServiceDescription("");
        setEvidenceFile(null);
        setLastCheckInLocation(null);
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      toast.error("Error al enviar evidencia de servicio");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const serviceLevels = [
    { value: "CONTRIBUCION_NIVEL_1", label: "Contribución Nivel 1", pc: 200 },
    { value: "CONTRIBUCION_NIVEL_2", label: "Contribución Nivel 2", pc: 500 },
    { value: "SERVICIO_FIN_SEMANA", label: "Servicio Fin de Semana", pc: 800 },
    { value: "STAFF_NIVEL_1", label: "Staff Nivel 1", pc: 1000 },
    { value: "STAFF_NIVEL_2", label: "Staff Nivel 2", pc: 1500 },
    { value: "STAFF_NIVEL_3", label: "Staff Nivel 3 (Game Changer)", pc: 2500 }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
          <h1 className="text-3xl font-bold text-white mb-2">
            📍 Quantum Check-in
          </h1>
          <p className="text-gray-300">
            Escanea el código QR o NFC en la sucursal para registrar tu presencia
          </p>
        </div>

        {/* Stats Card */}
        {stats && (
          <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur-md rounded-2xl p-6 border border-yellow-500/30">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-400">{stats.totalCheckIns}</div>
                <div className="text-sm text-gray-300">Check-ins totales</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400">{stats.locationsVisited}</div>
                <div className="text-sm text-gray-300">Ubicaciones visitadas</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-400">{stats.totalLocations}</div>
                <div className="text-sm text-gray-300">Total de sedes</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-400">{stats.explorerProgress}%</div>
                <div className="text-sm text-gray-300">Progreso explorador</div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Servicio */}
        {askingForService && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-purple-900 to-blue-900 rounded-2xl p-6 max-w-lg w-full border border-white/20">
              <h2 className="text-2xl font-bold text-white mb-4">
                ¿Vienes a Servir hoy? 🛡️
              </h2>
              <p className="text-gray-300 mb-6">
                Si vienes a servir, selecciona tu rol y sube una evidencia para ganar Puntos Cuánticos masivos.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-white mb-2 font-medium">
                    Nivel de Servicio
                  </label>
                  <select
                    value={selectedServiceLevel}
                    onChange={(e) => setSelectedServiceLevel(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white"
                  >
                    <option value="">Selecciona...</option>
                    {serviceLevels.map(level => (
                      <option key={level.value} value={level.value} className="bg-gray-800">
                        {level.label} - {level.pc} PC
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-white mb-2 font-medium">
                    Descripción (Opcional)
                  </label>
                  <textarea
                    value={serviceDescription}
                    onChange={(e) => setServiceDescription(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white"
                    rows={3}
                    placeholder="Describe tu actividad de servicio..."
                  />
                </div>

                <div>
                  <label className="block text-white mb-2 font-medium">
                    Evidencia Fotográfica (Obligatoria)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Foto con chaleco, en acción, o con el equipo
                  </p>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setAskingForService(false);
                      setSelectedServiceLevel("");
                      setServiceDescription("");
                      setEvidenceFile(null);
                    }}
                    className="flex-1 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-all"
                  >
                    Solo visita
                  </button>
                  <button
                    onClick={handleServiceSubmit}
                    disabled={loading || !selectedServiceLevel || !evidenceFile}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Enviando..." : "Enviar evidencia"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scanner */}
        {!scanning && (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <button
              onClick={() => setScanning(true)}
              disabled={!userLocation || loading}
              className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {!userLocation ? "📍 Activando ubicación..." : loading ? "Procesando..." : "📷 Escanear Código QR"}
            </button>
          </div>
        )}

        {scanning && (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <div className="mb-4">
              <button
                onClick={() => {
                  setScanning(false);
                  if (scannerRef.current) {
                    scannerRef.current.clear().catch(console.error);
                    scannerRef.current = null;
                  }
                }}
                className="text-white hover:text-gray-300 transition-colors"
              >
                ← Cancelar
              </button>
            </div>
            <div id="qr-reader" className="rounded-lg overflow-hidden"></div>
          </div>
        )}

        {/* Check-in History */}
        {checkInHistory.length > 0 && (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <h2 className="text-xl font-bold text-white mb-4">
              📜 Historial de Check-ins
            </h2>
            <div className="space-y-3">
              {checkInHistory.slice(0, 10).map((checkIn) => (
                <div
                  key={checkIn.id}
                  className="bg-white/5 p-4 rounded-lg border border-white/10"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-white font-semibold">
                        {checkIn.Location.name}
                      </div>
                      <div className="text-gray-400 text-sm">
                        {checkIn.Location.city} • {checkIn.distance}m de distancia
                      </div>
                      <div className="text-gray-500 text-xs mt-1">
                        {new Date(checkIn.createdAt).toLocaleString('es-MX')}
                      </div>
                    </div>
                    <div className="text-green-400 font-bold">
                      +{checkIn.xpGranted} XP
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
