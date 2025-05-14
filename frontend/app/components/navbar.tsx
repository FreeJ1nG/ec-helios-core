import { useNavigate } from '@remix-run/react'

import { Button } from '~/components/ui/button.tsx'

export default function Navbar() {
  const navigate = useNavigate()

  return (
    <div className="flex h-16 w-full items-center gap-3 px-8">
      <Button variant="ghost" onClick={() => navigate('/')}>
        Home
      </Button>
      <Button variant="ghost" onClick={() => navigate('/votes')}>
        View Votes
      </Button>
    </div>
  )
}
