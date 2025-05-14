pragma solidity ^0.8.28;

import "./Ecc.sol";
import "./Zkp.sol";
import "./Utils.sol";
import "hardhat/console.sol";

contract Election is Ecc, Zkp, Utils {
    enum ElectionStatus {
        VoterRegistration,
        Voting,
        Tallying,
        Completed
    }

    string[] public candidates;
    ElectionStatus public status = ElectionStatus.VoterRegistration;

    struct Key {
        address owner;
        EcPoint publicKey;
        Zkp.KeyOwnershipProof proof;
    }

    struct Vote {
        ECElGamalCiphertext ciphertext;
        WellFormedVoteProof wellFormedVoteProof;
    }

    struct BallotInput {
        Vote[] votes;
        SingleVoteSumProof singleVoteSumProof;
    }

    struct Ballot {
        address from;
        Vote[] votes;
        SingleVoteSumProof singleVoteSumProof;
    }

    struct PaginatedBallot {
        Ballot[] ballots;
        uint256 totalPage;
    }

    EcPoint public electionPublicKey;

    Key[] public authorities;
    Ballot[] ballots;
    mapping(address => bool) isEligibleVoter;
    mapping(address => bool) hasVoted;

    event BallotCast(Ballot _ballot);

    constructor(
        Key[] memory _authorityKeys,
        string[] memory _candidates,
        address[] memory _whitelistedAddresses
    ) {
        require(
            status == ElectionStatus.VoterRegistration,
            "Election already started"
        );
        require(_candidates.length > 1, "At least two candidates are required");
        require(
            _authorityKeys.length > 0,
            "At least one authority is required"
        );
        // check if all authorities are unique
        for (uint256 i = 0; i < _authorityKeys.length; i++) {
            for (uint256 j = i + 1; j < _authorityKeys.length; j++) {
                require(
                    (_authorityKeys[i].publicKey.x !=
                        _authorityKeys[j].publicKey.x) ||
                        (_authorityKeys[i].publicKey.y !=
                            _authorityKeys[j].publicKey.y),
                    "Duplicate authority public key"
                );
                require(
                    _authorityKeys[i].proof.c != _authorityKeys[j].proof.c ||
                        _authorityKeys[i].proof.d != _authorityKeys[j].proof.d,
                    "Duplicate authority proof"
                );
            }
        }

        for (uint256 i = 0; i < _whitelistedAddresses.length; i++) {
            isEligibleVoter[_whitelistedAddresses[i]] = true;
        }

        // check if all authorities have valid public keys and proofs
        for (uint256 i = 0; i < _authorityKeys.length; i++) {
            require(
                _authorityKeys[i].publicKey.x != 0 &&
                    _authorityKeys[i].publicKey.y != 0,
                "Invalid public key"
            );
            require(
                verifyKeyOwnershipProof(
                    _authorityKeys[i].publicKey,
                    _authorityKeys[i].proof
                ),
                "Invalid key proof"
            );

            authorities.push(_authorityKeys[i]);
        }

        // Get the election public key by summing the public keys of all authorities
        electionPublicKey = _authorityKeys[0].publicKey;
        for (uint256 i = 1; i < _authorityKeys.length; i++) {
            electionPublicKey = ecAdd(
                electionPublicKey,
                _authorityKeys[i].publicKey
            );
        }

        candidates = _candidates;
        status = ElectionStatus.Voting;
    }

    function getCandidates() external view returns (string[] memory) {
        return candidates;
    }

    function getAuthorities() external view returns (Key[] memory) {
        return authorities;
    }

    function submitBallot(BallotInput memory _ballot) external payable {
        require(
            isEligibleVoter[msg.sender],
            "This voter is not eligible, please consult the election authority for further detail"
        );
        require(
            !hasVoted[msg.sender],
            "This voter has voted before, voters can only vote once"
        );
        require(
            status == ElectionStatus.Voting,
            "Election is not in voting state"
        );
        require(
            _ballot.votes.length == candidates.length,
            "Invalid number of votes, should match the number of candidates"
        );
        // Verify the single vote sum proof
        for (uint256 i = 0; i < _ballot.votes.length; i++) {
            require(
                verifyWellFormedVote(
                    _ballot.votes[i].ciphertext,
                    _ballot.votes[i].wellFormedVoteProof,
                    electionPublicKey
                ),
                "Vote ciphertext is not well-formed"
            );
        }

        ECElGamalCiphertext memory _ciphertextSum = _ballot.votes[0].ciphertext;
        for (uint256 i = 1; i < _ballot.votes.length; i++) {
            _ciphertextSum.a = ecAdd(
                _ciphertextSum.a,
                _ballot.votes[i].ciphertext.a
            );
            _ciphertextSum.b = ecAdd(
                _ciphertextSum.b,
                _ballot.votes[i].ciphertext.b
            );
        }
        require(
            verifySingleSumVoteProof(
                _ciphertextSum,
                _ballot.singleVoteSumProof,
                candidates.length,
                electionPublicKey
            ),
            "Vote sum is not equal to one, meaning a ballot is cast for more than one candidate or zero candidate"
        );

        Ballot memory newBallot = Ballot({
            from: msg.sender,
            votes: _ballot.votes,
            singleVoteSumProof: _ballot.singleVoteSumProof
        });
        ballots.push(newBallot);
        hasVoted[msg.sender] = true;
        emit BallotCast(newBallot);
    }

    function getBallots(
        uint256 page
    ) external view returns (PaginatedBallot memory) {
        console.log(" >>", msg.sender);
        if (ballots.length == 0) {
            return PaginatedBallot({ballots: new Ballot[](0), totalPage: 0});
        }
        uint256 BALLOT_PER_PAGE = 50;
        uint256 totalPage = upDiv(ballots.length, BALLOT_PER_PAGE);
        require(page <= totalPage, "Page out of range");
        uint256 start = (page - 1) * BALLOT_PER_PAGE;
        uint256 end = start + BALLOT_PER_PAGE > ballots.length
            ? ballots.length
            : start + BALLOT_PER_PAGE;
        Ballot[] memory pageBallots = new Ballot[](end - start);
        for (uint256 i = start; i < end; i++) {
            pageBallots[i - start] = ballots[i];
        }
        return PaginatedBallot({ballots: pageBallots, totalPage: totalPage});
    }
}
