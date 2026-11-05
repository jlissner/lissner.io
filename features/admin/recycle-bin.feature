Feature: Admin media recycle bin
  As an admin
  I want to browse soft-deleted media, restore items, and permanently delete them
  So that accidental deletes can be undone and trash can be emptied deliberately

  Background:
    Given I am an authenticated admin user

  @ui @admin
  Scenario: Admin sees soft-deleted media in the recycle bin
    Given at least one media item has been moved to the recycle bin
    When I open the Admin recycle bin
    Then I see that soft-deleted media listed

  @ui @admin
  Scenario: Admin restores media from the recycle bin
    Given a soft-deleted media item appears in the recycle bin
    When I restore that item
    Then the item leaves the recycle bin
    And the item is visible again in the home gallery

  @ui @admin
  Scenario: Admin permanently deletes media from the recycle bin
    Given a soft-deleted media item appears in the recycle bin
    When I permanently delete that item
    Then the item leaves the recycle bin
    And the item cannot be restored

  @ui @admin
  Scenario: Admin opens a detailed preview of a recycle bin item
    Given a soft-deleted media item appears in the recycle bin
    When I open that item from the recycle bin
    Then I see a detailed preview with restore and permanent delete actions

  @ui @admin
  Scenario: Admin permanently deletes multiple recycle bin items
    Given several soft-deleted media items appear in the recycle bin
    When I select more than one item
    And I confirm delete selected
    Then those items leave the recycle bin
    And those items cannot be restored

  @ui @admin
  Scenario: Admin empties the recycle bin
    Given at least one soft-deleted media item appears in the recycle bin
    When I confirm empty recycle bin
    Then the recycle bin is empty

  @api @admin
  Scenario: Non-admin cannot access recycle bin endpoints
    Given I am signed in as a non-admin user
    When I request the admin recycle bin list
    Then the request is rejected as forbidden
