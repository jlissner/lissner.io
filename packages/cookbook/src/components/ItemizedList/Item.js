import React, { useState } from "react";
import PropTypes from "prop-types";
import { withStyles } from "@material-ui/core/styles";
import { ListItem, ListItemIcon, ListItemText } from "@material-ui/core";
import CheckIcon from "@material-ui/icons/Check";
import { green } from "@material-ui/core/colors";
import FormattedText from "../utils/FormattedText";

const styles = (_theme) => ({
  check: {},
  checked: {
    "& $check, & $order": {
      color: green[500],
    },
  },
  order: {
    fontSize: 24,
    lineHeight: 1,
  },
  lineThrough: {
    textDecoration: "line-through",
  },
});

function Item({ classes, item, order, ordered }) {
  const [checked, setChecked] = useState(false);

  return (
    <ListItem button onClick={() => setChecked(!checked)}>
      <ListItemIcon className={checked ? classes.checked : ""}>
        {ordered ? (
          <span className={classes.order}>{order}.</span>
        ) : (
          <CheckIcon className={classes.check} />
        )}
      </ListItemIcon>
      <ListItemText
        className={checked ? classes.lineThrough : ""}
        primary={<FormattedText text={item} />}
      />
    </ListItem>
  );
}

Item.propTypes = {
  classes: PropTypes.shape().isRequired,
  item: PropTypes.string.isRequired,
  order: PropTypes.number.isRequired,
  ordered: PropTypes.bool,
};

Item.defaultProps = {
  ordered: false,
};

export default withStyles(styles)(Item);
