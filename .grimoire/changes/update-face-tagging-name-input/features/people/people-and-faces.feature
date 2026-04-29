Feature: People and face assignment
  As an authenticated user
  I want to manage people and link faces in photos
  So that search and browsing reflect who appears in each image

  Background:
    Given I am signed in

  Scenario: List people
    When I open the people page
    Then I see a list of people or an empty state

  Scenario: Create a person
    When I create a new person with a name
    Then that person appears in the people list

  Scenario: Rename a person
    Given a person exists
    When I change their display name
    Then the updated name is shown

  Scenario: Merge two people
    Given two distinct people exist
    When I merge one person into the other
    Then there is a single combined person record and media counts reflect the merge

  Scenario: Preview photos for a person
    Given a person has associated media
    When I view that person's detail
    Then I see thumbnails or previews for their photos

  Scenario: Assign a face to an existing person from the viewer
    Given I have an image open in the media viewer with detected faces
    And people exist in the system
    When I assign a face region to an existing person using the person selector
    Then that assignment is saved and reflected when I reload faces for the item

  Scenario: Assign a face to a new person with a typed name
    Given I have an image open in the media viewer with detected faces
    When I type a new person's name in the person selector and assign the face
    Then a new person is created with the typed name
    And that assignment is saved and reflected when I reload faces for the item

  Scenario: Reassign a face to a new person with a typed name
    Given a face on media is linked to a person
    When I reassign that face to a new person by typing a name in the person selector
    Then a new person is created with the typed name
    And the face association updates to the new person

  Scenario: Tag a person as appearing in a video
    Given I have a video open in the media viewer
    And a person exists
    When I tag that person as appearing in the video using the person selector
    Then that person appears in the video's tagged people list

  Scenario: Tag a new person in a video with a typed name
    Given I have a video open in the media viewer
    When I type a new person's name in the person selector and tag the video
    Then a new person is created with the typed name
    And that person appears in the video's tagged people list

  Scenario: Remove or reassign a face link
    Given a face on media is linked to a person
    When I remove or reassign that link
    Then the face association updates accordingly
