/// <reference types="express" />

import type { AuthJwtPayload } from '../utils/jwtHelpers.js';

declare global {
  namespace Express {
    interface Request {
      user?: AuthJwtPayload;
    }
  }
}
