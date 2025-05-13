import { z } from 'zod'

export const ecPointSchema = z.object({
  x: z.bigint(),
  y: z.bigint(),
})

export type EcPoint = z.infer<typeof ecPointSchema>

export const ECElGamalCiphertextSchema = z.object({
  a: ecPointSchema,
  b: ecPointSchema,
})

export type ECElGamalCiphertext = z.infer<typeof ECElGamalCiphertextSchema>

export const elGamalParamsSchema = z.object({
  gx: z.bigint(), // Generator point x-coordinate
  gy: z.bigint(), // Generator point y-coordinate
  a: z.bigint(), // Elliptic curve parameter A
  b: z.bigint(), // Elliptic curve parameter B
  p: z.bigint(), // Prime modulus
  n: z.bigint(), // Order of the curve
})

export type ElGamalParams = z.infer<typeof elGamalParamsSchema>
