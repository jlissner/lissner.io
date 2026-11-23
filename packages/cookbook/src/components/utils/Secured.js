import React from "react";
import { useSelector } from "react-redux";
import { Typography } from "@material-ui/core";

function Secured({ component, roles: _roles }) {
  const { activeUser } = useSelector((state) => state.user);

  if (activeUser.isAdmin) {
    return component;
  }

  return <Typography>You are not authorized to view this content.</Typography>;
}

export default Secured;
