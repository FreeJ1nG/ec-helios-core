import { ProjPointType } from '@noble/curves/abstract/weierstrass'
import { secp256k1 } from '@noble/curves/secp256k1'

import { rndEc } from '~/lib/crypto/common.ts'
import { verifyKeyOwnershipProof } from '~/lib/crypto/zkp/verify.ts'
import { EcPoint } from '~/lib/schemas/ecc.ts'
import { Authority } from '~/lib/schemas/helios.ts'

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

export async function calculateElectionPublicKey(
  authorities: Authority[],
): Promise<EcPoint> {
  const verifications = await Promise.all(
    authorities.map(async auth =>
      verifyKeyOwnershipProof(auth.publicKey, auth.proof),
    ),
  )
  for (let i = 0; i < verifications.length; i++) {
    if (!verifications[i]) {
      throw new Error(
        `Unable to verify authority with public key x: ${authorities[i].publicKey.x.toString()}, y: ${authorities[i].publicKey.y.toString()}`,
      )
    }
  }
  let electionPublicKey = authorities[0].publicKey
  for (let i = 1; i < authorities.length; i++) {
    electionPublicKey = electionPublicKey.add(authorities[i].publicKey)
  }
  return electionPublicKey
}
