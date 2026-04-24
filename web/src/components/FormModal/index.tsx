import { useState, useCallback } from 'react';
import { Modal, Form } from 'antd';
import type { ModalProps, FormInstance } from 'antd';
import type { ReactNode } from 'react';

interface FormModalProps<T = Record<string, unknown>> extends Omit<ModalProps, 'onOk'> {
  onSubmit: (values: T) => Promise<void> | void;
  initialValues?: Partial<T>;
  children: ReactNode;
  form?: FormInstance<T>;
}

export function FormModal<T = Record<string, unknown>>({
  onSubmit,
  initialValues,
  children,
  form: externalForm,
  ...modalProps
}: FormModalProps<T>) {
  const [internalForm] = Form.useForm<T>();
  const form = externalForm ?? internalForm;
  const [loading, setLoading] = useState(false);

  const handleOk = useCallback(async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      await onSubmit(values);
      form.resetFields();
    } catch {
      // validation or submit failure — Ant Design shows field errors
    } finally {
      setLoading(false);
    }
  }, [form, onSubmit]);

  const { afterOpenChange: userAfterOpenChange, ...restModalProps } = modalProps;

  return (
    <Modal
      {...restModalProps}
      onOk={handleOk}
      confirmLoading={loading}
      destroyOnClose
      afterOpenChange={(open) => {
        if (open && initialValues !== undefined) {
          form.setFieldsValue(
            initialValues as unknown as Parameters<FormInstance<T>['setFieldsValue']>[0],
          );
        }
        userAfterOpenChange?.(open);
      }}
    >
      <Form<T> form={form} layout="vertical" initialValues={initialValues}>
        {children}
      </Form>
    </Modal>
  );
}
