import { Request, Response, NextFunction } from "express";

export type AsyncRequestHandler<TReq = Request, TRes = Response> = (
  req: TReq,
  res: TRes,
  next: NextFunction
) => Promise<unknown> | unknown;

/**
 * Wraps async Express handlers and forwards caught errors to the next error middleware.
 */
export const asyncHandler = <TReq = Request, TRes = Response>(
  fn: AsyncRequestHandler<TReq, TRes>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req as unknown as TReq, res as unknown as TRes, next)).catch(next);
  };
};
