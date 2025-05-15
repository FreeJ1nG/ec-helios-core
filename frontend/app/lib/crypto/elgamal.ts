import { ProjPointType } from '@noble/curves/abstract/weierstrass'
import { secp256k1 } from '@noble/curves/secp256k1'

import { EncodedVote, rndEc } from '~/lib/crypto/common.ts'
import {
  verifySingleVoteSumProof,
  verifyWellFormedVote,
} from '~/lib/crypto/zkp/verify.ts'
import { ECElGamalCiphertext } from '~/lib/schemas/ecc.ts'
import { Ballot, DecryptionShare } from '~/lib/schemas/helios.ts'

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

export function addCiphertext(
  c1: ECElGamalCiphertext,
  c2: ECElGamalCiphertext,
): ECElGamalCiphertext {
  return {
    a: c1.a.add(c2.a),
    b: c1.b.add(c2.b),
  }
}

export function verifyBallot(
  pk: ProjPointType<bigint>,
  ballot: Ballot,
  candidateNum: number,
): boolean {
  if (!verifySingleVoteSumProof(pk, ballot, candidateNum)) {
    return false
  }
  for (const vote of ballot.votes) {
    if (!verifyWellFormedVote(pk, vote.ciphertext, vote.wellFormedVoteProof)) {
      return false
    }
  }
  return true
}

export function verifyAndTallyBallots(
  pk: ProjPointType<bigint>,
  ballots: Ballot[],
  candidateNum: number,
): ECElGamalCiphertext[] {
  const result: ECElGamalCiphertext[] = Array.from({
    length: candidateNum,
  }).map(() => ({
    a: secp256k1.ProjectivePoint.ZERO,
    b: secp256k1.ProjectivePoint.ZERO,
  }))

  for (const ballot of ballots) {
    if (!verifyBallot(pk, ballot, candidateNum))
      throw new Error('Invalid ballot detected, cannot tally ballots')
    for (let i = 0; i < ballot.votes.length; i++) {
      result[i] = addCiphertext(result[i], ballot.votes[i].ciphertext)
    }
  }

  return result
}

export function combineDecryptionShares(
  ciphertextTallies: ECElGamalCiphertext[],
  decryptionSharesForCandidate: DecryptionShare[][],
  ballotAmount: number,
): number[] {
  const decryptions: number[] = []
  for (let i = 0; i < ciphertextTallies.length; i++) {
    let dSum = secp256k1.ProjectivePoint.ZERO
    for (let j = 0; j < decryptionSharesForCandidate[i].length; j++) {
      dSum = dSum.add(decryptionSharesForCandidate[i][j].d)
    }
    const encodedVote = ciphertextTallies[i].b.subtract(dSum)
    if (encodedVote.equals(EncodedVote[0].multiply(BigInt(ballotAmount)))) {
      decryptions.push(0)
      continue
    }
    for (let v = 1; v < ballotAmount; v++) {
      const pv = EncodedVote[1]
        .multiply(BigInt(v))
        .add(EncodedVote[0].multiply(BigInt(ballotAmount - v)))
      if (pv.equals(encodedVote)) {
        decryptions.push(v)
        break
      }
    }
    if (encodedVote.equals(EncodedVote[1].multiply(BigInt(ballotAmount)))) {
      decryptions.push(ballotAmount)
      continue
    }
  }
  return decryptions
}
