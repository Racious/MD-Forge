import { describe, expect, it, vi } from 'vitest';
import {
  describeOpenFileError,
  executeOpenFileAction,
  type AcknowledgeOpenFile,
} from '../services/openFileRequestService';

describe('executeOpenFileAction', () => {
  it('acknowledges a successful handler as opened', async () => {
    const action = vi.fn();
    const acknowledge = vi.fn<AcknowledgeOpenFile>().mockResolvedValue(undefined);

    await executeOpenFileAction(17, action, acknowledge);

    expect(action).toHaveBeenCalledOnce();
    expect(acknowledge).toHaveBeenCalledWith(17, 'opened');
  });

  it('acknowledges a handler exception as failure with detail', async () => {
    const error = new Error('store update failed');
    const acknowledge = vi.fn<AcknowledgeOpenFile>().mockResolvedValue(undefined);
    const onError = vi.fn();

    await executeOpenFileAction(
      23,
      () => {
        throw error;
      },
      acknowledge,
      onError
    );

    expect(onError).toHaveBeenCalledWith(error);
    expect(acknowledge).toHaveBeenCalledWith(23, 'failure', 'store update failed');
  });
});

describe('describeOpenFileError', () => {
  it('normalizes non-Error values', () => {
    expect(describeOpenFileError('plain failure')).toBe('plain failure');
  });
});
