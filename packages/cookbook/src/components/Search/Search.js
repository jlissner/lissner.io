import React, { useCallback, useEffect, useState } from "react";
import { withStyles } from "@material-ui/core/styles";
import { InputAdornment, Paper, TextField } from "@material-ui/core";
import SearchIcon from "@material-ui/icons/Search";
import _debounce from "lodash/debounce";
import useQueryString from "../../hooks/useQueryString";

const styles = (_theme) => ({
  search: {
    color: "inherit",
    "&:before, &:after, &:hover:before, &:hover:after": {
      borderColor: "inherit !important",
    },
  },
});

function Search({ classes, variant }) {
  const [getQueryValue, setQueryValue] = useQueryString();
  const search = getQueryValue({ key: "search", defaultValue: "" });
  const filters = getQueryValue({ key: "filters" });
  const [newSearch, setNewSearch] = useState(search);
  const debouncedSetSearch = useCallback(
    _debounce((value) => {
      setQueryValue({
        key: "search",
        value,
      });
    }, 500),
    [filters],
  );

  function updateSearch(evt) {
    const { value } = evt.target;

    setNewSearch(value);
    debouncedSetSearch(value);
  }

  useEffect(() => {
    return () => {
      debouncedSetSearch.flush();
    };
  }, [debouncedSetSearch]);

  useEffect(() => {
    setNewSearch(search);
  }, [search]);

  return (
    <Paper>
      <TextField
        className={classes.search}
        placeholder="Search..."
        fullWidth
        id="search-input"
        value={newSearch}
        onChange={updateSearch}
        variant={variant}
        InputProps={{
          classes: {
            root: classes.search,
            input: classes.search,
          },
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />
    </Paper>
  );
}

export default withStyles(styles)(Search);
