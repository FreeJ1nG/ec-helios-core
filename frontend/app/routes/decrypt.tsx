import { useEffect, useState } from 'react'

import LoadingScreen from '~/components/loading-screen.tsx'
import { Input } from '~/components/ui/input.tsx'
import { decodeArrayOfStruct } from '~/lib/blockchain/utils.ts'
import { Ballot, ballotSchema } from '~/lib/schemas/helios.ts'
import { useBlockchainStore } from '~/lib/store/blockchain.ts'

export default function DecryptPage() {
  const [loading, setLoading] = useState<boolean>(true)
  const [ballots, setBallots] = useState<Ballot[]>([])
  const [sk, setSk] = useState<string>('')
  const { contract } = useBlockchainStore()

  useEffect(() => {
    if (!contract) return
    setLoading(true);
    (async () => {
      const cballots = await contract.getAllBallots()
      setBallots(decodeArrayOfStruct(cballots, ballotSchema))
    })().finally(() => setLoading(false))
  }, [contract])

  return loading ? (
    <LoadingScreen />
  ) : (
    <div className="flex min-h-[calc(100dvh-64px)] w-full flex-col items-center">
      <div className="flex flex-col">
        <div className="mb-1 font-semibold">
          Enter your secret key for decryption:
        </div>
        <Input
          id="sk"
          value={sk}
          onChange={e => setSk(e.target.value)}
          placeholder="41208214081240848012"
          type="password"
        />
      </div>
    </div>
  )
}
