@admin
Feature: Admin library re-index
  As an admin
  I want to re-run indexing for the library
  So that search embeddings and face detection pick up pipeline improvements without re-uploading media

  Scenario: Admin can start a full library re-index
    Given I am signed in as an admin
    When I start a full library re-index from the admin tools
    Then an indexing job starts and reports progress until completion

  Scenario: Non-admin cannot start a full library re-index
    Given I am signed in as a non-admin user
    When I attempt to start a full library re-index
    Then the action is rejected

  Scenario: Completed re-index refreshes search embeddings and recomputes automatic face tags
    Given I am signed in as an admin
    And media exists that was previously indexed
    When I start a full library re-index from the admin tools
    And the re-index job completes
    Then search behavior for that media reflects newly computed embeddings
    And automatic face associations on images in scope are derived again using the current detection rules

  Scenario: Completed re-index preserves manual and confirmed face-person links
    Given I am signed in as an admin
    And I have a manually assigned or confirmed face-person link on an indexed image
    When I start a full library re-index that includes that image
    And the re-index job completes
    Then that face-person link remains on that image
