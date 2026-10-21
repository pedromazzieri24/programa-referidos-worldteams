// Textos de la interfaz (en inglés, como worldteams.com). La base devuelve códigos y acá se traducen:
// para sumar otro idioma alcanza con otra versión de este archivo.

export const ESTADOS: Record<string, { texto: string; color: string }> = {
  pendiente_consentimiento: { texto: "Waiting for candidate", color: "bg-amber-100 text-amber-900" },
  en_proceso: { texto: "In selection process", color: "bg-sky-100 text-sky-900" },
  contratado: { texto: "Hired", color: "bg-wt-lima text-wt-negro" },
  elegible_pago: { texto: "Reward approved", color: "bg-wt-lima text-wt-negro" },
  pagado: { texto: "Paid", color: "bg-wt-verde text-wt-lima" },
  no_confirmado: { texto: "Candidate did not confirm", color: "bg-zinc-100 text-zinc-600" },
  descartado: { texto: "Did not move forward", color: "bg-zinc-100 text-zinc-600" },
  anulado: { texto: "Reward voided", color: "bg-red-100 text-red-900" },
};

export const MOTIVOS: Record<string, string> = {
  "rechazó": "They chose not to take part",
  "venció": "They didn't reply in time",
};

export const SENIORITY: Record<string, string> = {
  junior: "Junior",
  semi_senior: "Mid-level",
  senior: "Senior",
};

export const TIPO_REFERENTE: Record<string, string> = {
  interno: "WorldTeams team",
  colocado: "WorldTeams professional at a client",
  externo: "External referrer",
};

// Respuestas de crear_referido(), por `motivo`.
export const RECHAZOS_REFERIDO: Record<string, string> = {
  tope: "You reached this month's referral limit. You can refer again next month.",
  recruiting: "The recruiting team can't take part in the referral program.",
  externos_deshabilitados: "For now the program is only open to WorldTeams people.",
  autorreferido: "You can't refer yourself.",
  busqueda_no_disponible: "That role is no longer open.",
  duplicado: "This person was already in touch with WorldTeams, so this referral doesn't count.",
};

// Respuestas de confirmar/rechazar_consentimiento(), por `codigo`.
export const RESPUESTAS_CONSENTIMIENTO: Record<string, string> = {
  confirmed: "Thank you! The WorldTeams team will review your profile and get in touch soon.",
  already_confirmed: "You already confirmed. Thank you!",
  declined: "Done. We won't use your data, and we've deleted your CV. Thanks for letting us know.",
  inactive: "This link is no longer active.",
  expired: "The deadline to confirm has passed.",
  invalid: "This link is not valid.",
};
