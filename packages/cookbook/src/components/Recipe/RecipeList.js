import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useSelector } from "react-redux";
import { Link, withRouter } from "react-router-dom";
import { withStyles } from "@material-ui/core/styles";
import {
  Card,
  CardHeader,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  CircularProgress,
} from "@material-ui/core";
import _find from "lodash/find";
import _groupBy from "lodash/groupBy";
import _kebabCase from "lodash/kebabCase";
import _map from "lodash/map";
import _sortBy from "lodash/sortBy";
import Favorite from "../Favorite/Favorite";

const sectionItemStyles = {
  listItem: {
    transition: "all .2s ease-out",
    transform: "translateX(-16px)",
    opacity: 0,
    "&.loaded": {
      transform: "translateX(0)",
      opacity: 1,
    },
  },
};

const sectionStyles = (theme) => ({
  section: {
    marginBottom: theme.spacing(3),
  },
});

function sortRecipesBySection(recipe) {
  const section = _find(recipe.tags, (tag) => tag.category === "Section").label;

  switch (section) {
    case "Appetizer":
      return 1;
    case "Soup":
      return 2;
    case "Salad":
      return 3;
    case "Bread":
      return 4;
    case "Lunch & Brunch":
      return 5;
    case "Vegetable":
      return 6;
    case "Poultry":
      return 7;
    case "Meat & Fish":
      return 8;
    case "Desserts":
      return 9;
    case "Cookies & Bars":
      return 10;
    case "Cakes":
      return 11;
    case "Pies":
      return 12;
    case "Candies & Sweets":
      return 13;
    case "Bits & Pieces":
      return 14;
    default:
      return 15;
  }
}

function SectionItem({ classes, recipe }) {
  const [className, setClassName] = useState("");
  const { additionalAttributes, idPk, name } = recipe;
  const { author } = additionalAttributes;

  useEffect(() => {
    const loadedTimeout = setTimeout(() => setClassName("loaded"), 100);

    return () => clearTimeout(loadedTimeout);
  }, []);

  return (
    <ListItem
      button
      className={[classes.listItem, className].join(" ")}
      component={Link}
      to={`/cookbook/${_kebabCase(name)}`}
    >
      <ListItemText primary={name} secondary={author} />
      <ListItemSecondaryAction>
        <Favorite recipe={idPk} />
      </ListItemSecondaryAction>
    </ListItem>
  );
}

const StyledSectionItem = withStyles(sectionItemStyles)(SectionItem);

function Section({ classes, recipes, section }) {
  if (!recipes) {
    return null;
  }

  return (
    <Card className={classes.section}>
      <CardHeader title={section} />
      <List>
        {_map(recipes, (recipe) => (
          <StyledSectionItem key={recipe.idPk} recipe={recipe} />
        ))}
      </List>
    </Card>
  );
}

const StyledSection = withStyles(sectionStyles)(Section);

function RecipeList({ noRecipesContent, recipeList }) {
  const recipes = useSelector((state) => state.recipes);
  const sections = useSelector((state) => state.sections);
  const sortedRecipes = useMemo(
    () => _sortBy(recipeList, [sortRecipesBySection, "name"]),
    [recipeList],
  );
  const [numOfRecipesToLoad, setNumOfRecipesToLoad] = useState(1);
  const [, setLoadRecipesTimeout] = useState(0);
  const groupedRecipes = _groupBy(
    sortedRecipes.slice(0, numOfRecipesToLoad),
    (r) => _find(r.tags, { category: "Section" }).label,
  );

  useEffect(() => {
    if (numOfRecipesToLoad < recipeList.length) {
      const incrementBy = numOfRecipesToLoad < 10 ? 1 : 20;
      const loadedTimeout = setTimeout(() => {
        setNumOfRecipesToLoad(numOfRecipesToLoad + incrementBy);
      }, 100);

      setLoadRecipesTimeout(loadedTimeout);

      return () => clearTimeout(loadedTimeout);
    }
  }, [numOfRecipesToLoad, recipeList.length]);

  useEffect(() => {
    setLoadRecipesTimeout((prevLoadRecipedTimeout) =>
      clearTimeout(prevLoadRecipedTimeout),
    );
    setNumOfRecipesToLoad((prevNumOfRecipesToLoad) =>
      prevNumOfRecipesToLoad > 10 ? 10 : prevNumOfRecipesToLoad + 1,
    );
  }, [sortedRecipes]);

  if (recipes.length === 0) {
    return <CircularProgress />;
  }

  if (recipeList.length === 0) {
    return noRecipesContent;
  }
  return _map(sections, ({ name }) => (
    <StyledSection key={name} recipes={groupedRecipes[name]} section={name} />
  ));
}

RecipeList.propTypes = {
  recipeList: PropTypes.arrayOf(PropTypes.shape()).isRequired,
  noRecipesContent: PropTypes.node.isRequired,
};

export default withRouter(RecipeList);
