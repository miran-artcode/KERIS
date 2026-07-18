// ── 배포 설정 ──────────────────────────────────────────────
// Supabase 프로젝트를 만든 뒤 아래 두 값을 채웁니다.
// (Supabase 대시보드 → Project Settings → API 에서 확인)
window.CONFIG = {
  SUPABASE_URL: "https://YOUR-PROJECT.supabase.co",
  SUPABASE_ANON_KEY: "YOUR-ANON-KEY",

  // 캡처 기본값. 참가자 화면에서 각 항목을 켜고 끌 수 있으며,
  // 동의하지 않은 항목은 이 기본값과 무관하게 수집되지 않습니다.
  CAPTURE: {
    micDefault: false,          // 참가자 마이크(음성) 기본 꺼짐
    webcamAttentionDefault: false, // 웹캠 주의 신호(요약값) 기본 꺼짐
    snapshotDefault: false,     // 주기적 스냅샷 저장 기본 꺼짐(가장 민감)
    attentionIntervalMs: 3000,  // 주의 신호 로그 주기
    snapshotIntervalMs: 60000,  // 스냅샷 주기(동의 시)
    snapshotMaxWidth: 320       // 스냅샷 저장 시 가로 최대 픽셀(축소 저장)
  },

  // 보관 정책 안내 문구(동의 화면에 표시). 실제 삭제는 아래 SQL의
  // 보관 기간 정책 또는 수동 삭제로 운영합니다.
  RETENTION_NOTICE: "수집한 데이터는 연수 종료 후 30일 이내 삭제합니다."
};
