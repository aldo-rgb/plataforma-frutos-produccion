import { Metadata } from 'next';
import CartaWizardRelacional from '@/components/dashboard/CartaWizardRelacional';

export const metadata: Metadata = {
  title: 'Carta F.R.U.T.O.S. 2.0 | Plataforma Frutos',
  description: 'Constructor de carta con múltiples acciones por área'
};

export default function CartaWizard2Page() {
  return <CartaWizardRelacional />;
}
