import ProofDisplay from '~/components/proof-display.tsx'
import { toProjPoint } from '~/lib/crypto/common.ts'
import { verifyKeyOwnershipProof } from '~/lib/crypto/zkp/verify.ts'
import { Authority } from '~/lib/schemas/helios.ts'

export interface AuthorityListProps {
  authorities: Authority[]
}

export default function AuthorityList({ authorities }: AuthorityListProps) {
  return (
    <div className="flex flex-col">
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
            {' ' + auth.publicKey.x.toString()}
          </div>
          <div>
            y:
            {' ' + auth.publicKey.y.toString()}
          </div>
          <ProofDisplay
            label="that authority has a matching secret key"
            proofLabel="ownership"
            proof={auth.proof}
            verifyProofFn={proof =>
              verifyKeyOwnershipProof(toProjPoint(auth.publicKey), proof)}
            className="mt-1"
          />
        </div>
      ))}
    </div>
  )
}
