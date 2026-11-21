import React from "react";
import { connect } from "react-redux";
import { Grid } from "@material-ui/core";
import _map from "lodash/map";
import Header from "../utils/Header";
import Comment from "./Comment";
import CommentBox from "./CommentBox";

const mapStateToProps = ({ user }) => ({ user });

function Comments({ comments, onSubmit, onDelete, onEdit, user }) {
  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Header title="Comments" />
      </Grid>

      {_map(comments, (comment) => (
        <Grid item xs={12} key={comment.idPk}>
          <Comment
            comment={comment}
            onDelete={onDelete(comment)}
            onEdit={onEdit}
            user={user}
          />
        </Grid>
      ))}

      <Grid item xs={12}>
        <CommentBox onSubmit={onSubmit} />
      </Grid>
    </Grid>
  );
}

export default connect(mapStateToProps)(Comments);
