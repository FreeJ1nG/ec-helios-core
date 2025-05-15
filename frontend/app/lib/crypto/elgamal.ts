import { ProjPointType } from '@noble/curves/abstract/weierstrass'
import { secp256k1 } from '@noble/curves/secp256k1'

import { EncodedVote, rndEc } from '~/lib/crypto/common.ts'
import { ECElGamalCiphertext, EcPoint } from '~/lib/schemas/ecc.ts'

export function encrypt(
  v: number,
  pk: ProjPointType<bigint>,
  r: bigint = rndEc(),
): ECElGamalCiphertext {
  if (v != 0 && v != 1) throw new Error('Only able to encrypt v = 0 or v = 1')
  const a = secp256k1.ProjectivePoint.BASE.multiply(r)
  const b = EncodedVote[v].add(pk.multiply(r))
  return { a, b }
}

export function verifyAndTallyBallots(ballots: Ballot[]): EcPoint[] {}
