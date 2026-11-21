import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { withStyles } from "@material-ui/core/styles";
import {
  Button,
  Card,
  CardHeader,
  CardContent,
  CardActions,
  TextField,
} from "@material-ui/core";
import useActions from "../../hooks/useActions";

const styles = (_theme) => ({});

function UserChangePassword({ classes }) {
  const { activeUser } = useSelector((state) => state.user);
  const { updateUserPassword } = useActions();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!loading) {
      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConfirm("");
    }
  }, [loading]);

  useEffect(() => {
    setLoading(false);
  }, [activeUser]);

  async function changePassword() {
    if (newPassword !== newPasswordConfirm) {
      return toast.error("Your new passwords don't match.");
    }

    setLoading(true);

    updateUserPassword({ idPk: activeUser.idPk, currentPassword, newPassword });
  }

  function handleEnter(evt) {
    if (evt.keyCode === 13) {
      changePassword();
    }
  }

  const submitDisabled = !currentPassword || newPassword !== newPasswordConfirm;

  return (
    <Card className={classes.root}>
      <CardHeader title="Change Password" />
      <CardContent>
        <TextField
          fullWidth
          margin="normal"
          onChange={(evt) => setCurrentPassword(evt.target.value)}
          type="password"
          value={currentPassword}
          name="currentPassword"
          label="Current Password"
          variant="outlined"
        />
        <TextField
          fullWidth
          margin="normal"
          onChange={(evt) => setNewPassword(evt.target.value)}
          type="password"
          value={newPassword}
          name="newPassword"
          label="New Password"
          variant="outlined"
        />
        <TextField
          fullWidth
          margin="normal"
          onChange={(evt) => setNewPasswordConfirm(evt.target.value)}
          onKeyDown={handleEnter}
          type="password"
          value={newPasswordConfirm}
          name="newPasswordConfirm"
          label="Confirm New Password"
          variant="outlined"
        />
      </CardContent>
      <CardActions>
        <Button
          color="primary"
          disabled={submitDisabled || loading}
          onClick={changePassword}
          variant="contained"
        >
          Change Password
        </Button>
      </CardActions>
    </Card>
  );
}

export default withStyles(styles)(UserChangePassword);
