import { Link } from 'react-router-dom'
import { ArrowLeft, ShieldCheck, FileText, Database, Lock, Eye, Globe2 } from 'lucide-react'
import { Reveal } from '@/components/shared/section-heading'

function LegalShell({ title, updated, children }) {
  return (
    <div className="bg-white pb-24 pt-32 dark:bg-slate-950">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Reveal>
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
          <h1 className="mt-5 font-display text-4xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h1>
          <p className="mt-2 text-sm font-medium text-slate-400">Last updated: {updated}</p>
        </Reveal>
        <div className="prose-slate mt-10 space-y-8 rounded-3xl border border-slate-200/70 bg-white p-8 shadow-card sm:p-10 dark:border-slate-800 dark:bg-slate-900">
          {children}
        </div>
      </div>
    </div>
  )
}

function Section({ icon: Icon, title, children }) {
  return (
    <section>
      <h2 className="flex items-center gap-2.5 text-lg font-bold text-slate-900 dark:text-white">
        {Icon && <Icon className="h-5 w-5 text-indigo-500" />}
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{children}</div>
    </section>
  )
}

export function Privacy() {
  return (
    <LegalShell title="Privacy Policy" updated="July 15, 2026">
      <Section icon={ShieldCheck} title="Our commitment">
        <p>
          MediXO EduX ("MediXO EduX", "we", "us") builds education software for institutions. We treat
          student data as the institution's data — we are a processor, not an owner. This policy explains what we collect,
          why, and the controls you have.
        </p>
      </Section>
      <Section icon={Database} title="What we collect">
        <ul className="list-disc space-y-2 pl-5">
          <li><strong>Account data:</strong> name, email, role, institution, contact details you provide.</li>
          <li><strong>Learning data:</strong> courses, assignments, attendance, assessment results, and AI-tutor conversations.</li>
          <li><strong>Usage data:</strong> pages visited, features used, device and browser information, anonymised telemetry.</li>
          <li><strong>Institution data:</strong> curriculum, question banks, reports and settings provided by administrators.</li>
        </ul>
      </Section>
      <Section icon={Lock} title="How we protect it">
        <p>
          Data is encrypted in transit (TLS 1.3) and at rest (AES-256). Access is governed by role-based permissions, MFA,
          and a tamper-proof audit trail. We are compliant with the Digital Personal Data Protection (DPDP) Act 2023,
          GDPR (for international partners) and maintain ISO 27001-aligned controls.
        </p>
      </Section>
      <Section icon={Eye} title="AI and your data">
        <p>
          AI features run on models that never train on your institution's data. Prompts and responses are retained only as
          long as needed for the features you use, and can be purged on request. Conversation history is visible only to the
          learner and authorised faculty.
        </p>
      </Section>
      <Section icon={Globe2} title="Data residency & transfers">
        <p>
          Primary hosting is in Mumbai, India, with regional replicas for partners in the EU, Middle East and Southeast
          Asia. We never sell personal data. We never use personal data for third-party advertising.
        </p>
      </Section>
      <Section icon={FileText} title="Your rights">
        <p>
          Learners and parents may request access, correction, portability or deletion of personal data through their
          institution, or by writing to <a className="font-semibold text-indigo-600" href="mailto:privacy@medixoedux.edu">privacy@medixoedux.edu</a>.
          We respond within 30 days.
        </p>
      </Section>
    </LegalShell>
  )
}

export function Terms() {
  return (
    <LegalShell title="Terms of Service" updated="July 15, 2026">
      <Section icon={FileText} title="1. Agreement">
        <p>
          These terms govern use of the MediXO EduX platform by institutions ("Institution"), their users (students, faculty,
          parents, administrators) and visitors. By creating an account or using the service, you accept these terms.
        </p>
      </Section>
      <Section icon={ShieldCheck} title="2. Service commitments">
        <p>
          MediXO EduX provides a 99.9% uptime SLA on paid plans, with monitoring, redundancy and incident communication.
          Scheduled maintenance is communicated at least 48 hours in advance. We maintain SOC 2-aligned processes and
          annual third-party penetration testing.
        </p>
      </Section>
      <Section icon={Database} title="3. Institution responsibilities">
        <ul className="list-disc space-y-2 pl-5">
          <li>Obtaining any consents required to process student data in the platform.</li>
          <li>Ensuring content uploaded (question banks, materials) complies with law and doesn't infringe rights.</li>
          <li>Managing role assignments and promptly notifying MediXO EduX of compromised accounts.</li>
        </ul>
      </Section>
      <Section icon={Lock} title="4. Acceptable use">
        <p>
          Users may not: attempt to breach security, scrape at scale, reverse-engineer the service, use AI features to
          generate harmful content, or interfere with other institutions' tenants. Violations may result in suspension
          or termination, and are recorded in the audit trail.
        </p>
      </Section>
      <Section icon={Eye} title="5. IP & feedback">
        <p>
          MediXO EduX owns the platform, and institutions retain ownership of their content. Feedback you share may be used to
          improve the service; we never claim ownership of your content. AI-generated outputs are licensed to the
          institution for educational use within the platform.
        </p>
      </Section>
      <Section icon={FileText} title="6. Termination & refunds">
        <p>
          Either party may terminate with 30 days' written notice. On termination, institutions may export all data in
          open formats (CSV/PDF) for 90 days. Unused prepaid months are refunded pro-rata.
        </p>
      </Section>
      <Section icon={Globe2} title="7. Liability & law">
        <p>
          To the maximum extent permitted by law, MediXO EduX's aggregate liability is limited to fees paid in the 12 months
          preceding a claim. These terms are governed by the laws of India; disputes are subject to the exclusive
          jurisdiction of courts in Bengaluru, Karnataka.
        </p>
      </Section>
    </LegalShell>
  )
}

export default Privacy
