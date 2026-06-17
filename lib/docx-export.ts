import type { DocumentBlock } from '@/lib/document-model/types';
import { buildDocxFromBlocks } from '@/lib/generators/docxBuilder';

export type DocxExportMeta = {
  title: string;
  project: string;
  machine: string;
  revision: number;
  date: string;
  produsent?: string;
  serienr?: string;
  kunde?: string;
  ingenior?: string;
  documentId?: string;
};

export async function exportBlocksToDocx(
  blocks: DocumentBlock[],
  meta: DocxExportMeta
): Promise<Buffer> {
  return buildDocxFromBlocks(meta.title, meta, blocks);
}
