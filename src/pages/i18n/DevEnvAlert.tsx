import { Alert } from "antd";
import { getApiEnv } from "../../api/apiEnv";

/**
 * 앱은 DEV 환경에서도 i18n 번들을 PROD 에서 내려받으므로,
 * DEV API 를 보고 있을 때는 i18n 작업이 앱에 반영되지 않는다는 안내를 띄운다.
 * (환경 전환 시 페이지가 reload 되므로 render 시점의 getApiEnv() 로 충분)
 */
export default function DevEnvAlert() {
  if (getApiEnv() !== "dev") return null;
  return (
    <Alert
      type="warning"
      showIcon
      message="지금은 DEV 환경입니다 — i18n 은 PROD 에서 설정하세요."
      description="앱은 DEV 환경에서도 i18n 번들을 PROD 에서 참조합니다. 여기(DEV)서 수정·발행한 내용은 앱에 반영되지 않으니, 상단에서 PROD 로 전환한 뒤 작업해주세요."
    />
  );
}
