import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Logo } from '@/components/ui/Logo';

const SCOPE_ITEMS: { label: string; muted?: boolean }[] = [
  { label: 'Risikovurdering' },
  { label: 'Samsvarserklæring' },
  { label: 'Teknisk fil' },
  { label: 'FMEA' },
  { label: 'Bruksanvisning' },
  { label: 'Sikkerhetsfunksjoner' },
  { label: 'Fareregister' },
  { label: 'Vedlikeholdsmanual' },
  { label: '+ det maskinen ellers utløser', muted: true },
];

function IconBox({ children }: { children: ReactNode }) {
  return (
    <div className="lp-platform-icon" aria-hidden>
      {children}
    </div>
  );
}

const PLATFORM: { title: string; desc: string; icon: ReactNode }[] = [
  {
    title: 'Revisjonshistorikk',
    desc: 'Hver endring spores. Signerte dokumenter fryses som uforanderlige versjoner.',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M12 8v4l3 2" />
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12a9 9 0 0 1 9-9" />
      </svg>
    ),
  },
  {
    title: 'Kundeportal',
    desc: 'Kunden får innsyn i valgte dokumenter og signerer digitalt.',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    title: 'Bedriftsarkiv',
    desc: 'Prosedyrer og sertifikater gjenbrukes på tvers av prosjekter.',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M4 8h16v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8z" />
        <path d="M3 5h18v3H3z" />
        <path d="M10 12h4" />
      </svg>
    ),
  },
  {
    title: 'Vedlegg',
    desc: 'Tegninger, bilder og underlag knyttes til prosjekt og dokument.',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M21.4 11.6l-8.5 8.5a5 5 0 0 1-7.1-7.1l8.5-8.5a3.5 3.5 0 0 1 5 5L10.2 18.6a2 2 0 1 1-2.8-2.8l7.8-7.8" />
      </svg>
    ),
  },
];

export function LandingPage() {
  return (
    <div id="landing-page">
      <nav>
        <Link href="/">
          <Logo showTag />
        </Link>
        <div className="nav-links">
          <a href="#produkt" className="nav-link">
            Produkt
          </a>
          <Link href="/priser" className="nav-link">
            Priser
          </Link>
        </div>
        <div className="lp-nav-actions">
          <Link href="/login" className="btn-ghost lp-nav-btn">
            Logg inn
          </Link>
          <Link href="/login?redirect=/app/new" className="btn-ghost lp-nav-btn">
            Åpne app
          </Link>
        </div>
      </nav>

      <header className="lp-hero">
        <h1 className="lp-hero-title">Teknisk dokumentasjon for maskiner og industriutstyr</h1>
        <p className="lp-hero-lead">
          Samsiq genererer dokumentasjonsgrunnlaget fra prosjektdata. Dokumentene redigeres, revideres
          og signeres i plattformen, med full historikk.
        </p>
        <div className="lp-hero-actions">
          <Link href="/login?redirect=/app/new" className="btn-hero">
            Prøv gratis
          </Link>
          <a href="#produkt" className="btn-ghost">
            Se produktet
          </a>
        </div>
      </header>

      <section className="lp-product" id="produkt" aria-label="Produktbilde">
        <div className="lp-product-frame">
          <Image
            src="/images/produkt-skjermbilde.png"
            alt="Skjermbilde av Samsiq-plattformen med prosjekt- og dokumentoversikt"
            width={1200}
            height={675}
            className="lp-product-img"
            priority
          />
        </div>
      </section>

      <section className="lp-section" id="omfang">
        <div className="eyebrow">Omfang</div>
        <h2 className="lp-section-title">Dokumentomfanget bestemmes av maskinen</h2>
        <p className="lp-section-body">
          Samsiq vurderer hvilke dokumenter prosjektet krever ut fra maskintype, drivsystem og
          bruksområde. En enkel transportør og en trykksatt offshore-enhet får ikke samme omfang.
        </p>
        <div className="lp-scope-grid">
          {SCOPE_ITEMS.map((item) => (
            <div
              key={item.label}
              className={'lp-scope-card' + (item.muted ? ' lp-scope-card--muted' : '')}
            >
              {item.label}
            </div>
          ))}
        </div>
      </section>

      <section className="lp-mangler" id="mangler" aria-labelledby="mangler-title">
        <div className="lp-mangler-inner">
          <div className="lp-mangler-copy">
            <h2 id="mangler-title" className="lp-section-title">
              Manglende grunnlag merkes, ikke gjettes
            </h2>
            <p className="lp-section-body">
              Der prosjektdata ikke gir grunnlag for et tall eller en vurdering, markeres feltet
              eksplisitt med hva som mangler. Faglige vurderinger verifiseres av kvalifisert
              personell før bruk.
            </p>
          </div>
          <div className="lp-mangler-code" role="note">
            [MANGLER: oppgi MTTFd eller historisk feilrate for hydraulikkpumpe]
          </div>
        </div>
      </section>

      <section className="lp-section" id="plattform">
        <div className="eyebrow">Plattform</div>
        <div className="lp-platform-grid">
          {PLATFORM.map((item) => (
            <div key={item.title} className="lp-platform-card">
              <IconBox>{item.icon}</IconBox>
              <h3 className="lp-platform-title">{item.title}</h3>
              <p className="lp-platform-desc">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-section lp-section--tight" id="regelverk">
        <div className="lp-regulation-card">
          <div className="lp-regulation-icon" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M16 3v4M8 3v4M3 11h18" />
            </svg>
          </div>
          <div>
            <h2 className="lp-regulation-title">
              Maskinforordningen (EU) 2023/1230 fra januar 2027
            </h2>
            <p className="lp-regulation-body">
              Forordningen erstatter Maskindirektivet 2006/42/EF og stiller nye krav til teknisk
              dokumentasjon.
            </p>
          </div>
        </div>
      </section>

      <section className="lp-closing" id="cta">
        <div className="lp-closing-copy">
          <h2 className="lp-closing-title">Prøv på ditt neste prosjekt</h2>
          <p className="lp-closing-sub">Ingen kredittkort. Norsk og engelsk.</p>
        </div>
        <Link href="/login?redirect=/app/new" className="btn-hero">
          Prøv gratis
        </Link>
      </section>

      <footer>
        <div className="footer-left">© 2026 Samsiq · Hultech ENK · Kristiansand, Norge</div>
        <div className="footer-links">
          <span className="footer-link">Personvern</span>
          <span className="footer-link">Vilkår</span>
          <span className="footer-link">Kontakt</span>
        </div>
      </footer>
    </div>
  );
}
