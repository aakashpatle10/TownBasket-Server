import type { Request } from 'express';

/**
 * Safely extracts a route parameter as a string
 * @param req - Express Request object
 * @param param - Parameter name to extract
 * @returns Parameter value as string
 * @throws Error if parameter is not a string
 */
export const getRouteParam = (req: Request, param: string): string => {
  const value = req.params[param];
  if (Array.isArray(value)) {
    throw new Error(`Route parameter '${param}' cannot be an array`);
  }
  if (!value) {
    throw new Error(`Route parameter '${param}' is required`);
  }
  return value;
};
