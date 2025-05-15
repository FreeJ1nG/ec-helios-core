pragma solidity ^0.8.28;

import "./Ecc.sol";
import "./Zkp.sol";
import "./Utils.sol";
import "hardhat/console.sol";

contract Election is Ecc, Zkp, Utils {
    string[] public candidates;

    struct Key {
        address owner;
        EcPoint publicKey;
        KeyOwnershipProof proof;
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
        uint64 id;
        address from;
        Vote[] votes;
        SingleVoteSumProof singleVoteSumProof;
    }

    struct DecryptionShareInput {
        EcPoint d;
        ValidDecryptionShareProof validDecryptionShareProof;
    }

    struct DecryptionShare {
        address decryptedBy;
        EcPoint d;
        ValidDecryptionShareProof validDecryptionShareProof;
    }

    struct PaginatedBallot {
        Ballot[] ballots;
        uint256 totalPage;
    }

    int64[] public voteCountForCandidate;
    EcPoint[] public encodedVotes;
    ECElGamalCiphertext[] public ciphertextTallies;
    uint64 public endTime;
    DecryptionShare[][] public decryptionSharesForCandidate; // decryptionSharesForCandidate[i][j] denotes the j-th decryption share for candidate-i
    EcPoint public electionPublicKey;
    Key[] public authorities;
    Ballot[] public ballots;
    mapping(address => bool) isEligibleVoter;
    mapping(address => bool) hasVoted;
    mapping(address => bool) hasAuthoritySubmittedDecryptionShare;

    event BallotCast(Ballot _ballot);

    constructor(
        Key[] memory _authorityKeys,
        string[] memory _candidates,
        address[] memory _whitelistedAddresses,
        uint64 _endTime
    ) {
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
        electionPublicKey = EcPoint(0, 0);
        for (uint256 i = 0; i < _authorityKeys.length; i++) {
            electionPublicKey = ecAdd(
                electionPublicKey,
                _authorityKeys[i].publicKey
            );
        }

        candidates = _candidates;
        endTime = _endTime;
        decryptionSharesForCandidate = new DecryptionShare[][](
            _candidates.length
        );
        ciphertextTallies = new ECElGamalCiphertext[](_candidates.length);
        voteCountForCandidate = new int64[](_candidates.length);
        encodedVotes = new EcPoint[](_candidates.length);
        for (uint256 i = 0; i < _candidates.length; i++) {
            ciphertextTallies[i] = ECElGamalCiphertext({
                a: EcPoint(0, 0),
                b: EcPoint(0, 0)
            });
            voteCountForCandidate[i] = -1;
            encodedVotes[i] = EcPoint(0, 0);
        }
    }

    function getCandidates() external view returns (string[] memory) {
        return candidates;
    }

    function getAuthorities() external view returns (Key[] memory) {
        return authorities;
    }

    function submitBallot(BallotInput memory _ballot) external payable {
        require(
            block.timestamp <= endTime,
            "Voting period has ended, no longer able to cast ballot"
        );
        require(
            isEligibleVoter[msg.sender],
            "This voter is not eligible, please consult the election authority for further detail"
        );
        require(
            !hasVoted[msg.sender],
            "This voter has voted before, voters can only vote once"
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

        ECElGamalCiphertext memory _ciphertextSum = ECElGamalCiphertext({
            a: EcPoint(0, 0),
            b: EcPoint(0, 0)
        });
        for (uint256 i = 0; i < _ballot.votes.length; i++) {
            _ciphertextSum.a = ecAdd(
                _ciphertextSum.a,
                _ballot.votes[i].ciphertext.a
            );
            _ciphertextSum.b = ecAdd(
                _ciphertextSum.b,
                _ballot.votes[i].ciphertext.b
            );
            ciphertextTallies[i].a = ecAdd(
                ciphertextTallies[i].a,
                _ballot.votes[i].ciphertext.a
            );
            ciphertextTallies[i].b = ecAdd(
                ciphertextTallies[i].b,
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
            id: uint64(ballots.length),
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
        if (ballots.length == 0)
            return PaginatedBallot({ballots: new Ballot[](0), totalPage: 0});
        uint256 BALLOT_PER_PAGE = 5;
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

    function submitDecryptionShares(
        DecryptionShareInput[] memory _decryptionShares
    ) external isAuthority {
        require(
            block.timestamp > endTime,
            "Decryption shares can only be submitted once the election has ended"
        );
        require(
            !hasAuthoritySubmittedDecryptionShare[msg.sender],
            "Authority has submitted decryption share before"
        );
        require(
            _decryptionShares.length == candidates.length,
            "Decryption shares should have the same length as the amount of candidates"
        );

        EcPoint memory publicKey;
        for (uint256 i = 0; i < authorities.length; i++) {
            if (authorities[i].owner == msg.sender) {
                publicKey = authorities[i].publicKey;
            }
        }

        ECElGamalCiphertext[]
            memory _ciphertextTallies = new ECElGamalCiphertext[](
                candidates.length
            );
        for (uint256 i = 0; i < candidates.length; i++) {
            _ciphertextTallies[i] = ECElGamalCiphertext({
                a: EcPoint(0, 0),
                b: EcPoint(0, 0)
            });
        }

        for (uint256 i = 0; i < ballots.length; i++) {
            for (uint256 j = 0; j < candidates.length; j++) {
                _ciphertextTallies[j].a = ecAdd(
                    _ciphertextTallies[j].a,
                    ballots[i].votes[j].ciphertext.a
                );
                _ciphertextTallies[j].b = ecAdd(
                    _ciphertextTallies[j].b,
                    ballots[i].votes[j].ciphertext.b
                );
            }
        }

        for (uint256 i = 0; i < candidates.length; i++) {
            require(
                verifyValidDecryptionShareProof(
                    publicKey,
                    _decryptionShares[i].d,
                    _decryptionShares[i].validDecryptionShareProof,
                    _ciphertextTallies[i]
                ),
                "Invalid decryption share found"
            );
            DecryptionShare memory newDecryptionShare = DecryptionShare({
                decryptedBy: msg.sender,
                d: _decryptionShares[i].d,
                validDecryptionShareProof: _decryptionShares[i]
                    .validDecryptionShareProof
            });
            decryptionSharesForCandidate[i].push(newDecryptionShare);
        }
        hasAuthoritySubmittedDecryptionShare[msg.sender] = true;

        bool _allDone = true;
        for (uint256 i = 0; i < candidates.length; i++) {
            if (decryptionSharesForCandidate[i].length != authorities.length) {
                _allDone = false;
            }
        }

        if (_allDone) {
            for (uint256 i = 0; i < candidates.length; i++) {
                EcPoint memory _dSum = EcPoint(0, 0);
                for (
                    uint256 j = 0;
                    j < decryptionSharesForCandidate[i].length;
                    j++
                ) {
                    _dSum = ecAdd(_dSum, decryptionSharesForCandidate[i][j].d);
                }
                encodedVotes[i] = ecSub(ciphertextTallies[i].b, _dSum);
            }
        }
    }

    function submitDecodedVoteSuggestion(int64[] memory votes) external {
        require(
            votes.length == candidates.length,
            "Votes length must be equal to the number of candidates"
        );
        for (uint256 i = 0; i < candidates.length; i++) {
            require(votes[i] >= 0, "Vote must be a non-negative number");
            uint64 v = uint64(votes[i]);
            require(
                v <= ballots.length,
                "Vote for a candidate cannot exceed the number of ballots submitted"
            );

            EcPoint memory encodedV;
            if (v == 0) {
                encodedV = ecMul(ballots.length, encodeVote(0));
            } else if (v == ballots.length) {
                encodedV = ecMul(ballots.length, encodeVote(1));
            } else {
                // If the encoded vote tallies to v, assuming l is the number of voters
                // In Elliptic Curve, that would be v * P_1 + (ballots.length - v) * P_0
                encodedV = ecAdd(
                    ecMul(v, encodeVote(1)),
                    ecMul(ballots.length - v, encodeVote(0))
                );
            }

            if (
                encodedVotes[i].x == encodedV.x &&
                encodedVotes[i].y == encodedV.y
            ) {
                voteCountForCandidate[i] = int64(v);
            }
        }
    }

    function getDecryptedVotes() external view returns (int64[] memory) {
        return voteCountForCandidate;
    }

    function getCiphertextTallies()
        external
        view
        returns (ECElGamalCiphertext[] memory)
    {
        return ciphertextTallies;
    }

    function getCandidateDecryptionShares()
        external
        view
        returns (DecryptionShare[][] memory)
    {
        return decryptionSharesForCandidate;
    }

    function getAmountOfBallots() external view returns (uint256) {
        return ballots.length;
    }

    modifier isAuthority() {
        bool found = false;
        for (uint256 i = 0; i < authorities.length; i++) {
            if (msg.sender == authorities[i].owner) {
                found = true;
            }
        }
        require(
            found,
            "Must be election authority to call this function, unauthorized access"
        );
        _;
    }
}
