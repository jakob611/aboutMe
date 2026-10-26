import { comments } from "@/db/schema";

// Never send a commenter's private email address to public APIs or client components.
export const publicCommentFields = {
  id: comments.id,
  author: comments.author,
  content: comments.content,
  createdAt: comments.createdAt,
};
