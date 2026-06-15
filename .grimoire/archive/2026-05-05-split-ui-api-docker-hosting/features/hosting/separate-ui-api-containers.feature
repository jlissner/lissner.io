@hosting
Feature: Separate UI and API in Docker hosting
  As a host operator
  I want the web UI and the API to run as separate Docker services
  So that I can deploy, observe, and reason about each tier independently while the product remains usable across the public Lissner hostnames

  Background:
    Given production hosting uses Docker Compose with Traefik in front of the application
    And the API is reachable at the configured API host for split hosting

  Scenario: API requests reach the API service via the API host
    Given the hosted stack is running
    When a client requests an API resource from the API host using the application’s API path prefix
    Then the response is produced by the API service

  Scenario: WebSocket activity connections use the API host
    Given the hosted stack is running
    When an authenticated client opens the application’s activity WebSocket on the API host
    Then the connection is accepted and served by the API service

  Scenario: Browser UI assets reach the UI service
    Given the hosted stack is running
    When a browser requests the main web application HTML and static assets from the configured UI host
    Then the response is served by the UI service

  Scenario Outline: API permits credentialed browser origins on lissner.io
    Given the hosted stack is running
    When a browser issues a credentialed request to the API host with web origin <web_origin>
    Then the response indicates that web origin <web_origin> is allowed for cross-origin access

    Examples:
      | web_origin   |
      | lissner.io   |
      | www.lissner.io |
      | app.lissner.io |

  Scenario: API rejects disallowed browser origins
    Given the hosted stack is running
    When a browser issues a request to the API host with Origin "https://evil.example"
    Then the response does not allow Origin "https://evil.example" for cross-origin access

  Scenario: End-to-end use across UI and API hosts
    Given the hosted stack is running
    When a signed-in user uses the web application from a permitted lissner.io web origin
    Then pages load from the UI host and authenticated features that depend on the API succeed without the user manually configuring an API base URL

  Scenario: Operator can confirm distinct services
    Given the hosted stack is running
    When the operator inspects running Compose services for the application
    Then the UI and the API each correspond to a different service in the stack
