import { Modal, message } from 'antd';

export const waitForMockAction = (ms = 700) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });

interface ExecuteConsoleActionOptions<TPending extends string> {
  actionKey: TPending;
  setPendingAction: (value: TPending | null) => void;
  confirmTitle: string;
  confirmContent: string;
  successMessage: string;
  errorMessage: string;
  run: () => void | Promise<void>;
}

export function executeConsoleAction<TPending extends string>({
  actionKey,
  setPendingAction,
  confirmTitle,
  confirmContent,
  successMessage,
  errorMessage,
  run,
}: ExecuteConsoleActionOptions<TPending>) {
  Modal.confirm({
    title: confirmTitle,
    content: confirmContent,
    okText: '确认',
    cancelText: '取消',
    onOk: async () => {
      setPendingAction(actionKey);
      try {
        await run();
        message.success(successMessage);
      } catch (error) {
        message.error(error instanceof Error ? error.message : errorMessage);
      } finally {
        setPendingAction(null);
      }
    },
  });
}
