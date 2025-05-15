import { z } from 'zod'

import { ECElGamalCiphertextSchema, ecPointSchema } from '~/lib/schemas/ecc.ts'
import {
  keyOwnershipProofSchema,
  singleVoteSumProofSchema,
  validDecryptionShareProofSchema,
  wellFormedVoteProofSchema,
} from '~/lib/schemas/zkp.ts'

export const authoritySchema = z.object({
  owner: z.string(),
  publicKey: ecPointSchema,
  proof: keyOwnershipProofSchema,
})

export type Authority = z.infer<typeof authoritySchema>

export const voteSchema = z.object({
  ciphertext: ECElGamalCiphertextSchema,
  wellFormedVoteProof: wellFormedVoteProofSchema,
})

export type Vote = z.infer<typeof voteSchema>

export const ballotSchema = z.object({
  id: z.bigint(),
  from: z.string(),
  votes: z.array(voteSchema),
  singleVoteSumProof: singleVoteSumProofSchema,
})

export type Ballot = z.infer<typeof ballotSchema>

export const paginatedBallotsSchema = z.object({
  ballots: z.array(ballotSchema),
  totalPage: z.bigint(),
})

export const decryptionShareSchema = z.object({
  decryptedBy: z.string(),
  d: ecPointSchema,
  validDecryptionShareProof: validDecryptionShareProofSchema,
})

export type DecryptionShare = z.infer<typeof decryptionShareSchema>
