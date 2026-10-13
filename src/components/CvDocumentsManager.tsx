import React, { useState } from 'react';
import {
  FileText,
  Download,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Trash2,
  Award,
} from 'lucide-react';
import {
  CustomDocumentItem,
  ExperienceItem,
  RecommendationLetterItem,
  WorkspaceState,
} from '../types';
import {
  exportCustomDocumentToDocx,
  exportCustomDocumentToPdf,
  exportProfileCvToDocx,
  exportProfileCvToPdf,
} from '../utils/documentExport';

interface CvDocumentsManagerProps {
  workspace: WorkspaceState;
  onUpdateWorkspace: (updater: (prev: WorkspaceState) => WorkspaceState) => void;
}

export const CvDocumentsManager: React.FC<CvDocumentsManagerProps> = ({
  workspace,
  onUpdateWorkspace,
}) => {
  const [rawCvInput, setRawCvInput] = useState('');
  const [isParsingCv, setIsParsingCv] = useState(false);
  const [parseFeedback, setParseFeedback] = useState('');
  const [parsedPreview, setParsedPreview] = useState<any>(null);

  // Manual Experience form
  const [expRole, setExpRole] = useState('');
  const [expCompany, setExpCompany] = useState('');
  const [expLocation, setExpLocation] = useState('Toledo / Torrijos');
  const [expPeriod, setExpPeriod] = useState('');
  const [expDesc, setExpDesc] = useState('');

  // Authentic Recommendation Letter form
  const [recAuthor, setRecAuthor] = useState('');
  const [recRoleCompany, setRecRoleCompany] = useState('');
  const [recContext, setRecContext] = useState('');
  const [recDate, setRecDate] = useState('');
  const [recStatement, setRecStatement] = useState('');
  const [recConfirmedAuthentic, setRecConfirmedAuthentic] = useState(false);

  // Custom Document editor
  const [selectedDocId, setSelectedDocId] = useState<string>(
    workspace.documents[0]?.id || ''
  );
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocType, setNewDocType] = useState<
    'cv_adaptado' | 'carta_presentacion' | 'carta_recomendacion'
  >('carta_presentacion');
  const [newDocCompany, setNewDocCompany] = useState('');
  const [newDocRole, setNewDocRole] = useState('Administración y Atención al Cliente');

  const activeDoc =
    workspace.documents.find((d) => d.id === selectedDocId) || workspace.documents[0];

  const handleParsePreviousCv = async () => {
    if (!rawCvInput.trim()) return;
    setIsParsingCv(true);
    setParseFeedback('');
    try {
      const res = await fetch('/api/gemini/parse-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawCvText: rawCvInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo analizar el texto del CV.');
      }
      setParsedPreview(data);
      setParseFeedback(
        'Extracción completada. Revisa los datos reales extraídos y pulsa en "Confirmar e Incorporar a mi Perfil" para guardarlos.'
      );
    } catch (err: any) {
      setParseFeedback(`Error: ${err.message}`);
    } finally {
      setIsParsingCv(false);
    }
  };

  const handleApproveParsedCv = () => {
    if (!parsedPreview) return;
    const importedExps: ExperienceItem[] = Array.isArray(parsedPreview.experiences)
      ? parsedPreview.experiences.map((e: any, idx: number) => ({
          id: `exp-imp-${Date.now()}-${idx}`,
          role: String(e.role || 'Puesto verificado'),
          company: String(e.company || 'Empresa verificada'),
          location: String(e.location || 'Toledo'),
          period: String(e.period || ''),
          description: String(e.description || ''),
          verifiedByOwner: true,
        }))
      : [];

    onUpdateWorkspace((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        experiences: [...importedExps, ...prev.profile.experiences],
        confirmedSkills: Array.from(
          new Set([...prev.profile.confirmedSkills, ...(parsedPreview.skills || [])])
        ),
        digitalTools: Array.from(
          new Set([...prev.profile.digitalTools, ...(parsedPreview.digitalTools || [])])
        ),
      },
    }));

    setParsedPreview(null);
    setRawCvInput('');
    setParseFeedback('¡Experiencias y competencias reales incorporadas y verificadas en tu CV!');
  };

  const handleAddManualExperience = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expRole.trim() || !expCompany.trim()) return;
    const item: ExperienceItem = {
      id: `exp-${Date.now()}`,
      role: expRole.trim(),
      company: expCompany.trim(),
      location: expLocation.trim(),
      period: expPeriod.trim(),
      description: expDesc.trim(),
      verifiedByOwner: true,
    };
    onUpdateWorkspace((prev) => {
      const nextExps = [item, ...prev.profile.experiences];
      if (typeof window !== 'undefined') {
        localStorage.setItem('empleo10_experiences', JSON.stringify(nextExps));
      }
      return {
        ...prev,
        profile: {
          ...prev.profile,
          experiences: nextExps,
        },
      };
    });
    setExpRole('');
    setExpCompany('');
    setExpPeriod('');
    setExpDesc('');
  };

  const handleAddAuthenticRecommendation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recConfirmedAuthentic || !recAuthor.trim() || !recStatement.trim()) return;
    const rec: RecommendationLetterItem = {
      id: `rec-${Date.now()}`,
      authorName: recAuthor.trim(),
      authorRoleAndCompany: recRoleCompany.trim(),
      relationshipContext: recContext.trim(),
      dateText: recDate.trim() || new Date().toISOString().slice(0, 10),
      authenticStatement: recStatement.trim(),
      confirmedAuthenticByUser: true,
    };

    const docItem: CustomDocumentItem = {
      id: `doc-rec-${Date.now()}`,
      title: `Carta de Recomendación Autorizada — ${rec.authorName}`,
      docType: 'carta_recomendacion',
      targetCompany: rec.authorRoleAndCompany,
      targetRole: 'Referencia Profesional Verificada',
      contentBody: `CARTA DE REFERENCIA / RECOMENDACIÓN PROFESIONAL (TEXTO AUTÉNTICO AUTORIZADO)

Autor/a de la referencia: ${rec.authorName}
Cargo y Entidad: ${rec.authorRoleAndCompany}
Relación profesional: ${rec.relationshipContext}
Fecha de referencia: ${rec.dateText}

Declaración literal autorizada:
"${rec.authenticStatement}"

Nota de autenticidad: Este documento reproduce únicamente información auténtica aportada y autorizada por la titular sin firmas digitales simuladas.`,
      updatedAtIso: new Date().toISOString(),
    };

    onUpdateWorkspace((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        recommendationLetters: [rec, ...prev.profile.recommendationLetters],
      },
      documents: [docItem, ...prev.documents],
    }));

    setSelectedDocId(docItem.id);
    setRecAuthor('');
    setRecRoleCompany('');
    setRecContext('');
    setRecDate('');
    setRecStatement('');
    setRecConfirmedAuthentic(false);
  };

  const handleCreateCustomDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim()) return;
    const id = `doc-${Date.now()}`;
    const defaultBody =
      newDocType === 'cv_adaptado'
        ? `CV ADAPTADO PARA: ${newDocCompany || 'EMPRESA DESTINATARIA'}
PUESTO: ${newDocRole}

CANDIDATA: ${workspace.profile.fullName}
Ubicación: ${workspace.profile.residence} (Permiso de conducir y coche propio)
Disponibilidad: Jornada completa de 8 horas (Presencial, Híbrida o Remota)

FORMACIÓN VERIFICADA:
• Certificado de Inteligencia Artificial Aplicada (120 horas) — Cámara de Comercio de Toledo.
• Formación Administrativa.

EXPERIENCIA VERIFICADA:
${
  workspace.profile.experiences.length > 0
    ? workspace.profile.experiences
        .map((ex) => `• ${ex.role} en ${ex.company} (${ex.period}): ${ex.description}`)
        .join('\n')
    : '• (Añade o importa tus experiencias reales en el panel izquierdo).'
}`
        : `Estimado equipo de selección de ${newDocCompany || 'su empresa'}:

Les escribo con el fin de presentar mi candidatura para la vacante de ${newDocRole}. Resido en Santo Domingo-Caudilla (Toledo) y cuento con permiso de conducir y vehículo propio para desplazarme cómodamente en horario de jornada completa de 8 horas.

Dispongo de formación administrativa y del Certificado de Inteligencia Artificial de 120 horas expedido por la Cámara de Comercio de Toledo, además de una firme vocación por ayudar a las personas, atender consultas con amabilidad y seguir aprendiendo.

Quedo a su disposición para mantener una entrevista cuando lo consideren oportuno.

Reciban un cordial saludo,
${workspace.profile.fullName}`;

    const newItem: CustomDocumentItem = {
      id,
      title: newDocTitle.trim(),
      docType: newDocType,
      targetCompany: newDocCompany.trim() || 'General',
      targetRole: newDocRole.trim() || 'Administración / Atención al Cliente',
      contentBody: defaultBody,
      updatedAtIso: new Date().toISOString(),
    };

    onUpdateWorkspace((prev) => ({
      ...prev,
      documents: [newItem, ...prev.documents],
    }));
    setSelectedDocId(id);
    setNewDocTitle('');
    setNewDocCompany('');
  };

  return (
    <div className="space-y-8">
      {/* Top Action Bar for Master Verified CV Export */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#0D9488]">
            <CheckCircle2 className="w-4 h-4" />
            <span>Garantía de Veracidad · Cero Datos Inventados</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Mi CV Verificado, Cartas de Presentación y Recomendaciones (PDF / DOCX)
          </h2>
          <p className="text-sm text-slate-600 max-w-2xl">
            Tu CV original nunca se publica completo por defecto. Desde aquí puedes importar tu CV
            anterior para extraer tus experiencias reales, editar cartas adaptadas y descargar en
            formato <strong>PDF</strong> o <strong>DOCX</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={() => exportProfileCvToPdf(workspace.profile)}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#0F172A] hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-4 h-4 text-teal-400" />
            Descargar CV Maestro (PDF)
          </button>
          <button
            onClick={() => exportProfileCvToDocx(workspace.profile)}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-900 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <FileText className="w-4 h-4 text-[#0D9488]" />
            Descargar CV Maestro (DOCX)
          </button>
        </div>
      </div>

      {/* Importer + Manual Experience Builder */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#0D9488]" />
            1. Importar mi CV Anterior (Con Revisión Humana)
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Pega aquí el texto de tu CV anterior. El extractor estructurará únicamente los puestos,
            empresas y fechas que aparezcan en tu documento, sin inventar ningún dato.
          </p>
          <textarea
            rows={5}
            value={rawCvInput}
            onChange={(e) => setRawCvInput(e.target.value)}
            placeholder="Pega aquí el contenido de tu CV anterior (experiencia laboral, empresas, fechas, formación adicional)..."
            className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
          />
          <button
            onClick={handleParsePreviousCv}
            disabled={isParsingCv || !rawCvInput.trim()}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] disabled:opacity-50 rounded-lg transition-colors"
          >
            {isParsingCv ? 'Analizando texto fielmente...' : 'Extraer Datos de mi CV Anterior'}
          </button>

          {parseFeedback && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
              {parseFeedback}
            </div>
          )}

          {parsedPreview && (
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-emerald-950">
                Vista previa de datos extraídos ({parsedPreview.experiences?.length || 0}{' '}
                experiencias detectadas):
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto text-xs text-slate-700">
                {(parsedPreview.experiences || []).map((ex: any, i: number) => (
                  <div key={i} className="p-2 bg-white rounded border border-emerald-100">
                    <strong>{ex.role}</strong> · {ex.company} ({ex.period})
                    <p className="text-slate-600 mt-0.5">{ex.description}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={handleApproveParsedCv}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
                >
                  Confirmar e Incorporar a mi Perfil
                </button>
                <button
                  onClick={() => setParsedPreview(null)}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Descartar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Add Verified Experience Manually */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-900">
            2. Experiencias Laborales Verificadas ({workspace.profile.experiences.length})
          </h3>
          <form onSubmit={handleAddManualExperience} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                required
                value={expRole}
                onChange={(e) => setExpRole(e.target.value)}
                placeholder="Puesto (ej. Recepcionista / Administrativa)"
                className="px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
              <input
                type="text"
                required
                value={expCompany}
                onChange={(e) => setExpCompany(e.target.value)}
                placeholder="Empresa real"
                className="px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={expLocation}
                onChange={(e) => setExpLocation(e.target.value)}
                placeholder="Localidad"
                className="px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
              <input
                type="text"
                required
                value={expPeriod}
                onChange={(e) => setExpPeriod(e.target.value)}
                placeholder="Periodo real (ej. 2022 - 2024)"
                className="px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>
            <textarea
              rows={2}
              required
              value={expDesc}
              onChange={(e) => setExpDesc(e.target.value)}
              placeholder="Funciones reales desempeñadas..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
            />
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-[#0F172A] hover:bg-slate-800 rounded-lg"
            >
              Añadir Experiencia Verificada
            </button>
          </form>

          <div className="space-y-2 max-h-48 overflow-y-auto pt-2 border-t border-slate-200">
            {workspace.profile.experiences.length === 0 ? (
              <p className="text-xs text-slate-500">
                Aún no has cargado experiencias previas. No hemos inventado ninguna empresa por
                seguridad.
              </p>
            ) : (
              workspace.profile.experiences.map((exp) => (
                <div
                  key={exp.id}
                  className="p-3 bg-[#F8FAFC] border border-slate-200 rounded-lg flex items-start justify-between gap-2 text-xs"
                >
                  <div>
                    <p className="font-bold text-slate-900">
                      {exp.role} · {exp.company}
                    </p>
                    <p className="text-slate-500 tabular-nums">
                      {exp.location} · {exp.period}
                    </p>
                    <p className="text-slate-700 mt-1">{exp.description}</p>
                  </div>
                  <button
                    onClick={() =>
                      onUpdateWorkspace((prev) => {
                        const nextExps = prev.profile.experiences.filter((e) => e.id !== exp.id);
                        if (typeof window !== 'undefined') {
                          localStorage.setItem('empleo10_experiences', JSON.stringify(nextExps));
                        }
                        return {
                          ...prev,
                          profile: {
                            ...prev.profile,
                            experiences: nextExps,
                          },
                        };
                      })
                    }
                    className="text-slate-400 hover:text-red-600 p-1"
                    title="Eliminar experiencia"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Custom Document Editor & Authentic Recommendation Letter Creator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-6">
          {/* Create new tailored CV or Cover Letter */}
          <form
            onSubmit={handleCreateCustomDoc}
            className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
          >
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#0D9488]" />
              Crear Documento Adaptado (CV o Carta)
            </h3>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Título del documento
              </label>
              <input
                type="text"
                required
                value={newDocTitle}
                onChange={(e) => setNewDocTitle(e.target.value)}
                placeholder="Ej. Carta de Presentación — Clínica Torrijos"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo</label>
                <select
                  value={newDocType}
                  onChange={(e) => setNewDocType(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="carta_presentacion">Carta de Presentación</option>
                  <option value="cv_adaptado">CV Adaptado a Oferta</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Empresa destinataria
                </label>
                <input
                  type="text"
                  value={newDocCompany}
                  onChange={(e) => setNewDocCompany(e.target.value)}
                  placeholder="Nombre de la empresa"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-2 px-4 text-xs font-semibold text-white bg-[#0F172A] hover:bg-slate-800 rounded-lg"
            >
              Generar Borrador Editable
            </button>
          </form>

          {/* Authentic Recommendation Letter Builder */}
          <form
            onSubmit={handleAddAuthenticRecommendation}
            className="bg-white border border-slate-200 rounded-xl p-6 space-y-3"
          >
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-[#0D9488]" />
              Carta de Recomendación (Solo Datos Auténticos)
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              No inventamos firmas ni declaraciones de terceros. Registra únicamente referencias
              reales cuyo texto y autoría estés autorizada a compartir.
            </p>
            <input
              type="text"
              required
              value={recAuthor}
              onChange={(e) => setRecAuthor(e.target.value)}
              placeholder="Nombre completo del referente real"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                required
                value={recRoleCompany}
                onChange={(e) => setRecRoleCompany(e.target.value)}
                placeholder="Cargo y empresa del referente"
                className="px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
              <input
                type="text"
                required
                value={recContext}
                onChange={(e) => setRecContext(e.target.value)}
                placeholder="Relación laboral/formativa"
                className="px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>
            <textarea
              rows={3}
              required
              value={recStatement}
              onChange={(e) => setRecStatement(e.target.value)}
              placeholder="Texto literal de la recomendación real autorizada..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
            />
            <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={recConfirmedAuthentic}
                onChange={(e) => setRecConfirmedAuthentic(e.target.checked)}
                className="mt-0.5 rounded border-slate-300"
              />
              <span>
                Confirmo que esta recomendación proviene de una fuente auténtica y cuento con
                autorización para incluirla.
              </span>
            </label>
            <button
              type="submit"
              className="w-full py-2 px-4 text-xs font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-lg"
            >
              Crear Carta de Recomendación Verificada
            </button>
          </form>
        </div>

        {/* Live Document Editor and PDF/DOCX Exporter */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Editor y Vista Previa de Documentos ({workspace.documents.length})
              </h3>
              <p className="text-xs text-slate-500">
                Selecciona cualquier documento para editar su contenido y descargarlo en PDF o DOCX.
              </p>
            </div>

            {activeDoc && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    exportCustomDocumentToPdf(activeDoc, workspace.profile.fullName)
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0F172A] hover:bg-slate-800 rounded-lg"
                >
                  <Download className="w-3.5 h-3.5 text-teal-400" />
                  Descargar PDF
                </button>
                <button
                  onClick={() =>
                    exportCustomDocumentToDocx(activeDoc, workspace.profile.fullName)
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-900 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg"
                >
                  <FileText className="w-3.5 h-3.5 text-[#0D9488]" />
                  Descargar DOCX
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {workspace.documents.map((docItem) => (
              <button
                key={docItem.id}
                onClick={() => setSelectedDocId(docItem.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  docItem.id === activeDoc?.id
                    ? 'bg-[#0F172A] text-white border-[#0F172A]'
                    : 'bg-[#F8FAFC] text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {docItem.title}
              </button>
            ))}
          </div>

          {activeDoc ? (
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Título del documento
                  </label>
                  <input
                    type="text"
                    value={activeDoc.title}
                    onChange={(e) => {
                      const val = e.target.value;
                      onUpdateWorkspace((prev) => ({
                        ...prev,
                        documents: prev.documents.map((d) =>
                          d.id === activeDoc.id ? { ...d, title: val } : d
                        ),
                      }));
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Empresa / Destinatario
                  </label>
                  <input
                    type="text"
                    value={activeDoc.targetCompany}
                    onChange={(e) => {
                      const val = e.target.value;
                      onUpdateWorkspace((prev) => ({
                        ...prev,
                        documents: prev.documents.map((d) =>
                          d.id === activeDoc.id ? { ...d, targetCompany: val } : d
                        ),
                      }));
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contenido completo (editable antes de exportar a PDF/DOCX o adjuntar en Gmail)
                </label>
                <textarea
                  rows={14}
                  value={activeDoc.contentBody}
                  onChange={(e) => {
                    const val = e.target.value;
                    onUpdateWorkspace((prev) => ({
                      ...prev,
                      documents: prev.documents.map((d) =>
                        d.id === activeDoc.id
                          ? { ...d, contentBody: val, updatedAtIso: new Date().toISOString() }
                          : d
                      ),
                    }));
                  }}
                  className="w-full p-4 text-sm border border-slate-300 rounded-xl font-sans leading-relaxed"
                />
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-500">
              No hay documentos seleccionados.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
