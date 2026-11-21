import React from "react";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({
  space: {
    margin: (space) => theme.spacing(space),
  },
}));

function Spacing({ space }) {
  const classes = useStyles(space);

  return <div className={classes.space} />;
}

export default Spacing;
