import React, { useMemo } from "react";
import { useSelector } from "react-redux";
import { Box, Button, Grid, Typography } from "@material-ui/core";
import _filter from "lodash/filter";
import RecipeList from "../Recipe/RecipeList";
import RecipeFormButton from "../Recipe/RecipeForm/RecipeFormButton";

function UserRecipes() {
  const { activeUser } = useSelector((state) => state.user);
  const { idPk } = activeUser;
  const recipes = useSelector((state) => state.recipes);
  const userRecipes = useMemo(
    () => _filter(recipes, ({ authorFk }) => authorFk === idPk),
    [idPk, recipes],
  );

  const noRecipesContent = (
    <Box p={2}>
      <Grid container spacing={2} alignItems="center">
        <Grid item>
          <Typography>
            You haven't created any recipes yet, start now!
          </Typography>
        </Grid>
        <Grid item>
          <RecipeFormButton
            Component={Button}
            variant="contained"
            color="primary"
          />
        </Grid>
      </Grid>
    </Box>
  );

  return (
    <RecipeList noRecipesContent={noRecipesContent} recipeList={userRecipes} />
  );
}

export default UserRecipes;
