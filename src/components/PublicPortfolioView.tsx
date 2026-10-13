import React, { useState, useEffect, useRef } from 'react';
import {
  Lock,
  Mail,
  Download,
  CheckCircle2,
  ShieldAlert,
  Clock,
  FileText,
  ArrowLeft,
  Camera,
  Upload,
  Briefcase,
  MapPin,
  Car,
  Award,
  Sparkles,
  Phone,
  Calendar,
  Building,
  Check,
  X,
  User,
  Share2,
  Copy,
  Globe2,
  QrCode,
  Smartphone,
  ExternalLink,
} from 'lucide-react';
import QRCode from 'qrcode';
import { fetchPublicShareByToken } from '../firebase';
import { CandidateProfile, LanguageCode, ExperienceItem } from '../types';
import { exportProfileCvToDocx, exportProfileCvToPdf } from '../utils/documentExport';
import { CONFIRMED_DEFAULT_EXPERIENCES } from '../utils/compatibility';

import defaultPortraitImg from '../assets/images/pilar_portrait_1791833419169.jpg';
import heroCoverImg from '../assets/images/web_cv_hero_1791833430543.jpg';
import iaCertBadgeImg from '../assets/images/ia_cert_badge_1791833440341.jpg';

const DEFAULT_PORTRAIT = defaultPortraitImg;
const HERO_COVER_IMAGE = heroCoverImg;
const IA_CERT_BADGE_IMAGE = iaCertBadgeImg;

interface PublicPortfolioViewProps {
  shareToken?: string;
  previewProfile?: CandidateProfile;
  previewCompanyName?: string;
  previewGreeting?: string;
  previewRequiresPin?: boolean;
  previewPinCode?: string;
  previewExpiresAtIso?: string;
  previewAllowCvDownload?: boolean;
  isOwnerPreview?: boolean;
  onExitPreview?: () => void;
  onOpenQuickSend?: () => void;
  onUpdatePhoto?: (newPhotoUrl: string) => void;
  onTogglePhotoVisibility?: (show: boolean) => void;
  onToggleEmailVisibility?: (show: boolean) => void;
  language?: LanguageCode;
}

export const PublicPortfolioView: React.FC<PublicPortfolioViewProps> = ({
  shareToken,
  previewProfile,
  previewCompanyName,
  previewGreeting,
  previewRequiresPin = false,
  previewPinCode = '',
  previewExpiresAtIso,
  previewAllowCvDownload = true,
  isOwnerPreview = false,
  onExitPreview,
  onOpenQuickSend,
  onUpdatePhoto,
  onTogglePhotoVisibility,
  onToggleEmailVisibility,
  language = 'es',
}) => {
  const [loading, setLoading] = useState(!isOwnerPreview);
  const [shareData, setShareData] = useState<any>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinUnlocked, setPinUnlocked] = useState(!previewRequiresPin);
  const [pinError, setPinError] = useState('');
  const [copyLinkSuccessToast, setCopyLinkSuccessToast] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // Photo management state
  const [currentPhoto, setCurrentPhoto] = useState<string>(
    previewProfile?.photoUrl ||
      (typeof window !== 'undefined' && localStorage.getItem('empleo10_photoUrl')) ||
      DEFAULT_PORTRAIT
  );
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [tempPhotoPreview, setTempPhotoPreview] = useState<string>('');
  const [photoUrlInput, setPhotoUrlInput] = useState<string>('');
  const [photoSuccessToast, setPhotoSuccessToast] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (previewProfile?.photoUrl) {
      setCurrentPhoto(previewProfile.photoUrl);
    }
  }, [previewProfile?.photoUrl]);

  useEffect(() => {
    if (isOwnerPreview && previewProfile) {
      setShareData({
        token: shareToken || 'preview',
        companyName: previewCompanyName || 'Empresa Destinataria',
        isActive: previewProfile.publicWebEnabled,
        requiresPin: previewRequiresPin,
        pinCode: previewPinCode,
        expiresAtIso: previewExpiresAtIso || '2099-12-31',
        allowCvDownload: previewAllowCvDownload,
        publicProfile: {
          ...previewProfile,
          customGreeting: previewGreeting,
        },
      });
      setPinUnlocked(!previewRequiresPin);
      setLoading(false);
      return;
    }

    if (shareToken) {
      setLoading(true);
      fetchPublicShareByToken(shareToken)
        .then((res) => {
          setShareData(res);
          if (res?.publicProfile?.photoUrl) {
            setCurrentPhoto(res.publicProfile.photoUrl);
          }
          if (res && !res.requiresPin) {
            setPinUnlocked(true);
          } else {
            setPinUnlocked(false);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [
    shareToken,
    isOwnerPreview,
    previewProfile,
    previewCompanyName,
    previewGreeting,
    previewRequiresPin,
    previewPinCode,
    previewExpiresAtIso,
    previewAllowCvDownload,
  ]);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const webShareUrl =
    shareData?.token && shareData.token !== 'preview'
      ? `${origin}/?share=${encodeURIComponent(shareData.token)}`
      : typeof window !== 'undefined' && window.location.href.includes('?share=')
        ? window.location.href
        : shareToken && shareToken !== 'preview'
          ? `${origin}/?share=${encodeURIComponent(shareToken)}`
          : `${origin}/?share=pilar-fernandez`;

  useEffect(() => {
    if (!webShareUrl) return;
    QRCode.toDataURL(webShareUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#0F172A',
        light: '#FFFFFF',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Error generando QR:', err));
  }, [webShareUrl]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-8 text-center">
          <div className="h-6 w-48 bg-slate-200 rounded mx-auto mb-3 animate-pulse" />
          <div className="h-4 w-64 bg-slate-100 rounded mx-auto animate-pulse" />
        </div>
      </div>
    );
  }

  const todayIso = new Date().toISOString().slice(0, 10);
  const isExpired =
    shareData?.expiresAtIso && shareData.expiresAtIso.slice(0, 10) < todayIso;

  if (!shareData || !shareData.isActive || isExpired) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-8 text-center">
          <ShieldAlert className="w-10 h-10 text-red-600 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-900 mb-2">
            {language === 'en'
              ? 'Link Unavailable or Revoked'
              : 'Enlace Profesional No Disponible o Caducado'}
          </h1>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            {isExpired
              ? 'Este enlace personalizado para empresa ha superado su fecha de vigencia configurada.'
              : 'La titular ha desactivado temporalmente su presentación pública o ha revocado el acceso a este enlace.'}
          </p>
          {isOwnerPreview && onExitPreview && (
            <button
              onClick={onExitPreview}
              className="px-4 py-2 text-xs font-semibold bg-[#0F172A] text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              Volver al panel privado
            </button>
          )}
        </div>
      </div>
    );
  }

  if (shareData.requiresPin && !pinUnlocked) {
    const handleVerifyPin = (e: React.FormEvent) => {
      e.preventDefault();
      if (pinInput.trim() === String(shareData.pinCode || '').trim()) {
        setPinUnlocked(true);
        setPinError('');
      } else {
        setPinError('Código de acceso incorrecto. Compruébalo en el correo recibido.');
      }
    };

    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Lock className="w-6 h-6 text-[#0D9488]" />
            <h1 className="text-lg font-bold text-slate-900">
              Acceso Protegido · {shareData.companyName}
            </h1>
          </div>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            Esta presentación profesional contiene un código de acceso proporcionado a{' '}
            <strong className="text-slate-900">{shareData.companyName}</strong>. Introduce la clave
            para consultar el perfil y descargar el CV autorizado.
          </p>
          <form onSubmit={handleVerifyPin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Código o contraseña de acceso
              </label>
              <input
                type="password"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="Introduce el código..."
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0D9488]"
                required
              />
              {pinError && <p className="text-xs text-red-600 mt-1.5">{pinError}</p>}
            </div>
            <div className="flex items-center justify-between gap-3">
              {isOwnerPreview && onExitPreview && (
                <button
                  type="button"
                  onClick={onExitPreview}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Salir de vista previa
                </button>
              )}
              <button
                type="submit"
                className="ml-auto px-5 py-2.5 text-xs font-semibold text-white bg-[#0F172A] rounded-lg hover:bg-slate-800 transition-colors"
              >
                Desbloquear Presentación
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const rawHeadline = shareData.publicProfile?.headline || previewProfile?.headline || '';
  const truthfulHeadline =
    rawHeadline &&
    !rawHeadline.toLowerCase().includes('administración, atención') &&
    !rawHeadline.toLowerCase().includes('experiencia en administración')
      ? rawHeadline
      : 'Atención al Cliente, Trato con Personas y Tareas de Apoyo · Formación en Auxiliar Administrativo · Certificada en IA (120h Cámara de Toledo)';

  const truthfulGoal =
    'Busco una oportunidad laboral en la que pueda aportar mi experiencia profesional, especialmente en puestos de atención al cliente y trato directo con las personas. Cuento con formación en Auxiliar Administrativo y conocimientos informáticos y de gestión que deseo seguir desarrollando. Me interesa aprender, asumir nuevas responsabilidades y crecer profesionalmente en una empresa.';

  const profile: CandidateProfile = {
    fullName: shareData.publicProfile?.fullName || 'Pilar Fernández Almaraz',
    headline: truthfulHeadline,
    residence: 'Santo Domingo-Caudilla, Toledo, España',
    priorityLocations: shareData.publicProfile?.priorityLocations || [
      'Santo Domingo-Caudilla',
      'Torrijos',
      'Alcabón',
      'Novés',
    ],
    maxPriorityRadiusKm: 8,
    targetRoles: [
      'Atención al cliente y usuarios',
      'Trato directo con personas',
      'Tareas de apoyo operativo',
      'Recepción y gestión de citas',
      'Auxiliar administrativo (para desarrollar mi formación)',
      'Atención telefónica y soporte',
    ],
    drivingLicenseAndOwnCar: Boolean(
      shareData.publicProfile?.drivingLicenseAndOwnCar ?? true
    ),
    acceptedSchedules: shareData.publicProfile?.acceptedSchedules || [
      'Jornada completa de 8 horas',
    ],
    acceptedModalities: shareData.publicProfile?.acceptedModalities || [
      'Presencial',
      'Híbrido',
      'Remoto',
    ],
    professionalGoal:
      shareData.publicProfile?.professionalGoal &&
      !shareData.publicProfile.professionalGoal.includes('experiencia en administración')
        ? shareData.publicProfile.professionalGoal
        : truthfulGoal,
    publicContactEmail:
      shareData.publicProfile?.publicContactEmail || 'pilarfernandezalmaraz81@gmail.com',
    publicContactPhoneOptional: shareData.publicProfile?.publicContactPhoneOptional || '',
    showPublicEmail: shareData.publicProfile?.showPublicEmail ?? (previewProfile?.showPublicEmail ?? true),
    showPublicPhoto: shareData.publicProfile?.showPublicPhoto ?? (previewProfile?.showPublicPhoto ?? true),
    photoUrl: currentPhoto,
    publicWebEnabled: true,
    allowSearchEngineIndexing: false,
    languages: shareData.publicProfile?.languages || previewProfile?.languages || [
      { language: 'Español', level: 'Lengua materna / Nativo (Excelente comunicación verbal y escrita)' },
    ],
    experiences: (() => {
      const shareExps = shareData.publicProfile?.experiences;
      if (Array.isArray(shareExps) && shareExps.length > 0) return shareExps;
      const prevExps = previewProfile?.experiences;
      if (Array.isArray(prevExps) && prevExps.length > 0) return prevExps;
      return CONFIRMED_DEFAULT_EXPERIENCES;
    })(),
    education: [
      {
        id: 'edu-ia-camara-toledo',
        title: 'Certificado en Inteligencia Artificial Aplicada (120 horas)',
        institution: 'Cámara Oficial de Comercio, Industria y Servicios de Toledo',
        yearOrHours: '120 horas certificadas',
        verifiedByOwner: true,
      },
      {
        id: 'edu-admin-confirmada',
        title: 'Formación de Auxiliar Administrativo',
        institution: 'Formación profesional y de gestión acreditada',
        yearOrHours: 'Acreditada en CV',
        verifiedByOwner: true,
      },
    ],
    confirmedSkills: [
      'Atención presencial, telefónica y al público con trato empático, cercano y cordial',
      'Trato directo con las personas, escucha activa y vocación de servicio',
      'Conocimientos formativos de Auxiliar Administrativo (facturación, albaranes y archivo)',
      'Recepción de visitantes, centralita y gestión de citas',
      'Resolución cordial de consultas, incidencias y tareas de apoyo operativo',
      'Aplicación práctica de Inteligencia Artificial para agilidad en oficina y redacción (120h)',
      'Capacidad y motivación para aprender, asumir responsabilidades y crecer en equipo',
      'Organización, puntualidad rigurosa y seriedad en el trabajo',
      'Movilidad inmediata total (Permiso de conducir B y vehículo propio)',
    ],
    digitalTools: [
      'Suite Ofimática (Procesador de textos, Hojas de cálculo, Presentaciones)',
      'Gestión de Correo Electrónico Profesional (Gmail / Outlook) y Agenda',
      'Herramientas de Inteligencia Artificial Generativa y Asistentes Digitales (120h Cámara de Toledo)',
      'Sistemas de Gestión Documental, Digitalización y Archivo de Oficina',
      'Videoconferencia y Herramientas Digitales Colaborativas',
    ],
    recommendationLetters: shareData.publicProfile?.recommendationLetters || [],
  };

  const isEmailAuthorized = profile.showPublicEmail !== false;
  const mailtoHref = isEmailAuthorized
    ? `mailto:${profile.publicContactEmail}?subject=${encodeURIComponent(
        `Contacto desde Web CV Profesional (${shareData.companyName || 'Selección'})`
      )}`
    : undefined;

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `codigo-qr-web-cv-${(profile.fullName || 'pilar-fernandez')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyShareLink = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(webShareUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = webShareUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopyLinkSuccessToast(true);
      setTimeout(() => setCopyLinkSuccessToast(false), 4000);
    } catch (err) {
      console.warn('Error al copiar enlace:', err);
    }
  };

  // File upload handler for custom photo
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setTempPhotoPreview(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSavePhoto = () => {
    const chosen = tempPhotoPreview || photoUrlInput.trim();
    if (chosen) {
      setCurrentPhoto(chosen);
      onUpdatePhoto?.(chosen);
      if (typeof window !== 'undefined') {
        localStorage.setItem('empleo10_photoUrl', chosen);
      }
      setPhotoSuccessToast('¡Fotografía actualizada con éxito! Esta es la foto que verán las empresas.');
      setTimeout(() => setPhotoSuccessToast(''), 4500);
    }
    setIsPhotoModalOpen(false);
    setTempPhotoPreview('');
    setPhotoUrlInput('');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-[#0F172A]">
      {/* Owner Preview Navigation Banner */}
      {isOwnerPreview && onExitPreview && (
        <div className="bg-[#0F172A] text-white px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-800 sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            <span>
              <strong>Web CV Profesional Independiente (Vista Empresa)</strong> · Lo que recibe{' '}
              <strong className="text-teal-300">{shareData.companyName}</strong> mediante QR o enlace.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPhotoModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 font-medium transition-colors whitespace-nowrap shrink-0 border border-slate-700"
            >
              <Camera className="w-3.5 h-3.5 text-teal-400" />
              Cambiar mi Foto
            </button>
            {onOpenQuickSend && (
              <button
                onClick={onOpenQuickSend}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#0D9488] hover:bg-[#0F766E] rounded text-white font-semibold transition-colors whitespace-nowrap shrink-0 shadow-xs"
              >
                <Mail className="w-3.5 h-3.5" />
                Probar Envío con 1 Clic
              </button>
            )}
            <button
              onClick={onExitPreview}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-white font-medium transition-colors whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Volver a la Maqueta
            </button>
          </div>
        </div>
      )}

      {/* Photo Success Toast */}
      {photoSuccessToast && (
        <div className="bg-emerald-600 text-white px-6 py-2.5 text-xs font-semibold flex items-center justify-between sticky top-10 z-40 shadow-md">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-white" />
            <span>{photoSuccessToast}</span>
          </div>
          <button
            onClick={() => setPhotoSuccessToast('')}
            className="text-white/80 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header */}
      <header className="flex items-center justify-between gap-6 px-6 lg:px-12 py-3.5 border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <img
            src={currentPhoto}
            alt={profile.fullName}
            referrerPolicy="no-referrer"
            className="w-9 h-9 rounded-full object-cover border border-slate-300 shadow-2xs"
          />
          <div>
            <a
              href="#perfil"
              className="text-base font-bold tracking-tight text-slate-900 block"
            >
              {profile.fullName}
            </a>
            <span className="text-[11px] text-teal-700 font-medium block">
              Santo Domingo-Caudilla · Torrijos (Toledo)
            </span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-5 lg:gap-6 text-xs font-semibold text-slate-600">
          <a href="#perfil" className="hover:text-slate-900 transition-colors">
            Presentación
          </a>
          <a href="#experiencia" className="hover:text-slate-900 transition-colors">
            Mi experiencia laboral
          </a>
          <a href="#conocimientos-administrativos" className="hover:text-slate-900 transition-colors">
            Formación y conocimientos administrativos
          </a>
          <a href="#certificado-ia" className="hover:text-slate-900 transition-colors">
            Certificado IA (120h)
          </a>
          <a href="#competencias" className="hover:text-slate-900 transition-colors">
            Competencias
          </a>
          <a href="#puestos" className="hover:text-slate-900 transition-colors">
            Puestos de interés
          </a>
          <a
            href="#codigo-qr"
            className="hover:text-slate-900 transition-colors flex items-center gap-1 font-semibold text-teal-700"
          >
            <QrCode className="w-3.5 h-3.5 text-[#0D9488]" />
            Código QR
          </a>
          <a href="#contacto" className="hover:text-slate-900 transition-colors">
            Contacto
          </a>
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsQrModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
            title="Ver código QR para entrar a mi Web CV"
          >
            <QrCode className="w-3.5 h-3.5 text-[#0D9488]" />
            <span>Código QR</span>
          </button>
          <button
            onClick={handleCopyShareLink}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
            title="Copiar enlace público para compartir"
          >
            <Copy className="w-3.5 h-3.5 text-[#0D9488]" />
            <span>Compartir</span>
          </button>
          {isEmailAuthorized ? (
            <a
              href={mailtoHref}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#0F172A] rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shadow-xs"
            >
              Contactar por correo
            </a>
          ) : (
            <button
              onClick={handleCopyShareLink}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#0D9488] rounded-lg hover:bg-[#0F766E] transition-colors whitespace-nowrap shadow-xs"
            >
              Copiar Enlace Web CV
            </button>
          )}
        </div>
      </header>

      {/* Copy Link Success Toast */}
      {copyLinkSuccessToast && (
        <div className="bg-[#0F172A] text-white px-6 py-2.5 text-xs font-semibold flex items-center justify-between sticky top-14 z-40 shadow-lg border-b border-teal-500/30">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-400" />
            <span>¡Enlace profesional copiado al portapapeles! Listo para enviar a empresas y reclutadores.</span>
          </div>
          <button
            onClick={() => setCopyLinkSuccessToast(false)}
            className="text-white/80 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        {/* Hero Section with Office Cover & Profile Photo */}
        <section
          id="perfil"
          className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs"
        >
          {/* Cover Banner Image */}
          <div className="relative h-44 sm:h-56 w-full overflow-hidden bg-slate-900">
            <img
              src={HERO_COVER_IMAGE}
              alt="Espacio profesional y administrativo"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover opacity-85"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/30 to-transparent" />
            <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur-xs text-white text-xs px-3 py-1.5 rounded-full border border-slate-700 flex items-center gap-1.5 font-medium">
              <Building className="w-3.5 h-3.5 text-teal-400" />
              <span>Para: <strong>{shareData.companyName}</strong></span>
            </div>
          </div>

          {/* Profile Card Body */}
          <div className="p-6 sm:p-8 pt-0 relative space-y-6">
            {/* Avatar & Floating Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 -mt-16 sm:-mt-20">
              <div className="relative group">
                {profile.showPublicPhoto !== false ? (
                  <img
                    src={currentPhoto}
                    alt={profile.fullName}
                    referrerPolicy="no-referrer"
                    className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl object-cover border-4 border-white shadow-lg bg-slate-100"
                  />
                ) : (
                  <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl bg-gradient-to-br from-[#0F172A] to-slate-800 border-4 border-white shadow-lg flex flex-col items-center justify-center text-white">
                    <User className="w-10 h-10 text-teal-400 mb-1" />
                    <span className="text-xs font-bold tracking-wider">PF</span>
                  </div>
                )}
                <button
                  onClick={() => setIsPhotoModalOpen(true)}
                  className="absolute bottom-2 right-2 p-2 bg-[#0F172A] text-white hover:bg-[#0D9488] rounded-xl shadow transition-colors flex items-center gap-1 text-xs font-semibold"
                  title="Configurar fotografía profesional"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[11px]">Foto</span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                <button
                  onClick={() => setIsQrModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors shadow-2xs"
                  title="Código QR para acceder a esta Web CV con el móvil"
                >
                  <QrCode className="w-3.5 h-3.5 text-[#0D9488]" />
                  <span>Código QR Web</span>
                </button>

                <button
                  onClick={handleCopyShareLink}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors shadow-2xs"
                  title="Copiar enlace de esta presentación"
                >
                  <Share2 className="w-3.5 h-3.5 text-[#0D9488]" />
                  <span>Compartir</span>
                </button>

                {isEmailAuthorized ? (
                  <a
                    href={mailtoHref}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-xl shadow-xs transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    Contactar por Correo
                  </a>
                ) : (
                  <button
                    onClick={handleCopyShareLink}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 rounded-xl shadow-xs transition-colors"
                  >
                    <Mail className="w-4 h-4 text-teal-400" />
                    Contacto previa solicitud
                  </button>
                )}

                {shareData.allowCvDownload && (
                  <>
                    <button
                      onClick={() => exportProfileCvToPdf(profile, webShareUrl)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors shadow-2xs"
                      title="Descargar CV en formato PDF (con código QR integrado)"
                    >
                      <Download className="w-3.5 h-3.5 text-[#0D9488]" />
                      PDF
                    </button>
                    <button
                      onClick={() => exportProfileCvToDocx(profile)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors shadow-2xs"
                      title="Descargar CV en formato Word DOCX"
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      DOCX
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Profile Intro */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                  Candidata Verificada · Comarca de Torrijos
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1">
                  <Car className="w-3 h-3" />
                  Carnet B + Coche Propio
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-800 border border-purple-200 flex items-center gap-1">
                  <Award className="w-3 h-3" />
                  Certificado IA 120h Cámara Toledo
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {profile.fullName}
              </h1>

              <p className="text-base sm:text-lg font-medium text-slate-700 leading-snug">
                {profile.headline}
              </p>

              {/* Company Greeting pill if available */}
              {shareData.publicProfile?.customGreeting && (
                <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-xl text-xs sm:text-sm text-slate-800 leading-relaxed space-y-1">
                  <span className="font-bold text-[#0D9488] block text-xs uppercase tracking-wider">
                    Mensaje personalizado para {shareData.companyName}:
                  </span>
                  <p>{shareData.publicProfile.customGreeting}</p>
                </div>
              )}

              <p className="text-sm text-slate-600 leading-relaxed max-w-3xl pt-1">
                {profile.professionalGoal}
              </p>
            </div>

            {/* Verified Mobility & Availability Specs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-100 text-xs text-slate-600">
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#0D9488]" />
                  Residencia y Radio:
                </span>
                <p>Santo Domingo-Caudilla (Toledo) · Radio ~8 km: Torrijos, Alcabón, Novés.</p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5 text-[#0D9488]" />
                  Movilidad y Turno:
                </span>
                <p>Vehículo propio disponible. Jornada completa de 8 horas presencial o mixta.</p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#0D9488]" />
                  Disponibilidad:
                </span>
                <p>Incorporación inmediata. Enlace exclusivo para {shareData.companyName}.</p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 1: MI EXPERIENCIA LABORAL */}
        <section id="experiencia" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-[#0D9488] uppercase tracking-wider">
                <Briefcase className="w-4 h-4" />
                <span>Historial Laboral Real · Acreditado en CV</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
                Mi experiencia laboral
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                Experiencias laborales reales desempeñadas en atención al cliente, comercio, transporte, ayuda a personas, sector manufacturero y aprendizaje inicial en Toledo y comarca.
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-xs font-bold text-teal-900 bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-xl">
                {profile.experiences.length} empleos acreditados
              </span>
            </div>
          </div>

          {/* Three Domain Highlight Cards based on REAL work */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1.5 shadow-2xs">
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#0D9488] flex items-center justify-center font-bold text-base">
                🛒
              </div>
              <h4 className="text-xs font-bold text-slate-900">
                Atención al Cliente y Comercio
              </h4>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Cobro en caja, atención presencial y cercana al público, reposición de mercancías y resolución cordial de necesidades.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1.5 shadow-2xs">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-base">
                🚕
              </div>
              <h4 className="text-xs font-bold text-slate-900">
                Servicio a Personas y Movilidad
              </h4>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Transporte de viajeros en servicio de taxi, conducción responsable, puntualidad y ayuda a personas dependientes con vocación y empatía.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1.5 shadow-2xs">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-base">
                ⚙️
              </div>
              <h4 className="text-xs font-bold text-slate-900">
                Destreza Manual y Calidad
              </h4>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Acabados decorativos y detalle visual en molduras, trabajo en cadena de calzado, constancia, rigor y trabajo en equipo.
              </p>
            </div>
          </div>

          {/* Real Work Experiences List */}
          <div className="space-y-4">
            {profile.experiences.map((exp) => (
              <div
                key={exp.id}
                className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 space-y-3.5 shadow-2xs hover:border-teal-300 transition-colors relative"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-xs font-bold text-[#0D9488] block">
                      {exp.company}
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
                      {exp.role}
                    </h3>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                    <span className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-md">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {exp.location}
                    </span>
                    <span className="flex items-center gap-1 bg-teal-50 text-teal-800 px-2.5 py-1 rounded-md font-semibold">
                      <Calendar className="w-3.5 h-3.5 text-teal-600" />
                      {exp.period}
                    </span>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                  {exp.description}
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" />
                    Puesto acreditado en CV original
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 2: FORMACIÓN Y CONOCIMIENTOS ADMINISTRATIVOS */}
        <section id="conocimientos-administrativos" className="space-y-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#0D9488] uppercase tracking-wider">
              <FileText className="w-4 h-4" />
              <span>Conocimientos Adquiridos Mediante Formación</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
              Formación y conocimientos administrativos
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Conocimientos teóricos y prácticos adquiridos mediante formación reglada que deseo aplicar y desarrollar en un puesto de trabajo en la empresa.
            </p>
          </div>

          {/* Clarification Callout Banner */}
          <div className="bg-teal-50/90 border border-teal-200 rounded-2xl p-5 sm:p-6 space-y-2 text-xs sm:text-sm text-slate-800">
            <div className="flex items-center gap-2 font-bold text-[#0D9488]">
              <CheckCircle2 className="w-4 h-4" />
              <span>Formación de Auxiliar Administrativo para Desarrollar en el Puesto</span>
            </div>
            <p className="leading-relaxed">
              Cuento con la formación de <strong>Auxiliar Administrativo</strong> y los conocimientos informáticos, contables y de gestión acreditados en mi CV. Son conocimientos adquiridos mediante formación y tengo el firme propósito de aplicarlos, consolidarlos y desarrollarlos en un puesto de trabajo (auxiliar administrativo, recepción o soporte general de oficina).
            </p>
          </div>

          {/* Cards of acquired administrative skills */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#0D9488] flex items-center justify-center font-bold text-base">
                📋
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                Gestión Documental y Facturación
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Conocimientos en facturación básica, punteo y control de albaranes, cotejo documental, clasificación y archivo físico y digitalizado de expedientes.
              </p>
              <div className="pt-2 border-t border-slate-100 text-[11px] text-teal-800 font-semibold flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-[#0D9488]" />
                <span>Adquirido en Formación Auxiliar Admin</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-base">
                💻
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                Ofimática y Gestión Digital
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Manejo de procesador de textos para redacción de cartas y correspondencia, hojas de cálculo para control numérico, correo corporativo y herramientas digitales.
              </p>
              <div className="pt-2 border-t border-slate-100 text-[11px] text-blue-800 font-semibold flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-blue-600" />
                <span>Conocimientos Ofimáticos e Informáticos</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-base">
                📞
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                Recepción y Atención de Oficina
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Protocolo de acogida presencial de visitas y usuarios, centralita telefónica, citación previa, gestión de agendas y canalización cordial de solicitudes.
              </p>
              <div className="pt-2 border-t border-slate-100 text-[11px] text-purple-800 font-semibold flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-purple-600" />
                <span>Atención y Apoyo de Oficina</span>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: CERTIFICADO OFICIAL EN INTELIGENCIA ARTIFICIAL (120H) */}
        <section id="certificado-ia" className="space-y-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#0D9488] uppercase tracking-wider">
              <Award className="w-4 h-4" />
              <span>Certificación Oficial · Cámara de Comercio de Toledo</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
              Certificado en Inteligencia Artificial Aplicada (120 Horas)
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Acreditación oficial expedida por la Cámara Oficial de Comercio, Industria y Servicios de Toledo para optimizar la productividad y tareas de oficina.
            </p>
          </div>

          <div className="bg-white border border-teal-200 rounded-2xl p-6 sm:p-8 space-y-5 shadow-xs relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <img
                src={IA_CERT_BADGE_IMAGE}
                alt="Sello oficial Certificado Inteligencia Artificial Cámara de Toledo"
                referrerPolicy="no-referrer"
                className="w-24 h-24 sm:w-28 sm:h-28 object-contain rounded-2xl border border-teal-200 bg-slate-900 shrink-0 shadow-sm"
              />
              <div className="space-y-2">
                <span className="text-xs font-bold text-teal-700 uppercase tracking-wide bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
                  120 Horas Lectivas Acreditadas
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                  Certificado en Inteligencia Artificial Aplicada a la Gestión y Productividad
                </h3>
                <p className="text-xs sm:text-sm font-medium text-slate-600">
                  Expedido por la <strong>Cámara Oficial de Comercio, Industria y Servicios de Toledo</strong>.
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed border-t border-slate-100 pt-4">
              Capacitación en herramientas de Inteligencia Artificial para la asistencia en redacción ágil de documentos y correspondencia, clasificación documental, búsqueda de información y resolución de tareas de apoyo administrativo con rapidez y precisión.
            </p>

            <div className="flex flex-wrap gap-2 text-xs text-teal-800 font-semibold">
              <span className="bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-200">
                120 horas oficiales
              </span>
              <span className="bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-200">
                Redacción y correspondencia ágil
              </span>
              <span className="bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-200">
                Organización documental digital
              </span>
              <span className="bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-200">
                Productividad de oficina
              </span>
            </div>
          </div>
        </section>

        {/* SECTION 3: COMPETENCIAS Y HERRAMIENTAS DIGITALES */}
        <section id="competencias" className="space-y-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#0D9488] uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Aptitudes Profesionales</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
              Competencias Clave y Herramientas Digitales
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Soft / Human Skills */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
              <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
                Habilidades Profesionales y Atención al Público
              </h3>
              <ul className="space-y-3">
                {profile.confirmedSkills.map((skill, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-[#0D9488] shrink-0 mt-0.5" />
                    <span>{skill}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Digital Tools */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
              <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
                Herramientas Digitales y Tecnológicas
              </h3>
              <ul className="space-y-3">
                {profile.digitalTools.map((tool, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#0D9488] shrink-0 mt-2" />
                    <span>{tool}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* SECTION 4: PUESTOS DE TRABAJO QUE ME INTERESAN */}
        <section id="puestos" className="space-y-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#0D9488] uppercase tracking-wider">
              <Building className="w-4 h-4" />
              <span>Objetivos Profesionales</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
              Puestos de Trabajo que me Interesan
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Posiciones donde aportar mi experiencia en atención a personas, vocación de servicio, tareas de apoyo y formación administrativa con ganas de aprender.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-2xs hover:border-[#0D9488]/40 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#0D9488] flex items-center justify-center font-bold text-base">
                👤
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                Atención al Cliente y Usuarios
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Atención presencial, telefónica y telemática, resolución cordial de dudas, incidencias y asesoramiento empático.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-2xs hover:border-[#0D9488]/40 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-base">
                📁
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                Auxiliar Administrativa
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Puesto de oficina para aplicar y desarrollar mi formación en facturación, albaranes, archivo documental y gestión con rigor y motivación de aprendizaje.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-2xs hover:border-[#0D9488]/40 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-base">
                🔔
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                Recepción y Gestión de Citas
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Centralita telefónica, acogida de visitantes y clientes, control de accesos y coordinación de agendas.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-2xs hover:border-[#0D9488]/40 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-base">
                📞
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                Atención Telefónica y Soporte
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Gestión de consultas entrantes, seguimiento de expedientes, registro de llamadas y canalización de solicitudes.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 5: IDIOMAS (CONFIRMADOS EN MI CV) */}
        <section id="idiomas" className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-[#0D9488] uppercase tracking-wider">
            <Globe2 className="w-4 h-4" />
            <span>Comunicación e Idiomas</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            Idiomas
          </h2>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs max-w-xl space-y-3">
            {(profile.languages && profile.languages.length > 0 ? profile.languages : [
              { language: 'Español', level: 'Lengua materna / Nativo (Excelente comunicación verbal y redacción escrita)' }
            ]).map((langItem, idx) => (
              <div key={idx} className="flex items-center justify-between gap-4 py-2 border-b border-slate-100 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-teal-50 text-[#0D9488] flex items-center justify-center text-xs font-bold">
                    ES
                  </div>
                  <span className="text-sm font-bold text-slate-900">{langItem.language}</span>
                </div>
                <span className="text-xs text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200 font-semibold text-right">
                  {langItem.level}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 6: CÓDIGO QR PARA ENTRAR EN MI WEB */}
        <section
          id="codigo-qr"
          className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-[#0D9488] uppercase tracking-wider">
                <QrCode className="w-4 h-4" />
                <span>Acceso Móvil Instantáneo · Código QR Oficial</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
                Código QR para Entrar en mi Web CV
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                Apunta con la cámara de tu teléfono móvil o tablet para acceder directamente a mi presentación profesional completa.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleDownloadQr}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                title="Descargar imagen del código QR"
              >
                <Download className="w-3.5 h-3.5 text-[#0D9488]" />
                Descargar PNG
              </button>
              <button
                onClick={() => setIsQrModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-xl transition-colors shadow-xs"
              >
                <QrCode className="w-3.5 h-3.5" />
                Ampliar QR
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Visual QR Code Display Card */}
            <div className="md:col-span-5 flex flex-col items-center justify-center p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-3">
              <div className="relative p-4 bg-white rounded-2xl shadow-sm border border-slate-200/90 group">
                {/* Scanner corner accents */}
                <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#0D9488] rounded-tl-sm pointer-events-none" />
                <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#0D9488] rounded-tr-sm pointer-events-none" />
                <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#0D9488] rounded-bl-sm pointer-events-none" />
                <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#0D9488] rounded-br-sm pointer-events-none" />

                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Código QR para acceder a mi Web CV"
                    className="w-48 h-48 sm:w-52 sm:h-52 object-contain"
                  />
                ) : (
                  <div className="w-48 h-48 sm:w-52 sm:h-52 bg-slate-100 animate-pulse rounded-lg flex items-center justify-center text-xs text-slate-400">
                    Generando código QR...
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-800 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
                  <Smartphone className="w-3.5 h-3.5 text-[#0D9488]" />
                  Apunta tu cámara aquí para entrar
                </span>
                <p className="text-[11px] text-slate-500 pt-1">
                  Funciona sin instalar ninguna aplicación adicional
                </p>
              </div>
            </div>

            {/* Information and Quick Access Instructions */}
            <div className="md:col-span-7 space-y-4">
              <div className="p-4 bg-teal-50/60 border border-teal-200/80 rounded-xl space-y-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#0D9488]" />
                  ¿Cómo utilizar este Código QR?
                </h3>
                <ul className="text-xs text-slate-700 space-y-1.5 pl-1">
                  <li className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-teal-100 text-teal-900 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
                    <span><strong>Abre la cámara de tu smartphone</strong> (iPhone o Android) o cualquier lector de códigos QR.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-teal-100 text-teal-900 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
                    <span><strong>Enfoca el código en pantalla</strong> durante un segundo sin necesidad de hacer fotos.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-teal-100 text-teal-900 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</span>
                    <span><strong>Pulsa sobre el aviso emergente</strong> para entrar y navegar cómodamente en mi Web CV desde tu teléfono.</span>
                  </li>
                </ul>
              </div>

              {/* Direct Web URL Box */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Enlace directo asociado al código QR:
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-2.5 bg-slate-100 rounded-xl text-xs font-mono text-slate-800 truncate border border-slate-200 select-all">
                    {webShareUrl}
                  </div>
                  <button
                    onClick={handleCopyShareLink}
                    className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors shrink-0 flex items-center gap-1.5"
                    title="Copiar enlace directo"
                  >
                    <Copy className="w-3.5 h-3.5 text-teal-400" />
                    <span>Copiar</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={handleDownloadQr}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5 text-[#0D9488]" />
                  Descargar Código QR (PNG)
                </button>
                <a
                  href={webShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition-colors"
                >
                  <Globe2 className="w-3.5 h-3.5 text-[#0D9488]" />
                  Abrir enlace en pestaña nueva
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 7: CONTACT CARD & CTA */}
        <section
          id="contacto"
          className="bg-[#0F172A] text-white rounded-2xl p-8 sm:p-10 space-y-6 shadow-md"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-slate-800 pb-6">
            <div className="space-y-2">
              <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">
                Contacto Directo para Selección
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                ¿Interesados en incorporar a Pilar a su equipo?
              </h2>
              <p className="text-sm text-slate-300 max-w-xl">
                Disponible de inmediato para jornada completa de 8 horas en Santo Domingo-Caudilla, Torrijos, Novés, Fuensalida, Toledo o modalidad mixta/remota con vehículo propio.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setIsQrModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors border border-slate-700"
                title="Escanear o ver código QR para entrar a la Web CV"
              >
                <QrCode className="w-4 h-4 text-teal-400" />
                Código QR
              </button>

              <button
                onClick={handleCopyShareLink}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors border border-slate-700"
              >
                <Share2 className="w-4 h-4 text-teal-400" />
                Copiar Enlace
              </button>

              {isEmailAuthorized ? (
                <a
                  href={mailtoHref}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold text-slate-900 bg-teal-400 hover:bg-teal-300 rounded-xl transition-colors shadow-sm shrink-0"
                >
                  <Mail className="w-4 h-4" />
                  Enviar Correo a Pilar
                </a>
              ) : (
                <div className="text-xs text-teal-300 bg-slate-800/80 px-4 py-2.5 rounded-xl border border-teal-500/30">
                  Contacto disponible a través de la empresa de selección o mediante su solicitud oficial
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-300">
            <div>
              <span className="text-slate-400 block text-[11px]">Correo Electrónico:</span>
              {isEmailAuthorized ? (
                <span className="text-white font-semibold font-mono">{profile.publicContactEmail}</span>
              ) : (
                <span className="text-teal-300 italic">Protegido por configuración de privacidad</span>
              )}
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Localidad de Residencia:</span>
              <span className="text-white font-semibold">Santo Domingo-Caudilla (Toledo)</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Garantía de Movilidad:</span>
              <span className="text-white font-semibold">Permiso de conducir y coche propio</span>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <p>
          Presentación Profesional Autorizada de <strong>{profile.fullName}</strong> para{' '}
          <strong>{shareData.companyName}</strong> · Protegido contra indexación en buscadores.
        </p>
      </footer>

      {/* PHOTO CHANGE MODAL */}
      {isPhotoModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => {
                setIsPhotoModalOpen(false);
                setTempPhotoPreview('');
              }}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Camera className="w-5 h-5 text-[#0D9488]" />
                Fotografía Profesional y Privacidad
              </h3>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                <strong>Aviso de autenticidad:</strong>
                <p>
                  Espacio opcional para incorporar tu propia fotografía profesional. No utilices una fotografía de otra persona haciéndola pasar por ti.
                </p>
              </div>
            </div>

            {/* Visibility Toggles */}
            <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="font-semibold text-slate-800">
                  Mostrar fotografía en la web profesional
                </span>
                <input
                  type="checkbox"
                  checked={profile.showPublicPhoto !== false}
                  onChange={(e) => onTogglePhotoVisibility?.(e.target.checked)}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-4 h-4"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer pt-2 border-t border-slate-200">
                <span className="font-semibold text-slate-800">
                  Autorizar mostrar mi correo para contacto directo
                </span>
                <input
                  type="checkbox"
                  checked={profile.showPublicEmail !== false}
                  onChange={(e) => onToggleEmailVisibility?.(e.target.checked)}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-4 h-4"
                />
              </label>
            </div>

            {/* Current & Preview Box */}
            <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <img
                src={tempPhotoPreview || currentPhoto}
                alt="Vista previa"
                referrerPolicy="no-referrer"
                className="w-20 h-20 rounded-xl object-cover border-2 border-white shadow-sm"
              />
              <div className="space-y-1 text-xs">
                <span className="font-bold text-slate-900 block">
                  {tempPhotoPreview ? 'Nueva foto seleccionada' : 'Foto actual activa'}
                </span>
                <p className="text-slate-500">
                  Se mostrará en la Web CV que ven las empresas y en tu panel privado.
                </p>
              </div>
            </div>

            {/* Upload from device */}
            <div className="space-y-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors shadow-2xs"
              >
                <Upload className="w-4 h-4 text-[#0D9488]" />
                Subir foto desde mi ordenador o móvil
              </button>
            </div>

            {/* Or Paste URL */}
            <div className="space-y-1.5 pt-1">
              <label className="block text-[11px] font-semibold text-slate-700">
                O introduce el enlace web de tu foto (URL):
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={photoUrlInput}
                  onChange={(e) => {
                    setPhotoUrlInput(e.target.value);
                    if (e.target.value) setTempPhotoPreview(e.target.value);
                  }}
                  placeholder="https://ejemplo.com/mi-foto.jpg"
                  className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-[#0D9488]"
                />
                {photoUrlInput && (
                  <button
                    type="button"
                    onClick={() => setTempPhotoPreview(photoUrlInput)}
                    className="px-3 py-1.5 text-xs font-semibold bg-slate-800 text-white rounded-xl hover:bg-slate-700"
                  >
                    Ver
                  </button>
                )}
              </div>
            </div>

            {/* Presets */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-700 block">
                O restaurar foto profesional de estudio:
              </span>
              <button
                type="button"
                onClick={() => {
                  setTempPhotoPreview(DEFAULT_PORTRAIT);
                  setPhotoUrlInput('');
                }}
                className="w-full p-2 bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 rounded-xl text-left text-xs flex items-center gap-3 transition-colors"
              >
                <img
                  src={DEFAULT_PORTRAIT}
                  alt="Retrato oficial"
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-lg object-cover"
                />
                <div>
                  <span className="font-bold text-slate-900 block">
                    Retrato Ejecutivo Profesional (Oficial)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Estudio fotográfico en traje azul marino y luz natural
                  </span>
                </div>
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsPhotoModalOpen(false);
                  setTempPhotoPreview('');
                  setPhotoUrlInput('');
                }}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSavePhoto}
                disabled={!tempPhotoPreview && !photoUrlInput.trim()}
                className="px-5 py-2 text-xs font-bold bg-[#0D9488] hover:bg-[#0F766E] text-white rounded-xl shadow-xs transition-colors disabled:opacity-50"
              >
                Guardar Foto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR CODE MODAL */}
      {isQrModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 sm:p-7 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setIsQrModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-[#0D9488] mx-auto flex items-center justify-center border border-teal-200">
                <QrCode className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Código QR para Entrar en mi Web CV
              </h3>
              <p className="text-xs text-slate-600">
                Escanea este código con la cámara de tu móvil para acceder al instante a mi candidatura profesional.
              </p>
            </div>

            <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              {qrDataUrl ? (
                <div className="p-3 bg-white rounded-xl shadow-xs border border-slate-200">
                  <img
                    src={qrDataUrl}
                    alt="Código QR para entrar a la Web CV"
                    className="w-56 h-56 object-contain"
                  />
                </div>
              ) : (
                <div className="w-56 h-56 bg-slate-100 rounded-xl animate-pulse flex items-center justify-center text-xs text-slate-400">
                  Generando código QR...
                </div>
              )}
              <span className="text-[11px] font-semibold text-teal-800 bg-teal-50 px-3 py-1 rounded-full border border-teal-200 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5" />
                Compatible con la cámara de cualquier móvil
              </span>
            </div>

            <div className="space-y-2">
              <div className="p-2.5 bg-slate-100 rounded-xl text-center text-xs text-slate-600 font-mono break-all select-all border border-slate-200">
                {webShareUrl}
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleDownloadQr}
                  className="w-full py-2.5 px-3 bg-[#0F172A] hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <Download className="w-4 h-4 text-teal-400" />
                  Descargar QR (PNG)
                </button>
                <button
                  type="button"
                  onClick={handleCopyShareLink}
                  className="w-full py-2.5 px-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Copy className="w-4 h-4 text-[#0D9488]" />
                  Copiar Enlace
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
