import { useState } from "react";
import { z } from "zod";
import { useBlockchainStore } from "~/lib/store/blockchain";

export interface UseBlockchainDataProps<T extends z.AnyZodObject> {
  fetchFn: () => Promise<unknown>;
  fnName: string;
  schema: T;
}

export type UseBlockchainDataReturn<T extends z.AnyZodObject> =
  | {
      data?: z.infer<T>;
      isLoading: true;
      isSuccess: false;
      isError: false;
    }
  | { data: z.infer<T>; isSuccess: true; isLoading: false; isError: false }
  | {
      error: string;
      isError: true;
      isSuccess: false;
      isLoading: false;
    };

export function useBlockchainData<T extends z.AnyZodObject>({
  fetchFn,
  fnName,
  schema,
}: UseBlockchainDataProps<T>): UseBlockchainDataReturn<T> {
  const { contract } = useBlockchainStore();
  const [data, setData] = useState();
  const [isLoading, setIsLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<string>("");

  if (!contract)
    return {
      error: "Contract doesn't exist, something is wrong",
      isError: true,
      isSuccess: false,
      isLoading: false,
    };

  fetchFn().then((res) => {});
  return { data, isLoading, isSuccess, isError };
}
