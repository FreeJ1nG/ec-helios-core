import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface PersistStore {
  selectedAccount: number
  setSelectedAccount: (selectedAccount: number) => void
}

export const usePersistStore = create<PersistStore>()(
  persist(
    set => ({
      selectedAccount: 0,
      setSelectedAccount: selectedAccount =>
        set(state => ({
          ...state,
          selectedAccount,
        })),
    }),
    {
      name: 'persist-storage',
    },
  ),
)
