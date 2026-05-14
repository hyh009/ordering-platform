import { todoRepository } from '@src/repositories/todo/repository';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../src/app.js';

describe('todos API', () => {
  beforeEach(() => {
    if (!todoRepository.reset) {
      throw new Error('Todo API tests require a resettable repository.');
    }

    todoRepository.reset();
  });

  it('lists todos with the success response wrapper', async () => {
    const app = createApp();

    const response = await request(app).get('/api/v1/todos');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'success',
      data: [
        {
          id: 'todo-1',
          title: 'Design frontend architecture',
          description: 'Document frontend boundaries.',
          status: 'done',
          priority: 'high',
          owner_name: 'Frontend',
        },
        {
          id: 'todo-2',
          title: 'Build Todo overview page',
          description: 'Create a feature-level Todo overview workflow.',
          status: 'in-progress',
          priority: 'medium',
          owner_name: 'Frontend',
        },
        {
          id: 'todo-3',
          title: 'Connect health API',
          description: 'Keep the frontend health link connected to the API.',
          status: 'todo',
          priority: 'low',
          owner_name: 'Full stack',
        },
      ],
    });
  });

  it('gets a todo by id', async () => {
    const app = createApp();

    const response = await request(app).get('/api/v1/todos/todo-1');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'success',
      data: {
        id: 'todo-1',
        title: 'Design frontend architecture',
        description: 'Document frontend boundaries.',
        status: 'done',
        priority: 'high',
        owner_name: 'Frontend',
      },
    });
  });

  it('creates a todo', async () => {
    const app = createApp();

    const response = await request(app).post('/api/v1/todos').send({
      title: 'Build Todo CRUD',
      description: 'Connect frontend Todo demo to backend.',
      status: 'todo',
      priority: 'medium',
      owner_name: 'Frontend',
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      status: 'success',
      data: {
        title: 'Build Todo CRUD',
        description: 'Connect frontend Todo demo to backend.',
        status: 'todo',
        priority: 'medium',
        owner_name: 'Frontend',
      },
    });
    expect(response.body.data.id).toEqual(expect.stringMatching(/^todo-/));
  });

  it('updates a todo', async () => {
    const app = createApp();

    const response = await request(app).patch('/api/v1/todos/todo-1').send({
      status: 'in-progress',
      priority: 'high',
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'success',
      data: {
        id: 'todo-1',
        title: 'Design frontend architecture',
        description: 'Document frontend boundaries.',
        status: 'in-progress',
        priority: 'high',
        owner_name: 'Frontend',
      },
    });
  });

  it('deletes a todo', async () => {
    const app = createApp();

    const response = await request(app).delete('/api/v1/todos/todo-1');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'success',
      data: {
        id: 'todo-1',
      },
    });
  });

  it('returns TODO_NOT_FOUND when a todo does not exist', async () => {
    const app = createApp();

    const response = await request(app).get('/api/v1/todos/missing-todo');

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      status: 'error',
      statusCode: 404,
      code: 'TODO_NOT_FOUND',
      message: 'Todo not found',
    });
  });

  it('returns validation errors for invalid todo input', async () => {
    const app = createApp();

    const response = await request(app).post('/api/v1/todos').send({});

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      status: 'error',
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'Invalid request body',
      details: expect.arrayContaining([
        {
          path: 'title',
          message: 'Invalid input: expected string, received undefined',
        },
        {
          path: 'status',
          message:
            'Invalid option: expected one of "todo"|"in-progress"|"done"',
        },
        {
          path: 'priority',
          message: 'Invalid option: expected one of "low"|"medium"|"high"',
        },
        {
          path: 'owner_name',
          message: 'Invalid input: expected string, received undefined',
        },
      ]),
    });
  });
});
