export interface File {
  file_id: string;
  name: string;
  type: string;
  owner_id: string;
  uploaded_at: string;
  comments?: Comment[];
  tags?: Tag[];
}

export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface FileWithMetadata extends File {
  comments?: Comment[];
  tags?: Tag[];
  user?: User;
}

export interface Comment {
  id: string;
  file_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export interface Tag {
  id: string;
  file_id: string;
  name: string;
  created_at: string;
}

export interface CreateCommentData {
  file_id: string;
  content: string;
}

export interface CreateTagData {
  file_id: string;
  name: string;
} 