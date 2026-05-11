import { useParams, useNavigate } from "react-router-dom";
import {
  Alert,
  Button,
  Card,
  Descriptions,
  message,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  DatePicker,
  Typography,
} from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getUser,
  getUserPreferences,
  updateUser,
  type User,
  type UserPreferences,
} from "../api/users";

const WORK_DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

function PreferencesPanel({
  data,
  loading,
}: {
  data: UserPreferences | null | undefined;
  loading: boolean;
}) {
  if (loading) return <Spin />;
  if (!data) return <Typography.Text type="secondary">No preferences set</Typography.Text>;

  const workDays = (data.work_days ?? [])
    .slice()
    .sort(
      (a, b) =>
        WORK_DAY_ORDER.indexOf(a.toLowerCase()) - WORK_DAY_ORDER.indexOf(b.toLowerCase()),
    );

  const renderJson = (value: unknown) => (
    <pre
      style={{
        background: "#fafafa",
        padding: 12,
        borderRadius: 4,
        fontSize: 12,
        margin: 0,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      {JSON.stringify(value, null, 2)}
    </pre>
  );

  return (
    <>
      <Descriptions column={2} size="small" bordered>
        <Descriptions.Item label="Job type">{data.job_type ?? "-"}</Descriptions.Item>
        <Descriptions.Item label="Planning style">{data.planning_style ?? "-"}</Descriptions.Item>
        <Descriptions.Item label="Work days" span={2}>
          {workDays.length > 0
            ? workDays.map((d) => (
                <Tag key={d} style={{ marginRight: 4 }}>
                  {d.toUpperCase()}
                </Tag>
              ))
            : "-"}
        </Descriptions.Item>
        <Descriptions.Item label="Break time">{data.break_time ?? "-"}</Descriptions.Item>
        <Descriptions.Item label="Last modified">
          {data.last_modified_at ? dayjs(data.last_modified_at).format("YYYY-MM-DD HH:mm") : "-"}
        </Descriptions.Item>

        <Descriptions.Item label="Check-in time">{data.check_in_time}</Descriptions.Item>
        <Descriptions.Item label="Check-out time">{data.check_out_time}</Descriptions.Item>
        <Descriptions.Item label="Check-in notification">
          {data.check_in_noti_enabled ? (
            <Tag color="green">{data.check_in_noti_type}</Tag>
          ) : (
            <Tag>Disabled</Tag>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Check-out notification">
          {data.check_out_noti_enabled ? (
            <Tag color="green">{data.check_out_noti_type}</Tag>
          ) : (
            <Tag>Disabled</Tag>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Task notification" span={2}>
          {data.task_noti_enabled ? <Tag color="green">Enabled</Tag> : <Tag>Disabled</Tag>}
        </Descriptions.Item>
      </Descriptions>

      {data.daily_rhythm && (
        <>
          <Typography.Title level={5} style={{ marginTop: 24 }}>
            Daily rhythm
          </Typography.Title>
          {renderJson(data.daily_rhythm)}
        </>
      )}

      {data.rest_preferences && data.rest_preferences.length > 0 && (
        <>
          <Typography.Title level={5} style={{ marginTop: 24 }}>
            Rest preferences
          </Typography.Title>
          {renderJson(data.rest_preferences)}
        </>
      )}
    </>
  );
}
function formatNumber(value: number | null | undefined, suffix = "", digits = 1): string {
  if (value === null || value === undefined) return "-";
  return `${value.toFixed(digits)}${suffix}`;
}

function WeatherPanel({ user }: { user: User }) {
  const data = user.last_weather_data;
  const updatedAt = user.last_weather_updated_at;

  if (!data) {
    return <Typography.Text type="secondary">No weather data</Typography.Text>;
  }

  const current = data.current ?? {};
  const today = data.today ?? {};
  const locality = data.location?.locality;

  return (
    <>
      <Descriptions column={2} size="small">
        <Descriptions.Item label="Locality">{locality ?? "-"}</Descriptions.Item>
        <Descriptions.Item label="Last updated">
          {updatedAt ? dayjs(updatedAt).format("YYYY-MM-DD HH:mm") : "-"}
        </Descriptions.Item>
        <Descriptions.Item label="Recorded at">
          {data.recordedAt ? dayjs(data.recordedAt).format("YYYY-MM-DD HH:mm") : "-"}
        </Descriptions.Item>
      </Descriptions>

      <Typography.Title level={5} style={{ marginTop: 24 }}>
        Current conditions
      </Typography.Title>
      <Descriptions column={2} size="small" bordered>
        <Descriptions.Item label="Condition">
          {current.condition ?? "-"}
          {current.symbolName ? ` (${current.symbolName})` : ""}
        </Descriptions.Item>
        <Descriptions.Item label="Daylight">
          {current.isDaylight === undefined || current.isDaylight === null ? (
            "-"
          ) : current.isDaylight ? (
            <Tag color="gold">Day</Tag>
          ) : (
            <Tag>Night</Tag>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Temperature">
          {formatNumber(current.temperature, "°C")}
        </Descriptions.Item>
        <Descriptions.Item label="Feels like">
          {formatNumber(current.feelsLike, "°C")}
        </Descriptions.Item>
        <Descriptions.Item label="Humidity">
          {current.humidity !== null && current.humidity !== undefined
            ? `${Math.round(current.humidity * 100)}%`
            : "-"}
        </Descriptions.Item>
        <Descriptions.Item label="Cloud cover">
          {current.cloudCover !== null && current.cloudCover !== undefined
            ? `${Math.round(current.cloudCover * 100)}%`
            : "-"}
        </Descriptions.Item>
        <Descriptions.Item label="Dew point">
          {formatNumber(current.dewPoint, "°C")}
        </Descriptions.Item>
        <Descriptions.Item label="UV index">{current.uvIndex ?? "-"}</Descriptions.Item>
        <Descriptions.Item label="Pressure">
          {formatNumber(current.pressure, " mb", 0)}
          {current.pressureTrend ? ` (${current.pressureTrend})` : ""}
        </Descriptions.Item>
        <Descriptions.Item label="Visibility">
          {formatNumber(current.visibility, " m", 0)}
        </Descriptions.Item>
        <Descriptions.Item label="Wind speed">
          {formatNumber(current.windSpeed, " km/h")}
        </Descriptions.Item>
        <Descriptions.Item label="Wind gust">
          {formatNumber(current.windGust, " km/h")}
        </Descriptions.Item>
        <Descriptions.Item label="Wind direction" span={2}>
          {formatNumber(current.windDirection, "°", 0)}
        </Descriptions.Item>
      </Descriptions>

      <Typography.Title level={5} style={{ marginTop: 24 }}>
        Today's forecast
      </Typography.Title>
      <Descriptions column={2} size="small" bordered>
        <Descriptions.Item label="Date">
          {today.date ? dayjs(today.date).format("YYYY-MM-DD") : "-"}
        </Descriptions.Item>
        <Descriptions.Item label="Condition">
          {today.condition ?? "-"}
          {today.symbolName ? ` (${today.symbolName})` : ""}
        </Descriptions.Item>
        <Descriptions.Item label="High">
          {formatNumber(today.highTemperature, "°C")}
        </Descriptions.Item>
        <Descriptions.Item label="Low">
          {formatNumber(today.lowTemperature, "°C")}
        </Descriptions.Item>
        <Descriptions.Item label="Precipitation chance">
          {today.precipitationChance !== null && today.precipitationChance !== undefined
            ? `${Math.round(today.precipitationChance * 100)}%`
            : "-"}
        </Descriptions.Item>
        <Descriptions.Item label="Precipitation amount">
          {formatNumber(today.precipitationAmount, " mm")}
        </Descriptions.Item>
        <Descriptions.Item label="Snowfall">
          {formatNumber(today.snowfallAmount, " mm")}
        </Descriptions.Item>
        <Descriptions.Item label="UV index max">{today.uvIndexMax ?? "-"}</Descriptions.Item>
        <Descriptions.Item label="Sunrise">
          {today.sunrise ? dayjs(today.sunrise).format("HH:mm") : "-"}
        </Descriptions.Item>
        <Descriptions.Item label="Sunset">
          {today.sunset ? dayjs(today.sunset).format("HH:mm") : "-"}
        </Descriptions.Item>
      </Descriptions>
    </>
  );
}

import { getUserTasks, type Task } from "../api/tasks";
import { getUserDevices, updateDevice, type Device } from "../api/devices";
import { getUserCalendars, getUserIntegrations } from "../api/calendars";
import { getUserSchedules } from "../api/schedules";
import { getUserRoutines, type Routine } from "../api/routines";
import { useMe } from "../auth/useMe";
import dayjs from "dayjs";
import { useState } from "react";

const SUPER_ADMIN_ONLY_TABS = new Set(["tasks", "calendars", "schedules", "routines"]);

export default function UserDetailPage() {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [form] = Form.useForm();
  const [taskDate, setTaskDate] = useState<string | undefined>();
  const [scheduleDate, setScheduleDate] = useState<string | undefined>();
  const { data: me } = useMe();
  const isSuperAdmin = me?.role === "super_admin";

  const { data: user, isLoading } = useQuery({
    queryKey: ["user", uid],
    queryFn: () => getUser(uid!),
    enabled: !!uid,
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["userTasks", uid, taskDate],
    queryFn: () => getUserTasks(uid!, { date: taskDate }),
    enabled: !!uid && isSuperAdmin,
  });

  const { data: devices, isLoading: devicesLoading } = useQuery({
    queryKey: ["userDevices", uid],
    queryFn: () => getUserDevices(uid!),
    enabled: !!uid,
  });

  const { data: calendars, isLoading: calendarsLoading } = useQuery({
    queryKey: ["userCalendars", uid],
    queryFn: () => getUserCalendars(uid!),
    enabled: !!uid && isSuperAdmin,
  });

  const { data: integrations, isLoading: integrationsLoading } = useQuery({
    queryKey: ["userIntegrations", uid],
    queryFn: () => getUserIntegrations(uid!),
    enabled: !!uid,
  });

  const { data: schedules, isLoading: schedulesLoading } = useQuery({
    queryKey: ["userSchedules", uid, scheduleDate],
    queryFn: () => getUserSchedules(uid!, { date: scheduleDate }),
    enabled: !!uid && isSuperAdmin,
  });

  const { data: routines, isLoading: routinesLoading } = useQuery({
    queryKey: ["userRoutines", uid],
    queryFn: () => getUserRoutines(uid!),
    enabled: !!uid && isSuperAdmin,
  });

  const { data: preferences, isLoading: preferencesLoading } = useQuery({
    queryKey: ["userPreferences", uid],
    queryFn: () => getUserPreferences(uid!),
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
      key: "preferences",
      label: "Preferences",
      children: <PreferencesPanel data={preferences} loading={preferencesLoading} />,
    },
    {
      key: "weather",
      label: "Weather",
      children: <WeatherPanel user={user} />,
    },
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
                title: "Type",
                dataIndex: "type",
                width: 110,
                render: (v: Task["type"]) => {
                  const color =
                    v === "SCHEDULED" ? "purple" : v === "ROUTINE" ? "geekblue" : "default";
                  return <Tag color={color}>{v}</Tag>;
                },
              },
              {
                title: "Time Slot",
                dataIndex: "time_slot",
                width: 110,
              },
              {
                title: "Scheduled",
                dataIndex: "scheduled_time",
                width: 100,
                render: (v: string | null) => v ?? "-",
              },
              {
                title: "Status",
                dataIndex: "status",
                width: 130,
                render: (v: Task["status"]) => {
                  const color = v === "ACTIVE" ? "blue" : v === "CANCELED" ? "orange" : "default";
                  return <Tag color={color}>{v}</Tag>;
                },
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
              title: "Focus Sec",
              dataIndex: "focus_seconds",
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
        title={
          <Space>
            <span>{user.name || user.email}</span>
            {user.deleted_at && <Tag color="red">탈퇴</Tag>}
          </Space>
        }
        extra={
          <Button
            type="primary"
            disabled={!!user.deleted_at}
            onClick={() => {
              form.setFieldsValue({ name: user.name, plan: user.plan });
              setEditOpen(true);
            }}
          >
            Edit
          </Button>
        }
      >
        {user.deleted_at && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            message="탈퇴한 회원입니다"
            description={`PII는 익명화되어 있으며 수정할 수 없습니다. 탈퇴 시각: ${dayjs(user.deleted_at).format("YYYY-MM-DD HH:mm")}`}
          />
        )}
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
          <Descriptions.Item label="Last Routine Backfill">
            {user.last_routine_backfilled_at
              ? dayjs(user.last_routine_backfilled_at).format("YYYY-MM-DD")
              : "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Last Schedule Backfill">
            {user.last_schedule_backfilled_at
              ? dayjs(user.last_schedule_backfilled_at).format("YYYY-MM-DD")
              : "-"}
          </Descriptions.Item>
          {user.deleted_at && (
            <Descriptions.Item label="Withdrawn">
              {dayjs(user.deleted_at).format("YYYY-MM-DD HH:mm")}
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      <Tabs
        items={tabItems.filter((t) => isSuperAdmin || !SUPER_ADMIN_ONLY_TABS.has(t.key))}
        style={{ marginTop: 24 }}
      />

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
