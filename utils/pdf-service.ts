import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ReportData {
  titre: string;
  description: string;
  date_fin: string;
  createur: string;
  total_votes: number;
  options: { label: string; votes_count: number; percentage: number }[];
  copropriete_nom: string;
}

interface AgendaEvent {
  date_event: string;
  titre: string;
  categorie: string;
  description?: string | null;
}

// Extension du type jsPDF pour inclure les propriétés de jspdf-autotable
interface jsPDFWithAutoTable extends jsPDF {
  lastAutoTable: {
    finalY: number;
  };
}

export const generateDecisionReport = (data: ReportData) => {
  const doc = new jsPDF() as jsPDFWithAutoTable;
  const pageWidth = doc.internal.pageSize.width;

  // --- EN-TÊTE ---
  doc.setFillColor(15, 23, 42); // Slate-900
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('COPROSYNC', 20, 20);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('RAPPORT DE DÉCISION OFFICIEL', 20, 30);
  doc.text(format(new Date(), 'dd MMMM yyyy HH:mm', { locale: fr }), pageWidth - 70, 25);

  // --- CORPS DU RAPPORT ---
  let cursorY = 55;

  // Infos Copro
  doc.setTextColor(79, 70, 229); // Indigo-600
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`COPROPRIÉTÉ : ${data.copropriete_nom.toUpperCase()}`, 20, cursorY);
  cursorY += 15;

  // Titre du Vote
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(18);
  doc.text(data.titre, 20, cursorY);
  cursorY += 10;

  // Description
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139); // Slate-500
  const splitDescription = doc.splitTextToSize(data.description || 'Aucune description fournie.', pageWidth - 40);
  doc.text(splitDescription, 20, cursorY);
  cursorY += (splitDescription.length * 6) + 10;

  // Stats
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(`PARTICIPATION : ${data.total_votes} votants`, 20, cursorY);
  doc.text(`DATE DE CLÔTURE : ${format(new Date(data.date_fin), 'dd/MM/yyyy', { locale: fr })}`, pageWidth - 80, cursorY);
  cursorY += 15;

  // --- TABLEAU DES RÉSULTATS ---
  autoTable(doc, {
    startY: cursorY,
    head: [['Option', 'Nombre de voix', 'Pourcentage']],
    body: data.options.map(opt => [
      opt.label,
      opt.votes_count.toString(),
      `${opt.percentage}%`
    ]),
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { font: 'helvetica', fontSize: 10, cellPadding: 6 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 20, right: 20 }
  });

  // --- PIED DE PAGE ---
  const finalY = doc.lastAutoTable.finalY + 30;
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // Slate-400
  doc.text('Document généré numériquement par CoproSync V3.', pageWidth / 2, finalY, { align: 'center' });
  doc.text('Ce rapport fait foi des résultats enregistrés sur la plateforme à la date de clôture.', pageWidth / 2, finalY + 5, { align: 'center' });

  // Sauvegarde
  doc.save(`Rapport_Decision_${data.titre.replace(/\s+/g, '_')}.pdf`);
};

export const generateAgendaReport = (coproNom: string, events: AgendaEvent[]) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // En-tête identique
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('COPROSYNC', 20, 20);
  doc.setFontSize(10);
  doc.text('PLANNING RÉGLEMENTAIRE & INTERVENTIONS', 20, 30);
  doc.text(`Copro : ${coproNom}`, pageWidth - 80, 25);

  autoTable(doc, {
    startY: 55,
    head: [['Date', 'Événement', 'Type', 'Description']],
    body: events.map(e => [
      format(new Date(e.date_event), 'dd/MM HH:mm'),
      e.titre,
      e.categorie.toUpperCase(),
      e.description || '-'
    ]),
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
    styles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 50 },
      2: { cellWidth: 30 },
    }
  });

  doc.save(`Agenda_${coproNom.replace(/\s+/g, '_')}.pdf`);
};
