export const MANGLER_REGEL = `
VIKTIG REGEL — [MANGLER]-prinsippet:
- Dersom et felt er "—", tomt, eller ikke oppgitt: skriv [MANGLER: kort beskrivelse av hva som mangler] akkurat der informasjonen ville stått.
- ALDRI spekker, gjett eller finn opp tekniske verdier utover det som er eksplisitt oppgitt i maskindata.
- Dokumentet skal være klart til bruk — [MANGLER]-markørene viser nøyaktig hva ingeniøren må fylle inn.
- Skriv på norsk (bokmål) med faglig presisjon med mindre dokumentet krever engelsk seksjon.`;

export const NEUTRALITET = `
NØYTRALITET:
- Baser HELE dokumentet utelukkende på maskindata fra brukeren.
- Ikke anta maskintype, bransje eller bruksområde utover oppgitt informasjon.`;

export function wrapPrompt(
  role: string,
  title: string,
  structure: string,
  contextPlaceholder = '{context}'
): string {
  return `${role}

${MANGLER_REGEL}
${NEUTRALITET}

${contextPlaceholder}

Generer dokumentet: **${title}**

${structure}

Kun markdown. Ingen JSON. Ingen kodebokser. Bruk ## for hovedoverskrifter og tabeller der det er naturlig.`;
}

export function withContext(template: string, context: string): string {
  return template.replace('{context}', context);
}
