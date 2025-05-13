import { ethers } from 'ethers'
import { z } from 'zod'

import ElectionContractJson from '~/artifacts/contracts/Election.sol/Election.json'

export async function serverSideConnectBlockchain() {
  try {
    const contractAddress = process.env.BLOCKCHAIN_ADDRESS

    if (!contractAddress) throw new Error('Unable to get blockchain address')

    // Connect to the local blockchain
    const localProvider = new ethers.JsonRpcProvider('http://127.0.0.1:8545') // Replace with your local blockchain URL

    // Get the first account (if using Ganache or Hardhat)
    const accounts = await localProvider.listAccounts()
    const signer = accounts[0]

    // Connect to the contract
    return new ethers.Contract(
      contractAddress,
      ElectionContractJson.abi,
      signer,
    )
  }
  catch (error) {
    console.error('Error connecting to blockchain:', error)
  }
}

export function decodeStruct<T extends z.AnyZodObject>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  struct: any,
  schema: T,
): z.infer<T> {
  if (!struct) throw new Error('Data is falsy:', struct)
  const keys = Object.keys(schema.shape)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const decoded: any = {}
  for (const key of keys) {
    if (schema.shape[key] instanceof z.ZodObject) {
      decoded[key] = decodeStruct(struct[key], schema.shape[key])
    }
    else if (schema.shape[key] instanceof z.ZodArray) {
      decoded[key] = decodeArrayOfStruct(
        struct[key],
        schema.shape[key]._def.type,
      )
    }
    else {
      decoded[key] = struct[key]
    }
  }

  return schema.parse(decoded)
}

export function decodeArrayOfStruct<T extends z.AnyZodObject>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  arrayOfStruct: any,
  schema: T,
): z.infer<T>[] {
  if (!Array.isArray(arrayOfStruct))
    throw new Error(
      'decodeArrayOfStruct: Data is not an array, can\'t decode it with this function',
    )

  const res = []
  for (const elm of arrayOfStruct) {
    res.push(decodeStruct(elm, schema))
  }

  return res
}
