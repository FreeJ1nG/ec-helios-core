import { AuthorityKey } from "~/lib/crypto/keys";
import { EncodedVote, hashPointsToScalar, rndEc } from "~/lib/crypto/common";
import { secp256k1 } from "@noble/curves/secp256k1";
import { KeyOwnershipProof, WellFormedVoteProof } from "~/lib/schemas/zkp";
import { ProjPointType } from "@noble/curves/abstract/weierstrass";
import { encrypt } from "~/lib/crypto/elgamal";
import { ECElGamalCiphertext } from "~/lib/schemas/ecc";

export async function generateAuthorityKeyOwnershipProof(
  authKey: AuthorityKey,
): Promise<KeyOwnershipProof> {
  const r = rndEc();
  const b = secp256k1.ProjectivePoint.BASE.multiply(r);
  const c = await hashPointsToScalar([authKey.pk, b]);
  const d = (r + c * authKey.sk) % secp256k1.CURVE.n;
  return {
    c,
    d,
  };
}

export async function encryptVoteWithProof(
  v: number, // should either be 0 or 1
  pk: ProjPointType<bigint>,
): Promise<[ECElGamalCiphertext, WellFormedVoteProof]> {
  if (v != 0 && v != 1)
    throw new Error("Vote can only be zero or one, invalid ballot");
  let a0_: ProjPointType<bigint>;
  let a1_: ProjPointType<bigint>;
  let b0_: ProjPointType<bigint>;
  let b1_: ProjPointType<bigint>;
  let c0: bigint;
  let c1: bigint;
  let r0__: bigint;
  let r1__: bigint;

  const r = rndEc();
  const voteCiphertext = encrypt(v, pk, r);

  const a = secp256k1.ProjectivePoint.fromAffine(voteCiphertext.a);
  const b = secp256k1.ProjectivePoint.fromAffine(voteCiphertext.b);
  if (v == 0) {
    // Step 1
    const b_ = b.subtract(EncodedVote[1]);
    c1 = rndEc();
    r1__ = rndEc();
    a1_ = secp256k1.ProjectivePoint.BASE.multiply(r1__).subtract(
      a.multiply(c1),
    );
    b1_ = pk.multiply(r1__).subtract(b_.multiply(c1));

    // Step 2
    const r0_ = rndEc();
    a0_ = secp256k1.ProjectivePoint.BASE.multiply(r0_);
    b0_ = pk.multiply(r0_);

    // Step 3
    const c = await hashPointsToScalar([pk, a, b, a0_, b0_, a1_, b1_]);
    c0 = (c - c1 + 2n * secp256k1.CURVE.n) % secp256k1.CURVE.n;

    // Step 4
    r0__ = (r0_ + c0 * r) % secp256k1.CURVE.n;
  } else {
    // Step 1
    const b_ = b.subtract(EncodedVote[0]);
    c0 = rndEc();
    r0__ = rndEc();
    a0_ = secp256k1.ProjectivePoint.BASE.multiply(r0__).subtract(
      a.multiply(c0),
    );
    b0_ = pk.multiply(r0__).subtract(b_.multiply(c0));

    // Step 2
    const r1_ = rndEc();
    a1_ = secp256k1.ProjectivePoint.BASE.multiply(r1_);
    b1_ = pk.multiply(r1_);

    // Step 3
    const c = await hashPointsToScalar([pk, a, b, a0_, b0_, a1_, b1_]);
    c1 = (c - c0 + 2n * secp256k1.CURVE.n) % secp256k1.CURVE.n;

    // Step 4
    r1__ = (r1_ + c1 * r) % secp256k1.CURVE.n;
  }

  return [
    voteCiphertext,
    {
      a0_,
      a1_,
      b0_,
      b1_,
      c0,
      c1,
      r0__,
      r1__,
    },
  ];
}

export async function generateSingleVoteSumProof() {
  // TODO: Finish this
}
