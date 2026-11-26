import { readFile } from 'node:fs/promises';
import { transform, type Options } from '@swc/core';
import type { Plugin, PluginBuild } from 'esbuild';

/**
 * esbuild does not emit `emitDecoratorMetadata`, and NestJS injection reads the
 * constructor types from that metadata. This plugin compiles our own TypeScript with SWC (the same
 * decorator configuration the tests use) and leaves only bundling to esbuild.
 * With `packages: 'external'` esbuild loads nothing from node_modules: only the repository TypeScript reaches this point.
 */
export class DecoratorMetadataPlugin {
  private static readonly TYPESCRIPT = /\.ts$/;

  private readonly swcOptions: Options = {
    swcrc: false,
    sourceMaps: 'inline',
    jsc: {
      target: 'es2022',
      parser: { syntax: 'typescript', decorators: true },
      transform: { legacyDecorator: true, decoratorMetadata: true },
      keepClassNames: true,
    },
    module: { type: 'es6' },
  };

  toPlugin(): Plugin {
    return {
      name: 'decorator-metadata',
      setup: (build) => this.setup(build),
    };
  }

  private setup(build: PluginBuild): void {
    build.onLoad(
      { filter: DecoratorMetadataPlugin.TYPESCRIPT },
      async ({ path }) => {
        const source = await readFile(path, 'utf8');
        const output = await transform(source, {
          ...this.swcOptions,
          filename: path,
        });
        return { contents: output.code, loader: 'js' };
      },
    );
  }
}
