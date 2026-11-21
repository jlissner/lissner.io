import React, { useMemo } from "react";
import { useSelector } from "react-redux";
import moment from "moment";
import { withStyles } from "@material-ui/core/styles";
import {
  CircularProgress,
  Grid,
  List,
  ListItem,
  ListItemText,
  Paper,
} from "@material-ui/core";
import _filter from "lodash/filter";
import _map from "lodash/map";
import _sortBy from "lodash/sortBy";
import makeName from "../utils/makeName";

const styles = (theme) => ({
  loadingContainer: {
    padding: theme.spacing(2),
  },
});

function countRecipes(id, recipes) {
  return _filter(recipes, ({ authorFk }) => authorFk === id).length;
}

function UserList({ classes }) {
  const { users } = useSelector((state) => state.user);
  const recipes = useSelector((state) => state.recipes);
  const usersWithRecipeCount = useMemo(
    () =>
      _map(users, (user) => ({
        ...user,
        recipeCount: countRecipes(user.idPk, recipes),
      })),
    [users, recipes],
  );
  const sortedUsers = useMemo(
    () => _sortBy(usersWithRecipeCount, ["name"]),
    [usersWithRecipeCount],
  );

  if (users.length === 0) {
    return (
      <Paper className={classes.loadingContainer}>
        <Grid container spacing={2} wrap="nowrap" alignItems="center">
          <Grid item>Loading Users...</Grid>
          <Grid item>
            <CircularProgress />
          </Grid>
        </Grid>
      </Paper>
    );
  }

  return (
    <Paper>
      <List>
        {_map(sortedUsers, ({ idPk, ...user }) => (
          <ListItem key={idPk}>
            <ListItemText
              primary={makeName(user)}
              secondary={
                user.lastOnline
                  ? moment(user.lastOnline).format("MM/DD/YYYY")
                  : "Never"
              }
            />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}

export default withStyles(styles)(UserList);
