import { cosmiconfig } from 'cosmiconfig';
import yaml from 'js-yaml';
import { extname } from 'node:path';
import { EvidentConfigSchema, type ResolvedConfig } from './schema.js';
import { ConfigError } from './errors.js';

const SEARCH_PLACES = ['evident.config.json', 'evident.config.yaml', 'evident.config.yml'];

const yamlLoader = (_filepath: string, content: string): unknown => yaml.load(content);

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
    if (options.configPath && !isSupportedConfigPath(options.configPath)) {
      throw new ConfigError('Evident configuration must be a .json, .yaml, or .yml file.');
    }

    const explorer = cosmiconfig('evident', {
      searchPlaces: SEARCH_PLACES,
      loaders: {
        '.yaml': yamlLoader,
        '.yml': yamlLoader,
      },
    });

    const result = options.configPath
      ? await explorer.load(options.configPath)
      : await explorer.search(cwd);

    if (result?.config && typeof result.config === 'object') {
      raw = result.config as Record<string, unknown>;
    }
  } catch (err) {
    if (err instanceof ConfigError) throw err;
    throw new ConfigError(
      `Failed to load Evident config: ${err instanceof Error ? err.message : String(err)}`,
      err,
    );
  }

  const merged = options.overrides ? mergeConfig(raw ?? {}, options.overrides) : (raw ?? {});

  const parsed = EvidentConfigSchema.safeParse(merged);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '<root>'}: ${i.message}`)
      .join('\n');
    throw new ConfigError(`Invalid Evident configuration:\n${issues}`, parsed.error);
  }

  return parsed.data;
}

export function mergeConfig(
  base: Record<string, unknown>,
  overrides: Record<string, unknown>,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...base };

  for (const [key, override] of Object.entries(overrides)) {
    const current = merged[key];
    merged[key] =
      isPlainObject(current) && isPlainObject(override) ? mergeConfig(current, override) : override;
  }

  return merged;
}

export function stringifyConfigYaml(config: Record<string, unknown>): string {
  return yaml.dump(config, { lineWidth: -1 });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isSupportedConfigPath(path: string): boolean {
  return ['.json', '.yaml', '.yml'].includes(extname(path).toLowerCase());
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
