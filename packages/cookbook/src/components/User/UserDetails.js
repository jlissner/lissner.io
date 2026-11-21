import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import {
  Box,
  Button,
  Grid,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from "@material-ui/core";
import LoaderButton from "../LoaderButton/LoaderButton";
import makeName from "../utils/makeName";
import useActions from "../../hooks/useActions";

function UserDetails() {
  const { activeUser } = useSelector((state) => state.user);
  const { updateUser } = useActions();
  const [attributes, setAttributes] = useState(activeUser);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(false);
  }, [activeUser]);

  function updateAttribute(name) {
    return (evt) => {
      const updatedAttributes = {
        ...attributes,
        [name]: evt.target.value,
      };

      setAttributes(updatedAttributes);
    };
  }

  async function saveAttribtues() {
    setLoading(true);

    updateUser(attributes);
  }

  return (
    <Paper>
      <Box p={2}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Typography>Display Name: {makeName(attributes)}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              onChange={updateAttribute("preferredName")}
              name="preferredName"
              fullWidth
              label="Preferred Name"
              variant="outlined"
              value={attributes.preferredName || ""}
              placeholder="Joe"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              onChange={updateAttribute("nickname")}
              name="nickname"
              fullWidth
              label="Nickname"
              variant="outlined"
              value={attributes.nickname || ""}
              placeholder="&ldquo;Everyone's Favorite Cousin&rdquo;"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              onChange={updateAttribute("legalFirstName")}
              name="firstName"
              fullWidth
              label="First Name"
              variant="outlined"
              value={attributes.legalFirstName || ""}
              placeholder="Joseph"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              onChange={updateAttribute("birthFirstName")}
              name="birthFirstName"
              fullWidth
              label="Birth First Name"
              variant="outlined"
              value={attributes.birthFirstName || ""}
              placeholder="Joseph"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              onChange={updateAttribute("legalMiddleName")}
              value={attributes.legalMiddleName || ""}
              fullWidth
              label="Middle Name"
              name="middleName"
              variant="outlined"
              placeholder="Martin"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              onChange={updateAttribute("birthMiddleName")}
              value={attributes.birthMiddleName || ""}
              fullWidth
              label="Birth Middle Name"
              name="birthMiddleName"
              variant="outlined"
              placeholder="Martin"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              onChange={updateAttribute("legalLastName")}
              value={attributes.legalLastName || ""}
              fullWidth
              label="Last Name"
              name="lastName"
              variant="outlined"
              placeholder="Lissner"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              onChange={updateAttribute("birthLastName")}
              value={attributes.birthLastName || ""}
              fullWidth
              label="Birth Last Name"
              name="birthLastName"
              variant="outlined"
              placeholder="Lissner"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              onChange={updateAttribute("birthday")}
              value={attributes.birthday || ""}
              fullWidth
              label="Birthday"
              name="birthday"
              variant="outlined"
              type="date"
              InputLabelProps={{ shrink: true }}
              placeholder="08/04/1989"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              onChange={updateAttribute("gender")}
              value={attributes.gender || ""}
              fullWidth
              label="Gender"
              name="gender"
              variant="outlined"
              select
            >
              <MenuItem value="Male">Male</MenuItem>
              <MenuItem value="Female">Female</MenuItem>
              <MenuItem value="Other">Other</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              onChange={updateAttribute("phoneNumber")}
              value={attributes.phoneNumber || ""}
              fullWidth
              label="Phone Number"
              name="phoneNumber"
              variant="outlined"
              placeholder="+13144973313"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              disabled
              onChange={updateAttribute("email")}
              value={attributes.email || ""}
              fullWidth
              label="Email"
              name="email"
              variant="outlined"
            />
          </Grid>
          <Grid item>
            <LoaderButton
              isLoading={loading}
              onClick={saveAttribtues}
              text="Save"
              loadingText="Save"
            />
          </Grid>
          <Grid item>
            <Button onClick={() => setAttributes(activeUser)}>Reset</Button>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
}

export default UserDetails;
