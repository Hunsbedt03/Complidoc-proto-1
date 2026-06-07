export type DocumentSourceType = 'ai_generated' | 'user_upload' | 'hybrid';

export const SOURCE_CONFIG: Record<
  DocumentSourceType,
  {
    icon: string;
    label: string;
    badgeClass: string;
    description: string;
  }
> = {
  ai_generated: {
    icon: '🤖',
    label: 'Genereres av Samsiq',
    badgeClass: 'doc-badge-ai',
    description: 'AI produserer dette dokumentet automatisk fra maskindata',
  },
  user_upload: {
    icon: '📎',
    label: 'Lastes opp av deg',
    badgeClass: 'doc-badge-upload',
    description: 'Må komme fra deg, leverandør eller akkreditert tredjepart',
  },
  hybrid: {
    icon: '🔀',
    label: 'Mal + dine data',
    badgeClass: 'doc-badge-hybrid',
    description: 'Samsiq lager struktur — du fullfører med målinger eller signatur',
  },
};

export const SOURCE_ORDER: DocumentSourceType[] = [
  'ai_generated',
  'user_upload',
  'hybrid',
];
