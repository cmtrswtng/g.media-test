import { MongoClient, Db, Collection, ObjectId } from 'mongodb';
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
      console.log('Connected to MongoDB');
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      throw error;
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
    const result = await collection.insertOne(task);
    return { ...task, _id: result.insertedId.toString() };
  }

  async getTask(id: string): Promise<Task | null> {
    const collection = this.getCollection();
    
    // Валидация ObjectId
    if (!ObjectId.isValid(id)) {
      return null;
    }
    
    const task = await collection.findOne({ _id: new ObjectId(id) });
    return task ? { ...task, _id: task._id.toString() } : null;
  }

  async getTasks(status?: string): Promise<Task[]> {
    const collection = this.getCollection();
    const filter = status ? { status: status as TaskStatus } : {};
    const tasks = await collection.find(filter).toArray();
    return tasks.map(task => ({ ...task, _id: task._id.toString() }));
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
    const collection = this.getCollection();
    
    // Валидация ObjectId
    if (!ObjectId.isValid(id)) {
      return null;
    }
    
    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updates },
      { returnDocument: 'after' }
    );
    return result ? { ...result, _id: result._id.toString() } : null;
  }
} 