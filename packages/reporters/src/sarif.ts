import type { ScanResult } from '@evident/types';
import type { Reporter } from './types.js';

export const sarifReporter: Reporter = {
  format: 'sarif',
  render(result: ScanResult): string {
    const findings = result.findings.filter((f) => f.locations.length > 0 && f.locations[0]?.path);
    const results = findings
      .map((f) => {
        const loc = f.locations[0]!;
        return {
          ruleId: f.id,
          level: sarifLevel(f.severity),
          message: { text: `${f.title}: ${f.description}` },
          properties: {
            category: f.category,
            confidence: f.confidence,
            sources: f.sources.map((source) => source.tool),
          },
          locations: [
            {
              physicalLocation: {
                artifactLocation: { uri: loc.path },
                region: {
                  startLine: loc.lineStart,
                  ...(loc.lineEnd ? { endLine: loc.lineEnd } : {}),
                },
              },
            },
          ],
        };
      });

    const sarif = JSON.stringify(
      {
        version: '2.1.0',
        $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
        runs: [
          {
            tool: {
              driver: { name: 'Evident', informationUri: 'https://evident.dev', version: '0.1.0' },
              rules: findings.map((finding) => ({
                id: finding.id,
                name: finding.title,
                shortDescription: { text: finding.title },
                fullDescription: { text: finding.description },
                properties: { category: finding.category },
              })),
            },
            results,
          },
        ],
      },
      null,
      2,
    );

    return sarif;
  },
};

function sarifLevel(sev: string): string {
  switch (sev) {
    case 'CRITICAL':
    case 'HIGH':
      return 'error';
    case 'MEDIUM':
      return 'warning';
    case 'LOW':
      return 'note';
    default:
      return 'none';
  }
}
