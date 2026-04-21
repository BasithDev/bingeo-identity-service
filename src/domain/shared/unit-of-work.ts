export interface IUnitOfWork {
  runInTransaction<T>(fn: (tx: unknown) => Promise<T>): Promise<T>;
}
