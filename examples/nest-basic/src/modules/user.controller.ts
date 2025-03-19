import { Controller } from '@nestjs/common';
import {
  FilteringParams,
  PaginationParams,
  SortingParams,
  TypedBody,
  TypedParam,
  TypedRoute,
} from '@lonestone/nzoth/server';
import { UserCreate, UserCreateSchema, userFilteringSchema, userPaginationSchema, UserSchema, userSortingSchema, UsersSchema, UserUpdate, UserUpdateSchema } from './user.contract';

@Controller('users')
export class UserController {
  @TypedRoute.Get(undefined, UsersSchema)
  findAll(
    @FilteringParams(userFilteringSchema) filters?: any[],
    @PaginationParams(userPaginationSchema) pagination?: any,
    @SortingParams(userSortingSchema) sort?: any[],
  ) {
    // Implémentation fictive
    return [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'user',
        age: 30,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  }

  @TypedRoute.Get(':id', UserSchema)
  async findOne(
    @TypedParam("id") id: string,
  ) {
    // Implémentation fictive
    return {
      id,
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
      role: 'user',
    };
  }

  @TypedRoute.Post('', UserSchema)
  create(
    @TypedBody(UserCreateSchema) userData: UserCreate,
  ) {
    // Implémentation fictive
    return {
      id: '123e4567-e89b-12d3-a456-426614174000',
      ...userData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  @TypedRoute.Put(':id', UserUpdateSchema)
  update(
    @TypedParam('id', 'uuid') id: string,
    @TypedBody(UserUpdateSchema) userData: UserUpdate,
  ) {
    // Implémentation fictive
    return {
      id,
      name: userData.name || 'John Doe',
      email: userData.email || 'john@example.com',
      role: userData.role || 'user',
      age: userData.age || 30,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  @TypedRoute.Delete(':id')
  remove(@TypedParam('id', 'uuid') id: string) {
    // Implémentation fictive
    return id;
  }
}
