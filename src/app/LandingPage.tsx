import { Link } from 'react-router-dom';
import { ShieldCheck, Eye, Cpu, ArrowRight } from 'lucide-react';
import { useAuth } from '@/components/ui/authentication';

export default function LandingPage() {
  const { status } = useAuth();
  const isAuthenticated = status === 'authenticated';

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-6 h-6 text-indigo-600" />
          <span className="font-bold text-xl tracking-tight">AI Governance Middleware</span>
        </div>
        <nav className="flex items-center space-x-4">
          <Link className="text-sm font-medium text-slate-600 hover:text-slate-900" to="#pillars">Pillars</Link>
          <Link className="text-sm font-medium text-slate-600 hover:text-slate-900" to="#architecture">Architecture</Link>
          <Link className="text-sm font-medium text-slate-600 hover:text-slate-900" to="#docs">Docs</Link>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-slate-600 hover:text-slate-900">GitHub</a>
          {!isAuthenticated ? (
            <div className="ml-2 flex items-center space-x-4 border-l border-slate-200 pl-4">
              <Link className="text-sm font-medium text-slate-600 hover:text-slate-900" to="/login">Sign in</Link>
              <Link className="rounded-full border border-indigo-600 px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50" to="/signup">Create account</Link>
              <Link
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full text-sm font-medium"
                to="/login"
              >
                Launch Dashboard <ArrowRight className="inline w-4 h-4 ml-1" />
              </Link>
            </div>
          ) : (
            <Link
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full text-sm font-medium"
              to="/dashboard"
            >
              Launch Dashboard <ArrowRight className="inline w-4 h-4 ml-1" />
            </Link>
          )}
        </nav>
      </header>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center flex-grow px-6 py-12 text-center">
        <p className="text-xs uppercase font-semibold tracking-wider text-slate-400 mb-2">
          v1.0 Middleware Architecture • Open Standard
        </p>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">The unified middleware for safe, transparent AI agents</h1>
        <p className="text-lg text-slate-600 max-w-2xl mb-6">
          Intercept agent executions in real time. Enforce security guardrails, generate explainable rationale, and route high‑risk decisions to human operators.
        </p>
        <div className="flex gap-4">
          <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-full inline-flex items-center">
            Get Started <ArrowRight className="ml-2 w-4 h-4" />
          </button>
          <a href="#" className="border border-indigo-600 text-indigo-600 hover:bg-indigo-50 px-6 py-3 rounded-full inline-flex items-center">
            View Integration Guide <ArrowRight className="ml-2 w-4 h-4" />
          </a>
        </div>
        {/* Mini pipeline visual */}
        <div className="mt-12 flex items-center space-x-4 text-slate-500 text-sm">
          <div className="flex items-center space-x-1">
            <Cpu className="w-5 h-5" />
            <span>Agent Action</span>
          </div>
          <span>→</span>
          <div className="flex items-center space-x-1">
            <ShieldCheck className="w-5 h-5" />
            <span>Guardrails & Risk</span>
          </div>
          <span>→</span>
          <div className="flex items-center space-x-1">
            <Eye className="w-5 h-5" />
            <span>HITL / XAI Triage</span>
          </div>
          <span>→</span>
          <div className="flex items-center space-x-1">
            <ArrowRight className="w-5 h-5" />
            <span>Verified Execution</span>
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section id="pillars" className="bg-white py-12 border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-6 grid gap-8 md:grid-cols-3">
          {/* Governance & Security */}
          <div className="rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-xs uppercase font-semibold tracking-wider text-indigo-600 mb-2">01 • GOVERNANCE & SECURITY</p>
            <h2 className="text-xl font-bold mb-2">Automated Policy & Risk Assessment</h2>
            <p className="text-slate-600 mb-4">Continuous evaluation against organizational policies, prompt‑injection defense, and compliance audits.</p>
            <div className="bg-slate-50 p-3 rounded-md text-sm text-slate-500">
              Risk Level: Low (0.12) • PII Redaction: Active • EU AI Act: 99.8%
            </div>
          </div>
          {/* HITL + Explainability */}
          <div className="rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-xs uppercase font-semibold tracking-wider text-indigo-600 mb-2">02 • HITL + EXPLAINABILITY</p>
            <h2 className="text-xl font-bold mb-2">Human‑in‑the‑Loop & Decision Rationale</h2>
            <p className="text-slate-600 mb-4">Transparent feature attributions and escalation queues for low‑confidence decisions.</p>
            <div className="bg-slate-50 p-3 rounded-md text-sm text-slate-500">
              <span className="block">Market Risk: +0.42</span>
              <span className="block">Credit History: -0.18</span>
              <span className="block text-green-600 mt-2">Approve</span>
            </div>
          </div>
          {/* Integrations & Agent Runtime */}
          <div className="rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-xs uppercase font-semibold tracking-wider text-indigo-600 mb-2">03 • INTEGRATIONS & RUNTIME</p>
            <h2 className="text-xl font-bold mb-2">Pluggable Agent Middleware</h2>
            <p className="text-slate-600 mb-4">Zero‑friction SDK and REST/FastAPI integration for LangChain, CrewAI, and enterprise orchestration.</p>
            <div className="bg-slate-50 p-3 rounded-md text-sm text-slate-500 font-mono">
              Connected: 3 pipelines • Latency: &lt; 15ms
            </div>
          </div>
        </div>
      </section>

      {/* Call‑to‑Action */}
      <section className="bg-indigo-600 py-12 text-center text-white">
        <h2 className="text-2xl font-bold mb-4">Ready to secure your agentic workflows?</h2>
        <p className="mb-6 max-w-xl mx-auto">Enter your email to request early‑access API keys or schedule a demo.</p>
        <div className="flex justify-center space-x-2">
          <input type="email" placeholder="you@example.com" className="px-4 py-2 rounded-md text-slate-900 focus:outline-none" />
          <a href="#" className="bg-white hover:bg-gray-100 text-indigo-600 px-4 py-2 rounded-md font-medium">
            Get API Access
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-100 py-6 text-sm text-slate-600 text-center">
        © {new Date().getFullYear()} AI Governance Middleware • All rights reserved.
      </footer>
    </div>
  );
}

