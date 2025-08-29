// modules/user.contract.ts

import {
  createFilterQueryStringSchema,
  createPaginationQuerySchema,
  createSortingQueryStringSchema,
  paginatedSchema,
} from '@lonestone/nzoth/server'
import { z } from 'zod'
import 'zod-openapi'

// With metadata support to edit role
export const UserRole = z.enum(['admin', 'user']).meta({
  title: 'UserRole',
  description: 'User role',
})

// Without openapi
export const UserTags = z.array(z.enum(['tag1', 'tag2', 'tag3']))

export const UserSchema = z
  .object({
    id: z.uuid(),
    name: z.string().min(2),
    email: z.email(),
    age: z.number().positive(),
    role: UserRole,
    tags: UserTags,
    clientId: z.uuid(),
  }).meta({
    title: 'User',
    description: 'User schema',
  })

export type User = z.infer<typeof UserSchema>

export const UsersSchema = paginatedSchema(UserSchema.omit({ id: true })).meta({
  title: 'Users paginated',
  description: 'Users paginated schema',
})

export type Users = z.infer<typeof UsersSchema>

export const UserCreateSchema = z
  .object({
    name: z.string().min(2),
    email: z.email(),
    age: z.number().positive(),
    role: UserRole,
    tags: UserTags,
  })
  .meta({
    title: 'UserCreate',
    description: 'User create schema',
  })

export type UserCreate = z.infer<typeof UserCreateSchema>

export const UserUpdateSchema = z
  .object({
    name: z.string().min(2),
    email: z.email(),
    age: z.number().positive(),
    role: UserRole,
    tags: UserTags,
  })
  .meta({
    title: 'UserUpdate',
    description: 'User update schema',
  })

export type UserUpdate = z.infer<typeof UserUpdateSchema>

export const enabledUserFilteringKeys = [
  'name',
  'email',
  'role',
  'tags',
  'clientId',
  'active',
] as const

// Create a simplified filtering schema compatible with zod-openapi
// This validates the format but doesn't transform to objects
export const userFilteringSchema = createFilterQueryStringSchema(enabledUserFilteringKeys)

export type UserFiltering = z.infer<typeof userFilteringSchema>

export const enabledUserSortingKeys = [
  'name',
  'email',
  'role',
  'tags',
  'createdAt',
  'updatedAt',
] as const

// Create a simplified sorting schema compatible with zod-openapi
// This validates the format but doesn't transform to objects
export const userSortingSchema = createSortingQueryStringSchema(enabledUserSortingKeys)

export type UserSorting = z.infer<typeof userSortingSchema>

// Use the proper pagination schema with zod-openapi
export const userPaginationSchema = createPaginationQuerySchema({
  defaultPageSize: 10,
  maxPageSize: 50,
  minPageSize: 1
})

export type UserPagination = z.infer<typeof userPaginationSchema>
