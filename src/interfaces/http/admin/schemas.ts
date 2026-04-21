import { z } from 'zod';

export const GetUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  plan: z.enum(['premium', 'basic', 'free']).optional(),
  sortBy: z.enum(['joinedAt', 'age', 'totalPaid', 'totalWatchHours', 'name']).default('joinedAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
});

export type GetUsersQuery = z.infer<typeof GetUsersQuerySchema>;
