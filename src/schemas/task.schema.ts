import { FastifySchema } from 'fastify';
import { TaskStatus } from '../models/task.model';

export const taskStatusEnum = Object.values(TaskStatus);

export const createTaskSchema: FastifySchema = {
  body: {
    type: 'object',
    required: ['title', 'dueDate'],
    properties: {
      title: {
        type: 'string',
        minLength: 1,
        maxLength: 100
      },
      description: {
        type: 'string',
        maxLength: 500
      },
      dueDate: {
        type: 'string',
        format: 'date-time'
      },
      status: {
        type: 'string',
        enum: taskStatusEnum
      }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        _id: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        status: { type: 'string' },
        dueDate: { type: 'string', format: 'date-time' }
      }
    }
  }
};

export const updateTaskSchema: FastifySchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string' }
    }
  },
  body: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        minLength: 1,
        maxLength: 100
      },
      description: {
        type: 'string',
        maxLength: 500
      },
      status: {
        type: 'string',
        enum: taskStatusEnum
      }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        _id: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        status: { type: 'string' },
        dueDate: { type: 'string', format: 'date-time' }
      }
    }
  }
};

export const getTaskSchema: FastifySchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string' }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        _id: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        status: { type: 'string' },
        dueDate: { type: 'string', format: 'date-time' }
      }
    }
  }
};

export const getTasksSchema: FastifySchema = {
  querystring: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        enum: taskStatusEnum
      }
    }
  },
  response: {
    200: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          status: { type: 'string' },
          dueDate: { type: 'string', format: 'date-time' }
        }
      }
    }
  }
}; 