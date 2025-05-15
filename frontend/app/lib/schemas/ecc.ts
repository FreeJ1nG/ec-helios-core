import { secp256k1 } from '@noble/curves/secp256k1'
import { z } from 'zod'

export const ecPointSchema = z
  .object({
    x: z.bigint(),
    y: z.bigint(),
  })
  .transform(({ x, y }) => secp256k1.ProjectivePoint.fromAffine({ x, y }))

export type EcPoint = z.infer<typeof ecPointSchema>

export const ECElGamalCiphertextSchema = z.object({
  a: ecPointSchema,
  b: ecPointSchema,
})

export type ECElGamalCiphertext = z.infer<typeof ECElGamalCiphertextSchema>
