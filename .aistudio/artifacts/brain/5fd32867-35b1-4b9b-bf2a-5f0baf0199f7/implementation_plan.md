# EMPLEO 10 — Plan de Envío Rápido de Candidaturas (1 Clic tras Revisión) y Maqueta Web CV

Este plan detalla la arquitectura, el flujo de usuario y la maqueta visual para permitirte **enviar tu candidatura con tu Web CV y código QR a las empresas que decidas** mediante un flujo ágil de preparación automática y confirmación con 1 solo clic, manteniendo la máxima seguridad, privacidad y revisión previa.

---

### Revisión y Decisiones Críticas

> [!IMPORTANT]
> **Decisiones confirmadas por la usuaria:**
> 1. **Revisión previa obligatoria antes del envío**: Se abrirá un asistente rápido de verificación donde ves el destinatario, asunto, texto adaptado y el enlace QR único generado para esa empresa, con un botón destacado de **1 clic: "Enviar Candidatura Ahora"**.
> 2. **Enlace y QR personalizado automático por empresa**: Cada vez que decidas enviar a una empresa, el sistema creará al vuelo su enlace protegido (`/?share=empresa-token`) con saludo específico y caducidad configurada, sin que tengas que ir manualmente a la pestaña de QR.
> 3. **Doble modalidad de selección**: Envío individual directo desde la tarjeta de cada oferta y envío a empresas seleccionadas de tu radar.
> 4. **Visualización de maquetas claras**: Maqueta interactiva de la aplicación privada de gestión y maqueta independiente de la Web CV profesional que ven las empresas.

---

### 1. Visión General del Flujo de Envío en 1 Clic (con Revisión)

El objetivo es eliminar la fragmentación entre pestañas. En lugar de ir al Buscador -> Kanban -> CV -> Generador QR -> Gmail:

```
┌─────────────────────────┐     ┌────────────────────────────────┐     ┌────────────────────────┐
│  Oferta / Empresa       │ ──> │ Asistente Rápido de Revisión   │ ──> │ 1 Clic: "Enviar Ahora" │
│  (Botón "Enviar Web CV")│     │ • Enlace y QR generados        │     │ • Envío por Gmail API  │
│                         │     │ • Carta personalizada con IA   │     │ • Registro en Kanban   │
│                         │     │ • Destinatario verificado      │     │ • Estado: Enviado (ID) │
└─────────────────────────┘     └────────────────────────────────┘     └────────────────────────┘
```

1. **Desde cualquier oferta o empresa:** Pulsas el botón directo `Enviar Web CV a esta Empresa`.
2. **El sistema prepara automáticamente:**
   - Un enlace profesional único y código QR específico para esa empresa (ej. `empresa-torrijos-a5-2026`).
   - El texto del correo personalizado mencionando tu residencia en Santo Domingo-Caudilla, vehículo propio, formación administrativa y el Certificado de IA de 120h de la Cámara de Comercio de Toledo.
   - La vinculación con la oferta y la tarjeta del Kanban.
3. **Revisas en un modal limpio:** Compruebas el email de destino, el asunto y el cuerpo.
4. **Pulsas 1 clic ("Enviar Candidatura Ahora"):** Se ejecuta el envío a través de la API oficial de Gmail con OAuth, se registra el Message ID y se mueve la candidatura automáticamente a *"Enviada"* en el tablero Kanban.

---

### 2. Maqueta Visual de la Aplicación Privada y la Web CV

#### A. Maqueta de la Aplicación Privada (Panel de Gestión)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [EMPLEO 10]  Santo Domingo-Caudilla (Toledo)          [ES | EN]  [Vista Web Pública]   │
├───────────────┬────────────────────────────────────────────────────────────────────────┤
│ 1. Panel      │ OFERTAS EN RADAR (Radio ≤ 8 km y Remoto)                               │
│ 2. Ofertas    │ ┌────────────────────────────────────────────────────────────────────┐ │
│ 3. Compatibil.│ │ Administrativa de Atención al Cliente y Recepción                  │ │
│ 4. Mi CV/Docs │ │ Centro Empresarial y Servicios Comarca de Torrijos (4.8 km)        │ │
│ 5. Web Prof.  │ │ Presencial · 8h completa · Compatibilidad: 92/100                  │ │
│ 6. Código QR  │ │ [Detalles / Requisitos]      [🚀 ENVIAR MI WEB CV A ESTA EMPRESA]  │ │
│ 7. Orientadora│ └────────────────────────────────────────────────────────────────────┘ │
│ 8. Entrevistas│                                                                        │
│ 9. Kanban     │ MODAL DE REVISIÓN RÁPIDA (Al pulsar "Enviar mi Web CV"):               │
│ 10. Gmail     │ ┌────────────────────────────────────────────────────────────────────┐ │
│ 11. Estadíst. │ │ REVISAR ANTES DE ENVIAR (Cero envíos accidentales)                 │ │
│ 12. Seguridad │ │ • Para: seleccion@empresa-torrijos.es                              │ │
│               │ │ • Asunto: Candidatura: Recepción/Admin - Pilar Fernández           │ │
│               │ │ • Enlace generado: .../?share=torrijos-servicios-92                │ │
│               │ │ • QR: [Miniatura QR generada automáticamente]                      │ │
│               │ │ • Mensaje: "Estimado equipo... vehículo propio desde Santo         │ │
│               │ │   Domingo-Caudilla... Certificado IA 120h Cámara Toledo..."        │ │
│               │ │                                                                    │ │
│               │ │ [Seguir editando]             [✅ 1 CLIC: ENVIAR CANDIDATURA AHORA] │ │
│               │ └────────────────────────────────────────────────────────────────────┘ │
└───────────────┴────────────────────────────────────────────────────────────────────────┘
```

#### B. Maqueta de la Web CV Profesional Independiente (Lo que ve la Empresa)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ Pilar Fernández Almaraz                                   [Contactar por correo]       │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ PRESENTACIÓN AUTORIZADA · DESTINATARIO: ASESORÍA TORRIJOS S.L.                        │
│                                                                                        │
│ Pilar Fernández Almaraz                                                                │
│ Administración, Atención al Cliente, Recepción y Gestión de Consultas · Certificada IA │
│ Santo Domingo-Caudilla / Torrijos (Toledo) · Carnet y coche propio · Jornada 8h        │
│                                                                                        │
│ "Bienvenidos a mi presentación interactiva. Aquí pueden consultar mi perfil           │
│  administrativo verificado y mi Certificado oficial de IA de 120 horas."               │
│                                                                                        │
│ [✉ Contactar por correo]   [⬇ Descargar CV Autorizado (PDF)]   [⬇ Descargar (DOCX)]    │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 01. FORMACIÓN Y CERTIFICACIÓN OFICIAL                                                  │
│ ┌────────────────────────────────────────┐  ┌────────────────────────────────────────┐ │
│ │ Cámara de Comercio de Toledo           │  │ Formación Reglada                      │ │
│ │ Certificado Inteligencia Artificial    │  │ Formación Administrativa y Gestión     │ │
│ │ 120 horas certificadas                 │  │ Completa                               │ │
│ └────────────────────────────────────────┘  └────────────────────────────────────────┘ │
│                                                                                        │
│ 02. COMPETENCIAS CONFIRMADAS                03. HERRAMIENTAS DIGITALES                 │
│ • Atención al cliente presencial/teléfono   • Suite Ofimática (Excel, Word, docs)      │
│ • Recepción, agenda y tramitación           • IA Generativa aplicada a oficinas        │
│ • Resolución empática de consultas          • Correo profesional y gestión documental │
│ • Vehículo propio / movilidad inmediata     • Videoconferencia y trabajo en remoto     │
│                                                                                        │
│ 04. CONTACTO PROFESIONAL DIRECTO                                                       │
│ Correo: pilarfernandezalmaraz81@gmail.com · Sin exposición de dirección postal privada │
│ (Protegida contra indexación en Google: noindex, nofollow)                             │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 3. Modificaciones Técnicas a Realizar

1. **Nuevo Componente `QuickSendModal.tsx`:**
   - Modal flotante reutilizable desde el Buscador de Ofertas (`OffersAndCompatibility`) y desde el Tablero Kanban (`KanbanBoard`).
   - Genera automáticamente el token de la empresa si aún no existe, vincula el saludo y la fecha de caducidad (+14 días por defecto).
   - Prepara el borrador con la carta personalizada adaptada con los datos reales del perfil.
   - Dispone del botón de acción principal de 1 clic: **"Enviar Candidatura Ahora"**, que llama directamente a la API de Gmail (OAuth 2.0) y actualiza el Kanban a *"Enviada"* con su identificador oficial.
2. **Integración en `src/components/OffersAndCompatibility.tsx`:**
   - Añadir el botón destacado `Enviar Web CV a esta Empresa` en cada tarjeta de oferta.
3. **Integración en `src/components/KanbanBoard.tsx`:**
   - Enlazar el mismo asistente directo cuando una tarjeta esté en preparación o lista para enviar.
4. **Refuerzo en la Web CV (`PublicPortfolioView.tsx`):**
   - Asegurar que la empresa que recibe el enlace vea un encabezado personalizado que mencione su nombre y el mensaje adaptado.
