import React, { useState } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  Calendar,
  Mail,
  FileText,
  QrCode,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  GmailMessageRecord,
  KanbanApplication,
  KanbanStatus,
  WorkspaceState,
} from '../types';

export const KANBAN_COLUMNS: { key: KanbanStatus; label: string }[] = [
  { key: 'nueva', label: '1. Nueva' },
  { key: 'pendiente_revisar', label: '2. Pendiente de revisar' },
  { key: 'en_preparacion', label: '3. En preparación' },
  { key: 'lista_enviar', label: '4. Lista para enviar' },
  { key: 'enviada', label: '5. Enviada' },
  { key: 'respuesta_recibida', label: '6. Respuesta recibida' },
  { key: 'entrevista', label: '7. Entrevista' },
  { key: 'seguimiento_pendiente', label: '8. Seguimiento pendiente' },
  { key: 'oferta_recibida', label: '9. Oferta recibida' },
  { key: 'cerrada', label: '10. Cerrada' },
];

interface KanbanBoardProps {
  workspace: WorkspaceState;
  onUpdateWorkspace: (updater: (prev: WorkspaceState) => WorkspaceState) => void;
  onOpenGmailWithDraft: (emailId: string) => void;
  onOpenQuickSend: (card: KanbanApplication) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  workspace,
  onUpdateWorkspace,
  onOpenGmailWithDraft,
  onOpenQuickSend,
}) => {
  const [selectedCardId, setSelectedCardId] = useState<string>(
    workspace.kanban[0]?.id || ''
  );
  const [newCompany, setNewCompany] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newLocation, setNewLocation] = useState('Torrijos, Toledo');

  const activeCard =
    workspace.kanban.find((k) => k.id === selectedCardId) || workspace.kanban[0];

  const handleMoveStatus = (card: KanbanApplication, direction: -1 | 1) => {
    const currentIndex = KANBAN_COLUMNS.findIndex((c) => c.key === card.status);
    const nextIndex = currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= KANBAN_COLUMNS.length) return;
    const nextStatus = KANBAN_COLUMNS[nextIndex].key;

    onUpdateWorkspace((prev) => ({
      ...prev,
      kanban: prev.kanban.map((k) =>
        k.id === card.id
          ? { ...k, status: nextStatus, updatedAtIso: new Date().toISOString() }
          : k
      ),
    }));
  };

  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompany.trim() || !newRole.trim()) return;
    const card: KanbanApplication = {
      id: `kan-${Date.now()}`,
      offerId: workspace.offers[0]?.id || '',
      companyName: newCompany.trim(),
      roleTitle: newRole.trim(),
      location: newLocation.trim(),
      status: 'nueva',
      cvDocumentId: workspace.documents[0]?.id,
      shareLinkToken: workspace.shareLinks[0]?.token,
      notes: 'Candidatura registrada en el tablero Kanban.',
      updatedAtIso: new Date().toISOString(),
    };
    onUpdateWorkspace((prev) => ({
      ...prev,
      kanban: [card, ...prev.kanban],
    }));
    setSelectedCardId(card.id);
    setNewCompany('');
    setNewRole('');
  };

  const handlePrepareEmailFromCard = (card: KanbanApplication) => {
    const existingEmail = workspace.emails.find((m) => m.applicationId === card.id);
    if (existingEmail) {
      onOpenGmailWithDraft(existingEmail.id);
      return;
    }

    const shareUrl = card.shareLinkToken
      ? `${window.location.origin}/?share=${card.shareLinkToken}`
      : `${window.location.origin}/?share=${workspace.shareLinks[0]?.token || ''}`;

    const newDraft: GmailMessageRecord = {
      id: `mail-${Date.now()}`,
      applicationId: card.id,
      recipientEmail: '',
      recipientCompany: card.companyName,
      subject: `Candidatura: ${card.roleTitle} — ${workspace.profile.fullName}`,
      bodyText: `Estimado equipo de selección de ${card.companyName}:

Les remito mi candidatura para el puesto de ${card.roleTitle}. Resido en Santo Domingo-Caudilla (Toledo), cuento con permiso de conducir y vehículo propio, formación administrativa y el Certificado de Inteligencia Artificial de 120 horas por la Cámara de Comercio de Toledo.

Pueden consultar mi presentación profesional y descargar mi CV autorizado en:
${shareUrl}

Atentamente,
${workspace.profile.fullName}`,
      attachedCvId: card.cvDocumentId || workspace.documents[0]?.id,
      attachedCoverLetterId: card.coverLetterId,
      attachedShareUrl: shareUrl,
      status: 'borrador',
    };

    onUpdateWorkspace((prev) => ({
      ...prev,
      emails: [newDraft, ...prev.emails],
      kanban: prev.kanban.map((k) =>
        k.id === card.id ? { ...k, gmailMessageId: newDraft.id } : k
      ),
    }));
    onOpenGmailWithDraft(newDraft.id);
  };

  const totalApps = workspace.kanban.length;
  const sentCount = workspace.kanban.filter((k) =>
    ['enviada', 'respuesta_recibida', 'entrevista', 'seguimiento_pendiente', 'oferta_recibida'].includes(
      k.status
    )
  ).length;
  const replyCount = workspace.kanban.filter((k) =>
    ['respuesta_recibida', 'entrevista', 'oferta_recibida'].includes(k.status)
  ).length;
  const interviewCount = workspace.kanban.filter((k) => k.status === 'entrevista').length;

  return (
    <div className="space-y-8">
      {/* Summary KPI Strip */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Tablero Kanban de Candidaturas (10 Estados de Ciclo Completo)
            </h2>
            <p className="text-sm text-slate-600 mt-0.5">
              Cada tarjeta relaciona oferta, versión de CV, carta de presentación, enlace QR y
              correo de Gmail con recordatorios de seguimiento.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs tabular-nums">
            <div>
              <span className="text-slate-500 block">Total Candidaturas</span>
              <strong className="text-lg font-mono text-slate-900">{totalApps}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Enviadas / En curso</span>
              <strong className="text-lg font-mono text-[#0D9488]">{sentCount}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Respuestas</span>
              <strong className="text-lg font-mono text-emerald-700">{replyCount}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Entrevistas</span>
              <strong className="text-lg font-mono text-amber-700">{interviewCount}</strong>
            </div>
          </div>
        </div>

        {/* Quick Add Card Form */}
        <form
          onSubmit={handleAddCard}
          className="pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-3"
        >
          <input
            type="text"
            required
            value={newCompany}
            onChange={(e) => setNewCompany(e.target.value)}
            placeholder="Nueva empresa..."
            className="px-3 py-2 text-xs border border-slate-300 rounded-lg"
          />
          <input
            type="text"
            required
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            placeholder="Puesto solicitado..."
            className="px-3 py-2 text-xs border border-slate-300 rounded-lg"
          />
          <input
            type="text"
            value={newLocation}
            onChange={(e) => setNewLocation(e.target.value)}
            placeholder="Localidad / Distancia..."
            className="px-3 py-2 text-xs border border-slate-300 rounded-lg"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0F172A] hover:bg-slate-800 rounded-lg"
          >
            <Plus className="w-3.5 h-3.5" />
            Añadir Candidatura al Kanban
          </button>
        </form>
      </div>

      {/* Horizontal 10-Column Interactive Board */}
      <div className="overflow-x-auto pb-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 min-w-[960px]">
          {KANBAN_COLUMNS.map((col) => {
            const cards = workspace.kanban.filter((k) => k.status === col.key);
            return (
              <div
                key={col.key}
                className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between space-y-3 min-h-[240px]"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2 text-xs">
                    <span className="font-bold text-slate-900">{col.label}</span>
                    <span className="font-mono text-slate-500 tabular-nums">{cards.length}</span>
                  </div>

                  {cards.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 text-center">Sin tarjetas</p>
                  ) : (
                    <div className="space-y-2.5">
                      {cards.map((card) => (
                        <div
                          key={card.id}
                          onClick={() => setSelectedCardId(card.id)}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors space-y-2 text-xs ${
                            card.id === activeCard?.id
                              ? 'bg-[#F8FAFC] border-[#0F172A]'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="font-bold text-slate-900 leading-snug">
                            {card.roleTitle}
                          </div>
                          <div className="text-slate-600">{card.companyName}</div>
                          <div className="text-[11px] text-slate-500 tabular-nums">
                            {card.location} · Act: {card.updatedAtIso.slice(0, 10)}
                          </div>
                          {card.reminderDateIso && (
                            <div className="text-[11px] text-amber-700 font-medium flex items-center gap-1 tabular-nums">
                              <Calendar className="w-3 h-3" />
                              Recordatorio: {card.reminderDateIso}
                            </div>
                          )}
                          <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveStatus(card, -1);
                              }}
                              className="p-1 text-slate-500 hover:text-slate-900"
                              title="Mover a columna anterior"
                            >
                              <ArrowLeft className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenQuickSend(card);
                              }}
                              className="text-[11px] font-bold text-[#0D9488] hover:text-[#0F766E] inline-flex items-center gap-1 bg-teal-50 px-1.5 py-0.5 rounded"
                              title="Revisar y enviar en 1 clic"
                            >
                              <Mail className="w-3 h-3" />
                              Enviar Web CV
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveStatus(card, 1);
                              }}
                              className="p-1 text-slate-500 hover:text-slate-900"
                              title="Avanzar a siguiente columna"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Application Detail & Relational Links */}
      {activeCard && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <span className="text-xs text-[#0D9488] font-semibold">
                Ficha Completa de Candidatura y Relaciones
              </span>
              <h3 className="text-lg font-bold text-slate-900">
                {activeCard.roleTitle} — {activeCard.companyName}
              </h3>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={activeCard.status}
                onChange={(e) => {
                  const next = e.target.value as KanbanStatus;
                  onUpdateWorkspace((prev) => ({
                    ...prev,
                    kanban: prev.kanban.map((k) =>
                      k.id === activeCard.id
                        ? { ...k, status: next, updatedAtIso: new Date().toISOString() }
                        : k
                    ),
                  }));
                }}
                className="px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
              >
                {KANBAN_COLUMNS.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>

              <button
                onClick={() => onOpenQuickSend(activeCard)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-lg shadow-sm"
              >
                <Mail className="w-3.5 h-3.5" />
                Enviar mi Web CV a {activeCard.companyName}
              </button>

              <button
                onClick={() => handlePrepareEmailFromCard(activeCard)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Abrir en Gmail
              </button>

              <button
                onClick={() =>
                  onUpdateWorkspace((prev) => ({
                    ...prev,
                    kanban: prev.kanban.filter((k) => k.id !== activeCard.id),
                  }))
                }
                className="p-2 text-slate-400 hover:text-red-600"
                title="Eliminar candidatura"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-[#0D9488]" />
                CV o Carta Vinculada
              </label>
              <select
                value={activeCard.cvDocumentId || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  onUpdateWorkspace((prev) => ({
                    ...prev,
                    kanban: prev.kanban.map((k) =>
                      k.id === activeCard.id ? { ...k, cvDocumentId: val } : k
                    ),
                  }));
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="">Seleccionar documento...</option>
                {workspace.documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <QrCode className="w-3.5 h-3.5 text-[#0D9488]" />
                Enlace / QR de Empresa Asociado
              </label>
              <select
                value={activeCard.shareLinkToken || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  onUpdateWorkspace((prev) => ({
                    ...prev,
                    kanban: prev.kanban.map((k) =>
                      k.id === activeCard.id ? { ...k, shareLinkToken: val } : k
                    ),
                  }));
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="">Seleccionar enlace QR...</option>
                {workspace.shareLinks.map((l) => (
                  <option key={l.token} value={l.token}>
                    {l.companyName} ({l.token})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                Fecha de Recordatorio de Seguimiento
              </label>
              <input
                type="date"
                value={activeCard.reminderDateIso || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  onUpdateWorkspace((prev) => ({
                    ...prev,
                    kanban: prev.kanban.map((k) =>
                      k.id === activeCard.id ? { ...k, reminderDateIso: val } : k
                    ),
                  }));
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg tabular-nums"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Notas personales e historial de la candidatura
            </label>
            <textarea
              rows={3}
              value={activeCard.notes}
              onChange={(e) => {
                const val = e.target.value;
                onUpdateWorkspace((prev) => ({
                  ...prev,
                  kanban: prev.kanban.map((k) =>
                    k.id === activeCard.id
                      ? { ...k, notes: val, updatedAtIso: new Date().toISOString() }
                      : k
                  ),
                }));
              }}
              className="w-full p-3 text-xs border border-slate-300 rounded-lg leading-relaxed"
            />
          </div>
        </div>
      )}
    </div>
  );
};
