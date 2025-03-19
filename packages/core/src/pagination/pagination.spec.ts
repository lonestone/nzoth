import type { INestApplication } from '@nestjs/common'
import type { Pagination } from './pagination'
import { Controller, Get, Module } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createPaginationQuerySchema, DEFAULT_PAGE_SIZE } from './pagination'
import { PaginationParams } from './pagination.decorator'

const defaultSchema = createPaginationQuerySchema()

const customSchema = createPaginationQuerySchema({
  defaultPageSize: 5,
  maxPageSize: 10,
  minPageSize: 2,
})

@Controller('pagination')
class TestController {
  @Get('default')
  getDefault(@PaginationParams(defaultSchema) pagination: Pagination): Pagination {
    return pagination
  }

  @Get('custom')
  getCustom(@PaginationParams(customSchema) pagination: Pagination): Pagination {
    return pagination
  }
}

@Module({
  controllers: [TestController],
})
class TestModule {}

describe('pagination', () => {
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

  describe('test default pagination parameters', () => {
    it('should use system default values when no parameters provided', async () => {
      const response = await request(app.getHttpServer())
        .get('/pagination/default')
        .expect(200)

      expect(response.body).toEqual({
        offset: 0,
        pageSize: DEFAULT_PAGE_SIZE,
      })
    })

    it('should accept valid parameters within system bounds', async () => {
      const response = await request(app.getHttpServer())
        .get('/pagination/default')
        .query({ offset: 40, pageSize: 50 })
        .expect(200)

      expect(response.body).toEqual({
        offset: 40,
        pageSize: 50,
      })
    })

    it('should reject pageSize above system maximum', async () => {
      const response = await request(app.getHttpServer())
        .get('/pagination/default')
        .query({ pageSize: 101 })
        .expect(400)

      expect(response.body.message).toContain('Validation failed')
      expect(response.body.errors).toEqual([
        {
          path: ['pageSize'],
          message: 'Number must be less than or equal to 100',
          maximum: 100,
          code: 'too_big',
          exact: false,
          inclusive: true,
          type: 'number',
        },
      ])
    })
  })

  describe('test custom pagination parameters', () => {
    it('should use custom default values when no parameters provided', async () => {
      const response = await request(app.getHttpServer())
        .get('/pagination/custom')
        .expect(200)

      expect(response.body).toEqual({
        offset: 0,
        pageSize: 5, // custom default
      })
    })

    it('should accept valid parameters within custom bounds', async () => {
      const response = await request(app.getHttpServer())
        .get('/pagination/custom')
        .query({ offset: 10, pageSize: 8 })
        .expect(200)

      expect(response.body).toEqual({
        offset: 10,
        pageSize: 8,
      })
    })

    it('should reject pageSize below custom minimum', async () => {
      const response = await request(app.getHttpServer())
        .get('/pagination/custom')
        .query({ pageSize: 1 })
        .expect(400)

      expect(response.body.message).toContain('Validation failed')
      expect(response.body.errors).toEqual([
        {
          path: ['pageSize'],
          message: 'Number must be greater than or equal to 2',
          minimum: 2,
          code: 'too_small',
          exact: false,
          inclusive: true,
          type: 'number',
        },
      ])
    })

    it('should reject pageSize above custom maximum', async () => {
      const response = await request(app.getHttpServer())
        .get('/pagination/custom')
        .query({ pageSize: 11 })
        .expect(400)

      expect(response.body.message).toContain('Validation failed')
      expect(response.body.errors).toEqual([
        {
          path: ['pageSize'],
          message: 'Number must be less than or equal to 10',
          maximum: 10,
          code: 'too_big',
          exact: false,
          inclusive: true,
          type: 'number',
        },
      ])
    })
  })

  describe('test common validations', () => {
    it('should reject negative offset', async () => {
      const response = await request(app.getHttpServer())
        .get('/pagination/default')
        .query({ offset: -1 })
        .expect(400)

      expect(response.body.message).toContain('Validation failed')
      expect(response.body.errors).toEqual([
        {
          path: ['offset'],
          message: 'Number must be greater than or equal to 0',
          minimum: 0,
          code: 'too_small',
          exact: false,
          inclusive: true,
          type: 'number',
        },
      ])
    })

    it('should reject non-numeric values', async () => {
      const response = await request(app.getHttpServer())
        .get('/pagination/default')
        .query({ offset: 'abc', pageSize: 'def' })
        .expect(400)

      expect(response.body.message).toContain('Validation failed')
      expect(response.body.errors).toEqual([
        {
          path: ['offset'],
          message: 'Expected number, received nan',
          code: 'invalid_type',
          expected: 'number',
          received: 'nan',
        },
        {
          path: ['pageSize'],
          message: 'Expected number, received nan',
          code: 'invalid_type',
          expected: 'number',
          received: 'nan',
        },
      ])
    })
  })

  describe('createPaginationQuerySchema function', () => {
    it('should create schema with custom values', () => {
      const testSchema = createPaginationQuerySchema({
        defaultPageSize: 15,
        maxPageSize: 50,
        minPageSize: 5,
      })
      const result = testSchema.parse({ offset: 10, pageSize: 15 })
      expect(result).toEqual({ offset: 10, pageSize: 15 })
    })

    it('should reject values outside custom bounds', () => {
      const testSchema = createPaginationQuerySchema({
        defaultPageSize: 15,
        maxPageSize: 50,
        minPageSize: 5,
      })
      expect(() =>
        testSchema.parse({ offset: 0, pageSize: 4 }),
      ).toThrow()
      expect(() =>
        testSchema.parse({ offset: 0, pageSize: 51 }),
      ).toThrow()
    })
  })

  describe('edge cases', () => {
    it('should handle maximum allowed values', async () => {
      const response = await request(app.getHttpServer())
        .get('/pagination/default')
        .query({ offset: Number.MAX_SAFE_INTEGER, pageSize: 100 })
        .expect(200)

      expect(response.body).toEqual({
        offset: Number.MAX_SAFE_INTEGER,
        pageSize: 100,
      })
    })

    it('should handle empty query parameters', async () => {
      const response = await request(app.getHttpServer())
        .get('/pagination/default')
        .query({ offset: '', pageSize: '' })
        .expect(400)

      expect(response.body.message).toContain('Validation failed')
    })
  })

  describe('paginationParams decorator usage', () => {
    it('should handle schema with custom options', async () => {
      const testSchema = createPaginationQuerySchema({
        defaultPageSize: 15,
        maxPageSize: 30,
        minPageSize: 5,
      })

      @Controller('pagination-test')
      class PartialOptionsController {
        @Get()
        get(@PaginationParams(testSchema) pagination: Pagination) {
          return pagination
        }
      }

      const moduleRef = await Test.createTestingModule({
        controllers: [PartialOptionsController],
      }).compile()

      const testApp = moduleRef.createNestApplication()
      await testApp.init()

      const response = await request(testApp.getHttpServer())
        .get('/pagination-test')
        .query({ pageSize: 25 })
        .expect(200)

      expect(response.body).toEqual({
        offset: 0,
        pageSize: 25,
      })

      await testApp.close()
    })
  })
})
