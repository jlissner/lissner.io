import React, { Component } from "react";
import { withStyles } from "@material-ui/core/styles";
import { Button, Dialog } from "@material-ui/core";
import Login from "./Login";

const styles = (theme) => ({
  dialog: {
    padding: theme.spacing(2),
  },
});

class LoginButton extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isOpen: false,
    };
  }

  toggleOpen = () => {
    this.setState({
      isOpen: !this.state.isOpen,
    });
  };

  render() {
    const { classes, ...props } = this.props;

    return (
      <React.Fragment>
        <Button onClick={this.toggleOpen} {...props}>
          Login
        </Button>
        <Dialog
          classes={{ paper: classes.dialog }}
          open={this.state.isOpen}
          onClose={this.toggleOpen}
        >
          <Login />
        </Dialog>
      </React.Fragment>
    );
  }
}

export default withStyles(styles)(LoginButton);
