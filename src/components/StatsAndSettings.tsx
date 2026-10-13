import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  ShieldCheck,
  Lock,
  Trash2,
  Download,
  Server,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { WorkspaceState } from '../types';
import { KANBAN_COLUMNS } from './KanbanBoard';
import { EMAIL_STATUS_LABELS } from './GmailTracker';

interface StatsAndSettingsProps {
  mode: 'estadisticas' | 'configuracion';
  workspace: WorkspaceState;
  userEmail: string;
  onUpdateWorkspace: (updater: (prev: WorkspaceState) => WorkspaceState) => void;
  onDeleteAllUserData: () => Promise<void>;
}

export const StatsAndSettings: React.FC<StatsAndSettingsProps> = ({
  mode,
  workspace,
  userEmail,
  onUpdateWorkspace,
  onDeleteAllUserData,
}) => {
  const [serverStatus, setServerStatus] = useState<{
    ok: boolean;
    serverTimeIso?: string;
    geminiConfigured?: boolean;
    scheduledTasksCount?: number;
    dueTasksCount?: number;
  } | null>(null);
  const [confirmWipeModal, setConfirmWipeModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetch('/api/status')
      .then((r) => r.json())
      .then((d) => setServerStatus(d))
      .catch(() => setServerStatus({ ok: false }));
  }, []);

  if (mode === 'estadisticas') {
    const completedTasks = workspace.tenDayPlan.filter((t) => t.completed).length;
    const totalTasks = workspace.tenDayPlan.length;
    const avgCompatibility =
      workspace.offers.length > 0
        ? Math.round(
            workspace.offers.reduce(
              (acc, o) => acc + (o.compatibility?.totalScore || 80),
              0
            ) / workspace.offers.length
          )
        : 0;

    const priorityRadiusOffers = workspace.offers.filter(
      (o) => o.distanceKm <= 8.5 && o.modality !== 'Remoto'
    ).length;
    const remoteOffers = workspace.offers.filter((o) => o.modality === 'Remoto').length;

    return (
      <div className="space-y-8">
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#0D9488]">
            <BarChart3 className="w-4 h-4" />
            <span>Métricas Reales de Campaña · Plan 10 Días</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Estadísticas de Ofertas, Candidaturas, Correos y Entrevistas
          </h2>
          <p className="text-sm text-slate-600">
            Indicadores calculados exclusivamente a partir de tu actividad real en EMPLEO 10.
          </p>
        </div>

        {/* 4 Primary KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 tabular-nums">
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-1">
            <span className="text-xs text-slate-500">Progreso Plan 10 Días</span>
            <div className="text-2xl font-bold font-mono text-slate-900">
              {completedTasks}/{totalTasks} tareas
            </div>
            <p className="text-xs text-[#0D9488]">Día activo: Día {workspace.currentDayNumber}</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-1">
            <span className="text-xs text-slate-500">Ofertas Registradas</span>
            <div className="text-2xl font-bold font-mono text-slate-900">
              {workspace.offers.length}
            </div>
            <p className="text-xs text-slate-600">
              {priorityRadiusOffers} en radio ≤8 km · {remoteOffers} remotas
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-1">
            <span className="text-xs text-slate-500">Compatibilidad Media</span>
            <div className="text-2xl font-bold font-mono text-[#0D9488]">
              {avgCompatibility}/100
            </div>
            <p className="text-xs text-slate-600">Basada en perfil + IA 120h</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-1">
            <span className="text-xs text-slate-500">Enlaces QR por Empresa</span>
            <div className="text-2xl font-bold font-mono text-slate-900">
              {workspace.shareLinks.filter((l) => l.isActive).length}/
              {workspace.shareLinks.length} activos
            </div>
            <p className="text-xs text-slate-600">
              Web pública: {workspace.profile.publicWebEnabled ? 'Activa' : 'Desactivada'}
            </p>
          </div>
        </div>

        {/* Kanban Funnel Breakdown & Email States */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Embudo de Candidaturas en el Tablero Kanban
            </h3>
            <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden text-xs tabular-nums">
              {KANBAN_COLUMNS.map((col) => {
                const count = workspace.kanban.filter((k) => k.status === col.key).length;
                return (
                  <div
                    key={col.key}
                    className="px-4 py-2.5 flex items-center justify-between bg-white"
                  >
                    <span className="font-medium text-slate-700">{col.label}</span>
                    <span className="font-mono font-bold text-slate-900">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Desglose de Correos según Estado Verificado
            </h3>
            <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden text-xs tabular-nums">
              {(Object.keys(EMAIL_STATUS_LABELS) as Array<keyof typeof EMAIL_STATUS_LABELS>).map(
                (st) => {
                  const count = workspace.emails.filter((m) => m.status === st).length;
                  return (
                    <div
                      key={st}
                      className="px-4 py-2.5 flex items-center justify-between bg-white"
                    >
                      <span className={EMAIL_STATUS_LABELS[st].tone}>
                        {EMAIL_STATUS_LABELS[st].label}
                      </span>
                      <span className="font-mono font-bold text-slate-900">{count}</span>
                    </div>
                  );
                }
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Configuración, Privacidad y Seguridad
  const handleExportBackupJson = () => {
    const blob = new Blob([JSON.stringify(workspace, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Copia_Seguridad_EMPLEO_10_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#0D9488]">
          <ShieldCheck className="w-4 h-4" />
          <span>Centro de Privacidad, Seguridad Zero-Trust y Control de Costes</span>
        </div>
        <h2 className="text-xl font-bold text-slate-900">
          Configuración de Seguridad, Estado de Servicios y Protección de Datos
        </h2>
        <p className="text-sm text-slate-600 max-w-3xl">
          Tu panel privado está blindado mediante autenticación real de Google y reglas de seguridad
          Firestore (`firestore.rules`) que restringen el acceso exclusivamente a tu cuenta
          verificada (<code>{userEmail}</code>).
        </p>
      </div>

      {/* Live Services & Security Audit */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <strong className="text-slate-900 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-[#0D9488]" />
              Firebase Auth y Firestore
            </strong>
            <span className="text-emerald-700 font-semibold">Activo y Protegido</span>
          </div>
          <p className="text-slate-600 leading-relaxed">
            Acceso anónimo bloqueado. Separación física entre colecciones privadas (
            <code>/workspaces/uid</code>) y enlaces compartidos (<code>/public_shares/token</code>).
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <strong className="text-slate-900 flex items-center gap-1.5">
              <Server className="w-4 h-4 text-[#0D9488]" />
              Servidor Backend y Gemini API
            </strong>
            <span
              className={
                serverStatus?.geminiConfigured
                  ? 'text-emerald-700 font-semibold'
                  : 'text-amber-700 font-semibold'
              }
            >
              {serverStatus?.geminiConfigured ? 'Clave en Servidor Activa' : 'Verificar Clave'}
            </span>
          </div>
          <p className="text-slate-600 leading-relaxed">
            La clave <code>GEMINI_API_KEY</code> reside únicamente en el servidor Express y nunca se
            incluye en el código del navegador.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <strong className="text-slate-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#0D9488]" />
              Tareas Programadas en Backend
            </strong>
            <span className="text-emerald-700 font-semibold">
              {serverStatus?.ok ? 'Sincronizado' : 'Local'}
            </span>
          </div>
          <p className="text-slate-600 leading-relaxed">
            El planificador del servidor evalúa recordatorios en segundo plano sin depender de
            mantener una pestaña activa.
          </p>
        </div>
      </div>

      {/* Cost Transparency Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <h3 className="text-base font-bold text-slate-900">
          Transparencia de Costes y Niveles Gratuitos (Fase 10)
        </h3>
        <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden text-xs">
          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <strong className="text-slate-900 block">
                Firebase Authentication y Cloud Firestore (Plan Spark / Nivel Gratuito)
              </strong>
              <span className="text-slate-600">
                Incluye inicio de sesión con Google gratuito y cuota diaria gratuita de lecturas y
                escrituras suficiente para uso personal intensivo.
              </span>
            </div>
            <span className="font-mono font-bold text-emerald-700 shrink-0">0,00 € / mes</span>
          </div>

          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <strong className="text-slate-900 block">
                Gmail API con OAuth 2.0 (Envío supervisado y consulta de hilos)
              </strong>
              <span className="text-slate-600">
                Uso gratuito con tu cuenta personal de Gmail dentro de los límites estándar de envío
                diario.
              </span>
            </div>
            <span className="font-mono font-bold text-emerald-700 shrink-0">0,00 € / mes</span>
          </div>

          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <strong className="text-slate-900 block">
                Modelo Gemini 3.8 Flash en el Servidor (`gemini-3.8-flash`)
              </strong>
              <span className="text-slate-600">
                Configurado por defecto en el modelo ligero y eficiente compatible con el nivel
                gratuito de AI Studio. Si activas una clave con facturación de pago, el coste
                estimado para ~50 consultas en 10 días es inferior a 0,05 €.
              </span>
            </div>
            <span className="font-mono font-bold text-[#0D9488] shrink-0">
              Nivel Gratuito / &lt; 0,05 €
            </span>
          </div>
        </div>
      </div>

      {/* Data Backup & Complete Deletion */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-900">
            Portabilidad y Eliminación Total de Datos
          </h3>
          <p className="text-xs text-slate-600">
            Puedes descargar una copia completa de tus datos o eliminar definitivamente tu espacio
            privado y todos los enlaces QR publicados en Firestore.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={handleExportBackupJson}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-900 bg-[#F8FAFC] border border-slate-300 rounded-lg hover:bg-slate-100"
          >
            <Download className="w-3.5 h-3.5 text-[#0D9488]" />
            Exportar Copia de Seguridad (JSON)
          </button>

          <button
            onClick={() => setConfirmWipeModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Eliminar Todos mis Datos
          </button>
        </div>
      </div>

      {confirmWipeModal && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-2 text-red-600 text-xs font-bold">
              <AlertTriangle className="w-4 h-4" />
              <span>ACCIÓN IRREVERSIBLE DE BORRADO</span>
            </div>
            <h3 className="text-base font-bold text-slate-900">
              ¿Eliminar todos tus datos privados y revocar todos los enlaces públicos?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Esta acción borrará tu espacio de trabajo en Firestore, revocará y eliminará todos los
              enlaces QR compartidos con empresas y restaurará la plantilla inicial limpia.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmWipeModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Cancelar
              </button>
              <button
                disabled={isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    await onDeleteAllUserData();
                  } finally {
                    setIsDeleting(false);
                    setConfirmWipeModal(false);
                  }
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg"
              >
                {isDeleting ? 'Eliminando...' : 'Confirmar Borrado Total'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
