import * as amqp from 'amqplib';

export interface TaskAction {
  taskId: string;
  action: 'created' | 'updated';
  timestamp: string;
}

export class RabbitMQService {
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;
  private readonly exchangeName = 'task.exchange';
  private readonly queueName = 'task.actions';
  private readonly routingKey = 'task.action';

  constructor(private url: string) {}

  async connect(): Promise<void> {
    try {
      this.connection = await amqp.connect(this.url) as unknown as amqp.Connection;
      this.channel = await (this.connection as any).createChannel() as amqp.Channel;
      
      // Создаем Direct Exchange
      await this.channel.assertExchange(this.exchangeName, 'direct', { durable: true });
      
      // Создаем очередь
      await this.channel.assertQueue(this.queueName, { durable: true });
      
      // Привязываем очередь к Exchange с routing key
      await this.channel.bindQueue(this.queueName, this.exchangeName, this.routingKey);
      
      console.log('Connected to RabbitMQ');
    } catch (error) {
      console.error('Failed to connect to RabbitMQ:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await (this.connection as any).close();
      }
      console.log('Disconnected from RabbitMQ');
    } catch (error) {
      console.error('Error disconnecting from RabbitMQ:', error);
    }
  }

  async publishTaskAction(taskAction: TaskAction): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ not connected');
    }

    const message = JSON.stringify(taskAction);
    const success = this.channel.publish(
      this.exchangeName,
      this.routingKey,
      Buffer.from(message),
      { persistent: true }
    );

    if (!success) {
      throw new Error('Failed to publish message to RabbitMQ');
    }
    
    console.log(`Published task action: ${message}`);
  }

  async consumeTaskActions(callback: (taskAction: TaskAction) => void): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ not connected');
    }

    await this.channel.consume(this.queueName, (msg: amqp.Message | null) => {
      if (msg && this.channel) {
        try {
          const taskAction: TaskAction = JSON.parse(msg.content.toString());
          callback(taskAction);
          this.channel.ack(msg);
        } catch (error) {
          console.error('Error processing message:', error);
          this.channel.nack(msg, false, false);
        }
      }
    });

    console.log('Started consuming task actions');
  }

  async publishTaskCreated(taskId: string): Promise<void> {
    const taskAction: TaskAction = {
      taskId,
      action: 'created',
      timestamp: new Date().toISOString()
    };
    await this.publishTaskAction(taskAction);
  }

  async publishTaskUpdated(taskId: string): Promise<void> {
    const taskAction: TaskAction = {
      taskId,
      action: 'updated',
      timestamp: new Date().toISOString()
    };
    await this.publishTaskAction(taskAction);
  }

  async isConnected(): Promise<boolean> {
    try {
      return !!(this.connection && this.channel);
    } catch {
      return false;
    }
  }
} 