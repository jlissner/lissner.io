import React, { useMemo } from "react";
import { withStyles } from "@material-ui/core/styles";
import _map from "lodash/map";
import { v4 } from "uuid";

const styles = (theme) => ({
  fraction: {
    display: "inline-block",
    fontSize: ".8rem",
    marginRight: "-.5rem",
    lineHeight: 1,
  },
  numerator: {
    display: "inline-block",
    position: "relative",
    top: "-.15rem",
  },
  denominator: {
    display: "inline-block",
    position: "relative",
    left: "-.65rem",
    top: ".05rem",
  },
  dash: {
    display: "inline-block",
    height: 1,
    width: "1rem",
    transform: "rotate(-60deg)",
    position: "relative",
    left: "-.3rem",
    top: "-.35rem",
    background: theme.palette.grey[500],
  },
  underline: {
    textDecoration: "underline",
  },
});

function regexForFindingCharacter(char) {
  const regex = `(^|\\n| |\\0|")(\\${char}.*?\\${char})(\\0| |"|\\.|!|\\?|$)`;

  return new RegExp(regex, "gi");
}

const fractionMatcher = new RegExp(/([0-9]\/[0-9])/gi);
const boldMatcher = regexForFindingCharacter("*");
const underlineMatcher = regexForFindingCharacter("_");

function format({ classes, text }, matcher, Match, NoMatch) {
  const wordArray = text.split(matcher).filter(Boolean);

  return _map(wordArray, (textPart, _i) => {
    const key = useMemo(() => v4(), []);

    return textPart.match(matcher) ? (
      <Match classes={classes} text={textPart} key={key} />
    ) : (
      <NoMatch classes={classes} text={textPart} key={key} />
    );
  });
}

function setUnderlineFormatting(props) {
  const onMatch = ({ classes, text }) => (
    <span className={classes.underline}>{text.replace(/_/gi, "")}</span>
  );
  const onNoMatch = ({ classes: _classes, text }) => <span>{text}</span>;

  return format(props, underlineMatcher, onMatch, onNoMatch);
}

function setBoldFormatting(props) {
  const onMatch = ({ classes: _classes, text }) => (
    <strong>{text.replace(/\*/gi, "")}</strong>
  );
  const onNoMatch = ({ classes, text }) =>
    setUnderlineFormatting({ classes, text });

  return format(props, boldMatcher, onMatch, onNoMatch);
}

function setFractionFormatting(props) {
  const onMatch = ({ classes, text }) => (
    <span className={classes.fraction}>
      <span className={classes.numerator}>{text[0]}</span>
      <span className={classes.dash}></span>
      <span className={classes.denominator}>{text[2]}</span>
    </span>
  );
  const onNoMatch = ({ classes, text }) => setBoldFormatting({ classes, text });

  return format(props, fractionMatcher, onMatch, onNoMatch);
}

function FormattedText({ classes, text }) {
  return setFractionFormatting({ classes, text });
}

export default withStyles(styles)(FormattedText);
