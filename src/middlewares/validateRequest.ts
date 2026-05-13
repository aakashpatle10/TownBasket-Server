import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ZodTypeAny } from "zod";

type ParsedRequest = {
  body?: Request["body"];
  cookies?: unknown;
  params?: Request["params"];
  query?: Request["query"];
};

const validateRequest = (schema: ZodTypeAny): RequestHandler => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = (await schema.parseAsync({
        body: req.body,
        cookies: req.cookies,
        params: req.params,
        query: req.query,
      })) as ParsedRequest;

      req.body = parsed.body ?? req.body;

      next();
    } catch (error) {
      next(error);
    }
  };
};

export default validateRequest;
