export type LanguageCode = 'es' | 'en';

export type NavigationTab =
  | 'panel'
  | 'ofertas'
  | 'compatibilidad'
  | 'cv_documentos'
  | 'web_profesional'
  | 'generador_qr'
  | 'orientadora_ia'
  | 'entrevistas'
  | 'kanban'
  | 'gmail'
  | 'estadisticas'
  | 'configuracion';

export interface ExperienceItem {
  id: string;
  role: string;
  company: string;
  location: string;
  period: string;
  description: string;
  verifiedByOwner: boolean;
}

export interface EducationItem {
  id: string;
  title: string;
  institution: string;
  yearOrHours: string;
  verifiedByOwner: boolean;
}

export interface RecommendationLetterItem {
  id: string;
  authorName: string;
  authorRoleAndCompany: string;
  relationshipContext: string;
  dateText: string;
  authenticStatement: string;
  confirmedAuthenticByUser: boolean;
}

export interface CandidateProfile {
  fullName: string;
  headline: string;
  residence: string; // Santo Domingo-Caudilla, Toledo, España
  priorityLocations: string[]; // Santo Domingo-Caudilla, Torrijos, Alcabón, Novés
  maxPriorityRadiusKm: number; // 8 km
  targetRoles: string[]; // Atención al cliente, administración, recepción, soporte y gestión de consultas
  drivingLicenseAndOwnCar: boolean;
  acceptedSchedules: string[]; // Jornada completa de 8 horas
  acceptedModalities: ('Presencial' | 'Híbrido' | 'Remoto')[];
  professionalGoal: string;
  publicContactEmail: string;
  publicContactPhoneOptional: string;
  showPublicEmail?: boolean; // Only shown on public web if explicitly authorized
  showPublicPhoto?: boolean; // Can be toggled on/off by user
  photoUrl?: string; // Profile picture that can be updated anytime
  publicWebEnabled: boolean;
  allowSearchEngineIndexing: boolean; // false by default
  languages?: { language: string; level: string }[];
  experiences: ExperienceItem[];
  education: EducationItem[];
  confirmedSkills: string[];
  digitalTools: string[];
  recommendationLetters: RecommendationLetterItem[];
}

export type OfferValidityStatus = 'nueva' | 'activa' | 'caducada' | 'no_verificada';
export type VerificationType = 'verificada' | 'identificada_en_radar' | 'pendiente_confirmar';
export type WorkModality = 'Presencial' | 'Híbrido' | 'Remoto';

export interface CompatibilityBreakdown {
  totalScore: number; // 0 to 100
  roleAndRequirementsScore: number; // max 25
  educationAndAiCertScore: number; // max 20
  experienceAndSkillsScore: number; // max 20
  locationAndMobilityScore: number; // max 15
  scheduleAndModalityScore: number; // max 10
  valuesAndLearningScore: number; // max 10
  strengths: string[];
  metRequirements: string[];
  gaps: string[];
  pendingQuestions: string[];
  cvAdaptationAdvice?: string;
}

export interface JobOffer {
  id: string;
  company: string;
  roleTitle: string;
  location: string;
  distanceKm: number;
  publishedDate: string;
  lastVerifiedDate: string;
  addedAtDate: string;
  description: string;
  requirements: string[];
  schedule: string; // e.g., "Jornada completa (8h)"
  isFullTime8h: boolean;
  modality: WorkModality;
  salary?: string;
  originalUrl: string;
  sourcePortal: string;
  validityStatus: OfferValidityStatus;
  verificationStatus?: VerificationType;
  isTracked?: boolean;
  isDemoReference?: boolean;
  compatibility?: CompatibilityBreakdown;
  contactEmail?: string; // Real HR / contact email of company
  whyHireMe?: string; // Explicit verified reason why they would hire Pilar
}

export interface SpontaneousCompany {
  id: string;
  name: string;
  sector: string;
  location: string;
  distanceKm: number;
  officialWebsite?: string;
  careersUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  potentialRoles: string[];
  whyGoodFit: string;
  verificationStatus: VerificationType;
  isTracked: boolean;
  notes?: string;
  lastVerifiedDate: string;
  source: string;
}

export interface SearchExecutionRecord {
  lastExecutedIso: string;
  totalAnalyzed: number;
  newOffersFound: number;
  newCompaniesFound: number;
  duplicatesSkipped: number;
  sourcesCount: number;
  searchZone: string;
  summaryReport?: string;
  sources?: { title: string; uri: string }[];
}

export type KanbanStatus =
  | 'nueva'
  | 'pendiente_revisar'
  | 'en_preparacion'
  | 'lista_enviar'
  | 'enviada'
  | 'respuesta_recibida'
  | 'entrevista'
  | 'seguimiento_pendiente'
  | 'oferta_recibida'
  | 'cerrada';

export interface KanbanApplication {
  id: string;
  offerId: string;
  companyName: string;
  roleTitle: string;
  location: string;
  status: KanbanStatus;
  cvDocumentId?: string;
  coverLetterId?: string;
  shareLinkToken?: string;
  gmailMessageId?: string;
  notes: string;
  updatedAtIso: string;
  reminderDateIso?: string;
  reminderNote?: string;
}

export type EmailLifecycleStatus =
  | 'borrador'
  | 'pendiente_aprobacion'
  | 'enviado'
  | 'error_envio'
  | 'entrega_confirmada'
  | 'rebote_rechazo'
  | 'lectura_confirmada'
  | 'sin_confirmacion_lectura';

export interface GmailMessageRecord {
  id: string;
  applicationId?: string;
  recipientEmail: string;
  recipientCompany: string;
  subject: string;
  bodyText: string;
  attachedCvId?: string;
  attachedCoverLetterId?: string;
  attachedShareUrl?: string;
  status: EmailLifecycleStatus;
  gmailApiMessageId?: string;
  gmailApiThreadId?: string;
  sentAtIso?: string;
  lastCheckedIso?: string;
  errorDetail?: string;
  replySnippet?: string;
  replyReceivedAtIso?: string;
}

export interface ShareLinkConfig {
  token: string;
  companyName: string;
  customGreeting: string;
  isActive: boolean;
  requiresPin: boolean;
  pinCode: string;
  expiresAtIso: string;
  allowCvDownload: boolean;
  createdAtIso: string;
}

export interface CustomDocumentItem {
  id: string;
  title: string;
  docType: 'cv_adaptado' | 'carta_presentacion' | 'carta_recomendacion';
  targetCompany: string;
  targetRole: string;
  contentBody: string;
  updatedAtIso: string;
}

export interface TenDayTask {
  id: string;
  dayNumber: number; // 1 to 10
  title: string;
  description: string;
  category: 'busqueda' | 'candidatura' | 'seguimiento' | 'entrevista' | 'formacion';
  scheduledIso: string;
  completed: boolean;
}

export interface AiConversationItem {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  mode: string;
  timestampIso: string;
}

export interface InterviewPracticeSession {
  id: string;
  targetRole: string;
  question: string;
  userAnswer: string;
  whatWorkedWell: string[];
  improvements: string[];
  suggestedRefinedAnswer: string;
  updatedAtIso: string;
}

export interface WorkspaceState {
  profile: CandidateProfile;
  offers: JobOffer[];
  spontaneousCompanies?: SpontaneousCompany[];
  lastSearchRecord?: SearchExecutionRecord;
  trackedCompanyIds?: string[];
  kanban: KanbanApplication[];
  documents: CustomDocumentItem[];
  shareLinks: ShareLinkConfig[];
  emails: GmailMessageRecord[];
  tenDayPlan: TenDayTask[];
  aiHistory: AiConversationItem[];
  interviewSessions: InterviewPracticeSession[];
  currentDayNumber: number;
}
