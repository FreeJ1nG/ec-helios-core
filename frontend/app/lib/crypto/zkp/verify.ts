import { ProjPointType } from '@noble/curves/abstract/weierstrass'
import { secp256k1 } from '@noble/curves/secp256k1'

import { hashPointsToScalar } from '~/lib/crypto/common.ts'
import { KeyOwnershipProof } from '~/lib/schemas/zkp.ts'

export async function verifyKeyOwnershipProof(
  pk: ProjPointType<bigint>,
  proof: KeyOwnershipProof,
): Promise<boolean> {
  const b = secp256k1.ProjectivePoint.BASE.multiply(proof.d).subtract(
    pk.multiply(proof.c),
  )
  return proof.c === (await hashPointsToScalar([pk, b]))
}
