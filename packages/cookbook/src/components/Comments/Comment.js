import React, { useEffect, useState } from "react";
import moment from "moment";
import {
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  TextField,
  Typography,
} from "@material-ui/core";
import _find from "lodash/find";
import ConfirmDialog from "../utils/ConfirmDialog";
import FormattedText from "../utils/FormattedText";
import makeName from "../utils/makeName";

const timeFormat = "MM/DD/YYYY h:mma";

function Comment({ user, comment, onDelete, onEdit }) {
  const { authorId, text, created, edited } = comment;
  const [editting, setEditting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [updatedComment, setUpdatedComment] = useState(text);
  const { activeUser, users } = user;
  const author = _find(users, { idPk: authorId });
  const authorName = makeName(author);
  const deleteButton = (
    <ConfirmDialog
      size="small"
      buttonColor="secondary"
      buttonText="Delete"
      confirmText="Delete"
      dialogTitle="Delete You're Comment?"
      dialogText="The comment will be deleted forever and cannot be recovered."
      onConfirm={onDelete}
    />
  );

  useEffect(() => {
    setLoading(false);
    setEditting(false);
    setUpdatedComment(text);
  }, [text]);

  function saveEditedComment() {
    setLoading(true);
    onEdit({
      ...comment,
      text: updatedComment,
      edited: new Date(),
    });
  }

  function cancelEditting() {
    setEditting(false);
    setUpdatedComment(comment);
  }

  function renderActions() {
    if (editting) {
      return (
        <CardActions>
          <Button
            disabled={loading}
            size="small"
            color="primary"
            onClick={saveEditedComment}
            variant="contained"
          >
            Save
          </Button>
          <Button disabled={loading} size="small" onClick={cancelEditting}>
            Cancel
          </Button>
        </CardActions>
      );
    }

    if (activeUser.idPk === author.idPk) {
      return (
        <CardActions>
          <Button
            size="small"
            color="primary"
            onClick={() => setEditting(true)}
          >
            Edit
          </Button>
          {deleteButton}
        </CardActions>
      );
    }

    if (activeUser.isAdmin) {
      return <CardActions>{deleteButton}</CardActions>;
    }

    return false;
  }

  function renderComment() {
    if (editting) {
      return (
        <TextField
          disabled={loading}
          fullWidth
          multiline
          onChange={(evt) => setUpdatedComment(evt.target.value)}
          rows="3"
          value={updatedComment}
          variant="outlined"
        />
      );
    }

    return (
      <>
        <FormattedText text={text} />
        {edited && (
          <Typography
            color="textSecondary"
            component="span"
            title={moment(edited).format(timeFormat)}
          >
            &nbsp;[edited]
          </Typography>
        )}
      </>
    );
  }

  return (
    <Card>
      <CardHeader
        title={authorName}
        subheader={`${moment(created).format(timeFormat)}${edited ? "*" : ""}`}
      />
      <CardContent>{renderComment()}</CardContent>
      {renderActions()}
    </Card>
  );
}

export default Comment;
