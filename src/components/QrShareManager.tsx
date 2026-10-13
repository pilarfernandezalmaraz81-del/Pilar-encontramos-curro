import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  Shield,
  Link2,
  Download,
  Eye,
  Lock,
  Ban,
  CheckCircle2,
  Plus,
  RefreshCw,
  Smartphone,
  Monitor,
  ExternalLink,
} from 'lucide-react';
import { CandidateProfile, ShareLinkConfig, WorkspaceState } from '../types';

interface QrShareManagerProps {
  mode: 'web_profesional' | 'generador_qr';
  workspace: WorkspaceState;
  onUpdateWorkspace: (updater: (prev: WorkspaceState) => WorkspaceState) => void;
  onSyncShareLinkToFirestore: (link: ShareLinkConfig, nextState: WorkspaceState) => Promise<void>;
  onOpenPreview: (link: ShareLinkConfig) => void;
}

export const QrShareManager: React.FC<QrShareManagerProps> = ({
  mode,
  workspace,
  onUpdateWorkspace,
  onSyncShareLinkToFirestore,
  onOpenPreview,
}) => {
  const [selectedToken, setSelectedToken] = useState<string>(
    workspace.shareLinks[0]?.token || ''
  );
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newGreeting, setNewGreeting] = useState(
    'Bienvenidos a mi presentación profesional. Aquí pueden consultar mi perfil administrativo verificado, mi Certificado de IA de 120 horas por la Cámara de Comercio de Toledo y descargar mi CV autorizado.'
  );
  const [newRequiresPin, setNewRequiresPin] = useState(false);
  const [newPinCode, setNewPinCode] = useState('');
  const [newExpiresDate, setNewExpiresDate] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
  );
  const [newAllowCv, setNewAllowCv] = useState(true);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [syncMessage, setSyncMessage] = useState('');
  const [confirmKillSwitch, setConfirmKillSwitch] = useState(false);

  const activeLink =
    workspace.shareLinks.find((l) => l.token === selectedToken) || workspace.shareLinks[0];

  const buildShareUrl = (token: string) => `${window.location.origin}/?share=${token}`;

  useEffect(() => {
    if (!activeLink) {
      setQrDataUrl('');
      return;
    }
    const url = buildShareUrl(activeLink.token);
    QRCode.toDataURL(url, {
      width: 360,
      margin: 2,
      color: {
        dark: '#0F172A',
        light: '#FFFFFF',
      },
    })
      .then((dataUrl) => setQrDataUrl(dataUrl))
      .catch((err) => console.error('QR generation error:', err));
  }, [activeLink]);

  const handleCreateCompanyLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim()) return;

    const cleanSlug = newCompanyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 28);
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    const token = `${cleanSlug || 'empresa'}-${randomSuffix}`;

    const newLink: ShareLinkConfig = {
      token,
      companyName: newCompanyName.trim(),
      customGreeting: newGreeting.trim(),
      isActive: true,
      requiresPin: newRequiresPin,
      pinCode: newRequiresPin ? newPinCode.trim() : '',
      expiresAtIso: newExpiresDate,
      allowCvDownload: newAllowCv,
      createdAtIso: new Date().toISOString(),
    };

    let updatedWorkspace!: WorkspaceState;
    onUpdateWorkspace((prev) => {
      updatedWorkspace = {
        ...prev,
        shareLinks: [newLink, ...prev.shareLinks],
      };
      return updatedWorkspace;
    });

    setSelectedToken(token);
    setNewCompanyName('');
    setNewPinCode('');
    if (updatedWorkspace) {
      await onSyncShareLinkToFirestore(newLink, updatedWorkspace);
      setSyncMessage(`Enlace y QR creados y sincronizados para ${newLink.companyName}.`);
      setTimeout(() => setSyncMessage(''), 4000);
    }
  };

  const handleToggleLinkActive = async (link: ShareLinkConfig) => {
    const toggled: ShareLinkConfig = { ...link, isActive: !link.isActive };
    let updatedWorkspace!: WorkspaceState;
    onUpdateWorkspace((prev) => {
      updatedWorkspace = {
        ...prev,
        shareLinks: prev.shareLinks.map((l) => (l.token === link.token ? toggled : l)),
      };
      return updatedWorkspace;
    });
    if (updatedWorkspace) {
      await onSyncShareLinkToFirestore(toggled, updatedWorkspace);
      setSyncMessage(
        toggled.isActive
          ? `Acceso reactivado para ${toggled.companyName}.`
          : `Acceso revocado inmediatamente para ${toggled.companyName}.`
      );
      setTimeout(() => setSyncMessage(''), 4000);
    }
  };

  const handleGlobalKillSwitch = async () => {
    const nextEnabled = !workspace.profile.publicWebEnabled;
    let updatedWorkspace!: WorkspaceState;
    onUpdateWorkspace((prev) => {
      updatedWorkspace = {
        ...prev,
        profile: {
          ...prev.profile,
          publicWebEnabled: nextEnabled,
        },
        shareLinks: nextEnabled
          ? prev.shareLinks
          : prev.shareLinks.map((l) => ({ ...l, isActive: false })),
      };
      return updatedWorkspace;
    });
    setConfirmKillSwitch(false);
    if (updatedWorkspace) {
      for (const link of updatedWorkspace.shareLinks) {
        await onSyncShareLinkToFirestore(link, updatedWorkspace);
      }
      setSyncMessage(
        nextEnabled
          ? 'Web profesional reactivada. Activa los enlaces individuales que desees compartir.'
          : 'Web profesional desactivada y todos los enlaces QR han sido revocados.'
      );
      setTimeout(() => setSyncMessage(''), 4500);
    }
  };

  const handleDownloadQrPng = () => {
    if (!qrDataUrl || !activeLink) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QR_Profesional_${activeLink.companyName.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;
    a.click();
  };

  const handleUpdatePublicProfileFields = (
    patch: Partial<CandidateProfile>
  ) => {
    onUpdateWorkspace((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        ...patch,
      },
    }));
  };

  return (
    <div className="space-y-8">
      {/* Top Banner & Emergency Kill Switch */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-[#0D9488] font-semibold">
            <Shield className="w-4 h-4" />
            <span>Rutas, permisos y datos 100 % separados de tu panel privado</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            {mode === 'web_profesional'
              ? 'Mi Web Profesional Independiente'
              : 'Generador de Código QR y Enlaces Protegidos por Empresa'}
          </h2>
          <p className="text-sm text-slate-600 max-w-2xl">
            Tu web profesional oculta tu domicilio postal, teléfono privado (salvo que lo autorices)
            y todo tu panel de gestión. Incluye etiqueta <code>noindex, nofollow</code> para no
            aparecer en buscadores.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {activeLink && (
            <button
              onClick={() => onOpenPreview(activeLink)}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-900 bg-[#F8FAFC] border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0"
            >
              <Eye className="w-4 h-4 text-[#0D9488]" />
              Ver Web Pública como Empresa
            </button>
          )}

          <button
            onClick={() => setConfirmKillSwitch(true)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              workspace.profile.publicWebEnabled
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-[#0D9488] text-white hover:bg-[#0F766E]'
            }`}
          >
            <Ban className="w-4 h-4" />
            {workspace.profile.publicWebEnabled
              ? 'Desactivar Web y Revocar Enlaces'
              : 'Reactivar Web Profesional'}
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Global Kill Switch */}
      {confirmKillSwitch && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              {workspace.profile.publicWebEnabled
                ? '¿Desactivar tu web profesional y revocar todos los enlaces?'
                : '¿Reactivar tu web profesional?'}
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              {workspace.profile.publicWebEnabled
                ? 'Al confirmar, cualquier empresa que escanee un QR o abra un enlace compartido verá inmediatamente que el enlace ya no está disponible.'
                : 'Tu web profesional volverá a estar operativa para los enlaces que mantengas activos.'}
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmKillSwitch(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Cancelar
              </button>
              <button
                onClick={handleGlobalKillSwitch}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                Confirmar acción
              </button>
            </div>
          </div>
        </div>
      )}

      {syncMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-medium text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{syncMessage}</span>
        </div>
      )}

      {/* Honest QR Security Notice */}
      <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-5 space-y-2">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Lock className="w-4 h-4 text-[#0D9488]" />
          Transparencia técnica sobre Códigos QR y Privacidad
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          Un código QR no identifica por sí mismo a la persona o empresa que lo escanea: contiene un
          enlace web único por empresa (<code>/?share=token</code>). Si el enlace está abierto sin
          contraseña, cualquier persona que lo reciba podría compartirlo. Para restringir el acceso
          de forma real, <strong>activa la protección mediante código/contraseña</strong> y fija una{' '}
          <strong>fecha de caducidad</strong> al crear el enlace para cada empresa.
        </p>
        <p className="text-xs text-slate-500">
          <strong>Cómo publicar y obtener tu URL real:</strong> En Google AI Studio pulsa el botón{' '}
          <strong>Deploy / Share App</strong> para desplegar en Google Cloud Run. La URL real actual
          de tu entorno es <code>{window.location.origin}</code>. No se inventa ningún dominio
          externo.
        </p>
      </div>

      {mode === 'web_profesional' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <h3 className="text-base font-bold text-slate-900">
              Configuración de Datos Visibles en tu Web Pública
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Titular profesional público
              </label>
              <input
                type="text"
                value={workspace.profile.headline}
                onChange={(e) => handleUpdatePublicProfileFields({ headline: e.target.value })}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Presentación y objetivo profesional
              </label>
              <textarea
                rows={4}
                value={workspace.profile.professionalGoal}
                onChange={(e) =>
                  handleUpdatePublicProfileFields({ professionalGoal: e.target.value })
                }
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Correo de contacto público
                </label>
                <input
                  type="email"
                  value={workspace.profile.publicContactEmail}
                  onChange={(e) =>
                    handleUpdatePublicProfileFields({ publicContactEmail: e.target.value })
                  }
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Teléfono público (opcional, vacío por defecto)
                </label>
                <input
                  type="text"
                  value={workspace.profile.publicContactPhoneOptional}
                  onChange={(e) =>
                    handleUpdatePublicProfileFields({
                      publicContactPhoneOptional: e.target.value,
                    })
                  }
                  placeholder="Oculto por privacidad si se deja vacío"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-600">
                Sincronizar cambios del perfil público con los enlaces activos en Firestore
              </span>
              <button
                onClick={async () => {
                  for (const link of workspace.shareLinks) {
                    await onSyncShareLinkToFirestore(link, workspace);
                  }
                  setSyncMessage('Datos públicos actualizados en todos los enlaces.');
                  setTimeout(() => setSyncMessage(''), 3500);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0F172A] rounded-lg hover:bg-slate-800 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Publicar cambios en enlaces activos
              </button>
            </div>
          </div>

          {/* Live Responsive Preview Card */}
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                Vista Previa Adaptable (Ordenador y Móvil)
              </h3>
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                <button
                  onClick={() => setPreviewDevice('desktop')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    previewDevice === 'desktop'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  Ordenador
                </button>
                <button
                  onClick={() => setPreviewDevice('mobile')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    previewDevice === 'mobile'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  Móvil
                </button>
              </div>
            </div>

            <div
              className={`border border-slate-200 rounded-xl p-5 bg-[#F8FAFC] mx-auto transition-all ${
                previewDevice === 'mobile' ? 'max-w-[340px]' : 'w-full'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                  <span className="text-sm font-bold text-slate-900">
                    {workspace.profile.fullName}
                  </span>
                  <span className="text-xs text-[#0D9488] font-medium">Vista Pública</span>
                </div>
                <p className="text-sm font-bold text-slate-900 leading-snug">
                  {workspace.profile.headline}
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {workspace.profile.professionalGoal}
                </p>
                <div className="text-xs text-slate-500 pt-1">
                  Santo Domingo-Caudilla · Torrijos · Alcabón · Novés · Certificado IA 120h (Cámara
                  de Toledo) · Coche propio
                </div>
                <div className="pt-2 flex flex-wrap gap-2">
                  {activeLink && (
                    <button
                      onClick={() => onOpenPreview(activeLink)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#0D9488] rounded-lg"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Abrir a pantalla completa
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Generator and Company Links Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form to create a new link per company */}
        <form
          onSubmit={handleCreateCompanyLink}
          className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4"
        >
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#0D9488]" />
            Crear Enlace y QR para una Empresa
          </h3>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nombre de la empresa o proceso de selección
            </label>
            <input
              type="text"
              required
              value={newCompanyName}
              onChange={(e) => setNewCompanyName(e.target.value)}
              placeholder="Ej. Asesoría Torrijos S.L. / Clínica Dental Novés"
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Saludo personalizado para esta empresa
            </label>
            <textarea
              rows={3}
              value={newGreeting}
              onChange={(e) => setNewGreeting(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Fecha de caducidad
              </label>
              <input
                type="date"
                value={newExpiresDate}
                onChange={(e) => setNewExpiresDate(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg tabular-nums"
                required
              />
            </div>
            <div className="flex flex-col justify-end space-y-2 pb-1">
              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newAllowCv}
                  onChange={(e) => setNewAllowCv(e.target.checked)}
                  className="rounded border-slate-300"
                />
                Permitir descarga de CV autorizado
              </label>
              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newRequiresPin}
                  onChange={(e) => setNewRequiresPin(e.target.checked)}
                  className="rounded border-slate-300"
                />
                Proteger con contraseña / PIN
              </label>
            </div>
          </div>

          {newRequiresPin && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contraseña o código PIN para esta empresa
              </label>
              <input
                type="text"
                required
                value={newPinCode}
                onChange={(e) => setNewPinCode(e.target.value)}
                placeholder="Ej. TORRIJOS2026"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg font-mono"
              />
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-[#0F172A] hover:bg-slate-800 rounded-lg transition-colors"
          >
            Generar Enlace Único y Código QR
          </button>
        </form>

        {/* Active QR Showcase + Company Links Table */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          {activeLink ? (
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center pb-6 border-b border-slate-200">
              <div className="sm:col-span-5 flex flex-col items-center p-4 bg-[#F8FAFC] border border-slate-200 rounded-xl">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`Código QR para ${activeLink.companyName}`}
                    referrerPolicy="no-referrer"
                    className="w-44 h-44 object-contain"
                  />
                ) : (
                  <div className="w-44 h-44 flex items-center justify-center text-xs text-slate-400">
                    Generando QR...
                  </div>
                )}
                <button
                  onClick={handleDownloadQrPng}
                  className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-lg transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Descargar QR en PNG
                </button>
              </div>

              <div className="sm:col-span-7 space-y-3">
                <div className="text-xs text-slate-500">
                  Empresa seleccionada ·{' '}
                  <span
                    className={
                      activeLink.isActive && workspace.profile.publicWebEnabled
                        ? 'text-emerald-700 font-semibold'
                        : 'text-red-600 font-semibold'
                    }
                  >
                    {activeLink.isActive && workspace.profile.publicWebEnabled
                      ? 'Enlace Activo'
                      : 'Enlace Revocado / Inactivo'}
                  </span>
                </div>
                <h4 className="text-lg font-bold text-slate-900">{activeLink.companyName}</h4>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-700 break-all">
                  {buildShareUrl(activeLink.token)}
                </div>
                <div className="text-xs text-slate-600 space-y-1 tabular-nums">
                  <p>
                    Caducidad configurada: <strong>{activeLink.expiresAtIso.slice(0, 10)}</strong>
                  </p>
                  <p>
                    Protección por código:{' '}
                    <strong>
                      {activeLink.requiresPin ? `Sí (PIN: ${activeLink.pinCode})` : 'Abierto con enlace'}
                    </strong>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(buildShareUrl(activeLink.token));
                      setSyncMessage('Enlace copiado al portapapeles.');
                      setTimeout(() => setSyncMessage(''), 2500);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    Copiar enlace
                  </button>
                  <button
                    onClick={() => onOpenPreview(activeLink)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Probar enlace
                  </button>
                  <button
                    onClick={() => handleToggleLinkActive(activeLink)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg ${
                      activeLink.isActive
                        ? 'text-red-700 bg-red-50 hover:bg-red-100'
                        : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                    }`}
                  >
                    {activeLink.isActive ? 'Revocar acceso' : 'Reactivar enlace'}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <QrCode className="w-4 h-4 text-slate-700" />
              Listado de Enlaces y Códigos QR por Empresa ({workspace.shareLinks.length})
            </h4>
            <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
              {workspace.shareLinks.map((item) => (
                <div
                  key={item.token}
                  className={`p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs ${
                    item.token === activeLink?.token ? 'bg-slate-50' : 'bg-white'
                  }`}
                >
                  <div>
                    <p className="font-bold text-slate-900">{item.companyName}</p>
                    <p className="text-slate-500 tabular-nums">
                      Token: {item.token} · Caduca: {item.expiresAtIso.slice(0, 10)} ·{' '}
                      {item.requiresPin ? `Con PIN (${item.pinCode})` : 'Sin PIN'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedToken(item.token)}
                      className="px-2.5 py-1 font-medium text-slate-700 border border-slate-300 rounded hover:bg-slate-100"
                    >
                      Ver QR
                    </button>
                    <button
                      onClick={() => handleToggleLinkActive(item)}
                      className={`px-2.5 py-1 font-medium rounded ${
                        item.isActive
                          ? 'text-red-700 bg-red-50 hover:bg-red-100'
                          : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                      }`}
                    >
                      {item.isActive ? 'Revocar' : 'Activar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
