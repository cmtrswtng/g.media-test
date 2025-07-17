import { MongoClient, Db, Collection, ObjectId, IndexSpecification } from 'mongodb';
import { Task, TaskStatus } from '../models/task.model';

export class MongoDBService {
  private client: MongoClient;
  private db: Db | null = null;
  private collection: Collection<Task> | null = null;

  constructor(private uri: string, private dbName: string) {
    this.client = new MongoClient(uri);
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
      this.db = this.client.db(this.dbName);
      this.collection = this.db.collection<Task>('tasks');

      await this.createIndexes();

      console.log('Connected to MongoDB');
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  private async createIndexes(): Promise<void> {
    if (!this.collection) {
      throw new Error('Collection not initialized');
    }

    try {
      // 1. Составной индекс для поиска по статусу и дате выполнения
      await this.collection.createIndex(
        { status: 1, dueDate: 1 },
        {
          name: 'idx_status_dueDate',
          background: true,
          sparse: false
        }
      );

      // 2. Индекс для поиска по дате выполнения (для просроченных задач)
      await this.collection.createIndex(
        { dueDate: 1 },
        {
          name: 'idx_dueDate',
          background: true,
          sparse: false
        }
      );

      // 3. Текстовый индекс для поиска по заголовку и описанию
      await this.collection.createIndex(
        { title: 'text', description: 'text' },
        {
          name: 'idx_text_search',
          background: true,
          weights: {
            title: 10,      // Заголовок имеет больший вес
            description: 5   // Описание имеет меньший вес
          }
        }
      );

      // 4. Индекс для поиска по заголовку
      await this.collection.createIndex(
        { title: 1 },
        {
          name: 'idx_title',
          background: true,
          sparse: false
        }
      );

      // 5. Индекс для отслеживания времени создания/обновления
      await this.collection.createIndex(
        { createdAt: -1 },
        {
          name: 'idx_createdAt',
          background: true,
          sparse: false
        }
      );

      console.log('MongoDB indexes created successfully');
    } catch (error) {
      console.error('Failed to create indexes:', error);
      // Не прерываем подключение, если индексы не создались
    }
  }

  async disconnect(): Promise<void> {
    await this.client.close();
    console.log('Disconnected from MongoDB');
  }

  async isConnected(): Promise<boolean> {
    try {
      if (!this.client) return false;
      // Проверяем соединение через ping
      await this.client.db().command({ ping: 1 });
      return true;
    } catch {
      return false;
    }
  }

  getCollection(): Collection<Task> {
    if (!this.collection) {
      throw new Error('MongoDB not connected');
    }
    return this.collection;
  }

  async createTask(task: Omit<Task, '_id'>): Promise<Task> {
    const collection = this.getCollection();

    const taskWithMetadata = {
      ...task,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1
    };

    const result = await collection.insertOne(taskWithMetadata);
    return { ...taskWithMetadata, _id: result.insertedId.toString() };
  }

  async getTask(id: string): Promise<Task | null> {
    const collection = this.getCollection();
    
    // Валидация ObjectId
    if (!ObjectId.isValid(id)) {
      return null;
    }
    
    const task = await collection.findOne(
      { _id: new ObjectId(id) },
      { projection: { version: 0 } } // Исключаем служебные поля
    );
    return task ? { ...task, _id: task._id.toString() } : null;
  }

  async getTasks(status?: string): Promise<Task[]> {
    const collection = this.getCollection();
    const filter = status ? { status: status as TaskStatus } : {};

    const tasks = await collection.find(
      filter,
      {
        projection: { version: 0 },
        sort: { createdAt: -1 } // Сортировка по дате создания
      }
    ).toArray();

    return tasks.map(task => ({ ...task, _id: task._id.toString() }));
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
    const collection = this.getCollection();
    
    // Валидация ObjectId
    if (!ObjectId.isValid(id)) {
      return null;
    }
    
    // Добавляем метаданные обновления
    const updateData = {
      ...updates,
      updatedAt: new Date()
    };

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $set: updateData,
        $inc: { version: 1 } // Увеличиваем версию документа
      },
      {
        returnDocument: 'after',
        projection: { version: 0 }
      }
    );
    return result ? { ...result, _id: result._id.toString() } : null;
  }

  // Дополнительные методы для оптимизированного поиска

  async getTasksByStatus(status: TaskStatus): Promise<Task[]> {
    const collection = this.getCollection();

    const tasks = await collection.find(
      { status },
      {
        projection: { version: 0 },
        sort: { createdAt: -1 }
      }
    ).toArray();

    return tasks.map(task => ({ ...task, _id: task._id.toString() }));
  }

  async getOverdueTasks(): Promise<Task[]> {
    const collection = this.getCollection();

    const tasks = await collection.find(
      {
        status: { $in: [TaskStatus.OPEN, TaskStatus.IN_PROGRESS] },
        dueDate: { $lt: new Date() }
      },
      {
        projection: { version: 0 },
        sort: { dueDate: 1 }
      }
    ).toArray();

    return tasks.map(task => ({ ...task, _id: task._id.toString() }));
  }

  async searchTasks(query: string): Promise<Task[]> {
    const collection = this.getCollection();

    const tasks = await collection.find(
      { $text: { $search: query } },
      {
        projection: { version: 0, score: { $meta: 'textScore' } },
        sort: { score: { $meta: 'textScore' } }
      }
    ).toArray();

    return tasks.map(task => ({ ...task, _id: task._id.toString() }));
  }

  async getTasksByDateRange(startDate: Date, endDate: Date): Promise<Task[]> {
    const collection = this.getCollection();

    const tasks = await collection.find(
      {
        dueDate: {
          $gte: startDate,
          $lte: endDate
        }
      },
      {
        projection: { version: 0 },
        sort: { dueDate: 1 }
      }
    ).toArray();

    return tasks.map(task => ({ ...task, _id: task._id.toString() }));
  }

  // Метод для получения статистики
  async getTaskStats(): Promise<{
    total: number;
    byStatus: Partial<Record<TaskStatus, number>>;
    overdue: number;
  }> {
    const collection = this.getCollection();

    const [total, byStatus, overdue] = await Promise.all([
      collection.countDocuments(),
      collection.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]).toArray(),
      collection.countDocuments({
        status: { $in: [TaskStatus.OPEN, TaskStatus.IN_PROGRESS] },
        dueDate: { $lt: new Date() }
      })
    ]);

    const statusStats = byStatus.reduce((acc, item) => {
      acc[item._id as TaskStatus] = item.count;
      return acc;
    }, {} as Partial<Record<TaskStatus, number>>);

    return {
      total,
      byStatus: statusStats,
      overdue
    };
  }
} 