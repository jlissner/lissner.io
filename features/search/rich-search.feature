Feature: Rich media search with tags and people
  As a user
  I want to tag my media and search with tags, people, and semantic text together
  So that I can find photos quickly using expressions like "(#summer2025 OR #summer2024) AND @joeLissner AND water"

  Background:
    Given the app stores custom tags per media item
    And each person has a searchable handle derived from their display name

  Scenario: User adds and removes tags on a media item
    Given I have a media item selected
    When I add tags "summer2025" and "beach"
    Then the media item's tags include "summer2025"
    And the media item's tags include "beach"
    When I remove tag "beach"
    Then the media item's tags do not include "beach"

  Scenario: Search matches OR of hashtags
    Given media A has tag "summer2025"
    And media B has tag "summer2024"
    And media C has no tags
    When I search for "(#summer2025 OR #summer2024)"
    Then results include media A
    And results include media B
    And results do not include media C

  Scenario: Search combines hashtags, person handle, and semantic text
    Given person "Joe Lissner" has handle "joelissner"
    And media M has tag "summer2025"
    And media M includes person "Joe Lissner"
    And the index describes media M in a way that matches "water"
    When I search for "(#summer2025 OR #summer2024) AND @joelissner AND water"
    Then results include media M

  Scenario: Search by person handle includes videos where that person is tagged
    Given person "Joe Lissner" has handle "joelissner"
    And video V includes person "Joe Lissner"
    When I search for "@joelissner"
    Then results include video V

  Scenario: Invalid query returns a clear error
    When I search for "(#incomplete"
    Then I receive an error explaining the query could not be parsed

  Scenario: List distinct tags for discovery
    Given at least one media item has tag "summer2025"
    When I request the tag list
    Then the response includes "summer2025"
