import React, { useState } from 'react';
import {
  Mail,
  Send,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Plus,
  FileText,
  Link2,
} from 'lucide-react';
import {
  EmailLifecycleStatus,
  GmailMessageRecord,
  WorkspaceState,
} from '../types';
import { getAccessToken, googleSignInWithGmail } from '../firebase';

export const EMAIL_STATUS_LABELS: Record<
  EmailLifecycleStatus,
  { label: string; description: string; tone: string }
> = {
  borrador: {
    label: 'Borrador',
    description: 'En preparación local; aún no enviado ni aprobado.',
    tone: 'text-slate-600',
  },
  pendiente_aprobacion: {
    label: 'Pendiente de aprobación',
    description: 'Listo para revisar destinatario, asunto y adjuntos antes de confirmar envío.',
    tone: 'text-amber-700 font-semibold',
  },
  enviado: {
    label: 'Enviado (Sin confirmación de lectura)',
    description:
      'Aceptado por los servidores de salida de Gmail (Message ID registrado). No implica por sí solo entrega final ni apertura.',
    tone: 'text-[#0D9488] font-semibold',
  },
  error_envio: {
    label: 'Error de envío',
    description: 'La API devolvió un error o el permiso OAuth caducó.',
    tone: 'text-red-600 font-semibold',
  },
  entrega_confirmada: {
    label: 'Entrega confirmada (Evidencia verificada)',
    description:
      'Existe evidencia fiable (respuesta en hilo o acuse del servidor receptor) de que llegó al buzón.',
    tone: 'text-emerald-700 font-semibold',
  },
  rebote_rechazo: {
    label: 'Rebote o rechazo (Mailer-Daemon)',
    description:
      'Se ha detectado un mensaje de rebote (Delivery Status Notification) en el hilo.',
    tone: 'text-red-700 font-semibold',
  },
  lectura_confirmada: {
    label: 'Lectura confirmada (Confirmación auténtica)',
    description:
      'Existe respuesta directa del destinatario o confirmación oficial MDN. Sin píxeles invasivos.',
    tone: 'text-emerald-800 font-bold',
  },
  sin_confirmacion_lectura: {
    label: 'Sin confirmación de lectura',
    description:
      'Enviado correctamente, pero el servidor destinatario no emite confirmación de lectura abierta.',
    tone: 'text-slate-700',
  },
};

function encodeRfc2822Base64Url(
  to: string,
  subject: string,
  bodyText: string
): string {
  const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
  const rawEmail = [
    `To: ${to}`,
    `Subject: ${utf8Subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    bodyText,
  ].join('\r\n');

  const base64 = btoa(unescape(encodeURIComponent(rawEmail)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

interface GmailTrackerProps {
  workspace: WorkspaceState;
  selectedEmailId?: string;
  onUpdateWorkspace: (updater: (prev: WorkspaceState) => WorkspaceState) => void;
}

export const GmailTracker: React.FC<GmailTrackerProps> = ({
  workspace,
  selectedEmailId,
  onUpdateWorkspace,
}) => {
  const [activeId, setActiveId] = useState<string>(
    selectedEmailId || workspace.emails[0]?.id || ''
  );
  const [confirmSendModal, setConfirmSendModal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isCheckingReplies, setIsCheckingReplies] = useState(false);
  const [actionFeedback, setActionFeedback] = useState('');
  const [oauthConnected, setOauthConnected] = useState<boolean>(
    Boolean(getAccessToken())
  );

  const activeEmail =
    workspace.emails.find((m) => m.id === activeId) || workspace.emails[0];

  const handleConnectGmailOAuth = async () => {
    setActionFeedback('');
    try {
      const res = await googleSignInWithGmail();
      if (res.accessToken) {
        setOauthConnected(true);
        setActionFeedback(
          'Cuenta de Gmail conectada con éxito en memoria segura (OAuth 2.0).'
        );
      }
    } catch (err: any) {
      setActionFeedback(`No se pudo conectar Gmail: ${err.message}`);
    }
  };

  const handleCreateNewDraft = () => {
    const shareUrl = `${window.location.origin}/?share=${
      workspace.shareLinks[0]?.token || 'empresa-torrijos-2026'
    }`;
    const newMail: GmailMessageRecord = {
      id: `mail-${Date.now()}`,
      recipientEmail: '',
      recipientCompany: 'Nueva Empresa Destinataria',
      subject: `Candidatura Administración y Atención al Cliente — ${workspace.profile.fullName}`,
      bodyText: `Estimado equipo de selección:

Me pongo en contacto con ustedes para remitir mi candidatura a un puesto de Administración, Recepción o Atención al Cliente en jornada completa de 8 horas.

Resido en Santo Domingo-Caudilla (Toledo), dispongo de permiso de conducir y coche propio, formación administrativa y el Certificado de Inteligencia Artificial de 120 horas expedido por la Cámara de Comercio de Toledo.

Pueden consultar mi presentación profesional y descargar mi CV autorizado en:
${shareUrl}

Quedo a su disposición para ampliar cualquier información en una entrevista.

Un cordial saludo,
${workspace.profile.fullName}`,
      attachedCvId: workspace.documents[0]?.id,
      attachedShareUrl: shareUrl,
      status: 'borrador',
    };

    onUpdateWorkspace((prev) => ({
      ...prev,
      emails: [newMail, ...prev.emails],
    }));
    setActiveId(newMail.id);
  };

  const handleCreateFollowUpDraft = (original: GmailMessageRecord) => {
    const followUp: GmailMessageRecord = {
      id: `mail-followup-${Date.now()}`,
      applicationId: original.applicationId,
      recipientEmail: original.recipientEmail,
      recipientCompany: original.recipientCompany,
      subject: `Seguimiento de candidatura: ${original.subject}`,
      bodyText: `Estimado equipo de ${original.recipientCompany}:

Espero que se encuentren muy bien. Les escribo brevemente en relación con la candidatura que les remití recientemente para reiterar mi interés en colaborar con su equipo en labores de administración, recepción o atención al cliente.

Sigo con plena disponibilidad en Santo Domingo-Caudilla / comarca de Torrijos (con vehículo propio) para incorporarme en jornada completa de 8 horas.

Reciban un cordial saludo,
${workspace.profile.fullName}`,
      attachedCvId: original.attachedCvId,
      attachedShareUrl: original.attachedShareUrl,
      status: 'borrador',
    };

    onUpdateWorkspace((prev) => ({
      ...prev,
      emails: [followUp, ...prev.emails],
    }));
    setActiveId(followUp.id);
    setActionFeedback('Borrador de seguimiento creado. Revísalo antes de aprobar su envío.');
  };

  const buildComposedBodyWithAttachments = (mail: GmailMessageRecord): string => {
    const parts = [mail.bodyText.trim()];
    if (mail.attachedShareUrl) {
      parts.push(`\n---\nEnlace a mi Presentación Profesional y CV Autorizado:\n${mail.attachedShareUrl}`);
    }
    if (mail.attachedCvId) {
      const docItem = workspace.documents.find((d) => d.id === mail.attachedCvId);
      if (docItem) {
        parts.push(`\n---\nRESUMEN DE DOCUMENTO ADJUNTO (${docItem.title}):\n${docItem.contentBody}`);
      }
    }
    return parts.join('\n');
  };

  const handleExecuteConfirmedSend = async () => {
    if (!activeEmail) return;
    setConfirmSendModal(false);
    setIsSending(true);
    setActionFeedback('');

    try {
      let token = getAccessToken();
      if (!token) {
        const signRes = await googleSignInWithGmail();
        token = signRes.accessToken;
        setOauthConnected(Boolean(token));
      }
      if (!token) {
        throw new Error('No se obtuvo token OAuth de Gmail. Vuelve a conectar tu cuenta.');
      }

      const fullBody = buildComposedBodyWithAttachments(activeEmail);
      const raw = encodeRfc2822Base64Url(
        activeEmail.recipientEmail.trim(),
        activeEmail.subject.trim(),
        fullBody
      );

      const response = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ raw }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data?.error?.message || `Error HTTP ${response.status} al enviar por Gmail API.`
        );
      }

      const nowIso = new Date().toISOString();
      onUpdateWorkspace((prev) => ({
        ...prev,
        emails: prev.emails.map((m) =>
          m.id === activeEmail.id
            ? {
                ...m,
                status: 'enviado',
                gmailApiMessageId: data.id,
                gmailApiThreadId: data.threadId,
                sentAtIso: nowIso,
                lastCheckedIso: nowIso,
                errorDetail: undefined,
              }
            : m
        ),
        kanban: prev.kanban.map((k) =>
          k.id === activeEmail.applicationId
            ? { ...k, status: 'enviada', gmailMessageId: activeEmail.id, updatedAtIso: nowIso }
            : k
        ),
      }));

      setActionFeedback(
        `Correo enviado con éxito mediante Gmail API. Identificador oficial: ${data.id} (Estado: Enviado · Sin confirmación de lectura hasta recibir respuesta).`
      );
    } catch (err: any) {
      onUpdateWorkspace((prev) => ({
        ...prev,
        emails: prev.emails.map((m) =>
          m.id === activeEmail.id
            ? {
                ...m,
                status: 'error_envio',
                errorDetail: err.message,
              }
            : m
        ),
      }));
      setActionFeedback(`Error de envío: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleCheckThreadReplies = async () => {
    if (!activeEmail?.gmailApiThreadId) {
      setActionFeedback(
        'Este correo aún no tiene un identificador de hilo (Thread ID) de Gmail enviado.'
      );
      return;
    }

    setIsCheckingReplies(true);
    setActionFeedback('');
    try {
      let token = getAccessToken();
      if (!token) {
        const signRes = await googleSignInWithGmail();
        token = signRes.accessToken;
        setOauthConnected(Boolean(token));
      }
      if (!token) {
        throw new Error('Conecta tu cuenta de Gmail para consultar respuestas.');
      }

      const res = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/threads/${activeEmail.gmailApiThreadId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const threadData = await res.json();
      if (!res.ok) {
        throw new Error(
          threadData?.error?.message || 'No se pudo consultar el hilo en Gmail API.'
        );
      }

      const messages = Array.isArray(threadData.messages) ? threadData.messages : [];
      const nowIso = new Date().toISOString();

      if (messages.length > 1) {
        const latestMsg = messages[messages.length - 1];
        const snippet = String(latestMsg.snippet || '');
        const isBounce =
          snippet.toLowerCase().includes('delivery status notification') ||
          snippet.toLowerCase().includes('undeliverable') ||
          snippet.toLowerCase().includes('address not found');

        const nextStatus: EmailLifecycleStatus = isBounce
          ? 'rebote_rechazo'
          : 'lectura_confirmada';

        onUpdateWorkspace((prev) => ({
          ...prev,
          emails: prev.emails.map((m) =>
            m.id === activeEmail.id
              ? {
                  ...m,
                  status: nextStatus,
                  replySnippet: snippet,
                  replyReceivedAtIso: nowIso,
                  lastCheckedIso: nowIso,
                }
              : m
          ),
          kanban: prev.kanban.map((k) =>
            k.id === activeEmail.applicationId && !isBounce
              ? { ...k, status: 'respuesta_recibida', updatedAtIso: nowIso }
              : k
          ),
        }));

        setActionFeedback(
          isBounce
            ? 'Se ha detectado un rebote o error de entrega en el hilo de Gmail.'
            : '¡Respuesta detectada en el hilo! Se ha confirmado lectura/entrega y actualizado el Kanban.'
        );
      } else {
        onUpdateWorkspace((prev) => ({
          ...prev,
          emails: prev.emails.map((m) =>
            m.id === activeEmail.id
              ? {
                  ...m,
                  status: 'sin_confirmacion_lectura',
                  lastCheckedIso: nowIso,
                }
              : m
          ),
        }));
        setActionFeedback(
          'Hilo verificado en Gmail: El mensaje figura como enviado sin rebotes, pero aún no hay respuesta ni confirmación de lectura del destinatario.'
        );
      }
    } catch (err: any) {
      setActionFeedback(`Error al consultar hilo: ${err.message}`);
    } finally {
      setIsCheckingReplies(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header & OAuth Status */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#0D9488]">
            <ShieldCheck className="w-4 h-4" />
            <span>Integración Oficial Gmail API (OAuth 2.0) · Cero Envíos Automáticos</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Gestión de Correos y Seguimiento Real sin Falsas Garantías
          </h2>
          <p className="text-sm text-slate-600 max-w-2xl">
            Nunca almacenamos tu contraseña de Gmail. Ningún correo se envía sin tu aprobación
            explícita en pantalla. Distinguimos con rigor técnico entre <strong>Envío</strong>,{' '}
            <strong>Entrega</strong> y <strong>Lectura</strong> (sin usar píxeles espía invasivos).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={handleConnectGmailOAuth}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-900 bg-[#F8FAFC] border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Mail className="w-4 h-4 text-[#0D9488]" />
            {oauthConnected ? 'Renovar Token Gmail OAuth' : 'Conectar mi Cuenta de Gmail'}
          </button>

          <button
            onClick={handleCreateNewDraft}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#0F172A] hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuevo Borrador de Candidatura
          </button>
        </div>
      </div>

      {actionFeedback && (
        <div className="p-4 bg-slate-900 text-white rounded-xl text-xs flex items-center justify-between gap-4">
          <span>{actionFeedback}</span>
          <button
            onClick={() => setActionFeedback('')}
            className="text-slate-300 hover:text-white shrink-0"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Honest Explanation of the 8 Email Lifecycle States */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900">
          Glosario de Estados Reales de Correo (Sin Confundir Envío, Entrega ni Lectura)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {(Object.keys(EMAIL_STATUS_LABELS) as EmailLifecycleStatus[]).map((st) => (
            <div key={st} className="p-3 bg-[#F8FAFC] border border-slate-200 rounded-lg space-y-1">
              <div className={EMAIL_STATUS_LABELS[st].tone}>
                {EMAIL_STATUS_LABELS[st].label}
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                {EMAIL_STATUS_LABELS[st].description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Main Split: Email List + Composer & Review */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-3">
          <h3 className="text-base font-bold text-slate-900">
            Bandeja de Candidaturas ({workspace.emails.length})
          </h3>
          {workspace.emails.map((mail) => {
            const stInfo = EMAIL_STATUS_LABELS[mail.status];
            return (
              <div
                key={mail.id}
                onClick={() => setActiveId(mail.id)}
                className={`p-4 bg-white border rounded-xl cursor-pointer transition-colors space-y-1.5 text-xs ${
                  mail.id === activeEmail?.id
                    ? 'border-[#0F172A] ring-1 ring-[#0F172A]'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={stInfo.tone}>{stInfo.label}</span>
                  {mail.sentAtIso && (
                    <span className="text-slate-400 tabular-nums">
                      {mail.sentAtIso.slice(0, 10)}
                    </span>
                  )}
                </div>
                <div className="font-bold text-slate-900 truncate">{mail.recipientCompany}</div>
                <div className="text-slate-600 truncate">{mail.subject}</div>
                <div className="text-[11px] text-slate-400 truncate">
                  Para: {mail.recipientEmail || '(Pendiente de indicar correo)'}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Composer & Explicit Confirmation Gate */}
        <div className="lg:col-span-8">
          {activeEmail ? (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <span className={`text-xs ${EMAIL_STATUS_LABELS[activeEmail.status].tone}`}>
                    Estado actual: {EMAIL_STATUS_LABELS[activeEmail.status].label}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                    {activeEmail.recipientCompany}
                  </h3>
                  {activeEmail.gmailApiMessageId && (
                    <p className="text-xs font-mono text-slate-500 mt-0.5">
                      Gmail Message ID: {activeEmail.gmailApiMessageId} · Thread ID:{' '}
                      {activeEmail.gmailApiThreadId}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {activeEmail.gmailApiThreadId && (
                    <button
                      onClick={handleCheckThreadReplies}
                      disabled={isCheckingReplies}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      {isCheckingReplies ? 'Consultando Gmail...' : 'Comprobar Respuestas / Rebote'}
                    </button>
                  )}

                  <button
                    onClick={() => handleCreateFollowUpDraft(activeEmail)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg"
                  >
                    Preparar Seguimiento
                  </button>
                </div>
              </div>

              {activeEmail.replySnippet && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1">
                  <p className="font-bold text-emerald-950">
                    Respuesta / Actualización detectada en el hilo de Gmail:
                  </p>
                  <p className="text-emerald-900 italic">"{activeEmail.replySnippet}"</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Empresa destinataria
                  </label>
                  <input
                    type="text"
                    value={activeEmail.recipientCompany}
                    onChange={(e) => {
                      const val = e.target.value;
                      onUpdateWorkspace((prev) => ({
                        ...prev,
                        emails: prev.emails.map((m) =>
                          m.id === activeEmail.id ? { ...m, recipientCompany: val } : m
                        ),
                      }));
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Correo electrónico del destinatario (Para:)
                  </label>
                  <input
                    type="email"
                    value={activeEmail.recipientEmail}
                    onChange={(e) => {
                      const val = e.target.value;
                      onUpdateWorkspace((prev) => ({
                        ...prev,
                        emails: prev.emails.map((m) =>
                          m.id === activeEmail.id ? { ...m, recipientEmail: val } : m
                        ),
                      }));
                    }}
                    placeholder="rrhh@empresa.es"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="text-xs">
                <label className="block font-semibold text-slate-700 mb-1">Asunto del correo</label>
                <input
                  type="text"
                  value={activeEmail.subject}
                  onChange={(e) => {
                    const val = e.target.value;
                    onUpdateWorkspace((prev) => ({
                      ...prev,
                      emails: prev.emails.map((m) =>
                        m.id === activeEmail.id ? { ...m, subject: val } : m
                      ),
                    }));
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-[#0D9488]" />
                    Adjuntar contenido de Documento (CV / Carta)
                  </label>
                  <select
                    value={activeEmail.attachedCvId || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      onUpdateWorkspace((prev) => ({
                        ...prev,
                        emails: prev.emails.map((m) =>
                          m.id === activeEmail.id ? { ...m, attachedCvId: val || undefined } : m
                        ),
                      }));
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">Sin documento adjunto</option>
                    {workspace.documents.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <Link2 className="w-3.5 h-3.5 text-[#0D9488]" />
                    Enlace Profesional / QR incluido
                  </label>
                  <select
                    value={activeEmail.attachedShareUrl || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      onUpdateWorkspace((prev) => ({
                        ...prev,
                        emails: prev.emails.map((m) =>
                          m.id === activeEmail.id ? { ...m, attachedShareUrl: val || undefined } : m
                        ),
                      }));
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">Sin enlace web</option>
                    {workspace.shareLinks.map((l) => {
                      const url = `${window.location.origin}/?share=${l.token}`;
                      return (
                        <option key={l.token} value={url}>
                          {l.companyName} ({url})
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div className="text-xs">
                <label className="block font-semibold text-slate-700 mb-1">
                  Cuerpo del mensaje
                </label>
                <textarea
                  rows={8}
                  value={activeEmail.bodyText}
                  onChange={(e) => {
                    const val = e.target.value;
                    onUpdateWorkspace((prev) => ({
                      ...prev,
                      emails: prev.emails.map((m) =>
                        m.id === activeEmail.id ? { ...m, bodyText: val } : m
                      ),
                    }));
                  }}
                  className="w-full p-3.5 border border-slate-300 rounded-xl leading-relaxed"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500">Cambiar estado manualmente:</span>
                  <select
                    value={activeEmail.status}
                    onChange={(e) => {
                      const next = e.target.value as EmailLifecycleStatus;
                      onUpdateWorkspace((prev) => ({
                        ...prev,
                        emails: prev.emails.map((m) =>
                          m.id === activeEmail.id ? { ...m, status: next } : m
                        ),
                      }));
                    }}
                    className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                  >
                    {(Object.keys(EMAIL_STATUS_LABELS) as EmailLifecycleStatus[]).map((st) => (
                      <option key={st} value={st}>
                        {EMAIL_STATUS_LABELS[st].label}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => {
                    if (!activeEmail.recipientEmail.trim()) {
                      setActionFeedback('Por favor, indica el correo electrónico del destinatario antes de revisar el envío.');
                      return;
                    }
                    onUpdateWorkspace((prev) => ({
                      ...prev,
                      emails: prev.emails.map((m) =>
                        m.id === activeEmail.id ? { ...m, status: 'pendiente_aprobacion' } : m
                      ),
                    }));
                    setConfirmSendModal(true);
                  }}
                  disabled={isSending}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-lg transition-colors"
                >
                  <Send className="w-4 h-4" />
                  {isSending ? 'Enviando...' : 'Revisar y Aprobar Envío por Gmail'}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Mandatory Explicit Confirmation Modal before Sending Email */}
      {confirmSendModal && activeEmail && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-2 text-amber-700 text-xs font-bold">
              <AlertTriangle className="w-4 h-4" />
              <span>CONFIRMACIÓN EXPLÍCITA OBLIGATORIA ANTES DE ENVIAR</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Revisa todos los datos antes de autorizar el envío real por Gmail
            </h3>

            <div className="p-4 bg-[#F8FAFC] border border-slate-200 rounded-xl space-y-2 text-xs">
              <p>
                <strong>Destinatario:</strong> {activeEmail.recipientEmail} (
                {activeEmail.recipientCompany})
              </p>
              <p>
                <strong>Asunto:</strong> {activeEmail.subject}
              </p>
              <p>
                <strong>Enlace QR incluido:</strong>{' '}
                {activeEmail.attachedShareUrl || 'Ninguno'}
              </p>
              <div className="pt-2 border-t border-slate-200">
                <strong className="block mb-1">Vista previa exacta del mensaje final:</strong>
                <pre className="whitespace-pre-wrap font-sans text-slate-700 max-h-48 overflow-y-auto bg-white p-3 rounded border border-slate-200">
                  {buildComposedBodyWithAttachments(activeEmail)}
                </pre>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmSendModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Cancelar y seguir editando
              </button>
              <button
                onClick={handleExecuteConfirmedSend}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#0F172A] hover:bg-slate-800 rounded-lg"
              >
                <CheckCircle2 className="w-4 h-4 text-teal-400" />
                Autorizo y Confirmo el Envío Ahora
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
