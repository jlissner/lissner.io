import React from "react";
import { cleanup, fireEvent, waitForElement } from "@testing-library/react";
import { vi } from "vitest";
import { renderWithRedux } from "../../testUtils";
import graphql from "../../lib/graphql";
import Favorite from "./Favorite";

vi.mock("../../lib/graphql");

describe("Favorite Component", () => {
  const props = {
    disabled: false,
    recipe: "2",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(cleanup);

  it("renders", () => {
    renderWithRedux(<Favorite {...props} />);
  });

  it("toggles loading to when updating user", async () => {
    const { getByTestId } = renderWithRedux(<Favorite {...props} />);

    fireEvent.click(getByTestId("loaded"));
    await waitForElement(() => getByTestId("loading"));
    await waitForElement(() => getByTestId("loaded"));
  });

  it("adds a recipe to favorites", () => {
    const testProps = {
      ...props,
      recipe: "testRecipe",
    };
    const { getByTestId } = renderWithRedux(<Favorite {...testProps} />);
    const payload = {
      query: `
      mutation {
        createCookbookFavoriteRecipe(input: {cookbookFavoriteRecipe: {recipeFk: "testRecipe", cookbookFk: "1"}}) {
          clientMutationId
        }
      }
    `,
    };
    fireEvent.click(getByTestId("loaded"));

    expect(graphql).toHaveBeenCalledWith(payload);
  });

  it("removes a recipe to favorites", () => {
    const { getByTestId } = renderWithRedux(<Favorite {...props} />);
    const payload = {
      query: `
      mutation {
        removeFavoriteRecipe(input: {recipeId: "2", cookbookId: "1"}) {
          clientMutationId
        }
      }
    `,
    };

    fireEvent.click(getByTestId("loaded"));

    expect(graphql).toHaveBeenCalledWith(payload);
  });

  it("renders the correct element when it is favorite", () => {
    const { getByTestId } = renderWithRedux(<Favorite {...props} />);

    getByTestId("is-favorite");
  });

  it("renders the correct element when it is not favorite", () => {
    const testProps = {
      ...props,
      recipe: "4fff2c03-996d-4e99-93cf-56ae02c9d7cf",
    };
    const { getByTestId } = renderWithRedux(<Favorite {...testProps} />);

    getByTestId("not-favorite");
  });
});
