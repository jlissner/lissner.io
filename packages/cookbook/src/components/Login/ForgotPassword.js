import React, { useState } from "react";
import PropTypes from "prop-types";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@material-ui/core";

function ForgotPassword({ className }) {
  const [open, setOpen] = useState(false);

  function handleClose() {
    setOpen(false);
  }

  return (
    <>
      <Button className={className} onClick={() => setOpen(true)}>
        Forgot your password?
      </Button>
      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="forgot-password-dialog-title"
        aria-describedby="forgot-password-dialog-description"
      >
        <DialogTitle id="forgot-password-dialog-title">
          Forgor Your Password?
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="forgot-password-dialog-description">
            Self-service password reset is currently being worked on. In the
            mean time, you can contact Joe and he will help you out.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

ForgotPassword.propTypes = {
  className: PropTypes.string.isRequired,
};

export default ForgotPassword;
