import { secp256k1 } from '@noble/curves/secp256k1'
import { useNavigate } from '@remix-run/react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import EcPointDisplay from '~/components/ecpoint-display.tsx'
import LoadingScreen from '~/components/loading-screen.tsx'
import ProofDisplay from '~/components/proof-display.tsx'
import { Button } from '~/components/ui/button.tsx'
import { Input } from '~/components/ui/input.tsx'
import { decodeArrayOfStruct } from '~/lib/blockchain/utils.ts'
import { generateDecryptionShare } from '~/lib/crypto/zkp/generate.ts'
import { verifyValidDecryptionShareProof } from '~/lib/crypto/zkp/verify.ts'
import {
  ECElGamalCiphertext,
  ECElGamalCiphertextSchema,
  EcPoint,
} from '~/lib/schemas/ecc.ts'
import { DecryptionShare } from '~/lib/schemas/helios.ts'
import { useBlockchainStore } from '~/lib/store/blockchain.ts'
import { useDataStore } from '~/lib/store/data.ts'

export default function DecryptPage() {
  const navigate = useNavigate()
  const { myAddress, contract } = useBlockchainStore()
  const { electionPublicKey, candidates, authorities } = useDataStore()
  const [loading, setLoading] = useState<boolean>(true)
  const [sk, setSk] = useState<string>('')
  const [pk, setPk] = useState<EcPoint | undefined>(undefined)
  const [ciphertextTallies, setCiphertextTallies] = useState<
    ECElGamalCiphertext[] | undefined
  >(undefined)
  const [myDecryptionShares, setMyDecryptionShares] = useState<
    DecryptionShare[]
  >([])
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  useEffect(() => {
    if (!authorities) return
    let ok = false
    for (const authority of authorities) {
      if (authority.owner === myAddress) ok = true
    }
    if (!ok) {
      toast.error('Unable to access this page since you are not an authority')
      navigate('/')
      return
    }
  }, [authorities, myAddress])

  useEffect(() => {
    if (!contract) return
    if (!authorities) return
    const pk = authorities.find(auth => auth.owner === myAddress)?.publicKey
    if (!pk) return
    setPk(pk)
    setLoading(true);
    (async () => {
      const cciphertextTallies = await contract.getCiphertextTallies()
      const ciphertextTallies = decodeArrayOfStruct(
        cciphertextTallies,
        ECElGamalCiphertextSchema,
      )
      setCiphertextTallies(ciphertextTallies)
    })().finally(() => setLoading(false))
  }, [contract])

  const onComputeDecryptionShare = async () => {
    if (!authorities) return
    if (!electionPublicKey) return
    if (!candidates) return
    if (!pk) return
    if (!ciphertextTallies) {
      toast.error('Unable to fetch ciphertext tallies')
      return
    }

    let bsk: bigint
    try {
      bsk = BigInt(sk)
    }
    catch (_) {
      toast.error(
        'Unable to parse given secret key to a big integer, please re-enter your secret key',
      )
      return
    }

    if (!secp256k1.ProjectivePoint.BASE.multiply(bsk).equals(pk)) {
      toast.error('Invalid secret key, please try to re-input your secret key')
      return
    }

    const decryptionSharePromises: Promise<DecryptionShare>[] = []
    for (let i = 0; i < candidates.length; i++) {
      decryptionSharePromises.push(
        generateDecryptionShare({ pk, sk: bsk }, ciphertextTallies[i]),
      )
    }

    const decryptionShares = await Promise.all(decryptionSharePromises)
    setMyDecryptionShares(decryptionShares)
  }

  const onSubmitMyDecryptionShares = async () => {
    if (!contract) return
    if (!pk) return
    if (!candidates) return
    if (!ciphertextTallies) {
      toast.error(
        'Ciphertext needs to be tallied before you can submit decryption share!',
      )
      return
    }
    setIsSubmitting(true)
    try {
      const decryptionShareProofVerificationPromises: Promise<boolean>[] = []
      for (let i = 0; i < candidates.length; i++) {
        decryptionShareProofVerificationPromises.push(
          verifyValidDecryptionShareProof(
            pk,
            ciphertextTallies[i],
            myDecryptionShares[i],
          ),
        )
      }
      const verifications = await Promise.all(
        decryptionShareProofVerificationPromises,
      )
      if (verifications.some(v => !v)) {
        // If one or more verification fails
        toast.error('Invalid decryption share or invalid proof, please retry')
        return
      }
      const transaction = await contract.submitDecryptionShares(
        myDecryptionShares,
        { gasLimit: 1_000_000_000 },
      )
      await transaction.wait()
      toast.success('Successfully submitted decryption share!')
    }
    catch (e) {
      console.error(e)
      toast.error(
        'Unable to submit decryption share, please read console to find the error reason',
      )
    }
    finally {
      setIsSubmitting(false)
    }
  }

  return loading || !pk ? (
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
        <div className="mt-4 mb-1 font-semibold">Your public key</div>
        <div className="flex gap-3">
          <div className="font-bold">x</div>
          <div>{pk?.x.toString()}</div>
        </div>
        <div className="flex gap-3">
          <div className="font-bold">y</div>
          <div>{pk?.y.toString()}</div>
        </div>
        <Button onClick={onComputeDecryptionShare} className="mt-4">
          Compute Decryption Share
        </Button>
      </div>
      {ciphertextTallies && (
        <div className="mt-8 flex flex-col gap-6">
          {myDecryptionShares.map((decryptionShare, i) => (
            <div key={i} className="flex flex-col">
              <div className="mb-1">
                Decryption share for Candidate
                {' ' + candidates?.[i]}
              </div>
              <EcPointDisplay p={decryptionShare.d} />
              <ProofDisplay
                label="that the decryption share is valid"
                proofLabel="decrypt"
                proof={decryptionShare.validDecryptionShareProof}
                verifyProofFn={() =>
                  verifyValidDecryptionShareProof(
                    pk,
                    ciphertextTallies[i],
                    decryptionShare,
                  )}
                className="mt-2"
              />
            </div>
          ))}
        </div>
      )}

      {myDecryptionShares.length > 0 && (
        <Button
          className="mt-8"
          onClick={onSubmitMyDecryptionShares}
          loading={isSubmitting}
        >
          Submit Decryption Share
        </Button>
      )}
    </div>
  )
}
