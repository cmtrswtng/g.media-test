import { TaskService } from '../services/task.service';
import { Resolvers } from './generated-types';
import { NotFoundError } from '../types/errors';

// Маппинг между GraphQL enum и REST API статусами
const statusMapping = {
  OPEN: 'открыта',
  IN_PROGRESS: 'в процессе',
  COMPLETED: 'завершена',
  EXPIRED: 'просрочена'
} as const;

const reverseStatusMapping = {
  'открыта': 'OPEN',
  'в процессе': 'IN_PROGRESS',
  'завершена': 'COMPLETED',
  'просрочена': 'EXPIRED'
} as const;

export function createResolvers(taskService: TaskService): Resolvers {
  return {
    Query: {
      getTask: async (_, { id }) => {
        const task = await taskService.getTask(id);
        if (!task) {
          throw new NotFoundError('Task not found');
        }
        return {
          id: task._id!.toString(),
          title: task.title,
          description: task.description,
          status: reverseStatusMapping[task.status as keyof typeof reverseStatusMapping] as never,
          dueDate: task.dueDate.toISOString()
        };
      },
      getTasks: async (_, { status }) => {
        const restStatus = status ? statusMapping[status as keyof typeof statusMapping] : undefined;
        const tasks = await taskService.getTasks(restStatus);
        return tasks.map(task => ({
          id: task._id!.toString(),
          title: task.title,
          description: task.description,
          status: reverseStatusMapping[task.status as keyof typeof reverseStatusMapping] as never,
          dueDate: task.dueDate.toISOString()
        }));
      }
    },
    Mutation: {
      createTask: async (_, { input }) => {
        const restStatus = input.status ? statusMapping[input.status as keyof typeof statusMapping] : undefined;
        const task = await taskService.createTask({
          title: input.title,
          description: input.description || '',
          dueDate: input.dueDate,
          status: restStatus
        });
        return {
          id: task._id!.toString(),
          title: task.title,
          description: task.description,
          status: reverseStatusMapping[task.status as keyof typeof reverseStatusMapping] as never,
          dueDate: task.dueDate.toISOString()
        };
      },
      updateTask: async (_, { id, input }) => {
        const restStatus = input.status ? statusMapping[input.status as keyof typeof statusMapping] : undefined;
        const task = await taskService.updateTask(id, {
          title: input.title ?? undefined,
          description: input.description ?? undefined,
          status: restStatus
        });
        if (!task) {
          throw new NotFoundError('Task not found');
        }
        return {
          id: task._id!.toString(),
          title: task.title,
          description: task.description,
          status: reverseStatusMapping[task.status as keyof typeof reverseStatusMapping] as never,
          dueDate: task.dueDate.toISOString()
        };
      }
    }
  };
} 