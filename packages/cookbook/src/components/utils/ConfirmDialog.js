import React, { useState } from "react";
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@material-ui/core";

function ConfirmDialog({
  buttonText,
  buttonColor,
  confirmText,
  cancelText,
  dialogTitle,
  dialogText,
  onConfirm,
  WrapperComponent,
  ...props
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleOpen() {
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
  }

  async function handleConfirm() {
    setLoading(true);

    await onConfirm();

    setLoading(false);
    handleClose();
  }

  return (
    <WrapperComponent>
      <Button color={buttonColor} onClick={handleOpen} {...props}>
        {buttonText}
      </Button>
      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{dialogTitle}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {dialogText}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button disabled={loading} onClick={handleClose}>
            {cancelText}
          </Button>
          <Button
            autoFocus
            color={buttonColor}
            disabled={loading}
            onClick={handleConfirm}
            variant="contained"
          >
            {confirmText}
            {loading && <CircularProgress />}
          </Button>
        </DialogActions>
      </Dialog>
    </WrapperComponent>
  );
}

ConfirmDialog.defaultProps = {
  buttonColor: "default",
  dialogText: "",
  confirmText: "Confirm",
  cancelText: "Cancel",
  WrapperComponent: "div",
};

export default ConfirmDialog;
