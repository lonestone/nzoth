import { z } from 'zod'
import { describe, expect, it, beforeEach, beforeAll, afterAll } from 'vitest'
import type { INestApplication } from '@nestjs/common'
import { Module } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { 
  getOpenApiSchema, 
  registerSchema,
  autoRegisterSchema,
  SCHEMA_STORAGE,
  GLOBAL_SCHEMA_REGISTRY,
  createOpenApiDocument,
} from './openapi'
import { DocumentBuilder } from '@nestjs/swagger'
import { TypedController } from '../validation/typed-controller.decorator'
import { TypedRoute } from '../validation/typed-route.decorator'

describe('openapi', () => {
  beforeEach(() => {
    // Clear schema storage before each test
    Object.values(SCHEMA_STORAGE).forEach(map => map.clear())
    GLOBAL_SCHEMA_REGISTRY.clear()
  })

  describe('toOpenApi', () => {
    it('should convert simple Zod schema to OpenAPI schema object', () => {
      const schema = z.string().min(1).max(100)
      const result = getOpenApiSchema(schema)

      expect(result).toBeDefined()
      expect((result as any).type).toBe('string')
      expect((result as any).minLength).toBe(1)
      expect((result as any).maxLength).toBe(100)
    })

    it('should convert object schema to OpenAPI schema object', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number().int().positive(),
        email: z.string().email().optional(),
      })

      const result = getOpenApiSchema(schema)

      expect(result).toBeDefined()
      expect((result as any).type).toBe('object')
      expect((result as any).properties).toBeDefined()
      expect((result as any).properties?.name).toBeDefined()
      expect((result as any).properties?.age).toBeDefined()
      expect((result as any).properties?.email).toBeDefined()
      expect((result as any).required).toEqual(['name', 'age'])
    })

    it('should register schema with title in storage', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      }).meta({
        title: 'User',
        description: 'User schema',
      })

      const result = getOpenApiSchema(schema)

      expect(result).toBeDefined()
      expect(result.title).toBe('User')
      expect(result.description).toBe('User schema')
      expect(SCHEMA_STORAGE.Other.has('User')).toBe(true)
      expect(SCHEMA_STORAGE.Other.get('User')).toEqual(result)
    })

    it('should handle enum schemas', () => {
      const schema = z.enum(['active', 'inactive', 'pending'])
      const result = getOpenApiSchema(schema)

      expect(result).toBeDefined()
      expect((result as any).type).toBe('string')
      expect((result as any).enum).toEqual(['active', 'inactive', 'pending'])
    })

    it('should handle union schemas', () => {
      const schema = z.union([z.string(), z.number()])
      const result = getOpenApiSchema(schema)

      expect(result).toBeDefined()
      expect(result.anyOf || result.oneOf).toBeDefined()
    })

    it('should handle optional schemas', () => {
      const schema = z.string().optional()
      const result = getOpenApiSchema(schema)

      expect(result).toBeDefined()
    })

    it('should handle array schemas with items', () => {
      const schema = z.array(z.object({
        id: z.number(),
        name: z.string(),
      }))

      const result = getOpenApiSchema(schema)

      expect(result).toBeDefined()
      expect((result as any).type).toBe('array')
      expect((result as any).items).toBeDefined()
      expect((result as any).items?.type).toBe('object')
    })
  })


  describe('integration with meta information', () => {
    it('should preserve meta information in OpenAPI schema', () => {
      const schema = z.string().meta({
        title: 'Username',
        description: 'The user\'s unique username',
        example: 'john_doe',
      })

      const result = getOpenApiSchema(schema)

      expect(result.title).toBe('Username')
      expect(result.description).toBe('The user\'s unique username')
      expect(result.example).toBe('john_doe')
    })

    it('should handle complex meta information', () => {
      const schema = z.object({
        email: z.string().email().meta({
          description: 'User email address',
          example: 'user@example.com',
        }),
        age: z.number().int().min(0).max(120).meta({
          description: 'User age in years',
          example: 25,
        }),
      }).meta({
        title: 'UserProfile',
        description: 'Complete user profile information',
      })

      const result = getOpenApiSchema(schema)

      expect(result.title).toBe('UserProfile')
      expect(result.description).toBe('Complete user profile information')
      expect((result as any).properties?.email?.description).toBe('User email address')
      expect((result as any).properties?.email?.example).toBe('user@example.com')
      expect((result as any).properties?.age?.description).toBe('User age in years')
      expect((result as any).properties?.age?.example).toBe(25)
    })
  })

  describe('registerSchema', () => {
    it('should register schema in storage and return reference', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' }
        },
        required: ['name', 'age']
      } as any

      const reference = registerSchema('User', schema, 'Body')

      expect(reference).toEqual({ $ref: '#/components/schemas/User' })
      expect(SCHEMA_STORAGE.Body.has('User')).toBe(true)
      expect(GLOBAL_SCHEMA_REGISTRY.has('User')).toBe(true)
    })

    it('should handle nested schemas with titles', () => {
      const schema = {
        type: 'object',
        properties: {
          address: {
            type: 'object',
            title: 'Address',
            properties: {
              street: { type: 'string' },
              city: { type: 'string' }
            }
          }
        }
      } as any

      registerSchema('User', schema, 'Body')

      expect(SCHEMA_STORAGE.Other.has('Address')).toBe(true)
      expect(GLOBAL_SCHEMA_REGISTRY.has('Address')).toBe(true)
    })

    it('should default to Other type when no type specified', () => {
      const schema = {
        type: 'string'
      } as any

      registerSchema('SimpleString', schema)

      expect(SCHEMA_STORAGE.Other.has('SimpleString')).toBe(true)
    })
  })

  describe('autoRegisterSchema', () => {
    it('should auto-register schema with title', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number()
      }).meta({
        title: 'AutoUser'
      })

      const result = autoRegisterSchema(schema, 'Query')

      expect(result.title).toBe('AutoUser')
      expect(SCHEMA_STORAGE.Query.has('AutoUser')).toBe(true)
      expect(GLOBAL_SCHEMA_REGISTRY.has('AutoUser')).toBe(true)
    })

    it('should not register schema without title', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number()
      })

      const result = autoRegisterSchema(schema, 'Route')

      expect((result as any).type).toBe('object')
      expect(SCHEMA_STORAGE.Route.size).toBe(0)
      expect(GLOBAL_SCHEMA_REGISTRY.size).toBe(0)
    })

    it('should default to Other type when no type specified', () => {
      const schema = z.string().meta({
        title: 'SimpleString'
      })

      autoRegisterSchema(schema)

      expect(SCHEMA_STORAGE.Other.has('SimpleString')).toBe(true)
    })
  })

  describe('SCHEMA_STORAGE', () => {
    it('should have all schema types initialized', () => {
      expect(SCHEMA_STORAGE.Body).toBeInstanceOf(Map)
      expect(SCHEMA_STORAGE.Query).toBeInstanceOf(Map)
      expect(SCHEMA_STORAGE.Route).toBeInstanceOf(Map)
      expect(SCHEMA_STORAGE.Form).toBeInstanceOf(Map)
      expect(SCHEMA_STORAGE.Other).toBeInstanceOf(Map)
    })

    it('should be empty initially', () => {
      Object.values(SCHEMA_STORAGE).forEach(map => {
        expect(map.size).toBe(0)
      })
    })
  })

  describe('GLOBAL_SCHEMA_REGISTRY', () => {
    it('should be a Map instance', () => {
      expect(GLOBAL_SCHEMA_REGISTRY).toBeInstanceOf(Map)
    })

    it('should be empty initially', () => {
      expect(GLOBAL_SCHEMA_REGISTRY.size).toBe(0)
    })
  })

  describe('createOpenApiDocument', () => {
    let app: INestApplication

    @Module({})
    class EmptyModule {}

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [EmptyModule],
      }).compile()

      app = moduleRef.createNestApplication()
      await app.init()
    })

    afterAll(async () => {
      await app.close()
    })

    it('should merge schemas from storage and global registry into Swagger document', () => {
      const userSchema = { type: 'object', title: 'User', properties: { id: { type: 'number' } } } as any
      const searchSchema = { type: 'object', title: 'Search', properties: { q: { type: 'string' } } } as any
      const globalSchema = { type: 'object', title: 'GlobalThing', properties: { g: { type: 'string' } } } as any

      SCHEMA_STORAGE.Body.set('User', userSchema as any)
      SCHEMA_STORAGE.Query.set('Search', searchSchema as any)
      GLOBAL_SCHEMA_REGISTRY.set('GlobalThing', globalSchema as any)

      const config = new DocumentBuilder()
        .setOpenAPIVersion('3.1.0')
        .setTitle('Test')
        .setVersion('1.0.0')
        .build()

      const doc = createOpenApiDocument(app, config as any)

      expect(doc.components?.schemas?.User).toEqual(userSchema)
      expect(doc.components?.schemas?.Search).toEqual(searchSchema)
      expect(doc.components?.schemas?.GlobalThing).toEqual(globalSchema)
    })

    it('should initialize components and schemas when missing', () => {
      const simple = { type: 'string', title: 'Simple' } as any
      SCHEMA_STORAGE.Other.set('Simple', simple)

      const config = new DocumentBuilder()
        .setTitle('Test')
        .setVersion('1.0.0')
        .build()

      const doc = createOpenApiDocument(app, config as any)

      expect(doc.components).toBeDefined()
      expect(doc.components?.schemas).toBeDefined()
      expect(doc.components?.schemas?.Simple).toEqual(simple)
    })

    it('should handle empty storages without error', () => {
      const config = new DocumentBuilder()
        .setTitle('Test')
        .setVersion('1.0.0')
        .build()

      const doc = createOpenApiDocument(app, config as any)

      expect(doc.components).toBeDefined()
      expect(doc.components?.schemas).toBeDefined()
      expect(typeof doc.components?.schemas).toBe('object')
    })
  })

  describe('createOpenApiDocument with TypedController/TypedRoute', () => {
    it('should produce paths and components referencing registered schemas', async () => {
      const AddressSchema = z.object({
        street: z.string(),
        city: z.string(),
      }).meta({ title: 'Address' })

      const UserSchema = z.object({
        id: z.string().uuid(),
        name: z.string(),
        address: AddressSchema,
      }).meta({ title: 'User' })

      const UserListSchema = z.array(UserSchema).meta({ title: 'UserList' })

      @TypedController('users')
      class UsersController {
        @TypedRoute.Get(undefined, UserListSchema)
        list() {
          return [
            { id: '123e4567-e89b-12d3-a456-426614174000', name: 'John', address: { street: '1st', city: 'NYC' } },
          ]
        }

        @TypedRoute.Get(':id', UserSchema)
        findOne() {
          return { id: '123e4567-e89b-12d3-a456-426614174000', name: 'John', address: { street: '1st', city: 'NYC' } }
        }
      }

      @Module({ controllers: [UsersController] })
      class TestModule {}

      const moduleRef = await Test.createTestingModule({
        imports: [TestModule],
      }).compile()

      const app = moduleRef.createNestApplication()
      await app.init()

      const config = new DocumentBuilder()
        .setOpenAPIVersion('3.1.0')
        .setTitle('Test')
        .setVersion('1.0.0')
        .build()

      const doc = createOpenApiDocument(app, config as any)

      // Components present
      expect(doc.components?.schemas?.User).toBeDefined()
      expect(doc.components?.schemas?.UserList).toBeDefined()
      expect(doc.components?.schemas?.Address).toBeDefined()

      // Paths present
      expect(doc.paths?.['/users']).toBeDefined()
      expect(doc.paths?.['/users/{id}']).toBeDefined()

      // Responses reference component schemas
      const listSchema = (doc.paths?.['/users'] as any).get.responses['200'].content['application/json'].schema
      const oneSchema = (doc.paths?.['/users/{id}'] as any).get.responses['200'].content['application/json'].schema

      expect(listSchema).toEqual({ $ref: '#/components/schemas/UserList' })
      expect(oneSchema).toEqual({ $ref: '#/components/schemas/User' })

      await app.close()
    })
  })
})
