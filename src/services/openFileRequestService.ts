export type OpenFileOutcome = 'opened' | 'unsupported' | 'failure';

export type AcknowledgeOpenFile = (
  requestId: number,
  outcome: OpenFileOutcome,
  detail?: string
) => Promise<void>;

export function describeOpenFileError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export async function executeOpenFileAction(
  requestId: number,
  action: () => void,
  acknowledge: AcknowledgeOpenFile,
  onError: (error: unknown) => void = () => undefined
): Promise<void> {
  try {
    action();
  } catch (error) {
    onError(error);
    await acknowledge(requestId, 'failure', describeOpenFileError(error));
    return;
  }

  await acknowledge(requestId, 'opened');
}
