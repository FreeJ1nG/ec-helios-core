import { ProjPointType } from '@noble/curves/abstract/weierstrass'
import { secp256k1 } from '@noble/curves/secp256k1'

import { EcPoint } from '../schemas/ecc'

/**
 * @description This function converts an ArrayBuffer to a hex string.
 * @param buf - The ArrayBuffer to be converted to a hex string
 * @returns A hex string representation of the ArrayBuffer
 */
function bufToHexString(buf: ArrayBuffer): string {
  const arr = new Uint8Array(buf)
  return (
    '0x' +
    Array.from(arr)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  )
}

/**
 * @description This function generates a random 256-bit number using the Web Crypto API.
 * @returns A random 256-bit number
 */
export function rnd256(): bigint {
  const buf = new Uint8Array(32)
  window.crypto.getRandomValues(buf)
  const hexString = bufToHexString(buf)
  return BigInt(hexString)
}

/**
 * @description This function generates a random number between 1 and n (inclusive of 1, exclusive of n), where n is the order of the Elliptic Curve group secp256k1.
 * @param n - The upper limit (exclusive)
 * @returns A random number between 1 and n (inclusive of 1, exclusive of n)
 */
export function rndEc(): bigint {
  const r = rnd256()
  const n = secp256k1.CURVE.n
  return (r % n) + 1n
}

/**
 * @description This function takes an array of projective points and hashes them to a scalar using SHA-256.
 * @param points
 * @returns A scalar value that is the result of hashing the projective points.
 */
export async function hashPointsToScalar(
  points: ProjPointType<bigint>[],
): Promise<bigint> {
  let cumulativePoint = secp256k1.ProjectivePoint.ZERO
  for (const point of points) {
    cumulativePoint = cumulativePoint.add(point)
  }
  return (
    (await sha256(
      cumulativePoint.x.toString() + ',' + cumulativePoint.y.toString(),
    )) % secp256k1.CURVE.n
  )
}

/**
 * @description This function takes a message and hashes it using SHA-256.
 * @param message - The message to be hashed.
 * @returns A bigint representation of the SHA-256 hash of the message.
 */
export async function sha256(message: string): Promise<bigint> {
  const encoder = new TextEncoder()
  const data = encoder.encode(message)
  const hash = await crypto.subtle.digest('SHA-256', data)
  const hexString = bufToHexString(hash)
  return BigInt(hexString)
}

export const EncodedVote = [
  secp256k1.ProjectivePoint.BASE,
  secp256k1.ProjectivePoint.BASE.multiply(2n),
]

export function toProjPoint(p: EcPoint): ProjPointType<bigint> {
  return secp256k1.ProjectivePoint.fromAffine({ x: p.x, y: p.y })
}
