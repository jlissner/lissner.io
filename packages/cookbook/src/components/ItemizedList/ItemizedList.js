import React from "react";
import PropTypes from "prop-types";
import _map from "lodash/map";
import ItemsGroup from "./ItemsGroup";
import Header from "../utils/Header";

function ItemizedList({ groups, items, title, ordered }) {
  return (
    <>
      <Header title={title} />
      {_map(groups, (group) => (
        <ItemsGroup
          key={group.title || "blank"}
          items={group[items]}
          title={group.title}
          ordered={ordered}
        />
      ))}
    </>
  );
}

ItemizedList.propTypes = {
  groups: PropTypes.arrayOf(PropTypes.shape()).isRequired,
  items: PropTypes.string.isRequired,
  title: PropTypes.string,
  ordered: PropTypes.bool,
};

ItemizedList.defaultProps = {
  ordered: false,
  title: "",
};

export default ItemizedList;
