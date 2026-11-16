import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TfvarsBlockReader } from '../tfvars-block-reader.mjs';

const SAMPLE = `service_name = "fixture-mixed"

api = {
  runtime        = "fargate"
  route_prefixes = ["/v1/{x}"]
  nested = {
    runtime = "lambda"
  }
}

workers = {}

# consumers = {
#   mail = {}
# }
`;

describe('TfvarsBlockReader', () => {
  it('distingue un bloque con contenido de uno vacío', () => {
    const reader = new TfvarsBlockReader(SAMPLE);
    assert.equal(reader.hasBlock('api'), true);
    assert.equal(reader.hasBlock('workers'), true);
    assert.equal(reader.hasContent('api'), true);
    assert.equal(reader.hasContent('workers'), false);
    assert.equal(reader.hasBlock('consumers'), false);
  });

  it('devuelve el texto del bloque respetando llaves anidadas y cadenas con llaves', () => {
    const reader = new TfvarsBlockReader(SAMPLE);
    const block = reader.block('api');
    assert.match(block, /nested = \{/);
    assert.match(block, /runtime = "lambda"/);
    assert.doesNotMatch(block, /workers/);
    const withBraces = new TfvarsBlockReader('x = {\n  s = "}"\n}\ny = 1\n');
    assert.equal(withBraces.block('x').trim(), 's = "}"');
  });

  it('lee runtime solo dentro del bloque pedido', () => {
    const reader = new TfvarsBlockReader(SAMPLE);
    assert.equal(reader.stringIn('api', 'runtime'), 'fargate');
    assert.equal(reader.stringIn('workers', 'runtime'), undefined);
    assert.equal(reader.stringIn('api', 'missing'), undefined);
  });

  it('no lee claves de un nivel más profundo ni de comentarios', () => {
    const reader = new TfvarsBlockReader(
      'api = {\n  nested = {\n    runtime = "lambda"\n  }\n}\n',
    );
    assert.equal(reader.stringIn('api', 'runtime'), undefined);
    const commented = new TfvarsBlockReader(
      '# api = {\n#   runtime = "lambda"\n# }\n',
    );
    assert.equal(commented.hasBlock('api'), false);
    assert.equal(commented.stringIn('api', 'runtime'), undefined);
  });

  it('ignora comentarios al leer valores', () => {
    const reader = new TfvarsBlockReader(
      'api = {\n  runtime = "fargate" # lambda\n}\n',
    );
    assert.equal(reader.stringIn('api', 'runtime'), 'fargate');
  });

  it('lee valores sin sangría del nivel principal', () => {
    const reader = new TfvarsBlockReader(SAMPLE);
    assert.equal(reader.topLevelString('service_name'), 'fixture-mixed');
    assert.equal(reader.topLevelString('runtime'), undefined);
    const indented = new TfvarsBlockReader(
      'api = {\n  service_name = "otro"\n}\n',
    );
    assert.equal(indented.topLevelString('service_name'), undefined);
  });

  it('falla si un bloque no se cierra', () => {
    const reader = new TfvarsBlockReader('api = {\n  runtime = "fargate"\n');
    assert.throws(() => reader.block('api'), /sin cerrar/);
  });
});
