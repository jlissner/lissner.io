Feature: Mobile photo upload via Web Share Target
  As a mobile user
  I want to share photos directly from my phone's camera or gallery
  So that I don't have to open the browser, navigate to the site, and manually upload

  Background:
    Given I am on my phone
    And the app is installed as a PWA or opened in a supporting browser

  Scenario: User shares photo from iOS Photos app
    Given I have selected photos in the iOS Photos app
    When I tap the Share button
    And I select the "Family Media" app from the share sheet
    Then I should see the upload confirmation screen
    And the selected photos should be pre-loaded for upload

  Scenario: User shares photo from Android gallery
    Given I have selected photos in the Android gallery
    When I tap the Share button
    And I select "Family Media" from the app picker
    Then I should see the upload confirmation screen
    And the selected photos should be pre-loaded for upload

  Scenario: Share Target not supported
    Given the browser does not support Web Share Target API
    When I try to share photos to the app
    Then I should be redirected to the upload page
    And I can select files manually

  Scenario: User takes photo directly in app
    Given I am in the Family Media app on my phone
    When I tap "Take Photo" in the upload interface
    Then the device camera should open
    And after taking a photo, it should be added to the upload queue

  Scenario: App is installable on home screen
    Given I am viewing the app in a mobile browser
    When the browser detects the web app manifest
    Then I should see an "Add to Home Screen" prompt
    And after installing, the app should appear as an icon on my home screen
    And launching it should open in full-screen mode without browser chrome
