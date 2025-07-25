import {
  createFilterQueryStringSchema,
  createPaginationQuerySchema,
  createSortingQueryStringSchema,
  registerSchema,
  toOpenApi,
} from '@lonestone/nzoth/server'
import { z } from 'zod'

// With openapi support to edit role
export const UserRole = z.enum(['admin', 'user']).openapi({
  title: 'UserRole',
  description: 'User role',
  example: 'admin',
})

// Force register schema on swagger
registerSchema('UserRole', toOpenApi(UserRole))

// Without openapi
export const UserTags = z.array(z.string())

export const UserSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().min(2),
    email: z.string().email(),
    age: z.number().positive(),
    role: UserRole,
    tags: UserTags,
    clientId: z.string().uuid(),
  })
  .openapi({
    title: 'User',
    description: 'User schema',
  })

export type User = z.infer<typeof UserSchema>

export const UsersSchema = z.array(UserSchema.omit({ id: true })).openapi({
  title: 'Users',
  description: 'Users schema',
})

export type Users = z.infer<typeof UsersSchema>

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
  })

export type UserCreate = z.infer<typeof UserCreateSchema>

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
  })

export type UserUpdate = z.infer<typeof UserUpdateSchema>

export const enabledUserFilteringKeys = [
  'name',
  'email',
  'role',
  'tags',
] as const

export const userFilteringSchema = createFilterQueryStringSchema(
  enabledUserFilteringKeys,
).openapi({
  title: 'UserFiltering',
  description: 'User filtering schema',
})

export type UserFiltering = z.infer<typeof userFilteringSchema>

export const enabledUserSortingKeys = [
  'name',
  'email',
  'role',
  'tags',
] as const

export const userSortingSchema = createSortingQueryStringSchema(
  enabledUserSortingKeys,
).openapi({
  title: 'UserSorting',
  enum: enabledUserSortingKeys.map(key => `${key}:asc,${key}:desc`),
  example: 'name:asc,email:desc',
})

export type UserSorting = z.infer<typeof userSortingSchema>

export const userPaginationSchema = createPaginationQuerySchema({
  defaultPageSize: 10,
  maxPageSize: 100,
  minPageSize: 1,
}).openapi({
  title: 'UserPagination',
  description: 'User pagination schema',
})

export type UserPagination = z.infer<typeof userPaginationSchema>
