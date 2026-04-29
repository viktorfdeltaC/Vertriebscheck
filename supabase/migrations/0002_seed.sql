-- Seed sections + items. Idempotent.

insert into public.checklist_sections (id, label, sort_order)
values
  (1, 'Standard-Unterlagen', 1),
  (2, 'Bei vorhandenen Immobilien', 2)
on conflict (id) do update set label = excluded.label, sort_order = excluded.sort_order;

select setval(pg_get_serial_sequence('public.checklist_sections','id'),
  greatest((select max(id) from public.checklist_sections), 1));

-- Section 1
insert into public.checklist_items (id, section_id, label, description, sort_order, only_if_existing_property) values
  (101, 1, 'Personalausweis', 'Vorder- und Rückseite', 1, false),
  (102, 1, 'Einkommensnachweise', 'Letzte 3 Monate + Dezember des Vorjahres (Angestellte) bzw. aktuelle BWA (Unternehmer)', 2, false),
  (103, 1, 'Einkommensteuererklärung + EKST-Bescheid', 'Vollständig', 3, false),
  (104, 1, 'Nachweise Kapitalvermögen', 'Depot, Konten, Bausparvertrag als PDF-Auszüge', 4, false),
  (105, 1, 'Lebens-/Rentenversicherungen', 'Kopie der Police + aktuelle Rückkaufswerte', 5, false),
  (106, 1, 'Sonstige regelmäßige Einnahmen', 'Rentenzahlungen, Zweiteinkommen, Mieteinnahmen, Unterhalt', 6, false),
  (107, 1, 'Rentenbescheid Gesetzliche Rentenversicherung', null, 7, false),
  (108, 1, 'Bestehende Darlehen oder Leasingverträge', 'Vertrag + aktuelle Restschuld', 8, false),
  (109, 1, 'Kalt-/Warmmiete aktuell', null, 9, false)
on conflict (id) do update set
  section_id = excluded.section_id,
  label = excluded.label,
  description = excluded.description,
  sort_order = excluded.sort_order,
  only_if_existing_property = excluded.only_if_existing_property;

-- Section 2
insert into public.checklist_items (id, section_id, label, description, sort_order, only_if_existing_property) values
  (201, 2, 'Grundbuchauszug', null, 1, true),
  (202, 2, 'Kaufvertrag', null, 2, true),
  (203, 2, 'Darlehensvertrag + aktuelle Restschuld', null, 3, true),
  (204, 2, 'Mietvertrag oder aktuelle unterschriebene Mietaufstellung', null, 4, true),
  (205, 2, 'Immobilienaufstellung (bei mehreren Objekten)', null, 5, true)
on conflict (id) do update set
  section_id = excluded.section_id,
  label = excluded.label,
  description = excluded.description,
  sort_order = excluded.sort_order,
  only_if_existing_property = excluded.only_if_existing_property;

select setval(pg_get_serial_sequence('public.checklist_items','id'),
  greatest((select max(id) from public.checklist_items), 1));
