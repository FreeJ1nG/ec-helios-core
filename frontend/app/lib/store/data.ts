import dayjs from 'dayjs'
import { create } from 'zustand'

import { calculateElectionPublicKey } from '~/lib/crypto/keys.ts'
import { EcPoint } from '~/lib/schemas/ecc.ts'
import { Authority } from '~/lib/schemas/helios.ts'

export interface DataStore {
  candidates?: string[]
  setCandidates: (candidates: string[]) => void
  authorities?: Authority[]
  setAuthorities: (authorities: Authority[]) => Promise<void>
  electionEndTime?: dayjs.Dayjs
  setElectionEndTime: (electionEndTime: dayjs.Dayjs) => void
  electionPublicKey?: EcPoint
}

export const useDataStore = create<DataStore>(set => ({
  candidates: undefined,
  authorities: undefined,
  electionEndTime: undefined,
  setCandidates: (candidates) => {
    set(state => ({ ...state, candidates }))
  },
  setAuthorities: async (authorities) => {
    const electionPublicKey = await calculateElectionPublicKey(authorities)
    set(state => ({ ...state, authorities, electionPublicKey }))
  },
  setElectionEndTime: (electionEndTime) => {
    set(state => ({ ...state, electionEndTime }))
  },
}))
