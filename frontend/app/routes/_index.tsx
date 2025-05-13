import { secp256k1 } from '@noble/curves/secp256k1'
import type { MetaFunction } from '@remix-run/node'
import { useEffect, useState } from 'react'
import { z } from 'zod'

import { decodeArrayOfStruct, decodeStruct } from '~/lib/blockchain/utils.ts'
import { toProjPoint } from '~/lib/crypto/common.ts'
import {
  encryptVoteWithProof,
  generateSingleVoteSumProof,
} from '~/lib/crypto/zkp.ts'
import { EcPoint, ecPointSchema } from '~/lib/schemas/ecc.ts'
import {
  Authority,
  authoritySchema,
  Ballot,
  ballotSchema,
  paginatedBallotsSchema,
} from '~/lib/schemas/helios.ts'
import { useBlockchainStore } from '~/lib/store/blockchain.ts'

export const meta: MetaFunction = () => {
  return [
    { title: 'New Remix App' },
    { name: 'description', content: 'Welcome to Remix!' },
  ]
}

export default function Index() {
  const { contract } = useBlockchainStore()
  const [loading, setLoading] = useState(true)
  const [electionPublicKey, setElectionPublicKey] = useState<
    EcPoint | undefined
  >(undefined)
  const [authorities, setAuthorities] = useState<Authority[]>([])
  const [candidates, setCandidates] = useState<string[]>([])
  const [selectedCandidate, setSelectedCandidate] = useState<
    number | undefined
  >(undefined)
  const [totalPage, setTotalPage] = useState(1)
  const [ballots, setBallots] = useState<Ballot[]>([])

  useEffect(() => {
    if (!contract) return;
    (async () => {
      const [cepk, cauthorities, ccandidates, cballots] = await Promise.all([
        contract.electionPublicKey(),
        contract.getAuthorities(),
        contract.getCandidates(),
        contract.getBallots(1),
      ])
      const epk = decodeStruct(cepk, ecPointSchema)
      const authorities = decodeArrayOfStruct(cauthorities, authoritySchema)
      const ballots = decodeStruct(cballots, paginatedBallotsSchema)

      setBallots(ballots.ballots)
      setTotalPage(Number(ballots.totalPage))
      setCandidates(z.array(z.string()).parse(ccandidates))
      setElectionPublicKey(epk)
      setAuthorities(authorities)
    })().then(() => {
      setLoading(false)
    })
  }, [contract])

  const handleSubmit = async () => {
    if (!contract) throw new Error('Unable to get contract')
    if (!electionPublicKey)
      throw new Error('Unable to get election public key')
    const epk = toProjPoint(electionPublicKey)
    let R = 0n
    const votes = await Promise.all(
      Array.from({ length: candidates.length }).map(async (_, i) => {
        const [vote, r] = await encryptVoteWithProof(
          i === selectedCandidate ? 1 : 0,
          epk,
        )
        R = (R + r) % secp256k1.CURVE.n
        return vote
      }),
    )
    const singleVoteSumProof = await generateSingleVoteSumProof(votes, R, epk)
    const ballot: Ballot = {
      votes,
      singleVoteSumProof,
    }

    const transaction = await contract.submitBallot(ballot, {
      gasLimit: 1_000_000_000,
    })

    const receipt = await transaction.wait()

    console.log(' >>', receipt)
  }

  return loading ? (
    <div>Loading ...</div>
  ) : (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="mb-10 text-2xl">Curved being used: secp256k1 curve</div>
      <div>Candidates: </div>
      <div className="mb-4">
        {candidates.map(c => (
          <div key={c}>{c}</div>
        ))}
      </div>
      <div className="flex flex-col items-start">
        <div className="text-xl font-semibold">Election Public Key:</div>
        <div className="text-lg">
          x:
          {electionPublicKey?.x.toString()}
        </div>
        <div className="text-lg">
          y:
          {electionPublicKey?.y.toString()}
        </div>
      </div>
      <div className="mt-4 text-xl font-semibold">List of Authorities:</div>
      {authorities.map((auth, i) => (
        <div
          key={auth.publicKey.x.toString()}
          className="mb-2 flex flex-col items-start"
        >
          <div>
            Authority #
            {i + 1}
          </div>
          <div>
            x:
            {auth.publicKey.x.toString()}
          </div>
          <div>
            y:
            {auth.publicKey.y.toString()}
          </div>
          <div>Proof of key ownership (π):</div>
          <div>
            c:
            {auth.proof.c.toString()}
          </div>
          <div>
            d:
            {auth.proof.d.toString()}
          </div>
        </div>
      ))}

      <div className="mt-12 flex w-[600px] flex-col items-center rounded-xl bg-gray-600 py-12 shadow-xl">
        <div className="text-2xl font-bold">Vote Now!</div>
        <div className="flex flex-col items-start">
          <label htmlFor="candidate" className="mb-2">
            Choose a candidate:
          </label>
          {candidates.map((candidate, i) => (
            <div key={candidate} className="mb-2">
              <input
                type="radio"
                id={candidate}
                name="candidate"
                checked={selectedCandidate === i}
                onChange={() =>
                  selectedCandidate === i
                    ? setSelectedCandidate(undefined)
                    : setSelectedCandidate(i)}
              />
              <label htmlFor={candidate} className="ml-2">
                {candidate}
              </label>
            </div>
          ))}
        </div>
        <button
          onClick={handleSubmit}
          type="submit"
          className="mt-4 rounded bg-blue-500 px-4 py-2 text-white"
        >
          Submit Vote
        </button>
      </div>
      <div>
        {ballots.map((ballot, i) => (
          <div key={i}>{ballot.singleVoteSumProof.c.toString()}</div>
        ))}
      </div>
    </div>
  )
}
