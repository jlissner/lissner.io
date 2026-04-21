Feature: JWT-based sessions that survive deployments
  As a user
  I want my login to persist across server restarts
  So that I don't have to re-authenticate after every deployment

  Background:
    Given auth is enabled
    And I have a whitelisted email

  Scenario: Successful login issues access and refresh tokens
    Given I have verified my identity via magic link or login code
    Then I should receive an access token valid for 1 hour
    And I should receive a refresh token valid for 1 week
    And both tokens should be stored in httpOnly cookies

  Scenario: Access token authenticates API requests
    Given I have a valid access token
    When I make an API request
    Then the request should be authenticated using the access token
    And no database lookup should be required for the access token

  Scenario: Expired access token is silently refreshed
    Given my access token has expired
    And my refresh token is still valid
    When I make an API request
    Then a new access token should be issued automatically
    And the request should succeed without user interaction

  Scenario: Refresh token is rotated on use
    Given I use my refresh token to obtain a new access token
    Then I should receive a new refresh token as well
    And the previous refresh token should be invalidated

  Scenario: Expired refresh token requires re-login
    Given both my access token and refresh token have expired
    When I make an API request
    Then I should receive an authentication error
    And I should be redirected to the login page

  Scenario: Sessions survive server restart
    Given I am logged in with valid tokens
    When the server restarts
    Then my access token should still be valid
    And my refresh token should still be usable

  Scenario: Logout revokes refresh token
    Given I am logged in
    When I log out
    Then my refresh token should be revoked
    And my access and refresh cookies should be cleared

  Scenario: Reuse of a revoked refresh token revokes the entire token family
    Given my refresh token has been rotated
    When a request is made with the old refresh token
    Then all refresh tokens in that family should be revoked
    And the user should be required to log in again
