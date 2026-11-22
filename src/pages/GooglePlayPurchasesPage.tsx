import { useState } from "react";
import { Alert, Button, Card, Input, Segmented, Select, Space, Typography } from "antd";
import { GOOGLE_PLAY_STATUS_OPTIONS } from "../api/googlePlay";
import GooglePlayPurchasesTable from "../components/GooglePlayPurchasesTable";

type PurchaseKind = "all" | "real" | "test";

/**
 * Google Play 구독 조회 — 구매 토큰 1개당 1행(구독의 현재 상태). App Store 결제 페이지와 달리 회차별 원장·매출 집계는 없다.
 * 문의 대응("이 유저가 어디서 결제했나", "왜 PLUS 가 아닌가")과 테스트 결제 확인용.
 */
export default function GooglePlayPurchasesPage() {
  const [uidInput, setUidInput] = useState("");
  const [userUid, setUserUid] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const [kind, setKind] = useState<PurchaseKind>("all");

  const applyUid = () => setUserUid(uidInput.trim() || undefined);

  return (
    <div>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        Google Play 구독
      </Typography.Title>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="구독의 현재 상태만 보여 줍니다"
        description="한 구독(구매 토큰)이 한 줄입니다. 갱신·환불 회차별 내역과 매출 합계는 Play Console 의 주문 관리에서 확인하세요. '이용 중'만 PLUS 가 부여됩니다."
      />
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder="유저 UID"
            value={uidInput}
            onChange={(e) => setUidInput(e.target.value)}
            onPressEnter={applyUid}
            allowClear
            style={{ width: 280 }}
          />
          <Button onClick={applyUid}>검색</Button>
          <Select
            allowClear
            placeholder="상태"
            style={{ width: 150 }}
            value={status}
            onChange={(value) => setStatus(value)}
            options={GOOGLE_PLAY_STATUS_OPTIONS.map(({ value, label }) => ({ value, label }))}
          />
          <Segmented<PurchaseKind>
            value={kind}
            onChange={setKind}
            options={[
              { value: "all", label: "전체" },
              { value: "real", label: "실결제" },
              { value: "test", label: "테스트" },
            ]}
          />
        </Space>
      </Card>
      <GooglePlayPurchasesTable
        filters={{
          user_uid: userUid,
          status,
          test_purchase: kind === "all" ? undefined : kind === "test",
        }}
      />
    </div>
  );
}
