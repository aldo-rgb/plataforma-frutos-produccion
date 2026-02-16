import { motion, AnimatePresence } from 'framer-motion';
import { tw } from '@/lib/theme/quantum';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';

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
  location: string | null;
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
  expectations: string;
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
  locale: 'es' | 'en';
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
  locale,
}: Props) {
  const t = useTranslations('signup');
  const [searchingReferral, setSearchingReferral] = useState(false);
  const [referralSuggestions, setReferralSuggestions] = useState<ReferralUser[]>([]);
  const [referralSearchText, setReferralSearchText] = useState('');
  const [selectedReferral, setSelectedReferral] = useState<ReferralUser | null>(referralUser);
  const [showNoPasteModal, setShowNoPasteModal] = useState(false);
  const [ageWarning, setAgeWarning] = useState<'none' | 'needs_tutor' | 'too_young'>('none');
  const [showScrollWarning, setShowScrollWarning] = useState(false);

  // Validar edad cuando cambia
  useEffect(() => {
    const age = parseInt(formData.age);
    if (!isNaN(age)) {
      if (age < 17) {
        setAgeWarning('too_young');
      } else if (age === 17) {
        setAgeWarning('needs_tutor');
      } else {
        setAgeWarning('none');
      }
    } else {
      setAgeWarning('none');
    }
  }, [formData.age]);
  
  const handleChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const target = e.target;
    if (target instanceof HTMLInputElement && target.type === 'checkbox') {
      setFormData(prev => ({ ...prev, [field]: target.checked }));
    } else {
      setFormData(prev => ({ ...prev, [field]: target.value }));
    }
  };

  // Prevenir paste en email confirm
  const handleEmailConfirmPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    setShowNoPasteModal(true);
  };

  const daysUntilStart = nextVision ? Math.ceil(
    (new Date(nextVision.startDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  ) : 0;

  // Buscar referidos por nombre
  useEffect(() => {
    const searchReferrals = async () => {
      if (referralSearchText.trim().length < 2) {
        setReferralSuggestions([]);
        return;
      }

      setSearchingReferral(true);
      try {
        const response = await fetch(
          `/api/public/search-referrals?query=${encodeURIComponent(referralSearchText)}&orgId=${selectedOrganization?.id}`
        );
        if (response.ok) {
          const data = await response.json();
          setReferralSuggestions(data.users || []);
        }
      } catch (error) {
        console.error('Error searching referrals:', error);
      } finally {
        setSearchingReferral(false);
      }
    };

    const debounce = setTimeout(searchReferrals, 300);
    return () => clearTimeout(debounce);
  }, [referralSearchText, selectedOrganization]);

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
              <div className={`${tw.textQuantum} text-sm font-medium mb-2`}>
                🎯 {locale === 'es' ? 'Próximo Programa Básico' : 'Next Basic Program'}
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">{nextVision.nombre}</h2>
              <div className={`text-3xl font-black ${tw.textQuantum} mb-2`} style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {new Date(nextVision.startDate).toLocaleDateString(locale === 'es' ? 'es-MX' : 'en-US', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </div>
              {nextVision.location && (
                <p className="text-slate-300 text-sm mb-3 flex items-center gap-2">
                  <span>📍</span>
                  <span>{nextVision.location}</span>
                </p>
              )}
              <div className="flex items-center justify-center gap-4 text-sm text-slate-400">
                <div className="flex items-center gap-1">
                  <span>📅</span>
                  <span>{locale === 'es' ? 'Inicia en' : 'Starts in'} {daysUntilStart} {locale === 'es' ? 'días' : 'days'}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-red-900/30 border-2 border-red-500/50 rounded-xl p-6 mt-4">
              <div className="text-red-400 text-sm font-medium mb-2">
                ⚠️ {locale === 'es' ? 'Sin Programa Disponible' : 'No Program Available'}
              </div>
              <h2 className="text-xl font-bold text-white mb-2">
                {locale === 'es' ? 'No hay entrenamientos activos' : 'No active training programs'}
              </h2>
              <p className="text-red-300 text-sm mb-3">
                {locale === 'es' 
                  ? 'Actualmente no hay programas de entrenamiento disponibles en esta sede. Por favor, contacta al coordinador para más información.'
                  : 'There are currently no training programs available at this location. Please contact the coordinator for more information.'
                }
              </p>
              <p className="text-slate-400 text-xs">
                {locale === 'es' 
                  ? '💡 El registro solo está disponible cuando hay un programa activo.'
                  : '💡 Registration is only available when there is an active program.'
                }
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
                onChange={() => {}} // readonly field
                readOnly
                className="bg-slate-800/50 cursor-not-allowed"
              />
            </div>

            {/* Warning de edad */}
            {ageWarning === 'needs_tutor' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-yellow-500/10 border border-yellow-500/50 rounded-xl"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <p className="text-yellow-400 font-semibold">
                      {locale === 'es' ? 'Requiere carta de padre o tutor' : 'Requires parental or guardian letter'}
                    </p>
                    <p className="text-yellow-300/80 text-sm mt-1">
                      {locale === 'es' 
                        ? 'Al ser menor de 18 años, necesitarás presentar una carta de autorización firmada por tu padre, madre o tutor legal para completar tu inscripción.'
                        : 'As you are under 18, you will need to submit a signed authorization letter from your parent or legal guardian to complete your registration.'}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {ageWarning === 'too_young' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🚫</span>
                  <div>
                    <p className="text-red-400 font-semibold">
                      {locale === 'es' ? 'No puedes registrarte en este momento' : 'You cannot register at this time'}
                    </p>
                    <p className="text-red-300/80 text-sm mt-1">
                      {locale === 'es' 
                        ? 'Este entrenamiento es para mayores de 17 años. ¡Te invitamos a esperar nuestro próximo entrenamiento especial para TEENS! 🚀'
                        : 'This training is for people 17 and older. We invite you to wait for our next special TEENS training! 🚀'}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            <InputField
              label={t('personalInfo.phone')}
              type="tel"
              value={formData.phone}
              onChange={handleChange('phone')}
              placeholder={t('personalInfo.phonePlaceholder')}
              required
            />

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">
                {t('personalInfo.contactPreference')} <span className="text-[#00F0FF]">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { value: '5am-10am', label: t('personalInfo.timeSlots.earlyMorning') },
                  { value: '10am-3pm', label: t('personalInfo.timeSlots.midday') },
                  { value: '3pm-7pm', label: t('personalInfo.timeSlots.afternoon') },
                  { value: '7pm-10pm', label: t('personalInfo.timeSlots.night') },
                ].map((slot) => (
                  <button
                    key={slot.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, contactPreference: slot.value }))}
                    className={`px-4 py-3 rounded-lg border-2 transition-all font-medium ${
                      formData.contactPreference === slot.value
                        ? 'border-[#00F0FF] bg-[#00F0FF]/10 text-[#00F0FF] shadow-[0_0_15px_rgba(0,240,255,0.3)]'
                        : 'border-slate-700/50 bg-slate-800/30 text-slate-300 hover:border-slate-600 hover:bg-slate-800/50'
                    }`}
                  >
                    {slot.label}
                  </button>
                ))}
              </div>
            </div>
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

          {/* Sección: Expectativas */}
          <FormSection title={t('expectations.title')}>
            <TextareaField
              label={t('expectations.question')}
              value={formData.expectations}
              onChange={handleChange('expectations')}
              placeholder={t('expectations.placeholder')}
              required
            />
          </FormSection>

          {/* Sección: Referral */}
          <FormSection title={t('referral.title')}>
            <div className="relative">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {t('referral.code')}
              </label>
              
              {selectedReferral ? (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-4 bg-slate-800/50 border-2 border-[#00F0FF]/50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">👤</span>
                    <div>
                      <p className={`font-semibold ${tw.textQuantum}`}>{selectedReferral.nombre}</p>
                      <p className="text-xs text-slate-400">
                        {selectedReferral.referralCode ? `Código: ${selectedReferral.referralCode}` : 'Participante registrado'}
                      </p>
                      {referralLocked && (
                        <p className="text-xs text-yellow-400 mt-1 flex items-center gap-1">
                          🔒 {t('referral.locked')}
                        </p>
                      )}
                    </div>
                  </div>
                  {!referralLocked && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedReferral(null);
                        setReferralSearchText('');
                        setFormData(prev => ({ ...prev, referralCode: '' }));
                      }}
                      className="text-slate-400 hover:text-red-400 transition-colors"
                    >
                      ✕
                    </button>
                  )}
                </motion.div>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    value={referralSearchText}
                    onChange={(e) => {
                      setReferralSearchText(e.target.value);
                      setFormData(prev => ({ ...prev, referralCode: e.target.value }));
                    }}
                    placeholder="Quien te invitó?..."
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#00F0FF]/50 focus:border-[#00F0FF]/50 transition-all"
                  />
                  {searchingReferral && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-[#00F0FF]"></div>
                    </div>
                  )}
                  
                  {/* Sugerencias */}
                  {referralSuggestions.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute z-50 w-full mt-2 bg-slate-900 border border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto"
                    >
                      {referralSuggestions.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => {
                            setSelectedReferral(user);
                            setReferralSearchText(user.nombre);
                            setFormData(prev => ({ ...prev, referralCode: user.referralCode || user.nombre }));
                            setReferralSuggestions([]);
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-slate-800 transition-colors border-b border-slate-800 last:border-b-0 flex items-center gap-3"
                        >
                          <span className="text-xl">👤</span>
                          <div>
                            <p className="text-white font-medium">{user.nombre}</p>
                            <p className="text-xs text-slate-400">
                              {user.referralCode ? `Código: ${user.referralCode}` : 'Participante registrado'}
                            </p>
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  )}
                  
                  {referralSearchText.length >= 2 && !searchingReferral && referralSuggestions.length === 0 && (
                    <p className="mt-2 text-xs text-slate-400">
                      No se encontraron coincidencias. El texto se registrará tal como lo escribiste.
                    </p>
                  )}
                </div>
              )}
            </div>
          </FormSection>

          {/* Sección: Legal */}
          <FormSection title={t('legal.title')}>
            <p className="text-sm text-slate-300 mb-3 font-medium">{t('legal.intro')}</p>
            <div
              className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-5 h-80 overflow-y-auto text-sm text-slate-300 space-y-4"
              onScroll={onLegalScroll}
            >
              {/* Política de Reembolso */}
              <div>
                <h4 className={`font-bold text-base mb-2 ${tw.textQuantum}`}>{t('legal.refundTitle')}</h4>
                <p className="font-semibold mb-2">{t('legal.refundIntro')}</p>
                <ul className="list-none space-y-2 pl-4">
                  <li className="flex items-start gap-2">
                    <span className="text-[#00F0FF] mt-1">1.</span>
                    <span>{t('legal.refund1')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#00F0FF] mt-1">2.</span>
                    <span className="font-semibold text-yellow-400">{t('legal.refund2')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#00F0FF] mt-1">3.</span>
                    <span className="font-semibold text-green-400">{t('legal.refund3')}</span>
                  </li>
                </ul>
              </div>

              {/* Detalles del Entrenamiento */}
              <div className="border-t border-slate-700 pt-4">
                <h4 className={`font-bold text-base mb-2 ${tw.textQuantum}`}>{t('legal.scheduleTitle')}</h4>
                <p className="font-semibold mb-3">{t('legal.scheduleIntro')}</p>
                <div className="space-y-2 pl-4">
                  <div className="flex items-start gap-2">
                    <span className="text-[#00F0FF] font-bold">•</span>
                    <p><span className="font-semibold">{t('legal.friday')}</span></p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#00F0FF] font-bold">•</span>
                    <p><span className="font-semibold">{t('legal.saturday')}</span></p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#00F0FF] font-bold">•</span>
                    <p><span className="font-semibold">{t('legal.sunday')}</span></p>
                  </div>
                </div>
              </div>

              {/* Advertencia Importante */}
              <div className="border-t border-slate-700 pt-4">
                <div className="bg-red-900/20 border-l-4 border-red-500 p-4 rounded">
                  <p className="font-bold text-red-400">{t('legal.integralWarning')}</p>
                </div>
              </div>

              {/* Espaciador final para asegurar scroll */}
              <div className="h-4"></div>
            </div>
            
            {!scrolledLegal && (
              <p className="text-xs text-yellow-400 mt-2 flex items-center gap-2">
                <span>⚠️</span>
                <span>{t('legal.scrollWarning')}</span>
              </p>
            )}
            
            <div 
              className="relative mt-4"
              onClick={() => {
                if (!scrolledLegal) {
                  setShowScrollWarning(true);
                  // Auto-hide after 4 seconds
                  setTimeout(() => setShowScrollWarning(false), 4000);
                }
              }}
            >
              <label className={`flex items-center gap-3 group ${scrolledLegal ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                <input
                  type="checkbox"
                  checked={formData.acceptTerms}
                  onChange={handleChange('acceptTerms')}
                  disabled={!scrolledLegal}
                  className="w-5 h-5 rounded border-2 border-slate-600 bg-slate-800/50 checked:bg-[#00F0FF] checked:border-[#00F0FF] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                />
                <span className={`text-sm transition-colors ${scrolledLegal ? 'text-slate-300 group-hover:text-white' : 'text-slate-500'}`}>
                  {t('legal.checkbox')}
                </span>
              </label>
              
              <AnimatePresence>
                {showScrollWarning && !scrolledLegal && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -5, scale: 0.95 }}
                    className="absolute left-0 right-0 mt-3 p-4 bg-red-900/90 border border-red-500 rounded-lg shadow-lg shadow-red-500/20"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl flex-shrink-0">📜</span>
                      <div>
                        <p className="font-bold text-red-200 mb-1">
                          {t('legal.mustScrollTitle')}
                        </p>
                        <p className="text-sm text-red-300">
                          {t('legal.mustScrollMessage')}
                        </p>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowScrollWarning(false);
                        }}
                        className="text-red-400 hover:text-white transition-colors ml-auto"
                      >
                        ✕
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
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

          {/* Notificación de Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </motion.div>
          )}

          {/* Submit */}
          <motion.button
            type="submit"
            disabled={submitting || ageWarning === 'too_young' || !nextVision}
            whileHover={{ scale: submitting || ageWarning === 'too_young' || !nextVision ? 1 : 1.02 }}
            whileTap={{ scale: submitting || ageWarning === 'too_young' || !nextVision ? 1 : 0.98 }}
            className="w-full py-4 rounded-xl font-bold text-lg text-[#050B14] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: (ageWarning === 'too_young' || !nextVision)
                ? 'linear-gradient(135deg, #666 0%, #444 100%)'
                : 'linear-gradient(135deg, #00F0FF 0%, #0099CC 100%)',
              boxShadow: (ageWarning === 'too_young' || !nextVision)
                ? 'none'
                : '0 0 30px rgba(0, 240, 255, 0.4)',
            }}
          >
            {submitting 
              ? t('submitting') 
              : !nextVision 
                ? (locale === 'es' ? '🚫 Sin programa disponible' : '🚫 No program available')
                : ageWarning === 'too_young' 
                  ? (locale === 'es' ? '🚫 Registro no disponible' : '🚫 Registration unavailable') 
                  : t('submit')}
          </motion.button>
        </form>
      </motion.div>

      {/* Modal de No Pegar */}
      {showNoPasteModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setShowNoPasteModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="bg-slate-900 border-2 border-[#00F0FF]/50 rounded-2xl p-8 max-w-md w-full shadow-[0_0_50px_rgba(0,240,255,0.3)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-yellow-500/20 border-2 border-yellow-500 mb-4">
                  <span className="text-5xl">⚠️</span>
                </div>
                <h3 className={`text-2xl font-bold ${tw.textQuantum} mb-2`} style={{ fontFamily: 'Orbitron, sans-serif' }}>
                  Atención
                </h3>
                <p className="text-slate-300 text-lg">
                  {t('contact.noPaste')}
                </p>
              </div>
              
              <button
                onClick={() => setShowNoPasteModal(false)}
                className="w-full py-3 px-6 rounded-lg font-bold text-[#050B14] transition-all hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, #00F0FF 0%, #0099CC 100%)',
                  boxShadow: '0 0 20px rgba(0, 240, 255, 0.4)',
                }}
              >
                Entendido
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
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
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-2">
        {label} {required && <span className="text-[#00F0FF]">*</span>}
      </label>
      <div className="relative">
        <input
          type={isPassword && showPassword ? 'text' : type}
          value={value}
          onChange={onChange}
          onPaste={onPaste}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          readOnly={readOnly}
          min={min}
          className={`w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#00F0FF]/50 focus:border-[#00F0FF]/50 transition-all ${isPassword ? 'pr-12' : ''} ${className || ''}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#00F0FF] transition-colors"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        )}
      </div>
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
