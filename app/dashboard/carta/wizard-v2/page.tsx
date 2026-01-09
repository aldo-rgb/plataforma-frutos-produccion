'use client';

import { ProtectedModulePage } from '@/components/ui/LockedModuleOverlay';
import CartaWizardRelacional from '@/components/dashboard/CartaWizardRelacional';

export default function CartaWizard2Page() {
  return (
    <ProtectedModulePage module="carta" fallbackHref="/dashboard">
      <CartaWizardRelacional />
    </ProtectedModulePage>
  );
}
