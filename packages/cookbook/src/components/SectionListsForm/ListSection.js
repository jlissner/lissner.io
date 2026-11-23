import React from "react";
import { withStyles } from "@material-ui/core/styles";
import {
  IconButton,
  List,
  ListSubheader,
  ListItem,
  ListItemText,
  TextField,
} from "@material-ui/core";
import AddIcon from "@material-ui/icons/Add";
import CancelIcon from "@material-ui/icons/Cancel";
import _map from "lodash/map";
import Item from "./Item";

const styles = (theme) => ({
  root: {
    position: "relative",
  },
  removeButton: {
    position: "absolute",
    top: -24,
    right: -24,
    zIndex: 1,
  },
  section: {
    background: theme.palette.grey[200],
    marginBottom: theme.spacing(3),
    paddingBottom: theme.spacing(2),
    paddingTop: theme.spacing(2),
  },
  addIcon: {},
});

class RecipeIngredientsSectionForm extends React.Component {
  constructor(props) {
    super(props);

    const { newItem } = this.props;

    this.state = {
      newItem: newItem,
    };

    this.newItemRef = React.createRef();
  }

  handleEnter = (func) => (evt) => {
    if (evt.keyCode === 13) {
      evt.preventDefault();
      func();
    }
  };

  handleFieldChange = (evt) => {
    this.setState({
      [evt.target.name]: evt.target.value,
    });
  };

  addItem = () => {
    const { addItem } = this.props;
    const { newItem } = this.state;

    if (!newItem) {
      return;
    }

    addItem(newItem);

    this.setState({
      newItem: "",
    });
  };

  focusNewItem = () => {
    this.newItemRef.current.focus();
  };

  updateTitle = (evt) => {
    const newTitle = evt.target.value;

    this.props.updateSectionTitle(newTitle);
  };

  render() {
    const {
      classes,
      listSection,
      subSection,
      removeSection,
      removeItem,
      newSubItemTitle,
      updateItem,
    } = this.props;
    const { newItem } = this.state;

    return (
      <div className={classes.root}>
        <IconButton
          color="secondary"
          className={classes.removeButton}
          onClick={removeSection}
        >
          <CancelIcon />
        </IconButton>
        <List
          className={classes.section}
          subheader={
            <ListSubheader disableSticky>
              <TextField
                name={"newTitle"}
                label="Section Title"
                value={listSection.title}
                onChange={this.updateTitle}
                onKeyDown={this.handleEnter(this.focusNewItem)}
                placeholder="Sauce"
                fullWidth
                variant="filled"
              />
            </ListSubheader>
          }
        >
          {_map(listSection[subSection], (item, indexOfItem) => (
            <Item
              key={indexOfItem}
              item={item}
              updateItem={updateItem(indexOfItem)}
              removeItem={removeItem}
              focusNewItem={this.focusNewItem}
            />
          ))}
          <ListItem>
            <ListItemText>
              <TextField
                name="newItem"
                label={newSubItemTitle}
                value={newItem}
                onChange={this.handleFieldChange}
                onKeyDown={this.handleEnter(this.addItem)}
                fullWidth
                inputProps={{ ref: this.newItemRef }}
                multiline
              />
            </ListItemText>
            <IconButton
              disabled={!newItem}
              onClick={this.addItem}
              color="primary"
            >
              <AddIcon />
            </IconButton>
          </ListItem>
        </List>
      </div>
    );
  }
}

RecipeIngredientsSectionForm.defaultProps = {
  newItem: "",
};

export default withStyles(styles)(RecipeIngredientsSectionForm);
