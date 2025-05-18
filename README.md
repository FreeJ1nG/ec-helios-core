# EC-Helios Core

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A privacy-preserving, end-to-end verifiable electronic voting system built on Ethereum using EC-ElGamal encryption. This implementation draws inspiration from the Helios voting system while enhancing it with elliptic curve cryptography for improved efficiency and security.

## Features

- **End-to-End Verifiability**: Voters can verify their votes were correctly recorded and counted
- **Ballot Privacy**: Uses EC-ElGamal encryption with zero-knowledge proofs to protect voter privacy
- **Threshold Decryption**: Multiple trustees must cooperate to decrypt results, preventing single points of failure
- **On-Chain Verification**: All cryptographic proofs verified in smart contracts
- **Open Source**: Fully transparent implementation with no proprietary components

## Architecture

EC-Helios Core consists of three main components:

1. **Smart Contracts**: Ethereum contracts that manage the election process, verify cryptographic proofs, and maintain the election state
2. **Cryptographic Library**: JavaScript implementation of EC-ElGamal encryption and zero-knowledge proofs
3. **Client Interface**: React-based UI for voters, election administrators, and trustees

### Security Features

- **Non-Interactive Zero-Knowledge Proofs**:
  - Proof of private key possession (for trustees)
  - Proof of valid ballot encryption (0/1 values)
  - Proof of single vote selection (sum equals 1)
  - Proof of correct partial decryption

- **Ballot Privacy Protection**:
  - EC-ElGamal encryption for all ballots
  - Ballot weeding to prevent copying attacks
  - Homomorphic aggregation for privacy-preserving tallying

## Prerequisites

- Node.js (v16.x or later)
- npm (v7.x or later)
- MetaMask or another Ethereum wallet

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/FreeJ1nG/ec-helios-core.git
   cd ec-helios-core
   ```

2. Install dependencies:
    ```bash
    pnpm install
    cd frontend && pnpm install
    ```

3. Compile the smart contracts:
    ```bash
    npx hardhat compile
    ```


## Local Development

1. Start a local Ethereum node:
    ```bash
    npx hardhat node
    ```

2. Deploy the contracts to the local network:
    ```bash
    npx hardhat run scripts/deploy.js --network localhost
    ```

3. Start the development server:
    ```bash
    cd frontend
    pnpm run dev
    ```

4. Open your browser and navigate to http://localhost:5173

## Election Process
### 1. Election Setup
An election administrator initializes the election with:

* List of candidates
* List of authorized trustees (with their public keys)
* List of eligible voters
* Election end time

### 2. Voting Phase
Eligible voters cast encrypted ballots through the UI or API:

1. Generate a random value for each candidate
2. Encrypt votes (1 for chosen candidate, 0 for others)
3. Generate zero-knowledge proofs that votes are well-formed
4. Submit encrypted ballot to the blockchain

### 3. Tallying Phase
After the voting period ends, results are tallied:

1. Trustees submit partial decryption shares with validity proofs
2. Anyone can submit vote count suggestions, verified against decrypted points
3. Final tallies are published on-chain

## Smart Contract Overview
The main Election contract implements the core voting protocol:

* `submitBallot`: Validates and stores encrypted ballots
* `submitDecryptionShares`: Processes trustees' partial decryptions
* `submitDecodedVoteSuggestion`: Decodes final vote tallies

Supporting libraries:

* `Ecc.sol`: Elliptic curve operations
* `Zkp.sol`: Zero-knowledge proof verification
* `Utils.sol`: Helper functions

## Cryptographic Details
EC-Helios uses the secp256k1 elliptic curve (same as Ethereum):

* Leverages Ethereum's precompiled contracts for efficient EC operations
* Compatible with standard Ethereum tooling
* EC-ElGamal encryption provides homomorphic properties for privacy-preserving tallying

## Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (git checkout -b feature/amazing-feature)
3. Commit your changes (git commit -m 'Add some amazing feature')
4. Push to the branch (git push origin feature/amazing-feature)
5. Open a Pull Request

## License
This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments
* Helios Voting System for the original design
* Ethereum Community for blockchain infrastructure
* All contributors and researchers in the field of cryptographic voting

Security Disclaimer
While this system uses state-of-the-art cryptographic techniques, it should be thoroughly audited before use in production elections. The security of any cryptographic voting system depends on proper implementation, deployment, and operational security practices.