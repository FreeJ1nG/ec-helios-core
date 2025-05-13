import { z } from 'zod'

import { ecPointSchema } from '~/lib/schemas/ecc.ts'

export const keyOwnershipProofSchema = z.object({
  c: z.bigint(),
  d: z.bigint(),
})

export type KeyOwnershipProof = z.infer<typeof keyOwnershipProofSchema>

export const wellFormedVoteProofSchema = z.object({
  a0_: ecPointSchema,
  a1_: ecPointSchema,
  b0_: ecPointSchema,
  b1_: ecPointSchema,
  c0: z.bigint(),
  c1: z.bigint(),
  r0__: z.bigint(),
  r1__: z.bigint(),
})

export type WellFormedVoteProof = z.infer<typeof wellFormedVoteProofSchema>

export const singleVoteSumProofSchema = z.object({
  A_: ecPointSchema,
  B_: ecPointSchema,
  c: z.bigint(),
  R__: z.bigint(),
})

export type SingleVoteSumProof = z.infer<typeof singleVoteSumProofSchema>
