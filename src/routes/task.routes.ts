import { FastifyInstance } from 'fastify';
import { TaskController } from '../controllers/task.controller';
import {
  createTaskSchema,
  updateTaskSchema,
  getTaskSchema,
  getTasksSchema
} from '../schemas/task.schema';

export async function taskRoutes(fastify: FastifyInstance, taskController: TaskController) {
  const apiPrefix = process.env.API_PREFIX || '/api/v1';
  
  // POST /tasks - создание задачи
  fastify.post(`${apiPrefix}/tasks`, {
    schema: createTaskSchema,
    handler: taskController.createTask.bind(taskController)
  });

  // GET /tasks/:id - получение задачи по ID
  fastify.get(`${apiPrefix}/tasks/:id`, {
    schema: getTaskSchema,
    handler: taskController.getTask.bind(taskController)
  });

  // GET /tasks - получение списка задач
  fastify.get(`${apiPrefix}/tasks`, {
    schema: getTasksSchema,
    handler: taskController.getTasks.bind(taskController)
  });

  // PATCH /tasks/:id - обновление задачи
  fastify.patch(`${apiPrefix}/tasks/:id`, {
    schema: updateTaskSchema,
    handler: taskController.updateTask.bind(taskController)
  });
} 