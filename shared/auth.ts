export type AdminRole = "admin";

export type RoleMetadata = {
  role?: AdminRole | null;
};

export type RoleMetadataContainer = {
  publicMetadata?: RoleMetadata;
  privateMetadata?: RoleMetadata;
};

export function getRoleFromMetadata(meta?: RoleMetadata): AdminRole | null {
  return meta?.role === "admin" ? "admin" : null;
}

export function getUserRoleFromMetadata(user?: RoleMetadataContainer | null): AdminRole | null {
  if (!user) return null;

  const privateRole = getRoleFromMetadata(user.privateMetadata);
  if (privateRole) return privateRole;

  const publicRole = getRoleFromMetadata(user.publicMetadata);
  return publicRole ?? null;
}

export function isAdminUser(user?: RoleMetadataContainer | null): boolean {
  return getUserRoleFromMetadata(user) === "admin";
}
