pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/Strings.sol";

contract Ecc {
    struct EcPoint {
        uint256 x; // x-coordinate
        uint256 y; // y-coordinate
    }

    struct EccParams {
        uint256 gx; // Generator point x-coordinate
        uint256 gy; // Generator point y-coordinate
        uint256 a;  // Elliptic curve parameter A
        uint256 b;  // Elliptic curve parameter B
        uint256 p;  // Prime modulus
        uint256 n;  // Order of the curve
    }

    struct ECElGamalCiphertext {
        EcPoint a; // a = G . r
        EcPoint b; // b = pk . r + Encode(m)
    }

    // The following are the elliptic curve parameters for secp256k1
    uint256 public constant GX =
        0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798; // Generator point x-coordinate
    uint256 public constant GY =
        0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8; // Generator point y-coordinate
    uint256 public constant A = 0; // Elliptic curve parameter A
    uint256 public constant B = 7; // Elliptic curve parameter B
    uint256 public constant P = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F; // Prime modulus
    uint256 public constant N = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141; // Order of the curve
    EcPoint public G = EcPoint(GX, GY); // Generator point

    function encodeVote(uint256 v) public view returns (EcPoint memory) {
        require(v == 0 || v == 1, "Invalid vote, can only cast 0 or 1");
        if (v == 0) {
            return G;
        } else if (v == 1) {
            return ecMul(2, G);
        } else {
            revert("Invalid vote");
        }
    }

    function getECCParams() external pure returns (EccParams memory) {
        return EccParams({
            gx: GX,
            gy: GY,
            a: A,
            b: B,
            p: P,
            n: N
        });
    }

    // Pre-computed constant for 2 ** 255
    uint256 private constant U255_MAX_PLUS_1 =
        57896044618658097711785492504343953926634992332820282019728792003956564819968;

    /**
     * @dev Hashes multiple elliptic curve points to a scalar using keccak256.
     * @param points An array of elliptic curve points to hash.
     * @return A scalar derived from the hash of the points.
     */
    function hashMultiplePointsToScalar(EcPoint[] memory points) public pure returns (uint256) {
        require(points.length > 0, "No points provided");
        EcPoint memory compactPoints = points[0];

        for (uint256 i = 1; i < points.length; i++) {
            compactPoints = ecAdd(compactPoints, points[i]);
        }

        return uint256(sha256(abi.encodePacked(
            Strings.toString(compactPoints.x),
            ",",
            Strings.toString(compactPoints.y)
        )));
    }

    /**
     * @dev Factory function to create an elliptic curve point.
     * @param x The x-coordinate of the point.
     * @param y The y-coordinate of the point.
     * @return An EcPoint struct representing the elliptic curve point.
     */
    function newEcPoint(uint256 x, uint256 y) public pure returns (EcPoint memory) {
        return EcPoint(x, y);
    }


    /// @dev Modular euclidean inverse of a number (mod p).
    /// @param _x The number
    /// @return q such that x*q = 1 (mod _pp)
    function invMod(uint256 _x) internal pure returns (uint256) {
        require(_x != 0 && _x != P && P != 0, "Invalid number");
        uint256 q = 0;
        uint256 newT = 1;
        uint256 r = P;
        uint256 t;
        while (_x != 0) {
            t = r / _x;
            (q, newT) = (newT, addmod(q, (P - mulmod(t, newT, P)), P));
            (r, _x) = (_x, r - t * _x);
        }

        return q;
    }

    /// @dev Modular exponentiation, b^e % _pp.
    /// Source: https://github.com/androlo/standard-contracts/blob/master/contracts/src/crypto/ECCMath.sol
    /// @param _base base
    /// @param _exp exponent
    /// @return r such that r = b**e (mod _pp)
    function expMod(
            uint256 _base,
            uint256 _exp
        )
        internal pure
        returns (uint256) 
    {
        require(P != 0, "EllipticCurve: modulus is zero");

        if (_base == 0) return 0;
        if (_exp == 0) return 1;

        uint256 r = 1;
        uint256 bit = U255_MAX_PLUS_1;
        assembly {
            for {

            } gt(bit, 0) {

            } {
                r := mulmod(
                    mulmod(r, r, P),
                    exp(_base, iszero(iszero(and(_exp, bit)))),
                    P
                )
                r := mulmod(
                    mulmod(r, r, P),
                    exp(_base, iszero(iszero(and(_exp, div(bit, 2))))),
                    P
                )
                r := mulmod(
                    mulmod(r, r, P),
                    exp(_base, iszero(iszero(and(_exp, div(bit, 4))))),
                    P
                )
                r := mulmod(
                    mulmod(r, r, P),
                    exp(_base, iszero(iszero(and(_exp, div(bit, 8))))),
                    P
                )
                bit := div(bit, 16)
            }
        }

        return r;
    }

    /// @dev Converts a point (x, y, z) expressed in Jacobian coordinates to affine coordinates (x', y', 1).
    /// @param _x coordinate x
    /// @param _y coordinate y
    /// @param _z coordinate z
    /// @return (x', y') affine coordinates
    function toAffine(
            uint256 _x,
            uint256 _y,
            uint256 _z
        )
        internal pure 
        returns (EcPoint memory)
    {
        uint256 zInv = invMod(_z);
        uint256 zInv2 = mulmod(zInv, zInv, P);
        uint256 x2 = mulmod(_x, zInv2, P);
        uint256 y2 = mulmod(_y, mulmod(zInv, zInv2, P), P);

        return EcPoint(x2, y2);
    }

    /// @dev Derives the y coordinate from a compressed-format point x [[SEC-1]](https://www.secg.org/SEC1-Ver-1.0.pdf).
    /// @param _prefix parity byte (0x02 even, 0x03 odd)
    /// @param _x coordinate x
    /// @return y coordinate y
    function deriveY(
            uint8 _prefix,
            uint256 _x
        ) 
        internal pure 
        returns (uint256) 
    {
        require(
            _prefix == 0x02 || _prefix == 0x03,
            "EllipticCurve:innvalid compressed EC point prefix"
        );

        // x^3 + ax + b
        uint256 y2 = addmod(
            mulmod(_x, mulmod(_x, _x, P), P),
            addmod(mulmod(_x, A, P), B, P),
            P
        );
        y2 = expMod(y2, (P + 1) / 4);
        // uint256 cmp = yBit ^ y_ & 1;
        uint256 y = (y2 + _prefix) % 2 == 0 ? y2 : P - y2;

        return y;
    }

    /// @dev Check whether point (x,y) is on curve defined by a, b, and _pp.
    /// @param _x coordinate x of P1
    /// @param _y coordinate y of P1
    /// @return true if x,y in the curve, false else
    function isOnCurve(
            uint _x,
            uint _y
        ) 
        internal pure 
        returns (bool) 
    {
        if (0 == _x || _x >= P || 0 == _y || _y >= P) {
            return false;
        }
        // y^2
        uint lhs = mulmod(_y, _y, P);
        // x^3
        uint rhs = mulmod(mulmod(_x, _x, P), _x, P);
        if (A != 0) {
            // x^3 + a*x
            rhs = addmod(rhs, mulmod(_x, A, P), P);
        }
        if (B != 0) {
            // x^3 + a*x + b
            rhs = addmod(rhs, B, P);
        }

        return lhs == rhs;
    }

    /// @dev Calculate inverse (x, -y) of point (x, y).
    /// @param _p coordinate P
    /// @return (x, -y)
    function ecInv(
            EcPoint memory _p
        ) 
        internal pure 
        returns (EcPoint memory) 
    {
        return EcPoint(_p.x, (P - _p.y) % P);
    }

    /// @dev Add two points (x1, y1) and (x2, y2) in affine coordinates.
    /// @param _p1 coordinate P1
    /// @param _p2 coordinate P2
    /// @return (qx, qy) = P1+P2 in affine coordinates
    function ecAdd(
            EcPoint memory _p1,
            EcPoint memory _p2
        ) 
        internal pure 
        returns (EcPoint memory) 
    {
        uint x = 0;
        uint y = 0;
        uint z = 0;

        // Double if x1==x2 else add
        if (_p1.x == _p2.x) {
            // y1 = -y2 mod p
            if (addmod(_p1.y, _p2.y, P) == 0) {
                return EcPoint(0, 0);
            } else {
                // P1 = P2
                (x, y, z) = jacDouble(_p1.x, _p1.y, 1);
            }
        } else {
            (x, y, z) = jacAdd(_p1.x, _p1.y, 1, _p2.x, _p2.y, 1);
        }
        // Get back to affine
        return toAffine(x, y, z);
    }

    /// @dev Substract two points (x1, y1) and (x2, y2) in affine coordinates.
    /// @param _p1 coordinate P1
    /// @param _p2 coordinate P2
    /// @return (qx, qy) = P1-P2 in affine coordinates
    function ecSub(
            EcPoint memory _p1,
            EcPoint memory _p2
        ) 
        internal pure 
        returns (EcPoint memory) 
    {
        // invert square
        EcPoint memory inv = ecInv(_p2);
        // P1-square
        return ecAdd(_p1, inv);
    }

    /// @dev Multiply point (x1, y1, z1) times d in affine coordinates.
    /// @param _k scalar to multiply
    /// @param _p coordinate P
    /// @return (qx, qy) = d*P in affine coordinates
    function ecMul(
            uint256 _k,
            EcPoint memory _p
        ) 
        internal pure 
        returns (EcPoint memory) 
    {
        // Jacobian multiplication
        (uint256 x1, uint256 y1, uint256 z1) = jacMul(_k, _p.x, _p.y, 1);
        // Get back to affine
        return toAffine(x1, y1, z1);
    }

    /// @dev Adds two points (x1, y1, z1) and (x2 y2, z2).
    /// @param _x1 coordinate x of P1
    /// @param _y1 coordinate y of P1
    /// @param _z1 coordinate z of P1
    /// @param _x2 coordinate x of square
    /// @param _y2 coordinate y of square
    /// @param _z2 coordinate z of square
    /// @return (qx, qy, qz) P1+square in Jacobian
    function jacAdd(
            uint256 _x1,
            uint256 _y1,
            uint256 _z1,
            uint256 _x2,
            uint256 _y2,
            uint256 _z2
        ) 
        internal pure 
        returns (uint256, uint256, uint256) 
    {
        if (_x1 == 0 && _y1 == 0) return (_x2, _y2, _z2);
        if (_x2 == 0 && _y2 == 0) return (_x1, _y1, _z1);

        // We follow the equations described in https://pdfs.semanticscholar.org/5c64/29952e08025a9649c2b0ba32518e9a7fb5c2.pdf Section 5
        uint[4] memory zs; // z1^2, z1^3, z2^2, z2^3
        zs[0] = mulmod(_z1, _z1, P);
        zs[1] = mulmod(_z1, zs[0], P);
        zs[2] = mulmod(_z2, _z2, P);
        zs[3] = mulmod(_z2, zs[2], P);

        // u1, s1, u2, s2
        zs = [
            mulmod(_x1, zs[2], P),
            mulmod(_y1, zs[3], P),
            mulmod(_x2, zs[0], P),
            mulmod(_y2, zs[1], P)
        ];

        // In case of zs[0] == zs[2] && zs[1] == zs[3], double function should be used
        require(
            zs[0] != zs[2] || zs[1] != zs[3],
            "Use jacDouble function instead"
        );

        uint[4] memory hr;
        //h
        hr[0] = addmod(zs[2], P - zs[0], P);
        //r
        hr[1] = addmod(zs[3], P - zs[1], P);
        //h^2
        hr[2] = mulmod(hr[0], hr[0], P);
        // h^3
        hr[3] = mulmod(hr[2], hr[0], P);
        // qx = -h^3  -2u1h^2+r^2
        uint256 qx = addmod(mulmod(hr[1], hr[1], P), P - hr[3], P);
        qx = addmod(qx, P - mulmod(2, mulmod(zs[0], hr[2], P), P), P);
        // qy = -s1*z1*h^3+r(u1*h^2 -x^3)
        uint256 qy = mulmod(
            hr[1],
            addmod(mulmod(zs[0], hr[2], P), P - qx, P),
            P
        );
        qy = addmod(qy, P - mulmod(zs[1], hr[3], P), P);
        // qz = h*z1*z2
        uint256 qz = mulmod(hr[0], mulmod(_z1, _z2, P), P);
        return (qx, qy, qz);
    }

    /// @dev Doubles a points (x, y, z).
    /// @param _x coordinate x of P1
    /// @param _y coordinate y of P1
    /// @param _z coordinate z of P1
    /// @return (qx, qy, qz) 2P in Jacobian
    function jacDouble(
            uint256 _x,
            uint256 _y,
            uint256 _z
        ) 
        internal pure 
        returns (uint256, uint256, uint256) 
    {
        if (_z == 0) return (_x, _y, _z);

        // We follow the equations described in https://pdfs.semanticscholar.org/5c64/29952e08025a9649c2b0ba32518e9a7fb5c2.pdf Section 5
        // Note: there is a bug in the paper regarding the m parameter, M=3*(x1^2)+a*(z1^4)
        // x, y, z at this point represent the squares of _x, _y, _z
        uint256 x = mulmod(_x, _x, P); //x1^2
        uint256 y = mulmod(_y, _y, P); //y1^2
        uint256 z = mulmod(_z, _z, P); //z1^2

        // s
        uint s = mulmod(4, mulmod(_x, y, P), P);
        // m
        uint m = addmod(
            mulmod(3, x, P),
            mulmod(A, mulmod(z, z, P), P),
            P
        );

        // x, y, z at this point will be reassigned and rather represent qx, qy, qz from the paper
        // This allows to reduce the gas cost and stack footprint of the algorithm
        // qx
        x = addmod(mulmod(m, m, P), P - addmod(s, s, P), P);
        // qy = -8*y1^4 + M(S-T)
        y = addmod(
            mulmod(m, addmod(s, P - x, P), P),
            P - mulmod(8, mulmod(y, y, P), P),
            P
        );
        // qz = 2*y1*z1
        z = mulmod(2, mulmod(_y, _z, P), P);

        return (x, y, z);
    }

    /// @dev Multiply point (x, y, z) times d.
    /// @param _d scalar to multiply
    /// @param _x coordinate x of P1
    /// @param _y coordinate y of P1
    /// @param _z coordinate z of P1
    /// @return (qx, qy, qz) d*P1 in Jacobian
    function jacMul(
            uint256 _d,
            uint256 _x,
            uint256 _y,
            uint256 _z
        ) 
        internal pure 
        returns (uint256, uint256, uint256) 
    {
        // Early return in case that `_d == 0`
        if (_d == 0) {
            return (_x, _y, _z);
        }

        uint256 remaining = _d;
        uint256 qx = 0;
        uint256 qy = 0;
        uint256 qz = 1;

        // Double and add algorithm
        while (remaining != 0) {
            if ((remaining & 1) != 0) {
                (qx, qy, qz) = jacAdd(qx, qy, qz, _x, _y, _z);
            }
            remaining = remaining / 2;
            (_x, _y, _z) = jacDouble(_x, _y, _z);
        }
        return (qx, qy, qz);
    }
}