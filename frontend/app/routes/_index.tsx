import { secp256k1 } from '@noble/curves/secp256k1'
import { useState } from 'react'
import { toast } from 'sonner'

import AuthorityList from '~/components/authority-list.tsx'
import EcPointDisplay from '~/components/ecpoint-display.tsx'
import { Timer } from '~/components/timer.tsx'
import { Button } from '~/components/ui/button.tsx'
import {
  encryptVoteWithProof,
  generateSingleVoteSumProof,
} from '~/lib/crypto/zkp/generate.ts'
import { useBlockchainStore } from '~/lib/store/blockchain.ts'
import { useDataStore } from '~/lib/store/data.ts'
import { extractErrorReason } from '~/lib/utils.ts'

export default function Index() {
  const { contract, myAddress } = useBlockchainStore()
  const { candidates, authorities, electionEndTime, electionPublicKey } =
    useDataStore()
  const [selectedCandidate, setSelectedCandidate] = useState<
    number | undefined
  >(undefined)
  const [addressIsSubmittingBallot, setAddressIsSubmittingBallot] = useState<
    string[]
  >([])

  const handleSubmit = async () => {
    if (!contract || !electionPublicKey || !candidates || !myAddress) {
      toast.error(
        'Some neccessary variable(s) haven\'t been initialized properly, can\'t submit ballot',
      )
      return
    }
    setAddressIsSubmittingBallot(prev => [...prev, myAddress])
    try {
      let R = 0n
      const votes = await Promise.all(
        Array.from({ length: candidates.length }).map(async (_, i) => {
          const [vote, r] = await encryptVoteWithProof(
            i === selectedCandidate ? 1 : 0,
            electionPublicKey,
          )
          R = (R + r) % secp256k1.CURVE.n
          return vote
        }),
      )
      const singleVoteSumProof = await generateSingleVoteSumProof(
        votes,
        R,
        electionPublicKey,
      )

      const transaction = await contract.submitBallot(
        {
          votes,
          singleVoteSumProof,
        },
        {
          gasLimit: 1_000_000_000,
        },
      )

      await transaction.wait()
      toast.success('Your ballot has been cast! thanks for voting :D')
    }
    catch (e) {
      toast.error(`Unable to cast your ballot, ${extractErrorReason(e)}`)
    }
    finally {
      setAddressIsSubmittingBallot(prev =>
        prev.filter(addr => addr !== myAddress),
      )
    }
  }

  return (
    <div className="flex min-h-[calc(100dvh-64px)] flex-col items-center justify-center pb-12">
      <div className="mb-5 text-2xl">Curved being used: secp256k1 curve</div>
      {candidates && (
        <>
          <div>Candidates: </div>
          <div className="mb-4">
            {candidates.map(c => (
              <div key={c}>{c}</div>
            ))}
          </div>
        </>
      )}

      {electionPublicKey && (
        <div className="flex flex-col items-start">
          <div className="text-xl font-semibold">Election Public Key:</div>
          <EcPointDisplay p={electionPublicKey} />
        </div>
      )}

      {authorities && <AuthorityList authorities={authorities} />}

      <div className="mt-8" />
      {electionEndTime && <Timer endTime={electionEndTime} />}

      {candidates && (
        <div className="mt-5 flex w-[600px] flex-col items-center rounded-xl bg-gray-200 py-8 shadow-xl">
          <div className="mb-4 text-2xl font-bold">Vote Now!</div>
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
          <Button
            loading={addressIsSubmittingBallot.some(
              addr => addr === myAddress,
            )}
            onClick={handleSubmit}
            type="submit"
            className="mt-4 px-4 py-2"
          >
            Submit Vote
          </Button>
        </div>
      )}
    </div>
  )
}
