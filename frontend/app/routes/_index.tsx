import { secp256k1 } from "@noble/curves/secp256k1";
import type { MetaFunction } from "@remix-run/node";
import { useEffect, useState } from "react";
import { z } from "zod";
import { decodeArrayOfStruct, decodeStruct } from "~/lib/blockchain/utils";
import { encryptVoteWithProof } from "~/lib/crypto/zkp";
import { EcPoint, ecPointSchema } from "~/lib/schemas/ecc";
import { authoritySchema, Authority } from "~/lib/schemas/helios";
import { useBlockchainStore } from "~/lib/store/blockchain";

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export default function Index() {
  const { contract } = useBlockchainStore();
  const [loading, setLoading] = useState(true);
  const [electionPublicKey, setElectionPublicKey] = useState<
    EcPoint | undefined
  >(undefined);
  const [authorities, setAuthorities] = useState<Authority[]>([]);
  const [candidates, setCandidates] = useState<string[]>([]);

  useEffect(() => {
    if (!contract) return;
    (async () => {
      const [cepk, cauthorities, ccandidates] = await Promise.all([
        contract.electionPublicKey(),
        contract.getAuthorities(),
        contract.getCandidates(),
      ]);
      const epk = decodeStruct(cepk, ecPointSchema);
      const authorities = decodeArrayOfStruct(cauthorities, authoritySchema);
      setCandidates(z.array(z.string()).parse(ccandidates));
      setElectionPublicKey(epk);
      setAuthorities(authorities);
    })().then(() => {
      setLoading(false);
    });
  }, [contract]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!electionPublicKey)
      throw new Error("Unable to get election public key");
    const formData = new FormData(event.currentTarget);
    const selectedCandidate = z.number().parse(formData.get("candidate"));
    const votes = await Promise.all(
      Array.from({ length: candidates.length }).map((_, i) =>
        encryptVoteWithProof(
          i === selectedCandidate ? 1 : 0,
          secp256k1.ProjectivePoint.fromAffine(electionPublicKey),
        ),
      ),
    );
    // await contract?.vote(selectedCandidate);
  };

  return loading ? (
    <div>Loading ...</div>
  ) : (
    <div className="flex flex-col min-h-screen items-center justify-center">
      <div className="mb-10 text-2xl">Curved being used: secp256k1 curve</div>
      <div>Candidates: </div>
      <div className="mb-4">
        {candidates.map((c) => (
          <div key={c}>{c}</div>
        ))}
      </div>
      <div className="flex flex-col items-start">
        <div className="text-xl font-semibold">Election Public Key:</div>
        <div className="text-lg">x: {electionPublicKey?.x.toString()}</div>
        <div className="text-lg">y: {electionPublicKey?.y.toString()}</div>
      </div>
      <div className="mt-4 text-xl font-semibold">List of Authorities:</div>
      {authorities.map((auth, i) => (
        <div
          key={auth.publicKey.x.toString()}
          className="flex flex-col items-start mb-2"
        >
          <div>Authority #{i + 1}</div>
          <div>x: {auth.publicKey.x.toString()}</div>
          <div>y: {auth.publicKey.y.toString()}</div>
          <div>Proof of key ownership (π):</div>
          <div>c: {auth.proof.c.toString()}</div>
          <div>d: {auth.proof.d.toString()}</div>
        </div>
      ))}

      <div className="w-[600px] bg-gray-600 rounded-xl shadow-xl flex flex-col items-center py-12 mt-12">
        <div className="text-2xl font-bold">Vote Now!</div>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col items-start">
            <label htmlFor="candidate" className="mb-2">
              Choose a candidate:
            </label>
            {candidates.map((candidate, i) => (
              <div key={candidate} className="mb-2">
                <input type="radio" id={candidate} name="candidate" value={i} />
                <label htmlFor={candidate} className="ml-2">
                  {candidate}
                </label>
              </div>
            ))}
          </div>
          <button
            type="submit"
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
          >
            Submit Vote
          </button>
        </form>
      </div>
    </div>
  );
}
