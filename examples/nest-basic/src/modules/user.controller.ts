import {
  TypedBody,
  TypedController,
  TypedParam,
  TypedQuery,
  TypedQueryObject,
  TypedRoute,
} from '@lonestone/nzoth/server'
import { users } from 'src/modules/user.data'
import { z } from 'zod'
import {
  UserCreate,
  UserCreateSchema,
  UserFiltering,
  userFilteringSchema,
  UserPagination,
  userPaginationSchema,
  UserSchema,
  UserSorting,
  userSortingSchema,
  UsersSchema,
  UserUpdate,
  UserUpdateSchema,
} from './user.contract'

@TypedController(
  'clients/:clientId/users',
  z.object({
    clientId: z.string().uuid(),
  }).meta({
    title: 'User',
    description: 'User schema',
  }),
  {
    tags: ['User',]
  }
)
export class UserController {
  @TypedRoute.Get('', UsersSchema)
  findAll(
    @TypedParam('clientId', z.string().uuid()) clientId: string,
    @TypedQuery('filter', userFilteringSchema, { optional: true }) filters?: UserFiltering,
    @TypedQueryObject(userPaginationSchema) pagination?: UserPagination,
    @TypedQuery('sort', userSortingSchema, { optional: true }) sort?: UserSorting,
  ) {
    let filteredUsers = users.filter(user => user.clientId === clientId)

    // Parse and apply filters
    if (filters) {
      
      // Apply basic filtering (example implementation)
      filters.forEach(filter => {
        if (filter.rule === 'eq' && filter.value) {
          filteredUsers = filteredUsers.filter(user => 
            (user as any)[filter.property]?.toString() === filter.value
          )
        }
        // Add more filter rules as needed
      })
    }

    // Parse and apply sorting
    if (sort) {
      const sortItems = sort.map(sortItem => ({ property: sortItem.property, direction: sortItem.direction }))
      
      // Apply sorting (example implementation)
      if (sortItems.length > 0) {
        filteredUsers.sort((a, b) => {
          for (const sortItem of sortItems) {
            const aVal = (a as any)[sortItem.property]
            const bVal = (b as any)[sortItem.property]
            const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
            if (comparison !== 0) {
              return sortItem.direction === 'desc' ? -comparison : comparison
            }
          }
          return 0
        })
      }
    }

    // Apply pagination if provided
    if (pagination) {
      const offset = pagination.offset
      filteredUsers = filteredUsers.slice(offset, offset + pagination.pageSize)
    }

    return filteredUsers
  }

  @TypedRoute.Get(':id', UserSchema)
  async findOne(
    @TypedParam('clientId', z.string().uuid()) clientId: string,
    @TypedParam('id', z.string().uuid()) id: string,
  ) {
    return users.find(user => user.id === id && user.clientId === clientId)
  }

  @TypedRoute.Post('', UserSchema)
  create(
    @TypedParam('clientId', z.string().uuid()) clientId: string,
    @TypedBody(UserCreateSchema) userData: UserCreate,
  ) {
    return {
      id: '123e4567-e89b-12d3-a456-426614174000',
      ...userData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      clientId,
    }
  }

  @TypedRoute.Put(':id', UserUpdateSchema)
  update(
    @TypedParam('clientId', z.string().uuid()) clientId: string,
    @TypedParam('id', z.string().uuid()) id: string,
    @TypedBody(UserUpdateSchema) userData: UserUpdate,
  ) {
    return {
      id,
      name: userData.name || 'John Doe',
      email: userData.email || 'john@example.com',
      role: userData.role || 'user',
      age: userData.age || 30,
      clientId: '123e4567-e89b-12d3-a456-426614174000',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }

  @TypedRoute.Delete(':id')
  remove(
    @TypedParam('clientId', z.string().uuid()) clientId: string,
    @TypedParam('id', z.string().uuid()) id: string,
  ) {
    return id
  }
}
