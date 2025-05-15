import { ethers } from 'ethers'
import { create } from 'zustand'

import ElectionContractJson from '~/artifacts/contracts/Election.sol/Election.json'
import { usePersistStore } from '~/lib/store/persist.ts'

interface BlockchainStore {
  myAddress?: string
  contractAddress?: string
  contract?: ethers.Contract
  accounts: ethers.JsonRpcSigner[]
  updateContractWithNewAccount: (accountIndex: number) => void
  setContract: () => Promise<void>
  setContractAddress: (contractAddress: string) => void
}

export const useBlockchainStore = create<BlockchainStore>((set, get) => ({
  myAddress: undefined,
  contractAddress: undefined,
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
      myAddress: signer.address,
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

      set(state => ({
        ...state,
        contract,
        accounts,
        myAddress: signer.address,
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
