import React from "react";
import PropTypes from "prop-types";
import { withRouter } from "react-router-dom";
import { withStyles } from "@material-ui/core/styles";
import { List, ListSubheader, Paper } from "@material-ui/core";
import useNumberOfFavoriteRecipes from "../../hooks/useNumberOfFavoriteRecipes";
import useQueryString from "../../hooks/useQueryString";
import FilterItem from "./FilterItem";

const styles = (theme) => ({
  root: {
    background: "#fff",
    marginBottom: theme.spacing(2),
  },
  list: {
    width: "100%",
  },
});

function FavoriteFilter({ classes, location: _location, history: _history }) {
  const [getQueryValue, setQueryValue] = useQueryString();
  const numberOfRecipes = useNumberOfFavoriteRecipes();
  const checked = getQueryValue({ key: "favorite" }) === "true";
  const hide = !checked && !numberOfRecipes;

  function handleClick() {
    setQueryValue({ key: "favorite", value: !checked });
  }

  if (hide) {
    return false;
  }

  return (
    <Paper className={classes.root}>
      <List
        className={classes.list}
        subheader={<ListSubheader disableSticky>Favorites</ListSubheader>}
      >
        <FilterItem
          checked={checked}
          numberOfRecipes={numberOfRecipes}
          toggleFilter={handleClick}
          label="My Favorites"
        />
      </List>
    </Paper>
  );
}

FavoriteFilter.propTypes = {
  classes: PropTypes.shape().isRequired,
  location: PropTypes.shape().isRequired,
  history: PropTypes.shape().isRequired,
};

export default withRouter(withStyles(styles)(FavoriteFilter));
