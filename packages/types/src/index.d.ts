export type PostLoginBody = {
  email: string;
};

export type User = {
  id: string;
  email: string;
  name?: string;
};

export type CreateUserData = {
  email: string;
  name?: string;
};

export type UpdateUserData = {
  name?: string;
};

export type PaginatedUsers = {
  users: User[];
  lastEvaluatedKey?: string;
};

export type File = {
  owner_id: string;
  file_id: string;
  name: string;
  size: number;
  type: string;
  uploaded_at: string;
};

export type UploadFileResponse = {
  file: File;
  uploadUrl: string;
};

export type Comment = {
  id: string;
  file_id: string;
  user_id: string;
  content: string;
  created_at: string;
};

export type Tag = {
  id: string;
  file_id: string;
  name: string;
  created_at: string;
};

export type FileWithMetadata = File & {
  comments?: Comment[];
  tags?: Tag[];
  user?: User;
};

export type CreateCommentData = {
  file_id: string;
  content: string;
};

export type CreateTagData = {
  file_id: string;
  name: string;
};
