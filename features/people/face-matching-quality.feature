Feature: Face detection and automatic matching quality
  As an authenticated user
  I want indexing and batch face matching to detect real faces reliably, surface uncertainty clearly, and never merge identities without my confirmation
  So that I spend less time correcting missed faces, false face regions, and mistaken identities

  Background:
    Given I have an authenticated session as a gallery user

  Scenario: A photo with a clear primary face yields at least one assignable face region after indexing
    Given fixture media "people/single-clear-face" has been uploaded and fully indexed
    When I open that media in the media viewer
    Then I see at least one face region available for assignment

  Scenario: Questionable detections are visibly low-confidence and every face region can be dismissed
    Given fixture media "people/no-human-face" has been uploaded and fully indexed
    When I open that media in the media viewer
    Then every face region shown for that media is indicated as low confidence
    And I can dismiss every face region shown for that media

  Scenario: Batch face matching never merges a placeholder into a named person without my confirmation
    Given a placeholder person exists with face samples derived from indexing
    And a named person exists who is a plausible match for that placeholder
    When I run automatic face matching for placeholders
    Then the placeholder is not merged into any named person until I explicitly confirm a merge

  Scenario: Batch face matching still requires confirmation when the suggested match is very strong
    Given a placeholder person exists with face samples that represent the same individual as an existing named person
    When I run automatic face matching for placeholders
    Then I am offered a merge for that pair
    And the placeholder is not merged into the named person until I explicitly confirm the merge
