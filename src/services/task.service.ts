import { Task, TaskStatus } from '../models/task.model';
import { MongoDBService } from './mongodb.service';
import { RabbitMQService } from './rabbitmq.service';
import sanitizeHtml from 'sanitize-html';
import { ValidationError, NotFoundError } from '../types/errors';

export interface CreateTaskData {
  title: string;
  description?: string;
  dueDate: string;
  status?: string;
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  status?: string;
}

export class TaskService {
  private static readonly MAX_TITLE_LENGTH = 100;
  private static readonly MAX_DESCRIPTION_LENGTH = 500;

  constructor(
    private mongoService: MongoDBService,
    private rabbitmqService: RabbitMQService
  ) {}

  private sanitizeInput(input: string): string {
    // Удаляем все HTML-теги
    let clean = sanitizeHtml(input, {
      allowedTags: [],
      allowedAttributes: {},
      textFilter: (text) => {
        // Удаляем опасные паттерны (alert, javascript:, onerror=, onload=)
        return text.replace(/alert\s*\(|javascript:|onerror\s*=|onload\s*=/gi, '');
      }
    });

    // Строгая валидация: только буквы, цифры, пробелы и базовые знаки препинания
    if (/alert\s*\(|javascript:|onerror\s*=|onload\s*=/i.test(clean)) {
      throw new Error('Input contains forbidden patterns');
    }
    if (!/^[\w\s.,!?@#\-()\[\]{}:;"'«»–—]+$/u.test(clean)) {
      throw new Error('Input contains forbidden characters');
    }

    return clean.trim();
  }

  private validateTitle(title: string): void {
    if (!title || title.trim().length === 0) {
      throw new Error('Title is required');
    }
    if (title.length > TaskService.MAX_TITLE_LENGTH) {
      throw new Error(`Title too long (max ${TaskService.MAX_TITLE_LENGTH} characters)`);
    }
  }

  private validateDescription(description: string): void {
    if (description && description.length > TaskService.MAX_DESCRIPTION_LENGTH) {
      throw new Error(`Description too long (max ${TaskService.MAX_DESCRIPTION_LENGTH} characters)`);
    }
  }

  private validateDueDate(dueDate: string): void {
    const date = new Date(dueDate);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid due date format');
    }
  }

  private validateStatus(status: string): TaskStatus {
    const validStatuses = Object.values(TaskStatus);
    if (status && !validStatuses.includes(status as TaskStatus)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }
    return status as TaskStatus || TaskStatus.OPEN;
  }

  async createTask(taskData: CreateTaskData): Promise<Task> {
    // Валидация входных данных
    this.validateTitle(taskData.title);
    this.validateDueDate(taskData.dueDate);
    
    // Санитайзинг входных данных
    const sanitizedTitle = this.sanitizeInput(taskData.title);
    const sanitizedDescription = taskData.description 
      ? this.sanitizeInput(taskData.description)
      : '';

    this.validateDescription(sanitizedDescription);
    const status = this.validateStatus(taskData.status || '');

    const task: Omit<Task, '_id'> = {
      title: sanitizedTitle,
      description: sanitizedDescription,
      status,
      dueDate: new Date(taskData.dueDate)
    };

    const createdTask = await this.mongoService.createTask(task);
    
    // Публикуем событие в RabbitMQ
    try {
      await this.rabbitmqService.publishTaskCreated(createdTask._id!.toString());
    } catch (error) {
      console.error('Failed to publish task created event:', error);
      // Не прерываем создание задачи из-за ошибки RabbitMQ
    }
    
    return createdTask;
  }

  async getTask(id: string): Promise<Task | null> {
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid task ID');
    }
    return await this.mongoService.getTask(id);
  }

  async getTasks(status?: string): Promise<Task[]> {
    if (status) {
      this.validateStatus(status);
    }
    return await this.mongoService.getTasks(status);
  }

  async updateTask(id: string, updates: UpdateTaskData): Promise<Task | null> {
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid task ID');
    }

    // Санитайзинг обновлений
    const sanitizedUpdates: Partial<Task> = {};
    
    if (updates.title !== undefined) {
      this.validateTitle(updates.title);
      sanitizedUpdates.title = this.sanitizeInput(updates.title);
    }
    
    if (updates.description !== undefined) {
      this.validateDescription(updates.description);
      sanitizedUpdates.description = this.sanitizeInput(updates.description);
    }
    
    if (updates.status !== undefined) {
      sanitizedUpdates.status = this.validateStatus(updates.status);
    }

    const updatedTask = await this.mongoService.updateTask(id, sanitizedUpdates);
    
    if (updatedTask) {
      // Публикуем событие в RabbitMQ
      try {
        await this.rabbitmqService.publishTaskUpdated(id);
      } catch (error) {
        console.error('Failed to publish task updated event:', error);
        // Не прерываем обновление задачи из-за ошибки RabbitMQ
      }
    }
    
    return updatedTask;
  }
} 