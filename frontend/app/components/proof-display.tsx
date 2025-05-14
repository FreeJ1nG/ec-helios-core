import { ComponentProps } from 'react'
import { toast } from 'sonner'

import { Button } from '~/components/ui/button.tsx'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover.tsx'
import { EcPoint } from '~/lib/schemas/ecc.ts'
import { cn } from '~/lib/utils.ts'

export interface ProofDisplayProps<T extends Record<string, bigint | EcPoint>> {
  className?: ComponentProps<'div'>['className']
  label: string
  proofLabel: string
  proof: T
  verifyProofFn?: (proof: T) => boolean
}

export default function ProofDisplay<
  T extends Record<string, bigint | EcPoint>,
>({
  className,
  label,
  proofLabel,
  proof,
  verifyProofFn,
}: ProofDisplayProps<T>) {
  const onVerifyProof = () => {
    if (!verifyProofFn) {
      toast.error('Can\'t verify proof, no verification function provided')
      return
    }
    if (verifyProofFn(proof)) {
      toast.success('Proof is valid!')
    }
    else {
      toast.error(
        'Proof is invalid, please contact the election authority immediately!',
      )
    }
  }

  return (
    <div className={className}>
      <Popover>
        <PopoverTrigger asChild>
          <Button>
            View proof
            {' '}
            {label}
            {' '}
            <pre>
              (π
              <sub>{proofLabel}</sub>
              )
            </pre>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-fit">
          <div className="flex flex-col">
            {Object.keys(proof).map((key, i) => (
              <div
                key={key}
                className={cn('flex gap-3', {
                  'mb-3': i < Object.keys(proof).length - 1,
                })}
              >
                <div className="w-8 font-bold">{key.replaceAll('_', '\'')}</div>
                <div>
                  {typeof proof[key] === 'object' ? (
                    <div className="flex flex-col">
                      <div>
                        x:
                        {' ' + proof[key].x.toString()}
                      </div>
                      <div>
                        y:
                        {' ' + proof[key].y.toString()}
                      </div>
                    </div>
                  ) : (
                    proof[key].toString()
                  )}
                </div>
              </div>
            ))}
            {verifyProofFn && (
              <Button className="mt-4" onClick={onVerifyProof}>
                Verify Proof
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
