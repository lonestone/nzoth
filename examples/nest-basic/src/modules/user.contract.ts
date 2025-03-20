import { z } from 'zod';
import {
  registerSchema,
  toOpenApi,
  createFilterQueryStringSchema,
  createSortingQueryStringSchema,
  createPaginationQuerySchema,
} from '@lonestone/nzoth/server';

// With openapi support to edit role
export const UserRole = z.enum(['admin', 'user']).openapi({
  title: 'UserRole',
  description: 'User role',
  example: 'admin',
});

// Force register schema on swagger
registerSchema('UserRole', toOpenApi(UserRole));

// Without openapi
export const UserTags = z.array(z.string());

export const UserSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().min(2),
    email: z.string().email(),
    age: z.number().positive(),
    role: UserRole,
    tags: UserTags,
  })
  .openapi({
    title: 'User',
    description: 'User schema',
  });

export type User = z.infer<typeof UserSchema>;

export const UsersSchema = z.array(UserSchema.omit({ id: true })).openapi({
  title: 'Users',
  description: 'Users schema',
});

export type Users = z.infer<typeof UsersSchema>;

export const UserCreateSchema = z
  .object({
    name: z.string().min(2),
    email: z.string().email(),
    age: z.number().positive(),
    role: UserRole,
    tags: UserTags,
  })
  .openapi({
    title: 'UserCreate',
    description: 'User create schema',
  });

export type UserCreate = z.infer<typeof UserCreateSchema>;

export const UserUpdateSchema = z
  .object({
    name: z.string().min(2),
    email: z.string().email(),
    age: z.number().positive(),
    role: UserRole,
    tags: UserTags,
  })
  .openapi({
    title: 'UserUpdate',
    description: 'User update schema',
  });

export type UserUpdate = z.infer<typeof UserUpdateSchema>;

export const enabledUserFilteringKeys = [
  'name',
  'email',
  'role',
  'tags',
] as const;

export const userFilteringSchema = createFilterQueryStringSchema(
  enabledUserFilteringKeys,
);

export type UserFiltering = z.infer<typeof userFilteringSchema>;

export const enabledUserSortingKeys = ['name', 'email', 'role', 'tags'] as const;

export const userSortingSchema = createSortingQueryStringSchema(
  enabledUserSortingKeys,
);

export type UserSorting = z.infer<typeof userSortingSchema>;

export const userPaginationSchema = createPaginationQuerySchema({
  defaultPageSize: 10,
  maxPageSize: 100,
  minPageSize: 1,
});

export type UserPagination = z.infer<typeof userPaginationSchema>;
