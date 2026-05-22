import { BrowserRouter, Route, Routes } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider } from "antd";
import { AuthProvider } from "./auth/AuthContext";
import { AuthGuard } from "./auth/AuthGuard";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import UsersPage from "./pages/UsersPage";
import UserDetailPage from "./pages/UserDetailPage";
import RestPreferenceOptionsPage from "./pages/RestPreferenceOptionsPage";
import RoutinePresetsPage from "./pages/RoutinePresetsPage";
import FeedbacksPage from "./pages/FeedbacksPage";
import HourlyMetricsPage from "./pages/HourlyMetricsPage";
import AdminsPage from "./pages/AdminsPage";
import DaliTaskRecommendPage from "./pages/DaliTaskRecommendPage";
import DaliGreetingRecommendPage from "./pages/DaliGreetingRecommendPage";
import TaskRecommendationsPage from "./pages/TaskRecommendationsPage";
import I18nSyncPage from "./pages/i18n/SyncPage";
import I18nKeysPage from "./pages/i18n/KeysPage";
import I18nPublishPage from "./pages/i18n/PublishPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";
console.log("[App] googleClientId:", googleClientId);

export default function App() {
  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider theme={{ token: { colorPrimary: "#1677ff" } }}>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route
                  element={
                    <AuthGuard>
                      <Layout />
                    </AuthGuard>
                  }
                >
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/users" element={<UsersPage />} />
                  <Route path="/users/:uid" element={<UserDetailPage />} />
                  <Route path="/routine-presets" element={<RoutinePresetsPage />} />
                  <Route
                    path="/rest-preference-options"
                    element={<RestPreferenceOptionsPage />}
                  />
                  <Route path="/feedbacks" element={<FeedbacksPage />} />
                  <Route path="/metrics/hourly" element={<HourlyMetricsPage />} />
                  <Route path="/admins" element={<AdminsPage />} />
                  <Route path="/i18n/keys" element={<I18nKeysPage />} />
                  <Route path="/i18n/publish" element={<I18nPublishPage />} />
                  <Route path="/i18n/sync" element={<I18nSyncPage />} />
                  <Route path="/dali/task-recommend" element={<DaliTaskRecommendPage />} />
                  <Route
                    path="/dali/greeting-recommend"
                    element={<DaliGreetingRecommendPage />}
                  />
                  <Route
                    path="/dali/task-recommendations"
                    element={<TaskRecommendationsPage />}
                  />
                </Route>
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </ConfigProvider>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );
}
