import React, { useState } from "react";
import { withRouter } from "react-router-dom";
import Hidden from "@material-ui/core/Hidden";
import withWidth from "@material-ui/core/withWidth";
import Grid from "@material-ui/core/Grid";
import useMediaQuery from "@material-ui/core/useMediaQuery";
import Collapse from "@material-ui/core/Collapse";
import IconButton from "@material-ui/core/IconButton";
import Typography from "@material-ui/core/Typography";
import FilterIcon from "@material-ui/icons/FilterList";
import SearchBar from "../components/Search/Search";
import Filter from "../components/Filter/Filter";
import Quotes from "../components/Quotes/Quotes";
import RecipeList from "../components/Recipe/RecipeList";
import useRecipeList from "../hooks/useRecipeList";

function Search(_props) {
  const matches = useMediaQuery("(min-width:600px)");
  const [showFilter, setShowFilters] = useState(false);
  const recipeList = useRecipeList();
  const noRecipesContent = <Typography>No recipes found.</Typography>;

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Grid container spacing={3} justify="space-between" alignItems="center">
          <Grid item xs={12} sm={6}>
            <Typography variant="h4">Find A Recipe</Typography>
          </Grid>
          <Grid item xs={12} sm>
            <Quotes />
          </Grid>
        </Grid>
      </Grid>
      <Hidden smUp>
        <Grid item xs={12}>
          <Grid container spacing={2} wrap="nowrap">
            <Grid item xs={12}>
              <SearchBar variant="outlined" />
            </Grid>
            <Grid item>
              <IconButton onClick={() => setShowFilters(!showFilter)}>
                <FilterIcon />
              </IconButton>
            </Grid>
          </Grid>
        </Grid>
      </Hidden>
      <Grid item xs={12} sm={6} md={4}>
        <Collapse in={matches || showFilter}>
          <Filter category="recipes" />
        </Collapse>
      </Grid>
      <Grid item xs={12} sm={6} md={8}>
        <Grid container spacing={3}>
          <Hidden only="xs">
            <Grid item xs={12}>
              <SearchBar variant="outlined" />
            </Grid>
          </Hidden>
          <Grid item xs={12}>
            <RecipeList
              noRecipesContent={noRecipesContent}
              recipeList={recipeList}
            />
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
}

export default withWidth()(withRouter(Search));
