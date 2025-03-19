import type { INestApplication } from '@nestjs/common'
import { Controller, Get, Module } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { createTypedParam, TypedParam } from './typed-param.decorator'

const CustomParam = createTypedParam(z.string().min(3).max(10))

// Test controller
@Controller('typed-param')
class TestController {
  @Get(':id')
  getById(@TypedParam('id', 'uuid') id: string) {
    return { id }
  }

  @Get('boolean/:flag')
  getFlag(@TypedParam('flag', 'boolean') flag: boolean) {
    return { flag }
  }

  // let's test all the types
  @Get('string/:value')
  getString(@TypedParam('value', 'string') value: string) {
    return { value }
  }

  @Get('number/:value')
  getNumber(@TypedParam('value', 'number') value: number) {
    return { value }
  }

  @Get('int/:value')
  getInt(@TypedParam('value', 'int') value: number) {
    return { value }
  }

  @Get('positiveInt/:value')
  getPositiveInt(@TypedParam('value', 'positiveInt') value: number) {
    return { value }
  }

  @Get('multiple/:id/:count')
  getMultiple(
    @TypedParam('id', 'uuid') id: string,
    @TypedParam('count', 'positiveInt') count: number,
  ) {
    return { id, count }
  }

  // Add a test with a custom type
  @Get('custom/:value')
  getCustom(@CustomParam('value') value: string) {
    return { value }
  }
}

// Test module
@Module({
  controllers: [TestController],
})
class TestModule {}

describe('typed-param', () => {
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

  describe('test uuid', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000'

    it('should accept valid uuid', async () => {
      const response = await request(app.getHttpServer())
        .get(`/typed-param/${validUuid}`)
        .expect(200)

      expect(response.body).toEqual({ id: validUuid })
    })

    it('should reject invalid uuid', async () => {
      await request(app.getHttpServer())
        .get('/typed-param/not-a-uuid')
        .expect(400)
    })
  })

  describe('test boolean', () => {
    it('should accept true', async () => {
      const response = await request(app.getHttpServer())
        .get('/typed-param/boolean/true')
        .expect(200)

      expect(response.body).toEqual({ flag: true })
    })

    it('should accept false', async () => {
      const response = await request(app.getHttpServer())
        .get('/typed-param/boolean/false')
        .expect(200)

      expect(response.body).toEqual({ flag: false })
    })

    it('should reject invalid boolean', async () => {
      await request(app.getHttpServer())
        .get('/typed-param/boolean/not-a-boolean')
        .expect(400)
    })

    it('should reject numeric boolean', async () => {
      await request(app.getHttpServer())
        .get('/typed-param/boolean/1')
        .expect(400)
    })

    it('should reject empty value', async () => {
      await request(app.getHttpServer())
        .get('/typed-param/boolean/')
        .expect(400)
    })
  })

  describe('test string', () => {
    it('should accept string value', async () => {
      const response = await request(app.getHttpServer())
        .get('/typed-param/string/hello')
        .expect(200)

      expect(response.body).toEqual({ value: 'hello' })
    })

    it('should reject empty string', async () => {
      await request(app.getHttpServer())
        .get('/typed-param/string/')
        .expect(400)
    })

    it('should accept string with special characters', async () => {
      const response = await request(app.getHttpServer())
        .get('/typed-param/string/hello@world!')
        .expect(200)

      expect(response.body).toEqual({ value: 'hello@world!' })
    })
  })

  describe('test number', () => {
    it('should accept integer', async () => {
      const response = await request(app.getHttpServer())
        .get('/typed-param/number/42')
        .expect(200)

      expect(response.body).toEqual({ value: 42 })
    })

    it('should accept decimal', async () => {
      const response = await request(app.getHttpServer())
        .get('/typed-param/number/3.14')
        .expect(200)

      expect(response.body).toEqual({ value: 3.14 })
    })

    it('should accept negative numbers', async () => {
      const response = await request(app.getHttpServer())
        .get('/typed-param/number/-42')
        .expect(200)

      expect(response.body).toEqual({ value: -42 })
    })

    it('should accept zero', async () => {
      const response = await request(app.getHttpServer())
        .get('/typed-param/number/0')
        .expect(200)

      expect(response.body).toEqual({ value: 0 })
    })

    it('should reject non-numeric value', async () => {
      await request(app.getHttpServer())
        .get('/typed-param/number/abc')
        .expect(400)
    })
  })

  describe('test int', () => {
    it('should accept integer', async () => {
      const response = await request(app.getHttpServer())
        .get('/typed-param/int/42')
        .expect(200)

      expect(response.body).toEqual({ value: 42 })
    })

    it('should reject decimal', async () => {
      await request(app.getHttpServer())
        .get('/typed-param/int/3.14')
        .expect(400)
    })

    it('should reject non-numeric value', async () => {
      await request(app.getHttpServer())
        .get('/typed-param/int/abc')
        .expect(400)
    })
  })

  describe('test positiveInt', () => {
    it('should accept positive integer', async () => {
      const response = await request(app.getHttpServer())
        .get('/typed-param/positiveInt/42')
        .expect(200)

      expect(response.body).toEqual({ value: 42 })
    })

    it('should reject zero', async () => {
      await request(app.getHttpServer())
        .get('/typed-param/positiveInt/0')
        .expect(400)
    })

    it('should reject negative number', async () => {
      await request(app.getHttpServer())
        .get('/typed-param/positiveInt/-1')
        .expect(400)
    })

    it('should reject decimal', async () => {
      await request(app.getHttpServer())
        .get('/typed-param/positiveInt/3.14')
        .expect(400)
    })
  })

  describe('test multiple', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000'
    const validPositiveInt = 42

    it('should accept valid parameters', async () => {
      const response = await request(app.getHttpServer())
        .get(`/typed-param/multiple/${validUuid}/${validPositiveInt}`)
        .expect(200)

      expect(response.body).toEqual({
        id: validUuid,
        count: validPositiveInt,
      })
    })

    it('should reject when first param is invalid', async () => {
      await request(app.getHttpServer())
        .get('/typed-param/multiple/not-a-uuid/42')
        .expect(400)
    })

    it('should reject when second param is invalid', async () => {
      await request(app.getHttpServer())
        .get(`/typed-param/multiple/${validUuid}/not-a-number`)
        .expect(400)
    })
  })

  describe('test custom', () => {
    const validString = 'hello'

    it('should accept valid string (3-10 chars)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/typed-param/custom/${validString}`)
        .expect(200)

      expect(response.body).toEqual({ value: 'hello' })
    })

    it('should reject too short string', async () => {
      await request(app.getHttpServer())
        .get('/typed-param/custom/hi')
        .expect(400)
    })

    it('should reject too long string', async () => {
      await request(app.getHttpServer())
        .get('/typed-param/custom/thisistoolong')
        .expect(400)
    })
  })
})
