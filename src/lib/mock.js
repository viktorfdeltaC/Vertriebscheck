// Dev-Mock: aktiv wenn keine Supabase-Credentials gesetzt sind.
// Liefert In-Memory-Daten, damit die UI ohne Backend benutzbar ist.

const SECTIONS = [
  { id: 1, label: 'Standard-Unterlagen', sort_order: 1 },
  { id: 2, label: 'Bei vorhandenen Immobilien', sort_order: 2 },
];

const ITEMS = [
  { id: 101, section_id: 1, label: 'Personalausweis', description: 'Vorder- und Rückseite', sort_order: 1, only_if_existing_property: false },
  { id: 102, section_id: 1, label: 'Einkommensnachweise', description: 'Letzte 3 Monate + Dezember des Vorjahres (Angestellte) bzw. aktuelle BWA (Unternehmer)', sort_order: 2, only_if_existing_property: false },
  { id: 103, section_id: 1, label: 'Einkommensteuererklärung + EKST-Bescheid', description: 'Vollständig', sort_order: 3, only_if_existing_property: false },
  { id: 104, section_id: 1, label: 'Nachweise Kapitalvermögen', description: 'Depot, Konten, Bausparvertrag als PDF-Auszüge', sort_order: 4, only_if_existing_property: false },
  { id: 105, section_id: 1, label: 'Lebens-/Rentenversicherungen', description: 'Kopie der Police + aktuelle Rückkaufswerte', sort_order: 5, only_if_existing_property: false },
  { id: 106, section_id: 1, label: 'Sonstige regelmäßige Einnahmen', description: 'Rentenzahlungen, Zweiteinkommen, Mieteinnahmen, Unterhalt', sort_order: 6, only_if_existing_property: false },
  { id: 107, section_id: 1, label: 'Rentenbescheid Gesetzliche Rentenversicherung', description: null, sort_order: 7, only_if_existing_property: false },
  { id: 108, section_id: 1, label: 'Bestehende Darlehen oder Leasingverträge', description: 'Vertrag + aktuelle Restschuld', sort_order: 8, only_if_existing_property: false },
  { id: 109, section_id: 1, label: 'Kalt-/Warmmiete aktuell', description: null, sort_order: 9, only_if_existing_property: false },
  { id: 201, section_id: 2, label: 'Grundbuchauszug', description: null, sort_order: 1, only_if_existing_property: true },
  { id: 202, section_id: 2, label: 'Kaufvertrag', description: null, sort_order: 2, only_if_existing_property: true },
  { id: 203, section_id: 2, label: 'Darlehensvertrag + aktuelle Restschuld', description: null, sort_order: 3, only_if_existing_property: true },
  { id: 204, section_id: 2, label: 'Mietvertrag oder aktuelle unterschriebene Mietaufstellung', description: null, sort_order: 4, only_if_existing_property: true },
  { id: 205, section_id: 2, label: 'Immobilienaufstellung (bei mehreren Objekten)', description: null, sort_order: 5, only_if_existing_property: true },
];

function uuid() {
  return crypto.randomUUID();
}

function mkLeadItems(leadId, presetChecked = []) {
  return ITEMS.map((it) => ({
    id: uuid(),
    lead_id: leadId,
    item_id: it.id,
    checked: presetChecked.includes(it.id),
    note: null,
    file_path: null,
    updated_at: new Date().toISOString(),
  }));
}

const REPS = {
  'rep-1': { id: 'rep-1', full_name: 'Holger Weller', is_admin: true, email: 'holger.weller@wertentwickler.de' },
  'rep-2': { id: 'rep-2', full_name: 'Lisa Berater', is_admin: false, email: 'lisa@wertentwickler.de' },
};

const STORAGE_KEY = 'unterlagen-check-mock-v2';

// Feste UUIDs für die Demo-Leads, damit der Share-Link in jedem Browser identisch ist.
const DEMO_LEAD_1 = '11111111-1111-4111-8111-111111111111';
const DEMO_LEAD_2 = '22222222-2222-4222-8222-222222222222';
const DEMO_LEAD_3 = '33333333-3333-4333-8333-333333333333';
const DEMO_SHARE_1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const DEMO_SHARE_2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const DEMO_SHARE_3 = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

function seedInitial() {
  return {
    leads: [
      {
        id: DEMO_LEAD_1,
        created_by: 'rep-1',
        client_name: 'Familie Schneider',
        client_email: 'schneider@example.com',
        client_phone: '+49 170 1234567',
        share_uuid: DEMO_SHARE_1,
        status: 'offen',
        submitted_at: null,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
      },
      {
        id: DEMO_LEAD_2,
        created_by: 'rep-1',
        client_name: 'Herr Dr. Weber',
        client_email: 'weber@example.com',
        client_phone: null,
        share_uuid: DEMO_SHARE_2,
        status: 'vollständig',
        submitted_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
      },
      {
        id: DEMO_LEAD_3,
        created_by: 'rep-2',
        client_name: 'Frau Klein',
        client_email: null,
        client_phone: '+49 151 9876543',
        share_uuid: DEMO_SHARE_3,
        status: 'offen',
        submitted_at: null,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
      },
    ],
    leadItems: [
      ...mkLeadItems(DEMO_LEAD_1, [101, 102, 103]),
      ...mkLeadItems(DEMO_LEAD_2, ITEMS.map((i) => i.id)),
      ...mkLeadItems(DEMO_LEAD_3, [101]),
    ],
  };
}

function loadStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const fresh = seedInitial();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  return fresh;
}

function saveStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export const mock = {
  CURRENT_USER_ID: 'rep-1', // wechsle für Admin-Test auf 'rep-1' (admin) oder 'rep-2' (rep)

  resetData() {
    localStorage.removeItem(STORAGE_KEY);
  },

  getProfile(id = mock.CURRENT_USER_ID) {
    return REPS[id];
  },

  listLeads({ asAdmin }) {
    const store = loadStore();
    const visible = asAdmin
      ? store.leads
      : store.leads.filter((l) => l.created_by === mock.CURRENT_USER_ID);
    return visible
      .slice()
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map((l) => {
        const items = store.leadItems.filter((li) => li.lead_id === l.id);
        return {
          ...l,
          profiles: { full_name: REPS[l.created_by]?.full_name ?? '—' },
          lead_items: items.map((i) => ({ checked: i.checked })),
          qualification: store.qualifications?.[l.id] ?? null,
        };
      });
  },

  getLead(id) {
    const store = loadStore();
    const lead = store.leads.find((l) => l.id === id);
    if (!lead) return null;
    return {
      ...lead,
      profiles: { full_name: REPS[lead.created_by]?.full_name ?? '—' },
    };
  },

  getLeadItems(leadId) {
    const store = loadStore();
    return store.leadItems.filter((li) => li.lead_id === leadId);
  },

  getSections() {
    return SECTIONS;
  },

  getItems() {
    return ITEMS;
  },

  createLead({ name, email, phone }) {
    const store = loadStore();
    const newLead = {
      id: uuid(),
      created_by: mock.CURRENT_USER_ID,
      client_name: name,
      client_email: email || null,
      client_phone: phone || null,
      share_uuid: uuid(),
      status: 'offen',
      submitted_at: null,
      created_at: new Date().toISOString(),
    };
    store.leads.push(newLead);
    store.leadItems.push(...mkLeadItems(newLead.id));
    saveStore(store);
    return newLead;
  },

  getQualification(leadId) {
    const store = loadStore();
    return store.qualifications?.[leadId] ?? null;
  },

  saveQualification(leadId, data) {
    const store = loadStore();
    if (!store.qualifications) store.qualifications = {};
    store.qualifications[leadId] = { ...data, updated_at: new Date().toISOString() };
    saveStore(store);
  },

  setLeadItemChecked(leadId, itemId, checked) {
    const store = loadStore();
    const li = store.leadItems.find((x) => x.lead_id === leadId && x.item_id === itemId);
    if (!li) return;
    li.checked = checked;
    li.updated_at = new Date().toISOString();
    saveStore(store);
  },

  markComplete(id) {
    const store = loadStore();
    const lead = store.leads.find((l) => l.id === id);
    if (lead) {
      lead.status = 'vollständig';
      lead.submitted_at = new Date().toISOString();
      saveStore(store);
    }
  },

  // ----- Public share endpoints -----
  getByShare(share) {
    const store = loadStore();
    const lead = store.leads.find((l) => l.share_uuid === share);
    if (!lead) return null;
    const sections = SECTIONS.map((s) => ({
      ...s,
      items: ITEMS.filter((i) => i.section_id === s.id).map((it) => {
        const li = store.leadItems.find((x) => x.lead_id === lead.id && x.item_id === it.id);
        return { ...it, lead_item: li ? { ...li } : null };
      }),
    }));
    const { created_by, ...publicLead } = lead;
    return { lead: publicLead, sections };
  },

  updateLeadItemPublic(share, itemId, { checked, note, filePath }) {
    const store = loadStore();
    const lead = store.leads.find((l) => l.share_uuid === share);
    if (!lead) throw new Error('lead not found');
    if (lead.status === 'vollständig') throw new Error('already submitted');
    const li = store.leadItems.find((x) => x.lead_id === lead.id && x.item_id === itemId);
    if (!li) return;
    if (checked !== undefined && checked !== null) li.checked = checked;
    if (note !== undefined && note !== null) li.note = note || null;
    if (filePath !== undefined && filePath !== null) li.file_path = filePath || null;
    li.updated_at = new Date().toISOString();
    saveStore(store);
  },

  attachFile(share, itemId, file) {
    const store = loadStore();
    const lead = store.leads.find((l) => l.share_uuid === share);
    if (!lead) throw new Error('lead not found');
    const li = store.leadItems.find((x) => x.lead_id === lead.id && x.item_id === itemId);
    if (!li) return;
    li.file_path = `${lead.id}/${itemId}/${Date.now()}_${file.name}`;
    li.checked = true;
    li.updated_at = new Date().toISOString();
    saveStore(store);
    return li.file_path;
  },

  removeFile(share, itemId) {
    const store = loadStore();
    const lead = store.leads.find((l) => l.share_uuid === share);
    if (!lead) throw new Error('lead not found');
    const li = store.leadItems.find((x) => x.lead_id === lead.id && x.item_id === itemId);
    if (!li) return;
    li.file_path = null;
    li.updated_at = new Date().toISOString();
    saveStore(store);
  },

  resetSubmission(share) {
    const store = loadStore();
    const lead = store.leads.find((l) => l.share_uuid === share);
    if (lead) {
      lead.status = 'offen';
      lead.submitted_at = null;
      saveStore(store);
    }
  },

  submitByShare(share) {
    const store = loadStore();
    const lead = store.leads.find((l) => l.share_uuid === share);
    if (!lead) throw new Error('lead not found');
    if (lead.status !== 'vollständig') {
      lead.status = 'vollständig';
      lead.submitted_at = new Date().toISOString();
      saveStore(store);
    }
    return lead;
  },
};
