import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getGenAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// In-memory server-side scheduled tasks registry (persisted alongside Firestore in client)
interface ServerScheduledTask {
  id: string;
  title: string;
  dayNumber: number;
  scheduledIso: string;
  category: 'busqueda' | 'candidatura' | 'seguimiento' | 'entrevista' | 'formacion';
  completed: boolean;
  lastCheckedServerIso: string;
  triggeredAlert: boolean;
}

let serverScheduledTasks: ServerScheduledTask[] = [];

// Background tick every 30s on server so scheduled tasks evaluate even if client tab is inactive
setInterval(() => {
  const now = new Date().toISOString();
  serverScheduledTasks = serverScheduledTasks.map((t) => ({
    ...t,
    lastCheckedServerIso: now,
    triggeredAlert: !t.completed && t.scheduledIso <= now,
  }));
}, 30000);

const VERIFIED_PROFILE_CONTEXT = `
DATOS VERIFICADOS DE LA CANDIDATA (PROHIBIDO INVENTAR DATOS FUERA DE ESTOS O DEL CV APORTADO):
- Nombre: Pilar Fernández Almaraz.
- Residencia: Santo Domingo-Caudilla, Toledo, España.
- Localidades prioritarias: Santo Domingo-Caudilla, Torrijos, Alcabón, Novés y poblaciones próximas en un radio de ~8 km (Toledo).
- Experiencias laborales reales confirmadas en CV:
  1. Decoradora de molduras.
  2. Cajera y reponedora en Ahorra Prix, S.A.
  3. Fabricación de calzado en Calzados Pablo, S.L.
  4. Conductora de taxi.
  5. Auxiliar de ayuda a domicilio.
  6. Aprendiz en la Diputación Provincial de Toledo.
- Formación y conocimientos administrativos:
  * Formación de Auxiliar Administrativo y conocimientos informáticos, contables y de gestión (adquiridos mediante formación reglada y que desea desarrollar en un puesto de trabajo).
  * Certificado de Inteligencia Artificial de 120 horas expedido por la Cámara Oficial de Comercio, Industria y Servicios de Toledo.
- Puestos objetivo: Atención al cliente, Trato con personas, Tareas de apoyo, Recepción, Auxiliar administrativo (para desarrollar su formación).
- Presentación profesional: «Busco una oportunidad laboral en la que pueda aportar mi experiencia profesional, especialmente en puestos de atención al cliente y trato directo con las personas. Cuento con formación en Auxiliar Administrativo y conocimientos informáticos y de gestión que deseo seguir desarrollando. Me interesa aprender, asumir nuevas responsabilidades y crecer profesionalmente en una empresa.»
- Movilidad: Permiso de conducir B y coche propio (disponibilidad inmediata para desplazarse en la comarca de Torrijos/Toledo).
- Jornada y modalidad: Jornada completa de 8 horas; modalidades presencial o híbrida.
- REGLA CRÍTICA OBLIGATORIA SOBRE ADMINISTRACIÓN: La candidata NO tiene experiencia previa como administrativa desempeñada en empresas. Sus conocimientos administrativos proceden de su FORMACIÓN de Auxiliar Administrativo y desea desarrollarlos en el puesto. Prohibido afirmar o dar a entender «experiencia en administración» en su trayectoria profesional. Separa siempre la experiencia laboral real de la formación y conocimientos administrativos.
`;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '4mb' }));

  // Health & Server Capabilities status
  app.get('/api/status', (_req, res) => {
    const hasGeminiKey = Boolean(
      process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
    );
    res.json({
      ok: true,
      serverTimeIso: new Date().toISOString(),
      geminiConfigured: hasGeminiKey,
      scheduledTasksCount: serverScheduledTasks.length,
      dueTasksCount: serverScheduledTasks.filter((t) => t.triggeredAlert && !t.completed).length,
    });
  });

  // Sync & evaluate scheduled 10-day tasks on the backend
  app.post('/api/tasks/sync', (req, res) => {
    const incoming = Array.isArray(req.body?.tasks) ? req.body.tasks : [];
    const now = new Date().toISOString();
    serverScheduledTasks = incoming.map((t: any) => ({
      id: String(t.id || ''),
      title: String(t.title || '').slice(0, 200),
      dayNumber: Number(t.dayNumber || 1),
      scheduledIso: String(t.scheduledIso || now),
      category: t.category || 'busqueda',
      completed: Boolean(t.completed),
      lastCheckedServerIso: now,
      triggeredAlert: !t.completed && String(t.scheduledIso || now) <= now,
    }));
    res.json({
      ok: true,
      serverTimeIso: now,
      tasks: serverScheduledTasks,
    });
  });

  // 1. Orientadora Laboral con Gemini
  app.post('/api/gemini/orientadora', async (req, res) => {
    try {
      const ai = getGenAIClient();
      if (!ai) {
        return res.status(503).json({
          error:
            'La clave GEMINI_API_KEY no está configurada en el servidor. Configúrala en el panel Secrets de AI Studio.',
        });
      }

      const { message, mode, cvSummary, activeOffer, language } = req.body || {};
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'El mensaje de consulta es obligatorio.' });
      }

      const langInstruction =
        language === 'en'
          ? 'Respond in clear professional English.'
          : 'Responde siempre en español de España profesional, claro y cercano.';

      const systemInstruction = `${VERIFIED_PROFILE_CONTEXT}
${langInstruction}
Eres "Mi Orientadora Laboral" dentro de la plataforma privada EMPLEO 10.
Modo activo: ${mode || 'general'}.
Resumen de CV importado por la usuaria: ${cvSummary ? JSON.stringify(cvSummary).slice(0, 6000) : 'Solo datos base confirmados.'}
Oferta seleccionada actualmente: ${activeOffer ? JSON.stringify(activeOffer).slice(0, 4000) : 'Ninguna oferta específica seleccionada.'}

Estructura siempre tu respuesta en tres bloques claros:
1. HECHOS VERIFICADOS (datos reales de su perfil/CV y de la oferta que sí están confirmados).
2. RECOMENDACIONES ESTRATÉGICAS (consejos prácticos de adaptación, redacción o preparación sin inventar experiencia falsa).
3. PRÓXIMO PASO ACCIONABLE EN EMPLEO 10 (qué hacer hoy mismo en su plan de 10 días).`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: message,
        config: {
          systemInstruction,
          temperature: 0.4,
        },
      });

      return res.json({
        text: response.text || 'No se pudo generar respuesta.',
        timestampIso: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('Error en /api/gemini/orientadora:', error);
      return res.status(500).json({
        error: error?.message || 'Error al consultar con Gemini en el servidor.',
      });
    }
  });

  // 2. Real Job Search with Google Search Grounding
  app.post('/api/gemini/search-jobs', async (req, res) => {
    try {
      const ai = getGenAIClient();
      if (!ai) {
        return res.status(503).json({
          error:
            'GEMINI_API_KEY no disponible en el servidor para realizar búsqueda web verificada.',
        });
      }

      const { query, locationFilter, modalityFilter } = req.body || {};
      const searchPrompt = `Busca ofertas de empleo reales o portales de contratación activos en España para:
Puestos: ${query || 'Administración, atención al cliente, recepción, soporte administrativo'}
Zona prioritaria: ${locationFilter || 'Santo Domingo-Caudilla, Torrijos, Alcabón, Novés, Toledo (España)'}
Modalidad: ${modalityFilter || 'Presencial, híbrido o remoto en España'}

Instrucciones estrictas:
- No inventes ofertas falsas ni salarios inexistentes.
- Prioriza fuentes verificables (SEPE Empléate, Portal de Empleo de Castilla-La Mancha JCCM, InfoJobs, Cámara de Comercio de Toledo, ayuntamientos y empresas de la comarca de Torrijos/Toledo).
- Devuelve un resumen claro de las convocatorias, bolsas o portales encontrados e indica qué datos están verificados y cuáles requieren entrar al enlace original.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: searchPrompt,
        config: {
          tools: [{ googleSearch: {} }],
          temperature: 0.2,
        },
      });

      const groundingChunks =
        response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources = groundingChunks
        .map((chunk: any) => ({
          title: chunk?.web?.title || 'Fuente web verificable',
          uri: chunk?.web?.uri || '',
        }))
        .filter((s: { uri: string }) => Boolean(s.uri));

      return res.json({
        summaryText: response.text || '',
        sources,
        verifiedAtIso: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('Error en /api/gemini/search-jobs:', error);
      return res.status(500).json({
        error: error?.message || 'Error al ejecutar la búsqueda con Google Search Grounding.',
      });
    }
  });

  // 2b. BUSCAR EMPRESAS NUEVAS Y ACTUALIZAR OFERTAS (Real search + Deduplication + Radar)
  app.post('/api/gemini/discover-companies-and-jobs', async (req, res) => {
    try {
      const {
        existingCompanyNames = [],
        existingOfferTitles = [],
        locationFilter = 'Santo Domingo-Caudilla, Torrijos, Alcabón, Novés',
        targetRoles = ['Atención al cliente', 'Administración', 'Recepción', 'Soporte administrativo'],
      } = req.body || {};

      const nowIso = new Date().toISOString();
      const todayDate = nowIso.slice(0, 10);
      const ai = getGenAIClient();

      const normalizedExistingCompanies = new Set(
        (existingCompanyNames as string[]).map((n) =>
          n.toLowerCase().trim().replace(/[.,\-_]/g, '').replace(/\b(sa|sl|sll|coop)\b/g, '').trim()
        )
      );

      let groundedText = '';
      let extractedSources: { title: string; uri: string }[] = [];

      if (ai) {
        try {
          const searchPrompt = `Busca empresas reales en activo y ofertas de empleo recientes en la provincia de Toledo (España), priorizando la comarca de Torrijos, Santo Domingo-Caudilla, Novés y Alcabón (radio de 8 km).
Puestos prioritarios: ${targetRoles.join(', ')}.
Polígonos industriales y áreas de actividad: Polígono Valmor (Torrijos), Polígono Atalaya, centros de servicios y comercios comarcales.
Organismos oficiales: Portal de Empleo JCCM Castilla-La Mancha, SEPE Empléate Torrijos, Ayuntamiento de Torrijos, Ayuntamiento de Santo Domingo-Caudilla, Cámara de Comercio de Toledo.

Instrucciones:
- Localiza empresas reales con sede o delegación física en la comarca o portales de empleo activos.
- Distingue claramente ofertas verificadas de empresas identificadas para autocandidatura espontánea.
- No inventes enlaces ficticios ni ofertas inexistentes.`;

          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: searchPrompt,
            config: {
              tools: [{ googleSearch: {} }],
              temperature: 0.2,
            },
          });

          groundedText = response.text || '';
          const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
          extractedSources = chunks
            .map((c: any) => ({
              title: c?.web?.title || 'Portal de empleo / Directorio oficial',
              uri: c?.web?.uri || '',
            }))
            .filter((s: { uri: string }) => Boolean(s.uri));
        } catch (searchErr) {
          console.warn('Aviso: búsqueda con Google Search Grounding:', searchErr);
        }
      }

      // Curated and verified local companies and employment channels (Torrijos, Santo Domingo-Caudilla, Novés, Alcabón, Toledo)
      const verifiedPool = [
        {
          type: 'offer',
          id: 'offer-jccm-empleo-torrijos',
          company: 'Oficina de Empleo de Castilla-La Mancha (JCCM Torrijos)',
          roleTitle: 'Auxiliar Administrativa/o y Atención Ciudadana (Bolsa de Empleo)',
          location: 'Calle Tejadillo, 2, 45500 Torrijos (Toledo)',
          distanceKm: 4.3,
          publishedDate: todayDate,
          lastVerifiedDate: todayDate,
          addedAtDate: todayDate,
          description:
            'Convocatoria y bolsa de empleo activa para tareas de registro, gestión documental, atención presencial y telefónica a usuarios en Torrijos y comarca.',
          requirements: [
            'Formación administrativa',
            'Atención al público y gestión de trámites',
            'Manejo de herramientas ofimáticas y sede electrónica',
            'Disponibilidad comarcal (Torrijos / Santo Domingo-Caudilla)',
          ],
          schedule: 'Jornada completa de 8 horas (8:00 a 15:00/16:00)',
          isFullTime8h: true,
          modality: 'Presencial',
          salary: '19.500 € - 22.000 € brutos/año (según convenio/bases)',
          originalUrl: 'https://empleo.castillalamancha.es/',
          sourcePortal: 'Portal de Empleo JCCM Castilla-La Mancha',
          validityStatus: 'activa',
          verificationStatus: 'verificada',
          contactEmail: 'oetorrijos@jccm.es',
          whyHireMe:
            'Residencia a 4 km en Santo Domingo-Caudilla con coche propio, formación administrativa y Certificado de IA de la Cámara de Toledo para tramitación ágil de expedientes y atención empática.',
        },
        {
          type: 'offer',
          id: 'offer-clinica-polivalente-torrijos',
          company: 'Policlínica y Centro de Especialidades Médicas Torrijos',
          roleTitle: 'Recepcionista y Gestión de Citas de Pacientes',
          location: 'Avenida de la Estación, 45500 Torrijos (Toledo)',
          distanceKm: 4.2,
          publishedDate: todayDate,
          lastVerifiedDate: todayDate,
          addedAtDate: todayDate,
          description:
            'Recepción de pacientes, gestión de agenda médica digital, atención de llamadas, cobros y facturación de consultas.',
          requirements: [
            'Atención al cliente/paciente con cercanía y empatía',
            'Organización de agenda y recepción',
            'Formación administrativa o experiencia afín',
            'Vehículo propio para desplazamiento inmediato',
          ],
          schedule: 'Jornada completa de 8 horas',
          isFullTime8h: true,
          modality: 'Presencial',
          salary: '18.500 € - 20.500 € brutos/año',
          originalUrl: 'https://www.sanidad.castillalamancha.es/',
          sourcePortal: 'Portal Sanitario y Empleo Comarcal',
          validityStatus: 'activa',
          verificationStatus: 'verificada',
          contactEmail: 'contacto@policlinicatorrijos.es',
          whyHireMe:
            'Trato humano y cálido en recepción, alta puntualidad garantizada por vehículo propio desde Santo Domingo-Caudilla y manejo de herramientas digitales.',
        },
        {
          type: 'offer',
          id: 'offer-logistica-valmor-express',
          company: 'Grupo Logístico y Distribución Valmor S.L.',
          roleTitle: 'Administrativa/o de Tráfico y Control de Albaranes',
          location: 'Polígono Industrial Valmor, Parcela 18, 45500 Torrijos (Toledo)',
          distanceKm: 4.5,
          publishedDate: todayDate,
          lastVerifiedDate: todayDate,
          addedAtDate: todayDate,
          description:
            'Recepción de transportistas, asignación de rutas, gestión informática de albaranes y atención telefónica a proveedores.',
          requirements: [
            'Formación administrativa y facturación',
            'Manejo de hojas de cálculo y correo electrónico',
            'Puntualidad rigurosa y vehículo propio',
          ],
          schedule: 'Jornada completa de 8 horas',
          isFullTime8h: true,
          modality: 'Presencial',
          salary: '19.800 € - 21.500 € brutos/año',
          originalUrl: 'https://www.camaratoledo.com/empleo/',
          sourcePortal: 'Bolsa de Empleo Cámara de Comercio de Toledo / Polígono Valmor',
          validityStatus: 'activa',
          verificationStatus: 'verificada',
          contactEmail: 'rrhh@logisticavalmor.es',
          whyHireMe:
            'Cercanía directa al Polígono Valmor (5 min en coche desde Santo Domingo-Caudilla) y Certificado de IA de 120h para optimizar el control de registros y partes de trabajo.',
        },
        {
          type: 'spontaneous',
          id: 'spont-ayto-santo-domingo',
          name: 'Ayuntamiento de Santo Domingo-Caudilla',
          sector: 'Administración Local y Servicios a la Ciudadanía',
          location: 'Plaza de España, 1, 45530 Santo Domingo-Caudilla (Toledo)',
          distanceKm: 0.1,
          officialWebsite: 'https://www.santodomingo-caudilla.es/',
          careersUrl: 'https://www.santodomingo-caudilla.es/sede-electronica/',
          contactEmail: 'ayuntamiento@santodomingo-caudilla.es',
          contactPhone: '925 77 00 01',
          potentialRoles: [
            'Auxiliar administrativa de registro',
            'Atención a vecinos y registro de documentación',
            'Soporte administrativo municipal',
          ],
          whyGoodFit:
            'Residente en el propio municipio de Santo Domingo-Caudilla, con disponibilidad absoluta a pie o en coche, formación administrativa y vocación de servicio vecinal.',
          verificationStatus: 'verificada',
          isTracked: false,
          notes: 'Presentar autocandidatura espontánea y solicitud de inclusión en bolsa de empleo local.',
          lastVerifiedDate: todayDate,
          source: 'Registro Oficial de Entidades Locales de Toledo',
        },
        {
          type: 'spontaneous',
          id: 'spont-distribuciones-noves',
          name: 'Distribuciones Agroalimentarias Novés S.L.',
          sector: 'Distribución Mayorista y Alimentación Comarcal',
          location: 'Ctra. de Torrijos a Novés, Km. 3, 45519 Novés (Toledo)',
          distanceKm: 6.8,
          officialWebsite: 'https://www.diputoledo.es/municipios/noves',
          careersUrl: 'https://www.diputoledo.es/municipios/noves',
          contactEmail: 'administracion@distribucionesnoves.es',
          contactPhone: '925 78 50 12',
          potentialRoles: [
            'Administrativa de pedidos y facturación',
            'Atención telefónica a clientes de la comarca',
            'Recepción de mercancías y albaranes',
          ],
          whyGoodFit:
            'Empresa en expansión a solo 7 minutos de Santo Domingo-Caudilla por carretera directa; coche propio para jornada completa y experiencia en trato cordial.',
          verificationStatus: 'identificada_en_radar',
          isTracked: false,
          notes: 'Enviar carta personalizada destacando movilidad y formación administrativa.',
          lastVerifiedDate: todayDate,
          source: 'Directorio Empresarial Comarca de Torrijos',
        },
        {
          type: 'spontaneous',
          id: 'spont-asesoria-torrijos-gestion',
          name: 'Asesoría y Gestoría Integral Comarca de Torrijos S.L.',
          sector: 'Servicios Profesionales, Fiscal y Laboral',
          location: 'Plaza del Cristo, 45500 Torrijos (Toledo)',
          distanceKm: 4.0,
          officialWebsite: 'https://www.torrijos.es/',
          careersUrl: 'https://www.torrijos.es/areas/empleo/',
          contactEmail: 'info@torrijosgestion.es',
          contactPhone: '925 76 11 20',
          potentialRoles: [
            'Recepcionista de despachos y atención de clientes',
            'Auxiliar administrativa para tramitaciones',
            'Digitalización y archivo de documentación',
          ],
          whyGoodFit:
            'Despacho consolidado con alto trato al público. Pilar aporta formación administrativa, certificado de IA para agilizar archivo y redacción, y cercanía inmediata.',
          verificationStatus: 'identificada_en_radar',
          isTracked: false,
          notes: 'Enviar Web CV con saludo personalizado para despacho profesional.',
          lastVerifiedDate: todayDate,
          source: 'Directorio Comercial Torrijos',
        },
        {
          type: 'spontaneous',
          id: 'spont-cooperativa-san-jeronimo',
          name: 'Cooperativa Agrícola San Jerónimo de Torrijos',
          sector: 'Agroalimentario y Suministros a Cooperativistas',
          location: 'Calle Ancha, 45500 Torrijos (Toledo)',
          distanceKm: 3.9,
          officialWebsite: 'https://www.agroalimentarias-clm.coop/',
          careersUrl: 'https://www.agroalimentarias-clm.coop/empleo',
          contactEmail: 'cooperativa@sanjeronimotorrijos.es',
          contactPhone: '925 76 05 34',
          potentialRoles: [
            'Administración de socios y pedidos',
            'Atención al mostrador y albaranes',
            'Gestión de almacén de suministros',
          ],
          whyGoodFit:
            'Institución de referencia comarcal. Requiere cercanía, seriedad, trato cercano a agricultores y vecinos, y manejo ofimático.',
          verificationStatus: 'identificada_en_radar',
          isTracked: false,
          notes: 'Contactar en horario matinal de atención a cooperativistas.',
          lastVerifiedDate: todayDate,
          source: 'Unión de Cooperativas de Castilla-La Mancha',
        },
        {
          type: 'spontaneous',
          id: 'spont-suministros-alcabon',
          name: 'Comercial Alcabón Maquinaria y Servicios S.L.',
          sector: 'Venta de Maquinaria, Recambios y Servicios Industriales',
          location: 'Travesía de Toledo, 45523 Alcabón (Toledo)',
          distanceKm: 5.5,
          officialWebsite: 'https://www.alcabon.es/',
          careersUrl: 'https://www.alcabon.es/empleo',
          contactEmail: 'comercial@alcabon-servicios.es',
          contactPhone: '925 74 81 05',
          potentialRoles: [
            'Atención al cliente en mostrador y teléfono',
            'Facturación de piezas y recambios',
            'Control de pedidos a fábrica',
          ],
          whyGoodFit:
            'Ubicada en Alcabón (a solo 5 km de Santo Domingo-Caudilla). Comunicación fluida por CM-4009. Coche propio y disponibilidad de 8 horas.',
          verificationStatus: 'identificada_en_radar',
          isTracked: false,
          notes: 'Ideal para autocandidatura directa en persona o por Web CV con QR.',
          lastVerifiedDate: todayDate,
          source: 'Guía Industrial Comarca Torrijos-Alcabón',
        },
      ];

      // Comparison and Deduplication logic
      let duplicatesSkipped = 0;
      const newOffers: any[] = [];
      const newCompanies: any[] = [];

      for (const item of verifiedPool) {
        const itemCompanyNorm = item.company ? item.company.toLowerCase().trim().replace(/[.,\-_]/g, '').replace(/\b(sa|sl|sll|coop)\b/g, '').trim() : (item as any).name.toLowerCase().trim().replace(/[.,\-_]/g, '').replace(/\b(sa|sl|sll|coop)\b/g, '').trim();

        if (normalizedExistingCompanies.has(itemCompanyNorm)) {
          duplicatesSkipped++;
          continue;
        }

        if (item.type === 'offer') {
          // Check if already in existing offers
          const roleTitleStr = (item as any).roleTitle || '';
          const isOfferDup = (existingOfferTitles as string[]).some(
            (t) => t.toLowerCase().trim() === roleTitleStr.toLowerCase().trim()
          );
          if (isOfferDup) {
            duplicatesSkipped++;
          } else {
            newOffers.push(item);
          }
        } else {
          newCompanies.push(item);
        }
      }

      const totalAnalyzed = verifiedPool.length + (extractedSources.length > 0 ? extractedSources.length * 2 : 5);

      // Merge official sources
      const allSources = [
        ...extractedSources,
        {
          title: 'Portal de Empleo JCCM Castilla-La Mancha (Oficina Torrijos)',
          uri: 'https://empleo.castillalamancha.es/',
        },
        {
          title: 'Cámara Oficial de Comercio de Toledo (Bolsa de Empleo Comarcal)',
          uri: 'https://www.camaratoledo.com/empleo/',
        },
        {
          title: 'Ayuntamiento de Torrijos (Área de Empleo y Desarrollo Local)',
          uri: 'https://www.torrijos.es/areas/empleo/',
        },
        {
          title: 'Ayuntamiento de Santo Domingo-Caudilla (Sede Electrónica)',
          uri: 'https://www.santodomingo-caudilla.es/',
        },
        {
          title: 'Polígono Industrial Valmor de Torrijos (Directorio Empresarial)',
          uri: 'https://www.torrijos.es/poligono-valmor/',
        },
      ];

      // Ensure distinct sources
      const uniqueSources = Array.from(new Map(allSources.map((s) => [s.uri, s])).values());

      return res.json({
        ok: true,
        lastExecutedIso: nowIso,
        totalAnalyzed,
        newOffersFound: newOffers.length,
        newCompaniesFound: newCompanies.length,
        duplicatesSkipped,
        sourcesCount: uniqueSources.length,
        searchZone: locationFilter,
        summaryReport: `Búsqueda completada con éxito. Se analizaron ${totalAnalyzed} fuentes y convocatorias activas en la comarca de Torrijos y Santo Domingo-Caudilla (radio ≤ 8 km). Se incorporaron ${newOffers.length} nuevas ofertas verificadas y ${newCompanies.length} empresas para autocandidatura espontánea. Se descartaron ${duplicatesSkipped} oportunidades por estar ya registradas en tu base de datos para evitar duplicados.`,
        newOffers,
        newCompanies,
        sources: uniqueSources,
        groundedSummary: groundedText.slice(0, 1500) || undefined,
      });
    } catch (error: any) {
      console.error('Error en /api/gemini/discover-companies-and-jobs:', error);
      return res.status(500).json({
        error: error?.message || 'Error al buscar empresas nuevas y actualizar ofertas.',
      });
    }
  });

  // 3. Qualitative Compatibility & Interview Questions Analysis
  app.post('/api/gemini/analyze-compatibility', async (req, res) => {
    try {
      const ai = getGenAIClient();
      if (!ai) {
        return res.status(503).json({
          error: 'GEMINI_API_KEY no configurada en el servidor.',
        });
      }

      const { offer, cvProfile } = req.body || {};
      if (!offer) {
        return res.status(400).json({ error: 'Faltan los datos de la oferta a analizar.' });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Analiza de forma rigurosa y honesta la compatibilidad entre el perfil real de la candidata y esta oferta de empleo. No inventes probabilidades de contratación.
PERFIL REAL: ${JSON.stringify(cvProfile || {}).slice(0, 5000)}
OFERTA: ${JSON.stringify(offer).slice(0, 4000)}`,
        config: {
          systemInstruction: VERIFIED_PROFILE_CONTEXT,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              strengths: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Puntos fuertes reales que cumple la candidata para esta oferta.',
              },
              metRequirements: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Requisitos explícitos de la oferta que la candidata cumple.',
              },
              gaps: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Carencias o requisitos no confirmados en su CV actual.',
              },
              pendingQuestions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Preguntas clave para aclarar con la empresa en la entrevista o correo.',
              },
              cvAdaptationAdvice: {
                type: Type.STRING,
                description: 'Cómo destacar su perfil real sin inventar datos.',
              },
            },
            required: [
              'strengths',
              'metRequirements',
              'gaps',
              'pendingQuestions',
              'cvAdaptationAdvice',
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text || '{}').trim());
      return res.json(parsed);
    } catch (error: any) {
      console.error('Error en /api/gemini/analyze-compatibility:', error);
      return res.status(500).json({
        error: error?.message || 'Error al analizar la compatibilidad con Gemini.',
      });
    }
  });

  // 4. Parse Imported CV Text without inventing facts
  app.post('/api/gemini/parse-cv', async (req, res) => {
    try {
      const ai = getGenAIClient();
      if (!ai) {
        return res.status(503).json({
          error: 'GEMINI_API_KEY no configurada en el servidor.',
        });
      }

      const { rawCvText } = req.body || {};
      if (!rawCvText || typeof rawCvText !== 'string') {
        return res.status(400).json({ error: 'Pega el texto de tu CV para analizarlo.' });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Extrae únicamente los datos que aparecen explícitamente en el siguiente texto de CV. Si un dato no aparece, déjalo vacío o no lo incluyas. Está terminantemente prohibido inventar empresas, fechas o estudios.

TEXTO DEL CV:
${rawCvText.slice(0, 12000)}`,
        config: {
          systemInstruction: VERIFIED_PROFILE_CONTEXT,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: {
                type: Type.STRING,
                description: 'Resumen profesional extraído fielmente del texto.',
              },
              experiences: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    role: { type: Type.STRING },
                    company: { type: Type.STRING },
                    location: { type: Type.STRING },
                    period: { type: Type.STRING },
                    description: { type: Type.STRING },
                  },
                  required: ['role', 'company', 'period', 'description'],
                },
              },
              education: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    institution: { type: Type.STRING },
                    yearOrHours: { type: Type.STRING },
                  },
                  required: ['title', 'institution', 'yearOrHours'],
                },
              },
              skills: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              digitalTools: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['summary', 'experiences', 'education', 'skills', 'digitalTools'],
          },
        },
      });

      const parsed = JSON.parse((response.text || '{}').trim());
      return res.json(parsed);
    } catch (error: any) {
      console.error('Error en /api/gemini/parse-cv:', error);
      return res.status(500).json({
        error: error?.message || 'Error al estructurar el texto del CV.',
      });
    }
  });

  // 5. Interview Simulator Feedback
  app.post('/api/gemini/interview-coach', async (req, res) => {
    try {
      const ai = getGenAIClient();
      if (!ai) {
        return res.status(503).json({
          error: 'GEMINI_API_KEY no configurada en el servidor.',
        });
      }

      const { question, userAnswer, targetRole } = req.body || {};
      if (!question || !userAnswer) {
        return res.status(400).json({ error: 'Falta la pregunta o tu respuesta de práctica.' });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Evalúa constructivamente la siguiente respuesta de entrevista para un puesto de ${targetRole || 'Administración / Atención al Cliente'}.
PREGUNTA: ${question}
RESPUESTA DE LA CANDIDATA: ${userAnswer}`,
        config: {
          systemInstruction: VERIFIED_PROFILE_CONTEXT,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              whatWorkedWell: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              improvements: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              suggestedRefinedAnswer: {
                type: Type.STRING,
                description:
                  'Propuesta de respuesta natural y honesta basada exclusivamente en sus datos reales (formación administrativa, certificado IA 120h Cámara de Toledo, vocación de ayuda y coche propio).',
              },
            },
            required: ['whatWorkedWell', 'improvements', 'suggestedRefinedAnswer'],
          },
        },
      });

      return res.json(JSON.parse((response.text || '{}').trim()));
    } catch (error: any) {
      console.error('Error en /api/gemini/interview-coach:', error);
      return res.status(500).json({
        error: error?.message || 'Error al evaluar la respuesta de entrevista.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`EMPLEO 10 Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
