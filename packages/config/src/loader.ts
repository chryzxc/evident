import { cosmiconfig } from 'cosmiconfig';
import yaml from 'js-yaml';
import jitiFactory from 'jiti';
import { EvidentConfigSchema, type ResolvedConfig } from './schema.js';
import { ConfigError } from './errors.js';

const SEARCH_PLACES = [
  'evident.config.json',
  'evident.config.yaml',
  'evident.config.yml',
  'evident.config.ts',
  'evident.config.mjs',
  'evident.config.cjs',
  'evident.config.js',
];

const jiti = jitiFactory(import.meta.url, { interopDefault: true, cache: false, requireCache: false });

const yamlLoader = (_filepath: string, content: string): unknown => yaml.load(content);

const tsLoader = (filepath: string): unknown => {
  return jiti(filepath);
};

export interface LoadConfigOptions {
  cwd?: string;
  configPath?: string;
  overrides?: Record<string, unknown>;
}

/**
 * Load and validate an Evident configuration.
 *
 * Resolution order: explicit `configPath` → cosmiconfig search → defaults.
 * Any parse/validation failure throws ConfigError (exit code 2).
 */
export async function loadConfig(options: LoadConfigOptions = {}): Promise<ResolvedConfig> {
  const cwd = options.cwd ?? process.cwd();
  let raw: Record<string, unknown> | undefined;

  try {
    const explorer = cosmiconfig('evident', {
      searchPlaces: SEARCH_PLACES,
      loaders: {
        '.yaml': yamlLoader,
        '.yml': yamlLoader,
        '.ts': tsLoader,
        '.mts': tsLoader,
        '.cts': tsLoader,
      },
    });

    const result = options.configPath
      ? await explorer.load(options.configPath)
      : await explorer.search(cwd);

    if (result?.config && typeof result.config === 'object') {
      raw = result.config as Record<string, unknown>;
      (raw as Record<string, unknown>).__configPath = result.filepath;
    }
  } catch (err) {
    throw new ConfigError(
      `Failed to load Evident config: ${err instanceof Error ? err.message : String(err)}`,
      err,
    );
  }

  const merged = options.overrides
    ? { ...(raw ?? {}), ...options.overrides }
    : (raw ?? {});

  const parsed = EvidentConfigSchema.safeParse(merged);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '<root>'}: ${i.message}`)
      .join('\n');
    throw new ConfigError(`Invalid Evident configuration:\n${issues}`, parsed.error);
  }

  return parsed.data;
}

/**
 * Validate an already-parsed plain object. Used by `evident init` to check a
 * generated config without writing to disk first.
 */
export function validateConfig(input: unknown): ResolvedConfig {
  const parsed = EvidentConfigSchema.safeParse(input);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '<root>'}: ${i.message}`)
      .join('\n');
    throw new ConfigError(`Invalid Evident configuration:\n${issues}`, parsed.error);
  }
  return parsed.data;
}
