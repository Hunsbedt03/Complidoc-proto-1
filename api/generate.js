function parseBody(req) {
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  if (!body || typeof body !== 'object') body = {};
  return body;
}

async function generateSingleDoc(apiKey, docType, machineData) {
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';
  const prompts = {
    risk: `Du er en teknisk compliance-ekspert spesialisert på risikovurdering.
Skriv en komplett profesjonell risikovurdering på norsk for følgende maskin.
Kritisk regel: Aldri spekuler. Marker manglende info med [MANGLER: beskrivelse].

${machineData}

Inkluder disse seksjonene med ## overskrifter:
## 1. Omfang og formål
## 2. Maskinbeskrivelse
## 3. Fareidentifikasjon og risikovurdering
(Beskriv minst 8 konkrete farer med beskrivelse, alvorlighetsgrad S(1-4), sannsynlighet P(1-4), RPN=S×P, og tiltak)
## 4. Restrisiko og konklusjon
## 5. Revisjonslogg

Svar med kun dokumentteksten i markdown. Ingen JSON, ingen kodebokser.`,

    tech: `Du er en teknisk compliance-ekspert spesialisert på teknisk dokumentasjon.
Skriv en komplett teknisk fil på norsk for følgende maskin.
Kritisk regel: Aldri spekuler. Marker manglende info med [MANGLER: beskrivelse].

${machineData}

Inkluder disse seksjonene med ## overskrifter:
## 1. Produktidentifikasjon
## 2. Teknisk beskrivelse og funksjon
## 3. Anvendte direktiver og standarder
## 4. Harmoniserte standarder
## 5. Tegningsliste og dokumentoversikt
## 6. Installasjon og driftsforhold
## 7. Vedlikeholdskrav

Svar med kun dokumentteksten i markdown. Ingen JSON, ingen kodebokser.`,

    doc: `Du er en teknisk compliance-ekspert spesialisert på samsvarserklæringer.
Skriv en komplett EF-samsvarserklæring på norsk og engelsk for følgende maskin.
Kritisk regel: Aldri spekuler. Marker manglende info med [MANGLER: beskrivelse].

${machineData}

Inkluder:
## Norsk versjon / Norwegian version
(Fullstendig samsvarserklæringstekst med produsent, maskin, direktiver, standarder)
## English version
(Complete declaration of conformity text with manufacturer, machine, directives, standards)

Inkluder: Maskindirektivet 2006/42/EC, LVD 2014/35/EU, EMC 2014/30/EU der relevant.
Svar med kun dokumentteksten i markdown. Ingen JSON, ingen kodebokser.`,

    qc: `Du er en teknisk compliance-ekspert spesialisert på kvalitetskontroll.
Skriv en komplett QC-sjekkliste på norsk for følgende maskin.
Kritisk regel: Aldri spekuler. Marker manglende info med [MANGLER: beskrivelse].

${machineData}

Inkluder disse seksjonene med minst 6 punkter hver:
## Mekanisk kontroll
## Hydraulikk / pneumatikk (hvis relevant)
## Elektrisk kontroll
## Sikkerhetsutstyr
## Funksjonskontroll
## Dokumentasjonskontroll

Hvert punkt på formatet: - [ ] Beskrivelse av kontrollpunkt
Svar med kun dokumentteksten i markdown. Ingen JSON, ingen kodebokser.`
  };

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model,
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompts[docType] }]
    })
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'API-feil');
  const text = data.content && data.content[0] && data.content[0].text;
  if (!text) throw new Error('Tom respons fra Anthropic');
  return text.trim();
}

function agentLog(phase, extra) {
  extra = extra || {};
  const payload = {
    hypothesisId: 'H',
    runId: 'post-fix-v11',
    phase: phase,
    version: 'v11-client-docx',
    ...extra
  };
  console.log('[debug-8fd491]', JSON.stringify(payload));
  // #region agent log
  fetch('http://127.0.0.1:7899/ingest/bef89494-0ce9-4594-b826-2f6c32aab015', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '8fd491' },
    body: JSON.stringify({
      sessionId: '8fd491',
      location: 'api/generate.js',
      message: phase,
      data: payload,
      timestamp: Date.now(),
      hypothesisId: 'H'
    })
  }).catch(function () {});
  // #endregion
}

module.exports = async function handler(req, res) {
  agentLog('handler-entry', { method: req.method });

  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      version: 'v11-client-docx',
      hasApiKey: Boolean(process.env.ANTHROPIC_API_KEY),
      runtime: process.version
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = parseBody(req);
  const machineData = body.machineData;
  const docType = body.docType;
  const validTypes = ['risk', 'tech', 'doc', 'qc'];

  if (!machineData) {
    agentLog('handler-missing-body', { bodyType: typeof req.body });
    return res.status(400).json({ error: 'Mangler maskindata' });
  }

  if (docType && validTypes.indexOf(docType) === -1) {
    return res.status(400).json({ error: 'Ugyldig docType: ' + docType });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Mangler API-nøkkel på server' });
  }

  try {
    if (docType) {
      const text = await generateSingleDoc(apiKey, docType, machineData);
      agentLog('handler-success-single', { docType: docType, len: text.length });
      var out = {};
      out[docType] = text;
      return res.status(200).json(out);
    }

    var results = await Promise.all(validTypes.map(function (type) {
      return generateSingleDoc(apiKey, type, machineData);
    }));

    agentLog('handler-success-batch', {
      riskLen: results[0].length,
      techLen: results[1].length,
      docLen: results[2].length,
      qcLen: results[3].length
    });

    return res.status(200).json({
      risk: results[0],
      tech: results[1],
      doc: results[2],
      qc: results[3]
    });
  } catch (err) {
    agentLog('handler-error', { error: err.message, docType: docType || 'all' });
    console.error('generate error:', err);
    return res.status(500).json({ error: err.message });
  }
};

module.exports.config = {
  maxDuration: 60
};
