import React from "react";
import PropTypes from "prop-types";
import { withStyles } from "@material-ui/core/styles";
import { Grid, Typography } from "@material-ui/core";
import Favorite from "../Favorite/Favorite";
import FormattedText from "../utils/FormattedText";

const styles = (theme) => ({
  description: {
    color: theme.palette.grey[700],
  },
  title: {
    marginRight: theme.spacing(1.5),
  },
  subtitle: {
    color: "#808080",
    fontSize: "1.5em",
    lineHeight: "1.5em",
  },
});

function RecipeDetailHeader({ classes, recipe }) {
  return (
    <Grid container spacing={1}>
      <Grid item xs={12}>
        <Grid container spacing={1} wrap="nowrap">
          <Grid item>
            <Favorite recipe={recipe.idPk} />
          </Grid>
          <Grid item>
            <Grid container alignItems="flex-end">
              <Grid item>
                <Typography className={classes.title} variant="h4">
                  {recipe.name}
                </Typography>
              </Grid>
              <Grid item>
                <Typography className={classes.subtitle} variant="subtitle1">
                  {recipe.additionalAttributes.author}
                </Typography>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
      <Grid item xs={12}>
        {recipe.additionalAttributes.description ? (
          <Typography variant="h6" className={classes.description}>
            <FormattedText text={recipe.additionalAttributes.description} />
          </Typography>
        ) : null}
      </Grid>
    </Grid>
  );
}

RecipeDetailHeader.propTypes = {
  classes: PropTypes.shape().isRequired,
  recipe: PropTypes.shape().isRequired,
};

export default withStyles(styles)(RecipeDetailHeader);
