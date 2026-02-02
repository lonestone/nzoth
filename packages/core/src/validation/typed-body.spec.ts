import type { INestApplication } from '@nestjs/common'
import { Controller, Module, Post, UploadedFile, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiBody } from '@nestjs/swagger'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { TypedBody, TypedFormBody, TypedMultipartBody } from './typed-body.decorator'
import 'zod-openapi'
// Test schemas
const CreateUserSchema = z
  .object({
    name: z.string().min(2),
    email: z.string().email(),
    age: z.number().int().min(18),
  })

type CreateUserDto = z.infer<typeof CreateUserSchema>

const FileUploadSchema = z
  .object({
    file: z.string(),
    description: z.string().optional(),
  })

type FileUploadDto = z.infer<typeof FileUploadSchema>

const MultipartUploadSchema = z
  .object({
    title: z.string().min(1),
    description: z.string().optional(),
  })

type MultipartUploadDto = z.infer<typeof MultipartUploadSchema>

// Fake file for multipart tests (FileInterceptor expects a 'file' field)
// eslint-disable-next-line node/prefer-global/buffer
const FAKE_FILE = Buffer.from('fake file content')
const FAKE_FILENAME = 'test.txt'

// Test controller
@Controller('typed-body')
class TestController {
  @Post()
  simpleBody(@TypedBody(CreateUserSchema) data: CreateUserDto) {
    return data
  }

  @Post('nested')
  nestedBody(
    @TypedBody(
      z.object({
        user: CreateUserSchema,
        metadata: z.object({
          tags: z.array(z.string()),
        }),
      }),
    )
    data: {
      user: CreateUserDto
      metadata: { tags: string[] }
    },
  ) {
    return data
  }

  @Post('form')
  formBody(@TypedFormBody(FileUploadSchema) data: FileUploadDto) {
    return data
  }

  @Post('multipart')
  @UseInterceptors(FileInterceptor('file'))
  multipartBody(
    @TypedMultipartBody(MultipartUploadSchema) data: MultipartUploadDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return { data, file }
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

  describe('pOST /typed-body/multipart', () => {
    it('should accept valid multipart/form-data', async () => {
      const validBody = {
        title: 'My upload',
        description: 'Optional description',
      }

      const response = await request(app.getHttpServer())
        .post('/typed-body/multipart')
        .field('title', validBody.title)
        .field('description', validBody.description)
        .attach('file', FAKE_FILE, FAKE_FILENAME)
        .expect(201)

      const { buffer, ...restFile } = response.body.file
      expect({ data: response.body.data, file: restFile }).toEqual({ data: validBody, file: restFile })
    })

    it('should accept multipart with only required field', async () => {
      const validBody = { title: 'Minimal' }

      const response = await request(app.getHttpServer())
        .post('/typed-body/multipart')
        .field('title', validBody.title)
        .attach('file', FAKE_FILE, FAKE_FILENAME)
        .expect(201)

      const { buffer, ...restFile } = response.body.file
      expect({ data: response.body.data, file: restFile }).toEqual({ data: validBody, file: {
        fieldname: 'file',
        originalname: FAKE_FILENAME,
        encoding: '7bit',
        mimetype: 'text/plain',
        size: FAKE_FILE.length,
      } })
    })

    it('should reject multipart with incorrect content-type', async () => {
      await request(app.getHttpServer())
        .post('/typed-body/multipart')
        .set('Content-Type', 'application/json')
        .send({ title: 'Test' })
        .expect(400)
    })

    it('should reject invalid multipart data', async () => {
      await request(app.getHttpServer())
        .post('/typed-body/multipart')
        .field('title', '') // min(1) fails
        .attach('file', FAKE_FILE, FAKE_FILENAME)
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
