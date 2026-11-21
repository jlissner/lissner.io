import React, { useState } from "react";
import PropTypes from "prop-types";
import { withStyles } from "@material-ui/core/styles";
import { AppBar, Tabs, Tab } from "@material-ui/core";
import UserChangePassword from "../components/User/UserChangePassword";
import UserRecipes from "../components/User/UserRecipes";
import UserDetails from "../components/User/UserDetails";

const styles = (theme) => ({
  root: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 1440,
  },
  activeTab: {
    background: theme.palette.secondary.dark,
  },
});

function UserProfile({ classes }) {
  const [value, setValue] = useState(0);

  function handleChange(event, value) {
    setValue(value);
  }

  function renderTab() {
    switch (value) {
      case 2: {
        return <UserChangePassword />;
      }
      case 1: {
        return <UserDetails />;
      }
      default: {
        return <UserRecipes />;
      }
    }
  }

  return (
    <div className={classes.root}>
      <AppBar position="static" color="secondary">
        <Tabs
          value={value}
          onChange={handleChange}
          TabIndicatorProps={{
            className: classes.activeTab,
          }}
        >
          <Tab label="Recipes" />
          <Tab label="Details" />
          <Tab label="Change Password" />
        </Tabs>
      </AppBar>
      {renderTab()}
    </div>
  );
}

UserProfile.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(UserProfile);
