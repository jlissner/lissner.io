import React from "react";
import { Fab } from "@material-ui/core";
import useActions from "../../../hooks/useActions";

function RecipeFormButton({ onClick, text, Component, ...props }) {
  const { openForm } = useActions();

  function handleClick() {
    onClick();
    setTimeout(openForm, 50);
  }

  return (
    <Component onClick={handleClick} {...props}>
      {text}
    </Component>
  );
}

RecipeFormButton.defaultProps = {
  text: "Add New Recipe",
  Component: Fab,
  onClick: () => {},
};

export default RecipeFormButton;
