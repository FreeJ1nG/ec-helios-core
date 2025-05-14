import { ethers } from 'ethers'
import { create } from 'zustand'

import ElectionContractJson from '~/artifacts/contracts/Election.sol/Election.json'
import { decodeStruct } from '~/lib/blockchain/utils.ts'
import { ElGamalParams, elGamalParamsSchema } from '~/lib/schemas/ecc.ts'
import { usePersistStore } from '~/lib/store/persist.ts'

interface BlockchainStore {
  contractAddress?: string
  elGamalParams?: ElGamalParams
  contract?: ethers.Contract
  accounts: ethers.JsonRpcSigner[]
  updateContractWithNewAccount: (accountIndex: number) => void
  setContract: () => Promise<void>
  setContractAddress: (contractAddress: string) => void
}

export const useBlockchainStore = create<BlockchainStore>((set, get) => ({
  contractAddress: undefined,
  elGamalParams: undefined,
  contract: undefined,
  accounts: [],
  updateContractWithNewAccount: (accountIndex) => {
    const contractAddress = get().contractAddress
    if (!contractAddress) throw new Error('Unable to find contract address')

    const signer = get().accounts[accountIndex]
    if (!signer)
      throw new Error(`Unable to get account at index ${accountIndex}`)

    const contract = new ethers.Contract(
      contractAddress,
      ElectionContractJson.abi,
      signer,
    )

    set(state => ({
      ...state,
      contract,
    }))
  },
  setContract: async () => {
    // Connect to the local blockchain
    const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545')
    const accounts = await provider.listAccounts()
    // Get the first account (if using Ganache or Hardhat)
    const selectedAccount = usePersistStore.getState().selectedAccount
    const signer = accounts[selectedAccount]

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
        accounts,
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
