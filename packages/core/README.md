# @lonestone/nzoth

**NZOTH**: **N**est + **Z**od + **O**penAPI + **T**yped + **H**elpers

A collection of NestJS utilities for building RESTful APIs with support for filtering, pagination, sorting, type-safe request/response validation, and OpenAPI schema registration using Zod. Allows registering Zod schemas with OpenAPI metadata for automatic documentation generation.

## Why NZOTH?

NZOTH combines the best of all worlds:
- **N**estJS: The progressive Node.js framework for building efficient, reliable, and scalable server-side applications
- **Z**od: TypeScript-first schema validation with static type inference
- **O**penAPI: Automated API documentation that stays in sync with your code
- **T**yped: End-to-end type safety from your routes to your controllers to your clients
- **H**elpers: A comprehensive collection of utilities for filtering, pagination, sorting, and more

Our goal is to provide a type-safe API solution that's easy to use while still being compatible with various languages and tools. NZOTH offers a simple yet powerful alternative to solutions like tRPC and GraphQL for projects that need REST APIs with strong typing.

## Features

- ✅ **Validation**: Comprehensive Zod-based validation for requests and responses
- 🎯 **Decorators**: Decorators to validate route response, parameters, query params, and body
- 🔍 **Filtering**: Flexible query parameter-based filtering with multiple operators
- 📄 **Pagination**: Easy-to-use pagination with offset and page size
- 🔃 **Sorting**: Multi-field sorting with ascending/descending support
- 📄 **OpenAPI**: Automatically generate OpenAPI documentation from your Zod schemas

## Installation

```bash
npm install @lonestone/nzoth
# or
yarn add @lonestone/nzoth
# or
pnpm add @lonestone/nzoth
```

## Basic Usage

```typescript
import { TypedRoute, TypedBody } from '@lonestone/nzoth/server';
import { z } from 'zod';

const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(3),
  email: z.string().email(),
});

@Controller('users')
class UserController {
  @TypedRoute.Get(undefined, UserSchema.array())
  findAll(): User[] {
    return this.userService.findAll();
  }

  @TypedRoute.Post('/', UserSchema)
  create(@TypedBody(UserSchema.omit({ id: true })) dto: CreateUserDto): User {
    return this.userService.create(dto);
  }
}
```

## Documentation

For full documentation, examples, and API reference, visit the [GitHub repository](https://github.com/lonestone/nzoth).

## License

UNLICENSED - ©Lonestone - Pierrick Bignet 