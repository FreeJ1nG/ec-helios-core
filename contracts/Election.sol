pragma solidity ^0.8.28;

import "./Ecc.sol";
import "./Zkp.sol";
import "./Utils.sol";
import "hardhat/console.sol";

contract Election is Ecc, Zkp, Utils {
    enum ElectionStatus { VoterRegistration, Voting, Tallying, Completed }

    struct ElGamalCiphertext {
        uint256 a; // a = G . r
        uint256 b; // b = pk . r + Encode(m)
    }

    string[] public candidates;
    ElectionStatus public status = ElectionStatus.VoterRegistration;

    struct Authority {
        EcPoint publicKey;
        Zkp.KeyOwnershipProof proof;
    }

    struct Vote {
        ECElGamalCiphertext ciphertext;
        WellFormedVoteProof wellFormedVoteProof;
    }

    struct Ballot {
        Vote[] votes;
        SingleVoteSumProof singleVoteSumProof;
    }

    struct PaginatedBallot {
        Ballot[] ballots;
        uint256 totalPage;
    }

    Authority[] public authorities;
    Ballot[] public ballots;
    EcPoint public electionPublicKey;

    event BallotCast(Ballot _ballot);

    constructor(Authority[] memory _authorities, string[] memory _candidates) {
        require(status == ElectionStatus.VoterRegistration, "Election already started");
        require(_candidates.length > 1, "At least two candidates are required");
        require(_authorities.length > 0, "At least one authority is required");
        // check if all authorities are unique
        for (uint256 i = 0; i < _authorities.length; i++) {
            for (uint256 j = i + 1; j < _authorities.length; j++) {
                require(_authorities[i].publicKey.x != _authorities[j].publicKey.x || _authorities[i].publicKey.y != _authorities[j].publicKey.y, "Duplicate authority public key");
                require(_authorities[i].proof.c != _authorities[j].proof.c || _authorities[i].proof.d != _authorities[j].proof.d, "Duplicate authority proof");
            }
        }
        // check if all authorities have valid public keys and proofs
        for (uint256 i = 0; i < _authorities.length; i++) {
            require(_authorities[i].publicKey.x != 0 && _authorities[i].publicKey.y != 0, "Invalid public key");
            require(verifyKeyOwnershipProof(_authorities[i].publicKey, _authorities[i].proof), "Invalid key proof");
            authorities.push(_authorities[i]);
        }

        // Get the election public key by summing the public keys of all authorities
        electionPublicKey = authorities[0].publicKey;
        for (uint256 i = 1; i < authorities.length; i++) {
            electionPublicKey = ecAdd(electionPublicKey, authorities[i].publicKey);
        }

        candidates = _candidates;
        status = ElectionStatus.Voting;
    }

    function getCandidates() external view returns (string[] memory) {
        return candidates;
    }

    function getAuthorities() external view returns (Authority[] memory) {
        return authorities;
    }

    function submitBallot(Ballot memory _ballot) external payable {
        require(status == ElectionStatus.Voting, "Election is not in voting state");
        require(_ballot.votes.length == candidates.length, "Invalid number of votes");
        // Verify the single vote sum proof
        for (uint256 i = 0; i < _ballot.votes.length; i++) {
            require(
                verifyWellFormedVote(_ballot.votes[i].ciphertext, _ballot.votes[i].wellFormedVoteProof, electionPublicKey),
                "Vote ciphertext is not well-formed"
            );
        }
        ECElGamalCiphertext memory _ciphertextSum = _ballot.votes[0].ciphertext;
        for (uint256 i = 1; i < _ballot.votes.length; i++) {
            _ciphertextSum.a = ecAdd(_ciphertextSum.a, _ballot.votes[i].ciphertext.a);
            _ciphertextSum.b = ecAdd(_ciphertextSum.b, _ballot.votes[i].ciphertext.b);
        }
        require(
            verifySingleSumVoteProof(_ciphertextSum, _ballot.singleVoteSumProof, candidates.length, electionPublicKey),
            "Vote sum is not equal to one, meaning a ballot is cast for more than one candidate or zero candidate"
        );
        ballots.push(_ballot);
        emit BallotCast(_ballot);
    }

    function getBallots(uint256 page) external view returns (PaginatedBallot memory) {
        if (ballots.length == 0) {
            console.log(" >> no ballots");
            return PaginatedBallot({
                ballots: new Ballot[](0),
                totalPage: 0
            });
        }
        uint256 BALLOT_PER_PAGE = 50;
        uint256 totalPage = upDiv(ballots.length, BALLOT_PER_PAGE);
        require(page <= totalPage, "Page out of range");
        uint256 start = (page - 1) * BALLOT_PER_PAGE;
        uint256 end = start + BALLOT_PER_PAGE > ballots.length ? ballots.length : start + BALLOT_PER_PAGE;
        console.log(" >>", start, end);
        Ballot[] memory pageBallots = new Ballot[](end - start);
        for (uint256 i = start; i < end; i++) {
            pageBallots[i - start] = ballots[i];
        }
        return PaginatedBallot({
            ballots: pageBallots,
            totalPage: totalPage
        });
    }
}