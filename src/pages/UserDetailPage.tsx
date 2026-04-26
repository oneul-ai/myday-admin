import { useParams, useNavigate } from "react-router-dom";
import {
  Button,
  Card,
  Descriptions,
  message,
  Modal,
  Form,
  Input,
  Select,
  Spin,
  Table,
  Tabs,
  Tag,
  DatePicker,
  Typography,
} from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getUser, updateUser } from "../api/users";
import { getUserTasks, type Task } from "../api/tasks";
import { getUserDevices, updateDevice, type Device } from "../api/devices";
import { getUserCalendars, getUserIntegrations } from "../api/calendars";
import { getUserSchedules } from "../api/schedules";
import { getUserRoutines, type Routine } from "../api/routines";
import dayjs from "dayjs";
import { useState } from "react";

export default function UserDetailPage() {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [form] = Form.useForm();
  const [taskDate, setTaskDate] = useState<string | undefined>();
  const [scheduleDate, setScheduleDate] = useState<string | undefined>();

  const { data: user, isLoading } = useQuery({
    queryKey: ["user", uid],
    queryFn: () => getUser(uid!),
    enabled: !!uid,
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["userTasks", uid, taskDate],
    queryFn: () => getUserTasks(uid!, { date: taskDate }),
    enabled: !!uid,
  });

  const { data: devices, isLoading: devicesLoading } = useQuery({
    queryKey: ["userDevices", uid],
    queryFn: () => getUserDevices(uid!),
    enabled: !!uid,
  });

  const { data: calendars, isLoading: calendarsLoading } = useQuery({
    queryKey: ["userCalendars", uid],
    queryFn: () => getUserCalendars(uid!),
    enabled: !!uid,
  });

  const { data: integrations, isLoading: integrationsLoading } = useQuery({
    queryKey: ["userIntegrations", uid],
    queryFn: () => getUserIntegrations(uid!),
    enabled: !!uid,
  });

  const { data: schedules, isLoading: schedulesLoading } = useQuery({
    queryKey: ["userSchedules", uid, scheduleDate],
    queryFn: () => getUserSchedules(uid!, { date: scheduleDate }),
    enabled: !!uid,
  });

  const { data: routines, isLoading: routinesLoading } = useQuery({
    queryKey: ["userRoutines", uid],
    queryFn: () => getUserRoutines(uid!),
    enabled: !!uid,
  });

  const updateMutation = useMutation({
    mutationFn: (body: { name?: string; plan?: string }) => updateUser(uid!, body),
    onSuccess: () => {
      message.success("User updated");
      queryClient.invalidateQueries({ queryKey: ["user", uid] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setEditOpen(false);
    },
  });

  const deviceMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => updateDevice(id, { status }),
    onSuccess: () => {
      message.success("Device updated");
      queryClient.invalidateQueries({ queryKey: ["userDevices", uid] });
    },
  });

  if (isLoading) {
    return (
      <div style={{ textAlign: "center", padding: 64 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!user) return <Typography.Text>User not found</Typography.Text>;

  const tabItems = [
    {
      key: "tasks",
      label: "Tasks",
      children: (
        <>
          <DatePicker
            style={{ marginBottom: 16 }}
            onChange={(d) => setTaskDate(d ? d.format("YYYY-MM-DD") : undefined)}
            allowClear
            placeholder="Filter by date"
          />
          <Table<Task>
            dataSource={tasks}
            loading={tasksLoading}
            rowKey="id"
            size="small"
            pagination={false}
            columns={[
              {
                title: "Date",
                dataIndex: "date",
                width: 110,
              },
              {
                title: "Title",
                dataIndex: "title",
                render: (v: string, r: Task) => (
                  <>
                    {r.emoji && `${r.emoji} `}
                    {v}
                  </>
                ),
              },
              {
                title: "Time Slot",
                dataIndex: "time_slot",
                width: 110,
              },
              {
                title: "Completed",
                dataIndex: "is_completed",
                width: 90,
                render: (v: boolean) => (v ? <Tag color="green">Yes</Tag> : <Tag>No</Tag>),
              },
              {
                title: "Must Do",
                dataIndex: "is_must_do",
                width: 90,
                render: (v: boolean) => (v ? <Tag color="red">Yes</Tag> : <Tag>No</Tag>),
              },
              {
                title: "Created By",
                dataIndex: "created_by",
                width: 100,
              },
            ]}
          />
        </>
      ),
    },
    {
      key: "calendars",
      label: "Calendars",
      children: (
        <Table
          dataSource={calendars}
          loading={calendarsLoading}
          rowKey={(r) => `${r.provider}-${r.id}`}
          size="small"
          pagination={false}
          columns={[
            { title: "Provider", dataIndex: "provider", width: 150 },
            {
              title: "Name",
              dataIndex: "summary",
              render: (v: string, r) => (
                <>
                  {r.color && (
                    <span
                      style={{
                        display: "inline-block",
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: r.color,
                        marginRight: 6,
                      }}
                    />
                  )}
                  {v}
                </>
              ),
            },
            {
              title: "Primary",
              dataIndex: "is_primary",
              width: 80,
              render: (v: boolean) => (v ? <Tag color="blue">Yes</Tag> : "-"),
            },
            {
              title: "Subscribed",
              dataIndex: "subscribed",
              width: 100,
              render: (v: boolean) => (v ? <Tag color="green">Yes</Tag> : <Tag>No</Tag>),
            },
            { title: "Status", dataIndex: "status", width: 100 },
          ]}
        />
      ),
    },
    {
      key: "integrations",
      label: "Integrations",
      children: (
        <Table
          dataSource={integrations}
          loading={integrationsLoading}
          rowKey="id"
          size="small"
          pagination={false}
          columns={[
            { title: "Provider", dataIndex: "provider", width: 150 },
            {
              title: "Status",
              dataIndex: "status",
              width: 100,
              render: (v: string) => <Tag color={v === "active" ? "green" : "default"}>{v}</Tag>,
            },
            { title: "Type", dataIndex: "connection_type", width: 100 },
            {
              title: "Connected",
              dataIndex: "connected_at",
              width: 140,
              render: (v: string) => dayjs(v).format("YYYY-MM-DD HH:mm"),
            },
            {
              title: "Last Calendar Sync",
              dataIndex: "last_calendar_synced_at",
              width: 160,
              render: (v: string | null) => (v ? dayjs(v).format("YYYY-MM-DD HH:mm") : "-"),
            },
            {
              title: "Last Events Sync",
              dataIndex: "last_events_synced_at",
              width: 160,
              render: (v: string | null) => (v ? dayjs(v).format("YYYY-MM-DD HH:mm") : "-"),
            },
          ]}
        />
      ),
    },
    {
      key: "schedules",
      label: "Schedules",
      children: (
        <>
          <DatePicker
            style={{ marginBottom: 16 }}
            onChange={(d) => setScheduleDate(d ? d.format("YYYY-MM-DD") : undefined)}
            allowClear
            placeholder="Filter by date"
          />
          <Table
            dataSource={schedules}
            loading={schedulesLoading}
            rowKey="id"
            size="small"
            pagination={false}
            columns={[
              { title: "Date", dataIndex: "date", width: 110 },
              { title: "Title", dataIndex: "title" },
              { title: "Type", dataIndex: "type", width: 100 },
              { title: "Provider", dataIndex: "provider", width: 120 },
              {
                title: "Time",
                key: "time",
                width: 180,
                render: (_: unknown, r: { start_at: string | null; end_at: string | null; is_all_day: boolean }) =>
                  r.is_all_day
                    ? "All Day"
                    : r.start_at
                      ? `${dayjs(r.start_at).format("HH:mm")} - ${r.end_at ? dayjs(r.end_at).format("HH:mm") : ""}`
                      : "-",
              },
              {
                title: "Status",
                dataIndex: "status",
                width: 100,
                render: (v: string) => <Tag>{v}</Tag>,
              },
            ]}
          />
        </>
      ),
    },
    {
      key: "routines",
      label: "Routines",
      children: (
        <Table<Routine>
          dataSource={routines}
          loading={routinesLoading}
          rowKey="id"
          size="small"
          pagination={false}
          columns={[
            {
              title: "Time Slot",
              dataIndex: "time_slot",
              width: 110,
              render: (v: string) => <Tag>{v}</Tag>,
            },
            { title: "Position", dataIndex: "position", width: 80 },
            {
              title: "Title",
              dataIndex: "title",
              render: (v: string, r: Routine) => (
                <>
                  {r.emoji && `${r.emoji} `}
                  {v}
                </>
              ),
            },
            {
              title: "Focus Min",
              dataIndex: "focus_minutes",
              width: 90,
              render: (v: number | null) => v ?? "-",
            },
            {
              title: "Scheduled",
              dataIndex: "scheduled_time",
              width: 100,
              render: (v: string | null) => v ?? "-",
            },
            { title: "Start Date", dataIndex: "start_date", width: 110 },
            {
              title: "Deleted",
              dataIndex: "deleted_at",
              width: 150,
              render: (v: string | null) =>
                v ? (
                  <Typography.Text type="danger" style={{ fontSize: 12 }}>
                    {dayjs(v).format("YYYY-MM-DD HH:mm")}
                  </Typography.Text>
                ) : (
                  "-"
                ),
            },
          ]}
        />
      ),
    },
    {
      key: "devices",
      label: "Devices",
      children: (
        <Table<Device>
          dataSource={devices}
          loading={devicesLoading}
          rowKey="id"
          size="small"
          pagination={false}
          columns={[
            { title: "Device ID", dataIndex: "device_id", width: 200 },
            {
              title: "Platform",
              dataIndex: "platform",
              width: 100,
              render: (v: string) => <Tag>{v}</Tag>,
            },
            {
              title: "Status",
              dataIndex: "status",
              width: 120,
              render: (v: string, r: Device) => (
                <Select
                  value={v}
                  size="small"
                  style={{ width: 100 }}
                  onChange={(status) => deviceMutation.mutate({ id: r.id, status })}
                  options={[
                    { label: "active", value: "active" },
                    { label: "inactive", value: "inactive" },
                  ]}
                />
              ),
            },
            {
              title: "Last Synced",
              dataIndex: "last_synced_at",
              width: 160,
              render: (v: string) => dayjs(v).format("YYYY-MM-DD HH:mm"),
            },
            {
              title: "FCM Token",
              dataIndex: "fcm_token",
              ellipsis: true,
            },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate("/users")}
        style={{ marginBottom: 16 }}
      >
        Back to Users
      </Button>

      <Card
        title={user.name || user.email}
        extra={
          <Button
            type="primary"
            onClick={() => {
              form.setFieldsValue({ name: user.name, plan: user.plan });
              setEditOpen(true);
            }}
          >
            Edit
          </Button>
        }
      >
        <Descriptions column={2} size="small">
          <Descriptions.Item label="UID">{user.uid}</Descriptions.Item>
          <Descriptions.Item label="Email">{user.email}</Descriptions.Item>
          <Descriptions.Item label="Plan">
            <Tag color={user.plan === "STARTER" ? "default" : "blue"}>{user.plan}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="City">{user.last_city ?? "-"}</Descriptions.Item>
          <Descriptions.Item label="Timezone">{user.last_timezone ?? "-"}</Descriptions.Item>
          <Descriptions.Item label="Joined">{dayjs(user.joined_at).format("YYYY-MM-DD HH:mm")}</Descriptions.Item>
          <Descriptions.Item label="Last Sign-in">
            {dayjs(user.last_signed_in_at).format("YYYY-MM-DD HH:mm")}
          </Descriptions.Item>
          <Descriptions.Item label="Terms">
            {user.terms_agreed ? <Tag color="green">Agreed</Tag> : <Tag>No</Tag>}
          </Descriptions.Item>
          <Descriptions.Item label="Privacy">
            {user.privacy_agreed ? <Tag color="green">Agreed</Tag> : <Tag>No</Tag>}
          </Descriptions.Item>
          <Descriptions.Item label="Marketing">
            {user.marketing_agreed ? <Tag color="green">Agreed</Tag> : <Tag>No</Tag>}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Tabs items={tabItems} style={{ marginTop: 24 }} />

      <Modal
        title="Edit User"
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={updateMutation.isPending}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => updateMutation.mutate(values)}
        >
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="plan" label="Plan" rules={[{ required: true }]}>
            <Select
              options={[
                { label: "STARTER", value: "STARTER" },
                { label: "PRO", value: "PRO" },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
