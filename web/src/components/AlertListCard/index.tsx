import { Alert, Card, Flex } from "antd";

interface AlertItem {
  title: string;
  description: string;
  type: "success" | "info" | "warning" | "error";
}

interface AlertListCardProps {
  title: string;
  items: AlertItem[];
}

export function AlertListCard({ title, items }: AlertListCardProps) {
  return (
    <Card title={title} className="dash-card">
      <Flex vertical gap={12}>
        {items.map((alert) => (
          <Alert
            key={alert.title}
            type={alert.type}
            title={alert.title}
            description={alert.description}
            showIcon
          />
        ))}
      </Flex>
    </Card>
  );
}
