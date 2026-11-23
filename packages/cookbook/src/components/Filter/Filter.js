import React from "react";
import PropTypes from "prop-types";
import { useSelector } from "react-redux";
import { withRouter } from "react-router-dom";
import { CircularProgress } from "@material-ui/core";
import _concat from "lodash/concat";
import _find from "lodash/find";
import _filter from "lodash/filter";
import _isEqual from "lodash/isEqual";
import _map from "lodash/map";
import _sortBy from "lodash/sortBy";
import _uniq from "lodash/uniq";
import FilterSection from "./FilterSection";
import FavoriteFilter from "./FavoriteFilter";
import useAvailableFilters from "../../hooks/useAvailableFilters";
import useQueryString from "../../hooks/useQueryString";

function sortSections({ category }) {
  switch (category) {
    case "Section":
      return 0;
    case "Difficulty":
      return 1;
    case "Dietary Preference":
      return 1;
    case "Cooking Style":
      return 3;
    case "Ethnicity":
      return 4;
    default:
      return 5;
  }
}

function Filter({ history, location }) {
  const [getQueryValue, setQueryValue] = useQueryString();
  const filtersString = getQueryValue({
    location,
    key: "filters",
    defaultValue: "[]",
  });
  const filters = JSON.parse(filtersString);
  const availableFilters = useAvailableFilters();
  const tags = useSelector((state) => state.tags);

  function toggleFilter(filter) {
    const alreadyExists = _find(filters, filter);
    const newValue = alreadyExists
      ? _filter(filters, (f) => !_isEqual(f, filter))
      : _uniq(_concat(filters, filter));

    setQueryValue({
      value: newValue.length ? JSON.stringify(newValue) : "",
      key: "filters",
      location,
      history,
    });
  }

  if (tags.length === 0) {
    return <CircularProgress />;
  }

  return (
    <>
      <FavoriteFilter />

      {_map(
        _sortBy(availableFilters, sortSections),
        ({ category, filters }) => (
          <FilterSection
            key={category}
            category={category}
            filters={filters}
            toggleFilter={toggleFilter}
          />
        ),
      )}
    </>
  );
}

Filter.propTypes = {
  history: PropTypes.shape().isRequired,
  location: PropTypes.shape().isRequired,
};

export default withRouter(Filter);
