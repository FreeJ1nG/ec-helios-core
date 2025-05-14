import { useNavigate } from '@remix-run/react'

import { Button } from '~/components/ui/button.tsx'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover.tsx'
import { useBlockchainStore } from '~/lib/store/blockchain.ts'
import { usePersistStore } from '~/lib/store/persist.ts'
import { cn } from '~/lib/utils.ts'

export default function Navbar() {
  const navigate = useNavigate()
  const { updateContractWithNewAccount, accounts } = useBlockchainStore()
  const { selectedAccount, setSelectedAccount } = usePersistStore()

  return (
    <div className="flex h-16 w-full items-center justify-between px-8">
      <div className="flex gap-3">
        <Button variant="ghost" onClick={() => navigate('/')}>
          Home
        </Button>
        <Button variant="ghost" onClick={() => navigate('/votes')}>
          View Votes
        </Button>
      </div>
      <div className="flex items-center">
        <div>
          Currently signed in as
          {' '}
          <b>
            Account #
            {selectedAccount}
          </b>
          ,
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="link" className="px12">
              Switch Account?
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-fit">
            <div className="flex flex-col gap-1">
              {accounts.map((acc, i) => (
                <div
                  key={i}
                  className={cn('flex w-[600px] items-center gap-3', {
                    'font-bold': selectedAccount === i,
                    'rounded-md bg-yellow-400': i === 1 || i === 2,
                  })}
                >
                  <Button
                    onClick={() => {
                      setSelectedAccount(i)
                      updateContractWithNewAccount(i)
                    }}
                  >
                    Account #
                    {i}
                  </Button>
                  <div>{acc.address}</div>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
