import type { INestApplication } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  TypedController,
  extractParamNames,
  getControllerParams,
} from './typed-controller.decorator';
import { TypedParam } from './typed-param.decorator';
import { TypedRoute } from './typed-route.decorator';

// Test schemas
const AuthorParamsSchema = z.object({
  authorId: z.string().uuid(),
});

const PostParamsSchema = z.object({
  authorId: z.string().uuid(),
  categoryId: z.string().min(1),
});

const NumberParamsSchema = z.object({
  userId: z.coerce.number().int().positive(),
  score: z.coerce.number(),
});

const PostSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  content: z.string(),
  authorId: z.string().uuid(),
  score: z.number().optional(),
});

const PostsSchema = z.array(PostSchema);

// Test controllers
@TypedController('authors/:authorId/posts', AuthorParamsSchema)
class AuthorPostController {
  @TypedRoute.Get(undefined, PostsSchema)
  findAll(@TypedParam('authorId') authorId: string) {
    return [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test Post',
        content: 'Test content',
        authorId,
      },
    ] satisfies z.infer<typeof PostsSchema>;
  }

  @TypedRoute.Get(':id', PostSchema)
  findOne(@TypedParam('authorId') authorId: string, @TypedParam('id', 'uuid') id: string) {
    return {
      id,
      title: 'Test Post',
      content: 'Test content',
      authorId,
    };
  }
}

@TypedController('categories/:categoryId/authors/:authorId/posts', PostParamsSchema)
class CategoryAuthorPostController {
  @TypedRoute.Get(undefined, PostsSchema)
  findAll(@TypedParam('categoryId') categoryId: string, @TypedParam('authorId') authorId: string) {
    return [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test Post',
        content: 'Test content',
        authorId,
      },
    ];
  }

  @TypedRoute.Get(':id', PostSchema)
  findOne(
    @TypedParam('categoryId') categoryId: string,
    @TypedParam('authorId') authorId: string,
    @TypedParam('id', 'uuid') id: string,
  ) {
    return {
      id,
      title: 'Test Post',
      content: 'Test content',
      authorId,
    };
  }
}

@TypedController('simple')
class SimpleController {
  @TypedRoute.Get('hello')
  hello() {
    return { message: 'Hello World' };
  }
}

@TypedController('users/:id')
class UserController {
  @TypedRoute.Get(undefined, z.object({ id: z.string(), name: z.string() }))
  findOne(@TypedParam('id') id: string) {
    return { id, name: 'Test User' };
  }
}

@TypedController('users/:userId/scores/:score', NumberParamsSchema)
class NumericParamController {
  @TypedRoute.Get('', PostsSchema)
  findAll(@TypedParam('userId') userId: number, @TypedParam('score') score: number) {
    return [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test Post',
        content: 'Test content',
        authorId: '123e4567-e89b-12d3-a456-426614174000',
        score: score,
      },
    ] satisfies z.infer<typeof PostsSchema>;
  }

  @TypedRoute.Get(':id', PostSchema)
  findOne(
    @TypedParam('userId') _: number,
    @TypedParam('score') score: number,
    @TypedParam('id', 'uuid') id: string,
  ) {
    return {
      id,
      title: 'Test Post',
      content: 'Test content',
      authorId: '123e4567-e89b-12d3-a456-426614174000',
      score: score,
    } satisfies z.infer<typeof PostSchema>;
  }
}

// Edge case controllers
@TypedController('api/users')
class NoParamsController {
  @TypedRoute.Get()
  test() {
    return { message: 'No params test' };
  }
}

@TypedController('users/:id/posts/:postId')
class NoSchemaController {
  @TypedRoute.Get()
  test(@TypedParam('id') id: string, @TypedParam('postId') postId: string) {
    return { id, postId, message: 'No schema test' };
  }
}

// Test modules
@Module({
  controllers: [
    AuthorPostController,
    CategoryAuthorPostController,
    SimpleController,
    UserController,
    NumericParamController,
    NoParamsController,
    NoSchemaController,
  ],
})
class TestModule { }

describe('TypedController', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TestModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('extractParamNames', () => {
    it('should extract single parameter', () => {
      const params = extractParamNames('users/:id');
      expect(params).toEqual(['id']);
    });

    it('should extract multiple parameters', () => {
      const params = extractParamNames('authors/:authorId/posts/:postId');
      expect(params).toEqual(['authorId', 'postId']);
    });

    it('should handle nested paths', () => {
      const params = extractParamNames('categories/:categoryId/authors/:authorId/posts/:postId');
      expect(params).toEqual(['categoryId', 'authorId', 'postId']);
    });

    it('should return empty array for paths without parameters', () => {
      const params = extractParamNames('users/all');
      expect(params).toEqual([]);
    });

    it('should handle mixed paths', () => {
      const params = extractParamNames('api/v1/users/:userId/posts/:postId/comments');
      expect(params).toEqual(['userId', 'postId']);
    });
  });

  describe('getControllerParams', () => {
    it('should return controller parameters for AuthorPostController', () => {
      const params = getControllerParams(AuthorPostController);
      expect(params).toHaveLength(1);
      expect(params[0].name).toBe('authorId');
      expect(params[0].openApiSchema.type).toEqual('string');
      expect(params[0].openApiSchema.format).toBe('uuid');
    });

    it('should return controller parameters for CategoryAuthorPostController', () => {
      const params = getControllerParams(CategoryAuthorPostController);
      expect(params).toHaveLength(2);
      expect(params[0].name).toBe('categoryId');
      expect(params[1].name).toBe('authorId');
    });

    it('should return numeric controller parameters for NumericParamController', () => {
      const params = getControllerParams(NumericParamController);
      expect(params).toHaveLength(2);
      expect(params[0].name).toBe('userId');
      expect(params[0].openApiSchema.type).toEqual('integer');
      expect(params[1].name).toBe('score');
      expect(params[1].openApiSchema.type).toEqual('number');
    });

    it('should return empty array for controllers without parameters', () => {
      const params = getControllerParams(SimpleController);
      expect(params).toHaveLength(0);
    });

    it('should return parameters for controllers without explicit schema', () => {
      const params = getControllerParams(UserController);
      expect(params).toHaveLength(1);
      expect(params[0].name).toBe('id');
      expect(params[0].openApiSchema.type).toEqual('string');
    });
  });

  describe('AuthorPostController integration', () => {
    const validAuthorId = '123e4567-e89b-12d3-a456-426614174000';
    const validPostId = '987fcdeb-51a2-43b5-a321-567890abcdef';

    it('should handle findAll with valid authorId', async () => {
      const response = await request(app.getHttpServer())
        .get(`/authors/${validAuthorId}/posts`)
        .expect(200);

      expect(response.body).toEqual([
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          title: 'Test Post',
          content: 'Test content',
          authorId: validAuthorId,
        },
      ]);
    });

    it('should handle findOne with valid authorId and postId', async () => {
      const response = await request(app.getHttpServer())
        .get(`/authors/${validAuthorId}/posts/${validPostId}`)
        .expect(200);

      expect(response.body).toEqual({
        id: validPostId,
        title: 'Test Post',
        content: 'Test content',
        authorId: validAuthorId,
      });
    });

    it('should accept any authorId for now (no validation)', async () => {
      const validAuthorId2 = '987fcdeb-51a2-43b5-a321-567890abcdef';
      const response = await request(app.getHttpServer())
        .get(`/authors/${validAuthorId2}/posts`)
        .expect(200);

      expect(response.body).toEqual([
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          title: 'Test Post',
          content: 'Test content',
          authorId: validAuthorId2,
        },
      ]);
    });

    it('should reject invalid postId', async () => {
      await request(app.getHttpServer())
        .get(`/authors/${validAuthorId}/posts/invalid-uuid`)
        .expect(400);
    });
  });

  describe('CategoryAuthorPostController integration', () => {
    const validCategoryId = 'tech';
    const validAuthorId = '123e4567-e89b-12d3-a456-426614174000';
    const validPostId = '987fcdeb-51a2-43b5-a321-567890abcdef';

    it('should handle findAll with valid categoryId and authorId', async () => {
      const response = await request(app.getHttpServer())
        .get(`/categories/${validCategoryId}/authors/${validAuthorId}/posts`)
        .expect(200);

      expect(response.body).toEqual([
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          title: 'Test Post',
          content: 'Test content',
          authorId: validAuthorId,
        },
      ]);
    });

    it('should handle findOne with valid categoryId, authorId, and postId', async () => {
      const response = await request(app.getHttpServer())
        .get(`/categories/${validCategoryId}/authors/${validAuthorId}/posts/${validPostId}`)
        .expect(200);

      expect(response.body).toEqual({
        id: validPostId,
        title: 'Test Post',
        content: 'Test content',
        authorId: validAuthorId,
      });
    });

    it('should reject empty categoryId', async () => {
      await request(app.getHttpServer())
        .get(`/categories//authors/${validAuthorId}/posts`)
        .expect(404); // 404 because the route doesn't match
    });

    it('should accept any authorId for now (no validation)', async () => {
      const validAuthorId2 = '987fcdeb-51a2-43b5-a321-567890abcdef';
      const response = await request(app.getHttpServer())
        .get(`/categories/${validCategoryId}/authors/${validAuthorId2}/posts`)
        .expect(200);

      expect(response.body).toEqual([
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          title: 'Test Post',
          content: 'Test content',
          authorId: validAuthorId2,
        },
      ]);
    });
  });

  describe('SimpleController integration', () => {
    it('should handle simple routes without parameters', async () => {
      const response = await request(app.getHttpServer()).get('/simple/hello').expect(200);

      expect(response.body).toEqual({ message: 'Hello World' });
    });
  });

  describe('UserController integration', () => {
    it('should handle controller without explicit schema', async () => {
      const response = await request(app.getHttpServer()).get('/users/test-user').expect(200);

      expect(response.body).toEqual({ id: 'test-user', name: 'Test User' });
    });
  });

  describe('NumericParamController integration', () => {
    const validUserId = 123;
    const validScore = 456;
    const validPostId = '987fcdeb-51a2-43b5-a321-567890abcdef';

    it('should handle findAll with valid userId and score', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/${validUserId}/scores/${validScore}`)
        .expect(200);

      expect(response.body).toEqual([
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          title: 'Test Post',
          content: 'Test content',
          authorId: '123e4567-e89b-12d3-a456-426614174000',
          score: 456,
        },
      ]);
    });

    it('should handle findOne with valid userId, score, and postId', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/${validUserId}/scores/${validScore}/${validPostId}`)
        .expect(200);

      expect(response.body).toEqual({
        id: validPostId,
        title: 'Test Post',
        content: 'Test content',
        authorId: '123e4567-e89b-12d3-a456-426614174000',
        score: 456,
      });
    });

    it('should reject invalid userId', async () => {
      await request(app.getHttpServer())
        .get(`/users/invalid-number/scores/${validScore}`)
        .expect(400);
    });

    it('should reject invalid score', async () => {
      await request(app.getHttpServer())
        .get(`/users/${validUserId}/scores/invalid-number/${validPostId}`)
        .expect(400);
    });

    it('should reject invalid postId', async () => {
      await request(app.getHttpServer())
        .get(`/users/${validUserId}/scores/${validScore}/invalid-uuid`)
        .expect(400);
    });
  });

  describe('edge cases', () => {
    it('should handle paths with no parameters', () => {
      expect(() => {
        @TypedController('api/users')
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        class TestNoParamsController {
          @TypedRoute.Get()
          test() {
            return {};
          }
        }
      }).not.toThrow();
    });

    it('should handle paths with parameters but no schema', () => {
      expect(() => {
        @TypedController('users/:id/posts/:postId')
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        class TestNoSchemaController {
          @TypedRoute.Get()
          test() {
            return {};
          }
        }
      }).not.toThrow();
    });

    describe('NoParamsController integration', () => {
      it('should handle routes without parameters', async () => {
        const response = await request(app.getHttpServer()).get('/api/users').expect(200);

        expect(response.body).toEqual({ message: 'No params test' });
      });

      it('should return empty params for controllers without parameters', () => {
        const params = getControllerParams(NoParamsController);
        expect(params).toHaveLength(0);
      });
    });

    describe('NoSchemaController integration', () => {
      it('should handle routes with parameters but no schema validation', async () => {
        const response = await request(app.getHttpServer())
          .get('/users/test-id/posts/test-post-id')
          .expect(200);

        expect(response.body).toEqual({
          id: 'test-id',
          postId: 'test-post-id',
          message: 'No schema test',
        });
      });

      it('should return basic string params for controllers without schema', () => {
        const params = getControllerParams(NoSchemaController);
        expect(params).toHaveLength(2);
        expect(params[0].name).toBe('id');
        expect(params[0].openApiSchema.type).toEqual('string');
        expect(params[1].name).toBe('postId');
        expect(params[1].openApiSchema.type).toEqual('string');
      });

      it('should accept any string values when no schema validation is provided', async () => {
        const response = await request(app.getHttpServer())
          .get('/users/any-value/posts/another-value')
          .expect(200);

        expect(response.body).toEqual({
          id: 'any-value',
          postId: 'another-value',
          message: 'No schema test',
        });
      });
    });
  });
});
