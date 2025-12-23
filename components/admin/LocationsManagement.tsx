"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import QRCode from "qrcode";

interface Location {
  id: number;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
  radiusMeter: number;
  nfcTagId: string | null;
  qrCodeHash: string;
  address: string | null;
  city: string | null;
  country: string;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  _count: {
    CheckIns: number;
    UserServiceContributions: number;
  };
}

export default function LocationsManagement() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [selectedQR, setSelectedQR] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    latitude: "",
    longitude: "",
    radiusMeter: "50",
    nfcTagId: "",
    address: "",
    city: "",
    country: "México",
    imageUrl: "",
    isActive: true
  });

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/locations");
      const data = await res.json();
      
      if (res.ok) {
        setLocations(data.locations || []);
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      toast.error("Error al cargar ubicaciones");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.latitude || !formData.longitude) {
      toast.error("Nombre, latitud y longitud son requeridos");
      return;
    }

    try {
      const method = editingLocation ? "PATCH" : "POST";
      const body = editingLocation 
        ? { locationId: editingLocation.id, ...formData }
        : formData;

      const res = await fetch("/api/admin/locations", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(editingLocation ? "Ubicación actualizada" : "Ubicación creada");
        
        if (!editingLocation && data.qrCodeHash) {
          // Generar y mostrar QR
          generateQRCode(data.qrCodeHash);
        }

        fetchLocations();
        resetForm();
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      toast.error("Error al guardar ubicación");
      console.error(error);
    }
  };

  const generateQRCode = async (hash: string) => {
    try {
      const qrDataUrl = await QRCode.toDataURL(hash, {
        width: 512,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff"
        }
      });
      setSelectedQR(qrDataUrl);
    } catch (error) {
      console.error("Error generating QR:", error);
    }
  };

  const handleEdit = (location: Location) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      description: location.description || "",
      latitude: location.latitude.toString(),
      longitude: location.longitude.toString(),
      radiusMeter: location.radiusMeter.toString(),
      nfcTagId: location.nfcTagId || "",
      address: location.address || "",
      city: location.city || "",
      country: location.country,
      imageUrl: location.imageUrl || "",
      isActive: location.isActive
    });
    setShowForm(true);
  };

  const handleDelete = async (locationId: number) => {
    if (!confirm("¿Desactivar esta ubicación?")) return;

    try {
      const res = await fetch(`/api/admin/locations?locationId=${locationId}`, {
        method: "DELETE"
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Ubicación desactivada");
        fetchLocations();
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      toast.error("Error al desactivar ubicación");
      console.error(error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      latitude: "",
      longitude: "",
      radiusMeter: "50",
      nfcTagId: "",
      address: "",
      city: "",
      country: "México",
      imageUrl: "",
      isActive: true
    });
    setEditingLocation(null);
    setShowForm(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-white text-xl">Cargando ubicaciones...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                📍 Gestión de Ubicaciones
              </h1>
              <p className="text-gray-300">
                Administra las sucursales del sistema Quantum Locations
              </p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold rounded-lg transition-all"
            >
              {showForm ? "Cancelar" : "+ Nueva Ubicación"}
            </button>
          </div>
        </div>

        {/* Modal de QR generado */}
        {selectedQR && (
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedQR(null)}
          >
            <div className="bg-white rounded-2xl p-8 max-w-md">
              <h2 className="text-2xl font-bold mb-4 text-center">
                📱 Código QR Generado
              </h2>
              <div className="bg-white p-4 rounded-lg">
                <img src={selectedQR} alt="QR Code" className="w-full" />
              </div>
              <p className="text-sm text-gray-600 mt-4 text-center">
                Guarda este código QR para imprimirlo y colocarlo en la ubicación física
              </p>
              <div className="flex gap-3 mt-6">
                <a
                  href={selectedQR}
                  download="qr-code.png"
                  className="flex-1 text-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all"
                >
                  Descargar
                </a>
                <button
                  onClick={() => setSelectedQR(null)}
                  className="flex-1 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg transition-all"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Formulario */}
        {showForm && (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6">
              {editingLocation ? "Editar Ubicación" : "Nueva Ubicación"}
            </h2>
            <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4">
              
              <div>
                <label className="block text-white mb-2 font-medium">Nombre *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white"
                  placeholder="Ej: Sede Central"
                />
              </div>

              <div>
                <label className="block text-white mb-2 font-medium">Ciudad</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white"
                  placeholder="Ej: Monterrey"
                />
              </div>

              <div>
                <label className="block text-white mb-2 font-medium">Latitud *</label>
                <input
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white"
                  placeholder="25.6866"
                />
              </div>

              <div>
                <label className="block text-white mb-2 font-medium">Longitud *</label>
                <input
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white"
                  placeholder="-100.3161"
                />
              </div>

              <div>
                <label className="block text-white mb-2 font-medium">Radio de tolerancia (metros)</label>
                <input
                  type="number"
                  value={formData.radiusMeter}
                  onChange={(e) => setFormData({ ...formData, radiusMeter: e.target.value })}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white"
                  placeholder="50"
                />
              </div>

              <div>
                <label className="block text-white mb-2 font-medium">NFC Tag ID (opcional)</label>
                <input
                  type="text"
                  value={formData.nfcTagId}
                  onChange={(e) => setFormData({ ...formData, nfcTagId: e.target.value })}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white"
                  placeholder="Identificador del chip NFC"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-white mb-2 font-medium">Dirección</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white"
                  placeholder="Calle, número, colonia"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-white mb-2 font-medium">Descripción</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white"
                  rows={3}
                  placeholder="Descripción de la ubicación"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-white mb-2 font-medium">URL de imagen (opcional)</label>
                <input
                  type="text"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white"
                  placeholder="https://..."
                />
              </div>

              <div className="md:col-span-2 flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-5 h-5"
                />
                <label className="text-white font-medium">Ubicación activa</label>
              </div>

              <div className="md:col-span-2 flex gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold rounded-lg transition-all"
                >
                  {editingLocation ? "Actualizar" : "Crear"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de ubicaciones */}
        <div className="grid md:grid-cols-2 gap-6">
          {locations.map((location) => (
            <div
              key={location.id}
              className={`bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 ${
                !location.isActive ? 'opacity-50' : ''
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {location.name}
                  </h3>
                  <p className="text-gray-300 text-sm">
                    {location.city && `${location.city}, `}{location.country}
                  </p>
                </div>
                <div className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                  location.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {location.isActive ? 'Activa' : 'Inactiva'}
                </div>
              </div>

              {location.description && (
                <p className="text-gray-300 text-sm mb-4">
                  {location.description}
                </p>
              )}

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white/5 p-3 rounded-lg">
                  <div className="text-gray-400 text-xs mb-1">Check-ins</div>
                  <div className="text-white font-bold text-lg">
                    {location._count.CheckIns}
                  </div>
                </div>
                <div className="bg-white/5 p-3 rounded-lg">
                  <div className="text-gray-400 text-xs mb-1">Servicios</div>
                  <div className="text-white font-bold text-lg">
                    {location._count.UserServiceContributions}
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-300 mb-4">
                <div>📍 Coords: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</div>
                <div>📏 Radio: {location.radiusMeter}m</div>
                {location.nfcTagId && <div>💳 NFC: {location.nfcTagId}</div>}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => generateQRCode(location.qrCodeHash)}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all text-sm"
                >
                  Ver QR
                </button>
                <button
                  onClick={() => handleEdit(location)}
                  className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold rounded-lg transition-all text-sm"
                >
                  Editar
                </button>
                {location.isActive && (
                  <button
                    onClick={() => handleDelete(location.id)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-all text-sm"
                  >
                    Desactivar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {locations.length === 0 && (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-12 border border-white/20 text-center">
            <div className="text-6xl mb-4">📍</div>
            <div className="text-white text-xl font-semibold mb-2">
              No hay ubicaciones registradas
            </div>
            <div className="text-gray-300">
              Crea la primera ubicación para comenzar
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
