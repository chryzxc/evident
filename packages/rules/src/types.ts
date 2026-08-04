import type { NormalizedFinding } from '@evident/types';
import type { RepositoryContext } from '@evident/repository';

export interface Rule {
  id: string;
  category: NormalizedFinding['category'];
  run(repo: RepositoryContext): Promise<NormalizedFinding[]>;
}
