-- Datos de ejemplo (ficticios). Correr después de schema.sql.

-- Montos (supuesto aprobado el 20/10): gente de WorldTeams ×1,5 sobre el externo.
insert into montos_incentivo (seniority, grupo_referente, monto_usd) values
  ('junior',      'externo', 200), ('junior',      'wt', 300),
  ('semi_senior', 'externo', 400), ('semi_senior', 'wt', 600),
  ('senior',      'externo', 600), ('senior',      'wt', 900);

-- En inglés: la landing está en inglés, como el sitio de WorldTeams.
insert into busquedas (titulo, especialidad, seniority, descripcion, prioritaria) values
  ('Senior MEP Engineer', 'MEP Engineering', 'senior',
   'Design of mechanical, electrical and plumbing systems for US commercial buildings. Revit MEP, ASHRAE/NEC codes. Advanced English.', true),
  ('Revit Specialist', 'Architecture / BIM', 'semi_senior',
   'Architectural modeling in Revit for firms in Texas and Florida. Families, construction documents and coordination with engineering teams. Upper-intermediate English.', false),
  ('Junior CAD Drafter', 'Construction Documents', 'junior',
   'AutoCAD drafting under supervision. Basic Revit knowledge is a plus. Intermediate English.', false),
  ('Senior Structural Engineer', 'Structural Engineering', 'senior',
   'Concrete and steel structural design under ACI/AISC codes. ETABS, SAP2000. Advanced English.', true),
  ('BIM Coordinator', 'BIM', 'semi_senior',
   'Federated model coordination, clash detection (Navisworks) and BIM standards. Advanced English.', false);

-- Candidatos que se postularon solos hace poco: referirlos tiene que dar "duplicado".
insert into candidatos (nombre, email, email_norm, linkedin_url, linkedin_norm, pais, origen, postulacion_directa_at) values
  ('Carolina Díaz', 'carolina.diaz@example.com', 'carolina.diaz@example.com',
   'https://www.linkedin.com/in/carolina-diaz-arq', 'linkedin.com/in/carolina-diaz-arq', 'Argentina', 'directo', now() - interval '2 months'),
  ('Joaquín Pereyra', 'joaquin.pereyra@example.com', 'joaquin.pereyra@example.com',
   null, null, 'Uruguay', 'directo', now() - interval '1 month'),
  -- Se postuló hace más de 6 meses: ya se puede referir.
  ('Valentina Ruiz', 'valentina.ruiz@example.com', 'valentina.ruiz@example.com',
   null, null, 'Chile', 'directo', now() - interval '8 months');

-- Recruiting de ejemplo: un usuario registrado con este mail no puede referir.
insert into staff_recruiting (email) values ('recruiter.demo@worldteams.com');
