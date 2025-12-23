import { SocialFeed } from '@/components/social/SocialFeed';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Muro de la Excelencia | F.R.U.T.O.S.',
  description: 'Contenido épico curado por IA. Solo los mejores logros aparecen aquí.',
};

export default function MuroExcelenciaPage() {
  return <SocialFeed />;
}
