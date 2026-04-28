Feature: Executable Gherkin test runner
  As a developer
  I want `.feature` files to run in CI
  So that specs cannot drift from reality

  Scenario: The BDD test command runs feature files
    When I run the BDD test command
    Then feature files are executed and failures surface as non-zero exit codes

