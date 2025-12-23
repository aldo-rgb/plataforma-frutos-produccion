/**
 * CARTA APPROVAL LOGIC - Granular Feedback Loop System
 * 
 * This module contains the business logic for the mentor review cycle:
 * - Individual item approval/rejection
 * - Conditional editing permissions
 * - Status transitions
 */

export type EstadoCarta = 'BORRADOR' | 'EN_REVISION' | 'CAMBIOS_REQUERIDOS' | 'APROBADA' | 'RECHAZADA';
export type EstadoItem = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ReviewableItem {
  status: EstadoItem;
  mentorFeedback?: string | null;
  value: string;
}

export interface CartaStatus {
  estado: EstadoCarta;
  autorizadoMentor: boolean;
  autorizadoCoord: boolean;
}

/**
 * Determines if a user can edit a specific field based on carta and item status
 * 
 * RULES:
 * 1. If carta is AUTHORIZED (APROBADA), nobody can edit anything
 * 2. If carta is UNDER_REVIEW (EN_REVISION), user must wait
 * 3. If carta is CHANGES_REQUESTED (CAMBIOS_REQUERIDOS), user can ONLY edit rejected items
 * 4. If carta is DRAFT (BORRADOR), everything is editable
 */
export function isFieldEditable(
  cartaStatus: EstadoCarta,
  itemStatus: EstadoItem
): boolean {
  // 1. Authorized letter - locked forever
  if (cartaStatus === 'APROBADA') {
    return false;
  }

  // 2. Under review - wait for mentor
  if (cartaStatus === 'EN_REVISION') {
    return false;
  }

  // 3. Changes requested - only edit rejected items
  if (cartaStatus === 'CAMBIOS_REQUERIDOS') {
    return itemStatus === 'REJECTED';
  }

  // 4. Draft - everything editable
  return true;
}

/**
 * Calculates the carta status after mentor review submission
 * 
 * LOGIC:
 * - If ALL items are APPROVED → estado = APROBADA
 * - If AT LEAST ONE item is REJECTED → estado = CAMBIOS_REQUERIDOS
 * - Otherwise → stays in EN_REVISION (incomplete review)
 */
export function calculateCartaStatusAfterReview(
  itemStatuses: EstadoItem[]
): EstadoCarta {
  const hasRejected = itemStatuses.some(status => status === 'REJECTED');
  const allApproved = itemStatuses.every(status => status === 'APPROVED');
  
  if (hasRejected) {
    return 'CAMBIOS_REQUERIDOS';
  }
  
  if (allApproved) {
    return 'APROBADA';
  }
  
  // Still pending items - stay in review
  return 'EN_REVISION';
}

/**
 * Determines visual styling class for a field based on its status
 */
export function getFieldStatusClass(status: EstadoItem): string {
  switch (status) {
    case 'APPROVED':
      return 'bg-green-500/5 border-green-500/30 text-green-100/80';
    case 'REJECTED':
      return 'bg-red-500/10 border-red-500 border-2 text-white';
    case 'PENDING':
    default:
      return 'bg-slate-800 border-slate-700 text-white';
  }
}

/**
 * Returns icon and label for item status
 */
export function getStatusIndicator(status: EstadoItem): { icon: string; label: string; color: string } {
  switch (status) {
    case 'APPROVED':
      return { icon: '✅', label: 'Aprobado', color: 'text-green-400' };
    case 'REJECTED':
      return { icon: '❌', label: 'Rechazado', color: 'text-red-400' };
    case 'PENDING':
    default:
      return { icon: '⏳', label: 'Pendiente', color: 'text-yellow-400' };
  }
}

/**
 * Validates if a user can submit carta for review
 * Only allow if all previously rejected items have been modified
 */
export function canResubmitForReview(
  cartaStatus: EstadoCarta,
  hasModifiedRejectedItems: boolean
): boolean {
  if (cartaStatus !== 'CAMBIOS_REQUERIDOS') {
    return true; // Can always submit if not in correction mode
  }
  
  return hasModifiedRejectedItems; // Only allow if user fixed rejected items
}

/**
 * Checks if user should see "blocked" state for entire carta
 */
export function isCartaFullyBlocked(cartaStatus: EstadoCarta): boolean {
  return cartaStatus === 'APROBADA' || cartaStatus === 'EN_REVISION';
}

/**
 * Gets human-readable carta status message
 */
export function getCartaStatusMessage(cartaStatus: EstadoCarta): { 
  message: string; 
  color: string; 
  icon: string;
  action?: string;
} {
  switch (cartaStatus) {
    case 'BORRADOR':
      return {
        message: 'Tu carta está en modo borrador',
        color: 'text-slate-400',
        icon: '📝',
        action: 'Completa y envía para revisión'
      };
    case 'EN_REVISION':
      return {
        message: 'Tu carta está siendo revisada por tu mentor',
        color: 'text-yellow-400',
        icon: '⏳',
        action: 'Espera la retroalimentación'
      };
    case 'CAMBIOS_REQUERIDOS':
      return {
        message: 'Tu mentor requiere cambios en algunos puntos',
        color: 'text-orange-400',
        icon: '🔧',
        action: 'Edita los campos marcados en rojo'
      };
    case 'APROBADA':
      return {
        message: '¡Tu carta ha sido aprobada!',
        color: 'text-green-400',
        icon: '🎉',
        action: 'Versión autorizada - Sin cambios permitidos'
      };
    case 'RECHAZADA':
      return {
        message: 'Tu carta fue rechazada completamente',
        color: 'text-red-400',
        icon: '❌',
        action: 'Contacta a tu mentor para más detalles'
      };
  }
}
