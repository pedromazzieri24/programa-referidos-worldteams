-- Datos de ejemplo (ficticios). Correr después de schema.sql.

-- Montos (supuesto aprobado el 20/10): gente de WorldTeams ×1,5 sobre el externo.
insert into montos_incentivo (seniority, grupo_referente, monto_usd) values
  ('junior',      'externo', 200), ('junior',      'wt', 300),
  ('semi_senior', 'externo', 400), ('semi_senior', 'wt', 600),
  ('senior',      'externo', 600), ('senior',      'wt', 900);

insert into busquedas (titulo, especialidad, seniority, descripcion, prioritaria) values
  ('Ingeniero/a MEP Senior', 'Ingeniería MEP', 'senior',
   'Diseño de instalaciones mecánicas, eléctricas y sanitarias para edificios comerciales en EE. UU. Revit MEP, normativa ASHRAE/NEC, inglés avanzado.', true),
  ('Especialista en Revit', 'Arquitectura / BIM', 'semi_senior',
   'Modelado arquitectónico en Revit para estudios de Texas y Florida. Familias, documentación y coordinación con ingenierías. Inglés intermedio-avanzado.', false),
  ('Dibujante CAD Junior', 'Documentación técnica', 'junior',
   'Documentación de planos en AutoCAD bajo supervisión. Deseable conocimiento básico de Revit. Inglés intermedio.', false),
  ('Ingeniero/a Estructural Senior', 'Ingeniería estructural', 'senior',
   'Cálculo de estructuras de hormigón y acero según códigos ACI/AISC. ETABS, SAP2000. Inglés avanzado.', true),
  ('Coordinador/a BIM', 'BIM', 'semi_senior',
   'Coordinación de modelos federados, detección de interferencias (Navisworks) y estándares BIM. Inglés avanzado.', false);

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
