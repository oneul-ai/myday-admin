import { Card, Col, Row, Statistic, Table, Typography } from "antd";
import { UserOutlined, MobileOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { getUsers } from "../api/users";
import dayjs from "dayjs";

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["users", { offset: 0, limit: 5 }],
    queryFn: () => getUsers({ offset: 0, limit: 5 }),
  });

  return (
    <>
      <Typography.Title level={4}>Dashboard</Typography.Title>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="Total Users"
              value={data?.total ?? "-"}
              prefix={<UserOutlined />}
              loading={isLoading}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Recent Signups (shown)"
              value={data?.users?.length ?? "-"}
              prefix={<MobileOutlined />}
              loading={isLoading}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Recent Users">
        <Table
          dataSource={data?.users}
          loading={isLoading}
          rowKey="uid"
          pagination={false}
          size="small"
          columns={[
            {
              title: "Name",
              dataIndex: "name",
              render: (name: string) =>
                name ? (
                  name
                ) : (
                  <Typography.Text type="secondary">비회원</Typography.Text>
                ),
            },
            {
              title: "Email",
              dataIndex: "email",
              render: (email: string) =>
                email ? (
                  email
                ) : (
                  <Typography.Text type="secondary">비회원</Typography.Text>
                ),
            },
            { title: "Plan", dataIndex: "plan" },
            {
              title: "Joined",
              dataIndex: "joined_at",
              render: (v: string) => dayjs(v).format("YYYY-MM-DD"),
            },
          ]}
        />
      </Card>
    </>
  );
}
