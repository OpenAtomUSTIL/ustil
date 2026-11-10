import { IssueStatus } from '../../db/schema';
import { UserPublic } from '../users/users.views';

export interface IssueListItem {
  id: string;
  title: string;
  status: IssueStatus;
  author: UserPublic;
  replyCount: number;
  answeredBy: UserPublic | null;
  answeredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReplyView {
  id: string;
  content: string;
  author: UserPublic;
  createdAt: string;
}

export interface IssueDetail extends IssueListItem {
  content: string;
  replies: ReplyView[];
}
