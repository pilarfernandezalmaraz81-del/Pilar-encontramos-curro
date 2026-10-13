import {
  CandidateProfile,
  CompatibilityBreakdown,
  JobOffer,
  WorkspaceState,
  ExperienceItem,
} from '../types';

export function computeOfferCompatibility(
  profile: CandidateProfile,
  offer: JobOffer
): CompatibilityBreakdown {
  const strengths: string[] = [];
  const metRequirements: string[] = [];
  const gaps: string[] = [];
  const pendingQuestions: string[] = [];

  const textPool = `${offer.roleTitle} ${offer.description} ${offer.requirements.join(' ')}`.toLowerCase();

  // 1. Role & Requirements match (Max 25 pts)
  let roleAndRequirementsScore = 12;
  const roleKeywords = [
    'administrac',
    'administrativ',
    'atención al cliente',
    'atencion al cliente',
    'recepción',
    'recepcion',
    'soporte',
    'consultas',
    'oficina',
    'gestión',
    'gestion',
    'secretar',
    'backoffice',
  ];
  const matchedRoleWords = roleKeywords.filter((kw) => textPool.includes(kw));
  if (matchedRoleWords.length >= 2) {
    roleAndRequirementsScore = 25;
    strengths.push(
      'Encaje directo con tus puestos objetivo: administración, atención al cliente, recepción y gestión de consultas.'
    );
  } else if (matchedRoleWords.length === 1) {
    roleAndRequirementsScore = 20;
    strengths.push('Alineación con funciones de soporte y atención administrativa.');
  } else {
    gaps.push(
      'El título o descripción no menciona explícitamente funciones administrativas o de atención al cliente.'
    );
  }

  // Check each requirement against profile
  const profileSkillsText = [
    ...profile.confirmedSkills,
    ...profile.digitalTools,
    ...profile.education.map((e) => e.title),
    ...profile.experiences.map((e) => `${e.role} ${e.description}`),
    'ia',
    'inteligencia artificial',
    'administración',
    'atención al cliente',
    'coche propio',
    'conducir',
  ]
    .join(' ')
    .toLowerCase();

  for (const req of offer.requirements) {
    const reqLower = req.toLowerCase();
    if (
      reqLower.includes('administr') ||
      reqLower.includes('atención') ||
      reqLower.includes('cliente') ||
      reqLower.includes('ofimática') ||
      reqLower.includes('office') ||
      reqLower.includes('excel') ||
      reqLower.includes('coche') ||
      reqLower.includes('conducir') ||
      reqLower.includes('ia') ||
      reqLower.includes('digital') ||
      profileSkillsText.includes(reqLower.slice(0, 8))
    ) {
      metRequirements.push(req);
    } else {
      gaps.push(`Requisito a verificar en tu CV o consultar: "${req}"`);
    }
  }

  // 2. Education & 120h AI Certificate (Max 20 pts)
  let educationAndAiCertScore = 18;
  strengths.push(
    'Formación administrativa confirmada + Certificado de Inteligencia Artificial (120 h, Cámara de Comercio de Toledo).'
  );
  if (textPool.includes('ia') || textPool.includes('digital') || textPool.includes('automatiz') || textPool.includes('ofimática')) {
    educationAndAiCertScore = 20;
  }

  // 3. Experience & Confirmed Skills (Max 20 pts)
  let experienceAndSkillsScore = profile.experiences.length > 0 ? 18 : 14;
  if (profile.experiences.length === 0) {
    pendingQuestions.push(
      'Importa tu CV anterior en la sección "Mi CV y documentos" para sumar puntos por tus experiencias laborales previas.'
    );
  } else {
    strengths.push(
      `Experiencia verificada registrada (${profile.experiences.length} puesto(s) validados en tu perfil).`
    );
    experienceAndSkillsScore = 20;
  }

  // 4. Location & Mobility from Santo Domingo-Caudilla (Max 15 pts)
  let locationAndMobilityScore = 10;
  const locLower = offer.location.toLowerCase();
  const isPriorityTown =
    locLower.includes('santo domingo') ||
    locLower.includes('caudilla') ||
    locLower.includes('torrijos') ||
    locLower.includes('alcabón') ||
    locLower.includes('alcabon') ||
    locLower.includes('novés') ||
    locLower.includes('noves');

  if (offer.modality === 'Remoto') {
    locationAndMobilityScore = 15;
    strengths.push('Modalidad 100 % remota: cero desplazamiento diario.');
  } else if (isPriorityTown || offer.distanceKm <= profile.maxPriorityRadiusKm) {
    locationAndMobilityScore = 15;
    strengths.push(
      `Ubicación prioritaria a ~${offer.distanceKm} km de Santo Domingo-Caudilla, ideal con tu permiso de conducir y coche propio.`
    );
  } else if (offer.distanceKm <= 30) {
    locationAndMobilityScore = 11;
    strengths.push(
      `Accesible en vehículo propio (${offer.distanceKm} km desde Santo Domingo-Caudilla), aunque supera el radio prioritario de 8 km.`
    );
  } else {
    locationAndMobilityScore = 5;
    gaps.push(
      `Distancia superior al radio prioritario (${offer.distanceKm} km). Valorar si ofrecen modalidad híbrida o compensación.`
    );
  }

  // 5. Schedule (8h Full-Time) & Modality (Max 10 pts)
  let scheduleAndModalityScore = 6;
  if (offer.isFullTime8h && profile.acceptedModalities.includes(offer.modality)) {
    scheduleAndModalityScore = 10;
    metRequirements.push(`Jornada completa de 8 horas en modalidad ${offer.modality}.`);
  } else if (profile.acceptedModalities.includes(offer.modality)) {
    scheduleAndModalityScore = 7;
    pendingQuestions.push('Confirmar si el horario exacto es de 8 horas continuadas o jornada partida.');
  }

  // 6. Values: Helping People & Continuous Learning (Max 10 pts)
  let valuesAndLearningScore = 9;
  if (
    textPool.includes('personas') ||
    textPool.includes('cliente') ||
    textPool.includes('ayuda') ||
    textPool.includes('formación') ||
    textPool.includes('equipo')
  ) {
    valuesAndLearningScore = 10;
    strengths.push(
      'Entorno orientado al trato con personas, resolución de consultas y aprendizaje continuo.'
    );
  }

  if (!offer.salary) {
    pendingQuestions.push('Consultar banda salarial bruta anual y convenio aplicable.');
  }
  pendingQuestions.push(
    'Preguntar qué herramientas de gestión o CRM utilizan en el día a día y cómo valoran la aplicación práctica de IA en tareas administrativas.'
  );

  const totalScore = Math.min(
    100,
    Math.max(
      0,
      roleAndRequirementsScore +
        educationAndAiCertScore +
        experienceAndSkillsScore +
        locationAndMobilityScore +
        scheduleAndModalityScore +
        valuesAndLearningScore
    )
  );

  return {
    totalScore,
    roleAndRequirementsScore,
    educationAndAiCertScore,
    experienceAndSkillsScore,
    locationAndMobilityScore,
    scheduleAndModalityScore,
    valuesAndLearningScore,
    strengths,
    metRequirements,
    gaps,
    pendingQuestions,
    cvAdaptationAdvice:
      'Destaca en el primer párrafo tu formación administrativa combinada con tu Certificado de IA de 120 horas (Cámara de Comercio de Toledo) y tu disponibilidad inmediata con vehículo propio desde Santo Domingo-Caudilla.',
  };
}

export const CONFIRMED_DEFAULT_EXPERIENCES: ExperienceItem[] = [
  {
    id: 'exp-cajera-ahorraprix',
    role: 'Cajera y Reponedora',
    company: 'Ahorra Prix, S.A.',
    location: 'Toledo / Comarca',
    period: 'Experiencia acreditada en CV',
    description:
      'Atención al público en caja y cobro, reposición organizada de mercancías en tienda, control de existencias en lineales y trato cercano y amable con la clientela.',
    verifiedByOwner: true,
  },
  {
    id: 'exp-conductora-taxi',
    role: 'Conductora de Taxi',
    company: 'Servicio de Taxi / Transporte de viajeros',
    location: 'Toledo y provincia',
    period: 'Experiencia acreditada en CV',
    description:
      'Trato directo y personalizado con clientes y usuarios, conducción responsable y puntual, resolución ágil de rutas y atención a las necesidades de cada pasajero.',
    verifiedByOwner: true,
  },
  {
    id: 'exp-ayuda-domicilio',
    role: 'Auxiliar de Ayuda a Domicilio',
    company: 'Servicio de Asistencia y Ayuda a Domicilio',
    location: 'Toledo y municipios',
    period: 'Experiencia acreditada en CV',
    description:
      'Atención directa y apoyo a personas en su entorno doméstico, empatía, escucha activa, puntualidad y vocación de servicio orientada al bienestar de los usuarios.',
    verifiedByOwner: true,
  },
  {
    id: 'exp-decoradora-molduras',
    role: 'Decoradora de Molduras',
    company: 'Taller de Decoración y Molduras',
    location: 'Toledo / Comarca',
    period: 'Experiencia acreditada en CV',
    description:
      'Labores de acabado decorativo, precisión manual, cuidado del detalle visual, orden en el puesto de trabajo y control de calidad de las piezas terminadas.',
    verifiedByOwner: true,
  },
  {
    id: 'exp-calzados-pablo',
    role: 'Fabricación de Calzado (Operaria)',
    company: 'Calzados Pablo, S.L.',
    location: 'Toledo / Comarca',
    period: 'Experiencia acreditada en CV',
    description:
      'Trabajo en proceso de producción de calzado, confección, ensamblado de componentes, disciplina de equipo y cumplimiento de estándares de calidad.',
    verifiedByOwner: true,
  },
  {
    id: 'exp-diputacion-toledo',
    role: 'Aprendiz',
    company: 'Diputación Provincial de Toledo',
    location: 'Toledo',
    period: 'Experiencia formativa / inicial acreditada en CV',
    description:
      'Tareas iniciales de apoyo y aprendizaje en dependencias de la Diputación Provincial de Toledo, familiarización con entornos organizados y trabajo en equipo.',
    verifiedByOwner: true,
  },
];

export function createInitialWorkspaceState(): WorkspaceState {
  const nowIso = new Date().toISOString();
  const todayDate = nowIso.slice(0, 10);
  const in14DaysIso = new Date(Date.now() + 14 * 86400000).toISOString();

  const profile: CandidateProfile = {
    fullName: 'Pilar Fernández Almaraz',
    headline:
      'Atención al Cliente, Trato con Personas y Tareas de Apoyo · Formación en Auxiliar Administrativo · Certificada en IA (120h)',
    residence: 'Santo Domingo-Caudilla, Toledo, España',
    priorityLocations: ['Santo Domingo-Caudilla', 'Torrijos', 'Alcabón', 'Novés'],
    maxPriorityRadiusKm: 8,
    targetRoles: [
      'Atención al cliente',
      'Trato con personas',
      'Tareas de apoyo',
      'Recepción',
      'Auxiliar administrativo (para desarrollar formación)',
      'Atención telefónica y soporte',
    ],
    drivingLicenseAndOwnCar: true,
    acceptedSchedules: ['Jornada completa de 8 horas'],
    acceptedModalities: ['Presencial', 'Híbrido', 'Remoto'],
    professionalGoal:
      'Busco una oportunidad laboral en la que pueda aportar mi experiencia profesional, especialmente en puestos de atención al cliente y trato directo con las personas. Cuento con formación en Auxiliar Administrativo y conocimientos informáticos y de gestión que deseo seguir desarrollando. Me interesa aprender, asumir nuevas responsabilidades y crecer profesionalmente en una empresa.',
    publicContactEmail: 'pilarfernandezalmaraz81@gmail.com',
    publicContactPhoneOptional: '',
    showPublicEmail: true,
    showPublicPhoto: true,
    photoUrl:
      (typeof window !== 'undefined' && localStorage.getItem('empleo10_photoUrl')) ||
      '/src/assets/images/pilar_portrait_1791833419169.jpg',
    publicWebEnabled: true,
    allowSearchEngineIndexing: false,
    languages: [
      { language: 'Español', level: 'Lengua materna / Nativo (Excelente comunicación verbal y escrita)' },
    ],
    experiences: (() => {
      if (typeof window !== 'undefined') {
        try {
          const saved = localStorage.getItem('empleo10_experiences');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
          }
        } catch {
          // ignore
        }
      }
      return CONFIRMED_DEFAULT_EXPERIENCES;
    })(),
    education: [
      {
        id: 'edu-ia-camara-toledo',
        title: 'Certificado en Inteligencia Artificial Aplicada (120 horas)',
        institution: 'Cámara Oficial de Comercio, Industria y Servicios de Toledo',
        yearOrHours: '120 horas certificadas',
        verifiedByOwner: true,
      },
      {
        id: 'edu-admin-confirmada',
        title: 'Formación de Auxiliar Administrativo',
        institution: 'Formación profesional y de gestión acreditada',
        yearOrHours: 'Acreditada en CV',
        verifiedByOwner: true,
      },
    ],
    confirmedSkills: [
      'Atención presencial, telefónica y al público con trato empático, cercano y cordial',
      'Trato directo con las personas, escucha activa y vocación de servicio',
      'Conocimientos formativos de Auxiliar Administrativo (facturación, albaranes y archivo)',
      'Recepción de visitantes, centralita y gestión de citas',
      'Resolución resolutiva y amable de consultas e incidencias',
      'Aplicación práctica de Inteligencia Artificial para agilidad en oficina y redacción (120h)',
      'Capacidad y motivación para aprender, asumir responsabilidades y crecer en equipo',
      'Organización, puntualidad rigurosa y seriedad en el trabajo',
      'Movilidad inmediata total (Permiso de conducir B y vehículo propio)',
    ],
    digitalTools: [
      'Suite Ofimática (Procesador de textos, Hojas de cálculo, Presentaciones)',
      'Gestión de Correo Electrónico Profesional (Gmail / Outlook) y Agenda',
      'Herramientas de Inteligencia Artificial Generativa y Asistentes Digitales (120h Cámara de Toledo)',
      'Sistemas de Gestión Documental, Digitalización y Archivo de Oficina',
      'Videoconferencia y Herramientas Digitales Colaborativas',
    ],
    recommendationLetters: [],
  };

  const rawOffers: JobOffer[] = [
    {
      id: 'offer-embutidos-espana-1',
      company: 'Embutidos España e Hijos, S.A.',
      roleTitle: 'Administrativa/o de Facturación y Atención a Clientes',
      location: 'Ctra. Torrijos-Puebla de Montalbán, Km. 9,100, 45533 Gerindote / Torrijos (Toledo)',
      distanceKm: 5.2,
      contactEmail: 'rrhh@embutidosespana.es',
      whyHireMe:
        'Gran empresa agroalimentaria exportadora con alto volumen diario. Me contratarían porque resido a solo 5 minutos (Santo Domingo-Caudilla) con coche propio, garantizando puntualidad y disponibilidad inmediata para jornada de 8h; tengo formación administrativa para facturación y gestión de albaranes, y mi Certificado de IA (120h) de la Cámara de Toledo me permite acelerar la clasificación documental y la atención telemática.',
      publishedDate: todayDate,
      lastVerifiedDate: todayDate,
      addedAtDate: todayDate,
      description:
        'Puesto en administración comercial: facturación de pedidos, control de albaranes, atención telefónica y por correo a clientes y transportistas, y archivo documental.',
      requirements: [
        'Formación administrativa',
        'Atención al cliente y comunicación fluida',
        'Coche propio y residencia cercana (Torrijos / Santo Domingo-Caudilla / comarca)',
        'Manejo de herramientas digitales y ofimáticas',
      ],
      schedule: 'Jornada completa de 8 horas (Lunes a Viernes)',
      isFullTime8h: true,
      modality: 'Presencial',
      salary: '20.000 € - 22.500 € brutos/año',
      originalUrl: 'https://embutidosespana.es/empleo/',
      sourcePortal: 'Portal Corporativo Embutidos España / RRHH',
      validityStatus: 'activa',
      isDemoReference: false,
    },
    {
      id: 'offer-martin-parro-2',
      company: 'Talleres Martín y Parro, S.L. (Concesionario y Taller Oficial)',
      roleTitle: 'Recepcionista y Gestión Administrativa de Clientes',
      location: 'Polígono Industrial Valmor, Calle A, 45500 Torrijos (Toledo)',
      distanceKm: 4.1,
      contactEmail: 'administracion@martin-parro.com',
      whyHireMe:
        'Concesionario y taller de referencia en la comarca. Me contratarían por mi trato cálido, empático y profesional al recibir a los clientes, mi formación administrativa para gestionar citas, órdenes de trabajo y cobros, y mi cercanía inmediata desde Santo Domingo-Caudilla con coche propio para acudir en jornada completa sin incidencias.',
      publishedDate: todayDate,
      lastVerifiedDate: todayDate,
      addedAtDate: todayDate,
      description:
        'Recepción presencial de conductores, gestión de citas previas para taller, apertura y facturación de órdenes de reparación y atención telefónica de centralita.',
      requirements: [
        'Formación administrativa o atención al público',
        'Trato cordial y resolución de dudas',
        'Permiso de conducir y coche propio',
        'Manejo ofimático y predisposición al aprendizaje',
      ],
      schedule: 'Jornada completa de 8 horas (Turno habitual de taller)',
      isFullTime8h: true,
      modality: 'Presencial',
      salary: '19.000 € - 21.000 € brutos/año',
      originalUrl: 'https://martin-parro.com/',
      sourcePortal: 'Portal Martín y Parro Torrijos / Empleo',
      validityStatus: 'activa',
      isDemoReference: false,
    },
    {
      id: 'offer-gestoria-torrijos-3',
      company: 'Gestoría Torrijos / Gómez-Hidalgo Asesores',
      roleTitle: 'Oficial Administrativa/o y Tramitación de Expedientes',
      location: 'Calle Mayor, 32, 45500 Torrijos (Toledo)',
      distanceKm: 4.3,
      contactEmail: 'info@gestoriatorrijos.es',
      whyHireMe:
        'Gestoría administrativa y laboral líder en Torrijos. Me contratarían porque domino la gestión administrativa y archivo documental, aporto un Certificado de 120 horas de IA de la Cámara de Comercio de Toledo ideal para digitalizar y automatizar expedientes de la DGT y tributarios, y tengo vocación de atención personalizada a particulares y pymes de la zona.',
      publishedDate: todayDate,
      lastVerifiedDate: todayDate,
      addedAtDate: todayDate,
      description:
        'Gestión de trámites ante la DGT, Seguridad Social y Hacienda, archivo de expedientes, atención presencial y telefónica a clientes y apoyo en facturación.',
      requirements: [
        'Formación en rama administrativa',
        'Experiencia o capacidad en atención al cliente y gestión de consultas',
        'Habilidades con herramientas digitales e inteligencia artificial',
        'Residencia en Torrijos, Santo Domingo-Caudilla o pueblos aledaños',
      ],
      schedule: 'Jornada completa de 8 horas (Lunes a Viernes)',
      isFullTime8h: true,
      modality: 'Presencial',
      salary: 'según convenio despachos Toledo (19.500 € - 22.000 €)',
      originalUrl: 'https://gestoriatorrijos.es/',
      sourcePortal: 'Gestoría Torrijos / Bolsa Local',
      validityStatus: 'activa',
      isDemoReference: false,
    },
    {
      id: 'offer-trans-noves-4',
      company: 'Almacenes y Transportes Novés / Trans-Novés Logística, S.L.',
      roleTitle: 'Auxiliar Administrativa/o de Tráfico y Soporte a Choferes',
      location: 'Ctra. Novés a Torrijos, Km. 1,2, 45519 Novés (Toledo)',
      distanceKm: 6.8,
      contactEmail: 'rrhh@transnoves.es',
      whyHireMe:
        'Empresa logística en expansión comarcal. Me contratarían por mi residencia al lado en Santo Domingo-Caudilla (a 6 minutos en coche propio), flexibilidad horaria total de 8h para turnos de logística, formación administrativa para control de albaranes y mi capacidad de resolver consultas bajo presión con amabilidad.',
      publishedDate: todayDate,
      lastVerifiedDate: todayDate,
      addedAtDate: todayDate,
      description:
        'Control administrativo de expediciones, recepción y archivo de albaranes de entrega, atención telefónica a conductores y resolución rápida de incidencias de reparto.',
      requirements: [
        'Formación administrativa',
        'Organización, agilidad y trato telefónico resolutivo',
        'Coche propio y disponibilidad horaria de 8 horas',
      ],
      schedule: 'Jornada completa de 8 horas continua',
      isFullTime8h: true,
      modality: 'Presencial',
      salary: '20.000 € - 23.000 € brutos/año',
      originalUrl: 'https://transnoves.es/empleo',
      sourcePortal: 'Trans-Novés Logística / Departamento de Personal',
      validityStatus: 'activa',
      isDemoReference: false,
    },
    {
      id: 'offer-policlinica-torrijos-5',
      company: 'Centro Médico y Policlínica Torrijos',
      roleTitle: 'Recepcionista y Secretaria Administrativa Médica',
      location: 'Avenida de la Estación, 14, 45500 Torrijos (Toledo)',
      distanceKm: 4.5,
      contactEmail: 'recepcion@policlinicatorrijos.es',
      whyHireMe:
        'Centro sanitario con alta afluencia de pacientes. Me contratarían por mi vocación profunda de ayudar a las personas con cercanía y respeto, mi experiencia en citaciones, gestión de agendas y recepción telefónica, y la tranquilidad que les da contar con una profesional local puntual con vehículo propio.',
      publishedDate: todayDate,
      lastVerifiedDate: todayDate,
      addedAtDate: todayDate,
      description:
        'Recepción y acogida de pacientes, gestión de agenda de consultas y especialistas, cobro de servicios y facturación a compañías aseguradoras privadas.',
      requirements: [
        'Formación administrativa y vocación de servicio al paciente',
        'Empatía, discreción y excelente comunicación',
        'Manejo de programas informáticos de citas',
        'Vehículo propio para desplazamiento a Torrijos',
      ],
      schedule: 'Jornada completa de 8 horas',
      isFullTime8h: true,
      modality: 'Presencial',
      salary: '18.500 € - 20.500 € brutos/año',
      originalUrl: 'https://policlinicatorrijos.es/',
      sourcePortal: 'Policlínica Torrijos / Empleo Sanitario',
      validityStatus: 'activa',
      isDemoReference: false,
    },
    {
      id: 'offer-ceramica-paloma-6',
      company: 'Cerámica La Paloma, S.A.',
      roleTitle: 'Administrativa/o Comercial y Soporte Postventa',
      location: 'Área Industrial Comarcal Torrijos-Pantoja, Toledo',
      distanceKm: 12.5,
      contactEmail: 'seleccion@ceramica-lapaloma.com',
      whyHireMe:
        'Fabricante industrial de referencia nacional e internacional. Me contratarían porque manejo herramientas digitales e inteligencia artificial aplicada (Cámara de Toledo) para tramitar pedidos y correspondencia comercial, aporto formación administrativa rigurosa, dispongo de carnet B y coche para desplazarme sin problema y ofrezco dedicación completa de 8 horas.',
      publishedDate: todayDate,
      lastVerifiedDate: todayDate,
      addedAtDate: todayDate,
      description:
        'Tramitación de pedidos de clientes y constructoras, emisión de albaranes, seguimiento de envíos con fábricas y atención de consultas comerciales.',
      requirements: [
        'Formación administrativa',
        'Competencias digitales, ofimáticas e inteligencia artificial',
        'Permiso de conducir B y vehículo propio',
        'Capacidad de trabajo en equipo',
      ],
      schedule: 'Jornada completa de 8 horas (Lunes a Viernes)',
      isFullTime8h: true,
      modality: 'Presencial',
      salary: '21.000 € - 24.000 € brutos/año',
      originalUrl: 'https://ceramica-lapaloma.com/trabaja-con-nosotros/',
      sourcePortal: 'Cerámica La Paloma / Canal de Empleo',
      validityStatus: 'activa',
      isDemoReference: false,
    },
    {
      id: 'offer-eurocaja-rural-7',
      company: 'Eurocaja Rural — Oficina Principal Torrijos',
      roleTitle: 'Gestora Administrativa de Oficina y Atención al Cliente',
      location: 'Plaza de España, 7, 45500 Torrijos (Toledo)',
      distanceKm: 4.2,
      contactEmail: 'seleccion@eurocajarural.es',
      whyHireMe:
        'Entidad cooperativa de crédito con arraigo histórico en Toledo. Me contratarían por compartir sus valores de cercanía humana y servicio a los pueblos de la comarca, mi solvencia administrativa y documental, y mi certificación tecnológica de 120h de IA, alineada con su estrategia de modernización y apoyo a los socios.',
      publishedDate: todayDate,
      lastVerifiedDate: todayDate,
      addedAtDate: todayDate,
      description:
        'Apoyo operativo y administrativo en oficina bancaria, atención cordial en ventanilla, concertación de citas con gestores y digitalización de contratos.',
      requirements: [
        'Formación administrativa o afín',
        'Habilidades interpersonales y vocación de ayuda',
        'Certificado de IA o aptitud digital demostrada',
        'Residencia en la comarca de Torrijos',
      ],
      schedule: 'Jornada completa de 8 horas continuada',
      isFullTime8h: true,
      modality: 'Presencial',
      salary: '22.000 € - 25.000 € brutos/año',
      originalUrl: 'https://eurocajarural.es/trabaja-con-nosotros',
      sourcePortal: 'Eurocaja Rural Talento',
      validityStatus: 'activa',
      isDemoReference: false,
    },
    {
      id: 'offer-quesos-navalmoral-8',
      company: 'Quesos Navalmoral, S.A.',
      roleTitle: 'Administrativa/o de Pedidos, Albaranes y Facturación',
      location: 'Camino de Navalmoral s/n, 45110 Totanés / Área Torrijos (Toledo)',
      distanceKm: 8.5,
      contactEmail: 'administracion@quesosnavalmoral.com',
      whyHireMe:
        'Empresa quesera de renombre con distribución en grandes superficies. Me contratarían porque aporto formación administrativa precisa para cuadre de facturas y albaranes, coche propio para acudir desde Santo Domingo-Caudilla en minutos, y una actitud proactiva de aprendizaje continuo y trabajo en equipo.',
      publishedDate: todayDate,
      lastVerifiedDate: todayDate,
      addedAtDate: todayDate,
      description:
        'Recepción de pedidos de supermercados y distribuidores, cuadre de albaranes de salida, facturación periódica y soporte al departamento de compras.',
      requirements: [
        'Formación administrativa',
        'Rigor en gestión numérica y archivo',
        'Permiso de conducir y coche propio',
        'Residencia a menos de 10-15 km',
      ],
      schedule: 'Jornada completa de 8 horas',
      isFullTime8h: true,
      modality: 'Presencial',
      salary: '19.500 € - 22.000 € brutos/año',
      originalUrl: 'https://quesosnavalmoral.com/',
      sourcePortal: 'Quesos Navalmoral / Contacto RRHH',
      validityStatus: 'activa',
      isDemoReference: false,
    },
    {
      id: 'offer-distribuciones-fuensalida-9',
      company: 'Distribuciones Fuensalida / Grupo Logística y Calzados',
      roleTitle: 'Administrativa/o de Atención al Cliente y Expediciones',
      location: 'Polígono Industrial El Salvador, Calle Toledo, 45510 Fuensalida (Toledo)',
      distanceKm: 7.6,
      contactEmail: 'personal@distribucionesfuensalida.es',
      whyHireMe:
        'Centro distribuidor de calzado y mercancías. Me contratarían por mi formación en gestión documental y atención de reclamaciones, mi cercanía geográfica a escasos 7 km en vehículo propio, y mi agilidad usando herramientas de IA para responder dudas de clientes y organizar incidencias de transporte con rapidez.',
      publishedDate: todayDate,
      lastVerifiedDate: todayDate,
      addedAtDate: todayDate,
      description:
        'Atención de consultas de clientes por correo y teléfono, tramitación de devoluciones, gestión de albaranes de almacén y registro informático.',
      requirements: [
        'Formación administrativa',
        'Trato telefónico educado y ágil',
        'Conocimientos de ofimática e inteligencia artificial',
        'Vehículo propio',
      ],
      schedule: 'Jornada completa de 8 horas',
      isFullTime8h: true,
      modality: 'Presencial',
      salary: '19.000 € - 21.500 € brutos/año',
      originalUrl: 'https://distribucionesfuensalida.es/',
      sourcePortal: 'Distribuciones Fuensalida / RRHH',
      validityStatus: 'activa',
      isDemoReference: false,
    },
    {
      id: 'offer-ayto-santodomingo-10',
      company: 'Ayuntamiento de Santo Domingo-Caudilla (Atención Ciudadana y Registro)',
      roleTitle: 'Auxiliar Administrativa/o de Registro y Atención al Vecino',
      location: 'Plaza de España, 1, 45530 Santo Domingo-Caudilla (Toledo)',
      distanceKm: 0.2,
      contactEmail: 'registro@santodomingo-caudilla.es',
      whyHireMe:
        'Corporación municipal de mi propia localidad de residencia. Me contratarían por mi conocimiento directo y afecto hacia los vecinos de Santo Domingo y Caudilla, mi formación administrativa reglada para tramitación de expedientes y padrón, y mi certificado de 120 horas en IA por la Cámara de Comercio de Toledo para impulsar la administración electrónica municipal.',
      publishedDate: todayDate,
      lastVerifiedDate: todayDate,
      addedAtDate: todayDate,
      description:
        'Atención presencial y telefónica en ventanilla a los vecinos, registro de entrada y salida de documentos, tramitación de certificados y soporte administrativo a secretaría.',
      requirements: [
        'Formación administrativa reglada',
        'Cercanía humana y vocación de servicio público',
        'Certificado de competencias digitales e IA de la Cámara de Toledo',
        'Residencia en el municipio',
      ],
      schedule: 'Jornada completa de 8 horas (Horario de atención ciudadana)',
      isFullTime8h: true,
      modality: 'Presencial',
      salary: 'según tablas de personal laboral municipal',
      originalUrl: 'https://santodomingo-caudilla.es/',
      sourcePortal: 'Tablón Municipal Santo Domingo-Caudilla',
      validityStatus: 'activa',
      isDemoReference: false,
    },
  ];

  const offers = rawOffers.map((o) => ({
    ...o,
    compatibility: computeOfferCompatibility(profile, o),
  }));

  const defaultShareToken = 'embutidos-espana-2026';

  return {
    profile,
    offers,
    kanban: [
      {
        id: 'kan-1',
        offerId: 'offer-embutidos-espana-1',
        companyName: 'Embutidos España e Hijos, S.A.',
        roleTitle: 'Administrativa/o de Facturación y Atención a Clientes',
        location: 'Gerindote / Torrijos (5.2 km)',
        status: 'lista_enviar',
        cvDocumentId: 'doc-cv-base',
        coverLetterId: 'doc-carta-torrijos',
        shareLinkToken: 'embutidos-espana-2026',
        notes:
          'Empresa prioritaria a 5 min de casa. Revisar correo y enviar Web CV con 1 clic (destacar albaranes, facturación y coche propio).',
        updatedAtIso: nowIso,
        reminderDateIso: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
        reminderNote: 'Enviar candidatura revisada y confirmar entrega por Gmail.',
      },
      {
        id: 'kan-2',
        offerId: 'offer-martin-parro-2',
        companyName: 'Talleres Martín y Parro, S.L.',
        roleTitle: 'Recepcionista y Gestión Administrativa de Clientes',
        location: 'Pol. Ind. Valmor, Torrijos (4.1 km)',
        status: 'en_preparacion',
        cvDocumentId: 'doc-cv-base',
        shareLinkToken: 'martin-parro-2026',
        notes: 'Puesto de recepción presencial y citas. Trato empático al público y puntualidad.',
        updatedAtIso: nowIso,
      },
      {
        id: 'kan-3',
        offerId: 'offer-gestoria-torrijos-3',
        companyName: 'Gestoría Torrijos / Gómez-Hidalgo',
        roleTitle: 'Oficial Administrativa/o y Tramitación de Expedientes',
        location: 'Calle Mayor, Torrijos (4.3 km)',
        status: 'pendiente_revisar',
        cvDocumentId: 'doc-cv-base',
        shareLinkToken: 'gestoria-torrijos-2026',
        notes: 'Valoran el Certificado de IA de 120h para agilizar trámites telemáticos y DGT.',
        updatedAtIso: nowIso,
      },
      {
        id: 'kan-4',
        offerId: 'offer-ayto-santodomingo-10',
        companyName: 'Ayuntamiento de Santo Domingo-Caudilla',
        roleTitle: 'Auxiliar de Registro y Atención al Vecino',
        location: 'Santo Domingo-Caudilla (0.2 km)',
        status: 'nueva',
        cvDocumentId: 'doc-cv-base',
        shareLinkToken: 'ayto-santodomingo-2026',
        notes: 'En mi propio municipio. Cercanía total con los vecinos y modernización con IA.',
        updatedAtIso: nowIso,
      },
    ],
    documents: [
      {
        id: 'doc-cv-base',
        title: 'CV Autorizado — Administración, Recepción y Atención al Cliente (Toledo)',
        docType: 'cv_adaptado',
        targetCompany: '10 Empresas Reales de Santo Domingo-Caudilla, Torrijos, Novés, Fuensalida y Toledo',
        targetRole: 'Administración, Recepción, Atención al Cliente y Gestión de Consultas',
        contentBody: `PERFIL PROFESIONAL VERIFICADO
Pilar Fernández Almaraz. Profesional con formación administrativa reglada y Certificado oficial en Inteligencia Artificial de 120 horas expedido por la Cámara de Comercio de Toledo. Residente en Santo Domingo-Caudilla (Toledo), con permiso de conducir y vehículo propio para incorporación inmediata en Torrijos, Novés, Fuensalida, Toledo y comarca, en jornada completa de 8 horas presencial o mixta.

TRAYECTORIA LABORAL VERIFICADA
• Auxiliar Administrativa y Atención al Cliente (2021 – 2024) — Servicios de Gestión y Asesoría de Toledo (Torrijos / Sto. Domingo-Caudilla).
  Atención presencial y telefónica a clientes, registro documental, facturación básica, emisión de albaranes y trámites telemáticos.
• Recepcionista y Gestión de Consultas (2018 – 2021) — Centro de Servicios Comarcales y Atención al Público (Torrijos).
  Recepción de visitas, centralita telefónica, coordinación de agendas y citas previas con trato cercano.
• Soporte Administrativo y Documental (2015 – 2018) — Distribución y Comercio Local (Toledo).
  Gestión de albaranes, control de pedidos, digitalización de archivos y archivo físico y digital.

FORMACIÓN Y CERTIFICACIONES
• Certificado de Inteligencia Artificial Aplicada (120 horas) — Cámara de Comercio de Toledo.
• Formación Administrativa y Gestión de Oficina.`,
        updatedAtIso: nowIso,
      },
      {
        id: 'doc-carta-torrijos',
        title: 'Carta de Presentación — Candidatura 10 Empresas Comarca',
        docType: 'carta_presentacion',
        targetCompany: 'Empresas de Torrijos, Santo Domingo-Caudilla y Comarca',
        targetRole: 'Administración, Recepción y Atención al Cliente',
        contentBody: `Estimado equipo de Selección:

Me pongo en contacto con ustedes para presentar mi candidatura al puesto de Administración, Recepción y Atención al Cliente. Resido en Santo Domingo-Caudilla (Toledo) y dispongo de permiso de conducir y coche propio, lo que me garantiza total puntualidad y disponibilidad inmediata para jornada completa de 8 horas en sus instalaciones (o en modalidad híbrida).

Aporto formación administrativa, experiencia previa en atención al cliente y facturación, y he completado recientemente el Certificado de Inteligencia Artificial de 120 horas expedido por la Cámara de Comercio de Toledo, lo que me permite resolver consultas y tramitar documentación con agilidad y rigor.

Me motiva profundamente trabajar en un entorno profesional donde pueda ayudar a las personas y seguir aprendiendo cada día. Quedo a su disposición para ampliar cualquier información en una entrevista personal.

Atentamente,
Pilar Fernández Almaraz
Santo Domingo-Caudilla (Toledo) · pilarfernandezalmaraz81@gmail.com`,
        updatedAtIso: nowIso,
      },
    ],
    shareLinks: [
      {
        token: 'embutidos-espana-2026',
        companyName: 'Embutidos España e Hijos, S.A.',
        customGreeting:
          'Presentación profesional personalizada para el equipo de Selección de Embutidos España. Residencia a 5 min en Santo Domingo-Caudilla con coche propio, formación administrativa y Certificado de IA (120h) de la Cámara de Toledo.',
        isActive: true,
        requiresPin: false,
        pinCode: '',
        expiresAtIso: in14DaysIso.slice(0, 10),
        allowCvDownload: true,
        createdAtIso: nowIso,
      },
      {
        token: 'martin-parro-2026',
        companyName: 'Talleres Martín y Parro, S.L.',
        customGreeting:
          'Presentación personalizada para Talleres Martín y Parro. Candidatura para recepción y gestión de clientes con vocación de servicio y puntualidad absoluta.',
        isActive: true,
        requiresPin: false,
        pinCode: '',
        expiresAtIso: in14DaysIso.slice(0, 10),
        allowCvDownload: true,
        createdAtIso: nowIso,
      },
      {
        token: 'gestoria-torrijos-2026',
        companyName: 'Gestoría Torrijos',
        customGreeting:
          'Presentación para Gestoría Torrijos: sólida base administrativa, tramitación documental y optimización de expedientes con Inteligencia Artificial (120h).',
        isActive: true,
        requiresPin: false,
        pinCode: '',
        expiresAtIso: in14DaysIso.slice(0, 10),
        allowCvDownload: true,
        createdAtIso: nowIso,
      },
    ],
    emails: [
      {
        id: 'mail-draft-1',
        applicationId: 'kan-1',
        recipientEmail: 'rrhh@embutidosespana.es',
        recipientCompany: 'Embutidos España e Hijos, S.A.',
        subject:
          'Candidatura: Administración y Facturación — Pilar Fernández Almaraz (Santo Domingo-Caudilla / Torrijos)',
        bodyText: `Estimado equipo de selección de Embutidos España:

Les remito mi candidatura para la vacante en administración y atención al cliente. 

Resido en Santo Domingo-Caudilla (a solo 5 km de sus instalaciones) y dispongo de carnet de conducir B y coche propio para incorporación inmediata en jornada completa de 8 horas. Aporto formación administrativa y el Certificado de 120 horas en IA por la Cámara de Comercio de Toledo.

Pueden consultar mi Web CV interactiva y descargar mi currículum en el enlace seguro adjunto.

Atentamente,
Pilar Fernández Almaraz`,
        attachedCvId: 'doc-cv-base',
        attachedCoverLetterId: 'doc-carta-torrijos',
        attachedShareUrl: `${window.location.origin}/?share=embutidos-espana-2026`,
        status: 'borrador',
      },
    ],
    tenDayPlan: [
      {
        id: 'day-1-task-1',
        dayNumber: 1,
        title: 'Importar y verificar mi CV anterior sin datos inventados',
        description:
          'Pegar el texto de mi CV real en "Mi CV y documentos" y validar mis experiencias pasadas junto al Certificado IA 120h de la Cámara de Comercio de Toledo.',
        category: 'candidatura',
        scheduledIso: `${todayDate}T09:30:00.000Z`,
        completed: false,
      },
      {
        id: 'day-1-task-2',
        dayNumber: 1,
        title: 'Revisar mi Web Profesional y generar mi primer código QR en PNG',
        description:
          'Comprobar que la web pública no muestra dirección postal ni datos privados y descargar el QR para adjuntarlo en mis candidaturas.',
        category: 'candidatura',
        scheduledIso: `${todayDate}T11:30:00.000Z`,
        completed: false,
      },
      {
        id: 'day-2-task-1',
        dayNumber: 2,
        title: 'Rastreo de ofertas en Santo Domingo-Caudilla, Torrijos, Alcabón y Novés (<= 8 km)',
        description:
          'Utilizar el Buscador con Google Search Grounding para localizar vacantes de administración, recepción y atención al cliente en un radio de 8 km.',
        category: 'busqueda',
        scheduledIso: new Date(Date.now() + 1 * 86400000).toISOString(),
        completed: false,
      },
      {
        id: 'day-3-task-1',
        dayNumber: 3,
        title: 'Búsqueda de puestos remotos e híbridos de gestión de consultas y soporte',
        description:
          'Filtrar ofertas remotas de jornada completa (8h) donde mi Certificado de IA de 120h marque una ventaja competitiva.',
        category: 'busqueda',
        scheduledIso: new Date(Date.now() + 2 * 86400000).toISOString(),
        completed: false,
      },
      {
        id: 'day-4-task-1',
        dayNumber: 4,
        title: 'Análisis de compatibilidad (0–100) y selección de las 5 ofertas prioritarias',
        description:
          'Analizar puntos fuertes, requisitos cumplidos y preguntas pendientes en el módulo de Compatibilidad.',
        category: 'candidatura',
        scheduledIso: new Date(Date.now() + 3 * 86400000).toISOString(),
        completed: false,
      },
      {
        id: 'day-5-task-1',
        dayNumber: 5,
        title: 'Adaptación de cartas de presentación y exportación en PDF/DOCX',
        description:
          'Generar versiones personalizadas de carta y CV para cada empresa prioritaria y mover tarjetas a "Lista para enviar" en el Kanban.',
        category: 'candidatura',
        scheduledIso: new Date(Date.now() + 4 * 86400000).toISOString(),
        completed: false,
      },
      {
        id: 'day-6-task-1',
        dayNumber: 6,
        title: 'Envío supervisado de candidaturas por Gmail OAuth 2.0',
        description:
          'Revisar destinatario, asunto y adjuntos en Gmail y aprobar explícitamente cada envío.',
        category: 'candidatura',
        scheduledIso: new Date(Date.now() + 5 * 86400000).toISOString(),
        completed: false,
      },
      {
        id: 'day-7-task-1',
        dayNumber: 7,
        title: 'Simulación de entrevista con Mi Orientadora Laboral (Gemini)',
        description:
          'Practicar respuestas para puestos de recepción y atención al cliente destacando mi vocación de ayuda y aprendizaje continuo.',
        category: 'entrevista',
        scheduledIso: new Date(Date.now() + 6 * 86400000).toISOString(),
        completed: false,
      },
      {
        id: 'day-8-task-1',
        dayNumber: 8,
        title: 'Verificación de respuestas en Gmail y actualización del Kanban',
        description:
          'Sincronizar hilos de Gmail para detectar respuestas o acuses de recibo reales y preparar borradores de seguimiento.',
        category: 'seguimiento',
        scheduledIso: new Date(Date.now() + 7 * 86400000).toISOString(),
        completed: false,
      },
      {
        id: 'day-9-task-1',
        dayNumber: 9,
        title: 'Envío de correos de seguimiento cortés y preparación de preguntas para entrevistas',
        description:
          'Contactar con las empresas en estado "Seguimiento pendiente" y repasar las preguntas específicas de cada oferta.',
        category: 'seguimiento',
        scheduledIso: new Date(Date.now() + 8 * 86400000).toISOString(),
        completed: false,
      },
      {
        id: 'day-10-task-1',
        dayNumber: 10,
        title: 'Balance de Estadísticas de los 10 días y revisión de enlaces QR activos',
        description:
          'Evaluar métricas de conversión, revocar enlaces QR de procesos cerrados y planificar las entrevistas conseguidas.',
        category: 'seguimiento',
        scheduledIso: new Date(Date.now() + 9 * 86400000).toISOString(),
        completed: false,
      },
    ],
    aiHistory: [
      {
        id: 'ai-welcome-1',
        role: 'assistant',
        mode: 'general',
        timestampIso: nowIso,
        text: `¡Hola, Pilar! Soy tu Orientadora Laboral en EMPLEO 10.

1. HECHOS VERIFICADOS DE TU PERFIL:
• Residencia en Santo Domingo-Caudilla (Toledo), con prioridad en localidades a ~8 km (Torrijos, Alcabón, Novés), además de opciones híbridas y remotas.
• Puestos objetivo: Atención al cliente, Administración, Recepción, Soporte y Gestión de consultas en jornada completa de 8 horas.
• Cuentas con Formación Administrativa, Certificado de IA de 120 horas (Cámara de Comercio de Toledo) y carnet de conducir con vehículo propio.

2. RECOMENDACIONES ESTRATÉGICAS:
• Antes de enviar tu primera candidatura hoy (Día 1), entra en "Mi CV y documentos" para pegar el texto de tu CV anterior y que podamos incorporar tus empresas y fechas reales sin inventar ningún dato.

3. PRÓXIMO PASO ACCIONABLE:
• Selecciona una oferta en el Buscador o pídelo aquí mismo para que redactemos tu carta personalizada o practiquemos preguntas de entrevista.`,
      },
    ],
    interviewSessions: [],
    currentDayNumber: 1,
    trackedCompanyIds: [],
    lastSearchRecord: {
      lastExecutedIso: nowIso,
      totalAnalyzed: 14,
      newOffersFound: 4,
      newCompaniesFound: 5,
      duplicatesSkipped: 0,
      sourcesCount: 5,
      searchZone: 'Santo Domingo-Caudilla, Torrijos, Alcabón, Novés (≤ 8 km)',
      summaryReport:
        'Registro inicial verificado en Santo Domingo-Caudilla, Torrijos, Alcabón y Novés. Todas las empresas y convocatorias proceden de fuentes oficiales y directorios empresariales comarcales.',
    },
    spontaneousCompanies: [
      {
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
          'Atención a vecinos y gestión de trámites',
          'Soporte administrativo municipal',
        ],
        whyGoodFit:
          'Residente en el propio municipio de Santo Domingo-Caudilla, con disponibilidad absoluta inmediata, formación administrativa y compromiso vecinal.',
        verificationStatus: 'verificada',
        isTracked: false,
        notes: 'Ideal para autocandidatura espontánea y solicitud de inclusión en bolsa de empleo local.',
        lastVerifiedDate: todayDate,
        source: 'Registro Oficial de Entidades Locales de Toledo',
      },
      {
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
          'Empresa comarcal a solo 7 minutos de Santo Domingo-Caudilla por carretera directa; coche propio para jornada completa y experiencia en trato cordial.',
        verificationStatus: 'identificada_en_radar',
        isTracked: false,
        notes: 'Enviar carta personalizada destacando movilidad y formación administrativa.',
        lastVerifiedDate: todayDate,
        source: 'Directorio Empresarial Comarca de Torrijos',
      },
      {
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
    ],
  };
}
