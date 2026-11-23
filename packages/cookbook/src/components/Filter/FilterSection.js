import React from "react";
import PropTypes from "prop-types";
import { withStyles } from "@material-ui/core/styles";
import { List, ListSubheader, Paper } from "@material-ui/core";
import _filter from "lodash/filter";
import _map from "lodash/map";
import FilterItem from "./FilterItem";

const styles = (theme) => ({
  root: {
    "& + $root": {
      marginTop: theme.spacing(2),
    },
  },
  list: {
    width: "100%",
  },
});

function FilterSection({ classes, filters, category, toggleFilter }) {
  const filtersToShow = _filter(
    filters,
    ({ checked, numberOfRecipes }) => numberOfRecipes || checked,
  );

  if (filtersToShow.length === 0) {
    return false;
  }

  return (
    <Paper className={classes.root}>
      <List
        className={classes.list}
        subheader={<ListSubheader disableSticky>{category}</ListSubheader>}
      >
        {_map(filtersToShow, ({ label, checked, numberOfRecipes }) => (
          <FilterItem
            key={label}
            category={category}
            checked={checked}
            label={label}
            numberOfRecipes={numberOfRecipes}
            toggleFilter={toggleFilter}
          />
        ))}
      </List>
    </Paper>
  );
}

FilterSection.propTypes = {
  classes: PropTypes.shape().isRequired,
  filters: PropTypes.arrayOf(PropTypes.shape()).isRequired,
  category: PropTypes.string.isRequired,
  toggleFilter: PropTypes.func.isRequired,
};

export default withStyles(styles)(FilterSection);
