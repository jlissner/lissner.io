import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { v4 } from "uuid";
import {
  Box,
  Button,
  IconButton,
  Grid,
  Paper,
  TextField,
} from "@material-ui/core";
import RefreshIcon from "@material-ui/icons/Refresh";
import useActions from "../../hooks/useActions";

function CreateUser() {
  const { users } = useSelector((state) => state.user);
  const { createUser } = useActions();
  const [password, setPassword] = useState(v4());
  const [resetPassword, setResetPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!loading) {
      setEmail("");
      setFirstName("");
      setLastName("");
      setPreferredName("");
    }
  }, [loading]);

  useEffect(() => {
    if (!loading && resetPassword) {
      setPassword("");
    }
  }, [loading, resetPassword]);

  useEffect(() => {
    setLoading(false);
  }, [users]);

  function onSubmit(e) {
    e.preventDefault();

    setLoading(true);

    createUser({
      email: email,
      legalFirstName: firstName,
      legalLastName: lastName,
      preferredName: preferredName,
      passwordHash: password,
    });
  }

  function valid() {
    return email && firstName && lastName && password;
  }

  return (
    <Paper>
      <Box p={2}>
        <Grid component="form" container onSubmit={onSubmit} spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Email Address"
              name="email"
              onChange={(evt) => setEmail(evt.target.value)}
              value={email}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="First Name"
              name="firstName"
              onChange={(evt) => setFirstName(evt.target.value)}
              value={firstName}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Preferred Name"
              name="preferredName"
              onChange={(evt) => setPreferredName(evt.target.value)}
              value={preferredName}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Last Name"
              name="lastName"
              onChange={(evt) => setLastName(evt.target.value)}
              value={lastName}
            />
          </Grid>

          <Grid item xs={12}>
            <Grid container wrap="nowrap" spacing={1} alignItems="center">
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Temp Password"
                  name="tempPassword"
                  value={password}
                  onChange={(evt) => {
                    setPassword(evt.target.value);
                    setResetPassword(true);
                  }}
                />
              </Grid>
              <Grid item>
                <IconButton
                  onClick={() => {
                    setPassword(v4());
                    setResetPassword(false);
                  }}
                  color="primary"
                  size="small"
                >
                  <RefreshIcon />
                </IconButton>
              </Grid>
            </Grid>
          </Grid>

          <Grid item xs={12}>
            <Button
              color="primary"
              disabled={!valid() || loading}
              fullWidth
              type="submit"
              variant="contained"
            >
              Create User
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
}

export default CreateUser;
