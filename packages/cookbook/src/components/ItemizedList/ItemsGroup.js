import React from "react";
import PropTypes from "prop-types";
import { withStyles } from "@material-ui/core/styles";
import { List, ListSubheader, Paper } from "@material-ui/core";
import _map from "lodash/map";
import Item from "./Item";

const styles = (theme) => ({
  root: {
    "& + $root": {
      marginTop: theme.spacing(2),
    },
  },
});

function ItemsGroup({ classes, items, ordered, title }) {
  return (
    <Paper className={classes.root}>
      <List subheader={<ListSubheader disableSticky>{title}</ListSubheader>}>
        {_map(items, (item, i) => (
          <Item key={item} item={item} order={i + 1} ordered={ordered} />
        ))}
      </List>
    </Paper>
  );
}

ItemsGroup.propTypes = {
  classes: PropTypes.shape().isRequired,
  items: PropTypes.arrayOf(PropTypes.string).isRequired,
  ordered: PropTypes.bool,
  title: PropTypes.string,
};

ItemsGroup.defaultProps = {
  ordered: false,
  title: "",
};

export default withStyles(styles)(ItemsGroup);
