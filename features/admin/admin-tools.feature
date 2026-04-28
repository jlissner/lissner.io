Feature: Admin tools beyond duplicate detection
  As an admin user
  I want to manage access, inspect data, and maintain backups
  So that the deployment stays secure and operable

  Background:
    Given I am signed in as an admin

  Scenario: View and edit email whitelist
    When I open the admin whitelist section
    Then I can list entries and add or remove allowed emails

  Scenario: SQL explorer when enabled
    Given SQL explorer is enabled for this deployment
    When I submit a read-only query through the admin SQL explorer
    Then I receive a result set or a clear error

  Scenario: List database backups
    When I request the list of database backups from S3
    Then I see available backup objects with metadata needed to choose one

  Scenario: Restore database from a backup
    Given a valid backup key is selected
    When I confirm database restore
    Then the application uses the restored database or reports a blocking error

  Scenario: Repair thumbnails
    When I trigger thumbnail repair for the library
    Then the system reports how many thumbnails were fixed or skipped

  Scenario: Data explorer browse tables
    Given data explorer is available
    When I list tables and open rows for a table
    Then I can inspect schema-aligned data subject to admin permissions
