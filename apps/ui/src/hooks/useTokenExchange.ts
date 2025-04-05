import { useSetAtom } from "jotai";
import { useEffect } from "react";
import { useSearchParams } from "react-router";
import { exchangeCodeForToken } from "../api/auth";
import { userTokenAtom } from "../state/userAtom";

export function useTokenExchange() {
  const [search] = useSearchParams();
  const code = search.get("code");
  const setUserToken = useSetAtom(userTokenAtom);
  const [, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (code) {
      console.log("code", code)
      setSearchParams((search) => {
        search.delete("code");

        return search;
      });

      exchangeCodeForToken(code)
        .then((res) => {
          console.log(res)
          setUserToken(res);
        })
        .catch(console.log);
    }
  }, [code, setUserToken, setSearchParams]);

  return code;
}
