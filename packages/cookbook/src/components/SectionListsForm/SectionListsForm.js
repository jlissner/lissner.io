import React from "react";
import { withStyles } from "@material-ui/core/styles";
import { Button, Typography } from "@material-ui/core";
import _map from "lodash/map";
import _without from "lodash/without";
import useActions from "../../hooks/useActions";
import ListSection from "./ListSection";

const styles = (_theme) => ({});

function SectionListsForm({
  category,
  data,
  newSubItemTitle,
  subSection,
  title,
}) {
  const { setValue } = useActions();

  function removeSection(indexOfSection) {
    return () => {
      data.splice(indexOfSection, 1);

      setValue({
        key: category,
        value: data,
      });
    };
  }

  function removeItem(indexOfSection) {
    return (item) => {
      data[indexOfSection][subSection] = _without(
        data[indexOfSection][subSection],
        item,
      );

      setValue({
        key: category,
        value: data,
      });
    };
  }

  function addSection() {
    setValue({
      key: category,
      value: [...data, { title: "", [subSection]: [] }],
    });
  }

  function addItem(indexOfSection) {
    return (item) => {
      data[indexOfSection][subSection].push(item);

      setValue({
        key: category,
        value: data,
      });
    };
  }

  function updateItem(indexOfSection) {
    return (indexOfItem) => (evt) => {
      data[indexOfSection][subSection][indexOfItem] = evt.target.value;

      setValue({
        key: category,
        value: data,
      });
    };
  }

  function updateSectionTitle(indexOfSection) {
    return (newTitle) => {
      data[indexOfSection].title = newTitle;

      setValue({
        key: category,
        value: data,
      });
    };
  }

  return (
    <>
      <Typography paragraph variant="h6">
        {title}
      </Typography>
      {_map(data, (listSection, indexOfSection) => (
        <ListSection
          key={indexOfSection}
          addItem={addItem(indexOfSection)}
          newSubItemTitle={newSubItemTitle}
          subSection={subSection}
          listSection={listSection}
          removeSection={removeSection(indexOfSection)}
          removeItem={removeItem(indexOfSection)}
          updateItem={updateItem(indexOfSection)}
          updateSectionTitle={updateSectionTitle(indexOfSection)}
        />
      ))}
      <Button color="secondary" onClick={addSection} variant="contained">
        Add New Section
      </Button>
    </>
  );
}

export default withStyles(styles)(SectionListsForm);
