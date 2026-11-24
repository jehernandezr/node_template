import type { JsonObject } from '../json.type.js';
import { OpenApiBuilder } from '../open-api-builder.js';

const contract: JsonObject = {
  formatVersion: 2,
  jsonSchemaDialect: 'https://json-schema.org/draft/2020-12/schema',
  service: 'tasks',
  description: 'Tareas.',
  schemas: {
    Task: {
      type: 'object',
      properties: {
        id: { $ref: '../../platform/export/contract.json#/schemas/Id' },
        status: { $ref: '#/schemas/TaskStatus' },
      },
    },
    TaskStatus: { type: 'string', enum: ['open', 'done'] },
  },
  routes: [
    {
      id: 'tasks.task.list',
      method: 'GET',
      path: '/v1/tasks',
      pathParams: [],
      requestLocation: 'query',
      queryParams: [
        { name: 'status', kind: 'string', list: true },
        { name: 'limit', kind: 'number', list: false },
      ],
      request: { $ref: '#/schemas/ListTasksRequest' },
      response: { $ref: '#/schemas/Task' },
      successStatus: 200,
      errors: ['PLATFORM.VALIDATION.INVALID_INPUT'],
      access: { kind: 'authenticated', permissions: ['tasks:read'] },
      description: 'Lista.',
    },
    {
      id: 'tasks.task.delete',
      method: 'DELETE',
      path: '/v1/tasks/{taskId}',
      pathParams: ['taskId'],
      requestLocation: 'body',
      queryParams: [],
      request: { $ref: '#/schemas/DeleteTaskRequest' },
      response: null,
      successStatus: 204,
      errors: ['TASKS.TASK.NOT_FOUND'],
      access: { kind: 'public' },
      description: 'Borra.',
    },
  ],
};

describe('OpenApiBuilder', () => {
  const document = new OpenApiBuilder().build(contract) as {
    openapi: string;
    info: { title: string };
    paths: Record<string, Record<string, Record<string, unknown>>>;
    components: { schemas: Record<string, unknown> };
  };

  it('describes the service as an OpenAPI 3.1 document', () => {
    expect(document.openapi).toBe('3.1.0');
    expect(document.info.title).toBe('tasks');
  });

  it('turns query parameters, permissions and the success response of a route into its operation', () => {
    expect(document.paths['/v1/tasks']?.['get']).toMatchObject({
      operationId: 'tasks.task.list',
      parameters: [
        {
          name: 'status',
          in: 'query',
          schema: { type: 'array', items: { type: 'string' } },
        },
        { name: 'limit', in: 'query', schema: { type: 'number' } },
      ],
      security: [{ bearerAuth: [] }],
      'x-permissions': ['tasks:read'],
      'x-error-codes': ['PLATFORM.VALIDATION.INVALID_INPUT'],
      responses: {
        '200': {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Task' },
            },
          },
        },
      },
    });
    expect(document.paths['/v1/tasks']?.['get']).not.toHaveProperty(
      'requestBody',
    );
  });

  it('gives a public route with a body and no response its path parameter, its body and no security', () => {
    const operation = document.paths['/v1/tasks/{taskId}']?.['delete'];

    expect(operation).toMatchObject({
      parameters: [{ name: 'taskId', in: 'path', required: true }],
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/DeleteTaskRequest' },
          },
        },
      },
      responses: { '204': { description: 'Sin contenido.' } },
    });
    expect(operation).not.toHaveProperty('security');
  });

  it('points the references to its own components and to the OpenAPI of the other contracts', () => {
    expect(document.components.schemas['Task']).toEqual({
      type: 'object',
      properties: {
        id: {
          $ref: '../../platform/export/openapi.json#/components/schemas/Id',
        },
        status: { $ref: '#/components/schemas/TaskStatus' },
      },
    });
  });
});
