import type { INestApplication } from '@nestjs/common'
import { Controller, Get, Module } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { extendApi } from '@anatine/zod-openapi'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { TypedQuery, TypedQueryObject } from './typed-query.decorator'

// Test schemas
const SearchQuerySchema = extendApi(z.object({
  q: z.string().min(2),
  page: z.coerce.number().int().positive().optional(),
  tags: z.array(z.string()).optional(),
}), {
  title: 'SearchQuerySchema',
  description: 'Schema for search query parameters',
})

type SearchQuery = z.infer<typeof SearchQuerySchema>

// Custom query parameter validator
const CustomQuerySchema = extendApi(z.string().min(3).max(10), {
  title: 'CustomQuerySchema',
  description: 'Schema for custom query parameter',
})

const CustomQuery = TypedQuery('customParam', CustomQuerySchema)

// Test controller
@Controller('typed-query')
class TestController {
  @Get('single')
  getSingle(
    @TypedQuery('q', z.string().min(2)) query: string,
    @TypedQuery('page', z.coerce.number().int().positive(), { optional: true }) page?: number,
  ) {
    return { query, page }
  }

  @Get('array')
  getArray(@TypedQuery('tags', z.string(), { array: true }) tags: string[]) {
    return { tags }
  }

  @Get('object')
  getObject(@TypedQueryObject(SearchQuerySchema) query: SearchQuery) {
    return query
  }

  @Get('custom')
  getCustom(@CustomQuery value: string) {
    return { value }
  }
}

@Module({
  controllers: [TestController],
})
class TestModule {}

describe('typed-query', () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TestModule],
    }).compile()

    app = moduleRef.createNestApplication()
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('test single', () => {
    it('should accept valid query parameters', async () => {
      const response = await request(app.getHttpServer())
        .get('/typed-query/single')
        .query({
          q: 'test',
          page: 42,
        })
        .expect(200)

      expect(response.body).toEqual({
        query: 'test',
        page: 42,
      })
    })

    it('should accept query without optional param', async () => {
      const response = await request(app.getHttpServer())
        .get('/typed-query/single')
        .query({
          q: 'test',
        })
        .expect(200)

      expect(response.body).toEqual({
        query: 'test',
        page: undefined,
      })
    })

    it('should reject missing required query param', async () => {
      await request(app.getHttpServer())
        .get('/typed-query/single')
        .query({ page: 42 })
        .expect(400)
    })

    it('should reject invalid query', async () => {
      await request(app.getHttpServer())
        .get('/typed-query/single')
        .query({
          q: 't',
        })
        .expect(400)
    })
  })

  describe('test array', () => {
    it('should accept array parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/typed-query/array')
        .query({
          tags: ['tag1', 'tag2', 'tag3'],
        })
        .expect(200)

      expect(response.body).toEqual({
        tags: ['tag1', 'tag2', 'tag3'],
      })
    })

    it('should accept single value as array', async () => {
      const response = await request(app.getHttpServer())
        .get('/typed-query/array')
        .query({
          tags: 'tag1',
        })
        .expect(200)

      expect(response.body).toEqual({
        tags: ['tag1'],
      })
    })

    it('should reject missing required array', async () => {
      await request(app.getHttpServer())
        .get('/typed-query/array')
        .expect(400)
    })
  })

  describe('test object', () => {
    it('should accept valid search query', async () => {
      const query = {
        q: 'test',
        page: 1,
        tags: ['tag1', 'tag2'],
      }

      const response = await request(app.getHttpServer())
        .get('/typed-query/object')
        .query(query)
        .expect(200)

      expect(response.body).toEqual(query)
    })

    it('should accept minimal search query', async () => {
      const query = {
        q: 'test',
      }

      const response = await request(app.getHttpServer())
        .get('/typed-query/object')
        .query(query)
        .expect(200)

      expect(response.body).toEqual(query)
    })

    it('should reject invalid search query', async () => {
      const query = {
        q: 't', // too short
        page: 'invalid', // invalid page type
        tags: [123], // invalid tag type
      }

      await request(app.getHttpServer())
        .get('/typed-query/object')
        .query(query)
        .expect(400)
    })
  })

  describe('test custom', () => {
    const validValue = 'hello'

    it('should accept valid value', async () => {
      const response = await request(app.getHttpServer())
        .get('/typed-query/custom')
        .query({ customParam: validValue })
        .expect(200)

      expect(response.body).toEqual({ value: validValue })
    })

    it('should reject too short value', async () => {
      await request(app.getHttpServer())
        .get('/typed-query/custom')
        .query({ customParam: 'hi' })
        .expect(400)
    })

    it('should reject too long value', async () => {
      await request(app.getHttpServer())
        .get('/typed-query/custom')
        .query({ customParam: 'thisistoolong' })
        .expect(400)
    })
  })
})
