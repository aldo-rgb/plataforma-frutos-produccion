import { motion } from 'framer-motion';
import { tw } from '@/lib/theme/quantum';
import Link from 'next/link';

interface Organization {
  id: number;
  name: string;
  logoUrl: string | null;
  brandColor: string | null;
}

interface NextVision {
  id: number;
  nombre: string;
  startDate: string;
  descripcion: string | null;
  maxParticipantes: number;
  currentParticipantes: number;
}

interface ReferralUser {
  id: number;
  nombre: string;
  referralCode: string;
}

interface FormData {
  firstName: string;
  lastName: string;
  nickname: string;
  profession: string;
  birthdate: string;
  age: string;
  phone: string;
  contactPreference: string;
  email: string;
  confirmEmail: string;
  children: string;
  goal1: string;
  goal2: string;
  goal3: string;
  referralCode: string;
  acceptTerms: boolean;
  password: string;
  confirmPassword: string;
}

interface Props {
  selectedOrganization: Organization | null;
  nextVision: NextVision | null;
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  referralUser: ReferralUser | null;
  referralLocked: boolean;
  scrolledLegal: boolean;
  error: string;
  submitting: boolean;
  onBack: () => void;
  onLegalScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  t: any;
}

export function RegistrationForm({
  selectedOrganization,
  nextVision,
  formData,
  setFormData,
  referralUser,
  referralLocked,
  scrolledLegal,
  error,
  submitting,
  onBack,
  onLegalScroll,
  onSubmit,
  t,
}: Props) {
  const handleChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    if (e.target instanceof HTMLInputElement && e.target.type === 'checkbox') {
      setFormData(prev => ({ ...prev, [field]: e.target.checked }));
    } else {
      setFormData(prev => ({ ...prev, [field]: e.target.value }));
    }
  };

  // Prevenir paste en email confirm
  const handleEmailConfirmPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    alert(t('contact.noPaste'));
  };

  const daysUntilStart = nextVision ? Math.ceil(
    (new Date(nextVision.startDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  ) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Sede seleccionada */}
      {selectedOrganization && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-900/50 backdrop-blur-md border border-slate-800/50 rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {selectedOrganization.logoUrl ? (
                <img
                  src={selectedOrganization.logoUrl}
                  alt={selectedOrganization.name}
                  className="h-12 w-12 rounded-lg object-cover"
                />
              ) : (
                <div
                  className="h-12 w-12 rounded-lg flex items-center justify-center text-white font-bold"
                  style={{
                    background: `linear-gradient(135deg, ${selectedOrganization.brandColor || '#00F0FF'}, ${selectedOrganization.brandColor || '#0099CC'})`
                  }}
                >
                  {selectedOrganization.name.charAt(0)}
                </div>
              )}
              <div>
                <h3 className="text-lg font-bold text-white">{selectedOrganization.name}</h3>
                <p className="text-slate-400 text-sm">Sede seleccionada</p>
              </div>
            </div>
            <button
              onClick={onBack}
              className="text-slate-400 hover:text-[#00F0FF] text-sm transition-colors"
            >
              Cambiar sede
            </button>
          </div>

          {/* Próximo básico */}
          {nextVision ? (
            <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-2 border-[#00F0FF]/30 rounded-xl p-6 mt-4">
              <div className={`${tw.textQuantum} text-sm font-medium mb-2`}>🎯 Próximo Programa Básico</div>
              <h2 className="text-2xl font-bold text-white mb-2">{nextVision.nombre}</h2>
              <div className={`text-3xl font-black ${tw.textQuantum} mb-2`} style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {new Date(nextVision.startDate).toLocaleDateString('es-MX', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </div>
              {nextVision.descripcion && (
                <p className="text-slate-300 text-sm mb-3">{nextVision.descripcion}</p>
              )}
              <div className="flex items-center justify-center gap-4 text-sm text-slate-400">
                <div className="flex items-center gap-1">
                  <span>👥</span>
                  <span>{nextVision.currentParticipantes} / {nextVision.maxParticipantes}</span>
                </div>
                <div className="h-4 w-px bg-slate-600"></div>
                <div className="flex items-center gap-1">
                  <span>📅</span>
                  <span>Inicia en {daysUntilStart} días</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-800/50 border-2 border-slate-700/30 rounded-xl p-6 mt-4">
              <div className="text-slate-400 text-sm font-medium mb-2">📅 Próximas Convocatorias</div>
              <h2 className="text-xl font-bold text-white mb-2">Aún no hay fechas programadas</h2>
              <p className="text-slate-400 text-sm">
                Te notificaremos cuando se abran nuevos grupos básicos
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* Formulario principal */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-slate-900/50 backdrop-blur-md border border-slate-800/50 rounded-2xl p-8"
      >
        <div className="mb-6 text-center">
          <h2 className={`text-3xl font-bold ${tw.textQuantum} mb-2`} style={{ fontFamily: 'Orbitron, sans-serif' }}>
            {t('title')}
          </h2>
          <p className="text-slate-400">{t('subtitle')}</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-8">
          {error && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm"
            >
              {error}
            </motion.div>
          )}

          {/* Sección: Datos Personales */}
          <FormSection title={t('personalInfo.title')}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                label={t('personalInfo.firstName')}
                value={formData.firstName}
                onChange={handleChange('firstName')}
                required
              />
              <InputField
                label={t('personalInfo.lastName')}
                value={formData.lastName}
                onChange={handleChange('lastName')}
                required
              />
            </div>

            <InputField
              label={t('personalInfo.nickname')}
              value={formData.nickname}
              onChange={handleChange('nickname')}
              placeholder={t('personalInfo.nicknamePlaceholder')}
              required
            />

            <InputField
              label={t('personalInfo.profession')}
              value={formData.profession}
              onChange={handleChange('profession')}
              placeholder={t('personalInfo.professionPlaceholder')}
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <InputField
                  label={t('personalInfo.birthdate')}
                  type="date"
                  value={formData.birthdate}
                  onChange={handleChange('birthdate')}
                  required
                />
              </div>
              <InputField
                label={t('personalInfo.age')}
                value={formData.age}
                readOnly
                className="bg-slate-800/50 cursor-not-allowed"
              />
            </div>

            <InputField
              label={t('personalInfo.phone')}
              type="tel"
              value={formData.phone}
              onChange={handleChange('phone')}
              placeholder={t('personalInfo.phonePlaceholder')}
              required
            />

            <SelectField
              label={t('personalInfo.contactPreference')}
              value={formData.contactPreference}
              onChange={handleChange('contactPreference')}
              required
            >
              <option value="">Selecciona un horario</option>
              <option value="5am-10am">{t('personalInfo.timeSlots.earlyMorning')}</option>
              <option value="10am-3pm">{t('personalInfo.timeSlots.midday')}</option>
              <option value="3pm-7pm">{t('personalInfo.timeSlots.afternoon')}</option>
              <option value="7pm-10pm">{t('personalInfo.timeSlots.night')}</option>
            </SelectField>
          </FormSection>

          {/* Sección: Contacto */}
          <FormSection title={t('contact.title')}>
            <InputField
              label={t('contact.email')}
              type="email"
              value={formData.email}
              onChange={handleChange('email')}
              placeholder={t('contact.emailPlaceholder')}
              required
            />
            <InputField
              label={t('contact.confirmEmail')}
              type="email"
              value={formData.confirmEmail}
              onChange={handleChange('confirmEmail')}
              onPaste={handleEmailConfirmPaste}
              placeholder={t('contact.confirmEmailPlaceholder')}
              required
            />
          </FormSection>

          {/* Sección: Familia */}
          <FormSection title={t('family.title')}>
            <InputField
              label={t('family.children')}
              type="number"
              min="0"
              value={formData.children}
              onChange={handleChange('children')}
              placeholder={t('family.childrenPlaceholder')}
            />
          </FormSection>

          {/* Sección: Metas */}
          <FormSection title={t('goals.title')}>
            <TextareaField
              label={t('goals.goal1')}
              value={formData.goal1}
              onChange={handleChange('goal1')}
              placeholder={t('goals.goal1Placeholder')}
              required
            />
            <TextareaField
              label={t('goals.goal2')}
              value={formData.goal2}
              onChange={handleChange('goal2')}
              placeholder={t('goals.goal2Placeholder')}
            />
            <TextareaField
              label={t('goals.goal3')}
              value={formData.goal3}
              onChange={handleChange('goal3')}
              placeholder={t('goals.goal3Placeholder')}
            />
          </FormSection>

          {/* Sección: Referral */}
          {referralUser || !referralLocked ? (
            <FormSection title={t('referral.title')}>
              <div className="relative">
                <InputField
                  label={t('referral.code')}
                  value={formData.referralCode}
                  onChange={handleChange('referralCode')}
                  placeholder={t('referral.codePlaceholder')}
                  disabled={referralLocked}
                  className={referralLocked ? 'bg-slate-800/50 cursor-not-allowed' : ''}
                />
                {referralUser && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mt-2 flex items-center gap-2 text-sm ${tw.textQuantum}`}
                  >
                    <span>🔒</span>
                    <span>Invitado por: <strong>{referralUser.nombre}</strong></span>
                  </motion.div>
                )}
              </div>
            </FormSection>
          ) : null}

          {/* Sección: Legal */}
          <FormSection title={t('legal.title')}>
            <div
              className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-4 h-40 overflow-y-auto text-sm text-slate-300 space-y-2"
              onScroll={onLegalScroll}
            >
              <p>{t('legal.content')}</p>
              <p className="font-semibold mt-4">{t('legal.refundPolicy')}</p>
              <p className="text-slate-400 text-xs">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
              </p>
              <p className="font-semibold mt-4">{t('legal.transferPolicy')}</p>
              <p className="text-slate-400 text-xs">
                Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
              </p>
              <p className="font-semibold mt-4">{t('legal.guarantee')}</p>
              <p className="text-slate-400 text-xs">
                Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
              </p>
            </div>
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={formData.acceptTerms}
                onChange={handleChange('acceptTerms')}
                className="w-5 h-5 rounded border-2 border-slate-600 bg-slate-800/50 checked:bg-[#00F0FF] checked:border-[#00F0FF] transition-colors"
                required
              />
              <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                {t('legal.checkbox')}
              </span>
            </label>
          </FormSection>

          {/* Sección: Credenciales */}
          <FormSection title={t('credentials.title')}>
            <InputField
              label={t('credentials.password')}
              type="password"
              value={formData.password}
              onChange={handleChange('password')}
              placeholder={t('credentials.passwordPlaceholder')}
              required
            />
            <InputField
              label={t('credentials.confirmPassword')}
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange('confirmPassword')}
              placeholder={t('credentials.confirmPasswordPlaceholder')}
              required
            />
          </FormSection>

          {/* Submit */}
          <motion.button
            type="submit"
            disabled={submitting}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-4 rounded-xl font-bold text-lg text-[#050B14] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(135deg, #00F0FF 0%, #0099CC 100%)',
              boxShadow: '0 0 30px rgba(0, 240, 255, 0.4)',
            }}
          >
            {submitting ? t('submitting') : t('submit')}
          </motion.button>

          <div className="text-center text-sm text-slate-400">
            {t('hasAccount')}{' '}
            <Link href="/auth/signin" className={`${tw.textQuantum} hover:underline font-medium`}>
              {t('signIn')}
            </Link>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// Componentes auxiliares
function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h3 className={`text-xl font-bold ${tw.textQuantum}`} style={{ fontFamily: 'Orbitron, sans-serif' }}>
        {title}
      </h3>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}

interface InputFieldProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPaste?: (e: React.ClipboardEvent) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
  min?: string;
}

function InputField({
  label,
  value,
  onChange,
  onPaste,
  type = 'text',
  placeholder,
  required,
  disabled,
  readOnly,
  className,
  min,
}: InputFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-2">
        {label} {required && <span className="text-[#00F0FF]">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        onPaste={onPaste}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        readOnly={readOnly}
        min={min}
        className={`w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#00F0FF]/50 focus:border-[#00F0FF]/50 transition-all ${className || ''}`}
      />
    </div>
  );
}

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  required?: boolean;
  children: React.ReactNode;
}

function SelectField({ label, value, onChange, required, children }: SelectFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-2">
        {label} {required && <span className="text-[#00F0FF]">*</span>}
      </label>
      <select
        value={value}
        onChange={onChange}
        required={required}
        className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00F0FF]/50 focus:border-[#00F0FF]/50 transition-all"
      >
        {children}
      </select>
    </div>
  );
}

interface TextareaFieldProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  required?: boolean;
}

function TextareaField({ label, value, onChange, placeholder, required }: TextareaFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-2">
        {label} {required && <span className="text-[#00F0FF]">*</span>}
      </label>
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        rows={3}
        className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#00F0FF]/50 focus:border-[#00F0FF]/50 transition-all resize-none"
      />
    </div>
  );
}
