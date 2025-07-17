export interface AppConfig {
  server: {
    port: number;
    host: string;
    requestTimeout: number;
  };
  database: {
    mongodb: {
      uri: string;
      dbName: string;
    };
    rabbitmq: {
      url: string;
      exchangeName: string;
      queueName: string;
      routingKey: string;
    };
  };
  security: {
    cors: {
      origin: string;
      credentials: boolean;
    };
    rateLimit: {
      max: number;
      timeWindow: number;
    };
  };
  graphql: {
    path: string;
    playground: boolean;
    introspection: boolean;
  };
  api: {
    prefix: string;
  };
  logging: {
    level: string;
    file: string;
  };
}

export function getConfig(): AppConfig {
  return {
    server: {
      port: parseInt(process.env.PORT || '3000', 10),
      host: process.env.HOST || '0.0.0.0',
      requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || '30000', 10)
    },
    database: {
      mongodb: {
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/task-management',
        dbName: process.env.MONGODB_DB_NAME || 'task-management'
      },
      rabbitmq: {
        url: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
        exchangeName: process.env.RABBITMQ_EXCHANGE_NAME || 'task-exchange',
        queueName: process.env.RABBITMQ_QUEUE_NAME || 'task-queue',
        routingKey: process.env.RABBITMQ_ROUTING_KEY || 'task-actions'
      }
    },
    security: {
      cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        credentials: true
      },
      rateLimit: {
        max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
        timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10)
      }
    },
    graphql: {
      path: process.env.GRAPHQL_PATH || '/graphql',
      playground: process.env.GRAPHQL_PLAYGROUND === 'true',
      introspection: process.env.GRAPHQL_INTROSPECTION === 'true'
    },
    api: {
      prefix: process.env.API_PREFIX || '/api/v1'
    },
    logging: {
      level: process.env.LOG_LEVEL || 'info',
      file: process.env.LOG_FILE || 'logs/app.log'
    }
  };
} 