import { createTodoSchema, updateTodoSchema } from '@repo/shared';
import { validate } from '@src/middlewares/validate';
import { todoService } from '@src/services/todo.service';
import { Router } from 'express';
import { z } from 'zod';

import type { CreateTodoRequest, UpdateTodoRequest } from '@repo/shared';

const router = Router();

const todoParamsSchema = z.object({
  todoId: z.string().trim().min(1),
});

type TodoParams = z.infer<typeof todoParamsSchema>;

/**
 * @openapi
 * components:
 *   schemas:
 *     TodoStatus:
 *       type: string
 *       enum:
 *         - todo
 *         - in-progress
 *         - done
 *     TodoPriority:
 *       type: string
 *       enum:
 *         - low
 *         - medium
 *         - high
 *     Todo:
 *       type: object
 *       required:
 *         - id
 *         - title
 *         - status
 *         - priority
 *         - owner_name
 *       properties:
 *         id:
 *           type: string
 *           example: todo-1
 *         title:
 *           type: string
 *           example: Design frontend architecture
 *         description:
 *           type: string
 *           nullable: true
 *           example: Document frontend boundaries.
 *         status:
 *           $ref: '#/components/schemas/TodoStatus'
 *         priority:
 *           $ref: '#/components/schemas/TodoPriority'
 *         owner_name:
 *           type: string
 *           example: Frontend
 *     CreateTodoRequest:
 *       type: object
 *       required:
 *         - title
 *         - status
 *         - priority
 *         - owner_name
 *       properties:
 *         title:
 *           type: string
 *           example: Build Todo CRUD
 *         description:
 *           type: string
 *           nullable: true
 *           example: Connect frontend Todo demo to backend.
 *         status:
 *           $ref: '#/components/schemas/TodoStatus'
 *         priority:
 *           $ref: '#/components/schemas/TodoPriority'
 *         owner_name:
 *           type: string
 *           example: Frontend
 *     UpdateTodoRequest:
 *       type: object
 *       minProperties: 1
 *       properties:
 *         title:
 *           type: string
 *           example: Build Todo CRUD
 *         description:
 *           type: string
 *           nullable: true
 *           example: Connect frontend Todo demo to backend.
 *         status:
 *           $ref: '#/components/schemas/TodoStatus'
 *         priority:
 *           $ref: '#/components/schemas/TodoPriority'
 *         owner_name:
 *           type: string
 *           example: Frontend
 *     TodoListSuccessResponse:
 *       type: object
 *       required:
 *         - status
 *         - data
 *       properties:
 *         status:
 *           type: string
 *           enum:
 *             - success
 *           example: success
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Todo'
 *     TodoSuccessResponse:
 *       type: object
 *       required:
 *         - status
 *         - data
 *       properties:
 *         status:
 *           type: string
 *           enum:
 *             - success
 *           example: success
 *         data:
 *           $ref: '#/components/schemas/Todo'
 *     DeleteTodoSuccessResponse:
 *       type: object
 *       required:
 *         - status
 *         - data
 *       properties:
 *         status:
 *           type: string
 *           enum:
 *             - success
 *           example: success
 *         data:
 *           type: object
 *           required:
 *             - id
 *           properties:
 *             id:
 *               type: string
 *               example: todo-1
 *     ApiErrorCode:
 *       type: string
 *       enum:
 *         - BAD_REQUEST
 *         - UNAUTHORIZED
 *         - FORBIDDEN
 *         - NOT_FOUND
 *         - CONFLICT
 *         - INTERNAL_SERVER_ERROR
 *         - VALIDATION_ERROR
 *         - INVALID_ID
 *         - INVALID_FIELD_VALUE
 *         - RESOURCE_ALREADY_EXISTS
 *         - INVALID_CREDENTIALS
 *         - INVALID_REFRESH_TOKEN
 *         - USER_ALREADY_EXISTS
 *         - USER_DISABLED
 *         - TODO_NOT_FOUND
 *       example: TODO_NOT_FOUND
 *     ValidationErrorDetail:
 *       type: object
 *       required:
 *         - path
 *         - message
 *       properties:
 *         path:
 *           type: string
 *           example: title
 *         message:
 *           type: string
 *           example: 'Invalid input: expected string, received undefined'
 *     ErrorResponse:
 *       type: object
 *       required:
 *         - status
 *         - statusCode
 *         - code
 *         - message
 *       properties:
 *         status:
 *           type: string
 *           enum:
 *             - error
 *           example: error
 *         statusCode:
 *           type: integer
 *           example: 404
 *         code:
 *           $ref: '#/components/schemas/ApiErrorCode'
 *         message:
 *           type: string
 *           example: Todo not found
 *         details:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ValidationErrorDetail'
 *           example:
 *             - path: title
 *               message: 'Invalid input: expected string, received undefined'
 */

/**
 * @openapi
 * /v1/todos:
 *   get:
 *     tags:
 *       - Todos
 *     summary: List todos
 *     responses:
 *       200:
 *         description: Todo list returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TodoListSuccessResponse'
 */
router.get('/', async (_req, res) => {
  res.json({
    status: 'success',
    data: await todoService.listTodos(),
  });
});

/**
 * @openapi
 * /v1/todos/{todoId}:
 *   get:
 *     tags:
 *       - Todos
 *     summary: Get a todo
 *     parameters:
 *       - in: path
 *         name: todoId
 *         required: true
 *         schema:
 *           type: string
 *         example: todo-1
 *     responses:
 *       200:
 *         description: Todo returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TodoSuccessResponse'
 *       404:
 *         description: Todo not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               todoNotFound:
 *                 summary: Todo does not exist
 *                 value:
 *                   status: error
 *                   statusCode: 404
 *                   code: TODO_NOT_FOUND
 *                   message: Todo not found
 */
router.get<TodoParams>(
  '/:todoId',
  validate(todoParamsSchema, 'params'),
  async (req, res) => {
    const { todoId } = req.params;

    res.json({
      status: 'success',
      data: await todoService.getTodo(todoId),
    });
  },
);

/**
 * @openapi
 * /v1/todos:
 *   post:
 *     tags:
 *       - Todos
 *     summary: Create a todo
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTodoRequest'
 *     responses:
 *       201:
 *         description: Todo created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TodoSuccessResponse'
 *       400:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               validationError:
 *                 summary: Request body failed validation
 *                 value:
 *                   status: error
 *                   statusCode: 400
 *                   code: VALIDATION_ERROR
 *                   message: Invalid request body
 *                   details:
 *                     - path: title
 *                       message: 'Invalid input: expected string, received undefined'
 *                     - path: status
 *                       message: 'Invalid option: expected one of "todo"|"in-progress"|"done"'
 *                     - path: priority
 *                       message: 'Invalid option: expected one of "low"|"medium"|"high"'
 *                     - path: owner_name
 *                       message: 'Invalid input: expected string, received undefined'
 */
router.post<Record<string, never>, Record<string, unknown>, CreateTodoRequest>(
  '/',
  validate(createTodoSchema),
  async (req, res) => {
    res.status(201).json({
      status: 'success',
      data: await todoService.createTodo(req.body),
    });
  },
);

/**
 * @openapi
 * /v1/todos/{todoId}:
 *   patch:
 *     tags:
 *       - Todos
 *     summary: Update a todo
 *     parameters:
 *       - in: path
 *         name: todoId
 *         required: true
 *         schema:
 *           type: string
 *         example: todo-1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateTodoRequest'
 *     responses:
 *       200:
 *         description: Todo updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TodoSuccessResponse'
 *       400:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               validationError:
 *                 summary: Request body failed validation
 *                 value:
 *                   status: error
 *                   statusCode: 400
 *                   code: VALIDATION_ERROR
 *                   message: Invalid request body
 *                   details:
 *                     - path: status
 *                       message: 'Invalid option: expected one of "todo"|"in-progress"|"done"'
 *       404:
 *         description: Todo not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               todoNotFound:
 *                 summary: Todo does not exist
 *                 value:
 *                   status: error
 *                   statusCode: 404
 *                   code: TODO_NOT_FOUND
 *                   message: Todo not found
 */
router.patch<TodoParams, Record<string, unknown>, UpdateTodoRequest>(
  '/:todoId',
  validate(todoParamsSchema, 'params'),
  validate(updateTodoSchema),
  async (req, res) => {
    const { todoId } = req.params;

    res.json({
      status: 'success',
      data: await todoService.updateTodo(todoId, req.body),
    });
  },
);

/**
 * @openapi
 * /v1/todos/{todoId}:
 *   delete:
 *     tags:
 *       - Todos
 *     summary: Delete a todo
 *     parameters:
 *       - in: path
 *         name: todoId
 *         required: true
 *         schema:
 *           type: string
 *         example: todo-1
 *     responses:
 *       200:
 *         description: Todo deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeleteTodoSuccessResponse'
 *       404:
 *         description: Todo not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               todoNotFound:
 *                 summary: Todo does not exist
 *                 value:
 *                   status: error
 *                   statusCode: 404
 *                   code: TODO_NOT_FOUND
 *                   message: Todo not found
 */
router.delete<TodoParams>(
  '/:todoId',
  validate(todoParamsSchema, 'params'),
  async (req, res) => {
    const { todoId } = req.params;

    res.json({
      status: 'success',
      data: await todoService.deleteTodo(todoId),
    });
  },
);

export default router;
