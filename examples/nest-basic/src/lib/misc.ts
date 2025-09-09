import { registerSchema } from "@lonestone/nzoth/server"
import { z } from "zod"

const miscSchema = z.enum(['yes', 'no']).meta({
    title: 'Misc',
    description: 'Misc schema only for testing',
})
  
registerSchema(miscSchema)