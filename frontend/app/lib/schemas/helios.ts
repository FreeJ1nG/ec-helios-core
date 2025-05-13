import { z } from 'zod'

import { ecPointSchema } from '~/lib/schemas/ecc.ts'
import { keyOwnershipProofSchema } from '~/lib/schemas/zkp.ts'

export const authoritySchema = z.object({
  publicKey: ecPointSchema,
  proof: keyOwnershipProofSchema,
})

export type Authority = z.infer<typeof authoritySchema>
