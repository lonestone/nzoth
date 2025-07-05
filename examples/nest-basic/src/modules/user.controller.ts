import {
  FilteringParams,
  PaginationParams,
  SortingParams,
  TypedBody,
  TypedController,
  TypedParam,
  TypedRoute,
} from '@lonestone/nzoth/server';
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
} from './user.contract';
import { users } from 'src/modules/user.data';
import { z } from 'zod';

@TypedController(
  '/:clientId/users',
  z.object({
    clientId: z.string().uuid(),
  }),
)
export class UserController {
  @TypedRoute.Get(undefined, UsersSchema)
  findAll(
    @TypedParam('clientId') clientId: string,
    @FilteringParams(userFilteringSchema) filters?: UserFiltering,
    @PaginationParams(userPaginationSchema) pagination?: UserPagination,
    @SortingParams(userSortingSchema) sort?: UserSorting,
  ) {
    let filteredUsers = users.filter((user) => user.clientId === clientId);

    if (filters) {
      filteredUsers = filteredUsers.filter((user) => {
        return filters.every((filter) => {
          return user[filter.property] === filter.value;
        });
      });
    }

    if (sort) {
      filteredUsers = filteredUsers.sort((a, b) => {
        for (const sortItem of sort) {
          const aValue = a[sortItem.property];
          const bValue = b[sortItem.property];
          if (sortItem.direction === 'asc') {
            if (typeof aValue === 'string' && typeof bValue === 'string') {
              return aValue.localeCompare(bValue);
            }
            return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
          }
          if (typeof aValue === 'string' && typeof bValue === 'string') {
            return bValue.localeCompare(aValue);
          }
          return bValue < aValue ? -1 : bValue > aValue ? 1 : 0;
        }
        return 0;
      });
    }

    if (pagination) {
      filteredUsers = filteredUsers.slice(
        pagination.offset,
        pagination.offset + pagination.pageSize,
      );
    }

    return filteredUsers;
  }

  @TypedRoute.Get(':id', UserSchema)
  async findOne(@TypedParam('id') id: string) {
    return users.find((user) => user.id === id);
  }

  @TypedRoute.Post('', UserSchema)
  create(
    @TypedParam('clientId') clientId: string,
    @TypedBody(UserCreateSchema) userData: UserCreate,
  ) {
    return {
      id: '123e4567-e89b-12d3-a456-426614174000',
      ...userData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      clientId,
    };
  }

  @TypedRoute.Put(':id', UserUpdateSchema)
  update(
    @TypedParam('id', 'uuid') id: string,
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
    };
  }

  @TypedRoute.Delete(':id')
  remove(@TypedParam('id', 'uuid') id: string) {
    return id;
  }
}
