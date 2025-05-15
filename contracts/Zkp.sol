pragma solidity ^0.8.28;

import "./Ecc.sol";
import "hardhat/console.sol";

contract Zkp is Ecc {
    struct KeyOwnershipProof {
        uint256 c;
        uint256 d;
    }

    function verifyKeyOwnershipProof(
        EcPoint memory _publicKey,
        KeyOwnershipProof memory _proof
    ) internal view returns (bool) {
        EcPoint memory Gd = ecMul(_proof.d, G);
        EcPoint memory pkc = ecMul(_proof.c, _publicKey);
        EcPoint memory b = ecSub(Gd, pkc);

        EcPoint[] memory _points = new EcPoint[](2);
        _points[0] = _publicKey;
        _points[1] = b;

        return _proof.c == hashMultiplePointsToScalar(_points);
    }

    struct SingleVoteSumProof {
        EcPoint A_;
        EcPoint B_;
        uint256 c;
        uint256 R__;
    }

    struct WellFormedVoteProof {
        EcPoint a0_;
        EcPoint a1_;
        EcPoint b0_;
        EcPoint b1_;
        uint256 c0;
        uint256 c1;
        uint256 r0__;
        uint256 r1__;
    }

    struct ValidDecryptionShareProof {
        EcPoint u;
        EcPoint v;
        uint256 s;
    }

    function verifyWellFormedVote(
        ECElGamalCiphertext memory _ciphertext,
        WellFormedVoteProof memory _proof,
        EcPoint memory _pk
    ) internal view returns (bool) {
        // Verify the well-formedness of the vote

        // First equation to check: G . r0__ = a0_ + a . c0
        EcPoint memory lhs = ecMul(_proof.r0__, G);
        EcPoint memory rhs = ecAdd(_proof.a0_, ecMul(_proof.c0, _ciphertext.a));
        if (lhs.x != rhs.x || lhs.y != rhs.y) return false;

        // Second equation to check: G . r1__ = a1_ + a . c1
        lhs = ecMul(_proof.r1__, G);
        rhs = ecAdd(_proof.a1_, ecMul(_proof.c1, _ciphertext.a));
        if (lhs.x != rhs.x || lhs.y != rhs.y) return false;

        // Third equation to check: pk . r0__ = b0_ + (b - EncodedVote[0]) . c0
        lhs = ecMul(_proof.r0__, _pk);
        rhs = ecAdd(
            _proof.b0_,
            ecMul(_proof.c0, ecSub(_ciphertext.b, encodeVote(0)))
        );
        if (lhs.x != rhs.x || lhs.y != rhs.y) return false;

        // Fourth equation to check: pk . r1__ = b1_ + (b - EncodedVote[1]) . c1
        lhs = ecMul(_proof.r1__, _pk);
        rhs = ecAdd(
            _proof.b1_,
            ecMul(_proof.c1, ecSub(_ciphertext.b, encodeVote(1)))
        );
        if (lhs.x != rhs.x || lhs.y != rhs.y) return false;

        EcPoint[] memory _points = new EcPoint[](7);
        _points[0] = _pk;
        _points[1] = _ciphertext.a;
        _points[2] = _ciphertext.b;
        _points[3] = _proof.a0_;
        _points[4] = _proof.b0_;
        _points[5] = _proof.a1_;
        _points[6] = _proof.b1_;

        // Fifth equation to check: c0 + c1 = H(pk, a, b, a0_, b0_, a1_, b1_)
        return
            addmod(_proof.c0, _proof.c1, N) ==
            hashMultiplePointsToScalar(_points) % N;
    }

    function verifySingleSumVoteProof(
        ECElGamalCiphertext memory _ciphertextSum,
        SingleVoteSumProof memory _proof,
        uint256 candidateNum,
        EcPoint memory _pk
    ) internal view returns (bool) {
        // Verify that the sum of votes is equal to one, meaning a ballot is cast for one candidate only

        // First equation to check: G . R__ = A_ + A . c
        EcPoint memory lhs = ecMul(_proof.R__, G);
        EcPoint memory rhs = ecAdd(
            _proof.A_,
            ecMul(_proof.c, _ciphertextSum.a)
        );
        if (lhs.x != rhs.x || lhs.y != rhs.y) return false;

        // Second equation to check: pk . R__ = B_ + (B - (EncodedVote[1] + (k - 1) * EncodedVote[0])) . c, where k is the number of candidates
        lhs = ecMul(_proof.R__, _pk);
        rhs = ecAdd(
            _proof.B_,
            ecMul(
                _proof.c,
                ecSub(
                    _ciphertextSum.b,
                    ecAdd(encodeVote(1), ecMul(candidateNum - 1, encodeVote(0)))
                )
            )
        );
        if (lhs.x != rhs.x || lhs.y != rhs.y) return false;

        EcPoint[] memory _points = new EcPoint[](5);
        _points[0] = _pk;
        _points[1] = _ciphertextSum.a;
        _points[2] = _ciphertextSum.b;
        _points[3] = _proof.A_;
        _points[4] = _proof.B_;

        // Third equation to check: c = H(pk, A, B, A_, B_)
        return (_proof.c) % N == hashMultiplePointsToScalar(_points) % N;
    }

    function verifyValidDecryptionShareProof(
        EcPoint memory _authorityPublicKey,
        EcPoint memory _d,
        ValidDecryptionShareProof memory _proof,
        ECElGamalCiphertext memory _ballotCiphertextTally
    ) internal view returns (bool) {
        EcPoint[] memory _points = new EcPoint[](5);
        _points[0] = _authorityPublicKey;
        _points[1] = _ballotCiphertextTally.a;
        _points[2] = _ballotCiphertextTally.b;
        _points[3] = _proof.u;
        _points[4] = _proof.v;

        uint256 c = hashMultiplePointsToScalar(_points);

        EcPoint memory lhs = ecMul(_proof.s, _ballotCiphertextTally.a);
        EcPoint memory rhs = ecAdd(_proof.u, ecMul(c, _d));
        if (lhs.x != rhs.x || lhs.y != rhs.y) return false;

        lhs = ecMul(_proof.s, G);
        rhs = ecAdd(_proof.v, ecMul(c, _authorityPublicKey));
        return (lhs.x == rhs.x && lhs.y == rhs.y);
    }
}
