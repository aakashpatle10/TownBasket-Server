export const SYSTEM_ROLES = {
  ADMIN: "admin",
  SELLER: "seller",
  BUYER: "buyer",
  DELIVERY: "delivery",
} as const;

export type SystemRole = (typeof SYSTEM_ROLES)[keyof typeof SYSTEM_ROLES];

export const PERMISSIONS = {
  ALL: "*",
  USER_CREATE: "user:create",
  USER_READ: "user:read",
  USER_UPDATE: "user:update",
  USER_DELETE: "user:delete",
  ROLE_CREATE: "role:create",
  ROLE_READ: "role:read",
  ROLE_UPDATE: "role:update",
  ROLE_DELETE: "role:delete",
  PERMISSION_CREATE: "permission:create",
  PERMISSION_READ: "permission:read",
  PERMISSION_UPDATE: "permission:update",
  PERMISSION_DELETE: "permission:delete",
  SELLER_ACCESS: "seller:access",
  BUYER_ACCESS: "buyer:access",
  DELIVERY_ACCESS: "delivery:access",
} as const;

export const DEFAULT_ROLE_PERMISSIONS: Record<SystemRole, string[]> = {
  [SYSTEM_ROLES.ADMIN]: [PERMISSIONS.ALL],
  [SYSTEM_ROLES.SELLER]: [PERMISSIONS.SELLER_ACCESS],
  [SYSTEM_ROLES.BUYER]: [PERMISSIONS.BUYER_ACCESS],
  [SYSTEM_ROLES.DELIVERY]: [PERMISSIONS.DELIVERY_ACCESS],
};

export const DEFAULT_PERMISSION_DESCRIPTIONS: Record<string, string> = {
  [PERMISSIONS.ALL]: "Full system access",
  [PERMISSIONS.USER_CREATE]: "Create users",
  [PERMISSIONS.USER_READ]: "Read users",
  [PERMISSIONS.USER_UPDATE]: "Update users",
  [PERMISSIONS.USER_DELETE]: "Delete users",
  [PERMISSIONS.ROLE_CREATE]: "Create roles",
  [PERMISSIONS.ROLE_READ]: "Read roles",
  [PERMISSIONS.ROLE_UPDATE]: "Update roles",
  [PERMISSIONS.ROLE_DELETE]: "Delete roles",
  [PERMISSIONS.PERMISSION_CREATE]: "Create permissions",
  [PERMISSIONS.PERMISSION_READ]: "Read permissions",
  [PERMISSIONS.PERMISSION_UPDATE]: "Update permissions",
  [PERMISSIONS.PERMISSION_DELETE]: "Delete permissions",
  [PERMISSIONS.SELLER_ACCESS]: "Access seller APIs",
  [PERMISSIONS.BUYER_ACCESS]: "Access buyer APIs",
  [PERMISSIONS.DELIVERY_ACCESS]: "Access delivery partner APIs",
};
