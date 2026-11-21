import React, { Component } from "react";
import {
  AuthenticationDetails,
  CognitoUserPool,
} from "amazon-cognito-identity-js";
import { withStyles } from "@material-ui/core/styles";
import TextField from "@material-ui/core/TextField";
import config from "../config";
import LoaderButton from "../components/LoaderButton/LoaderButton";

const styles = (theme) => ({
  root: {
    width: "100%",
    maxWidth: 400,
    margin: "0 auto",
    padding: theme.spacing(2),
  },
  submit: {
    marginTop: theme.spacing(1),
  },
});

class Signup extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isLoading: false,
      email: "",
      password: "",
      confirmPassword: "",
      confirmationCode: "",
      newUser: null,
    };
  }

  validateForm = () => {
    return (
      this.state.email.length > 0 &&
      this.state.password.length > 7 &&
      this.state.password === this.state.confirmPassword
    );
  };

  validateConfirmationForm = () => {
    return this.state.confirmationCode.length > 0;
  };

  renderConfirmForm = () => {
    const { classes } = this.props;
    return (
      <form onSubmit={this.handleConfirmationSubmit}>
        <TextField
          margin="normal"
          fullWidth
          helperText="Please check your email for the code."
          id="confirmationCode"
          label="Confirmation Code"
          type="tel"
          value={this.state.confirmationCode}
          onChange={this.handleChange}
        />

        <LoaderButton
          fullWidth
          className={classes.submit}
          disabled={!this.validateConfirmationForm()}
          isLoading={this.state.isLoading}
          loadingText="Verifying..."
          text="Verify"
          type="submit"
        />
      </form>
    );
  };

  renderForm = () => {
    const { classes } = this.props;

    return (
      <form onSubmit={this.handleSubmit}>
        <TextField
          margin="normal"
          fullWidth
          id="email"
          label="Email"
          type="tel"
          value={this.state.email}
          onChange={this.handleChange}
        />

        <TextField
          margin="normal"
          fullWidth
          helperText="Password must be at least 8 characters"
          id="password"
          label="Password"
          type="password"
          value={this.state.password}
          onChange={this.handleChange}
        />

        <TextField
          margin="normal"
          fullWidth
          id="confirmPassword"
          label="Confirm Password"
          type="password"
          value={this.state.confirmPassword}
          onChange={this.handleChange}
        />

        <LoaderButton
          fullWidth
          className={classes.submit}
          color="primary"
          disabled={!this.validateForm()}
          isLoading={this.state.isLoading}
          loadingText="Signing up..."
          text="Signup"
          type="submit"
        />
      </form>
    );
  };

  handleChange = (e) => {
    this.setState({
      [e.target.id]: e.target.value,
    });
  };

  signup = (email, password) => {
    const userPool = new CognitoUserPool({
      UserPoolId: config.cognito.USER_POOL_ID,
      ClientId: config.cognito.APP_CLIENT_ID,
    });

    return new Promise((resolve, reject) => {
      userPool.signUp(email, password, [], null, (err, result) => {
        if (err) {
          reject(err);
        } else {
          console.log(result.user);
          resolve(result.user);
        }
      });
    });
  };

  confirm = (user, confirmationCode) => {
    return new Promise((resolve, reject) => {
      user.confirmRegistration(confirmationCode, true, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  };

  authenticate = (user, email, password) => {
    const authenticationData = {
      Username: email,
      Password: password,
    };
    const authenticationDetails = new AuthenticationDetails(authenticationData);

    return new Promise((resolve, reject) => {
      return user.authenticateUser(authenticationDetails, {
        onSuccess: (result) => resolve(result),
        onFailure: (err) => reject(err),
      });
    });
  };

  handleSubmit = async (e) => {
    e.preventDefault();

    this.setState({ isLoading: true });

    try {
      const newUser = await this.signup(this.state.email, this.state.password);

      this.setState({
        newUser,
        isLoading: false,
      });
    } catch (err) {
      console.error(err);

      this.setState({ isLoading: false });
    }
  };

  handleConfirmationSubmit = async (e) => {
    e.preventDefault();

    this.setState({ isLoading: true });

    try {
      await this.confirm(this.state.newUser, this.state.confirmationCode);
      await this.authenticate(
        this.state.newUser,
        this.state.email,
        this.state.password,
      );

      this.props.userHasAuthenticated(true);
      this.props.history.push("/");
    } catch (err) {
      console.error(err);

      this.setState({ isLoading: false });
    }
  };

  render() {
    const { classes } = this.props;

    return (
      <div className={classes.root}>
        {this.state.newUser === null
          ? this.renderForm()
          : this.renderConfirmForm()}
      </div>
    );
  }
}

export default withStyles(styles)(Signup);
