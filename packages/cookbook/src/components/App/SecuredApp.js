import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { CssBaseline } from "@material-ui/core";
import Layout from "../Layout/Layout";
import useActions from "../../hooks/useActions";

function SecuredApp() {
  const recipes = useSelector((state) => state.recipes);
  const user = useSelector((state) => state.user);
  const { fetchSections, fetchTags, fetchRecipes, getCurrentUser } =
    useActions();
  const [authenticated, setAuthenticated] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const { activeUser, authenticating } = user;
  const { idPk } = activeUser;

  useEffect(() => {
    if (!authenticated && authenticating) {
      getCurrentUser();
    } else if (!authenticated && idPk) {
      setAuthenticated(true);
    }
  }, [authenticated, authenticating, getCurrentUser, idPk]);

  useEffect(() => {
    if (authenticated && !hasFetched) {
      fetchRecipes();
      fetchTags();
      fetchSections();
      setHasFetched(true);
    }
  }, [authenticated, hasFetched, fetchRecipes, fetchTags, fetchSections]);

  return (
    <React.Fragment>
      <CssBaseline />
      <Layout
        user={idPk}
        isAuthenticating={authenticating}
        isLoading={Boolean(!recipes.length)}
      />
    </React.Fragment>
  );
}

export default SecuredApp;
