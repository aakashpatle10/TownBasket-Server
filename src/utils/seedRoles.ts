import { DEFAULT_PERMISSION_DESCRIPTIONS, DEFAULT_ROLE_PERMISSIONS } from "../constants/permissions.js";
import { Permission } from "../modules/permission/permission.model.js";
import { Role } from "../modules/role/role.model.js";

export const seedRoles = async (): Promise<void> => {
  const permissionNames = Object.keys(DEFAULT_PERMISSION_DESCRIPTIONS);

  await Promise.all(
    permissionNames.map((name) => {
      return Permission.updateOne(
        { name },
        {
          $setOnInsert: {
            name,
            description: DEFAULT_PERMISSION_DESCRIPTIONS[name],
          },
        },
        { upsert: true }
      );
    })
  );

  const permissions = await Permission.find({ name: { $in: permissionNames } }).select("_id name").lean();
  const permissionByName = new Map(permissions.map((permission) => [permission.name, permission._id]));

  await Promise.all(
    Object.entries(DEFAULT_ROLE_PERMISSIONS).map(([roleName, rolePermissions]) => {
      const permissionIds = rolePermissions
        .map((permissionName) => permissionByName.get(permissionName))
        .filter((permissionId): permissionId is NonNullable<typeof permissionId> => Boolean(permissionId));

      return Role.updateOne(
        { name: roleName },
        {
          $set: {
            permissions: permissionIds,
            isSystemRole: true,
          },
        },
        { upsert: true }
      );
    })
  );
};
