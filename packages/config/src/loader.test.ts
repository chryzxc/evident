import { describe, expect, it, beforeAll, afterAll, beforeEach } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig, mergeConfig, stringifyConfigYaml } from './loader.js';

let dir: string;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'evident-cfg-load-'));
  await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'demo' }));
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

beforeEach(async () => {
  await Promise.all(
    ['evident.config.json', 'evident.config.yaml', 'evident.config.yml', 'evident.config.ts'].map(
      async (name) => rm(join(dir, name), { force: true }),
    ),
  );
});

describe('loadConfig from filesystem', () => {
  it('rejects an invalid version via yaml', async () => {
    await writeFile(join(dir, 'evident.config.yaml'), 'version: 2\n');
    await expect(loadConfig({ cwd: dir })).rejects.toThrow(/Invalid/);
  });

  it('rejects an invalid config via json', async () => {
    await writeFile(join(dir, 'evident.config.json'), JSON.stringify({ version: 2 }));
    await expect(loadConfig({ cwd: dir })).rejects.toThrow(/Invalid/);
  });

  it('loads valid YAML and JSON configs', async () => {
    await writeFile(join(dir, 'evident.config.yaml'), 'profiles:\n  - soc2\n');
    await expect(loadConfig({ cwd: dir })).resolves.toMatchObject({ profiles: ['soc2'] });

    await rm(join(dir, 'evident.config.yaml'));
    await writeFile(join(dir, 'evident.config.json'), JSON.stringify({ profiles: ['security'] }));
    await expect(loadConfig({ cwd: dir })).resolves.toMatchObject({ profiles: ['security'] });
  });

  it('does not discover executable JavaScript or TypeScript configuration', async () => {
    await writeFile(join(dir, 'evident.config.ts'), 'throw new Error("must not execute");\n');
    await expect(loadConfig({ cwd: dir })).resolves.toMatchObject({ profiles: ['security'] });
    await expect(
      loadConfig({ cwd: dir, configPath: join(dir, 'evident.config.ts') }),
    ).rejects.toThrow(/must be a .json, .yaml, or .yml file/);
  });

  it('deep merges nested overrides without discarding sibling config', async () => {
    await writeFile(
      join(dir, 'evident.config.yaml'),
      'reporting:\n  formats:\n    - json\n  outputDirectory: reports\n',
    );

    await expect(
      loadConfig({ cwd: dir, overrides: { reporting: { outputDirectory: 'other-reports' } } }),
    ).resolves.toMatchObject({
      reporting: { formats: ['json'], outputDirectory: 'other-reports' },
    });
  });
});

describe('mergeConfig', () => {
  it('recursively merges plain objects and replaces arrays', () => {
    expect(
      mergeConfig(
        {
          policy: { failOn: { severity: ['high'], newFindingsOnly: false } },
          profiles: ['security'],
        },
        { policy: { failOn: { newFindingsOnly: true } }, profiles: ['soc2'] },
      ),
    ).toEqual({
      policy: { failOn: { severity: ['high'], newFindingsOnly: true } },
      profiles: ['soc2'],
    });
  });
});

describe('stringifyConfigYaml', () => {
  it('serializes project names with YAML-significant characters safely', async () => {
    const content = stringifyConfigYaml({ project: { name: 'a: # "quoted"\nproject' } });
    await writeFile(join(dir, 'evident.config.yaml'), content);

    await expect(loadConfig({ cwd: dir })).resolves.toMatchObject({
      project: { name: 'a: # "quoted"\nproject' },
    });
  });
});
