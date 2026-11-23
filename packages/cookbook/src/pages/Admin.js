import React, { useState } from "react";
import { withStyles } from "@material-ui/core/styles";
import { AppBar, Box, Tab, Tabs } from "@material-ui/core";
import UserList from "../components/User/UserList";
import CreateUser from "../components/User/CreateUser";

const styles = (theme) => ({
  activeTab: {
    background: theme.palette.secondary.dark,
  },
});

function Admin({ classes }) {
  const [activeTab, setActiveTab] = useState(0);

  function showTab() {
    if (activeTab) {
      return <CreateUser />;
    }

    return <UserList />;
  }

  return (
    <Box width={420}>
      <AppBar color="secondary" position="static">
        <Tabs
          onChange={(evt, newTab) => setActiveTab(newTab)}
          value={activeTab}
          TabIndicatorProps={{
            className: classes.activeTab,
          }}
        >
          <Tab label="User List" value={0} />
          <Tab label="Create New User" value={1} />
        </Tabs>
      </AppBar>

      {showTab()}
    </Box>
  );
}

export default withStyles(styles)(Admin);
