import React from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { withStyles } from "@material-ui/core/styles";
import { Button, Divider, Grid, Typography } from "@material-ui/core";
import FavoriteIcon from "@material-ui/icons/Favorite";
import _map from "lodash/map";
import Search from "../components/Search/Search";

const styles = (theme) => ({
  btn: {
    background: "white",
    "&:hover": {
      background: theme.palette.grey[200],
    },
    "& span": {
      whiteSpace: "nowrap",
      overflow: "hidden",
      display: "block",
      width: "100%",
      textOverflow: "ellipsis",
      textAlign: "center",
    },
  },
  drawer: {
    width: 320,
    top: 64,
  },
  toolbarActions: {
    display: "flex",
  },
  contentContainer: {
    height: "100%",
  },
  titleContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: theme.spacing(2),
  },
  searchContainer: {
    marginRight: theme.spacing(2),
  },
  filtersContainer: {
    background: "white",
  },
  filterButton: {
    color: "white",
  },
  iconWrapper: {
    display: "flex",
    alignItems: "center",
  },
});

function Home({ classes, location, history }) {
  const searchPageUrl = `search${location.search}`;
  const sections = useSelector((state) => state.sections);

  function submitSearch(evt) {
    evt.preventDefault();

    history.push(`/cookbook/${searchPageUrl}`);
  }

  return (
    <Grid
      container
      component="form"
      onSubmit={submitSearch}
      alignItems="center"
      justify="center"
      spacing={2}
      className={classes.contentContainer}
    >
      <Grid item xs={12}>
        <Typography align="center" paragraph variant="h3">
          Lissner Cookbook
        </Typography>
      </Grid>
      <Grid item xs={12} sm={6} md={8}>
        <Search variant="outlined" />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <Button
          fullWidth
          color="secondary"
          size="large"
          variant="contained"
          to={`/cookbook/${searchPageUrl}`}
          component={Link}
        >
          Search
        </Button>
      </Grid>
      <Grid item xs={12}>
        <Divider />
      </Grid>
      {_map(sections, ({ name }) => (
        <Grid key={name} item xs={12} sm={6} md={4}>
          <Button
            fullWidth
            size="large"
            variant="contained"
            className={classes.btn}
            component={Link}
            to={`/cookbook/search?filters=[{"category": "Section", "label": "${encodeURIComponent(name)}"}]`}
            title={name}
          >
            {name}
          </Button>
        </Grid>
      ))}
      <Grid item xs={12} sm={6} md={4}>
        <Button
          fullWidth
          size="large"
          variant="contained"
          className={classes.btn}
          component={Link}
          to="/cookbook/search?favorite=true"
          title="Favorites"
        >
          <Grid container spacing={2} justify="center" alignContent="center">
            <Grid item className={classes.iconWrapper}>
              <FavoriteIcon color="secondary" />
            </Grid>
            <Grid item>Favorites</Grid>
          </Grid>
        </Button>
      </Grid>
    </Grid>
  );
}

export default withStyles(styles)(Home);
