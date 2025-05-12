import { secp256k1 } from "@noble/curves/secp256k1";
import { ECElGamalCiphertext } from "~/lib/schemas/ecc";
import { EncodedVote, rndEc } from "~/lib/crypto/common";
import { ProjPointType } from "@noble/curves/abstract/weierstrass";

export function encrypt(
  v: number,
  pk: ProjPointType<bigint>,
  r: bigint = rndEc(),
): ECElGamalCiphertext {
  if (v != 0 && v != 1) throw new Error("Only able to encrypt v = 0 or v = 1");
  const a = secp256k1.ProjectivePoint.BASE.multiply(r);
  const b = EncodedVote[v].add(pk.multiply(r));
  return { a, b };
}
