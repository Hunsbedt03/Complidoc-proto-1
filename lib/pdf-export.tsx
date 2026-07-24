import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from '@react-pdf/renderer';
import type { DocumentBlock } from '@/lib/document-model/types';
import { paragraphPlainText } from '@/lib/document-model/types';
import { buildExportInfoRows, type DocumentExportMeta } from '@/lib/document-model/exportMeta';
import {
  isLandscapeDocument,
  tableColumnFlex,
} from '@/lib/document-model/tableLayout';

export type PdfExportMeta = DocumentExportMeta;

const basePage = {
  paddingTop: 56,
  paddingBottom: 48,
  paddingHorizontal: 40,
  fontSize: 10,
  fontFamily: 'Helvetica',
};

const styles = StyleSheet.create({
  pagePortrait: { ...basePage },
  pageLandscape: { ...basePage },
  infoTable: {
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  infoRow: { flexDirection: 'row' },
  infoLabel: {
    width: '36%',
    padding: 5,
    backgroundColor: '#f2f4f7',
    fontWeight: 'bold',
    fontSize: 8,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#ccc',
  },
  infoValue: {
    width: '64%',
    padding: 5,
    fontSize: 8,
    borderBottomWidth: 1,
    borderColor: '#ccc',
  },
  h1: { fontSize: 14, fontWeight: 'bold', marginTop: 12, marginBottom: 6 },
  h2: { fontSize: 12, fontWeight: 'bold', marginTop: 10, marginBottom: 4 },
  h3: { fontSize: 11, fontWeight: 'bold', marginTop: 8, marginBottom: 4 },
  p: { marginBottom: 6, lineHeight: 1.4 },
  li: { marginBottom: 3, paddingLeft: 8 },
  table: { marginTop: 8, marginBottom: 8, borderWidth: 1, borderColor: '#ccc', width: '100%' },
  tableRow: { flexDirection: 'row', width: '100%' },
  tableHeader: {
    padding: 4,
    backgroundColor: '#f2f4f7',
    fontWeight: 'bold',
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#ccc',
    fontSize: 7,
  },
  tableCell: {
    padding: 4,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#ccc',
    fontSize: 7,
  },
  header: {
    position: 'absolute',
    top: 18,
    left: 40,
    right: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 0.75,
    borderBottomColor: '#ccc',
    paddingBottom: 6,
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '22%',
  },
  logoMark: {
    width: 12,
    height: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginRight: 5,
  },
  logoCell: {
    width: 5,
    height: 5,
    margin: 0.5,
    borderRadius: 0.75,
    backgroundColor: '#1E232D',
  },
  logoCellMuted: {
    width: 5,
    height: 5,
    margin: 0.5,
    borderRadius: 0.75,
    backgroundColor: '#6B7280',
  },
  logoCellFaint: {
    width: 5,
    height: 5,
    margin: 0.5,
    borderRadius: 0.75,
    backgroundColor: '#A8B0BD',
  },
  logoName: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1E232D',
  },
  headerCenter: {
    flex: 1,
    fontSize: 8,
    color: '#555',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  headerRevision: {
    width: '18%',
    fontSize: 8,
    color: '#555',
    textAlign: 'right',
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#888',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

function SamsiqLogoMark() {
  return (
    <View style={styles.headerBrand}>
      <View style={styles.logoMark}>
        <View style={styles.logoCell} />
        <View style={styles.logoCellMuted} />
        <View style={styles.logoCellMuted} />
        <View style={styles.logoCellFaint} />
      </View>
      <Text style={styles.logoName}>Samsiq</Text>
    </View>
  );
}

function PageHeader({ meta }: { meta: PdfExportMeta }) {
  const machine = meta.machine?.trim();
  const center =
    machine && machine !== '—' && machine !== meta.title
      ? `${meta.title} — ${machine}`
      : meta.title;
  const rev = `Rev. ${meta.revision}`;

  return (
    <View style={styles.header} fixed>
      <SamsiqLogoMark />
      <Text style={styles.headerCenter}>{center}</Text>
      <Text style={styles.headerRevision}>{rev}</Text>
    </View>
  );
}
function ParagraphText({ block }: { block: Extract<DocumentBlock, { type: 'paragraph' }> }) {
  if (block.spans?.length) {
    return (
      <Text style={styles.p}>
        {block.spans.map((s, i) => (
          <Text
            key={i}
            style={{
              fontWeight: s.bold ? 'bold' : 'normal',
              fontStyle: s.italic ? 'italic' : 'normal',
            }}
          >
            {s.text}
          </Text>
        ))}
      </Text>
    );
  }
  return <Text style={styles.p}>{paragraphPlainText(block)}</Text>;
}

function BlockView({
  block,
  documentId,
}: {
  block: DocumentBlock;
  documentId?: string;
}) {
  switch (block.type) {
    case 'heading':
      return (
        <Text style={block.level === 1 ? styles.h1 : block.level === 2 ? styles.h2 : styles.h3}>
          {block.text}
        </Text>
      );
    case 'paragraph':
      return <ParagraphText block={block} />;
    case 'list':
      return (
        <View>
          {block.items.map((item, i) => (
            <Text key={i} style={styles.li}>
              {block.ordered ? `${i + 1}. ` : '• '}
              {item}
            </Text>
          ))}
        </View>
      );
    case 'table': {
      const flex = tableColumnFlex(block.headers, documentId);
      return (
        <View style={styles.table}>
          <View style={styles.tableRow}>
            {block.headers.map((h, i) => (
              <Text key={`h-${i}`} style={[styles.tableHeader, { flex: flex[i] ?? 1 }]}>
                {h}
              </Text>
            ))}
          </View>
          {block.rows.map((row, ri) => (
            <View key={`r-${ri}`} style={styles.tableRow}>
              {row.map((cell, ci) => (
                <Text
                  key={`c-${ri}-${ci}`}
                  style={[styles.tableCell, { flex: flex[ci] ?? 1 }]}
                >
                  {cell}
                </Text>
              ))}
            </View>
          ))}
        </View>
      );
    }
    default:
      return null;
  }
}

function InfoTable({ meta }: { meta: PdfExportMeta }) {
  const rows = buildExportInfoRows(meta);
  return (
    <View style={styles.infoTable}>
      {rows.map(([label, value]) => (
        <View key={label} style={styles.infoRow}>
          <Text style={styles.infoLabel}>{label}</Text>
          <Text style={styles.infoValue}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

function ExportDocument({
  blocks,
  meta,
}: {
  blocks: DocumentBlock[];
  meta: PdfExportMeta;
}) {
  const landscape = isLandscapeDocument(meta.documentId);
  return (
    <Document>
      <Page
        size="A4"
        orientation={landscape ? 'landscape' : 'portrait'}
        style={landscape ? styles.pageLandscape : styles.pagePortrait}
      >
        <PageHeader meta={meta} />
        <InfoTable meta={meta} />
        {blocks.map((block, i) => (
          <BlockView key={i} block={block} documentId={meta.documentId} />
        ))}
        <View style={styles.footer} fixed>
          <Text>Samsiq — {meta.title}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export async function exportBlocksToPdf(
  blocks: DocumentBlock[],
  meta: PdfExportMeta
): Promise<Buffer> {
  const element = <ExportDocument blocks={blocks} meta={meta} />;
  const buffer = await renderToBuffer(element);
  return Buffer.from(buffer);
}
