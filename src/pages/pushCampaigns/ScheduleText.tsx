import { Typography } from "antd";
import dayjs from "dayjs";
import type { PushCampaign } from "../../api/pushCampaigns";
import { KST } from "./shared";

/** 캠페인의 발송 예정 시각 표시 — absolute 는 KST 시각, local 은 "현지 시각" 벽시계. */
export default function ScheduleText({ campaign }: { campaign: PushCampaign }) {
  if (campaign.schedule_basis === "local") {
    return campaign.scheduled_local_time ? (
      <>
        {campaign.scheduled_local_time.replace("T", " ")}{" "}
        <Typography.Text type="secondary">유저 현지 시각</Typography.Text>
      </>
    ) : (
      <Typography.Text type="secondary">—</Typography.Text>
    );
  }
  return campaign.scheduled_at ? (
    <>
      {dayjs(campaign.scheduled_at).tz(KST).format("YYYY-MM-DD HH:mm")}{" "}
      <Typography.Text type="secondary">KST</Typography.Text>
    </>
  ) : (
    <Typography.Text type="secondary">—</Typography.Text>
  );
}
