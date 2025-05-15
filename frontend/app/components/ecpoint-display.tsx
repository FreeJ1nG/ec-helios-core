import { ComponentProps } from 'react'

import { EcPoint } from '~/lib/schemas/ecc.ts'
import { cn } from '~/lib/utils.ts'

export interface EcPointDisplayProps {
  p: EcPoint
  className?: ComponentProps<'div'>['className']
}

export default function EcPointDisplay({ p, className }: EcPointDisplayProps) {
  return (
    <div className={cn(className, 'flex flex-col gap-1')}>
      <div className="flex items-center gap-3">
        <div className="font-bold">x</div>
        <div>{p.x.toString()}</div>
      </div>
      <div className="flex items-center gap-3">
        <div className="font-bold">y</div>
        <div>{p.y.toString()}</div>
      </div>
    </div>
  )
}
