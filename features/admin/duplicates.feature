Feature: Admin duplicate review and cleanup
  As an admin
  I want to review likely duplicate media efficiently
  So that I can safely delete true duplicates without a click-heavy workflow

  Background:
    Given I am an authenticated admin user
    And perceptual hashes have been computed for existing images

  @ui @admin
  Scenario: Find duplicates shows reviewable rows without opening each pair
    When I open the Admin page
    And I run "Find Duplicates"
    Then I see a list of duplicate candidates
    And each candidate row shows previews for both media items
    And each candidate row shows the perceptual hash distance

  @ui @admin
  Scenario: Admin can decide which side to keep without navigating away
    Given I have a list of duplicate candidates
    When I pick "Keep left" for a candidate
    Then the candidate is marked as "Delete right"
    When I pick "Keep right" for a candidate
    Then the candidate is marked as "Delete left"
    When I pick "Skip" for a candidate
    Then the candidate is marked as "Skip"

  @ui @admin
  Scenario: Bulk actions reduce repetitive clicking
    Given I have a list of duplicate candidates
    When I choose a bulk action for the current page of candidates
    Then all candidates on the page are updated consistently
    And I can still override the decision for any single candidate

  @ui @admin
  Scenario: Admin can delete many duplicates with one confirmation
    Given I have marked multiple candidates for deletion
    When I confirm "Delete selected"
    Then the app deletes all selected media items
    And the app shows progress while deletions are in flight
    And the app shows a summary of successes and failures

  @api @admin
  Scenario: Bulk delete returns per-item results
    Given I have a list of media IDs to delete
    When I request a bulk delete as an admin
    Then the response includes an entry for each requested ID
    And each entry indicates whether that item was deleted or why it was not deleted

  @ui @admin
  Scenario: Bulk delete does not require reopening the duplicate list
    Given I have a list of duplicate candidates
    And I have deleted some selected media items
    Then deleted items are removed from the candidate list
    And candidates referencing deleted items are removed from the candidate list

