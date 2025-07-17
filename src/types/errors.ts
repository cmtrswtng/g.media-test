export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class DatabaseError extends Error {
  constructor(message: string, public readonly originalError?: Error) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class RabbitMQError extends Error {
  constructor(message: string, public readonly originalError?: Error) {
    super(message);
    this.name = 'RabbitMQError';
  }
} 