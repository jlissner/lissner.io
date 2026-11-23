import React from "react";
import PropTypes from "prop-types";
import { useSelector } from "react-redux";
import { withStyles } from "@material-ui/core/styles";
import {
  Typography,
  FormGroup,
  FormControlLabel,
  Checkbox,
  RadioGroup,
  Radio,
} from "@material-ui/core";
import { green } from "@material-ui/core/colors";
import _get from "lodash/get";
import _map from "lodash/map";
import _find from "lodash/find";
import _differenceBy from "lodash/differenceBy";
import _conact from "lodash/concat";
import _filter from "lodash/filter";
import useActions from "../../../hooks/useActions";

const styles = (theme) => ({
  checked: {},
  checkbox: {
    "&$checked": {
      color: green[500], // needs to be child of checkbox for specificity
    },
  },
  formGroup: {
    marginBottom: theme.spacing(4),
  },
});

function RecipeTagsForm({ classes, options, title, radio }) {
  const { setValue } = useActions();
  const tags = useSelector((state) => state.recipeForm.tags);

  function toggleCheckbox(tag, isActive) {
    return () => {
      const value = isActive
        ? _differenceBy(tags, [tag], "label")
        : _conact(tags, tag);

      setValue({
        key: "tags",
        value,
      });
    };
  }

  function selectRadio(tag) {
    return () => {
      const category = tag.category;
      const newTags = _filter(tags, (_tag) => _tag.category !== category);

      setValue({
        key: "tags",
        value: _conact(newTags, tag),
      });
    };
  }

  function renderCheckboxList() {
    return _map(options, (option) => {
      const isActive = Boolean(_find(tags, option));

      return (
        <FormControlLabel
          key={option.label}
          label={option.label}
          control={
            <Checkbox
              checked={isActive}
              onChange={toggleCheckbox(option, isActive)}
              classes={{
                root: classes.checkbox,
                checked: classes.checked,
              }}
            />
          }
        />
      );
    });
  }

  function renderRadioList() {
    const activeRadioTag = _find(tags, { category: title });
    const value = _get(activeRadioTag, "label", "");

    return (
      <RadioGroup name={`${title}-radio`} value={value}>
        {_map(options, (option) => {
          return (
            <FormControlLabel
              key={option.label}
              label={option.label}
              value={option.label}
              control={
                <Radio
                  onClick={selectRadio(option)}
                  classes={{
                    root: classes.checkbox,
                    checked: classes.checked,
                  }}
                />
              }
            />
          );
        })}
      </RadioGroup>
    );
  }

  return (
    <>
      <Typography variant="h6">{title}</Typography>
      <FormGroup className={classes.formGroup}>
        {radio ? renderRadioList() : renderCheckboxList()}
      </FormGroup>
    </>
  );
}

RecipeTagsForm.defaultProps = {};

RecipeTagsForm.propTypes = {
  title: PropTypes.string.isRequired,
  options: PropTypes.arrayOf(PropTypes.shape()).isRequired,
};

export default withStyles(styles)(RecipeTagsForm);
