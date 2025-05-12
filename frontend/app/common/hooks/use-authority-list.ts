import { useBlockchainStore } from "~/lib/store/blockchain";

export function useAuthorityList() {
  const { contract } = useBlockchainStore();
  if (!contract) return null;
}
