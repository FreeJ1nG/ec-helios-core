import { ethers } from 'ethers'
import { create } from 'zustand'

import ElectionContractJson from '~/artifacts/contracts/Election.sol/Election.json'
import { decodeStruct } from '~/lib/blockchain/utils.ts'
import { ElGamalParams, elGamalParamsSchema } from '~/lib/schemas/ecc.ts'

interface BlockchainStore {
  contractAddress?: string
  elGamalParams?: ElGamalParams
  contract?: ethers.Contract
  signer?: ethers.Signer
  setContract: () => Promise<void>
  setContractAddress: (contractAddress: string) => void
}

export const useBlockchainStore = create<BlockchainStore>((set, get) => ({
  contractAddress: undefined,
  elGamalParams: undefined,
  contract: undefined,
  signer: undefined,
  setContract: async () => {
    // Connect to the local blockchain
    const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545')
    const accounts = await provider.listAccounts()
    // Get the first account (if using Ganache or Hardhat)
    const signer = accounts[0]

    try {
      const contractAddress = get().contractAddress
      if (!contractAddress) throw new Error('Unable to find contract address')

      // Connect to the contract
      const contract = new ethers.Contract(
        contractAddress,
        ElectionContractJson.abi,
        signer,
      )

      const elGamalParams = decodeStruct(
        await contract.getECCParams(),
        elGamalParamsSchema,
      )

      set(state => ({
        ...state,
        elGamalParams,
        contract,
        signer,
      }))
    }
    catch (error) {
      console.error('Error connecting to blockchain:', error)
    }
  },
  setContractAddress: (contractAddress) => {
    set(state => ({
      ...state,
      contractAddress,
    }))
  },
}))
