import type { INestApplication } from '@nestjs/common'
import type { z } from 'zod'
import { Controller, Get, Module } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createSortingQueryStringSchema } from './sorting'
import { SortingParams } from './sorting.decorator'
// Create schemas for testing
const defaultSchema = createSortingQueryStringSchema(['email', 'computedField'])
type Sort = z.infer<typeof defaultSchema>
@Controller('sorting')
class TestController {
  @Get()
  getDefault(@SortingParams(defaultSchema) sorting: Sort[] | undefined) {
    return sorting
  }
}

@Module({
  controllers: [TestController],
})
class TestModule {}

describe('sorting', () => {
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

  describe('sorting validation', () => {
    it('should return undefined when no sort parameter is provided', async () => {
      const response = await request(app.getHttpServer()).get('/sorting').expect(200)

      expect(response.body.sort).toBeUndefined()
    })

    it('should accept valid sort parameters', async () => {
      const response = await request(app.getHttpServer())
        .get('/sorting')
        .query({ sort: 'email:asc,computedField:desc' })
        .expect(200)

      expect(response.body).toEqual([
        { property: 'email', direction: 'asc' },
        { property: 'computedField', direction: 'desc' },
      ])
    })

    it('should default to asc when direction is not specified', async () => {
      const response = await request(app.getHttpServer())
        .get('/sorting')
        .query({ sort: 'email' })
        .expect(200)

      expect(response.body).toEqual([{ property: 'email', direction: 'asc' }])
    })

    it('should reject invalid sort properties', async () => {
      const response = await request(app.getHttpServer())
        .get('/sorting')
        .query({ sort: 'email:asc,invalid:asc' })
        .expect(400)

      expect(response.body.message).toContain('Validation failed')
      expect(response.body.errors).toEqual([
        {
          code: 'custom',
          message: 'Invalid sorting property \'invalid\'. Allowed properties are: email, computedField',
          path: [0, 'property'],
        },
      ])
    })

    it('should reject invalid sort directions', async () => {
      const response = await request(app.getHttpServer())
        .get('/sorting')
        .query({ sort: 'email:invalid' })
        .expect(400)

      expect(response.body.message).toContain('Validation failed')
      expect(response.body.errors).toEqual([
        {
          code: 'invalid_string',
          message: 'Invalid sort format. Expected format: property[:asc|desc]',
          validation: 'regex',
          path: [0],
        },
      ])
    })
  })

  describe('createSortQuerySchema function', () => {
    it('should create schema with custom values', () => {
      const schema = createSortingQueryStringSchema(['name', 'age'])
      const result = schema.parse('name:asc,age:desc')
      expect(result).toEqual([
        { property: 'name', direction: 'asc' },
        { property: 'age', direction: 'desc' },
      ])
    })

    it('should reject invalid properties', () => {
      const schema = createSortingQueryStringSchema(['name', 'age'])
      expect(() => schema.parse('invalid:asc')).toThrow()
    })

    it('should handle empty input', () => {
      const schema = createSortingQueryStringSchema(['name', 'age'])
      const result = schema.parse(undefined)
      expect(result).toBeUndefined()
    })
  })

  describe('edge cases', () => {
    it('should handle multiple sort parameters', async () => {
      const response = await request(app.getHttpServer())
        .get('/sorting')
        .query({ sort: 'email:asc,computedField:asc' })
        .expect(200)

      expect(response.body).toEqual([
        { property: 'email', direction: 'asc' },
        { property: 'computedField', direction: 'asc' },
      ])
    })

    it('should handle empty sort parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/sorting')
        .query({ sort: '' })
        .expect(400)

      expect(response.body.message).toContain('Validation failed')
    })
  })
})
