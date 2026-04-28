Feature: Home media gallery and viewer
  As an authenticated user
  I want to browse my library, open items, share links, and perform bulk actions
  So that I can manage family media efficiently

  Background:
    Given I am signed in
    And I am on the home page

  Scenario: Media appears in the gallery
    When the home gallery has finished loading
    Then I see media grouped by date or an empty state when there are no files

  Scenario: Open a media item from the grid
    Given at least one image or video exists in the gallery
    When I open that item from the grid
    Then I see the media viewer for that item

  Scenario: Deep link opens the viewer
    Given a valid media id exists for my account
    When I open the home URL with a media query parameter for that id
    Then the media viewer shows that item without losing the query parameter prematurely

  Scenario: Close the viewer clears the deep link
    Given the media viewer is open from a shareable URL
    When I dismiss the viewer explicitly
    Then the media query parameter is removed from the address bar

  Scenario: Rotate a still image
    Given I have a still image open in the viewer that supports rotation
    When I choose rotate 90°
    Then the image is re-oriented and I can continue viewing or close the viewer

  Scenario: Bulk selection for actions
    Given several media items are visible in the gallery
    When I enter selection mode and select multiple items
    Then I can trigger at least one bulk action offered by the app (e.g. download or delete) subject to permissions

  Scenario: Timeline navigation on wide layout
    Given the timeline strip is available for my sort order
    When I choose a month from the timeline
    Then the gallery scrolls or loads to show that time range
