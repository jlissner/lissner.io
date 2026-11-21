import React, { useState } from "react";
import { useSelector } from "react-redux";
import { withStyles } from "@material-ui/core/styles";
import {
  Button,
  Modal,
  Typography,
  Card,
  CardContent,
  CardActions,
  TextField,
} from "@material-ui/core";
import LoaderButton from "../LoaderButton/LoaderButton";
import useActions from "../../hooks/useActions";
import ForgotPassword from "./ForgotPassword";

const styles = (theme) => ({
  actions: {
    display: "flex",
    marginTop: theme.spacing(2),
  },
  title: {
    textAlign: "center",
    fontWeight: 700,
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  submitButton: {},
  requestAccess: {
    marginLeft: "auto",
  },
  modalContent: {
    position: "fixed",
    top: "20%",
    width: 400,
    left: 0,
    right: 0,
    margin: "0 auto",
  },
  closeButton: {
    marginLeft: "auto",
  },
  forgotPassword: {
    color: theme.palette.secondary.main,
    cursor: "pointer",
    padding: 0,
    textTransform: "none",
    textDecoration: "none",
    "&:hover": {
      color: theme.palette.secondary.dark,
    },
  },
});

function Login({ classes }) {
  const user = useSelector((state) => state.user);
  const { login } = useActions();
  const { loggingIn } = user;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [open, setOpen] = useState(false);

  function validateForm() {
    return email.length > 0 && password.length > 0;
  }

  function closeModal() {
    setOpen(false);
  }

  function openModal() {
    setOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    login(email, password);
  }

  return (
    <React.Fragment>
      <form onSubmit={handleSubmit}>
        <Typography variant="h6" className={classes.title}>
          Sign In to Continue
        </Typography>

        <TextField
          fullWidth
          autoFocus
          id="email"
          label="Email"
          type="email"
          className={classes.textField}
          value={email}
          onChange={(evt) => setEmail(evt.target.value)}
          variant="outlined"
          margin="dense"
        />
        <TextField
          fullWidth
          id="password"
          label="Password"
          type="password"
          className={classes.textField}
          value={password}
          onChange={(evt) => setPassword(evt.target.value)}
          variant="outlined"
          margin="dense"
          helperText={<ForgotPassword className={classes.forgotPassword} />}
        />
        <div className={classes.actions}>
          <LoaderButton
            className={classes.submitButton}
            disabled={!validateForm()}
            type="submit"
            isLoading={loggingIn}
            text="Login"
            loadingText="Logging in…"
          />
          <Button className={classes.requestAccess} onClick={openModal}>
            Request Access
          </Button>
        </div>
      </form>
      <Modal open={open} onClose={closeModal}>
        <Card className={classes.modalContent}>
          <CardContent>
            <Typography variant="h5" paragraph>
              Request Access
            </Typography>
            <Typography paragraph>
              In order to gain an account,{" "}
              <strong>send Joe an email requesting access</strong>. Make sure to
              explicity state which email address you want to sign in from.
            </Typography>

            <Typography paragraph>
              Within 24 hours (in most cases) you will recieve an email with a
              temporary password wich you will have to change on your first
              login.
            </Typography>

            <Typography>
              If you do not get any response in a reasonable time reach out to
              Joe directly.
            </Typography>
          </CardContent>
          <CardActions>
            <Button className={classes.closeButton} onClick={closeModal}>
              Close
            </Button>
          </CardActions>
        </Card>
      </Modal>
    </React.Fragment>
  );
}

export default withStyles(styles)(Login);
