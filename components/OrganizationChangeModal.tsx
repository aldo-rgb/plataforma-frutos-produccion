'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Building2, ArrowRight, AlertTriangle, Check, X, Calendar, User } from 'lucide-react';

interface ChangeRequest {
  previousOrganization: {
    name: string;
    logoUrl: string | null;
  } | null;
  newOrganization: {
    name: string;
    logoUrl: string | null;
  };
  newVision: {
    nombre: string;
    descripcion: string | null;
  };
  requestedBy: {
    nombre: string;
    email: string;
  };
  requestedAt: string;
}

export default function OrganizationChangeModal() {
  const { data: session } = useSession();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [changeRequest, setChangeRequest] = useState<ChangeRequest | null>(null);

  useEffect(() => {
    if (session?.user) {
      checkPendingChange();
    }
  }, [session]);

  const checkPendingChange = async () => {
    try {
      const res = await fetch('/api/student/organization-change');
      const data = await res.json();

      if (data.success && data.hasPendingChange) {
        setChangeRequest(data.changeRequest);
        setShow(true);
      }
    } catch (error) {
      console.error('Error al verificar cambio pendiente:', error);
    }
  };

  const handleAccept = async () => {
    if (!changeRequest) return;

    setLoading(true);
    try {
      const res = await fetch('/api/student/organization-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept' }),
      });

      const data = await res.json();

      if (data.success) {
        alert(data.message);
        window.location.reload(); // Recargar para actualizar sesión
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error al aceptar cambio:', error);
      alert('Error al procesar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!changeRequest) return;

    const confirm = window.confirm(
      '¿Estás seguro de rechazar este cambio? Permanecerás en tu organización actual.'
    );

    if (!confirm) return;

    setLoading(true);
    try {
      const res = await fetch('/api/student/organization-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' }),
      });

      const data = await res.json();

      if (data.success) {
        alert(data.message);
        window.location.reload();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error al rechazar cambio:', error);
      alert('Error al procesar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  if (!show || !changeRequest) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="w-8 h-8" />
            <h2 className="text-2xl font-bold">Solicitud de Cambio de Organización</h2>
          </div>
          <p className="text-blue-100">
            Se ha solicitado transferirte a una nueva organización
          </p>
        </div>

        <div className="p-6">
          {/* Advertencia */}
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-800 mb-1">Importante</h3>
                <p className="text-yellow-700 text-sm">
                  Esta decisión es <strong>irreversible</strong>. Al aceptar, serás transferido
                  permanentemente a la nueva organización y tendrás acceso a sus recursos.
                </p>
              </div>
            </div>
          </div>

          {/* Comparación de Organizaciones */}
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            {/* Organización Actual */}
            <div className="border-2 border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-500 mb-2">Organización Actual</div>
              <div className="flex flex-col items-center text-center">
                {changeRequest.previousOrganization?.logoUrl ? (
                  <img
                    src={changeRequest.previousOrganization.logoUrl}
                    alt="Logo actual"
                    className="w-16 h-16 object-contain mb-3"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-3">
                    <Building2 className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                <h3 className="font-semibold text-gray-800">
                  {changeRequest.previousOrganization?.name || 'Sin organización'}
                </h3>
              </div>
            </div>

            {/* Flecha */}
            <div className="flex items-center justify-center">
              <ArrowRight className="w-8 h-8 text-blue-500" />
            </div>

            {/* Nueva Organización */}
            <div className="border-2 border-blue-500 rounded-lg p-4 bg-blue-50">
              <div className="text-sm text-blue-600 font-medium mb-2">Nueva Organización</div>
              <div className="flex flex-col items-center text-center">
                {changeRequest.newOrganization.logoUrl ? (
                  <img
                    src={changeRequest.newOrganization.logoUrl}
                    alt="Logo nuevo"
                    className="w-16 h-16 object-contain mb-3"
                  />
                ) : (
                  <div className="w-16 h-16 bg-blue-200 rounded-full flex items-center justify-center mb-3">
                    <Building2 className="w-8 h-8 text-blue-600" />
                  </div>
                )}
                <h3 className="font-semibold text-blue-800">
                  {changeRequest.newOrganization.name}
                </h3>
              </div>
            </div>
          </div>

          {/* Detalles de la Visión */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-800 mb-3">Visión/Programa Destino</h3>
            <div className="space-y-2">
              <div>
                <span className="text-sm text-gray-500">Nombre:</span>
                <p className="font-medium text-gray-800">{changeRequest.newVision.nombre}</p>
              </div>
              {changeRequest.newVision.descripcion && (
                <div>
                  <span className="text-sm text-gray-500">Descripción:</span>
                  <p className="text-gray-700">{changeRequest.newVision.descripcion}</p>
                </div>
              )}
            </div>
          </div>

          {/* Información del Solicitante */}
          <div className="border-t border-gray-200 pt-4 mb-6">
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <div>
                  <span className="text-gray-500">Solicitado por:</span>
                  <p className="font-medium text-gray-800">{changeRequest.requestedBy.nombre}</p>
                  <p className="text-gray-600">{changeRequest.requestedBy.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <div>
                  <span className="text-gray-500">Fecha de solicitud:</span>
                  <p className="font-medium text-gray-800">
                    {new Date(changeRequest.requestedAt).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleReject}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-5 h-5" />
              Rechazar Cambio
            </button>
            <button
              onClick={handleAccept}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-5 h-5" />
              {loading ? 'Procesando...' : 'Aceptar Cambio'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
