import { useEffect, useState } from 'react'

import LoadingScreen from '~/components/loading-screen.tsx'
import PaginationGroup from '~/components/pagination-group.tsx'
import ProofDisplay from '~/components/proof-display.tsx'
import { decodeStruct } from '~/lib/blockchain/utils.ts'
import { Ballot, paginatedBallotsSchema } from '~/lib/schemas/helios.ts'
import { useBlockchainStore } from '~/lib/store/blockchain.ts'
import { useDataStore } from '~/lib/store/data.ts'

export default function VotesPage() {
  const { contract } = useBlockchainStore()
  const { candidates } = useDataStore()
  const [page, setPage] = useState<number>(1)
  const [totalPage, setTotalPage] = useState<number>(1)
  const [ballots, setBallots] = useState<Ballot[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    if (!contract) return
    setLoading(true);
    (async () => {
      const cballots = await contract.getBallots(page)
      const ballots = decodeStruct(cballots, paginatedBallotsSchema)
      setBallots(ballots.ballots)
      setTotalPage(Number(ballots.totalPage))
    })().finally(() => setLoading(false))
  }, [contract, page])

  useEffect(() => {
    if (!contract) return
    setLoading(true);
    (async () => {
      const cballots = await contract.getBallots(page)
      const ballots = decodeStruct(cballots, paginatedBallotsSchema)
      setBallots(ballots.ballots)
      setTotalPage(Number(ballots.totalPage))
    })().finally(() => setLoading(false))
  }, [contract])

  return loading || !candidates ? (
    <LoadingScreen />
  ) : (
    <div className="flex min-h-[calc(100dvh-64px)] flex-col items-center justify-center pb-12">
      {ballots.map((ballot, i) => (
        <div key={i} className="mt-6 flex flex-col">
          <div>
            Vote #
            {ballot.id.toString()}
            {' '}
            from
            {' '}
            {ballot.from}
          </div>
          <div>
            {ballot.votes.map((v, i) => (
              <div
                key={v.wellFormedVoteProof.c0}
                className="mt-2 flex flex-col"
              >
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
                  className="mt-2"
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
