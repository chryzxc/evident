import type { RepositoryContext } from '@evident/repository';
import type { Rule } from './types.js';

export async function runRules(repo: RepositoryContext, rules: Rule[]) {
  const findings = [];
  for (const rule of rules) {
    try {
      const result = await rule.run(repo);
      findings.push(...result);
    } catch {
      // individual rule failure never crashes the scan
    }
  }
  return findings;
}
