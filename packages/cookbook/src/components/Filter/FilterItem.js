import React from "react";
import PropTypes from "prop-types";
import { withStyles } from "@material-ui/core/styles";
import { ListItem, ListItemIcon, ListItemText } from "@material-ui/core";
import CheckBoxIcon from "@material-ui/icons/CheckBox";
import CheckBoxOutlineBlankIcon from "@material-ui/icons/CheckBoxOutlineBlank";

const styles = (theme) => ({
  checked: {
    color: theme.palette.primary.main,
  },
});

function FilterItem({
  category,
  checked,
  classes,
  label,
  numberOfRecipes,
  toggleFilter,
}) {
  function handleClick() {
    toggleFilter({ label, category });
  }

  return (
    <ListItem button onClick={handleClick}>
      <ListItemIcon>
        {checked ? (
          <CheckBoxIcon className={classes.checked} />
        ) : (
          <CheckBoxOutlineBlankIcon />
        )}
      </ListItemIcon>
      <ListItemText inset primary={`${label} (${numberOfRecipes})`} />
    </ListItem>
  );
}

FilterItem.propTypes = {
  category: PropTypes.string,
  checked: PropTypes.bool.isRequired,
  classes: PropTypes.shape().isRequired,
  label: PropTypes.string.isRequired,
  numberOfRecipes: PropTypes.number.isRequired,
  toggleFilter: PropTypes.func.isRequired,
};

FilterItem.defaultProps = {
  category: null,
};

export default withStyles(styles)(FilterItem);
