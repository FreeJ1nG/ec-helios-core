import { LoaderCircle } from 'lucide-react'

export default function LoadingScreen() {
  return (
    <div className="flex h-dvh w-full items-center justify-center">
      <LoaderCircle className="h-40 w-40 animate-spin" />
    </div>
  )
}
