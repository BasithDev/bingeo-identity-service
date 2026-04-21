import type { GetUsersUseCase } from '@application/usecases/admin/get-users.usecase';
import type { ToggleUserBlockUseCase } from '@application/usecases/admin/toggle-user-block.usecase';
import type { Request, Response } from 'express';
import { HttpStatus } from '../constants/http-status.enum';
import { GetUsersQuerySchema } from './schemas';

export class AdminController {
  constructor(
    private readonly getUsersUC: GetUsersUseCase,
    private readonly toggleUserBlockUC: ToggleUserBlockUseCase,
  ) {}

  getUsers = async (req: Request, res: Response): Promise<void> => {
    const query = GetUsersQuerySchema.parse(req.query);
    const result = await this.getUsersUC.execute(query);
    res.status(HttpStatus.OK).json(result);
  };

  toggleBlock = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { isBlocked } = await this.toggleUserBlockUC.execute(id as string);
    res.status(HttpStatus.OK).json({
      message: `User ${isBlocked ? 'blocked' : 'unblocked'} successfully`,
      isBlocked,
    });
  };
}
