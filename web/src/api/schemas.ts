import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  avatar: z.string().optional(),
  role: z.string().optional(),
  is_superuser: z.boolean().optional(),
  permissions: z.array(z.string()),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type User = z.infer<typeof UserSchema>;

export const AuthTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});
export type AuthTokens = z.infer<typeof AuthTokensSchema>;

export const LoginRequestSchema = z.object({
  username: z.string(),
  password: z.string(),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

interface MenuItem {
  key: string;
  label: string;
  icon?: string;
  path?: string;
  permissions?: string[];
  children?: MenuItem[];
}

export const MenuItemSchema: z.ZodType<MenuItem> = z.object({
  key: z.string(),
  label: z.string(),
  icon: z.string().optional(),
  path: z.string().optional(),
  permissions: z.array(z.string()).optional(),
  children: z.lazy(() => z.array(MenuItemSchema)).optional(),
});

export type { MenuItem };

export const PaginatedResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
  });
export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};

export const CreateUserRequestSchema = z.object({
  name: z.string(),
  email: z.string(),
  password: z.string(),
  is_superuser: z.boolean().optional(),
});
export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;

export const UpdateUserRequestSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  is_superuser: z.boolean().optional(),
});
export type UpdateUserRequest = z.infer<typeof UpdateUserRequestSchema>;
