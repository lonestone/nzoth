// modules/post/post.controller.ts
import {
  TypedBody,
  TypedController,
  TypedParam,
  TypedRoute,
} from '@lonestone/nzoth/server'
import { z } from 'zod'
import {
  PostCreate,
  PostCreateSchema,
  Posts,
  PostSchema,
  PostsSchema,
  PostUpdate,
  PostUpdateSchema,
} from './post.contract'

@TypedController(
  'posts',
)
export class PostController {
  @TypedRoute.Get('', PostsSchema)
  findAll(): Posts {
    let filteredPosts = [
      {
        id: '1',
        title: 'Post 1',
        description: 'Post 1 description',
        content: 'Post 1 content',
      },
    ]
    return {
      data: filteredPosts,
      meta: {
        offset: 0,
        pageSize: 10,
        itemCount: filteredPosts.length,
        hasMore: false,
      },
    }
  }

  @TypedRoute.Get(':id', PostSchema)
  findOne(
    @TypedParam('id', z.uuid()) id: string,
  ) {
    return [
      {
        id: '1',
        title: 'Post 1',
        description: 'Post 1 description',
        content: 'Post 1 content',
      },
    ].find(post => post.id === id)
  }

  @TypedRoute.Post('', PostSchema)
  create(
    @TypedBody(PostCreateSchema) postData: PostCreate,
  ) {
    return {
      id: '123e4567-e89b-12d3-a456-426614174000',
      ...postData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }

  @TypedRoute.Put(':id', PostUpdateSchema)
  update(
    @TypedParam('id', z.uuid()) id: string,
    @TypedBody(PostUpdateSchema) postData: PostUpdate,
  ) {
    return {
      id,
      ...postData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }

  @TypedRoute.Delete(':id')
  remove(
    @TypedParam('id', z.uuid()) id: string,
  ) {
    return id
  }
}
