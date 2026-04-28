@admin
Feature: Unified people directory (accounts + tagging identities)
  As an admin
  I want to manage people and their account/login attributes together
  So that the family directory stays consistent even when some people do not have accounts yet

  Background:
    Given I am signed in as an admin

  Scenario: List the people directory with account status
    When I open the admin people directory
    Then I see people that can log in and people that cannot log in yet
    And I can see whether each person is an admin
    And I can see whether each person is linked to an email identity

  Scenario: Create a person without an account
    When I create a new person with a name
    Then that person appears in the people directory
    And that person does not have an email identity yet

  Scenario: Create a person with a login email
    When I create a new person with a name and email
    Then that person appears in the people directory
    And that person can receive a login link

  Scenario: Update a person's name and email
    Given a person exists in the directory
    When I update their name and email
    Then the directory shows the updated name and email

  Scenario: Promote or demote directory admin status
    Given a person exists in the directory
    When I toggle admin status for that person
    Then the directory reflects the updated admin status

  Scenario: Delete is blocked for a person that is an account identity
    Given a person exists in the directory and is linked to a user account identity
    When I delete that person
    Then I receive an error explaining identity people cannot be deleted

  Scenario: Delete a person with tagged media removes their tags
    Given a person exists in the directory and has media tagged to them
    When I delete that person
    Then that person is removed from the directory
    And the system removes that person's tags from media

  Scenario: Create a person with an invalid email is rejected
    When I create a new person with a name and email
    And the email is invalid
    Then I receive an error explaining the email is invalid

  Scenario: Create a person with an email that is already in use is rejected
    Given an email already exists in the directory
    When I create a new person with a name and email
    Then I receive an error explaining the email is already in use

  Scenario: Merge two people in the directory
    Given two distinct people exist in the directory
    When I merge one person into the other
    Then the merged person is removed from the directory
    And tagged media is attributed to the remaining person

