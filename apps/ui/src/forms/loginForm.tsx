import { useSetAtom } from "jotai";
import React, { useState } from "react";
import { exchangeCodeForToken, sendMagicLink } from "../api/auth";
import { userTokenAtom } from "../state/userAtom";

function handleSubmit(
  email: string,
  state: string,
  setState: (v: string) => void,
) {
  return async (evt: React.FormEvent | React.MouseEvent) => {
    evt.preventDefault();

    if (state !== "initial") return;

    setState("sending");

    await sendMagicLink({ email });

    setState("sent");
  };
}

async function handleExchangeCodeForToken(
  code: string,
  setUserToken: (res: string) => void,
) {
  await exchangeCodeForToken(code)
    .then((res) => {
      setUserToken(res);
    })
    .catch(console.log);
}

export function LoginForm() {
  const setUserToken = useSetAtom(userTokenAtom);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [state, setState] = useState("initial");

  if (state === "sent") {
    return (
      <form onSubmit={() => handleExchangeCodeForToken(code, setUserToken)}>
        <h4 className="mb-md">Magic link sent to {email}</h4>

        <input
          placeholder="123456"
          type="number"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />

        <div className="h-space gap-lg mt-md">
          <button
            onClick={() => handleExchangeCodeForToken(code, setUserToken)}
            type="submit"
            disabled={code.length !== 6}
          >
            Submit
          </button>

          <button onClick={() => setState("initial")}>Restart</button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit(email, state, setState)}>
      <label>
        <input
          type="email"
          name="email"
          placeholder="Enter email"
          value={email}
          onChange={(evt) => setEmail(evt.target.value)}
        />
      </label>
      <button
        disabled={state === "sending"}
        onClick={handleSubmit(email, state, setState)}
        type="submit"
      >
        Send Magic Link
      </button>
    </form>
  );
}
