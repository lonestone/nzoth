import type { INestApplication } from '@nestjs/common'
import { Controller, Module } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { extendApi } from '@anatine/zod-openapi'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { TypedRoute } from './typed-route.decorator'

// Test schemas
const UserSchema = extendApi(z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  password: z.string(),
}), {
  title: 'UserSchema',
  description: 'Complete user schema with sensitive data',
})

const PublicUserSchema = extendApi(UserSchema.omit({ password: true }), {
  title: 'PublicUserSchema',
  description: 'Public user schema without sensitive data',
})

type User = z.infer<typeof UserSchema>

const validUser: User = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'John Doe',
  email: 'john@example.com',
  password: 'password',
}

const faultyUser: User = {
  id: 'not-a-uuid',
  name: 'John Doe',
  email: 'invalid-email',
  password: 'password',
}

// Test controller
@Controller('typed-route')
class TestController {
  @TypedRoute.Get('get-complete', UserSchema)
  getComplete() {
    return validUser
  }

  @TypedRoute.Get('get-public', PublicUserSchema)
  getPublic() {
    return validUser
  }

  @TypedRoute.Get('array', extendApi(z.array(PublicUserSchema), {
    title: 'PublicUserArraySchema',
    description: 'Array of public users',
  }))
  getArray() {
    return [validUser, validUser]
  }

  @TypedRoute.Get('get-faulty', UserSchema)
  getFaulty() {
    return faultyUser
  }

  @TypedRoute.Post('create', UserSchema)
  create() {
    return validUser
  }

  @TypedRoute.Post('create-faulty', UserSchema)
  createFaulty() {
    return {
      id: 'not-a-uuid',
      name: 'Pierrick',
      email: 'invalid-email',
    }
  }

  @TypedRoute.Patch('update', UserSchema)
  update() {
    return validUser
  }

  @TypedRoute.Patch('update-faulty', UserSchema)
  updateFaulty() {
    return faultyUser
  }

  @TypedRoute.Delete('delete', UserSchema)
  delete() {
    return validUser
  }

  @TypedRoute.Delete('delete-faulty', UserSchema)
  deleteFaulty() {
    return faultyUser
  }
}

@Module({
  controllers: [TestController],
})
class TestModule {}

describe('typed-route', () => {
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

  describe('test GET endpoints', () => {
    it('should return complete user data', async () => {
      const response = await request(app.getHttpServer())
        .get('/typed-route/get-complete')
        .expect(200)

      expect(response.body).toEqual({
        id: expect.any(String),
        name: expect.any(String),
        email: expect.any(String),
        password: expect.any(String),
      })
    })

    it('should return public user data (without password)', async () => {
      const response = await request(app.getHttpServer())
        .get('/typed-route/get-public')
        .expect(200)

      expect(response.body).toEqual({
        id: expect.any(String),
        name: expect.any(String),
        email: expect.any(String),
      })
      expect(response.body).not.toHaveProperty('password')
    })

    it('should return array of public users', async () => {
      const response = await request(app.getHttpServer())
        .get('/typed-route/array')
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body).toHaveLength(2)
      expect(response.body[0]).toEqual({
        id: expect.any(String),
        name: expect.any(String),
        email: expect.any(String),
      })
      expect(response.body[0]).not.toHaveProperty('password')
    })

    it('should reject faulty user data', async () => {
      const response = await request(app.getHttpServer())
        .get('/typed-route/get-faulty')
        .expect(500)

      expect(response.body.message).toContain('Serialization failed')
    })
  })

  describe('test POST endpoints', () => {
    it('should accept valid create response', async () => {
      const response = await request(app.getHttpServer())
        .post('/typed-route/create')
        .expect(201)

      expect(response.body).toEqual(validUser)
    })

    it('should reject faulty create response', async () => {
      const response = await request(app.getHttpServer())
        .post('/typed-route/create-faulty')
        .expect(500)

      expect(response.body.message).toContain('Serialization failed')
    })
  })

  describe('test PATCH endpoints', () => {
    it('should accept valid update response', async () => {
      const response = await request(app.getHttpServer())
        .patch('/typed-route/update')
        .expect(200)

      expect(response.body).toEqual({
        id: expect.any(String),
        name: expect.any(String),
        email: expect.any(String),
        password: expect.any(String),
      })
    })

    it('should reject faulty update response', async () => {
      const response = await request(app.getHttpServer())
        .patch('/typed-route/update-faulty')
        .expect(500)

      expect(response.body.message).toContain('Serialization failed')
    })
  })

  describe('test DELETE endpoints', () => {
    it('should accept valid delete response', async () => {
      const response = await request(app.getHttpServer())
        .delete('/typed-route/delete')
        .expect(200)

      expect(response.body).toEqual({
        id: expect.any(String),
        name: expect.any(String),
        email: expect.any(String),
        password: expect.any(String),
      })
    })

    it('should reject faulty delete response', async () => {
      const response = await request(app.getHttpServer())
        .delete('/typed-route/delete-faulty')
        .expect(500)

      expect(response.body.message).toContain('Serialization failed')
    })
  })
})
