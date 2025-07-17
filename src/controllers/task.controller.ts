import { FastifyRequest, FastifyReply } from 'fastify';
import { TaskService, CreateTaskData, UpdateTaskData } from '../services/task.service';
import { TaskStatus } from '../models/task.model';

export class TaskController {
  constructor(private taskService: TaskService) {}

  async createTask(
    request: FastifyRequest<{
      Body: CreateTaskData;
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const task = await this.taskService.createTask(request.body);
      reply.status(201).send(task);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.status(400).send({ 
        error: errorMessage,
        timestamp: new Date().toISOString()
      });
    }
  }

  async getTask(
    request: FastifyRequest<{
      Params: { id: string };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const task = await this.taskService.getTask(request.params.id);
      if (!task) {
        reply.status(404).send({ 
          error: 'Task not found',
          timestamp: new Date().toISOString()
        });
        return;
      }
      reply.send(task);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage === 'Invalid task ID') {
        reply.status(400).send({ 
          error: errorMessage,
          timestamp: new Date().toISOString()
        });
      } else {
        reply.status(500).send({ 
          error: errorMessage,
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  async getTasks(
    request: FastifyRequest<{
      Querystring: { status?: TaskStatus };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const tasks = await this.taskService.getTasks(request.query.status);
      reply.send(tasks);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.status(500).send({ 
        error: errorMessage,
        timestamp: new Date().toISOString()
      });
    }
  }

  async updateTask(
    request: FastifyRequest<{
      Params: { id: string };
      Body: UpdateTaskData;
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const task = await this.taskService.updateTask(request.params.id, request.body);
      if (!task) {
        reply.status(404).send({ 
          error: 'Task not found',
          timestamp: new Date().toISOString()
        });
        return;
      }
      reply.send(task);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.status(400).send({ 
        error: errorMessage,
        timestamp: new Date().toISOString()
      });
    }
  }
} 