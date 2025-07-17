import pino, { Logger as PinoLogger } from 'pino';
import { ILogger } from '../types/logger.interface';

export class LoggerService implements ILogger {
  private logger: PinoLogger;

  constructor(pinoInstance?: PinoLogger) {
    this.logger = pinoInstance || pino();
  }

  info(message: string, ...args: unknown[]): void {
    if (args.length === 0) {
      this.logger.info(message);
    } else {
      this.logger.info({ extra: args.length === 1 ? args[0] : args }, message);
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (args.length === 1 && args[0] instanceof Error) {
      this.logger.error({ err: args[0] }, message);
    } else if (args.length > 0) {
      this.logger.error({ extra: args.length === 1 ? args[0] : args }, message);
    } else {
      this.logger.error(message);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (args.length === 0) {
      this.logger.warn(message);
    } else {
      this.logger.warn({ extra: args.length === 1 ? args[0] : args }, message);
    }
  }

  debug(message: string, ...args: unknown[]): void {
    if (args.length === 0) {
      this.logger.debug(message);
    } else {
      this.logger.debug({ extra: args.length === 1 ? args[0] : args }, message);
    }
  }
} 