import React from "react";
import { withStyles } from "@material-ui/core/styles";
import { Button, CircularProgress } from "@material-ui/core";

const styles = (theme) => ({
  progress: {
    marginRight: theme.spacing(1),
  },
});

function LoaderButton({
  classes,
  isLoading,
  text,
  loadingText,
  className = "",
  disabled = false,
  ...props
}) {
  return (
    <Button
      className={`LoaderButton ${className}`}
      color="primary"
      disabled={disabled || isLoading}
      variant="contained"
      {...props}
    >
      {isLoading && <CircularProgress size={24} className={classes.progress} />}
      {!isLoading ? text : loadingText}
    </Button>
  );
}

export default withStyles(styles)(LoaderButton);
