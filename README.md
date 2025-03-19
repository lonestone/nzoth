# 🐙 @lonestone - NZOTH

**NZOTH**: **N**est + **Z**od + **O**penAPI + **T**yped + **H**elpers
(pronounced "n'zoth")

A collection of NestJS utilities for building RESTful APIs with support for filtering, pagination, sorting, type-safe request/response validation, and OpenAPI schema registration using Zod. Allows registering Zod schemas with OpenAPI metadata for automatic documentation generation.

# Why NZOTH?

NZOTH combines the best of all worlds:
- **N**estJS: The progressive Node.js framework for building efficient, reliable, and scalable server-side applications
- **Z**od: TypeScript-first schema validation with static type inference
- **O**penAPI: Automated API documentation that stays in sync with your code
- **T**yped: End-to-end type safety from your routes to your controllers to your clients
- **H**elpers: A comprehensive collection of utilities for filtering, pagination, sorting, and more

Our goal is to provide a type-safe API solution that's easy to use while still being compatible with various languages and tools. NZOTH offers a simple yet powerful alternative to solutions like tRPC and GraphQL for projects that need REST APIs with strong typing.

We aimed to keep things simple, with the following goals:

- Things should be as type-safe as possible;
- It should allow developers to follow the code as much as possible (ctrl+click on a DTO should bring them to the implementation);
- It should be easy to use in a monorepo environment;
- It should provide a standard way to paginate, filter and sort data;
- It should allow for data validation, input and output;
- It should help to get a CRUD API up and running quickly;
- It should be able to generate OpenAPI documentation from your Zod schemas, without modifying NestJS Swagger behavior;
- In general, it should be as unobtrusive as possible.

# Features

- ✅ **Validation**: Comprehensive Zod-based validation for requests and responses
- 🎯 **Decorators**: Decorators to validate route response, parameters, query params, and body
- 🔍 **Filtering**: Flexible query parameter-based filtering with multiple operators
- 📄 **Pagination**: Easy-to-use pagination with offset and page size
- 🔃 **Sorting**: Multi-field sorting with ascending/descending support
- 📄 **OpenAPI**: Automatically generate OpenAPI documentation from your Zod schemas, without modifying NestJS Swagger behavior

# Installation

```bash
npm install @lonestone/nzoth
# or
yarn add @lonestone/nzoth
# or
pnpm add @lonestone/nzoth
```

# Type safety and validation

## Schema Definition

First, define your schemas using `zOpenApi` (which adds OpenAPI metadata support to Zod):

```typescript
// Define an enum with OpenAPI metadata
export const UserRole = zOpenApi.enum(['admin', 'user']).openapi({
  title: 'UserRole',
  description: 'User role',
  example: 'admin',
});

// Define the main schema with OpenAPI metadata
export const UserSchema = zOpenApi.object({
  id: z.string().uuid(),
  name: z.string().min(2),
  email: z.string().email(),
  age: z.number().positive(),
  role: UserRole,
  tags: z.array(z.string())
}).openapi({
  title: 'User',
  description: 'User schema',
});

// Create derived schemas
export const UserCreateSchema = zOpenApi.openapi(UserSchema.omit({ id: true }), {
  title: 'UserCreate',
  description: 'User create schema',
});

export const UserUpdateSchema = zOpenApi.openapi(UserSchema.omit({ id: true }), {
  title: 'UserUpdate',
  description: 'User update schema',
});

// Export types
export type User = z.infer<typeof UserSchema>;
export type UserCreate = z.infer<typeof UserCreateSchema>;
export type UserUpdate = z.infer<typeof UserUpdateSchema>;
```

## Route Validation

Use `TypedRoute` decorators to validate response data:

```typescript
@Controller('users')
class UserController {
  @TypedRoute.Get(undefined, UsersSchema)
  findAll(
    @FilteringParams(userFilteringSchema) filters?: any[],
    @PaginationParams(userPaginationSchema) pagination?: any,
    @SortingParams(userSortingSchema) sort?: any[],
  ): User[] {
    // Response will be validated against UsersSchema
    return this.userService.findAll(filters, pagination, sort);
  }

  @TypedRoute.Get(':id', UserSchema)
  findOne(@TypedParam('id', 'uuid') id: string): User {
    // Response will be validated against UserSchema
    return this.userService.findOne(id);
  }

  @TypedRoute.Post('', UserSchema)
  create(@TypedBody(UserCreateSchema) userData: UserCreate): User {
    // Request body validated against UserCreateSchema
    // Response validated against UserSchema
    return this.userService.create(userData);
  }

  @TypedRoute.Put(':id', UserUpdateSchema)
  update(
    @TypedParam('id', 'uuid') id: string,
    @TypedBody(UserUpdateSchema) userData: UserUpdate
  ): User {
    // Both request and response are validated
    return this.userService.update(id, userData);
  }

  @TypedRoute.Delete(':id')
  remove(@TypedParam('id', 'uuid') id: string) {
    return this.userService.remove(id);
  }
}
```

## Filtering, Pagination, and Sorting

Define your filtering, pagination, and sorting schemas:

```typescript
// Filtering
export const enabledUserFilteringKeys = [
  "name",
  "email",
  "role",
  "tags",
] as const;

export const userFilteringSchema = createFilterQueryStringSchema(
  enabledUserFilteringKeys
);

// Sorting
export const enabledUserSortingKeys = [
  "name",
  "email",
  "role",
  "tags",
];

export const userSortingSchema = createSortingQueryStringSchema(
  enabledUserSortingKeys
);

// Pagination
export const userPaginationSchema = createPaginationQuerySchema({
  defaultPageSize: 10,
  maxPageSize: 100,
  minPageSize: 1,
});

export type UserPagination = z.infer<typeof userPaginationSchema>;
```

### Filtering

Supported filter rules:
- `eq` - Equals
- `neq` - Not equals
- `gt` - Greater than
- `gte` - Greater than or equals
- `lt` - Less than
- `lte` - Less than or equals
- `like` - Like (string pattern matching)
- `nlike` - Not like
- `in` - In array
- `nin` - Not in array
- `isnull` - Is null
- `isnotnull` - Is not null

Query parameter format: `?filter=property:rule:value`

Example: `/users?filter=name:eq:john;age:gt:18`

### Pagination

Query parameter format: `?offset=0&pageSize=10`

The response will be wrapped in a paginated format:

```typescript
interface PaginatedResponse<T> {
  data: T[]
  meta: {
    offset: number
    pageSize: number
    itemCount: number
    hasMore: boolean
  }
}
```

### Sorting

Query parameter format: `?sort=property:direction`

Example: `/users?sort=name:asc,age:desc`

## Error Handling

The package includes built-in exception filters for validation errors:

```typescript
// In your app.module.ts or main.ts
app.useGlobalFilters(
  new ZodValidationExceptionFilter(),
  new ZodSerializationExceptionFilter()
);
```

Error responses will include detailed validation errors:

```json
{
  "statusCode": 400,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/users",
  "errors": [
    {
      "code": "invalid_type",
      "message": "Expected string, received number",
      "path": ["name"]
    }
  ]
}
```

# OpenAPI Documentation

All decorators automatically generate OpenAPI documentation from your Zod schemas. Under the hood, they use the `@ApiResponse`, `@ApiBody`, `@ApiQuery`, `@ApiParam` decorators from NestJS Swagger and an OpenAPI schema generated by `zod-openapi`.

## Important notes

This package requires OpenAPI 3.1.0, because zod-openapi is not compatible with OpenAPI 3.0.0 (it will show "Unknown type: object" errors).

So set your swagger version to 3.1.0 while booting your NestJS app:

```typescript
const config = new DocumentBuilder()
  .setOpenAPIVersion('3.1.0')
  .setTitle('Docs Swagger')
  .setVersion('1.0.0')
  .addBearerAuth()
  .build();
```

# License

MIT - ©Lonestone
