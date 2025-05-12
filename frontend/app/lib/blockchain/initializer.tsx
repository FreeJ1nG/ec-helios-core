import { useEffect } from "react";
import { useBlockchainStore } from "~/lib/store/blockchain";

export interface BlockchainInitializerProps {
  blockchainAddress?: string;
}

export default function BlockchainInitializer({
  blockchainAddress,
}: BlockchainInitializerProps) {
  const { setContractAddress, setContract } = useBlockchainStore();

  useEffect(() => {
    if (blockchainAddress) setContractAddress(blockchainAddress);
    setContract();
  }, [blockchainAddress, setContractAddress, setContract]);

  return null;
}
