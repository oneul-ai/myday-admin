import { Card, List, Switch, Typography, message } from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type AdSettings,
  getAdSettings,
  updateAdSettings,
} from "../api/appSettings";

const BANNERS: { key: keyof AdSettings; label: string; description: string }[] = [
  {
    key: "my_tab",
    label: "My 탭",
    description: "My 탭 배너 노출 (/awake 응답 ad.my_tab)",
  },
  {
    key: "tab_bar",
    label: "탭 바",
    description: "탭 바 배너 노출 (/awake 응답 ad.tab_bar)",
  },
  {
    key: "performance_tab",
    label: "성과 탭",
    description: "성과 탭 배너 노출 (/awake 응답 ad.performance_tab)",
  },
  {
    key: "focus_tab",
    label: "집중 탭",
    description: "집중 탭 배너 노출 (/awake 응답 ad.focus_tab)",
  },
];

export default function AdSettingsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["ad-settings"],
    queryFn: getAdSettings,
  });

  const updateMutation = useMutation({
    mutationFn: updateAdSettings,
    onSuccess: (settings) => {
      queryClient.setQueryData(["ad-settings"], settings);
      message.success("저장되었습니다");
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail;
      message.error(detail ?? "저장 실패");
    },
  });

  return (
    <>
      <Typography.Title level={4} style={{ marginTop: 0, marginBottom: 16 }}>
        광고 배너 설정
      </Typography.Title>
      <Card style={{ maxWidth: 640 }}>
        <List
          loading={isLoading}
          dataSource={BANNERS}
          renderItem={(banner) => (
            <List.Item
              actions={[
                <Switch
                  key="toggle"
                  checked={data?.[banner.key] ?? false}
                  loading={
                    updateMutation.isPending &&
                    banner.key in (updateMutation.variables ?? {})
                  }
                  onChange={(checked) =>
                    updateMutation.mutate({ [banner.key]: checked })
                  }
                />,
              ]}
            >
              <List.Item.Meta
                title={banner.label}
                description={banner.description}
              />
            </List.Item>
          )}
        />
      </Card>
      <Typography.Paragraph type="secondary" style={{ marginTop: 16 }}>
        켜면 앱 클라이언트의 해당 위치에 광고 배너가 노출됩니다. 값은 앱 실행 시
        /awake 응답으로 전달됩니다.
      </Typography.Paragraph>
    </>
  );
}
