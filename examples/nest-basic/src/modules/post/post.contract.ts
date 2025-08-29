// modules/post/post.contract.ts
import {
  paginatedSchema,
} from '@lonestone/nzoth/server'
import { z } from 'zod'

export const PostSchema = z
  .object({
    id: z.uuid(),
    title: z.string().min(2),
    description: z.string().min(2),
    content: z.string().min(2),
  }).meta({
    title: 'Post',
    description: 'Post schema',
  })

export type Post = z.infer<typeof PostSchema>

export const PostsSchema = paginatedSchema(PostSchema.omit({ id: true })).meta({
  title: 'Posts paginated',
  description: 'Posts paginated schema',
})

export type Posts = z.infer<typeof PostsSchema>

export const PostCreateSchema = z
  .object({
    title: z.string().min(2),
    description: z.string().min(2),
    content: z.string().min(2),
  })
  .meta({
    title: 'PostCreate',
    description: 'Post create schema',
  })

export type PostCreate = z.infer<typeof PostCreateSchema>

export const PostUpdateSchema = z
  .object({
    title: z.string().min(2),
    description: z.string().min(2),
    content: z.string().min(2),
  })
  .meta({
    title: 'PostUpdate',
    description: 'Post update schema',
  })

export type PostUpdate = z.infer<typeof PostUpdateSchema>   