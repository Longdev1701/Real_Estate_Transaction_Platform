import { api } from "@/lib/api";

export type CreatePostReportInput = {
  postId: string;
  reason: string;
  description?: string;
};

export type PostReport = {
  id: string;
  postId: string;
  reporterId: string;
  reason: string;
  description?: string | null;
  status: string;
  createdAt: string;
  resolvedAt?: string | null;
};

export const createPostReport = async (input: CreatePostReportInput) => {
  const payload = {
    ...input,
    description: input.description?.trim() || undefined,
  };

  const response = await api.post<{ data: { report: PostReport } }>("/reports", payload);
  return response.data.data.report;
};

export const submitReportAppeal = async (input: {
  reportId: string;
  message: string;
  evidence: string;
}) => {
  const response = await api.post<{ data: { report: PostReport } }>(
    `/reports/${input.reportId}/appeal`,
    {
      message: input.message.trim(),
      evidence: input.evidence.trim(),
    },
  );

  return response.data.data.report;
};
