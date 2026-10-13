import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  BookOpen,
} from 'lucide-react';
import {
  AiConversationItem,
  InterviewPracticeSession,
  LanguageCode,
  WorkspaceState,
} from '../types';

const INTERVIEW_QUESTIONS_BANK = [
  {
    role: 'Recepción y Atención al Cliente',
    question:
      '¿Cómo gestionarías en recepción a una persona que acude con una consulta urgente mientras suena el teléfono y tienes una tarea administrativa en curso?',
  },
  {
    role: 'Auxiliar Administrativo y Certificado IA 120h',
    question:
      'Cuentas con formación de Auxiliar Administrativo y el Certificado de Inteligencia Artificial de 120 horas de la Cámara de Comercio de Toledo. ¿Cómo aplicarías esta formación para adaptarte con rapidez a los procesos de nuestra oficina y realizar tareas de facturación, albaranes, archivo y atención?',
  },
  {
    role: 'Gestión de Consultas y Soporte',
    question:
      'Cuéntanos por qué buscas un entorno donde puedas ayudar a las personas y seguir aprendiendo, y cómo te desplazarías diariamente desde Santo Domingo-Caudilla.',
  },
  {
    role: 'Trabajo Híbrido / Remoto (Jornada 8h)',
    question:
      '¿Cómo organizas tu jornada completa de 8 horas cuando trabajas en modalidad remota o híbrida para asegurar que todas las consultas quedan resueltas a tiempo?',
  },
];

interface OrientadoraAndInterviewsProps {
  mode: 'orientadora_ia' | 'entrevistas';
  workspace: WorkspaceState;
  language: LanguageCode;
  onUpdateWorkspace: (updater: (prev: WorkspaceState) => WorkspaceState) => void;
}

export const OrientadoraAndInterviews: React.FC<OrientadoraAndInterviewsProps> = ({
  mode,
  workspace,
  language,
  onUpdateWorkspace,
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const [selectedMode, setSelectedMode] = useState('analizar_ofertas');
  const [selectedOfferId, setSelectedOfferId] = useState(
    workspace.offers[0]?.id || ''
  );
  const [isCallingAi, setIsCallingAi] = useState(false);
  const [aiError, setAiError] = useState('');

  // Interview simulator state
  const [activeQuestion, setActiveQuestion] = useState(
    INTERVIEW_QUESTIONS_BANK[0].question
  );
  const [activeRole, setActiveRole] = useState(INTERVIEW_QUESTIONS_BANK[0].role);
  const [userPracticeAnswer, setUserPracticeAnswer] = useState('');
  const [isEvaluatingInterview, setIsEvaluatingInterview] = useState(false);

  const handleSendToOrientadora = async (customPrompt?: string) => {
    const promptToSend = (customPrompt ?? inputMessage).trim();
    if (!promptToSend) return;

    setIsCallingAi(true);
    setAiError('');
    const userMsg: AiConversationItem = {
      id: `ai-u-${Date.now()}`,
      role: 'user',
      text: promptToSend,
      mode: selectedMode,
      timestampIso: new Date().toISOString(),
    };

    onUpdateWorkspace((prev) => ({
      ...prev,
      aiHistory: [...prev.aiHistory, userMsg],
    }));
    if (!customPrompt) setInputMessage('');

    try {
      const selectedOffer = workspace.offers.find((o) => o.id === selectedOfferId);
      const res = await fetch('/api/gemini/orientadora', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: promptToSend,
          mode: selectedMode,
          cvSummary: {
            residence: workspace.profile.residence,
            education: workspace.profile.education,
            experiences: workspace.profile.experiences,
            confirmedSkills: workspace.profile.confirmedSkills,
          },
          activeOffer: selectedOffer,
          language,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al comunicarse con Gemini.');
      }

      const assistantMsg: AiConversationItem = {
        id: `ai-a-${Date.now()}`,
        role: 'assistant',
        text: data.text,
        mode: selectedMode,
        timestampIso: data.timestampIso || new Date().toISOString(),
      };

      onUpdateWorkspace((prev) => ({
        ...prev,
        aiHistory: [...prev.aiHistory, assistantMsg],
      }));
    } catch (err: any) {
      setAiError(err.message);
    } finally {
      setIsCallingAi(false);
    }
  };

  const handleEvaluatePracticeAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userPracticeAnswer.trim()) return;
    setIsEvaluatingInterview(true);
    setAiError('');

    try {
      const res = await fetch('/api/gemini/interview-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: activeQuestion,
          userAnswer: userPracticeAnswer,
          targetRole: activeRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al evaluar la respuesta.');
      }

      const session: InterviewPracticeSession = {
        id: `int-${Date.now()}`,
        targetRole: activeRole,
        question: activeQuestion,
        userAnswer: userPracticeAnswer,
        whatWorkedWell: data.whatWorkedWell || [],
        improvements: data.improvements || [],
        suggestedRefinedAnswer: data.suggestedRefinedAnswer || '',
        updatedAtIso: new Date().toISOString(),
      };

      onUpdateWorkspace((prev) => ({
        ...prev,
        interviewSessions: [session, ...prev.interviewSessions],
      }));
      setUserPracticeAnswer('');
    } catch (err: any) {
      setAiError(err.message);
    } finally {
      setIsEvaluatingInterview(false);
    }
  };

  if (mode === 'entrevistas') {
    return (
      <div className="space-y-8">
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#0D9488]">
            <BookOpen className="w-4 h-4" />
            <span>Preparador y Simulador de Entrevistas · Hechos Reales</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Entrenamiento de Entrevistas para Administración, Recepción y Atención al Cliente
          </h2>
          <p className="text-sm text-slate-600 max-w-2xl">
            Practica tus respuestas destacando tu formación administrativa, tu Certificado de IA de
            120 horas (Cámara de Comercio de Toledo), tu coche propio desde Santo Domingo-Caudilla y
            tu vocación por ayudar a las personas.
          </p>
        </div>

        {aiError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
            {aiError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Selecciona una Pregunta Clave de Entrevista
            </h3>
            <div className="space-y-3">
              {INTERVIEW_QUESTIONS_BANK.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setActiveRole(item.role);
                    setActiveQuestion(item.question);
                  }}
                  className={`p-4 bg-white border rounded-xl cursor-pointer transition-colors space-y-1.5 text-xs ${
                    activeQuestion === item.question
                      ? 'border-[#0F172A] ring-1 ring-[#0F172A]'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="font-semibold text-[#0D9488]">{item.role}</div>
                  <p className="text-slate-900 font-medium leading-relaxed">{item.question}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-7 space-y-6">
            <form
              onSubmit={handleEvaluatePracticeAnswer}
              className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
            >
              <div className="space-y-1">
                <span className="text-xs font-semibold text-[#0D9488]">{activeRole}</span>
                <h3 className="text-base font-bold text-slate-900">{activeQuestion}</h3>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Escribe cómo responderías en la entrevista real:
                </label>
                <textarea
                  rows={5}
                  required
                  value={userPracticeAnswer}
                  onChange={(e) => setUserPracticeAnswer(e.target.value)}
                  placeholder="Escribe aquí tu respuesta con naturalidad..."
                  className="w-full p-3.5 text-sm border border-slate-300 rounded-xl"
                />
              </div>

              <button
                type="submit"
                disabled={isEvaluatingInterview || !userPracticeAnswer.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#0F172A] hover:bg-slate-800 disabled:opacity-50 rounded-lg"
              >
                <Sparkles className="w-4 h-4 text-teal-400" />
                {isEvaluatingInterview
                  ? 'Evaluando respuesta en servidor...'
                  : 'Evaluar mi Respuesta con Orientadora IA'}
              </button>
            </form>

            {/* Saved Practice Sessions */}
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-900">
                Historial de Respuestas Practicadas ({workspace.interviewSessions.length})
              </h3>
              {workspace.interviewSessions.map((sess) => (
                <div
                  key={sess.id}
                  className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 text-xs"
                >
                  <div className="font-bold text-slate-900">{sess.question}</div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
                    <strong>Tu respuesta:</strong> {sess.userAnswer}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg space-y-1">
                      <strong className="flex items-center gap-1 text-emerald-900">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Puntos fuertes
                      </strong>
                      <ul className="list-disc pl-4 text-emerald-950 space-y-0.5">
                        {sess.whatWorkedWell.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg space-y-1">
                      <strong className="flex items-center gap-1 text-amber-900">
                        <AlertCircle className="w-3.5 h-3.5" /> Cómo mejorarla
                      </strong>
                      <ul className="list-disc pl-4 text-amber-950 space-y-0.5">
                        {sess.improvements.map((imp, i) => (
                          <li key={i}>{imp}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="p-3 bg-[#F8FAFC] border border-slate-200 rounded-lg space-y-1">
                    <strong className="text-slate-900 block">
                      Propuesta pulida (basada solo en tus datos verificados):
                    </strong>
                    <p className="text-slate-700 leading-relaxed">{sess.suggestedRefinedAnswer}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#0D9488]">
              <Sparkles className="w-4 h-4" />
              <span>Mi Orientadora Laboral con Gemini (Conexión Segura en Servidor)</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-0.5">
              Asesoramiento Personalizado: Hechos Verificados vs. Recomendaciones
            </h2>
            <p className="text-sm text-slate-600">
              Utiliza únicamente tus datos reales confirmados y distingue siempre entre hechos y
              recomendaciones estratégicas.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-600 font-medium">Oferta de referencia:</span>
            <select
              value={selectedOfferId}
              onChange={(e) => setSelectedOfferId(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg bg-white max-w-xs truncate"
            >
              {workspace.offers.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.roleTitle} — {o.company}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 9 Quick Action Capabilities */}
        <div className="pt-3 border-t border-slate-200 flex flex-wrap gap-2">
          {[
            {
              mode: 'analizar_ofertas',
              label: '1. Analizar oferta seleccionada',
              prompt:
                'Analiza en detalle la oferta seleccionada, indicando qué hechos de mi perfil encajan y qué dudas debo preguntar.',
            },
            {
              mode: 'preparar_candidatura',
              label: '2. Preparar candidatura',
              prompt:
                'Dime paso a paso cómo presentar una candidatura impecable hoy para la oferta seleccionada.',
            },
            {
              mode: 'adaptar_cv',
              label: '3. Adaptar mi CV sin inventar',
              prompt:
                '¿Cómo debo ordenar y redactar mi resumen de CV para esta oferta usando solo mi formación administrativa, el Certificado IA 120h de la Cámara de Toledo y mi experiencia real?',
            },
            {
              mode: 'crear_carta_correo',
              label: '4. Redactar carta y correo',
              prompt:
                'Redáctame un correo breve y una carta de presentación personalizada para esta empresa incluyendo que resido en Santo Domingo-Caudilla con coche propio.',
            },
            {
              mode: 'preparar_entrevista',
              label: '5. Preparar entrevista',
              prompt:
                '¿Qué 5 preguntas es más probable que me hagan en la entrevista para este puesto y cómo puedo responderlas con seguridad?',
            },
            {
              mode: 'organizar_tareas',
              label: '6. Organizar mis tareas de hoy',
              prompt: `Estoy en el Día ${workspace.currentDayNumber} de mi plan de 10 días. ¿Cuáles son las 3 acciones de mayor impacto que debo completar hoy?`,
            },
            {
              mode: 'comparar_oportunidades',
              label: '7. Comparar mis ofertas guardadas',
              prompt: `Compara las ${workspace.offers.length} ofertas que tengo guardadas según distancia desde Santo Domingo-Caudilla, modalidad y encaje con mi perfil.`,
            },
          ].map((btn) => (
            <button
              key={btn.mode}
              onClick={() => {
                setSelectedMode(btn.mode);
                handleSendToOrientadora(btn.prompt);
              }}
              disabled={isCallingAi}
              className="px-3 py-1.5 text-xs font-medium text-slate-800 bg-[#F8FAFC] hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {aiError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
          {aiError}
        </div>
      )}

      {/* Conversation History + Input */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
        <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
          {workspace.aiHistory.map((msg) => (
            <div
              key={msg.id}
              className={`p-4 rounded-xl border text-sm leading-relaxed whitespace-pre-line ${
                msg.role === 'user'
                  ? 'bg-[#0F172A] text-white border-[#0F172A] ml-auto max-w-2xl'
                  : 'bg-[#F8FAFC] text-slate-800 border-slate-200 mr-auto max-w-3xl'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] opacity-75 mb-1.5 tabular-nums">
                <span className="font-semibold">
                  {msg.role === 'user' ? 'Tu consulta' : 'Orientadora Laboral (Gemini Server)'}
                </span>
                <span>{msg.timestampIso.slice(11, 16)}</span>
              </div>
              <div>{msg.text}</div>
            </div>
          ))}

          {isCallingAi && (
            <div className="p-4 bg-[#F8FAFC] border border-slate-200 rounded-xl max-w-xl animate-pulse space-y-2">
              <div className="h-3.5 w-48 bg-slate-200 rounded" />
              <div className="h-3 w-full bg-slate-100 rounded" />
              <div className="h-3 w-4/5 bg-slate-100 rounded" />
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendToOrientadora();
          }}
          className="flex items-center gap-3 pt-4 border-t border-slate-200"
        >
          <MessageSquare className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Pregúntale a tu Orientadora Laboral sobre una oferta, tu CV, una carta o entrevista..."
            className="flex-1 px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
          />
          <button
            type="submit"
            disabled={isCallingAi || !inputMessage.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] disabled:opacity-50 rounded-lg transition-colors shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            Consultar
          </button>
        </form>
      </div>
    </div>
  );
};
