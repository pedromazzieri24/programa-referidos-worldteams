import type { InfoPrograma } from "@/lib/tipos";

export function Faq({ info }: { info: InfoPrograma }) {
  const preguntas = [
    {
      p: "Who can refer?",
      r: `Anyone who signs up. People from WorldTeams (our team and professionals working with our clients) earn a higher reward: we recognize you by your corporate email. The recruiting team can't take part, since they evaluate candidates.`,
    },
    {
      p: "When do I get paid?",
      r: `Once the person you referred is hired and completes ${info.dias_hasta_pago} days on the job. If they leave earlier, the reward is voided. You can follow every step from your dashboard.`,
    },
    {
      p: "Why does the candidate have to confirm?",
      r: `Because you're sharing someone else's personal data. We only use it once they say yes. If they don't reply within ${info.dias_consentimiento} days, the referral closes and we delete their CV.`,
    },
    {
      p: "What if the person was already in touch with WorldTeams?",
      r: `The referral doesn't count if they applied or were referred in the last ${info.ventana_meses} months. To protect their privacy, we won't share any details about it.`,
    },
    {
      p: "Is there a limit?",
      r: `Up to ${info.tope_mensual} referrals per month, rejected ones included. If two people refer the same candidate, the first one keeps the referral for ${info.ventana_meses} months.`,
    },
  ];

  return (
    <div className="divide-y divide-zinc-200 rounded-2xl border border-zinc-200">
      {preguntas.map(({ p, r }) => (
        <details key={p} className="group px-6 py-4 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer items-center justify-between gap-4 font-display text-lg font-semibold">
            {p}
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-wt-lima text-wt-negro transition group-open:rotate-45">
              +
            </span>
          </summary>
          <p className="mt-3 text-zinc-600">{r}</p>
        </details>
      ))}
    </div>
  );
}
