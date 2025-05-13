import { ProjPointType } from '@noble/curves/abstract/weierstrass'
import { secp256k1 } from '@noble/curves/secp256k1'

import { rndEc } from '~/lib/crypto/common.ts'

export interface AuthorityKey {
  sk: bigint
  pk: ProjPointType<bigint>
}

/**
 * @description Generates a random ElGamal key pair
 * @returns A random ElGamal key pair
 */
export function generateRandomElGamalKey(): AuthorityKey {
  const sk = rndEc()
  const pk = secp256k1.ProjectivePoint.BASE.multiply(sk)
  return {
    sk,
    pk,
  }
}
