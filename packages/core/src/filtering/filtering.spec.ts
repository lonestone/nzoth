import type { INestApplication } from '@nestjs/common'
import type { z } from 'zod'
import { Controller, Get, Module } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createFilterQueryStringSchema, FilterRule } from './filtering'
import { FilteringParams } from './filtering.decorator'

// Create schemas for testing
const FILTER_KEYS = ['email', 'age', 'active'] as const
const defaultSchema = createFilterQueryStringSchema(FILTER_KEYS)
type DefaultFiler = z.infer<typeof defaultSchema>

@Controller('filtering')
class TestController {
  @Get()
  getDefault(@FilteringParams(defaultSchema) filtering: DefaultFiler) {
    return filtering
  }
}

@Module({
  controllers: [TestController],
})
class TestModule {}

describe('filtering', () => {
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

  describe('filtering validation', () => {
    it('should return undefined when no filter parameter is provided', async () => {
      const response = await request(app.getHttpServer()).get('/filtering').expect(200)

      expect(response.body.filter).toBeUndefined()
    })

    it('should accept valid single filter parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/filtering')
        .query({ filter: 'email:eq:test@example.com' })
        .expect(200)

      expect(response.body).toEqual([
        { property: 'email', rule: FilterRule.EQUALS, value: 'test@example.com' },
      ])
    })

    it('should accept multiple filter parameters', async () => {
      const response = await request(app.getHttpServer())
        .get('/filtering')
        .query({ filter: 'email:eq:test@example.com;age:gt:25' })
        .expect(200)

      expect(response.body).toEqual([
        { property: 'email', rule: FilterRule.EQUALS, value: 'test@example.com' },
        { property: 'age', rule: FilterRule.GREATER_THAN, value: '25' },
      ])
    })

    it('should handle IS_NULL and IS_NOT_NULL without values', async () => {
      const response = await request(app.getHttpServer())
        .get('/filtering')
        .query({ filter: 'email:isnull;active:isnotnull' })
        .expect(200)

      expect(response.body).toEqual([
        { property: 'email', rule: FilterRule.IS_NULL },
        { property: 'active', rule: FilterRule.IS_NOT_NULL },
      ])
    })

    it('should reject invalid filter properties', async () => {
      const response = await request(app.getHttpServer())
        .get('/filtering')
        .query({ filter: 'invalid:eq:value' })
        .expect(400)

      expect(response.body.message).toContain('Validation failed')
    })

    it('should reject invalid filter rules', async () => {
      const response = await request(app.getHttpServer())
        .get('/filtering')
        .query({ filter: 'email:invalid:value' })
        .expect(400)

      expect(response.body.message).toContain('Validation failed')
    })
  })

  describe('createFilterQuerySchema function', () => {
    it('should create schema with custom properties', () => {
      const schema = createFilterQueryStringSchema(['name', 'status'])
      const result = schema.parse('name:eq:John;status:in:active,pending')
      expect(result).toEqual([
        { property: 'name', rule: FilterRule.EQUALS, value: 'John' },
        { property: 'status', rule: FilterRule.IN, value: 'active,pending' },
      ])
    })

    it('should reject filters with invalid properties', () => {
      const schema = createFilterQueryStringSchema(['name'])
      expect(() => schema.parse('invalid:eq:value')).toThrow()
    })

    it('should handle empty input', () => {
      const schema = createFilterQueryStringSchema(['name', 'email'])
      const result = schema.parse(undefined)
      expect(result).toBeUndefined()
    })
  })

  describe('filter rules', () => {
    it('should handle EQUALS rule', async () => {
      const response = await request(app.getHttpServer())
        .get('/filtering')
        .query({ filter: 'email:eq:test@example.com' })
        .expect(200)

      expect(response.body).toEqual([
        { property: 'email', rule: FilterRule.EQUALS, value: 'test@example.com' },
      ])
    })

    it('should handle LIKE rule', async () => {
      const response = await request(app.getHttpServer())
        .get('/filtering')
        .query({ filter: 'email:like:test' })
        .expect(200)

      expect(response.body).toEqual([{ property: 'email', rule: FilterRule.LIKE, value: 'test' }])
    })

    it('should handle IN rule with multiple values', async () => {
      const response = await request(app.getHttpServer())
        .get('/filtering')
        .query({ filter: 'age:in:20,25,30' })
        .expect(200)

      expect(response.body).toEqual([{ property: 'age', rule: FilterRule.IN, value: '20,25,30' }])
    })
  })

  describe('edge cases', () => {
    it('should handle empty filter string', async () => {
      const response = await request(app.getHttpServer())
        .get('/filtering')
        .query({ filter: '' })
        .expect(200)

      expect(response.body).toEqual([])
    })

    it('should handle whitespace in filter values', async () => {
      const response = await request(app.getHttpServer())
        .get('/filtering')
        .query({ filter: 'email:eq:test user@example.com' })
        .expect(200)

      expect(response.body).toEqual([
        { property: 'email', rule: FilterRule.EQUALS, value: 'test user@example.com' },
      ])
    })

    it('should reject filter without required value', async () => {
      const response = await request(app.getHttpServer())
        .get('/filtering')
        .query({ filter: 'email:eq' })

      expect(response.body.message).toContain('Validation failed')
    })
  })
})
