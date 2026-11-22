export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    title: string,
    public readonly detail: string,
  ) {
    super(title);
    this.name = "AppError";
  }
}
