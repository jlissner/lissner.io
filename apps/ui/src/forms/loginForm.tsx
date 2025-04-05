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
  setState: (v: string) => void,
) {
  try {
    const token = await exchangeCodeForToken(code);
    console.log("Received token:", token); // Debug log
    setUserToken(token);
    setState("success");
  } catch (error) {
    console.error("Error exchanging code for token:", error);
    setState("error");
  }
}

export function LoginForm() {
  const setUserToken = useSetAtom(userTokenAtom);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [state, setState] = useState("initial");

  if (state === "success") {
    return (
      <div>
        <h4 className="mb-md">Successfully logged in!</h4>
        <button type="button" onClick={() => setState("initial")}>Log out</button>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div>
        <h4 className="mb-md text-red-500">Failed to log in. Please try again.</h4>
        <button type="button" onClick={() => setState("initial")}>Try Again</button>
      </div>
    );
  }

  if (state === "sent") {
    return (
      <form onSubmit={(e) => {
        e.preventDefault();
        handleExchangeCodeForToken(code, setUserToken, setState);
      }}>
        <h4 className="mb-md">Magic link sent to {email}</h4>

        <input
          placeholder="123456"
          type="number"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />

        <div className="h-space gap-lg mt-md">
          <button
            type="submit"
            disabled={code.length !== 6}
          >
            Submit
          </button>

          <button type="button" onClick={() => setState("initial")}>Restart</button>
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
        type="submit"
      >
        Send Magic Link
      </button>
    </form>
  );
}
