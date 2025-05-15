import EcPointDisplay from '~/components/ecpoint-display.tsx'
import ProofDisplay from '~/components/proof-display.tsx'
import { verifyKeyOwnershipProof } from '~/lib/crypto/zkp/verify.ts'
import { Authority } from '~/lib/schemas/helios.ts'

export interface AuthorityListProps {
  authorities: Authority[]
}

export default function AuthorityList({ authorities }: AuthorityListProps) {
  return (
    <div className="flex flex-col">
      <div className="mt-6 mb-4 text-xl font-semibold">
        List of Authorities:
      </div>
      {authorities.map((auth, i) => (
        <div
          key={auth.publicKey.x.toString()}
          className="mb-2 flex flex-col items-start"
        >
          <div className="mb-1 font-bold">
            Authority #
            {i + 1}
          </div>
          <EcPointDisplay p={auth.publicKey} />
          <ProofDisplay
            label="that authority has a matching secret key"
            proofLabel="ownership"
            proof={auth.proof}
            verifyProofFn={proof =>
              verifyKeyOwnershipProof(auth.publicKey, proof)}
            className="mt-1 mb-3"
          />
        </div>
      ))}
    </div>
  )
}
