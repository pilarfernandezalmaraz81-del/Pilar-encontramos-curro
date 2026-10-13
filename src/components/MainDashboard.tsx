import React, { useState, useRef } from 'react';
import {
  CheckCircle2,
  Calendar,
  MapPin,
  Briefcase,
  QrCode,
  Mail,
  Sparkles,
  Plus,
  Clock,
  ArrowRight,
  Building,
  Send,
  Eye,
  Camera,
  Copy,
  Check,
  Upload,
  X,
  ExternalLink,
  Car,
  Award,
} from 'lucide-react';
import { JobOffer, NavigationTab, TenDayTask, WorkspaceState } from '../types';

interface MainDashboardProps {
  workspace: WorkspaceState;
  onUpdateWorkspace: (updater: (prev: WorkspaceState) => WorkspaceState) => void;
  onNavigate: (tab: NavigationTab) => void;
  onSyncScheduledTasksToBackend: (tasks: TenDayTask[]) => Promise<void>;
  onOpenQuickSend?: (offer: JobOffer) => void;
  onOpenPreviewWebCv?: (companyName: string) => void;
  onUpdatePhoto?: (newPhoto: string) => void;
}

export const MainDashboard: React.FC<MainDashboardProps> = ({
  workspace,
  onUpdateWorkspace,
  onNavigate,
  onSyncScheduledTasksToBackend,
  onOpenQuickSend,
  onOpenPreviewWebCv,
  onUpdatePhoto,
}) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDay, setNewTaskDay] = useState<number>(workspace.currentDayNumber);
  const [newTaskCategory, setNewTaskCategory] = useState<TenDayTask['category']>('candidatura');
  const [newTaskDateIso, setNewTaskDateIso] = useState(
    new Date().toISOString().slice(0, 16)
  );
  const [backendSyncMsg, setBackendSyncMsg] = useState('');
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  // Photo modal state
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [tempPhotoPreview, setTempPhotoPreview] = useState('');
  const [photoSavedToast, setPhotoSavedToast] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Company filter
  const [companyFilter, setCompanyFilter] = useState<'TODAS' | 'CERCANAS' | 'LOGISTICA' | 'ADMIN'>(
    'TODAS'
  );

  const handleToggleTask = async (taskId: string) => {
    let nextTasks: TenDayTask[] = [];
    onUpdateWorkspace((prev) => {
      nextTasks = prev.tenDayPlan.map((t) =>
        t.id === taskId ? { ...t, completed: !t.completed } : t
      );
      return {
        ...prev,
        tenDayPlan: nextTasks,
      };
    });
    await onSyncScheduledTasksToBackend(nextTasks);
  };

  const handleAddScheduledTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const item: TenDayTask = {
      id: `task-${Date.now()}`,
      dayNumber: newTaskDay,
      title: newTaskTitle.trim(),
      description: 'Tarea programada sincronizada con el planificador del servidor.',
      category: newTaskCategory,
      scheduledIso: new Date(newTaskDateIso).toISOString(),
      completed: false,
    };

    let nextTasks: TenDayTask[] = [];
    onUpdateWorkspace((prev) => {
      nextTasks = [...prev.tenDayPlan, item];
      return {
        ...prev,
        tenDayPlan: nextTasks,
      };
    });
    setNewTaskTitle('');
    await onSyncScheduledTasksToBackend(nextTasks);
    setBackendSyncMsg('Tarea programada y registrada en el servidor backend.');
    setTimeout(() => setBackendSyncMsg(''), 3500);
  };

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 3000);
  };

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
    if (tempPhotoPreview) {
      if (onUpdatePhoto) {
        onUpdatePhoto(tempPhotoPreview);
      } else {
        onUpdateWorkspace((prev) => ({
          ...prev,
          profile: {
            ...prev.profile,
            photoUrl: tempPhotoPreview,
          },
        }));
        localStorage.setItem('empleo10_photoUrl', tempPhotoPreview);
      }
      setPhotoSavedToast(true);
      setTimeout(() => setPhotoSavedToast(false), 4000);
    }
    setIsPhotoModalOpen(false);
    setTempPhotoPreview('');
  };

  const currentDayTasks = workspace.tenDayPlan.filter(
    (t) => t.dayNumber === workspace.currentDayNumber
  );
  const completedTotal = workspace.tenDayPlan.filter((t) => t.completed).length;

  // The 10 real companies
  const tenCompanies = workspace.offers.slice(0, 10);
  const filteredCompanies = tenCompanies.filter((c) => {
    if (companyFilter === 'CERCANAS') return c.distanceKm <= 5.5;
    if (companyFilter === 'LOGISTICA')
      return (
        c.roleTitle.toLowerCase().includes('tráfico') ||
        c.roleTitle.toLowerCase().includes('expediciones') ||
        c.company.toLowerCase().includes('logística') ||
        c.company.toLowerCase().includes('trans-novés')
      );
    if (companyFilter === 'ADMIN')
      return (
        c.roleTitle.toLowerCase().includes('gestora') ||
        c.roleTitle.toLowerCase().includes('recepcionista') ||
        c.roleTitle.toLowerCase().includes('oficial') ||
        c.roleTitle.toLowerCase().includes('registro')
      );
    return true;
  });

  const currentPhoto =
    workspace.profile.photoUrl || '/src/assets/images/pilar_portrait_1791833419169.jpg';

  return (
    <div className="space-y-8">
      {/* Toast Notification for Photo Update */}
      {photoSavedToast && (
        <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-white" />
            <span>Foto de perfil actualizada correctamente en el panel y en la Web CV que verán las empresas.</span>
          </div>
          <button onClick={() => setPhotoSavedToast(false)} className="text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Verified Candidate Summary Hero */}
      <div className="bg-[#0F172A] text-white rounded-2xl p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch shadow-md">
        <div className="lg:col-span-8 flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
              PANEL PRIVADO PROPIETARIA · DÍA {workspace.currentDayNumber} DE 10
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="relative group shrink-0">
                <img
                  src={currentPhoto}
                  alt={workspace.profile.fullName}
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-teal-400 shadow-md bg-slate-800"
                />
                <button
                  type="button"
                  onClick={() => setIsPhotoModalOpen(true)}
                  className="absolute -bottom-1 -right-1 p-1.5 bg-teal-500 hover:bg-teal-400 text-slate-900 rounded-lg shadow font-bold transition-transform hover:scale-110"
                  title="Cambiar mi foto de perfil"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>

              <div>
                <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
                  {workspace.profile.fullName}
                </h1>
                <p className="text-xs font-medium text-teal-300 mt-0.5">
                  Santo Domingo-Caudilla · Torrijos · Alcabón · Novés (Radio ≤ 8 km con coche propio)
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 text-slate-200 border border-white/10 flex items-center gap-1">
                    <Car className="w-3 h-3 text-teal-400" />
                    Carnet B + Coche Propio
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center gap-1">
                    <Award className="w-3 h-3 text-teal-300" />
                    Certificado IA 120h Cámara Toledo
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsPhotoModalOpen(true)}
                    className="text-[11px] text-slate-300 hover:text-white underline ml-1"
                  >
                    Cambiar foto
                  </button>
                </div>
              </div>
            </div>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">
            Perfil verificado: Experiencia laboral acreditada en atención al cliente, comercio y servicios +{' '}
            <strong className="text-white">
              Formación de Auxiliar Administrativo y Certificado de IA de 120 horas (Cámara de Comercio de Toledo)
            </strong>
            . Orientada a puestos de Atención al Cliente, Recepción, Apoyo Operativo y Auxiliar Administrativo para desarrollar su formación.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              onClick={() => onNavigate('cv_documentos')}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-xl transition-colors whitespace-nowrap shrink-0 shadow-xs"
            >
              Importar / Editar mi CV y Cartas
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onNavigate('ofertas')}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-900 bg-white hover:bg-slate-100 rounded-xl transition-colors whitespace-nowrap shrink-0"
            >
              Buscar Ofertas Reales
            </button>
            <button
              onClick={() => onNavigate('generador_qr')}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-white/10 hover:bg-white/20 rounded-xl transition-colors whitespace-nowrap shrink-0"
            >
              <QrCode className="w-3.5 h-3.5 text-teal-400" />
              Mi Web CV y Código QR
            </button>
          </div>
        </div>

        <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-teal-400 font-semibold">Selector del Plan 10 Días</span>
              <span className="font-mono text-slate-300 tabular-nums">
                {completedTotal}/{workspace.tenDayPlan.length} completadas
              </span>
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((d) => (
                <button
                  key={d}
                  onClick={() =>
                    onUpdateWorkspace((prev) => ({ ...prev, currentDayNumber: d }))
                  }
                  className={`py-2 text-xs font-mono font-bold rounded-lg transition-colors tabular-nums ${
                    workspace.currentDayNumber === d
                      ? 'bg-[#0D9488] text-white shadow-xs'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  D{d}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 text-xs text-slate-300 space-y-1.5">
            <div className="flex items-center justify-between">
              <span>Estado de Privacidad:</span>
              <span className="text-emerald-400 font-semibold">Panel Blindado</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Web Pública Compartible:</span>
              <span className="text-teal-300 font-semibold">
                {workspace.profile.publicWebEnabled ? 'Activa (Con QR)' : 'Desactivada'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Empresas Prioritarias:</span>
              <span className="text-white font-bold font-mono">10 Empresas Reales</span>
            </div>
          </div>
        </div>
      </div>

      {/* Full-Width 4-Column KPI Row below Hero Split */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 tabular-nums">
        <div
          onClick={() => onNavigate('ofertas')}
          className="bg-white border border-slate-200 rounded-xl p-5 cursor-pointer hover:border-slate-300 transition-colors space-y-1 shadow-2xs"
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Ofertas en Radar</span>
            <MapPin className="w-4 h-4 text-[#0D9488]" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {workspace.offers.length}
          </div>
          <p className="text-xs text-slate-600">
            Santo Domingo-Caudilla, Torrijos y Comarca
          </p>
        </div>

        <div
          onClick={() => onNavigate('kanban')}
          className="bg-white border border-slate-200 rounded-xl p-5 cursor-pointer hover:border-slate-300 transition-colors space-y-1 shadow-2xs"
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Candidaturas en Kanban</span>
            <Briefcase className="w-4 h-4 text-[#0D9488]" />
          </div>
          <div className="text-2xl font-mono font-bold text-slate-900">
            {workspace.kanban.length}
          </div>
          <p className="text-xs text-slate-600">
            {workspace.kanban.filter((k) => k.status === 'en_preparacion').length} en preparación ·{' '}
            {workspace.kanban.filter((k) => k.status === 'enviada').length} enviadas
          </p>
        </div>

        <div
          onClick={() => onNavigate('gmail')}
          className="bg-white border border-slate-200 rounded-xl p-5 cursor-pointer hover:border-slate-300 transition-colors space-y-1 shadow-2xs"
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Correos y Seguimiento</span>
            <Mail className="w-4 h-4 text-[#0D9488]" />
          </div>
          <div className="text-2xl font-mono font-bold text-slate-900">
            {workspace.emails.length}
          </div>
          <p className="text-xs text-slate-600">
            Envío con confirmación explícita OAuth
          </p>
        </div>

        <div
          onClick={() => onNavigate('orientadora_ia')}
          className="bg-white border border-slate-200 rounded-xl p-5 cursor-pointer hover:border-slate-300 transition-colors space-y-1 shadow-2xs"
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Orientadora Gemini</span>
            <Sparkles className="w-4 h-4 text-[#0D9488]" />
          </div>
          <div className="text-2xl font-mono font-bold text-[#0D9488]">Activa</div>
          <p className="text-xs text-slate-600">
            Hechos verificados + Simulador entrevistas
          </p>
        </div>
      </div>

      {/* SPECIAL SECTION: LAS 10 EMPRESAS REALES PRIORITARIAS */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-[#0D9488] uppercase tracking-wider">
              <Building className="w-4 h-4" />
              <span>Objetivo de Selección Directa · Torrijos y Comarca</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              🏢 Las 10 Empresas Reales con Nombres, Correos y Por Qué Me Contratarían
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-3xl leading-relaxed">
              Empresas reales y contrastadas a menos de 8–12 km de Santo Domingo-Caudilla con puestos administrativos, de recepción y atención al cliente. Incluyen su correo directo de selección y el motivo estratégico fundamentado por el que encajas a la perfección.
            </p>
          </div>

          {/* Quick Segment Filter */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl shrink-0 text-xs">
            <button
              onClick={() => setCompanyFilter('TODAS')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                companyFilter === 'TODAS'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todas (10)
            </button>
            <button
              onClick={() => setCompanyFilter('CERCANAS')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                companyFilter === 'CERCANAS'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ≤ 5 km (5)
            </button>
            <button
              onClick={() => setCompanyFilter('ADMIN')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                companyFilter === 'ADMIN'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Administración
            </button>
            <button
              onClick={() => setCompanyFilter('LOGISTICA')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                companyFilter === 'LOGISTICA'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Logística & Tráfico
            </button>
          </div>
        </div>

        {/* 10 Companies Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredCompanies.map((comp, idx) => (
            <div
              key={comp.id}
              className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-5 space-y-4 shadow-2xs transition-all relative flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Header: Company Number Badge + Distance + Modality */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-xl bg-[#0F172A] text-white flex items-center justify-center text-xs font-bold font-mono shrink-0">
                      #{idx + 1}
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 leading-snug">
                        {comp.company}
                      </h3>
                      <p className="text-xs font-semibold text-[#0D9488]">
                        {comp.roleTitle}
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg shrink-0">
                    {comp.distanceKm} km
                  </span>
                </div>

                {/* Where they are (Location) */}
                <div className="text-xs text-slate-600 flex items-start gap-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <MapPin className="w-4 h-4 text-[#0D9488] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-800">Dónde están: </span>
                    <span>{comp.location}</span>
                  </div>
                </div>

                {/* Contact Email */}
                {comp.contactEmail && (
                  <div className="flex items-center justify-between gap-2 bg-teal-50/60 border border-teal-200/80 rounded-xl px-3 py-2 text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Mail className="w-3.5 h-3.5 text-[#0D9488] shrink-0" />
                      <span className="text-slate-600 shrink-0 font-medium">Correo:</span>
                      <a
                        href={`mailto:${comp.contactEmail}`}
                        className="font-mono font-semibold text-teal-900 truncate hover:underline"
                        title={comp.contactEmail}
                      >
                        {comp.contactEmail}
                      </a>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyEmail(comp.contactEmail!)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-800 hover:text-teal-950 bg-white px-2 py-0.5 rounded border border-teal-300 transition-colors shrink-0"
                      title="Copiar correo"
                    >
                      {copiedEmail === comp.contactEmail ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Why they would hire me */}
                {comp.whyHireMe && (
                  <div className="p-3.5 bg-teal-50 border border-teal-200 rounded-xl space-y-1 text-xs">
                    <span className="font-bold text-teal-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#0D9488]" />
                      ¿Por qué me contratarían?
                    </span>
                    <p className="text-slate-700 leading-relaxed text-xs">
                      {comp.whyHireMe}
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  {onOpenPreviewWebCv && (
                    <button
                      type="button"
                      onClick={() => onOpenPreviewWebCv(comp.company)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-lg font-semibold transition-colors shadow-2xs"
                      title="Ver exactamente cómo ve esta empresa tu Web CV"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#0D9488]" />
                      Ver Web CV
                    </button>
                  )}
                  <a
                    href={comp.originalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-900 font-medium px-2 py-1"
                  >
                    Web <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {onOpenQuickSend && (
                  <button
                    type="button"
                    onClick={() => onOpenQuickSend(comp)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white rounded-lg font-bold shadow-xs transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Revisar y Enviar (1 Clic)
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 10-Day Plan Execution & Backend Scheduled Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#0D9488]" />
                Plan de Trabajo de 10 Días (Día {workspace.currentDayNumber} seleccionado)
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Marca tus tareas completadas o consulta la hoja de ruta completa del Día 1 al 10.
              </p>
            </div>
          </div>

          {/* Focused Day Tasks */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-[#0D9488]">
              TAREAS PRIORITARIAS DEL DÍA {workspace.currentDayNumber}
            </h3>
            {currentDayTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => handleToggleTask(task.id)}
                className="p-4 bg-[#F8FAFC] border border-slate-200 rounded-xl flex items-start gap-3 cursor-pointer hover:border-slate-300 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => {}}
                  className="mt-1 rounded border-slate-300"
                />
                <div className="flex-1 text-xs space-y-1">
                  <div
                    className={`font-bold ${
                      task.completed ? 'line-through text-slate-400' : 'text-slate-900'
                    }`}
                  >
                    {task.title}
                  </div>
                  <p className="text-slate-600 leading-relaxed">{task.description}</p>
                  <div className="text-[11px] text-slate-400 tabular-nums">
                    Categoría: {task.category.toUpperCase()} · Programada:{' '}
                    {task.scheduledIso.slice(0, 16).replace('T', ' ')}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Complete 10-Day Overview List */}
          <div className="pt-4 border-t border-slate-200 space-y-2.5 max-h-72 overflow-y-auto">
            <h3 className="text-xs font-bold text-slate-700">
              HOJA DE RUTA COMPLETA (DÍAS 1 A 10)
            </h3>
            {workspace.tenDayPlan.map((task) => (
              <div
                key={task.id}
                onClick={() => handleToggleTask(task.id)}
                className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between gap-3 text-xs cursor-pointer hover:bg-slate-50"
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => {}}
                    className="rounded border-slate-300"
                  />
                  <span className="font-mono font-bold text-[#0D9488] tabular-nums">
                    Día {task.dayNumber}
                  </span>
                  <span
                    className={
                      task.completed
                        ? 'line-through text-slate-400'
                        : 'font-medium text-slate-900'
                    }
                  >
                    {task.title}
                  </span>
                </div>
                <CheckCircle2
                  className={`w-4 h-4 shrink-0 ${
                    task.completed ? 'text-emerald-600' : 'text-slate-200'
                  }`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Right: Backend Task Scheduler & Priority Reminders */}
        <div className="lg:col-span-5 space-y-6">
          <form
            onSubmit={handleAddScheduledTask}
            className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-xs"
          >
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#0D9488]" />
              Programar Tarea / Recordatorio en Servidor Backend
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Las tareas programadas se sincronizan con el servidor Node/Express y con Firestore,
              por lo que su registro no depende de mantener el navegador abierto.
            </p>

            {backendSyncMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900">
                {backendSyncMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Descripción de la tarea o recordatorio
              </label>
              <input
                type="text"
                required
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Ej. Llamar a recepción de empresa en Torrijos para confirmar envío"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Día del Plan (1–10)
                </label>
                <select
                  value={newTaskDay}
                  onChange={(e) => setNewTaskDay(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((d) => (
                    <option key={d} value={d}>
                      Día {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Categoría</label>
                <select
                  value={newTaskCategory}
                  onChange={(e) => setNewTaskCategory(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="busqueda">Búsqueda</option>
                  <option value="candidatura">Candidatura</option>
                  <option value="seguimiento">Seguimiento</option>
                  <option value="entrevista">Entrevista</option>
                  <option value="formacion">Formación</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Fecha y hora programada
              </label>
              <input
                type="datetime-local"
                value={newTaskDateIso}
                onChange={(e) => setNewTaskDateIso(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg tabular-nums"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-[#0F172A] hover:bg-slate-800 rounded-lg transition-colors"
            >
              Guardar y Sincronizar con Backend
            </button>
          </form>

          {/* Active Kanban Reminders */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              Próximos Seguimientos de Candidaturas
            </h3>
            {workspace.kanban
              .filter((k) => Boolean(k.reminderDateIso))
              .map((k) => (
                <div
                  key={k.id}
                  onClick={() => onNavigate('kanban')}
                  className="p-3.5 bg-[#F8FAFC] border border-slate-200 rounded-lg text-xs space-y-1 cursor-pointer hover:border-slate-300"
                >
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <span>{k.companyName}</span>
                    <span className="font-mono text-amber-700 tabular-nums">
                      {k.reminderDateIso}
                    </span>
                  </div>
                  <p className="text-slate-600">
                    {k.reminderNote || `Revisar estado (${k.roleTitle})`}
                  </p>
                </div>
              ))}
          </div>
        </div>
      </div>

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
                Cambiar fotografía de perfil de Pilar
              </h3>
              <p className="text-xs text-slate-600">
                Puedes subir cualquier fotografía desde tu dispositivo o mantener el retrato oficial. Esta foto se actualizará en tu panel y en la Web CV que verán las empresas.
              </p>
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
                  {tempPhotoPreview ? 'Nueva foto lista para guardar' : 'Foto actual activa'}
                </span>
                <p className="text-slate-500 text-[11px]">
                  Visible para todas las empresas a las que envíes tu Web CV.
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

            {/* Presets */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-700 block">
                O seleccionar foto profesional oficial:
              </span>
              <button
                type="button"
                onClick={() => setTempPhotoPreview('/src/assets/images/pilar_portrait_1791833419169.jpg')}
                className="w-full p-2 bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 rounded-xl text-left text-xs flex items-center gap-3 transition-colors"
              >
                <img
                  src="/src/assets/images/pilar_portrait_1791833419169.jpg"
                  alt="Retrato oficial"
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-lg object-cover"
                />
                <div>
                  <span className="font-bold text-slate-900 block">
                    Retrato Ejecutivo Oficial (Estudio Toledo)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Traje azul marino, luz natural y presencia profesional
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
                }}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSavePhoto}
                disabled={!tempPhotoPreview}
                className="px-5 py-2 text-xs font-bold bg-[#0D9488] hover:bg-[#0F766E] text-white rounded-xl shadow-xs transition-colors disabled:opacity-50"
              >
                Guardar Foto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
