import { BrowserRouter, Route, Routes } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider } from "antd";
import { AuthProvider } from "./auth/AuthContext";
import { AuthGuard } from "./auth/AuthGuard";
import { SuperAdminRoute } from "./auth/SuperAdminRoute";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import UsersPage from "./pages/UsersPage";
import UserDetailPage from "./pages/UserDetailPage";
import UserAuthMigrationPage from "./pages/UserAuthMigrationPage";
import RestPreferenceOptionsPage from "./pages/RestPreferenceOptionsPage";
import HabitPresetsPage from "./pages/HabitPresetsPage";
import FeedbacksPage from "./pages/FeedbacksPage";
import HourlyMetricsPage from "./pages/HourlyMetricsPage";
import AdminsPage from "./pages/AdminsPage";
import AdSettingsPage from "./pages/AdSettingsPage";
import MarketingInAppPage from "./pages/MarketingInAppPage";
import DaliTaskRecommendPage from "./pages/DaliTaskRecommendPage";
import DaliGreetingRecommendPage from "./pages/DaliGreetingRecommendPage";
import DaliQuoteRecommendPage from "./pages/DaliQuoteRecommendPage";
import TaskRecommendationsPage from "./pages/TaskRecommendationsPage";
import I18nSyncPage from "./pages/i18n/SyncPage";
import BlogPostsPage from "./pages/blog/BlogPostsPage";
import BlogPostEditorPage from "./pages/blog/BlogPostEditorPage";
import EmailCampaignsPage from "./pages/emailCampaigns/EmailCampaignsPage";
import EmailCampaignEditorPage from "./pages/emailCampaigns/EmailCampaignEditorPage";
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
                  <Route
                    path="/users"
                    element={
                      <SuperAdminRoute>
                        <UsersPage />
                      </SuperAdminRoute>
                    }
                  />
                  <Route
                    path="/users/:uid"
                    element={
                      <SuperAdminRoute>
                        <UserDetailPage />
                      </SuperAdminRoute>
                    }
                  />
                  <Route
                    path="/user-auth-migration"
                    element={
                      <SuperAdminRoute>
                        <UserAuthMigrationPage />
                      </SuperAdminRoute>
                    }
                  />
                  <Route path="/habit-presets" element={<HabitPresetsPage />} />
                  <Route
                    path="/rest-preference-options"
                    element={<RestPreferenceOptionsPage />}
                  />
                  <Route path="/feedbacks" element={<FeedbacksPage />} />
                  <Route path="/ad-settings" element={<AdSettingsPage />} />
                  <Route
                    path="/marketing-in-app"
                    element={<MarketingInAppPage />}
                  />
                  <Route
                    path="/email-campaigns"
                    element={
                      <SuperAdminRoute>
                        <EmailCampaignsPage />
                      </SuperAdminRoute>
                    }
                  />
                  <Route
                    path="/email-campaigns/new"
                    element={
                      <SuperAdminRoute>
                        <EmailCampaignEditorPage />
                      </SuperAdminRoute>
                    }
                  />
                  <Route
                    path="/email-campaigns/:id"
                    element={
                      <SuperAdminRoute>
                        <EmailCampaignEditorPage />
                      </SuperAdminRoute>
                    }
                  />
                  <Route path="/blog-posts" element={<BlogPostsPage />} />
                  <Route path="/blog-posts/new" element={<BlogPostEditorPage />} />
                  <Route path="/blog-posts/:id" element={<BlogPostEditorPage />} />
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
                    path="/dali/quote-recommend"
                    element={<DaliQuoteRecommendPage />}
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
