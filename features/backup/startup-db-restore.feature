Feature: Restore the local database from the latest S3 backup on startup
  As an operator
  I want the app to restore its database from the most recent backup during deployment
  So that a fresh host or wiped volume can recover application state automatically

  Background:
    Given the app is starting in a production deployment

  Scenario: Startup restore uses latest S3 DB when local DB is missing
    Given S3 backup is configured
    And the local database file does not exist
    And S3 contains at least one database backup
    When the app starts
    Then the app should download the most recent database backup
    And the app should use the downloaded database for operation

  Scenario: Startup restore is skipped when S3 backup is not configured
    Given S3 backup is not configured
    And the local database file does not exist
    When the app starts
    Then the app should start without restoring from S3

  Scenario: Startup restore continues when no DB backups exist
    Given S3 backup is configured
    And the local database file does not exist
    And S3 contains no database backups
    When the app starts
    Then the app should start without restoring from S3

  Scenario: Startup restore falls back when download fails or DB is invalid
    Given S3 backup is configured
    And the local database file does not exist
    And S3 contains at least one database backup
    And downloading the most recent database backup fails or results in an invalid database
    When the app starts
    Then the app should start without restoring from S3

