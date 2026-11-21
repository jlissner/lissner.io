import React from "react";
import { withStyles } from "@material-ui/core/styles";
import { Divider, Grid, Typography } from "@material-ui/core";

const styles = (theme) => ({
  header: {
    marginBottom: theme.spacing(2),
  },
});

function Header({ classes, title }) {
  return (
    <Grid
      className={classes.header}
      container
      spacing={2}
      wrap="nowrap"
      alignItems="center"
    >
      <Grid item xs={1}>
        <Divider />
        <Divider />
        <Divider />
      </Grid>
      <Grid item>
        <Typography variant="h4">{title}</Typography>
      </Grid>
      <Grid item xs={12}>
        <Divider />
        <Divider />
        <Divider />
      </Grid>
    </Grid>
  );
}

export default withStyles(styles)(Header);
