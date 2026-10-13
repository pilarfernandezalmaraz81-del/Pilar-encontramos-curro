import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import {
  LayoutDashboard,
  Search,
  CheckCircle2,
  FileText,
  Globe,
  QrCode,
  Sparkles,
  BookOpen,
  Kanban,
  Mail,
  BarChart3,
  Shield,
  LogOut,
  Lock,
  Menu,
  X,
} from 'lucide-react';
import {
  AUTHORIZED_OWNER_EMAIL,
  deleteOwnerWorkspaceData,
  googleSignInWithGmail,
  initAuth,
  loadOwnerWorkspace,
  logoutUser,
  publishCompanyShareSnapshot,
  saveOwnerWorkspace,
} from './firebase';
import {
  LanguageCode,
  NavigationTab,
  ShareLinkConfig,
  TenDayTask,
  WorkspaceState,
  JobOffer,
  KanbanApplication,
  SpontaneousCompany,
} from './types';
import { createInitialWorkspaceState, CONFIRMED_DEFAULT_EXPERIENCES } from './utils/compatibility';
import { PublicPortfolioView } from './components/PublicPortfolioView';
import { MainDashboard } from './components/MainDashboard';
import { OffersAndCompatibility } from './components/OffersAndCompatibility';
import { CvDocumentsManager } from './components/CvDocumentsManager';
import { QrShareManager } from './components/QrShareManager';
import { OrientadoraAndInterviews } from './components/OrientadoraAndInterviews';
import { KanbanBoard } from './components/KanbanBoard';
import { GmailTracker } from './components/GmailTracker';
import { StatsAndSettings } from './components/StatsAndSettings';
import { QuickSendModal } from './components/QuickSendModal';

const NAV_ITEMS: {
  id: NavigationTab;
  labelEs: string;
  labelEn: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  { id: 'panel', labelEs: '1. Panel principal', labelEn: '1. Main Dashboard', icon: LayoutDashboard },
  { id: 'ofertas', labelEs: '2. Buscador de ofertas', labelEn: '2. Job Search', icon: Search },
  {
    id: 'compatibilidad',
    labelEs: '3. Análisis de compatibilidad',
    labelEn: '3. Compatibility (0–100)',
    icon: CheckCircle2,
  },
  {
    id: 'cv_documentos',
    labelEs: '4. Mi CV y documentos',
    labelEn: '4. My CV & Documents',
    icon: FileText,
  },
  {
    id: 'web_profesional',
    labelEs: '5. Mi web profesional',
    labelEn: '5. Professional Web',
    icon: Globe,
  },
  {
    id: 'generador_qr',
    labelEs: '6. Generador de código QR',
    labelEn: '6. QR Code Generator',
    icon: QrCode,
  },
  {
    id: 'orientadora_ia',
    labelEs: '7. Mi Orientadora con Gemini',
    labelEn: '7. Gemini Career Coach',
    icon: Sparkles,
  },
  {
    id: 'entrevistas',
    labelEs: '8. Preparador de entrevistas',
    labelEn: '8. Interview Prep',
    icon: BookOpen,
  },
  { id: 'kanban', labelEs: '9. Tablero Kanban', labelEn: '9. Kanban Board', icon: Kanban },
  {
    id: 'gmail',
    labelEs: '10. Gmail y seguimiento',
    labelEn: '10. Gmail & Tracking',
    icon: Mail,
  },
  { id: 'estadisticas', labelEs: '11. Estadísticas', labelEn: '11. Statistics', icon: BarChart3 },
  {
    id: 'configuracion',
    labelEs: '12. Configuración y privacidad',
    labelEn: '12. Privacy & Security',
    icon: Shield,
  },
];

function getPublicShareTokenFromLocation(): string | null {
  const params = new URLSearchParams(window.location.search);
  const queryShare = params.get('share');
  if (queryShare) return queryShare;
  const pathMatch = window.location.pathname.match(/^\/p\/([a-zA-Z0-9_\-]+)$/);
  if (pathMatch) return pathMatch[1];
  return null;
}

export default function App() {
  const publicTokenFromUrl = getPublicShareTokenFromLocation();

  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [mockupModeActive, setMockupModeActive] = useState(true);

  const [language, setLanguage] = useState<LanguageCode>('es');
  const [activeTab, setActiveTab] = useState<NavigationTab>('panel');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedGmailDraftId, setSelectedGmailDraftId] = useState<string | undefined>();
  const [previewShareLink, setPreviewShareLink] = useState<ShareLinkConfig | null>(null);

  // Quick Send Modal State (1-Click send after review)
  const [quickSendOffer, setQuickSendOffer] = useState<JobOffer | null>(null);
  const [quickSendSpontaneousCompany, setQuickSendSpontaneousCompany] = useState<SpontaneousCompany | null>(null);
  const [quickSendCard, setQuickSendCard] = useState<KanbanApplication | null>(null);
  const [copyWebLinkToast, setCopyWebLinkToast] = useState(false);

  const [workspace, setWorkspace] = useState<WorkspaceState>(() =>
    createInitialWorkspaceState()
  );
  const [firestoreSynced, setFirestoreSynced] = useState(false);

  const syncScheduledTasksToBackend = useCallback(async (tasks: TenDayTask[]) => {
    try {
      await fetch('/api/tasks/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks }),
      });
    } catch {
      // Non-blocking background sync
    }
  }, []);

  useEffect(() => {
    // If accessed via public company share URL, do NOT initialize private workspace listeners
    if (publicTokenFromUrl) {
      return;
    }

    const unsubscribe = initAuth(async (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);

      if (
        firebaseUser &&
        firebaseUser.email?.toLowerCase() === AUTHORIZED_OWNER_EMAIL.toLowerCase()
      ) {
        try {
          const remoteState = await loadOwnerWorkspace(firebaseUser.uid);
          if (remoteState) {
            const mergedExperiences =
              Array.isArray(remoteState.profile?.experiences) &&
              remoteState.profile.experiences.length > 0
                ? remoteState.profile.experiences
                : CONFIRMED_DEFAULT_EXPERIENCES;

            const truthfulGoal =
              'Busco una oportunidad laboral en la que pueda aportar mi experiencia profesional, especialmente en puestos de atención al cliente y trato directo con las personas. Cuento con formación en Auxiliar Administrativo y conocimientos informáticos y de gestión que deseo seguir desarrollando. Me interesa aprender, asumir nuevas responsabilidades y crecer profesionalmente en una empresa.';

            const rawHeadline = remoteState.profile?.headline || '';
            const truthfulHeadline =
              rawHeadline &&
              !rawHeadline.toLowerCase().includes('administración, atención') &&
              !rawHeadline.toLowerCase().includes('experiencia en administración')
                ? rawHeadline
                : 'Atención al Cliente, Trato con Personas y Tareas de Apoyo · Formación en Auxiliar Administrativo · Certificada en IA (120h Cámara de Toledo)';

            const updatedProfile = {
              ...remoteState.profile,
              experiences: mergedExperiences,
              headline: truthfulHeadline,
              professionalGoal:
                remoteState.profile?.professionalGoal &&
                !remoteState.profile.professionalGoal.includes('experiencia en administración')
                  ? remoteState.profile.professionalGoal
                  : truthfulGoal,
            };

            const updatedRemoteState = {
              ...remoteState,
              profile: updatedProfile,
            };

            setWorkspace(updatedRemoteState);
            syncScheduledTasksToBackend(remoteState.tenDayPlan || []);
          } else {
            const initial = createInitialWorkspaceState();
            setWorkspace(initial);
            await saveOwnerWorkspace(firebaseUser, initial);
            for (const link of initial.shareLinks) {
              await publishCompanyShareSnapshot(firebaseUser, link, initial);
            }
            syncScheduledTasksToBackend(initial.tenDayPlan);
          }
          setFirestoreSynced(true);
        } catch (err: any) {
          console.error('Error loading workspace:', err);
        }
      }
    });

    return () => unsubscribe();
  }, [publicTokenFromUrl, syncScheduledTasksToBackend]);

  // 1. ISOLATED PUBLIC PORTFOLIO ROUTE (For Companies via Link / QR)
  if (publicTokenFromUrl) {
    return <PublicPortfolioView shareToken={publicTokenFromUrl} language={language} />;
  }

  // 2. OWNER FULL-SCREEN PREVIEW OF PUBLIC PORTFOLIO
  if (previewShareLink) {
    return (
      <PublicPortfolioView
        shareToken={previewShareLink.token}
        previewProfile={workspace.profile}
        previewCompanyName={previewShareLink.companyName}
        previewGreeting={previewShareLink.customGreeting}
        previewRequiresPin={previewShareLink.requiresPin}
        previewPinCode={previewShareLink.pinCode}
        previewExpiresAtIso={previewShareLink.expiresAtIso}
        previewAllowCvDownload={previewShareLink.allowCvDownload}
        isOwnerPreview={true}
        onExitPreview={() => setPreviewShareLink(null)}
        onOpenQuickSend={() => {
          setPreviewShareLink(null);
          setQuickSendCard(null);
          setQuickSendOffer(workspace.offers[0]);
        }}
        onUpdatePhoto={(newPhoto) => {
          setWorkspace((prev) => ({
            ...prev,
            profile: {
              ...prev.profile,
              photoUrl: newPhoto,
            },
          }));
          localStorage.setItem('empleo10_photoUrl', newPhoto);
        }}
        onTogglePhotoVisibility={(show) => {
          setWorkspace((prev) => ({
            ...prev,
            profile: {
              ...prev.profile,
              showPublicPhoto: show,
            },
          }));
        }}
        onToggleEmailVisibility={(show) => {
          setWorkspace((prev) => ({
            ...prev,
            profile: {
              ...prev.profile,
              showPublicEmail: show,
            },
          }));
        }}
        language={language}
      />
    );
  }

  // 3. LOADING AUTHENTICATION STATE
  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-8 text-center space-y-3">
          <div className="h-5 w-40 bg-slate-200 rounded mx-auto animate-pulse" />
          <div className="h-4 w-56 bg-slate-100 rounded mx-auto animate-pulse" />
        </div>
      </div>
    );
  }

  const isAuthorizedOwner =
    Boolean(user) &&
    user?.email?.toLowerCase() === AUTHORIZED_OWNER_EMAIL.toLowerCase();

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setAuthError('');
    try {
      const result = await googleSignInWithGmail();
      if (
        result.user.email?.toLowerCase() !== AUTHORIZED_OWNER_EMAIL.toLowerCase()
      ) {
        await logoutUser();
        setAuthError(
          `Acceso denegado: la cuenta ${result.user.email} no está autorizada. Este panel privado pertenece exclusivamente a ${AUTHORIZED_OWNER_EMAIL}.`
        );
      }
    } catch (err: any) {
      setAuthError(
        err?.message || 'No se pudo completar el inicio de sesión con Google.'
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  // 4. STRICT PRIVATE AUTHENTICATION GATE (Zero Anonymous Access, with toggleable interactive Mockup / Demo mode)
  if ((!user || !isAuthorizedOwner) && !mockupModeActive) {
    return (
      <div className="min-h-screen bg-[#0F172A] text-white flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white text-[#0F172A] border border-slate-200 rounded-xl p-8 space-y-6 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div className="flex items-center gap-2.5">
              <Lock className="w-5 h-5 text-[#0D9488]" />
              <span className="font-display font-bold text-lg tracking-tight text-slate-900">
                EMPLEO 10 · Panel Privado
              </span>
            </div>
            <span className="text-xs font-semibold text-[#0D9488]">
              Acceso Restringido
            </span>
          </div>

          <div className="space-y-3">
            <h1 className="text-2xl font-bold text-slate-900">
              Plataforma Personal de Búsqueda de Empleo (10 Días)
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Por seguridad y privacidad obligatoria, el acceso anónimo está protegido. Solo la
              propietaria autorizada (<strong>{AUTHORIZED_OWNER_EMAIL}</strong>) puede consultar
              ofertas guardadas, CV originales, candidaturas Kanban, correos de Gmail y sesiones con
              Gemini.
            </p>
          </div>

          {authError && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
              {authError}
            </div>
          )}

          <div className="space-y-3 pt-2">
            <button
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="gsi-material-button w-full justify-center"
            >
              <div className="gsi-material-button-state"></div>
              <div className="gsi-material-button-content-wrapper">
                <div className="gsi-material-button-icon">
                  <svg
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    style={{ display: 'block' }}
                  >
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    ></path>
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    ></path>
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    ></path>
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    ></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                  </svg>
                </div>
                <span className="gsi-material-button-contents">
                  {isLoggingIn ? 'Verificando identidad...' : 'Sign in with Google'}
                </span>
              </div>
            </button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-3 text-xs text-slate-400 font-semibold uppercase tracking-wider">
                o explorar maquetas interactivas
              </span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            <button
              onClick={() => setMockupModeActive(true)}
              className="w-full py-2.5 px-4 bg-[#0F172A] hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <LayoutDashboard className="w-4 h-4 text-teal-400" />
              Explorar Maqueta Completa de la Aplicación (12 Módulos)
            </button>

            <button
              onClick={() => {
                const first = workspace.shareLinks[0];
                if (first) setPreviewShareLink(first);
              }}
              className="w-full py-2.5 px-4 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <Globe className="w-4 h-4 text-[#0D9488]" />
              Ver Maqueta de la Web CV para Empresas (Vista Externa)
            </button>
          </div>

          <div className="pt-4 border-t border-slate-200 text-xs text-slate-500 space-y-1">
            <p>
              <strong>¿Eres una empresa con un enlace o código QR?</strong> Utiliza la URL
              personalizada (<code>/?share=codigo-empresa</code>) que recibiste en la candidatura
              para acceder a la presentación profesional autorizada.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Helper to update workspace and persist to Firestore
  const handleUpdateWorkspace = (updater: (prev: WorkspaceState) => WorkspaceState) => {
    setWorkspace((prev) => {
      const next = updater(prev);
      if (user) {
        saveOwnerWorkspace(user, next).catch((err) =>
          console.error('Error guardando workspace en Firestore:', err)
        );
      }
      return next;
    });
  };

  const handleSyncShareLinkToFirestore = async (
    link: ShareLinkConfig,
    nextState: WorkspaceState
  ) => {
    if (!user) return;
    await publishCompanyShareSnapshot(user, link, nextState);
  };

  const handleDeleteAllUserData = async () => {
    if (!user) return;
    const tokens = workspace.shareLinks.map((l) => l.token);
    await deleteOwnerWorkspaceData(user, tokens);
    const fresh = createInitialWorkspaceState();
    setWorkspace(fresh);
  };

  const activeNavMeta = NAV_ITEMS.find((i) => i.id === activeTab) || NAV_ITEMS[0];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col lg:flex-row">
      {/* Sidebar Navigation (268px on Desktop per SaaS Dashboard Reference) */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[268px] bg-[#0F172A] text-white flex flex-col justify-between transition-transform lg:static lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-5 space-y-6 overflow-y-auto">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <span className="font-display font-bold text-lg tracking-tight text-white block">
                EMPLEO 10
              </span>
              <span className="text-[11px] text-teal-400">
                Santo Domingo-Caudilla · Toledo
              </span>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-1 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-xs font-medium rounded-lg transition-colors text-left whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-[#0D9488] text-white font-semibold'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">
                    {language === 'en' ? item.labelEn : item.labelEs}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800 space-y-3 text-xs">
          <div className="text-slate-400 truncate" title={user?.email || 'Pilar Fernández Almaraz'}>
            {user ? (
              <>Propietaria: <strong className="text-white">{user.email}</strong></>
            ) : (
              <>Modo Maqueta: <strong className="text-teal-300">Pilar Fernández Almaraz</strong></>
            )}
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-teal-400">
              {user ? (firestoreSynced ? 'Firestore Sincronizado' : 'Conectado') : 'Demostración Activa'}
            </span>
            {user ? (
              <button
                onClick={() => logoutUser()}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Salir
              </button>
            ) : (
              <button
                onClick={() => setMockupModeActive(false)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white rounded-md transition-colors font-semibold text-[11px]"
              >
                Conectar Google
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Workspace Header */}
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="text-xs text-slate-500 truncate flex items-center gap-2">
              <span className="font-bold text-slate-900">EMPLEO 10</span>
              <span className="text-slate-300">/</span>
              <strong className="text-slate-700">
                {language === 'en' ? activeNavMeta.labelEn : activeNavMeta.labelEs}
              </strong>
            </div>
          </div>

          {/* Quick Mockup / Web CV / Email Review Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="hidden sm:flex items-center bg-slate-100 p-1 rounded-lg text-xs font-semibold">
              <button
                onClick={() => {
                  setPreviewShareLink(null);
                }}
                className={`px-2.5 py-1 rounded transition-colors ${
                  !previewShareLink
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📱 Panel Privado
              </button>
              <button
                onClick={() => {
                  const firstLink = workspace.shareLinks[0];
                  if (firstLink) setPreviewShareLink(firstLink);
                }}
                className={`px-2.5 py-1 rounded transition-colors ${
                  previewShareLink
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🌐 Web CV Empresas
              </button>
            </div>

            {/* MANDATORY TOP ACTION: BUSCAR EMPRESAS NUEVAS Y ACTUALIZAR OFERTAS */}
            <button
              onClick={() => setActiveTab('ofertas')}
              className="px-3.5 py-1.5 text-xs font-black text-slate-900 bg-teal-400 hover:bg-teal-300 rounded-lg transition-all flex items-center gap-1.5 shadow-sm whitespace-nowrap active:scale-98 tracking-wide uppercase cursor-pointer"
              title="Buscar empresas nuevas y actualizar ofertas en Santo Domingo-Caudilla y comarca"
            >
              <Search className="w-3.5 h-3.5 text-slate-900" />
              <span className="hidden sm:inline">BUSCAR EMPRESAS NUEVAS Y ACTUALIZAR OFERTAS</span>
              <span className="sm:hidden">BUSCAR EMPRESAS NUEVAS</span>
            </button>

            {/* Direct Public Web Link Button */}
            <button
              onClick={() => {
                const origin = typeof window !== 'undefined' ? window.location.origin : '';
                const url = `${origin}/?share=presentacion-autorizada`;
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(url);
                }
                setCopyWebLinkToast(true);
                setTimeout(() => setCopyWebLinkToast(false), 3500);
              }}
              className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
              title="Copiar enlace de mi Web Profesional para enviar a empresas"
            >
              <Globe className="w-3.5 h-3.5 text-[#0D9488]" />
              <span className="hidden md:inline">Copiar Enlace Web</span>
            </button>

            <button
              onClick={() => {
                setQuickSendCard(null);
                setQuickSendSpontaneousCompany(null);
                setQuickSendOffer(workspace.offers[0]);
              }}
              className="px-3 py-1.5 text-xs font-bold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs whitespace-nowrap active:scale-98"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Enviar en 1 Clic</span>
            </button>

            {/* Language Selector (ES / EN) */}
            <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 rounded-lg text-xs">
              <button
                onClick={() => setLanguage('es')}
                className={`px-2 py-1 rounded font-semibold transition-colors ${
                  language === 'es' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                ES
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-2 py-1 rounded font-semibold transition-colors ${
                  language === 'en' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                EN
              </button>
            </div>
          </div>
        </header>

        {/* Copy Web Link Toast */}
        {copyWebLinkToast && (
          <div className="bg-[#0F172A] text-white px-6 py-2.5 text-xs font-semibold flex items-center justify-between sticky top-14 z-30 shadow-md border-b border-teal-500/40">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-400" />
              <span>¡Enlace definitivo de tu Web Profesional copiado! Puedes compartirlo por WhatsApp, correo o incluirlo en tu CV.</span>
            </div>
            <button
              onClick={() => setCopyWebLinkToast(false)}
              className="text-white/80 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Mockup mode banner */}
        {!user && mockupModeActive && (
          <div className="bg-[#0F172A] text-white px-4 sm:px-6 py-2 text-xs flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
              <span>
                <strong>Modo Maqueta Interactiva Activo</strong> · Explorando con el perfil oficial de{' '}
                <strong className="text-teal-300">Pilar Fernández Almaraz</strong> (Santo Domingo-Caudilla, Toledo).
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const first = workspace.shareLinks[0];
                  if (first) setPreviewShareLink(first);
                }}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium transition-colors"
              >
                Ver Web CV
              </button>
              <button
                onClick={() => setMockupModeActive(false)}
                className="px-2.5 py-1 bg-teal-500 hover:bg-teal-400 text-slate-900 rounded text-xs font-bold transition-colors"
              >
                Conectar Google Oficial
              </button>
            </div>
          </div>
        )}

        {/* Active Module Viewport */}
        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'panel' && (
            <MainDashboard
              workspace={workspace}
              onUpdateWorkspace={handleUpdateWorkspace}
              onNavigate={setActiveTab}
              onSyncScheduledTasksToBackend={syncScheduledTasksToBackend}
              onOpenQuickSend={(offer) => {
                setQuickSendCard(null);
                setQuickSendOffer(offer);
              }}
              onOpenPreviewWebCv={(companyName) => {
                const link =
                  workspace.shareLinks.find(
                    (l) => l.companyName.toLowerCase().trim() === companyName.toLowerCase().trim()
                  ) || {
                    token: `cv-${companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
                    companyName,
                    customGreeting: `Presentación profesional personalizada para el equipo de selección de ${companyName}.`,
                    isActive: true,
                    requiresPin: false,
                    pinCode: '',
                    expiresAtIso: '2099-12-31',
                    allowCvDownload: true,
                    createdAtIso: new Date().toISOString(),
                  };
                setPreviewShareLink(link);
              }}
              onUpdatePhoto={(newPhoto) => {
                setWorkspace((prev) => ({
                  ...prev,
                  profile: {
                    ...prev.profile,
                    photoUrl: newPhoto,
                  },
                }));
                localStorage.setItem('empleo10_photoUrl', newPhoto);
              }}
            />
          )}

          {(activeTab === 'ofertas' || activeTab === 'compatibilidad') && (
            <OffersAndCompatibility
              mode={activeTab}
              workspace={workspace}
              onUpdateWorkspace={handleUpdateWorkspace}
              onNavigateToKanban={() => setActiveTab('kanban')}
              onOpenQuickSend={(offer, spontaneousCompany) => {
                setQuickSendCard(null);
                setQuickSendOffer(offer || null);
                setQuickSendSpontaneousCompany(spontaneousCompany || null);
              }}
            />
          )}

          {activeTab === 'cv_documentos' && (
            <CvDocumentsManager
              workspace={workspace}
              onUpdateWorkspace={handleUpdateWorkspace}
            />
          )}

          {(activeTab === 'web_profesional' || activeTab === 'generador_qr') && (
            <QrShareManager
              mode={activeTab}
              workspace={workspace}
              onUpdateWorkspace={handleUpdateWorkspace}
              onSyncShareLinkToFirestore={handleSyncShareLinkToFirestore}
              onOpenPreview={(link) => setPreviewShareLink(link)}
            />
          )}

          {(activeTab === 'orientadora_ia' || activeTab === 'entrevistas') && (
            <OrientadoraAndInterviews
              mode={activeTab}
              workspace={workspace}
              language={language}
              onUpdateWorkspace={handleUpdateWorkspace}
            />
          )}

          {activeTab === 'kanban' && (
            <KanbanBoard
              workspace={workspace}
              onUpdateWorkspace={handleUpdateWorkspace}
              onOpenGmailWithDraft={(emailId) => {
                setSelectedGmailDraftId(emailId);
                setActiveTab('gmail');
              }}
              onOpenQuickSend={(card) => {
                setQuickSendOffer(null);
                setQuickSendCard(card);
              }}
            />
          )}

          {activeTab === 'gmail' && (
            <GmailTracker
              workspace={workspace}
              selectedEmailId={selectedGmailDraftId}
              onUpdateWorkspace={handleUpdateWorkspace}
            />
          )}

          {(activeTab === 'estadisticas' || activeTab === 'configuracion') && (
            <StatsAndSettings
              mode={activeTab}
              workspace={workspace}
              userEmail={user?.email || AUTHORIZED_OWNER_EMAIL}
              onUpdateWorkspace={handleUpdateWorkspace}
              onDeleteAllUserData={handleDeleteAllUserData}
            />
          )}
        </main>
      </div>

      {/* 1-Click Quick Send Modal with Pre-Review */}
      {(quickSendOffer || quickSendCard || quickSendSpontaneousCompany) && (
        <QuickSendModal
          offer={quickSendOffer || undefined}
          spontaneousCompany={quickSendSpontaneousCompany || undefined}
          kanbanCard={quickSendCard || undefined}
          workspace={workspace}
          onClose={() => {
            setQuickSendOffer(null);
            setQuickSendCard(null);
            setQuickSendSpontaneousCompany(null);
          }}
          onUpdateWorkspace={handleUpdateWorkspace}
          onSyncShareLinkToFirestore={handleSyncShareLinkToFirestore}
          onOpenPreviewWebCv={(link) => setPreviewShareLink(link)}
          isMockupMode={!user || mockupModeActive}
        />
      )}
    </div>
  );
}
