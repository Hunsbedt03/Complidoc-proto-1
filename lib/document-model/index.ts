export type {
  DocumentBlock,
  DocumentLanguage,
  FmeaRow,
  FareregisterRow,
  ManglerValue,
  SikkerhetsfunksjonRow,
  StructuredDocumentData,
  StructuredTableDocumentId,
} from '@/lib/document-model/types';
export {
  formatCellValue,
  isStructuredTableDocumentId,
  STRUCTURED_TABLE_DOCUMENT_IDS,
} from '@/lib/document-model/types';
export { tiptapToBlocks } from '@/lib/document-model/tiptapToBlocks';
export {
  fmeaRowsToBlocks,
  fareregisterRowsToBlocks,
  sikkerhetsfunksjonRowsToBlocks,
  structuredDataToBlocks,
} from '@/lib/document-model/structuredToBlocks';
export { blocksToHtml, blocksToTiptap } from '@/lib/document-model/blocksToTiptap';
export { revisionToBlocks } from '@/lib/document-model/revisionToBlocks';
export { tiptapJsonToStructuredData } from '@/lib/document-model/tiptapToStructured';
