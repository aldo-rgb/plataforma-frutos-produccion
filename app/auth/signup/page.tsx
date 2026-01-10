'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { NextIntlClientProvider } from 'next-intl';
import { quantumTheme, tw } from '@/lib/theme/quantum';
import { SedeSelection } from './components/SedeSelection';
import { RegistrationForm } from './components/RegistrationForm';
import esMessages from '@/messages/es.json';
import enMessages from '@/messages/en.json';

interface Organization {
  id: number;
  name: string;
  logoUrl: string | null;
  brandColor: string | null;
  slug: string;
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

export default function SignUpPageQuantum() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgCode = searchParams.get('org');
  const refCode = searchParams.get('ref');

  // Estados UI
  const [locale, setLocale] = useState<'es' | 'en'>('es');
  const [step, setStep] = useState<'sede' | 'registro'>('sede');
  const [loading, setLoading] = useState(true);
  const [loadingVision, setLoadingVision] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const messages = locale === 'es' ? esMessages : enMessages;
  const [scrolledLegal, setScrolledLegal] = useState(false);

  // Estados de datos
  const [masterOrganization, setMasterOrganization] = useState<Organization | null>(null);
  const [childOrganizations, setChildOrganizations] = useState<Organization[]>([]);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [nextVision, setNextVision] = useState<NextVision | null>(null);
  const [referralUser, setReferralUser] = useState<ReferralUser | null>(null);
  const [referralLocked, setReferralLocked] = useState(false);

  // Form data expandido
  const [formData, setFormData] = useState({
    // Personal
    firstName: '',
    lastName: '',
    nickname: '',
    profession: '',
    birthdate: '',
    age: '',
    phone: '',
    contactPreference: '',
    
    // Email
    email: '',
    confirmEmail: '',
    
    // Familia
    children: '0',
    
    // Metas
    goal1: '',
    goal2: '',
    goal3: '',
    
    // Expectativas
    expectations: '',
    
    // Referral
    referralCode: '',
    
    // Legal
    acceptTerms: false,
    
    // Credentials
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (orgCode) {
      fetchOrganizationData();
    } else {
      setLoading(false);
    }
  }, [orgCode]);

  useEffect(() => {
    if (refCode) {
      fetchReferralUser(refCode);
    }
  }, [refCode]);

  useEffect(() => {
    // Calcular edad automáticamente
    if (formData.birthdate) {
      const birthDate = new Date(formData.birthdate);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      setFormData(prev => ({ ...prev, age: age.toString() }));
    }
  }, [formData.birthdate]);

  const fetchReferralUser = async (code: string) => {
    try {
      // Limpiar el código: tomar solo la parte alfanumérica antes de espacios/emojis
      const cleanCode = code
        .split(' ')[0]
        .replace(/[^\w]/g, '')
        .toUpperCase();
      
      if (!cleanCode || cleanCode.length < 5) {
        console.warn('Invalid referral code:', code);
        return;
      }

      const res = await fetch(`/api/public/referral/${encodeURIComponent(cleanCode)}`);
      const data = await res.json();
      
      if (data.success) {
        setReferralUser(data.user);
        setFormData(prev => ({ ...prev, referralCode: data.user.referralCode }));
        setReferralLocked(true);
      }
    } catch (error) {
      console.error('Error fetching referral:', error);
    }
  };

  const fetchOrganizationData = async () => {
    try {
      const res = await fetch(`/api/public/organization/${orgCode}`);
      const data = await res.json();

      if (data.success) {
        setMasterOrganization(data.masterOrganization);
        setChildOrganizations(data.childOrganizations || []);
        
        if (data.childOrganizations && data.childOrganizations.length === 1) {
          handleSelectOrganization(data.childOrganizations[0]);
        }
      } else {
        setError(data.error || 'Error al cargar la información');
      }
    } catch (error) {
      console.error('Error fetching organization:', error);
      setError('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOrganization = async (org: Organization) => {
    setSelectedOrganization(org);
    setLoadingVision(true);
    setError('');

    try {
      const res = await fetch(`/api/public/organization/${org.id}/next-vision`);
      const data = await res.json();

      if (data.success) {
        setNextVision(data.nextVision);
        setStep('registro');
      } else {
        setNextVision(null);
        setStep('registro');
      }
    } catch (error) {
      console.error('Error fetching vision:', error);
      setNextVision(null);
      setStep('registro');
    } finally {
      setLoadingVision(false);
    }
  };

  const handleLegalScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const isScrolledToBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 10;
    if (isScrolledToBottom && !scrolledLegal) {
      setScrolledLegal(true);
    }
  };

  const validateForm = () => {
    // Validar campos requeridos
    if (!formData.firstName || !formData.lastName || !formData.nickname || 
        !formData.profession || !formData.birthdate || !formData.phone ||
        !formData.contactPreference || !formData.email || !formData.confirmEmail ||
        !formData.goal1 || !formData.expectations || !formData.password || !formData.confirmPassword) {
      setError(messages.signup.errors.allFieldsRequired);
      return false;
    }

    // Validar edad
    const age = parseInt(formData.age);
    if (isNaN(age) || age < 17) {
      setError(locale === 'es' 
        ? 'Debes tener al menos 17 años para registrarte. ¡Espera nuestro próximo entrenamiento TEENS!' 
        : 'You must be at least 17 years old to register. Wait for our next TEENS training!');
      return false;
    }

    // Validar emails
    if (formData.email !== formData.confirmEmail) {
      setError(messages.signup.errors.emailMismatch);
      return false;
    }

    // Validar contraseñas
    if (formData.password !== formData.confirmPassword) {
      setError(messages.signup.errors.passwordMismatch);
      return false;
    }

    if (formData.password.length < 6) {
      setError(messages.signup.errors.passwordTooShort);
      return false;
    }

    // Validar términos
    if (!formData.acceptTerms) {
      setError(messages.signup.errors.mustAcceptTerms);
      return false;
    }

    // Validar organización
    if (!selectedOrganization) {
      setError(messages.signup.errors.selectOrganization);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        nombre: `${formData.firstName} ${formData.lastName}`,
        apodo: formData.nickname,
        telefono: formData.phone,
        horarioLlamada: formData.contactPreference,
        email: formData.email,
        password: formData.password,
        organizationId: selectedOrganization!.id,
        organizationName: selectedOrganization!.name,
        visionId: nextVision?.id || null,
        visionName: nextVision?.nombre || null,
        referralCode: formData.referralCode || null,
        profession: formData.profession,
        birthdate: formData.birthdate,
        children: parseInt(formData.children),
        goals: [formData.goal1, formData.goal2, formData.goal3].filter(Boolean),
        expectations: formData.expectations,
      };

      console.log('📤 Guardando datos de registro y redirigiendo a checkout:', payload);

      // Guardar datos en sessionStorage para el checkout
      sessionStorage.setItem('pendingRegistration', JSON.stringify(payload));

      // Redirigir al checkout
      router.push('/checkout');

    } catch (error) {
      console.error('Error:', error);
      setError('Error al procesar el registro');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <NextIntlClientProvider locale={locale} messages={messages}>
        <div className={`min-h-screen ${tw.bgPrimary} flex items-center justify-center`}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <div className={`animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 ${tw.borderQuantum} mx-auto mb-4`}></div>
            <p className="text-slate-400">{messages.common.loading}</p>
          </motion.div>
        </div>
      </NextIntlClientProvider>
    );
  }

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className={`min-h-screen ${tw.bgPrimary} relative overflow-hidden`}>
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-20 -right-40 w-96 h-96 bg-[${quantumTheme.colors.quantum[500]}] opacity-10 blur-[100px] rounded-full`}></div>
        <div className={`absolute bottom-20 -left-40 w-96 h-96 bg-[${quantumTheme.colors.magic[500]}] opacity-10 blur-[100px] rounded-full`}></div>
      </div>

      {/* Language Switch */}
      <div className="absolute top-6 right-6 z-50">
        <div className="flex items-center gap-2 bg-slate-900/50 backdrop-blur-md border border-slate-700/50 rounded-full p-1">
          <button
            onClick={() => setLocale('es')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              locale === 'es'
                ? `${tw.textQuantum} bg-slate-800/80 ${tw.glowQuantum}`
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            ES
          </button>
          <button
            onClick={() => setLocale('en')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              locale === 'en'
                ? `${tw.textQuantum} bg-slate-800/80 ${tw.glowQuantum}`
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            EN
          </button>
        </div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12 max-w-4xl">
        <AnimatePresence mode="wait">
          {step === 'sede' ? (
            <SedeSelection
              key="sede"
              masterOrganization={masterOrganization}
              childOrganizations={childOrganizations}
              loading={loadingVision}
              error={error}
              onSelectOrganization={handleSelectOrganization}
            />
          ) : (
            <RegistrationForm
              key="registro"
              selectedOrganization={selectedOrganization}
              nextVision={nextVision}
              formData={formData}
              setFormData={setFormData}
              referralUser={referralUser}
              referralLocked={referralLocked}
              scrolledLegal={scrolledLegal}
              error={error}
              submitting={submitting}
              locale={locale}
              onBack={() => {
                setStep('sede');
                setSelectedOrganization(null);
                setNextVision(null);
              }}
              onLegalScroll={handleLegalScroll}
              onSubmit={handleSubmit}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
    </NextIntlClientProvider>
  );
}
