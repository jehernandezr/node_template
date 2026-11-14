import { readFile } from 'node:fs/promises';
import { transform, type Options } from '@swc/core';
import type { Plugin, PluginBuild } from 'esbuild';

/**
 * esbuild no emite `emitDecoratorMetadata`, y la inyección de NestJS lee los tipos del
 * constructor de esa metadata. Este plugin compila el TypeScript propio con SWC (la misma
 * configuración de decoradores que usan las pruebas) y deja a esbuild solo el empaquetado.
 */
export class DecoratorMetadataPlugin {
  // Con `packages: 'external'` esbuild no carga nada de node_modules: solo llega aquí
  // el TypeScript del repositorio.
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
