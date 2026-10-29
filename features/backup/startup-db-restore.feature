Feature: Media database recovery from S3 backups
  As an operator
  I want to restore the media Postgres database from an S3 dump backup
  So that a wiped volume or bad cutover can recover application state

  Background:
    Given the app is starting in a production deployment

  Scenario: Startup does not auto-restore Postgres from S3
    Given S3 backup is configured
    When the app starts
    Then the app should start without restoring from S3

  Scenario: Admin restore uses a pg_dump backup key
    Given S3 backup is configured
    And S3 contains at least one database backup
    When an admin restores a media dump backup via the admin API
    Then the media database should be restored from that dump
