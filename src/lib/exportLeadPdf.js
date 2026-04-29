// PDF-Export für Lead-Detail – 3-seitiges Kundendossier (Bank-tauglich).
// TODO: replace mock data with real Supabase data when connected.

import jsPDF from 'jspdf';
import { computeVerdict } from './qualification.js';
import { formatDeadline, deadlineStatus } from './deadline.js';

// Farbpalette
const NAVY_DARK = [27, 42, 74];
const NAVY_MID = [37, 99, 235];
const GREEN = [34, 197, 94];
const GREEN_BG = [220, 252, 231];
const GREEN_TEXT = [22, 101, 52];
const RED = [239, 68, 68];
const RED_BG = [254, 242, 242];
const RED_TEXT = [153, 27, 27];
const ORANGE = [245, 158, 11];
const ORANGE_BG = [254, 243, 199];
const ORANGE_TEXT = [146, 64, 14];
const GRAY_DARK = [29, 29, 31];
const GRAY_MID = [110, 110, 115];
const GRAY_LIGHT = [229, 231, 235];
const GRAY_VLIGHT = [243, 244, 246];
const GRAY_BG = [245, 245, 247];
const GRAY_OFF = [249, 250, 251];
const WHITE = [255, 255, 255];
const TAG_BG = [239, 246, 255];
const SOFT_GREEN_BG = [240, 253, 244];

// Pre-mixed "white-on-navy opacity" tones (for cover page) and green/red 15% on navy
const W50_ON_NAVY = [141, 148, 165];
const W40_ON_NAVY = [118, 127, 147];
const W20_ON_NAVY = [73, 84, 110];
const W15_ON_NAVY = [61, 74, 102];
const W12_ON_NAVY = [55, 68, 98];
const W8_ON_NAVY = [45, 59, 91];
const GREEN15_ON_NAVY = [59, 65, 77];
const RED15_ON_NAVY = [59, 46, 74];

const FLAG_LABELS = {
  weniger_3j_sst: 'Weniger als 3 Jahre selbstständig',
  probezeit: 'Arbeitnehmer in Probezeit',
  konsumdarlehen: 'Vorhandene Konsumdarlehen',
  unterhalt: 'Unterhaltsverpflichtung',
  kompensation_ek: 'Geringeres Eigenkapital, dafür höheres Einkommen',
  kompensation_einkommen: 'Geringeres Einkommen, dafür höheres Eigenkapital',
};

const POTENTIAL_LABELS = {
  sparvertrag: 'Sparvertrag',
  privatversichert: 'Privatversicherte Angestellte',
  lebensversicherung: 'Lebensversicherung mit Rückkaufwert',
  bankguthaben: 'Bankguthaben',
  auslaufende_lv: 'Auslaufende Lebens-/Rentenversicherungen',
  wiederanlage: 'Wiederanlage / Umschichtung',
};

const PAGE_W = 210;
const PAGE_H = 297;
const M_LEFT = 20;
const M_RIGHT = 20;
const CONTENT_W = PAGE_W - M_LEFT - M_RIGHT;

function setText(doc, rgb) { doc.setTextColor(rgb[0], rgb[1], rgb[2]); }
function setFill(doc, rgb) { doc.setFillColor(rgb[0], rgb[1], rgb[2]); }
function setDraw(doc, rgb) { doc.setDrawColor(rgb[0], rgb[1], rgb[2]); }

function fmtMoney(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v === 0) return '—';
  return v.toLocaleString('de-DE') + ' EUR';
}

function pad2(n) { return String(n).padStart(2, '0'); }
function ddmmyyyy(d) { return `${pad2(d.getDate())}${pad2(d.getMonth() + 1)}${d.getFullYear()}`; }
function fmtGenerated(d) {
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()} um ${pad2(d.getHours())}:${pad2(d.getMinutes())} Uhr`;
}

function safeFile(name) {
  return (name || 'Kunde').replace(/\s+/g, '').replace(/[^A-Za-z0-9äöüÄÖÜß_-]/g, '');
}

function lastName(full) {
  if (!full) return 'Kunde';
  const parts = full.trim().split(/\s+/);
  return parts[parts.length - 1] || full;
}

function spacedText(doc, text, x, y, opts = {}) {
  doc.text(text, x, y, { ...opts, charSpace: opts.charSpace ?? 0.4 });
}

const LOGO_URL = '/assets/Wertentwickler%20logo1.png';

async function loadLogo() {
  try {
    const res = await fetch(LOGO_URL);
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
    const dims = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve({ w: 1, h: 1 });
      img.src = dataUrl;
    });
    return { dataUrl, ratio: dims.w / dims.h };
  } catch {
    return null;
  }
}

function drawLogo(doc, logo, x, y, height, align = 'left') {
  if (!logo) return 0;
  const w = height * logo.ratio;
  const drawX = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
  doc.addImage(logo.dataUrl, 'PNG', drawX, y, w, height);
  return w;
}

// ========== PAGE 1 — Cover ==========
function drawCover(doc, lead, qualification, advisorName, logo) {
  // Full navy background
  setFill(doc, NAVY_DARK);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');

  // Logo centered, y=20mm, h=18mm
  if (logo) drawLogo(doc, logo, PAGE_W / 2, 20, 18, 'center');

  // Top eyebrow (logo occupies y=20..38, eyebrow at y=46)
  setText(doc, W50_ON_NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  spacedText(doc, 'UNTERLAGEN-CHECK', M_LEFT, 46, { charSpace: 1.2 });

  // Title
  setText(doc, WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(32);
  doc.text('Kundendossier', M_LEFT, 50);

  // Divider line at y=62
  setDraw(doc, W20_ON_NAVY);
  doc.setLineWidth(0.3);
  doc.line(M_LEFT, 62, PAGE_W - M_RIGHT, 62);

  // "Vorbereitet für"
  setText(doc, W50_ON_NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  spacedText(doc, 'VORBEREITET FÜR', M_LEFT, 72, { charSpace: 0.8 });

  // Client name
  setText(doc, WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text(lead.client_name || '—', M_LEFT, 80);

  // Status badge (white 15% bg)
  const isDone = lead.status === 'vollständig';
  const statusLabel = isDone ? 'Vollständig' : 'Offen';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  const sw = doc.getTextWidth(statusLabel);
  const badgeW = Math.max(28, sw + 8);
  setFill(doc, W15_ON_NAVY);
  doc.roundedRect(M_LEFT, 86, badgeW, 7, 1.5, 1.5, 'F');
  setText(doc, WHITE);
  doc.text(statusLabel, M_LEFT + badgeW / 2, 91, { align: 'center' });

  // Info cards: 2x2 grid at y=100
  const cardW = 80;
  const cardH = 22;
  const gridY = 100;
  const cardGap = 8;

  function infoCard(x, y, label, value, valueRgb) {
    setFill(doc, W8_ON_NAVY);
    setDraw(doc, W12_ON_NAVY);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, cardW, cardH, 2, 2, 'FD');
    setText(doc, W50_ON_NAVY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    spacedText(doc, label.toUpperCase(), x + 5, y + 8, { charSpace: 0.5 });
    setText(doc, valueRgb || WHITE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(value || '—', x + 5, y + 16);
  }

  const advisor = advisorName || lead.profiles?.full_name || '—';
  const createdAt = new Date(lead.created_at).toLocaleDateString('de-DE');
  const ds = deadlineStatus(lead.deadline);
  const deadlineColor = ds && (ds.level === 'expired' || ds.level === 'warning') ? ORANGE : null;
  const deadlineValue = lead.deadline ? formatDeadline(lead.deadline) : '—';

  infoCard(M_LEFT, gridY, 'Berater', advisor);
  infoCard(M_LEFT + cardW + cardGap, gridY, 'Erstellt', createdAt);
  infoCard(M_LEFT, gridY + cardH + cardGap, 'Telefon', lead.client_phone || '—');
  infoCard(M_LEFT + cardW + cardGap, gridY + cardH + cardGap, 'Frist', deadlineValue, deadlineColor);

  // Qualification result box at y=152
  const qY = 152;
  const qH = 20;
  const verdict = qualification ? computeVerdict(qualification) : { level: 'empty' };
  let qBg, qBorder, qDot, qLabel;
  if (verdict.level === 'pass') {
    qBg = GREEN15_ON_NAVY; qBorder = GREEN; qDot = GREEN;
    qLabel = 'Qualifiziert für Immobilienfinanzierung';
  } else if (verdict.level === 'warn') {
    qBg = [69, 70, 77]; qBorder = ORANGE; qDot = ORANGE;
    qLabel = 'Qualifiziert mit Auflagen';
  } else if (verdict.level === 'fail') {
    qBg = RED15_ON_NAVY; qBorder = RED; qDot = RED;
    qLabel = 'Gesonderte Prüfung erforderlich';
  } else {
    qBg = W8_ON_NAVY; qBorder = W20_ON_NAVY; qDot = W50_ON_NAVY;
    qLabel = 'Voraussetzungen noch nicht erfasst';
  }
  setFill(doc, qBg);
  setDraw(doc, qBorder);
  doc.setLineWidth(0.5);
  doc.roundedRect(M_LEFT, qY, CONTENT_W, qH, 3, 3, 'FD');
  setFill(doc, qDot);
  doc.circle(M_LEFT + 14, qY + qH / 2, 2.5, 'F');
  setText(doc, WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(qLabel, M_LEFT + 22, qY + qH / 2 + 1.5);

  // Bottom area
  setDraw(doc, W15_ON_NAVY);
  doc.setLineWidth(0.3);
  doc.line(M_LEFT, 240, PAGE_W - M_RIGHT, 240);

  setText(doc, WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Wertentwickler', M_LEFT, 248);

  setText(doc, W50_ON_NAVY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Dieses Dokument ist vertraulich und ausschließlich für den', M_LEFT, 254);
  doc.text('adressierten Empfänger bestimmt.', M_LEFT, 258);

  setText(doc, W40_ON_NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  spacedText(doc, 'VERTRAULICH', M_LEFT, 268, { charSpace: 1.6 });
}

// ========== Header bar (pages 2+3) ==========
function drawTopBar(doc, title, pageNum, totalPages, logo) {
  setFill(doc, NAVY_DARK);
  doc.rect(0, 0, PAGE_W, 14, 'F');
  setText(doc, WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(title, M_LEFT, 9);
  if (logo) drawLogo(doc, logo, PAGE_W - M_RIGHT, 3, 8, 'right');
  setText(doc, W40_ON_NAVY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`${pageNum} / ${totalPages}`, PAGE_W - M_RIGHT, 14, { align: 'right' });
}

// ========== Footer bar (pages 2+3) ==========
function drawFooterBar(doc, pageNum, totalPages, generatedAt) {
  const y = PAGE_H - 8;
  setFill(doc, GRAY_BG);
  doc.rect(0, y, PAGE_W, 8, 'F');
  setText(doc, GRAY_MID);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(`Erstellt am ${fmtGenerated(generatedAt)}`, M_LEFT, y + 5);
  doc.text('Vertraulich', PAGE_W / 2, y + 5, { align: 'center' });
  doc.text(`Seite ${pageNum} von ${totalPages}`, PAGE_W - M_RIGHT, y + 5, { align: 'right' });
}

// ========== Section heading (pages 2+3) ==========
function sectionHeading(doc, ctx, title, subtitle) {
  setFill(doc, NAVY_MID);
  doc.rect(M_LEFT, ctx.y - 4, 2.5, 5, 'F');
  setText(doc, NAVY_DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(title, M_LEFT + 5, ctx.y);
  if (subtitle) {
    setText(doc, GRAY_MID);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(subtitle, M_LEFT + 5, ctx.y + 4);
    ctx.y += 9;
  } else {
    ctx.y += 5;
  }
}

// ========== PAGE 2 — Kundenqualifikation ==========
function drawQualificationPage(doc, lead, qualification, totalPages, generatedAt, logo) {
  drawTopBar(doc, 'Kundenqualifikation', 2, totalPages, logo);

  const ctx = { doc, y: 22 };

  // ----- Voraussetzungs-Check -----
  sectionHeading(doc, ctx, 'Voraussetzungs-Check', 'Prüfwerte und Qualifikation');

  const hasQual = qualification && (
    Number(qualification.haushaltseinkommen) ||
    Number(qualification.gewinn_3j) ||
    Number(qualification.eigenkapital) ||
    Number(qualification.zve)
  );

  if (!hasQual) {
    const boxH = 12;
    setFill(doc, GRAY_BG);
    doc.roundedRect(M_LEFT, ctx.y, CONTENT_W, boxH, 2, 2, 'F');
    setText(doc, GRAY_MID);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.text('Noch nicht erfasst', M_LEFT + CONTENT_W / 2, ctx.y + 7.5, { align: 'center' });
    ctx.y += boxH + 6;
  } else {
    const verdict = computeVerdict(qualification);
    const familienstand = qualification.familienstand === 'verheiratet' ? 'Verheiratet' : 'Ledig';
    const beschaeftigung = qualification.beschaeftigung === 'selbststaendig' ? 'Selbstständig' : 'Angestellt';
    const rows = [
      ['Familienstand', familienstand, 'Beschäftigung', beschaeftigung],
      ['Haushaltseinkommen', fmtMoney(qualification.haushaltseinkommen), 'Eigenkapital', fmtMoney(qualification.eigenkapital)],
      ['Kinder im Haushalt', String(qualification.kinder ?? 0), 'ZVE', fmtMoney(qualification.zve)],
    ];
    const rowH = 11;
    rows.forEach(([l1, v1, l2, v2], idx) => {
      setFill(doc, idx % 2 === 0 ? GRAY_BG : WHITE);
      doc.rect(M_LEFT, ctx.y, CONTENT_W, rowH, 'F');
      setText(doc, GRAY_MID);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      spacedText(doc, l1.toUpperCase(), M_LEFT + 4, ctx.y + 4.2, { charSpace: 0.3 });
      spacedText(doc, l2.toUpperCase(), M_LEFT + CONTENT_W / 2 + 4, ctx.y + 4.2, { charSpace: 0.3 });
      setText(doc, NAVY_DARK);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(v1, M_LEFT + 4, ctx.y + 8.5);
      doc.text(v2, M_LEFT + CONTENT_W / 2 + 4, ctx.y + 8.5);
      ctx.y += rowH;
    });
    ctx.y += 4;

    // Result box
    const resultH = 12;
    let bg, border, dot, textCol, label;
    if (verdict.level === 'pass') { bg = SOFT_GREEN_BG; border = GREEN; dot = GREEN; textCol = GREEN_TEXT; label = 'Qualifiziert'; }
    else if (verdict.level === 'warn') { bg = [255, 247, 237]; border = ORANGE; dot = ORANGE; textCol = ORANGE_TEXT; label = 'Qualifiziert mit Auflagen'; }
    else if (verdict.level === 'fail') { bg = RED_BG; border = RED; dot = RED; textCol = RED_TEXT; label = 'Nicht qualifiziert'; }
    else { bg = GRAY_BG; border = GRAY_LIGHT; dot = GRAY_MID; textCol = GRAY_MID; label = 'Noch nicht erfasst'; }
    setFill(doc, bg);
    setDraw(doc, border);
    doc.setLineWidth(0.4);
    doc.roundedRect(M_LEFT, ctx.y, CONTENT_W, resultH, 2, 2, 'FD');
    setFill(doc, dot);
    doc.circle(M_LEFT + 8, ctx.y + resultH / 2, 1.6, 'F');
    setText(doc, textCol);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(label, M_LEFT + 14, ctx.y + resultH / 2 + 1.6);
    ctx.y += resultH + 6;
  }

  // ----- Gesonderte Prüfung -----
  if (qualification) {
    const flagsActive = Object.entries(qualification.flags || {}).filter(([, v]) => v).map(([k]) => FLAG_LABELS[k] || k);
    if (flagsActive.length) {
      sectionHeading(doc, ctx, 'Gesonderte Prüfung', null);
      const text = flagsActive.join(', ');
      const wrapped = doc.splitTextToSize(text, CONTENT_W - 6);
      const boxH = 5 + wrapped.length * 3.6;
      setFill(doc, GRAY_BG);
      doc.roundedRect(M_LEFT, ctx.y, CONTENT_W, boxH, 2, 2, 'F');
      setText(doc, GRAY_DARK);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(wrapped, M_LEFT + 3, ctx.y + 4.5);
      ctx.y += boxH + 6;
    }

    // ----- Ideen zur Potentialfindung -----
    const potentialActive = Object.entries(qualification.potential || {}).filter(([, v]) => v).map(([k]) => POTENTIAL_LABELS[k] || k);
    if (potentialActive.length) {
      sectionHeading(doc, ctx, 'Ideen zur Potentialfindung', null);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      const tagH = 6.5;
      const tagPadX = 4;
      const tagGap = 3;
      let tx = M_LEFT;
      let ty = ctx.y;
      for (const tag of potentialActive) {
        const w = doc.getTextWidth(tag) + tagPadX * 2;
        if (tx + w > PAGE_W - M_RIGHT) {
          tx = M_LEFT;
          ty += tagH + tagGap;
        }
        setFill(doc, TAG_BG);
        setDraw(doc, NAVY_MID);
        doc.setLineWidth(0.3);
        doc.roundedRect(tx, ty, w, tagH, 1.5, 1.5, 'FD');
        setText(doc, NAVY_DARK);
        doc.text(tag, tx + tagPadX, ty + 4.4);
        tx += w + tagGap;
      }
      ctx.y = ty + tagH + 6;
    }

    // ----- Interne Notiz -----
    if (qualification.notiz && qualification.notiz.trim()) {
      sectionHeading(doc, ctx, 'Anmerkung des Beraters', null);
      const wrapped = doc.splitTextToSize(qualification.notiz.trim(), CONTENT_W - 6);
      const boxH = 5 + wrapped.length * 3.8;
      setFill(doc, GRAY_BG);
      doc.roundedRect(M_LEFT, ctx.y, CONTENT_W, boxH, 2, 2, 'F');
      setText(doc, GRAY_DARK);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.text(wrapped, M_LEFT + 3, ctx.y + 4.5);
      ctx.y += boxH + 6;
    }
  }
}

// ========== PAGE 3 — Unterlagen-Status ==========
function drawDocumentsPage(doc, lead, sections, items, leadItems, totalPages, generatedAt, logo) {
  drawTopBar(doc, 'Unterlagen-Status', 3, totalPages, logo);
  const ctx = { doc, y: 22 };

  const total = leadItems.length;
  const done = leadItems.filter((li) => li.checked).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  // Progress card
  const cardH = 22;
  setFill(doc, NAVY_DARK);
  doc.roundedRect(M_LEFT, ctx.y, CONTENT_W, cardH, 3, 3, 'F');
  setText(doc, WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(`${done} von ${total} Unterlagen`, M_LEFT + 8, ctx.y + 11);
  setText(doc, W50_ON_NAVY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('eingereicht', M_LEFT + 8, ctx.y + 17);
  setText(doc, WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(`${pct}%`, M_LEFT + CONTENT_W - 8, ctx.y + 14, { align: 'right' });
  // Bar
  const barX = M_LEFT + 8;
  const barY = ctx.y + cardH - 4;
  const barW = CONTENT_W - 16;
  const barH = 2.2;
  setFill(doc, W20_ON_NAVY);
  doc.roundedRect(barX, barY, barW, barH, 1, 1, 'F');
  if (pct > 0) {
    setFill(doc, NAVY_MID);
    doc.roundedRect(barX, barY, (barW * pct) / 100, barH, 1, 1, 'F');
  }
  ctx.y += cardH + 6;

  const liByItem = Object.fromEntries(leadItems.map((li) => [li.item_id, li]));
  const FOOTER_LIMIT = PAGE_H - 18;

  function ensureSpace(needed) {
    if (ctx.y + needed > FOOTER_LIMIT) {
      doc.addPage();
      drawTopBar(doc, 'Unterlagen-Status', doc.getNumberOfPages(), totalPages, logo);
      ctx.y = 22;
    }
  }

  for (const section of sections) {
    const sectionItems = items.filter((i) => i.section_id === section.id);
    if (!sectionItems.length) continue;
    if (section.id === 2) {
      const hasActivity = sectionItems.some((it) => {
        const li = liByItem[it.id];
        return li && (li.checked || li.file_path || li.advisor_note);
      });
      if (!hasActivity) continue;
    }

    ensureSpace(20);
    sectionHeading(doc, ctx, section.label, null);
    ctx.y += 1;

    // Header row
    const headerH = 8;
    const colItemX = M_LEFT;
    const colStatusX = 132;
    const colFileX = 172;
    setFill(doc, GRAY_BG);
    doc.rect(M_LEFT, ctx.y, CONTENT_W, headerH, 'F');
    setText(doc, GRAY_MID);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    spacedText(doc, 'UNTERLAGE', colItemX + 4, ctx.y + 5.2, { charSpace: 0.4 });
    spacedText(doc, 'STATUS', colStatusX, ctx.y + 5.2, { charSpace: 0.4 });
    spacedText(doc, 'DATEI', colFileX, ctx.y + 5.2, { charSpace: 0.4 });
    ctx.y += headerH;

    sectionItems.forEach((it, idx) => {
      const li = liByItem[it.id];
      const checked = !!li?.checked;
      const hasFile = !!li?.file_path;
      const advisorNote = (li?.advisor_note || '').trim();

      const labelLines = doc.splitTextToSize(it.label, colStatusX - colItemX - 8);
      const descLines = it.description ? doc.splitTextToSize(it.description, colStatusX - colItemX - 8) : [];
      const baseRowH = Math.max(12, 5 + labelLines.length * 3.6 + (descLines.length ? descLines.length * 3 + 1 : 0));

      ensureSpace(baseRowH + (advisorNote ? 10 : 0));

      setFill(doc, idx % 2 === 1 ? GRAY_BG : WHITE);
      doc.rect(M_LEFT, ctx.y, CONTENT_W, baseRowH, 'F');

      setText(doc, NAVY_DARK);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(labelLines, colItemX + 4, ctx.y + 4.5);
      if (descLines.length) {
        setText(doc, GRAY_MID);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.text(descLines, colItemX + 4, ctx.y + 4.5 + labelLines.length * 3.6);
      }

      // Status pill
      const pillW = 30;
      const pillH = 6;
      const pillY = ctx.y + (baseRowH - pillH) / 2;
      if (checked) {
        setFill(doc, GREEN_BG);
        doc.roundedRect(colStatusX, pillY, pillW, pillH, 1.5, 1.5, 'F');
        setFill(doc, GREEN);
        doc.circle(colStatusX + 3, pillY + pillH / 2, 1.2, 'F');
        setText(doc, GREEN_TEXT);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.text('Eingereicht', colStatusX + 6, pillY + 4);
      } else {
        setFill(doc, GRAY_OFF);
        setDraw(doc, GRAY_LIGHT);
        doc.setLineWidth(0.3);
        doc.roundedRect(colStatusX, pillY, pillW, pillH, 1.5, 1.5, 'FD');
        setDraw(doc, GRAY_MID);
        doc.circle(colStatusX + 3, pillY + pillH / 2, 1.2, 'D');
        setText(doc, GRAY_MID);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.text('Ausstehend', colStatusX + 6, pillY + 4);
      }

      // Datei col
      doc.setFontSize(8);
      if (hasFile) {
        setText(doc, GREEN);
        doc.setFont('helvetica', 'bold');
        doc.text('Ja', colFileX, ctx.y + baseRowH / 2 + 1.2);
      } else {
        setText(doc, GRAY_LIGHT);
        doc.setFont('helvetica', 'normal');
        doc.text('—', colFileX, ctx.y + baseRowH / 2 + 1.2);
      }

      setDraw(doc, GRAY_VLIGHT);
      doc.setLineWidth(0.2);
      doc.line(M_LEFT, ctx.y + baseRowH, PAGE_W - M_RIGHT, ctx.y + baseRowH);
      ctx.y += baseRowH;

      if (advisorNote) {
        const noteLines = doc.splitTextToSize(advisorNote, CONTENT_W - 14);
        const noteH = 4 + noteLines.length * 3.4;
        ensureSpace(noteH + 2);
        setFill(doc, ORANGE);
        doc.rect(M_LEFT + 6, ctx.y + 0.5, 1, noteH - 1, 'F');
        setText(doc, ORANGE_TEXT);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.text('Hinweis:', M_LEFT + 10, ctx.y + 3.6);
        setText(doc, ORANGE_TEXT);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.text(noteLines, M_LEFT + 22, ctx.y + 3.6);
        ctx.y += noteH + 1;
      }
    });

    ctx.y += 5;
  }

  // Disclaimer above footer
  const disclaimerText =
    'Dieses Dokument wurde auf Basis der vom Kunden bereitgestellten Unterlagen erstellt. ' +
    'Wertentwickler übernimmt keine Haftung für die Vollständigkeit oder Richtigkeit der ' +
    'eingereichten Dokumente. Die finale Kreditentscheidung liegt ausschließlich beim ' +
    'finanzierenden Institut.';
  const wrapped = doc.splitTextToSize(disclaimerText, CONTENT_W - 8);
  const dH = 6 + wrapped.length * 3.4;
  ensureSpace(dH + 4);
  // Anchor disclaimer just above footer if room
  let dY = Math.min(ctx.y, PAGE_H - 8 - dH - 4);
  if (dY < ctx.y) dY = ctx.y;
  setFill(doc, GRAY_BG);
  doc.roundedRect(M_LEFT, dY, CONTENT_W, dH, 2, 2, 'F');
  setText(doc, GRAY_MID);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.text(wrapped, M_LEFT + 4, dY + 5);
}

export async function exportLeadPdf({ lead, sections, items, leadItems, qualification, advisorName }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const generatedAt = new Date();
  const totalPages = 3;
  const logo = await loadLogo();

  // Page 1 — Cover
  drawCover(doc, lead, qualification, advisorName, logo);

  // Page 2 — Qualifikation
  doc.addPage();
  drawQualificationPage(doc, lead, qualification, totalPages, generatedAt, logo);

  // Page 3 — Unterlagen-Status
  doc.addPage();
  drawDocumentsPage(doc, lead, sections, items, leadItems, totalPages, generatedAt, logo);

  // Footers (pages 2+, never page 1)
  const pageCount = doc.getNumberOfPages();
  for (let p = 2; p <= pageCount; p++) {
    doc.setPage(p);
    drawFooterBar(doc, p, pageCount, generatedAt);
  }

  const fileName = `Kundendossier_${safeFile(lastName(lead.client_name))}_${ddmmyyyy(generatedAt)}.pdf`;
  doc.save(fileName);
}
