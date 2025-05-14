import './tailwind.css'

import type { LinksFunction } from '@remix-run/node'
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from '@remix-run/react'
import dayjs from 'dayjs'
import { useEffect, useState } from 'react'
import { z } from 'zod'

import ClientOnly from '~/components/client-only.tsx'
import LoadingScreen from '~/components/loading-screen.tsx'
import Navbar from '~/components/navbar.tsx'
import { Toaster } from '~/components/ui/sonner.tsx'
import BlockchainInitializer from '~/lib/blockchain/initializer.tsx'
import { decodeArrayOfStruct } from '~/lib/blockchain/utils.ts'
import { authoritySchema } from '~/lib/schemas/helios.ts'
import { useBlockchainStore } from '~/lib/store/blockchain.ts'
import { useDataStore } from '~/lib/store/data.ts'

export const links: LinksFunction = () => [
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap',
  },
]

export async function loader() {
  return {
    blockchainAddress: process.env.BLOCKCHAIN_ADDRESS,
  }
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <Toaster />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export function HydrateFallback() {
  return <LoadingScreen />
}

export default function App() {
  const [loading, setLoading] = useState<boolean>(true)
  const { blockchainAddress } = useLoaderData<typeof loader>()
  const { setContractAddress, setContract, contract } = useBlockchainStore()
  const { setAuthorities, setCandidates, setElectionEndTime } = useDataStore()

  useEffect(() => {
    if (blockchainAddress) setContractAddress(blockchainAddress)
    setContract()
  }, [blockchainAddress, setContractAddress, setContract])

  useEffect(() => {
    if (!contract) return
    setLoading(true);
    (async () => {
      const [cauthorities, ccandidates, cendTime] = await Promise.all([
        contract.getAuthorities(),
        contract.getCandidates(),
        contract.endTime(),
      ])
      const authorities = decodeArrayOfStruct(cauthorities, authoritySchema)

      setElectionEndTime(dayjs(1000 * Number(z.bigint().parse(cendTime))))
      setCandidates(z.array(z.string()).parse(ccandidates))
      await setAuthorities(authorities)
    })().finally(() => setLoading(false))
  }, [contract])

  return (
    <>
      <ClientOnly>
        <BlockchainInitializer blockchainAddress={blockchainAddress} />
      </ClientOnly>
      <Navbar />
      {loading ? <LoadingScreen /> : <Outlet />}
    </>
  )
}
