import React, { useState } from "react";
import {
  Button,
  Grid,
  LinearProgress,
  Paper,
  TextField,
} from "@material-ui/core";

function CommentBox({ onSubmit }) {
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  async function saveComment(evt) {
    evt.preventDefault();

    setLoading(true);

    try {
      await onSubmit(comment);
    } catch (err) {
      console.error(err);
    }

    setComment("");
    setLoading(false);
  }

  return (
    <Grid
      container
      component="form"
      onSubmit={saveComment}
      spacing={2}
      alignItems="center"
    >
      <Grid item xs={12}>
        <Paper>
          <TextField
            disabled={loading}
            fullWidth
            placeholder="Write a comment..."
            multiline
            onChange={(evt) => setComment(evt.target.value)}
            rows="3"
            value={comment}
            variant="outlined"
          />
        </Paper>
      </Grid>
      <Grid item xs={12} md={4}>
        <Button
          color="primary"
          disabled={loading}
          fullWidth
          type="submit"
          variant="contained"
        >
          Save
        </Button>
      </Grid>
      <Grid item xs={12} md={8}>
        {loading && <LinearProgress />}
      </Grid>
    </Grid>
  );
}

export default CommentBox;
