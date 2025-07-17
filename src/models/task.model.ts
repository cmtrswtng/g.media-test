export enum TaskStatus {
  OPEN = 'открыта',
  IN_PROGRESS = 'в процессе',
  COMPLETED = 'завершена',
  EXPIRED = 'просрочена',
}

import { ObjectId } from 'mongodb';

export interface Task {
  _id?: string | ObjectId;
  title: string;
  description: string;
  status: TaskStatus;
  dueDate: Date;
} 