import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'

import EcPointDisplay from '~/components/ecpoint-display.tsx'
import LoadingScreen from '~/components/loading-screen.tsx'
import ProofDisplay from '~/components/proof-display.tsx'
import { Button } from '~/components/ui/button.tsx'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table.tsx'
import { decodeArrayOfStruct } from '~/lib/blockchain/utils.ts'
import { combineDecryptionShares } from '~/lib/crypto/elgamal.ts'
import { verifyValidDecryptionShareProof } from '~/lib/crypto/zkp/verify.ts'
import {
  ECElGamalCiphertext,
  ECElGamalCiphertextSchema,
} from '~/lib/schemas/ecc.ts'
import {
  DecryptionShare,
  decryptionShareSchema,
} from '~/lib/schemas/helios.ts'
import { useBlockchainStore } from '~/lib/store/blockchain.ts'
import { useDataStore } from '~/lib/store/data.ts'
import { extractErrorReason } from '~/lib/utils.ts'

export default function TallyPage() {
  const { contract } = useBlockchainStore()
  const { authorities, candidates } = useDataStore()
  const [loading, setLoading] = useState<boolean>(true)
  const [ballotAmount, setBallotAmount] = useState<number>(0)
  const [decryptionSharesForCandidate, setDecryptionSharesForCandidate] =
    useState<DecryptionShare[][]>([])
  const [ciphertextTallies, setCiphertextTallies] = useState<
    ECElGamalCiphertext[]
  >([])
  const [decryptedVotes, setDecryptedVotes] = useState<number[]>([])
  const [isCombining, setIsCombining] = useState<boolean>(false)

  useEffect(() => {
    if (!contract) return
    setLoading(true);
    (async () => {
      const [
        ccandidateDecryptionShares,
        cciphertextTallies,
        camountOfBallots,
        cdecryptedVotes,
      ] = await Promise.all([
        contract.getCandidateDecryptionShares(),
        contract.getCiphertextTallies(),
        contract.getAmountOfBallots(),
        contract.getDecryptedVotes(),
      ])
      setDecryptedVotes(
        z.array(z.bigint().transform(v => Number(v))).parse(cdecryptedVotes),
      )
      setBallotAmount(
        z
          .bigint()
          .transform(v => Number(v))
          .parse(camountOfBallots),
      )
      setCiphertextTallies(
        decodeArrayOfStruct(cciphertextTallies, ECElGamalCiphertextSchema),
      )
      setDecryptionSharesForCandidate(
        decodeArrayOfStruct(
          ccandidateDecryptionShares,
          z.array(decryptionShareSchema),
        ),
      )
    })()
      .catch((e) => {
        console.error(e)
        toast.error('Unable to fetch some data, read console to find out')
      })
      .finally(() => setLoading(false))
  }, [contract])

  const decryptionShareAmount = decryptionSharesForCandidate.reduce(
    (acc, cur) => acc + cur.length,
    0,
  )

  const onCombineDecryptions = async () => {
    if (!contract) return
    setIsCombining(true)
    try {
      const decryptions = combineDecryptionShares(
        ciphertextTallies,
        decryptionSharesForCandidate,
        ballotAmount,
      )
      await contract.submitDecodedVoteSuggestion(decryptions)
      const cdecryptedVotes = await contract.getDecryptedVotes()
      setDecryptedVotes(
        z.array(z.bigint().transform(v => Number(v))).parse(cdecryptedVotes),
      )
    }
    catch (e) {
      toast.error(`Unable to combine decryptions, ${extractErrorReason(e)}`)
    }
    finally {
      setIsCombining(false)
    }
  }

  return loading || !candidates || !authorities ? (
    <LoadingScreen />
  ) : (
    <div className="flex min-h-[calc(100dvh-64px)] w-full flex-col items-center">
      {decryptionShareAmount === authorities.length * candidates.length && (
        <Button
          className="mb-6"
          onClick={onCombineDecryptions}
          loading={isCombining}
        >
          Combine Decryptions
        </Button>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-center">Authority Address</TableHead>
            {Array.from({ length: candidates.length }).map((_, i) => (
              <TableHead key={i} className="text-center">
                {candidates[i]}
              </TableHead>
            ))}
          </TableRow>
          <TableRow>
            <TableHead className="text-center">Ciphertext Tally</TableHead>
            {candidates.map((candidate, i) => (
              <TableHead key={candidate + i.toString()} className="py-4">
                <div className="flex gap-5">
                  <div className="font-bold">a</div>
                  <EcPointDisplay p={ciphertextTallies[i].a} />
                </div>
                <div className="mt-3 flex gap-5">
                  <div className="font-bold">b</div>
                  <EcPointDisplay p={ciphertextTallies[i].b} />
                </div>
              </TableHead>
            ))}
          </TableRow>
          <TableRow>
            <TableHead className="text-center">Decrypted Votes</TableHead>
            {candidates.map((candidate, i) => (
              <TableHead
                key={candidate + i.toString()}
                className="py-4 text-center"
              >
                {decryptedVotes[i] === -1 ? '???' : decryptedVotes[i]}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {authorities.map((authority, i) => (
            <TableRow key={i}>
              <TableCell className="text-center">{authority.owner}</TableCell>
              {candidates.map((candidate, j) => {
                const decryptionShare = decryptionSharesForCandidate[j].find(
                  ({ decryptedBy }) => decryptedBy === authority.owner,
                )

                if (!decryptionShare)
                  return (
                    <TableCell
                      className="text-center"
                      key={'no-decryption' + j.toString()}
                    >
                      No decryption share found
                    </TableCell>
                  )

                return (
                  <TableCell
                    key={candidate + j.toString()}
                    className="px-4 py-5"
                  >
                    <div className="flex flex-col items-center">
                      <EcPointDisplay p={decryptionShare.d} />
                      <ProofDisplay
                        label="that decryption share is valid"
                        proofLabel="decrypt"
                        proof={decryptionShare.validDecryptionShareProof}
                        className="mt-2"
                        verifyProofFn={() =>
                          verifyValidDecryptionShareProof(
                            authority.publicKey,
                            ciphertextTallies[j],
                            decryptionShare,
                          )}
                      />
                    </div>
                  </TableCell>
                )
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
