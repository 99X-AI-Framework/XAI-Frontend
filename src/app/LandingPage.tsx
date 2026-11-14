import { Link } from 'react-router-dom'
import { ArrowRight, Cpu, Eye, ShieldCheck } from 'lucide-react'

export function LandingPage() {
  return (
    <div className="landing-page min-h-screen">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <Link to="/landing" className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-blue-600" />
          <span className="text-xl font-bold tracking-tight">sentinel.</span>
        </Link>
        <nav className="flex items-center gap-4">
          <a className="text-sm font-medium text-slate-600 hover:text-slate-900" href="#pillars">
            Pillars
          </a>
          <Link
            className="rounded-lg bg-[#1556a6] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#12498d]"
            to="/login"
          >
            Log in <ArrowRight className="ml-1 inline h-4 w-4" />
          </Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto flex max-w-5xl flex-col items-center px-6 py-24 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-blue-700">
            AI governance control center
          </p>
          <h1 className="mb-5 text-4xl font-bold tracking-tight md:text-6xl">
            Safe, transparent AI agent operations
          </h1>
          <p className="mb-8 max-w-2xl text-lg leading-8 text-slate-600">
            Explore governance workflows for risk assessment, human oversight, explainability,
            and policy auditing across your agent systems.
          </p>
          <Link
            className="rounded-lg bg-[#1556a6] px-6 py-3 font-medium text-white shadow-sm hover:bg-[#12498d]"
            to="/login"
          >
            Log in to continue <ArrowRight className="ml-2 inline h-4 w-4" />
          </Link>
          <div className="mt-16 flex flex-wrap justify-center gap-6 text-sm text-slate-500">
            <span className="flex items-center gap-2"><Cpu className="h-5 w-5" /> Agent action</span>
            <span>→</span>
            <span className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> Risk and guardrails</span>
            <span>→</span>
            <span className="flex items-center gap-2"><Eye className="h-5 w-5" /> Human oversight</span>
          </div>
        </section>

        <section id="pillars" className="border-t border-slate-200 bg-white px-6 py-16">
          <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
            {[
              ['Governance and security', 'Evaluate agent actions against policies and risk controls.'],
              ['Human oversight', 'Route sensitive decisions to reviewers with clear context.'],
              ['Explainable operations', 'Trace executions, evidence, and decisions in one workspace.'],
            ].map(([title, description]) => (
              <article className="rounded-xl border border-[#d3dfed] bg-white p-6 shadow-sm" key={title}>
                <h2 className="mb-2 text-xl font-bold">{title}</h2>
                <p className="text-slate-600">{description}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-slate-100 px-6 py-6 text-center text-sm text-slate-600">
        sentinel. · AI governance control center
      </footer>
    </div>
  )
}
