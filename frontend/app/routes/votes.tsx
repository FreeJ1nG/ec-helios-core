import { useEffect, useState } from 'react'
import { z } from 'zod'

import PaginationGroup from '~/components/pagination-group.tsx'
import ProofDisplay from '~/components/proof-display.tsx'
import { decodeStruct } from '~/lib/blockchain/utils.ts'
import { Ballot, paginatedBallotsSchema } from '~/lib/schemas/helios.ts'
import { useBlockchainStore } from '~/lib/store/blockchain.ts'

export default function VotesPage() {
  const { contract } = useBlockchainStore()
  const [page, setPage] = useState<number>(1)
  const [totalPage, setTotalPage] = useState<number>(1)
  const [ballots, setBallots] = useState<Ballot[]>([])
  const [candidates, setCandidates] = useState<string[]>([])

  useEffect(() => {
    if (!contract) return;
    (async () => {
      const [ccandidates, cballots] = await Promise.all([
        contract.getCandidates(),
        contract.getBallots(page),
      ])
      setCandidates(z.array(z.string()).parse(ccandidates))
      const ballots = decodeStruct(cballots, paginatedBallotsSchema)
      setBallots(ballots.ballots)
      setTotalPage(Number(ballots.totalPage))
    })()
  }, [contract])

  return (
    <div className="mt-8 flex w-full flex-col items-center">
      {ballots.map((ballot, i) => (
        <div key={i} className="mt-6 flex flex-col">
          <div>
            {ballot.votes.map((v, i) => (
              <div key={v.wellFormedVoteProof.c0} className="flex flex-col">
                <div>
                  Vote ciphertext towards
                  {' ' + candidates[i]}
                  : (a, b)
                </div>
                <div>
                  a.x:
                  {' ' + v.ciphertext.a.x.toString()}
                </div>
                <div>
                  a.y:
                  {' ' + v.ciphertext.a.y.toString()}
                </div>
                <div>
                  b.x:
                  {' ' + v.ciphertext.b.x.toString()}
                </div>
                <div>
                  b.y:
                  {' ' + v.ciphertext.b.y.toString()}
                </div>
                <ProofDisplay
                  label="that vote is well formed"
                  proofLabel={candidates[i]}
                  proof={v.wellFormedVoteProof}
                />
              </div>
            ))}
          </div>
          <ProofDisplay
            label="that ballot is directed at one candidate"
            proofLabel="sum"
            proof={ballot.singleVoteSumProof}
            className="mt-4"
          />
        </div>
      ))}
      <div className="mt-4" />
      <PaginationGroup page={page} setPage={setPage} totalPages={totalPage} />
    </div>
  )
}
