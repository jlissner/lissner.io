import React from "react";
import { withStyles } from "@material-ui/core/styles";
import { List, ListItem, ListItemText, Typography } from "@material-ui/core";
import _filter from "lodash/filter";
import _find from "lodash/find";
import FormattedText from "../utils/FormattedText";

const styles = (theme) => ({
  wrapper: {
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    flexDirection: "column",
  },
  accent: {
    display: "block",
    position: "absolute",
    margin: `${theme.spacing(10)}px auto`,
    width: 0,
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderLeft: `3px solid ${theme.palette.grey[400]}`,
  },
  list: {
    background: theme.palette.secondary.main,
    borderColor: theme.palette.grey[300],
    borderWidth: `${theme.spacing(2)}px 0`,
    borderStyle: "solid",
    maxWidth: 320,
    width: "100%",

    "& span": {
      color: "white",
    },
  },
  makeAhead: {
    background: theme.palette.accent2.main,
    borderColor: theme.palette.grey[300],
    borderWidth: `${theme.spacing(2)}px 0`,
    borderStyle: "solid",
    color: "white",
    marginBottom: theme.spacing(2),
    padding: theme.spacing(2),
    textAlign: "center",
    maxWidth: 320,
    width: "100%",
    zIndex: 1,
  },
  compact: {
    padding: 0,
    border: "none",
  },
});

function RecipeSummary({ classes, compact, recipe }) {
  function getTags(category) {
    return _filter(recipe.tags, { category });
  }

  const isMakeAhead = _find(getTags("Cooking Style"), { label: "Make Ahead" });

  return (
    <div className={classes.wrapper}>
      <div className={classes.accent}></div>
      {isMakeAhead ? (
        <Typography className={classes.makeAhead}>Make Ahead</Typography>
      ) : (
        false
      )}
      <List
        className={[classes.list, compact ? classes.compact : ""].join(" ")}
      >
        {recipe.additionalAttributes.serves ? (
          <ListItem>
            <ListItemText
              primary={
                <FormattedText text={recipe.additionalAttributes.serves} />
              }
            />
          </ListItem>
        ) : null}
        {getTags("Difficulty").length ? (
          <ListItem>
            <ListItemText
              primary={`Difficulty: ${getTags("Difficulty")[0].label}`}
            />
          </ListItem>
        ) : null}
        {getTags("Ethnicity").length ? (
          <ListItem>
            <ListItemText
              primary={`Ethnicity: ${getTags("Ethnicity")
                .map((e) => e.label)
                .join(", ")}`}
            />
          </ListItem>
        ) : null}
        {recipe.additionalAttributes.note ? (
          <ListItem>
            <ListItemText
              primary={
                <FormattedText
                  text={`Note: ${recipe.additionalAttributes.note}`}
                />
              }
            />
          </ListItem>
        ) : null}
      </List>
    </div>
  );
}

export default withStyles(styles)(RecipeSummary);
