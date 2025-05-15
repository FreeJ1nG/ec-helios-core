import { secp256k1 } from '@noble/curves/secp256k1'

import { EncodedVote, hashPointsToScalar } from '~/lib/crypto/common.ts'
import { ECElGamalCiphertext, EcPoint } from '~/lib/schemas/ecc.ts'
import { Ballot, DecryptionShare } from '~/lib/schemas/helios.ts'
import { KeyOwnershipProof, WellFormedVoteProof } from '~/lib/schemas/zkp.ts'

export async function verifyKeyOwnershipProof(
  pk: EcPoint,
  proof: KeyOwnershipProof,
): Promise<boolean> {
  const b = secp256k1.ProjectivePoint.BASE.multiply(proof.d).subtract(
    pk.multiply(proof.c),
  )
  return proof.c === (await hashPointsToScalar([pk, b]))
}

export async function verifyWellFormedVote(
  pk: EcPoint,
  voteCiphertext: ECElGamalCiphertext,
  proof: WellFormedVoteProof,
): Promise<boolean> {
  const { a, b } = voteCiphertext
  const { a0_, b0_, a1_, b1_, c0, c1, r0__, r1__ } = proof

  let lhs = secp256k1.ProjectivePoint.BASE.multiply(r0__)
  let rhs = a0_.add(a.multiply(c0))
  if (!lhs.equals(rhs)) return false

  lhs = secp256k1.ProjectivePoint.BASE.multiply(r1__)
  rhs = a1_.add(a.multiply(c1))
  if (!lhs.equals(rhs)) return false

  lhs = pk.multiply(r0__)
  rhs = b0_.add(b.subtract(EncodedVote[0]).multiply(c0))
  if (!lhs.equals(rhs)) return false

  lhs = pk.multiply(r1__)
  rhs = b1_.add(b.subtract(EncodedVote[1]).multiply(c1))
  if (!lhs.equals(rhs)) return false

  return (
    (c0 + c1) % secp256k1.CURVE.n ===
    (await hashPointsToScalar([pk, a, b, a0_, b0_, a1_, b1_]))
  )
}

export async function verifySingleVoteSumProof(
  pk: EcPoint,
  ballot: Ballot,
  candidateNum: number,
): Promise<boolean> {
  if (candidateNum !== ballot.votes.length) return false
  if (ballot.votes.length === 0)
    throw new Error('Unable to process votes with zero length')

  let A = secp256k1.ProjectivePoint.ZERO
  let B = secp256k1.ProjectivePoint.ZERO
  for (let i = 0; i < ballot.votes.length; i++) {
    A = A.add(ballot.votes[i].ciphertext.a)
    B = B.add(ballot.votes[i].ciphertext.b)
  }

  const { R__, A_, B_, c } = ballot.singleVoteSumProof

  let lhs = secp256k1.ProjectivePoint.BASE.multiply(R__)
  let rhs = A_.add(A.multiply(c))
  if (!lhs.equals(rhs)) return false

  lhs = pk.multiply(R__)
  rhs = B_.add(
    B.subtract(
      EncodedVote[1].add(EncodedVote[0].multiply(BigInt(candidateNum - 1))),
    ).multiply(c),
  )
  if (!lhs.equals(rhs)) return false

  return (
    c % secp256k1.CURVE.n === (await hashPointsToScalar([pk, A, B, A_, B_]))
  )
}

export async function verifyValidDecryptionShareProof(
  authorityPublicKeyShare: EcPoint,
  ballotCiphertextTally: ECElGamalCiphertext,
  decryptionShare: DecryptionShare,
): Promise<boolean> {
  const d = decryptionShare.d
  const { u, v, s } = decryptionShare.validDecryptionShareProof
  const { a } = ballotCiphertextTally
  const c = await hashPointsToScalar([
    authorityPublicKeyShare,
    ballotCiphertextTally.a,
    ballotCiphertextTally.b,
    u,
    v,
  ])

  let lhs = a.multiply(s)
  let rhs = u.add(d.multiply(c))
  if (!lhs.equals(rhs)) return false

  lhs = secp256k1.ProjectivePoint.BASE.multiply(s)
  rhs = v.add(authorityPublicKeyShare.multiply(c))
  return lhs.equals(rhs)
}
