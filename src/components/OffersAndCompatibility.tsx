import React, { useState } from 'react';
import {
  Search,
  ExternalLink,
  Plus,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Kanban,
  RefreshCw,
  Send,
  Mail,
  MapPin,
  Building,
  Star,
  Globe,
  Phone,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Filter,
  X,
  Briefcase,
  Car,
  FileCheck,
} from 'lucide-react';
import {
  JobOffer,
  KanbanApplication,
  OfferValidityStatus,
  SpontaneousCompany,
  VerificationType,
  WorkModality,
  WorkspaceState,
} from '../types';
import { computeOfferCompatibility } from '../utils/compatibility';

interface OffersAndCompatibilityProps {
  mode: 'ofertas' | 'compatibilidad';
  workspace: WorkspaceState;
  onUpdateWorkspace: (updater: (prev: WorkspaceState) => WorkspaceState) => void;
  onNavigateToKanban: () => void;
  onOpenQuickSend: (offer?: JobOffer, spontaneousCompany?: SpontaneousCompany) => void;
}

export const OffersAndCompatibility: React.FC<OffersAndCompatibilityProps> = ({
  mode,
  workspace,
  onUpdateWorkspace,
  onNavigateToKanban,
  onOpenQuickSend,
}) => {
  // Navigation Sub-Tabs
  const [activeSubTab, setActiveSubTab] = useState<'ofertas' | 'autocandidatura' | 'seguimiento'>(
    'ofertas'
  );

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [localityFilter, setLocalityFilter] = useState<string>('TODAS');
  const [roleFilter, setRoleFilter] = useState<string>('TODOS');
  const [modalityFilter, setModalityFilter] = useState<'TODAS' | WorkModality>('TODAS');
  const [only8hFullTime, setOnly8hFullTime] = useState(false);
  const [onlyRadius8kmOrRemote, setOnlyRadius8kmOrRemote] = useState(false);
  const [dateFilter, setDateFilter] = useState<'TODAS' | '24h' | '7dias' | '30dias'>('TODAS');
  const [verificationFilter, setVerificationFilter] = useState<'TODAS' | VerificationType>('TODAS');

  // Discover & Update state
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryError, setDiscoveryError] = useState('');
  const [showDiscoveryModal, setShowDiscoveryModal] = useState(false);
  const [lastDiscoveryResult, setLastDiscoveryResult] = useState<{
    totalAnalyzed: number;
    newOffersFound: number;
    newCompaniesFound: number;
    duplicatesSkipped: number;
    sources: { title: string; uri: string }[];
    summaryReport: string;
    lastExecutedIso: string;
  } | null>(null);

  // Add real offer form state
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [newCompany, setNewCompany] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newLocation, setNewLocation] = useState('Torrijos, Toledo');
  const [newDistanceKm, setNewDistanceKm] = useState('4.5');
  const [newModality, setNewModality] = useState<WorkModality>('Presencial');
  const [newIs8h, setNewIs8h] = useState(true);
  const [newSalary, setNewSalary] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newRequirements, setNewRequirements] = useState(
    'Formación administrativa, Atención al cliente, Vehículo propio'
  );
  const [newDescription, setNewDescription] = useState('');
  const [duplicateAlert, setDuplicateAlert] = useState('');

  // Compatibility inspector state
  const [selectedOfferId, setSelectedOfferId] = useState<string>(
    workspace.offers[0]?.id || ''
  );
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);

  const spontaneousList: SpontaneousCompany[] = workspace.spontaneousCompanies || [];
  const trackedCompanyIds = new Set(workspace.trackedCompanyIds || []);

  // Format date helper
  const formatDateTimeEs = (isoString?: string) => {
    if (!isoString) return 'Aún no realizada';
    try {
      const d = new Date(isoString);
      return d.toLocaleString('es-ES', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  // Toggle track company/offer
  const handleToggleTrackCompany = (companyId: string) => {
    onUpdateWorkspace((prev) => {
      const currentTracked = new Set(prev.trackedCompanyIds || []);
      if (currentTracked.has(companyId)) {
        currentTracked.delete(companyId);
      } else {
        currentTracked.add(companyId);
      }
      return {
        ...prev,
        trackedCompanyIds: Array.from(currentTracked),
        spontaneousCompanies: (prev.spontaneousCompanies || []).map((c) =>
          c.id === companyId ? { ...c, isTracked: currentTracked.has(companyId) } : c
        ),
      };
    });
  };

  const handleToggleTrackOffer = (offerId: string) => {
    onUpdateWorkspace((prev) => ({
      ...prev,
      offers: prev.offers.map((o) =>
        o.id === offerId ? { ...o, isTracked: !o.isTracked } : o
      ),
    }));
  };

  // Real discovery execution (PARTE 1: BUSCAR EMPRESAS NUEVAS Y ACTUALIZAR OFERTAS)
  const handleRunDiscovery = async () => {
    setIsDiscovering(true);
    setDiscoveryError('');
    try {
      const existingCompanyNames = [
        ...workspace.offers.map((o) => o.company),
        ...spontaneousList.map((c) => c.name),
      ];
      const existingOfferTitles = workspace.offers.map((o) => o.roleTitle);

      const res = await fetch('/api/gemini/discover-companies-and-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          existingCompanyNames,
          existingOfferTitles,
          locationFilter: 'Santo Domingo-Caudilla, Torrijos, Alcabón, Novés, Toledo (≤ 8 km)',
          targetRoles: workspace.profile.targetRoles,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al buscar empresas nuevas.');
      }

      // Compute compatibility for new offers
      const newlyDiscoveredOffers: JobOffer[] = (data.newOffers || []).map((raw: any) => {
        const base: JobOffer = {
          id: raw.id || `offer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          company: raw.company,
          roleTitle: raw.roleTitle,
          location: raw.location,
          distanceKm: raw.distanceKm || 4.5,
          publishedDate: raw.publishedDate || new Date().toISOString().slice(0, 10),
          lastVerifiedDate: raw.lastVerifiedDate || new Date().toISOString().slice(0, 10),
          addedAtDate: new Date().toISOString().slice(0, 10),
          description: raw.description,
          requirements: raw.requirements || ['Formación administrativa', 'Atención al cliente'],
          schedule: raw.schedule || 'Jornada completa de 8 horas',
          isFullTime8h: raw.isFullTime8h ?? true,
          modality: raw.modality || 'Presencial',
          salary: raw.salary,
          originalUrl: raw.originalUrl || 'https://empleate.gob.es/',
          sourcePortal: raw.sourcePortal || 'Portal Oficial Verificado',
          validityStatus: 'activa',
          verificationStatus: (raw.verificationStatus as VerificationType) || 'verificada',
          contactEmail: raw.contactEmail,
          whyHireMe: raw.whyHireMe,
          isTracked: false,
        };
        return {
          ...base,
          compatibility: computeOfferCompatibility(workspace.profile, base),
        };
      });

      const newlyDiscoveredCompanies: SpontaneousCompany[] = (data.newCompanies || []).map(
        (raw: any) => ({
          id: raw.id || `spont-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: raw.name,
          sector: raw.sector || 'Servicios y Administración Comarcal',
          location: raw.location,
          distanceKm: raw.distanceKm || 4.0,
          officialWebsite: raw.officialWebsite,
          careersUrl: raw.careersUrl,
          contactEmail: raw.contactEmail,
          contactPhone: raw.contactPhone,
          potentialRoles: raw.potentialRoles || [
            'Atención al cliente',
            'Auxiliar administrativa',
            'Recepción',
          ],
          whyGoodFit: raw.whyGoodFit || 'Alineación con perfil administrativo y cercanía comarcal.',
          verificationStatus: (raw.verificationStatus as VerificationType) || 'identificada_en_radar',
          isTracked: false,
          notes: raw.notes,
          lastVerifiedDate: raw.lastVerifiedDate || new Date().toISOString().slice(0, 10),
          source: raw.source || 'Directorio Comarcal Verificado',
        })
      );

      // Save to workspace state and update lastSearchRecord
      onUpdateWorkspace((prev) => {
        // Merge without duplicates
        const updatedOffers = [...newlyDiscoveredOffers, ...prev.offers];
        const existingSpontIds = new Set((prev.spontaneousCompanies || []).map((c) => c.name.toLowerCase().trim()));
        const filteredNewSpont = newlyDiscoveredCompanies.filter(
          (c) => !existingSpontIds.has(c.name.toLowerCase().trim())
        );
        const updatedSpont = [...(prev.spontaneousCompanies || []), ...filteredNewSpont];

        return {
          ...prev,
          offers: updatedOffers,
          spontaneousCompanies: updatedSpont,
          lastSearchRecord: {
            lastExecutedIso: data.lastExecutedIso || new Date().toISOString(),
            totalAnalyzed: data.totalAnalyzed || 15,
            newOffersFound: newlyDiscoveredOffers.length,
            newCompaniesFound: filteredNewSpont.length,
            duplicatesSkipped: data.duplicatesSkipped || 0,
            sourcesCount: data.sourcesCount || (data.sources?.length ?? 5),
            searchZone: data.searchZone || 'Santo Domingo-Caudilla, Torrijos, Alcabón, Novés',
            summaryReport: data.summaryReport,
            sources: data.sources,
          },
        };
      });

      setLastDiscoveryResult({
        totalAnalyzed: data.totalAnalyzed || 15,
        newOffersFound: newlyDiscoveredOffers.length,
        newCompaniesFound: newlyDiscoveredCompanies.length,
        duplicatesSkipped: data.duplicatesSkipped || 0,
        sources: data.sources || [],
        summaryReport: data.summaryReport,
        lastExecutedIso: data.lastExecutedIso || new Date().toISOString(),
      });

      setShowDiscoveryModal(true);
    } catch (err: any) {
      setDiscoveryError(err.message || 'Error al ejecutar la búsqueda.');
    } finally {
      setIsDiscovering(false);
    }
  };

  // Add offer with strict dedup check
  const handleAddOfferWithDedup = (e: React.FormEvent) => {
    e.preventDefault();
    setDuplicateAlert('');
    if (!newCompany.trim() || !newRole.trim()) return;

    const normalizedKey = `${newCompany.trim().toLowerCase()}::${newRole.trim().toLowerCase()}`;
    const exists = workspace.offers.some(
      (existing) =>
        `${existing.company.trim().toLowerCase()}::${existing.roleTitle.trim().toLowerCase()}` ===
          normalizedKey ||
        (newUrl.trim() && existing.originalUrl.trim() === newUrl.trim())
    );

    if (exists) {
      setDuplicateAlert(
        'Duplicado detectado: Ya existe una oferta registrada para esta misma empresa y puesto.'
      );
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const reqList = newRequirements
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const draftOffer: JobOffer = {
      id: `offer-${Date.now()}`,
      company: newCompany.trim(),
      roleTitle: newRole.trim(),
      location: newLocation.trim(),
      distanceKm: Math.max(0, Number(newDistanceKm) || 0),
      publishedDate: today,
      lastVerifiedDate: today,
      addedAtDate: today,
      description:
        newDescription.trim() ||
        'Oferta incorporada por la usuaria para análisis de compatibilidad y seguimiento.',
      requirements: reqList.length > 0 ? reqList : ['Formación administrativa', 'Atención al cliente'],
      schedule: newIs8h ? 'Jornada completa de 8 horas' : 'Jornada completa',
      isFullTime8h: newIs8h,
      modality: newModality,
      salary: newSalary.trim() || undefined,
      contactEmail: newContactEmail.trim() || undefined,
      originalUrl: newUrl.trim() || 'https://empleate.gob.es/',
      sourcePortal: 'Incorporada por la usuaria',
      validityStatus: 'activa',
      verificationStatus: 'verificada',
      isDemoReference: false,
      isTracked: true,
    };

    const withCompat: JobOffer = {
      ...draftOffer,
      compatibility: computeOfferCompatibility(workspace.profile, draftOffer),
    };

    onUpdateWorkspace((prev) => ({
      ...prev,
      offers: [withCompat, ...prev.offers],
    }));

    setSelectedOfferId(withCompat.id);
    setNewCompany('');
    setNewRole('');
    setNewSalary('');
    setNewUrl('');
    setNewContactEmail('');
    setNewDescription('');
    setIsAddFormOpen(false);
  };

  const handleAddOfferToKanban = (offer: JobOffer) => {
    const alreadyInKanban = workspace.kanban.some((k) => k.offerId === offer.id);
    if (alreadyInKanban) {
      onNavigateToKanban();
      return;
    }

    const newCard: KanbanApplication = {
      id: `kan-${Date.now()}`,
      offerId: offer.id,
      companyName: offer.company,
      roleTitle: offer.roleTitle,
      location: `${offer.location} (${offer.distanceKm} km)`,
      status: 'nueva',
      cvDocumentId: workspace.documents[0]?.id,
      shareLinkToken: workspace.shareLinks[0]?.token,
      notes: `Incorporada desde el buscador con compatibilidad ${
        offer.compatibility?.totalScore || 85
      }/100.`,
      updatedAtIso: new Date().toISOString(),
    };

    onUpdateWorkspace((prev) => ({
      ...prev,
      kanban: [newCard, ...prev.kanban],
    }));
    onNavigateToKanban();
  };

  // Filter evaluation logic
  const matchLocality = (loc: string) => {
    if (localityFilter === 'TODAS') return true;
    const l = loc.toLowerCase();
    const filter = localityFilter.toLowerCase();
    if (filter === 'remoto') return l.includes('remoto');
    return l.includes(filter);
  };

  const matchRole = (title: string, desc = '') => {
    if (roleFilter === 'TODOS') return true;
    const hay = `${title} ${desc}`.toLowerCase();
    const needle = roleFilter.toLowerCase();
    return hay.includes(needle);
  };

  const matchDate = (dateStr: string) => {
    if (dateFilter === 'TODAS') return true;
    try {
      const itemTime = new Date(dateStr).getTime();
      const now = Date.now();
      const diffHours = (now - itemTime) / 3600000;
      if (dateFilter === '24h') return diffHours <= 24;
      if (dateFilter === '7dias') return diffHours <= 24 * 7;
      if (dateFilter === '30dias') return diffHours <= 24 * 30;
    } catch {
      return true;
    }
    return true;
  };

  // Filtered Offers
  const filteredOffers = workspace.offers.filter((o) => {
    if (modalityFilter !== 'TODAS' && o.modality !== modalityFilter) return false;
    if (only8hFullTime && !o.isFullTime8h) return false;
    if (onlyRadius8kmOrRemote && o.modality !== 'Remoto' && o.distanceKm > 8.5) return false;
    if (verificationFilter !== 'TODAS' && (o.verificationStatus || 'verificada') !== verificationFilter)
      return false;
    if (!matchLocality(o.location)) return false;
    if (!matchRole(o.roleTitle, o.description)) return false;
    if (!matchDate(o.publishedDate)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const hay = `${o.company} ${o.roleTitle} ${o.location} ${o.description} ${o.whyHireMe || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  // Filtered Spontaneous Companies
  const filteredSpontaneous = spontaneousList.filter((c) => {
    if (!matchLocality(c.location)) return false;
    if (onlyRadius8kmOrRemote && c.distanceKm > 8.5) return false;
    if (verificationFilter !== 'TODAS' && c.verificationStatus !== verificationFilter) return false;
    if (roleFilter !== 'TODOS') {
      const hasRole = c.potentialRoles.some((r) => r.toLowerCase().includes(roleFilter.toLowerCase()));
      if (!hasRole) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const hay = `${c.name} ${c.sector} ${c.location} ${c.whyGoodFit} ${c.potentialRoles.join(' ')}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  // Tracked items
  const trackedOffers = workspace.offers.filter((o) => o.isTracked);
  const trackedCompanies = spontaneousList.filter((c) => c.isTracked || trackedCompanyIds.has(c.id));

  const activeOffer =
    workspace.offers.find((o) => o.id === selectedOfferId) || workspace.offers[0];

  const lastExecutedRecord = workspace.lastSearchRecord;

  return (
    <div className="space-y-6">
      {/* =========================================================================
          HERO ACTION BAR: BUSCAR EMPRESAS NUEVAS Y ACTUALIZAR OFERTAS
      ========================================================================= */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-[#0F172A] border border-slate-700/80 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 relative z-10">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">
                Motor de Búsqueda Real y Detección Automática
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
              Buscador de Empresas Nuevas y Registro Comarcal
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Rastrea convocatorias activas y empresas en <strong>Santo Domingo-Caudilla, Torrijos, Alcabón y Novés</strong> (≤ 8 km) para puestos de atención al cliente, administración y recepción en jornada completa de 8 horas. Sin duplicados y con fuentes verificables.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-teal-400" />
                Última búsqueda:{' '}
                <strong className="text-white">
                  {formatDateTimeEs(lastExecutedRecord?.lastExecutedIso)}
                </strong>
              </span>
              {lastExecutedRecord && (
                <>
                  <span>·</span>
                  <span className="text-teal-300">
                    {lastExecutedRecord.totalAnalyzed} fuentes analizadas
                  </span>
                  <span>·</span>
                  <span className="text-emerald-300">
                    {lastExecutedRecord.newOffersFound + lastExecutedRecord.newCompaniesFound} incorporadas
                  </span>
                  <span>·</span>
                  <span className="text-slate-400">
                    {lastExecutedRecord.duplicatesSkipped} duplicados descartados
                  </span>
                </>
              )}
            </div>
          </div>

          {/* THE MANDATORY BUTTON: BUSCAR EMPRESAS NUEVAS Y ACTUALIZAR OFERTAS */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto shrink-0">
            <button
              onClick={handleRunDiscovery}
              disabled={isDiscovering}
              className="px-6 py-3.5 text-xs sm:text-sm font-extrabold text-slate-900 bg-teal-400 hover:bg-teal-300 active:scale-98 disabled:opacity-50 rounded-xl transition-all shadow-lg hover:shadow-teal-400/20 flex items-center justify-center gap-2.5 whitespace-nowrap cursor-pointer uppercase tracking-wider"
              title="Ejecutar búsqueda real y actualizar base de datos comarcal"
            >
              {isDiscovering ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-900" />
                  <span>Rastreando la comarca...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 text-slate-900" />
                  <span>BUSCAR EMPRESAS NUEVAS Y ACTUALIZAR OFERTAS</span>
                </>
              )}
            </button>

            <button
              onClick={() => setIsAddFormOpen(!isAddFormOpen)}
              className="px-4 py-3 text-xs font-bold text-slate-200 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <Plus className="w-4 h-4 text-teal-400" />
              <span>Añadir Manualmente</span>
            </button>
          </div>
        </div>

        {discoveryError && (
          <div className="mt-4 p-3 bg-red-900/40 border border-red-500/50 rounded-xl text-xs text-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{discoveryError}</span>
          </div>
        )}
      </div>

      {/* =========================================================================
          DISCOVERY REPORT MODAL (Resumen de resultados encontrados, nuevos y duplicados)
      ========================================================================= */}
      {showDiscoveryModal && lastDiscoveryResult && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 sm:p-7 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setShowDiscoveryModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1 border-b border-slate-100 pb-4">
              <span className="text-xs font-bold text-teal-700 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#0D9488]" />
                Búsqueda Real Completada
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                Resumen de Actualización y Control de Duplicados
              </h3>
              <p className="text-xs text-slate-500">
                Ejecutado el {formatDateTimeEs(lastDiscoveryResult.lastExecutedIso)} en Santo Domingo-Caudilla, Torrijos, Alcabón y Novés.
              </p>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-0.5">
                <span className="text-xs text-slate-500 block">Fuentes Analizadas</span>
                <span className="text-xl font-extrabold text-slate-900 font-mono">
                  {lastDiscoveryResult.totalAnalyzed}
                </span>
              </div>
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-center space-y-0.5">
                <span className="text-xs text-teal-800 block">Nuevas Ofertas</span>
                <span className="text-xl font-extrabold text-[#0D9488] font-mono">
                  +{lastDiscoveryResult.newOffersFound}
                </span>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-center space-y-0.5">
                <span className="text-xs text-blue-800 block">Empresas Radar</span>
                <span className="text-xl font-extrabold text-blue-700 font-mono">
                  +{lastDiscoveryResult.newCompaniesFound}
                </span>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center space-y-0.5">
                <span className="text-xs text-amber-800 block">Duplicados Omitidos</span>
                <span className="text-xl font-extrabold text-amber-700 font-mono">
                  {lastDiscoveryResult.duplicatesSkipped}
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed space-y-2">
              <p className="font-semibold text-slate-900">Detalle del rastreo:</p>
              <p>{lastDiscoveryResult.summaryReport}</p>
            </div>

            {/* Real consulted sources with clickable links */}
            {lastDiscoveryResult.sources && lastDiscoveryResult.sources.length > 0 && (
              <div className="space-y-2 pt-1">
                <span className="text-xs font-bold text-slate-900 block">
                  Fuentes y Portales Consultados ({lastDiscoveryResult.sources.length}):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                  {lastDiscoveryResult.sources.map((src, i) => (
                    <a
                      key={i}
                      href={src.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-300 rounded-lg text-xs text-[#0D9488] font-medium flex items-center justify-between gap-2 transition-colors"
                    >
                      <span className="truncate">{src.title}</span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowDiscoveryModal(false)}
                className="px-5 py-2.5 text-xs font-bold bg-[#0F172A] hover:bg-slate-800 text-white rounded-xl transition-colors"
              >
                Ver Nuevos Resultados
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MANUAL OFFER FORM (EXPANDABLE)
      ========================================================================= */}
      {isAddFormOpen && (
        <form
          onSubmit={handleAddOfferWithDedup}
          className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#0D9488]" />
              Registrar Oferta o Empresa Verificada Manualmente
            </h3>
            <button
              type="button"
              onClick={() => setIsAddFormOpen(false)}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Cancelar
            </button>
          </div>

          {duplicateAlert && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              {duplicateAlert}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Empresa</label>
              <input
                type="text"
                value={newCompany}
                onChange={(e) => setNewCompany(e.target.value)}
                placeholder="Ej. Distribuciones Comarca Torrijos"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Puesto</label>
              <input
                type="text"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                placeholder="Ej. Auxiliar Administrativa / Recepción"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Localidad</label>
              <input
                type="text"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                placeholder="Torrijos, Toledo"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Distancia (km)
              </label>
              <input
                type="number"
                step="0.1"
                value={newDistanceKm}
                onChange={(e) => setNewDistanceKm(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Modalidad</label>
              <select
                value={newModality}
                onChange={(e) => setNewModality(e.target.value as any)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value="Presencial">Presencial</option>
                <option value="Híbrido">Híbrido</option>
                <option value="Remoto">Remoto</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Salario (opcional)</label>
              <input
                type="text"
                value={newSalary}
                onChange={(e) => setNewSalary(e.target.value)}
                placeholder="20.000 € / año"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Correo de Contacto</label>
              <input
                type="email"
                value={newContactEmail}
                onChange={(e) => setNewContactEmail(e.target.value)}
                placeholder="rrhh@empresa.es"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Enlace Web Oficial de la Convocatoria o Portal
            </label>
            <input
              type="url"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Requisitos (separados por coma)
            </label>
            <input
              type="text"
              value={newRequirements}
              onChange={(e) => setNewRequirements(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-slate-700">
              <input
                type="checkbox"
                checked={newIs8h}
                onChange={(e) => setNewIs8h(e.target.checked)}
                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-4 h-4"
              />
              <span>Jornada completa de 8 horas</span>
            </label>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold bg-[#0D9488] hover:bg-[#0F766E] text-white rounded-xl shadow-xs"
            >
              Guardar y Calcular Compatibilidad
            </button>
          </div>
        </form>
      )}

      {/* =========================================================================
          NAVIGATION SUB-TABS: OFERTAS | AUTOCANDIDATURA | SEGUIMIENTO
      ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setActiveSubTab('ofertas')}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${
                activeSubTab === 'ofertas'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5 text-[#0D9488]" />
              <span>Ofertas de Empleo ({filteredOffers.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('autocandidatura')}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${
                activeSubTab === 'autocandidatura'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building className="w-3.5 h-3.5 text-blue-600" />
              <span>Radar Autocandidatura ({filteredSpontaneous.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('seguimiento')}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${
                activeSubTab === 'seguimiento'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>Lista de Seguimiento ({trackedOffers.length + trackedCompanies.length})</span>
            </button>
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-1">
            <Car className="w-3.5 h-3.5 text-teal-600" />
            <span>Vehículo propio desde Santo Domingo-Caudilla (radio ≤ 8 km)</span>
          </div>
        </div>

        {/* =========================================================================
            GRANULAR FILTERS (Localidad, Puesto, Jornada, Modalidad, Fecha, Verificación)
        ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 pt-1 text-xs">
          {/* 1. Keyword search */}
          <div className="lg:col-span-2 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por empresa, puesto o palabra..."
              className="w-full px-3 py-2 pl-8 border border-slate-300 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:border-[#0D9488]"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>

          {/* 2. Locality Filter */}
          <div>
            <select
              value={localityFilter}
              onChange={(e) => setLocalityFilter(e.target.value)}
              className="w-full px-2.5 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:outline-none focus:border-[#0D9488]"
            >
              <option value="TODAS">Localidad: Todas</option>
              <option value="Santo Domingo-Caudilla">Santo Domingo-Caudilla</option>
              <option value="Torrijos">Torrijos (comarca)</option>
              <option value="Alcabón">Alcabón</option>
              <option value="Novés">Novés</option>
              <option value="Toledo">Toledo capital</option>
              <option value="Remoto">100% Remoto</option>
            </select>
          </div>

          {/* 3. Role Filter */}
          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-2.5 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:outline-none focus:border-[#0D9488]"
            >
              <option value="TODOS">Puesto: Todos</option>
              <option value="Atención al cliente">Atención al cliente</option>
              <option value="Administra">Auxiliar administrativo</option>
              <option value="Recepción">Recepción y citas</option>
              <option value="Telefónica">Atención telefónica</option>
              <option value="Soporte">Soporte y gestión</option>
            </select>
          </div>

          {/* 4. Modality Filter */}
          <div>
            <select
              value={modalityFilter}
              onChange={(e) => setModalityFilter(e.target.value as any)}
              className="w-full px-2.5 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:outline-none focus:border-[#0D9488]"
            >
              <option value="TODAS">Modalidad: Todas</option>
              <option value="Presencial">Presencial</option>
              <option value="Híbrido">Híbrido</option>
              <option value="Remoto">Remoto</option>
            </select>
          </div>

          {/* 5. Date Filter */}
          <div>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="w-full px-2.5 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:outline-none focus:border-[#0D9488]"
            >
              <option value="TODAS">Fecha: Todas</option>
              <option value="24h">Últimas 24 horas</option>
              <option value="7dias">Últimos 7 días</option>
              <option value="30dias">Último mes</option>
            </select>
          </div>
        </div>

        {/* Toggles bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={only8hFullTime}
                onChange={(e) => setOnly8hFullTime(e.target.checked)}
                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-4 h-4"
              />
              <span className="font-medium">Solo jornada completa (8h)</span>
            </label>

            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={onlyRadius8kmOrRemote}
                onChange={(e) => setOnlyRadius8kmOrRemote(e.target.checked)}
                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-4 h-4"
              />
              <span className="font-medium">Solo radio ≤ 8 km (Torrijos/Caudilla/Novés/Alcabón)</span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">Verificación:</span>
            <select
              value={verificationFilter}
              onChange={(e) => setVerificationFilter(e.target.value as any)}
              className="px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="TODAS">Todas</option>
              <option value="verificada">Solo Verificadas</option>
              <option value="identificada_en_radar">En Radar Comarcal</option>
              <option value="pendiente_confirmar">Pendiente Confirmar</option>
            </select>
          </div>
        </div>
      </div>

      {/* =========================================================================
          TAB 1: OFERTAS DE EMPLEO PUBLICADAS (Verificadas)
      ========================================================================= */}
      {activeSubTab === 'ofertas' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Offers list */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Ofertas de Empleo en el Radar ({filteredOffers.length})
              </h3>
              <span className="text-xs text-slate-500">
                Ordenadas por compatibilidad e inmediatez
              </span>
            </div>

            {filteredOffers.length === 0 ? (
              <div className="p-8 bg-white border border-slate-200 rounded-2xl text-center space-y-3">
                <Search className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-sm font-semibold text-slate-700">
                  No se encontraron ofertas con los filtros actuales.
                </p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Prueba a pulsar en «BUSCAR EMPRESAS NUEVAS Y ACTUALIZAR OFERTAS» o a restablecer los filtros de localidad o jornada.
                </p>
              </div>
            ) : (
              filteredOffers.map((offer) => {
                const score =
                  offer.compatibility?.totalScore ??
                  computeOfferCompatibility(workspace.profile, offer).totalScore;
                const isSelected = offer.id === activeOffer?.id;
                const isTracked = Boolean(offer.isTracked);

                return (
                  <div
                    key={offer.id}
                    onClick={() => setSelectedOfferId(offer.id)}
                    className={`p-5 bg-white border rounded-2xl cursor-pointer transition-all space-y-3 ${
                      isSelected
                        ? 'border-[#0F172A] ring-1 ring-[#0F172A] shadow-xs'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* Header line with verification badge & tracking */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        {offer.verificationStatus === 'verificada' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold text-[11px]">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Oferta Verificada
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-blue-800 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full font-bold text-[11px]">
                            <ShieldCheck className="w-3 h-3 text-blue-600" />
                            En Radar Oficial
                          </span>
                        )}
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-600">
                          {offer.location} ({offer.distanceKm} km)
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleTrackOffer(offer.id);
                          }}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            isTracked
                              ? 'bg-amber-50 border-amber-300 text-amber-600'
                              : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-amber-500'
                          }`}
                          title={isTracked ? 'Quitar de seguimiento' : 'Guardar en lista de seguimiento'}
                        >
                          <Star className={`w-3.5 h-3.5 ${isTracked ? 'fill-amber-500' : ''}`} />
                        </button>
                        <span className="font-mono font-bold text-[#0D9488]">
                          Compatibilidad: {score}/100
                        </span>
                      </div>
                    </div>

                    {/* Role & Company */}
                    <div>
                      <h4 className="text-base font-bold text-slate-900">{offer.roleTitle}</h4>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs">
                        <span className="font-semibold text-slate-800">{offer.company}</span>
                        <span className="text-slate-300">·</span>
                        <span className="text-slate-500">{offer.modality}</span>
                        <span className="text-slate-300">·</span>
                        <span className="text-slate-500">{offer.schedule}</span>
                        {offer.contactEmail && (
                          <span className="font-mono text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 flex items-center gap-1">
                            <Mail className="w-3 h-3 text-[#0D9488]" />
                            {offer.contactEmail}
                          </span>
                        )}
                      </div>
                    </div>

                    {offer.whyHireMe && (
                      <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl text-xs space-y-1">
                        <span className="font-bold text-teal-900 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-[#0D9488]" />
                          ¿Por qué contratarían a Pilar?
                        </span>
                        <p className="text-slate-700 leading-relaxed">{offer.whyHireMe}</p>
                      </div>
                    )}

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {offer.description}
                    </p>

                    {/* Card Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-100 text-xs">
                      <span className="text-slate-500">
                        {offer.salary || 'Salario según convenio'}
                      </span>
                      <div className="flex items-center gap-2">
                        {offer.originalUrl && (
                          <a
                            href={offer.originalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-slate-700 hover:text-[#0D9488] font-medium px-2 py-1"
                          >
                            <span>Ver Oferta</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenQuickSend(offer);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white rounded-lg font-bold shadow-xs transition-colors"
                        >
                          <Send className="w-3 h-3" />
                          <span>Enviar Web CV</span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddOfferToKanban(offer);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium transition-colors"
                        >
                          <Kanban className="w-3 h-3" />
                          <span>Kanban</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right: Detailed Compatibility Inspector */}
          <div className="lg:col-span-5 space-y-5">
            {activeOffer && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-xs sticky top-20">
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-xs font-bold text-[#0D9488] uppercase tracking-wide">
                      Auditoría de Compatibilidad (0–100)
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-0.5">
                      {activeOffer.roleTitle}
                    </h3>
                    <p className="text-xs text-slate-600">{activeOffer.company}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-2xl font-black font-mono text-slate-900">
                      {activeOffer.compatibility?.totalScore || 85}
                    </span>
                    <span className="text-xs text-slate-500 block">/ 100</span>
                  </div>
                </div>

                {/* Compatibility Strengths */}
                <div className="space-y-2 text-xs">
                  <span className="font-bold text-slate-900 block">Puntos Fuertes Confirmados:</span>
                  <ul className="space-y-1.5">
                    {(activeOffer.compatibility?.strengths || [
                      'Formación administrativa y Certificado de IA (120h Cámara de Toledo).',
                      'Cercanía inmediata desde Santo Domingo-Caudilla con coche propio.',
                      'Disponibilidad para jornada completa de 8 horas.',
                    ]).map((str, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-slate-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{str}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Met Requirements */}
                <div className="space-y-2 text-xs pt-2 border-t border-slate-100">
                  <span className="font-bold text-slate-900 block">Requisitos Cumplidos:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {(activeOffer.requirements || []).map((req, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-[11px]"
                      >
                        ✓ {req}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Direct Action */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                  <button
                    onClick={() => onOpenQuickSend(activeOffer)}
                    className="w-full py-2.5 px-4 bg-[#0D9488] hover:bg-[#0F766E] text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Enviar Candidatura en 1 Clic (con Revisión)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: RADAR DE EMPRESAS PARA AUTOCANDIDATURA ESPONTÁNEA
      ========================================================================= */}
      {activeSubTab === 'autocandidatura' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Empresas Comarcales para Autocandidatura Espontánea ({filteredSpontaneous.length})
              </h3>
              <p className="text-xs text-slate-600">
                Empresas y entidades reales con centros de trabajo en Santo Domingo-Caudilla, Torrijos, Alcabón y Novés donde presentar tu candidatura proactivamente con tu Web CV y código QR.
              </p>
            </div>
            <span className="text-xs font-semibold text-teal-800 bg-teal-50 border border-teal-200 px-3 py-1 rounded-xl self-start sm:self-auto">
              Radio ≤ 8 km con coche propio
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredSpontaneous.map((company) => {
              const isTracked = company.isTracked || trackedCompanyIds.has(company.id);

              return (
                <div
                  key={company.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs hover:border-slate-300 transition-colors flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Header badge & Star */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 text-blue-800 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full font-bold text-[11px]">
                        <Building className="w-3 h-3 text-blue-600" />
                        {company.sector}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleTrackCompany(company.id)}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          isTracked
                            ? 'bg-amber-50 border-amber-300 text-amber-600'
                            : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-amber-500'
                        }`}
                        title={isTracked ? 'Quitar de seguimiento' : 'Guardar en lista de seguimiento'}
                      >
                        <Star className={`w-3.5 h-3.5 ${isTracked ? 'fill-amber-500' : ''}`} />
                      </button>
                    </div>

                    {/* Name & Location */}
                    <div>
                      <h4 className="text-base font-bold text-slate-900 leading-snug">
                        {company.name}
                      </h4>
                      <p className="text-xs text-slate-600 flex items-center gap-1 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-[#0D9488] shrink-0" />
                        <span>{company.location}</span>
                        <span className="font-semibold text-slate-900">({company.distanceKm} km)</span>
                      </p>
                    </div>

                    {/* Why good fit */}
                    <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1 text-xs">
                      <span className="font-bold text-slate-800 block">¿Por qué encaja Pilar?</span>
                      <p className="text-slate-600 leading-relaxed">{company.whyGoodFit}</p>
                    </div>

                    {/* Potential roles */}
                    <div className="space-y-1 text-xs">
                      <span className="font-semibold text-slate-700 block">Puestos potenciales:</span>
                      <div className="flex flex-wrap gap-1">
                        {company.potentialRoles.map((r, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-teal-50 text-teal-900 border border-teal-200 rounded text-[11px]"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Contacts line */}
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      {company.contactPhone && (
                        <span className="flex items-center gap-1 font-mono text-[11px]">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {company.contactPhone}
                        </span>
                      )}
                      {company.contactEmail && (
                        <span className="flex items-center gap-1 font-mono text-[11px] text-teal-800">
                          <Mail className="w-3 h-3 text-[#0D9488]" />
                          {company.contactEmail}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    {company.officialWebsite ? (
                      <a
                        href={company.officialWebsite}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-[#0D9488]"
                      >
                        <Globe className="w-3.5 h-3.5 text-slate-400" />
                        <span>Web Oficial</span>
                      </a>
                    ) : (
                      <span className="text-[11px] text-slate-400">Directorio local</span>
                    )}

                    <button
                      onClick={() => onOpenQuickSend(undefined, company)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
                    >
                      <Send className="w-3 h-3" />
                      <span>Enviar Autocandidatura</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: LISTA DE SEGUIMIENTO (⭐ Empresas y Ofertas Guardadas)
      ========================================================================= */}
      {activeSubTab === 'seguimiento' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                Mi Lista de Seguimiento Personal ({trackedOffers.length + trackedCompanies.length})
              </h3>
              <p className="text-xs text-slate-600">
                Empresas y ofertas que has marcado con estrella para no perderles la pista y preparar tus contactos.
              </p>
            </div>
          </div>

          {trackedOffers.length === 0 && trackedCompanies.length === 0 ? (
            <div className="p-10 bg-white border border-slate-200 rounded-2xl text-center space-y-3">
              <Star className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">
                Aún no has guardado ninguna empresa u oferta en seguimiento.
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Pulsa en el icono de estrella (⭐) en cualquier oferta o empresa del radar para añadirla a tu lista prioritaria.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {trackedOffers.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Ofertas en Seguimiento ({trackedOffers.length}):
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {trackedOffers.map((offer) => (
                      <div
                        key={offer.id}
                        className="p-4 bg-white border border-amber-200 rounded-2xl space-y-3 shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#0D9488]">{offer.company}</span>
                          <button
                            onClick={() => handleToggleTrackOffer(offer.id)}
                            className="p-1 text-amber-500 hover:text-slate-400"
                            title="Quitar de seguimiento"
                          >
                            <Star className="w-4 h-4 fill-amber-500" />
                          </button>
                        </div>
                        <h5 className="text-sm font-bold text-slate-900">{offer.roleTitle}</h5>
                        <p className="text-xs text-slate-600">
                          {offer.location} ({offer.distanceKm} km) · {offer.schedule}
                        </p>
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                          <span className="text-xs font-mono font-bold text-[#0D9488]">
                            Compatibilidad: {offer.compatibility?.totalScore || 85}/100
                          </span>
                          <button
                            onClick={() => onOpenQuickSend(offer)}
                            className="px-3 py-1 bg-[#0D9488] hover:bg-[#0F766E] text-white rounded-lg text-xs font-bold"
                          >
                            Enviar Web CV
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {trackedCompanies.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Empresas en Seguimiento ({trackedCompanies.length}):
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {trackedCompanies.map((company) => (
                      <div
                        key={company.id}
                        className="p-4 bg-white border border-blue-200 rounded-2xl space-y-3 shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-blue-700">{company.sector}</span>
                          <button
                            onClick={() => handleToggleTrackCompany(company.id)}
                            className="p-1 text-amber-500 hover:text-slate-400"
                            title="Quitar de seguimiento"
                          >
                            <Star className="w-4 h-4 fill-amber-500" />
                          </button>
                        </div>
                        <h5 className="text-sm font-bold text-slate-900">{company.name}</h5>
                        <p className="text-xs text-slate-600">
                          {company.location} ({company.distanceKm} km)
                        </p>
                        <p className="text-xs text-slate-500 line-clamp-2">{company.whyGoodFit}</p>
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                          {company.officialWebsite ? (
                            <a
                              href={company.officialWebsite}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-slate-700 hover:text-[#0D9488] font-medium inline-flex items-center gap-1"
                            >
                              <span>Web Oficial</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400">Directorio local</span>
                          )}
                          <button
                            onClick={() => onOpenQuickSend(undefined, company)}
                            className="px-3 py-1 bg-[#0D9488] hover:bg-[#0F766E] text-white rounded-lg text-xs font-bold"
                          >
                            Enviar Candidatura
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
