import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import QRCode from 'qrcode';
import { CandidateProfile, CustomDocumentItem } from '../types';

export async function exportProfileCvToPdf(profile: CandidateProfile, targetWebUrl?: string): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 18;
  const pageWidth = 210 - margin * 2;
  let y = 20;

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text(profile.fullName || 'Candidata Profesional', margin, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(13, 148, 136);
  const headlineLines = doc.splitTextToSize(profile.headline, pageWidth);
  doc.text(headlineLines, margin, y);
  y += headlineLines.length * 5 + 2;

  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  const emailPart = profile.showPublicEmail !== false && profile.publicContactEmail ? `Correo: ${profile.publicContactEmail}` : '';
  const contactLine = [
    `Ubicación: ${profile.residence}`,
    emailPart,
    profile.publicContactPhoneOptional ? `Tel: ${profile.publicContactPhoneOptional}` : '',
    profile.drivingLicenseAndOwnCar ? 'Permiso de conducir y vehículo propio' : '',
  ]
    .filter(Boolean)
    .join('  ·  ');
  const contactLines = doc.splitTextToSize(contactLine, pageWidth);
  doc.text(contactLines, margin, y);
  y += contactLines.length * 4.5 + 4;

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, 210 - margin, y);
  y += 7;

  // Section helper
  const addSectionTitle = (title: string) => {
    if (y > 265) {
      doc.addPage();
      y = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(title.toUpperCase(), margin, y);
    y += 5.5;
  };

  const addParagraph = (text: string, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(9.8);
    doc.setTextColor(30, 41, 59);
    const lines = doc.splitTextToSize(text, pageWidth);
    if (y + lines.length * 4.8 > 278) {
      doc.addPage();
      y = 20;
    }
    doc.text(lines, margin, y);
    y += lines.length * 4.8 + 2;
  };

  addSectionTitle('Perfil y Objetivo Profesional');
  addParagraph(profile.professionalGoal);
  addParagraph(
    `Disponibilidad: ${profile.acceptedSchedules.join(', ')} · Modalidades: ${profile.acceptedModalities.join(', ')} · Zonas prioritarias (~${profile.maxPriorityRadiusKm} km): ${profile.priorityLocations.join(', ')}.`
  );
  y += 2;

  if (profile.experiences.filter((e) => e.verifiedByOwner).length > 0) {
    addSectionTitle('Mi Experiencia Laboral');
    profile.experiences
      .filter((e) => e.verifiedByOwner)
      .forEach((exp) => {
        addParagraph(`${exp.role} · ${exp.company} (${exp.location}) | ${exp.period}`, true);
        addParagraph(exp.description);
      });
    y += 2;
  }

  addSectionTitle('Formación y Conocimientos Administrativos');
  addParagraph(
    'Cuento con formación de Auxiliar Administrativo y conocimientos informáticos, contables y de gestión adquiridos mediante formación. Deseo desarrollarlos y aplicarlos activamente en un puesto de trabajo en la empresa.'
  );
  y += 2;

  addSectionTitle('Certificaciones y Formación Acreditada');
  profile.education
    .filter((e) => e.verifiedByOwner)
    .forEach((edu) => {
      addParagraph(`• ${edu.title} — ${edu.institution} (${edu.yearOrHours})`, true);
    });
  y += 2;

  addSectionTitle('Competencias Confirmadas');
  profile.confirmedSkills.forEach((skill) => {
    addParagraph(`• ${skill}`);
  });
  y += 2;

  addSectionTitle('Herramientas Digitales');
  profile.digitalTools.forEach((tool) => {
    addParagraph(`• ${tool}`);
  });
  y += 2;

  addSectionTitle('Acceso a Web CV y Código QR Oficial');
  const webUrl =
    targetWebUrl ||
    (typeof window !== 'undefined'
      ? `${window.location.origin}/?share=pilar-fernandez`
      : 'https://pilar-fernandez.cv');
  try {
    const qrDataUrl = await QRCode.toDataURL(webUrl, { width: 140, margin: 1 });
    if (y + 35 > 275) {
      doc.addPage();
      y = 20;
    }
    doc.addImage(qrDataUrl, 'PNG', margin, y, 26, 26);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('Escanea para entrar a mi Web CV:', margin + 30, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text('Presentación interactiva completa con certificado y contacto directo.', margin + 30, y + 13);
    doc.setTextColor(13, 148, 136);
    doc.text(webUrl, margin + 30, y + 19);
    y += 30;
  } catch {
    addParagraph(`Web CV oficial: ${webUrl}`);
  }

  doc.save(`CV_Autorizado_${(profile.fullName || 'Candidata').replace(/\s+/g, '_')}.pdf`);
}

export async function exportProfileCvToDocx(profile: CandidateProfile): Promise<void> {
  const children: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [
        new TextRun({
          text: profile.fullName || 'Candidata Profesional',
          bold: true,
          size: 32,
          color: '0F172A',
        }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: profile.headline,
          bold: true,
          size: 22,
          color: '0D9488',
        }),
      ],
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: [
            profile.residence,
            profile.showPublicEmail !== false ? profile.publicContactEmail : null,
            profile.drivingLicenseAndOwnCar ? 'Permiso de conducir y coche propio' : null,
          ]
            .filter(Boolean)
            .join(' · '),
          size: 19,
          color: '475569',
        }),
      ],
      spacing: { after: 240 },
    }),
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text: 'PERFIL Y OBJETIVO PROFESIONAL', bold: true, size: 24 })],
      spacing: { before: 160, after: 100 },
    }),
    new Paragraph({
      children: [new TextRun({ text: profile.professionalGoal, size: 21 })],
      spacing: { after: 160 },
    }),
  ];

  const verifiedExps = profile.experiences.filter((e) => e.verifiedByOwner);
  if (verifiedExps.length > 0) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [
          new TextRun({ text: 'MI EXPERIENCIA LABORAL', bold: true, size: 24 }),
        ],
        spacing: { before: 160, after: 100 },
      })
    );
    verifiedExps.forEach((exp) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${exp.role} — ${exp.company} (${exp.location}) | ${exp.period}`,
              bold: true,
              size: 21,
            }),
          ],
          spacing: { after: 60 },
        }),
        new Paragraph({
          children: [new TextRun({ text: exp.description, size: 20 })],
          spacing: { after: 140 },
        })
      );
    });
  }

  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [
        new TextRun({ text: 'FORMACIÓN Y CONOCIMIENTOS ADMINISTRATIVOS', bold: true, size: 24 }),
      ],
      spacing: { before: 160, after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'Formación de Auxiliar Administrativo y conocimientos informáticos, contables y de gestión (adquiridos mediante formación reglada y que deseo desarrollar en un puesto de trabajo).',
          size: 21,
        }),
      ],
      spacing: { after: 160 },
    }),
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [
        new TextRun({ text: 'CERTIFICACIONES Y FORMACIÓN ACREDITADA', bold: true, size: 24 }),
      ],
      spacing: { before: 160, after: 100 },
    }),
    ...profile.education
      .filter((e) => e.verifiedByOwner)
      .map(
        (edu) =>
          new Paragraph({
            children: [
              new TextRun({ text: `• ${edu.title}`, bold: true, size: 21 }),
              new TextRun({
                text: ` — ${edu.institution} (${edu.yearOrHours})`,
                size: 21,
              }),
            ],
            spacing: { after: 80 },
          })
      )
  );

  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text: 'COMPETENCIAS CONFIRMADAS', bold: true, size: 24 })],
      spacing: { before: 160, after: 100 },
    }),
    ...profile.confirmedSkills.map(
      (s) =>
        new Paragraph({
          children: [new TextRun({ text: `• ${s}`, size: 20 })],
          spacing: { after: 60 },
        })
    ),
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text: 'HERRAMIENTAS DIGITALES', bold: true, size: 24 })],
      spacing: { before: 160, after: 100 },
    }),
    ...profile.digitalTools.map(
      (t) =>
        new Paragraph({
          children: [new TextRun({ text: `• ${t}`, size: 20 })],
          spacing: { after: 60 },
        })
    )
  );

  const docxDoc = new Document({
    sections: [{ properties: {}, children }],
  });

  const blob = await Packer.toBlob(docxDoc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `CV_Autorizado_${(profile.fullName || 'Candidata').replace(/\s+/g, '_')}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportCustomDocumentToPdf(docItem: CustomDocumentItem, authorName: string): void {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 20;
  const pageWidth = 210 - margin * 2;
  let y = 22;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.setTextColor(15, 23, 42);
  const titleLines = pdf.splitTextToSize(docItem.title, pageWidth);
  pdf.text(titleLines, margin, y);
  y += titleLines.length * 6 + 2;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9.5);
  pdf.setTextColor(100, 116, 139);
  pdf.text(
    `Destinatario: ${docItem.targetCompany || 'General'} · Puesto: ${docItem.targetRole || 'General'} · Autora: ${authorName}`,
    margin,
    y
  );
  y += 6;

  pdf.setDrawColor(226, 232, 240);
  pdf.line(margin, y, 210 - margin, y);
  y += 8;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10.5);
  pdf.setTextColor(30, 41, 59);
  const bodyLines = pdf.splitTextToSize(docItem.contentBody, pageWidth);
  bodyLines.forEach((line: string) => {
    if (y > 276) {
      pdf.addPage();
      y = 20;
    }
    pdf.text(line, margin, y);
    y += 5.2;
  });

  pdf.save(`${docItem.title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50)}.pdf`);
}

export async function exportCustomDocumentToDocx(
  docItem: CustomDocumentItem,
  authorName: string
): Promise<void> {
  const lines = docItem.contentBody.split('\n');
  const docxDoc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [
              new TextRun({
                text: docItem.title,
                bold: true,
                size: 28,
                color: '0F172A',
              }),
            ],
            spacing: { after: 120 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Empresa: ${docItem.targetCompany} · Puesto: ${docItem.targetRole} · Candidata: ${authorName}`,
                size: 19,
                color: '475569',
              }),
            ],
            spacing: { after: 240 },
          }),
          ...lines.map(
            (line) =>
              new Paragraph({
                children: [new TextRun({ text: line, size: 22 })],
                spacing: { after: 100 },
              })
          ),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(docxDoc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${docItem.title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50)}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}
