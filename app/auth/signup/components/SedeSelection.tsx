import { motion } from 'framer-motion';
import Link from 'next/link';
import { Info } from 'lucide-react';
import { tw } from '@/lib/theme/quantum';

interface Organization {
  id: number;
  name: string;
  logoUrl: string | null;
  brandColor: string | null;
  slug: string;
}

interface Props {
  masterOrganization: Organization | null;
  childOrganizations: Organization[];
  loading: boolean;
  error: string;
  onSelectOrganization: (org: Organization) => void;
}

export function SedeSelection({
  masterOrganization,
  childOrganizations,
  loading,
  error,
  onSelectOrganization,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      {/* Header */}
      {masterOrganization && (
        <div className="text-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="inline-block"
          >
            {masterOrganization.logoUrl ? (
              <img
                src={masterOrganization.logoUrl}
                alt={masterOrganization.name}
                className="mx-auto h-24 w-auto rounded-xl shadow-2xl"
              />
            ) : (
              <div
                className="mx-auto h-24 w-24 rounded-xl flex items-center justify-center text-white font-bold text-3xl shadow-2xl"
                style={{
                  background: `linear-gradient(135deg, ${masterOrganization.brandColor || '#00F0FF'}, ${masterOrganization.brandColor || '#0099CC'})`
                }}
              >
                {masterOrganization.name.charAt(0)}
              </div>
            )}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className={`mt-6 text-4xl font-black ${tw.textQuantum}`}
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            {masterOrganization.name}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-slate-400 mt-3 text-lg"
          >
            ¿En qué sucursal quieres acudir?
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="text-slate-500 mt-1 text-sm"
          >
            Selecciona la sede más cercana para continuar
          </motion.p>

          {/* Botón Más Información */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-6"
          >
            <Link
              href={`/org/${masterOrganization.slug}`}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 hover:border-[#00F0FF]/50 rounded-full text-slate-300 hover:text-[#00F0FF] transition-all duration-300 text-sm font-medium group"
            >
              <Info className="w-4 h-4" />
              <span>Más información sobre el programa</span>
              <motion.span
                animate={{ x: [0, 3, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                →
              </motion.span>
            </Link>
          </motion.div>
        </div>
      )}

      {/* Sedes Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="bg-slate-900/50 backdrop-blur-md border border-slate-800/50 rounded-2xl p-8"
      >
        {error && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm mb-6"
          >
            {error}
          </motion.div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className={`animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 ${tw.borderQuantum} mx-auto mb-4`}></div>
            <p className="text-slate-400">Buscando próximo programa...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {childOrganizations.map((org, index) => (
              <motion.button
                key={org.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                whileHover={{ scale: 1.02, y: -4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelectOrganization(org)}
                className="group relative bg-slate-800/30 hover:bg-slate-800/50 border-2 border-slate-700 hover:border-[#00F0FF]/50 rounded-xl p-6 transition-all duration-300"
                style={{
                  boxShadow: '0 0 0 rgba(0, 240, 255, 0)',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 240, 255, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 0 rgba(0, 240, 255, 0)';
                }}
              >
                <div className="flex items-center gap-4">
                  {org.logoUrl ? (
                    <img
                      src={org.logoUrl}
                      alt={org.name}
                      className="h-14 w-14 rounded-lg object-cover"
                    />
                  ) : (
                    <div
                      className="h-14 w-14 rounded-lg flex items-center justify-center text-white font-bold text-xl"
                      style={{
                        background: `linear-gradient(135deg, ${org.brandColor || '#00F0FF'}, ${org.brandColor || '#0099CC'})`
                      }}
                    >
                      {org.name.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 text-left">
                    <h3 className={`text-lg font-bold text-white group-hover:${tw.textQuantum} transition-colors`}>
                      {org.name}
                    </h3>
                    <p className="text-slate-400 text-sm flex items-center gap-2">
                      <span>Registrarme en esta sucursal</span>
                      <motion.span
                        animate={{ x: [0, 5, 0] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                      >
                        →
                      </motion.span>
                    </p>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}

        {childOrganizations.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏢</div>
            <p className="text-slate-400 text-lg mb-2">No hay sedes disponibles</p>
            <p className="text-slate-500 text-sm">
              Por favor contacta al administrador del sistema
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
