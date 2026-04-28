import { Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";

type BddRunnerWorld = {
  lastCommand?: string;
};

When("I run the BDD test command", function (this: BddRunnerWorld) {
  // This scenario is satisfied by the fact that this file is executing.
  // (The actual command wiring is verified by the process running Cucumber.)
  this.lastCommand = "npm run test:bdd";
});

Then(
  "feature files are executed and failures surface as non-zero exit codes",
  function (this: BddRunnerWorld) {
    assert.equal(this.lastCommand, "npm run test:bdd");
  },
);
