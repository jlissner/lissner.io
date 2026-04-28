Feature: Search indexing, activity, and manual backup
  As an authenticated user
  I want media indexed for search and visibility into long-running work
  So that I can find content and trust backups are running

  Background:
    Given I am signed in

  Scenario: Trigger indexing for new or changed media
    When I request indexing of new or unindexed media from the home toolbar
    Then indexing starts or I see that indexing is already in progress

  Scenario: See indexing progress
    Given indexing or another long-running job is active
    When I observe the global activity area
    Then I see progress or status for that job

  Scenario: Cancel indexing when supported
    Given indexing is in progress and cancellation is available
    When I cancel indexing
    Then indexing stops or reports cancellation

  Scenario: Manual backup run
    Given backup is configured for the deployment
    When an authorized user triggers a manual backup run
    Then the system records success or failure of that run

  Scenario: Backup status is readable
    When I request backup status
    Then I receive a structured status response suitable for the UI or ops
