Feature: Resumable uploads for large files on mobile networks
  As a mobile user
  I want my photo uploads to continue even if the network drops
  So that I don't lose progress and have to re-upload everything

  Background:
    Given I have selected multiple large photos to upload
    And the total upload size exceeds 10MB

  Scenario: Upload resumes after network drop
    Given an upload is in progress
    When the network connection drops
    Then the upload should pause gracefully
    And the UI should indicate the upload is paused
    When the network connection is restored
    Then the upload should automatically resume from where it left off
    And the progress bar should show correct percentage

  Scenario: Upload shows accurate progress
    Given I am uploading multiple photos
    When the upload is in progress
    Then I should see individual file progress
    And I should see overall progress as a percentage
    And the progress should update in real-time

  Scenario: Upload completes successfully
    Given I have selected photos to upload
    When all files finish uploading
    Then I should see a success message
    And I should see thumbnail previews of uploaded photos

  Scenario: Upload handles server errors gracefully
    Given an upload is in progress
    When the server returns a 500 error
    Then the upload should retry up to 3 times
    And if all retries fail, I should see a clear error message
    And I should have the option to retry manually

  Scenario: User can cancel upload
    Given an upload is in progress
    When I tap the Cancel button
    Then the upload should stop
    And any partially uploaded chunks should be cleaned up
    And I should be returned to the file selection screen