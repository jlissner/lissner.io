Feature: Login code as alternative to magic link
  As a user
  I want to receive a short numeric code alongside my magic link
  So that I can log in on a device different from the one that received the email

  Background:
    Given auth is enabled
    And I have a whitelisted email

  Scenario: Magic link email includes a login code
    Given I request a magic link for my email
    When the email is sent
    Then the email should contain both a clickable magic link and a 6-digit login code
    And the login code should expire at the same time as the magic link

  Scenario: Successful login with a valid code
    Given I have requested a magic link
    And I have the 6-digit login code from the email
    When I enter the code on the login page
    Then I should be authenticated
    And I should receive access and refresh tokens

  Scenario: Login code rejected after expiry
    Given I have a login code that has expired
    When I enter the expired code on the login page
    Then I should see an error that the code has expired
    And I should be prompted to request a new one

  Scenario: Login code rejected after use
    Given I have already used a login code to log in
    When I try to use the same code again
    Then I should see an error that the code has already been used

  Scenario: Wrong code is rejected
    Given I have requested a magic link
    When I enter an incorrect code on the login page
    Then I should see an error that the code is invalid

  Scenario: Magic link still works alongside code
    Given I have requested a magic link
    When I click the magic link in the email
    Then I should be authenticated
    And the associated login code should also be consumed

  Scenario: Login code used on different device from email
    Given I request a magic link on my phone
    And I read the 6-digit code from the email on my phone
    When I enter the code on my desktop browser
    Then I should be authenticated on the desktop browser
