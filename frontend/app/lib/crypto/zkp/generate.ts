import { ProjPointType } from '@noble/curves/abstract/weierstrass'
import { secp256k1 } from '@noble/curves/secp256k1'

import {
  EncodedVote,
  hashPointsToScalar,
  rndEc,
  toProjPoint,
} from '~/lib/crypto/common.ts'
import { encrypt } from '~/lib/crypto/elgamal.ts'
import { AuthorityKey } from '~/lib/crypto/keys.ts'
import { Vote } from '~/lib/schemas/helios.ts'
import { KeyOwnershipProof, SingleVoteSumProof } from '~/lib/schemas/zkp.ts'

export async function generateAuthorityKeyOwnershipProof(
  authKey: AuthorityKey,
): Promise<KeyOwnershipProof> {
  const r = rndEc()
  const b = secp256k1.ProjectivePoint.BASE.multiply(r)
  const c = await hashPointsToScalar([authKey.pk, b])
  const d = (r + c * authKey.sk) % secp256k1.CURVE.n
  return {
    c,
    d,
  }
}

export async function encryptVoteWithProof(
  v: number, // should either be 0 or 1
  pk: ProjPointType<bigint>,
): Promise<[Vote, bigint]> {
  if (v != 0 && v != 1)
    throw new Error('Vote can only be zero or one, invalid ballot')
  let a0_: ProjPointType<bigint>
  let a1_: ProjPointType<bigint>
  let b0_: ProjPointType<bigint>
  let b1_: ProjPointType<bigint>
  let c0: bigint
  let c1: bigint
  let r0__: bigint
  let r1__: bigint

  const r = rndEc()
  const voteCiphertext = encrypt(v, pk, r)

  const a = toProjPoint(voteCiphertext.a)
  const b = toProjPoint(voteCiphertext.b)
  if (v == 0) {
    // Step 1
    const b_ = b.subtract(EncodedVote[1])
    c1 = rndEc()
    r1__ = rndEc()
    a1_ = secp256k1.ProjectivePoint.BASE.multiply(r1__).subtract(
      a.multiply(c1),
    )
    b1_ = pk.multiply(r1__).subtract(b_.multiply(c1))

    // Step 2
    const r0_ = rndEc()
    a0_ = secp256k1.ProjectivePoint.BASE.multiply(r0_)
    b0_ = pk.multiply(r0_)

    // Step 3
    const c = await hashPointsToScalar([pk, a, b, a0_, b0_, a1_, b1_])
    c0 = (c - c1 + 2n * secp256k1.CURVE.n) % secp256k1.CURVE.n

    // Step 4
    r0__ = (r0_ + c0 * r) % secp256k1.CURVE.n
  }
  else {
    // Step 1
    const b_ = b.subtract(EncodedVote[0])
    c0 = rndEc()
    r0__ = rndEc()
    a0_ = secp256k1.ProjectivePoint.BASE.multiply(r0__).subtract(
      a.multiply(c0),
    )
    b0_ = pk.multiply(r0__).subtract(b_.multiply(c0))

    // Step 2
    const r1_ = rndEc()
    a1_ = secp256k1.ProjectivePoint.BASE.multiply(r1_)
    b1_ = pk.multiply(r1_)

    // Step 3
    const c = await hashPointsToScalar([pk, a, b, a0_, b0_, a1_, b1_])
    c1 = (c - c0 + 2n * secp256k1.CURVE.n) % secp256k1.CURVE.n

    // Step 4
    r1__ = (r1_ + c1 * r) % secp256k1.CURVE.n
  }

  return [
    {
      ciphertext: voteCiphertext,
      wellFormedVoteProof: {
        a0_,
        a1_,
        b0_,
        b1_,
        c0,
        c1,
        r0__,
        r1__,
      },
    },
    r,
  ]
}

export async function generateSingleVoteSumProof(
  votes: Vote[],
  R: bigint,
  pk: ProjPointType<bigint>,
): Promise<SingleVoteSumProof> {
  if (votes.length === 0)
    throw new Error(
      'There must be at least one vote to generate single vote sum proof',
    )
  let A = toProjPoint(votes[0].ciphertext.a),
    B = toProjPoint(votes[0].ciphertext.b)
  for (let i = 1; i < votes.length; i++) {
    A = A.add(toProjPoint(votes[i].ciphertext.a))
    B = B.add(toProjPoint(votes[i].ciphertext.b))
  }

  // const B_red = B.subtract(
  //   EncodedVote[1].add(EncodedVote[0].multiply(BigInt(votes.length - 1))),
  // )

  const R_ = rndEc()
  const A_ = secp256k1.ProjectivePoint.BASE.multiply(R_)
  const B_ = pk.multiply(R_)
  const c = await hashPointsToScalar([pk, A, B, A_, B_])
  const R__ = (R_ + c * R) % secp256k1.CURVE.n
  return {
    A_,
    B_,
    c,
    R__,
  }
}
