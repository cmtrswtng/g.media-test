import 'dotenv/config';
import Fastify, { FastifyInstance } from 'fastify';
import { ApolloServer, BaseContext } from '@apollo/server';
import { fastifyApolloHandler } from '@as-integrations/fastify';
import { readFileSync } from 'fs';
import { join } from 'path';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import pinoPretty from 'pino-pretty';
import { multistream } from 'pino';

import { MongoDBService } from './services/mongodb.service';
import { RabbitMQService } from './services/rabbitmq.service';
import { TaskService } from './services/task.service';
import { TaskController } from './controllers/task.controller';
import { createResolvers } from './graphql/resolvers';
import { taskRoutes } from './routes/task.routes';
import { getConfig } from './config/app.config';
import { LoggerService } from './services/logger.service';
import { ILogger } from './types/logger.interface';

// Получаем конфигурацию приложения
const config = getConfig();

// Создаём поток для записи логов в файл
const logFilePath = path.resolve(config.logging.file);
fs.mkdirSync(path.dirname(logFilePath), { recursive: true });
const logFileStream = fs.createWriteStream(logFilePath, { flags: 'a' });

// Поток для консоли с красивым форматированием
const prettyStream = pinoPretty({
  colorize: true,
  translateTime: 'yyyy-mm-dd HH:MM:ss.l',
  singleLine: false,
  messageFormat: (log, messageKey, levelLabel) => {
    const message = log.msg || log.message || log[messageKey] || '';

    let msg = `${message}`;
    if (log.err) {
      const err = log.err as Error;
      msg += `\n  Ошибка: ${err.message}`;
      if (err.stack) msg += `\n  Stack: ${err.stack}`;
    }
    if (log.extra) {
      msg += `\n  Дополнительно: ${JSON.stringify(log.extra, null, 2)}`;
    }
    return msg;
  }
});

// Мультистрим: в консоль красиво, в файл — json
const streams = [
  { stream: prettyStream },
  { stream: logFileStream }
];

const multiStream = multistream(streams);

const pinoInstance = pino({
  level: config.logging.level,
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label: string) => ({ level: label })
  },
  messageKey: 'message',
  base: undefined,
  redact: ['req.headers.authorization'],
  serializers: {
    ...pino.stdSerializers,
    err: pino.stdSerializers.err
  }
}, multiStream);

const logger: ILogger = new LoggerService(pinoInstance);

class Application {
  private fastify: FastifyInstance;
  private mongoService: MongoDBService;
  private rabbitmqService: RabbitMQService;
  private taskService: TaskService;
  private taskController: TaskController;
  private logger: ILogger;

  constructor() {
    this.logger = logger;
    this.fastify = Fastify({
      logger: {
        level: config.logging.level,
        stream: multiStream
      },
      trustProxy: true,
      requestTimeout: config.server.requestTimeout
    });

    // Инициализация сервисов с использованием конфигурации
    this.mongoService = new MongoDBService(
      config.database.mongodb.uri,
      config.database.mongodb.dbName,
      this.logger
    );
    
    this.rabbitmqService = new RabbitMQService(
      config.database.rabbitmq.url,
      this.logger
    );
    
    this.taskService = new TaskService(this.mongoService, this.rabbitmqService, this.logger);
    this.taskController = new TaskController(this.taskService);
  }

  async start(): Promise<void> {
    try {
      // Настройка CORS
      await this.fastify.register(import('@fastify/cors'), {
        origin: config.security.cors.origin,
        credentials: config.security.cors.credentials
      });

      // Настройка Rate Limiting
      await this.fastify.register(import('@fastify/rate-limit'), {
        max: config.security.rateLimit.max,
        timeWindow: config.security.rateLimit.timeWindow
      });

      // Настройка обработчика ошибок валидации
      this.fastify.setErrorHandler((error, request, reply) => {
        // Обработка ошибок валидации схемы
        if (error.validation || error.statusCode === 400) {
          const validationErrors = error.validation || [];
          let errorMessage = 'Validation error';
          
          if (validationErrors.length > 0) {
            const err = validationErrors[0];
            if (err.instancePath === '/body/title' && err.keyword === 'minLength') {
              errorMessage = 'Title is required';
            } else if (err.instancePath === '/body/title' && err.keyword === 'maxLength') {
              errorMessage = 'Title too long (max 100 characters)';
            } else if (err.instancePath === '/body/dueDate' && err.keyword === 'format') {
              errorMessage = 'Invalid due date format';
            } else if (err.instancePath === '/body/status' && err.keyword === 'enum') {
              errorMessage = 'Invalid status. Must be one of: открыта, в работе, завершена, отменена';
            } else if (err.message) {
              errorMessage = err.message;
            }
          }
          
          reply.status(400).send({
            error: errorMessage,
            timestamp: new Date().toISOString()
          });
          return;
        }
        
        // Обработка других ошибок
        this.logger.error('Unhandled error:', error);
        reply.status(500).send({
          error: 'Internal server error',
          timestamp: new Date().toISOString()
        });
      });

      // Подключение к базам данных
      await this.mongoService.connect();
      await this.rabbitmqService.connect();

      // Настройка потребителя RabbitMQ
      await this.rabbitmqService.consumeTaskActions((taskAction: { taskId: string; action: string; timestamp: string }) => {
        this.logger.info(`Task ${taskAction.taskId} was ${taskAction.action} at ${taskAction.timestamp}`);
      });

      // Настройка GraphQL
      const typeDefs = readFileSync(join(__dirname, 'graphql/schema.graphql'), 'utf8');
      const resolvers = createResolvers(this.taskService);
      
      const apollo = new ApolloServer<BaseContext>({
        typeDefs,
        resolvers,
        formatError: (error) => {
          this.logger.error('GraphQL Error:', error);
          return {
            message: error.message,
            path: error.path
          };
        }
      });

      await apollo.start();

      // Регистрация GraphQL handler
      this.fastify.route({
        url: config.graphql.path,
        method: ['POST', 'OPTIONS'],
        handler: fastifyApolloHandler(apollo as ApolloServer<BaseContext>)
      });

      // Эндпоинт /health
      this.fastify.get('/health', async (request, reply) => {
        const [mongodbConnected, rabbitmqConnected] = await Promise.all([
          this.mongoService.isConnected(),
          this.rabbitmqService.isConnected()
        ]);
        
        return {
          status: 'ok',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          environment: process.env.NODE_ENV || 'development',
          mongodb: mongodbConnected,
          rabbitmq: rabbitmqConnected
        };
      });

      // Регистрация REST роутов
      await taskRoutes(this.fastify, this.taskController);

      // Graceful shutdown handlers
      this.setupGracefulShutdown();

      // Запуск сервера
      await this.fastify.listen({
        port: config.server.port,
        host: config.server.host
      });
      
      this.logger.info(`Server is running on http://${config.server.host}:${config.server.port}`);
      this.logger.info(`REST API: http://${config.server.host}:${config.server.port}${config.api.prefix}`);
      this.logger.info(`GraphQL endpoint: http://${config.server.host}:${config.server.port}${config.graphql.path}`);
      this.logger.info('Environment:', process.env.NODE_ENV || 'development');
      
    } catch (error) {
      this.logger.error('Failed to start server:', error);
      if (error instanceof Error) {
        this.logger.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      }
      await this.shutdown();
      process.exit(1);
    }
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      this.logger.info(`Received ${signal}. Starting graceful shutdown...`);
      
      try {
        await this.shutdown();
        this.logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        this.logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught Exception:', error);
      shutdown('uncaughtException');
    });
    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      shutdown('unhandledRejection');
    });
  }

  private async shutdown(): Promise<void> {
    try {
      // Закрываем Fastify
      if (this.fastify) {
        await this.fastify.close();
      }
      
      // Закрываем соединения с базами данных
      if (this.rabbitmqService) {
        await this.rabbitmqService.disconnect();
      }
      
      if (this.mongoService) {
        await this.mongoService.disconnect();
      }
      
    } catch (error) {
      this.logger.error('Error during shutdown:', error);
    }
  }
}

// Запуск приложения
const app = new Application();
app.start().catch((error) => {
  logger.error('Failed to start application:', error);
  process.exit(1);
}); 