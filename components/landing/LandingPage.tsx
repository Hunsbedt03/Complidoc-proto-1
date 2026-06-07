'use client';

import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';

function CheckIcon() {
  return (
    <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
      <path
        d="M1 3l2 2 4-4"
        stroke="#1A6FD4"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LandingPage() {
  return (
    <div id="landing-page">
      <nav>
        <Link href="/" className="logo">
          <Logo showTag />
        </Link>
        <div className="nav-links">
          <span
            className="nav-link"
            onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Produkt
          </span>
          <span
            className="nav-link"
            onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Priser
          </span>
          <span className="nav-link">Om oss</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/login" className="nav-cta btn-ghost" style={{ padding: '8px 18px' }}>
            Logg inn
          </Link>
          <Link href="/login?redirect=/app/new" className="nav-cta">
            Åpne app
          </Link>
        </div>
      </nav>

      <div className="hero">
        <div className="hero-badge">
          <div className="badge-dot" />
          AI-drevet teknisk dokumentasjon
        </div>
        <h1>
          Fra maskindata til<br />
          <span>ferdig dokumentpakke</span>
          <br />
          på under fem minutter
        </h1>
        <p className="hero-sub">
          Samsiq genererer risikovurderinger, samsvarserklæringer, tekniske filer og QC-sjekklister
          automatisk — for alle maskintyper, skreddersydd til ditt prosjekt.
        </p>
        <div className="hero-actions">
          <Link href="/login?redirect=/app/new" className="btn-hero">
            Prøv gratis nå
          </Link>
          <button
            className="btn-ghost"
            type="button"
            onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Se hvordan det fungerer
          </button>
        </div>
        <div className="proof">
          <div className="proof-item">Ingen kredittkort kreves</div>
          <div className="proof-item">Alle maskintyper</div>
          <div className="proof-item">Norsk og engelsk</div>
        </div>
      </div>

      <div className="divider" />

      <div className="section" id="how">
        <div className="eyebrow">Slik fungerer det</div>
        <h2>
          Fire steg fra data til
          <br />
          godkjent dokumentpakke
        </h2>
        <p className="section-sub">
          Samsiq guider deg gjennom hele prosessen. Fungerer for alle maskintyper — fra pumper og
          transportbånd til spesialmaskiner.
        </p>
        <div className="flow-grid">
          {[
            ['01', 'Beskriv maskinen', 'Skriv fritt om maskintype, drivsystem og bruksområde.'],
            ['02', 'Fyll inn prosjektdata', 'Kunde, serienummer, produsent og ansvarlig ingeniør.'],
            ['03', 'AI genererer', 'Risikovurdering, teknisk fil, samsvarserklæring og QC-sjekkliste.'],
            ['04', 'Last ned og fullfør', 'Ferdig formatert i Word. Fyll inn [MANGLER]-feltene og signer.'],
          ].map(([num, title, desc]) => (
            <div key={num} className="flow-step">
              <div className="flow-num">{num}</div>
              <div className="flow-title">{title}</div>
              <div className="flow-desc">{desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="divider" />

      <div className="section">
        <div className="eyebrow">Funksjoner</div>
        <h2>
          Alt du trenger for
          <br />
          CE-merking og compliance
        </h2>
        <div className="features-grid">
          {[
            ['Automatisk risikovurdering', 'Komplett risikovurdering etter EN ISO 12100 med RPN-matrise.'],
            ['EF-samsvarserklæring', 'Riktige direktiver identifiseres basert på maskinens drivsystem.'],
            ['QC-sjekklister', 'Tilpassede kontrollpunkter basert på oppgitt maskintype.'],
            ['[MANGLER]-prinsippet', 'AI gjetter aldri. Manglende info merkes eksplisitt.'],
            ['Teknisk fil', 'Komplett teknisk dokumentasjon etter Maskindirektivet 2006/42/EC.'],
            ['Norsk og engelsk', 'Samsvarserklæring genereres simultant på begge språk.'],
          ].map(([title, desc]) => (
            <div key={title} className="feature">
              <div className="feature-icon" style={{ background: 'rgba(26,111,212,0.15)' }} />
              <div className="feature-title">{title}</div>
              <div className="feature-desc">{desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="divider" />

      <div className="section" id="pricing">
        <div className="eyebrow">Priser</div>
        <h2>Enkel, forutsigbar prising</h2>
        <p className="section-sub">Velg planen som passer din bedrift. Ingen skjulte kostnader.</p>
        <div className="pricing-grid">
          <div className="price-card">
            <div className="price-name">Starter</div>
            <div className="price-desc">For små bedrifter</div>
            <div>
              <span className="price-amount">990</span>
              <span className="price-period"> kr/mnd</span>
            </div>
            <div className="price-divider" />
            <div className="price-feature">
              <div className="pf-check">
                <CheckIcon />
              </div>
              5 dokumentpakker/mnd
            </div>
            <Link href="/priser" className="price-btn btn-outline">
              Kom i gang
            </Link>
          </div>
          <div className="price-card featured">
            <div className="price-badge">Mest populær</div>
            <div className="price-name">Pro</div>
            <div className="price-desc">For voksende bedrifter</div>
            <div>
              <span className="price-amount">2 490</span>
              <span className="price-period"> kr/mnd</span>
            </div>
            <div className="price-divider" />
            <Link href="/priser" className="price-btn btn-filled">
              Start gratis prøveperiode
            </Link>
          </div>
          <div className="price-card">
            <div className="price-name">Enterprise</div>
            <div className="price-desc">For store organisasjoner</div>
            <div>
              <span className="price-amount" style={{ fontSize: 22 }}>
                Kontakt oss
              </span>
            </div>
            <div className="price-divider" />
            <button type="button" className="price-btn btn-outline">
              Ta kontakt
            </button>
          </div>
        </div>
      </div>

      <div className="cta-section">
        <div className="cta-title">Klar til å spare tid på dokumentasjon?</div>
        <div className="cta-sub">Prøv Samsiq gratis. Ingen binding, ingen kredittkort.</div>
        <Link href="/login?redirect=/app/new" className="btn-hero">
          Start nå
        </Link>
      </div>

      <footer>
        <div className="footer-left">© 2025 Samsiq · Hultech ENK · Kristiansand, Norge</div>
        <div className="footer-links">
          <span className="footer-link">Personvern</span>
          <span className="footer-link">Vilkår</span>
          <span className="footer-link">Kontakt</span>
        </div>
      </footer>
    </div>
  );
}
