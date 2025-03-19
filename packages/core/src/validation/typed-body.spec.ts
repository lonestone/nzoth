import type { INestApplication } from '@nestjs/common'
import { Controller, Module, Post } from '@nestjs/common'
import { ApiBody } from '@nestjs/swagger'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { TypedBody, TypedFormBody } from './typed-body.decorator'
import { extendApi } from '@anatine/zod-openapi'

// Test schemas
const CreateUserSchema = extendApi(z.object({
  name: z.string().min(2),
  email: z.string().email(),
  age: z.number().int().min(18),
}), {
  title: 'CreateUserSchema',
  description: 'Schema for creating a user',
})

type CreateUserDto = z.infer<typeof CreateUserSchema>

const FileUploadSchema = extendApi(z.object({
  file: z.string(),
  description: z.string().optional(),
}), {
  title: 'FileUploadSchema',
  description: 'Schema for file upload',
})

type FileUploadDto = z.infer<typeof FileUploadSchema>

// Test controller
@Controller('typed-body')
class TestController {
  @Post()
  simpleBody(@TypedBody(CreateUserSchema) data: CreateUserDto) {
    return data
  }

  @Post('nested')
  nestedBody(
    @TypedBody(extendApi(z.object({
      user: CreateUserSchema,
      metadata: z.object({
        tags: z.array(z.string()),
      }),
    }), {
      title: 'NestedUserSchema',
      description: 'Schema for nested user data with metadata',
    })) data: { user: CreateUserDto, metadata: { tags: string[] } },
  ) {
    return data
  }

  @Post('form')
  formBody(@TypedFormBody(FileUploadSchema) data: FileUploadDto) {
    return data
  }

  @Post('override')
  @ApiBody({
    description: 'Custom API documentation',
    required: true,
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 2 },
        email: { type: 'string', format: 'email' },
        age: { type: 'integer', minimum: 18 },
      },
    },
  })
  overrideBody(@TypedBody(CreateUserSchema) data: CreateUserDto) {
    return data
  }
}

// Test module
@Module({
  controllers: [TestController],
})
class TestModule {}

describe('typed-body', () => {
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

  describe('pOST /typed-body', () => {
    it('should accept valid body with application/json content-type', async () => {
      const validBody = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 25,
      }

      const response = await request(app.getHttpServer())
        .post('/typed-body')
        .set('Content-Type', 'application/json')
        .send(validBody)
        .expect(201)

      expect(response.body).toEqual(validBody)
    })

    it('should reject request with incorrect content-type', async () => {
      const validBody = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 25,
      }

      await request(app.getHttpServer())
        .post('/typed-body')
        .set('Content-Type', 'text/plain')
        .send(JSON.stringify(validBody))
        .expect(400)
    })

    it('should reject invalid field', async () => {
      await request(app.getHttpServer())
        .post('/typed-body')
        .set('Content-Type', 'application/json')
        .send({
          name: 'John Doe',
          email: 'invalid-email',
          age: 25,
        })
        .expect(400)
    })

    it('should reject missing required field', async () => {
      await request(app.getHttpServer())
        .post('/typed-body')
        .set('Content-Type', 'application/json')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          // missing age
        })
        .expect(400)
    })

    it('should reject multiple invalid fields', async () => {
      await request(app.getHttpServer())
        .post('/typed-body')
        .set('Content-Type', 'application/json')
        .send({
          name: 'John Doe',
          email: 'invalid-email',
          age: 17, // too young
        })
        .expect(400)
    })
  })

  describe('pOST /typed-body/nested', () => {
    it('should accept valid nested body', async () => {
      const validBody = {
        user: {
          name: 'John Doe',
          email: 'john@example.com',
          age: 25,
        },
        metadata: {
          tags: ['tag1', 'tag2'],
        },
      }

      const response = await request(app.getHttpServer())
        .post('/typed-body/nested')
        .set('Content-Type', 'application/json')
        .send(validBody)
        .expect(201)

      expect(response.body).toEqual(validBody)
    })

    it('should reject invalid nested data', async () => {
      await request(app.getHttpServer())
        .post('/typed-body/nested')
        .set('Content-Type', 'application/json')
        .send({
          user: {
            name: 'John Doe',
            email: 'invalid-email',
            age: 25,
          },
          metadata: {
            tags: ['tag1', 123], // invalid tag type
          },
        })
        .expect(400)
    })
  })

  describe('pOST /typed-body/form', () => {
    it('should accept valid form data with application/x-www-form-urlencoded content-type', async () => {
      const validBody = {
        file: 'test.txt',
        description: 'Test file',
      }

      const response = await request(app.getHttpServer())
        .post('/typed-body/form')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send(validBody)
        .expect(201)

      expect(response.body).toEqual(validBody)
    })

    it('should reject form data with incorrect content-type', async () => {
      const validBody = {
        file: 'test.txt',
        description: 'Test file',
      }

      await request(app.getHttpServer())
        .post('/typed-body/form')
        .set('Content-Type', 'application/json')
        .send(validBody)
        .expect(400)
    })

    it('should reject invalid form data', async () => {
      await request(app.getHttpServer())
        .post('/typed-body/form')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send({
          description: 'Missing file field',
        })
        .expect(400)
    })
  })

  describe('pOST /typed-body/override', () => {
    it('should accept valid body with manual OpenAPI documentation', async () => {
      const validBody = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 25,
      }

      const response = await request(app.getHttpServer())
        .post('/typed-body/override')
        .set('Content-Type', 'application/json')
        .send(validBody)
        .expect(201)

      expect(response.body).toEqual(validBody)
    })
  })
})
