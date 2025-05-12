import { useEffect } from "react";
import { generateRandomElGamalKey } from "~/lib/crypto/keys";
import { generateAuthorityKeyOwnershipProof } from "~/lib/crypto/zkp";
import { useBlockchainStore } from "~/lib/store/blockchain";

export async function loader() {
  return null;
}

export default function AdminPage() {
  const { contract } = useBlockchainStore();

  const onGenerateAuthorityKey = async () => {
    const authKey = generateRandomElGamalKey();
    const proof = await generateAuthorityKeyOwnershipProof(authKey);
    console.log(" >>", authKey, proof);
    await contract?.registerAuthority(
      authKey.pk.x,
      authKey.pk.y,
      proof.c,
      proof.d,
    );
  };

  useEffect(() => {
    if (contract) {
      const p = async () => {
        const authList = await contract.getAuthorityList();
        console.log(
          contract.interface.decodeFunctionResult("getAuthorityList", authList),
        );
        console.log(" >>", authList);
      };
      p();
    }
  }, [contract]);

  return (
    <div className="flex flex-col items-center py-12">
      <div className="text-xl">Admin Page</div>
      <button onClick={onGenerateAuthorityKey}>
        Generate Your Authority Key
      </button>
    </div>
  );
}
