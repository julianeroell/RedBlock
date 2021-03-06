## v0.8.1

- 파이어폭스의 addons-linter를 통과하도록 고침
- 최초 실행시 확장기능의 옵션을 로딩하는 과정에서 발생하는 오류 고침

## v0.8.0

- 상대방측에서 차단이 걸려있어도 조건부로 체인블락이 작동하도록 함
  - 트위터의 다계정 로그인기능을 활용하여 구현함
- (실험적 기능) 레일건 모드: 일부 실행조건에서 API사용횟수 절약
  - `list.json` 대신 `ids.json` API를 활용하도록 함
  - 기본값 꺼짐 (이미 차단한 유저수를 집계하지 못하고, 중복차단을 하게 됨)
- 트윗반응 체인블락은 block_all API를 사용하지 않도록 함
- 트윗반응 체인블락의 사용을 기본값으로 활성화

## v0.7.0

- Added English translation
- 강제 로그아웃 현상을 막기 위해 유저를 차단할 때 block_all API를 활용하도록 함

## v0.6.0

- 스크롤이 되지 않는 환경을 위한 UI 수정

## v0.5.2

- 리밋이 걸렸을 때 예상 해제시각을 표시하도록 함
- 일부 조건에서 퀵모드가 비활성화되는 버그 고침
- 우클릭 체인블락시 confirm창 메시지가 잘못 뜨는 버그 고침

## v0.5.1

- 빌드과정 중 일부 파일이 제거되는 문제 고침
- 체인블락 도중 팔로워에 일시정지된 계정이 포함되어있을 때 오류가 나면서 멈추는 버그 고침
- UI 개선

## v0.5.0

- 팝업 UI에 Material-UI 도입
- 파이어폭스 우클릭메뉴 안 뜨는 버그 고침
- 옵션페이지 구현
- 체인블락 팔로워 수 및 세션 수 최대치 설정

## v0.4.0

- 언체인블락 구현
- 트윗반응기반 체인블락 구현(실험적)
- 기타 팝업 UI 등 수정

## v0.3.0

- UI 대폭 변경
  - 팝업 내부에서 진행상황 및 새 세션 실행 가능
  - 사용자목록 저장/불러오기 기능 구현
  - 기존 페이지내부 UI는 제거
- 맞팔로우 체인 구현
- 퀵 모드(200명이하 차단) 구현

## v0.2.2

- 우클릭 메뉴에서 체인블락 실행기능 추가

## v0.2.1

- UI 개선

## v0.2.0

- 확장기능 구조 대폭 뜯어고침
  - 체인블락을 백그라운드에서 실행 가능
  - 내 팔로잉/팔로워 필터링 설정 가능

## v0.1.0

- 첫 버전
