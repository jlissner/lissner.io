/** Non-admins treat soft-deleted media as missing; admins may still view (recycle bin). */
export const canViewMediaRow = (
  item: { deletedAt?: string | null },
  isAdmin: boolean | undefined,
): boolean =>
  isAdmin === true || item.deletedAt == null || item.deletedAt === "";
