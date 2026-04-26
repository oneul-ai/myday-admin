import { Layout as AntLayout, Menu, Avatar, Dropdown, Tag, theme } from "antd";
import {
  DashboardOutlined,
  UserOutlined,
  AppstoreOutlined,
  SafetyOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useMe } from "../auth/useMe";

const { Header, Sider, Content } = AntLayout;

const baseMenuItems = [
  { key: "/", icon: <DashboardOutlined />, label: "Dashboard" },
  { key: "/users", icon: <UserOutlined />, label: "Users" },
  { key: "/routine-presets", icon: <AppstoreOutlined />, label: "Routine Presets" },
];

const superAdminMenuItems = [
  { key: "/admins", icon: <SafetyOutlined />, label: "Admins" },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { data: me } = useMe();
  const { token: themeToken } = theme.useToken();

  const selectedKey = location.pathname === "/" ? "/" : `/${location.pathname.split("/")[1]}`;

  const menuItems =
    me?.role === "super_admin" ? [...baseMenuItems, ...superAdminMenuItems] : baseMenuItems;

  return (
    <AntLayout style={{ minHeight: "100vh" }}>
      <Sider theme="light" breakpoint="lg" collapsedWidth={60}>
        <div
          style={{
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: 18,
            color: themeToken.colorPrimary,
          }}
        >
          MyDay Admin
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <AntLayout>
        <Header
          style={{
            background: themeToken.colorBgContainer,
            padding: "0 24px",
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
          }}
        >
          <Dropdown
            menu={{
              items: [
                {
                  key: "logout",
                  icon: <LogoutOutlined />,
                  label: "Logout",
                  onClick: () => {
                    logout();
                    navigate("/login");
                  },
                },
              ],
            }}
            placement="bottomRight"
          >
            <div style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
              <Avatar src={user?.picture} icon={<UserOutlined />} />
              <span>{user?.name}</span>
              {me?.role === "super_admin" && <Tag color="red">super_admin</Tag>}
              {me?.role === "admin" && <Tag color="blue">admin</Tag>}
            </div>
          </Dropdown>
        </Header>
        <Content style={{ margin: 24 }}>
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  );
}
