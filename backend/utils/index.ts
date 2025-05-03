// Error handling utilities
export const handleError = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

// Response formatting utilities
export const formatApiResponse = <T>(data: T): { success: boolean; data: T } => ({
  success: true,
  data,
});

export const formatErrorResponse = (error: string): { success: boolean; error: string } => ({
  success: false,
  error,
});

// Add more utility functions as needed 