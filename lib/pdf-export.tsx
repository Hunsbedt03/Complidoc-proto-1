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

export type PdfExportMeta = {
  title: string;
  project: string;
  machine: string;
  revision: number;
  date: string;
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    paddingBottom: 8,
  },
  title: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  meta: { fontSize: 9, color: '#555' },
  h1: { fontSize: 14, fontWeight: 'bold', marginTop: 12, marginBottom: 6 },
  h2: { fontSize: 12, fontWeight: 'bold', marginTop: 10, marginBottom: 4 },
  h3: { fontSize: 11, fontWeight: 'bold', marginTop: 8, marginBottom: 4 },
  p: { marginBottom: 6, lineHeight: 1.4 },
  li: { marginBottom: 3, paddingLeft: 8 },
  table: { marginTop: 8, marginBottom: 8, borderWidth: 1, borderColor: '#ccc' },
  tableRow: { flexDirection: 'row' },
  tableHeader: {
    flex: 1,
    padding: 4,
    backgroundColor: '#f2f4f7',
    fontWeight: 'bold',
    borderRightWidth: 1,
    borderRightColor: '#ccc',
    fontSize: 8,
  },
  tableCell: {
    flex: 1,
    padding: 4,
    borderRightWidth: 1,
    borderRightColor: '#ccc',
    fontSize: 8,
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

function BlockView({ block }: { block: DocumentBlock }) {
  switch (block.type) {
    case 'heading':
      return (
        <Text style={block.level === 1 ? styles.h1 : block.level === 2 ? styles.h2 : styles.h3}>
          {block.text}
        </Text>
      );
    case 'paragraph':
      return <Text style={styles.p}>{block.text}</Text>;
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
    case 'table':
      return (
        <View style={styles.table}>
          <View style={styles.tableRow}>
            {block.headers.map((h, i) => (
              <Text key={`h-${i}`} style={styles.tableHeader}>
                {h}
              </Text>
            ))}
          </View>
          {block.rows.map((row, ri) => (
            <View key={`r-${ri}`} style={styles.tableRow}>
              {row.map((cell, ci) => (
                <Text key={`c-${ri}-${ci}`} style={styles.tableCell}>
                  {cell}
                </Text>
              ))}
            </View>
          ))}
        </View>
      );
    default:
      return null;
  }
}

function ExportDocument({ blocks, meta }: { blocks: DocumentBlock[]; meta: PdfExportMeta }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <Text style={styles.title}>{meta.title}</Text>
          <Text style={styles.meta}>
            {meta.machine} · {meta.project} · Rev. {meta.revision} · {meta.date}
          </Text>
        </View>
        {blocks.map((block, i) => (
          <BlockView key={i} block={block} />
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
