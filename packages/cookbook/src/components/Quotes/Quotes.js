import React, { useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useSelector } from "react-redux";
import { withStyles } from "@material-ui/core/styles";
import { Typography } from "@material-ui/core";
import _random from "lodash/random";
import useActions from "../../hooks/useActions";

const styles = (theme) => ({
  quote: {
    float: "left",
  },
  author: {
    float: "right",
    marginTop: theme.spacing(0.5),
  },
});

function getNewRandomNumber(max, current) {
  const num = _random(0, max);

  return num === current ? getNewRandomNumber(max, current) : num;
}

function Quotes({ classes }) {
  const { fetchQuotes } = useActions();
  const quotes = useSelector((state) => state.quotes);
  const [activeQuoteIndex, setActiveQuoteIndex] = useState(0);
  const getQuoteIndex = useCallback(
    () => getNewRandomNumber(quotes.length - 1, activeQuoteIndex),
    [quotes, activeQuoteIndex],
  );
  const quote = useMemo(
    () => quotes[activeQuoteIndex],
    [activeQuoteIndex, quotes],
  );

  useEffect(() => {
    if (quotes.length === 0) {
      fetchQuotes();
    }
  }, [fetchQuotes, quotes.length]);

  useEffect(() => {
    if (quotes.length < 2 || activeQuoteIndex) {
      return;
    }

    const newActiveQuoteIndex = getQuoteIndex();

    setActiveQuoteIndex(newActiveQuoteIndex);
  }, [quotes, getQuoteIndex, activeQuoteIndex]);

  if (!quotes.length) {
    return "";
  }

  return (
    <React.Fragment>
      <Typography className={classes.quote} variant="body1">
        "{quote.quote}"
      </Typography>
      <Typography className={classes.author} variant="caption">
        &nbsp;- {quote.author}
      </Typography>
    </React.Fragment>
  );
}

Quotes.propTypes = {
  classes: PropTypes.shape().isRequired,
};

export default withStyles(styles)(Quotes);
