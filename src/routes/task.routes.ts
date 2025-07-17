import { FastifyInstance } from 'fastify';
import { TaskController } from '../controllers/task.controller';
import {
  createTaskSchema,
  updateTaskSchema,
  getTaskSchema,
  getTasksSchema
} from '../schemas/task.schema';
import { getConfig } from '../config/app.config';

export async function taskRoutes(fastify: FastifyInstance, taskController: TaskController) {
  const config = getConfig();
  
  // POST /tasks - создание задачи
  fastify.post(`${config.api.prefix}/tasks`, {
    schema: createTaskSchema,
    handler: taskController.createTask.bind(taskController)
  });

  // GET /tasks/:id - получение задачи по ID
  fastify.get(`${config.api.prefix}/tasks/:id`, {
    schema: getTaskSchema,
    handler: taskController.getTask.bind(taskController)
  });

  // GET /tasks - получение списка задач
  fastify.get(`${config.api.prefix}/tasks`, {
    schema: getTasksSchema,
    handler: taskController.getTasks.bind(taskController)
  });

  // PATCH /tasks/:id - обновление задачи
  fastify.patch(`${config.api.prefix}/tasks/:id`, {
    schema: updateTaskSchema,
    handler: taskController.updateTask.bind(taskController)
  });
} 