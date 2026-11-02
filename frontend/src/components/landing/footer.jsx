import { Link } from 'react-router-dom'
import { Github, Linkedin, Mail, MapPin, Phone, Twitter, Youtube } from 'lucide-react'
import { Logo } from '@/components/shared/logo'
import { CONTACT_INFO } from '@/datasets/platform/content.js'

const COLUMNS = [
  {
    title: 'Platform',
    links: [
      { label: 'AI Tutor & Copilot', to: '/about' },
      { label: 'Learning Analytics', to: '/about' },
      { label: 'Question Bank & Exams', to: '/about' },
      { label: 'Coding Lab', to: '/about' },
      { label: 'Placement Engine', to: '/about' },
    ],
  },
  {
    title: 'Solutions',
    links: [
      { label: 'Schools (K-12)', to: '/about' },
      { label: 'Colleges & Universities', to: '/about' },
      { label: 'IITs, NITs & Autonomous', to: '/about' },
      { label: 'EdTech Companies', to: '/about' },
      { label: 'Enterprise Academies', to: '/about' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Blog', to: '/blog' },
      { label: 'Case Studies', to: '/case-studies' },
      { label: 'Help Centre', to: '/contact' },
      { label: 'Release Notes', to: '/media' },
      { label: 'Careers', to: '/careers' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About Us', to: '/about' },
      { label: 'Careers', to: '/careers' },
      { label: 'Media & Press', to: '/media' },
      { label: 'Contact', to: '/contact' },
      { label: 'Privacy & Terms', to: '/privacy' },
    ],
  },
]

function LandingFooter() {
  return (
    <footer className="relative border-t border-slate-200/70 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_2fr]">
          <div>
            <Logo size={40} />
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              MediXO EduX — Empowering Smarter Learning Through AI. An AI-powered education platform for schools, colleges, universities, healthcare institutions, and enterprise learning.
            </p>
            <div className="mt-6 space-y-2.5 text-sm text-slate-500 dark:text-slate-400">
              <p className="flex items-center gap-2.5"><Mail className="h-4 w-4 text-indigo-500" /> {CONTACT_INFO.email}</p>
              <p className="flex items-center gap-2.5"><Phone className="h-4 w-4 text-indigo-500" /> {CONTACT_INFO.phone}</p>
              <p className="flex items-center gap-2.5"><MapPin className="h-4 w-4 text-indigo-500" /> {CONTACT_INFO.address}</p>
            </div>
            <div className="mt-6 flex gap-2.5">
              {[Twitter, Linkedin, Github, Youtube].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  aria-label="Social link"
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-400 transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-800 dark:hover:border-indigo-500/40 dark:hover:text-indigo-300"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <p className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">{col.title}</p>
                <ul className="space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        to={link.to}
                        className="text-sm text-slate-500 transition-colors hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-slate-200/70 pt-7 sm:flex-row dark:border-slate-800">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            © 2026 MediXO EduX. All Rights Reserved. Powered by MediXO
          </p>
          <div className="flex items-center gap-5 text-xs text-slate-400 dark:text-slate-500">
            <Link to="/privacy" className="transition-colors hover:text-indigo-600 dark:hover:text-indigo-300">Privacy Policy</Link>
            <Link to="/terms" className="transition-colors hover:text-indigo-600 dark:hover:text-indigo-300">Terms of Service</Link>
            <Link to="/media" className="transition-colors hover:text-indigo-600 dark:hover:text-indigo-300">Media Kit</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

export { LandingFooter }
export default LandingFooter
