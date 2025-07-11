import { faker } from '@faker-js/faker'
import { User } from 'src/modules/user.contract'

export const users: User[] = faker.helpers.multiple(
  () => ({
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    email: faker.internet.email(),
    age: faker.number.int({ min: 18, max: 65 }),
    role: faker.helpers.arrayElement(['admin', 'user']),
    tags: faker.helpers.arrayElements(['tag1', 'tag2', 'tag3']),
    clientId: faker.string.uuid(),
  }),
  {
    count: 100,
  },
)
